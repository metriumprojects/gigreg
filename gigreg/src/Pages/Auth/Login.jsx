import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { getUser, GoogleloginUser, loginUser } from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import GoogleLoginButton from "./GoogleLoginButton";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";
import { loadProposalRequest } from "../../utils/proposalRequest";

const LOGO_URL =
  "https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png";

const inputClass =
  "w-full rounded border-[1.5px] border-black px-4 py-[12px] text-[16px] outline-none transition-all duration-200 focus:outline-none focus:ring-0";

const SELLER_SETUP_STEPS = ["name", "dateOfBirth", "country"];

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState("email"); // email | password | sellerSetup
  const [loginAs, setLoginAs] = useState(
    searchParams.get("role") === "teacher" ? "seller" : "buyer"
  ); // buyer | seller
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
      navigate(redirectTo || "/profile");
      return;
    }
    toast.error(res.payload?.message || "Login failed");
  };

  const handleContinue = (e) => {
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
    setStep("password");
  };

  const handleSignIn = (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill all fields");
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
        toast.error("Please enter your date of birth");
        return;
      }
      setSellerSetupIndex(2);
      return;
    }

    if (sellerSetupStep === "country") {
      if (!country.trim()) {
        toast.error("Please enter your country");
        return;
      }
      submitSellerSetup();
    }
  };

  const cancelSellerSetup = () => {
    setLoading(true);

    const request = googleIdToken
      ? GoogleloginUser({
          id_token: googleIdToken,
          loginAs: "buyer",
        })
      : loginUser({
          email: email.trim(),
          password,
          loginAs: "buyer",
        });

    dispatch(request)
      .then((res) => {
        if (res.payload?.status && !res.payload?.needsSellerSetup) {
          setGoogleIdToken("");
          dispatch(getUser());
          navigate("/profile");
          return;
        }
        toast.error(res.payload?.message || "Unable to open buyer profile");
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
    navigate(redirectTo || "/profile");
  }, [dispatch, location.state, navigate]);

  const onSubmit = isSellerSetup
    ? handleSellerSetupNext
    : step === "email"
      ? handleContinue
      : handleSignIn;

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-[#000000]"
        >
          {!isSellerSetup && (
            <Link to="/" className="inline-flex" aria-label="Gigreg home">
              <img src={LOGO_URL} alt="Gigreg" className="h-11 w-auto object-contain" />
            </Link>
          )}

          <h1 className="text-[32px] font-bold">
            {isSellerSetup ? "Create your seller account" : "Log in"}
          </h1>

          {isSellerSetup && (
            <p className="text-[16px] text-gray-500">You do not have a seller account yet</p>
          )}

          {!isSellerSetup && (
            <div className="flex w-full max-w-md rounded-full bg-[#F3F3F3] p-1">
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

          {step === "email" && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoFocus
              className={inputClass}
            />
          )}

          {step === "password" && (
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoFocus
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          {isSellerSetup && sellerSetupStep === "name" && (
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

          {isSellerSetup && sellerSetupStep === "dateOfBirth" && (
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              aria-label="Date of birth"
              autoFocus
              className={inputClass}
            />
          )}

          {isSellerSetup && sellerSetupStep === "country" && (
            <CountryAutocomplete
              value={country}
              onChange={setCountry}
              placeholder="Country"
              className="w-full"
              inputClassName={inputClass}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            {step === "password" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setShowPassword(false);
                }}
                className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
              >
                Go back
              </button>
            )}
            {isSellerSetup && sellerSetupIndex > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setSellerSetupIndex((prev) => prev - 1)}
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
              {loading
                ? isSellerSetup
                  ? "Creating..."
                  : "Signing in..."
                : isSellerSetup
                  ? "Next →"
                  : "Continue"}
            </button>
          </div>

          {step === "email" && (
            <GoogleLoginButton
              variant="custom"
              loginAs={loginAs}
              onNeedsSellerSetup={handleGoogleNeedsSellerSetup}
              onSuccess={handleGoogleSuccess}
            />
          )}

          {step !== "sellerSetup" && (
            <Link to="/forget" className="block text-[16px] underline underline-offset-2">
              Forgot password
            </Link>
          )}

          {isSellerSetup ? (
            <p className="text-[16px] text-gray-600">
              You want to cancel?{" "}
              <button
                type="button"
                onClick={cancelSellerSetup}
                className="font-medium text-black underline underline-offset-2"
              >
                Go back to your buyer profile
              </button>
            </p>
          ) : (
            <>
              <div className="h-px w-full bg-gray-200" />
              <p className="text-[16px]">
                New to Gigreg?{" "}
                <Link
                  to={`/register${loginAs === "seller" ? "?role=teacher" : ""}`}
                  className="font-medium underline underline-offset-2"
                >
                  Create an account
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </MainLayout>
  );
}
