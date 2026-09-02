import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { Star, Edit3, Loader, Edit, Smile, Frown } from "lucide-react";
import { FaInstagram, FaStar, FaYoutube } from "react-icons/fa";
import { SlSocialYoutube } from "react-icons/sl";
import { updateProfileImage } from '../../../redux/reducers/AuthReducer';
import { useNavigate } from 'react-router-dom';

const MyProfile = () => {
    const dispatch = useDispatch();
      const { userInfo, loading } = useSelector((state) => state.auth);
  const [profileImage, setProfileImage] = useState(userInfo?.image?.url);
  const fileInputRef = React.useRef(null);
  const navigate = useNavigate();

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
  return (
    <div className="w-full">
      {/* Profile Section */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-5 mt-7.5">
          <h2 className="text-[28px] font-medium">My profile</h2>
          <button
            onClick={() => navigate("/edit-profile")}
            className="text-base flex items-center gap-1 cursor-pointer"
          >
            Edit profile <Edit3 size={14} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {/* Image */}
          <div
            className="h-80 aspect-square rounded-3xl overflow-hidden shadow-md relative cursor-pointer group"
            onClick={handleImageClick}
          >
            <img
              src={profileImage || "https://i.ibb.co/tpV3m2GW/no-image.png"}
              alt="Profile"
              className="w-full h-full object-cover transition-transform duration-300"
            />

            {/* Edit Icon */}
            <div className="absolute top-2 right-2 p-2 rounded-full bg-black/40 flex items-center justify-center">
              <Edit size={14} className="text-white" />
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Info */}
          <div className="flex-1 text-left items-center">
            <h1 className="text-xl font-semibold mb-2">{userInfo?.name || userInfo?.email}</h1>

            <div className="flex flex-col gap-1 text-base text-gray-800 mb-3">
                <div className="flex items-center gap-2">
                  <span>{userInfo?.averageRating === 0 ? 100 : userInfo?.averageRating}% Rating</span>
                </div>
              {!userInfo?.hideLesson && (
                <span>{userInfo?.classesAttended || 0} Classes attended</span>
              )}
              {!userInfo?.classHosted && (
                <span>{userInfo?.classesHost || 0} Classes hosted</span>
              )}
            </div>

            <p className="text-gray-700 text-base max-w-2xl">{userInfo?.bio}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
