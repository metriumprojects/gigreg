import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export default function Curriculum({Data}) {
  const [openUnits, setOpenUnits] = useState([0]); // Only Unit 1 (index 0) is open by default

  const organizeUnitsData = (curriculumData) => {
    if (!curriculumData?.lessonPosition) return [];

    // Group lessons by unit
    const unitsMap = {};
    
    curriculumData.lessonPosition.forEach((lessonPos) => {
      const unitId = lessonPos.unitName || `unit-${lessonPos.unitPosition}`;
      
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
          label: lessonPos.lId.isIndependent ? "Also available as standalone" : "Part of a curriculum",
          independent: lessonPos.lId.isIndependent,
          image: lessonPos.lId.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png",
          instructor: lessonPos.lId.createdBy?.name || "Unknown",
          instructorImg: lessonPos.lId.createdBy?.image?.url || "https://i.ibb.co/tpV3m2GW/no-image.png",
          rating: "9/10", // Keeping static as per your design
          reviews: "(32)", // Keeping static as per your design
          description: lessonPos.lId.description,
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
    <div className="w-full  space-y-4 ">
      <h2 className="flex items-center gap-2 text-lg md:text-xl font-semibold">What's Included:</h2>

      {units?.map((u, index) => (
        <div key={index} className="space-y-2">
          {/* Unit Header */}
          {u.title && (
          <button
            onClick={() => {
              if (openUnits.includes(index)) {
                // Remove from array if already open
                setOpenUnits(openUnits.filter(i => i !== index));
              } else {
                // Add to array if closed
                setOpenUnits([...openUnits, index]);
              }
            }}
            className="w-full flex justify-between items-center text-left font-semibold text-black"
          >
            <span>
           Unit {index + 1} {u.title !== "unit-null" ? <span className="text-black">: {u.title}</span> : ""}
           </span>
            <ChevronDown
              className={`transition-transform duration-200 ${
                openUnits.includes(index) ? "rotate-180" : ""
              }`}
              size={20}
            />
          </button>
          )}

          {/* Lessons */}
          {openUnits.includes(index) && (
            <div className="space-y-4 pl-0 mt-4">
              {u?.lessons?.map((lesson, i) => (
                <div key={i} className="flex gap-3">
                  <img
                    src={lesson.image}
                    className="w-20 h-20 object-cover"
                    alt="thumb"
                  />

                  <div className="flex flex-col justify-center gap-2">
                    <h3 className=" text-black text-sm line-clamp-1">
                     Lesson {i + 1}: {lesson?.title}
                    </h3>
                    {lesson.independent ? (
                      <Link 
                        to={`/curriculum-lesson/${lesson.id}`}
                        className="inline-flex w-fit bg-primary text-white text-xs font-medium px-2 py-1 rounded-full"
                      >
                        {lesson.label}
                      </Link>
                    ) : (
                      <span className="inline-flex w-fit bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                        {lesson.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
