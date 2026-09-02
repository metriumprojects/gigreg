import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import api from "../../../redux/api";

const FALLBACK_AVATAR = "https://i.ibb.co/tpV3m2GW/no-image.png";

const mapSlide = (slide) => {
  const listing = slide?.listing || {};
  return {
    id: slide._id,
    image: slide.image?.url || listing.coverImage?.url || "",
    quote: slide.quote?.trim() || listing.title || "",
    name: listing.createdBy?.name || listing.title || "Gigreg listing",
    location: listing.location || listing.address || "Online",
    avatar: listing.createdBy?.image?.url || FALLBACK_AVATAR,
    path: listing.slug ? `/listing/${listing.slug}` : listing._id ? `/listing/${listing._id}` : null,
  };
};

export default function HighlightSlider() {
  const swiperRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const paginationRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSlides = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/home-slider/active");
        if (cancelled) return;
        const mapped = (data?.slides || []).map(mapSlide).filter((item) => item.image);
        setSlides(mapped);
      } catch {
        if (!cancelled) setSlides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSlides();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || slides.length === 0) return;

    if (swiper.params.navigation) {
      swiper.params.navigation.prevEl = prevRef.current;
      swiper.params.navigation.nextEl = nextRef.current;
      swiper.navigation.destroy();
      swiper.navigation.init();
      swiper.navigation.update();
    }

    if (swiper.params.pagination) {
      swiper.params.pagination.el = paginationRef.current;
      swiper.pagination.destroy();
      swiper.pagination.init();
      swiper.pagination.render();
      swiper.pagination.update();
    }
  }, [slides]);

  if (loading || slides.length === 0) return null;

  return (
    <section className="relative left-1/2 mb-5 w-screen max-w-[100vw] -translate-x-1/2">
      <div className="relative overflow-hidden">
        <Swiper
          modules={[Navigation, Pagination]}
          slidesPerView={1}
          loop={slides.length > 1}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="highlight-slider w-full"
        >
          {slides.map((slide) => {
            const content = (
              <div className="relative h-[400px] w-full">
                <img
                  src={slide.image}
                  alt={slide.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-12 pt-8 text-center text-white sm:px-8">
                  <p className="max-w-3xl text-base font-medium leading-snug sm:text-lg">
                    “{slide.quote}”
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <img
                      src={slide.avatar}
                      alt={slide.name}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-white/40"
                    />
                    <span className="text-sm font-medium">{slide.name}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-white/90">
                      <MapPin size={14} className="shrink-0" aria-hidden="true" />
                      {slide.location}
                    </span>
                  </div>
                </div>
              </div>
            );

            return (
              <SwiperSlide key={slide.id}>
                {slide.path ? (
                  <Link to={slide.path} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>

        {slides.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-3 sm:bottom-4 sm:gap-4">
            <button
              ref={prevRef}
              type="button"
              aria-label="Previous highlight"
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <div
              ref={paginationRef}
              className="highlight-slider-pagination pointer-events-auto flex items-center gap-2"
            />
            <button
              ref={nextRef}
              type="button"
              aria-label="Next highlight"
              className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
              <ChevronRight size={22} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .highlight-slider-pagination .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          margin: 0 !important;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          opacity: 1;
          border-radius: 9999px;
        }
        .highlight-slider-pagination .swiper-pagination-bullet-active {
          background: #fff;
          border-color: #fff;
        }
      `}</style>
      <span className="sr-only">
        Slide {activeIndex + 1} of {slides.length}
      </span>
    </section>
  );
}
