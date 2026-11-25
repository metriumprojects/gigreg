import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { SUPPORTED_CURRENCIES, normalizeCurrency, toSmallestUnit } from "../services/currencyService.js";
import { getFrontendUrl, getStripe } from "../services/stripeService.js";

const COUNTRIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let countriesCache = { data: null, expiresAt: 0 };

const isTeacher = (user) => user?.role === "teacher" || user?.reverseRole === true;

const requireTeacher = (user) => {
  if (!isTeacher(user)) {
    const error = new Error("A teacher account is required");
    error.status = 403;
    throw error;
  }
};

const sanitizeCountry = (value) => {
  const country = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    const error = new Error("Select a valid two-letter country code");
    error.status = 400;
    throw error;
  }
  return country;
};

export const clearConnectCountriesCache = () => {
  countriesCache = { data: null, expiresAt: 0 };
};

export const buildSupportedConnectCountries = ({
  platformCountry,
  supportedTransferCountries = [],
  allSpecs = [],
  restrictCountries = "",
} = {}) => {
  const specCurrencyByCode = new Map();
  for (const spec of allSpecs) {
    const code = String(spec?.id || "").trim().toUpperCase();
    if (!code) continue;
    specCurrencyByCode.set(code, String(spec?.default_currency || "").trim().toUpperCase());
  }

  const restrictList = String(restrictCountries || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  let candidateCodes;
  if (Array.isArray(supportedTransferCountries) && supportedTransferCountries.length > 0) {
    const allowedSet = new Set(
      [platformCountry, ...supportedTransferCountries]
        .map((c) => String(c || "").trim().toUpperCase())
        .filter(Boolean)
    );
    candidateCodes = [...allowedSet].filter((code) => specCurrencyByCode.has(code));
  } else {
    candidateCodes = [...specCurrencyByCode.keys()];
  }

  if (restrictList.length > 0) {
    const restrictSet = new Set(restrictList);
    candidateCodes = candidateCodes.filter((code) => restrictSet.has(code));
  }

  return candidateCodes
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({
      code,
      defaultCurrency: specCurrencyByCode.get(code) || "",
    }));
};

const fetchSupportedConnectCountries = async (stripe) => {
  if (countriesCache.data && countriesCache.expiresAt > Date.now()) {
    return countriesCache.data;
  }

  const platform = await stripe.accounts.retrieve();
  const platformCountry = String(platform?.country || "").trim().toUpperCase();
  const [platformSpec, firstSpecsPage] = await Promise.all([
    platformCountry ? stripe.countrySpecs.retrieve(platformCountry) : Promise.resolve(null),
    stripe.countrySpecs.list({ limit: 100 }),
  ]);

  const allSpecs = [...(firstSpecsPage?.data || [])];
  let hasMore = Boolean(firstSpecsPage?.has_more);
  let startingAfter = allSpecs.length > 0 ? allSpecs[allSpecs.length - 1].id : undefined;

  while (hasMore && startingAfter) {
    const nextPage = await stripe.countrySpecs.list({ limit: 100, starting_after: startingAfter });
    const pageData = nextPage?.data || [];
    allSpecs.push(...pageData);
    hasMore = Boolean(nextPage?.has_more && pageData.length > 0);
    startingAfter = pageData.length > 0 ? pageData[pageData.length - 1].id : undefined;
  }

  const countries = buildSupportedConnectCountries({
    platformCountry,
    supportedTransferCountries: platformSpec?.supported_transfer_countries || [],
    allSpecs,
    restrictCountries: process.env.STRIPE_CONNECT_RESTRICT_COUNTRIES || "",
  });

  countriesCache = {
    data: countries,
    expiresAt: Date.now() + COUNTRIES_CACHE_TTL_MS,
  };
  return countries;
};

const assertSupportedConnectCountry = async (countryCode, stripe) => {
  const supported = await fetchSupportedConnectCountries(stripe);
  if (supported.length > 0 && !supported.some((entry) => entry.code === countryCode)) {
    const error = new Error(`Payouts are not currently supported in ${countryCode}`);
    error.status = 400;
    throw error;
  }
};

const accountSummary = (account) => {
  const externalAccounts = (account.external_accounts?.data || [])
    .filter((entry) => entry.object === "bank_account")
    .map((entry) => ({
      id: entry.id,
      bankName: entry.bank_name || "Bank account",
      country: entry.country,
      currency: String(entry.currency || "").toUpperCase(),
      last4: entry.last4,
      status: entry.status,
      defaultForCurrency: Boolean(entry.default_for_currency),
    }));

  const payoutCurrencies = [...new Set(externalAccounts.map((entry) => entry.currency).filter(Boolean))]
    .filter((currency) => SUPPORTED_CURRENCIES.includes(currency));

  return {
    accountId: account.id,
    country: account.country,
    defaultCurrency: String(account.default_currency || "").toUpperCase(),
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    transfersEnabled: account.capabilities?.transfers === "active",
    cardPaymentsEnabled: account.capabilities?.card_payments === "active",
    currentlyDue: account.requirements?.currently_due || [],
    eventuallyDue: account.requirements?.eventually_due || [],
    disabledReason: account.requirements?.disabled_reason || null,
    payoutCurrencies,
    externalAccounts,
  };
};

const pendingConnectCreations = new Map();
const pendingDisconnects = new Set();

export const isMissingStripeAccountError = (err) => {
  if (!err) return false;
  if (err.code === "resource_missing" || err.code === "account_invalid") return true;
  if (err.statusCode === 404) return true;
  if (
    err.statusCode === 403 &&
    /No such account|does not have access to account|revoked/i.test(String(err.message || ""))
  ) {
    return true;
  }
  return false;
};

const clearStaleConnectAccount = async (user, staleAccountId) => {
  const prev = user.stripeConnect?.toObject ? user.stripeConnect.toObject() : user.stripeConnect || {};
  const clearedMeta = {
    ...prev,
    country: null,
    defaultCurrency: null,
    detailsSubmitted: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    payoutCurrencies: [],
    requirementsCurrentlyDue: [],
    disabledReason: null,
    requirementCollection: null,
    lastDisconnectedAccountId: staleAccountId || prev.lastDisconnectedAccountId || null,
    lastSyncedAt: new Date(),
  };
  await User.findByIdAndUpdate(user._id, {
    $set: {
      stripeConnectAccountId: null,
      stripeConnect: clearedMeta,
    },
  });
  user.stripeConnectAccountId = null;
  user.stripeConnect = clearedMeta;
};

const ensureConnectAccount = async (user, country) => {
  const normalizedExistingCountry = String(user.stripeConnect?.country || "").trim().toUpperCase();
  if (user.stripeConnectAccountId && (!country || normalizedExistingCountry === sanitizeCountry(country))) {
    return user;
  }

  const userId = String(user._id);
  const countryCode = sanitizeCountry(country);
  const stripe = getStripe();
  await assertSupportedConnectCountry(countryCode, stripe);

  let createPromise = pendingConnectCreations.get(userId);
  if (!createPromise) {
    createPromise = (async () => {
      const freshUser = await User.findById(user._id).select("stripeConnectAccountId stripeConnect email");
      let replacedAccountId = null;

      if (freshUser?.stripeConnectAccountId) {
        const freshCountry = String(freshUser.stripeConnect?.country || "").trim().toUpperCase();
        if (freshCountry === countryCode) {
          return {
            accountId: freshUser.stripeConnectAccountId,
            stripeConnect: freshUser.stripeConnect,
          };
        }

        const existingAccount = await stripe.accounts.retrieve(freshUser.stripeConnectAccountId);
        if (String(existingAccount.country || "").toUpperCase() === countryCode) {
          const existingMeta = {
            ...(freshUser.stripeConnect || {}),
            country: countryCode,
            requirementCollection: existingAccount.controller?.requirement_collection || "stripe",
          };
          await User.findByIdAndUpdate(user._id, { $set: { stripeConnect: existingMeta } });
          return {
            accountId: existingAccount.id,
            stripeConnect: existingMeta,
          };
        }

        if (existingAccount.details_submitted || existingAccount.payouts_enabled || existingAccount.charges_enabled) {
          const error = new Error("Country cannot be changed after payout setup has been submitted");
          error.status = 409;
          throw error;
        }

        const hasTransfers = await Booking.exists({ teacher: user._id, payoutStatus: "transferred" });
        if (hasTransfers) {
          const error = new Error("Country cannot be changed after payouts have been processed");
          error.status = 409;
          throw error;
        }

        try {
          await stripe.accounts.del(existingAccount.id);
        } catch (delErr) {
          if (delErr?.code !== "resource_missing" && delErr?.statusCode !== 404) {
            throw delErr;
          }
        }

        replacedAccountId = existingAccount.id;
        await User.findByIdAndUpdate(user._id, { $set: { stripeConnectAccountId: null } });
      }

      const frontendUrl = getFrontendUrl();
      const marketplaceUrl =
        frontendUrl.startsWith("https://") && !frontendUrl.toLowerCase().includes("gigreg.com")
          ? frontendUrl
          : "https://gigmake.com";

      const account = await stripe.accounts.create(
        {
          type: "express",
          country: countryCode,
          email: freshUser?.email || user.email,
          business_type: "individual",
          business_profile: {
            mcc: "8999",
            product_description: "Freelance services, gigs and products on GigMake marketplace",
            url: `${marketplaceUrl}/user-profile/${userId}`,
          },
          settings: {
            payments: {
              statement_descriptor: "GIGMAKE",
            },
            payouts: {
              statement_descriptor: "GIGMAKE",
            },
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { userId },
        },
        {
          idempotencyKey: `connect_express_${userId}_${countryCode}_${
            replacedAccountId || freshUser?.stripeConnect?.lastDisconnectedAccountId || "initial"
          }`,
        }
      );

      const connectMeta = {
        ...((freshUser?.stripeConnect || user.stripeConnect || {})),
        country: countryCode,
        defaultCurrency: String(account.default_currency || "").toUpperCase() || null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        payoutCurrencies: [],
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        disabledReason: account.requirements?.disabled_reason || null,
        requirementCollection: account.controller?.requirement_collection || "stripe",
      };

      const updated =
        (await User.findOneAndUpdate(
          {
            _id: user._id,
            $or: [
              { stripeConnectAccountId: { $exists: false } },
              { stripeConnectAccountId: null },
              { stripeConnectAccountId: "" },
            ],
          },
          { $set: { stripeConnectAccountId: account.id, stripeConnect: connectMeta } },
          { new: true }
        )) || (await User.findById(user._id));

      return {
        accountId: updated?.stripeConnectAccountId || account.id,
        stripeConnect: updated?.stripeConnect || connectMeta,
      };
    })().finally(() => {
      pendingConnectCreations.delete(userId);
    });

    pendingConnectCreations.set(userId, createPromise);
  }

  const resolved = await createPromise;
  user.stripeConnectAccountId = resolved.accountId;
  user.stripeConnect = resolved.stripeConnect;
  return user;
};

const syncAccount = async (user) => {
  if (!user.stripeConnectAccountId) return null;
  let account;
  try {
    account = await getStripe().accounts.retrieve(user.stripeConnectAccountId, {
      expand: ["external_accounts"],
    });
  } catch (err) {
    if (isMissingStripeAccountError(err)) {
      console.warn(
        `Clearing stale/missing Stripe Connect account ${user.stripeConnectAccountId} for user ${user._id}: ${err.message}`
      );
      await clearStaleConnectAccount(user, user.stripeConnectAccountId);
      return null;
    }
    throw err;
  }

  const summary = accountSummary(account);
  const prev = user.stripeConnect?.toObject ? user.stripeConnect.toObject() : user.stripeConnect || {};
  user.stripeConnect = {
    ...prev,
    country: summary.country,
    defaultCurrency: summary.defaultCurrency,
    detailsSubmitted: summary.detailsSubmitted,
    chargesEnabled: summary.chargesEnabled,
    payoutsEnabled: summary.payoutsEnabled,
    payoutCurrencies: summary.payoutCurrencies,
    requirementsCurrentlyDue: summary.currentlyDue,
    disabledReason: summary.disabledReason,
    requirementCollection: account.controller?.requirement_collection || null,
    lastSyncedAt: new Date(),
  };
  await user.save();
  return summary;
};

export const getConnectCountries = async (req, res) => {
  try {
    requireTeacher(req.user);
    const countries = await fetchSupportedConnectCountries(getStripe());
    res.json({ status: true, countries });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const getConnectStatus = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    const account = await syncAccount(user);
    res.json({ status: true, connected: Boolean(account), account });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createConnectOnboardingLink = async (req, res) => {
  try {
    requireTeacher(req.user);
    const stripe = getStripe();
    const user = await User.findById(req.user._id);
    await ensureConnectAccount(user, req.body.country || user.stripeConnect?.country);

    const frontendUrl = getFrontendUrl();
    const link = await stripe.accountLinks.create({
      account: user.stripeConnectAccountId,
      refresh_url: `${frontendUrl}/withdraw-request?stripe=refresh`,
      return_url: `${frontendUrl}/withdraw-request?stripe=return`,
      type: "account_onboarding",
      collection_options: { fields: "currently_due" },
    });
    res.json({ status: true, url: link.url });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createConnectAccountSession = async (req, res) => {
  try {
    requireTeacher(req.user);
    const allowedModes = ["all", "onboarding", "management", "notification_banner", "payouts"];
    const user = await User.findById(req.user._id);
    const defaultMode = user?.stripeConnectAccountId ? "all" : "onboarding";
    const mode = allowedModes.includes(req.body.mode) ? req.body.mode : defaultMode;

    if (!user.stripeConnectAccountId) {
      if (!["onboarding", "all"].includes(mode)) {
        return res.status(400).json({ status: false, message: "Complete Stripe setup first" });
      }
      if (!req.body.country) {
        return res.status(400).json({ status: false, message: "Select a payout country first" });
      }
      await ensureConnectAccount(user, req.body.country);
    } else if (
      mode === "onboarding" &&
      req.body.country &&
      String(req.body.country).trim().toUpperCase() !== String(user.stripeConnect?.country || "").toUpperCase()
    ) {
      await ensureConnectAccount(user, req.body.country);
    }

    const stripe = getStripe();
    let requirementCollection = user.stripeConnect?.requirementCollection;
    let accountType = "express";
    if (!requirementCollection) {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      requirementCollection = account.controller?.requirement_collection || "stripe";
      accountType = account.type || "express";
      user.stripeConnect = { ...(user.stripeConnect || {}), requirementCollection };
      await user.save();
    } else if (requirementCollection === "application") {
      accountType = "custom";
    }

    const isAppCollected = requirementCollection === "application";
    const authFeature = isAppCollected ? { disable_stripe_user_authentication: true } : {};

    let components;
    if (mode === "all") {
      components = {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
        account_management: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
        notification_banner: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            ...authFeature,
          },
        },
      };
    } else if (mode === "management") {
      components = {
        account_management: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
      };
    } else if (mode === "notification_banner") {
      components = {
        notification_banner: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
      };
    } else if (mode === "payouts") {
      components = {
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            ...authFeature,
          },
        },
      };
    } else {
      components = {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true, ...authFeature },
        },
      };
    }

    const session = await stripe.accountSessions.create({
      account: user.stripeConnectAccountId,
      components,
    });

    res.json({
      status: true,
      clientSecret: session.client_secret,
      accountType,
    });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createConnectDashboardLink = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    if (!user.stripeConnectAccountId) {
      return res.status(400).json({ status: false, message: "Complete Stripe setup first" });
    }
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    if (account.controller?.stripe_dashboard?.type === "none") {
      return res.status(400).json({
        status: false,
        message: "Manage your payout account directly using Account Management below.",
      });
    }
    const link = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
    res.json({ status: true, url: link.url });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

const groupBookingsToMinorEntries = (bookings) => {
  const totals = new Map();
  for (const booking of bookings) {
    const curr = normalizeCurrency(
      booking.teacherPayoutCurrency ||
        booking.itemSnapshot?.currency ||
        booking.lesson_currency ||
        booking.currency ||
        "USD",
      "USD"
    );
    const rate = typeof booking.commissionRate === "number" ? booking.commissionRate : 0.05;
    const rawAmount =
      booking.teacherPayoutAmount != null
        ? Number(booking.teacherPayoutAmount)
        : Number(booking.amount || 0) * (1 - rate);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;
    totals.set(curr, (totals.get(curr) || 0) + rawAmount);
  }
  return Array.from(totals.entries())
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => ({
      currency: currency.toLowerCase(),
      amount: toSmallestUnit(amount, currency),
    }));
};

export const evaluateDisconnectEligibility = ({ balance, payouts = [], paidBookings = [] }) => {
  const reasons = [];

  const balanceBuckets = [
    ...(Array.isArray(balance?.available) ? balance.available : []),
    ...(Array.isArray(balance?.pending) ? balance.pending : []),
    ...(Array.isArray(balance?.connect_reserved) ? balance.connect_reserved : []),
  ];
  if (balanceBuckets.some((entry) => Number(entry?.amount || 0) !== 0)) {
    reasons.push(
      "Your Stripe balance must be zero before disconnecting (withdraw available funds or wait for pending funds to settle)."
    );
  }

  if (payouts.some((p) => p?.status === "pending" || p?.status === "in_transit")) {
    reasons.push("A payout is currently in transit to your bank. Wait until it completes.");
  }

  if (
    paidBookings.some((b) =>
      ["pending_completion", "pending_connect", "processing"].includes(b?.payoutStatus)
    )
  ) {
    reasons.push("You have active or unsettled orders in escrow. Complete and settle all orders first.");
  }

  if (paidBookings.some((b) => ["pending", "disputed"].includes(b?.refundStatus))) {
    reasons.push("You have an active dispute or refund in progress. Wait until it resolves before disconnecting.");
  }

  return { canDisconnect: reasons.length === 0, reasons };
};

export const getConnectBalance = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);

    if (user.stripeConnectAccountId) {
      try {
        await processPendingTeacherPayouts(user._id);
      } catch (payoutErr) {
        console.warn("Auto process pending payouts check:", payoutErr.message);
      }
    }

    const paidBookings = await Booking.find({
      teacher: user._id,
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
    })
      .select("status payoutStatus refundStatus amount currency lesson_currency itemSnapshot teacherPayoutAmount teacherPayoutCurrency commissionRate")
      .lean();

    const activeNonDisputedBookings = paidBookings.filter(
      (b) => !["refunded", "disputed"].includes(b.refundStatus)
    );

    const inProgressBookings = activeNonDisputedBookings.filter(
      (b) => b.status !== "completed" && b.payoutStatus === "pending_completion"
    );
    const awaitingPayoutBookings = activeNonDisputedBookings.filter(
      (b) => b.status === "completed" && ["pending_connect", "processing"].includes(b.payoutStatus)
    );
    const inProgress = groupBookingsToMinorEntries(inProgressBookings);
    const awaitingPayout = groupBookingsToMinorEntries(awaitingPayoutBookings);
    const allTimeRevenue = groupBookingsToMinorEntries(
      activeNonDisputedBookings.filter((b) => b.status === "completed")
    );

    const disconnectedResponse = () => ({
      status: true,
      connected: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
      defaultCurrency: null,
      available: [],
      pending: [],
      escrow: {
        inProgress,
        inProgressCount: inProgressBookings.length,
        awaitingPayout,
        awaitingPayoutCount: awaitingPayoutBookings.length,
      },
      allTimeRevenue,
      payouts: [],
      disconnectEligibility: { canDisconnect: false, reasons: [] },
    });

    if (!user.stripeConnectAccountId) {
      return res.json(disconnectedResponse());
    }

    const stripe = getStripe();
    let balance;
    let payouts;
    let pendingPayouts;
    let inTransitPayouts;
    try {
      [balance, payouts, pendingPayouts, inTransitPayouts] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount: user.stripeConnectAccountId }),
        stripe.payouts.list({ limit: 25 }, { stripeAccount: user.stripeConnectAccountId }),
        stripe.payouts.list({ status: "pending", limit: 1 }, { stripeAccount: user.stripeConnectAccountId }),
        stripe.payouts.list({ status: "in_transit", limit: 1 }, { stripeAccount: user.stripeConnectAccountId }),
      ]);
    } catch (stripeErr) {
      if (isMissingStripeAccountError(stripeErr)) {
        console.warn(
          `Clearing stale Stripe Connect account ${user.stripeConnectAccountId} during balance fetch: ${stripeErr.message}`
        );
        await clearStaleConnectAccount(user, user.stripeConnectAccountId);
        return res.json(disconnectedResponse());
      }
      throw stripeErr;
    }

    const disconnectEligibility = evaluateDisconnectEligibility({
      balance,
      payouts: [...(pendingPayouts.data || []), ...(inTransitPayouts.data || []), ...(payouts.data || [])],
      paidBookings,
    });

    res.json({
      status: true,
      connected: true,
      detailsSubmitted: Boolean(user.stripeConnect?.detailsSubmitted),
      payoutsEnabled: Boolean(user.stripeConnect?.payoutsEnabled),
      defaultCurrency: user.stripeConnect?.defaultCurrency || null,
      available: balance.available,
      pending: balance.pending,
      escrow: {
        inProgress,
        inProgressCount: inProgressBookings.length,
        awaitingPayout,
        awaitingPayoutCount: awaitingPayoutBookings.length,
      },
      allTimeRevenue,
      disconnectEligibility,
      payouts: payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        currency: String(payout.currency).toUpperCase(),
        status: payout.status,
        arrivalDate: payout.arrival_date,
        created: payout.created,
        method: payout.method,
        failureCode: payout.failure_code || null,
        failureMessage: payout.failure_message || null,
      })),
    });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const disconnectConnectAccount = async (req, res) => {
  const userId = String(req.user?._id || "");
  if (pendingDisconnects.has(userId) || pendingConnectCreations.has(userId)) {
    return res.status(409).json({
      status: false,
      message: "A payout account operation is already in progress. Please wait a moment.",
    });
  }

  pendingDisconnects.add(userId);
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    const oldAccountId = user?.stripeConnectAccountId;

    if (!oldAccountId) {
      return res.status(400).json({ status: false, message: "No connected payout account to disconnect" });
    }

    const stripe = getStripe();
    let balance;
    let pendingPayouts;
    let inTransitPayouts;
    let paidBookings;
    try {
      [balance, pendingPayouts, inTransitPayouts, paidBookings] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount: oldAccountId }),
        stripe.payouts.list({ status: "pending", limit: 1 }, { stripeAccount: oldAccountId }),
        stripe.payouts.list({ status: "in_transit", limit: 1 }, { stripeAccount: oldAccountId }),
        Booking.find({
          teacher: user._id,
          paymentStatus: "paid",
          status: { $ne: "cancelled" },
          $or: [
            { payoutStatus: { $in: ["pending_completion", "pending_connect", "processing"] } },
            { refundStatus: { $in: ["pending", "disputed"] } },
          ],
        })
          .select("payoutStatus refundStatus")
          .lean(),
      ]);
    } catch (stripeErr) {
      if (isMissingStripeAccountError(stripeErr)) {
        await clearStaleConnectAccount(user, oldAccountId);
        return res.json({
          status: true,
          message: "Payout account disconnected. Select your new country to set up payouts.",
        });
      }
      throw stripeErr;
    }

    const eligibility = evaluateDisconnectEligibility({
      balance,
      payouts: [...(pendingPayouts.data || []), ...(inTransitPayouts.data || [])],
      paidBookings,
    });

    if (!eligibility.canDisconnect) {
      return res.status(409).json({
        status: false,
        message: eligibility.reasons[0],
        reasons: eligibility.reasons,
      });
    }

    try {
      await stripe.accounts.del(oldAccountId);
    } catch (delErr) {
      if (!isMissingStripeAccountError(delErr)) {
        return res.status(409).json({ status: false, message: delErr.message });
      }
    }

    await clearStaleConnectAccount(user, oldAccountId);

    res.json({
      status: true,
      message: "Payout account disconnected. Select your new country to set up payouts.",
    });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  } finally {
    pendingDisconnects.delete(userId);
  }
};

export const handleConnectAccountUpdate = async (account) => {
  if (!account?.id) return;
  const userId = account.metadata?.userId;
  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ stripeConnectAccountId: account.id });

  // Ignore delayed webhooks from old, replaced, or already disconnected accounts
  if (!user || !user.stripeConnectAccountId || String(user.stripeConnectAccountId) !== String(account.id)) {
    return;
  }

  await syncAccount(user);
  try {
    await processPendingTeacherPayouts(user._id);
  } catch (payoutErr) {
    console.warn("Auto process pending payouts check on webhook:", payoutErr.message);
  }
};

export const handleConnectAccountDeauthorized = async (accountId) => {
  if (!accountId || !String(accountId).startsWith("acct_")) return;
  const user = await User.findOne({ stripeConnectAccountId: String(accountId) });
  if (!user) return;
  await clearStaleConnectAccount(user, String(accountId));
};

export const computeSafeTransferMinor = ({
  charge = null,
  balanceTransaction = null,
  commissionRate = 0.05,
  payoutAmount = 0,
  earningCurrency = "USD",
}) => {
  if (charge?.disputed) {
    return {
      blocked: true,
      reason: "disputed",
      message: "Transfer blocked: Stripe charge is disputed",
    };
  }

  const chargeAmount = Number(charge?.amount || 0);
  const chargeRefunded = Number(charge?.amount_refunded || 0);
  if (charge?.refunded || (chargeAmount > 0 && chargeRefunded >= chargeAmount)) {
    return {
      blocked: true,
      reason: "refunded",
      message: "Transfer blocked: Stripe charge was fully refunded",
    };
  }

  const remainingRatio =
    chargeAmount > 0 && chargeRefunded > 0 && chargeRefunded < chargeAmount
      ? Math.max(0, (chargeAmount - chargeRefunded) / chargeAmount)
      : 1;

  let transferCurrency;
  let transferAmountMinor;

  if (
    charge?.id &&
    balanceTransaction &&
    balanceTransaction.amount > 0 &&
    balanceTransaction.currency
  ) {
    const netSettlementGross = Math.round(balanceTransaction.amount * remainingRatio);
    transferCurrency = String(balanceTransaction.currency).toLowerCase();
    transferAmountMinor = Math.max(0, Math.round(netSettlementGross * (1 - commissionRate)));
  } else {
    transferCurrency = earningCurrency.toLowerCase();
    transferAmountMinor = toSmallestUnit(Number(payoutAmount || 0) * remainingRatio, earningCurrency);
  }

  return {
    blocked: false,
    transferCurrency,
    transferAmountMinor,
    remainingRatio,
  };
};

export const STALE_PROCESSING_MS = 5 * 60 * 1000;

export const buildClaimablePayoutQuery = (teacherId, now = new Date()) => {
  const staleCutoff = new Date(now.getTime() - STALE_PROCESSING_MS);
  return {
    teacher: teacherId,
    paymentStatus: "paid",
    status: "completed",
    refundStatus: { $nin: ["refunded", "disputed"] },
    $or: [
      { payoutStatus: "pending_connect" },
      {
        payoutStatus: "processing",
        $or: [
          { processingStartedAt: { $lte: staleCutoff } },
          { processingStartedAt: { $exists: false } },
          { processingStartedAt: null },
        ],
      },
    ],
  };
};

export const processPendingTeacherPayouts = async (teacherId) => {
  try {
    if (pendingDisconnects.has(String(teacherId))) {
      return { processed: 0, totalTransferred: 0, reason: "Disconnect in progress" };
    }
    const stripe = getStripe();
    const teacher = await User.findById(teacherId);
    if (!teacher?.stripeConnectAccountId) {
      return { processed: 0, totalTransferred: 0, reason: "No Stripe Connect account" };
    }

    const account = await stripe.accounts.retrieve(teacher.stripeConnectAccountId);
    const isReady = Boolean(account.payouts_enabled && account.capabilities?.transfers === "active");
    if (!isReady) {
      return { processed: 0, totalTransferred: 0, reason: "Account not ready for payouts/transfers" };
    }

    // Find all paid & completed bookings held on platform awaiting transfer (or stale stuck processing > 5m)
    const claimableFilter = buildClaimablePayoutQuery(teacher._id);
    const pendingBookings = await Booking.find(claimableFilter);

    if (!pendingBookings.length) {
      return { processed: 0, totalTransferred: 0 };
    }

    let processedCount = 0;
    let totalTransferred = 0;

    for (const booking of pendingBookings) {
      const claimNow = new Date();
      const claimed = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          ...buildClaimablePayoutQuery(teacher._id, claimNow),
        },
        {
          $set: {
            payoutStatus: "processing",
            processingStartedAt: claimNow,
            transferError: null,
          },
        },
        { new: true }
      );
      if (!claimed) continue;

      try {
        const commissionRate = typeof claimed.commissionRate === "number" ? claimed.commissionRate : 0.05;
        const earningCurrency = normalizeCurrency(
          claimed.teacherPayoutCurrency ||
            claimed.itemSnapshot?.currency ||
            claimed.lesson_currency ||
            claimed.currency ||
            "USD",
          "USD"
        );
        const payoutAmount =
          claimed.teacherPayoutAmount != null
            ? Number(claimed.teacherPayoutAmount)
            : Number(claimed.amount || 0) * (1 - commissionRate);

        let charge = null;
        let balanceTransaction = null;
        const paymentIntentId = claimed.stripePaymentIntentId || claimed.stripe_payment_intent_id;

        if (paymentIntentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["latest_charge.balance_transaction"],
          });
          if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge !== "string") {
            charge = paymentIntent.latest_charge;
            if (charge.balance_transaction && typeof charge.balance_transaction !== "string") {
              balanceTransaction = charge.balance_transaction;
            }
          }
        } else if (claimed.stripeChargeId) {
          charge = await stripe.charges.retrieve(claimed.stripeChargeId, {
            expand: ["balance_transaction"],
          });
          if (charge.balance_transaction && typeof charge.balance_transaction !== "string") {
            balanceTransaction = charge.balance_transaction;
          }
        }

        const sourceTransaction = charge?.id || claimed.stripeChargeId || undefined;
        const transferCalc = computeSafeTransferMinor({
          charge,
          balanceTransaction,
          commissionRate,
          payoutAmount,
          earningCurrency,
        });

        if (transferCalc.blocked) {
          await Booking.findByIdAndUpdate(claimed._id, {
            $set: {
              refundStatus: transferCalc.reason,
              payoutStatus: "cancelled",
              processingStartedAt: null,
              ...(transferCalc.reason === "refunded"
                ? { status: "cancelled", refundedAt: new Date() }
                : {}),
              transferError: transferCalc.message,
            },
          });
          continue;
        }

        const { transferCurrency, transferAmountMinor } = transferCalc;

        if (transferAmountMinor <= 0) {
          await Booking.findByIdAndUpdate(claimed._id, {
            $set: {
              payoutStatus: "pending_connect",
              processingStartedAt: null,
              transferError: "Calculated transfer amount is zero",
            },
          });
          continue;
        }

        const transfer = await stripe.transfers.create(
          {
            amount: transferAmountMinor,
            currency: transferCurrency,
            destination: teacher.stripeConnectAccountId,
            ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
            transfer_group: `booking_${claimed._id}`,
            description: `Payout for order #${claimed._id}`,
            metadata: {
              bookingId: String(claimed._id),
              teacherId: String(teacher._id),
            },
          },
          { idempotencyKey: `transfer_booking_${claimed._id}` }
        );

        const finalizedTransfer = await Booking.findOneAndUpdate(
          { _id: claimed._id, payoutStatus: "processing" },
          {
            $set: {
              payoutStatus: "transferred",
              processingStartedAt: null,
              stripeTransferId: transfer.id,
              stripeChargeId: sourceTransaction || claimed.stripeChargeId,
              transferredAt: new Date(),
              teacherSettlementAmount: transferAmountMinor,
              teacherSettlementCurrency: transferCurrency.toUpperCase(),
              transferError: null,
            },
          },
          { new: true }
        );

        if (finalizedTransfer) {
          await User.findByIdAndUpdate(teacher._id, {
            $inc: {
              [`balances.available.${earningCurrency}`]: -payoutAmount,
            },
          });
        }

        processedCount++;
        totalTransferred += payoutAmount;
      } catch (transferErr) {
        console.error(`Failed to transfer payout for booking ${claimed._id}:`, transferErr.message);
        await Booking.findByIdAndUpdate(claimed._id, {
          $set: {
            payoutStatus: "pending_connect",
            processingStartedAt: null,
            transferError: transferErr.message,
          },
        });
      }
    }

    return { processed: processedCount, totalTransferred };
  } catch (error) {
    console.error("Error in processPendingTeacherPayouts:", error.message);
    return { processed: 0, totalTransferred: 0, error: error.message };
  }
};
