import dotenv from "dotenv";
import Stripe from "stripe";
import User from "../models/User.js";

dotenv.config();

let stripeClient;

export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("STRIPE_SECRET_KEY is not configured");
    error.status = 503;
    throw error;
  }

  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

export const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

export const requireTeacherPayoutCurrency = async (userId, currencyValue) => {
  const currency = String(currencyValue || "").trim().toUpperCase();
  const user = await User.findById(userId).select("stripeConnectAccountId");
  if (!user?.stripeConnectAccountId) {
    const error = new Error("Complete Stripe payout setup before creating paid content");
    error.status = 409;
    throw error;
  }
  const account = await getStripe().accounts.retrieve(user.stripeConnectAccountId, { expand: ["external_accounts"] });
  const payoutCurrencies = [...new Set((account.external_accounts?.data || [])
    .filter((entry) => entry.object === "bank_account")
    .map((entry) => String(entry.currency || "").toUpperCase()))];
  if (!account.payouts_enabled || account.capabilities?.transfers !== "active") {
    const error = new Error("Complete Stripe verification and enable payouts before creating paid content");
    error.status = 409;
    throw error;
  }
  if (!payoutCurrencies.includes(currency)) {
    const error = new Error(`Your Stripe account is not configured to receive ${currency} payouts`);
    error.status = 400;
    throw error;
  }
  return payoutCurrencies;
};
