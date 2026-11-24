import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../redux/api";
import { formatMinorAmount } from "../../../utils/formatCurrency";

const PayoutHistory = () => {
  const [payouts, setPayouts] = useState([]);
  const [connected, setConnected] = useState(true);
  const [setupSubmitted, setSetupSubmitted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get("/stripe-connect/balance", { withCredentials: true })
      .then(({ data }) => {
        if (!active) return;
        setConnected(Boolean(data?.connected));
        setSetupSubmitted(Boolean(data?.detailsSubmitted || data?.payoutsEnabled));
        setPayouts(Array.isArray(data?.payouts) ? data.payouts : []);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || "Unable to load payout history");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading payout history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 max-w-5xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {(!connected || !setupSubmitted) && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900">
          <span>
            {connected
              ? "Your payout setup isn't finished yet. Complete setup to receive automatic bank payouts."
              : "Connect your payout account to start receiving automatic bank payouts."}
          </span>
          <Link
            to="/withdraw-request"
            className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
          >
            {connected ? "Finish Payout Setup" : "Set Up Payout Account"}
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl">
        <table className="w-full rounded-2xl overflow-hidden text-sm">
          <thead className="bg-[#E9EAEE] text-left">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Payout Amount</th>
              <th className="p-4">Payment Method</th>
              <th className="p-4">Expected Arrival</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody className="bg-[#F5F5F5]">
            {payouts.length > 0 ? (
              payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-gray-200/60">
                  <td className="p-4">
                    {payout.created
                      ? new Date(payout.created * 1000).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="p-4 font-semibold">
                    {formatMinorAmount(payout.amount, payout.currency)}
                  </td>
                  <td className="p-4 capitalize">
                    {payout.method === "instant" ? "Instant Payout" : "Bank Transfer"}
                  </td>
                  <td className="p-4">
                    {payout.arrivalDate
                      ? new Date(payout.arrivalDate * 1000).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`capitalize font-semibold px-2.5 py-1 rounded-full text-xs ${
                        payout.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : payout.status === "failed" || payout.status === "canceled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {payout.status}
                    </span>
                    {payout.status === "failed" && (payout.failureMessage || payout.failureCode) && (
                      <p className="mt-1.5 text-xs text-red-600 max-w-xs">
                        {payout.failureMessage || payout.failureCode}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No payout history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayoutHistory;
