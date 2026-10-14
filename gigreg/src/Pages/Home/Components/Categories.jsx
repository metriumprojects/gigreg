import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { getCategories } from "../../../redux/reducers/CategoryReducer";
import CurrencySelector from "../../../components/CurrencySelector";
import LocationAutocomplete from "./LocationAutocomplete";
import Logo from "../../../components/Logo";
import UserAvatarPlaceholder from "../../../components/UserAvatarPlaceholder";
import { getLoginUrl, getRegisterUrl, getSafeRedirectPath } from "../../../utils/authRedirect";
import SearchCategoryToolbar from "./SearchCategoryToolbar";

export default function CategoriesBar({
  categories: propCategories = [],
  selectedCategory = "",
  onSelectCategory,
  userInfo,
  chatUnread,
  handleSearchClick,
  handleProfileClick,
  handleCloseProfileMenu,
  onProfileMouseEnter,
  onProfileMouseLeave,
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
  isOnDemandSelected = true,
  isFixedPriceSelected = true,
  onModeChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  sortOrder = "best_match",
  onSortChange,
  hideSearchCard = false,
  searchCardTitle = "",
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
  const isProfileSection =
    location.pathname.startsWith("/profile") ||
    location.pathname === "/edit-profile" ||
    location.pathname.startsWith("/user-profile");
  const isCreateListingPage =
    location.pathname === "/create-listing" ||
    location.pathname.startsWith("/update-listing");
  const hideMobileSearchCard =
    hideSearchCard ||
    isProfileSection ||
    isCreateListingPage;

  const [localSearch, setLocalSearch] = useState(searchInput || "");
  const [localLocation, setLocalLocation] = useState(locationFilter || "");
  const [internalOnline, setInternalOnline] = useState(true);
  const [internalInPerson, setInternalInPerson] = useState(true);
  const [internalOnDemand, setInternalOnDemand] = useState(true);
  const [internalFixedPrice, setInternalFixedPrice] = useState(true);

  const effectiveOnline = onModeChange ? isOnlineSelected : internalOnline;
  const effectiveInPerson = onModeChange ? isInPersonSelected : internalInPerson;
  const effectiveOnDemand = onModeChange ? isOnDemandSelected : internalOnDemand;
  const effectiveFixedPrice = onModeChange ? isFixedPriceSelected : internalFixedPrice;

  const handleToggleOnline = () => {
    if (onModeChange) onModeChange("online");
    else setInternalOnline((prev) => !prev);
  };

  const handleToggleInPerson = () => {
    if (onModeChange) onModeChange("in-person");
    else setInternalInPerson((prev) => !prev);
  };

  const handleToggleOnDemand = () => {
    if (onModeChange) onModeChange("on-demand");
    else setInternalOnDemand((prev) => !prev);
  };

  const handleToggleFixedPrice = () => {
    if (onModeChange) onModeChange("fixed-price");
    else setInternalFixedPrice((prev) => !prev);
  };

  const [isSearchCardExpanded, setIsSearchCardExpanded] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState(
    typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0 ? String(minPrice) : ""
  );
  const [localMaxPrice, setLocalMaxPrice] = useState(
    typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice < 100000 ? String(maxPrice) : ""
  );
  const [currentSort, setCurrentSort] = useState(sortOrder || "best_match");

  useEffect(() => {
    if (typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0) {
      setLocalMinPrice(String(minPrice));
    } else if (minPrice === 0 || minPrice === "" || minPrice === undefined) {
      setLocalMinPrice("");
    }
  }, [minPrice]);

  useEffect(() => {
    if (typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice < 100000) {
      setLocalMaxPrice(String(maxPrice));
    } else if (maxPrice === 100000 || maxPrice === "" || maxPrice === undefined) {
      setLocalMaxPrice("");
    }
  }, [maxPrice]);

  useEffect(() => {
    if (sortOrder) setCurrentSort(sortOrder);
  }, [sortOrder]);

  const handleMinPriceChange = (val) => {
    setLocalMinPrice(val);
    const parsed = val === "" ? 0 : Number(val);
    onMinPriceChange?.(parsed);
  };

  const handleMaxPriceChange = (val) => {
    setLocalMaxPrice(val);
    const parsed = val === "" ? 100000 : Number(val);
    onMaxPriceChange?.(parsed);
  };

  const handleSortChange = (val) => {
    setCurrentSort(val);
    onSortChange?.(val);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.info("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county ||
            data?.address?.state ||
            "Current Location";
          setLocalLocation(city);
          if (onLocationSelect) {
            onLocationSelect({ description: city, lat: latitude, lng: longitude });
          } else {
            onLocationChange?.(city);
          }
        } catch {
          setLocalLocation("Current Location");
          onLocationChange?.("Current Location");
        } finally {
          setGettingLocation(false);
        }
      },
      () => {
        toast.info("Unable to retrieve your location");
        setGettingLocation(false);
      },
      { timeout: 10000 }
    );
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

  useEffect(() => {
    const hideTawkOnMobile = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768 && window.Tawk_API?.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };
    hideTawkOnMobile();
    const t1 = setTimeout(hideTawkOnMobile, 500);
    const t2 = setTimeout(hideTawkOnMobile, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleOpenTawk = (e) => {
    e?.preventDefault();
    if (typeof window === "undefined") return;
    if (window.Tawk_API) {
      if (typeof window.Tawk_API.showWidget === "function") {
        window.Tawk_API.showWidget();
      }
      if (typeof window.Tawk_API.maximize === "function") {
        window.Tawk_API.maximize();
      } else if (typeof window.Tawk_API.toggle === "function") {
        window.Tawk_API.toggle();
      }
    }
  };

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
    return `relative flex h-11 w-11 items-center justify-center rounded-full text-black transition-colors hover:bg-gray-100 ${isActive ? "bg-gray-100" : ""
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
    return `w-full px-4 py-2.5 text-left flex items-center gap-2 text-sm transition-colors hover:bg-gray-50 ${isActive ? "font-bold text-black" : "font-normal text-black"
      }`;
  };

  const ProfileMenu = ({ asPill = false, asCircle = false, useIcon = false } = {}) => {
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 192; // w-48 is 192px
        let left = rect.right - menuWidth;
        if (left < 10) left = Math.max(10, rect.left);
        if (left + menuWidth > window.innerWidth - 10) {
          left = Math.max(10, window.innerWidth - menuWidth - 10);
        }
        setDropdownPos({
          top: Math.round(rect.bottom + 6),
          left: Math.round(left),
        });
      }
    };

    useEffect(() => {
      if (!showProfileMenu) return;
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [showProfileMenu]);

    useEffect(() => {
      if (!showProfileMenu) return;
      const handleClickOutside = (event) => {
        if (
          buttonRef.current &&
          !buttonRef.current.contains(event.target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          if (handleCloseProfileMenu) handleCloseProfileMenu();
          else handleProfileClick?.();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [showProfileMenu]);

    return (
      <div
        className="relative z-50 flex items-center shrink-0"
        onMouseEnter={onProfileMouseEnter}
        onMouseLeave={onProfileMouseLeave}
      >
        <button
          ref={buttonRef}
          onClick={() => {
            updatePosition();
            handleProfileClick?.();
          }}
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
            userInfo?.image?.url && userInfo.image.url !== "https://i.ibb.co/tpV3m2GW/no-image.png" ? (
              <img
                loading="lazy"
                src={userInfo.image.url}
                className="h-full w-full object-cover"
                alt="profile"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserAvatarPlaceholder className="h-[18px] w-[18px] text-[#1A2B49]" />
              </div>
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

        {showProfileMenu &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
              }}
              className="z-[9999] w-48 overflow-hidden rounded-lg bg-white shadow-xl border border-gray-100 p-0"
              onMouseEnter={onProfileMouseEnter}
              onMouseLeave={onProfileMouseLeave}
            >
              {userInfo ? (
                <>
                  <Link
                    to="/profile?tab=My Profile"
                    className={menuLinkClass("/profile", "My Profile")}
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    View Profile
                  </Link>
                  {userInfo?.role === "user" && (
                    <button
                      onClick={() => {
                        handleTeacher("teacher");
                        if (handleCloseProfileMenu) handleCloseProfileMenu();
                        else handleProfileClick?.();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
                    >
                      {userInfo?.reverseRole || userInfo?.sellerName
                        ? "Visit your Seller profile"
                        : "Become a Seller"}
                    </button>
                  )}
                  {userInfo?.role === "teacher" && (
                    <button
                      onClick={() => {
                        handleTeacher("user");
                        if (handleCloseProfileMenu) handleCloseProfileMenu();
                        else handleProfileClick?.();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
                    >
                      Visit your Buyer profile
                    </button>
                  )}
                  <Link
                    to="/"
                    className={menuLinkClass("/")}
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    Build
                  </Link>
                  <Link
                    to="/teach"
                    className={menuLinkClass("/teach")}
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    {userInfo?.role === "teacher" ? "Buyer Requests" : "Requests"}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to={getLoginUrl(location)}
                    state={getSafeRedirectPath(location) ? { from: getSafeRedirectPath(location) } : undefined}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-black hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    Log in
                  </Link>
                  <Link
                    to={getRegisterUrl(location)}
                    state={getSafeRedirectPath(location) ? { from: getSafeRedirectPath(location) } : undefined}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/"
                    className={menuLinkClass("/")}
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    Build
                  </Link>
                  <Link
                    to="/teach"
                    className={menuLinkClass("/teach")}
                    onClick={() => {
                      if (handleCloseProfileMenu) handleCloseProfileMenu();
                      else handleProfileClick?.();
                    }}
                  >
                    Requests
                  </Link>
                </>
              )}
            </div>,
            document.body
          )}
      </div>
    );
  };

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
    <div className="relative z-50 flex w-full flex-col gap-[10px] min-w-0">
      {/* Mobile-only Top row: Logo on left, Open requests & Tawk Chat on right */}
      <div className={`flex w-full items-center justify-between pt-0.5 pb-0 ${breadcrumbs ? 'mb-0' : 'mb-[10px]'} md:hidden`}>
        <Logo variant="header" />
        <div className="flex items-center gap-2 shrink-0">
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
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#0084FF] px-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 25 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5.08823 13.549C2.83036 13.549 1 11.7232 1 9.47096C1 7.21873 2.83036 5.39294 5.08823 5.39294H6.437M5.08823 13.549C5.08823 13.549 6.5 18.4399 7 19.9347C7.5 21.4296 10 21.4296 10 19.4365C10 17.4434 10 16.3492 10 13.8091M5.08823 13.549H6.437M10 13.8091C12.8477 14.4578 15.4867 16.1864 18.0258 17.4528C23.1139 19.9905 22.9998 11.9424 22.9998 9.47096C22.9998 6.99952 23.1139 -1.0486 18.0258 1.48908C14.8411 3.07743 11.4994 5.39294 7.78577 5.39294H6.437M10 13.8091C9.27601 13.6441 8.53853 13.549 7.78577 13.549H6.437M6.437 13.549V5.39294" />
              <path d="M24 7.00027V12.0003" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{userInfo?.role === "teacher" ? "Open requests" : "Generate Request"}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenTawk}
            className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:opacity-90 active:scale-95"
            aria-label="Support chat"
            title="Chat with us"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3.5C7.305 3.5 3.5 6.97 3.5 11.25C3.5 13.568 4.708 15.632 6.64 16.993C6.398 17.897 5.867 19.123 5.093 20.024C4.945 20.196 5.048 20.457 5.274 20.485C6.938 20.69 8.784 20.146 10.027 19.336C10.663 19.467 11.322 19.537 12 19.537C16.695 19.537 20.5 16.067 20.5 11.787C20.5 7.507 16.695 3.5 12 3.5Z"
                fill="white"
              />
              <path
                d="M9.6 12.6C10.3 13.6 11.1 14.1 12 14.1C12.9 14.1 13.7 13.6 14.4 12.6"
                stroke="#0084FF"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Actions row: Desktop only */}
      <div className="relative z-50 hidden md:flex w-full items-center justify-between gap-4 py-0.5">
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Logo variant="header" />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {userInfo ? (
            <>
              <div className="hidden md:flex items-center">
                <ProfileMenu asCircle />
              </div>
              <Link
                to="/profile?tab=My Bookmarks"
                className="hidden md:inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-black transition-colors hover:bg-gray-300 md:w-auto md:gap-2 md:px-4 text-sm font-semibold"
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
                <span className="hidden md:inline">Favorites</span>
              </Link>
              <Link
                to="/chat"
                className="relative hidden md:inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-black transition-colors hover:bg-gray-300 md:w-auto md:gap-2 md:px-4 text-sm font-semibold"
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
                <span className="hidden md:inline">Messages</span>
              </Link>
              <Link
                to="/profile"
                className="hidden md:inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-black transition-colors hover:bg-gray-300 md:w-auto md:gap-2 md:px-4 text-sm font-semibold"
                aria-label="Dashboard"
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
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to={getRegisterUrl(location)}
                state={getSafeRedirectPath(location) ? { from: getSafeRedirectPath(location) } : undefined}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                Sign up
                <ArrowRight size={16} />
              </Link>
              <Link
                to={getLoginUrl(location)}
                state={getSafeRedirectPath(location) ? { from: getSafeRedirectPath(location) } : undefined}
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
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#0084FF] px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
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
            <span>{userInfo?.role === "teacher" ? "Open requests" : "Generate Request"}</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation: Below Logo Row (20px gap above and below) */}
      {breadcrumbs && (
        <div className="w-full my-[10px]">
          {breadcrumbs}
        </div>
      )}

      {/* Mobile (<lg): Clean Collapsible 'Search services' Card with Floating Shadow */}
      {!hideMobileSearchCard && (
        <div className="w-full lg:hidden rounded-2xl border border-gray-100/90 bg-white p-4 floating-search-card sm:p-5">
          {/* Card Header (Collapsible) */}
          <div
            onClick={() => setIsSearchCardExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-gray-500">
                <svg
                  className="h-5 w-5"
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
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {searchCardTitle || (location.pathname === "/teach" ? "Search Users Requests" : "Search Gigs")}
                </h3>
                <p className="text-xs text-gray-400 font-normal leading-normal mt-0.5 truncate">
                  {location.pathname === "/teach" ? "Find open requests from buyers." : "Find exactly what you're looking for."}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label={isSearchCardExpanded ? "Collapse search" : "Expand search"}
            >
              <ChevronUp
                className={`h-5 w-5 transition-transform duration-200 ${isSearchCardExpanded ? "" : "rotate-180"
                  }`}
              />
            </button>
          </div>

          {/* Card Body (when expanded) */}
          {isSearchCardExpanded && (
            <div className="mt-4 flex flex-col gap-3.5 pt-1">
              {/* Search & Location Inputs: Seamlessly joined, generous height & padding */}
              <div className="flex flex-col gap-1">
                {/* Search Row */}
                <div className="flex min-h-[46px] items-center gap-3 py-2.5 sm:py-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-400"
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
                    placeholder={
                      searchPlaceholder && searchPlaceholder !== "Search"
                        ? searchPlaceholder
                        : location.pathname === "/teach"
                        ? "What request are you looking for?"
                        : "What service do you need?"
                    }
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm sm:text-[15px] font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal outline-none"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearch("");
                        onSearchChange?.("");
                      }}
                      className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Location Row */}
                <div className="flex min-h-[46px] items-center gap-3 py-2.5 sm:py-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-400"
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
                  <div className="relative min-w-0 flex-1">
                    <LocationAutocomplete
                      value={localLocation}
                      onChange={handleLocationUpdate}
                      onSelectDetails={(details) => {
                        const description = details?.description || "";
                        setLocalLocation(description);
                        if (onLocationSelect) onLocationSelect(details);
                        else onLocationChange?.(description);
                      }}
                      placeholder="City or postcode"
                      variant="type"
                      leadingIcon={null}
                      positionRelative={false}
                      placeholderClassName="placeholder:text-gray-400 placeholder:font-normal"
                      className="w-full bg-transparent p-0 py-1 text-sm sm:text-[15px] font-medium text-gray-800 outline-none"
                    />
                  </div>
                  {localLocation ? (
                    <button
                      type="button"
                      onClick={() => handleLocationUpdate("")}
                      className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-gray-600"
                      aria-label="Clear location"
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={gettingLocation}
                      className="shrink-0 py-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {gettingLocation ? "Locating..." : "Use current"}
                    </button>
                  )}
                </div>
              </div>

              {/* 2x2 Grid for Service Types: Online, In-person, On demand, Fixed price */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
                {/* Online */}
                <label
                  onClick={handleToggleOnline}
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${effectiveOnline
                      ? "bg-[#4F46E5] text-white"
                      : "border-[1.5px] border-gray-300 bg-white"
                      }`}
                  >
                    {effectiveOnline && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Online</span>
                </label>

                {/* In-person */}
                <label
                  onClick={handleToggleInPerson}
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${effectiveInPerson
                      ? "bg-[#4F46E5] text-white"
                      : "border-[1.5px] border-gray-300 bg-white"
                      }`}
                  >
                    {effectiveInPerson && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">In-person</span>
                </label>

                {location.pathname !== "/teach" && (
                  <>
                    {/* On demand */}
                    <label
                      onClick={handleToggleOnDemand}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${effectiveOnDemand
                          ? "bg-[#4F46E5] text-white"
                          : "border-[1.5px] border-gray-300 bg-white"
                          }`}
                      >
                        {effectiveOnDemand && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">On demand</span>
                    </label>

                    {/* Fixed price */}
                    <label
                      onClick={handleToggleFixedPrice}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${effectiveFixedPrice
                          ? "bg-[#4F46E5] text-white"
                          : "border-[1.5px] border-gray-300 bg-white"
                          }`}
                      >
                        {effectiveFixedPrice && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">Fixed price</span>
                    </label>
                  </>
                )}
              </div>

              {/* Budget Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Your Budget</span>
                  <CurrencySelector
                    buttonClassName="h-7 px-2.5 py-1 rounded-md bg-[#F2F4F7] text-xs font-semibold text-[#1D2939] hover:bg-gray-200 transition-colors border-0 shadow-none gap-1.5"
                    className="shrink-0"
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F2F4F7] px-3.5 py-2 transition-colors focus-within:bg-gray-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      MIN
                    </span>
                    <input
                      type="number"
                      value={localMinPrice}
                      onChange={(e) => handleMinPriceChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                    />
                  </div>
                  <div className="rounded-xl bg-[#F2F4F7] px-3.5 py-2 transition-colors focus-within:bg-gray-100">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      MAX
                    </span>
                    <input
                      type="number"
                      value={localMaxPrice}
                      onChange={(e) => handleMaxPriceChange(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sort Results Section */}
              <div className="pt-2">
                <span className="block text-sm font-bold text-gray-900 mb-2">Sort results</span>
                <div className="flex items-center gap-5 text-sm font-medium">
                  {(location.pathname === "/teach"
                    ? [
                        { id: "newest", label: "Newest" },
                        { id: "oldest", label: "Oldest" },
                      ]
                    : [
                        { id: "best_match", label: "Best match" },
                        { id: "newest", label: "Newest" },
                        { id: "nearby", label: "Nearby" },
                      ]
                  ).map((option) => {
                    const isSelected = (currentSort || (location.pathname === "/teach" ? "newest" : "best_match")) === option.id;
                    return (
                      <label
                        key={option.id}
                        onClick={() => handleSortChange(option.id)}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <div
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected
                            ? "border-[#4F46E5]"
                            : "border-gray-300 bg-white"
                            }`}
                        >
                          {isSelected && (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />
                          )}
                        </div>
                        <span
                          className={
                            isSelected
                              ? "font-semibold text-[#4F46E5]"
                              : "text-gray-600 hover:text-gray-900"
                          }
                        >
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop (lg+): Inline single row toolbar */}
      <div
        className={`${isProfileSection ? "hidden lg:flex" : "hidden lg:flex"
          } w-full items-center gap-3`}
      >
        {/* Search Input */}
        <label className="flex h-11 shrink-0 lg:min-w-0 lg:flex-1 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-5 transition-colors">
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

        {/* Location Input */}
        <div className="relative flex h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-5 lg:w-[160px] xl:w-[200px] transition-colors">
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

        {/* Filter pills: Online, In-person, On demand, Fixed pricing */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleOnline}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] px-3 sm:px-4 xl:px-5 text-sm font-semibold transition-all cursor-pointer shrink-0 ${effectiveOnline
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
              }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${effectiveOnline
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
            <span className="whitespace-nowrap">Online</span>
          </button>

          <button
            type="button"
            onClick={handleToggleInPerson}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] px-3 sm:px-4 xl:px-5 text-sm font-semibold transition-all cursor-pointer shrink-0 ${effectiveInPerson
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
              }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${effectiveInPerson
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
            <span className="whitespace-nowrap">In-person</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOnDemand}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] px-3 sm:px-4 xl:px-5 text-sm font-semibold transition-all cursor-pointer shrink-0 ${effectiveOnDemand
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
              }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${effectiveOnDemand
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
            <span className="whitespace-nowrap">On demand</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFixedPrice}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] px-3 sm:px-4 xl:px-5 text-sm font-semibold transition-all cursor-pointer shrink-0 ${effectiveFixedPrice
              ? "border-primary bg-primary text-white shadow-xs hover:opacity-95"
              : "border-black bg-white text-black hover:bg-gray-50"
              }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${effectiveFixedPrice
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
            <span className="whitespace-nowrap">Fixed pricing</span>
          </button>
        </div>

        {/* Price Range and Currency Selector on desktop */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (onFilterClick) onFilterClick();
              else handleSearchClick?.();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-black bg-white px-3 sm:px-5 text-sm font-semibold text-black transition-colors hover:bg-gray-50 cursor-pointer shrink-0"
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
            <span className="whitespace-nowrap">Price Range</span>
          </button>

          <CurrencySelector
            buttonClassName="h-11 w-auto justify-center px-3.5"
            className="w-auto shrink-0"
          />
        </div>
      </div>

      {/* Categories Toolbar: Desktop header only - placed below the search row */}
      {Boolean(isHome && !breadcrumbs && onSelectCategory) && (
        <div className="hidden lg:block w-full">
          <SearchCategoryToolbar
            categories={_categories}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
        </div>
      )}
    </div>
  );
}
