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
    <section className="mb-5 mt-5 min-w-0 w-full">
      <div className="relative min-w-0 w-full overflow-hidden">
        <Swiper
          className="category-free-slider !overflow-visible pb-2 select-none"
          modules={[FreeMode, Mousewheel]}
          spaceBetween={12}
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
              className={`relative flex h-[50px] min-w-[140px] cursor-grab select-none items-center justify-center overflow-hidden rounded-lg px-5 active:cursor-grabbing md:min-w-[160px] ${
                !selectedCategory ? "ring-2 ring-primary" : ""
              }`}
            >
              <img
                src={FALLBACK_CATEGORY_IMAGE}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className={`absolute inset-0 ${!selectedCategory ? "bg-primary/75" : "bg-black/45"}`} />
              <span className="relative z-10 whitespace-nowrap text-center text-sm font-medium text-white md:text-base">
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
                  className={`relative flex h-[50px] min-w-[140px] cursor-grab select-none items-center justify-center overflow-hidden rounded-lg px-5 active:cursor-grabbing md:min-w-[160px] ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 ${isSelected ? "bg-primary/75" : "bg-black/45"}`} />
                  <span className="relative z-10 whitespace-nowrap text-center text-sm font-medium text-white md:text-base">
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
