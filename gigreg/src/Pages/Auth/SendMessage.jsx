import React from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../components/MainLayout";

const LOGO_URL =
  "https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png";

const SendMessage = () => {
  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] items-center justify-center py-10">
        <div className="flex w-full max-w-xl flex-col gap-6 px-2 text-left text-sm text-[#000000]">
          <Link to="/" className="inline-flex" aria-label="Gigreg home">
            <img src={LOGO_URL} alt="Gigreg" className="h-11 w-auto object-contain" />
          </Link>

          <h1 className="text-[32px] font-bold">Check your email</h1>

          <p className="text-[16px] text-gray-600">
            An email with a recovery link has been sent to your email.
          </p>

          <Link
            to="/login"
            className="block w-fit rounded-full bg-black px-12 py-[12px] text-center text-[16px] font-medium text-white transition-all duration-200"
          >
            Back to log in
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default SendMessage;
