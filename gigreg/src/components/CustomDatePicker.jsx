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
  maxYear,
  pastOnly = true, // By default for DOB: disallow future and current date
}) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Determine maximum allowable date (strictly before today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxAllowedDate = pastOnly
    ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
    : today;
  const effectiveMaxYear = maxYear !== undefined ? maxYear : maxAllowedDate.getFullYear();

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

  // Allowed months for selected year
  const allowedMonths = MONTHS.filter((m) => {
    if (!pastOnly) return true;
    const y = parseInt(year, 10);
    if (y === maxAllowedDate.getFullYear()) {
      return parseInt(m.value, 10) <= maxAllowedDate.getMonth() + 1;
    }
    return true;
  });

  // Calculate days in the selected month & year
  const getDaysCount = () => {
    const y = parseInt(year, 10) || 2000;
    const m = parseInt(month, 10);
    if (!m) return 31;
    let maxDaysInMonth = new Date(y, m, 0).getDate();

    if (pastOnly && y === maxAllowedDate.getFullYear() && m === maxAllowedDate.getMonth() + 1) {
      maxDaysInMonth = Math.min(maxDaysInMonth, maxAllowedDate.getDate());
    }
    return maxDaysInMonth;
  };

  const daysCount = getDaysCount();
  const days = [];
  for (let d = 1; d <= daysCount; d++) {
    days.push(String(d).padStart(2, "0"));
  }

  // Years list descending
  const years = [];
  for (let y = effectiveMaxYear; y >= minYear; y--) {
    years.push(String(y));
  }

  // Trigger parent onChange when all 3 are valid
  const notifyChange = (newDay, newMonth, newYear) => {
    if (newDay && newMonth && newYear) {
      const y = parseInt(newYear, 10);
      const m = parseInt(newMonth, 10);
      const d = parseInt(newDay, 10);

      const maxD = new Date(y, m, 0).getDate();
      const validDay = d > maxD ? String(maxD).padStart(2, "0") : newDay;
      const selectedDate = new Date(`${newYear}-${newMonth}-${validDay}T00:00:00`);

      if (pastOnly && selectedDate >= today) {
        onChange?.("");
        return;
      }
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

    let adjustedDay = day;
    const maxD = new Date(parseInt(year, 10) || 2000, parseInt(newMonth, 10), 0).getDate();
    if (parseInt(day, 10) > maxD) {
      adjustedDay = String(maxD).padStart(2, "0");
      setDay(adjustedDay);
    }
    if (pastOnly && parseInt(year, 10) === maxAllowedDate.getFullYear() && parseInt(newMonth, 10) === maxAllowedDate.getMonth() + 1) {
      if (parseInt(adjustedDay, 10) > maxAllowedDate.getDate()) {
        adjustedDay = "";
        setDay("");
      }
    }
    notifyChange(adjustedDay, newMonth, year);
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);

    let adjustedMonth = month;
    let adjustedDay = day;

    if (pastOnly && parseInt(newYear, 10) === maxAllowedDate.getFullYear()) {
      if (parseInt(month, 10) > maxAllowedDate.getMonth() + 1) {
        adjustedMonth = "";
        adjustedDay = "";
        setMonth("");
        setDay("");
      } else if (parseInt(month, 10) === maxAllowedDate.getMonth() + 1 && parseInt(day, 10) > maxAllowedDate.getDate()) {
        adjustedDay = "";
        setDay("");
      }
    }
    notifyChange(adjustedDay, adjustedMonth, newYear);
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
                  {allowedMonths.map((m) => (
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
              {allowedMonths.map((m) => (
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
