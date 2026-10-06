import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { Edit } from "lucide-react";
import { updateProfileImage } from '../../../redux/reducers/AuthReducer';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserAvatarPlaceholder from '../../../components/UserAvatarPlaceholder';

const MyProfile = () => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);
  const [profileImage, setProfileImage] = useState(userInfo?.image?.url);
  const [imageError, setImageError] = useState(false);
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
    setImageError(false);
    setProfileImage(previewUrl);

    // Create FormData and upload
    const formData = new FormData();
    formData.append("image", file);

    try {
      await dispatch(updateProfileImage(formData)).unwrap();
    } catch (error) {
      toast.error("Image upload failed: " + (error?.message || error));
      // Reset image on error
      if (userInfo?.image?.url) {
        setProfileImage(userInfo.image.url);
      }
    }
  };

  const isSeller = userInfo?.role === 'teacher';

  return (
    <div className="w-full">
      {/* Profile Section */}
      <div className="flex flex-col">
        {/* Edit Button Bar - Left Aligned */}
        <div className="flex items-center justify-start mb-[10px]">
          <button
            type="button"
            onClick={() => navigate("/edit-profile")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 text-white"
            >
              <path
                d="M10.1231 3.90909L7.77394 1.44573C7.23416 0.879704 6.32721 0.848608 5.7482 1.37627L1.45595 5.28789C0.876942 5.81556 0.845133 6.70216 1.3849 7.26819L3.90909 9.91514M10.1231 3.90909L16.6151 10.7169C16.8849 10.9998 17.0231 11.3792 16.9968 11.7651L16.7302 15.6917C16.6801 16.4299 16.0515 17.0028 15.2946 17L11.269 16.985C10.8733 16.9836 10.4959 16.8223 10.226 16.5393L3.90909 9.91514M10.1231 3.90909L3.90909 9.91514"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>Edit profile</span>
          </button>
        </div>

        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
          {/* Profile Image & Upload */}
          <div
            className="w-72 h-72 sm:w-80 sm:h-80 aspect-square rounded-3xl overflow-hidden bg-white relative cursor-pointer group shrink-0"
            onClick={handleImageClick}
          >
            {profileImage && profileImage !== "https://i.ibb.co/tpV3m2GW/no-image.png" && !imageError ? (
              <img
                src={profileImage}
                alt="Profile"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white p-10 sm:p-12">
                <UserAvatarPlaceholder className="w-full h-full text-[#1A2B49] group-hover:text-[#1A2B49]/80 transition-colors" />
              </div>
            )}

            {/* Edit Icon Overlay */}
            <div className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors flex items-center justify-center">
              <Edit size={16} className="text-white" />
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

          {/* Info Column (Centered with Image) */}
          <div className="flex-1 min-w-0 flex flex-col items-start justify-center text-left">
            {/* Name */}
            <h1 className="text-[20px] sm:text-[24px] font-normal text-black tracking-tight leading-snug">
              {userInfo?.name || userInfo?.email}
            </h1>

            {/* Description / Bio */}
            {userInfo?.bio && (
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-2xl mt-1.5 whitespace-pre-line">
                {userInfo.bio}
              </p>
            )}

            {/* Stats Pills (Verified Seller, Rating) */}
            <div className="flex flex-col items-start gap-[10px] mt-[10px]">
              {/* Verified Seller Pill */}
              {isSeller && (
                <span className="inline-flex items-center gap-2 bg-[#E9EAEE] text-black px-3.5 py-2 rounded-full text-xs sm:text-sm font-normal shadow-none shrink-0">
                  <svg width="15" height="15" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 overflow-visible text-black">
                    <path d="M12 23C14.4477 23 16.3465 22.8672 17.8271 22.5381C19.2964 22.2115 20.2925 21.7056 20.999 20.999C21.7056 20.2925 22.2115 19.2964 22.5381 17.8271C22.8672 16.3465 23 14.4477 23 12C23 9.55232 22.8672 7.65353 22.5381 6.17285C22.2115 4.70364 21.7056 3.70752 20.999 3.00098C20.2925 2.29443 19.2964 1.78846 17.8271 1.46191C16.3465 1.13284 14.4477 1 12 1C9.55232 1 7.65353 1.13284 6.17285 1.46191C4.70364 1.78846 3.70752 2.29443 3.00098 3.00098C2.29443 3.70752 1.78846 4.70364 1.46191 6.17285C1.13284 7.65353 1 9.55232 1 12C1 14.4477 1.13284 16.3465 1.46191 17.8271C1.78846 19.2964 2.29443 20.2925 3.00098 20.999C3.70752 21.7056 4.70364 22.2115 6.17285 22.5381C7.65353 22.8672 9.55232 23 12 23Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 9L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Verified seller</span>
                </span>
              )}

              {/* Rating / Review Thing (Outline Star) */}
              <span className="inline-flex items-center gap-2 bg-[#E9EAEE] text-black px-3.5 py-2 rounded-full text-xs sm:text-sm font-normal shadow-none shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-black">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{userInfo?.averageRating === 0 || !userInfo?.averageRating ? "100% Rating" : `${userInfo.averageRating}% Rating`}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
