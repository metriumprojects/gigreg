import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, User, LogIn, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import UserAvatarPlaceholder from './UserAvatarPlaceholder'
import { becomeTeacher, getUser, LogoutUser } from '../redux/reducers/AuthReducer'
import { resetChatState } from '../redux/reducers/ChatReducer'
import { isSellerProfileComplete } from '../utils/proposalRequest'
import { getLoginUrl, getRegisterUrl, getSafeRedirectPath } from '../utils/authRedirect'
import SearchCategoryToolbar from '../Pages/Home/Components/SearchCategoryToolbar'

const CategoriesIcon = ({ className = "h-4 w-4", strokeWidth = 2, size = 16 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

const DashboardIcon = ({ className = "h-5 w-5", strokeWidth = 2, size }) => (
  <svg
    className={className}
    width={size || 20}
    height={size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 23C14.4477 23 16.3465 22.8672 17.8271 22.5381C19.2964 22.2115 20.2925 21.7056 20.999 20.999C21.7056 20.2925 22.2115 19.2964 22.5381 17.8271C22.8672 16.3465 23 14.4477 23 12C23 9.55232 22.8672 7.65353 22.5381 6.17285C22.2115 4.70364 21.7056 3.70752 20.999 3.00098C20.2925 2.29443 19.2964 1.78846 17.8271 1.46191C16.3465 1.13284 14.4477 1 12 1C9.55232 1 7.65353 1.13284 6.17285 1.46191C4.70364 1.78846 3.70752 2.29443 3.00098 3.00098C2.29443 3.70752 1.78846 4.70364 1.46191 6.17285C1.13284 7.65353 1 9.55232 1 12C1 14.4477 1.13284 16.3465 1.46191 17.8271C1.78846 19.2964 2.29443 20.2925 3.00098 20.999C3.70752 21.7056 4.70364 22.2115 6.17285 22.5381C7.65353 22.8672 9.55232 23 12 23Z" />
    <path d="M12 7V17M17 11V17M7 13V17" />
  </svg>
)

const FavoriteIcon = ({ className = "h-5 w-5", strokeWidth = 2, size }) => (
  <svg
    className={className}
    width={size || 20}
    height={size || 20}
    viewBox="0 0 24 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
  >
    <path d="M7.6 1C9.29038 1 10.8323 1.84142 12 2.8C13.1677 1.84142 14.7096 1 16.4 1C20.0451 1 23 3.71049 23 7.05386C23 13.795 15.3274 17.721 12.7981 18.8321C12.2886 19.056 11.7114 19.056 11.2019 18.8321C8.67259 17.721 1 13.7948 1 7.0537C1 3.71033 3.95492 1 7.6 1Z" />
  </svg>
)

const MessageIcon = ({ className = "h-5 w-5", strokeWidth = 2, size }) => (
  <svg
    className={className}
    width={size || 20}
    height={size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1C14.4525 1 16.3622 1.11115 17.8555 1.39844C19.3435 1.68476 20.3442 2.13238 21.0449 2.75C22.437 3.97718 23 6.1956 23 10.667C23 13.5483 22.7414 15.6686 22.0449 17.0498C21.7106 17.7128 21.2866 18.1796 20.7539 18.4902C20.2155 18.8041 19.4936 19 18.5 19C17.2191 19 16.2577 19.2876 15.5059 19.7969C14.7719 20.2942 14.3293 20.9457 14 21.4639C13.6386 22.0325 13.444 22.3727 13.1562 22.6309C12.9352 22.8292 12.6259 23 12 23C11.3746 22.9999 11.0658 22.8291 10.8447 22.6309C10.557 22.3727 10.3622 22.0323 10.001 21.4639C9.67166 20.9457 9.22903 20.2941 8.49512 19.7969C7.74319 19.2874 6.78116 19 5.5 19C4.51162 19 3.79216 18.7989 3.25391 18.4785C2.71973 18.1605 2.29346 17.6827 1.95703 17.0098C1.25819 15.6116 1.00002 13.488 1 10.667C1 6.25226 1.56212 4.02877 2.95898 2.78711C3.66173 2.16245 4.66331 1.70573 6.14941 1.41211C7.64112 1.11742 9.54954 1 12 1Z" />
  </svg>
)

const MobileMenu = ({
  categories: propCategories = [],
  selectedCategory: propSelectedCategory = "",
  onSelectCategory = null,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { userInfo } = useSelector((state) => state.auth)
  const { chatUnread } = useSelector((state) => state.chat || { chatUnread: 0 })
  const { categories: reduxCategories } = useSelector((state) => state.category || { categories: [] })
  const isLoggedIn = !!userInfo

  const isHome = location.pathname === '/' || location.pathname === '/listing'
  const categories = Array.isArray(propCategories) && propCategories.length > 0 ? propCategories : (reduxCategories || [])
  const queryCategory = new URLSearchParams(location.search).get("category") || ""
  const selectedCategory = propSelectedCategory || queryCategory

  const DEFAULT_SHEET_HEIGHT = 240
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false)
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_SHEET_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ y: 0, height: DEFAULT_SHEET_HEIGHT })
  const profileButtonRef = useRef(null)
  const menuRef = useRef(null)

  const getBounds = () => {
    const minH = 200
    const maxH = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.86) : 600
    return { minH, maxH }
  }

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (_) {}
    setIsDragging(true)
    dragStartRef.current = {
      y: e.clientY,
      height: sheetHeight,
    }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const deltaY = dragStartRef.current.y - e.clientY
    const { minH, maxH } = getBounds()
    const targetHeight = Math.max(minH, Math.min(maxH, dragStartRef.current.height + deltaY))
    setSheetHeight(targetHeight)
  }

  const handlePointerUp = (e) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_) {}
      setIsDragging(false)
    }
  }

  const handleTouchStart = (e) => {
    setIsDragging(true)
    dragStartRef.current = {
      y: e.touches[0].clientY,
      height: sheetHeight,
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const deltaY = dragStartRef.current.y - e.touches[0].clientY
    const { minH, maxH } = getBounds()
    const targetHeight = Math.max(minH, Math.min(maxH, dragStartRef.current.height + deltaY))
    setSheetHeight(targetHeight)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    setShowCategoriesMenu(false)
    setShowProfileMenu(false)
    setSheetHeight(DEFAULT_SHEET_HEIGHT)
  }, [location.pathname])

  useEffect(() => {
    if (!showProfileMenu) return
    const handleClickOutside = (event) => {
      if (
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [showProfileMenu])

  const handleLogout = () => {
    dispatch(LogoutUser()).then(() => {
      dispatch(resetChatState())
      navigate("/login")
    })
  }

  const handleTeacher = (role) => {
    if (role === "teacher" && !isSellerProfileComplete(userInfo)) {
      navigate("/create-seller-profile")
      return
    }

    dispatch(becomeTeacher(role)).then((res) => {
      if (res.payload?.needsSellerSetup) {
        navigate("/create-seller-profile")
        return
      }
      if (res.payload?.status) {
        toast.success(res.payload.message)
        dispatch(getUser())
        navigate("/profile")
      } else {
        toast.error(res.payload?.message || "Something went wrong")
      }
    })
  }

  const menuLinkClass = (path, searchTab = "") => {
    const currentTab = new URLSearchParams(location.search).get("tab")
    let isActive = false
    if (searchTab) {
      isActive = location.pathname === path && currentTab === searchTab
    } else if (path === "/profile") {
      isActive = location.pathname === path && currentTab !== "My Profile"
    } else {
      isActive = location.pathname === path
    }
    return `w-full px-4 py-2.5 text-left flex items-center gap-2 text-sm transition-colors hover:bg-gray-50 ${
      isActive ? "font-bold text-black" : "font-normal text-black"
    }`
  }

  const isItemActive = (path) => {
    if (!path) return false
    const current = location.pathname + location.search
    if (path.includes("?")) {
      const param = path.split("?")[1]
      return current.includes(param)
    }
    if (path === "/profile") {
      return (
        location.pathname === "/profile" &&
        !location.search.includes("Bookmarks") &&
        !location.search.includes("My Profile")
      )
    }
    return location.pathname === path || (path !== "/" && location.pathname.startsWith(path + "/"))
  }

  const getActiveClass = (path) => {
    return isItemActive(path)
      ? 'text-primary' 
      : 'text-gray-600 hover:text-gray-800'
  }

  const handleItemClick = (e, item) => {
    if (item.label === 'My Profile' || item.isProfile) {
      e.preventDefault()
      setShowCategoriesMenu(false)
      setShowProfileMenu((prev) => !prev)
    } else {
      setShowProfileMenu(false)
      setShowCategoriesMenu(false)
      navigate(item.path)
    }
  }

  const getItemClass = (item) => {
    if (item.label === 'My Profile' || item.isProfile) {
      return showProfileMenu || isItemActive(item.path)
        ? 'text-primary'
        : 'text-gray-600 hover:text-gray-800'
    }
    return getActiveClass(item.path)
  }

  const navigationItems = isLoggedIn 
    ? [
        { label: 'My Profile', icon: User, path: '/profile?tab=My Profile', isProfile: true },
        { label: 'Messages', icon: MessageIcon, path: '/chat' },
        { label: 'Create', icon: Plus, path: '/create-listing' },
        { label: 'Favorites', icon: FavoriteIcon, path: '/profile?tab=My Bookmarks' },
        { label: 'Dashboard', icon: DashboardIcon, path: '/profile' },
      ]
    : [
        { label: 'Log in', icon: LogIn, path: '/login' },
        { label: 'Dashboard', icon: DashboardIcon, path: '/login' },
      ]

  return (
    <>
      {/* Profile Backdrop */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* Categories Backdrop */}
      {showCategoriesMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCategoriesMenu(false)}
        />
      )}

      {/* Categories Movable Bottom Sheet */}
      {showCategoriesMenu && (
        <div
          style={{ height: `${sheetHeight}px` }}
          className={`lg:hidden fixed bottom-[62px] left-0 right-0 z-50 bg-white rounded-t-3xl border-t border-gray-200 shadow-[0_-12px_36px_rgba(0,0,0,0.22)] flex flex-col ${
            isDragging ? '' : 'transition-[height] duration-200 ease-out'
          }`}
        >
          {/* Header: Drag Handle & Cross (No grey line below) */}
          <div
            className="relative flex items-center justify-center h-9 px-4 shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            title="Drag to resize height"
          >
            {/* Centered Grey Drag Handle */}
            <div className="h-1.5 w-12 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors pointer-events-none" />

            {/* Cross Button on Right */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowCategoriesMenu(false)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close categories"
            >
              <X size={18} />
            </button>
          </div>

          {/* Vertical Category Grid (No horizontal scrolling) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pt-3 pb-8 overscroll-contain">
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
              {[{ isTrending: true }, ...(Array.isArray(categories) ? categories : [])].map((cat) => {
                const isTrending = !cat || cat.isTrending
                const isSelected = isTrending ? !selectedCategory : selectedCategory === cat.name
                const title = isTrending ? "Trending" : cat.name
                const imageUrl = isTrending
                  ? "https://i.ibb.co/tpV3m2GW/no-image.png"
                  : (cat?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png")
                const categoryName = isTrending ? "" : cat.name

                return (
                  <button
                    key={isTrending ? "trending" : (cat._id || cat.name)}
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(categoryName)
                      } else {
                        navigate(`/?category=${encodeURIComponent(categoryName)}`)
                      }
                      setShowCategoriesMenu(false)
                      setIsExpanded(false)
                    }}
                    className={`group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl p-1 text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                      isSelected
                        ? "ring-2 ring-primary shadow-md"
                        : "border border-gray-100 hover:border-gray-200 shadow-xs"
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div
                      className={`absolute inset-0 transition-colors ${
                        isSelected ? "bg-primary/65" : "bg-black/40 group-hover:bg-black/50"
                      }`}
                    />
                    <span className="relative z-10 text-[11px] font-bold text-white leading-tight break-words line-clamp-2 px-0.5 drop-shadow-xs">
                      {title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Profile Menu Portal */}
      {showProfileMenu &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bottom-[66px] left-2 z-[9999] w-52 overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-100 py-1 text-sm animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {userInfo ? (
              <>
                <Link
                  to="/profile?tab=My Profile"
                  className={menuLinkClass("/profile", "My Profile")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  View Profile
                </Link>
                {userInfo?.role === "user" && (
                  <button
                    onClick={() => {
                      handleTeacher("teacher")
                      setShowProfileMenu(false)
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
                      handleTeacher("user")
                      setShowProfileMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-normal text-black hover:bg-gray-50 cursor-pointer"
                  >
                    Visit your Buyer profile
                  </button>
                )}
                <Link
                  to="/"
                  className={menuLinkClass("/")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  Build
                </Link>
                <Link
                  to="/teach"
                  className={menuLinkClass("/teach")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  {userInfo?.role === "teacher" ? "Buyer Requests" : "Requests"}
                </Link>
                <Link
                  to="/profile"
                  className={menuLinkClass("/profile")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setShowProfileMenu(false)
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
                  onClick={() => setShowProfileMenu(false)}
                >
                  Log in
                </Link>
                <Link
                  to={getRegisterUrl(location)}
                  state={getSafeRedirectPath(location) ? { from: getSafeRedirectPath(location) } : undefined}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-gray-50 cursor-pointer"
                  onClick={() => setShowProfileMenu(false)}
                >
                  Sign up
                </Link>
                <Link
                  to="/"
                  className={menuLinkClass("/")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  Build
                </Link>
                <Link
                  to="/teach"
                  className={menuLinkClass("/teach")}
                  onClick={() => setShowProfileMenu(false)}
                >
                  Requests
                </Link>
              </>
            )}
          </div>,
          document.body
        )}

      {/* Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full h-[62px] bg-white border-t border-gray-200 z-50 flex items-center">
        {/* Center Attached Categories Pill with Arrow */}
        {isHome && (
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(false)
              setShowCategoriesMenu((prev) => {
                if (!prev) setSheetHeight(DEFAULT_SHEET_HEIGHT)
                return !prev
              })
            }}
            className={`absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-md text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer select-none ${
              showCategoriesMenu || selectedCategory
                ? 'bg-white border-primary text-primary shadow-primary/20'
                : 'bg-white border-gray-300 text-black hover:bg-gray-50'
            }`}
            aria-label="Toggle categories"
          >
            <CategoriesIcon size={14} className={selectedCategory ? "text-primary" : "text-black"} />
            <span className="max-w-[120px] truncate">{selectedCategory || "Categories"}</span>
          </button>
        )}

        <div className="flex justify-between items-center w-full px-2">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              ref={item.label === 'My Profile' ? profileButtonRef : null}
              onClick={(e) => handleItemClick(e, item)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors relative flex-1 min-w-0 ${getItemClass(item)}`}
              title={item.label}
            >
              {item.label === 'My Profile' ? (
                <div className="h-[22px] w-[22px] shrink-0 rounded-full overflow-hidden flex items-center justify-center">
                  {userInfo?.image?.url && userInfo.image.url !== "https://i.ibb.co/tpV3m2GW/no-image.png" ? (
                    <img
                      loading="lazy"
                      src={userInfo.image.url}
                      className="h-full w-full object-cover"
                      alt="profile"
                    />
                  ) : (
                    <UserAvatarPlaceholder className="h-3.5 w-3.5 text-[#1A2B49]" />
                  )}
                </div>
              ) : (
                <item.icon strokeWidth={2} size={20} className="h-5 w-5 shrink-0" />
              )}

              {/* Unread Chat Badge */}
              {item.label === 'Messages' && chatUnread > 0 && (
                <span className="absolute -top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-semibold">
                  {chatUnread > 99 ? "99+" : chatUnread || 0}
                </span>
              )}

              <span className="text-xs font-medium leading-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default MobileMenu
