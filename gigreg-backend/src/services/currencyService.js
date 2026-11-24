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

// Stripe treats HUF as two-decimal in Checkout API, but subunits must end in 00 (whole units only).
export const WHOLE_UNIT_TWO_DECIMAL_CURRENCIES = new Set(["HUF"]);

export const MAX_STANDARD_PRICE = 1_000_000;
export const MAX_ZERO_DECIMAL_PRICE = 100_000_000;

export const STRIPE_MIN_CHARGE_MINOR = {
  USD: 50,
  EUR: 50,
  GBP: 30,
  AUD: 50,
  CAD: 50,
  CHF: 50,
  SGD: 50,
  NZD: 50,
  JPY: 50,
  INR: 5000,
  SEK: 300,
  NOK: 300,
  DKK: 250,
  PLN: 200,
  CZK: 1500,
  HUF: 17500,
  RON: 200,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MEMORY_CACHE_MAX_ENTRIES = 500;
const memoryRateCache = new Map();

const setMemoryRate = (pair, entry) => {
  if (memoryRateCache.size >= MEMORY_CACHE_MAX_ENTRIES && !memoryRateCache.has(pair)) {
    const oldestKey = memoryRateCache.keys().next().value;
    if (oldestKey) memoryRateCache.delete(oldestKey);
  }
  memoryRateCache.set(pair, entry);
};

export const clearExchangeRateMemoryCache = () => {
  memoryRateCache.clear();
};

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
  const normalized = requireCurrency(currency);
  const digits =
    ZERO_DECIMAL_CURRENCIES.has(normalized) || WHOLE_UNIT_TWO_DECIMAL_CURRENCIES.has(normalized)
      ? 0
      : 2;
  const factor = 10 ** digits;
  return Math.round((number + Number.EPSILON) * factor) / factor;
};

export const requirePositivePrice = (value, currency = "USD") => {
  const normalized = requireCurrency(currency);
  const price = roundMoney(value, normalized);
  if (price <= 0) {
    const error = new Error("Price must be greater than zero");
    error.status = 400;
    throw error;
  }
  const maxAllowed =
    ZERO_DECIMAL_CURRENCIES.has(normalized) || WHOLE_UNIT_TWO_DECIMAL_CURRENCIES.has(normalized)
      ? MAX_ZERO_DECIMAL_PRICE
      : MAX_STANDARD_PRICE;
  if (price > maxAllowed) {
    const error = new Error(`Price exceeds the maximum allowed limit for ${normalized}`);
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
  if (!forceRefresh) {
    const inMemory = memoryRateCache.get(pair);
    if (
      inMemory &&
      Date.now() - new Date(inMemory.retrievedAt).getTime() < CACHE_TTL_MS
    ) {
      return { ...inMemory, stale: false };
    }
  }

  const cached = await ExchangeRate.findOne({ pair }).lean();
  const fresh = cached && Date.now() - new Date(cached.retrievedAt).getTime() < CACHE_TTL_MS;
  if (fresh && !forceRefresh) {
    setMemoryRate(pair, cached);
    return { ...cached, stale: false };
  }

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
    setMemoryRate(pair, saved);
    return { ...saved, stale: false };
  } catch (error) {
    if (cached) {
      setMemoryRate(pair, cached);
      return { ...cached, stale: true };
    }
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

export const requireMinimumStripeCharge = (amountInSmallestUnit, currency = "USD") => {
  const normalized = requireCurrency(currency);
  const minMinor = STRIPE_MIN_CHARGE_MINOR[normalized] ?? 50;
  if (!Number.isFinite(amountInSmallestUnit) || amountInSmallestUnit < minMinor) {
    const minMajor = ZERO_DECIMAL_CURRENCIES.has(normalized)
      ? String(minMinor)
      : (minMinor / 100).toFixed(WHOLE_UNIT_TWO_DECIMAL_CURRENCIES.has(normalized) ? 0 : 2);
    const error = new Error(`Minimum checkout amount for ${normalized} is ${minMajor} ${normalized}`);
    error.status = 400;
    throw error;
  }
  return amountInSmallestUnit;
};
