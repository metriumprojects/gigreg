"use client";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { ListFilter } from "lucide-react";

export default function CategoryMobile({ categories = [], selectedCategory, onSelectCategory, setShowFilter }) {
  const [showMore, setShowMore] = useState(false);

  const handleSelect = (categoryName) => {
    if (onSelectCategory) {
      onSelectCategory(categoryName);
    }
  };

  return (
    <div className="w-full bg-white ps-0 lg:ps-2 my-2.5 block lg:hidden">
      <div className="w-full mx-auto flex items-center justify-between">

      

        {/* Mobile Dropdown */}
        <div className=" relative flex justify-between items-center w-full">
          <button
            onClick={() => setShowMore(!showMore)}
            className=" flex items-center rounded-md"
          >
            <div
              className={`cursor-pointer flex items-center gap-2 w-full ${
                !selectedCategory
                  ? "text-black font-semibold px-[22px] py-[12px] border-1 border-gray-300 rounded-md"
                  : "text-black px-[22px] py-[12px] border-1 border-gray-300 rounded-md"
              }`}
            >
              <span className="text-sm whitespace-nowrap font-medium underline underline-offset-4 decoration-2">
                {selectedCategory || "Trending"}
              </span>
            </div>
          </button>
                   <button
                      onClick={setShowFilter}
                      className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <ListFilter size={20} className="" />
                    </button>
                    
      {/* Mobile Dropdown Menu */}
      {showMore && (
        <div className="block lg:hidden absolute -left-2.5 top-10 bg-white rounded-md w-50 py-2 z-50 ms-3 mt-3 max-h-96 overflow-y-auto border-1 border-gray-300">
          <div
            onClick={() => {
              handleSelect("");
              setShowMore(false);
            }}
            className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${
              !selectedCategory ? "underline underline-offset-4 decoration-2" : ""
            }`}
          >
            <span className="text-sm font-medium">Trending</span>
          </div>
          {categories.map((cat, index) => (
            <div
              key={index}
              onClick={() => {
                handleSelect(cat.name);
                setShowMore(false);
              }}
              className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${
                selectedCategory === cat.name ? "underline underline-offset-4 decoration-2" : ""
              }`}
            >
              <span className="text-sm font-medium">{cat.name}</span>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>

    </div>
  );
}
