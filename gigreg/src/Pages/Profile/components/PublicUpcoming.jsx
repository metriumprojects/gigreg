import React, { useEffect } from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { IoCalendarOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { publicUpcomingBookings } from "../../../redux/reducers/BookingReducer";
import { Calendar, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function PublicUpcoming({ id }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, loading } = useSelector((state) => state.auth);
  const { publicUpcomingdata } = useSelector((state) => state.book);

  useEffect(() => {
    const now = new Date();
    const scheduledAt = now.toISOString().slice(0, 16);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    dispatch(publicUpcomingBookings({ scheduledAt, timezone, id }));
  }, [dispatch, id]);

  const handleManage = async (path, bookId) => {
    localStorage.setItem('bookId', bookId);
    await navigate(path);
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

  // Function to get the appropriate booking path
  const getBookingPath = (courseType, itemId) => {
    if (courseType === 'curriculum') {
      return `/curriculum-booking/${itemId}`;
    } else {
      return `/lesson-booking/${itemId}`;
    }
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

  return (
    <div className="w-full p-3 md:p-10 rounded-3xl mt-10">
      {publicUpcomingdata?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {publicUpcomingdata?.map((course, index) => {
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

                    {details.averageRating > 0 && (
                      <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-md text-base font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-yellow-500" />
                        {details.averageRating}/10
                      </div>
                    )}
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

                    {course?.teacher?.averageRating > 0 ? (
                      <p className="text-base text-gray-500">
                        <span className="text-gray-900">
                          {course?.teacher?.averageRating}/10
                        </span>{" "}
                        ({course?.teacher?.totalRatings})
                      </p>
                    ) : (
                      <p className="text-base text-gray-400">No Reviews Yet</p>
                    )}
                  </div>

                  <p className="text-base text-gray-600 line-clamp-3">
                    {details.title}
                  </p>

                  <p className="text-base text-gray-700 font-medium">
                    {details.type === 'curriculum' 
                      ? `Curriculum for ${course.amount}$`
                      : `Lesson for ${course.amount}$`
                    }
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleManage(
                        getBookingPath(details.type, details.id), 
                        course._id
                      )}
                      className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2"
                    >
                      Book {details.type === 'curriculum' ? 'Curriculum' : 'Lesson'}
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
    </div>
  );
}