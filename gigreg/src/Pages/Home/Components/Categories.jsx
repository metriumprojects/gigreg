import { useState, useEffect } from "react";
import {
  ArrowRight,
  Heart,
  ListFilter,
  MapPin,
  MessageCircle,
  Search,
  User,
  X,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import { motion } from "framer-motion";
import CurrencySelector from "../../../components/CurrencySelector";
import LocationAutocomplete from "./LocationAutocomplete";

export default function CategoriesBar({
  categories: propCategories = [],
  selectedCategory,
  onSelectCategory,
  userInfo,
  chatUnread,
  handleSearchClick,
  handleProfileClick,
  showProfileMenu,
  menuRef,
  handleLogout,
  handleTeacher,
  onOpenRequest,
  searchInput = "",
  onSearchChange,
  locationFilter = "",
  onLocationChange,
  onLocationSelect,
  onFilterClick,
  searchPlaceholder = "Search open requests",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    categories: reduxCategories,
    hasFetched,
    loading: categoriesLoading,
  } = useSelector((state) => state.category);
  const categories = Array.isArray(reduxCategories) && reduxCategories.length > 0
    ? reduxCategories
    : propCategories;
  const isHome = location.pathname === "/" || location.pathname === "/listing";

  const [localSearch, setLocalSearch] = useState(searchInput || "");
  const [localLocation, setLocalLocation] = useState(locationFilter || "");

  useEffect(() => {
    setLocalSearch(searchInput || "");
  }, [searchInput]);

  useEffect(() => {
    setLocalLocation(locationFilter || "");
  }, [locationFilter]);

  useEffect(() => {
    if (!hasFetched && !categoriesLoading) {
      dispatch(getCategories());
    }
  }, [dispatch, hasFetched, categoriesLoading]);

  const handleSelect = (categoryName) => {
    if (onSelectCategory) {
      onSelectCategory(categoryName);
      return;
    }
    if (isHome) return;
    navigate(`/?category=${encodeURIComponent(categoryName || "")}`);
  };

  const handleSearchSubmit = (value) => {
    const next = value ?? localSearch;
    if (onSearchChange) {
      onSearchChange(next);
      return;
    }
    const params = new URLSearchParams();
    if (next?.trim()) params.set("search", next.trim());
    if (localLocation?.trim()) params.set("location", localLocation.trim());
    navigate(`/${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleLocationUpdate = (value) => {
    setLocalLocation(value);
    if (onLocationChange) {
      onLocationChange(value);
      return;
    }
  };

  const iconButtonClass = (path) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `relative flex h-11 w-11 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100 ${
      isActive ? "bg-gray-100" : ""
    }`;
  };

  const menuLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `w-full px-4 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
      isActive ? "border border-white bg-primary text-white" : "hover:bg-gray-50"
    }`;
  };

  const ProfileMenu = ({ useIcon = false } = {}) => (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={handleProfileClick}
        className={
          useIcon
            ? "flex h-11 w-11 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100"
            : "rounded-full"
        }
        aria-label="Open profile menu"
        type="button"
      >
        {useIcon ? (
          <User size={22} />
        ) : (
          <img
            loading="lazy"
            src={userInfo?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
            className="h-11 w-11 rounded-full object-cover"
            alt="profile"
          />
        )}
      </button>
      {showProfileMenu && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute right-0 top-14 z-50 mt-2 w-48 overflow-hidden rounded-lg bg-white shadow-lg"
        >
          <Link to="/profile" className={menuLinkClass("/profile")}>
            View Profile
          </Link>
          {userInfo?.role === "user" && (
            <button
              onClick={() => handleTeacher("teacher")}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
            >
              {userInfo?.reverseRole ? "Seller profile" : "Become a Seller"}
            </button>
          )}
          {userInfo?.role === "teacher" && (
            <button
              onClick={() => handleTeacher("user")}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
            >
              Become a Buyer
            </button>
          )}
          <Link to="/" className={menuLinkClass("/")}>
            Build
          </Link>
          <Link to="/teach" className={menuLinkClass("/teach")}>
            {userInfo?.role === "teacher" ? "Buyer Requests" : "Requests"}
          </Link>
          <Link to="/profile" className={menuLinkClass("/profile")}>
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
          >
            Logout
          </button>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="hidden w-full lg:block">
      <div className="flex w-full items-center gap-3 xl:gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Gigreg home">
            <img
              src="https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png"
              alt="Gigreg"
              className="h-10 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={() => {
              if (userInfo?.role === "teacher") {
                navigate("/teach");
                return;
              }
              if (onOpenRequest) {
                onOpenRequest();
                return;
              }
              navigate("/teach");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#006fd1]"
          >
            {userInfo?.role === "teacher" ? "Open request" : "Request"}
            <img
              src={
                userInfo?.role === "teacher"
                  ? "https://res.cloudinary.com/dinwxxnzm/image/upload/v1787599726/download-svgrepo-com_1_rvdjhs.png"
                  : "https://res.cloudinary.com/dinwxxnzm/image/upload/v1787599589/hand-point-up-svgrepo-com_1_ud1vf0.png"
              }
              alt=""
              className="h-4 w-4 object-contain"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#F2F2F2] px-5">
            <Search size={18} className="shrink-0 text-gray-500" aria-hidden="true" />
            <input
              value={localSearch}
              onChange={(event) => {
                setLocalSearch(event.target.value);
                onSearchChange?.(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearchSubmit(event.target.value);
              }}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-black outline-none placeholder:text-gray-500"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  onSearchChange?.("");
                }}
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className="relative flex h-11 w-[160px] shrink-0 items-center gap-2 rounded-full bg-[#F2F2F2] px-4 xl:w-[200px]">
            <LocationAutocomplete
              value={localLocation}
              onChange={handleLocationUpdate}
              onSelectDetails={(details) => {
                const description = details?.description || "";
                setLocalLocation(description);
                if (onLocationSelect) onLocationSelect(details);
                else onLocationChange?.(description);
              }}
              placeholder="Location"
              variant="type"
              leadingIcon={<MapPin size={18} className="text-gray-500" aria-hidden="true" />}
              positionRelative={false}
              className="min-w-0 flex-1 bg-transparent p-0 text-sm font-medium text-black outline-none placeholder:text-gray-500"
            />
            {localLocation && (
              <button
                type="button"
                onClick={() => handleLocationUpdate("")}
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
                aria-label="Clear location"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onFilterClick) onFilterClick();
              else handleSearchClick?.();
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100"
            aria-label="Open filters"
          >
            <ListFilter size={22} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {userInfo ? (
            <>
              <CurrencySelector hideIcon />
              <Link to="/chat" className={iconButtonClass("/chat")} aria-label="Chat">
                <MessageCircle size={22} />
                {chatUnread > 0 && (
                  <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-white">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
              </Link>
              <Link
                to="/profile?tab=My Bookmarks"
                className={iconButtonClass("/bookmarks")}
                aria-label="Bookmarks"
              >
                <Heart size={22} />
              </Link>
              <ProfileMenu useIcon />
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#006fd1]"
              >
                Sign up
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-black/90"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
