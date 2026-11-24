export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export const formatMajorAmount = (amount, currency = "USD") => {
  const code = String(currency || "USD").trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(Number(amount || 0));
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
};

export const formatMinorAmount = (amount, currency = "USD") => {
  const code = String(currency || "USD").trim().toUpperCase() || "USD";
  const divisor = ZERO_DECIMAL_CURRENCIES.has(code) ? 1 : 100;
  return formatMajorAmount(Number(amount || 0) / divisor, code);
};
