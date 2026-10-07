import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { getUser, GoogleloginUser, loginUser } from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import { Eye, EyeOff, Calendar, Mail, User } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";
import CustomDatePicker from "../../components/CustomDatePicker";
import ButtonSpinner from "../../components/ButtonSpinner";
import { loadProposalRequest } from "../../utils/proposalRequest";
import Logo from "../../components/Logo";

const SELLER_SETUP_STEPS = ["name", "dateOfBirth", "country"];

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState("login"); // login | sellerSetup
  const [loginAs, setLoginAs] = useState(
    searchParams.get("role") === "seller" || searchParams.get("role") === "teacher"
      ? "seller"
      : "buyer"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [sellerSetupIndex, setSellerSetupIndex] = useState(0);
  const [sellerName, setSellerName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const sellerSetupStep = SELLER_SETUP_STEPS[sellerSetupIndex] || "name";
  const isSellerSetup = step === "sellerSetup";

  const startSellerSetup = useCallback((prefillName = "", idToken = "") => {
    setSellerName(prefillName || "");
    setSellerSetupIndex(0);
    setDateOfBirth("");
    setCountry("");
    setGoogleIdToken(idToken || "");
    setLoginAs("seller");
    setStep("sellerSetup");
  }, []);

  useEffect(() => {
    const state = location.state;
    if (state?.googleSellerSetup && state?.idToken) {
      startSellerSetup(state.buyerName || "", state.idToken);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, startSellerSetup]);

  const finishLogin = (res, pendingGoogleToken) => {
    if (res.payload?.needsSellerSetup) {
      const token =
        typeof pendingGoogleToken === "string" ? pendingGoogleToken : googleIdToken;
      startSellerSetup(res.payload.buyerName || "", token);
      return;
    }
    if (res.payload?.status) {
      setGoogleIdToken("");
      dispatch(getUser());
      const pendingRequest = loadProposalRequest();
      const redirectTo = location.state?.from;
      if (pendingRequest && redirectTo === "/create-seller-profile") {
        navigate("/create-seller-profile", { state: { request: pendingRequest } });
        return;
      }
      if (pendingRequest && (loginAs === "seller" || res.payload.role === "teacher")) {
        navigate("/seller-created", { state: { request: pendingRequest } });
        return;
      }
      const redirectParam = searchParams.get("redirect");
      navigate(redirectParam || redirectTo || "/profile");
      return;
    }
    toast.error(res.payload?.message || "Login failed");
  };

  const handleSignIn = (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    setGoogleIdToken("");
    dispatch(
      loginUser({
        email: email.trim(),
        password,
        loginAs,
      })
    )
      .then((res) => finishLogin(res, ""))
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

  const submitSellerSetup = () => {
    setLoading(true);

    const request = googleIdToken
      ? GoogleloginUser({
          id_token: googleIdToken,
          loginAs: "seller",
          sellerName: sellerName.trim(),
          dateOfBirth,
          country: country.trim(),
        })
      : loginUser({
          email: email.trim(),
          password,
          loginAs: "seller",
          sellerName: sellerName.trim(),
          dateOfBirth,
          country: country.trim(),
        });

    dispatch(request)
      .then(finishLogin)
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

  const handleSellerSetupNext = (e) => {
    e.preventDefault();

    if (sellerSetupStep === "name") {
      if (!sellerName.trim()) {
        toast.error("Please enter your name");
        return;
      }
      setSellerSetupIndex(1);
      return;
    }

    if (sellerSetupStep === "dateOfBirth") {
      if (!dateOfBirth) {
        toast.error("Please select your date of birth");
        return;
      }
      setSellerSetupIndex(2);
      return;
    }

    if (sellerSetupStep === "country") {
      if (!country.trim()) {
        toast.error("Please select or enter your country");
        return;
      }
      submitSellerSetup();
    }
  };

  const cancelSellerSetup = () => {
    setLoading(true);
    dispatch(
      loginUser({
        email: email.trim(),
        password,
        loginAs: "buyer",
      })
    )
      .then((res) => {
        if (res.payload?.status) {
          dispatch(getUser());
          const redirectTo = location.state?.from;
          const redirectParam = searchParams.get("redirect");
          navigate(redirectParam || redirectTo || "/profile");
          return;
        }
        setStep("email");
        setLoginAs("buyer");
        setSellerSetupIndex(0);
        setGoogleIdToken("");
      })
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

  const handleGoogleNeedsSellerSetup = useCallback(
    ({ idToken, buyerName }) => {
      startSellerSetup(buyerName, idToken);
    },
    [startSellerSetup]
  );

  const handleGoogleSuccess = useCallback(() => {
    dispatch(getUser());
    const pendingRequest = loadProposalRequest();
    const redirectTo = location.state?.from;
    if (pendingRequest && redirectTo === "/create-seller-profile") {
      navigate("/create-seller-profile", { state: { request: pendingRequest } });
      return;
    }
    const redirectParam = searchParams.get("redirect");
    navigate(redirectParam || redirectTo || "/profile");
  }, [dispatch, location.state, navigate, searchParams]);

  const onSubmit = isSellerSetup
    ? handleSellerSetupNext
    : handleSignIn;

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] flex-col pt-0 pb-0">
        {/* Top: Logo with 32px top gap + heading with 32px gap below logo */}
        <div className="w-full max-w-xl mx-auto px-2 mt-[32px] shrink-0">
          <Logo variant="auth" />

          {/* Heading 40px below logo */}
          <div className="mt-[40px] flex items-center gap-3">
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
            <span className="font-['DM_Sans',sans-serif] text-[20px] sm:text-[24px] font-normal text-black tracking-tight leading-none">
              {isSellerSetup ? "Create your seller account" : "Log in to your account"}
            </span>
          </div>
        </div>

        {/* Form container: mt-[30px] */}
        <div className="flex w-full flex-1 flex-col items-center justify-start mt-[30px] pb-12">
          <form
            onSubmit={onSubmit}
            className="flex w-full max-w-xl flex-col gap-5 px-2 text-left text-sm text-[#000000]"
          >
            {isSellerSetup && (
              <>
                <h1 className="text-[32px] font-bold">Create your seller account</h1>
                <p className="text-[16px] text-gray-500">You do not have a seller account yet</p>
              </>
            )}

            {!isSellerSetup && (
              <div className="flex w-full rounded-full bg-[#F3F3F3] p-1">
                <button
                  type="button"
                  onClick={() => setLoginAs("buyer")}
                  className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${
                    loginAs === "buyer"
                      ? "bg-white text-black"
                      : "bg-transparent text-gray-600"
                  }`}
                >
                  Log in as a Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setLoginAs("seller")}
                  className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${
                    loginAs === "seller"
                      ? "bg-white text-black"
                      : "bg-transparent text-gray-600"
                  }`}
                >
                  Log in as a Seller
                </button>
              </div>
            )}

            {!isSellerSetup && (
              <>
                <GoogleLoginButton
                  variant="custom"
                  loginAs={loginAs}
                  onNeedsSellerSetup={handleGoogleNeedsSellerSetup}
                  onSuccess={handleGoogleSuccess}
                />

                <p className="text-center text-[16px] text-black font-normal w-full">
                  Or
                </p>

                <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full">
                  <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
                    <label className="text-[14px] font-normal text-black select-none">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address"
                      aria-label="Your email address"
                      autoFocus
                      className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                    />
                  </div>
                  <Mail className="h-5 w-5 text-black shrink-0" />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full">
                  <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
                    <label className="text-[14px] font-normal text-black select-none">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-label="Password"
                      placeholder="Your password"
                      className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="cursor-pointer text-black shrink-0"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </>
            )}

            {isSellerSetup && sellerSetupStep === "name" && (
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

            {isSellerSetup && sellerSetupStep === "dateOfBirth" && (
              <CustomDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                label="Date of birth"
                variant="pill"
              />
            )}

            {isSellerSetup && sellerSetupStep === "country" && (
              <CountryAutocomplete
                value={country}
                onChange={setCountry}
                placeholder="Select or type country"
                label="Country"
                variant="pill"
                className="w-full"
              />
            )}

            <div className="flex flex-col items-stretch gap-3 w-full">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-primary hover:bg-primary/90 py-[14px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              >
                {loading && <ButtonSpinner size={18} />}
                {loading
                  ? isSellerSetup
                    ? "Creating..."
                    : "Logging in..."
                  : isSellerSetup
                    ? "Next"
                    : loginAs === "seller"
                      ? "Log in as Seller"
                      : "Log in as Buyer"}
              </button>
              {isSellerSetup && sellerSetupIndex > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setSellerSetupIndex((prev) => prev - 1)}
                  className="block w-full rounded-full bg-black hover:bg-neutral-800 py-[14px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60 cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
                >
                  Go back
                </button>
              )}
            </div>

            <div className="h-px w-full bg-gray-200" />

            {step !== "sellerSetup" && (
              <Link to="/forget" className="block text-[16px] font-normal text-primary underline underline-offset-2">
                Forgot password
              </Link>
            )}

            {isSellerSetup ? (
              <p className="text-[16px] font-normal">
                <button
                  type="button"
                  onClick={cancelSellerSetup}
                  className="font-normal text-primary underline underline-offset-2"
                >
                  Go back to your buyer profile
                </button>
              </p>
            ) : (
              <p className="text-[16px] font-normal">
                New to Gigslide?{" "}
                <Link
                  to={`/register${
                    searchParams.get("redirect")
                      ? `?redirect=${encodeURIComponent(searchParams.get("redirect"))}${loginAs === "seller" ? "?role=seller" : ""}`
                      : loginAs === "seller" ? "?role=seller" : ""
                  }`}
                  state={location.state}
                  className="font-normal text-primary underline underline-offset-2"
                >
                  Create an account
                </Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
