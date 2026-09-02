import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { Star, Edit3, Loader, Edit, Smile, Frown } from "lucide-react";
import { FaInstagram, FaStar, FaYoutube } from "react-icons/fa";
import { SlSocialYoutube } from "react-icons/sl";

import MainLayout from "../../components/MainLayout";
import Booked from "./components/Booked";
import Upcoming from "./components/Upcoming";
import UnShaduled from "./components/UnShaduled";
import Canceled from "./components/Canceled";
import BookMark from "./components/BookMark";
import { useSelector, useDispatch } from "react-redux";
import TeacherDashboard from "./components/TeacherDashboard";
import Lessons from "./components/Lesson";
import Curriculum from "./components/Curriculum";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  becomeTeacher,
  getUser,
  updateProfileImage,
} from "../../redux/reducers/AuthReducer";
import { toast } from "react-toastify";
import Calender from "./components/Calendar";
import Request from "./components/Request";
import StudentDashboard from "./components/StudentDashboard";
import StudentOrders from "./components/StudentOrders";
import Revenu from "./TeacherComponents/Revenu";
import MyProfile from "./components/MyProfile";
import { MyListings } from "./Listings/MyListings";

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo, loading } = useSelector((state) => state.auth);
  const [profileImage, setProfileImage] = useState(userInfo?.image?.url);
  const fileInputRef = React.useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const requestedTab = searchParams.get("tab");
  const tab =
    requestedTab === "Bookmarks"
      ? "My Bookmarks"
      : requestedTab || (userInfo?.role === "user" ? "My Orders" : "Revenue");

  useEffect(() => {
    if (userInfo) {
      // Set initial tab from query param or default based on role
      if (!searchParams.get("tab")) {
        setSearchParams({
          tab: userInfo.role === "user" ? "My Orders" : "Revenue",
        });
      }
      // Set initial profile image
      if (userInfo?.image?.url) {
        setProfileImage(userInfo?.image?.url);
      }
    }
  }, [userInfo]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);

    // Create FormData and upload
    const formData = new FormData();
    formData.append("image", file);

    try {
      await dispatch(updateProfileImage(formData)).unwrap();
    } catch (error) {
      toast.error("Image upload failed:", error);
      // Reset image on error
      if (userInfo?.image?.url) {
        setProfileImage(userInfo.image.url);
      }
    }
  };

  const handleTeacher = (role) => {
    dispatch(becomeTeacher(role)).then((res) => {
      if (res.payload?.needsSellerSetup) {
        toast.info(res.payload.message || "Complete seller details in your profile first");
        navigate("/edit-profile");
        return;
      }
      if (res.payload?.status) {
        toast.success(res.payload.message);
        dispatch(getUser());

        // Set the appropriate tab based on the new role
        if (role === "user") {
          setSearchParams({ tab: "My Orders" });
        } else if (role === "teacher") {
          setSearchParams({ tab: "Revenue" });
        }
      } else {
        toast.error(res.payload?.message || "Something went wrong");
      }
    });
  };

  // Build-only profile tabs (listings / gigs)
  const studentStates = [
    "My Orders",
    "My Bookmarks",
    "My Profile",
  ];

  const teacherStates = [
    "Revenue",
    "My Listing",
    "My Orders",
    "My Availability",
    "My Bookmarks",
    "My Profile",
  ];

  const tabsToShow = userInfo?.role === "user" ? studentStates : teacherStates;

  return (
    <MainLayout className="mx-auto" width="1800px">
      <div className="min-h-screen w-full flex flex-col items-center py-10">
        {/* Bottom Tabs Section */}
        <div className="w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Desktop Tabs */}
            <div className="hidden w-fit max-w-full rounded-full overflow-hidden border border-black bg-white p-1 font-medium text-black md:block">
            <Swiper
              modules={[FreeMode]}
              freeMode={{ enabled: true, momentum: true }}
              slidesPerView="auto"
              spaceBetween={4}
              grabCursor
              className="w-full"
            >
              {tabsToShow.map((s, index) => (
                <SwiperSlide key={index} className="!w-auto">
                  <button
                    onClick={() => setSearchParams({ tab: s })}
                    className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm transition-colors duration-200 ${
                      tab === s
                        ? "bg-primary text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {s}
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>
            </div>

            {userInfo?.role === "user" ? (
              <button
                type="button"
                onClick={() => handleTeacher("teacher")}
                className="rounded-full border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-50"
              >
                Become a Seller
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleTeacher("user")}
                className="rounded-full border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-50"
              >
                Become a Buyer
              </button>
            )}
          </div>
          {/* Mobile Dropdown Tabs */}
          <div className="relative mb-4 md:hidden">
            <button
              className="flex w-fit items-center justify-between rounded-full bg-primary px-5 py-2.5 font-medium text-white "
              onClick={() => setShowDropdown((prev) => !prev)}
              type="button"
            >
              {tab}
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showDropdown && (
              <div className="absolute left-0 right-0 z-10 mt-2 space-y-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg">
                {tabsToShow.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchParams({ tab: s });
                      setShowDropdown(false);
                    }}
                    className={`w-full rounded-xl px-5 py-2.5 text-left transition-colors ${
                      tab === s
                        ? "bg-primary font-semibold text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* {tab === "Booked" && <Booked />} */}
          {tab === "Revenue" && <Revenu />}
          {tab === "Upcoming" && <Upcoming />}
          {tab === "Unscheduled" && <UnShaduled />}
          {tab === "Canceled" && <Canceled />}
          {tab === "My Bookmarks" && <BookMark />}
          {tab === "My Schedule" && <TeacherDashboard />}
          {tab === "Student Dashboard" && <StudentDashboard />}
          {tab === "My Orders" && (
            userInfo?.role === "teacher" ? <TeacherDashboard /> : <StudentOrders />
          )}
          {tab === "My Lessons" && <Lessons />}
          {tab === "My Curriculum" && <Curriculum />}
          {(tab === "My Availability" || tab === "My Availability Calendar") && <Calender />}
          {tab === "My Requests" && <Request />}
          {tab === "My Profile" && <MyProfile />}
          {tab === "My Listing" && <MyListings />}
        </div>
      </div>
    </MainLayout>
  );
}
