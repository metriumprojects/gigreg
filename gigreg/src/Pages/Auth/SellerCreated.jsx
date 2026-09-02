import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ArrowRight, Check } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { becomeTeacher, getUser } from "../../redux/reducers/AuthReducer";
import {
  createListingProposalUrl,
  loadProposalRequest,
} from "../../utils/proposalRequest";

const LOGO_URL =
  "https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png";

const formatRequestDate = (value) => {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function SellerCreated() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const request = useMemo(
    () => location.state?.request || loadProposalRequest(),
    [location.state]
  );

  const handleCreateProposal = () => {
    if (!request) {
      navigate("/create-listing");
      return;
    }
    navigate(createListingProposalUrl(request._id));
  };

  const handleBuyerProfile = () => {
    dispatch(becomeTeacher("user")).then(() => {
      dispatch(getUser());
      navigate("/profile");
    });
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-2 py-10">
        <Link to="/" className="inline-flex" aria-label="Gigreg home">
          <img src={LOGO_URL} alt="Gigreg" className="h-11 w-auto object-contain" />
        </Link>

        <div className="mt-12 flex flex-col items-center text-center">
          <div className="flex items-start justify-center gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Check size={18} strokeWidth={3} />
            </span>
            <h1 className="text-left text-[28px] font-bold leading-tight text-black md:text-[32px]">
              Congratulation! You just created your seller profile
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-[16px] text-gray-500">
            You can now create your first listing and send it as a proposal, just click on
            &quot;Send proposal&quot; below
          </p>
        </div>

        {request && (
          <div className="mt-10 rounded-2xl bg-[#F7F7F7] p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:gap-5">
              {request?.images?.[0]?.url ? (
                <img
                  src={request.images[0].url}
                  alt=""
                  className="h-28 w-28 shrink-0 rounded-2xl bg-gray-200 object-cover md:h-36 md:w-36"
                />
              ) : (
                <div className="h-28 w-28 shrink-0 rounded-2xl bg-gray-300 md:h-36 md:w-36" />
              )}

              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    {formatRequestDate(request.updatedAt || request.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {request?.user?.name || "unknown"}
                    </span>
                    <img
                      src={
                        request?.user?.image?.url ||
                        "https://i.ibb.co/tpV3m2GW/no-image.png"
                      }
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-900">
                    Budget ${request?.price}
                  </span>
                  {request?.category && (
                    <span className="rounded-full bg-white px-3 py-1 text-gray-800">
                      {request.category}
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-sm font-semibold text-gray-900">{request.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                  {request.description || "No description available."}
                </p>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateProposal}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Create proposal
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-[16px] text-gray-700">
          <button
            type="button"
            onClick={handleBuyerProfile}
            className="underline underline-offset-2"
          >
            Go back to buyer profile
          </button>
          <span className="mx-2">or</span>
          <Link to="/profile" className="underline underline-offset-2">
            Visit your seller profile
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
