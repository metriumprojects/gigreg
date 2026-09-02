import axios from "axios";
import { requireCurrency, requirePositivePrice, roundMoney, SUPPORTED_CURRENCIES } from "./currencyService.js";

const STRIPE_FX_URL = "https://api.stripe.com/v1/fx_quotes";
const DEFAULT_API_VERSION = "2025-07-30.preview";
const CACHE_TTL_MS = 4 * 60 * 1000;
const cache = new Map();

const stripeError = (error) => {
  const wrapped = new Error(error.response?.data?.error?.message || error.message || "Stripe FX quote failed");
  wrapped.status = error.response?.status || 502;
  wrapped.type = error.response?.data?.error?.type;
  return wrapped;
};

export const getStripeFxRates = async (targetValue, { forceRefresh = false } = {}) => {
  const target = requireCurrency(targetValue);
  const cached = cache.get(target);
  if (!forceRefresh && cached && cached.expiresAt.getTime() > Date.now()) return cached;
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("STRIPE_SECRET_KEY is not configured");
    error.status = 503;
    throw error;
  }

  const sources = SUPPORTED_CURRENCIES.filter((currency) => currency !== target);
  const body = new URLSearchParams();
  body.set("to_currency", target.toLowerCase());
  // Catalogue + checkout presentment use the same unlocked Stripe FX quotes so
  // lesson cards and Checkout show matching converted amounts. These are not
  // payment-locked FX Quotes (those require to_currency = settlement currency).
  body.set("lock_duration", "none");
  sources.forEach((currency) => body.append("from_currencies[]", currency.toLowerCase()));

  try {
    const { data } = await axios.post(STRIPE_FX_URL, body, {
      auth: { username: process.env.STRIPE_SECRET_KEY, password: "" },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": process.env.STRIPE_FX_API_VERSION || DEFAULT_API_VERSION,
      },
      timeout: 10000,
    });
    const rates = { [target]: 1 };
    for (const source of sources) {
      const rate = Number(data.rates?.[source.toLowerCase()]?.exchange_rate);
      if (Number.isFinite(rate) && rate > 0) rates[source] = rate;
    }
    if (Object.keys(rates).length !== SUPPORTED_CURRENCIES.length) {
      throw new Error("Stripe did not return all requested currency rates");
    }

    const now = new Date();
    const stripeExpiry = Number(data.lock_expires_at) * 1000;
    const usableStripeExpiry = Number.isFinite(stripeExpiry) && stripeExpiry > now.getTime();
    const expiresAt = new Date(Math.min(
      usableStripeExpiry ? stripeExpiry : now.getTime() + CACHE_TTL_MS,
      now.getTime() + CACHE_TTL_MS
    ));
    const result = {
      id: data.id,
      rates,
      createdAt: new Date(Number(data.created) * 1000 || now.getTime()),
      expiresAt,
      stale: false,
    };
    cache.set(target, result);
    return result;
  } catch (error) {
    if (cached) return { ...cached, stale: true };
    throw stripeError(error);
  }
};

/** Convert using the same Stripe FX quotes as lesson/listing card display. */
export const convertWithStripeFx = async (amount, fromCurrency, toCurrency) => {
  const from = requireCurrency(fromCurrency);
  const to = requireCurrency(toCurrency);
  const sourceAmount = roundMoney(amount, from);

  if (from === to) {
    return { amount: sourceAmount, rate: 1, providerDate: null, stale: false, quoteId: null };
  }

  const quote = await getStripeFxRates(to);
  const rate = Number(quote.rates?.[from]);
  if (!Number.isFinite(rate) || rate <= 0) {
    const error = new Error(`Stripe FX rate ${from}/${to} is unavailable`);
    error.status = 503;
    throw error;
  }

  // Match frontend CurrencyContext rounding: 0 decimals for JPY, else 2.
  const convertedRaw = sourceAmount * rate;
  const convertedAmount = to === "JPY"
    ? Math.round(convertedRaw)
    : Math.round((convertedRaw + Number.EPSILON) * 100) / 100;

  return {
    amount: requirePositivePrice(convertedAmount, to),
    rate,
    providerDate: quote.createdAt,
    stale: Boolean(quote.stale),
    quoteId: quote.id || null,
  };
};
