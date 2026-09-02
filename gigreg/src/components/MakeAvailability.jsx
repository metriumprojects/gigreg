import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, RotateCcw, Trash, X } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { getLessonCalendarByUser, getLessonCalendarById } from "../redux/reducers/AvailabilityReducer"
import { toast } from "react-toastify"

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour24 = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const label = `${hour12}:${minute} ${period}`;
  return { value: label, label };
})

const TimeSelect = ({ value, onChange, options, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-black bg-white ${className}`}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Calendar Display Component - Read-only view of calendar
const CalendarDisplay = ({ weeklyAvailability = {}, dateAvailability = [], isEditable = false, isGroupEditable = false, onAddWeeklyTime, onOpenCalendarModal, onDeleteSlot, onToggleUnavailable, onDeleteDate, onToggleDateUnavailable, isGroupAvailable = true, setWeeklyAvailability, setDateAvailability, onUpdateWeeklySlot, onUpdateDateSlot, lessonId = null, pendingWeeklySlot, setPendingWeeklySlot, pendingSlotError, setPendingSlotError }) => {
  const renderTimeSlot = (time) => {
    const [h] = time.split(":")
    const hour = Number.parseInt(h)
    if (hour === 0) return `12:${time.split(":")[1]} AM`
    if (hour < 12) return `${hour}:${time.split(":")[1]} AM`
    if (hour === 12) return `12:${time.split(":")[1]} PM`
    return `${hour - 12}:${time.split(":")[1]} PM`
  }

  const displayTimeTo24Hour = (timeStr) => {
    const parts = timeStr.trim().split(" ")
    const period = parts[1]
    const [hourStr, minStr] = parts[0].split(":")
    let hours = parseInt(hourStr, 10)
    if (period === "PM" && hours !== 12) hours += 12
    if (period === "AM" && hours === 12) hours = 0
    return `${String(hours).padStart(2, "0")}:${minStr}`
  }

  // Helper function to determine if slot is group for current lesson
  // After initialization, slot.group is always the source of truth for the current value
  const isSlotGroupForLesson = (slot) => {
    // slot.group is set during initialization from the correct per-lesson value
    // and updated by the dropdown onChange handler, so it's always the source of truth
    return slot.group ?? false;
  }

  const MONTHS_LIST = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const dayOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"))
  const yearBase = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, i) => String(yearBase - 1 + i))

  return (
    <div className="grid grid-cols-1  gap-8">
      {/* LEFT COLUMN: WEEKLY HOURS */}
      <div className="space-y-6">

        <div className="space-y-3">
          {DAY_NAMES.map((dayName, dayIndex) => (
            <div key={dayIndex} className="bg-[#F7F7F7] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{dayName}</p>
                {isEditable && (
                  <label className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Not available</span>
                    <input
                      type="checkbox"
                      checked={weeklyAvailability[dayIndex]?.unavailable || false}
                      onChange={() => onToggleUnavailable && onToggleUnavailable(dayIndex)}
                      className="h-3 w-3 accent-black"
                    />
                  </label>
                )}
              </div>

              {weeklyAvailability[dayIndex]?.unavailable ? (
                <p className="text-sm text-gray-500 mt-2">Unavailable</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {(weeklyAvailability[dayIndex]?.slots || []).map((slot, slotIndex) => (
                    <div key={slotIndex}>
                      <div className="grid grid-cols-3 gap-3">
                        {isEditable ? (
                          <select
                            value={renderTimeSlot(slot.start)}
                            onChange={(e) => onUpdateWeeklySlot && onUpdateWeeklySlot(dayIndex, slotIndex, "start", displayTimeTo24Hour(e.target.value))}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                          >
                            {TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                            {renderTimeSlot(slot.start)}
                          </div>
                        )}
                        {isEditable ? (
                          <select
                            value={renderTimeSlot(slot.end)}
                            onChange={(e) => onUpdateWeeklySlot && onUpdateWeeklySlot(dayIndex, slotIndex, "end", displayTimeTo24Hour(e.target.value))}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                          >
                            {TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                            {renderTimeSlot(slot.end)}
                          </div>
                        )}
                        {(isEditable || isGroupEditable) ? (
                          <select
                            value={isSlotGroupForLesson(slot) ? "group" : "oneone"}
                            onChange={(e) => {
                              const newGroup = e.target.value === "group";
                              setWeeklyAvailability((prev) => ({
                                ...prev,
                                [dayIndex]: {
                                  ...prev[dayIndex],
                                  slots: prev[dayIndex].slots.map((s, i) =>
                                    i === slotIndex ? { ...s, group: newGroup } : s
                                  ),
                                },
                              }));
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                          >
                            <option value="oneone">1:1</option>
                            <option value="group" disabled={!isGroupAvailable}>Group</option>
                          </select>
                        ) : (
                          <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                            {isSlotGroupForLesson(slot) ? "Group" : "1:1"}
                          </div>
                        )}
                      </div>

                      {isEditable && (
                        <div className="flex items-center justify-end mt-2">
                          <button
                            onClick={() => onDeleteSlot && onDeleteSlot(dayIndex, slotIndex)}
                            className="text-[11px] text-gray-500 hover:text-gray-900"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pending slot */}
                  {isEditable && pendingWeeklySlot?.dayIndex === dayIndex && (
                    <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg text-sm text-yellow-800">
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <select
                            value={(() => {
                              const h = parseInt(pendingWeeklySlot.start.split(':')[0], 10);
                              const m = pendingWeeklySlot.start.split(':')[1];
                              const period = h >= 12 ? 'PM' : 'AM';
                              const h12 = h % 12 === 0 ? 12 : h % 12;
                              return `${h12}:${m} ${period}`;
                            })()}
                            onChange={e => {
                              const parts = e.target.value.trim().split(' ');
                              const period = parts[1];
                              const [hStr, mStr] = parts[0].split(':');
                              let h = parseInt(hStr, 10);
                              if (period === 'PM' && h !== 12) h += 12;
                              if (period === 'AM' && h === 12) h = 0;
                              setPendingWeeklySlot(prev => ({ ...prev, start: `${String(h).padStart(2,'0')}:${mStr}` }));
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            value={(() => {
                              const h = parseInt(pendingWeeklySlot.end.split(':')[0], 10);
                              const m = pendingWeeklySlot.end.split(':')[1];
                              const period = h >= 12 ? 'PM' : 'AM';
                              const h12 = h % 12 === 0 ? 12 : h % 12;
                              return `${h12}:${m} ${period}`;
                            })()}
                            onChange={e => {
                              const parts = e.target.value.trim().split(' ');
                              const period = parts[1];
                              const [hStr, mStr] = parts[0].split(':');
                              let h = parseInt(hStr, 10);
                              if (period === 'PM' && h !== 12) h += 12;
                              if (period === 'AM' && h === 12) h = 0;
                              setPendingWeeklySlot(prev => ({ ...prev, end: `${String(h).padStart(2,'0')}:${mStr}` }));
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const { start, end } = pendingWeeklySlot;
                            const startMin = parseInt(start.split(':')[0], 10) * 60 + parseInt(start.split(':')[1], 10);
                            const endMin = parseInt(end.split(':')[0], 10) * 60 + parseInt(end.split(':')[1], 10);
                            if (endMin <= startMin) { toast.error('End time must be after start time!'); return; }
                            const slots = weeklyAvailability[dayIndex]?.slots || [];
                            const hasOverlap = slots.some(s => {
                              const sMin = parseInt(s.start.split(':')[0],10)*60+parseInt(s.start.split(':')[1],10);
                              const eMin = parseInt(s.end.split(':')[0],10)*60+parseInt(s.end.split(':')[1],10);
                              return startMin < eMin && endMin > sMin;
                            });
                            if (hasOverlap) { toast.error('Time slot overlaps with existing slot!'); return; }
                            setWeeklyAvailability(prev => ({
                              ...prev,
                              [dayIndex]: { ...prev[dayIndex], slots: [...(prev[dayIndex]?.slots || []), { start, end, group: false, capacity: 0, discount: 0 }] }
                            }));
                            setPendingWeeklySlot(null);
                            setPendingSlotError('');
                          }}
                          className="px-3 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium"
                        >
                          Save
                        </button>
                      </div>
                      {pendingSlotError && <p className="text-xs text-red-500 mt-2">{pendingSlotError}</p>}
                    </div>
                  )}

                  {isEditable && (
                    <button
                      onClick={() => {
                        if (pendingWeeklySlot?.dayIndex === dayIndex) {
                          setPendingSlotError('Please save your current availability before adding a new one.');
                          return;
                        }
                        setPendingSlotError('');
                        setPendingWeeklySlot({ dayIndex, start: '09:00', end: '10:00' });
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Add availability +
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: DATE-SPECIFIC HOURS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Custom day availability</h2>
          {isEditable && (
            <button
              onClick={onOpenCalendarModal}
              className="px-4 py-2 rounded-full bg-gray-100 text-gray-900 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>

        {dateAvailability.length > 0 && (
          <div className="space-y-4">
            {dateAvailability.map((dateItem) => {
              const dateObj = new Date(dateItem.date)
              const dayVal = String(dateObj.getDate()).padStart(2, "0")
              const monthVal = MONTHS_LIST[dateObj.getMonth()]
              const yearVal = String(dateObj.getFullYear())

              return (
                <div key={dateItem.date} className="bg-[#F7F7F7] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {dateObj.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    {isEditable && (
                      <label className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Not available</span>
                        <input
                          type="checkbox"
                          checked={dateItem.unavailable || false}
                          onChange={() => onToggleDateUnavailable && onToggleDateUnavailable(dateItem.date)}
                          className="h-4 w-4 accent-black"
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <select value={dayVal} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                      {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={monthVal} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                      {MONTHS_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={yearVal} disabled className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                      {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {!dateItem.unavailable && (
                    <div className="mt-3 space-y-3">
                      {(dateItem.slots || []).map((slot, slotIndex) => (
                        <div key={slotIndex}>
                          <div className="grid grid-cols-2 gap-3">
                            {isEditable ? (
                              <select
                                value={renderTimeSlot(slot.start)}
                                onChange={(e) => onUpdateDateSlot && onUpdateDateSlot(dateItem.date, slotIndex, "start", displayTimeTo24Hour(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                              >
                                {TIME_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                                {renderTimeSlot(slot.start)}
                              </div>
                            )}
                            {isEditable ? (
                              <select
                                value={renderTimeSlot(slot.end)}
                                onChange={(e) => onUpdateDateSlot && onUpdateDateSlot(dateItem.date, slotIndex, "end", displayTimeTo24Hour(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                              >
                                {TIME_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
                                {renderTimeSlot(slot.end)}
                              </div>
                            )}
                          </div>
                          {(isEditable || isGroupEditable) ? (
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              <select
                                value={isSlotGroupForLesson(slot) ? "group" : "oneone"}
                                onChange={(e) => {
                                  const newGroup = e.target.value === "group";
                                  setDateAvailability((prev) =>
                                    prev.map((d) =>
                                      d.date === dateItem.date
                                        ? {
                                            ...d,
                                            slots: d.slots.map((s, i) =>
                                              i === slotIndex ? { ...s, group: newGroup } : s
                                            ),
                                          }
                                        : d
                                    )
                                  );
                                }}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                              >
                                <option value="oneone">1:1</option>
                                <option value="group" disabled={!isGroupAvailable}>Group</option>
                              </select>
                              {isEditable && (
                              <button
                                onClick={() => onDeleteSlot && onDeleteSlot(dateItem.date, slotIndex)}
                                className="text-sm text-gray-500 hover:text-gray-900 col-span-2"
                              >
                                Remove
                              </button>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 mt-2">
                              {isSlotGroupForLesson(slot) ? "Group" : "1:1"}
                            </div>
                          )}
                        </div>
                      ))}

                      {isEditable && (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={onOpenCalendarModal}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Add availability +
                          </button>
                          <button
                            onClick={() => onDeleteDate && onDeleteDate(dateItem.date)}
                            className="text-sm text-gray-500 hover:text-gray-900"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
};

export default function MakeAvailability({ onChange, customOnly = false, availabilityData = {}, isReadOnly = false, isGroupAvailable = true, lessonId = null, onAvailabilityChange = null, onSelectionChange = null }) {
  const dispatch = useDispatch();
  const availabilityState = useSelector((state) => state.availability || {});
  const { 
    userCalendars = [], 
    weeklyAvailability: reduxWeeklyAvailability = {}, 
    dateAvailability: reduxDateAvailability = [],
    selectedCalendarId
  } = availabilityState;

  // Initialize weekly availability
  const initializeWeeklyAvailability = () => {
    const initial = {};
    for (let i = 0; i < 7; i++) {
      initial[i] = { unavailable: false, slots: [] };
    }
    return initial;
  };

  // Calendar selection: 'default' | 'custom' | specific calendar ID
  const [calendarMode, setCalendarMode] = useState(customOnly ? 'custom' : 'default')
  const [selectedExistingCalendarId, setSelectedExistingCalendarId] = useState('')

  // Custom calendar state (only used when calendarMode === 'custom')
  const [calendarName, setCalendarName] = useState('My Calendar')
  const [editableExistingCalendarName, setEditableExistingCalendarName] = useState('')
  const [weeklyAvailability, setWeeklyAvailability] = useState(initializeWeeklyAvailability());
  const [dateAvailability, setDateAvailability] = useState([]);

  // Local editable copies for default/existing calendars (so user can change group per slot)
  const [editableWeeklyAvailability, setEditableWeeklyAvailability] = useState(null);
  const [editableDateAvailability, setEditableDateAvailability] = useState(null);

  // Editable copies for availabilityData passed via props (used in UpdateLesson)
  const [propsInitialized, setPropsInitialized] = useState(false);

  // State for displaying selected calendar's data
  const [displayCalendarData, setDisplayCalendarData] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [tempTime, setTempTime] = useState({
    startHour: "09",
    startMin: "00",
    startPeriod: "AM",
    endHour: "12",
    endMin: "00",
    endPeriod: "PM",
    group: false,
    capacity: 1,
    discount: 0,
  })
  const [selectedDateForModal, setSelectedDateForModal] = useState(null)
  const [tempDateSlots, setTempDateSlots] = useState([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupModalData, setGroupModalData] = useState({ type: null, dayIndex: null, slotIndex: null, dateStr: null })
  const [groupSettings, setGroupSettings] = useState({ capacity: 1, discount: 0 })

  // Pending slot state (for the "+ Add availability" inline UI)
  const [pendingWeeklySlot, setPendingWeeklySlot] = useState(null) // { dayIndex, start, end }
  const [pendingSlotError, setPendingSlotError] = useState('')

  // Fetch user calendars on mount
  useEffect(() => {
    dispatch(getLessonCalendarByUser());
    dispatch(getLessonCalendarById(null)); // Fetch default calendar
  }, [dispatch]);

  // Fetch selected existing calendar data
  useEffect(() => {
    if (selectedExistingCalendarId) {
      dispatch(getLessonCalendarById({id:selectedExistingCalendarId}));
      // Find the calendar in userCalendars and set its name for editing
      const selectedCal = userCalendars.find(cal => cal._id === selectedExistingCalendarId);
      if (selectedCal) {
        setEditableExistingCalendarName(selectedCal.name || 'Calendar');
      }
    }
  }, [selectedExistingCalendarId, dispatch, userCalendars]);

  // Get calendar data to display based on mode
  useEffect(() => {
    if (calendarMode === 'default') {
      // Create local editable copy from Redux data (deep clone slots so group edits don't mutate Redux)
      const editableWeekly = {};
      for (let i = 0; i < 7; i++) {
        const dayData = reduxWeeklyAvailability[i];
        editableWeekly[i] = dayData ? {
          ...dayData,
          slots: (dayData.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        } : { unavailable: true, slots: [] };
      }
      setEditableWeeklyAvailability(editableWeekly);
      setEditableDateAvailability(
        (reduxDateAvailability || []).map(d => ({
          ...d,
          slots: (d.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        }))
      );
      setDisplayCalendarData({
        weeklyAvailability: editableWeekly,
        dateAvailability: (reduxDateAvailability || []).map(d => ({
          ...d,
          slots: (d.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        })),
      });
    } else if (calendarMode === 'existing' && selectedExistingCalendarId) {
      // Create local editable copy from Redux data for existing calendar
      const editableWeekly = {};
      for (let i = 0; i < 7; i++) {
        const dayData = reduxWeeklyAvailability[i];
        editableWeekly[i] = dayData ? {
          ...dayData,
          slots: (dayData.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        } : { unavailable: true, slots: [] };
      }
      setEditableWeeklyAvailability(editableWeekly);
      setEditableDateAvailability(
        (reduxDateAvailability || []).map(d => ({
          ...d,
          slots: (d.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        }))
      );
      setDisplayCalendarData({
        weeklyAvailability: editableWeekly,
        dateAvailability: (reduxDateAvailability || []).map(d => ({
          ...d,
          slots: (d.slots || []).map(s => ({ ...s, group: s.group ?? false }))
        })),
      });
    } else if (calendarMode === 'custom') {
      // Show custom calendar builder data
      setEditableWeeklyAvailability(null);
      setEditableDateAvailability(null);
      setDisplayCalendarData({
        weeklyAvailability: weeklyAvailability,
        dateAvailability: dateAvailability,
      });
    }
  }, [calendarMode, selectedExistingCalendarId, weeklyAvailability, dateAvailability, reduxWeeklyAvailability, reduxDateAvailability]);

  // Keep displayCalendarData in sync with editable copies when user changes group flags
  useEffect(() => {
    if ((calendarMode === 'default' || calendarMode === 'existing') && editableWeeklyAvailability) {
      setDisplayCalendarData({
        weeklyAvailability: editableWeeklyAvailability,
        dateAvailability: editableDateAvailability || [],
      });
    }
  }, [editableWeeklyAvailability, editableDateAvailability]);

  // Helper: get the correct group value for a slot, prioritizing per-lesson lessonGroup when lessonId is available
  const getSlotGroupValue = (slot) => {
    if (lessonId && slot.lessons && Array.isArray(slot.lessons)) {
      const lessonEntry = slot.lessons.find(l => 
        l.lesson === lessonId || l.lesson?.toString() === lessonId || l.lesson?._id === lessonId
      );
      if (lessonEntry) {
        return lessonEntry.lessonGroup ?? false;
      }
    }
    return slot.group ?? slot.slotGroup ?? false;
  };

  // Initialize main state from availabilityData props ONCE (for UpdateLesson mode)
  useEffect(() => {
    if (!isReadOnly && onAvailabilityChange && availabilityData && !propsInitialized) {
      const weekly = availabilityData.weeklyAvailability || {};
      const hasData = Object.keys(weekly).some(k => weekly[k]?.slots?.length > 0);
      const hasDateData = (availabilityData.dateAvailability || []).length > 0;
      if (!hasData && !hasDateData) return;
      
      const editableWeekly = {};
      for (let i = 0; i < 7; i++) {
        const dayData = weekly[i];
        editableWeekly[i] = dayData ? {
          ...dayData,
          slots: (dayData.slots || []).map(s => ({ ...s, group: getSlotGroupValue(s) }))
        } : { unavailable: true, slots: [] };
      }
      setWeeklyAvailability(editableWeekly);
      setDateAvailability(
        (availabilityData.dateAvailability || []).map(d => ({
          ...d,
          slots: (d.slots || []).map(s => ({ ...s, group: getSlotGroupValue(s) }))
        }))
      );
      setPropsInitialized(true);
    }
  }, [availabilityData, isReadOnly, onAvailabilityChange, propsInitialized]);

  // Notify parent when availability changes (for UpdateLesson)
  useEffect(() => {
    if (!onAvailabilityChange || !propsInitialized) return;
    onAvailabilityChange({
      weeklyAvailability: weeklyAvailability,
      dateAvailability: dateAvailability,
    });
  }, [weeklyAvailability, dateAvailability, onAvailabilityChange, propsInitialized]);

  // Notify parent of changes based on calendar mode
  useEffect(() => {
    if (!onChange) return;

    if (calendarMode === 'default') {
      // Use editable local copies that user can change group flags on
      const source = editableWeeklyAvailability || reduxWeeklyAvailability;
      const dateSource = editableDateAvailability || reduxDateAvailability || [];
      
      const weeklyHours = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayData = source[dayIndex];
        if (dayData) {
          weeklyHours.push({
            day: DAY_NAMES[dayIndex],
            available: !dayData.unavailable,
            slots: (dayData.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
          });
        }
      }

      const dateSpecificHours = dateSource.map((dateItem) => ({
        date: dateItem.date,
        available: !dateItem.unavailable,
        slots: (dateItem.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
      }));

      onChange({
        calendar: true,
        calenderId: null,
        weeklyHours,
        dateSpecificHours,
      });
    } else if (calendarMode === 'existing') {
      if (selectedExistingCalendarId) {
        const source = editableWeeklyAvailability || reduxWeeklyAvailability;
        const dateSource = editableDateAvailability || reduxDateAvailability || [];

        const weeklyHours = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const dayData = source[dayIndex];
          if (dayData) {
            weeklyHours.push({
              day: DAY_NAMES[dayIndex],
              available: !dayData.unavailable,
              slots: (dayData.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
            });
          }
        }

        const dateSpecificHours = dateSource.map((dateItem) => ({
          date: dateItem.date,
          available: !dateItem.unavailable,
          slots: (dateItem.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
        }));

        onChange({
          calendar: false,
          calenderId: selectedExistingCalendarId,
          calendarName: editableExistingCalendarName,
          weeklyHours,
          dateSpecificHours,
        });
      }
    } else if (calendarMode === 'custom') {
      // Send custom calendar data
      const weeklyHours = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayData = weeklyAvailability[dayIndex];
        if (dayData) {
          weeklyHours.push({
            day: DAY_NAMES[dayIndex],
            available: !dayData.unavailable,
            slots: (dayData.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
          });
        }
      }

      const dateSpecificHours = dateAvailability.map((dateItem) => ({
        date: dateItem.date,
        available: !dateItem.unavailable,
        slots: (dateItem.slots || []).map(s => ({ start: s.start, end: s.end, group: s.group ?? false }))
      }));

      onChange({
        calendar: false,
        calenderId: null,
        calendarName: calendarName,
        weeklyHours,
        dateSpecificHours,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      });
    }
  }, [calendarMode, selectedExistingCalendarId, weeklyAvailability, dateAvailability, onChange, reduxWeeklyAvailability, reduxDateAvailability, editableWeeklyAvailability, editableDateAvailability]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  }

  const convertTo24Hour = (hour, period) => {
    let h = Number.parseInt(hour)
    if (period === "PM" && h !== 12) h += 12
    if (period === "AM" && h === 12) h = 0
    return String(h).padStart(2, "0")
  }

  const convertTo12Hour = (time) => {
    const [h] = time.split(":")
    const hour = Number.parseInt(h)
    if (hour === 0) return { hour: "12", period: "AM" }
    if (hour < 12) return { hour: String(hour), period: "AM" }
    if (hour === 12) return { hour: "12", period: "PM" }
    return { hour: String(hour - 12), period: "PM" }
  }

  const convertTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours * 60 + minutes
  }

  const findFirstNonOverlappingSlot = (slots, duration = 60) => {
    for (let startMin = 0; startMin <= (24 * 60) - duration; startMin += 30) {
      const endMin = startMin + duration
      const overlaps = slots.some((slot) => {
        const existStart = convertTimeToMinutes(slot.start)
        const existEnd = convertTimeToMinutes(slot.end)
        return startMin < existEnd && endMin > existStart
      })
      if (!overlaps) {
        const startHour = Math.floor(startMin / 60)
        const startMinute = startMin % 60
        const endHour = Math.floor(endMin / 60)
        const endMinute = endMin % 60
        return {
          start: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
          end: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
        }
      }
    }
    return null
  }

  const handleAddWeeklyTime = (dayIndex) => {
    const existingSlots = weeklyAvailability[dayIndex]?.slots || []
    const nextSlot = findFirstNonOverlappingSlot(existingSlots)

    if (!nextSlot) {
      toast.error("No non-overlapping time slots are available for this day.")
      return
    }

    setWeeklyAvailability((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: [...prev[dayIndex].slots, { ...nextSlot, group: false, capacity: 0, discount: 0 }],
      },
    }))
  }

  const handleOpenCalendarModal = () => {
    setShowCalendarModal(true)
    setSelectedDateForModal(null)
    setTempDateSlots([])
    setTempTime({ startHour: "09", startMin: "00", startPeriod: "AM", endHour: "12", endMin: "00", endPeriod: "PM", group: false, capacity: 1, discount: 0 })
  }

  const handleAddTimeSlotToDate = () => {
    const start = `${convertTo24Hour(tempTime.startHour, tempTime.startPeriod)}:${tempTime.startMin}`
    const end = `${convertTo24Hour(tempTime.endHour, tempTime.endPeriod)}:${tempTime.endMin}`

    // Validate end time is after start time
    const startMinutes = convertTimeToMinutes(start)
    const endMinutes = convertTimeToMinutes(end)
    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time!")
      return
    }

    // Check for overlapping slots in temp slots
    for (const slot of tempDateSlots) {
      const existStart = convertTimeToMinutes(slot.start)
      const existEnd = convertTimeToMinutes(slot.end)
      if (startMinutes < existEnd && endMinutes > existStart) {
        toast.error("Time slot overlaps with existing slot!")
        return
      }
    }

    setTempDateSlots([...tempDateSlots, { 
      start, 
      end, 
      group: tempTime.group, 
      capacity: tempTime.group ? Number(tempTime.capacity) : 0, 
      discount: tempTime.group ? Number(tempTime.discount) : 0 
    }])
    setTempTime({ startHour: "09", startMin: "00", startPeriod: "AM", endHour: "12", endMin: "00", endPeriod: "PM", group: false, capacity: 1, discount: 0 })
  }

  const handleSaveFromCalendarModal = () => {
    if (!selectedDateForModal) return

    setDateAvailability((prev) => {
      const existing = prev.find((d) => d.date === selectedDateForModal)

      if (!existing) {
        if (tempDateSlots.length === 0) {
          return [...prev, { date: selectedDateForModal, slots: [], unavailable: true }]
        } else {
          return [...prev, { date: selectedDateForModal, slots: tempDateSlots, unavailable: false }]
        }
      }

      return prev
    })
    setShowCalendarModal(false)
  }

  const handleDeleteWeeklySlot = (dayIndex, slotIndex) => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: prev[dayIndex].slots.filter((_, i) => i !== slotIndex),
      },
    }))
  }

  const handleDeleteDateSlot = (dateStr, slotIndex) => {
    setDateAvailability((prev) =>
      prev.map((d) => (d.date === dateStr ? { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) } : d)),
    )
  }

  const handleUpdateWeeklySlot = (dayIndex, slotIndex, field, value24Hour) => {
    const currentSlots = weeklyAvailability[dayIndex]?.slots || []
    const updatedSlot = { ...currentSlots[slotIndex], [field]: value24Hour }
    const startMinutes = convertTimeToMinutes(updatedSlot.start)
    const endMinutes = convertTimeToMinutes(updatedSlot.end)

    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time!")
      return
    }

    const overlaps = currentSlots.some((slot, index) => {
      if (index === slotIndex) return false
      const existStart = convertTimeToMinutes(slot.start)
      const existEnd = convertTimeToMinutes(slot.end)
      return startMinutes < existEnd && endMinutes > existStart
    })

    if (overlaps) {
      toast.error("Time slot overlaps with existing slot!")
      return
    }

    setWeeklyAvailability((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        slots: prev[dayIndex].slots.map((slot, index) => (index === slotIndex ? updatedSlot : slot)),
      },
    }))
  }

  const handleUpdateDateSlot = (dateStr, slotIndex, field, value24Hour) => {
    const dateItem = dateAvailability.find((d) => d.date === dateStr)
    const currentSlots = dateItem?.slots || []
    const updatedSlot = { ...currentSlots[slotIndex], [field]: value24Hour }
    const startMinutes = convertTimeToMinutes(updatedSlot.start)
    const endMinutes = convertTimeToMinutes(updatedSlot.end)

    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time!")
      return
    }

    const overlaps = currentSlots.some((slot, index) => {
      if (index === slotIndex) return false
      const existStart = convertTimeToMinutes(slot.start)
      const existEnd = convertTimeToMinutes(slot.end)
      return startMinutes < existEnd && endMinutes > existStart
    })

    if (overlaps) {
      toast.error("Time slot overlaps with existing slot!")
      return
    }

    setDateAvailability((prev) =>
      prev.map((d) =>
        d.date === dateStr
          ? {
              ...d,
              slots: d.slots.map((slot, index) => (index === slotIndex ? updatedSlot : slot)),
            }
          : d
      )
    )
  }

  const handleToggleUnavailable = (dayIndex) => {
    setWeeklyAvailability((prev) => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        unavailable: !prev[dayIndex].unavailable,
        slots: !prev[dayIndex].unavailable ? [] : prev[dayIndex].slots,
      },
    }))
  }

  const handleToggleDateUnavailable = (dateStr) => {
    setDateAvailability((prev) =>
      prev.map((d) =>
        d.date === dateStr
          ? { ...d, unavailable: !d.unavailable, slots: !d.unavailable ? [] : d.slots }
          : d
      )
    )
  }

  const handleDeleteDate = (dateStr) => {
    setDateAvailability((prev) => prev.filter((d) => d.date !== dateStr))
  }

  const handleRemoveTempSlot = (index) => {
    setTempDateSlots(tempDateSlots.filter((_, i) => i !== index))
  }

  const handleOpenGroupModal = (type, dayIndex = null, slotIndex = null, dateStr = null) => {
    setGroupModalData({ type, dayIndex, slotIndex, dateStr })
    setGroupSettings({ capacity: 1, discount: 0 })
    setShowGroupModal(true)
  }

  const handleSaveGroupSettings = () => {
    const { type, dayIndex, slotIndex, dateStr } = groupModalData
    
    if (type === 'weekly') {
      setWeeklyAvailability((prev) => ({
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          slots: prev[dayIndex].slots.map((s, i) => 
            i === slotIndex 
              ? { ...s, group: true, capacity: Number(groupSettings.capacity), discount: Number(groupSettings.discount) }
              : s
          ),
        },
      }))
    } else if (type === 'date') {
      setDateAvailability((prev) =>
        prev.map((d) =>
          d.date === dateStr
            ? {
                ...d,
                slots: d.slots.map((s, i) =>
                  i === slotIndex
                    ? { ...s, group: true, capacity: Number(groupSettings.capacity), discount: Number(groupSettings.discount) }
                    : s
                ),
              }
            : d
        )
      )
    }
    
    setShowGroupModal(false)
  }

  const calendarDays = []
  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  const renderTimeSlot = (time) => {
    const { hour, period } = convertTo12Hour(time)
    return `${hour}:${time.split(":")[1]} ${period}`
  }

  return (
    <div className="bg-white">
      <div className="max-w-[2800px] mx-auto space-y-6">
        {/* READ-ONLY MODE - Display calendar directly */}
        {isReadOnly && availabilityData && (
          <CalendarDisplay 
            weeklyAvailability={availabilityData.weeklyAvailability || {}}
            dateAvailability={availabilityData.dateAvailability || []}
            isEditable={false}
            isGroupAvailable={isGroupAvailable}
            lessonId={lessonId}
          />
        )}

        {/* FULLY EDITABLE MODE - For UpdateLesson: edit times + group on existing calendar */}
        {!isReadOnly && onAvailabilityChange && propsInitialized && (
          <>
          <CalendarDisplay 
            weeklyAvailability={weeklyAvailability}
            dateAvailability={dateAvailability}
            isEditable={true}
            isGroupEditable={true}
            isGroupAvailable={isGroupAvailable}
            setWeeklyAvailability={setWeeklyAvailability}
            setDateAvailability={setDateAvailability}
            lessonId={lessonId}
            onAddWeeklyTime={handleAddWeeklyTime}
            onOpenCalendarModal={handleOpenCalendarModal}
            onDeleteSlot={(dayOrDate, index) => {
              if (typeof dayOrDate === 'string') {
                handleDeleteDateSlot(dayOrDate, index)
              } else {
                handleDeleteWeeklySlot(dayOrDate, index)
              }
            }}
            onToggleUnavailable={handleToggleUnavailable}
            onDeleteDate={handleDeleteDate}
            onToggleDateUnavailable={handleToggleDateUnavailable}
            onUpdateWeeklySlot={handleUpdateWeeklySlot}
            onUpdateDateSlot={handleUpdateDateSlot}
            pendingWeeklySlot={pendingWeeklySlot}
            setPendingWeeklySlot={setPendingWeeklySlot}
            pendingSlotError={pendingSlotError}
            setPendingSlotError={setPendingSlotError}
          />
          </>
        )}

        {/* EDITABLE MODE - Show calendar selector and builder */}
        {!isReadOnly && !onAvailabilityChange && (
          <>
        {/* Calendar Mode Selector - Only show if not customOnly */}
        {!customOnly && (
          <div className="space-y-3 p-4 rounded-2xl bg-[#f7f7f7]">
            <label className="block text-sm font-semibold text-gray-900">Select Calendar</label>
            <select
              value={
                calendarMode === 'default'
                  ? 'default'
                  : calendarMode === 'custom'
                  ? 'custom'
                  : selectedExistingCalendarId || 'default'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'default') {
                  setCalendarMode('default');
                  setSelectedExistingCalendarId('');
                  onSelectionChange?.({ mode: 'default', calenderId: null });
                } else if (val === 'custom') {
                  setCalendarMode('custom');
                  setSelectedExistingCalendarId('');
                  onSelectionChange?.({ mode: 'custom', calenderId: null });
                } else {
                  setCalendarMode('existing');
                  setSelectedExistingCalendarId(val);
                  onSelectionChange?.({ mode: 'existing', calenderId: val });
                }
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black appearance-none cursor-pointer"
            >
              <option value="default">My Default Calendar</option>
              {userCalendars.length > 0 && (
                <optgroup label="Existing Calendars">
                  {userCalendars.map((calendar) => (
                    <option key={calendar._id} value={calendar._id}>
                      {calendar?.name || calendar?.lesson?.title || `Calendar - ${calendar._id.slice(-6)}`}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="custom">＋ Create New Calendar</option>
            </select>
            <p className="text-xs text-gray-500">
              {calendarMode === 'default'
                ? 'Using your default calendar availability'
                : calendarMode === 'custom'
                ? 'Create a new custom availability calendar'
                : 'Using an existing calendar'}
            </p>

            {/* Name fields for Custom and Existing calendars */}
            {calendarMode === 'custom' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Calendar Name</label>
                <input
                  type="text"
                  value={calendarName}
                  onChange={(e) => setCalendarName(e.target.value)}
                  placeholder="e.g., My Calendar, Weekend Classes, etc."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-1">Give your calendar a meaningful name</p>
              </div>
            )}

            {calendarMode === 'existing' && selectedExistingCalendarId && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Calendar Name</label>
                <input
                  type="text"
                  value={editableExistingCalendarName}
                  onChange={(e) => setEditableExistingCalendarName(e.target.value)}
                  placeholder="Enter calendar name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                />
                <p className="text-xs text-gray-500 mt-1">You can update this calendar's name</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Display - Show for all modes */}
        {displayCalendarData && (
          <CalendarDisplay 
            weeklyAvailability={displayCalendarData.weeklyAvailability}
            dateAvailability={displayCalendarData.dateAvailability}
            isEditable={calendarMode === 'custom'}
            isGroupEditable={calendarMode === 'default' || calendarMode === 'existing'}
            isGroupAvailable={isGroupAvailable}
            setWeeklyAvailability={calendarMode === 'custom' ? setWeeklyAvailability : setEditableWeeklyAvailability}
            setDateAvailability={calendarMode === 'custom' ? setDateAvailability : setEditableDateAvailability}
            lessonId={lessonId}
            onAddWeeklyTime={calendarMode === 'custom' ? handleAddWeeklyTime : undefined}
            onOpenCalendarModal={calendarMode === 'custom' ? handleOpenCalendarModal : undefined}
            onDeleteSlot={calendarMode === 'custom' ? (dayOrDate, index) => {
              if (typeof dayOrDate === 'string') {
                handleDeleteDateSlot(dayOrDate, index)
              } else {
                handleDeleteWeeklySlot(dayOrDate, index)
              }
            } : undefined}
            onToggleUnavailable={calendarMode === 'custom' ? handleToggleUnavailable : undefined}
            onDeleteDate={calendarMode === 'custom' ? handleDeleteDate : undefined}
            onToggleDateUnavailable={calendarMode === 'custom' ? handleToggleDateUnavailable : undefined}
            onUpdateWeeklySlot={calendarMode === 'custom' ? handleUpdateWeeklySlot : undefined}
            onUpdateDateSlot={calendarMode === 'custom' ? handleUpdateDateSlot : undefined}
            pendingWeeklySlot={calendarMode === 'custom' ? pendingWeeklySlot : undefined}
            setPendingWeeklySlot={calendarMode === 'custom' ? setPendingWeeklySlot : undefined}
            pendingSlotError={calendarMode === 'custom' ? pendingSlotError : undefined}
            setPendingSlotError={calendarMode === 'custom' ? setPendingSlotError : undefined}
          />
        )}

        {/* Custom Calendar Builder - Only show when 'custom' mode is selected */}
        {calendarMode === 'custom' && !onAvailabilityChange && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Customize Your Calendar</h3>
              <p className="text-sm text-gray-600 mb-6">Use the sections below to add and manage your availability slots.</p>
            </div>
          </div>
        )}

          </>
        )}

        {/* CALENDAR MODAL WITH DATE AND TIME SELECTION */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-border p-6 w-full max-w-2xl max-h-[94vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Calendar */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Date</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h4>
                      <div className="flex gap-2">
                        <div
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                          className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                        <div
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                          className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => {
                        const dateStr = day ? formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : null

                        return (
                          <div
                            key={index}
                            onClick={() => day && setSelectedDateForModal(dateStr)}
                            className={`p-2 text-sm aspect-square rounded transition-colors ${
                              !day
                                ? "bg-transparent cursor-default"
                                : selectedDateForModal === dateStr
                                  ? "bg-black text-white font-medium cursor-pointer"
                                  : "bg-muted text-foreground hover:bg-accent cursor-pointer"
                            }`}
                          >
                            {day}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {selectedDateForModal
                      ? new Date(selectedDateForModal).toLocaleDateString("en-US", { 
                          weekday: 'short',
                          month: "short", 
                          day: "numeric" 
                        })
                      : "Select a date"}
                  </h3>

                  {selectedDateForModal ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm font-medium block">Set Time Slot</label>

                        <div className="grid grid-cols-1 gap-4 p-3 border border-border rounded-lg bg-gray-50/50">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground block">Start Time</label>
                            <div className="flex gap-2 items-center">
                              <TimeSelect
                                value={tempTime.startHour}
                                onChange={(val) => setTempTime({ ...tempTime, startHour: val })}
                                options={Array.from({ length: 12 }, (_, i) => ({
                                  value: (i + 1).toString().padStart(2, '0'),
                                  label: (i + 1).toString()
                                }))}
                                className="flex-1"
                              />
                              <span className="text-gray-400 text-sm">:</span>
                              <TimeSelect
                                value={tempTime.startMin}
                                onChange={(val) => setTempTime({ ...tempTime, startMin: val })}
                                options={[
                                  { value: '00', label: '00' },
                                  { value: '30', label: '30' },
                                ]}
                                className="flex-1"
                              />
                              <TimeSelect
                                value={tempTime.startPeriod}
                                onChange={(val) => setTempTime({ ...tempTime, startPeriod: val })}
                                options={[
                                  { value: 'AM', label: 'AM' },
                                  { value: 'PM', label: 'PM' }
                                ]}
                                className="flex-1"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground block">End Time</label>
                            <div className="flex gap-2 items-center">
                              <TimeSelect
                                value={tempTime.endHour}
                                onChange={(val) => setTempTime({ ...tempTime, endHour: val })}
                                options={Array.from({ length: 12 }, (_, i) => ({
                                  value: (i + 1).toString().padStart(2, '0'),
                                  label: (i + 1).toString()
                                }))}
                                className="flex-1"
                              />
                              <span className="text-gray-400 text-sm">:</span>
                              <TimeSelect
                                value={tempTime.endMin}
                                onChange={(val) => setTempTime({ ...tempTime, endMin: val })}
                                options={[
                                  { value: '00', label: '00' },
                                  { value: '30', label: '30' },
                                ]}
                                className="flex-1"
                              />
                              <TimeSelect
                                value={tempTime.endPeriod}
                                onChange={(val) => setTempTime({ ...tempTime, endPeriod: val })}
                                options={[
                                  { value: 'AM', label: 'AM' },
                                  { value: 'PM', label: 'PM' }
                                ]}
                                className="flex-1"
                              />
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <label className="text-xs font-medium text-muted-foreground block mb-2">Lesson Type</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setTempTime({ ...tempTime, group: false })}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  !tempTime.group ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                1:1
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isGroupAvailable) {
                                    setTempTime({ ...tempTime, group: true })
                                  }
                                }}
                                disabled={!isGroupAvailable}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  tempTime.group ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                } ${!isGroupAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                                title={!isGroupAvailable ? "Enable Group Availability in lesson settings to use this option" : ""}
                              >
                                Group
                              </button>
                            </div>
                            {!isGroupAvailable && (
                              <p className="text-xs text-amber-600 mt-1">💡 Enable "Group Availability" to add group slots</p>
                            )}
                          </div>
                        </div>

                        <div
                          onClick={handleAddTimeSlotToDate}
                          className="w-full px-3 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Add Time Slot
                        </div>
                      </div>

                      {tempDateSlots.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium block">Added Time Slots</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {tempDateSlots.map((slot, index) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                  <span className="font-medium">
                                    🟡 {renderTimeSlot(slot.start)} - {renderTimeSlot(slot.end)}
                                    {slot.group && (
                                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                        Group
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div
                                  onClick={() => handleRemoveTempSlot(index)}
                                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors group cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-600" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm text-muted-foreground">Select a date to set availability</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t border-border">
                    <div
                      onClick={() => setShowCalendarModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                    >
                      Cancel
                    </div>
                    <div
                      onClick={handleSaveFromCalendarModal}
                      disabled={!selectedDateForModal || tempDateSlots.length === 0}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium cursor-pointer"
                    >
                      Save Availability
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
