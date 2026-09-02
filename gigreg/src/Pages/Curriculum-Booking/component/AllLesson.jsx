import React from "react";
import { BiSolidZap } from "react-icons/bi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Link } from "react-router-dom";

export default function AllLesson({Data}) {

  return (
    <div className="w-full bg-[#F5F5F5] p-3 md:p-10 rounded-3xl mt-10">
      {Data.map((item, index) => (
        <div key={index} className="mb-10">
          {/* Unit Header */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 w-full">
              <button className="bg-primary w-full md:w-fit text-left text-white px-5 py-2 rounded-md font-medium flex items-center gap-2.5">
                <img
                  src="https://i.ibb.co/JJcS4sx/badge-poac.png"
                  className="h-[20px]"
                  alt="badge"
                />{" "}
                {item?.curriculumInfo
?.title}
              </button>
              <div className="flex gap-3 items-center justify-between w-full md:w-auto">
                <button className="bg-primary text-left text-white px-5 py-2 rounded-md font-medium flex items-center gap-2.5 w-fit">
                 View Description
                </button>
                <Link to={`/curriculum-booking/${item?.curriculumInfo?._id}`} className="bg-primary text-left text-white px-5 py-2 rounded-md font-medium flex items-center gap-2.5 w-fit">
                  Book {item?.curriculumInfo
?.price}$
                </Link>
              </div>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
                  {item?.curriculumInfo
?.description || "No description available."}
            </p>
          </div>

          <div 
              className="bg-white rounded-2xl p-4">
          <Swiper
              spaceBetween={20}
              slidesPerView={1.1}
              breakpoints={{
                640: { slidesPerView: 2 },
                800: { slidesPerView: 4 },
                1020: { slidesPerView: 3.5 },
              }}
            >
            {item?.lessonsInOrder?.map((i, index) => (
              <SwiperSlide
                key={index}
              >
                <div 
                className=" flex flex-col transition-all gap-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-sm text-gray-800">
                    {"Lesson " + (index + 1)}
                  </p>
                </div>
                <button
                  className="w-full bg-primary text-white text-base py-2.5 rounded-md flex justify-center items-center gap-2"
                >
                  {i?.lesson?.isIndependent ? 'Available as standalone' : 'Part of Curriculum'}
                </button>

                <img
                  src={i?.lesson?.coverImage?.url}
                  alt={i?.lesson?.title}
                  className="w-full h-auto aspect-square object-cover rounded-2xl"
                />

                <div className="flex items-center gap-3">
                  <img
                    src={i?.lesson?.createdBy?.image?.url}
                    alt={`profile`}
                    className="w-8 h-8 rounded-md object-cover"
                  />
                  <div className="flex items-center gap-1 text-base text-gray-700">
                    <span className="font-medium">{i?.lesson?.createdBy?.name}</span>
                    {/* <span>{i?.lesson?.averageRating}</span>
                    <span className="text-gray-400">{i?.lesson?.totalRatings}</span> */}
                  </div>
                </div>

                <p className="text-gray-700 text-base line-clamp-3">
                  {i?.lesson?.title}
                </p>

                {i?.lesson?.isIndependent && (
                  <Link 
                  to={`/curriculum-lesson/${i?.lesson?._id}`}
                    className="w-full bg-primary text-white text-base font-medium py-2.5 rounded-md flex justify-center items-center gap-2"
                  >
                    Book
                    <BiSolidZap className="w-4 h-4" />
                  </Link>
                )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          </div>
        </div>
      ))}
    </div>
  );
}
