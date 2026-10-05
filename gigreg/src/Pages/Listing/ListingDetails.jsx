import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Heart, MapPin, Timer, Upload } from "lucide-react";
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
import { initiateBooking } from "../../redux/reducers/BookingReducer";
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[675px] rounded-[22px] bg-white p-5 shadow-2xl md:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-medium">Ask a quote</h2>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Submit quote request"
          >
            <ArrowLeft className="rotate-180" size={18} />
          </button>
        </div>

        <div className="mb-6 rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-2 block text-sm">Description (optional)</label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>

        {(quoteContext?.selectedDate || quoteContext?.selectedTimes?.length || quoteContext?.totalPrice !== undefined) && (
          <div className="mb-6 rounded-xl bg-[#F7F7F7] p-3 text-sm">
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

        <div className="mb-6 rounded-xl bg-[#F7F7F7] p-3">
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

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-black px-4 py-2 text-sm font-medium shadow-[0_3px_0_#ef4444] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full border border-black px-4 py-2 text-sm font-medium shadow-[0_3px_0_#65a30d] disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
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
                : "Sorry, this teacher is currently fully booked."
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
        Ask for quote
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
      toast.info("Please log in to ask for a quote.");
      navigate("/login");
      return false;
    }

    if (!listing?.createdBy?._id) {
      toast.error("Teacher information not available");
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
      toast.error("Teacher information not available");
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
      toast.error("Teacher information not available");
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
        Ask for Quote
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

            <div className="mx-auto w-full lg:max-w-7xl md:px-8">
              {/* Title: 40px gap below search bar */}
              <h1 className="mt-[40px] w-full text-left text-lg font-semibold leading-none md:text-2xl">
                {listing?.title}
              </h1>

              {/* Location & Duration on left, Copy link & Save on right */}
              <div className="mt-[14px] flex flex-wrap items-center justify-between gap-4">
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

              {/* Two-column grid: Images on left, Calendar on right perfectly aligned */}
              <div className="mt-[18px] grid h-fit grid-cols-1 md:gap-[30px] lg:grid-cols-6">
                <div className="lg:col-span-4">
                  <div className="max-w-7xl space-y-4">
                    <ImageGallery images={galleryImages} />

                    <div className="mt-5 text-sm leading-relaxed text-black">
                      {listing?.description ? (
                        <div dangerouslySetInnerHTML={{ __html: listing.description }} />
                      ) : (
                        <p>No description available</p>
                      )}
                    </div>
                  </div>

                  <TeacherCard
                    teacher={listing?.createdBy}
                    name={listing?.createdBy?.name}
                    averageRating={listing?.createdBy?.averageRating}
                    hideLesson={listing?.createdBy?.hideLesson}
                    classHosted={listing?.createdBy?.classHosted}
                    classesAttended={listing?.createdBy?.classesAttended}
                    classesHosted={listing?.createdBy?.classesHosted}
                    bio={listing?.createdBy?.bio}
                    image={listing?.createdBy?.image}
                    lession={0}
                  />
                </div>

                <aside className="mt-6 space-y-4 lg:col-span-2 lg:mt-0 lg:sticky lg:top-6 lg:h-fit lg:self-start">
                  <div
                    className={
                      listing?.pricingType === "hourly_calendar"
                        ? ""
                        : "rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
                    }
                  >
                    {renderRightPanel()}
                  </div>

                  <div className="rounded-2xl bg-[#F5F5F5] p-5">
                    <h2 className="mb-4 text-lg font-semibold text-black">How does it work?</h2>
                    <div className="space-y-4 text-sm leading-relaxed text-black">
                      <p className="flex items-start gap-2">
                        <FaCircleCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                        <span>Book your lesson and you&apos;ll be instantly connected with your teacher.</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <FaCircleCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                        <span>
                          Your teacher will let you know where the lesson will take place and share a
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
