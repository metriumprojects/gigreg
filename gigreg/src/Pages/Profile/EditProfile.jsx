"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader, Trash2 } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { getUser, updateProfile, LogoutUser } from "../../redux/reducers/AuthReducer";
import { deleteUser } from "../../redux/reducers/DashboardReducer";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default function EditProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    buyerName: "",
    sellerName: "",
    dateOfBirth: "",
    country: "",
    bio: "",
    currency: "",
    youtube: "",
    instagram: "",
    hideLesson: false,
    classHosted: false,
    publicType: true,
    confirmPassword: "",
    newPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userInfo) {
      setFormData({
        buyerName: userInfo.buyerName || (userInfo.role === "user" ? userInfo.name : "") || "",
        sellerName: userInfo.sellerName || (userInfo.role === "teacher" ? userInfo.name : "") || "",
        dateOfBirth: toDateInput(userInfo.dateOfBirth),
        country: userInfo.country || "",
        bio: userInfo.bio || "",
        currency: userInfo.currency || "",
        youtube: userInfo.youtube || "",
        instagram: userInfo.instagram || "",
        hideLesson: userInfo.hideLesson || false,
        classHosted: userInfo.classHosted || false,
        publicType: userInfo.publicType !== undefined ? userInfo.publicType : true,
        confirmPassword: "",
        newPassword: "",
      });
    }
  }, [userInfo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleVisibilityChange = (e) => {
    const value = e.target.value === "public";
    setFormData({
      ...formData,
      publicType: value,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.newPassword && formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setErrorMessage("Passwords do not match!");
        return;
      }
    }

    try {
      const result = await dispatch(updateProfile(formData)).unwrap();
      setSuccessMessage(result.message || "Profile updated successfully!");
      dispatch(getUser());
      setFormData((prev) => ({
        ...prev,
        confirmPassword: "",
        newPassword: "",
      }));
      navigate("/profile");
    } catch (err) {
      setErrorMessage(err.message || "Failed to update profile. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!userInfo?._id) {
      toast.error("User ID not found");
      return;
    }

    setIsDeleting(true);
    try {
      const result = await dispatch(deleteUser(userInfo._id)).unwrap();
      toast.success(result.message || "Account deleted successfully!");

      await dispatch(LogoutUser());
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      toast.error(err.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout width={"900px"} className="mx-auto">
      <div className="my-10">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Edit Profile</h1>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {errorMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error.message || "An error occurred"}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Buyer name</label>
            <input
              type="text"
              name="buyerName"
              value={formData.buyerName}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            />
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Seller name</label>
            <input
              type="text"
              name="sellerName"
              value={formData.sellerName}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            />
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Date of birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            />
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Country</label>
            <CountryAutocomplete
              value={formData.country}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, country: value }));
                setErrorMessage("");
                setSuccessMessage("");
              }}
              placeholder="Country"
              className="w-full"
              inputClassName="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0"
            />
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Description</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            />
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Account currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            >
              {["USD", "EUR", "INR", "GBP", "AUD", "CAD", "JPY", "SGD", "CHF", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON"].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <label className="block mb-2 text-sm font-semibold text-gray-900">Account visibility</label>
            <select
              value={formData.publicType ? "public" : "private"}
              onChange={handleVisibilityChange}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 focus:ring-gray-900/20"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="rounded-2xl p-4 bg-[#F7F7F7]">
            <h3 className="font-medium text-gray-900 mb-3">Privacy Settings</h3>

            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                name="hideLesson"
                checked={formData.hideLesson}
                onChange={handleChange}
                className="h-4 w-4 accent-primary"
              />
              <label className="font-medium">Hide Classes Attended</label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="classHosted"
                checked={formData.classHosted}
                onChange={handleChange}
                className="h-4 w-4 accent-primary"
              />
              <label className="font-medium">Hide Classes Hosted</label>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-[#F7F7F7]">
            <label className="block mb-3 font-medium">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-0 bg-white"
            />
          </div>

          <div className=" rounded-2xl p-4 bg-[#F7F7F7]">
            <label className="block mb-3 font-medium">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-0 bg-white"
            />
          </div>

          <div className="flex justify-end w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-fit bg-black text-white font-medium px-6 py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 "
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>

          <div className=" pt-6 bg-[#F7F7F7] rounded-2xl p-4 md:p-5 border border-gray-100">
            <h3 className="text-lg font-semibold text-black mb-2">Delete account</h3>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading || isDeleting}
              className="w-full bg-[#FF0000] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Delete My Account
            </button>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete your account? All of your data will be permanently removed from our servers. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2  rounded-md text-gray-700 font-medium hover:bg-[#F7F7F7] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteAccount();
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Yes, Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
