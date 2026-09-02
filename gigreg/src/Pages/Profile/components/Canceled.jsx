import React, { useEffect, useState } from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { useDispatch, useSelector } from "react-redux";
import { getcuriBooking, userCancelBookings } from "../../../redux/reducers/BookingReducer";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Star, X, CheckCircle, Clock, AlertCircle } from "lucide-react";
import moment from "moment-timezone";

export default function Canceled() {
  const { userInfo, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userCanceldata, getcuriBookingdata, getcuridata } = useSelector((state) => state.book);

  // State for curriculum popup
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showLessonsPopup, setShowLessonsPopup] = useState(false);

  useEffect(() => {
    dispatch(userCancelBookings({ page: 1, limit: 20 }));
  }, [dispatch]);

  useEffect(() => {
    if (selectedCurriculum?._id) {
      dispatch(getcuriBooking(selectedCurriculum?._id));
    }
  }, [selectedCurriculum?._id, dispatch]);

  const handleReschedule = async (path, bookId, lessonId, type, isGroup = false) => {
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
      handleReschedule(`/manage-lesson/${course.lesson?._id}`, course._id, course.lesson?._id, "lesson", course.group || false);
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

  // Function to check if a lesson can be rescheduled
  const canRescheduleLesson = (lesson) => {
    // For canceled bookings, all lessons should be reschedulable
    // unless they're already completed
    if (lesson.status === 'completed') {
      return false;
    }
    return true;
  };

  // Function to get button text based on lesson status
  const getLessonButtonText = (lesson) => {
    switch (lesson.status) {
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Reschedule';
      case 'canceled':
        return 'Reschedule Lesson';
      default:
        return 'Reschedule Lesson';
    }
  };

  // Function to format date/time for display
  const formatScheduleTime = (scheduledAt, timezone) => {
    if (!scheduledAt) return 'Not scheduled';
    
    return moment(scheduledAt)
      .tz(timezone || 'UTC')
      .format('MMM D, YYYY • hh:mm A');
  };

  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full bg-[#F5F5F5] p-3 md:p-10 rounded-3xl mt-10">
      {userCanceldata?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userCanceldata?.map((course, index) => {
            const details = getBookingDetails(course);
            
            if (!details) return null;

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
                          className="w-full h-[40px] object-cover"
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

                  {/* Cancel reason if available */}
                  {course.cancelReason && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{course.cancelReason}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      onClick={() => handleCurriculumClick(course)}
                      className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2 hover:bg-primary-dark transition-colors"
                    >
                      {details.type === 'curriculum' ? 'Reschedule Curriculum' : 'Reschedule Lesson'}
                      <BiSolidZap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 text-lg">No Canceled Bookings yet</p>
        </div>
      )}

      {/* Lessons Popup for Curriculum - Same design as Unscheduled page */}
      {showLessonsPopup && selectedCurriculum && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b">
              <div>
                <h2 className="text-xl font-semibold">
                  Lessons in {selectedCurriculum.curriculum?.title}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Total Lessons: {getcuriBookingdata?.length || 0}
                </p>
              </div>
              <button
                onClick={() => setShowLessonsPopup(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lessons Slider */}
            <div className="flex-1 p-6">
              {getcuriBookingdata?.length > 0 ? (
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
                  {getcuriBookingdata.map((lessonItem, index) => (
                    <SwiperSlide key={lessonItem._id}>
                      <div className="h-full">
                        <div className={`overflow-hidden flex flex-col gap-5 h-full rounded ${
                          lessonItem.status === 'canceled' 
                            ? 'border-red-200 bg-red-50/50' 
                            : 'border-gray-200'
                        }`}>
                          {/* Image Section */}
                          <div className="relative overflow-hidden h-[200px] rounded-[15px]">
                            <img
                              src={lessonItem.lId?.images?.[0]?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
                              alt={lessonItem.lId?.title}
                              className="w-full h-full object-cover"
                            />
                            

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

                            {/* Schedule Time (if available) */}
                            {lessonItem.scheduledAt && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {formatScheduleTime(lessonItem.scheduledAt, selectedCurriculum.timezone)}
                                </span>
                              </div>
                            )}

                            {/* Rating Info */}
                            <div>

                            </div>

                            {/* Action Button */}
                            <div className="mt-auto pt-2">
                              {canRescheduleLesson(lessonItem) ? (
                                <button
                                  onClick={() => {
                                    handleReschedule(
                                      `/manage-lesson/${lessonItem.lId?._id}?curiid=${getcuridata.curriculum?.calenderId}`, 
                                      lessonItem._id,
                                      lessonItem.lId?._id,
                                      "curriculum",
                                      lessonItem.group || false
                                    );
                                    setShowLessonsPopup(false);
                                  }}
                                  className="w-full bg-primary hover:bg-primary-dark text-white text-base font-medium py-3 rounded flex justify-center items-center gap-2 transition-colors"
                                >
                                  {getLessonButtonText(lessonItem)}
                                  <BiSolidZap className="w-4 h-4" />
                                </button>
                              ) : lessonItem.status === 'completed' ? (
                                <div className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2">
                                  <CheckCircle className="w-5 h-5" />
                                  Lesson Completed
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No lessons found in this curriculum.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}