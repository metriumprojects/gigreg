import { useState, useEffect, Fragment } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
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
  isOnlineSelected = true,
  isInPersonSelected = true,
  onModeChange,
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
  const [internalOnline, setInternalOnline] = useState(true);
  const [internalInPerson, setInternalInPerson] = useState(true);

  const effectiveOnline = onModeChange ? isOnlineSelected : internalOnline;
  const effectiveInPerson = onModeChange ? isInPersonSelected : internalInPerson;

  const handleToggleOnline = () => {
    if (onModeChange) onModeChange("online");
    else setInternalOnline((prev) => !prev);
  };

  const handleToggleInPerson = () => {
    if (onModeChange) onModeChange("in-person");
    else setInternalInPerson((prev) => !prev);
  };

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

  const ProfileMenu = ({ asPill = false, asCircle = false, useIcon = false } = {}) => (
    <div className="relative z-50 flex items-center" ref={menuRef}>
      <button
        onClick={handleProfileClick}
        className={
          asCircle
            ? "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-black transition-colors hover:bg-gray-300 focus:outline-none overflow-hidden"
            : asPill
            ? "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-50 focus:outline-none"
            : useIcon
            ? "flex h-9 w-9 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100"
            : "rounded-full"
        }
        aria-label="Open profile menu"
        type="button"
      >
        {asPill ? (
          <>
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 22 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 23C13.2546 23 15.0343 22.9447 16.4395 22.8027C17.8542 22.6598 18.8206 22.435 19.4834 22.1338C20.1133 21.8475 20.4493 21.5022 20.6562 21.0791C20.8817 20.618 21 19.9693 21 19C21 18.0307 20.8817 17.382 20.6562 16.9209C20.4493 16.4978 20.1133 16.1525 19.4834 15.8662C18.8206 15.565 17.8542 15.3402 16.4395 15.1973C15.0343 15.0553 13.2546 15 11 15C8.74545 15 6.96565 15.0553 5.56055 15.1973C4.1458 15.3402 3.17936 15.565 2.5166 15.8662C1.88675 16.1525 1.55068 16.4978 1.34375 16.9209C1.11831 17.382 1 18.0307 1 19C1 19.9693 1.11831 20.618 1.34375 21.0791C1.55068 21.5022 1.88675 21.8475 2.5166 22.1338C3.17936 22.435 4.1458 22.6598 5.56055 22.8027C6.96565 22.9447 8.74545 23 11 23Z" />
              <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 17 0)" />
            </svg>
            <span>Profile</span>
          </>
        ) : asCircle ? (
          userInfo?.image?.url ? (
            <img
              loading="lazy"
              src={userInfo.image.url}
              className="h-full w-full object-cover"
              alt="profile"
            />
          ) : (
            <svg
              className="h-4 w-4 shrink-0 text-black"
              viewBox="0 0 22 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 23C13.2546 23 15.0343 22.9447 16.4395 22.8027C17.8542 22.6598 18.8206 22.435 19.4834 22.1338C20.1133 21.8475 20.4493 21.5022 20.6562 21.0791C20.8817 20.618 21 19.9693 21 19C21 18.0307 20.8817 17.382 20.6562 16.9209C20.4493 16.4978 20.1133 16.1525 19.4834 15.8662C18.8206 15.565 17.8542 15.3402 16.4395 15.1973C15.0343 15.0553 13.2546 15 11 15C8.74545 15 6.96565 15.0553 5.56055 15.1973C4.1458 15.3402 3.17936 15.565 2.5166 15.8662C1.88675 16.1525 1.55068 16.4978 1.34375 16.9209C1.11831 17.382 1 18.0307 1 19C1 19.9693 1.11831 20.618 1.34375 21.0791C1.55068 21.5022 1.88675 21.8475 2.5166 22.1338C3.17936 22.435 4.1458 22.6598 5.56055 22.8027C6.96565 22.9447 8.74545 23 11 23Z" />
              <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 17 0)" />
            </svg>
          )
        ) : useIcon ? (
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 22 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 23C13.2546 23 15.0343 22.9447 16.4395 22.8027C17.8542 22.6598 18.8206 22.435 19.4834 22.1338C20.1133 21.8475 20.4493 21.5022 20.6562 21.0791C20.8817 20.618 21 19.9693 21 19C21 18.0307 20.8817 17.382 20.6562 16.9209C20.4493 16.4978 20.1133 16.1525 19.4834 15.8662C18.8206 15.565 17.8542 15.3402 16.4395 15.1973C15.0343 15.0553 13.2546 15 11 15C8.74545 15 6.96565 15.0553 5.56055 15.1973C4.1458 15.3402 3.17936 15.565 2.5166 15.8662C1.88675 16.1525 1.55068 16.4978 1.34375 16.9209C1.11831 17.382 1 18.0307 1 19C1 19.9693 1.11831 20.618 1.34375 21.0791C1.55068 21.5022 1.88675 21.8475 2.5166 22.1338C3.17936 22.435 4.1458 22.6598 5.56055 22.8027C6.96565 22.9447 8.74545 23 11 23Z" />
            <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 17 0)" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 22 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 23C13.2546 23 15.0343 22.9447 16.4395 22.8027C17.8542 22.6598 18.8206 22.435 19.4834 22.1338C20.1133 21.8475 20.4493 21.5022 20.6562 21.0791C20.8817 20.618 21 19.9693 21 19C21 18.0307 20.8817 17.382 20.6562 16.9209C20.4493 16.4978 20.1133 16.1525 19.4834 15.8662C18.8206 15.565 17.8542 15.3402 16.4395 15.1973C15.0343 15.0553 13.2546 15 11 15C8.74545 15 6.96565 15.0553 5.56055 15.1973C4.1458 15.3402 3.17936 15.565 2.5166 15.8662C1.88675 16.1525 1.55068 16.4978 1.34375 16.9209C1.11831 17.382 1 18.0307 1 19C1 19.9693 1.11831 20.618 1.34375 21.0791C1.55068 21.5022 1.88675 21.8475 2.5166 22.1338C3.17936 22.435 4.1458 22.6598 5.56055 22.8027C6.96565 22.9447 8.74545 23 11 23Z" />
            <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 17 0)" />
          </svg>
        )}
      </button>
      {showProfileMenu && (
        <div
          className="absolute left-0 top-10 z-[100] mt-1.5 w-48 overflow-hidden rounded-lg bg-white shadow-xl border border-gray-100 py-1"
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
    <div className="relative z-50 hidden w-full lg:flex lg:flex-col lg:gap-[10px]">
      {/* Top row: Logo on left, Actions, Request & Profile/Heart/Message on right */}
      <div className="relative z-50 flex w-full items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <Logo variant="header" />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {userInfo ? (
            <>
              <ProfileMenu asCircle />
              <Link
                to="/profile?tab=My Bookmarks"
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gray-200 px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-300"
                aria-label="Favorites"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7.6 1C9.29038 1 10.8323 1.84142 12 2.8C13.1677 1.84142 14.7096 1 16.4 1C20.0451 1 23 3.71049 23 7.05386C23 13.795 15.3274 17.721 12.7981 18.8321C12.2886 19.056 11.7114 19.056 11.2019 18.8321C8.67259 17.721 1 13.7948 1 7.0537C1 3.71033 3.95492 1 7.6 1Z" />
                </svg>
                <span>Favorites</span>
              </Link>
              <Link
                to="/chat"
                className="relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gray-200 px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-300"
                aria-label="Messages"
              >
                <div className="relative flex items-center">
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1C14.4525 1 16.3622 1.11115 17.8555 1.39844C19.3435 1.68476 20.3442 2.13238 21.0449 2.75C22.437 3.97718 23 6.1956 23 10.667C23 13.5483 22.7414 15.6686 22.0449 17.0498C21.7106 17.7128 21.2866 18.1796 20.7539 18.4902C20.2155 18.8041 19.4936 19 18.5 19C17.2191 19 16.2577 19.2876 15.5059 19.7969C14.7719 20.2942 14.3293 20.9457 14 21.4639C13.6386 22.0325 13.444 22.3727 13.1562 22.6309C12.9352 22.8292 12.6259 23 12 23C11.3746 22.9999 11.0658 22.8291 10.8447 22.6309C10.557 22.3727 10.3622 22.0323 10.001 21.4639C9.67166 20.9457 9.22903 20.2941 8.49512 19.7969C7.74319 19.2874 6.78116 19 5.5 19C4.51162 19 3.79216 18.7989 3.25391 18.4785C2.71973 18.1605 2.29346 17.6827 1.95703 17.0098C1.25819 15.6116 1.00002 13.488 1 10.667C1 6.25226 1.56212 4.02877 2.95898 2.78711C3.66173 2.16245 4.66331 1.70573 6.14941 1.41211C7.64112 1.11742 9.54954 1 12 1Z" />
                  </svg>
                  {chatUnread > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white shadow-sm">
                      {chatUnread > 99 ? "99+" : chatUnread}
                    </span>
                  )}
                </div>
                <span>Messages</span>
              </Link>
              <Link
                to="/profile"
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-gray-200 px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-300"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 23C14.4477 23 16.3465 22.8672 17.8271 22.5381C19.2964 22.2115 20.2925 21.7056 20.999 20.999C21.7056 20.2925 22.2115 19.2964 22.5381 17.8271C22.8672 16.3465 23 14.4477 23 12C23 9.55232 22.8672 7.65353 22.5381 6.17285C22.2115 4.70364 21.7056 3.70752 20.999 3.00098C20.2925 2.29443 19.2964 1.78846 17.8271 1.46191C16.3465 1.13284 14.4477 1 12 1C9.55232 1 7.65353 1.13284 6.17285 1.46191C4.70364 1.78846 3.70752 2.29443 3.00098 3.00098C2.29443 3.70752 1.78846 4.70364 1.46191 6.17285C1.13284 7.65353 1 9.55232 1 12C1 14.4477 1.13284 16.3465 1.46191 17.8271C1.78846 19.2964 2.29443 20.2925 3.00098 20.999C3.70752 21.7056 4.70364 22.2115 6.17285 22.5381C7.65353 22.8672 9.55232 23 12 23Z" />
                  <path d="M12 7V17M17 11V17M7 13V17" />
                </svg>
                <span>Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                Sign up
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-black/90"
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
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 25 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5.08823 13.549C2.83036 13.549 1 11.7232 1 9.47096C1 7.21873 2.83036 5.39294 5.08823 5.39294H6.437M5.08823 13.549C5.08823 13.549 6.5 18.4399 7 19.9347C7.5 21.4296 10 21.4296 10 19.4365C10 17.4434 10 16.3492 10 13.8091M5.08823 13.549H6.437M10 13.8091C12.8477 14.4578 15.4867 16.1864 18.0258 17.4528C23.1139 19.9905 22.9998 11.9424 22.9998 9.47096C22.9998 6.99952 23.1139 -1.0486 18.0258 1.48908C14.8411 3.07743 11.4994 5.39294 7.78577 5.39294H6.437M10 13.8091C9.27601 13.6441 8.53853 13.549 7.78577 13.549H6.437M6.437 13.549V5.39294" />
              <path d="M24 7.00027V12.0003" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{userInfo?.role === "teacher" ? "Open requests" : "Request"}</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Search, Location, Filter, USD, Messages */}
      <div className="flex w-full items-center gap-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-5 transition-colors">
          <svg
            className="h-[18px] w-[18px] shrink-0 text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11.4785 21.9565C15.6062 21.9565 18.1249 21.2974 19.6533 19.8237C21.1731 18.3582 21.9561 15.8484 21.9561 11.478C21.956 7.10783 21.1731 4.59881 19.6533 3.1333C18.1249 1.6595 15.6064 1.00052 11.4785 1.00049C7.35046 1.00049 4.83116 1.65947 3.30273 3.1333C1.78311 4.59884 1.00003 7.10807 1 11.478C1 15.8484 1.78293 18.3582 3.30273 19.8237C4.83116 21.2976 7.35046 21.9565 11.4785 21.9565Z" />
            <path d="M22.9565 22.9565L20.3478 20.3478" />
          </svg>
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
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-black outline-none placeholder:text-black placeholder:font-semibold"
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
            leadingIcon={
              <svg
                className="h-[18px] w-[18px] shrink-0 text-black"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.9951 22.4248C11.6339 22.7505 12.3661 22.7505 13.0049 22.4248C14.4088 21.709 16.6199 20.4276 18.6113 18.6152C20.6087 16.7975 22.31 14.5151 22.8438 11.8066C23.285 9.56749 22.8142 6.86911 21.1465 4.74219C19.5025 2.64547 16.6113 1 12 1C7.38874 1 4.49752 2.64547 2.85352 4.74219C1.18584 6.86911 0.714933 9.56749 1.15625 11.8066C1.69007 14.5151 3.39134 16.7975 5.38867 18.6152C7.38012 20.4276 9.59123 21.709 10.9951 22.4248Z" />
                <circle cx="4" cy="4" r="3" transform="matrix(-1 0 0 1 16 6)" />
              </svg>
            }
            positionRelative={false}
            placeholderClassName="placeholder:text-black placeholder:font-semibold"
            className="min-w-0 flex-1 bg-transparent p-0 text-sm font-semibold text-black outline-none"
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

        {/* Service Type pills: Online & In-person */}
        <button
          type="button"
          onClick={handleToggleOnline}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-5 text-sm font-semibold transition-all cursor-pointer ${
            effectiveOnline
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
              effectiveOnline
                ? "bg-white text-primary"
                : "border-[1.5px] border-black bg-transparent text-black"
            }`}
          >
            <svg
              className="h-2.5 w-2.5 block"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.75 6.25L4.75 8.25L9.25 3.75" />
            </svg>
          </span>
          <span>Online</span>
        </button>

        <button
          type="button"
          onClick={handleToggleInPerson}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-5 text-sm font-semibold transition-all cursor-pointer ${
            effectiveInPerson
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
              effectiveInPerson
                ? "bg-white text-primary"
                : "border-[1.5px] border-black bg-transparent text-black"
            }`}
          >
            <svg
              className="h-2.5 w-2.5 block"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.75 6.25L4.75 8.25L9.25 3.75" />
            </svg>
          </span>
          <span>In-person</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onFilterClick) onFilterClick();
            else handleSearchClick?.();
          }}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
          aria-label="Open price range"
        >
          <svg
            className="h-[18px] w-[18px] shrink-0"
            viewBox="0 0 20 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.33691 1H16.6631C18.5166 1.00037 19.7317 3.28122 18.5156 4.97168L12.9639 12.6895C12.5513 13.2629 12.3311 13.955 12.3311 14.6621V19.751C12.3311 20.1565 12.1576 20.5297 11.876 20.7744L9.65527 22.7041C8.9198 23.3427 7.66906 22.8712 7.66895 21.6807V14.6621C7.66895 13.955 7.44867 13.2629 7.03613 12.6895L1.48438 4.97168C0.268271 3.28122 1.48341 1.00037 3.33691 1Z" />
            <path d="M7 5H13" />
          </svg>
          <span>Price Range</span>
        </button>

        <CurrencySelector buttonClassName="h-11" />
      </div>
    </div>
  );
}
