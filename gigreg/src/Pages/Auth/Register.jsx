import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Calendar, Mail, User } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { registerUser, loginUser, getUser } from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import GoogleLoginButton from "./GoogleLoginButton";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";
import CustomDatePicker from "../../components/CustomDatePicker";
import ButtonSpinner from "../../components/ButtonSpinner";
import { loadProposalRequest } from "../../utils/proposalRequest";
import Logo from "../../components/Logo";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialRole =
    searchParams.get("role") === "seller" || searchParams.get("role") === "teacher"
      ? "seller"
      : "buyer";

  const [registerAs, setRegisterAs] = useState(initialRole); // buyer | seller
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const role = registerAs === "seller" ? "teacher" : "user";

  const handleRoleChange = (nextRole) => {
    setRegisterAs(nextRole);
  };

  const handleSignUp = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      toast.error("Please enter a valid email");
      return;
    }

    if (registerAs === "seller") {
      if (!dateOfBirth) {
        toast.error("Please enter your date of birth");
        return;
      }
      if (!country.trim()) {
        toast.error("Please enter your country");
        return;
      }
    }

    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    if (!confirmPassword) {
      toast.error("Please confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    if (registerAs === "seller") {
      payload.dateOfBirth = dateOfBirth;
      payload.country = country.trim();
    }

    dispatch(registerUser(payload))
      .then((res) => {
        if (res.payload?.status) {
          toast.success(res.payload.message || "Registration successful!");
          dispatch(
            loginUser({
              email: email.trim(),
              password,
              loginAs: registerAs,
            })
          ).then((loginRes) => {
            if (loginRes.payload?.status) {
              dispatch(getUser());
              const pendingRequest = loadProposalRequest();
              const redirectTo = location.state?.from;
              if (pendingRequest && redirectTo === "/create-seller-profile") {
                navigate("/create-seller-profile", { state: { request: pendingRequest } });
                return;
              }
              if (pendingRequest && (registerAs === "seller" || loginRes.payload.role === "teacher")) {
                navigate("/seller-created", { state: { request: pendingRequest } });
                return;
              }
              const redirectParam = searchParams.get("redirect");
              navigate(redirectParam || redirectTo || "/profile");
            } else {
              const redirectParam = searchParams.get("redirect");
              navigate(`/login${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ""}`, {
                state: location.state,
              });
            }
          });
        } else {
          toast.error(res.payload?.message || "Registration failed");
        }
      })
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

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
              Create your account
            </span>
          </div>
        </div>

        {/* Form container: mt-[30px] */}
        <div className="flex w-full flex-1 flex-col items-center justify-start mt-[30px] pb-12">
          <form
            onSubmit={handleSignUp}
            className="flex w-full max-w-xl flex-col gap-5 px-2 text-left text-sm text-[#000000]"
          >
            <div className="flex w-full rounded-full bg-[#F3F3F3] p-1">
              <button
                type="button"
                onClick={() => handleRoleChange("buyer")}
                className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${registerAs === "buyer"
                    ? "bg-white text-black"
                    : "bg-transparent text-gray-600"
                  }`}
              >
                Sign up as a Buyer
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("seller")}
                className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${registerAs === "seller"
                    ? "bg-white text-black"
                    : "bg-transparent text-gray-600"
                  }`}
              >
                Sign up as a Seller
              </button>
            </div>

            <GoogleLoginButton
              variant="custom"
              loginAs={registerAs}
              onNeedsSellerSetup={({ idToken, buyerName }) => {
                navigate("/login", {
                  state: {
                    googleSellerSetup: true,
                    idToken,
                    buyerName,
                  },
                });
              }}
              onSuccess={() => {
                dispatch(getUser());
                const pendingRequest = loadProposalRequest();
                const redirectTo = location.state?.from;
                if (pendingRequest && redirectTo === "/create-seller-profile") {
                  navigate("/create-seller-profile", { state: { request: pendingRequest } });
                  return;
                }
                const redirectParam = searchParams.get("redirect");
                navigate(redirectParam || redirectTo || "/profile");
              }}
            />

            <p className="text-center text-[16px] text-black font-normal w-full">
              Or
            </p>

            <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full">
              <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
                <label className="text-[14px] font-normal text-black select-none">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your Name"
                  autoFocus
                  className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                />
              </div>
              <User className="h-5 w-5 text-black shrink-0" />
            </div>

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
                  className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                />
              </div>
              <Mail className="h-5 w-5 text-black shrink-0" />
            </div>

            {registerAs === "seller" && (
              <>
                <CustomDatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  label="Date of birth"
                  variant="pill"
                />

                <CountryAutocomplete
                  value={country}
                  onChange={setCountry}
                  placeholder="Select or type country"
                  label="Country"
                  variant="pill"
                  className="w-full"
                />
              </>
            )}

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

            <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[16px] h-[68px] w-full">
              <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
                <label className="text-[14px] font-normal text-black select-none">
                  Confirm password
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-label="Confirm password"
                  placeholder="Confirm your password"
                  className="w-full text-[14px] font-normal text-zinc-900 bg-transparent outline-none focus:outline-none focus:ring-0 p-0 placeholder:text-zinc-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="cursor-pointer text-black shrink-0"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex flex-col items-stretch gap-3 w-full">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 w-full rounded-full bg-primary hover:bg-primary/90 py-[14px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              >
                {loading && <ButtonSpinner size={18} />}
                {loading
                  ? "Signing up..."
                  : registerAs === "seller"
                    ? "Sign up as Seller"
                    : "Sign up as Buyer"}
              </button>
            </div>

            <div className="h-px w-full bg-gray-200" />

            <p className="text-[14px] text-gray-500">
              By entering and clicking Continue, you agree to the{" "}
              <Link to="/terms-of-service" className="text-primary underline underline-offset-2">
                Terms
              </Link>{" "}
              &{" "}
              <Link to="/privacy-policy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>

            <p className="text-[16px] font-normal">
              Already have an account?{" "}
              <Link
                to={`/login${searchParams.get("redirect")
                    ? `?redirect=${encodeURIComponent(searchParams.get("redirect"))}${registerAs === "seller" ? "?role=seller" : ""}`
                    : registerAs === "seller" ? "?role=seller" : ""
                  }`}
                state={location.state}
                className="font-normal text-primary underline underline-offset-2"
              >
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
