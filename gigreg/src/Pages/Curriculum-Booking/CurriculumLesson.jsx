import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Info,
  Link2,
  MapPin,
  Timer,
  X,
} from "lucide-react";
import { IoMdLink } from "react-icons/io";
import { FaRegStar } from "react-icons/fa";
import MainLayout from "../../components/MainLayout";
import { Calendar } from "./component/Calender";
import Reviews from "./component/Reviews";
import ImageGallery from "./component/ImageGallery";
import { FiDollarSign } from "react-icons/fi";
import { FiClock } from "react-icons/fi";
import { GrLocation } from "react-icons/gr";
import { ArrowLeft, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
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
import {
  getTeacherAvailability,
  getTeacherUnAvailability,
  getLessonAvailability,
  clearAvailabilityData,
} from "../../redux/reducers/AvailabilityReducer";
import TeacherCard from "./component/TeacherCard";
import { getUserById } from "../../redux/reducers/AuthReducer";
import ProfessionalLoader from "../../components/ProfessionalLoader";
import { FaCircleCheck } from "react-icons/fa6";

export default function CurriculumLesson() {
  const { lesson, currilesson } = useSelector((state) => state.lesson);
  const { favorites, lessonReviews } = useSelector((state) => state.favorite);
  const { userbyid } = useSelector((state) => state.auth);
  const {
    weeklyAvailability,
    dateAvailability,
    lessonWeeklyAvailability,
    lessonDateAvailability,
    hasAvailability,
    timeZone,
    loading,
    error,
    successMessage,
    dateUnAvailability,
  } = useSelector((state) => state.availability);
  const dispatch = useDispatch();
  const { id } = useParams();
  const [date, setDate] = useState(new Date(2024, 1, 21));
  const [time, setTime] = useState("5:00 PM");

  // Clear availability data when component mounts or lesson ID changes
  useEffect(() => {
    dispatch(clearAvailabilityData());
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(getLessonById(id));
    dispatch(getCurriLessonById(id));
    dispatch(getLessonRating(id));
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(getUserFavorites());
  }, [dispatch]);

  const teacherId = lesson?.createdBy?._id;

  // Fetch all availability data when lesson and teacherId are loaded
  useEffect(() => {
    // IMPORTANT: Only fetch availability if the loaded lesson matches the URL ID
    if (lesson && lesson._id === id && teacherId) {
      // First fetch teacher unavailability
      dispatch(getTeacherUnAvailability({ id: teacherId }));
      dispatch(getUserById(teacherId));

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
    <MainLayout width={"4440px"} contentClassName="lg:overflow-x-visible">
      {/* {loading || !lesson ? (
        <ProfessionalLoader message="Loading lesson..." />
      ) : ( */}
        <div className="min-h-screen flex flex-col items-center pb-8">
          <div className="w-full">
            <div className="flex md:hidden items-center justify-between w-full mx-auto mb-3 pt-3">
              {/* Left Button */}
              <Link
                to={`/`}
                className=" flex items-center justify-center rounded-full  hover:bg-gray-100 transition"
              >
                <ArrowLeft size={20} />
              </Link>

              {/* Right Buttons */}
              <div className="flex items-center gap-5">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success("URL copied to clipboard!");
                    } catch (err) {
                      toast.error("Failed to copy: ", err);
                    }
                  }}
                  className=" flex items-center justify-center rounded-full  hover:bg-gray-100 transition"
                >
                  <Link2 size={20} />
                </button>
                <button
                  onClick={() => handleSave(lesson?._id)}
                  className=" flex items-center justify-center rounded-full  hover:bg-gray-100 transition"
                >
                  <Heart
                    size={20}
                    className={`${isBookmarked ? "fill-red-500 text-red-500" : ""}`}
                  />
                </button>
              </div>
            </div>

            
                  <div className="w-full lg:max-w-7xl mx-auto md:px-8 hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8">
                    <nav className="text-sm flex items-center gap-2">
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
                            await navigator.clipboard.writeText(
                              window.location.href,
                            );
                            toast.success("URL copied to clipboard!");
                          } catch (err) {
                            toast.error("Failed to copy: ", err);
                          }
                        }}
                        className="border border-[#ddd] px-5 py-2 font-medium rounded-[10px] text-sm flex items-center justify-center gap-3 w-full md:w-auto cursor-pointer"
                      >
                        Copy link <IoMdLink size={20} />
                      </button>
                      <button
                        onClick={() => handleSave(lesson?._id)}
                        className="border border-[#ddd] px-5 py-2 font-medium rounded-[10px] text-sm flex items-center justify-center gap-3 w-full md:w-auto cursor-pointer"
                      >
                        Save{" "}
                        <Heart
                          size={20}
                          className={`${isBookmarked ? "fill-red-500 text-red-500" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
            <div className="w-full lg:max-w-7xl mx-auto md:px-8">
              <h1 className="text-lg md:text-2xl font-semibold text-left w-full md:w-auto mt-7.5">
                {lesson?.title}
              </h1>
              <div className="flex flex-col gap-2 max-w-fit mt-5">
                <div className="flex flex-col md:flex-row flex-wrap md:items-center gap-4 md:gap-5 text-sm text-black">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span>{lesson?.isOnline ? "Online" : lesson?.location || "In Person"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer size={18} />
                    <span>{lesson?.duration || "30mins"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaRegStar size={18} />
                    <span>{lesson?.averageRating === 0 ? 100 : lesson?.averageRating || 100}%</span>
                  </div>
                </div>
                {currilesson?.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info size={16} />
                    <span>
                      This lesson is also part of a curriculum: {currilesson.map((item, index) => (
                        <Link to={`/curriculum-booking/${item?.curriculumInfo?._id}`} key={index} className="text-primary font-medium">
                          {item?.curriculumInfo?.title}{index < currilesson.length - 1 ? ", " : ""}
                        </Link>
                      ))}
                    </span>
                  </div>
                )}
              </div>
              {/* Swiper Slider */}
              <div className="grid grid-cols-1 lg:grid-cols-6 3xl:grid-cols-6 md:gap-[30px] mt-3 md:mt-7.5 h-fit">
                <div className=" lg:col-span-4">
                  {/* Content Section */}
                  <div className="space-y-4 max-w-7xl">
                    <ImageGallery images={lesson?.images || []} />
                    {/* Description Section */}
                    <div className="rounded-3xl h-fit mt-5">
                      <p className="text-black leading-relaxed text-sm md:text-sm">
                        {lesson?.description
                          ? lesson.description
                              .split(/\r?\n/)
                              .map((line, idx) => (
                                <React.Fragment key={idx}>
                                  {line}
                                  <br />
                                </React.Fragment>
                              ))
                          : "No description available."}
                      </p>
                    </div>
                    <div className="mt-8 max-w-[720px]">
                      {/* Description Section */}
                      <div className=" rounded-3xl  h-fit">
                        <h2 className="text-lg md:text-xl font-semibold mb-3">
                          How it works
                        </h2>
                        <div className="text-black leading-relaxed text-sm space-y-4">
                          <p className="flex items-center gap-2 ">
                            <span>
                              <FaCircleCheck className="text-primary" />
                            </span>
                            Book your lesson and you’ll be instantly connected
                            with your teacher.{" "}
                          </p>
                          <p className="flex items-center gap-2 ">
                            <span>
                              <FaCircleCheck className="text-primary" />
                            </span>
                            Your teacher will let you know where the lesson will
                            take place and share a meeting link with you.
                          </p>
                          <p className="flex items-center gap-2 ">
                            <span>
                              <FaCircleCheck className="text-primary" />
                            </span>
                            You can message them anytime, ask questions, and get
                            support. Your learning journey starts the moment you
                            book.
                          </p>
                        </div>
                      </div>
                    </div>

                    <TeacherCard
                      teacher={lesson?.createdBy || userbyid}
                      name={lesson?.createdBy?.name || userbyid?.name}
                      averageRating={
                        lesson?.createdBy?.averageRating ||
                        userbyid?.averageRating
                      }
                      hideLesson={
                        lesson?.createdBy?.hideLesson || userbyid?.hideLesson
                      }
                      classHosted={
                        lesson?.createdBy?.classHosted || userbyid?.classHosted
                      }
                      classesAttended={
                        lesson?.createdBy?.classesAttended ||
                        userbyid?.classesAttended
                      }
                      classesHosted={
                        lesson?.createdBy?.classesHosted ||
                        userbyid?.classesHosted
                      }
                      bio={lesson?.createdBy?.bio || userbyid?.bio}
                      image={lesson?.createdBy?.image || userbyid?.image}
                    />
                  </div>
                </div>

                {/* Calendar Section */}
                <div className="lg:col-span-2 3xl:col-span-2 mt-4 md:mt-0 lg:sticky lg:top-6 lg:self-start lg:h-fit">
                  <Calendar
                    id={id}
                    myid={id}
                    selectedDate={date}
                    onSelect={setDate}
                    selectedTime={time}
                    onSelectTime={setTime}
                    weeklyAvailability={
                      lesson?.calenderId
                        ? lessonWeeklyAvailability
                        : weeklyAvailability
                    }
                    dateAvailability={
                      lesson?.calenderId
                        ? lessonDateAvailability
                        : dateAvailability
                    }
                    dateUnAvailability={dateUnAvailability}
                    teacherTimezone={timeZone} // Make sure timeZone is coming from your API
                    type="lesson"
                    teacherData={lesson?.createdBy}
                    location={lesson?.isOnline ? "Online" : lesson?.location}
                    duration={lesson?.duration}
                    price={lesson?.price}
                    priceCurrency={lesson?.currency || "USD"}
                    capacity={lesson?.usecapacity}
                    discount={lesson?.discount}
                  />
                </div>
              </div>
            </div>
          </div>
          {lessonReviews && lessonReviews.length > 0 && (
            <Reviews lessonReviews={lessonReviews} />
          )}
        </div>
      {/* )} */}
    </MainLayout>
  );
}
