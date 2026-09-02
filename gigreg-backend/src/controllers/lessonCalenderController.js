import LessonCalender from "../models/LessonCalender.js";

// Normalize incoming values that may be JSON strings from form-data
const parseArrayMaybe = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// ==================== HELPER FUNCTIONS FOR LESSON TRACKING ====================

// Safe boolean parser for values that may be strings from form-data
const parseBool = (v) => v === true || v === "true";

// Add lesson to specific lessonCalender or all calendars if no calenderId provided
export const addLessonToLessonCalender = async (userId, lessonId, isGroupAvailable = false, calenderId = null, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  const weeklyGroupMap = {};
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    (Array.isArray(parsed) ? parsed : []).forEach((dayEntry) => {
      const daySlots = {};
      (dayEntry.slots || []).forEach((s) => {
        daySlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      weeklyGroupMap[dayEntry.day] = daySlots;
    });
  }
  
  const dateGroupMap = {};
  if (dateSpecificHoursOverride) {
    const parsed = typeof dateSpecificHoursOverride === 'string' ? JSON.parse(dateSpecificHoursOverride) : dateSpecificHoursOverride;
    (Array.isArray(parsed) ? parsed : []).forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    let lessonCals;
    if (calenderId) {
      // Find specific calendar by ID
      const cal = await LessonCalender.findById(calenderId);
      lessonCals = cal ? [cal] : [];
    } else {
      // Find all calendars for user if no specific ID provided
      lessonCals = await LessonCalender.find({ user: userId });
    }

    if (!lessonCals || lessonCals.length === 0) {
      return { success: false, message: "No lesson calendar found" };
    }

    for (const cal of lessonCals) {
      // Add to weekly slots
      cal.weeklyHours.forEach((week) => {
        const daySlotMap = weeklyGroupMap[week.day] || {};
        week.slots.forEach((slot) => {
          const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
          if (!exists) {
            // Priority: per-slot override > slot's slotGroup > global groupFlag
            const slotKey = `${slot.start}-${slot.end}`;
            const slotGroupValue = slotKey in daySlotMap
              ? daySlotMap[slotKey]
              : (slot.slotGroup !== undefined && slot.slotGroup !== null) ? slot.slotGroup : groupFlag;
            slot.lessons.push({
              lesson: lessonId,
              lessonGroup: slotGroupValue,
            });
          }
        });
      });

      // Add to date-specific slots
      cal.dateSpecificHours.forEach((dateSlot) => {
        const dateSlotMap = dateGroupMap[dateSlot.date] || {};
        dateSlot.slots.forEach((slot) => {
          const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
          if (!exists) {
            const slotKey = `${slot.start}-${slot.end}`;
            const slotGroupValue = slotKey in dateSlotMap
              ? dateSlotMap[slotKey]
              : (slot.slotGroup !== undefined && slot.slotGroup !== null) ? slot.slotGroup : groupFlag;
            slot.lessons.push({
              lesson: lessonId,
              lessonGroup: slotGroupValue,
            });
          }
        });
      });

      await cal.save();
    }

    return { success: true, message: "Lesson added to lesson calendars" };
  } catch (error) {
    console.error("addLessonToLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// Update lesson's group availability in specific calendar or all calendars if no calenderId provided
export const updateLessonInLessonCalender = async (userId, lessonId, isGroupAvailable = false, calenderId = null, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  const weeklyGroupMap = {};
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    (Array.isArray(parsed) ? parsed : []).forEach((dayEntry) => {
      const daySlots = {};
      (dayEntry.slots || []).forEach((s) => {
        daySlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      weeklyGroupMap[dayEntry.day] = daySlots;
    });
  }
  
  const dateGroupMap = {};
  if (dateSpecificHoursOverride) {
    const parsed = typeof dateSpecificHoursOverride === 'string' ? JSON.parse(dateSpecificHoursOverride) : dateSpecificHoursOverride;
    (Array.isArray(parsed) ? parsed : []).forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    let lessonCals;
    if (calenderId) {
      // Find specific calendar by ID
      const cal = await LessonCalender.findById(calenderId);
      lessonCals = cal ? [cal] : [];
    } else {
      // Find all calendars for user if no specific ID provided
      lessonCals = await LessonCalender.find({ user: userId });
    }

    if (!lessonCals || lessonCals.length === 0) {
      return { success: false, message: "No lesson calendar found" };
    }

    for (const cal of lessonCals) {
      // Update in weekly slots
      cal.weeklyHours.forEach((week) => {
        const daySlotMap = weeklyGroupMap[week.day] || {};
        week.slots.forEach((slot) => {
          const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
          if (lessonItem) {
            const slotKey = `${slot.start}-${slot.end}`;
            lessonItem.lessonGroup = slotKey in daySlotMap
              ? daySlotMap[slotKey]
              : (slot.slotGroup !== undefined && slot.slotGroup !== null) ? slot.slotGroup : groupFlag;
          }
        });
      });

      // Update in date-specific slots
      cal.dateSpecificHours.forEach((dateSlot) => {
        const dateSlotMap = dateGroupMap[dateSlot.date] || {};
        dateSlot.slots.forEach((slot) => {
          const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
          if (lessonItem) {
            const slotKey = `${slot.start}-${slot.end}`;
            lessonItem.lessonGroup = slotKey in dateSlotMap
              ? dateSlotMap[slotKey]
              : (slot.slotGroup !== undefined && slot.slotGroup !== null) ? slot.slotGroup : groupFlag;
          }
        });
      });

      await cal.save();
    }

    return { success: true, message: "Lesson updated in lesson calendars" };
  } catch (error) {
    console.error("updateLessonInLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// Remove lesson from specific calendar or all calendars if no calenderId provided
export const removeLessonFromLessonCalender = async (userId, lessonId, calenderId = null) => {
  try {
    let lessonCals;
    if (calenderId) {
      // Find specific calendar by ID
      const cal = await LessonCalender.findById(calenderId);
      lessonCals = cal ? [cal] : [];
    } else {
      // Find all calendars for user if no specific ID provided
      lessonCals = await LessonCalender.find({ user: userId });
    }

    if (!lessonCals || lessonCals.length === 0) {
      return { success: false, message: "No lesson calendar found" };
    }

    for (const cal of lessonCals) {
      // Remove from weekly slots
      cal.weeklyHours.forEach((week) => {
        week.slots.forEach((slot) => {
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        });
      });

      // Remove from date-specific slots
      cal.dateSpecificHours.forEach((dateSlot) => {
        dateSlot.slots.forEach((slot) => {
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        });
      });

      await cal.save();
    }

    return { success: true, message: "Lesson removed from lesson calendars" };
  } catch (error) {
    console.error("removeLessonFromLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== MAIN FUNCTIONS ====================

// Service helper to create a lesson calendar; returns a small result object instead of using res.
export const createLessonCalender = async ({
  weeklyHours = [],
  dateSpecificHours = [],
  timeZone = "UTC",
  userId,
  type,
  lessonId,
  calendarName = "Calendar",
}) => {
  try {
    if (!userId || !lessonId) {
      throw new Error(
        "userId and lessonId are required to create a lesson calendar"
      );
    }

    // Ensure arrays are objects, not stringified JSON
    let normalizedWeekly = parseArrayMaybe(weeklyHours);
    let normalizedDateSpecific = parseArrayMaybe(dateSpecificHours);

    // Normalize slot structure - transform incoming slots to match schema
    normalizedWeekly = normalizedWeekly.map(week => ({
      ...week,
      slots: (week.slots || []).map(slot => ({
        start: slot.start,
        end: slot.end,
        usecapacity: slot.capacity || slot.usecapacity || 0,
        lessons: [],
        slotGroup: slot.group // Store the slot-level group flag temporarily
      }))
    }));

    normalizedDateSpecific = normalizedDateSpecific.map(dateItem => ({
      ...dateItem,
      slots: (dateItem.slots || []).map(slot => ({
        start: slot.start,
        end: slot.end,
        usecapacity: slot.capacity || slot.usecapacity || 0,
        lessons: [],
        slotGroup: slot.group // Store the slot-level group flag temporarily
      }))
    }));

    const existing = await LessonCalender.findOne({ lesson: lessonId });
    if (existing) {
      return {
        created: false,
        reason: "already_exists",
        calenderId: existing._id,
      };
    }

    // Set lesson and lessonType fields based on type
    const newCalender = await LessonCalender.create({
      user: userId,
      lesson: type === "lesson" ? lessonId : undefined,
      curriculum: type === "curriculum" ? lessonId : undefined,
      name: calendarName,
      weeklyHours: normalizedWeekly,
      dateSpecificHours: normalizedDateSpecific,
      timeZone,
      type,
    });

    return { created: true, calenderId: newCalender._id };
  } catch (error) {
    console.error("createLessonCalender error:", error);
    return { created: false, error: error.message };
  }
};

// Service helper to update an existing lesson calendar
export const updateLessonCalender = async ({
  calenderId,
  lessonId,
  weeklyHours = [],
  dateSpecificHours = [],
  timeZone,
  calendarName,
}) => {
  try {
    // Ensure arrays are objects, not stringified JSON
    let normalizedWeekly = parseArrayMaybe(weeklyHours);
    let normalizedDateSpecific = parseArrayMaybe(dateSpecificHours);

    // Normalize slot structure - transform incoming slots to match schema
    if (normalizedWeekly.length > 0) {
      normalizedWeekly = normalizedWeekly.map(week => ({
        ...week,
        slots: (week.slots || []).map(slot => ({
          start: slot.start,
          end: slot.end,
          usecapacity: slot.capacity || slot.usecapacity || 0,
          lessons: slot.lessons || [] // Keep existing lessons if present
        }))
      }));
    }

    if (normalizedDateSpecific.length > 0) {
      normalizedDateSpecific = normalizedDateSpecific.map(dateItem => ({
        ...dateItem,
        slots: (dateItem.slots || []).map(slot => ({
          start: slot.start,
          end: slot.end,
          usecapacity: slot.capacity || slot.usecapacity || 0,
          lessons: slot.lessons || [] // Keep existing lessons if present
        }))
      }));
    }

    let cal = null;
    if (calenderId) {
      cal = await LessonCalender.findById(calenderId);
    } else if (lessonId) {
      cal = await LessonCalender.findOne({ lesson: lessonId });
    }

    if (!cal) {
      return { updated: false, reason: "not_found" };
    }

    if (normalizedWeekly.length > 0) cal.weeklyHours = normalizedWeekly;
    if (normalizedDateSpecific.length > 0) cal.dateSpecificHours = normalizedDateSpecific;
    if (timeZone) cal.timeZone = timeZone;
    if (calendarName) cal.name = calendarName;

    await cal.save();
    return { updated: true, calenderId: cal._id };
  } catch (error) {
    console.error("updateLessonCalender error:", error);
    return { updated: false, error: error.message };
  }
};

export const getLessonCalender = async (req, res) => {
  try {
    const availability = await LessonCalender.findOne({
      lesson: req.params.id,
    });

    if (!availability) {
      return res.json({
        status: true,
        data: {
          weeklyHours: [],
          dateSpecificHours: [],
          timeZone: "UTC",
        },
      });
    }

    res.json({
      status: true,
      data: availability,
    });
  } catch (error) {
    console.error("getAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
export const lessonCalenderByUser = async (req, res) => {
  try {
    // Find all lesson calendars for the user and populate lesson or curriculum based on which exists
    let data = await LessonCalender.find({ user: req.user._id })
      .populate({ path: "lesson", select: "title" })
      .populate({ path: "curriculum", select: "title" });

    if (!data) {
      return res.json({
        status: true,
        data: {
          weeklyHours: [],
          dateSpecificHours: [],
          timeZone: "UTC",
        },
      });
    }

    res.json({
      status: true,
      data,
    });
  } catch (error) {
    // console.error("getAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const lessonCalenderById = async (req, res) => {
  try {
    const availability = await LessonCalender.findById(req.params.id);

    if (!availability) {
      return res.json({
        status: true,
        data: {
          weeklyHours: [],
          dateSpecificHours: [],
          timeZone: "UTC",
        },
      });
    }

    res.json({
      status: true,
      data: availability,
    });
  } catch (error) {
    console.error("getAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateCalender = async (req, res) => {
  try {
    const { weeklyHours, dateSpecificHours, timeZone, name } = req.body;

    const availability = await LessonCalender.findById(req.params.id);

    if (!availability) {
      return res.status(404).json({
        status: false,
        message: "No availability found — create first",
      });
    }

    // Helper: merge incoming slots with existing ones, preserving lessons array
    // and syncing lessonGroup in each lesson to match the incoming slot's group value
    const mergeSlots = (incomingSlots, existingSlots) => {
      return incomingSlots.map((incomingSlot) => {
        const slotGroup = parseBool(incomingSlot.group);

        // Find matching existing slot to preserve its lessons array
        const existingSlot = existingSlots.find(
          (s) => s.start === incomingSlot.start && s.end === incomingSlot.end
        );

        // Determine the lessons array to use:
        // If incoming slot already has lessons (sent from Calendar.jsx with full data), use those
        // Otherwise fall back to existing slot's lessons
        const rawLessons = (incomingSlot.lessons && incomingSlot.lessons.length > 0)
          ? incomingSlot.lessons
          : (existingSlot?.lessons || []);

        // Sync each lesson's lessonGroup to match the new slot group value
        const updatedLessons = rawLessons.map((lessonEntry) => ({
          ...lessonEntry.toObject ? lessonEntry.toObject() : lessonEntry,
          lessonGroup: slotGroup,
        }));

        return {
          start: incomingSlot.start,
          end: incomingSlot.end,
          group: slotGroup,
          capacity: incomingSlot.capacity ?? existingSlot?.capacity ?? 0,
          usecapacity: incomingSlot.usecapacity ?? existingSlot?.usecapacity ?? 0,
          discount: incomingSlot.discount ?? existingSlot?.discount ?? 0,
          lessons: updatedLessons,
          ...(existingSlot?._id ? { _id: existingSlot._id } : {}),
        };
      });
    };

    // Update only if provided
    if (weeklyHours !== undefined) {
      const incomingWeekly = Array.isArray(weeklyHours) ? weeklyHours : [];
      availability.weeklyHours = incomingWeekly.map((incomingDay) => {
        // Find matching existing day
        const existingDay = availability.weeklyHours.find(
          (d) => d.day === incomingDay.day
        );
        return {
          day: incomingDay.day,
          available: incomingDay.available !== false,
          slots: mergeSlots(incomingDay.slots || [], existingDay?.slots || []),
          ...(existingDay?._id ? { _id: existingDay._id } : {}),
        };
      });
    }

    if (dateSpecificHours !== undefined) {
      const incomingDates = Array.isArray(dateSpecificHours) ? dateSpecificHours : [];
      availability.dateSpecificHours = incomingDates.map((incomingDate) => {
        // Find matching existing date entry
        const existingDate = availability.dateSpecificHours.find(
          (d) => d.date === incomingDate.date
        );
        return {
          date: incomingDate.date,
          available: incomingDate.available !== false,
          slots: mergeSlots(incomingDate.slots || [], existingDate?.slots || []),
          ...(existingDate?._id ? { _id: existingDate._id } : {}),
        };
      });
    }

    if (timeZone !== undefined) {
      availability.timeZone = timeZone;
    }

    if (name !== undefined && name.trim()) {
      availability.name = name;
    }

    await availability.save();

    res.json({
      status: true,
      message: "Availability updated successfully",
      data: availability,
    });
  } catch (error) {
    console.error("updateAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
