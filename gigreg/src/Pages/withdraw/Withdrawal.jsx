import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, ChevronRight, ExternalLink, Home, Info, Unlink } from "lucide-react";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import api from "../../redux/api";
import { formatMinorAmount } from "../../utils/formatCurrency";
import {
  StripeConnectProvider,
  StripeConnectSlot,
  useStripeConnectInstance,
} from "./StripeConnectEmbed";

const EMPTY_BALANCE = {
  connected: false,
  available: [],
  pending: [],
  escrow: { inProgress: [], awaitingPayout: [] },
  allTimeRevenue: [],
  payouts: [],
  disconnectEligibility: { canDisconnect: false, reasons: [] },
};

const FALLBACK_COUNTRIES = [
  { code: "AT", defaultCurrency: "EUR" },
  { code: "BE", defaultCurrency: "EUR" },
  { code: "BG", defaultCurrency: "EUR" },
  { code: "CA", defaultCurrency: "CAD" },
  { code: "CH", defaultCurrency: "CHF" },
  { code: "CY", defaultCurrency: "EUR" },
  { code: "CZ", defaultCurrency: "CZK" },
  { code: "DE", defaultCurrency: "EUR" },
  { code: "DK", defaultCurrency: "DKK" },
  { code: "EE", defaultCurrency: "EUR" },
  { code: "ES", defaultCurrency: "EUR" },
  { code: "FI", defaultCurrency: "EUR" },
  { code: "FR", defaultCurrency: "EUR" },
  { code: "GB", defaultCurrency: "GBP" },
  { code: "GI", defaultCurrency: "GBP" },
  { code: "GR", defaultCurrency: "EUR" },
  { code: "HR", defaultCurrency: "EUR" },
  { code: "HU", defaultCurrency: "HUF" },
  { code: "IE", defaultCurrency: "EUR" },
  { code: "IT", defaultCurrency: "EUR" },
  { code: "LI", defaultCurrency: "CHF" },
  { code: "LT", defaultCurrency: "EUR" },
  { code: "LU", defaultCurrency: "EUR" },
  { code: "LV", defaultCurrency: "EUR" },
  { code: "MT", defaultCurrency: "EUR" },
  { code: "NL", defaultCurrency: "EUR" },
  { code: "NO", defaultCurrency: "NOK" },
  { code: "PL", defaultCurrency: "PLN" },
  { code: "PT", defaultCurrency: "EUR" },
  { code: "RO", defaultCurrency: "RON" },
  { code: "SE", defaultCurrency: "SEK" },
  { code: "SI", defaultCurrency: "EUR" },
  { code: "SK", defaultCurrency: "EUR" },
  { code: "US", defaultCurrency: "USD" },
];

const regionNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const formatCountryLabel = (code, currency) => {
  let name = code;
  try {
    name = regionNames?.of(code) || code;
  } catch {
    name = code;
  }
  const suffix = currency ? `${code} · ${currency}` : code;
  return name !== code ? `${name} (${suffix})` : suffix;
};

export const Withdrawal = () => {
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState([]);
  const [connect, setConnect] = useState(null);
  const [balance, setBalance] = useState(EMPTY_BALANCE);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [startOnboarding, setStartOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("payouts"); // "payouts" | "account" | "verification"
  const [mountedAccount, setMountedAccount] = useState(false);
  const [redirectingStripe, setRedirectingStripe] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBalanceLoaded(false);
    try {
      const [statusResult, balanceResult] = await Promise.allSettled([
        api.get("/stripe-connect/status", { withCredentials: true }),
        api.get("/stripe-connect/balance", { withCredentials: true }),
      ]);

      if (statusResult.status === "rejected") {
        throw statusResult.reason;
      }

      const loadedConnect = statusResult.value?.data?.account || null;
      setConnect(loadedConnect);
      if (loadedConnect?.country) {
        setCountry(loadedConnect.country);
      }

      if (balanceResult.status === "fulfilled" && balanceResult.value?.data) {
        setBalance({ ...EMPTY_BALANCE, ...balanceResult.value.data });
        setBalanceLoaded(true);
      }

      const submitted = Boolean(loadedConnect?.detailsSubmitted || loadedConnect?.payoutsEnabled);
      if (!submitted) {
        try {
          const { data: countryData } = await api.get("/stripe-connect/countries", {
            withCredentials: true,
          });
          setCountries(countryData?.countries || []);
        } catch {
          // Fallback option rendered in select if countries endpoint fails
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load payout settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("stripe=return")) {
      toast.info("Returned from Stripe. Updating verification status...");
    }
    load();
    window.scrollTo(0, 0);
  }, [load]);

  const countryOptions = useMemo(() => {
    const source = countries.length > 0 ? countries : FALLBACK_COUNTRIES;
    return [...source].sort((a, b) =>
      formatCountryLabel(a.code, a.defaultCurrency).localeCompare(
        formatCountryLabel(b.code, b.defaultCurrency)
      )
    );
  }, [countries]);

  const isSetupSubmitted = Boolean(connect?.detailsSubmitted || connect?.payoutsEnabled);
  const selectedCountry = country || connect?.country || "";
  const isChangingCountry = Boolean(
    connect && !isSetupSubmitted && selectedCountry && selectedCountry !== connect.country
  );

  const disconnectEligibility = balance.disconnectEligibility || {
    canDisconnect: false,
    reasons: [],
  };
  const canDisconnect = Boolean(
    isSetupSubmitted && balanceLoaded && balance.connected && disconnectEligibility.canDisconnect
  );
  const disconnectReasons = !balanceLoaded
    ? ["Verifying your Stripe balance and active orders before enabling country change."]
    : disconnectEligibility.reasons?.length > 0
    ? disconnectEligibility.reasons
    : ["Unable to verify payout balance right now. Refresh the page and try again."];

  const sessionKey = isSetupSubmitted
    ? `acct:${connect.accountId}`
    : startOnboarding && selectedCountry
    ? `onboarding:${connect?.accountId || "new"}:${selectedCountry}`
    : null;

  const connectInstance = useStripeConnectInstance({
    sessionKey,
    mode: isSetupSubmitted ? "all" : "onboarding",
    country: isSetupSubmitted ? connect?.country : selectedCountry,
  });

  const handleVerifyOnStripeHosted = async () => {
    const targetCountry = isSetupSubmitted ? connect?.country : selectedCountry;
    if (!isSetupSubmitted && !targetCountry) {
      toast.error("Please select your country first");
      return;
    }

    setRedirectingStripe(true);
    try {
      const { data } = await api.post(
        "/stripe-connect/onboarding-link",
        { country: targetCountry },
        { withCredentials: true }
      );
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Unable to generate Stripe verification link");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start Stripe verification");
    } finally {
      setRedirectingStripe(false);
    }
  };

  const handleDisconnectAccount = async () => {
    setDisconnecting(true);
    try {
      const { data } = await api.post("/stripe-connect/disconnect", {}, { withCredentials: true });
      setShowDisconnectModal(false);
      setConnect(null);
      setCountry("");
      setMountedAccount(false);
      setStartOnboarding(false);
      setActiveTab("payouts");
      toast.success(data?.message || "Payout account disconnected. Select your new country.");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to disconnect payout account");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTabSelect = (nextTab) => {
    if (nextTab === "account") setMountedAccount(true);
    setActiveTab(nextTab);
  };

  const handleOnboardingExit = async () => {
    setStartOnboarding(false);
    setActiveTab("payouts");
    toast.success("Payout setup updated. Refreshing status...");
    await load();
  };

  const escrowInProgress = balance.escrow?.inProgress || [];
  const escrowInProgressCount = balance.escrow?.inProgressCount || 0;
  const escrowAwaitingPayout = balance.escrow?.awaitingPayout || [];
  const escrowAwaitingCount = balance.escrow?.awaitingPayoutCount || 0;
  const hasHeldEscrow = escrowInProgress.length > 0 || escrowAwaitingPayout.length > 0;

  const payoutBreadcrumbs = (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3.5 py-1.5 text-xs sm:text-sm text-black select-none"
    >
      <Link
        to="/"
        className="flex items-center gap-1.5 font-medium text-black hover:text-primary transition-colors"
      >
        <Home size={14} className="text-black shrink-0" />
        <span>Home</span>
      </Link>
      <ChevronRight size={13} className="text-gray-400 shrink-0" />
      <Link
        to="/profile?tab=Revenue"
        className="font-medium text-black hover:text-primary transition-colors"
      >
        Seller Profile
      </Link>
      <ChevronRight size={13} className="text-gray-400 shrink-0" />
      <span className="font-semibold text-black">Payouts</span>
    </nav>
  );

  const tabs = [
    { id: "payouts", label: "Payouts & Balance" },
    { id: "account", label: "Account & Banks" },
    ...(!connect?.payoutsEnabled || (connect?.currentlyDue?.length || 0) > 0 || activeTab === "verification"
      ? [{ id: "verification", label: "Verification" }]
      : []),
  ];

  return (
    <MainLayout width="100%" hideSearchCard={true} breadcrumbs={payoutBreadcrumbs}>
      <div className="w-full pt-[10px] lg:pt-0 pb-12">
        {/* Clean Page Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-[28px] leading-tight font-semibold text-black tracking-tight">
              Payouts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your GigMake earnings, payout schedule, and bank accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {loading ? (
              <span
                className="inline-block h-7 w-32 rounded-full bg-gray-100 animate-pulse"
                aria-hidden="true"
              />
            ) : (
              isSetupSubmitted && (
                <span
                  className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border ${
                    connect.payoutsEnabled
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connect.payoutsEnabled ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />
                  {connect.payoutsEnabled ? "Payouts Active" : "Verification Needed"}
                </span>
              )
            )}
            <Link
              to="/profile?tab=Revenue"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#F5F5F5] transition"
            >
              <ArrowLeft size={14} />
              Back to Revenue
            </Link>
          </div>
        </div>

        {loading ? (
          <div aria-busy="true" aria-label="Loading payout settings">
            <div className="mb-5 h-[46px] w-full max-w-[380px] rounded-full bg-gray-100 animate-pulse" />
            <div className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-7 min-h-[360px] shadow-[0_2px_12px_rgba(26,43,73,0.04)]">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-44 rounded-lg bg-gray-100" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="h-24 rounded-2xl bg-gray-100" />
                  <div className="h-24 rounded-2xl bg-gray-100" />
                  <div className="h-24 rounded-2xl bg-gray-100" />
                </div>
                <div className="h-12 w-full rounded-xl bg-gray-100" />
                <div className="h-12 w-full rounded-xl bg-gray-100" />
                <div className="h-12 w-2/3 rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        ) : !isSetupSubmitted ? (
          startOnboarding ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-black">
                  Complete Payout Setup ({selectedCountry})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setStartOnboarding(false);
                    load();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:bg-[#F5F5F5] border border-gray-200 rounded-full px-4 py-1.5 transition"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              </div>

              <StripeConnectProvider key={sessionKey} connectInstance={connectInstance}>
                <StripeConnectSlot
                  mode="onboarding"
                  onExit={handleOnboardingExit}
                  onFallbackClick={handleVerifyOnStripeHosted}
                  fallbackLoading={redirectingStripe}
                />
              </StripeConnectProvider>
            </div>
          ) : (
            <div className="max-w-xl mx-auto mt-4">
              <section className="rounded-3xl bg-[#F5F5F5]/70 border border-gray-200/80 p-8 sm:p-10 text-center space-y-6">
                {hasHeldEscrow && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                          Held GigMake Earnings
                        </p>
                        <div className="text-lg font-bold text-black mt-0.5 flex flex-wrap gap-3">
                          {[...escrowAwaitingPayout, ...escrowInProgress].map((item, idx) => (
                            <span key={idx}>{formatMinorAmount(item.amount, item.currency)}</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full font-semibold">
                        Awaiting Setup
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-2">
                      Complete payout setup below and completed order earnings will transfer automatically.
                    </p>
                  </div>
                )}

                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                  <Building2 size={26} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-black">
                    {connect ? "Finish GigMake Payout Setup" : "Set up GigMake Payouts"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                    {connect
                      ? `Your payout account (${connect.country}${
                          connect.defaultCurrency ? ` · ${connect.defaultCurrency}` : ""
                        }) isn't finished yet. Complete setup to start receiving payouts.`
                      : "Connect your bank account directly on GigMake to receive payouts from completed orders."}
                  </p>
                </div>

                <div className="max-w-xs mx-auto text-left">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Country / Region
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>
                      Select your country
                    </option>
                    {countryOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {formatCountryLabel(c.code, c.defaultCurrency)}
                      </option>
                    ))}
                  </select>
                  {isChangingCountry && (
                    <p className="text-xs text-amber-700 mt-1.5">
                      Switching from {connect.country} to {selectedCountry} will start fresh setup for {selectedCountry}.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={!selectedCountry}
                    onClick={() => setStartOnboarding(true)}
                    className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-7 py-3 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!connect
                      ? "Set Up Payout Account"
                      : isChangingCountry
                      ? "Switch Country & Continue"
                      : "Continue Payout Setup"}
                  </button>

                  {connect && (
                    <button
                      type="button"
                      onClick={handleVerifyOnStripeHosted}
                      disabled={redirectingStripe || !selectedCountry}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-black text-sm font-semibold px-5 py-3 transition disabled:opacity-50 cursor-pointer"
                    >
                      {redirectingStripe ? "Opening..." : "Open in browser"}
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </section>
            </div>
          )
        ) : (
          <StripeConnectProvider connectInstance={connectInstance}>
            <div>
              {/* Stripe Compliance Notification Banner (auto-hides with 0px gap when no actions required) */}
              <StripeConnectSlot
                mode="notification_banner"
                onNotificationsChange={({ total }) => setHasNotifications(Boolean(total > 0))}
                className={hasNotifications ? "mb-5" : ""}
              />

              {/* Compact Verification Action Bar (only when payouts not yet enabled) */}
              {!connect.payoutsEnabled && (
                <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm font-medium text-amber-900">
                    {activeTab === "verification"
                      ? "Complete identity verification below to enable automatic payouts."
                      : "Complete identity verification to enable automatic payouts."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab !== "verification" && (
                      <button
                        type="button"
                        onClick={() => handleTabSelect("verification")}
                        className="rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 transition cursor-pointer"
                      >
                        Complete Verification
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleVerifyOnStripeHosted}
                      disabled={redirectingStripe}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-semibold px-3.5 py-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      {redirectingStripe ? "Opening..." : "Open in browser"}
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Platform Escrow Strip (rendered ONLY when non-zero held escrow exists) */}
              {hasHeldEscrow && (
                <div className="mb-5 rounded-2xl bg-[#F5F5F5] border border-gray-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm">
                    {escrowInProgress.length > 0 && (
                      <div>
                        <span className="text-gray-500">
                          {escrowInProgressCount > 0
                            ? `In Escrow (${escrowInProgressCount} Active ${
                                escrowInProgressCount === 1 ? "Order" : "Orders"
                              }): `
                            : "In Escrow (Active Orders): "}
                        </span>
                        <span className="font-semibold text-black">
                          {escrowInProgress
                            .map((item) => formatMinorAmount(item.amount, item.currency))
                            .join(" · ")}
                        </span>
                      </div>
                    )}
                    {escrowAwaitingPayout.length > 0 && (
                      <div>
                        <span className="text-gray-500">
                          {escrowAwaitingCount > 0
                            ? `Awaiting Transfer (${escrowAwaitingCount}): `
                            : "Awaiting Transfer: "}
                        </span>
                        <span className="font-semibold text-black">
                          {escrowAwaitingPayout
                            .map((item) => formatMinorAmount(item.amount, item.currency))
                            .join(" · ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-gray-500">
                      Funds move to Stripe once orders are confirmed complete.
                    </span>
                    <Link
                      to="/profile?tab=My Orders"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      View orders
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}

              {/* GigMake Signature Pill Tab Switcher */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border-[1.5px] border-black bg-white p-[3.5px]">
                  {tabs.map((tabItem) => (
                    <button
                      key={tabItem.id}
                      type="button"
                      onClick={() => handleTabSelect(tabItem.id)}
                      className={`whitespace-nowrap rounded-full px-5 h-9 text-sm font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                        activeTab === tabItem.id
                          ? "bg-primary text-white shadow-sm"
                          : "text-black hover:bg-gray-100"
                      }`}
                    >
                      {tabItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab 1: Live Stripe Payouts & Balance (kept mounted for instant tab switching) */}
              <div className={activeTab === "payouts" ? "" : "hidden"}>
                <StripeConnectSlot
                  mode="payouts"
                  onFallbackClick={handleVerifyOnStripeHosted}
                  fallbackLoading={redirectingStripe}
                />
              </div>

              {/* Tab 2: Live Stripe Account & Banks (lazy-mounted on first click, then kept mounted) */}
              {mountedAccount && (
                <div className={activeTab === "account" ? "" : "hidden"}>
                  <StripeConnectSlot
                    mode="management"
                    onFallbackClick={handleVerifyOnStripeHosted}
                    fallbackLoading={redirectingStripe}
                  />

                  <section className="mt-5 rounded-3xl border border-gray-200/80 bg-[#F7F7F7] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-black">
                        Change Payout Country
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Current payout region:{" "}
                        <span className="font-semibold text-black">
                          {formatCountryLabel(connect.country, connect.defaultCurrency || "")}
                        </span>
                        . To switch countries, disconnect this payout account once your balance, payouts, and active orders are completely cleared.
                      </p>
                    </div>

                    <div
                      className={`relative group inline-flex shrink-0 ${
                        !canDisconnect ? "cursor-not-allowed" : ""
                      }`}
                      tabIndex={!canDisconnect ? 0 : undefined}
                      aria-describedby={!canDisconnect ? "disconnect-disabled-tooltip" : undefined}
                    >
                      <button
                        type="button"
                        disabled={!canDisconnect || disconnecting}
                        onClick={() => canDisconnect && setShowDisconnectModal(true)}
                        className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs sm:text-sm font-semibold transition ${
                          canDisconnect
                            ? "border-red-200 bg-white text-red-700 hover:bg-red-50 cursor-pointer"
                            : "border-gray-200 bg-gray-100 text-gray-400 pointer-events-none"
                        }`}
                      >
                        <Unlink size={14} />
                        <span>Disconnect & Change Country</span>
                        {!canDisconnect && <Info size={14} className="text-gray-400" />}
                      </button>

                      {!canDisconnect && (
                        <div
                          id="disconnect-disabled-tooltip"
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-0 sm:left-auto sm:right-0 mb-2.5 w-72 sm:w-80 rounded-2xl bg-black px-4 py-3 text-left text-xs text-white shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-30"
                        >
                          <p className="font-semibold text-white mb-1.5">Why is this disabled?</p>
                          <ul className="list-disc pl-4 space-y-1 text-gray-200">
                            {disconnectReasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* Tab 3: Verification / Onboarding */}
              {activeTab === "verification" && (
                <div>
                  <StripeConnectSlot
                    mode="onboarding"
                    onExit={handleOnboardingExit}
                    onFallbackClick={handleVerifyOnStripeHosted}
                    fallbackLoading={redirectingStripe}
                  />
                </div>
              )}
            </div>
          </StripeConnectProvider>
        )}

        {showDisconnectModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-modal-title"
          >
            <div className="rounded-3xl bg-white p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 id="disconnect-modal-title" className="text-lg font-semibold text-black">
                Disconnect & Change Country?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                This will permanently unlink and close your current{" "}
                <span className="font-semibold text-black">{connect?.country}</span> payout account so you can choose a new country and complete payout setup again. This action cannot be undone.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={() => setShowDisconnectModal(false)}
                  className="rounded-full border border-gray-200 bg-white hover:bg-[#F5F5F5] px-5 py-2.5 text-xs sm:text-sm font-semibold text-black transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={handleDisconnectAccount}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {disconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Withdrawal;
