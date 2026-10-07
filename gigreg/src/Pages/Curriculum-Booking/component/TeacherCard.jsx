import { Package, Star } from 'lucide-react';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { startChat } from '../../../redux/reducers/ChatReducer';
import { toast } from 'react-toastify';


const TeacherCard = ({
  teacher,
  name,
  averageRating,
  classesHosted,
  classesAttended,
  bio,
  image,
  lession,
  listing,
  listings,
  orders,
  orderCount,
  reviews,
  reviewCount,
  title,
  roleTitle,
  className = "mt-8",
  onReviewsClick,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
   const { userInfo } = useSelector((state) => state.auth);
  
  const displayName = name || teacher?.name || teacher?.email;
  const displayRating = averageRating || teacher?.averageRating || 0;
  const displayBio = bio || teacher?.bio;
  const displayImage = image || teacher?.image;
  const displayOrders = orders ?? orderCount ?? listing ?? listings ?? lession ?? 0;
  const displayReviews = reviews ?? reviewCount ?? classesHosted ?? teacher?.reviewsCount ?? teacher?.classesHosted ?? 0;
  const displayTitle = title ? (title.endsWith(":") ? title : `${title}:`) : "Meet your teacher:";

  const handleStartChat = async () => {
    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    if (!teacher?._id) {
      toast.error(`${roleTitle || "Teacher"} information not available`);
      return;
    }

    if (userInfo?._id === teacher._id) {
      toast.info("This is your profile.");
      return;
    }

    try {
      const data = await dispatch(startChat({ targetUserId: teacher._id })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      toast.success("Chat ready.");
      navigate(`/chat/${roomId}`);
    } catch (error) {
      const message =
        typeof error === "string" ? error : "Failed to start chat.";
      toast.error(message);
    }
  };

  return (
    <div className={`w-full bg-[#F5F5F5] text-black rounded-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Top: Avatar / Photo full width */}
      <Link
        to={`/user-profile/${teacher?._id}?role=teacher`}
        className="w-full h-48 sm:h-56 relative overflow-hidden block shrink-0"
      >
        <img
          src={displayImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      </Link>

      {/* Content: Header, Details, Bio */}
      <div className="flex flex-col p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-[10px]">
          <h3 className="text-lg md:text-xl font-semibold text-black">{displayTitle}</h3>
        </div>

        {/* Name + Rating */}
        <div className="flex items-center gap-2 mb-[10px]">
          <h4 className="text-sm font-semibold text-black truncate">{displayName}</h4>
          {displayRating > 0 && (
            <span className="text-sm text-gray-600 shrink-0">
              ({displayRating}%)
            </span>
          )}
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Message Bubble Button */}
          <button
            type="button"
            onClick={handleStartChat}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 border border-gray-200/80 shadow-2xs transition-colors hover:bg-gray-50 cursor-pointer"
            title="Message"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-gray-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1C14.4525 1 16.3622 1.11115 17.8555 1.39844C19.3435 1.68476 20.3442 2.13238 21.0449 2.75C22.437 3.97718 23 6.1956 23 10.667C23 13.5483 22.7414 15.6686 22.0449 17.0498C21.7106 17.7128 21.2866 18.1796 20.7539 18.4902C20.2155 18.8041 19.4936 19 18.5 19C17.2191 19 16.2577 19.2876 15.5059 19.7969C14.7719 20.2942 14.3293 20.9457 14 21.4639C13.6386 22.0325 13.444 22.3727 13.1562 22.6309C12.9352 22.8292 12.6259 23 12 23C11.3746 22.9999 11.0658 22.8291 10.8447 22.6309C10.557 22.3727 10.3622 22.0323 10.001 21.4639C9.67166 20.9457 9.22903 20.2941 8.49512 19.7969C7.74319 19.2874 6.78116 19 5.5 19C4.51162 19 3.79216 18.7989 3.25391 18.4785C2.71973 18.1605 2.29346 17.6827 1.95703 17.0098C1.25819 15.6116 1.00002 13.488 1 10.667C1 6.25226 1.56212 4.02877 2.95898 2.78711C3.66173 2.16245 4.66331 1.70573 6.14941 1.41211C7.64112 1.11742 9.54954 1 12 1Z" />
            </svg>
            <span>Message</span>
          </button>

          {/* Orders Pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 border border-gray-200/80 shadow-2xs">
            <Package size={14} className="stroke-[2.5] text-gray-700" />
            <span>{displayOrders} {displayOrders === 1 ? "Order" : "Orders"}</span>
          </span>

          {/* Reviews Pill */}
          <button
            type="button"
            onClick={(e) => {
              if (onReviewsClick) {
                onReviewsClick(e);
              } else {
                const el = document.getElementById("reviews-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 border border-gray-200/80 shadow-2xs transition hover:bg-gray-50 hover:border-gray-300 cursor-pointer"
            title="View reviews"
          >
            <Star size={14} className="stroke-[2.5] text-gray-700" />
            <span>{displayReviews} {displayReviews === 1 ? "Review" : "Reviews"}</span>
          </button>
        </div>

        {/* Bio */}
        {displayBio && (
          <p className="text-sm text-black mt-[10px] leading-relaxed">
            {displayBio}
          </p>
        )}
      </div>
    </div>
  );
};


export default TeacherCard
