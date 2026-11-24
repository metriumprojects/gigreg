import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FaChartLine } from "react-icons/fa";
import { Link } from "react-router-dom";
import { IoArrowDownOutline } from "react-icons/io5";
import { HiMiniUsers } from "react-icons/hi2";
import { GiBackwardTime } from "react-icons/gi";
import api from "../../../redux/api";
import { useCurrency } from "../../../currency/CurrencyContext";
import { formatMajorAmount, formatMinorAmount } from "../../../utils/formatCurrency";

const mergeMinorBuckets = (...lists) => {
  const totals = new Map();
  for (const list of lists) {
    for (const item of list || []) {
      const code = String(item?.currency || "USD").toUpperCase();
      const amt = Number(item?.amount || 0);
      if (!Number.isFinite(amt) || amt === 0) continue;
      totals.set(code, (totals.get(code) || 0) + amt);
    }
  }
  return Array.from(totals.entries())
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => ({ currency, amount }));
};

const Revenu = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const { currency: headerCurrency } = useCurrency();
  const [liveBalance, setLiveBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingBalance(true);
    api
      .get("/stripe-connect/balance", { withCredentials: true })
      .then(({ data }) => {
        if (active && data?.status) {
          setLiveBalance(data);
        }
      })
      .catch(() => {
        // Fall back to userInfo.balances if live balance endpoint is unavailable
      })
      .finally(() => {
        if (active) setLoadingBalance(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const userCurr = userInfo?.currency || "USD";
  const isConnected = Boolean(liveBalance ? liveBalance.connected : userInfo?.stripeConnectAccountId);
  const isSetupSubmitted = Boolean(
    liveBalance
      ? liveBalance.detailsSubmitted || liveBalance.payoutsEnabled
      : userInfo?.stripeConnect?.detailsSubmitted || userInfo?.stripeConnect?.payoutsEnabled
  );
  const payoutCurrency = String(
    liveBalance?.available?.[0]?.currency ||
      liveBalance?.pending?.[0]?.currency ||
      liveBalance?.defaultCurrency ||
      userInfo?.stripeConnect?.defaultCurrency ||
      ""
  )
    .trim()
    .toUpperCase();
  const displayCurr =
    (isSetupSubmitted && payoutCurrency) || headerCurrency || userCurr || "USD";

  const renderMinorEntries = (entries) => {
    if (!entries.length) {
      return <span>{formatMajorAmount(0, displayCurr)}</span>;
    }
    return entries.map((entry) => (
      <div key={entry.currency}>{formatMinorAmount(entry.amount, entry.currency)}</div>
    ));
  };

  const currencyBalances = (bucket, legacyValue) => {
    const entries = Object.entries(userInfo?.balances?.[bucket] || {}).filter(
      ([, amount]) => Number(amount) > 0
    );
    if (!entries.length && Number(legacyValue) > 0) {
      entries.push([displayCurr, Number(legacyValue)]);
    }
    if (!entries.length) {
      return <span>{formatMajorAmount(0, displayCurr)}</span>;
    }
    return entries.map(([currency, amount]) => (
      <div key={currency}>{formatMajorAmount(amount, currency)}</div>
    ));
  };

  const skeletonValue = (
    <span
      className="inline-block h-6 w-20 rounded-md bg-gray-200 animate-pulse mt-1"
      aria-hidden="true"
    />
  );

  const availableValue = loadingBalance
    ? skeletonValue
    : liveBalance
    ? renderMinorEntries(
        mergeMinorBuckets(liveBalance.available, liveBalance.escrow?.awaitingPayout)
      )
    : currencyBalances("available", userInfo?.money);

  const allTimeValue = loadingBalance
    ? skeletonValue
    : liveBalance
    ? renderMinorEntries(mergeMinorBuckets(liveBalance.allTimeRevenue))
    : currencyBalances("total", userInfo?.moneyTotal);

  const pendingValue = loadingBalance
    ? skeletonValue
    : liveBalance
    ? renderMinorEntries(
        mergeMinorBuckets(liveBalance.pending, liveBalance.escrow?.inProgress)
      )
    : currencyBalances("pending", userInfo?.moneyPending);

  const payoutCtaLabel = isSetupSubmitted
    ? "Manage Payouts & Bank"
    : isConnected
    ? "Finish Payout Setup"
    : "Set Up Payouts";

  const stats = [
    {
      label: "Available Balance",
      value: availableValue,
      icon: <FaChartLine className="text-gray-700 text-xl" />,
      bg: "bg-gray-300",
    },
    {
      label: "All-time revenue",
      value: allTimeValue,
      icon: <HiMiniUsers className="text-purple-600 text-xl" />,
      bg: "bg-purple-100",
    },
    {
      label: "Pending payments",
      value: pendingValue,
      icon: <GiBackwardTime className="text-orange-500 text-xl" />,
      bg: "bg-orange-100",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-[#F5F5F5] rounded-2xl p-4 flex flex-col justify-between md:aspect-square"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 text-sm">{item.label}</p>
                <h2 className="font-medium text-base">{item.value}</h2>
              </div>

              <div className={`${item.bg} p-3 rounded-md`}>{item.icon}</div>
            </div>
            <div>
              {index === 0 && (
                <div className="flex items-center justify-center bg-[#E9EAEE] rounded-full px-2 py-2 w-full mt-4 md:mt-0">
                  <Link
                    to="/withdraw-request"
                    className="flex items-center justify-center gap-1 text-sm text-black text-center w-full"
                  >
                    {payoutCtaLabel} <IoArrowDownOutline />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Revenu;
