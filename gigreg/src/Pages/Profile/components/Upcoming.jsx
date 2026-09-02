import React, { useEffect, useState } from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { IoCalendarOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { getcuriBooking, userUpcomingBookings } from "../../../redux/reducers/BookingReducer";
import { Calendar, Star, X, CheckCircle, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment-timezone";

export default function Upcoming() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, loading } = useSelector((state) => state.auth);
  const { userUpcomingdata, getcuriBookingdata, getcuridata } = useSelector((state) => state.book);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showLessonsPopup, setShowLessonsPopup] = useState(false);
  const [localTimeZone, setLocalTimeZone] = useState("");
  const [filteredScheduledLessons, setFilteredScheduledLessons] = useState([]);

  useEffect(() => {
    const now = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const scheduledAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLocalTimeZone(timezone);
    dispatch(userUpcomingBookings({ scheduledAt, timezone }));
  }, [dispatch]);

  useEffect(() => {
    if (selectedCurriculum?._id) {
      dispatch(getcuriBooking(selectedCurriculum?._id));
    }
  }, [selectedCurriculum?._id, dispatch]);

  // Filter lessons to show only scheduled ones when popup opens or data changes
  useEffect(() => {
    if (getcuriBookingdata && getcuriBookingdata.length > 0) {
      // Filter lessons that have status 'scheduled' AND have scheduledAt
      const scheduledLessons = getcuriBookingdata.filter(lesson => 
        lesson.status === 'scheduled' && lesson.scheduledAt
      );
      setFilteredScheduledLessons(scheduledLessons);
    } else {
      setFilteredScheduledLessons([]);
    }
  }, [getcuriBookingdata, showLessonsPopup]);

  // Function to convert UTC time to local system time
  const convertToLocalTime = (utcTimeString) => {
    if (!utcTimeString) return "Not scheduled";
    
    try {
      const localTime = moment.utc(utcTimeString).local();
      return localTime.format("MMM D, YYYY h:mm A");
    } catch (error) {
      console.error("Error converting time:", error);
      return "Invalid date";
    }
  };

  // Function to get relative time (e.g., "in 2 days", "tomorrow")
  const getRelativeTime = (utcTimeString) => {
    if (!utcTimeString) return "";
    
    try {
      return moment.utc(utcTimeString).local().fromNow();
    } catch (error) {
      return "";
    }
  };

  const handleManage = async (path, bookId, lessonId, type, isGroup = false) => {
    localStorage.setItem('bookId', bookId);
    localStorage.setItem('lId', lessonId);
    localStorage.setItem('type', type);
    const urlWithGroup = `${path}${path.includes('?') ? '&' : '?'}group=${isGroup}`;
    await navigate(urlWithGroup);
  };

  const handleCurriculumClick = (course) => {
    if (course.type === 'curriculum') {
      setSelectedCurriculum(course);
      setShowLessonsPopup(true);
    } else {
      handleManage(`/manage-lesson/${course.lesson?._id}`, course._id, course.lesson?._id, "lesson", course.group);
      
    }
  };

  // Function to get booking details based on type
  const getBookingDetails = (course) => {
    if (course.type === 'curriculum' && course.curriculum) {
      return {
        id: course.curriculum._id,
        title: course.curriculum.title,
        images: course.curriculum.images,
        averageRating: course.curriculum.averageRating,
        totalRatings: course.curriculum.totalRatings,
        type: 'curriculum'
      };
    } else if (course.type === 'lesson' && course.lesson) {
      return {
        id: course.lesson._id,
        title: course.lesson.title,
        images: course.lesson.images,
        averageRating: course.lesson.averageRating,
        totalRatings: course.lesson.totalRatings,
        type: 'lesson'
      };
    }
    return null;
  };

  // Function to get the appropriate user profile path
  const getUserProfilePath = (course, details) => {
    if (userInfo?._id === course?.teacher?._id) {
      return '/profile';
    } else if (details?.type === 'curriculum') {
      return `/user-profile/${course.curriculum?._id}`;
    } else {
      return `/user-profile/${course.lesson?._id}`;
    }
  };

  // Function to format date/time for display in popup
  const formatScheduleTime = (scheduledAt, timezone) => {
    if (!scheduledAt) return 'Not scheduled';
    
    return moment(scheduledAt)
      .tz(timezone || 'UTC')
      .format('MMM D, YYYY • hh:mm A');
  };

  // Function to count scheduled lessons
  const getScheduledLessonsCount = () => {
    return filteredScheduledLessons.length;
  };

  return (
    <div className="w-full p-3 md:p-10 rounded-xl mt-6">
      {userUpcomingdata?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userUpcomingdata?.map((course, index) => {
            const details = getBookingDetails(course);
            
            if (!details) return null;

            const displayTime = course?.rescheduledAt || course?.scheduledAt;
            const localTime = convertToLocalTime(displayTime);
            const relativeTime = getRelativeTime(displayTime);

            return (
              <div key={index} className="overflow-hidden flex flex-col gap-5">
                <div className="relative overflow-hidden h-[335px]">
                  <Link to={``}>
                    <img
                      src={details.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                      alt={details.title}
                      className="w-full h-full object-cover rounded-[20px]"
                    />
                  </Link>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <Link
                        to={getUserProfilePath(course, details)}
                        className="w-8 h-8 bg-gray-300 rounded-md overflow-hidden"
                      >
                        <img
                          src={
                            course?.teacher?.image?.url ||
                            "https://i.ibb.co/tpV3m2GW/no-image.png"
                          }
                          alt={course.teacher?.name}
                          className="w-full h-10 object-cover"
                        />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium truncate">
                          {course?.teacher?.name || "Unknown"}
                        </p>
                      </div>
                    </div>

                
                  </div>

                  <p className="text-base text-gray-600 line-clamp-3">
                    {details.title}
                  </p>

                  <p className="text-base text-gray-700 font-medium">
                    {details.type === 'curriculum' 
                      ? `Curriculum for ${course.amount}$`
                      : `${course.lesson?.duration} min lesson for ${course.amount}$`
                    }
                  </p>

                  <div className="space-y-2">
                    {details.type === 'lesson' && (
                      <button
                        className="w-full bg-primary text-white font-medium py-2.5 rounded-md flex justify-center items-center gap-2 text-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        <div className="flex flex-col items-center">
                          <span>{localTime}</span>
                          {relativeTime && (
                            <span className="text-xs opacity-80">({relativeTime})</span>
                          )}
                        </div>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleCurriculumClick(course)}
                      className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2"
                    >
                      {details.type === 'curriculum' ? 'Manage Curriculum' : 'Manage Lesson'}
                      <BiSolidZap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No Upcoming Bookings yet</p>
      )}

      {/* Lessons Popup for Curriculum - Only show scheduled lessons */}
      {showLessonsPopup && selectedCurriculum && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b">
              <div>
                <h2 className="text-xl font-semibold">
                  Scheduled Lessons in {selectedCurriculum.curriculum?.title}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Scheduled Lessons: {getScheduledLessonsCount()}
                </p>
              </div>
              <button
                onClick={() => setShowLessonsPopup(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lessons Slider - Only show scheduled lessons */}
            <div className="flex-1 p-6">
              {filteredScheduledLessons.length > 0 ? (
                <Swiper
                  spaceBetween={20}
                  slidesPerView={1}
                  breakpoints={{
                    640: { slidesPerView: 2 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                    1280: { slidesPerView: 4 }
                  }}
                  className="w-full"
                >
                  {filteredScheduledLessons.map((lessonItem, index) => (
                    <SwiperSlide key={lessonItem._id}>
                      <div className="h-full">
                        <div className="overflow-hidden flex flex-col gap-5 h-full rounded">
                          {/* Image Section */}
                          <div className="relative overflow-hidden h-[200px] rounded-[15px]">
                            <img
                              src={lessonItem.lId?.images?.[0]?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                              alt={lessonItem.lId?.title}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 bg-green-500">
                              <Clock className="w-3 h-3" />
                              Scheduled
                            </div>
                            
                            {/* Rating */}
                            {lessonItem.lId?.averageRating > 0 && (
                              <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1 bg-black/50">
                                ({lessonItem.lId.averageRating}%)
                              </div>
                            )}
                          </div>

                          {/* Content Section */}
                          <div className="flex flex-col gap-4 flex-1">
                            {/* Lesson Title */}
                            <div>
                              <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                                {lessonItem.position}. {lessonItem.lId?.title}
                              </h3>
                              {lessonItem.unitName && (
                                <p className="text-gray-600 text-sm">
                                  Unit: {lessonItem.unitName}
                                </p>
                              )}
                            </div>

                            {/* Schedule Time */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatScheduleTime(lessonItem.scheduledAt, selectedCurriculum.timezone)}
                              </span>
                            </div>

                            {/* Rating Info */}
                            <div>
                              {lessonItem.lId?.totalRatings > 0 ? (
                                <p className="text-sm text-gray-500">
                                  <span className="text-gray-900">
                                    ({lessonItem.lId.averageRating}%)
                                  </span>
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400">No Reviews Yet</p>
                              )}
                            </div>

                            {/* Action Button */}
                            <div className="mt-auto pt-2">
                              <button
                                onClick={() => {
                                  handleManage(
                                    `/manage-lesson/${lessonItem.lId?._id}?curiid=${getcuridata.curriculum?.calenderId}`, 
                                    lessonItem._id,
                                    lessonItem.lId?._id,
                                    "curriculum",
                                    lessonItem.group || false
                                  );
                                  setShowLessonsPopup(false);
                                }}
                                className="w-full bg-primary text-white text-base font-medium py-3 rounded flex justify-center items-center gap-2"
                              >
                                Manage Lesson
                                <BiSolidZap className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No scheduled lessons found in this curriculum.</p>
                  <p className="text-gray-400 text-sm mt-2">
                    All lessons are either completed or not yet scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}