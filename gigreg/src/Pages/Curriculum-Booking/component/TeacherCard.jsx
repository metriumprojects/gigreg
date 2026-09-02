import { BookOpen, Users } from 'lucide-react';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { startChat } from '../../../redux/reducers/ChatReducer';
import { toast } from 'react-toastify';
import { Info, MessageCircle } from "lucide-react";


const TeacherCard = ({
  teacher,
  name,
  averageRating,
  classesHosted,
  classesAttended,
  bio,
  image,
 lession
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
   const { userInfo } = useSelector((state) => state.auth);
  
  const displayName = name || teacher?.name || teacher?.email;
  const displayRating = averageRating || teacher?.averageRating || 0;
  const displayBio = bio || teacher?.bio;
  const displayImage = image || teacher?.image;
  const displayStudents = classesHosted ?? teacher?.classesHosted ?? 0;
  const displayLessons = lession ;

  const handleStartChat = async () => {
    if (!userInfo?._id) {
      toast.info("Please log in to send a message.");
      navigate("/login");
      return;
    }

    if (!teacher?._id) {
      toast.error("Teacher information not available");
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
    <div className="w-full mt-8 bg-[#008CFF1A] p-4 rounded-lg max-w-[720px]">
      <div className="w-fit">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg md:text-xl font-semibold">Meet your teacher</h3>
      </div>

      {/* Content */}
      <div className="flex items-center gap-4">
        
        {/* Avatar */}
        <Link to={`/user-profile/${teacher?._id}?role=teacher`} className="shrink-0">
          <img
            src={displayImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
            alt={displayName}
            className="w-14 h-14 rounded-full object-cover"
          />
        </Link>

        {/* Details */}
        <div className="flex-1">
          
          {/* Name + Rating + Chat */}
          <div className="flex items-center justify-left gap-4">
            <div className="flex items-center gap-2">
              <h4 className="text-sm">{displayName}</h4>
              {displayRating > 0 && (
                <span className="text-sm">
                  ({displayRating}%)
                </span>
              )}
            </div>

            <MessageCircle 
              size={16} 
              className="cursor-pointer hover:text-blue-500 transition-colors" 
              onClick={handleStartChat}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm mt-1">
            <span className="flex items-center gap-1">
              <BookOpen size={16} />
              {displayLessons} Lessons
            </span>
            <span className="flex items-center gap-1">
              <Users size={16} />
              {displayStudents} Students
            </span>
          </div>
        </div>

      </div>
          {/* Bio */}
          {displayBio && (
            <p className="text-sm text-black mt-4 leading-relaxed">
              {displayBio}
            </p>
          )}
      </div>
    </div>
  );
};


export default TeacherCard
