import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ArrowRight } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { becomeTeacher, getUser } from "../../redux/reducers/AuthReducer";
import {
  createListingProposalUrl,
  loadProposalRequest,
} from "../../utils/proposalRequest";
import Logo from "../../components/Logo";

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
    dispatch(becomeTeacher({ role: "user", resetSellerInfo: true })).then(() => {
      dispatch(getUser());
      navigate("/profile");
    });
  };

  return (
    <MainLayout hideHeader hideFooter hideMobileMenu contentClassName="!min-h-screen">
      <div className="flex min-h-[calc(100vh-32px)] flex-col pt-0 pb-0">
        {/* Top: Logo + 32px gap Congratulations + subtitle */}
        <div className="w-full max-w-3xl mx-auto px-2 mt-[32px] shrink-0">
          <Logo variant="auth" />

          {/* Heading 40px below logo */}
          <div className="mt-[40px]">
            <h1 className="text-[24px] sm:text-[28px] font-normal leading-snug text-black">
              <span className="inline-flex items-center gap-2.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M12 23C14.4477 23 16.3465 22.8672 17.8271 22.5381C19.2964 22.2115 20.2925 21.7056 20.999 20.999C21.7056 20.2925 22.2115 19.2964 22.5381 17.8271C22.8672 16.3465 23 14.4477 23 12C23 9.55232 22.8672 7.65353 22.5381 6.17285C22.2115 4.70364 21.7056 3.70752 20.999 3.00098C20.2925 2.29443 19.2964 1.78846 17.8271 1.46191C16.3465 1.13284 14.4477 1 12 1C9.55232 1 7.65353 1.13284 6.17285 1.46191C4.70364 1.78846 3.70752 2.29443 3.00098 3.00098C2.29443 3.70752 1.78846 4.70364 1.46191 6.17285C1.13284 7.65353 1 9.55232 1 12C1 14.4477 1.13284 16.3465 1.46191 17.8271C1.78846 19.2964 2.29443 20.2925 3.00098 20.999C3.70752 21.7056 4.70364 22.2115 6.17285 22.5381C7.65353 22.8672 9.55232 23 12 23Z"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 9L11 14"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12L11 14"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Congratulations!</span>
              </span>
            </h1>

            {/* Gap 1: 20px between Congratulations! and subtitle */}
            <p className="mt-[20px] text-[24px] sm:text-[28px] font-normal leading-snug text-black">
              Your seller profile is complete, and you’re all set to create your first listing and start offering your services on Gigslide.
            </p>
          </div>
        </div>

        {/* Gap 2: 30px between subtitle and action buttons */}
        <div className="flex w-full flex-1 flex-col items-center justify-start mt-[30px] pb-12">
          <div className="w-full max-w-3xl space-y-6 px-2">
            {request && (
              <div className="rounded-2xl bg-[#F7F7F7] p-4 md:p-5">
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
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        Create proposal
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center rounded-full bg-primary hover:bg-primary/90 px-6 py-3 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Continue
              </button>

              <button
                type="button"
                onClick={() => navigate("/create-listing")}
                className="inline-flex items-center rounded-full bg-black hover:bg-neutral-800 px-6 py-3 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Create your first listing
              </button>

              <button
                type="button"
                onClick={() => navigate("/withdraw-request")}
                className="inline-flex items-center rounded-full bg-black hover:bg-neutral-800 px-6 py-3 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Add your payment information
              </button>
            </div>

            <div className="h-px w-full bg-gray-200" />

            <div className="text-left text-base text-gray-700">
              <button
                type="button"
                onClick={handleBuyerProfile}
                className="underline underline-offset-2 text-black cursor-pointer"
              >
                Cancel and go back to buyer profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
