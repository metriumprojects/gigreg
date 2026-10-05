import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../../components/MainLayout";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { forgetPassword } from "../../redux/reducers/AuthReducer";
import Logo from "../../components/Logo";

export default function Forget() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgetPassword = (e) => {
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

    setLoading(true);
    dispatch(forgetPassword(email.trim()))
      .then((res) => {
        if (res.payload.status) {
          toast.success(res.payload.message);
          navigate("/send-message");
        } else {
          toast.error(res.payload.message);
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <form
          onSubmit={handleForgetPassword}
          className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-black"
        >
          <Logo variant="auth" />

          <h1 className="text-[32px] font-bold">Forgot password</h1>

          <p className="text-[16px] text-gray-600">
            Enter your email and we&apos;ll send you a recovery link.
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoFocus
            className="w-full rounded border-[1.5px] border-black px-4 py-[12px] text-[16px] outline-none transition-all duration-200 focus:outline-none focus:ring-0"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => navigate("/login")}
              className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
            >
              Go back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </div>

          <div className="h-px w-full bg-gray-200" />

          <p className="text-[16px]">
            Remember your password?{" "}
            <Link to="/login" className="font-medium underline underline-offset-2">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </MainLayout>
  );
}
