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
  className = "",
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
    <div className={`w-full mt-8 bg-primary text-white p-5 rounded-xl ${className}`}>
      <div className="w-full">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-[10px]">
        <h3 className="text-lg md:text-xl font-semibold text-white">{displayTitle}</h3>
      </div>

      {/* Content */}
      <div className="flex items-center gap-4">
        
        {/* Avatar */}
        <Link to={`/user-profile/${teacher?._id}?role=teacher`} className="shrink-0">
          <img
            src={displayImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
            alt={displayName}
            className="w-[108px] h-[108px] rounded-xl object-cover border-2 border-white/20 shrink-0"
          />
        </Link>

        {/* Details */}
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          
          {/* Name + Rating */}
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white">{displayName}</h4>
            {displayRating > 0 && (
              <span className="text-sm text-white/90">
                ({displayRating}%)
              </span>
            )}
          </div>

          {/* Message Bubble Button */}
          <div>
            <button
              type="button"
              onClick={handleStartChat}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/30 cursor-pointer"
              title="Message"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
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
          </div>

          {/* Orders Pill */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              <Package size={14} className="stroke-[2.5]" />
              <span>{displayOrders} {displayOrders === 1 ? "Order" : "Orders"}</span>
            </span>
          </div>

          {/* Reviews Pill */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              <Star size={14} className="stroke-[2.5]" />
              <span>{displayReviews} {displayReviews === 1 ? "Review" : "Reviews"}</span>
            </span>
          </div>
        </div>

      </div>
          {/* Bio */}
          {displayBio && (
            <p className="text-sm text-white/95 mt-[10px] leading-relaxed">
              {displayBio}
            </p>
          )}
      </div>
    </div>
  );
};


export default TeacherCard
