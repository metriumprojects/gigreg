import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { becomeTeacher, getUser, LogoutUser } from "../redux/reducers/AuthReducer";
import { isSellerProfileComplete } from "../utils/proposalRequest";
import { toast } from "react-toastify";
import {
  fetchChatConnections,
  resetChatState,
} from "../redux/reducers/ChatReducer";
import CreateRequestPopup from "../Pages/Home/Components/CreateRequestPopup";
import CategoriesBar from "../Pages/Home/Components/Categories";
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
  searchPlaceholder = "Search",
  breadcrumbs = null,
  isOnlineSelected = true,
  isInPersonSelected = true,
  isOnDemandSelected = true,
  isFixedPriceSelected = true,
  onModeChange = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useSelector((state) => state.auth);
  const { rooms } = useSelector((state) => state.chat);
  const dispatch = useDispatch();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [currentSearch, setCurrentSearch] = useState(searchInput);
  const menuRef = useRef(null);
  const profileTimeoutRef = useRef(null);
  const isHome = location.pathname === "/" || location.pathname === "/listing";

  const handleProfileMouseEnter = () => {
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
      setShowProfileMenu(true);
    }
  };

  const handleProfileMouseLeave = () => {
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = setTimeout(() => {
        setShowProfileMenu(false);
      }, 180);
    }
  };

  useEffect(() => {
    return () => {
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setCurrentSearch(searchInput);
  }, [searchInput]);

  const handleSearchChangeWrapper = (value) => {
    setCurrentSearch(value);
    onSearchChange?.(value);
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

  const handleProfileClick = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setShowProfileMenu((prev) => !prev);
  };

  const handleCloseProfileMenu = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setShowProfileMenu(false);
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
    if (role === "teacher" && !isSellerProfileComplete(userInfo)) {
      navigate("/create-seller-profile");
      return;
    }

    dispatch(becomeTeacher(role)).then((res) => {
      if (res.payload?.needsSellerSetup) {
        navigate("/create-seller-profile");
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
    if (isHome) {
      if (onSearchToggle) {
        onSearchToggle();
      }
      return;
    }

    setShowHeaderSearch(true);
  };

  return (
    <header
      className={`relative z-50 mx-auto w-full px-3 pt-[20px] md:px-10 ${
        isHome ? "pb-[10px]" : "pb-[20px]"
      }`}
    >
      <CategoriesBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        userInfo={userInfo}
        chatUnread={chatUnread}
        handleSearchClick={handleSearchClick}
        handleProfileClick={handleProfileClick}
        handleCloseProfileMenu={handleCloseProfileMenu}
        onProfileMouseEnter={handleProfileMouseEnter}
        onProfileMouseLeave={handleProfileMouseLeave}
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
        isOnDemandSelected={isOnDemandSelected}
        isFixedPriceSelected={isFixedPriceSelected}
        onModeChange={onModeChange}
      />


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
