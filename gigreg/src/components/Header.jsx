import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Search,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { becomeTeacher, getUser, LogoutUser } from "../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import {
  fetchChatConnections,
  resetChatState,
} from "../redux/reducers/ChatReducer";
import CreateRequestPopup from "../Pages/Home/Components/CreateRequestPopup";
import CategoriesBar from "../Pages/Home/Components/Categories";
import CurrencySelector from "./CurrencySelector";
import HeaderSearchOverlay from "./HeaderSearchOverlay";
import Logo from "./Logo";

const Header = ({
  categories = [],
  selectedCategory = "",
  onSelectCategory = null,
  onSearchToggle = null,
  searchInput = "",
  onSearchChange = null,
  locationFilter = "",
  onLocationChange = null,
  onLocationSelect = null,
  onFilterClick = null,
  searchPlaceholder = "Search",
  breadcrumbs = null,
  isOnlineSelected = true,
  isInPersonSelected = true,
  onModeChange = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const { rooms } = useSelector((state) => state.chat);
  const dispatch = useDispatch();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [currentSearch, setCurrentSearch] = useState(searchInput);
  const menuRef = useRef(null);
  const isHome = location.pathname === "/" || location.pathname === "/listing";

  useEffect(() => {
    setCurrentSearch(searchInput);
  }, [searchInput]);

  const handleSearchChangeWrapper = (value) => {
    setCurrentSearch(value);
    onSearchChange?.(value);
  };

  const mobileMenuLinkClass = (path, searchTab = "") => {
    const currentTab = new URLSearchParams(location.search).get("tab");
    let isActive = false;
    if (searchTab) {
      isActive = location.pathname === path && currentTab === searchTab;
    } else if (path === "/profile") {
      isActive = location.pathname === path && currentTab !== "My Profile";
    } else {
      isActive = location.pathname === path;
    }
    return `px-4 py-2 transition-colors ${
      isActive ? "font-bold text-black" : "text-black hover:text-[#1dbf73]"
    }`;
  };

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(LogoutUser()).then(() => {
      dispatch(resetChatState());
      navigate("/login");
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  useEffect(() => {
    if (!userInfo?._id) return;

    const fetchConnections = () => {
      dispatch(fetchChatConnections());
    };

    fetchConnections();

    const handleFocus = () => fetchConnections();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [dispatch, userInfo?._id]);

  const chatUnread = userInfo
    ? rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0)
    : 0;

  const handleTeacher = (role) => {
    dispatch(becomeTeacher(role)).then((res) => {
      if (res.payload?.needsSellerSetup) {
        toast.info(res.payload.message || "Complete seller details in your profile first");
        navigate("/edit-profile");
        return;
      }
      if (res.payload?.status) {
        dispatch(getUser());
        navigate("/profile");
      } else {
        toast.error(res.payload?.message || "Something went wrong");
      }
    });
  };

  const handleSearchClick = () => {
    setShowMobileMenu(false);

    if (isHome) {
      if (onSearchToggle) {
        onSearchToggle();
      }
      return;
    }

    setShowHeaderSearch(true);
  };

  return (
    <header className="relative z-50 mx-auto flex items-center justify-between gap-4 px-3 pt-[20px] md:px-10">
      <div className="flex shrink-0 justify-start lg:hidden">
        <Logo variant="header" />
      </div>

      <div className="flex w-full justify-center">
        <CategoriesBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          userInfo={userInfo}
          chatUnread={chatUnread}
          handleSearchClick={handleSearchClick}
          handleProfileClick={handleProfileClick}
          showProfileMenu={showProfileMenu}
          menuRef={menuRef}
          handleLogout={handleLogout}
          handleTeacher={handleTeacher}
          onOpenRequest={() => setShowCreateRequest(true)}
          searchInput={currentSearch}
          onSearchChange={handleSearchChangeWrapper}
          locationFilter={locationFilter}
          onLocationChange={onLocationChange}
          onLocationSelect={onLocationSelect}
          onFilterClick={onFilterClick || (() => setShowHeaderSearch(true))}
          searchPlaceholder={searchPlaceholder}
          breadcrumbs={breadcrumbs}
          isOnlineSelected={isOnlineSelected}
          isInPersonSelected={isInPersonSelected}
          onModeChange={onModeChange}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-4 lg:hidden">
        <div className="flex items-center gap-3 lg:hidden">
          <CurrencySelector className="shrink-0" buttonClassName="h-9 px-2.5 text-xs" />
          <button
            onClick={handleSearchClick}
            className="rounded-md p-2 transition-colors hover:bg-gray-100 focus:outline-none"
            title="Search"
          >
            <svg
              className="h-5 w-5 text-gray-800"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11.4785 21.9565C15.6062 21.9565 18.1249 21.2974 19.6533 19.8237C21.1731 18.3582 21.9561 15.8484 21.9561 11.478C21.956 7.10783 21.1731 4.59881 19.6533 3.1333C18.1249 1.6595 15.6064 1.00052 11.4785 1.00049C7.35046 1.00049 4.83116 1.65947 3.30273 3.1333C1.78311 4.59884 1.00003 7.10807 1 11.478C1 15.8484 1.78293 18.3582 3.30273 19.8237C4.83116 21.2976 7.35046 21.9565 11.4785 21.9565Z" />
              <path d="M22.9565 22.9565L20.3478 20.3478" />
            </svg>
          </button>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="focus:outline-none"
          >
            {showMobileMenu ? (
              <X className="h-6 w-6 text-gray-800" />
            ) : (
              <Menu className="h-6 w-6 text-gray-800" />
            )}
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-50 flex w-full flex-col items-center space-y-6 bg-white py-6 text-lg font-medium shadow-md lg:hidden"
        >
          {userInfo ? (
            <>
              <Link
                to="/profile?tab=My Profile"
                className={mobileMenuLinkClass("/profile", "My Profile")}
                onClick={() => setShowMobileMenu(false)}
              >
                View Profile
              </Link>
              {userInfo?.role === "user" && (
                <button
                  onClick={() => {
                    handleTeacher("teacher");
                    setShowMobileMenu(false);
                  }}
                  className="rounded-full px-4 py-2 transition-colors hover:text-[#1dbf73]"
                >
                  {userInfo?.reverseRole
                    ? "Seller profile"
                    : "Become a Seller"}
                </button>
              )}
              {userInfo?.role === "teacher" && (
                <button
                  onClick={() => {
                    handleTeacher("user");
                    setShowMobileMenu(false);
                  }}
                  className="rounded-full px-4 py-2 transition-colors hover:text-[#1dbf73]"
                >
                  Become a Buyer
                </button>
              )}
              <Link
                to="/"
                className={mobileMenuLinkClass("/")}
                onClick={() => setShowMobileMenu(false)}
              >
                Build
              </Link>
              <Link
                to="/teach"
                className={mobileMenuLinkClass("/teach")}
                onClick={() => setShowMobileMenu(false)}
              >
                {userInfo?.role === "teacher" ? "Buyer Requests" : "Requests"}
              </Link>
              <button
                type="button"
                className={mobileMenuLinkClass("/teach")}
                onClick={() => {
                  if (userInfo?.role === "teacher") {
                    navigate("/teach");
                    setShowMobileMenu(false);
                    return;
                  }
                  setShowCreateRequest(true);
                  setShowMobileMenu(false);
                }}
              >
                {userInfo?.role === "teacher" ? "Open requests" : "Post a Request"}
              </button>
              <Link
                to="/profile"
                className={mobileMenuLinkClass("/profile")}
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="text-black transition-colors hover:text-black/70 cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className={mobileMenuLinkClass("/register")}
                onClick={() => setShowMobileMenu(false)}
              >
                Create an account
              </Link>
              <Link
                to="/login"
                className={mobileMenuLinkClass("/login")}
                onClick={() => setShowMobileMenu(false)}
              >
                Login
              </Link>
            </>
          )}
        </div>
      )}

      <CreateRequestPopup
        open={showCreateRequest}
        onClose={() => setShowCreateRequest(false)}
      />
      <HeaderSearchOverlay
        open={showHeaderSearch}
        onClose={() => setShowHeaderSearch(false)}
        searchInput={currentSearch}
      />
    </header>
  );
};

export default Header;
