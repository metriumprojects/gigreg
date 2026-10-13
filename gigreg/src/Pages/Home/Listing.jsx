import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Heart, ListFilter, MessageCircle, X, Check } from "lucide-react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion as Motion } from "framer-motion";
import { IoIosArrowDown } from "react-icons/io";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import { getActiveListings } from "../../redux/reducers/ListingReducer";
import { getCategories } from "../../redux/reducers/CategoryReducer";
import { getUserFavorites, toggleFavorite } from "../../redux/reducers/FavoriteReducer";
import { startChat } from "../../redux/reducers/ChatReducer";
import CategoryMobile from "./Components/CategoryMobile";
import SearchBar from "./Components/SearchBar";
import SearchCategoryToolbar from "./Components/SearchCategoryToolbar";
import HighlightSlider from "./Components/HighlightSlider";
import FilterModal from "./Components/FilterModal";
import { useCurrency } from "../../currency/CurrencyContext";
import { getLoginUrl, getSafeRedirectPath } from "../../utils/authRedirect";

const RightArrowIcon = ({ className = "h-2.5 w-3.5 shrink-0" }) => (
  <svg
    viewBox="0 0 18 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 11L17 6L12 1M17 6H1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatDurationForPrice = (duration) => {
  if (!duration) return "1 hour";
  const value = String(duration).trim();
  if (/^1\s*h(our)?$/i.test(value)) return "1 hour";
  if (/^60\s*m(in)?$/i.test(value)) return "1 hour";
  if (/^(\d+)\s*h$/i.test(value)) {
    const hours = value.match(/^(\d+)\s*h$/i)[1];
    return `${hours} ${Number(hours) === 1 ? "hour" : "hours"}`;
  }
  return value.replace(/\bm\b/g, "min");
};

const getListingCtaLabel = (pricingType, priceAmount, duration) => {
  if (pricingType === "fixed_on_demand") return "Request a quote";
  if (pricingType === "fixed") return priceAmount;
  const durationLabel = formatDurationForPrice(duration);
  return `${priceAmount} for ${durationLabel}`;
};

export const ListingCard = ({ listing, favorites, variant = "public" }) => {
  const { formatPrice } = useCurrency();
  const cardPriceOptions = { currencyDisplay: "narrowSymbol" };
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const [messaging, setMessaging] = useState(false);
  const isOwnerCard = variant === "owner";

  const pricingType = listing?.pricingType || "hourly";
  const priceAmount = formatPrice(listing?.price ?? 0, listing?.currency || "USD", cardPriceOptions);

  const listingPath = `/listing/${listing?.slug || listing?._id}`;
  const editPath = `/update-listing/${listing?._id}`;
  const cardLink = isOwnerCard ? editPath : listingPath;
  const sellerRating = listing?.createdBy?.averageRating === 0
    ? 100
    : listing?.createdBy?.averageRating ?? 100;
  const listingRating = listing?.averageRating === 0
    ? 100
    : listing?.averageRating ?? 100;

  const listingFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.listing || fav?.type === "listing")
    : favorites?.listings || [];
  const isBookmarked = listingFavorites?.some((fav) => {
    const favoriteListingId = fav?.listing?._id || fav?.listing || fav?.item?._id || fav?.item;
    return String(favoriteListingId) === String(listing?._id);
  });
  const [liked, setLiked] = useState(Boolean(isBookmarked));
  const [favoritePending, setFavoritePending] = useState(false);

  useEffect(() => {
    setLiked(Boolean(isBookmarked));
  }, [isBookmarked]);

  const handleFavorite = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!userInfo?._id) {
      navigate(getLoginUrl(location), {
        state: { from: getSafeRedirectPath(location) },
      });
      return;
    }
    if (favoritePending || !listing?._id) return;

    const previousLiked = liked;
    setLiked(!previousLiked);
    setFavoritePending(true);

    try {
      const res = await dispatch(toggleFavorite({ id: listing._id, type: "listing" }));
      if (res?.payload?.status) {
        dispatch(getUserFavorites());
      } else {
        setLiked(previousLiked);
        toast.info(res?.payload?.message || "Unable to update favorite");
      }
    } catch {
      setLiked(previousLiked);
      toast.error("Unable to update favorite");
    } finally {
      setFavoritePending(false);
    }
  };

  const handleTextMe = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const teacherId = listing?.createdBy?._id;
    if (!teacherId) {
      toast.error("Seller not found");
      return;
    }
    if (!userInfo?._id) {
      navigate(getLoginUrl(location), {
        state: { from: getSafeRedirectPath(location) },
      });
      return;
    }
    if (userInfo._id === teacherId) {
      toast.info("This is your own listing");
      return;
    }

    try {
      setMessaging(true);
      const data = await dispatch(startChat({ targetUserId: teacherId })).unwrap();
      const roomId = data?.room?._id || data?.roomId || data?._id;
      if (!roomId) throw new Error("Chat room not found");
      navigate(`/chat/${roomId}`);
    } catch (error) {
      toast.error(error?.message || "Unable to start chat");
    } finally {
      setMessaging(false);
    }
  };

  return (
    <article className="mb-0 md:mb-7 min-w-0">
      <div className="relative aspect-[4/6] w-full overflow-hidden rounded-[16px] sm:rounded-[24px] bg-gray-200">
        <Link to={cardLink} className="absolute inset-0 block">
          <img
            src={listing?.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
            alt={listing?.title || "Listing"}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </Link>

        <span className="absolute left-2 top-2 sm:left-3 sm:top-3 z-10 rounded-full bg-black/50 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium text-white backdrop-blur-md">
          {isOwnerCard ? (listing?.status || "Active") : `${listingRating}%`}
        </span>

        {!isOwnerCard && (
          <button
            type="button"
            onClick={handleFavorite}
            disabled={favoritePending}
            className="absolute right-2 top-2 sm:right-3 sm:top-3 z-10 rounded-full p-1 sm:p-1.5 text-white transition-colors bg-black/50 disabled:opacity-70"
            title={liked ? "Remove from favorites" : "Add to favorites"}
            aria-label={liked ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 sm:h-5 sm:w-5 drop-shadow transition-colors ${
                liked ? "fill-red-500 text-red-500" : "fill-none text-white"
              }`}
            />
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-10 sm:pt-16">
          <div className="pointer-events-auto bg-white/10 p-2 sm:px-3 sm:py-4 backdrop-blur-md">
            <Link
              to={isOwnerCard ? "/profile" : `/user-profile/${listing?.createdBy?._id}?role=teacher`}
              className="flex min-w-0 items-center gap-1.5 sm:gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={listing?.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                loading="lazy"
                alt={listing?.createdBy?.name || "Seller"}
                className="h-6 w-6 sm:h-9 sm:w-9 shrink-0 rounded-full object-cover"
              />
              <span className="truncate text-xs sm:text-base font-medium text-white">
                {listing?.createdBy?.name || "Unknown"} ({sellerRating}%)
              </span>
            </Link>

            <Link to={cardLink} className="mt-1 sm:mt-2 block">
              <h3 className="line-clamp-2 text-xs sm:text-base font-semibold leading-tight sm:leading-snug text-white">
                {listing?.title}
              </h3>
            </Link>

            {isOwnerCard ? (
              <div className="mt-2 sm:mt-3">
                <Link
                  to={editPath}
                  className="inline-flex h-7 sm:h-9 w-full items-center justify-center rounded-full bg-white/85 px-2 sm:px-3 text-xs sm:text-base font-semibold text-black transition hover:bg-white"
                >
                  Edit
                </Link>
              </div>
            ) : (
              <div className="mt-2 sm:mt-3 flex flex-col gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleTextMe}
                  disabled={messaging}
                  className="inline-flex h-7 sm:h-9 w-full items-center justify-center gap-1 sm:gap-1.5 rounded-full border border-white/70 bg-white/10 px-2 sm:px-3 text-xs sm:text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60"
                >
                  <MessageCircle size={14} className="sm:hidden" />
                  <MessageCircle size={16} className="hidden sm:inline" />
                  <span className="truncate">{messaging ? "..." : "Text me"}</span>
                </button>
                <Link
                  to={listingPath}
                  className="inline-flex h-7 sm:h-9 w-full items-center justify-center gap-1 sm:gap-1.5 rounded-full border border-white/70 bg-white/10 px-2 sm:px-3 text-xs sm:text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-60 truncate"
                  title={getListingCtaLabel(pricingType, priceAmount, listing?.duration)}
                >
                  <span className="truncate text-xs sm:text-base">
                    {getListingCtaLabel(pricingType, priceAmount, listing?.duration)}
                  </span>
                  <RightArrowIcon className="h-2.5 w-3 sm:h-3 sm:w-4 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const ListingCardSkeleton = () => {
  return (
    <div className="mb-0 md:mb-7 min-w-0 animate-pulse">
      <div className="relative aspect-[4/6] w-full overflow-hidden rounded-[16px] sm:rounded-[24px] bg-gray-200">
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3 h-5 sm:h-6 w-10 sm:w-14 rounded-full bg-gray-300" />
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3 h-6 sm:h-7 w-6 sm:w-7 rounded-full bg-gray-300" />
        <div className="absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3 space-y-1.5 sm:space-y-2 rounded-xl sm:rounded-2xl bg-gray-300/80 p-2 sm:p-3">
          <div className="h-3 sm:h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-4 sm:h-5 w-full rounded bg-gray-200" />
          <div className="space-y-1.5 sm:space-y-2 pt-1">
            <div className="h-7 sm:h-9 w-full rounded-full bg-gray-200" />
            <div className="h-7 sm:h-9 w-full rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Listing = () => {
  const { currency } = useCurrency();
  const dispatch = useDispatch();
  const { activeListings, activeTotalPages, loading } = useSelector(
    (state) => state.listing
  );
  const { categories } = useSelector((state) => state.category);
  const { favorites } = useSelector((state) => state.favorite);
  const { userInfo } = useSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "";
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);

  useEffect(() => {
    if (categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
      setPage(1);
    }
  }, [categoryParam]);
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [isOnlineSelected, setIsOnlineSelected] = useState(true);
  const [isInPersonSelected, setIsInPersonSelected] = useState(true);
  const [isOnDemandSelected, setIsOnDemandSelected] = useState(true);
  const [isFixedPriceSelected, setIsFixedPriceSelected] = useState(true);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100000);
  const [sortOrder, setSortOrder] = useState("best_match");
  const [categoryDisplayLimit, setCategoryDisplayLimit] = useState(5);
  const moreMenuRef = useRef(null);
  const limit = 20;
  const visibleCategories = categories?.slice(0, categoryDisplayLimit) || [];
  const hiddenCategories = categories?.slice(categoryDisplayLimit) || [];

  const handleSelectCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setSearchInput("");
    setSearchFilter("");
    setPage(1);
  };

  const handleModeChange = (value) => {
    if (value === "online") {
      setIsOnlineSelected((prev) => !prev);
    }
    if (value === "in-person") {
      setIsInPersonSelected((prev) => !prev);
    }
    if (value === "on-demand") {
      setIsOnDemandSelected((prev) => !prev);
    }
    if (value === "fixed-price" || value === "fixed-pricing") {
      setIsFixedPriceSelected((prev) => !prev);
    }
    setPage(1);
  };

  const handleLocationChange = (value) => {
    setLocationFilter(value);
    if (value?.trim() && !isInPersonSelected) {
      setIsInPersonSelected(true);
    }
    setPage(1);
  };

  const handleLocationSelect = ({ description }) => {
    setLocationFilter(description || "");
    if (description?.trim() && !isInPersonSelected) {
      setIsInPersonSelected(true);
    }
    setPage(1);
  };

  const clearAll = () => {
    setSelectedCategory("");
    setSearchInput("");
    setSearchFilter("");
    setLocationFilter("");
    setIsOnlineSelected(true);
    setIsInPersonSelected(true);
    setIsOnDemandSelected(true);
    setIsFixedPriceSelected(true);
    setMin(0);
    setMax(100000);
    setPage(1);
  };

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getUserFavorites());
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const ITEM_WIDTH = 155;
      const nextLimit = Math.floor(width / ITEM_WIDTH);
      setCategoryDisplayLimit(nextLimit);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMore(false);
      }
    };

    if (showMore) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMore]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!isOnlineSelected && !isInPersonSelected) {
        return;
      }
      if (!isOnDemandSelected && !isFixedPriceSelected) {
        return;
      }

      const locationSearch = isInPersonSelected ? locationFilter.trim() : "";
      const isFilteringOnlineOnly = isOnlineSelected && !isInPersonSelected;
      const isFilteringInPerson = isInPersonSelected && (!isOnlineSelected || Boolean(locationSearch));

      let pricingTypeFilter;
      if (isOnDemandSelected && !isFixedPriceSelected) {
        pricingTypeFilter = "fixed_on_demand";
      } else if (!isOnDemandSelected && isFixedPriceSelected) {
        pricingTypeFilter = "fixed";
      }

      dispatch(
        getActiveListings({
          page,
          limit,
          search: searchFilter,
          category: selectedCategory,
          minPrice: min,
          maxPrice: max,
          currency,
          isOnline: isFilteringOnlineOnly ? true : undefined,
          supportsInPerson: isFilteringInPerson ? true : undefined,
          location: locationSearch,
          pricingType: pricingTypeFilter,
          sort: sortOrder,
        })
      );
    }, 350);

    return () => clearTimeout(handler);
  }, [
    dispatch,
    page,
    searchFilter,
    selectedCategory,
    min,
    max,
    currency,
    isOnlineSelected,
    isInPersonSelected,
    isOnDemandSelected,
    isFixedPriceSelected,
    locationFilter,
    sortOrder,
  ]);

  return (
    <MainLayout
      className="mx-auto"
      width="3080px"
      categories={categories}
      selectedCategory={selectedCategory}
      onSelectCategory={handleSelectCategory}
      onSearchToggle={() => setShowFilter(true)}
      searchInput={searchInput}
      onSearchChange={(value) => {
        setSearchInput(value);
        setSearchFilter(value);
        setPage(1);
      }}
      locationFilter={locationFilter}
      onLocationChange={(value) => {
        setLocationFilter(value);
        if (value?.trim()) setIsInPersonSelected(true);
        setPage(1);
      }}
      onLocationSelect={({ description }) => {
        setLocationFilter(description || "");
        if (description?.trim()) setIsInPersonSelected(true);
        setPage(1);
      }}
      onFilterClick={() => setShowFilter(true)}
      searchPlaceholder="Search"
      isOnlineSelected={isOnlineSelected}
      isInPersonSelected={isInPersonSelected}
      isOnDemandSelected={isOnDemandSelected}
      isFixedPriceSelected={isFixedPriceSelected}
      onModeChange={handleModeChange}
      minPrice={min}
      maxPrice={max}
      onMinPriceChange={(val) => {
        setMin(val);
        setPage(1);
      }}
      onMaxPriceChange={(val) => {
        setMax(val);
        setPage(1);
      }}
      sortOrder={sortOrder}
      onSortChange={(val) => {
        setSortOrder(val);
        setPage(1);
      }}
    >
      <div className="w-full pb-20 lg:pb-6">



      {!userInfo && <HighlightSlider />}

      <div className="hidden">
        <div className="hidden lg:flex items-center flex-nowrap min-w-0 gap-4">
          <div
             onClick={() => handleSelect("")}
             className={`cursor-pointer flex items-center gap-1 whitespace-nowrap ${
               !selectedCategory
                 ? "text-black py-2 border-b-2 border-black"
                 : "text-black py-2 border-b-2 border-transparent"
             }`}
           >
             <span className="text-sm font-semibold">Trending</span>
           </div>
   
           {/* First 7 Categories */}
           {visibleCategories&&visibleCategories?.map((cat, index) => (
             <div
               key={index}
               onClick={() => handleSelect(cat.name)}
               className={`cursor-pointer flex font-semibold items-center gap-1 whitespace-nowrap ${
                 selectedCategory === cat.name
                   ? "text-black  py-2 border-b-2 border-black"
                   : "text-black  py-2 border-b-2 border-transparent"
               }`}
             >
               <span className="text-sm">{cat.name}</span>
             </div>
           ))}
   
           {/* More Button - Only show if there are hidden categories */}
           {hiddenCategories.length > 0 && (
             <div className="relative" ref={moreMenuRef}>
               <button
                 onClick={() => setShowMore(!showMore)}
                 className={`cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                   showMore
                     ? "text-black  px-2 py-3 rounded-4xl"
                     : "text-black  px-2 py-3"
                 }`}
               >
                 <span className="text-sm font-semibold">More</span>
                 <IoIosArrowDown className={`transition-transform ${showMore ? "rotate-180" : ""}`} />
               </button>
   
               {/* Dropdown Menu */}
               {showMore && (
                 <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-lg z-50 min-w-max">
                   {hiddenCategories.map((cat, index) => (
                     <div
                       key={index}
                       onClick={() => {
                         handleSelect(cat.name);
                         setShowMore(false);
                       }}
                       className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${
                         selectedCategory === cat.name ? "underline underline-offset-4 decoration-2" : ""
                       }`}
                     >
                       {cat.name}
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>
             <button
               onClick={() => setShowFilter(true)}
               className="hidden lg:flex items-center justify-center p-2 hover:bg-gray-100 rounded-md transition-colors"
             >
               <ListFilter size={20} className="" />
             </button>
           </div>

        <div className="hidden"><CategoryMobile
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          setShowFilter={() => setShowFilter(true)}
        /></div>

        {!isOnlineSelected && !isInPersonSelected ? (
          <div className="py-20 text-center">
            <p className="text-base font-semibold text-gray-700">No services selected</p>
            <p className="mt-1 text-sm text-gray-500">Please select Online or In-person to view available listings.</p>
          </div>
        ) : !isOnDemandSelected && !isFixedPriceSelected ? (
          <div className="py-20 text-center">
            <p className="text-base font-semibold text-gray-700">No pricing type selected</p>
            <p className="mt-1 text-sm text-gray-500">Please select On demand or Fixed pricing to view available listings.</p>
          </div>
        ) : loading ? (
          <div className="w-full mx-auto grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7 gap-2.5 sm:gap-4 md:gap-4">
            {Array.from({ length: limit }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {activeListings.length === 0 ? (
              <p className="text-center text-gray-500 py-16">No active listings found.</p>
            ) : (
              <div className="w-full mx-auto grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7 gap-2.5 sm:gap-4 md:gap-4">
                {activeListings.map((listing) => (
                  <ListingCard key={listing._id} listing={listing} favorites={favorites} />
                ))}
              </div>
            )}

            {activeTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {activeTotalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(activeTotalPages, page + 1))}
                  disabled={page === activeTotalPages}
                  className="p-2 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Filter Modal */}
        <FilterModal
          open={showFilter}
          onClose={() => setShowFilter(false)}
          isOnlineSelected={isOnlineSelected}
          isInPersonSelected={isInPersonSelected}
          onModeChange={handleModeChange}
          min={min}
          max={max}
          onMinChange={(val) => {
            setMin(val);
            setPage(1);
          }}
          onMaxChange={(val) => {
            setMax(val);
            setPage(1);
          }}
          onClear={clearAll}
          onApply={() => setShowFilter(false)}
        />
      </div>
    </MainLayout>
  );
};

export default Listing;
