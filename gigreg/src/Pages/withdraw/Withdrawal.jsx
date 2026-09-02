import React, { useCallback, useEffect, useState } from "react";
import MainLayout from "../../components/MainLayout";
import api from "../../redux/api";
import { toast } from "react-toastify";
import CustomPayoutOnboarding from "./CustomPayoutOnboarding";
import { FaBuilding, FaCheckCircle, FaExclamationTriangle, FaPlus, FaTimes } from "react-icons/fa";

const formatMinor = (amount, currency) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(amount || 0) / (currency === "JPY" ? 1 : 100));

export const Withdrawal = () => {
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("US");
  const [countries, setCountries] = useState([]);
  const [connect, setConnect] = useState(null);
  const [balance, setBalance] = useState({ available: [], pending: [], payouts: [] });
  const [showCustomOnboarding, setShowCustomOnboarding] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [addingBank, setAddingBank] = useState(false);
  const [newBankData, setNewBankData] = useState({
    accountHolderName: "",
    routingNumber: "110000000",
    accountNumber: "",
    currency: "USD",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: status }, { data: countryData }] = await Promise.all([
        api.get("/stripe-connect/status", { withCredentials: true }),
        api.get("/stripe-connect/countries", { withCredentials: true }),
      ]);
      setConnect(status.account || null);
      setCountries(countryData.countries || []);
      if (status.account) {
        const { data } = await api.get("/stripe-connect/balance", { withCredentials: true });
        setBalance(data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load Stripe payout setup");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  const handleCustomOnboardingSuccess = async () => {
    setShowCustomOnboarding(false);
    await load();
  };

  const handleAddBankSubmit = async (e) => {
    e.preventDefault();
    if (!newBankData.accountNumber.trim()) {
      toast.error("Please enter account number");
      return;
    }
    setAddingBank(true);
    try {
      const { data } = await api.post(
        "/stripe-connect/custom-bank-account",
        {
          bankAccount: newBankData,
          country: connect?.country || country || "US",
        },
        { withCredentials: true }
      );
      if (data.status) {
        toast.success("Bank account added successfully!");
        setShowAddBankModal(false);
        setNewBankData({
          accountHolderName: "",
          routingNumber: "110000000",
          accountNumber: "",
          currency: "USD",
        });
        await load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add bank account");
    } finally {
      setAddingBank(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Direct Bank Payouts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your payout bank accounts and review your marketplace earnings.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !connect ? (
          showCustomOnboarding ? (
            <CustomPayoutOnboarding
              countries={countries}
              initialCountry={country}
              onSuccess={handleCustomOnboardingSuccess}
              onCancel={() => setShowCustomOnboarding(false)}
            />
          ) : (
            <section className="rounded-2xl bg-white border border-gray-200 p-8 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-800 text-2xl">
                <FaBuilding />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Set up Payout Account</h2>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Connect your bank account directly on Gigreg to receive payments from buyers and client orders.
              </p>

              <button
                onClick={() => setShowCustomOnboarding(true)}
                className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-medium text-sm rounded-xl px-6 py-3 transition shadow-sm"
              >
                <FaPlus className="text-xs" /> Set Up Bank Account
              </button>
            </section>
          )
        ) : (
          <div className="space-y-6">
            {/* Account Status Card */}
            <section className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-gray-900">Custom Payout Account</span>
                    {connect.payoutsEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                        <FaCheckCircle className="text-[10px]" /> Payouts Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <FaExclamationTriangle className="text-[10px]" /> Requirements Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Country: <span className="font-semibold text-gray-700">{connect.country}</span> · Default Currency:{" "}
                    <span className="font-semibold text-gray-700">{connect.defaultCurrency}</span>
                  </p>
                  {!connect.payoutsEnabled && (
                    <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                      <span>Identity verification required by Stripe to activate automatic payouts. Click <strong>Edit Info</strong> to update.</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddBankModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-black text-white hover:bg-gray-800 px-4 py-2.5 rounded-xl transition shadow-sm"
                  >
                    <FaPlus className="text-[10px]" /> Add Bank Account
                  </button>
                  <button
                    onClick={() => setShowCustomOnboarding(true)}
                    className="text-xs font-semibold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3.5 py-2.5 rounded-xl transition"
                  >
                    Edit Info
                  </button>
                </div>
              </div>
            </section>

            {/* Custom Onboarding Modal/Editor */}
            {showCustomOnboarding && (
              <div className="my-6">
                <CustomPayoutOnboarding
                  countries={countries}
                  initialCountry={connect.country}
                  onSuccess={handleCustomOnboardingSuccess}
                  onCancel={() => setShowCustomOnboarding(false)}
                />
              </div>
            )}

            {/* Configured Payout Bank Accounts */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Connected Bank Accounts</h2>
              {connect.externalAccounts?.length ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {connect.externalAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-gray-400 text-sm" />
                          <p className="font-semibold text-sm text-gray-900">{bank.bankName}</p>
                        </div>
                        <p className="text-xs font-mono text-gray-600 mt-1">•••• •••• {bank.last4}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {bank.currency} · {bank.country}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 capitalize">
                        {bank.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  No bank accounts connected yet. Add one to enable payouts.
                </div>
              )}
            </section>

            {/* Balances */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Marketplace Balance</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ...balance.available.map((item) => ({ ...item, label: "Available for Payout" })),
                  ...balance.pending.map((item) => ({ ...item, label: "Pending Processing" })),
                ].map((item, index) => {
                  const currency = String(item.currency).toUpperCase();
                  return (
                    <div
                      key={`${item.label}-${currency}-${index}`}
                      className="rounded-xl bg-gray-50 border border-gray-100 p-4"
                    >
                      <p className="text-xs font-medium text-gray-500">{item.label}</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {formatMinor(item.amount, currency)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Payouts History */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Payout History</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3.5 text-left">Date</th>
                      <th className="p-3.5 text-left">Amount</th>
                      <th className="p-3.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {balance.payouts?.length ? (
                      balance.payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5 text-gray-700">
                            {new Date(payout.created * 1000).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 font-semibold text-gray-900">
                            {formatMinor(payout.amount, payout.currency)}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`capitalize font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                                payout.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {payout.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-4 text-center text-gray-400">
                          No payouts processed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Modal: Add Another Bank Account */}
        {showAddBankModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="font-bold text-gray-900">Add Bank Account</h3>
                <button
                  onClick={() => setShowAddBankModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleAddBankSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={newBankData.accountHolderName}
                    onChange={(e) =>
                      setNewBankData((p) => ({ ...p, accountHolderName: e.target.value }))
                    }
                    placeholder="Full Legal Name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Routing / Sort Code
                  </label>
                  <input
                    type="text"
                    value={newBankData.routingNumber}
                    onChange={(e) =>
                      setNewBankData((p) => ({ ...p, routingNumber: e.target.value }))
                    }
                    placeholder="110000000"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={newBankData.accountNumber}
                    onChange={(e) =>
                      setNewBankData((p) => ({ ...p, accountNumber: e.target.value }))
                    }
                    placeholder="000123456789"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddBankModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingBank}
                    className="text-xs font-semibold px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {addingBank ? "Attaching..." : "Save Bank"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Withdrawal;

