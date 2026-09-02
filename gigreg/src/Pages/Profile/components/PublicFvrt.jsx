import React, { useEffect, useState } from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { useDispatch, useSelector } from "react-redux";
import { getFavrtById, getUserFavorites, toggleFavorite } from "../../../redux/reducers/FavoriteReducer";
import Card from "../../Home/Components/Card";
import { Link } from "react-router-dom";
import { Heart, Star, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { GrLocation } from "react-icons/gr";

export default function PublicFvrt({ id }) {
  const dispatch = useDispatch();
  const { fvrtid } = useSelector((state) => state.favorite);
  const [limit, setLimit] = useState(6);
  const [openPropose, setOpenPropose] = useState(null);

  useEffect(() => {
    dispatch(getFavrtById(id));
  }, [dispatch]);

  const handleSave = (itemId, itemType) => {
    dispatch(toggleFavorite({ id: itemId, type: itemType })).then((res) => {
      if (res.payload.status) {
        toast.success(res.payload.message);
        dispatch(getFavrtById(id));
      } else {
        toast.info(res.payload.message);
      }
    });
  };

  // Safe array check and conversion
  const favoritesArray = React.useMemo(() => {
    if (!fvrtid) return [];
    if (Array.isArray(fvrtid)) return fvrtid;
    
    // If fvrtid is an object, try to extract an array from it
    if (typeof fvrtid === 'object') {
      if (fvrtid.data && Array.isArray(fvrtid.data)) return fvrtid.data;
      if (fvrtid.fvrtid && Array.isArray(fvrtid.fvrtid)) return fvrtid.fvrtid;
      if (fvrtid.items && Array.isArray(fvrtid.items)) return fvrtid.items;
      
      // If it's an object with numeric keys, convert to array
      if (Object.keys(fvrtid).every(key => !isNaN(key))) {
        return Object.values(fvrtid);
      }
    }
    return [];
  }, [fvrtid]);

  const renderCurriculumCard = (curriculumFavorite, index) => {
    const curriculum = curriculumFavorite.curriculum;
    
    return (
      <div key={curriculumFavorite._id} className="overflow-hidden flex flex-col gap-5">
        {/* Image Container */}
        <div className="relative overflow-hidden h-[335px]">
          <Link to={`/curriculum-booking/${curriculum._id}`}>
            <img
              src={curriculum.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
              alt={curriculum.title}
              className="w-full h-full object-cover rounded-[20px]"
            />

            {/* Rating */}
            {curriculum.averageRating > 0 && (
              <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-md text-base font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                {curriculum.averageRating}/10
              </div>
            )}

            {/* Heart Icon */}
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSave(curriculum._id, "curriculum");
              }}
              className="absolute top-3 right-3 rounded-full p-2 transition-all cursor-pointer bg-[#00000028]"
            >
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </button>
          </Link>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5">
          {/* User Info */}
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/user-profile/${curriculum?.createdBy?._id}`}
                className="w-8 h-8 bg-gray-300 rounded-md overflow-hidden"
              >
                <img
                  src={
                    curriculum?.createdBy?.image?.url ||
                    "https://i.ibb.co/tpV3m2GW/no-image.png"
                  }
                  alt={curriculum.createdBy?.name}
                  className="w-full h-[40px] object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">
                  {curriculum?.createdBy?.name}
                </p>
              </div>
            </div>

            {curriculum?.createdBy?.averageRating > 0 ? (
              <p className="text-base text-gray-500">
                <span className="text-gray-900">
                  {curriculum?.createdBy?.averageRating}/10
                </span>{" "}
                ({curriculum?.createdBy?.totalRatings})
              </p>
            ) : (
              <p className="text-base text-gray-400">No Reviews Yet</p>
            )}
          </div>

          <p className="text-base text-gray-600 line-clamp-3">
            {curriculum.title}
          </p>

          {/* Curriculum Info */}
          <p className="text-base text-gray-700 font-medium">
            {curriculum.totalLesson} lessons for ${curriculum.price}
          </p>

          {/* Buttons */}
          <div className="space-y-2">
            <Link
              to={`/curriculum-booking/${curriculum._id}`}
              className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2"
            >
             Curriculum
              <BiSolidZap className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderLessonCard = (lessonFavorite, index) => {
    const lesson = lessonFavorite.lesson;
    
    return (
      <div key={lessonFavorite._id} className="overflow-hidden flex flex-col gap-5">
        {/* Image Container */}
        <div className="relative overflow-hidden h-[335px]">
          <Link
            to={
              lesson.isIndependent === true && lesson.curriculums?.length > 0
                ? `/curriculum-lesson/${lesson._id}`
                : `/lesson-booking/${lesson._id}`
            }
          >
            <img
              src={lesson.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
              alt={lesson.title}
              className="w-full h-full object-cover rounded-[20px]"
            />

            {/* Rating */}
            {lesson.averageRating > 0 && (
              <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-md text-base font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                {lesson.averageRating}/10
              </div>
            )}

            {/* Heart Icon */}
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSave(lesson._id, "lesson");
              }}
              className="absolute top-3 right-3 rounded-full p-2 transition-all cursor-pointer bg-[#00000028]"
            >
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </button>
          </Link>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5">
          {/* User Info */}
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <Link
                to={`/user-profile/${lesson?.createdBy?._id}`}
                className="w-8 h-8 bg-gray-300 rounded-md overflow-hidden"
              >
                <img
                  src={
                    lesson?.createdBy?.image?.url ||
                    "https://i.ibb.co/tpV3m2GW/no-image.png"
                  }
                  alt={lesson.createdBy?.name}
                  className="w-full h-[40px] object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">
                  {lesson?.createdBy?.name}
                </p>
              </div>
            </div>

            {lesson?.createdBy?.averageRating > 0 ? (
              <p className="text-base text-gray-500">
                <span className="text-gray-900">
                  {lesson?.createdBy?.averageRating}/10
                </span>{" "}
                ({lesson?.createdBy?.totalRatings})
              </p>
            ) : (
              <p className="text-base text-gray-400">No Reviews Yet</p>
            )}
          </div>

          <p className="text-base text-gray-600 line-clamp-3">
            {lesson.title}
          </p>

          {/* Lesson Info */}
          <p className="text-base text-gray-700 font-medium">
            {lesson.duration} lesson for ${lesson.price}
          </p>

          {/* Buttons */}
          <div className="space-y-2">
            {lesson.isIndependent === true && lesson.curriculums?.length > 0 && (
              <button className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2">
                <img
                  src="https://i.ibb.co/JJcS4sx/badge-poac.png"
                  className="h-[20px]"
                  alt="badge"
                />
                Part of a curriculum
              </button>
            )}

            <Link
              to={
                lesson.isIndependent === true && lesson.curriculums?.length > 0
                  ? `/curriculum-lesson/${lesson._id}`
                  : `/lesson-booking/${lesson._id}`
              }
              className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2"
            >
              Book
              <BiSolidZap className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderProposeCard = (proposeFavorite, index) => {
    const propose = proposeFavorite.propose;
    const isFavorite = true; // Since it's in favorites, it's always favorite

    return (
      <div
        key={proposeFavorite._id}
        className="bg-[#F5F5F5] rounded-xl p-5 md:p-6 flex flex-col space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded object-cover bg-gray-300">
              <img
                src={
                  propose?.user?.image?.url ||
                  "https://i.ibb.co/tpV3m2GW/no-image.png"
                }
                className="h-full w-full object-cover"
                alt="profile-img"
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {propose?.user?.name || "unknown"}
              </h3>
              {propose?.user?.averageRating > 0 ? (
                <p className="text-sm text-gray-500">
                  {propose?.user?.averageRating} ({propose?.user?.totalRatings})
                </p>
              ) : (
                <p className="text-sm text-gray-500">No ratings yet</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <p className="hidden md:block text-sm text-gray-500">
              Posted: {propose?.updatedAt?.slice(0, 10)}
            </p>
            <button 
              onClick={() => handleSave(propose?._id, "propose")} 
              className="border border-[#cbcbcb] px-5 py-2 text-gray-700 text-sm font-medium rounded-md flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {isFavorite ? "Saved" : "Save"} 
              <Heart 
                size={18} 
                className={isFavorite ? "fill-red-500 text-red-500" : ""}
              />
            </button>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900">{propose.title}</h2>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>✔ Category: {propose?.category}</span>
          <span>$ Budget: {propose?.price}</span>
          <span className="flex items-center gap-0.5">
            <GrLocation /> Location: {propose?.location || "Online"}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          {propose?.description
            ? propose.description.split(/\r?\n/).map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  <br />
                </React.Fragment>
              ))
            : "No description available."}
        </p>

        {/* Images */}
        {propose.images?.length > 0 && (
          <div className="flex gap-4 mt-2 flex-wrap">
            {propose.images.map((img, index) => (
              <img
                key={index}
                src={img.url}
                alt="preview"
                className="w-36 h-36 object-cover rounded-md"
              />
            ))}
          </div>
        )}

      </div>
    );
  };

  // Separate favorites by type for different sections
  const curriculumFavorites = favoritesArray.filter(fav => fav.type === "curriculum" && fav.curriculum);
  const lessonFavorites = favoritesArray.filter(fav => fav.type === "lesson" && fav.lesson);
  const proposeFavorites = favoritesArray.filter(fav => fav.type === "propose" && fav.propose);

  const hasFavorites = curriculumFavorites.length > 0 || lessonFavorites.length > 0 || proposeFavorites.length > 0;

  return (
    <div className="w-full mt-10">
      <div className="py-4">
        {!hasFavorites ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">No favorites yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Propose Favorites Section */}
            {proposeFavorites.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Proposals</h2>
                <div className="space-y-6">
                  {proposeFavorites.map((favorite, index) => 
                    renderProposeCard(favorite, index)
                  )}
                </div>
              </div>
            )}

            {/* Curriculum Favorites Section */}
            {curriculumFavorites.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Curriculums</h2>
                <div className="max-w-[2800px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {curriculumFavorites.map((favorite) => 
                    renderCurriculumCard(favorite)
                  )}
                </div>
              </div>
            )}

            {/* Lesson Favorites Section */}
            {lessonFavorites.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Lessons</h2>
                <div className="max-w-[2800px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {lessonFavorites.map((favorite) => 
                    renderLessonCard(favorite)
                  )}
                </div>
              </div>
            )}
            
            {/* Load More Button */}
          </div>
        )}
      </div>
    </div>
  );
}