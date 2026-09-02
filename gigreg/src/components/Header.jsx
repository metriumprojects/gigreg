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
  searchPlaceholder = "Search open requests",
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
  const menuRef = useRef(null);
  const isHome = location.pathname === "/" || location.pathname === "/listing";

  const isActiveLink = (path) => location.pathname === path;

  const mobileMenuLinkClass = (path) =>
    `px-4 py-2 rounded-full transition-colors ${
      isActiveLink(path) ? "border border-white bg-[#008CFF] text-white" : "hover:text-[#1dbf73]"
    }`;

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
    <header className={`relative mx-auto flex items-center justify-between gap-4 px-3 pt-5 md:px-10 ${isHome ? "" : "pb-2"}`}>
      <span
        className="flex shrink-0 justify-start lg:hidden"
        onClick={() => {
          window.location.href = "/";
        }}
      >
        <img
          src="https://res.cloudinary.com/dinwxxnzm/image/upload/v1784044801/Logo_1_jldcf8.png"
          alt="logo"
          className="h-8 w-auto md:h-10"
        />
      </span>

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
          searchInput={searchInput}
          onSearchChange={onSearchChange}
          locationFilter={locationFilter}
          onLocationChange={onLocationChange}
          onLocationSelect={onLocationSelect}
          onFilterClick={onFilterClick || (() => setShowHeaderSearch(true))}
          searchPlaceholder={searchPlaceholder}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-4 lg:hidden">
        <div className="flex items-center gap-3 lg:hidden">
          <CurrencySelector className="w-[88px]" hideIcon />
          <button
            onClick={handleSearchClick}
            className="rounded-md p-2 transition-colors hover:bg-gray-100 focus:outline-none"
            title="Search"
          >
            <Search className="h-5 w-5 text-gray-800" />
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
                to="/profile"
                className={mobileMenuLinkClass("/profile")}
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
                {userInfo?.role === "teacher" ? "Open request" : "Post a Request"}
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
                className="text-red-500"
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
      />
    </header>
  );
};

export default Header;
