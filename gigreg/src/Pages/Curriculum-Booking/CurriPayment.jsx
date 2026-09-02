import React from "react";
import { FaArrowLeft } from "react-icons/fa";
import MainLayout from "../../components/MainLayout";
import { IoMdArrowBack } from "react-icons/io";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getLessonById } from "../../redux/reducers/LessonReducer";
import { useEffect } from "react";
import { useState } from "react";
import { confirmBooking, initiateBooking } from "../../redux/reducers/BookingReducer";
import { toast } from "react-toastify";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { getSingleCurriculum } from "../../redux/reducers/CurriculumReducer";
import CountryAutocomplete from "../../Pages/Home/Components/CountryAutocomplete";
import { useCurrency } from "../../currency/CurrencyContext";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

export default function CurriPayment() {
  const { currency } = useCurrency();
    const { singleCurriculum } = useSelector((state) => state.curriculum);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const [bookingData, setBookingData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: ""
  });
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  // stripe
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Get from localStorage
    const storedData = localStorage.getItem('bookingDateTime');
    
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setBookingData(parsedData);
      } catch (error) {
        console.error("Error parsing booking data:", error);
      }
    }
  }, []);

  useEffect(() => {
       dispatch(getSingleCurriculum(id));
  }, [dispatch, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContinue = () => {
    setLoading(true);
    // Prepare the data object as required
    const data = {
      id: singleCurriculum?._id, // lesson._id
      scheduledAt: bookingData?.newDate, // newDate from bookingData
      firstname: formData.firstName,
      lastname: formData.lastName,
      country: formData.country,
      type: "curriculum", // hardcoded as "lesson"
      timezone: bookingData?.timezone,
      checkoutCurrency: currency,
    };
    dispatch(initiateBooking(data)).then((res) => {
      if(res?.payload?.status){
        toast.success(res?.payload?.message || "Booking initialized");
        
        // Check if there's a URL to redirect to (like in LessonPayment)
        if (res?.payload?.url) {
          window.location.href = res.payload.url;
        }
        
        // Set client secret for Embedded Checkout
        setClientSecret(res?.payload?.clientSecret);
        setBookingId(res?.payload?.bookingId);
        
        // Save for final confirmation
        localStorage.setItem("bookingId", res?.payload?.bookingId);
        
      } else {
        toast.error(res.payload?.data.message || "Error starting booking");
      }
      setLoading(false);
    });
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col items-center py-10">
        {/* Header */}
        <div className="w-full flex items-center mb-6">
<button 
  onClick={() => navigate(-1)} 
  className="flex items-center text-gray-700 hover:text-gray-900 cursor-pointer"
>
  <IoMdArrowBack className="mr-2 text-xl" />
  <span>Back</span>
</button>
        </div>

        {/* Main content */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left side: Form */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-500">
            
            {/* Student Information Form - Only show when no clientSecret */}
            {!clientSecret && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-4">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Paul"
                      className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-4">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="James"
                      className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="mt-4">
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
              </>
            )}

            {/* Stripe Embedded Checkout - Show when clientSecret exists */}
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

            {/* Continue Button - Only show when no clientSecret */}
            {!clientSecret && (
              <button 
                onClick={handleContinue}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.country}
                className="w-full bg-primary text-white rounded-md py-2 mt-6 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            )}
          </div>

          {/* Right side: Summary card */}
          <div className="bg-white p-4 md:p-6 rounded-md shadow-[0px_0px_10px_#bebebe] flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {bookingData?.newDate}
              </h3>
              <p className="text-gray-700 font-medium mt-2">{singleCurriculum?.title}</p>

              <div className="flex items-center mt-3 space-x-2">
                <img
                  src={singleCurriculum?.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-gray-700 text-base">With {singleCurriculum?.createdBy?.name}</span>
              </div>

              <div className="mt-6 space-y-2 text-base">
                <div className="flex justify-between">
                  <span>Price: </span>
                  <span>{singleCurriculum?.price}$</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees</span>
               <span>{(singleCurriculum?.price * 0.05).toFixed(2)}$</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>     {singleCurriculum?.price 
        ? (singleCurriculum.price * 1.05).toFixed(2)
        : "0.00"
      }$</span>
                </div>
              </div>
            </div>

            {/* Continue Button for mobile - Only show when no clientSecret */}
            {!clientSecret && (
              <button 
                onClick={handleContinue}
                disabled={loading || !formData.firstName || !formData.lastName || !formData.country}
                className="w-full bg-primary text-white rounded-md py-2 mt-6 transition hover:bg-blue-700 md:hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
