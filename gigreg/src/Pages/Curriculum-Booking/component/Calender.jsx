import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { checkAvailablity, initiateBooking } from "../../../redux/reducers/BookingReducer";
import { toast } from "react-toastify";
import moment from "moment-timezone";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { useCurrency } from "../../../currency/CurrencyContext";

export function Calendar({ 
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
  myid,
  teacherData,
  location,
  duration,
  price,
  priceCurrency = "USD",
  capacity: lessonCapacity = 0, // Default to 0 if not provided
  discount  // Group price for group slots
}) {
  const { currency, formatPrice } = useCurrency();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { lessonCalendarId } = useSelector((state) => state.availability);
  const { userInfo } = useSelector((state) => state.auth);
  const today = new Date();
  // Set today's date with time at start of day (00:00:00) for accurate comparison
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [internalSelectedDate, setInternalSelectedDate] = useState(null);
  const [userTimezone, setUserTimezone] = useState("UTC");
  const [availableTimes, setAvailableTimes] = useState([]);
  // Store slot metadata for each time slot
  const [slotMetadata, setSlotMetadata] = useState({});

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
  }, [internalSelectedDate, weeklyAvailability, dateAvailability, dateUnAvailability, userTimezone]);

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

  const simpleConvertTime = (timeStr, fromTimezone, toTimezone) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create a date with the specific time
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // Format in from timezone to get the base time
    const fromDateStr = date.toLocaleString("en-US", { timeZone: fromTimezone });
    const fromDate = new Date(fromDateStr);
    
    // Format in to timezone to get converted time
    const toDateStr = fromDate.toLocaleString("en-US", { 
      timeZone: toTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Extract time
    const timePart = toDateStr.includes(',') ? toDateStr.split(', ')[1] : toDateStr;
    return timePart.replace(' AM', '').replace(' PM', '');
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
        const maxCapacity = lessonCapacity || 10;
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
    
    // Find the group price from the first group slot (to apply to all group slots at same time)
    let groupPriceMap = {}; // Map of time -> groupPrice for group slots
    slots.forEach(slot => {
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
      
      if (isGroupForThisLesson === true) {
        const effectiveGroupPrice = discount;
        if (effectiveGroupPrice > 0) {
        const userStartTime = convertTimeWithMoment(slot.start, teacherTimezone, userTimezone);
        const start = parseTime(userStartTime);
        let current = new Date(start);
        const userEndTime = convertTimeWithMoment(slot.end, teacherTimezone, userTimezone);
        const end = parseTime(userEndTime);
        
        while (current < end) {
          const time12h = formatTime12h(current);
          if (!groupPriceMap[time12h]) {
            groupPriceMap[time12h] = effectiveGroupPrice;
          }
          current.setMinutes(current.getMinutes() + slotDuration);
        }
        }
      }
    });
    
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

        // Determine the max capacity for this slot — always use lesson-level capacity
        const maxCapacity = lessonCapacity || 10;
        const currentUsage = slot.usecapacity || 0;
        
        // Check if there's available capacity
        if (currentUsage >= maxCapacity) {
          return; // Skip this slot, it's at full capacity - HIDE IT
        }

        // Check if lessonId matches (if lessonId exists on slot)
        if (slot.lessonId && slot.lessonId !== myid) {
          return; // Skip this slot, it's for a different lesson
        }
        
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
          
          // Create a 30-minute slot starting at currentTime
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
            // Use groupPrice from groupPriceMap if available (applies to all group slots at this time)
            const groupPrice = isGroupForThisLesson ? (groupPriceMap[time12h] || slot.discount || discount || 0) : 0;
            metadataMap[time12h] = {
              group: isGroupForThisLesson,
              capacity: lessonCapacity || 0,
              usecapacity: slot.usecapacity || 0,
              groupPrice: groupPrice,
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
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const parseTime12h = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime12h = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
    const dateSpecific = dateAvailability.find(avail => avail.date === dateStr);
    if (dateSpecific) {
      // If date has unavailability slots but not marked as completely unavailable
      const unavailableData = dateUnAvailability.find(d => d.date === dateStr);
      if (unavailableData && unavailableData.slots && unavailableData.slots.length > 0) {
        // Check if there are any available slots after filtering
        const filteredSlots = filterUnavailableSlots(dateSpecific.slots, unavailableData.slots);
        return filteredSlots.length > 0;
      }
      return !dateSpecific.unavailable && dateSpecific.slots && dateSpecific.slots.length > 0;
    }

    // Check weekly availability
    const weekly = weeklyAvailability[dayOfWeek];
    return weekly && !weekly.unavailable && weekly.slots && weekly.slots.length > 0;
  };

  // NEW: Helper function to filter out unavailable slots
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
      
      // Calculate if slot has available capacity
      const maxCapacity = lessonCapacity || 10;
      const currentUsage = metadata?.usecapacity || 0;
      const hasCapacity = currentUsage < maxCapacity;
      
      // Only use groupPrice if it's a group slot AND it has available capacity
      const groupPrice = metadata?.group && hasCapacity ? (metadata.groupPrice || 0) : 0;
      
      const bookingData = {
        newDate: `${dateStr} ${time24h}:00`,
        timezone: userTimezone,
        groupPrice: groupPrice,
        isGroup: metadata?.group || false,
        group: metadata?.group || false,
        global: false,
        slotId: metadata?.slotId || null,
        lessonId: metadata?.lessonId || null,
        day: metadata?.day || '',
        specific: metadata?.specific || false,
        calenderId: lessonCalendarId || null
      };
      
      // Add usecapacity only if it's a group lesson with capacity
      if (metadata?.group && hasCapacity && metadata?.usecapacity !== undefined) {
        bookingData.usecapacity = metadata.usecapacity;
      }
      
      localStorage.setItem('bookingDateTime', JSON.stringify(bookingData));
    }
  };

  const convert12to24 = (time12h) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleConfirmSchedule = async() => {
    // Validation first
    if (!internalSelectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const date = localStorage.getItem('bookingDateTime');
    if (!date) {
      toast.error('No booking data found');
      return;
    }

    try {
      const parsedData = JSON.parse(date);
      
      const response = await dispatch(checkAvailablity({ 
        lId: myid, 
        newDate: parsedData?.newDate, 
        timezone: userTimezone 
      })).unwrap();
      
      if (response?.status) {
        toast.success(response?.message);
        
        // Prepare booking data for Stripe
        const stripeData = {
          id: id,
          scheduledAt: parsedData?.newDate,
          firstname: userInfo?.name || "unknown",
          lastname: userInfo?.name || "unknown",
          country: userInfo?.country || "not added",
          type: type === "lesson" ? "lesson" : "curriculum",
          timezone: userTimezone,
          checkoutCurrency: currency,
        };

        // Initiate booking and redirect to Stripe
        const bookingResponse = await dispatch(initiateBooking(stripeData)).unwrap();
        
        if (bookingResponse?.status && bookingResponse?.url) {
          // Save booking ID for later confirmation
          localStorage.setItem("bookingId", bookingResponse?.bookingId);
          // Redirect directly to Stripe
          window.location.href = bookingResponse.url;
        } else {
          toast.error("Failed to initiate payment");
        }
      } else {
        toast.error(response?.message || 'Failed to confirm availability');
      }
    } catch (error) {
      toast.error(error?.message || 'An error occurred while confirming availability');
      console.error('Availability check error:', error);
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

  // Check if any dates in the current month have availability
  const hasAnyAvailableDatesInMonth = () => {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = createDateAtStartOfDay(year, currentMonth.getMonth(), d);
      if (!isPastDate(date) && isDateAvailable(date)) {
        return true;
      }
    }
    return false;
  };



  return (
    <div className="w-full rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">

      <div className="flex justify-between items-center mb-3">
        <p className="font-semibold text-xl">{monthName} {year}</p>
        <div>
        <button onClick={handlePrevMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"><ChevronLeft /></button>
        <button onClick={handleNextMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-600 mb-1">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border border-gray-300 rounded-xl text-center mb-5 overflow-hidden bg-white">
        {generateDays().map((day, i) => {
          if (!day) return <div key={i} className="py-2 border border-gray-300"></div>;

          const date = createDateAtStartOfDay(year, currentMonth.getMonth(), day);
          const isPast = isPastDate(date);
          const isAvailable = isDateAvailable(date);
          const isSelected = internalSelectedDate && getDateString(date) === getDateString(internalSelectedDate);

          return (
            <div
              key={i}
              onClick={() => !isPast && isAvailable && handleSelectDate(day)}
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
            </div>
          );
        })}
      </div>

      <div className="h-40 overflow-y-auto hide-scrollbar flex items-center justify-center w-full">
        {availableTimes.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 w-full h-40 overflow-y-auto hide-scrollbar">
            {availableTimes.map((time) => {
              const metadata = slotMetadata[time];
              const isGroup = metadata?.group;
              const maxCapacity = lessonCapacity || 10;
              const currentUsage = metadata?.usecapacity || 0;
              const hasCapacity = currentUsage < maxCapacity;
              const groupPrice = isGroup && hasCapacity ? (metadata.groupPrice || 0) : 0;
              
              // Check if time is in the past on today's date
              const isToday = internalSelectedDate && getDateString(internalSelectedDate) === getDateString(today);
              let isPastTime = false;
              if (isToday) {
                const [timeStr, modifier] = time.split(' ');
                const [hours, minutes] = timeStr.split(':').map(Number);
                const slotTime = new Date();
                slotTime.setHours(modifier === 'PM' && hours !== 12 ? hours + 12 : (modifier === 'AM' && hours === 12 ? 0 : hours), minutes, 0, 0);
                const now = new Date();
                isPastTime = slotTime < now;
              }
              
              const isDisabled = isPastTime;
              
              return (
                <button
                  key={time}
                  onClick={() => !isDisabled && handleTimeSelect(time)}
                  disabled={isDisabled}
                  className={`border rounded-2xl py-2 text-sm h-20 relative overflow-hidden ${
                    isDisabled
                      ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-50"
                      : selectedTime === time
                      ? isGroup
                        ? "bg-primary text-white border-primary/120"
                        : "bg-primary text-white border-primary"
                      : isGroup
                      ? "bg-primary/20 hover:bg-primary/40 text-gray-800 border-primary/70"
                      : "hover:bg-blue-100 text-gray-700 border-gray-300"
                  }`}
                >
                  {isGroup && (
                    <span className="absolute top-0 left-0 right-0 text-[9px] font-semibold text-white bg-primary px-1 ">
                      Group
                    </span>
                  )}
                  <span className={isGroup ? "mt-2 block" : ""}>{time}</span>
                  {isGroup && metadata?.usecapacity !== undefined && (
                    <span className="text-[8px] text-gray-600 block mt-0.5">
                      {currentUsage}/{maxCapacity} Booked
                    </span>
                  )}
                  {isGroup && hasCapacity && groupPrice > 0 && (
                    <span className="text-[8px] text-green-600 block font-semibold">
                      ${groupPrice}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
                {!internalSelectedDate 
          ? hasAnyAvailableDatesInMonth() 
            ? "Pick a date" 
            : "Sorry, this teacher is currently fully booked."
          : `Pick a time ${availableTimes.length > 0 && `(${availableTimes.length} available)`}`
        }
          </div>
        )}
      </div>

      <button
        onClick={handleConfirmSchedule}
        disabled={!internalSelectedDate || !selectedTime}
        className={`w-full mt-6 py-2.5 rounded-full text-sm ${
          !internalSelectedDate || !selectedTime
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-primary text-white cursor-pointer"
        }`}
      >
        {(() => {
          const metadata = slotMetadata[selectedTime];
          const isGroup = metadata?.group;
          const maxCapacity = lessonCapacity || 10;
          const currentUsage = metadata?.usecapacity || 0;
          const hasCapacity = currentUsage < maxCapacity;
          const groupPrice = isGroup && hasCapacity ? (metadata.groupPrice || 0) : 0;
          
          if (!price && !groupPrice) return "Book (Free)";
          if (isGroup && hasCapacity && groupPrice > 0) {
            return `Book (${formatPrice(groupPrice)})`;
          }
          return `Book (${formatPrice(price, priceCurrency)})`;
        })()}
      </button>
    </div>
  );
}
