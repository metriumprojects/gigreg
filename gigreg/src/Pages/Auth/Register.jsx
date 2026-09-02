import React, { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { registerUser } from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import GoogleLoginButton from "./GoogleLoginButton";
import CountryAutocomplete from "../Home/Components/CountryAutocomplete";

const LOGO_URL =
  "https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png";

const inputClass =
  "w-full rounded border-[1.5px] border-black px-4 py-[12px] text-[16px] outline-none transition-all duration-200 focus:outline-none focus:ring-0";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get("role") === "teacher" ? "seller" : "buyer";

  const [registerAs, setRegisterAs] = useState(initialRole); // buyer | seller
  const [stepIndex, setStepIndex] = useState(0);
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

  const steps = useMemo(
    () =>
      registerAs === "seller"
        ? ["name", "email", "dateOfBirth", "country", "password"]
        : ["name", "email", "password"],
    [registerAs]
  );

  const step = steps[stepIndex] || "name";
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;

  const handleRoleChange = (nextRole) => {
    setRegisterAs(nextRole);
    setStepIndex(0);
    setDateOfBirth("");
    setCountry("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
  };

  const validateCurrentStep = () => {
    if (step === "name") {
      if (!name.trim()) {
        toast.error("Please enter your name");
        return false;
      }
      return true;
    }

    if (step === "email") {
      if (!email.trim()) {
        toast.error("Please enter your email");
        return false;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      if (!emailOk) {
        toast.error("Please enter a valid email");
        return false;
      }
      return true;
    }

    if (step === "dateOfBirth") {
      if (!dateOfBirth) {
        toast.error("Please enter your date of birth");
        return false;
      }
      return true;
    }

    if (step === "country") {
      if (!country.trim()) {
        toast.error("Please enter your country");
        return false;
      }
      return true;
    }

    if (step === "password") {
      if (!password || !confirmPassword) {
        toast.error("Please fill all fields");
        return false;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords don't match");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSignUp = () => {
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
        if (res.payload.status) {
          toast.success(res.payload.message);
          navigate("/login");
        } else {
          toast.error(res.payload.message);
        }
      })
      .catch(() => {
        toast.error("Something went wrong!");
      })
      .finally(() => setLoading(false));
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    if (isLastStep) {
      handleSignUp();
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const handleGoBack = () => {
    if (isFirstStep) return;
    setStepIndex((prev) => prev - 1);
    if (step === "password") {
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
    }
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <form
          onSubmit={handleContinue}
          className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-[#000000]"
        >
          <Link to="/" className="inline-flex" aria-label="Gigreg home">
            <img src={LOGO_URL} alt="Gigreg" className="h-11 w-auto object-contain" />
          </Link>

          <h1 className="text-[32px] font-bold">Create account</h1>

          {isFirstStep && (
            <div className="flex w-full max-w-md rounded-full bg-[#F3F3F3] p-1">
              <button
                type="button"
                onClick={() => handleRoleChange("buyer")}
                className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${
                  registerAs === "buyer"
                    ? "bg-white text-black"
                    : "bg-transparent text-gray-600"
                }`}
              >
                Sign up as a Buyer
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("seller")}
                className={`flex-1 rounded-full px-3 py-[10px] text-[16px] font-medium transition-colors ${
                  registerAs === "seller"
                    ? "bg-white text-black"
                    : "bg-transparent text-gray-600"
                }`}
              >
                Sign up as a Seller
              </button>
            </div>
          )}

          {step === "name" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              aria-label="Your Name"
              autoFocus
              className={inputClass}
            />
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

          {step === "password" && (
            <>
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
              <div className="relative w-full">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  aria-label="Confirm password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!isFirstStep && (
              <button
                type="button"
                disabled={loading}
                onClick={handleGoBack}
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
              {loading ? "Creating..." : "Continue"}
            </button>
          </div>

          {isFirstStep && (
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
              onSuccess={() => navigate("/")}
            />
          )}

          {isFirstStep && (
            <p className="text-[16px] text-gray-600">
              By entering and clicking Continue, you agree to the{" "}
              <Link to="/terms-of-service" className="text-black underline underline-offset-2">
                Terms
              </Link>{" "}
              &{" "}
              <Link to="/privacy-policy" className="text-black underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>
          )}

          <div className="h-px w-full bg-gray-200" />

          <p className="text-[16px]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium underline underline-offset-2">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}
