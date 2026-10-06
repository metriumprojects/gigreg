import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import MainLayout from "../../components/MainLayout";
import Sidebar from "./components/Sidebar";
import { socketHost } from "../../redux/api";
import {
  appendIncomingMessage,
  fetchChatConnections,
  fetchChatMessages,
  markRoomRead,
  sendChatMessage,
  updateChatMessage,
  updateQuoteMessage,
} from "../../redux/reducers/ChatReducer";
import { initiateBooking } from "../../redux/reducers/BookingReducer";
import { getActiveListings } from "../../redux/reducers/ListingReducer";
import {
  clearAvailabilityData,
  getLessonAvailability,
  getTeacherAvailability,
  getTeacherUnAvailability,
} from "../../redux/reducers/AvailabilityReducer";
import { useCurrency } from "../../currency/CurrencyContext";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MessageCircleMore,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { IoSendSharp } from "react-icons/io5";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getRoomPeer = (room, currentUserId) => {
  if (!room) return null;
  const me = String(currentUserId || "");

  const student = room.student;
  const teacher = room.teacher;
  const studentId = normalizeId(student);
  const teacherId = normalizeId(teacher);

  if (studentId && studentId === me) {
    return teacher || null;
  }

  if (teacherId && teacherId === me) {
    return student || null;
  }

  return teacher || student || null;
};

const getRoomTeacherId = (room) => normalizeId(room?.teacher);
const getRoomStudentId = (room) => normalizeId(room?.student);

const getMessageImages = (message) => {
  if (!message) return [];
  if (message.type === "quote_request") return message.quoteRequest?.images || [];
  if (message.type === "quote") return message.quote?.images || [];
  return [];
};

const formatQuoteSlotForBooking = (dateKey, time) => {
  if (!dateKey || !time) return null;
  const [timeValue, modifier] = String(time).split(" ");
  let [hours, minutes] = timeValue.split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return `${dateKey} ${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`;
};

const extractLessonData = (message) => {
  if (!message) return null;

  if (message.lesson && typeof message.lesson === "object") {
    return {
      id: message.lesson._id,
      title: message.lesson.title,
      price: message.lesson.price,
      duration: message.lesson.duration,
      image: message.lesson.images?.[0]?.url,
    };
  }

  if (message.lessonSnapshot) {
    return {
      id: message.lesson || message.lessonSnapshot.lessonId,
      title: message.lessonSnapshot.title,
      price: message.lessonSnapshot.price,
      duration: message.lessonSnapshot.duration,
      image: message.lessonSnapshot.image,
    };
  }

  return null;
};

const extractListingData = (message) => {
  if (!message) return null;

  if (message.listing && typeof message.listing === "object") {
    return {
      id: message.listing._id,
      slug: message.listing.slug,
      title: message.listing.title,
      price: message.listing.price,
      currency: message.listing.currency,
      duration: message.listing.duration,
      image: message.listing.coverImage?.url,
    };
  }

  if (message.listingSnapshot) {
    return {
      id: message.listing || message.listingSnapshot.listingId,
      slug: message.listingSnapshot.slug,
      title: message.listingSnapshot.title,
      price: message.listingSnapshot.price,
      currency: message.listingSnapshot.currency,
      duration: message.listingSnapshot.duration,
      image: message.listingSnapshot.image,
    };
  }

  return null;
};

const buildQuoteRequestPayload = ({ listing, description, quoteContext }) => ({
  listingId: listing?._id || "",
  listingTitle: listing?.title || "Listing",
  listingUrl: listing?.slug
    ? `${window.location.origin}/listing/${listing.slug}`
    : "",
  selectedDate: quoteContext?.selectedDate || "",
  selectedTimes: quoteContext?.selectedTimes || [],
  estimatedPrice:
    quoteContext?.totalPrice !== undefined
      ? quoteContext.totalPrice
      : quoteContext
      ? undefined
      : listing?.pricingType === "fixed_on_demand"
      ? undefined
      : listing?.price,
  currency: listing?.currency || "USD",
  description: description?.trim() || "",
});

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

const QuoteAvailabilityCalendar = ({
  listing,
  selectedDate,
  selectedTimes,
  weeklyAvailability,
  dateAvailability,
  dateUnAvailability,
  loading,
  onSelectDate,
  onToggleTime,
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

  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  const year = currentMonth.getFullYear();
  const firstDayOfMonth = new Date(year, currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedSlots = selectedDateObj
    ? getSlotsForDate(selectedDateObj, weeklyAvailability, dateAvailability)
    : [];
  const selectedBlockedSlots = selectedDateObj
    ? getBlockedSlotsForDate(selectedDateObj, dateUnAvailability)
    : [];
  const availableTimes = generateTimeSlots(
    selectedSlots,
    listing?.duration,
    selectedBlockedSlots
  );

  const createDateAtStartOfDay = (day) =>
    new Date(year, currentMonth.getMonth(), day, 0, 0, 0, 0);
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
    onSelectDate(formatDateKey(date));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() - 1, 1));
    onSelectDate("");
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() + 1, 1));
    onSelectDate("");
  };

  const days = [];
  for (let index = 0; index < firstDayOfMonth; index += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(day);

  return (
    <div className="mb-6 rounded-xl bg-[#F7F7F7] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Select date and time slots</p>
          <p className="text-xs text-gray-500">
            {formatPrice(listing?.price ?? 0, listing?.currency || "USD")}
            {listing?.duration ? `/${String(listing.duration).replace(/\bm\b/g, "min")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded p-1 text-gray-600 hover:bg-white"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded p-1 text-gray-600 hover:bg-white"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <p className="mb-3 text-base font-semibold">
        {monthName} {year}
      </p>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-gray-600">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-7 overflow-hidden rounded-xl border border-gray-300 bg-white text-center">
        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="border border-gray-300 py-2" />;

          const date = createDateAtStartOfDay(day);
          const isPast = isPastDate(date);
          const isAvailable = isDateAvailable(date);
          const isSelected = selectedDate && formatDateKey(date) === selectedDate;

          return (
            <button
              type="button"
              key={day}
              onClick={() => handleSelectDate(day)}
              disabled={loading || isPast || !isAvailable}
              className={`border border-gray-300 py-2 text-sm ${
                isPast || !isAvailable
                  ? "cursor-not-allowed bg-[#f2f3f7] text-gray-400"
                  : isSelected
                  ? "bg-primary text-white"
                  : "cursor-pointer bg-white text-black hover:bg-blue-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-32 w-full items-center justify-center">
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Loading calendar...</p>
        ) : availableTimes.length > 0 ? (
          <div className="grid max-h-40 w-full grid-cols-3 gap-2 overflow-y-auto hide-scrollbar">
            {availableTimes.map((time) => {
              const selected = selectedTimes.includes(time);

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => onToggleTime(time)}
                  className={`h-14 rounded-2xl border py-2 text-sm ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 text-gray-700 hover:bg-blue-100"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500">
            {!selectedDate
              ? hasAnyAvailableDatesInMonth()
                ? "Pick a date"
                : "Sorry, this teacher is currently fully booked."
              : "No available times for this date"}
          </p>
        )}
      </div>

      {selectedTimes.length > 0 && (
        <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm">
          <span>{selectedTimes.length} slot{selectedTimes.length > 1 ? "s" : ""} selected</span>
        </div>
      )}
    </div>
  );
};

const AskQuoteModal = ({
  open,
  description,
  images,
  previews,
  listings,
  listingsLoading,
  selectedListingId,
  selectedDate,
  selectedTimes,
  weeklyAvailability,
  dateAvailability,
  dateUnAvailability,
  availabilityLoading,
  submitting,
  teacherName,
  onClose,
  onDescriptionChange,
  onImagesChange,
  onRemoveImage,
  onSelectListing,
  onSelectedDateChange,
  onToggleTime,
  onSubmit,
}) => {
  const { formatPrice } = useCurrency();
  if (!open) return null;
  const selectedListing = listings.find((listing) => listing._id === selectedListingId);
  const isCalendarListing = selectedListing?.pricingType === "hourly_calendar";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[675px] max-h-[90vh] overflow-y-auto rounded-[22px] bg-white p-[20px] shadow-2xl"
      >
        <div className="mb-[20px] flex items-center justify-between">
          <h2 className="text-base font-medium leading-none">Request a quote</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close quote request"
          >
            <X size={18} />
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

        <div className="mb-5 rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-3 block text-sm">Images (optional)</label>
          {previews.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {previews.map((preview, index) => (
                <div key={preview} className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gray-100">
                  <img src={preview} alt="Quote preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute right-1 top-1 rounded-full bg-black text-white"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-white text-gray-700">
            <Upload size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                onImagesChange(Array.from(event.target.files || []));
                event.target.value = "";
              }}
              className="hidden"
            />
          </label>
          {images.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {images.length} image{images.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <div className="mb-5 rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-3 block text-sm">
            {teacherName ? `${teacherName}'s listings` : "Teacher listings"}
          </label>
          {listingsLoading ? (
            <p className="text-sm text-gray-500">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="text-sm text-gray-500">No active listings available.</p>
          ) : (
            <div className="space-y-2">
              {listings.map((listing) => {
                const isSelected = selectedListingId === listing._id;
                const coverImage =
                  listing?.coverImage?.url || "https://i.ibb.co/tpV3m2GW/no-image.png";

                return (
                  <button
                    key={listing._id}
                    type="button"
                    onClick={() => onSelectListing(listing._id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={coverImage}
                      alt={listing.title}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{listing.title}</p>
                      <p className="text-xs text-gray-500">
                        {listing.pricingType === "fixed_on_demand"
                          ? "On demand"
                          : formatPrice(listing.price ?? 0, listing.currency || "USD")}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isCalendarListing && (
          <QuoteAvailabilityCalendar
            listing={selectedListing}
            selectedDate={selectedDate}
            selectedTimes={selectedTimes}
            weeklyAvailability={weeklyAvailability}
            dateAvailability={dateAvailability}
            dateUnAvailability={dateUnAvailability}
            loading={availabilityLoading}
            onSelectDate={onSelectedDateChange}
            onToggleTime={onToggleTime}
          />
        )}

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
            disabled={submitting || !selectedListingId}
            className="inline-flex h-9 items-center justify-center rounded-full border-[1.5px] border-primary bg-primary px-5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

const QuoteModal = ({
  open,
  mode,
  form,
  supportedCurrencies,
  images,
  previews,
  submitting,
  onClose,
  onFormChange,
  onImagesChange,
  onRemoveImage,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[675px] rounded-[22px] bg-white p-[20px] shadow-2xl"
      >
        <div className="mb-[20px] flex items-center justify-between">
          <h2 className="text-base font-medium leading-none">{mode === "edit" ? "Edit quote" : "Send a quote"}</h2>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label={mode === "edit" ? "Update quote" : "Submit quote"}
          >
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-2 block text-sm">Price</label>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <input
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(event) => onFormChange("price", event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
            <select
              aria-label="Quote currency"
              value={form.currency}
              onChange={(event) => onFormChange("currency", event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              {supportedCurrencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-3 block text-sm">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={(event) => onFormChange("description", event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>

        <div className="mb-[20px] rounded-xl bg-[#F7F7F7] p-3">
          <label className="mb-3 block text-sm">Images (optional)</label>
          {previews.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {previews.map((preview, index) => (
                <div key={preview} className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gray-100">
                  <img src={preview} alt="Quote preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute right-1 top-1 rounded-full bg-black text-white"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-white text-gray-700">
            <Upload size={20} />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                onImagesChange(Array.from(event.target.files || []));
                event.target.value = "";
              }}
              className="hidden"
              disabled={mode === "edit"}
            />
          </label>
          {mode === "edit" && (
            <p className="mt-2 text-xs text-gray-500">Images cannot be changed after a quote is sent.</p>
          )}
          {images.length > 0 && mode !== "edit" && (
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
            {submitting ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function Chat() {
  const { currency, formatPrice, supportedCurrencies } = useCurrency();
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.auth);
  const {
    rooms,
    roomsLoading,
    roomsError,
    messagesByRoom,
    messagesLoading,
    messagesError,
    messagesRoomId,
    sendMessageLoading,
  } = useSelector((state) => state.chat);
  const {
    weeklyAvailability,
    dateAvailability,
    lessonWeeklyAvailability,
    lessonDateAvailability,
    dateUnAvailability,
    loading: availabilityLoading,
  } = useSelector((state) => state.availability);

  const viewerRole = userInfo?.role || "";
  const viewerId = userInfo?._id || "";

  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [quoteModal, setQuoteModal] = useState({
    open: false,
    mode: "create",
    requestMessage: null,
    quoteMessage: null,
  });
  const [quoteForm, setQuoteForm] = useState({ price: "", description: "", currency });
  const [quoteImages, setQuoteImages] = useState([]);
  const [quoteImagePreviews, setQuoteImagePreviews] = useState([]);
  const [askQuoteModalOpen, setAskQuoteModalOpen] = useState(false);
  const [askQuoteDescription, setAskQuoteDescription] = useState("");
  const [askQuoteImages, setAskQuoteImages] = useState([]);
  const [askQuoteImagePreviews, setAskQuoteImagePreviews] = useState([]);
  const [askQuoteSelectedListingId, setAskQuoteSelectedListingId] = useState("");
  const [askQuoteSelectedDate, setAskQuoteSelectedDate] = useState("");
  const [askQuoteSelectedTimes, setAskQuoteSelectedTimes] = useState([]);
  const [teacherListings, setTeacherListings] = useState([]);
  const [teacherListingsLoading, setTeacherListingsLoading] = useState(false);

  const socketRef = useRef(null);
  const activeRoomRef = useRef(roomId);
  const viewerIdRef = useRef(viewerId);
  const chatScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    activeRoomRef.current = roomId;
    setShowMobileSidebar(!roomId);
  }, [roomId]);

  useEffect(() => {
    viewerIdRef.current = viewerId;
  }, [viewerId]);

  useEffect(() => {
    if (!userInfo?._id) return;
    dispatch(fetchChatConnections());
  }, [dispatch, userInfo?._id]);

  useEffect(() => {
    if (!roomId || !userInfo?._id) return;
    dispatch(fetchChatMessages({ roomId }));
  }, [dispatch, roomId, userInfo?._id]);

  useEffect(() => {
    const socketInstance = io(socketHost, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socketInstance;

    const handleReceiveMessage = (incoming) => {
      dispatch(
        appendIncomingMessage({
          roomId: incoming.roomId,
          message: incoming,
          viewerId: viewerIdRef.current,
        })
      );

      if (incoming.roomId === activeRoomRef.current && viewerIdRef.current) {
        socketInstance.emit("markRead", {
          roomId: incoming.roomId,
          userId: viewerIdRef.current,
        });
        dispatch(markRoomRead(incoming.roomId));
      }
    };

    const handleMessagesRead = ({ roomId: readRoomId }) => {
      dispatch(markRoomRead(readRoomId));
    };

    const handleMessageUpdated = (updatedMessage) => {
      dispatch(updateChatMessage(updatedMessage));
    };

    socketInstance.on("receiveMessage", handleReceiveMessage);
    socketInstance.on("messagesRead", handleMessagesRead);
    socketInstance.on("messageUpdated", handleMessageUpdated);

    return () => {
      socketInstance.off("receiveMessage", handleReceiveMessage);
      socketInstance.off("messagesRead", handleMessagesRead);
      socketInstance.off("messageUpdated", handleMessageUpdated);
      socketInstance.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!roomId || !socketRef.current || !viewerIdRef.current) return;
    socketRef.current.emit("joinRoom", roomId);
    socketRef.current.emit("markRead", {
      roomId,
      userId: viewerIdRef.current,
    });
    dispatch(markRoomRead(roomId));
  }, [dispatch, roomId]);

  const messages = roomId ? messagesByRoom[roomId] || [] : [];
  const isMessagesLoading = messagesLoading && messagesRoomId === roomId;
  const currentError =
    roomsError || (messagesRoomId === roomId ? messagesError : null);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room._id === roomId),
    [rooms, roomId]
  );

  const activePeer = useMemo(
    () => getRoomPeer(activeRoom, viewerId),
    [activeRoom, viewerId]
  );
  const askQuoteSelectedListing = useMemo(
    () => teacherListings.find((listing) => listing._id === askQuoteSelectedListingId),
    [teacherListings, askQuoteSelectedListingId]
  );
  const askQuoteWeeklyAvailability = askQuoteSelectedListing?.calenderId
    ? lessonWeeklyAvailability
    : weeklyAvailability;
  const askQuoteDateAvailability = askQuoteSelectedListing?.calenderId
    ? lessonDateAvailability
    : dateAvailability;
  const isViewerSeller =
    activeRoom && String(getRoomTeacherId(activeRoom)) === String(viewerId);
  const isViewerBuyer =
    activeRoom && String(getRoomStudentId(activeRoom)) === String(viewerId);

  const sendDisabled =
    !roomId ||
    (!message.trim() && !selectedImage) ||
    (Boolean(selectedImage) && sendMessageLoading);

  useEffect(() => {
    if (!askQuoteModalOpen || askQuoteSelectedListing?.pricingType !== "hourly_calendar") return;

    const teacherId =
      normalizeId(askQuoteSelectedListing?.createdBy) || getRoomTeacherId(activeRoom);

    if (!teacherId) return;

    dispatch(getTeacherUnAvailability({ id: teacherId }));

    if (askQuoteSelectedListing?.calenderId) {
      dispatch(getLessonAvailability({ id: askQuoteSelectedListing.calenderId }));
    } else {
      dispatch(getTeacherAvailability({ id: teacherId }));
    }
  }, [
    activeRoom,
    askQuoteModalOpen,
    askQuoteSelectedListing,
    dispatch,
  ]);

  const handleLessonNavigate = (lessonId) => {
    if (!lessonId) return;
    navigate(`/lesson-booking/${lessonId}`);
  };

  const handleListingNavigate = (listing) => {
    const path = listing?.slug || listing?.id;
    if (!path) return;
    navigate(`/listing/${path}`);
  };

  const closeQuoteModal = () => {
    setQuoteModal({
      open: false,
      mode: "create",
      requestMessage: null,
      quoteMessage: null,
    });
    setQuoteForm({ price: "", description: "", currency });
    setQuoteImages([]);
    setQuoteImagePreviews([]);
  };

  const openSendQuoteModal = (requestMessage) => {
    setQuoteModal({
      open: true,
      mode: "create",
      requestMessage,
      quoteMessage: null,
    });
    setQuoteForm({
      price: "",
      description: "",
      currency: requestMessage?.quoteRequest?.currency || currency,
    });
    setQuoteImages([]);
    setQuoteImagePreviews([]);
  };

  const openEditQuoteModal = (quoteMessage) => {
    setQuoteModal({
      open: true,
      mode: "edit",
      requestMessage: null,
      quoteMessage,
    });
    setQuoteForm({
      price: quoteMessage?.quote?.price !== undefined ? quoteMessage.quote.price : "",
      description: quoteMessage?.quote?.description || "",
      currency: quoteMessage?.quote?.currency || currency,
    });
    setQuoteImages([]);
    setQuoteImagePreviews((quoteMessage?.quote?.images || []).map((item) => item.url || item));
  };

  const handleQuoteImagesChange = (files) => {
    setQuoteImages(files);
    setQuoteImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveQuoteImage = (index) => {
    setQuoteImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setQuoteImagePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const closeAskQuoteModal = () => {
    setAskQuoteModalOpen(false);
    setAskQuoteDescription("");
    setAskQuoteImages([]);
    setAskQuoteImagePreviews([]);
    setAskQuoteSelectedListingId("");
    setAskQuoteSelectedDate("");
    setAskQuoteSelectedTimes([]);
    setTeacherListings([]);
    dispatch(clearAvailabilityData());
  };

  const openAskQuoteModal = async () => {
    const teacherId = getRoomTeacherId(activeRoom);
    if (!teacherId) {
      toast.error("Teacher information not available.");
      return;
    }

    setAskQuoteModalOpen(true);
    setTeacherListingsLoading(true);
    try {
      const result = await dispatch(
        getActiveListings({ createdBy: teacherId, limit: 50 })
      ).unwrap();
      const listings = result?.listings || [];
      setTeacherListings(listings);
      if (listings.length === 1) {
        setAskQuoteSelectedListingId(listings[0]._id);
      }
    } catch (error) {
      const errMessage =
        typeof error === "string" ? error : error?.message || "Failed to load listings.";
      toast.error(errMessage);
    } finally {
      setTeacherListingsLoading(false);
    }
  };

  const handleAskQuoteImagesChange = (files) => {
    setAskQuoteImages(files);
    setAskQuoteImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleRemoveAskQuoteImage = (index) => {
    setAskQuoteImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setAskQuoteImagePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAskQuoteListingSelect = (listingId) => {
    setAskQuoteSelectedListingId(listingId);
    setAskQuoteSelectedDate("");
    setAskQuoteSelectedTimes([]);
  };

  const handleToggleAskQuoteTime = (time) => {
    setAskQuoteSelectedTimes((current) =>
      current.includes(time)
        ? current.filter((selectedTime) => selectedTime !== time)
        : [...current, time]
    );
  };

  const handleSubmitAskQuote = async (event) => {
    event.preventDefault();

    if (!roomId || sendMessageLoading) return;

    const selectedListing = teacherListings.find(
      (listing) => listing._id === askQuoteSelectedListingId
    );

    if (!selectedListing) {
      toast.info("Please select a listing.");
      return;
    }

    const isCalendarListing = selectedListing.pricingType === "hourly_calendar";
    if (isCalendarListing && (!askQuoteSelectedDate || askQuoteSelectedTimes.length === 0)) {
      toast.info("Please select a date and at least one time slot.");
      return;
    }

    const quoteContext = isCalendarListing
      ? {
          selectedDate: askQuoteSelectedDate,
          selectedTimes: askQuoteSelectedTimes,
        }
      : null;

    const quoteRequest = buildQuoteRequestPayload({
      listing: selectedListing,
      description: askQuoteDescription,
      quoteContext,
    });
    const message = `Quote request for listing: ${selectedListing.title}`;

    try {
      await dispatch(
        sendChatMessage({
          roomId,
          message,
          type: "quote_request",
          quoteRequest,
          images: askQuoteImages,
        })
      ).unwrap();
      toast.success("Quote request sent");
      closeAskQuoteModal();
    } catch (error) {
      const errMessage =
        typeof error === "string" ? error : error?.message || "Failed to send quote request.";
      toast.error(errMessage);
    }
  };

  const handleSubmitQuote = async (event) => {
    event.preventDefault();

    if (!roomId || sendMessageLoading) return;
    if (!quoteForm.price && quoteForm.price !== 0) {
      toast.info("Price is required");
      return;
    }

    try {
      if (quoteModal.mode === "edit" && quoteModal.quoteMessage?._id) {
        await dispatch(
          updateQuoteMessage({
            messageId: quoteModal.quoteMessage._id,
            price: quoteForm.price,
            description: quoteForm.description,
            currency: quoteForm.currency,
            inputCurrency: quoteForm.currency,
          })
        ).unwrap();
        toast.success("Quote updated");
        closeQuoteModal();
        return;
      }

      await dispatch(
        sendChatMessage({
          roomId,
          type: "quote",
          message: "Quote sent",
          inputCurrency: quoteForm.currency,
          quote: {
            listingId: quoteModal.requestMessage?.quoteRequest?.listingId,
            price: quoteForm.price,
            currency: quoteForm.currency,
            description: quoteForm.description,
            requestMessageId: quoteModal.requestMessage?._id,
          },
          images: quoteImages,
        })
      ).unwrap();
      toast.success("Quote sent");
      closeQuoteModal();
    } catch (error) {
      const errMessage =
        typeof error === "string" ? error : error?.message || "Failed to save quote.";
      toast.error(errMessage);
    }
  };

  const handleQuoteStatus = async (quoteMessage, status) => {
    if (!quoteMessage?._id || sendMessageLoading) return;

    try {
      await dispatch(updateQuoteMessage({ messageId: quoteMessage._id, status })).unwrap();
      toast.success(status === "accepted" ? "Quote accepted" : "Quote cancelled");
    } catch (error) {
      const errMessage =
        typeof error === "string" ? error : error?.message || "Failed to update quote.";
      toast.error(errMessage);
    }
  };

  const handleAcceptQuote = async (quoteMessage) => {
    if (!quoteMessage?._id || sendMessageLoading) return;

    const requestMessage = messages.find(
      (item) => String(item?._id) === String(quoteMessage?.quote?.requestMessageId)
    );
    const listingId =
      quoteMessage?.quote?.listingId || requestMessage?.quoteRequest?.listingId;

    if (!listingId) {
      toast.error("Listing information is missing for this quote.");
      return;
    }

    if (!userInfo?._id) {
      toast.info("Please log in to accept this quote.");
      navigate("/login");
      return;
    }

    try {
      const quoteRequest = requestMessage?.quoteRequest || {};
      const selectedDate = quoteRequest.selectedDate || "";
      const selectedTimes = quoteRequest.selectedTimes || [];
      const scheduledAt = selectedDate && selectedTimes.length
        ? formatQuoteSlotForBooking(selectedDate, selectedTimes[0])
        : undefined;
      const [firstName = userInfo?.name || "Client", ...lastNameParts] = String(userInfo?.name || "").split(" ");

      const res = await dispatch(
        initiateBooking({
          id: listingId,
          scheduledAt,
          timezone: scheduledAt ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
          firstname: firstName,
          lastname: lastNameParts.join(" ") || " ",
          country: userInfo?.country || "",
          type: "listing",
          checkoutCurrency: currency,
          meta: {
            quoteMessageId: quoteMessage._id,
            requestMessageId: quoteMessage?.quote?.requestMessageId,
            selectedDate,
            selectedTimes,
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
      const errMessage =
        typeof error === "string"
          ? error
          : error?.data?.message || error?.message || "Failed to accept quote.";
      toast.error(errMessage);
    }
  };

  useEffect(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setAskQuoteModalOpen(false);
    setAskQuoteDescription("");
    setAskQuoteImages([]);
    setAskQuoteImagePreviews([]);
    setAskQuoteSelectedListingId("");
    setAskQuoteSelectedDate("");
    setAskQuoteSelectedTimes([]);
    setTeacherListings([]);
    if (!roomId) {
      setMessage("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [roomId]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!roomId) return;

    const trimmed = message.trim();

    if (selectedImage) {
      try {
        await dispatch(
          sendChatMessage({
            roomId,
            message: trimmed || undefined,
            image: selectedImage,
          })
        ).unwrap();
        setMessage("");
        handleRemoveImage();
      } catch (error) {
        const errMessage =
          typeof error === "string"
            ? error
            : error?.message || "Failed to send message.";
        toast.error(errMessage);
      }
      return;
    }

    if (!trimmed || !socketRef.current || !viewerIdRef.current) {
      return;
    }

    socketRef.current.emit("sendMessage", {
      roomId,
      userId: viewerIdRef.current,
      message: trimmed,
    });
    setMessage("");
  };

  const activePeerName =
    activePeer?.name || activePeer?.email || "Conversation";
  const activePeerAvatar =
    activePeer?.image?.url ||
    activePeer?.avatar ||
    `https://i.ibb.co/JFFpmtfn/user-icon-image-13.png`;

    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  return (
    <MainLayout>
      <div className="flex md:h-full border-2 border-gray-300 overflow-hidden shadow-lg bg-white h-[88vh] relative my-10">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Sidebar - Desktop and Mobile */}
        <div className={`h-screen md:h-[90vh]
          fixed md:static inset-y-0 left-0 z-50
          w-full md:w-1/3 lg:w-1/4
          transform transition-transform duration-300 ease-in-out
          md:transform-none md:border-r-2 border-gray-300 bg-white
          ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar
            rooms={rooms}
            loading={roomsLoading && rooms.length === 0}
            activeRoomId={roomId}
            viewerRole={viewerRole}
            currentUserId={viewerId}
          />
        </div>

        <div className="flex-1 flex flex-col h-[85vh] md:h-[90vh] w-full">
          {currentError && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-200">
              {currentError}
            </div>
          )}

          {!roomId || !activeRoom ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3.5 font-semibold text-xl text-center p-6">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden absolute top-4 left-4 p-2 bg-primary text-white rounded-lg shadow-lg hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <MessageCircleMore className="text-primary" size={80} />
              <span className="text-gray-800">Pick up where you left off</span>
              <p className="text-gray-500 font-medium text-base">
                Select one of your conversations to continue.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b-2 border-gray-300 flex items-center gap-3 bg-white shadow-sm">
                <button
                  className="md:hidden text-gray-600 p-2 hover:bg-gray-100 rounded-lg -ml-2"
                  onClick={() => setShowMobileSidebar(true)}
                  aria-label="Open conversations"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                <img
                  src={activePeerAvatar}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt={activePeerName}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <h2 className="text-base md:text-lg font-semibold truncate">{activePeerName}</h2>
                  {activeRoom?.curriculum?.title && (
                    <span className="text-xs text-gray-500 truncate">
                      {activeRoom.curriculum.title}
                    </span>
                  )}
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 space-y-3 p-4 overflow-y-auto bg-gray-50"
              >
                {isMessagesLoading ? (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Say hello to start the conversation.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderId =
                      msg?.userId?._id || msg?.userId || msg?.user?._id;
                    const isMine =
                      viewerIdRef.current &&
                      senderId &&
                      String(senderId) === String(viewerIdRef.current);
                    const lessonData = extractLessonData(msg);
                    const listingData = extractListingData(msg);
                    const quoteImagesInMessage = getMessageImages(msg);
                    const quoteStatus = msg?.quote?.status || "open";
                    const isDirectBookingCard = msg.type === "quote" && quoteStatus === "accepted" && !msg.quote?.requestMessageId;

                    return (
                      <div
                        key={msg._id || msg.createdAt}
                        className={`w-full flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-2xl px-3 py-2 md:px-3 md:py-3 shadow-sm ${
                            isMine
                              ? "bg-primary text-white rounded-br-sm"
                              : "bg-white text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          {msg.image && (
                            <img
                              src={msg.image.url || msg.image}
                              alt="Shared image"
                              className="rounded-lg max-w-full max-h-64 mb-2 cursor-pointer"
                              onClick={() =>
                                window.open(
                                  msg.image.url || msg.image,
                                  "_blank"
                                )
                              }
                            />
                          )}

                          {msg.type === "quote_request" && (
                            <div className="bg-white text-gray-900 rounded-xl p-3 border border-gray-200 mb-2 shadow-sm">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500">Quote request</p>
                                <p className="font-semibold text-sm">
                                  {msg.quoteRequest?.listingTitle || "Listing"}
                                </p>
                                {msg.quoteRequest?.selectedDate && (
                                  <p className="text-xs text-gray-600">
                                    Date: {msg.quoteRequest.selectedDate}
                                  </p>
                                )}
                                {msg.quoteRequest?.selectedTimes?.length > 0 && (
                                  <p className="text-xs text-gray-600">
                                    Time: {msg.quoteRequest.selectedTimes.join(", ")}
                                  </p>
                                )}
                                {msg.quoteRequest?.estimatedPrice !== undefined && !msg.quoteRequest?.selectedTimes?.length && (
                                  <p className="text-xs text-gray-600">
                                    Estimated price: {formatPrice(msg.quoteRequest.estimatedPrice, msg.quoteRequest.currency || "USD")}
                                  </p>
                                )}
                                {msg.quoteRequest?.description && (
                                  <p className="text-xs text-gray-700 whitespace-pre-line pt-1">
                                    {msg.quoteRequest.description}
                                  </p>
                                )}
                              </div>

                              {quoteImagesInMessage.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {quoteImagesInMessage.map((item) => (
                                    <img
                                      key={item.public_id || item.url}
                                      src={item.url || item}
                                      alt="Quote request"
                                      className="h-16 w-16 rounded-lg object-cover"
                                    />
                                  ))}
                                </div>
                              )}

                              {isViewerSeller && !isMine && (
                                <button
                                  type="button"
                                  onClick={() => openSendQuoteModal(msg)}
                                  className="mt-3 w-full rounded-full bg-primary px-4 py-2 text-xs font-medium text-white"
                                >
                                  Send a quote
                                </button>
                              )}
                            </div>
                          )}

                          {msg.type === "quote" && (
                            <div className="bg-white text-gray-900 rounded-2xl p-4 border border-gray-200 mb-2 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                    {isDirectBookingCard ? "Booking accepted" : "Quote offer"}
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold leading-tight">
                                    {formatPrice(msg.quote?.price ?? 0, msg.quote?.currency || "USD")}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    {isDirectBookingCard ? "Booking accepted" : quoteStatus === "accepted" ? "Quote accepted" : quoteStatus === "cancelled" ? "Quote cancelled" : " Review the offer details before checkout."}

                                   
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                                    quoteStatus === "accepted"
                                      ? "bg-green-100 text-green-700"
                                      : quoteStatus === "cancelled"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {quoteStatus}
                                </span>
                              </div>

                              {msg.quote?.description && (
                                <p className="mt-2 text-xs text-gray-700 whitespace-pre-line">
                                  {msg.quote.description}
                                </p>
                              )}

                              {quoteImagesInMessage.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {quoteImagesInMessage.map((item) => (
                                    <img
                                      key={item.public_id || item.url}
                                      src={item.url || item}
                                      alt="Quote"
                                      className="h-16 w-16 rounded-lg object-cover"
                                    />
                                  ))}
                                </div>
                              )}

                              {isViewerBuyer && (
                                <div className={`mt-4 grid gap-2 ${quoteStatus === "open" ? "grid-cols-2" : "grid-cols-1"}`}>
                                  {quoteStatus === "open" && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={sendMessageLoading}
                                        onClick={() => handleQuoteStatus(msg, "cancelled")}
                                        className="rounded-full border border-black bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-[0_3px_0_#ef4444] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#ef4444] disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={sendMessageLoading}
                                        onClick={() => handleAcceptQuote(msg)}
                                        className="rounded-full border border-black bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-[0_3px_0_#65a30d] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#65a30d] disabled:opacity-50"
                                      >
                                        Accept
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {isViewerSeller && isMine && quoteStatus === "open" && (
                                <button
                                  type="button"
                                  onClick={() => openEditQuoteModal(msg)}
                                  className="mt-4 w-full rounded-full border border-black bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow-[0_3px_0_#3b82f6] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_#3b82f6]"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}

                          {lessonData && (
                            <div className="bg-white text-gray-900 rounded-xl p-2 md:p-3 border border-gray-200 mb-2 shadow-sm">
                              <div className="flex gap-2 md:gap-3">
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                  <img
                                    src={
                                      lessonData.image ||
                                      "https://i.ibb.co/JFFpmtfn/user-icon-image-13.png"
                                    }
                                    alt={lessonData.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="space-y-0.5 md:space-y-1 flex-1 min-w-0">
                                  <p className="font-semibold text-xs md:text-sm line-clamp-2">
                                    {lessonData.title}
                                  </p>
                                  {lessonData.price !== undefined && (
                                    <p className="text-xs md:text-sm text-gray-600 font-medium">
                                      {formatPrice(lessonData.price)}
                                    </p>
                                  )}
                                  {lessonData.duration && (
                                    <p className="text-[10px] md:text-xs text-gray-500">
                                      Duration: {lessonData.duration}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleLessonNavigate(lessonData.id)}
                                className="mt-2 md:mt-3 w-full bg-primary text-white text-xs md:text-sm font-medium py-1.5 md:py-2 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Book Lesson
                              </button>
                            </div>
                          )}

                          {listingData && (
                            <div className="mb-2 rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-sm md:p-3">
                              <div className="flex gap-2 md:gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 md:h-16 md:w-16">
                                  <img
                                    src={
                                      listingData.image ||
                                      "https://i.ibb.co/tpV3m2GW/no-image.png"
                                    }
                                    alt={listingData.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1">
                                  <p className="line-clamp-2 text-xs font-semibold md:text-sm">
                                    {listingData.title}
                                  </p>
                                  {listingData.price !== undefined && (
                                    <p className="text-xs font-medium text-gray-600 md:text-sm">
                                      {formatPrice(
                                        listingData.price,
                                        listingData.currency || "USD"
                                      )}
                                    </p>
                                  )}
                                  {listingData.duration && (
                                    <p className="text-[10px] text-gray-500 md:text-xs">
                                      Duration: {listingData.duration}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleListingNavigate(listingData)}
                                className="mt-2 w-full rounded-md bg-primary py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 md:mt-3 md:py-2 md:text-sm"
                              >
                                View Listing
                              </button>
                            </div>
                          )}

                          {msg.message && !["quote_request", "quote"].includes(msg.type) && (
                            <div className="text-sm whitespace-pre-line">
                              {msg.message}
                            </div>
                          )}
                          <div className="mt-1 text-[11px] opacity-80 text-right">
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 md:p-4 border-t-2 border-gray-300 bg-white">
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 md:gap-3">
                  <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <ImageIcon size={20} className="text-gray-600 md:w-6 md:h-6" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={!roomId || sendMessageLoading}
                      ref={fileInputRef}
                    />
                  </label>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={message}
                      disabled={!roomId || sendMessageLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !sendDisabled) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      onChange={(e) => setMessage(e.target.value)}
                      className="h-10 md:h-11 w-full border border-gray-300 rounded-full px-4 pr-12 focus:outline-none focus:border-primary disabled:bg-gray-100 text-sm md:text-base"
                    />

                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 disabled:opacity-50 hover:scale-110 transition-transform"
                      onClick={handleSend}
                      disabled={sendDisabled}
                      aria-label="Send message"
                    >
                      <IoSendSharp size={18} className="text-primary md:w-5 md:h-5" />
                    </button>
                  </div>

                  {isViewerBuyer && (
                    <button
                      type="button"
                      onClick={openAskQuoteModal}
                      disabled={!roomId || sendMessageLoading}
                      className="shrink-0 inline-flex h-10 md:h-11 items-center justify-center rounded-full border border-gray-300 px-4 md:px-5 text-sm md:text-base font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      Request a quote
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <AskQuoteModal
        open={askQuoteModalOpen}
        description={askQuoteDescription}
        images={askQuoteImages}
        previews={askQuoteImagePreviews}
        listings={teacherListings}
        listingsLoading={teacherListingsLoading}
        selectedListingId={askQuoteSelectedListingId}
        selectedDate={askQuoteSelectedDate}
        selectedTimes={askQuoteSelectedTimes}
        weeklyAvailability={askQuoteWeeklyAvailability}
        dateAvailability={askQuoteDateAvailability}
        dateUnAvailability={dateUnAvailability}
        availabilityLoading={availabilityLoading}
        submitting={sendMessageLoading}
        teacherName={activePeer?.name}
        onClose={closeAskQuoteModal}
        onDescriptionChange={setAskQuoteDescription}
        onImagesChange={handleAskQuoteImagesChange}
        onRemoveImage={handleRemoveAskQuoteImage}
        onSelectListing={handleAskQuoteListingSelect}
        onSelectedDateChange={setAskQuoteSelectedDate}
        onToggleTime={handleToggleAskQuoteTime}
        onSubmit={handleSubmitAskQuote}
      />
      <QuoteModal
        open={quoteModal.open}
        mode={quoteModal.mode}
        form={quoteForm}
        supportedCurrencies={supportedCurrencies}
        images={quoteImages}
        previews={quoteImagePreviews}
        submitting={sendMessageLoading}
        onClose={closeQuoteModal}
        onFormChange={(field, value) =>
          setQuoteForm((current) => ({ ...current, [field]: value }))
        }
        onImagesChange={handleQuoteImagesChange}
        onRemoveImage={handleRemoveQuoteImage}
        onSubmit={handleSubmitQuote}
      />
    </MainLayout>
  );
}
