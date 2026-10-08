import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  GalleryHorizontalEnd,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Smile,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { startChat } from "../../../redux/reducers/ChatReducer";
import { becomeTeacher, getUser } from "../../../redux/reducers/AuthReducer";
import { getLoginUrl, getSafeRedirectPath } from "../../../utils/authRedirect";
import { getMyListings } from "../../../redux/reducers/ListingReducer";
import { toast } from "react-toastify";
import {
  createListingProposalUrl,
  isSellerProfileComplete,
  saveProposalRequest,
  sendProposalUrl,
} from "../../../utils/proposalRequest";
import UserAvatarPlaceholder from "../../../components/UserAvatarPlaceholder";

// Optimize Cloudinary URLs to load small thumbnails instead of full images
const getOptimizedUrl = (url, width = 600) => {
  if (!url || typeof url !== "string") return url;
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
};

const RequestCard = memo(function RequestCard({
  req,
  isFavorite,
  onSave,
  userInfo,
  isLoading,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { startChatLoading } = useSelector((state) => state.chat);
  const authUser = useSelector((state) => state.auth?.userInfo);
  const effectiveUserInfo = userInfo || authUser;
  const isBuyer = effectiveUserInfo?.role === "user";
  const isSeller = effectiveUserInfo?.role === "teacher";

  const currentUserId = effectiveUserInfo?._id
    ? String(effectiveUserInfo._id)
    : effectiveUserInfo?.id
      ? String(effectiveUserInfo.id)
      : "";
  const requestUserId = req?.user?._id
    ? String(req.user._id)
    : req?.user?.id
      ? String(req.user.id)
      : typeof req?.user === "string"
        ? String(req.user)
        : "";
  const isOwnRequest = Boolean(
    currentUserId && requestUserId && currentUserId === requestUserId
  );

  const formattedDate = (() => {
    if (!req?.updatedAt) return "Date not available";
    const date = new Date(req.updatedAt);
    if (Number.isNaN(date.getTime())) return "Date not available";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  })();

  const getModeText = () => {
    if (req?.isOnline === true && req?.supportsInPerson === true) {
      return "Online & in person";
    }
    if (req?.supportsInPerson === true && req?.isOnline === false) {
      return "In person";
    }
    return "Online";
  };

  const validImages = useMemo(() => {
    if (!Array.isArray(req?.images)) return [];
    return req.images
      .map((img) => (typeof img === "string" ? img : img?.url))
      .filter((url) => Boolean(url && typeof url === "string" && url.trim()));
  }, [req?.images]);

  const coverImg = validImages[0];

  const [userImgError, setUserImgError] = useState(false);
  const userImg = req?.user?.image?.url;
  const hasValidUserImg = Boolean(
    userImg &&
    typeof userImg === "string" &&
    userImg.trim() !== "" &&
    userImg !== "https://i.ibb.co/tpV3m2GW/no-image.png" &&
    !userImgError
  );

  useEffect(() => {
    setUserImgError(false);
  }, [userImg]);

  const [fullscreenGallery, setFullscreenGallery] = useState({
    open: false,
    index: 0,
  });

  const openFullscreen = (index = 0) => {
    setFullscreenGallery({ open: true, index });
  };

  const closeFullscreen = () => {
    setFullscreenGallery((prev) => ({ ...prev, open: false }));
  };

  const nextFullscreen = () => {
    if (validImages.length === 0) return;
    setFullscreenGallery((prev) => ({
      ...prev,
      index: (prev.index + 1) % validImages.length,
    }));
  };

  const prevFullscreen = () => {
    if (validImages.length === 0) return;
    setFullscreenGallery((prev) => ({
      ...prev,
      index: (prev.index - 1 + validImages.length) % validImages.length,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreenGallery.open) return;
      if (e.key === "Escape") closeFullscreen();
      if (e.key === "ArrowRight") nextFullscreen();
      if (e.key === "ArrowLeft") prevFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenGallery.open, validImages.length]);

  const handleMessageCreator = async () => {
    if (!req?.user?._id) {
      toast.error("User information not available");
      return;
    }

    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate(getLoginUrl(location), {
        state: { from: getSafeRedirectPath(location) },
      });
      return;
    }

    if (userInfo?._id === req.user._id) {
      toast.info("You cannot message yourself.");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: req.user._id })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      toast.success("Chat ready.");
      navigate(`/chat/${roomId}`);
    } catch (error) {
      const message = typeof error === "string" ? error : "Failed to start chat.";
      toast.error(message);
    }
  };

  const handleBecomeSeller = () => {
    if (!userInfo?._id) {
      saveProposalRequest(req);
      navigate("/login", { state: { from: "/create-seller-profile" } });
      return;
    }

    saveProposalRequest(req);

    if (!isSellerProfileComplete(userInfo)) {
      navigate("/create-seller-profile", { state: { request: req } });
      return;
    }

    dispatch(becomeTeacher("teacher")).then((res) => {
      if (res.payload?.needsSellerSetup) {
        navigate("/create-seller-profile", { state: { request: req } });
        return;
      }
      if (res.payload?.status) {
        dispatch(getUser());
        navigate("/seller-created", { state: { request: req } });
        return;
      }
      toast.error(res.payload?.message || "Unable to switch to seller");
    });
  };

  const handlePropose = () => {
    saveProposalRequest(req);
    dispatch(getMyListings({ page: 1, limit: 50 })).then((res) => {
      const sellerListings = res.payload?.listings || [];
      if (sellerListings.length > 0) {
        navigate(sendProposalUrl(req._id));
        return;
      }
      navigate(createListingProposalUrl(req._id));
    });
  };

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-2xl bg-[#F7F7F7] transition hover:shadow-md h-full">
        {/* Content Body */}
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {/* Creator Header */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-900 overflow-hidden">
                {hasValidUserImg ? (
                  <img
                    src={userImg}
                    alt={req?.user?.name || "User"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setUserImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserAvatarPlaceholder className="h-[18px] w-[18px] text-gray-900" fill="none" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 leading-snug truncate">
                  {req?.user?.name || (isOwnRequest ? "You" : "unknown")}
                  {isOwnRequest && req?.user?.name ? " (You)" : ""}
                </h4>
                <p className="text-[11px] sm:text-xs text-gray-500 truncate">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F7F7F7] border border-gray-900 text-gray-900 font-normal text-[11px] sm:text-xs">
              Budget: ${req?.price}
            </span>
            {req?.category && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#F7F7F7] border border-gray-900 text-gray-900 font-normal text-[11px] sm:text-xs">
                {req.category}
              </span>
            )}
            {!isBuyer && (
              <>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F7F7F7] border border-gray-900 text-gray-900 font-normal text-[11px] sm:text-xs">
                  {getModeText()}
                </span>
                {req?.location && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F7F7F7] border border-gray-900 text-gray-900 font-normal text-[11px] sm:text-xs">
                    {req.location}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Title & Description */}
          <div className="mt-2.5 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug line-clamp-1 sm:line-clamp-2">
              {req.title}
            </h3>
            <p className="mt-1 text-xs text-gray-600 line-clamp-2 sm:line-clamp-3 leading-relaxed">
              {req?.description || "No description available."}
            </p>
          </div>

          {/* Action Buttons: Pill Style, Aligned to Left */}
          {isBuyer && !isOwnRequest && (
            <div className="pt-3 mt-auto">
              <button
                type="button"
                onClick={handleBecomeSeller}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
              >
                <Smile size={14} />
                Become a seller and send a proposal
              </button>
            </div>
          )}

          {isSeller && !isOwnRequest && (
            <div className="flex flex-wrap items-center gap-2 pt-3 mt-auto">
              <button
                onClick={handleMessageCreator}
                disabled={startChatLoading}
                className="inline-flex items-center justify-center gap-1.5 bg-[#E9EAEE] hover:bg-gray-300 text-gray-900 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1C14.4525 1 16.3622 1.11115 17.8555 1.39844C19.3435 1.68476 20.3442 2.13238 21.0449 2.75C22.437 3.97718 23 6.1956 23 10.667C23 13.5483 22.7414 15.6686 22.0449 17.0498C21.7106 17.7128 21.2866 18.1796 20.7539 18.4902C20.2155 18.8041 19.4936 19 18.5 19C17.2191 19 16.2577 19.2876 15.5059 19.7969C14.7719 20.2942 14.3293 20.9457 14 21.4639C13.6386 22.0325 13.444 22.3727 13.1562 22.6309C12.9352 22.8292 12.6259 23 12 23C11.3746 22.9999 11.0658 22.8291 10.8447 22.6309C10.557 22.3727 10.3622 22.0323 10.001 21.4639C9.67166 20.9457 9.22903 20.2941 8.49512 19.7969C7.74319 19.2874 6.78116 19 5.5 19C4.51162 19 3.79216 18.7989 3.25391 18.4785C2.71973 18.1605 2.29346 17.6827 1.95703 17.0098C1.25819 15.6116 1.00002 13.488 1 10.667C1 6.25226 1.56212 4.02877 2.95898 2.78711C3.66173 2.16245 4.66331 1.70573 6.14941 1.41211C7.64112 1.11742 9.54954 1 12 1Z" />
                </svg>
                <span>{startChatLoading ? "Starting..." : "Message me"}</span>
              </button>

              <button
                onClick={handlePropose}
                className="inline-flex items-center justify-center gap-1.5 bg-[#E9EAEE] hover:bg-gray-300 text-gray-900 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9.83581 14.1705L12.4897 11.5198M9.83581 14.1705C7.89031 16.1172 -0.293762 12.695 1.17594 8.36715C2.64565 4.0393 18.7404 -1.24555 21.9938 2.00986C25.2472 5.26527 19.9416 21.4206 15.6356 22.8357C11.3295 24.2507 7.89031 16.1172 9.83581 14.1705Z" />
                </svg>
                <span>Send me a proposal</span>
              </button>

              <button
                onClick={() => onSave(req?._id)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 bg-[#E9EAEE] hover:bg-gray-300 text-gray-900 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "fill-none text-gray-900"
                        }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7.6 1C9.29038 1 10.8323 1.84142 12 2.8C13.1677 1.84142 14.7096 1 16.4 1C20.0451 1 23 3.71049 23 7.05386C23 13.795 15.3274 17.721 12.7981 18.8321C12.2886 19.056 11.7114 19.056 11.2019 18.8321C8.67259 17.721 1 13.7948 1 7.0537C1 3.71033 3.95492 1 7.6 1Z" />
                    </svg>
                    <span>{isFavorite ? "Saved" : "Add to Favorite"}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Cover Image (Review Card Style with Multi-image Badge) */}
        {coverImg && (
          <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-gray-200 group mt-auto">
            <img
              src={getOptimizedUrl(coverImg, 600)}
              alt={req?.title || "Request image"}
              onClick={() => openFullscreen(0)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
              loading="lazy"
            />
            {validImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFullscreen(0);
                }}
                className="absolute right-2.5 bottom-2.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition hover:bg-black/80 hover:scale-105 cursor-pointer"
                title={`View all ${validImages.length} photos`}
              >
                <GalleryHorizontalEnd size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Multi-Image Modal (Like Review Lightbox) */}
      {fullscreenGallery.open &&
        validImages.length > 0 &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black/95 text-white backdrop-blur-md"
            onClick={closeFullscreen}
          >
            {/* Header */}
            <div
              className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-medium text-white/80 truncate max-w-[70vw]">
                <span>{req.title}</span>
                <span className="ml-2 text-xs text-white/60">
                  ({fullscreenGallery.index + 1} of {validImages.length})
                </span>
              </div>
              <button
                type="button"
                onClick={closeFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Image with Arrows */}
            <div
              className="relative flex flex-1 items-center justify-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.length > 1 && (
                <button
                  type="button"
                  onClick={prevFullscreen}
                  className="absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/90 cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <img
                src={validImages[fullscreenGallery.index]}
                alt="Fullscreen request photo"
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
              />

              {validImages.length > 1 && (
                <button
                  type="button"
                  onClick={nextFullscreen}
                  className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/90 cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {validImages.length > 1 && (
              <div
                className="relative z-10 flex justify-center px-4 py-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl bg-black/40 px-3 py-2 backdrop-blur-xs">
                  {validImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFullscreenGallery((prev) => ({
                          ...prev,
                          index: idx,
                        }))
                      }
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg transition cursor-pointer ${idx === fullscreenGallery.index
                        ? "ring-2 ring-white scale-105 opacity-100"
                        : "opacity-50 hover:opacity-90"
                        }`}
                    >
                      <img
                        src={getOptimizedUrl(img, 128)}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
});

export default RequestCard;
