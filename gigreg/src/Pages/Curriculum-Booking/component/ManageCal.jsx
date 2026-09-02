import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CancelBooking, ReShaduleCurriLessonBooking, ReShaduleLessonBooking } from "../../../redux/reducers/BookingReducer";
import { toast } from "react-toastify";
import moment from "moment-timezone";
import { Clock, MapPin } from "lucide-react";

export function ManageCal({
  selectedDate,
  onSelect,
  selectedTime,
  onSelectTime,
  id,
  weeklyAvailability = {},
  dateAvailability = [],
  dateUnAvailability = [],
  teacherTimezone = teacherTimezone,
  type,
  price,
  myid,
  teacherData,
  location,
  duration,
  capacity: lessonCapacity = 0,
  isGroupLesson = false,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { lessonCalendarId } = useSelector((state) => state.availability);
  const today = new Date();
  // Set today's date with time at start of day (00:00:00) for accurate comparison
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [internalSelectedDate, setInternalSelectedDate] = useState(null);
  const [userTimezone, setUserTimezone] = useState("UTC");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [slotMetadata, setSlotMetadata] = useState({});
  const [bookingInfo, setBookingInfo] = useState({
    newDate: "",
    timezone: ""
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get user timezone
  useEffect(() => {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(userTz);
  }, []);

  // FIXED: Clear calendar when teacher or availability data changes
  useEffect(() => {
    setInternalSelectedDate(null);
    setAvailableTimes([]);
    setSlotMetadata({});
  }, [id, weeklyAvailability, dateAvailability, dateUnAvailability]);

  // Update available times when date changes
  useEffect(() => {
    if (internalSelectedDate) {
      updateAvailableTimes(internalSelectedDate);
    }
  }, [
    internalSelectedDate,
    weeklyAvailability,
    dateAvailability,
    dateUnAvailability,
    userTimezone,
  ]);

  // FIXED: Helper to create date at start of day (00:00:00)
  const createDateAtStartOfDay = (year, month, day) => {
    return new Date(year, month, day, 0, 0, 0, 0);
  };

  // FIXED: Check if date is in the past
  const isPastDate = (date) => {
    const dateToCheck = createDateAtStartOfDay(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    return dateToCheck < todayStart;
  };

  // FIXED: Get date in YYYY-MM-DD format consistently
  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // NEW: Function to convert time using moment-timezone (FIXED for accurate conversion)
  const convertTimeWithMoment = (timeStr, fromTimezone, toTimezone) => {
    try {
      // Parse the time in the FROM timezone (teacher's timezone)
      // Use a fixed reference date to avoid date-line issues
      const referenceDate = '2024-01-15'; // Use fixed date for consistent conversion
      const momentTime = moment.tz(`${referenceDate} ${timeStr}`, 'YYYY-MM-DD HH:mm', fromTimezone);
      
      // Convert to the TO timezone (user's timezone)
      const convertedTime = momentTime.tz(toTimezone);
      
      // Return in HH:mm format
      return convertedTime.format('HH:mm');
    } catch (error) {
      console.error('Error converting time:', error, timeStr, fromTimezone, toTimezone);
      return timeStr; // Return original if conversion fails
    }
  };

  // Helper to parse duration string to minutes
  const parseDurationToMinutes = (durationStr) => {
    if (!durationStr) return 30; // Default to 30 minutes
    
    // If it's already a number
    if (typeof durationStr === 'number') return durationStr;
    
    // Try to match "X hours Y mins" or similar patterns
    const hoursMatch = durationStr.match(/(\d+)\s*(?:h|hr|hour|hours)/i);
    const minsMatch = durationStr.match(/(\d+)\s*(?:m|min|mins|minutes)/i);
    
    let totalMinutes = 0;
    
    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }
    
    if (minsMatch) {
      totalMinutes += parseInt(minsMatch[1]);
    }
    
    // If no match found but it's a string number like "45"
    if (totalMinutes === 0 && !isNaN(parseInt(durationStr))) {
        // Check if it's just a number string
        const val = parseInt(durationStr);
        if (val > 0) totalMinutes = val;
    }

    return totalMinutes > 0 ? totalMinutes : 30;
  };

  const updateAvailableTimes = (date) => {
    const dayOfWeek = date.getDay().toString();
    const dateStr = getDateString(date);


    let times = [];
    let isDateSpecific = false;

    // NEW: Handle group slots that might be in dateUnAvailability
    // Some group slots appear in dateUnAvailability but should be shown if they have capacity
    const unavailableData = dateUnAvailability.find(d => d.date === dateStr);
    const unavailableSlots = unavailableData ? unavailableData.slots || [] : [];
    
    const revivedGroupSlots = [];
    const blockedSlots = [];
    
    unavailableSlots.forEach(slot => {
      // Check if this lesson has group booking by looking in the lessons array
      let isGroupForThisLesson = false;
      
      if (slot.lessons && Array.isArray(slot.lessons)) {
        const lessonEntry = slot.lessons.find(l => l.lesson === myid);
        if (lessonEntry) {
          isGroupForThisLesson = lessonEntry.lessonGroup || false;
        }
      }
      
      // If no lessons array exists, fall back to slot.group
      if (!slot.lessons || !Array.isArray(slot.lessons)) {
        isGroupForThisLesson = slot.group || false;
      }
      
      // Check if this is a group slot that should be revived
      // NEW: For Curriculum Booking (type === "curri"), do NOT revive group slots
      if (isGroupForThisLesson === true && type !== "curri") {
        const maxCapacity = slot.capacity || lessonCapacity || 10;
        const currentUsage = slot.usecapacity || 0;
        
        // Only revive if it matches our lesson AND has space
        if (slot.lessonId === myid && currentUsage < maxCapacity) {
      
          revivedGroupSlots.push(slot);
          return;
        }
      }
      // Otherwise it's a blocked slot
      blockedSlots.push(slot);
    });

    // Check date-specific availability first (skip available field check as requested)
    const dateSpecific = dateAvailability.find(avail => avail.date === dateStr);
    if (dateSpecific && dateSpecific.slots && dateSpecific.slots.length > 0) {
      isDateSpecific = true;
      // Merge revived slots with date specific slots
      const allSlots = [...dateSpecific.slots, ...revivedGroupSlots];
      times = generateTimeSlots(allSlots, dateStr, true, date, blockedSlots);
    } 
    // Check weekly availability (skip available field check as requested)
    else if (weeklyAvailability[dayOfWeek] && weeklyAvailability[dayOfWeek].slots && weeklyAvailability[dayOfWeek].slots.length > 0) {
      const weeklySlots = weeklyAvailability[dayOfWeek].slots || [];
      // Merge revived slots with weekly slots
      const allSlots = [...weeklySlots, ...revivedGroupSlots];
      times = generateTimeSlots(allSlots, dateStr, false, date, blockedSlots);
    }
    // If no standard availability but we have revived group slots, show them
    else if (revivedGroupSlots.length > 0) {
        times = generateTimeSlots(revivedGroupSlots, dateStr, true, date, blockedSlots);
    }

    setAvailableTimes(times);
  };

  const generateTimeSlots = (slots, dateStr, isDateSpecific, selectedDate, blockedSlots = []) => {
    const slotDuration = parseDurationToMinutes(duration);
    const allSlots = [];
    const metadataMap = {};
    
    // Get day name from selected date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = selectedDate ? dayNames[selectedDate.getDay()] : '';
    
    // Convert blocked slots to user timezone for comparison
    const unavailableSlotsInUserTz = blockedSlots.map(slot => ({
      start: convertTimeWithMoment(slot.start, teacherTimezone, userTimezone),
      end: convertTimeWithMoment(slot.end, teacherTimezone, userTimezone)
    }));
    
    slots.forEach(slot => {
      // NEW: Check if this lesson has group booking by looking in the lessons array
      let isGroupForThisLesson = false;
      
      if (slot.lessons && Array.isArray(slot.lessons)) {
        const lessonEntry = slot.lessons.find(l => l.lesson === myid);
        if (lessonEntry) {
          isGroupForThisLesson = lessonEntry.lessonGroup || false;
        }
      }
      
      // If no lessons array exists, fall back to slot.group
      if (!slot.lessons || !Array.isArray(slot.lessons)) {
        isGroupForThisLesson = slot.group || false;
      }
      
      // Filter group slots: Only show if usecapacity < capacity AND lessonId matches
      if (isGroupForThisLesson === true) {
        // NEW: For Curriculum Booking (type === "curri"), skip ALL group slots
        if (type === "curri") {
             return;
        }

        // NEW: If isGroupLesson is false, skip group slots (show only individual slots)
        if (!isGroupLesson) {
          return;
        }

        // Determine the max capacity for this slot
        // Priority: slot.capacity > lessonCapacity > default(10)
        const maxCapacity = slot.capacity || lessonCapacity || 10;
        const currentUsage = slot.usecapacity || 0;
        
        // Check if there's available capacity
        if (currentUsage >= maxCapacity) {
          return; // Skip this slot, it's at full capacity
        }

        // Check if lessonId matches (if lessonId exists on slot)
        if (slot.lessonId && slot.lessonId !== myid) {
          return; // Skip this slot, it's for a different lesson
        }
        
      }
      
      // NEW: If isGroupLesson is true, skip individual slots (only show group slots)
      if (isGroupLesson && isGroupForThisLesson !== true) {
        return;
      }
      
      // Convert to user timezone using moment-timezone
      const userStartTime = convertTimeWithMoment(slot.start, teacherTimezone, userTimezone);
      const userEndTime = convertTimeWithMoment(slot.end, teacherTimezone, userTimezone);
      
      
      const start = parseTime(userStartTime);
      const end = parseTime(userEndTime);
      
      if (start >= end) {
        return;
      }
      
      let current = new Date(start);
      
      while (current < end) {
        const time12h = formatTime12h(current);
        const currentTime = new Date(current);
        
        // Check if this time should be filtered out
        let shouldInclude = true;
        
        // Check if this time slot overlaps with any unavailable period (in user timezone)
        for (const unavailableSlot of unavailableSlotsInUserTz) {
          const unavailableStart = parseTime(unavailableSlot.start);
          const unavailableEnd = parseTime(unavailableSlot.end);
          
          // Create a slot starting at currentTime
          const slotStart = new Date(currentTime);
          const slotEnd = new Date(currentTime);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
          
          // Check for overlap between the time slot and unavailable period
          if (slotStart < unavailableEnd && slotEnd > unavailableStart) {
            shouldInclude = false;
            break;
          }
        }
        
        if (shouldInclude) {
          allSlots.push(time12h);
          // Store metadata for this time slot (use lesson-specific group info)
          if (!metadataMap[time12h] || isGroupForThisLesson) {
            // Prefer group slots if multiple slots exist for same time
            metadataMap[time12h] = {
              group: isGroupForThisLesson,
              capacity: slot.capacity || 0,
              usecapacity: slot.usecapacity || 0, // Store current bookings
              discount: slot.discount || 0,
              slotId: slot._id || null,
              lessonId: slot.lessonId || null,
              day: dayName,
              specific: isDateSpecific,
              slot: slot // Store full slot for reference
            };
          }
        }
        
        current.setMinutes(current.getMinutes() + slotDuration);
      }
    });
    
    // Update slot metadata state
    setSlotMetadata(metadataMap);
    
    return [...new Set(allSlots)].sort((a, b) => parseTime12h(a) - parseTime12h(b));
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const parseTime12h = (timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime12h = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isDateAvailable = (date) => {
    // FIXED: First check if date is in the past
    if (isPastDate(date)) {
      return false;
    }

    const dayOfWeek = date.getDay().toString();
    const dateStr = getDateString(date);

    // Check if date is in dateUnAvailability (completely unavailable)
    const isUnavailableDate = dateUnAvailability.find(d => 
      d.date === dateStr && d.unavailable === true
    );
    
    if (isUnavailableDate) {
      return false;
    }

    // Check date-specific availability
    const dateSpecific = dateAvailability.find(
      (avail) => avail.date === dateStr
    );
    if (dateSpecific) {
      // If date has unavailability slots but not marked as completely unavailable
      const unavailableData = dateUnAvailability.find(d => d.date === dateStr);
      if (unavailableData && unavailableData.slots && unavailableData.slots.length > 0) {
        // Check if there are any available slots after filtering
        const filteredSlots = filterUnavailableSlots(dateSpecific.slots, unavailableData.slots);
        return filteredSlots.length > 0;
      }
      return (
        !dateSpecific.unavailable &&
        dateSpecific.slots &&
        dateSpecific.slots.length > 0
      );
    }

    // Check weekly availability
    const weekly = weeklyAvailability[dayOfWeek];
    return (
      weekly && !weekly.unavailable && weekly.slots && weekly.slots.length > 0
    );
  };

  // Helper function to filter out unavailable slots
  const filterUnavailableSlots = (availableSlots, unavailableSlots) => {
    const filtered = [];
    
    availableSlots.forEach(availableSlot => {
      const availableStart = parseTime(availableSlot.start);
      const availableEnd = parseTime(availableSlot.end);
      
      // Check if this available slot overlaps with any unavailable slot
      let isBlocked = false;
      
      for (const unavailableSlot of unavailableSlots) {
        const unavailableStart = parseTime(unavailableSlot.start);
        const unavailableEnd = parseTime(unavailableSlot.end);
        
        // Check for overlap
        if (availableStart < unavailableEnd && availableEnd > unavailableStart) {
          isBlocked = true;
          break;
        }
      }
      
      if (!isBlocked) {
        filtered.push(availableSlot);
      }
    });
    
    return filtered;
  };

  const handleSelectDate = (day) => {
    // FIXED: Create date properly at start of day
    const date = createDateAtStartOfDay(year, currentMonth.getMonth(), day);
    
    // Double-check date is not in past and is available
    if (isPastDate(date) || !isDateAvailable(date)) return;

    setInternalSelectedDate(date);
    setSlotMetadata({}); // Clear metadata when date changes
    
    // FIXED: Pass the correct date string to parent
    const dateStr = getDateString(date);
    onSelect(dateStr);
    onSelectTime("");
  };

  const handleTimeSelect = (time) => {
    onSelectTime(time);

    if (internalSelectedDate) {
      const dateStr = getDateString(internalSelectedDate);
      const time24h = convert12to24(time);
      const metadata = slotMetadata[time];

      const bookingData = {
        newDate: `${dateStr} ${time24h}:00`,
        timezone: userTimezone,
        discount: metadata?.group ? (metadata.discount || 0) : 0,
        isGroup: metadata?.group || false,
        group: metadata?.group || false,
        global: false,
        slotId: metadata?.slotId || null,
        lessonId: metadata?.lessonId || null,
        day: metadata?.day || '',
        specific: metadata?.specific || false,
        calenderId: lessonCalendarId || null
      };
      
      // Add usecapacity only if it's a group lesson
      if (metadata?.group && metadata?.usecapacity !== undefined) {
        bookingData.usecapacity = metadata.usecapacity;
      }
      
      // 👉 Store in React state
      setBookingInfo(bookingData);

      // 👉 Also store in localStorage
      localStorage.setItem("bookingDateTime", JSON.stringify(bookingData));
    }
  };

  const convert12to24 = (time12h) => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const handleConfirmSchedule = () => {
    if (!internalSelectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }
    
    const bookId = localStorage.getItem("bookId");
    const type_val = localStorage.getItem("type");
    const curriculumId = searchParams.get("curiid"); // Get curriculum ID from URL
    
    if (!bookId) {
      toast.error("Booking ID not found");
      return;
    }
    
    if(type_val === "lesson"){
      // Use bookingInfo state which should have been updated in handleTimeSelect
      dispatch(ReShaduleLessonBooking({
        bookingId: bookId, 
        newDate: bookingInfo.newDate, 
        timezone: bookingInfo.timezone,
        group: bookingInfo.group || false,
        usecapacity: bookingInfo.usecapacity || 0
      })).then((res) => {
        if (res?.payload.status) {
          toast.success(res?.payload?.message);
          navigate('/profile')
        } else {
          toast.error(res?.payload);
        }
      });
    } else {
      // For curriculum, send curiid as query parameter
      const queryParam = curriculumId ? `?curiid=${curriculumId}` : '';
      dispatch(ReShaduleCurriLessonBooking({
        bookingId: bookId, 
        lId: id,
        newDate: bookingInfo.newDate, 
        timezone: bookingInfo.timezone,
      })).then((res) => {
        if (res?.payload.status) {
          toast.success(res?.payload?.message);
          navigate(`/profile${queryParam}`)
        } else {
          toast.error(res?.payload);
        }
      });
    }
  };



  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  const year = currentMonth.getFullYear();
  const firstDayOfMonth = new Date(year, currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, currentMonth.getMonth() + 1, 0).getDate();

  const handlePrevMonth = () => {
    const prevMonth = new Date(year, currentMonth.getMonth() - 1, 1);
    // Optional: Don't allow navigation to past months if you want
    // if (prevMonth.getMonth() < today.getMonth() && prevMonth.getFullYear() <= today.getFullYear()) return;
    setCurrentMonth(prevMonth);
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() + 1, 1));
  };

  const generateDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };


  const handleCancel = () => {
    const bookId = localStorage.getItem("bookId");
    
    if (!bookId) {
      toast.error("Booking ID not found");
      return;
    }
    
    dispatch(CancelBooking({ bookId: bookId, type: "lesson" })).then((res) => {
      if (res?.payload.status) {
        toast.success(res?.payload?.message);
         navigate('/profile')
      } else {
        toast.error(res?.payload);
      }
    });
  };

  return (
    <div className="w-full bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
      <div>
        <div className="flex items-center justify-center space-x-3 my-4 gap-1">
          <img
            src={
              teacherData?.image?.url ||
              "https://i.ibb.co/tpV3m2GW/no-image.png"
            }
            alt="instructor"
            className="h-12 w-12 md:h-12 md:w-12 rounded-full object-cover"
          />
          <p className="m-0">{teacherData?.name}</p>
          {teacherData?.averageRating > 0 && (
            <p className="text-base"> (
              {teacherData?.averageRating})
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:justify-center md:space-x-2 text-center md:text-left gap-2 mb-4">
          <div>
            <Clock className="inline-block mr-2 w-4 h-4 " />
            <span className="text-sm ">
              {duration}
            </span>
          </div>
          <div>
            <MapPin className="inline-block mr-2 w-4 h-4 " />
            <span className="text-sm ">
              {location}
            </span>
          </div>
        </div>
      </div>

      <h3 className="text-base md:text-lg font-semibold mb-4 text-center">
        Reschedule your lesson
      </h3>

      <div className="flex justify-between items-center mb-3">
        <button
          onClick={handlePrevMonth}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ‹
        </button>
        <p className="font-semibold">
          {monthName} {year}
        </p>
        <button
          onClick={handleNextMonth}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-600 mb-1">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-5">
        {generateDays().map((day, i) => {
          if (!day) return <div key={i} className="py-2"></div>;

          const date = createDateAtStartOfDay(year, currentMonth.getMonth(), day);
          const isPast = isPastDate(date);
          const isAvailable = isDateAvailable(date);
          const isSelected = internalSelectedDate && getDateString(date) === getDateString(internalSelectedDate);

          return (
            <div
              key={i}
              onClick={() => !isPast && isAvailable && handleSelectDate(day)}
              className={`py-2 rounded text-sm ${
                isPast
                  ? "text-gray-300 cursor-not-allowed bg-gray-100"
                  : !isAvailable
                  ? "text-gray-400 cursor-not-allowed bg-gray-100"
                  : isSelected
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-blue-100 cursor-pointer"
              }`}
              title={isPast ? "Past date" : !isAvailable ? "Not available" : ""}
            >
              {day}
            </div>
          );
        })}
      </div>

      <p className="font-medium text-sm mb-2">Pick a time {availableTimes.length > 0 && `(${availableTimes.length} available)`}</p>
      <div className="h-40 overflow-y-auto flex items-center justify-center w-full">
        {availableTimes.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 w-full h-40 overflow-y-auto">
            {availableTimes.map((time) => {
              const metadata = slotMetadata[time];
              const isGroup = metadata?.group;
              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`border rounded py-2 h-20 text-sm relative ${
                    selectedTime === time
                      ? isGroup
                        ? "bg-yellow-400 text-gray-900 border-yellow-500"
                        : "bg-primary text-white border-primary"
                      : isGroup
                      ? "bg-yellow-100 hover:bg-yellow-200 text-gray-800 border-yellow-300"
                      : "hover:bg-blue-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {isGroup && (
                    <span className="absolute top-0.5 left-0.5 right-0.5 text-[9px] font-semibold text-yellow-800 bg-yellow-300 px-1 rounded">
                      Group
                    </span>
                  )}
                  <span className={isGroup ? "mt-2 block" : ""}>{time}</span>
                  {isGroup && metadata?.usecapacity !== undefined && (
                    <span className="text-[8px] text-gray-600 block mt-0.5">
                      Booked: {metadata.usecapacity}
                    </span>
                  )}
                  {isGroup && metadata?.discount > 0 && (
                    <span className="text-[8px] text-gray-600 block">
                      -${metadata.discount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {internalSelectedDate ? "No available times" : "Select a date"}
          </div>
        )}
      </div>

      <button
        onClick={handleConfirmSchedule}
        disabled={!internalSelectedDate || !selectedTime}
        className={`w-full mt-6 py-2.5 rounded text-sm ${
          !internalSelectedDate || !selectedTime
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-primary text-white cursor-pointer"
        }`}
      >
        {(() => {
          const metadata = slotMetadata[selectedTime];
          const isGroup = metadata?.group;
          const discount = isGroup ? (metadata.discount || 0) : 0;
          const finalPrice = price ? Math.max(0, price - discount) : 0;
          
          if (!price) return "Reschedule Lesson";
          if (isGroup && discount > 0) {
            return `Reschedule Lesson ($${finalPrice.toFixed(2)}${discount > 0 ? ` - $${discount} off` : ''})`;
          }
          return `Reschedule Lesson`;
        })()}
      </button>
      
      <button
        onClick={handleCancel}
        className="w-full mt-2 py-2.5 rounded text-sm bg-red-500 hover:bg-red-700 text-white cursor-pointer"
      >
        Cancel Lesson
      </button>
    </div>
  );
}