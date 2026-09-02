import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

export default function Reviews({lessonReviews}) {

  return (
    <div className="w-full py-10">
      <h2 className="text-xl md:text-2xl font-semibold mb-6">Reviews</h2>
      {lessonReviews?.length > 0 ? (
        

      <Swiper
        spaceBetween={20}
        slidesPerView={1.1}
        breakpoints={{
          640: { slidesPerView: 2.2 },
          1024: { slidesPerView: 3.2 },
          1280: { slidesPerView: 4 },
        }}
        className="rounded-2xl"
      >
        {lessonReviews?.map((review, index) => (
          <SwiperSlide key={index}>
            <div className="bg-[#f5f5f5] overflow-hidden rounded-md transition-all h-full flex flex-col gap-2 p-2">
              {/* Image */}
              {review.image?.url && (
              <img
                src={review.image?.url}
                alt="review"
                className="h-48 w-full object-cover rounded-sm"
              />
              )}

              {/* Content */}
              <div className=" flex flex-col mt-2">
                {review?.review && (
                <p className="text-gray-800 text-sm md:text-base mb-4 leading-snug">
                  {review?.review}
                </p>
                )}
                <div>
                  <p className="text-sm  mb-1">Review by</p>
                  <div className="flex items-center gap-2">
                    <img
                      src={review?.user?.image?.url}
                      alt={review?.user?.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-gray-900 font-medium text-sm">
                {review?.user?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      ):(
        <p>No review yet</p>
      )}
    </div>
  );
}
