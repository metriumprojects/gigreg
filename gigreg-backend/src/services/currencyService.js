import axios from "axios";
import ExchangeRate from "../models/ExchangeRate.js";

// Currencies enabled by this application and supported by Stripe presentment.
export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "SGD",
  "CHF", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
];

// Stripe does not multiply these currencies by 100 when creating a charge.
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export const normalizeCurrency = (value, fallback = "USD") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "US DOLLAR" || normalized === "$") return "USD";
  if (normalized === "EURO" || normalized === "€") return "EUR";
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : fallback;
};

export const requireCurrency = (value) => {
  const currency = normalizeCurrency(value, null);
  if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
    const error = new Error("Currency is not supported by Stripe");
    error.status = 400;
    throw error;
  }
  return currency;
};

export const roundMoney = (value, currency = "USD") => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error("Price must be a non-negative number");
    error.status = 400;
    throw error;
  }
  const digits = ZERO_DECIMAL_CURRENCIES.has(requireCurrency(currency)) ? 0 : 2;
  const factor = 10 ** digits;
  return Math.round((number + Number.EPSILON) * factor) / factor;
};

export const requirePositivePrice = (value, currency = "USD") => {
  const price = roundMoney(value, currency);
  if (price <= 0) {
    const error = new Error("Price must be greater than zero");
    error.status = 400;
    throw error;
  }
  return price;
};

export const getExchangeRate = async (fromValue, toValue, { forceRefresh = false } = {}) => {
  const from = requireCurrency(fromValue);
  const to = requireCurrency(toValue);
  if (from === to) return { rate: 1, providerDate: null, retrievedAt: new Date(), stale: false };

  const pair = `${from}_${to}`;
  const cached = await ExchangeRate.findOne({ pair }).lean();
  const fresh = cached && Date.now() - new Date(cached.retrievedAt).getTime() < CACHE_TTL_MS;
  if (fresh && !forceRefresh) return { ...cached, stale: false };

  try {
    const { data } = await axios.get("https://api.frankfurter.app/latest", {
      params: { from, to },
      timeout: 6000,
    });
    const rate = Number(data?.rates?.[to]);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid exchange-rate response");
    const saved = await ExchangeRate.findOneAndUpdate(
      { pair },
      { rate, providerDate: data.date, retrievedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return { ...saved, stale: false };
  } catch (error) {
    if (cached) return { ...cached, stale: true };
    const unavailable = new Error(`Exchange rate ${from}/${to} is temporarily unavailable`);
    unavailable.status = 503;
    unavailable.cause = error;
    throw unavailable;
  }
};

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  const from = requireCurrency(fromCurrency);
  const to = requireCurrency(toCurrency);
  const sourceAmount = roundMoney(amount, from);
  const rateData = await getExchangeRate(from, to);
  return {
    amount: roundMoney(sourceAmount * rateData.rate, to),
    rate: rateData.rate,
    providerDate: rateData.providerDate,
    stale: Boolean(rateData.stale),
  };
};

// Backward-compatible helpers for listings/curricula that are still stored in USD.
export const getUsdEurRate = (options) => getExchangeRate("USD", "EUR", options);
export const convertToUsd = async (amount, inputCurrency = "USD") =>
  (await convertCurrency(amount, inputCurrency, "USD")).amount;
export const convertFromUsd = (amount, outputCurrency = "USD") =>
  convertCurrency(amount, "USD", outputCurrency);

export const toSmallestUnit = (amount, currency = "USD") => {
  const normalized = requireCurrency(currency);
  const rounded = roundMoney(amount, normalized);
  return ZERO_DECIMAL_CURRENCIES.has(normalized) ? rounded : Math.round(rounded * 100);
};
