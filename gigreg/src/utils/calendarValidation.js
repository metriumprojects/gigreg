const hasValidTimeSlot = (slots) =>
  Array.isArray(slots) &&
  slots.some(
    (slot) =>
      slot &&
      typeof slot.start === "string" &&
      typeof slot.end === "string" &&
      slot.start.trim() !== "" &&
      slot.end.trim() !== "" &&
      slot.start.trim() !== slot.end.trim()
  );

export const hasAnyCalendarTimeSlot = (calendarData) => {
  if (!calendarData || typeof calendarData !== "object") return false;

  const weekly = calendarData.weeklyHours ?? calendarData.weeklyAvailability;
  const weeklyList = Array.isArray(weekly)
    ? weekly
    : weekly && typeof weekly === "object"
    ? Object.values(weekly)
    : [];

  if (
    weeklyList.some(
      (day) =>
        day &&
        day.available !== false &&
        day.unavailable !== true &&
        hasValidTimeSlot(day.slots)
    )
  ) {
    return true;
  }

  const dates = calendarData.dateSpecificHours ?? calendarData.dateAvailability;
  const dateList = Array.isArray(dates) ? dates : [];
  return dateList.some(
    (entry) =>
      entry &&
      entry.available !== false &&
      entry.unavailable !== true &&
      hasValidTimeSlot(entry.slots)
  );
};

export const getCalendarSlotValidationError = ({
  enableCalendar,
  calendarSelection,
  calendarData,
  fallbackAvailability = null,
}) => {
  if (!enableCalendar) return null;

  if (calendarSelection?.mode === "existing" && !calendarSelection?.calenderId) {
    return "Please select a saved calendar with at least one available time slot, or switch to a custom calendar and add a time slot.";
  }

  const effectiveData =
    calendarData ||
    (calendarSelection?.mode === "default" ? fallbackAvailability : null);

  if (!hasAnyCalendarTimeSlot(effectiveData)) {
    if (calendarSelection?.mode === "default") {
      return "Your default availability has no time slots yet. Please add at least one time slot (switch to Create Custom Calendar or update My Availability) before saving.";
    }
    return "Please add at least one available time slot in your calendar so buyers can book this listing.";
  }

  return null;
};
