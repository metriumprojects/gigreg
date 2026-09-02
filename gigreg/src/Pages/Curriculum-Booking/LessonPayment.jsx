import React, { useEffect, useState } from "react";
import { IoMdArrowBack } from "react-icons/io";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getLessonById } from "../../redux/reducers/LessonReducer";
import { initiateBooking, confirmBooking } from "../../redux/reducers/BookingReducer";
import { toast } from "react-toastify";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import CountryAutocomplete from "../../Pages/Home/Components/CountryAutocomplete";
import { useCurrency } from "../../currency/CurrencyContext";

// const stripePromise = loadStripe("pk_live_S2lVXIHYc94lonIFlKfRmVc400AxxrOk2X");
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

export default function LessonPayment() {
  const { currency, formatPrice, formatOriginalPrice } = useCurrency();
  const { lesson } = useSelector((state) => state.lesson);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [bookingData, setBookingData] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groupDiscount, setGroupDiscount] = useState(0);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: "",
  });

  // Load group discount from URL params
  useEffect(() => {
    const discountParam = searchParams.get('frad213k213jj');
    if (discountParam) {
      setGroupDiscount(parseFloat(discountParam) || 0);
    }
  }, [searchParams]);

  // Load saved date from localStorage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("bookingDateTime"));
    if (data) setBookingData(data);
  }, []);

  useEffect(() => {
    dispatch(getLessonById(id));
  }, [dispatch, id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // -------------------------------
  // CONTINUE BUTTON → CREATE BOOKING + STRIPE SESSION
  // -------------------------------
  const handleContinue = () => {
    setLoading(true);

    const data = {
      id: lesson?._id,
      scheduledAt: bookingData?.newDate,
      firstname: formData.firstName,
      lastname: formData.lastName,
      country: formData.country,
      type: "lesson",
      timezone: bookingData?.timezone,
      checkoutCurrency: currency,
    };

    dispatch(initiateBooking(data)).then((res) => {
      if (res?.payload?.status) {
        toast.success("Booking initialized");
        if (res?.payload?.url) {
          window.location.href = res.payload.url;
        }

        // Save for final confirmation
        localStorage.setItem("bookingId", res?.payload?.bookingId);

      } else {
        toast.error("Error starting booking");
      }

      setLoading(false);
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      {/* Back Button - Updated to match CurriPayment */}
      <div className="w-full max-w-6xl flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-700 hover:text-gray-900 cursor-pointer"
        >
          <IoMdArrowBack className="mr-2 text-xl" />
          <span>Back</span>
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT FORM - Updated UI */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-500">
          {!clientSecret && (
            <>
              <h2 className="text-xl font-semibold mb-6">Student Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-4">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Paul"
                    className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-4">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="James"
                    className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-base font-medium text-gray-700 mb-4">
                  Country
                </label>
                <CountryAutocomplete
                  placeholder="Enter your country"
                  value={formData.country}
                  onChange={(val) => setFormData(prev => ({ ...prev, country: val }))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-primary text-white rounded-md py-3 mt-6 transition hover:bg-primary/95"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            </>
          )}

          {/* Stripe Embedded Checkout - Same logic, just different container */}
          {clientSecret && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Payment Details</h2>
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>

        {/* RIGHT SUMMARY - Updated to match CurriPayment UI */}
        <div className="bg-white p-4 md:p-6 rounded-md shadow-[0px_0px_10px_#bebebe] flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">
              {bookingData?.newDate || "No date selected"}
            </h3>
            <p className="text-gray-700 font-medium mt-2">{lesson?.title}</p>

            <div className="flex items-center mt-3 space-x-2">
              <img
                src={lesson?.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                alt="avatar"
                className="w-10 h-10 rounded-full"
              />
              <span className="text-gray-700 text-base">
                With {lesson?.createdBy?.name || "Instructor"}
              </span>
            </div>

            <div className="mt-6 space-y-2 text-base">
              <div className="flex justify-between">
                <span>Price: </span>
                <span>{formatPrice(lesson?.price || 0, lesson?.currency || "USD")}</span>
              </div>
              {groupDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Group Discount: </span>
                  <span>-{formatPrice(groupDiscount, lesson?.currency || "USD")}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(Math.max(0, (lesson?.price || 0) - groupDiscount), lesson?.currency || "USD")}</span>
              </div>
              {currency !== (lesson?.currency || "USD") && (
                <p className="text-xs text-gray-500 text-right">
                  Original price: {formatOriginalPrice(Math.max(0, (lesson?.price || 0) - groupDiscount), lesson?.currency || "USD")}
                </p>
              )}
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                You will be charged in {currency}. Stripe Checkout will show this currency before you pay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
