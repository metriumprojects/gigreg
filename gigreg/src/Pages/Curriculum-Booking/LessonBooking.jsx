import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  Copy,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
  Timer,
  Clock,
  MapPin,
  Info,
  Link2,
} from "lucide-react";
import { IoMdLink } from "react-icons/io";
import MainLayout from "../../components/MainLayout";
import ProfessionalLoader from "../../components/ProfessionalLoader";
import { Calendar } from "./component/Calender";
import UnitsSection from "./component/UnitsSection";
import Reviews from "./component/Reviews";
import ImageGallery from "./component/ImageGallery";
import { FiDollarSign } from "react-icons/fi";
import { FaRegStar } from "react-icons/fa";
import { FiClock } from "react-icons/fi";
import { GrLocation } from "react-icons/gr";
import { ArrowLeft, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getLessonById, getTeacherLessonsById } from "../../redux/reducers/LessonReducer";
import {
  getLessonRating,
  getUserFavorites,
  toggleFavorite,
} from "../../redux/reducers/FavoriteReducer";
import { toast } from "react-toastify";
import {
  getTeacherAvailability,
  getTeacherUnAvailability,
  getLessonAvailability,
  clearAvailabilityData,
} from "../../redux/reducers/AvailabilityReducer";
import TeacherCard from "./component/TeacherCard";
import { getUserById } from "../../redux/reducers/AuthReducer";
import { FaCircleCheck } from "react-icons/fa6";


export default function LessonBooking() {
  const { lesson, Teacheridlessons } = useSelector((state) => state.lesson);
  const { userbyid } = useSelector((state) => state.auth);
  const { favorites, lessonReviews } = useSelector((state) => state.favorite);
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

    dispatch(getTeacherLessonsById({ id: teacherId, page: 1, limit: 100 }));

      // Then fetch availability based on calendar type
      if (lesson.calender === true) {
        dispatch(getTeacherAvailability({ id: teacherId }));
      } else if (lesson.calenderId) {
        dispatch(getLessonAvailability({ id: lesson.calenderId }));
      }
    }
    // Dependencies are crucial here to prevent re-running with stale data.
  }, [dispatch, lesson, id, teacherId]);


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
  }, []);

  const lessonFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.lesson)
    : favorites?.lessons || [];

  const isBookmarked = lessonFavorites?.some((fav) => fav?.lesson?._id === id);
  const hasOnline = Boolean(lesson?.isOnline);
  const hasInPerson = Boolean(lesson?.location);
  const locationLabel = hasOnline && hasInPerson
    ? "Online and in person"
    : hasOnline
    ? "Online"
    : lesson?.location || "In Person";
  const calendarLocation = hasInPerson ? lesson?.location : "Online";

  return (
    <MainLayout width={"4440px"} contentClassName="lg:overflow-x-visible">
      {/* {loading || !lesson ? (
        <ProfessionalLoader message="Loading lesson..." />
      ) : ( */}
        <div className=" min-h-screen flex flex-col items-center pb-8">
          <div className="w-full">
           <div className="flex md:hidden items-center justify-between w-full mx-auto mb-3  pt-3">
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
              {/* Title */}

              <nav className=" text-sm flex items-center gap-2">
                <Link to="/" className="flex items-center gap-2">
                  Home <ChevronRight size={20} />
                </Link>{" "}
                <Link
                  to={{ pathname: "/", search: `?category=${lesson?.category}` }}
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
                    className={`${
                      isBookmarked ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            
                <div className="w-full lg:max-w-7xl mx-auto md:px-8">
                  
                  

            <h1 className="text-lg md:text-2xl font-semibold text-left w-full md:w-auto mt-7.5">
              {lesson?.title}
            </h1>
                <div className=" flex flex-col gap-2 max-w-fit mt-5">
                  {/* Top Row */}
                  <div className="flex flex-col md:flex-row flex-wrap md:items-center gap-4 md:gap-5 text-sm text-black">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} />
                      <span>{locationLabel}  {lesson?.location ? `(${lesson?.location})` : ""} </span>
                    </div>

                    {/* <div className="flex items-center gap-2">
                      <Clock size={18} />
                      <span>{timeZone}</span>
                    </div> */}

                    <div className="flex items-center gap-2">
                      <Timer size={18} />
                      <span>{lesson?.duration || "30mins"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FaRegStar size={18} />
                      <span>{lesson?.averageRating === 0 ? 100 : lesson?.averageRating}%</span>
                    </div>
                  </div>
                </div>
                

            {/* Swiper Slider */}
            <div className="grid grid-cols-1 lg:grid-cols-6 3xl:grid-cols-6 md:gap-[30px] mt-3 md:mt-7.5 h-fit">
              
              <div className=" lg:col-span-4">
              



                {/* Content Section */}
                <div className="space-y-4 max-w-7xl">
                  
                <ImageGallery images={lesson?.images || []} />
            
                  {/* Description Section */}
                  <div className=" rounded-3xl h-fit mt-5">
                    <div className="text-black leading-relaxed text-sm">
                      {lesson?.description ? (
                        // If description contains HTML or needs to be rendered as-is
                        <div
                          dangerouslySetInnerHTML={{
                            __html: lesson.description,
                          }}
                        />
                      ) : (
                        // If description is plain text
                        <p>
                          {lesson?.description || "No description available"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className=" mt-8 max-w-[720px]">
                  {/* Description Section */}
                  <div className=" rounded-3xl  h-fit">
                    <h2 className="text-lg md:text-xl font-semibold mb-4">
                      How it works
                    </h2>
                    <div className="text-black leading-relaxed text-sm space-y-4">
                      <p className="flex items-center gap-2 ">
                        <span><FaCircleCheck className="text-primary" /></span>
                        Book your lesson and you’ll be instantly connected with
                        your teacher.{" "}
                      </p>
                        <p className="flex items-center gap-2 ">
                        <span><FaCircleCheck className="text-primary" /></span>
                        Your teacher will let you know where the lesson will take place and share a meeting link with you.
                      </p>
                        <p className="flex items-center gap-2 ">
                        <span><FaCircleCheck className="text-primary" /></span>
                        You can message them anytime, ask questions, and get
                        support. Your learning journey starts the moment you
                        book.
                      </p>
                    </div>
                  </div>
                </div>
                
                <TeacherCard 
                teacher={lesson?.createdBy} 
                name={lesson?.createdBy?.name} 
                averageRating={lesson?.createdBy?.averageRating} 
                hideLesson={lesson?.createdBy?.hideLesson} 
                classHosted={lesson?.createdBy?.classHosted} 
                classesAttended={lesson?.createdBy?.classesAttended}
                classesHosted={lesson?.createdBy?.classesHosted}
                bio={lesson?.createdBy?.bio}
                image={lesson?.createdBy?.image}
                lession={Teacheridlessons?.length}
              />
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
                  teacherTimezone={timeZone}
                  type="lesson"
                  teacherData={lesson?.createdBy}
                  location={calendarLocation}
                  duration={lesson?.duration}
                  price={lesson?.price}
                  priceCurrency={lesson?.currency || "USD"}
                  capacity={lesson?.usecapacity}
                  discount={lesson?.discount}
                />
              </div>
            </div>
          </div>
          {/* <UnitsSection /> */}
          {lessonReviews && lessonReviews.length > 0 && (
            <Reviews lessonReviews={lessonReviews} />
          )}
        </div>
        </div>
      {/* )} */}
    </MainLayout>
  );
}
