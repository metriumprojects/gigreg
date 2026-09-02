import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { IoMdLink } from "react-icons/io";
import MainLayout from "../../components/MainLayout";
import { Calendar } from "./component/Calender";
import Reviews from "./component/Reviews";
import ImageGallery from "./component/ImageGallery";
import { FiDollarSign } from "react-icons/fi";
import { FiClock } from "react-icons/fi";
import { GrLocation } from "react-icons/gr";
import { ArrowLeft, Upload } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AllLesson from "./component/AllLesson";
import { useDispatch, useSelector } from "react-redux";
import {
  getCurriLessonById,
  getLessonById,
} from "../../redux/reducers/LessonReducer";
import { toast } from "react-toastify";
import {
  getLessonRating,
  getUserFavorites,
  toggleFavorite,
} from "../../redux/reducers/FavoriteReducer";
import { getTeacherAvailability, getTeacherUnAvailability, getLessonAvailability, getCurriculumAvailability } from "../../redux/reducers/AvailabilityReducer";
import { ManageCal } from "./component/ManageCal";
import TeacherCard from "./component/TeacherCard";
import { getUserById } from "../../redux/reducers/AuthReducer";

export default function ManageLesson() {
  const { lesson, currilesson } = useSelector((state) => state.lesson);
  const { userbyid } = useSelector((state) => state.auth);
  const { favorites, lessonReviews } = useSelector((state) => state.favorite);
    const {
    weeklyAvailability,
    dateAvailability,
    lessonWeeklyAvailability,
    lessonDateAvailability,
    curriculumWeeklyAvailability,
    curriculumDateAvailability,
    hasAvailability,
    timeZone,
    loading,
    error,
    successMessage,
    dateUnAvailability,
  } = useSelector((state) => state.availability);
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(new Date(2024, 1, 21));
  const [time, setTime] = useState("5:00 PM");
  const [curriculum, setCurriculum] = useState(null);
  const [curriculumCalendarId, setCurriculumCalendarId] = useState(null);

  // Get curriculum ID and group flag from URL params
  const curriculumId = searchParams.get("curiid");
  const isGroupLesson = searchParams.get("group") === "true";

  useEffect(() => {
    dispatch(getLessonById(id));
    dispatch(getCurriLessonById(id));
    dispatch(getLessonRating(id));
    dispatch(getUserFavorites());
  }, [dispatch, id]);

  const teacherId = lesson?.createdBy?._id;

  // Fetch all availability data when lesson and teacherId are loaded
  useEffect(() => {
    // IMPORTANT: Only fetch availability if the loaded lesson matches the URL ID
    if (lesson && lesson._id === id && teacherId) {
      // First fetch teacher unavailability
      dispatch(getTeacherUnAvailability({ id: teacherId }));

      // Then fetch availability based on calendar type
      if (lesson.calender === true) {
        dispatch(getTeacherAvailability({ id: teacherId }));
      } else if (lesson.calenderId) {
        dispatch(getLessonAvailability({ id: lesson.calenderId }));
      }
    }
    // Dependencies are crucial here to prevent re-running with stale data.
  }, [dispatch, lesson, id, teacherId]);

  const lessonFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.lesson)
    : favorites?.lessons || [];

  const isBookmarked = lessonFavorites?.some((fav) => fav?.lesson?._id === id);

  const handleSave = (courseId) => {
    dispatch(toggleFavorite({ id: courseId, type: "lesson" })).then((res) => {
      if (res.payload.status) {
        toast.success(res.payload.message || "Saved to favorites");
        dispatch(getUserFavorites());
      } else {
        toast.info(res.payload.message);
      }
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  return (
    <MainLayout>
      <div className="w-full min-h-screen flex flex-col items-center py-3 md:py-8">
        <div className="w-full">
          <div className="flex md:hidden items-center justify-between w-full mx-auto mb-4  py-3">
            {/* Left Button */}
            <Link
              to={`/`}
              className="w-10 h-10 flex items-center justify-center rounded-full border-2 text-primary border-primary hover:bg-gray-100 transition"
            >
              <ArrowLeft size={18} />
            </Link>

            {/* Right Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("URL copied to clipboard!");
                  } catch (err) {
                    toast.error("Failed to copy: ", err);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full text-primary border-2 border-primary hover:bg-gray-100 transition"
              >
                <Upload size={18} />
              </button>
              <button
                onClick={() => handleSave(lesson?._id)}
                className="w-10 h-10 flex items-center justify-center rounded-full border-2 text-primary border-primary hover:bg-gray-100 transition"
              >
                <Heart
                  size={18}
                  className={`${isBookmarked ? "fill-red-500" : ""}`}
                />
              </button>
            </div>
          </div>
          {/* Header */}

           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
            {/* Title */}

            <nav className=" text-sm md:text-base flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                Home <ChevronRight size={20} />
              </Link>{" "}
              <Link
                to={`/?category=${lesson?.category}`}
                className="flex items-center gap-2"
              >
                {" "}
                {lesson?.category}
              </Link>
            </nav>

            {/* Buttons */}
            <div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("URL copied to clipboard!");
                  } catch (err) {
                    toast.error("Failed to copy: ", err);
                  }
                }}
                className="border border-[#ddd] px-5 py-2 font-medium rounded-[10px] text-base flex items-center justify-center gap-3 w-full md:w-auto cursor-pointer"
              >
                Copy link <IoMdLink size={20} />
              </button>
              <button
                onClick={() => handleSave(lesson?._id)}
                className="border border-[#ddd] px-5 py-2 font-medium rounded-[10px] text-base flex items-center justify-center gap-3 w-full md:w-auto cursor-pointer"
              >
                Save{" "}
                <Heart
                  size={20}
                  className={`${
                    isBookmarked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </button>
            </div>
          </div>

                 <h1 className="text-lg md:text-3xl font-semibold text-left w-full md:w-auto mb-4">
            {lesson?.title}
          </h1>

          {/* Swiper Slider */}
          <div className="grid grid-cols-1 lg:grid-cols-7  md:gap-6 mt-2">
     <div className=" lg:col-span-5">
              <ImageGallery images={lesson?.images || []} />

              {/* Content Section */}
              <div className="grid grid-cols-1 lg:grid-cols-6  md:gap-10 mt-8">
                {/* Description Section */}
                <div className="lg:col-span-6 bg-[#F5F5F5] p-6 rounded-3xl  h-fit">
                  <h2 className="text-lg md:text-xl font-semibold mb-3">
                    Description
                  </h2>
                  <div className="text-gray-700 leading-relaxed text-sm md:text-base">
                    {lesson?.description ? (
                      // If description contains HTML or needs to be rendered as-is
                      <div
                        dangerouslySetInnerHTML={{ __html: lesson.description }}
                      />
                    ) : (
                      // If description is plain text
                      <p>{lesson?.description || "No description available"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Section */}
            <div className="lg:col-span-2 mt-6 lg:mt-0">
       <ManageCal
              id={id}
              selectedDate={date}
              onSelect={setDate}
              selectedTime={time}
              onSelectTime={setTime}
              weeklyAvailability={
                    lesson?.calenderId
                    ? lessonWeeklyAvailability
                    : weeklyAvailability
              }
              dateAvailability={lesson?.calenderId ? lessonDateAvailability : dateAvailability
              }
              dateUnAvailability={dateUnAvailability}
              teacherTimezone={timeZone}
              type={curriculumId ? "curri" : "lesson"}
              price={lesson?.price}
              myid={id}
              teacherData={lesson?.createdBy}
              location={lesson?.isOnline === true ? "Online" : lesson?.location}
              duration={lesson?.duration}
              capacity={lesson?.capacity}
              isGroupLesson={isGroupLesson}
            />
            <TeacherCard 
              teacher={lesson?.createdBy || userbyid}
              name={lesson?.createdBy?.name || userbyid?.name}
              averageRating={lesson?.createdBy?.averageRating || userbyid?.averageRating}
              hideLesson={lesson?.createdBy?.hideLesson || userbyid?.hideLesson}
              classHosted={lesson?.createdBy?.classHosted || userbyid?.classHosted}
              classesAttended={lesson?.createdBy?.classesAttended || userbyid?.classesAttended}
              classesHosted={lesson?.createdBy?.classesHosted || userbyid?.classesHosted}
              bio={lesson?.createdBy?.bio || userbyid?.bio}
              image={lesson?.createdBy?.image || userbyid?.image}
            />
            </div>
          </div>

        </div>
        <Reviews lessonReviews={lessonReviews} />
      </div>
    </MainLayout>
  );
}
