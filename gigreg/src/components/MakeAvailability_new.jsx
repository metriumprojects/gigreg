import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, RotateCcw, Trash, X } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { getLessonCalendarByUser, getLessonCalendarById } from "../redux/reducers/AvailabilityReducer"

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const TimeDropdown = ({ type, value, onChange }) => {
  const getOptions = () => {
    switch (type) {
      case 'hour':
        return Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString().padStart(2, '0'),
          label: (i + 1).toString()
        }));
      case 'minute':
        return ['00', '30'].map(val => ({ value: val, label: val }));
      case 'period':
        return [
          { value: 'AM', label: 'AM' },
          { value: 'PM', label: 'PM' }
        ];
      default:
        return [];
    }
  };

  const options = getOptions();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 px-3 py-2 border border-border rounded bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const TimeSelect = ({ value, onChange, options, className = "" }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary bg-white ${className}`}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export default function MakeAvailability({ onChange }) {
  const dispatch = useDispatch();
  const { userCalendars = [] } = useSelector((state) => state.availability || {});

  // Initialize weekly availability
  const initializeWeeklyAvailability = () => {
    const initial = {};
    for (let i = 0; i < 7; i++) {
      initial[i] = { unavailable: false, slots: [] };
    }
    return initial;
  };

  // Calendar selection: 'default' | 'custom' | specific calendar ID
  const [calendarMode, setCalendarMode] = useState('default')
  const [selectedExistingCalendarId, setSelectedExistingCalendarId] = useState('')

  // Custom calendar state (only used when calendarMode === 'custom')
  const [weeklyAvailability, setWeeklyAvailability] = useState(initializeWeeklyAvailability());
  const [dateAvailability, setDateAvailability] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showWeeklyTimeModal, setShowWeeklyTimeModal] = useState(null)
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

  // Fetch user calendars on mount
  useEffect(() => {
    dispatch(getLessonCalendarByUser());
  }, [dispatch]);

  // Notify parent of changes based on calendar mode
  useEffect(() => {
    if (!onChange) return;

    if (calendarMode === 'default') {
      // Send default calendar
      onChange({
        calendar: true,
        calendarId: null,
        weeklyHours: [],
        dateSpecificHours: [],
      });
    } else if (calendarMode === 'existing' && selectedExistingCalendarId) {
      // Send existing calendar ID
      onChange({
        calendar: false,
        calendarId: selectedExistingCalendarId,
        weeklyHours: [],
        dateSpecificHours: [],
      });
    } else if (calendarMode === 'custom') {
      // Send custom calendar data
      const weeklyHours = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayData = weeklyAvailability[dayIndex];
        if (dayData) {
          weeklyHours.push({
            day: DAY_NAMES[dayIndex],
            available: !dayData.unavailable,
            slots: dayData.slots || []
          });
        }
      }

      const dateSpecificHours = dateAvailability.map((dateItem) => ({
        date: dateItem.date,
        available: !dateItem.unavailable,
        slots: dateItem.slots || []
      }));

      onChange({
        calendar: false,
        calendarId: null,
        weeklyHours,
        dateSpecificHours,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMode, selectedExistingCalendarId, weeklyAvailability, dateAvailability]);

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

  const handleAddWeeklyTime = (dayIndex) => {
    setShowWeeklyTimeModal(dayIndex)
    setTempTime({ startHour: "09", startMin: "00", startPeriod: "AM", endHour: "12", endMin: "00", endPeriod: "PM", group: false, capacity: 1, discount: 0 })
  }

  const handleSaveWeeklyTime = () => {
    const start = `${convertTo24Hour(tempTime.startHour, tempTime.startPeriod)}:${tempTime.startMin}`
    const end = `${convertTo24Hour(tempTime.endHour, tempTime.endPeriod)}:${tempTime.endMin}`

    setWeeklyAvailability((prev) => ({
      ...prev,
      [showWeeklyTimeModal]: {
        ...prev[showWeeklyTimeModal],
        slots: [...prev[showWeeklyTimeModal].slots, { 
          start, 
          end, 
          group: tempTime.group, 
          capacity: tempTime.group ? Number(tempTime.capacity) : 0, 
          discount: tempTime.group ? Number(tempTime.discount) : 0 
        }],
      },
    }))
    setShowWeeklyTimeModal(null)
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
        {/* Calendar Mode Selector */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <label className="block text-sm font-medium">Select Calendar Option</label>
          
          <div className="space-y-3">
            {/* Default Calendar Option */}
            <div 
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition"
              onClick={() => setCalendarMode('default')}
            >
              <input
                type="radio"
                name="calendar-mode"
                checked={calendarMode === 'default'}
                onChange={() => setCalendarMode('default')}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">My Default Calendar</p>
                <p className="text-xs text-gray-600">Use your default calendar availability</p>
              </div>
            </div>

            {/* Existing Calendar Option */}
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="radio"
                name="calendar-mode"
                checked={calendarMode === 'existing'}
                onChange={() => setCalendarMode('existing')}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="font-medium text-sm mb-2">Select Existing Calendar</p>
                {calendarMode === 'existing' && (
                  <select
                    value={selectedExistingCalendarId}
                    onChange={(e) => setSelectedExistingCalendarId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- Select a calendar --</option>
                    {userCalendars.map((calendar) => (
                      <option key={calendar._id} value={calendar._id}>
                        {calendar.name || `Calendar - ${calendar._id.slice(-6)}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Custom Calendar Option */}
            <div 
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition"
              onClick={() => setCalendarMode('custom')}
            >
              <input
                type="radio"
                name="calendar-mode"
                checked={calendarMode === 'custom'}
                onChange={() => setCalendarMode('custom')}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">Create Custom Calendar</p>
                <p className="text-xs text-gray-600">Create a custom availability calendar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Calendar Builder - Only show when 'custom' mode is selected */}
        {calendarMode === 'custom' && (
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* LEFT COLUMN: WEEKLY HOURS */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary text-sm font-semibold">
                      <RotateCcw size={20} />
                    </div>
                    <h2 className="text-base font-semibold">Weekly hours</h2>
                  </div>
                  <p className="">Set when you are typically available for meetings</p>
                </div>

                <div className="space-y-3">
                  {DAY_NAMES.map((dayName, dayIndex) => (
                    <div key={dayIndex} className="flex items-start gap-3 p-2 bg-white">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {DAYS[dayIndex]}
                      </div>

                      <div className="flex-1">
                        {weeklyAvailability[dayIndex].unavailable ? (
                          <p className="text-sm font-medium text-muted-foreground">Unavailable</p>
                        ) : (
                          <div className="space-y-2">
                            {weeklyAvailability[dayIndex].slots.map((slot, slotIndex) => (
                              <div key={slotIndex} className="flex items-center justify-left gap-3 text-sm">
                                <span className="font-medium">
                                  {renderTimeSlot(slot.start)} - {renderTimeSlot(slot.end)}
                                  {slot.group && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                      Group (Cap: {slot.capacity}, Disc: ${slot.discount})
                                    </span>
                                  )}
                                </span>
                                <div
                                  onClick={() => handleDeleteWeeklySlot(dayIndex, slotIndex)}
                                  className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </div>
                                
                                <div 
                                  onClick={() => {
                                    if (slot.group) {
                                      setWeeklyAvailability((prev) => ({
                                        ...prev,
                                        [dayIndex]: {
                                          ...prev[dayIndex],
                                          slots: prev[dayIndex].slots.map((s, i) => 
                                            i === slotIndex 
                                              ? { ...s, group: false, capacity: 0, discount: 0 }
                                              : s
                                          ),
                                        },
                                      }))
                                    } else {
                                      handleOpenGroupModal('weekly', dayIndex, slotIndex)
                                    }
                                  }}
                                  className="px-4 py-1 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors text-xs cursor-pointer">
                                  {slot.group ? "Switch to Individual lesson" : "Switch to Group lesson"}
                                </div>
                              </div>
                            ))}
                            <div
                              onClick={() => handleAddWeeklyTime(dayIndex)}
                              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" /> Add time
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        onClick={() => handleToggleUnavailable(dayIndex)}
                        className="cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        {weeklyAvailability[dayIndex].unavailable ? (
                          <Plus size={16} />
                        ) : (
                          <Trash size={16} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN: DATE-SPECIFIC HOURS */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary text-sm font-semibold">
                        <Calendar size={20} />
                      </div>
                      <h2 className="text-base font-semibold">Date-specific hours</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Adjust hours for specific days</p>
                  </div>
                  <div
                    onClick={handleOpenCalendarModal}
                    className="px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add hour
                  </div>
                </div>

                {dateAvailability.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Availability by Date</h3>
                    {dateAvailability.map((dateItem) => (
                      <div key={dateItem.date} className="flex items-center gap-2">
                        <div className="p-3 bg-[#f5f5f5] rounded w-full">
                          <p className="font-medium text-sm mb-2">
                            {new Date(dateItem.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>

                          {dateItem.unavailable ? (
                            <p className="text-sm text-muted-foreground">Unavailable</p>
                          ) : (
                            <div className="space-y-2">
                              {dateItem.slots.map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center gap-3 text-sm">
                                  <span className="font-medium">
                                    {renderTimeSlot(slot.start)} - {renderTimeSlot(slot.end)}
                                    {slot.group && (
                                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                        Group (Cap: {slot.capacity}, Disc: ${slot.discount})
                                      </span>
                                    )}
                                  </span>
                                  <div
                                    onClick={() => handleDeleteDateSlot(dateItem.date, slotIndex)}
                                    className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                                  >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div
                          onClick={() => setDateAvailability((prev) => prev.filter((d) => d.date !== dateItem.date))}
                          className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TIME PICKER MODAL FOR WEEKLY */}
        {showWeeklyTimeModal !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-border p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Set availability time for {DAY_NAMES[showWeeklyTimeModal]}</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Start Time</label>
                  <div className="flex gap-2 items-center">
                    <TimeDropdown
                      type="hour"
                      value={tempTime.startHour}
                      onChange={(value) => setTempTime({ ...tempTime, startHour: value })}
                    />
                    <span className="text-gray-500">:</span>
                    <TimeDropdown
                      type="minute"
                      value={tempTime.startMin}
                      onChange={(value) => setTempTime({ ...tempTime, startMin: value })}
                    />
                    <TimeDropdown
                      type="period"
                      value={tempTime.startPeriod}
                      onChange={(value) => setTempTime({ ...tempTime, startPeriod: value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">End Time</label>
                  <div className="flex gap-2 items-center">
                    <TimeDropdown
                      type="hour"
                      value={tempTime.endHour}
                      onChange={(value) => setTempTime({ ...tempTime, endHour: value })}
                    />
                    <span className="text-gray-500">:</span>
                    <TimeDropdown
                      type="minute"
                      value={tempTime.endMin}
                      onChange={(value) => setTempTime({ ...tempTime, endMin: value })}
                    />
                    <TimeDropdown
                      type="period"
                      value={tempTime.endPeriod}
                      onChange={(value) => setTempTime({ ...tempTime, endPeriod: value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempTime.group}
                      onChange={(e) => setTempTime({ ...tempTime, group: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Group Lesson</span>
                  </label>
                </div>

                {tempTime.group && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium block mb-2">Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={tempTime.capacity}
                        onChange={(e) => setTempTime({ ...tempTime, capacity: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Max students"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Discount ($)</label>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={tempTime.discount}
                        onChange={(e) => setTempTime({ ...tempTime, discount: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Discount in dollars"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                  <div
                    onClick={() => setShowWeeklyTimeModal(null)}
                    className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </div>
                  <div
                    onClick={handleSaveWeeklyTime}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Save
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR MODAL WITH DATE AND TIME SELECTION */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-border p-6 w-full max-w-2xl">
              <div className="grid grid-cols-2 gap-6">
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
                                  ? "bg-primary text-white font-medium cursor-pointer"
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
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tempTime.group}
                                onChange={(e) => setTempTime({ ...tempTime, group: e.target.checked })}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                              />
                              <span className="text-xs font-medium">Group Lesson</span>
                            </label>
                          </div>

                          {tempTime.group && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Capacity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tempTime.capacity}
                                  onChange={(e) => setTempTime({ ...tempTime, capacity: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                                  placeholder="Max students"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Discount ($)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="10000"
                                  value={tempTime.discount}
                                  onChange={(e) => setTempTime({ ...tempTime, discount: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                                  placeholder="Discount in dollars"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          onClick={handleAddTimeSlotToDate}
                          className="w-full px-3 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
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
                                className="flex items-center justify-between p-3 bg-primary/10 border border-blue-200 rounded-lg text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <span className="font-medium">
                                    {renderTimeSlot(slot.start)} - {renderTimeSlot(slot.end)}
                                    {slot.group && (
                                      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                        Group (Cap: {slot.capacity}, Disc: ${slot.discount})
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
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium cursor-pointer"
                    >
                      Save Availability
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP LESSON SETTINGS MODAL */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-border p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Group Lesson Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={groupSettings.capacity}
                    onChange={(e) => setGroupSettings({ ...groupSettings, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Maximum students"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-2">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={groupSettings.discount}
                    onChange={(e) => setGroupSettings({ ...groupSettings, discount: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Discount amount in dollars"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6">
                <div
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </div>
                <div
                  onClick={handleSaveGroupSettings}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Save
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
