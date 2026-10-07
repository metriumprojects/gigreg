import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { User } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import Logo from "../../components/Logo";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";
import CustomDatePicker from "../../components/CustomDatePicker";
import { becomeTeacher, getUser } from "../../redux/reducers/AuthReducer";
import {
  isSellerProfileComplete,
  loadProposalRequest,
  saveProposalRequest,
} from "../../utils/proposalRequest";
import ButtonSpinner from "../../components/ButtonSpinner";

const STEPS = ["name", "dateOfBirth", "country"];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function CreateSellerProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);

  const pendingRequest = useMemo(
    () => location.state?.request || loadProposalRequest(),
    [location.state]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [sellerName, setSellerName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const skippedCompleteProfile = useRef(false);

  const step = STEPS[stepIndex] || "name";

  useEffect(() => {
    if (pendingRequest) saveProposalRequest(pendingRequest);
  }, [pendingRequest]);

  useEffect(() => {
    if (!userInfo || !isSellerProfileComplete(userInfo) || skippedCompleteProfile.current) return;
    skippedCompleteProfile.current = true;
    dispatch(becomeTeacher("teacher")).then((res) => {
      if (res.payload?.status) {
        dispatch(getUser());
        navigate("/seller-created", { state: { request: pendingRequest } });
      }
    });
  }, [dispatch, navigate, pendingRequest, userInfo]);

  useEffect(() => {
    if (!userInfo) return;
    setSellerName(
      (prev) =>
        prev ||
        userInfo.sellerName ||
        userInfo.buyerName ||
        userInfo.name ||
        ""
    );
    setDateOfBirth((prev) => prev || toDateInput(userInfo.dateOfBirth));
    setCountry((prev) => prev || userInfo.country || "");
  }, [userInfo]);

  const createSeller = () => {
    setLoading(true);
    dispatch(
      becomeTeacher({
        role: "teacher",
        sellerName: sellerName.trim(),
        dateOfBirth,
        country: country.trim(),
      })
    )
      .then((res) => {
        if (res.payload?.status) {
          dispatch(getUser());
          navigate("/seller-created", { state: { request: pendingRequest } });
          return;
        }
        toast.error(res.payload?.message || "Unable to create seller profile");
      })
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

  const handleNext = (e) => {
    e.preventDefault();

    if (step === "name") {
      if (!sellerName.trim()) {
        toast.error("Please enter your name");
        return;
      }
      setStepIndex(1);
      return;
    }

    if (step === "dateOfBirth") {
      if (!dateOfBirth) {
        toast.error("Please enter your date of birth");
        return;
      }
      setStepIndex(2);
      return;
    }

    if (step === "country") {
      if (!country.trim()) {
        toast.error("Please enter your country");
        return;
      }
      createSeller();
    }
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] flex-col pt-0 pb-0">
        {/* Top: Logo with 32px top gap + Seller account with 32px gap below logo */}
        <div className="w-full max-w-xl mx-auto px-2 mt-[32px] shrink-0">
          <Logo variant="auth" />

          {/* Create your seller account 32px below logo, aligned with the logo icon */}
          <div className="mt-[32px] flex items-center gap-3">
            <svg
              width="26"
              height="24"
              viewBox="0 0 26 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-hidden="true"
            >
              <path
                d="M20 7L25 12L20 17M25 12L11 12"
                stroke="#212135"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.7023 19C17.3687 19 17.8657 19.6305 17.6195 20.2498C16.4497 23.1923 14.0189 24 9.29413 24C1.64062 23.9999 0.000185013 21.8819 0.000185013 12C0.000185013 2.11813 1.64062 5.52014e-05 9.29413 0C14.0189 0 16.4497 0.807678 17.6195 3.75017C17.8657 4.36951 17.3687 5 16.7023 5C16.2503 5 15.8626 4.69946 15.6787 4.28662C15.539 3.97283 15.3883 3.72215 15.2307 3.51855C14.5043 2.5808 13.1176 2 9.29413 2C5.47114 2.00003 4.08501 2.58094 3.35858 3.51855C2.95317 4.04202 2.59113 4.87607 2.34687 6.29492C2.10269 7.71347 2.00019 9.56405 2.00019 12C2.00019 14.436 2.10269 16.2865 2.34687 17.7051C2.59113 19.1239 2.95317 19.958 3.35858 20.4814C4.08501 21.4191 5.47115 22 9.29413 22C13.1176 22 14.5043 21.4192 15.2307 20.4814C15.3883 20.2779 15.539 20.0272 15.6787 19.7134C15.8626 19.3005 16.2503 19 16.7023 19Z"
                fill="#212135"
              />
            </svg>
            <span className="text-[20px] sm:text-[24px] font-normal text-black tracking-tight leading-none">
              Create your seller account
            </span>
          </div>
        </div>

        {/* Center: Centered between Seller account bottom and page bottom */}
        <div className="my-auto flex w-full flex-1 flex-col items-center justify-center py-2">
          <form
            onSubmit={handleNext}
            className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-[#000000]"
          >
            {step === "name" && (
              <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full">
                <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
                  <label className="text-[14px] font-normal text-black select-none">
                    Name
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Your name"
                    aria-label="Your Name"
                    autoFocus
                    className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                  />
                </div>
                <User className="h-5 w-5 text-black shrink-0" />
              </div>
            )}

            {step === "dateOfBirth" && (
              <CustomDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                label="Date of birth"
                variant="pill"
              />
            )}

            {step === "country" && (
              <CountryAutocomplete
                value={country}
                onChange={setCountry}
                placeholder="Select or type country"
                label="Country"
                variant="pill"
                className="w-full"
              />
            )}

            <div className="flex flex-col items-start gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 w-fit rounded-full bg-primary hover:bg-primary/90 px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading && <ButtonSpinner size={18} />}
                {loading ? "Creating..." : "Next"}
              </button>
              {stepIndex > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStepIndex((prev) => prev - 1)}
                  className="block w-fit rounded-full bg-black hover:bg-neutral-800 px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60 cursor-pointer"
                >
                  Go back
                </button>
              )}
            </div>

            <div className="h-px w-full bg-gray-200" />

            <p className="text-[16px] font-normal">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="font-normal text-black underline underline-offset-2 cursor-pointer"
              >
                Go back to your buyer profile
              </button>
            </p>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
