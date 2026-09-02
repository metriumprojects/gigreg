import React, { useState } from "react";
import api from "../../redux/api";
import { toast } from "react-toastify";
import { FaBuilding, FaCheckCircle, FaLock } from "react-icons/fa";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function CustomPayoutOnboarding({
  countries = [],
  initialCountry = "US",
  onSuccess,
  onCancel,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    country: initialCountry || "US",
    firstName: "",
    lastName: "",
    email: "",
    phone: "+12065550100",
    dobDay: "15",
    dobMonth: "05",
    dobYear: "1992",
    line1: "123 Market Street",
    city: "San Francisco",
    state: "CA",
    postalCode: "94103",
    idNumber: "000-00-0000",
    accountHolderName: "",
    routingNumber: "110000000",
    accountNumber: "000123456789",
    accountNumberConfirm: "000123456789",
    currency: "USD",
    agreeToTos: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Quick autofill with Stripe test credentials for testing
  const handleFillTestData = () => {
    setFormData({
      country: "US",
      firstName: "Alex",
      lastName: "Hunter",
      email: "alex.hunter.test@example.com",
      phone: "+12065550100",
      dobDay: "12",
      dobMonth: "08",
      dobYear: "1990",
      line1: "123 Innovation Way",
      city: "San Francisco",
      state: "CA",
      postalCode: "94107",
      idNumber: "000-00-0000",
      accountHolderName: "Alex Hunter",
      routingNumber: "110000000",
      accountNumber: "000123456789",
      accountNumberConfirm: "000123456789",
      currency: "USD",
      agreeToTos: true,
    });
    toast.info("Filled with Stripe official Test credentials!");
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error("Please enter legal first and last name");
        return;
      }
      if (!formData.line1.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
        toast.error("Please complete street address and postal code");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.accountNumber.trim()) {
        toast.error("Please enter your bank account number");
        return;
      }
      if (formData.accountNumber !== formData.accountNumberConfirm) {
        toast.error("Account numbers do not match");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreeToTos) {
      toast.error("Please agree to the Stripe Connected Account Terms to proceed");
      return;
    }

    setLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe could not be initialized. Please check your publishable key.");
      }

      // 1. Create client-side Account Token (required for platforms in France/EU)
      const accountTokenResult = await stripe.createToken("account", {
        business_type: "individual",
        individual: {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          dob: {
            day: Number(formData.dobDay),
            month: Number(formData.dobMonth),
            year: Number(formData.dobYear),
          },
          address: {
            line1: formData.line1.trim(),
            city: formData.city.trim(),
            state: formData.state?.trim() || undefined,
            postal_code: formData.postalCode.trim(),
            country: formData.country,
          },
          ...(formData.idNumber
            ? {
                id_number: formData.idNumber.replace(/\D/g, ""),
                ssn_last_4: formData.idNumber.replace(/\D/g, "").slice(-4),
              }
            : {}),
        },
        tos_shown_and_accepted: true,
      });

      if (accountTokenResult.error) {
        throw new Error(accountTokenResult.error.message);
      }

      // 2. Create client-side Bank Account Token
      let bankTokenId = null;
      if (formData.accountNumber) {
        const bankTokenResult = await stripe.createToken("bank_account", {
          country: formData.country,
          currency: (formData.currency || "USD").toLowerCase(),
          routing_number: formData.routingNumber ? formData.routingNumber.trim() : undefined,
          account_number: formData.accountNumber.trim(),
          account_holder_name: (formData.accountHolderName || `${formData.firstName} ${formData.lastName}`).trim(),
          account_holder_type: "individual",
        });

        if (bankTokenResult.error) {
          throw new Error(bankTokenResult.error.message);
        }
        bankTokenId = bankTokenResult.token.id;
      }

      const payload = {
        country: formData.country,
        accountToken: accountTokenResult.token.id,
        bankToken: bankTokenId,
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      const { data } = await api.post("/stripe-connect/custom-account", payload, {
        withCredentials: true,
      });

      if (data.status) {
        toast.success("Payout bank account set up successfully!");
        if (onSuccess) onSuccess(data.account);
      } else {
        toast.error(data.message || "Failed to configure custom account");
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to create payout account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-black text-white text-sm">
              <FaLock />
            </span>
            <h2 className="text-xl font-bold text-gray-900">Direct Payout Account</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Setup bank payouts directly on your platform with zero third-party redirects.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFillTestData}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition"
          title="Fills form with Stripe test credentials"
        >
          ⚡ Fill Test Data
        </button>
      </div>

      {/* Stepper indicators */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 1 ? "bg-black text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <span className={`text-xs font-medium ${step >= 1 ? "text-gray-900" : "text-gray-400"}`}>
            Personal
          </span>
        </div>

        <div className={`flex-1 h-0.5 mx-3 ${step >= 2 ? "bg-black" : "bg-gray-200"}`} />

        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 2 ? "bg-black text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <span className={`text-xs font-medium ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}>
            Bank Account
          </span>
        </div>

        <div className={`flex-1 h-0.5 mx-3 ${step >= 3 ? "bg-black" : "bg-gray-200"}`} />

        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 3 ? "bg-black text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
          <span className={`text-xs font-medium ${step >= 3 ? "text-gray-900" : "text-gray-400"}`}>
            Confirm
          </span>
        </div>
      </div>

      <form onSubmit={step === 3 ? handleSubmit : handleNext} className="space-y-5">
        {/* STEP 1: Personal & Legal Details */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Country of Residence
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              >
                {countries.length > 0 ? (
                  countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.defaultCurrency})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="US">United States (USD)</option>
                    <option value="GB">United Kingdom (GBP)</option>
                    <option value="CA">Canada (CAD)</option>
                    <option value="FR">France (EUR)</option>
                    <option value="DE">Germany (EUR)</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Legal First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. John"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Legal Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Doe"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seller@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+15555555555"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  name="dobDay"
                  value={formData.dobDay}
                  onChange={handleChange}
                  placeholder="DD"
                  min="1"
                  max="31"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="number"
                  name="dobMonth"
                  value={formData.dobMonth}
                  onChange={handleChange}
                  placeholder="MM"
                  min="1"
                  max="12"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="number"
                  name="dobYear"
                  value={formData.dobYear}
                  onChange={handleChange}
                  placeholder="YYYY"
                  min="1900"
                  max="2010"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  name="line1"
                  value={formData.line1}
                  onChange={handleChange}
                  placeholder="123 Main St"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="State / Region"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Postal Code"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {formData.country === "US"
                  ? "Social Security Number (SSN)"
                  : "National ID / Tax Identification Number"}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  placeholder={formData.country === "US" ? "000-00-0000" : "ID Number"}
                  className="w-48 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
                />
                <span className="text-xs text-gray-500">
                  {formData.country === "US"
                    ? "Test mode: use 000-00-0000 for instant verification"
                    : "Required by Stripe for identity verification"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Payout Bank Account Details */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              <FaBuilding className="text-gray-500 text-lg" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Direct Bank Transfer</p>
                <p className="text-xs text-gray-500">Your marketplace earnings will be deposited into this account.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleChange}
                placeholder={`${formData.firstName} ${formData.lastName}`}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Routing / Sort Code
              </label>
              <input
                type="text"
                name="routingNumber"
                value={formData.routingNumber}
                onChange={handleChange}
                placeholder="110000000 (Test routing)"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-500 mt-1">For US test mode, use routing 110000000</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Bank Account Number
              </label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="000123456789"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirm Bank Account Number
              </label>
              <input
                type="text"
                name="accountNumberConfirm"
                value={formData.accountNumberConfirm}
                onChange={handleChange}
                placeholder="Re-enter bank account number"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Review & Terms of Service Acceptance */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3 text-sm">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Review Details</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-gray-500">Legal Name:</span>
                <span className="font-medium text-gray-900">
                  {formData.firstName} {formData.lastName}
                </span>

                <span className="text-gray-500">Country:</span>
                <span className="font-medium text-gray-900">{formData.country}</span>

                <span className="text-gray-500">Address:</span>
                <span className="font-medium text-gray-900">
                  {formData.line1}, {formData.city} {formData.postalCode}
                </span>

                <span className="text-gray-500">Routing Number:</span>
                <span className="font-mono font-medium text-gray-900">{formData.routingNumber}</span>

                <span className="text-gray-500">Account Number:</span>
                <span className="font-mono font-medium text-gray-900">
                  •••• {formData.accountNumber.slice(-4)}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-2">
              <input
                type="checkbox"
                name="agreeToTos"
                checked={formData.agreeToTos}
                onChange={handleChange}
                required
                className="mt-1 w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
              />
              <span className="text-xs text-gray-700">
                I agree to the terms and verify that the bank details provided belong to me.
              </span>
            </label>
          </div>
        )}

        {/* Form Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              <IoArrowBack /> Back
            </button>
          ) : (
            onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            )
          )}

          {step < 3 ? (
            <button
              type="submit"
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 transition"
            >
              Continue <IoArrowForward />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !formData.agreeToTos}
              className="ml-auto flex items-center gap-2 text-xs font-semibold px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Continue...
                </>
              ) : (
                <>
                  Continue <IoArrowForward />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
