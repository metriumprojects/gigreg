import { getStripeFxRates } from "../services/stripeFxService.js";
import { requireCurrency, SUPPORTED_CURRENCIES } from "../services/currencyService.js";

export const getRates = async (req, res) => {
  try {
    const targetCurrency = requireCurrency(req.query.to || "USD");
    const quote = await getStripeFxRates(targetCurrency);
    res.json({
      base: targetCurrency,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      rates: quote.rates,
      conversionAtCheckout: true,
      provider: "Stripe FX Quotes",
      providerDate: quote.createdAt,
      expiresAt: quote.expiresAt,
      stale: quote.stale,
    });
  } catch (error) {
    res.status(error.status || error.statusCode || 500).json({ message: error.message, type: error.type });
  }
};
