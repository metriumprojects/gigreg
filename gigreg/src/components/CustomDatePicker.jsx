import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

export default function CustomDatePicker({
  value = "",
  onChange,
  label = "Date of birth",
  variant = "pill", // "pill" | "input"
  className = "",
  minYear = 1930,
  maxYear = new Date().getFullYear(),
}) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Sync state from incoming "YYYY-MM-DD" value
  useEffect(() => {
    if (value && typeof value === "string" && value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setYear(parts[0] || "");
        setMonth(parts[1] || "");
        setDay(parts[2] || "");
      }
    } else if (!value) {
      setDay("");
      setMonth("");
      setYear("");
    }
  }, [value]);

  // Calculate days in the selected month & year
  const getDaysCount = () => {
    const y = parseInt(year, 10) || 2000;
    const m = parseInt(month, 10);
    if (!m) return 31;
    return new Date(y, m, 0).getDate();
  };

  const daysCount = getDaysCount();
  const days = [];
  for (let d = 1; d <= daysCount; d++) {
    days.push(String(d).padStart(2, "0"));
  }

  // Years list descending
  const years = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(String(y));
  }

  // Trigger parent onChange when all 3 or changed
  const notifyChange = (newDay, newMonth, newYear) => {
    if (newDay && newMonth && newYear) {
      const maxD = new Date(parseInt(newYear, 10), parseInt(newMonth, 10), 0).getDate();
      const validDay = parseInt(newDay, 10) > maxD ? String(maxD).padStart(2, "0") : newDay;
      onChange?.(`${newYear}-${newMonth}-${validDay}`);
    } else {
      onChange?.("");
    }
  };

  const handleDayChange = (e) => {
    const newDay = e.target.value;
    setDay(newDay);
    notifyChange(newDay, month, year);
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    notifyChange(day, newMonth, year);
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    notifyChange(day, month, newYear);
  };

  const selectStyle =
    "bg-white hover:bg-white/90 focus:bg-white text-zinc-900 font-medium text-sm rounded-lg border border-gray-200/90 shadow-2xs px-3 py-1 outline-none cursor-pointer appearance-none transition-colors pr-6 focus:border-zinc-500";

  return (
    <div className={`w-full ${className}`}>
      {variant === "pill" ? (
        <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F4F4F4] px-5 py-[14px] min-h-[76px] w-full select-none">
          <div className="flex flex-col justify-center gap-[4px] text-left flex-1 min-w-0">
            <label className="text-[14px] font-normal text-black select-none">
              {label}
            </label>
            <div className="flex items-center gap-2">
              {/* Day Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={day}
                  onChange={handleDayChange}
                  aria-label="Day"
                  className={selectStyle}
                >
                  <option value="">Day</option>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 text-gray-500"
                />
              </div>

              {/* Month Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={month}
                  onChange={handleMonthChange}
                  aria-label="Month"
                  className={selectStyle}
                >
                  <option value="">Month</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 text-gray-500"
                />
              </div>

              {/* Year Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={year}
                  onChange={handleYearChange}
                  aria-label="Year"
                  className={selectStyle}
                >
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 text-gray-500"
                />
              </div>
            </div>
          </div>
          <Calendar className="h-5 w-5 text-black shrink-0" />
        </div>
      ) : (
        <div className="flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          {/* Day */}
          <div className="relative inline-flex items-center flex-1">
            <select
              value={day}
              onChange={handleDayChange}
              aria-label="Day"
              className="w-full bg-gray-50 hover:bg-gray-100 text-zinc-900 font-medium text-sm rounded-lg border border-gray-200 px-3 py-1.5 outline-none cursor-pointer appearance-none transition-colors pr-7"
            >
              <option value="">Day</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 text-gray-500"
            />
          </div>

          {/* Month */}
          <div className="relative inline-flex items-center flex-1">
            <select
              value={month}
              onChange={handleMonthChange}
              aria-label="Month"
              className="w-full bg-gray-50 hover:bg-gray-100 text-zinc-900 font-medium text-sm rounded-lg border border-gray-200 px-3 py-1.5 outline-none cursor-pointer appearance-none transition-colors pr-7"
            >
              <option value="">Month</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 text-gray-500"
            />
          </div>

          {/* Year */}
          <div className="relative inline-flex items-center flex-1">
            <select
              value={year}
              onChange={handleYearChange}
              aria-label="Year"
              className="w-full bg-gray-50 hover:bg-gray-100 text-zinc-900 font-medium text-sm rounded-lg border border-gray-200 px-3 py-1.5 outline-none cursor-pointer appearance-none transition-colors pr-7"
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 text-gray-500"
            />
          </div>

          <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
        </div>
      )}
    </div>
  );
}
