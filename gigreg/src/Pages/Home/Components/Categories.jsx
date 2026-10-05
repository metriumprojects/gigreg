import { useState, useEffect, Fragment } from "react";
import {
  ArrowRight,
  ChevronRight,
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
import CurrencySelector from "../../../components/CurrencySelector";
import LocationAutocomplete from "./LocationAutocomplete";
import Logo from "../../../components/Logo";

export default function CategoriesBar({
  categories: propCategories = [],
  selectedCategory = "",
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
  searchPlaceholder = "Search",
  breadcrumbs = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    categories: reduxCategories,
    hasFetched,
    loading: categoriesLoading,
  } = useSelector((state) => state.category);
  const authUserInfo = useSelector((state) => state.auth?.userInfo);
  const _categories = Array.isArray(reduxCategories) && reduxCategories.length > 0
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

  const _handleSelect = (categoryName) => {
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

  const _iconButtonClass = (path) => {
    const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `relative flex h-11 w-11 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100 ${
      isActive ? "bg-gray-100" : ""
    }`;
  };

  const menuLinkClass = (path, searchTab = "") => {
    const currentTab = new URLSearchParams(location.search).get("tab");
    let isActive = false;
    if (searchTab) {
      isActive = location.pathname === path && currentTab === searchTab;
    } else if (path === "/profile") {
      isActive = location.pathname === path && currentTab !== "My Profile";
    } else {
      isActive = location.pathname === path;
    }
    return `w-full px-4 py-2 text-left flex items-center gap-2 text-sm transition-colors hover:bg-gray-50 ${
      isActive ? "font-bold text-black" : "font-normal text-black"
    }`;
  };

  const ProfileMenu = ({ asPill = false, useIcon = false } = {}) => (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        onClick={handleProfileClick}
        className={
          asPill
            ? "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50 focus:outline-none"
            : useIcon
            ? "flex h-11 w-11 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100"
            : "rounded-full"
        }
        aria-label="Open profile menu"
        type="button"
      >
        {asPill ? (
          <>
            <User size={18} />
            <span>Profile</span>
          </>
        ) : useIcon ? (
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
        <div
          className={`absolute ${asPill ? "left-0" : "right-0"} top-14 z-50 mt-2 w-48 overflow-hidden rounded-lg bg-white shadow-lg border border-gray-100 py-1`}
        >
          <Link
            to="/profile?tab=My Profile"
            className={menuLinkClass("/profile", "My Profile")}
            onClick={() => handleProfileClick && handleProfileClick()}
          >
            View Profile
          </Link>
          {userInfo?.role === "user" && (
            <button
              onClick={() => {
                handleTeacher("teacher");
                handleProfileClick && handleProfileClick();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
            >
              {userInfo?.reverseRole ? "Seller profile" : "Become a Seller"}
            </button>
          )}
          {userInfo?.role === "teacher" && (
            <button
              onClick={() => {
                handleTeacher("user");
                handleProfileClick && handleProfileClick();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
            >
              Become a Buyer
            </button>
          )}
          <Link
            to="/"
            className={menuLinkClass("/")}
            onClick={() => handleProfileClick && handleProfileClick()}
          >
            Build
          </Link>
          <Link
            to="/teach"
            className={menuLinkClass("/teach")}
            onClick={() => handleProfileClick && handleProfileClick()}
          >
            {userInfo?.role === "teacher" ? "Buyer Requests" : "Requests"}
          </Link>
          <Link
            to="/profile"
            className={menuLinkClass("/profile")}
            onClick={() => handleProfileClick && handleProfileClick()}
          >
            Dashboard
          </Link>
          <button
            onClick={() => {
              handleLogout();
              handleProfileClick && handleProfileClick();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );

  const renderBreadcrumbs = () => {
    if (breadcrumbs) return breadcrumbs;

    const pathname = location.pathname || "/";
    const searchParams = new URLSearchParams(location.search);
    const categoryParam = searchParams.get("category") || selectedCategory;
    const tabParam = searchParams.get("tab");

    const linkClass = "text-gray-500 hover:text-black transition-colors whitespace-nowrap";
    const currentClass = "font-medium text-black whitespace-nowrap";
    const separator = <ChevronRight size={16} className="text-gray-400 shrink-0" />;

    const currentUser = userInfo || authUserInfo;
    const isSeller = currentUser?.role === "teacher";
    const profileLabel = isSeller ? "Seller Profile" : "Buyer Profile";

    // Home / Listings page
    if (pathname === "/" || pathname === "/listing") {
      if (categoryParam) {
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
            <Link to="/" className={linkClass}>
              Home
            </Link>
            {separator}
            <span className={currentClass}>{categoryParam}</span>
          </nav>
        );
      }
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <span className={currentClass}>Home</span>
        </nav>
      );
    }

    // Profile page
    if (pathname === "/profile") {
      if (tabParam) {
        return (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
            <Link to="/" className={linkClass}>
              Home
            </Link>
            {separator}
            <Link to="/profile" className={linkClass}>
              {profileLabel}
            </Link>
            {separator}
            <span className={currentClass}>{tabParam}</span>
          </nav>
        );
      }
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>{profileLabel}</span>
        </nav>
      );
    }

    if (pathname === "/edit-profile") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <Link to="/profile" className={linkClass}>
            {profileLabel}
          </Link>
          {separator}
          <span className={currentClass}>Edit Profile</span>
        </nav>
      );
    }

    if (pathname === "/create-listing") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Create a listing</span>
        </nav>
      );
    }

    if (pathname.startsWith("/update-listing")) {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <Link to="/profile?tab=My Listings" className={linkClass}>
            My Listings
          </Link>
          {separator}
          <span className={currentClass}>Update Listing</span>
        </nav>
      );
    }

    if (pathname === "/teach") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>
            {userInfo?.role === "teacher" ? "Open Requests" : "Requests"}
          </span>
        </nav>
      );
    }

    if (pathname === "/chat" || pathname.startsWith("/chat/")) {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Messages</span>
        </nav>
      );
    }

    if (pathname.startsWith("/user-profile")) {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Seller Profile</span>
        </nav>
      );
    }

    if (pathname === "/privacy-policy") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Privacy Policy</span>
        </nav>
      );
    }

    if (pathname === "/terms-of-service") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Terms of Service</span>
        </nav>
      );
    }

    if (pathname === "/cookie-policy") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Cookie Policy</span>
        </nav>
      );
    }

    if (pathname === "/legal-notice") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Legal Notice</span>
        </nav>
      );
    }

    if (pathname === "/withdraw-request") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <Link to="/profile?tab=Revenue" className={linkClass}>
            Revenue
          </Link>
          {separator}
          <span className={currentClass}>Withdrawal</span>
        </nav>
      );
    }

    if (pathname === "/create-seller-profile" || pathname === "/seller-created") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Seller Profile</span>
        </nav>
      );
    }

    if (pathname === "/send-proposal" || pathname === "/proposal-submitted") {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <Link to="/" className={linkClass}>
            Home
          </Link>
          {separator}
          <span className={currentClass}>Proposals</span>
        </nav>
      );
    }

    // Generic fallback for any other route
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
          <span className={currentClass}>Home</span>
        </nav>
      );
    }

    const formatSegment = (str) =>
      str
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm leading-none text-black select-none">
        <Link to="/" className={linkClass}>
          Home
        </Link>
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const url = "/" + segments.slice(0, idx + 1).join("/");
          return (
            <Fragment key={url}>
              {separator}
              {isLast ? (
                <span className={currentClass}>{formatSegment(seg)}</span>
              ) : (
                <Link to={url} className={linkClass}>
                  {formatSegment(seg)}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="hidden w-full lg:flex lg:flex-col lg:gap-[20px]">
      {/* Top row: Logo on left, Actions, Request & Profile/Heart/Message on right */}
      <div className="relative flex w-full items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <Logo variant="header" />
        </div>

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center pointer-events-auto">
          {renderBreadcrumbs()}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {userInfo ? (
            <>
              <ProfileMenu asPill />
              <Link
                to="/profile?tab=My Bookmarks"
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
                aria-label="Favorites"
              >
                <Heart size={18} />
                <span>Favorites</span>
              </Link>
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
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#006fd1] cursor-pointer"
          >
            {userInfo?.role === "teacher" ? "Open requests" : "Request"}
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
      </div>

      {/* Bottom row: Search, Location, Filter, USD, Messages */}
      <div className="flex w-full items-center gap-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-5 transition-colors">
          <Search size={18} className="shrink-0 text-black" aria-hidden="true" />
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
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-black outline-none placeholder:text-black"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                onSearchChange?.("");
              }}
              className="shrink-0 rounded-full p-1 text-black transition-colors hover:bg-black/5"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <div className="relative flex h-11 w-[160px] shrink-0 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 xl:w-[200px] transition-colors">
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
            leadingIcon={<MapPin size={18} className="shrink-0 text-black" aria-hidden="true" />}
            positionRelative={false}
            placeholderClassName="placeholder:text-black"
            className="min-w-0 flex-1 bg-transparent p-0 text-sm font-medium text-black outline-none"
          />
          {localLocation && (
            <button
              type="button"
              onClick={() => handleLocationUpdate("")}
              className="shrink-0 rounded-full p-1 text-black transition-colors hover:bg-black/5"
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
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
          aria-label="Open filters"
        >
          <ListFilter size={18} />
          <span>Filters</span>
        </button>

        <CurrencySelector />

        {userInfo && (
          <Link
            to="/chat"
            className="relative inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
            aria-label="Messages"
          >
            <div className="relative flex items-center">
              <MessageCircle size={18} />
              {chatUnread > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-white">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </div>
            <span>Messages</span>
          </Link>
        )}
      </div>
    </div>
  );
}
