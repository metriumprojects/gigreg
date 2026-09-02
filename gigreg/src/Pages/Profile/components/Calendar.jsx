import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, X } from "lucide-react"
import { useDispatch, useSelector } from "react-redux";
import {
  getAvailability,
  createAvailability,
  updateAvailability,
  updateCalendar,
  getLessonCalendarByUser,
  getLessonCalendarById,
} from "../../../redux/reducers/AvailabilityReducer";
import { toast } from "react-toastify";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Generate half-hour time options from 12:00 AM to 11:30 PM
const generateTimeOptions = () => {
  const times = [];
  times.push({ value: "12:00 AM", label: "12:00 AM" });
  times.push({ value: "12:30 AM", label: "12:30 AM" });
  for (let hour = 1; hour <= 11; hour++) {
    times.push({ value: `${hour}:00 AM`, label: `${hour}:00 AM` });
    times.push({ value: `${hour}:30 AM`, label: `${hour}:30 AM` });
  }
  times.push({ value: "12:00 PM", label: "12:00 PM" });
  times.push({ value: "12:30 PM", label: "12:30 PM" });
  for (let hour = 1; hour <= 11; hour++) {
    times.push({ value: `${hour}:00 PM`, label: `${hour}:00 PM` });
    times.push({ value: `${hour}:30 PM`, label: `${hour}:30 PM` });
  }
  return times;
};
const TIME_OPTIONS = generateTimeOptions();

// Convert "9:00 AM" to "09:00" (24-hour format)
const displayTimeTo24Hour = (timeStr) => {
  const parts = timeStr.trim().split(' ');
  const period = parts[1];
  const [hourStr, minStr] = parts[0].split(':');
  let hours = parseInt(hourStr, 10);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minStr}`;
};

export default function Home() {
  const dispatch = useDispatch();
  const {
    weeklyAvailability: reduxWeekly,
    dateAvailability: reduxDate,
    hasAvailability,
    timeZone,
    loading,
    updateCalendarLoading,
    userCalendars,
    calendarsLoading
  } = useSelector((state) => state.availability);

  const [weeklyAvailability, setWeeklyAvailability] = useState(reduxWeekly);
  const [dateAvailability, setDateAvailability] = useState(reduxDate);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10));
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [tempDateSlots, setTempDateSlots] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('me');
  const [selectedCalendarType, setSelectedCalendarType] = useState('default');
  const [calendarName, setCalendarName] = useState('');

  // Calendar modal time picker state
  const [dateInlineStart, setDateInlineStart] = useState("9:00 AM");
  const [dateInlineEnd, setDateInlineEnd] = useState("10:00 AM");

  // Pending slot state
  const [pendingWeeklySlot, setPendingWeeklySlot] = useState(null); // { dayIndex, start, end }
  const [pendingSlotError, setPendingSlotError] = useState("");

  useEffect(() => {
    dispatch(getAvailability());
    dispatch(getLessonCalendarByUser());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCalendar === 'me') {
      dispatch(getAvailability());
      setSelectedCalendarType('default');
      setCalendarName('');
    } else {
      dispatch(getLessonCalendarById({ id: selectedCalendar }));
      const selected = userCalendars.find(cal => cal._id === selectedCalendar);
      setSelectedCalendarType(selected?.type === 'curriculum' ? 'curriculum' : 'lesson');
      setCalendarName(selected?.name || '');
    }
  }, [selectedCalendar, dispatch]);

  useEffect(() => {
    setWeeklyAvailability(reduxWeekly);
    setDateAvailability(reduxDate);
  }, [reduxWeekly, reduxDate]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const convertTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const convertTo12Hour = (time) => {
    const [h] = time.split(":");
    const hour = Number.parseInt(h);
    if (hour === 0) return { hour: "12", period: "AM" };
    if (hour < 12) return { hour: String(hour), period: "AM" };
    if (hour === 12) return { hour: "12", period: "PM" };
    return { hour: String(hour - 12), period: "PM" };
  };

  const renderTimeSlot = (time) => {
    const { hour, period } = convertTo12Hour(time);
    return `${hour}:${time.split(":")[1]} ${period}`;
  };

  // ---- Weekly availability handlers ----
  const findFirstNonOverlappingSlot = (slots, duration = 60) => {
    for (let startMin = 0; startMin <= (24 * 60) - duration; startMin += 30) {
      const endMin = startMin + duration;
      const overlaps = slots.some(slot =>
        startMin < convertTimeToMinutes(slot.end) && endMin > convertTimeToMinutes(slot.start)
      );
      if (!overlaps) {
        const startHour = Math.floor(startMin / 60);
        const startMinute = startMin % 60;
        const endHour = Math.floor(endMin / 60);
        const endMinute = endMin % 60;
        return {
          start: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
          end: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`
        };
      }
    }
    return null;
  };

  const handleAddWeeklySlot = (dayIndex) => {
    if (pendingWeeklySlot && pendingWeeklySlot.dayIndex === dayIndex) {
      setPendingSlotError("Please save your current availability before adding a new one.");
      return;
    }
    setPendingSlotError("");
    setPendingWeeklySlot({ dayIndex, start: "09:00", end: "10:00" });
  };

  const handleSaveWeeklySlot = (dayIndex) => {
    if (!pendingWeeklySlot) return;
    const { start, end } = pendingWeeklySlot;
    const startMin = convertTimeToMinutes(start);
    const endMin = convertTimeToMinutes(end);
    if (endMin <= startMin) {
      toast.error("End time must be after start time!");
      return;
    }
    const slots = weeklyAvailability[dayIndex]?.slots || [];
    const hasOverlap = slots.some(slot =>
      startMin < convertTimeToMinutes(slot.end) && endMin > convertTimeToMinutes(slot.start)
    );
    if (hasOverlap) {
      toast.error("Time slot overlaps with existing slot!");
      return;
    }
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: [...prev[dayIndex].slots, { start, end }],
      },
    }));
    setPendingWeeklySlot(null);
    setPendingSlotError("");
  };

  const handlePendingSlotChange = (field, value) => {
    setPendingWeeklySlot(prev => ({ ...prev, [field]: displayTimeTo24Hour(value) }));
  };

  const handleUpdateWeeklySlot = (dayIndex, slotIndex, field, displayValue) => {
    const updatedValue = displayTimeTo24Hour(displayValue);
    const currentSlots = weeklyAvailability[dayIndex]?.slots || [];
    const updatedSlot = { ...currentSlots[slotIndex], [field]: updatedValue };
    const startMin = convertTimeToMinutes(updatedSlot.start);
    const endMin = convertTimeToMinutes(updatedSlot.end);

    if (endMin <= startMin) {
      toast.error("End time must be after start time!");
      return;
    }

    const hasOverlap = currentSlots.some((slot, index) => {
      if (index === slotIndex) return false;
      return startMin < convertTimeToMinutes(slot.end) && endMin > convertTimeToMinutes(slot.start);
    });

    if (hasOverlap) {
      toast.error("Time slot overlaps with existing slot!");
      return;
    }

    setWeeklyAvailability(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: prev[dayIndex].slots.map((slot, index) =>
          index === slotIndex ? updatedSlot : slot
        ),
      },
    }));
  };

  const handleDeleteWeeklySlot = (dayIndex, slotIndex) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], slots: prev[dayIndex].slots.filter((_, i) => i !== slotIndex) },
    }));
  };

  const handleToggleUnavailable = (dayIndex) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        unavailable: !prev[dayIndex].unavailable,
        slots: !prev[dayIndex].unavailable ? prev[dayIndex].slots : [],
      },
    }));
  };

  // ---- Date-specific availability handlers ----
  const handleOpenCalendarModal = () => {
    setShowCalendarModal(true);
    setSelectedDateForModal(null);
    setTempDateSlots([]);
    setDateInlineStart("9:00 AM");
    setDateInlineEnd("10:00 AM");
  };

  const handleAddTimeSlotToDate = () => {
    const start = displayTimeTo24Hour(dateInlineStart);
    const end = displayTimeTo24Hour(dateInlineEnd);
    const startMin = convertTimeToMinutes(start);
    const endMin = convertTimeToMinutes(end);

    if (endMin <= startMin) {
      toast.error("End time must be after start time!");
      return;
    }
    for (const slot of tempDateSlots) {
      if (startMin < convertTimeToMinutes(slot.end) && endMin > convertTimeToMinutes(slot.start)) {
        toast.error("Time slot overlaps with existing slot!");
        return;
      }
    }
    setTempDateSlots(prev => [...prev, { start, end }]);
    setDateInlineStart("9:00 AM");
    setDateInlineEnd("10:00 AM");
  };

  const handleSaveFromCalendarModal = () => {
    if (!selectedDateForModal) return;
    setDateAvailability(prev => {
      const existing = prev.find(d => d.date === selectedDateForModal);
      if (existing) return prev;
      if (tempDateSlots.length === 0)
        return [...prev, { date: selectedDateForModal, slots: [], unavailable: true }];
      return [...prev, { date: selectedDateForModal, slots: tempDateSlots, unavailable: false }];
    });
    setShowCalendarModal(false);
  };

  const handleDeleteDateSlot = (dateStr, slotIndex) => {
    setDateAvailability(prev =>
      prev.map(d => d.date === dateStr ? { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) } : d)
    );
  };

  const handleUpdateDateSlot = (dateStr, slotIndex, field, displayValue) => {
    const updatedValue = displayTimeTo24Hour(displayValue);
    const dateItem = dateAvailability.find(d => d.date === dateStr);
    const currentSlots = dateItem?.slots || [];
    const updatedSlot = { ...currentSlots[slotIndex], [field]: updatedValue };
    const startMin = convertTimeToMinutes(updatedSlot.start);
    const endMin = convertTimeToMinutes(updatedSlot.end);

    if (endMin <= startMin) {
      toast.error("End time must be after start time!");
      return;
    }

    const hasOverlap = currentSlots.some((slot, index) => {
      if (index === slotIndex) return false;
      return startMin < convertTimeToMinutes(slot.end) && endMin > convertTimeToMinutes(slot.start);
    });

    if (hasOverlap) {
      toast.error("Time slot overlaps with existing slot!");
      return;
    }

    setDateAvailability(prev =>
      prev.map(d =>
        d.date === dateStr
          ? {
            ...d,
            slots: d.slots.map((slot, index) => (index === slotIndex ? updatedSlot : slot)),
          }
          : d
      )
    );
  };

  const handleToggleDateUnavailable = (dateStr) => {
    setDateAvailability(prev =>
      prev.map(d =>
        d.date === dateStr ? { ...d, unavailable: !d.unavailable, slots: !d.unavailable ? d.slots : [] } : d
      )
    );
  };

  const handleRemoveTempSlot = (index) => {
    setTempDateSlots(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAvailability = async () => {
    const DAY_NAMES_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyHours = [];
    for (let i = 0; i < 7; i++) {
      const d = weeklyAvailability[i];
      if (d) weeklyHours.push({ day: DAY_NAMES_LIST[i], available: !d.unavailable, slots: d.slots || [] });
    }
    const dateSpecificHours = dateAvailability.map(item => ({
      date: item.date,
      available: !item.unavailable,
      slots: item.slots || []
    }));
    const availabilityData = {
      weeklyHours,
      dateSpecificHours,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    };

    if (selectedCalendar !== 'me' && selectedCalendar) {
      const updateData = { ...availabilityData };
      if (calendarName) updateData.name = calendarName;
      dispatch(updateCalendar({ id: selectedCalendar, calendarData: updateData })).then(res => {
        if (res?.payload?.status) {
          toast.success(res?.payload?.message || "Calendar updated successfully");
          dispatch(getLessonCalendarById({ id: selectedCalendar }));
          dispatch(getLessonCalendarByUser());
        } else {
          toast.error(res?.payload?.message || "Failed to update calendar");
        }
      });
    } else if (hasAvailability) {
      dispatch(updateAvailability(availabilityData)).then(res => {
        if (res?.payload?.status) {
          toast.success(res?.payload?.message || "Calendar updated successfully");
          dispatch(getAvailability());
        } else {
          toast.error(res?.payload?.message || "Failed to update");
        }
      });
    } else {
      dispatch(createAvailability(availabilityData)).then(res => {
        if (res?.payload?.status) {
          toast.success(res?.payload?.message || "Calendar created successfully");
          dispatch(getAvailability());
        } else {
          toast.error(res?.payload?.message || "Failed to create");
        }
      });
    }
  };

  const calendarDays = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const yearBase = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => String(yearBase - 1 + i));

  return (
    <main className="min-h-screen bg-white">
      <h2 className="text-[28px] font-medium mb-5 mt-7.5">Calendar</h2>
      <div className="max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT: WEEKLY HOURS */}
          <div className="space-y-6">

            {/* Calendar selector */}
            <div className="bg-[#F7F7F7] rounded-2xl p-4">
              <label className="block text-sm font-semibold mb-2 text-gray-900">Select calendar</label>
              <select
                value={selectedCalendar}
                onChange={e => setSelectedCalendar(e.target.value)}
                disabled={calendarsLoading}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
              >
                <option value="me">Default calendar</option>
                {userCalendars.map(calendar => {
                  const displayName = calendar?.name ||
                    (calendar?.type === 'curriculum' ? calendar?.curriculum?.title : calendar?.lesson?.title) ||
                    `Calendar - ${calendar._id.slice(-6)}`;
                  const truncated = displayName.length > 40 ? displayName.slice(0, 40) + '...' : displayName;
                  return <option key={calendar._id} value={calendar._id}>{truncated}</option>;
                })}
              </select>
            </div>

            {/* Calendar name field */}
            {selectedCalendar !== 'me' && (
              <div className="bg-[#F7F7F7] rounded-2xl p-4">
                <label className="block text-sm font-semibold mb-2 text-gray-900">Calendar name</label>
                <input
                  type="text"
                  value={calendarName}
                  onChange={e => setCalendarName(e.target.value)}
                  placeholder="Enter calendar name"
                  maxLength="100"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <p className="text-xs text-gray-500 mt-1">{calendarName.length}/100 characters</p>
              </div>
            )}

            <div>
              <h2 className="text-base font-semibold mb-1">Default calendar</h2>
              <p className="text-gray-500 text-sm">Changes to this calendar''s schedule will affect all lessons linked to it *</p>
            </div>

            {/* Day rows */}
            <div className="space-y-3">
              {DAY_NAMES.map((dayName, dayIndex) => (
                <div key={dayIndex} className="bg-[#F7F7F7] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{dayName}</p>
                    <label className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Not available</span>
                      <input
                        type="checkbox"
                        checked={weeklyAvailability[dayIndex].unavailable}
                        onChange={() => handleToggleUnavailable(dayIndex)}
                        className="h-3 w-3 accent-black"
                      />
                    </label>
                  </div>

                  {!weeklyAvailability[dayIndex].unavailable && (
                    <div className="mt-3 space-y-2">
                      {/* Existing slots */}
                      {weeklyAvailability[dayIndex].slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <select
                              value={renderTimeSlot(slot.start)}
                              onChange={e => handleUpdateWeeklySlot(dayIndex, slotIndex, "start", e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                            >
                              {TIME_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <select
                              value={renderTimeSlot(slot.end)}
                              onChange={e => handleUpdateWeeklySlot(dayIndex, slotIndex, "end", e.target.value)}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                            >
                              {TIME_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleDeleteWeeklySlot(dayIndex, slotIndex)}
                            className="text-[11px] text-gray-400 hover:text-red-500 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      
                      {/* Pending slot */}
                      {pendingWeeklySlot?.dayIndex === dayIndex && (
                        <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg text-sm text-yellow-800">
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <select
                                value={renderTimeSlot(pendingWeeklySlot.start)}
                                onChange={e => handlePendingSlotChange("start", e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                              >
                                {TIME_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <select
                                value={renderTimeSlot(pendingWeeklySlot.end)}
                                onChange={e => handlePendingSlotChange("end", e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                              >
                                {TIME_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => handleSaveWeeklySlot(dayIndex)}
                              className="px-3 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium"
                            >
                              Save
                            </button>
                          </div>
                          {pendingSlotError && <p className="text-xs text-red-500 mt-2">{pendingSlotError}</p>}
                        </div>
                      )}

                      <button
                        onClick={() => handleAddWeeklySlot(dayIndex)}
                        className="mt-1 text-sm text-gray-500 hover:text-gray-900 font-medium"
                      >
                        + Add availability
                      </button>

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: DATE-SPECIFIC HOURS */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Custom day availability</h2>
              <button
                onClick={handleOpenCalendarModal}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-900 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {dateAvailability.length > 0 && (
              <div className="space-y-4">
                {dateAvailability.map(dateItem => {
                  const dateObj = new Date(dateItem.date);
                  return (
                    <div key={dateItem.date} className="bg-[#F7F7F7] rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {dateObj.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <label className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Not available</span>
                          <input
                            type="checkbox"
                            checked={dateItem.unavailable}
                            onChange={() => handleToggleDateUnavailable(dateItem.date)}
                            className="h-4 w-4 accent-black"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <select value={String(dateObj.getDate()).padStart(2, "0")} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                          {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={MONTHS[dateObj.getMonth()]} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={String(dateObj.getFullYear())} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>

                      {!dateItem.unavailable && (
                        <div className="mt-3 space-y-2">
                          {dateItem.slots.map((slot, slotIndex) => (
                            <div key={slotIndex} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <select
                                  value={renderTimeSlot(slot.start)}
                                  onChange={e => handleUpdateDateSlot(dateItem.date, slotIndex, "start", e.target.value)}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                                >
                                  {TIME_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={renderTimeSlot(slot.end)}
                                  onChange={e => handleUpdateDateSlot(dateItem.date, slotIndex, "end", e.target.value)}
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                                >
                                  {TIME_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <button onClick={() => handleDeleteDateSlot(dateItem.date, slotIndex)} className="text-[11px] text-gray-400 hover:text-red-500 shrink-0">
                                Remove
                              </button>
                            </div>
                          ))}
                          <div className="flex justify-end">
                            <button onClick={() => setDateAvailability(prev => prev.filter(d => d.date !== dateItem.date))} className="text-sm text-gray-400 hover:text-red-500">
                              Remove date
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">Time Zone: {timeZone}</div>
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={(loading || updateCalendarLoading) || !selectedCalendar}
          className="px-6 py-2 bg-black text-white rounded hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mt-6"
        >
          {(loading || updateCalendarLoading) ? "Saving..." : "Save Availability"}
        </button>

        {/* CALENDAR MODAL - custom date availability */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[94vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Calendar grid */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Date</h3>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 rounded">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((day, i) => <div key={i} className="text-center text-xs font-semibold text-gray-400 py-2">{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const dateStr = day ? formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : null;
                      return (
                        <button
                          key={index}
                          onClick={() => day && setSelectedDateForModal(dateStr)}
                          disabled={!day}
                          className={`p-2 text-sm aspect-square rounded transition-colors ${!day ? "bg-transparent cursor-default" : selectedDateForModal === dateStr ? "bg-black text-white font-medium" : "bg-gray-100 hover:bg-gray-200"}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {selectedDateForModal
                      ? new Date(selectedDateForModal).toLocaleDateString("en-US", { weekday: 'short', month: "short", day: "numeric" })
                      : "Select a date"}
                  </h3>

                  {selectedDateForModal ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Time</label>
                          <select
                            value={dateInlineStart}
                            onChange={e => setDateInlineStart(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
                          >
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Time</label>
                          <select
                            value={dateInlineEnd}
                            onChange={e => setDateInlineEnd(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
                          >
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={handleAddTimeSlotToDate}
                          className="w-full px-3 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add Time Slot
                        </button>
                      </div>

                      {tempDateSlots.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium block text-gray-700">Added Time Slots</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {tempDateSlots.map((slot, index) => (
                              <div key={index} className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium">{renderTimeSlot(slot.start)} - {renderTimeSlot(slot.end)}</span>
                                </div>
                                <button onClick={() => handleRemoveTempSlot(index)} className="p-1 hover:bg-red-100 rounded transition-colors">
                                  <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">Select a date to set availability</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowCalendarModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFromCalendarModal}
                      disabled={!selectedDateForModal || tempDateSlots.length === 0}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
