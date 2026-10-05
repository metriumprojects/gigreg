import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { ResetPassword } from "../../redux/reducers/AuthReducer";
import Logo from "../../components/Logo";

const inputClass =
  "w-full rounded border-[1.5px] border-black px-4 py-[12px] text-[16px] outline-none transition-all duration-200 focus:outline-none focus:ring-0";

export default function NewPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [cpassword, setCpassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!password || !cpassword) {
      toast.error("Both fields are required");
      return;
    }
    if (password !== cpassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    dispatch(ResetPassword({ token, password }))
      .then((res) => {
        if (res.payload.status) {
          toast.success(res.payload.message);
          navigate("/login");
        } else {
          toast.error(res.payload.message);
        }
      })
      .catch(() => {
        toast.error("Something went wrong");
      })
      .finally(() => setLoading(false));
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-black"
        >
          <Logo variant="auth" />

          <h1 className="text-[32px] font-bold">Create new password</h1>

          <p className="text-[16px] text-gray-600">
            Enter a new password for your account.
          </p>

          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="New password"
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
              placeholder="Confirm new password"
              value={cpassword}
              onChange={(e) => setCpassword(e.target.value)}
              aria-label="Confirm new password"
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

          <button
            type="submit"
            disabled={loading}
            className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue"}
          </button>

          <div className="h-px w-full bg-gray-200" />

          <p className="text-[16px]">
            Back to{" "}
            <Link to="/login" className="font-medium underline underline-offset-2">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}
