import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, GalleryHorizontalEnd, Heart, MapPin, Plus, Star, Timer, Upload, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import MainLayout from "../../components/MainLayout";
import ImageGallery from "../Curriculum-Booking/component/ImageGallery";
import TeacherCard from "../Curriculum-Booking/component/TeacherCard";
import { getListingBySlug } from "../../redux/reducers/ListingReducer";
import { getUserFavorites, toggleFavorite } from "../../redux/reducers/FavoriteReducer";
import { sendChatMessage, startChat } from "../../redux/reducers/ChatReducer";
import {
  clearAvailabilityData,
  getLessonAvailability,
  getTeacherAvailability,
  getTeacherUnAvailability,
} from "../../redux/reducers/AvailabilityReducer";
import {
  initiateBooking,
  checkListingPurchased,
  userListingOrders,
} from "../../redux/reducers/BookingReducer";
import { useCurrency } from "../../currency/CurrencyContext";
import { FaCircleCheck } from "react-icons/fa6";

const formatDurationForPrice = (duration) => {
  if (!duration) return "";
  const value = String(duration).trim();
  if (/^1\s*h$/i.test(value)) return "h";
  if (/^60\s*m$/i.test(value)) return "h";
  return value.replace(/\bm\b/g, "min");
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSlotsForDate = (date, weeklyHours = [], dateSpecificHours = []) => {
  const dateKey = formatDateKey(date);
  const dateSpecific = Array.isArray(dateSpecificHours)
    ? dateSpecificHours.find((item) => item?.date === dateKey)
    : null;

  if (dateSpecific) {
    return dateSpecific.available === false || dateSpecific.unavailable === true
      ? []
      : dateSpecific.slots || [];
  }

  const weekly = Array.isArray(weeklyHours)
    ? weeklyHours.find((item) => item?.day === dayNames[date.getDay()])
    : weeklyHours?.[date.getDay()];

  return weekly?.available === false || weekly?.unavailable === true ? [] : weekly?.slots || [];
};

const getBlockedSlotsForDate = (date, dateUnAvailability = []) => {
  const dateKey = formatDateKey(date);
  const dateBlock = Array.isArray(dateUnAvailability)
    ? dateUnAvailability.find((item) => item?.date === dateKey)
    : null;

  return dateBlock?.slots || [];
};

const rangesOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const isDateFullyBlocked = (date, dateUnAvailability = []) => {
  const dateKey = formatDateKey(date);
  return Boolean(
    Array.isArray(dateUnAvailability) &&
      dateUnAvailability.find((item) => item?.date === dateKey && item?.unavailable === true)
  );
};

const parseDurationToMinutes = (duration) => {
  if (!duration) return 30;
  if (typeof duration === "number") return duration;

  const hoursMatch = String(duration).match(/(\d+)\s*(?:h|hr|hour|hours)/i);
  const minutesMatch = String(duration).match(/(\d+)\s*(?:m|min|mins|minutes)/i);
  let total = 0;

  if (hoursMatch) total += Number(hoursMatch[1]) * 60;
  if (minutesMatch) total += Number(minutesMatch[1]);

  if (!total && Number.isFinite(Number(duration))) total = Number(duration);
  return total || 30;
};

const parseTime = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const parseTime12h = (time) => {
  const [timeValue, modifier] = String(time).split(" ");
  let [hours, minutes] = timeValue.split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const formatTime12h = (date) =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatSelectedSlotForBooking = (dateKey, time) => {
  const [timeValue, modifier] = String(time).split(" ");
  let [hours, minutes] = timeValue.split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return `${dateKey} ${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`;
};

const formatHoursLabel = (minutes) => {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
};

const generateTimeSlots = (slots = [], duration, blockedSlots = []) => {
  const slotDuration = parseDurationToMinutes(duration);
  const times = [];

  slots.forEach((slot) => {
    const start = parseTime(slot.start);
    const end = parseTime(slot.end);
    const latestStart = new Date(end);
    latestStart.setMinutes(latestStart.getMinutes() - slotDuration);

    if (start > latestStart) return;

    const current = new Date(start);
    while (current <= latestStart) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
      const isBlocked = blockedSlots.some((blockedSlot) =>
        rangesOverlap(slotStart, slotEnd, parseTime(blockedSlot.start), parseTime(blockedSlot.end))
      );

      if (!isBlocked) times.push(formatTime12h(current));
      current.setMinutes(current.getMinutes() + slotDuration);
    }
  });

  return [...new Set(times)].sort((a, b) => parseTime12h(a) - parseTime12h(b));
};

const buildQuoteMessage = ({ listing, description, quoteContext, formatPrice }) => {
  const lines = [
    `Quote request for listing: ${listing?.title || "Listing"}`,
    `Listing URL: ${window.location.href}`,
  ];

  if (quoteContext?.selectedDate) lines.push(`Date: ${quoteContext.selectedDate}`);
  if (quoteContext?.selectedTimes?.length) {
    lines.push(`Time slots: ${quoteContext.selectedTimes.join(", ")}`);
    lines.push(`Selected slots: ${quoteContext.selectedTimes.length}`);
  }
  if (quoteContext?.totalPrice !== undefined) {
    lines.push(`Estimated price: ${formatPrice(quoteContext.totalPrice, listing?.currency || "USD")}`);
  } else if (listing?.pricingType !== "fixed_on_demand" && listing?.price !== undefined) {
    lines.push(`Price: ${formatPrice(listing.price, listing?.currency || "USD")}`);
  }
  if (description?.trim()) lines.push("", description.trim());

  return lines.join("\n");
};

const buildQuoteRequestPayload = ({ listing, description, quoteContext }) => ({
  listingId: listing?._id || "",
  listingTitle: listing?.title || "Listing",
  listingUrl: window.location.href,
  selectedDate: quoteContext?.selectedDate || "",
  selectedTimes: quoteContext?.selectedTimes || [],
  estimatedPrice: quoteContext?.totalPrice,
  currency: listing?.currency || "USD",
  description: description?.trim() || "",
});

const QuoteRequestModal = ({
  open,
  description,
  images,
  quoteContext,
  listing,
  submitting,
  onClose,
  onDescriptionChange,
  onImagesChange,
  onSubmit,
}) => {
  const { formatPrice } = useCurrency();
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[675px] rounded-[22px] bg-white p-[20px] shadow-2xl"
      >
        <div className="mb-[20px] flex items-center justify-between">
          <h2 className="text-base font-medium leading-none">Request a quote</h2>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label="Submit quote request"
          >
            <ArrowLeft className="rotate-180" size={18} />
          </button>
        </div>

        <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-2 block text-sm">Description (optional)</label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>

        {(quoteContext?.selectedDate || quoteContext?.selectedTimes?.length || quoteContext?.totalPrice !== undefined) && (
          <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3 text-sm">
            <p className="mb-2 font-medium">Selected booking details</p>
            {quoteContext?.selectedDate && (
              <p className="text-gray-700">Date: {quoteContext.selectedDate}</p>
            )}
            {quoteContext?.selectedTimes?.length > 0 && (
              <p className="text-gray-700">Time slots: {quoteContext.selectedTimes.join(", ")}</p>
            )}
            {quoteContext?.totalPrice !== undefined && (
              <p className="text-gray-700">
                Estimated price: {formatPrice(quoteContext.totalPrice, listing?.currency || "USD")}
              </p>
            )}
          </div>
        )}

        <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-3 block text-sm">Images (optional)</label>
          <label className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-white text-gray-700">
            <Upload size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => onImagesChange(Array.from(event.target.files || []))}
              className="hidden"
            />
          </label>
          {images.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {images.length} image{images.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-full border-[1.5px] border-transparent bg-gray-200 px-5 text-sm font-semibold text-black transition-colors hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-full border-[1.5px] border-primary bg-primary px-5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

const ListingAvailabilityPanel = ({
  listing,
  onBookListing,
  onAskQuote,
  booking,
  weeklyAvailability,
  dateAvailability,
  dateUnAvailability,
}) => {
  const { formatPrice } = useCurrency();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);

  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  const year = currentMonth.getFullYear();
  const firstDayOfMonth = new Date(year, currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedSlots = selectedDate
    ? getSlotsForDate(selectedDate, weeklyAvailability, dateAvailability)
    : [];
  const selectedBlockedSlots = selectedDate ? getBlockedSlotsForDate(selectedDate, dateUnAvailability) : [];
  const availableTimes = generateTimeSlots(selectedSlots, listing?.duration, selectedBlockedSlots);
  const totalPrice = selectedTimes.length * Number(listing?.price || 0);

  const createDateAtStartOfDay = (day) => new Date(year, currentMonth.getMonth(), day, 0, 0, 0, 0);

  const isPastDate = (date) => date < today;

  const isDateAvailable = (date) => {
    if (isPastDate(date)) return false;
    if (isDateFullyBlocked(date, dateUnAvailability)) return false;
    const slots = getSlotsForDate(date, weeklyAvailability, dateAvailability);
    const blockedSlots = getBlockedSlotsForDate(date, dateUnAvailability);
    return generateTimeSlots(slots, listing?.duration, blockedSlots).length > 0;
  };

  const hasAnyAvailableDatesInMonth = () => {
    for (let day = 1; day <= daysInMonth; day += 1) {
      if (isDateAvailable(createDateAtStartOfDay(day))) return true;
    }
    return false;
  };

  const handleSelectDate = (day) => {
    const date = createDateAtStartOfDay(day);
    if (!isDateAvailable(date)) return;

    setSelectedDate(date);
    setSelectedTimes([]);
  };

  const handleTimeToggle = (time) => {
    setSelectedTimes((current) =>
      current.includes(time)
        ? current.filter((selectedTime) => selectedTime !== time)
        : [...current, time]
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedTimes([]);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedTimes([]);
  };

  const generateDays = () => {
    const days = [];
    for (let index = 0; index < firstDayOfMonth; index += 1) days.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) days.push(day);
    return days;
  };

  return (
    <div className="w-full rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
      <p className="text-sm text-gray-500 mb-1">Hourly calendar</p>
      <p className="text-xl font-semibold mb-4">
        {formatPrice(listing?.price ?? 0, listing?.currency || "USD")}
        {listing?.duration ? <span className="text-sm font-normal">/{formatDurationForPrice(listing.duration)}</span> : null}
      </p>

      <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-xl">{monthName} {year}</p>
        <div>
          <button type="button" onClick={handlePrevMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
            <ChevronLeft />
          </button>
          <button type="button" onClick={handleNextMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-600 mb-1">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border border-gray-300 rounded-xl text-center mb-5 overflow-hidden bg-white">
        {generateDays().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="py-2 border border-gray-300"></div>;

          const date = createDateAtStartOfDay(day);
          const isPast = isPastDate(date);
          const isAvailable = isDateAvailable(date);
          const isSelected = selectedDate && formatDateKey(date) === formatDateKey(selectedDate);

          return (
            <button
              type="button"
              key={day}
              onClick={() => handleSelectDate(day)}
              disabled={isPast || !isAvailable}
              className={`py-2 text-sm border border-gray-300 ${
                isPast
                  ? "text-gray-400 cursor-not-allowed bg-[#f2f3f7]"
                  : !isAvailable
                  ? "text-gray-400 cursor-not-allowed bg-[#f2f3f7]"
                  : isSelected
                  ? "bg-primary text-white"
                  : "text-black hover:bg-blue-100 cursor-pointer bg-white"
              }`}
              title={isPast ? "Past date" : !isAvailable ? "Not available" : ""}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="h-40 overflow-y-auto hide-scrollbar flex items-center justify-center w-full">
        {availableTimes.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 w-full h-40 overflow-y-auto hide-scrollbar">
            {availableTimes.map((time) => {
              const selected = selectedTimes.includes(time);

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleTimeToggle(time)}
                  className={`border rounded-2xl py-2 text-sm h-20 ${
                    selected
                      ? "bg-primary text-white border-primary"
                      : "hover:bg-blue-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {!selectedDate
              ? hasAnyAvailableDatesInMonth()
                ? "Pick a date"
                : "Sorry, this expert is currently fully booked."
              : "No available times for this date"}
          </div>
        )}
      </div>

      {selectedTimes.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F7F7F7] px-4 py-3 text-sm">
          <span>{selectedTimes.length} slot{selectedTimes.length > 1 ? "s" : ""} selected</span>
          <span className="font-semibold">{formatPrice(totalPrice, listing?.currency || "USD")}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          onBookListing({
            selectedDate: selectedDate ? formatDateKey(selectedDate) : null,
            selectedTimes,
            totalPrice,
          })
        }
        disabled={selectedTimes.length === 0 || booking}
        className={`w-full mt-6 rounded-full px-5 py-3 text-sm font-medium ${
          selectedTimes.length === 0 || booking
            ? "bg-gray-400 cursor-not-allowed text-white"
            : "bg-primary text-white cursor-pointer"
        }`}
      >
        {booking ? "Opening checkout..." : selectedTimes.length > 0 ? `Book for ${formatPrice(totalPrice, listing?.currency || "USD")}` : "Select time slots"}
      </button>

      <button
        type="button"
        onClick={() =>
          onAskQuote({
            selectedDate: selectedDate ? formatDateKey(selectedDate) : null,
            selectedTimes,
            totalPrice,
          })
        }
        disabled={selectedTimes.length === 0 || booking}
        className="mt-3 w-full rounded-full border border-black bg-white px-5 py-3 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Request a quote
      </button>
    </div>
  );
};

const ListingDetails = () => {
  const { currency, formatPrice } = useCurrency();
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { listing, loading, error } = useSelector((state) => state.listing);
  const { favorites } = useSelector((state) => state.favorite);
  const { userInfo } = useSelector((state) => state.auth);
  const { sendMessageLoading } = useSelector((state) => state.chat);
  const {
    weeklyAvailability,
    dateAvailability,
    lessonWeeklyAvailability,
    lessonDateAvailability,
    dateUnAvailability,
  } = useSelector((state) => state.availability);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteImages, setQuoteImages] = useState([]);
  const [quoteContext, setQuoteContext] = useState(null);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [reviewsList, setReviewsList] = useState(() => {
    const defaultReviews = [
      {
        id: "rev-1",
        images: [
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
        ],
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
        userName: "Maya Thompson",
        initials: "MT",
        avatarBg: "#B25A38",
        verifiedBadge: "Verified attendee",
        rating: 5,
        comment:
          "Alex made every step feel approachable. The workshop moved at the perfect pace, and the thoughtful feedback helped me see my work differently.",
        date: "JANUARY 18, 2025",
      },
      {
        id: "rev-2",
        images: [
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
        ],
        image:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
        userName: "David Kim",
        initials: "DK",
        avatarBg: "#2B6CB0",
        verifiedBadge: "Verified attendee",
        rating: 5,
        comment:
          "Incredible experience! The craftsmanship and attention to detail exceeded all our expectations. Highly recommended to anyone looking for quality work.",
        date: "FEBRUARY 02, 2025",
      },
      {
        id: "rev-3",
        images: [
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
        ],
        image:
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
        userName: "Sarah Jenkins",
        initials: "SJ",
        avatarBg: "#2C7A7B",
        verifiedBadge: "Verified attendee",
        rating: 5,
        comment:
          "Super professional, punctual, and friendly. Guided us through every step and made the whole process completely stress-free.",
        date: "FEBRUARY 14, 2025",
      },
    ];

    const saved = localStorage.getItem(`listing_reviews_${slug || "default"}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If existing saved reviews don't have multiple images array, supplement with defaultReviews
          if (!parsed[0]?.images) {
            return defaultReviews;
          }
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return defaultReviews;
  });
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewImages, setNewReviewImages] = useState([]);
  const [fullscreenReviewGallery, setFullscreenReviewGallery] = useState({
    open: false,
    images: [],
    index: 0,
    reviewerName: "",
  });

  const [hasPurchasedListing, setHasPurchasedListing] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const isLoggedIn = Boolean(userInfo?._id);
  const isOwner = Boolean(
    listing?.createdBy?._id &&
    userInfo?._id &&
    String(listing.createdBy._id) === String(userInfo._id)
  );
  const canUserReview = isLoggedIn && !isOwner && hasPurchasedListing;

  const handleReviewImagesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewReviewImages((prev) => [...prev, event.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveReviewImage = (indexToRemove) => {
    setNewReviewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const openReviewFullscreen = (images, index = 0, reviewerName = "") => {
    if (!images || images.length === 0) return;
    setFullscreenReviewGallery({
      open: true,
      images,
      index,
      reviewerName,
    });
    document.body.style.overflow = "hidden";
  };

  const closeReviewFullscreen = () => {
    setFullscreenReviewGallery({
      open: false,
      images: [],
      index: 0,
      reviewerName: "",
    });
    document.body.style.overflow = "auto";
  };

  const nextReviewFullscreen = () => {
    setFullscreenReviewGallery((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.images.length,
    }));
  };

  const prevReviewFullscreen = () => {
    setFullscreenReviewGallery((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.images.length) % prev.images.length,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreenReviewGallery.open) return;
      if (e.key === "Escape") closeReviewFullscreen();
      if (e.key === "ArrowRight") nextReviewFullscreen();
      if (e.key === "ArrowLeft") prevReviewFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreenReviewGallery.open, fullscreenReviewGallery.images.length]);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!canUserReview) {
      toast.error("Only verified clients who have booked this service can submit a review.");
      return;
    }
    if (!newReviewComment.trim()) {
      toast.error("Please enter your review text.");
      return;
    }
    const name = newReviewerName.trim() || userInfo?.name || "Anonymous";
    const initials =
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U";

    const months = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    const now = new Date();
    const formattedDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    const finalImages = [...newReviewImages];

    const newRev = {
      id: `rev-${Date.now()}`,
      userId: userInfo?._id,
      images: finalImages,
      image: finalImages[0] || "",
      userName: name,
      initials,
      avatarBg: "#B25A38",
      verifiedBadge: "Verified attendee",
      rating: newRating,
      comment: newReviewComment.trim(),
      date: formattedDate,
    };

    const updated = [newRev, ...reviewsList];
    setReviewsList(updated);
    try {
      localStorage.setItem(`listing_reviews_${slug || "default"}`, JSON.stringify(updated));
    } catch {
      // ignore
    }

    toast.success("Review added successfully!");
    setAddReviewOpen(false);
    setNewReviewComment("");
    setNewReviewerName("");
    setNewReviewImages([]);
    setNewRating(5);
  };

  useEffect(() => {
    if (slug) dispatch(getListingBySlug(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    dispatch(clearAvailabilityData());
  }, [dispatch, slug]);

  useEffect(() => {
    dispatch(getUserFavorites());
  }, [dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    const verifyPurchaseEligibility = async () => {
      if (!isLoggedIn || isOwner || !listing?._id) {
        if (isMounted) setHasPurchasedListing(false);
        return;
      }

      // Check localStorage test flag if present
      const localFlag =
        localStorage.getItem(`has_booked_${listing._id}`) === "true" ||
        localStorage.getItem(`has_booked_${slug}`) === "true";
      if (localFlag) {
        if (isMounted) setHasPurchasedListing(true);
        return;
      }

      setCheckingPurchase(true);
      try {
        // 1. Direct purchase check endpoint
        const checkRes = await dispatch(
          checkListingPurchased({ listingId: listing._id })
        ).unwrap();

        if (isMounted && checkRes?.hasPurchased) {
          setHasPurchasedListing(true);
          setCheckingPurchase(false);
          return;
        }

        // 2. Fallback check through user listing orders
        const ordersRes = await dispatch(
          userListingOrders({ page: 1, limit: 50, status: "all" })
        ).unwrap();

        const orders = ordersRes?.orders || [];
        const isBought = orders.some(
          (o) =>
            String(o.listingId) === String(listing._id) ||
            (o.listingTitle &&
              listing.title &&
              o.listingTitle.trim().toLowerCase() === listing.title.trim().toLowerCase())
        );

        if (isMounted) {
          setHasPurchasedListing(isBought);
        }
      } catch (err) {
        console.warn("Purchase verification check:", err);
      } finally {
        if (isMounted) setCheckingPurchase(false);
      }
    };

    verifyPurchaseEligibility();

    return () => {
      isMounted = false;
    };
  }, [dispatch, isLoggedIn, isOwner, listing?._id, listing?.title, slug]);

  useEffect(() => {
    const teacherId = listing?.createdBy?._id;
    if (!teacherId || listing?.pricingType !== "hourly_calendar") return;

    dispatch(getTeacherUnAvailability({ id: teacherId }));

    if (listing?.calenderId) {
      dispatch(getLessonAvailability({ id: listing.calenderId }));
    } else {
      dispatch(getTeacherAvailability({ id: teacherId }));
    }
  }, [dispatch, listing?._id, listing?.createdBy?._id, listing?.pricingType, listing?.calenderId]);

  const galleryImages = useMemo(() => {
    const images = [];
    if (Array.isArray(listing?.images)) images.push(...listing.images);
    return images;
  }, [listing]);

  const listingFavorites = Array.isArray(favorites)
    ? favorites.filter((fav) => fav?.listing || fav?.type === "listing")
    : favorites?.listings || [];
  const isBookmarked = listingFavorites?.some((fav) => {
    const favoriteListingId = fav?.listing?._id || fav?.listing || fav?.item?._id || fav?.item;
    return favoriteListingId === listing?._id;
  });

  const isHourlyPricing = listing?.pricingType === "hourly_calendar" || listing?.pricingType === "hourly";
  const modeLabel = listing?.isOnline && listing?.supportsInPerson
    ? "Online and in person"
    : listing?.isOnline
    ? "Online"
    : "In person";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Listing link copied to clipboard");
    } catch {
      toast.error("Unable to copy listing link");
    }
  };

  const handleFavorite = () => {
    if (!listing?._id) return;

    dispatch(toggleFavorite({ id: listing._id, type: "listing" })).then((res) => {
      if (res?.payload?.status) {
        dispatch(getUserFavorites());
        toast.success(res.payload.message || "Updated favorites");
      } else {
        toast.info(res?.payload?.message || "Unable to update favorite");
      }
    });
  };

  const validateQuoteAccess = () => {
    if (!userInfo?._id) {
      toast.info("Please log in to request a quote.");
      navigate("/login");
      return false;
    }

    if (!listing?.createdBy?._id) {
      toast.error("Expert information not available");
      return false;
    }

    if (userInfo._id === listing.createdBy._id) {
      toast.info("This is your listing.");
      return false;
    }

    return true;
  };

  const handleAskForQuote = (context = null) => {
    if (!validateQuoteAccess()) return;
    setQuoteContext(context);
    setQuoteModalOpen(true);
  };

  const handleCloseQuoteModal = () => {
    setQuoteModalOpen(false);
    setQuoteDescription("");
    setQuoteImages([]);
    setQuoteContext(null);
  };

  const handleSubmitQuote = async (event) => {
    event.preventDefault();

    if (quoteSubmitting) return;
    if (!validateQuoteAccess()) return;

    setQuoteSubmitting(true);
    try {
      const data = await dispatch(startChat({ targetUserId: listing.createdBy._id })).unwrap();
      const roomId = data?.room?._id;

      if (!roomId) {
        toast.error("Could not start the chat. Please try again.");
        return;
      }

      const message = buildQuoteMessage({
        listing,
        description: quoteDescription,
        quoteContext,
        formatPrice,
      });
      const quoteRequest = buildQuoteRequestPayload({
        listing,
        description: quoteDescription,
        quoteContext,
      });

      await dispatch(
        sendChatMessage({
          roomId,
          message,
          type: "quote_request",
          quoteRequest,
          images: quoteImages,
        })
      ).unwrap();

      toast.success("Quote request sent");
      handleCloseQuoteModal();
      navigate(`/chat/${roomId}`);
    } catch (chatError) {
      const message = typeof chatError === "string" ? chatError : "Failed to start chat.";
      toast.error(message);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleFixedListingCheckout = async () => {
    if (!userInfo?._id) {
      toast.info("Please log in to book this listing.");
      navigate("/login");
      return;
    }

    if (!listing?.createdBy?._id) {
      toast.error("Expert information not available");
      return;
    }

    if (userInfo._id === listing.createdBy._id) {
      toast.info("This is your listing.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const [firstName = userInfo?.name || "Client", ...lastNameParts] = String(userInfo?.name || "").split(" ");
      const res = await dispatch(
        initiateBooking({
          id: listing._id,
          firstname: firstName,
          lastname: lastNameParts.join(" ") || " ",
          country: userInfo?.country || "",
          type: "listing",
          checkoutCurrency: currency,
        })
      ).unwrap();

      if (res?.status && res?.url) {
        localStorage.setItem("bookingId", res.bookingId);
        window.location.href = res.url;
        return;
      }

      toast.error(res?.message || "Error starting checkout");
    } catch (error) {
      const message = typeof error === "string" ? error : error?.data?.message || "Error starting checkout";
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCalendarListingCheckout = async ({ selectedDate, selectedTimes }) => {
    if (!selectedDate || !selectedTimes?.length) {
      toast.info("Please select a date and time.");
      return;
    }

    if (!userInfo?._id) {
      toast.info("Please log in to book this listing.");
      navigate("/login");
      return;
    }

    if (!listing?.createdBy?._id) {
      toast.error("Expert information not available");
      return;
    }

    if (userInfo._id === listing.createdBy._id) {
      toast.info("This is your listing.");
      return;
    }

    const scheduledAt = formatSelectedSlotForBooking(selectedDate, selectedTimes[0]);
    const totalMinutes = selectedTimes.length * parseDurationToMinutes(listing?.duration);
    const [firstName = userInfo?.name || "Client", ...lastNameParts] = String(userInfo?.name || "").split(" ");

    setCheckoutLoading(true);
    try {
      const res = await dispatch(
        initiateBooking({
          id: listing._id,
          scheduledAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          firstname: firstName,
          lastname: lastNameParts.join(" ") || " ",
          country: userInfo?.country || "",
          type: "listing",
          checkoutCurrency: currency,
          meta: {
            selectedDate,
            selectedTimes,
            hours: formatHoursLabel(totalMinutes),
          },
        })
      ).unwrap();

      if (res?.status && res?.url) {
        localStorage.setItem("bookingId", res.bookingId);
        window.location.href = res.url;
        return;
      }

      toast.error(res?.message || "Error starting checkout");
    } catch (error) {
      const message = typeof error === "string" ? error : error?.data?.message || "Error starting checkout";
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderRightPanel = () => {
    if (listing?.pricingType === "hourly_calendar") {
      return (
          <ListingAvailabilityPanel
            listing={listing}
          onBookListing={handleCalendarListingCheckout}
          onAskQuote={handleAskForQuote}
          booking={checkoutLoading}
          weeklyAvailability={listing?.calenderId ? lessonWeeklyAvailability : weeklyAvailability}
          dateAvailability={listing?.calenderId ? lessonDateAvailability : dateAvailability}
          dateUnAvailability={dateUnAvailability}
        />
      );
    }

    if (listing?.pricingType === "fixed") {
      return (
        <button
          type="button"
          onClick={handleFixedListingCheckout}
          disabled={checkoutLoading}
          className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-white cursor-pointer disabled:opacity-60"
        >
          {checkoutLoading
            ? "Opening checkout..."
            : `Buy ${formatPrice(listing?.price ?? 0, listing?.currency || "USD")}`}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleAskForQuote()}
        className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-white cursor-pointer"
      >
        Request a quote
      </button>
    );
  };

  const locationText =
    listing?.address || listing?.location || modeLabel;

  const breadcrumbContent = (
    <nav className="flex items-center gap-2 text-sm leading-none text-black select-none">
      <Link to="/" className="hidden items-center gap-2 text-gray-500 hover:text-black md:flex">
        Home <ChevronRight size={18} />
      </Link>
      <Link
        to={{
          pathname: "/listing",
          search: listing?.category
            ? `?category=${encodeURIComponent(listing.category)}`
            : "",
        }}
        className="flex items-center gap-2 text-black hover:text-primary"
      >
        <ArrowLeft className="md:hidden" size={20} />
        <span className="md:hidden">Listings</span>
        <span className="hidden md:inline">{listing?.category || "Listings"}</span>
      </Link>
    </nav>
  );

  return (
    <MainLayout
      width="4440px"
      contentClassName="lg:overflow-x-visible"
      breadcrumbs={breadcrumbContent}
    >
      <div className="min-h-screen pb-8">
        {loading ? (
          <div className="w-full py-16 text-center text-gray-500">Loading listing...</div>
        ) : error ? (
          <div className="w-full py-16 text-center text-gray-500">
            {error?.message || "Listing not found"}
          </div>
        ) : (
          <>

            <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8">
              {/* Two-column grid: Main content on left, Booking panel on right */}
              <div className="mt-6 md:mt-8 grid h-fit grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8">
                {/* Column 1: Main Content (TeacherCard, Title, Location, Gallery, Description, Reviews) */}
                <div className="lg:col-span-8 xl:col-span-8">
                  {/* Title */}
                  <h1 className="w-full text-left text-lg font-semibold leading-none md:text-2xl">
                    {listing?.title}
                  </h1>

                  {/* Location & Duration on left, Copy link & Save on right */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm leading-none text-black md:gap-5">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="shrink-0" />
                        <span>{locationText}</span>
                      </div>
                      {isHourlyPricing && listing?.duration && (
                        <div className="flex items-center gap-2">
                          <Timer size={18} />
                          <span>{listing.duration}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-[#F5F5F5] px-3.5 text-xs font-medium transition hover:bg-gray-200"
                      >
                        <span className="hidden md:inline">Copy link</span>
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleFavorite}
                        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-[#F5F5F5] px-3.5 text-xs font-medium transition hover:bg-gray-200"
                      >
                        <span className="hidden md:inline">{isBookmarked ? "Saved" : "Save"}</span>
                        <Heart
                          size={16}
                          className={isBookmarked ? "fill-primary text-primary" : ""}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-7xl space-y-4">
                    <ImageGallery images={galleryImages} />

                    <div className="mt-5 text-sm leading-relaxed text-black">
                      {listing?.description ? (
                        <div dangerouslySetInnerHTML={{ __html: listing.description }} />
                      ) : (
                        <p>No description available</p>
                      )}
                    </div>
                  </div>

                  {/* Reviews Section underneath Meet your expert / Teacher Card */}
                  <div id="reviews-section" className="mt-8 md:mt-10 scroll-mt-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg md:text-xl font-semibold text-black">Reviews</h2>
                        {reviewsList.length > 0 && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                            {reviewsList.length}
                          </span>
                        )}
                      </div>
                      {canUserReview && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!newReviewerName && userInfo?.name) {
                              setNewReviewerName(userInfo.name);
                            }
                            setAddReviewOpen(true);
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-95 cursor-pointer shadow-xs shrink-0"
                        >
                          <Plus size={14} />
                          <span>Write a review</span>
                        </button>
                      )}
                    </div>

                    {/* Review Cards: horizontal row, wraps to next line */}
                    {reviewsList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {reviewsList.map((review) => (
                          <div
                            key={review.id}
                            className="flex flex-col overflow-hidden rounded-2xl bg-[#F5F5F5] transition hover:shadow-sm"
                          >
                            {/* Top Cover Image with Multi-image badge & fullscreen trigger */}
                            {(() => {
                              const revImages =
                                Array.isArray(review.images) && review.images.length > 0
                                  ? review.images
                                  : review.image
                                  ? [review.image]
                                  : [];
                              const coverImg = revImages[0];
                              if (!coverImg) return null;

                              return (
                                <div className="relative h-44 w-full overflow-hidden bg-gray-100 group">
                                  <img
                                    src={coverImg}
                                    alt="Review"
                                    onClick={() => openReviewFullscreen(revImages, 0, review.userName)}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
                                  />
                                  {revImages.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openReviewFullscreen(revImages, 0, review.userName);
                                      }}
                                      className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition hover:bg-black/80 hover:scale-105 cursor-pointer"
                                      title={`View all ${revImages.length} photos`}
                                    >
                                      <GalleryHorizontalEnd size={18} />
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="flex flex-1 flex-col p-5">
                              {/* Reviewer info with avatar */}
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 overflow-hidden">
                                  {review.userAvatar ? (
                                    <img
                                      src={review.userAvatar}
                                      alt={review.userName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <svg
                                      className="h-4 w-4 shrink-0 text-gray-700"
                                      viewBox="0 0 22 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M11 23C13.2546 23 15.0343 22.9447 16.4395 22.8027C17.8542 22.6598 18.8206 22.435 19.4834 22.1338C20.1133 21.8475 20.4493 21.5022 20.6562 21.0791C20.8817 20.618 21 19.9693 21 19C21 18.0307 20.8817 17.382 20.6562 16.9209C20.4493 16.4978 20.1133 16.1525 19.4834 15.8662C18.8206 15.565 17.8542 15.3402 16.4395 15.1973C15.0343 15.0553 13.2546 15 11 15C8.74545 15 6.96565 15.0553 5.56055 15.1973C4.1458 15.3402 3.17936 15.565 2.5166 15.8662C1.88675 16.1525 1.55068 16.4978 1.34375 16.9209C1.11831 17.382 1 18.0307 1 19C1 19.9693 1.11831 20.618 1.34375 21.0791C2.5166 22.1338 3.17936 22.435 4.1458 22.6598 5.56055 22.8027C6.96565 22.9447 8.74545 23 11 23Z" />
                                      <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 17 0)" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900 leading-snug truncate">
                                    {review.userName || "Guest"}
                                  </h4>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Check size={12} className="stroke-[2.5]" />
                                    <span>{review.verifiedBadge || "Verified attendee"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 5 Stars in primary color */}
                              <div className="mt-3.5 flex items-center gap-1 text-primary">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className={
                                      i < (review.rating || 5)
                                        ? "fill-primary text-primary"
                                        : "text-gray-300"
                                    }
                                  />
                                ))}
                              </div>

                              {/* Review Quote */}
                              <p className="mt-3.5 text-sm leading-relaxed text-gray-700 flex-1">
                                &ldquo;{review.comment}&rdquo;
                              </p>

                              {/* Date */}
                              {review.date && (
                                <div className="mt-5 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                  <span>{review.date}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 py-4">No reviews yet. Be the first to write one!</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Booking/Quote Panel & How does it work */}
                <aside className="space-y-4 lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6 lg:h-fit lg:self-start">
                  <div
                    className={
                      listing?.pricingType === "hourly_calendar"
                        ? ""
                        : "rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                    }
                  >
                    {renderRightPanel()}
                  </div>

                  {/* Meet your expert / Teacher Card */}
                  <TeacherCard
                    teacher={listing?.createdBy}
                    title="Meet your expert"
                    roleTitle="Expert"
                    name={listing?.createdBy?.name}
                    averageRating={listing?.createdBy?.averageRating}
                    hideLesson={listing?.createdBy?.hideLesson}
                    classHosted={listing?.createdBy?.classHosted}
                    classesAttended={listing?.createdBy?.classesAttended}
                    classesHosted={listing?.createdBy?.classesHosted}
                    bio={listing?.createdBy?.bio}
                    image={listing?.createdBy?.image}
                    lession={0}
                    reviews={reviewsList.length}
                    onReviewsClick={() => {
                      const el = document.getElementById("reviews-section");
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="mt-0"
                  />

                  <div className="rounded-2xl bg-[#F5F5F5] p-5">
                    <h2 className="mb-4 text-lg font-semibold text-black">How does it work?</h2>
                    <div className="space-y-4 text-sm leading-relaxed text-black">
                      <p className="flex items-start gap-2">
                        <FaCircleCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                        <span>Book your service and you&apos;ll be instantly connected with your expert.</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <FaCircleCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                        <span>
                          Your expert will let you know where the session will take place and share a
                          meeting link with you.
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <FaCircleCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                        <span>
                          You can message them anytime, ask questions, and get support. Your learning
                          journey starts the moment you book.
                        </span>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Review Modal */}
      {addReviewOpen && canUserReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setAddReviewOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Rating Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Your Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="cursor-pointer transition hover:scale-110"
                    >
                      <Star
                        size={24}
                        className={
                          star <= newRating
                            ? "fill-primary text-primary"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-medium text-gray-500">
                    {newRating} / 5 stars
                  </span>
                </div>
              </div>

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={newReviewerName}
                  onChange={(e) => setNewReviewerName(e.target.value)}
                  placeholder="e.g. Maya Thompson"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Review
                </label>
                <textarea
                  required
                  rows={4}
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="Share your experience with this expert..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Multi-Photo Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Upload Photos (Optional)
                  </label>
                  {newReviewImages.length > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {newReviewImages.length} {newReviewImages.length === 1 ? "photo" : "photos"} selected
                    </span>
                  )}
                </div>

                <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-4 transition hover:border-primary/50 hover:bg-primary/5 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReviewImagesUpload}
                    className="hidden"
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs text-gray-600">
                    <Upload size={18} />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-medium text-gray-800">
                      Click to upload photos
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      Supports PNG, JPG, WebP (multiple files allowed)
                    </span>
                  </div>
                </label>

                {newReviewImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {newReviewImages.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="group relative h-16 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                      >
                        <img
                          src={imgSrc}
                          alt={`Uploaded preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveReviewImage(idx)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-90 transition hover:bg-black hover:scale-110 cursor-pointer"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddReviewOpen(false)}
                  className="rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary hover:opacity-95 px-5 py-2 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Review Gallery Lightbox */}
      {fullscreenReviewGallery.open &&
        fullscreenReviewGallery.images.length > 0 &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 text-white select-none backdrop-blur-md animate-in fade-in duration-200"
            onClick={closeReviewFullscreen}
          >
            {/* Top Bar */}
            <div
              className="relative z-10 flex items-center justify-between px-6 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white backdrop-blur-xs">
                  {fullscreenReviewGallery.index + 1} / {fullscreenReviewGallery.images.length}
                </span>
                {fullscreenReviewGallery.reviewerName && (
                  <span className="text-sm font-medium text-gray-300">
                    Review by {fullscreenReviewGallery.reviewerName}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={closeReviewFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 hover:scale-105 cursor-pointer"
                title="Close (Esc)"
              >
                <X size={22} />
              </button>
            </div>

            {/* Main Stage with Navigation */}
            <div
              className="relative flex flex-1 items-center justify-center px-4 md:px-16"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prev Button */}
              {fullscreenReviewGallery.images.length > 1 && (
                <button
                  type="button"
                  onClick={prevReviewFullscreen}
                  className="absolute left-4 md:left-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/90 hover:scale-110 cursor-pointer"
                  title="Previous image (←)"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              {/* Main Image */}
              <div className="flex h-full max-h-[75vh] w-full max-w-5xl items-center justify-center p-2">
                <img
                  key={fullscreenReviewGallery.index}
                  src={
                    fullscreenReviewGallery.images[fullscreenReviewGallery.index]?.url ||
                    fullscreenReviewGallery.images[fullscreenReviewGallery.index]
                  }
                  alt={`Review photo ${fullscreenReviewGallery.index + 1}`}
                  className="max-h-full max-w-full rounded-xl object-contain shadow-2xl transition duration-200 animate-in fade-in zoom-in-95"
                />
              </div>

              {/* Next Button */}
              {fullscreenReviewGallery.images.length > 1 && (
                <button
                  type="button"
                  onClick={nextReviewFullscreen}
                  className="absolute right-4 md:right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition hover:bg-black/90 hover:scale-110 cursor-pointer"
                  title="Next image (→)"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip */}
            {fullscreenReviewGallery.images.length > 1 && (
              <div
                className="relative z-10 flex justify-center px-4 py-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl bg-black/40 px-3 py-2 backdrop-blur-xs">
                  {fullscreenReviewGallery.images.map((img, idx) => {
                    const imgSrc = img?.url || img;
                    const isActive = idx === fullscreenReviewGallery.index;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setFullscreenReviewGallery((prev) => ({
                            ...prev,
                            index: idx,
                          }))
                        }
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg transition cursor-pointer ${
                          isActive
                            ? "ring-2 ring-white scale-105 opacity-100"
                            : "opacity-50 hover:opacity-90"
                        }`}
                      >
                        <img
                          src={imgSrc}
                          alt={`Thumbnail ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      <QuoteRequestModal
        open={quoteModalOpen}
        description={quoteDescription}
        images={quoteImages}
        quoteContext={quoteContext}
        listing={listing}
        submitting={quoteSubmitting || sendMessageLoading}
        onClose={handleCloseQuoteModal}
        onDescriptionChange={setQuoteDescription}
        onImagesChange={setQuoteImages}
        onSubmit={handleSubmitQuote}
      />
    </MainLayout>
  );
};

export default ListingDetails;
