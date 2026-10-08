import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import SearchCategoryToolbar from "../Home/Components/SearchCategoryToolbar";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import {
  formatRequestDate,
  loadProposalMessage,
  loadProposalRequest,
} from "../../utils/proposalRequest";
import UserAvatarPlaceholder from "../../components/UserAvatarPlaceholder";

export default function ProposalSubmitted() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useSelector((state) => state.category);
  const [selectedCategory, setSelectedCategory] = useState("");

  const request = useMemo(
    () => location.state?.request || loadProposalRequest(),
    [location.state]
  );
  const listing = location.state?.listing || null;
  const message = useMemo(
    () => location.state?.message || loadProposalMessage() || "",
    [location.state]
  );

  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  const listingPath = listing?.slug
    ? `/listing/${listing.slug}`
    : listing?._id
      ? `/listing/${listing._id}`
      : "/profile";

  const handleSelectCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    navigate(`/?category=${encodeURIComponent(categoryName || "")}`);
  };

  return (
    <MainLayout>
      <SearchCategoryToolbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      <div className="mx-auto w-full max-w-3xl px-2 py-6 space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Check size={18} strokeWidth={3} />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-black">
              Congratulation on submitting your proposal!
            </h1>
          </div>
        </div>

        <p className="text-[16px] text-gray-500">
          Please keep an eye on your inbox, the buyer might contact you.
        </p>

        {request && (
          <div className="rounded-2xl bg-[#F7F7F7] p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:gap-5">
              {request?.images?.[0]?.url ? (
                <img
                  src={request.images[0].url}
                  alt=""
                  className="h-28 w-28 shrink-0 rounded-2xl bg-gray-200 object-cover md:h-36 md:w-36"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    {formatRequestDate(request.updatedAt || request.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {request?.user?.name || "unknown"}
                    </span>
                    {request?.user?.image?.url && request.user.image.url !== "https://i.ibb.co/tpV3m2GW/no-image.png" ? (
                      <img
                        src={request.user.image.url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 overflow-hidden">
                        <UserAvatarPlaceholder className="h-4 w-4 text-[#1A2B49]" />
                      </div>
                    )}
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
              </div>
            </div>
          </div>
        )}

        <div className="min-h-[120px] w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-left text-sm text-gray-900">
          {message || "No custom message"}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(listingPath)}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm text-white"
          >
            See your listing
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
