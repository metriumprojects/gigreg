import React, { useEffect, useState } from "react";
import { Store, Layers, CreditCard, Users, Percent, Save } from "lucide-react";
import StatsCard from "../components/StatsCard";
import { useDispatch, useSelector } from "react-redux";
import { getAllData, getSettings, updateSettings } from "../store/Reducer/DashboardReducer";
import { getCategories } from "../store/Reducer/CategoryReducer";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { allData, settings, settingsLoading } = useSelector((state) => state.dashboard);
  const { categories = [] } = useSelector((state) => state.category);
  const [commissionPercent, setCommissionPercent] = useState(5);

  useEffect(() => {
    dispatch(getAllData());
    dispatch(getSettings());
    dispatch(getCategories());
  }, [dispatch]);

  useEffect(() => {
    setCommissionPercent(settings?.commissionPercent ?? 5);
  }, [settings?.commissionPercent]);

  const stats = [
    {
      title: "Total Listings",
      value: allData?.totalListings ?? 0,
      icon: Store,
      color: "bg-blue-500",
    },
    {
      title: "Categories",
      value: categories.length,
      icon: Layers,
      color: "bg-purple-500",
    },
    {
      title: "Total Users",
      value: allData?.totalUser ?? 0,
      icon: Users,
      color: "bg-orange-500",
    },
    {
      title: "Total Payments",
      value: allData?.totalAmount ?? 0,
      icon: CreditCard,
      color: "bg-green-500",
    },
  ];

  const handleCommissionSave = async (event) => {
    event.preventDefault();
    const result = await dispatch(updateSettings({ commissionPercent }));

    if (updateSettings.fulfilled.match(result)) {
      toast.success(result.payload?.message || "Settings updated successfully");
    } else {
      toast.error(result.payload?.message || "Unable to update settings");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gigreg Dashboard</h1>
          <p className="text-sm text-gray-500">Manage listings and categories.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/listings"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Manage Listings
          </Link>
          <Link
            to="/categories"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
          >
            Manage Categories
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <form
        onSubmit={handleCommissionSave}
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary p-4 bg-opacity-10">
              <Percent size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Commission</h2>
              <p className="mt-1 text-sm text-gray-500">
                Applied to seller earnings when a paid listing booking is confirmed.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Commission percentage
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionPercent}
                  onChange={(event) => setCommissionPercent(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 outline-none focus:border-transparent focus:ring-2 focus:ring-primary sm:w-48"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
            </label>

            <button
              type="submit"
              disabled={settingsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {settingsLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;
