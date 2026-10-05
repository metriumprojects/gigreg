import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";
import { becomeTeacher, getUser } from "../../redux/reducers/AuthReducer";
import {
  isSellerProfileComplete,
  loadProposalRequest,
  saveProposalRequest,
} from "../../utils/proposalRequest";
import Logo from "../../components/Logo";

const inputClass =
  "w-full rounded border-[1.5px] border-black px-4 py-[12px] text-[16px] outline-none transition-all duration-200 focus:outline-none focus:ring-0";

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
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <form
          onSubmit={handleNext}
          className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-black"
        >
          <Logo variant="auth" />

          <h1 className="text-[32px] font-bold">Create your seller account</h1>
          <p className="text-[16px] text-gray-500">You do not have a seller account yet</p>

          {step === "name" && (
            <>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Your Name"
                aria-label="Your Name"
                autoFocus
                className={inputClass}
              />
              <p className="text-[14px] text-gray-500">
                Make sure to enter your real name as we&apos;ll do a later ID verification
              </p>
            </>
          )}

          {step === "dateOfBirth" && (
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              aria-label="Date of birth"
              autoFocus
              className={inputClass}
            />
          )}

          {step === "country" && (
            <CountryAutocomplete
              value={country}
              onChange={setCountry}
              placeholder="Country"
              className="w-full"
              inputClassName={inputClass}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setStepIndex((prev) => prev - 1)}
                className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
              >
                Go back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Next →"}
            </button>
          </div>

          <p className="text-[16px] text-gray-600">
            You want to cancel?{" "}
            <button
              type="button"
              onClick={() => navigate("/teach")}
              className="font-medium text-black underline underline-offset-2"
            >
              Go back to your buyer profile
            </button>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}
