import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

const FALLBACK_CATEGORY_IMAGE = "https://i.ibb.co/tpV3m2GW/no-image.png";

export default function SearchCategoryToolbar({
  categories = [],
  selectedCategory = "",
  onSelectCategory,
}) {
  return (
    <section className="mt-[30px] mb-[30px] min-w-0 w-full">
      <div className="relative min-w-0 w-full overflow-hidden">
        <Swiper
          className="category-free-slider !overflow-visible select-none"
          modules={[FreeMode, Mousewheel]}
          spaceBetween={10}
          slidesPerView="auto"
        >
          <SwiperSlide className="!w-auto">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectCategory?.("")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelectCategory?.("");
              }}
              className={`group relative flex h-[150px] w-[150px] sm:h-[180px] sm:w-[180px] shrink-0 cursor-grab select-none items-center justify-center overflow-hidden rounded-[10px] p-3 sm:px-[30px] sm:py-[15px] text-center transition-all duration-200 active:cursor-grabbing hover:opacity-95 ${
                !selectedCategory ? "shadow-md" : "opacity-90 hover:opacity-100"
              }`}
            >
              <img
                src={FALLBACK_CATEGORY_IMAGE}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div
                className={`absolute inset-0 transition-colors ${
                  !selectedCategory
                    ? "bg-[rgba(0,140,255,0.6)]"
                    : "bg-black/35 group-hover:bg-black/45"
                }`}
              />
              <span className="relative z-10 text-center text-sm sm:text-base font-bold text-white leading-snug">
                Trending
              </span>
            </div>
          </SwiperSlide>

          {categories.map((category) => {
            const isSelected = selectedCategory === category.name;
            const imageUrl = category?.image?.url || FALLBACK_CATEGORY_IMAGE;
            return (
              <SwiperSlide className="!w-auto" key={category._id || category.name}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCategory?.(category.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelectCategory?.(category.name);
                  }}
                  className={`group relative flex h-[150px] w-[150px] sm:h-[180px] sm:w-[180px] shrink-0 cursor-grab select-none items-center justify-center overflow-hidden rounded-[10px] p-3 sm:px-[30px] sm:py-[15px] text-center transition-all duration-200 active:cursor-grabbing hover:opacity-95 ${
                    isSelected ? "shadow-md" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isSelected
                        ? "bg-[rgba(0,140,255,0.6)]"
                        : "bg-black/35 group-hover:bg-black/45"
                    }`}
                  />
                  <span className="relative z-10 text-center text-sm sm:text-base font-bold text-white leading-snug break-words line-clamp-2">
                    {category.name}
                  </span>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
      </div>
    </section>
  );
}
