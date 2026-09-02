import React, { useEffect } from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { IoCalendarOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { userBookings } from "../../../redux/reducers/BookingReducer";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { useCurrency } from "../../../currency/CurrencyContext";

export default function Booked() {
  const { formatPrice } = useCurrency();
  const cardPriceOptions = { currencyDisplay: "narrowSymbol" };
  const { userInfo, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { userBookingsdata } = useSelector((state) => state.book);

  useEffect(() => {
    dispatch(userBookings({ page: 1, limit: 20 }));
  }, [dispatch]);

  return (
    <div className="w-full bg-[#F5F5F5] p-3 md:p-10 rounded-3xl mt-10">
      {userBookingsdata?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userBookingsdata?.map((course, index) => (
            <div key={index} className="overflow-hidden flex flex-col gap-5">
              <div className="relative overflow-hidden h-[335px]">
                <Link to={``}>
                  <img
                    src={
                      course?.lesson?.coverImage?.url ||
                      "https://i.ibb.co/tpV3m2GW/no-image.png"
                    }
                    alt={course?.lesson?.title}
                    className="w-full h-full object-cover rounded-[20px]"
                  />

                  {course?.lesson?.rating > 0 && (
                    <div className="absolute top-3 left-3 text-white px-2 py-1 rounded-md text-base font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-yellow-500" />
                      {course?.lesson?.rating}/10
                    </div>
                  )}
                </Link>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex justify-between">
                  <div className="flex items-center gap-3">
                    <Link
                      to={
                        userInfo?._id === course?.teacher?._id
                          ? "/profile"
                          : `/user-profile/${course?.lesson?._id}`
                      }
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
                        {" "}
                        {course?.teacher?.averageRating}/10{" "}
                      </span>{" "}
                      ({course?.teacher?.totalRatings})
                    </p>
                  ) : (
                    <p className="text-base text-gray-400">No Reviews Yet</p>
                  )}
                </div>

                <p className="text-base text-gray-600 line-clamp-3">
                  {course?.lesson?.title}
                </p>

                <p className="text-base text-gray-700 font-medium">
                  {course?.lesson?.duration} lesson for {formatPrice(course?.lesson?.price, course?.lesson?.currency || "USD", cardPriceOptions)}
                </p>

                <div className="space-y-2">
                            <button
                       className="w-full bg-primary text-white text-left  font-medium py-2.5 rounded-md flex justify-center items-center gap-2 text-sm"
                     >
                       <Calendar className="w-4 h-4" />
                       <span>12 August 2025 <br />1:30PM Chicago (GMT-5)</span>
                     </button>
                  <Link
                    to={``}
                    className="w-full bg-primary text-white text-base font-medium py-3 rounded-md flex justify-center items-center gap-2"
                  >
                    Managed lesson
                    <BiSolidZap className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No Lesson Unschedule yet</p>
      )}
    </div>
  );
}
