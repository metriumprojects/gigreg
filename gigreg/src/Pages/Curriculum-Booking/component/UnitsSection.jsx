import React, { useState } from "react";
import { BiSolidZap } from "react-icons/bi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { Link } from "react-router-dom";

export default function UnitsSection({ Data }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Transform the lessonPosition data into organized units
  const organizeUnitsData = (curriculumData) => {
    if (!curriculumData?.lessonPosition) return [];

    // Group lessons by unit
    const unitsMap = {};
    
    curriculumData.lessonPosition.forEach((lessonPos) => {
      const unitId = lessonPos.unitName || ``;
      
      if (!unitsMap[unitId]) {
        unitsMap[unitId] = {
          id: unitId,
          title: `${unitId}`,
          description: "Unit description", // You can map actual description if available
          lessons: []
        };
      }
      
      // Add lesson to the unit
      if (lessonPos.lId) {
        unitsMap[unitId].lessons.push({
          id: lessonPos.lId._id,
          position: lessonPos.position,
          title: lessonPos.lId.title,
          label: lessonPos.lId.isIndependent ? "Available as standalone" : "Part of a curriculum",
          independent: lessonPos.lId.isIndependent,
          image: lessonPos.lId.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png",
          instructor: lessonPos.lId.createdBy?.name || "Unknown",
          instructorImg: lessonPos.lId.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png",
          rating: "9/10", // Keeping static as per your design
          reviews: "(32)", // Keeping static as per your design
          description: lessonPos.lId.description,
          price:lessonPos.lId.price,
          duration:lessonPos.lId.duration,
        });
      }
    });

    // Sort lessons by position within each unit and convert to array
    const organizedUnits = Object.values(unitsMap).map(unit => ({
      ...unit,
      lessons: unit.lessons.sort((a, b) => a.position - b.position)
    }));

    return organizedUnits;
  };

  const units = organizeUnitsData(Data);

  return (
    <div className="w-full bg-[#F5F5F5] p-3 md:p-10 rounded-3xl mt-10">
      {/* Header with dropdown button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-semibold">
            What's Included:
          </h2>
        </div>
        
        {/* Optional: Show unit count */}
 
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-8 h-8 text-gray-700 hover:bg-primary-dark transition-colors"
            aria-label={isExpanded ? "Collapse sections" : "Expand sections"}
          >
            {isExpanded ? (
              <FaChevronUp className="w-4 h-4" />
            ) : (
              <FaChevronDown className="w-4 h-4" />
            )}
          </button>
      </div>

      {/* Content that can be toggled */}
      {isExpanded && (
        <>
          {units.map((unit, i) => (
            <div key={i} className="mb-10">
              {/* Unit Header */}
              <div className="flex flex-col gap-4 mb-4">
                {unit.title && (
                  <button className="bg-primary text-left text-white px-5 py-2 rounded-md font-medium flex items-center gap-2.5 w-fit">
                    <img
                      src="https://i.ibb.co/JJcS4sx/badge-poac.png"
                      className="h-[20px]"
                      alt="badge"
                    />{" "}
                    Unit {i + 1}: {unit.title}
                  </button>
                )}
                {unit.title && (
                  <span>
                    <p className="text-gray-800 font-medium text-base">About this unit:</p>
                    {/* <p className="text-gray-600 text-sm md:text-base">
                      {unit.description}
                    </p> */}
                  </span>
                )}
              </div>

              {/* DESKTOP GRID (unchanged design) */}
              <div className="rounded-2xl bg-white p-4">
                <Swiper
                  spaceBetween={20}
                  slidesPerView={1.1}
                  breakpoints={{
                    640: { slidesPerView: 2 },
                    800: { slidesPerView: 4 },
                    1020: { slidesPerView: 3.5 },
                  }}
                >
                  {unit?.lessons?.map((lesson, index) => (
                    <SwiperSlide key={index}>
                      <div className="bg-white flex flex-col transition-all gap-4">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-sm text-gray-800">
                            Lesson {index + 1}
                          </p>
                        </div>
                        <button className="w-full bg-primary text-white text-base py-2.5 rounded-md flex justify-center items-center gap-2">
                          {lesson.label}
                        </button>

                        <img
                          src={lesson.image}
                          alt={lesson.title}
                          className="w-full h-auto aspect-square object-cover rounded-2xl"
                        />

                        <div className="flex items-center gap-3">
                          <img
                            src={lesson.instructorImg}
                            alt={lesson.instructor}
                            className="w-8 h-8 rounded-md object-cover"
                          />
                          <div className="flex items-center gap-1 text-base text-gray-700">
                            <span className="font-medium">{lesson.instructor}</span>
                            {/* <span>{lesson.rating}</span>
                            <span className="text-gray-400">{lesson.reviews}</span> */}
                          </div>
                        </div>

                        <p className="text-gray-700 text-base line-clamp-3">
                          {lesson.title}
                        </p>
                        <p className="text-base text-gray-700 font-medium">
                          {lesson?.duration} lesson {lesson?.price && `for $${lesson.price}`}
                        </p>

                        {lesson.independent && (
                          <Link
                            to={`/curriculum-lesson/${lesson.id}`}
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
        </>
      )}
    </div>
  );
}