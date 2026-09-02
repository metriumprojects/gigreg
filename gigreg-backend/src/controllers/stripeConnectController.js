import User from "../models/User.js";
import { SUPPORTED_CURRENCIES } from "../services/currencyService.js";
import { getFrontendUrl, getStripe } from "../services/stripeService.js";

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

const ensureConnectAccount = async (user, country) => {
  if (user.stripeConnectAccountId) return user;

  const countryCode = sanitizeCountry(country);
  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: countryCode,
    email: user.email,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { userId: String(user._id) },
  });

  user.stripeConnectAccountId = account.id;
  user.stripeConnect = { ...(user.stripeConnect || {}), country: countryCode };
  await user.save();
  return user;
};

const syncAccount = async (user) => {
  if (!user.stripeConnectAccountId) return null;
  const account = await getStripe().accounts.retrieve(user.stripeConnectAccountId, {
    expand: ["external_accounts"],
  });
  const summary = accountSummary(account);
  user.stripeConnect = {
    country: summary.country,
    defaultCurrency: summary.defaultCurrency,
    detailsSubmitted: summary.detailsSubmitted,
    chargesEnabled: summary.chargesEnabled,
    payoutsEnabled: summary.payoutsEnabled,
    payoutCurrencies: summary.payoutCurrencies,
    requirementsCurrentlyDue: summary.currentlyDue,
    disabledReason: summary.disabledReason,
    lastSyncedAt: new Date(),
  };
  await user.save();
  return summary;
};

export const getConnectCountries = async (req, res) => {
  try {
    requireTeacher(req.user);
    const stripe = getStripe();
    const platform = await stripe.accounts.retrieve();
    const configuredCountries = String(process.env.STRIPE_CONNECT_COUNTRIES || platform.country || "")
      .split(",")
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean);
    const specs = await Promise.all(configuredCountries.map((country) => stripe.countrySpecs.retrieve(country)));
    const countries = specs.map((spec) => ({
      code: spec.id,
      defaultCurrency: String(spec.default_currency).toUpperCase(),
    }));
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
    await ensureConnectAccount(user, req.body.country);

    const frontendUrl = getFrontendUrl();
    const link = await stripe.accountLinks.create({
      account: user.stripeConnectAccountId,
      refresh_url: `${frontendUrl}/withdraw-request?stripe=refresh`,
      return_url: `${frontendUrl}/withdraw-request?stripe=return`,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });
    res.json({ status: true, url: link.url });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createConnectAccountSession = async (req, res) => {
  try {
    requireTeacher(req.user);
    const mode = req.body.mode === "management" ? "management" : "onboarding";
    const user = await User.findById(req.user._id);

    if (!user.stripeConnectAccountId) {
      if (mode === "management") {
        return res.status(400).json({ status: false, message: "Complete Stripe setup first" });
      }
      await ensureConnectAccount(user, req.body.country);
    }

    const components =
      mode === "management"
        ? {
            account_management: {
              enabled: true,
              features: { external_account_collection: true },
            },
          }
        : {
            account_onboarding: {
              enabled: true,
              features: { external_account_collection: true },
            },
          };

    const session = await getStripe().accountSessions.create({
      account: user.stripeConnectAccountId,
      components,
    });

    res.json({ status: true, clientSecret: session.client_secret });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createConnectDashboardLink = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    if (!user.stripeConnectAccountId) return res.status(400).json({ status: false, message: "Complete Stripe setup first" });
    const link = await getStripe().accounts.createLoginLink(user.stripeConnectAccountId);
    res.json({ status: true, url: link.url });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const getConnectBalance = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    if (!user.stripeConnectAccountId) return res.json({ status: true, available: [], pending: [], payouts: [] });
    const stripe = getStripe();
    const [balance, payouts] = await Promise.all([
      stripe.balance.retrieve({}, { stripeAccount: user.stripeConnectAccountId }),
      stripe.payouts.list({ limit: 25 }, { stripeAccount: user.stripeConnectAccountId }),
    ]);
    res.json({
      status: true,
      available: balance.available,
      pending: balance.pending,
      payouts: payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        currency: String(payout.currency).toUpperCase(),
        status: payout.status,
        arrivalDate: payout.arrival_date,
        created: payout.created,
        method: payout.method,
      })),
    });
  } catch (error) {
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const createOrUpdateCustomAccount = async (req, res) => {
  try {
    requireTeacher(req.user);
    const {
      country = "US",
      accountToken,
      firstName,
      lastName,
      email,
      phone,
      dob,
      address,
      ssnLast4,
      idNumber,
      bankAccount,
      bankToken,
      website,
    } = req.body;

    if (!accountToken && (!firstName || !lastName)) {
      return res.status(400).json({ status: false, message: "Legal first name and last name are required" });
    }

    const countryCode = sanitizeCountry(country);
    const stripe = getStripe();
    const user = await User.findById(req.user._id);

    // Prepare external bank account payload
    let externalAccountPayload = null;
    if (bankToken) {
      externalAccountPayload = bankToken;
    } else if (bankAccount?.accountNumber) {
      externalAccountPayload = {
        object: "bank_account",
        country: countryCode,
        currency: (bankAccount.currency || "USD").toLowerCase(),
        account_holder_name: (bankAccount.accountHolderName || `${firstName} ${lastName}`).trim(),
        account_holder_type: "individual",
        account_number: String(bankAccount.accountNumber).trim(),
      };
      if (bankAccount.routingNumber) {
        externalAccountPayload.routing_number = String(bankAccount.routingNumber).trim();
      }
    }

    let account;
    if (!user.stripeConnectAccountId) {
      if (accountToken) {
        // Create Custom Account using token (required for platforms in France/EU)
        const accountCreateParams = {
          type: "custom",
          country: countryCode,
          account_token: accountToken,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            mcc: "5734",
            url: website || "https://gigreg.com",
            product_description: "Freelance services, gigs and builds on Gigreg marketplace",
          },
          metadata: { userId: String(user._id) },
        };

        if (externalAccountPayload) {
          accountCreateParams.external_account = externalAccountPayload;
        }

        account = await stripe.accounts.create(accountCreateParams);
        user.stripeConnectAccountId = account.id;
        user.stripeConnect = { ...(user.stripeConnect || {}), country: countryCode };
        await user.save();
      } else {
        // Direct creation fallback
        const individualData = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: (email || user.email).trim().toLowerCase(),
        };

        if (phone) individualData.phone = String(phone).trim();
        if (dob?.day && dob?.month && dob?.year) {
          individualData.dob = {
            day: Number(dob.day),
            month: Number(dob.month),
            year: Number(dob.year),
          };
        }
        if (address?.line1) {
          individualData.address = {
            line1: address.line1.trim(),
            city: address.city?.trim() || "",
            state: address.state?.trim() || "",
            postal_code: address.postalCode?.trim() || "",
            country: countryCode,
          };
        }
        if (ssnLast4) individualData.ssn_last_4 = String(ssnLast4).trim();
        if (idNumber) individualData.id_number = String(idNumber).trim();

        const clientIp =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
        const tosAcceptance = {
          date: Math.floor(Date.now() / 1000),
          ip: clientIp === "::1" ? "127.0.0.1" : clientIp,
          user_agent: req.headers["user-agent"] || "Gigreg Platform",
        };

        const accountCreateParams = {
          type: "custom",
          country: countryCode,
          email: (email || user.email).trim().toLowerCase(),
          business_type: "individual",
          business_profile: {
            mcc: "5734",
            url: website || "https://gigreg.com",
            product_description: "Freelance services, gigs and builds on Gigreg marketplace",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          tos_acceptance: tosAcceptance,
          individual: individualData,
          metadata: { userId: String(user._id) },
        };

        if (externalAccountPayload) {
          accountCreateParams.external_account = externalAccountPayload;
        }

        account = await stripe.accounts.create(accountCreateParams);
        user.stripeConnectAccountId = account.id;
        user.stripeConnect = { ...(user.stripeConnect || {}), country: countryCode };
        await user.save();
      }
    } else {
      // Update existing Custom Account
      if (accountToken) {
        account = await stripe.accounts.update(user.stripeConnectAccountId, {
          account_token: accountToken,
          business_profile: {
            url: website || "https://gigreg.com",
          },
        });
      } else {
        const individualData = {
          first_name: firstName?.trim(),
          last_name: lastName?.trim(),
        };
        const accountUpdateParams = {
          individual: individualData,
          business_profile: {
            url: website || "https://gigreg.com",
          },
        };
        account = await stripe.accounts.update(user.stripeConnectAccountId, accountUpdateParams);
      }

      // Attach new external bank account if provided
      if (externalAccountPayload) {
        try {
          await stripe.accounts.createExternalAccount(user.stripeConnectAccountId, {
            external_account: externalAccountPayload,
            default_for_currency: true,
          });
        } catch (bankErr) {
          console.warn("External account attach warning:", bankErr.message);
        }
      }
    }

    const summary = await syncAccount(user);
    res.json({
      status: true,
      message: "Custom payout account configured successfully",
      account: summary,
    });
  } catch (error) {
    console.error("Custom account creation error:", error);
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const addCustomBankAccount = async (req, res) => {
  try {
    requireTeacher(req.user);
    const user = await User.findById(req.user._id);
    if (!user.stripeConnectAccountId) {
      return res.status(400).json({ status: false, message: "No connected account found. Please create one first." });
    }

    const { bankToken, bankAccount, country = "US" } = req.body;
    const countryCode = sanitizeCountry(country);
    const stripe = getStripe();

    let externalAccountPayload;
    if (bankToken) {
      externalAccountPayload = bankToken;
    } else if (bankAccount?.accountNumber) {
      externalAccountPayload = {
        object: "bank_account",
        country: countryCode,
        currency: (bankAccount.currency || "USD").toLowerCase(),
        account_holder_name: (bankAccount.accountHolderName || user.name || "Account Holder").trim(),
        account_holder_type: "individual",
        account_number: String(bankAccount.accountNumber).trim(),
      };
      if (bankAccount.routingNumber) {
        externalAccountPayload.routing_number = String(bankAccount.routingNumber).trim();
      }
    } else {
      return res.status(400).json({ status: false, message: "Valid bank account details or bank token required" });
    }

    await stripe.accounts.createExternalAccount(user.stripeConnectAccountId, {
      external_account: externalAccountPayload,
      default_for_currency: true,
    });

    const summary = await syncAccount(user);
    res.json({
      status: true,
      message: "Bank account attached successfully",
      account: summary,
    });
  } catch (error) {
    console.error("Add bank account error:", error);
    res.status(error.status || 500).json({ status: false, message: error.message });
  }
};

export const handleConnectAccountUpdate = async (account) => {
  const userId = account.metadata?.userId;
  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ stripeConnectAccountId: account.id });
  if (user) await syncAccount(user);
};
