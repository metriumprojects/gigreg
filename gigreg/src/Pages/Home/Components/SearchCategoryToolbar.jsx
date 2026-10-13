import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

const FALLBACK_CATEGORY_IMAGE = "https://i.ibb.co/tpV3m2GW/no-image.png";

export default function SearchCategoryToolbar({
  categories = [],
  selectedCategory = "",
  selectedCategories,
  onSelectCategory,
  variant = "default",
}) {
  const allItems = [{ isTrending: true }, ...categories];
  const activeCategories = Array.isArray(selectedCategories)
    ? selectedCategories
    : typeof selectedCategory === "string" && selectedCategory
      ? selectedCategory.split(",").map((s) => s.trim()).filter(Boolean)
      : Array.isArray(selectedCategory)
        ? selectedCategory
        : [];

  if (variant === "pills") {
    return (
      <section className="relative mb-[20px] min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full">
          {allItems.map((category) => {
            const isTrending = !category || category.isTrending;
            const title = isTrending ? "All" : category.name;
            const categoryName = isTrending ? "" : category.name;
            const isSelected = isTrending
              ? activeCategories.length === 0
              : activeCategories.includes(category.name);

            return (
              <button
                key={isTrending ? "trending" : (category._id || category.name)}
                type="button"
                onClick={() => {
                  if (isTrending) {
                    onSelectCategory?.("");
                  } else {
                    onSelectCategory?.(categoryName);
                  }
                }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all cursor-pointer select-none ${isSelected
                    ? "bg-primary text-white border-[1.5px] border-primary font-semibold shadow-xs"
                    : "bg-white border-[1.5px] border-black text-black font-semibold hover:bg-gray-50"
                  }`}
              >
                {title}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const midpoint = Math.ceil(allItems.length / 2);
  const row1Items = allItems.slice(0, midpoint);
  const row2Items = allItems.slice(midpoint);
  const columnCount = Math.max(row1Items.length, row2Items.length);

  const renderCard = (category) => {
    if (!category) return null;
    const isTrending = !category || category.isTrending;
    const isSelected = isTrending
      ? activeCategories.length === 0
      : activeCategories.includes(category.name);
    const title = isTrending ? "Trending" : category.name;
    const imageUrl = isTrending ? FALLBACK_CATEGORY_IMAGE : (category?.image?.url || FALLBACK_CATEGORY_IMAGE);
    const categoryName = isTrending ? "" : category.name;

    return (
      <div
        key={isTrending ? "trending" : (category._id || category.name)}
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory?.(categoryName)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onSelectCategory?.(categoryName);
        }}
        className={`group relative flex h-[75px] w-[75px] sm:h-[180px] sm:w-[180px] shrink-0 cursor-grab select-none items-center justify-center overflow-hidden rounded-[8px] sm:rounded-[10px] p-1.5 sm:px-[30px] sm:py-[15px] text-center transition-all duration-200 active:cursor-grabbing hover:opacity-95 ${isSelected ? "shadow-md" : "opacity-90 hover:opacity-100"
          }`}
      >
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div
          className={`absolute inset-0 transition-colors ${isSelected
              ? "bg-primary/60"
              : "bg-black/35 group-hover:bg-black/45"
            }`}
        />
        <span className="relative z-10 text-center text-[11px] sm:text-base font-bold text-white leading-tight sm:leading-snug break-words line-clamp-2 px-0.5">
          {title}
        </span>
      </div>
    );
  };

  return (
    <section className="relative my-0 sm:mt-[12px] sm:mb-[16px] min-w-0 w-full">
      <div className="relative min-w-0 w-full overflow-hidden">
        <Swiper
          className="category-free-slider !overflow-visible select-none"
          modules={[FreeMode, Mousewheel]}
          freeMode={{ enabled: true, momentum: true }}
          spaceBetween={6}
          breakpoints={{
            640: {
              spaceBetween: 10,
            },
          }}
          slidesPerView="auto"
        >
          {Array.from({ length: columnCount }).map((_, index) => {
            const topItem = row1Items[index];
            const bottomItem = row2Items[index];

            return (
              <SwiperSlide className="!w-auto" key={index}>
                <div className="flex flex-col gap-1.5 sm:gap-[10px]">
                  {renderCard(topItem)}
                  {renderCard(bottomItem)}
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
