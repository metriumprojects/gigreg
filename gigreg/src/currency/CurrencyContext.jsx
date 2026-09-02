import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import api from "../redux/api";

const CurrencyContext = createContext(null);
const FALLBACK_CURRENCIES = [
  "USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "SGD", "CHF",
  "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
];
const STORAGE_KEY = "preferredCurrency";
const normalize = (value, supported = FALLBACK_CURRENCIES) => {
  const code = String(value || "").toUpperCase();
  return supported.includes(code) ? code : "USD";
};
const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export function CurrencyProvider({ children }) {
  const userInfo = useSelector((state) => state.auth.userInfo);
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState({});
  const [supportedCurrencies, setSupportedCurrencies] = useState(FALLBACK_CURRENCIES);
  const [rateMeta, setRateMeta] = useState({ loading: true, stale: false });
  const initializedIdentity = useRef(null);

  useEffect(() => {
    let active = true;
    setRates({});
    setRateMeta((current) => ({ ...current, loading: true }));
    api.get("/currency/rates", { params: { to: currency } }).then(({ data }) => {
      if (!active) return;
      setRates(data.rates || {});
      setSupportedCurrencies(data.supportedCurrencies || FALLBACK_CURRENCIES);
      setRateMeta({ loading: false, stale: Boolean(data.stale), provider: data.provider, providerDate: data.providerDate, expiresAt: data.expiresAt });
    }).catch(() => active && setRateMeta({ loading: false, stale: true }));
    return () => { active = false; };
  }, [currency]);

  useEffect(() => {
    const identity = userInfo?._id || "guest";
    if (initializedIdentity.current === identity) return;
    initializedIdentity.current = identity;
    const storedCurrency = localStorage.getItem(STORAGE_KEY);
    setCurrencyState(userInfo ? normalize(userInfo.currency || storedCurrency, supportedCurrencies) : normalize(storedCurrency, supportedCurrencies));
  }, [userInfo, supportedCurrencies]);

  const setCurrency = useCallback(async (value) => {
    const next = normalize(value, supportedCurrencies);
    const previous = currency;
    setCurrencyState(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (!userInfo?._id) return;
    try {
      await api.post("/users/update-profile", { currency: next }, { withCredentials: true });
    } catch (error) {
      setCurrencyState(previous);
      localStorage.setItem(STORAGE_KEY, previous);
      throw error;
    }
  }, [currency, supportedCurrencies, userInfo?._id]);

  const convertPrice = useCallback((amount, sourceCurrency = "USD", targetCurrency = currency) => {
    const source = normalize(sourceCurrency, supportedCurrencies);
    const target = normalize(targetCurrency, supportedCurrencies);
    const rate = source === target ? 1 : Number(rates[source]);
    if (!Number.isFinite(rate) || rate <= 0 || target !== currency) return null;
    const converted = Number(amount || 0) * rate;
    return target === "JPY" ? Math.round(converted) : round(converted);
  }, [currency, rates, supportedCurrencies]);

  const convertFromUsd = useCallback((amount) => convertPrice(amount, "USD"), [convertPrice]);
  const formatPrice = useCallback((amount, sourceCurrency = "USD", options = {}) => {
    const converted = convertPrice(amount, sourceCurrency);
    if (converted === null) return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalize(sourceCurrency, supportedCurrencies),
      ...options,
    }).format(Number(amount || 0));
    return new Intl.NumberFormat(undefined, { style: "currency", currency, ...options }).format(converted);
  }, [currency, convertPrice, supportedCurrencies]);
  const formatOriginalPrice = useCallback((amount, originalCurrency = "USD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: normalize(originalCurrency, supportedCurrencies) }).format(Number(amount || 0)),
  [supportedCurrencies]);

  const value = useMemo(() => ({
    currency, rates, supportedCurrencies, rateMeta, setCurrency, convertFromUsd,
    convertPrice, formatPrice, formatOriginalPrice,
    symbol: new Intl.NumberFormat(undefined, { style: "currency", currency }).formatToParts(0).find((part) => part.type === "currency")?.value,
  }), [currency, rates, supportedCurrencies, rateMeta, setCurrency, convertFromUsd, convertPrice, formatPrice, formatOriginalPrice]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCurrency = () => {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error("useCurrency must be used inside CurrencyProvider");
  return value;
};
