import React from "react";

// Haversine formula to calculate distance between two lat/lng points in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  )
    return null;
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      (1 - Math.cos(dLon)) / 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
import { Copy, Heart, Search, Star } from "lucide-react";
import { BiSolidZap } from "react-icons/bi";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getUserFavorites,
  toggleFavorite,
} from "../../../redux/reducers/FavoriteReducer";
import { toast } from "react-toastify";
import { useCurrency } from "../../../currency/CurrencyContext";

// Pass searchLocation as { lat, lng }
const Card = ({ course, favorites, searchLocation, linkTo }) => {
  const { formatPrice } = useCurrency();
  const cardPriceOptions = { currencyDisplay: "narrowSymbol" };
  // Always calculate distance in frontend
  let distanceKm = null;
  let distanceDisplay = null;

  const searchLat = toFiniteNumber(searchLocation?.lat);
  const searchLng = toFiniteNumber(searchLocation?.lng);
  const courseLat = toFiniteNumber(course?.lat);
  const courseLng = toFiniteNumber(course?.lng);

  if (searchLat !== null && searchLng !== null && courseLat !== null && courseLng !== null) {
    distanceKm = getDistanceFromLatLonInKm(
      searchLat,
      searchLng,
      courseLat,
      courseLng
    );
    
    // Format distance: show meters if < 1km, otherwise km
    if (distanceKm !== null && distanceKm < 1) {
      distanceDisplay = `${Math.round(distanceKm * 1000)} m`;
    } else if (distanceKm !== null) {
      distanceDisplay = `${distanceKm} km`;
    }
  }
  const { userInfo } = useSelector((state) => state.auth);
  // const navigate = useNavigate(); // Removed unused variable
  const dispatch = useDispatch();

  const shouldShowCurriculum = course.isIndependent === true && course.curriculums?.length > 0;
  const shouldShowBothButtons = course.independent === false && course.curriculums !== null;
  const lessonFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.lesson)
    : favorites?.lessons || [];

  const isBookmarked = lessonFavorites?.some(
    (fav) => fav?.lesson?._id === course._id
  );

  // ⭐ Check if course is in favorites

  const handleSave = (courseId) => {
    dispatch(toggleFavorite({ id: courseId, type: "lesson" })).then((res) => {
      if (res?.payload?.status) {
        dispatch(getUserFavorites());
      } else {
        toast.info(res?.payload?.message || "Unable to update favorite");
      }
    });
  };

  return (
    <article className="mb-7 min-w-0 group">
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-gray-100">
      <Link
        to={linkTo || (
          shouldShowCurriculum
            ? `/curriculum-lesson/${course._id}`
            : shouldShowBothButtons
            ? "/curriculum-booking"
            : `/lesson-booking/${course._id}`
        )}
      >
        <img
          src={course?.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"}
          alt={course.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </Link>
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-base leading-none text-white backdrop-blur-sm">
          {course?.averageRating === 0 ? 100 : course?.averageRating ?? 100}%
        </span>
               <span className="absolute left-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-base leading-none text-white backdrop-blur-sm">
          Learn
        </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSave(course._id);
            }}
            className="absolute right-3 top-3 rounded-full bg-black/45 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
            aria-label={isBookmarked ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 ${
                isBookmarked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </button>
      </div>

      <div className="pt-2">
        <h3 className="line-clamp-3 text-base font-semibold leading-[1.22] text-black">{course.title}</h3>
        <p className="mt-1 text-base text-[#6A6A6A]">
          {formatPrice(course.price, course.currency || "USD", cardPriceOptions)} for {course?.duration || "1 hour"}
          {shouldShowCurriculum ? "  ·  Part of a curriculum" : ""}
        </p>
      {distanceDisplay !== null && (
            <div className="mt-1 text-xs text-[#6A6A6A]">
              {distanceDisplay} from desired location
            </div>
          )}
        <Link
          to={userInfo?._id === course?.createdBy?._id ? '/profile' : `/user-profile/${course?.createdBy?._id}?role=teacher`}
          className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-[#f3f3f3] py-1 pl-1 pr-3 text-base text-black"
        >
              <img
                src={
                  course?.createdBy?.image?.url ||
                  "https://i.ibb.co/tpV3m2GW/no-image.png"
                }
                loading="lazy"
                alt={course.createdBy?.name}
                className="h-6 w-6 rounded-full object-cover"
              />
          <span className="truncate">{course?.createdBy?.name || "Unknown"} ({course?.createdBy?.averageRating === 0 ? 100 : course?.createdBy?.averageRating ?? 100}%)</span>
        </Link>
    </div>
    </article>
  );
};

export default Card;
