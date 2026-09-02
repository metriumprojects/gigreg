import React, { useEffect } from "react";
import { Copy, Heart, Star } from "lucide-react";
import { BiSolidZap } from "react-icons/bi";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getUserFavorites,
  toggleFavorite,
} from "../../../redux/reducers/FavoriteReducer";
import { toast } from "react-toastify";
import { useCurrency } from "../../../currency/CurrencyContext";

const CurriculumCard = ({ course, linkTo }) => {
  const { formatPrice } = useCurrency();
  const cardPriceOptions = { currencyDisplay: "narrowSymbol" };
  const { userInfo, loading } = useSelector((state) => state.auth);
  const { favorites } = useSelector((state) => state.favorite);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ⭐ Check if course is in favorites
  const curriculumFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.curriculum)
    : favorites?.curriculums || [];

  const isBookmarked = curriculumFavorites?.some(
    (fav) => fav?.curriculum?._id === course?._id,
  );

  const handleSave = (courseId) => {
    dispatch(toggleFavorite({ id: courseId, type: "curriculum" })).then(
      (res) => {
        if (res?.payload?.status) {
          dispatch(getUserFavorites());
        } else {
          toast.info(res?.payload?.message || "Unable to update favorite");
        }
      },
    );
  };

  return (
    <article className="mb-7 min-w-0 group">
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-gray-100">
        <Link to={linkTo || `/curriculum-booking/${course._id}`}>
          <img
            src={
              course.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png"
            }
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
          {formatPrice(course.price, course.currency || "USD", cardPriceOptions)} &nbsp;·&nbsp; Curriculum
        </p>
                 <Link to={userInfo?._id === course?.createdBy?._id ? "/profile" : `/user-profile/${course?.createdBy?._id}?role=teacher`} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-[#f3f3f3] py-1 pl-1 pr-3 text-base text-black">
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

export default CurriculumCard;
