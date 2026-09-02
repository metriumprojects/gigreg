import Availability from "../models/availabilityModel.js";

// ==================== HELPER FUNCTIONS ====================

// Safe boolean parser for values that may be strings from form-data
const parseBool = (v) => v === true || v === "true";

// Add lesson to all user's availability slots
// weeklyHoursOverride/dateSpecificHoursOverride: optional arrays with per-slot group flags from frontend
export const addLessonToAvailability = async (userId, lessonId, isGroupAvailable = false, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  const weeklyGroupMap = {}; // { "Monday": { "09:00-10:00": true/false } }
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    parsed.forEach((dayEntry) => {
      const daySlots = {};
      (dayEntry.slots || []).forEach((s) => {
        daySlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      weeklyGroupMap[dayEntry.day] = daySlots;
    });
  }
  
  const dateGroupMap = {}; // { "2024-01-15": { "09:00-10:00": true/false } }
  if (dateSpecificHoursOverride) {
    const parsed = typeof dateSpecificHoursOverride === 'string' ? JSON.parse(dateSpecificHoursOverride) : dateSpecificHoursOverride;
    parsed.forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    const availability = await Availability.findOne({ user: userId });
    if (!availability) return { success: false, message: "Availability not found" };

    // Add lesson to all weekly slots
    availability.weeklyHours.forEach((week) => {
      const daySlotMap = weeklyGroupMap[week.day] || {};
      week.slots.forEach((slot) => {
        const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
        if (!exists) {
          // Use per-slot override if available, otherwise fall back to global flag
          const slotKey = `${slot.start}-${slot.end}`;
          const slotGroupFlag = slotKey in daySlotMap ? daySlotMap[slotKey] : groupFlag;
          slot.lessons.push({
            lesson: lessonId,
            lessonGroup: slotGroupFlag,
          });
        }
      });
    });

    // Add lesson to all date-specific slots
    availability.dateSpecificHours.forEach((dateSlot) => {
      const dateSlotMap = dateGroupMap[dateSlot.date] || {};
      dateSlot.slots.forEach((slot) => {
        const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
        if (!exists) {
          const slotKey = `${slot.start}-${slot.end}`;
          const slotGroupFlag = slotKey in dateSlotMap ? dateSlotMap[slotKey] : groupFlag;
          slot.lessons.push({
            lesson: lessonId,
            lessonGroup: slotGroupFlag,
          });
        }
      });
    });

    await availability.save();
    return { success: true, message: "Lesson added to availability" };
  } catch (error) {
    console.error("addLessonToAvailability error:", error);
    return { success: false, error: error.message };
  }
};

// Update lesson's group availability in all slots
export const updateLessonInAvailability = async (userId, lessonId, isGroupAvailable = false, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  // weeklyGroupMap: { "Monday": { "09:00-10:00": true/false } }
  const weeklyGroupMap = {};
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    parsed.forEach((dayEntry) => {
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
    parsed.forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    const availability = await Availability.findOne({ user: userId });
    if (!availability) return { success: false, message: "Availability not found" };

    // Update in weekly slots
    availability.weeklyHours.forEach((week) => {
      const hasOverrideForDay = week.day in weeklyGroupMap;
      const daySlotMap = weeklyGroupMap[week.day] || {};
      const overrideSlotKeys = new Set(Object.keys(daySlotMap));

      week.slots.forEach((slot) => {
        const slotKey = `${slot.start}-${slot.end}`;
        const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
        
        if (overrideSlotKeys.has(slotKey)) {
          // Slot exists in override — update or add the lesson
          if (lessonItem) {
            lessonItem.lessonGroup = daySlotMap[slotKey];
          } else {
            // Lesson not in this slot yet — add it
            slot.lessons.push({ lesson: lessonId, lessonGroup: daySlotMap[slotKey] });
          }
          overrideSlotKeys.delete(slotKey);
        } else if (lessonItem && hasOverrideForDay) {
          // Slot exists in DB but NOT in override and we have override data for this day — user removed it
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        }
        // If no override data for this day, leave lessonGroup unchanged
      });

      // Add new slots that exist in override but not in DB
      overrideSlotKeys.forEach((slotKey) => {
        const [start, end] = slotKey.split('-');
        const slotGroupFlag = daySlotMap[slotKey];
        week.slots.push({
          start,
          end,
          group: slotGroupFlag,
          lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
        });
      });
    });

    // Update in date-specific slots
    availability.dateSpecificHours.forEach((dateSlot) => {
      const hasOverrideForDate = dateSlot.date in dateGroupMap;
      const dateSlotMap = dateGroupMap[dateSlot.date] || {};
      const overrideSlotKeys = new Set(Object.keys(dateSlotMap));

      dateSlot.slots.forEach((slot) => {
        const slotKey = `${slot.start}-${slot.end}`;
        const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
        
        if (overrideSlotKeys.has(slotKey)) {
          if (lessonItem) {
            lessonItem.lessonGroup = dateSlotMap[slotKey];
          } else {
            slot.lessons.push({ lesson: lessonId, lessonGroup: dateSlotMap[slotKey] });
          }
          overrideSlotKeys.delete(slotKey);
        } else if (lessonItem && hasOverrideForDate) {
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        }
        // If no override data for this date, leave lessonGroup unchanged
      });

      // Add new slots
      overrideSlotKeys.forEach((slotKey) => {
        const [start, end] = slotKey.split('-');
        const slotGroupFlag = dateSlotMap[slotKey];
        dateSlot.slots.push({
          start,
          end,
          group: slotGroupFlag,
          lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
        });
      });
    });

    // Add new date entries from override that don't exist in DB at all
    Object.keys(dateGroupMap).forEach((dateStr) => {
      const existingDate = availability.dateSpecificHours.find(d => d.date === dateStr);
      if (!existingDate) {
        const dateSlotMap = dateGroupMap[dateStr];
        const newSlots = Object.entries(dateSlotMap).map(([slotKey, slotGroupFlag]) => {
          const [start, end] = slotKey.split('-');
          return {
            start,
            end,
            group: slotGroupFlag,
            lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
          };
        });
        availability.dateSpecificHours.push({
          date: dateStr,
          available: true,
          slots: newSlots
        });
      }
    });

    await availability.save();
    return { success: true, message: "Lesson updated in availability" };
  } catch (error) {
    console.error("updateLessonInAvailability error:", error);
    return { success: false, error: error.message };
  }
};

// Remove lesson from all user's availability slots
export const removeLessonFromAvailability = async (userId, lessonId) => {
  try {
    const availability = await Availability.findOne({ user: userId });
    if (!availability) return { success: false, message: "Availability not found" };

    // Remove from weekly slots
    availability.weeklyHours.forEach((week) => {
      week.slots.forEach((slot) => {
        slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
      });
    });

    // Remove from date-specific slots
    availability.dateSpecificHours.forEach((dateSlot) => {
      dateSlot.slots.forEach((slot) => {
        slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
      });
    });

    await availability.save();
    return { success: true, message: "Lesson removed from availability" };
  } catch (error) {
    console.error("removeLessonFromAvailability error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== LESSON CALENDER HELPER FUNCTIONS ====================

// Add lesson to specific lessonCalender's slots
export const addLessonToLessonCalender = async (userId, lessonId, isGroupAvailable = false, calenderId = null, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  const weeklyGroupMap = {};
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    parsed.forEach((dayEntry) => {
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
    parsed.forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    const { LessonCalender } = await import("../models/LessonCalender.js");
    
    const query = { user: userId };
    if (calenderId) {
      query._id = calenderId;
    }
    
    const lessonCalender = await LessonCalender.findOne(query);
    if (!lessonCalender) return { success: false, message: "LessonCalender not found" };

    // Add lesson to all weekly slots
    lessonCalender.weeklyHours.forEach((week) => {
      const daySlotMap = weeklyGroupMap[week.day] || {};
      week.slots.forEach((slot) => {
        const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
        if (!exists) {
          const slotKey = `${slot.start}-${slot.end}`;
          const slotGroupFlag = slotKey in daySlotMap ? daySlotMap[slotKey] : (slot.slotGroup != null ? slot.slotGroup : groupFlag);
          slot.lessons.push({
            lesson: lessonId,
            lessonGroup: slotGroupFlag,
          });
        }
      });
    });

    // Add lesson to all date-specific slots
    lessonCalender.dateSpecificHours.forEach((dateSlot) => {
      const dateSlotMap = dateGroupMap[dateSlot.date] || {};
      dateSlot.slots.forEach((slot) => {
        const exists = slot.lessons.some((l) => l.lesson.toString() === lessonId.toString());
        if (!exists) {
          const slotKey = `${slot.start}-${slot.end}`;
          const slotGroupFlag = slotKey in dateSlotMap ? dateSlotMap[slotKey] : (slot.slotGroup != null ? slot.slotGroup : groupFlag);
          slot.lessons.push({
            lesson: lessonId,
            lessonGroup: slotGroupFlag,
          });
        }
      });
    });

    await lessonCalender.save();
    return { success: true, message: "Lesson added to lessonCalender" };
  } catch (error) {
    console.error("addLessonToLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// Update lesson's group availability in lessonCalender slots
export const updateLessonInLessonCalender = async (userId, lessonId, isGroupAvailable = false, calenderId = null, weeklyHoursOverride = null, dateSpecificHoursOverride = null) => {
  const groupFlag = parseBool(isGroupAvailable);
  
  // Build lookup maps for per-slot group overrides
  const weeklyGroupMap = {};
  if (weeklyHoursOverride) {
    const parsed = typeof weeklyHoursOverride === 'string' ? JSON.parse(weeklyHoursOverride) : weeklyHoursOverride;
    parsed.forEach((dayEntry) => {
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
    parsed.forEach((dateEntry) => {
      const dateSlots = {};
      (dateEntry.slots || []).forEach((s) => {
        dateSlots[`${s.start}-${s.end}`] = parseBool(s.group);
      });
      dateGroupMap[dateEntry.date] = dateSlots;
    });
  }
  
  try {
    const { LessonCalender } = await import("../models/LessonCalender.js");
    
    const query = { user: userId };
    if (calenderId) {
      query._id = calenderId;
    }
    
    const lessonCalender = await LessonCalender.findOne(query);
    if (!lessonCalender) return { success: false, message: "LessonCalender not found" };

    // Update in weekly slots
    lessonCalender.weeklyHours.forEach((week) => {
      const hasOverrideForDay = week.day in weeklyGroupMap;
      const daySlotMap = weeklyGroupMap[week.day] || {};
      const overrideSlotKeys = new Set(Object.keys(daySlotMap));

      week.slots.forEach((slot) => {
        const slotKey = `${slot.start}-${slot.end}`;
        const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
        
        if (overrideSlotKeys.has(slotKey)) {
          if (lessonItem) {
            lessonItem.lessonGroup = daySlotMap[slotKey];
          } else {
            slot.lessons.push({ lesson: lessonId, lessonGroup: daySlotMap[slotKey] });
          }
          overrideSlotKeys.delete(slotKey);
        } else if (lessonItem && hasOverrideForDay) {
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        }
        // If no override data for this day, leave lessonGroup unchanged
      });

      // Add new slots that exist in override but not in DB
      overrideSlotKeys.forEach((slotKey) => {
        const [start, end] = slotKey.split('-');
        const slotGroupFlag = daySlotMap[slotKey];
        week.slots.push({
          start,
          end,
          slotGroup: slotGroupFlag,
          lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
        });
      });
    });

    // Update in date-specific slots
    lessonCalender.dateSpecificHours.forEach((dateSlot) => {
      const hasOverrideForDate = dateSlot.date in dateGroupMap;
      const dateSlotMap = dateGroupMap[dateSlot.date] || {};
      const overrideSlotKeys = new Set(Object.keys(dateSlotMap));

      dateSlot.slots.forEach((slot) => {
        const slotKey = `${slot.start}-${slot.end}`;
        const lessonItem = slot.lessons.find((l) => l.lesson.toString() === lessonId.toString());
        
        if (overrideSlotKeys.has(slotKey)) {
          if (lessonItem) {
            lessonItem.lessonGroup = dateSlotMap[slotKey];
          } else {
            slot.lessons.push({ lesson: lessonId, lessonGroup: dateSlotMap[slotKey] });
          }
          overrideSlotKeys.delete(slotKey);
        } else if (lessonItem && hasOverrideForDate) {
          slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
        }
        // If no override data for this date, leave lessonGroup unchanged
      });

      // Add new slots
      overrideSlotKeys.forEach((slotKey) => {
        const [start, end] = slotKey.split('-');
        const slotGroupFlag = dateSlotMap[slotKey];
        dateSlot.slots.push({
          start,
          end,
          slotGroup: slotGroupFlag,
          lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
        });
      });
    });

    // Add new date entries from override that don't exist in DB at all
    Object.keys(dateGroupMap).forEach((dateStr) => {
      const existingDate = lessonCalender.dateSpecificHours.find(d => d.date === dateStr);
      if (!existingDate) {
        const dateSlotMap = dateGroupMap[dateStr];
        const newSlots = Object.entries(dateSlotMap).map(([slotKey, slotGroupFlag]) => {
          const [start, end] = slotKey.split('-');
          return {
            start,
            end,
            slotGroup: slotGroupFlag,
            lessons: [{ lesson: lessonId, lessonGroup: slotGroupFlag }]
          };
        });
        lessonCalender.dateSpecificHours.push({
          date: dateStr,
          available: true,
          slots: newSlots
        });
      }
    });

    await lessonCalender.save();
    return { success: true, message: "Lesson updated in lessonCalender" };
  } catch (error) {
    console.error("updateLessonInLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// Remove lesson from lessonCalender slots
export const removeLessonFromLessonCalender = async (userId, lessonId, calenderId = null) => {
  try {
    const { LessonCalender } = await import("../models/LessonCalender.js");
    
    const query = { user: userId };
    if (calenderId) {
      query._id = calenderId;
    }
    
    const lessonCalender = await LessonCalender.findOne(query);
    if (!lessonCalender) return { success: false, message: "LessonCalender not found" };

    // Remove from weekly slots
    lessonCalender.weeklyHours.forEach((week) => {
      week.slots.forEach((slot) => {
        slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
      });
    });

    // Remove from date-specific slots
    lessonCalender.dateSpecificHours.forEach((dateSlot) => {
      dateSlot.slots.forEach((slot) => {
        slot.lessons = slot.lessons.filter((l) => l.lesson.toString() !== lessonId.toString());
      });
    });

    await lessonCalender.save();
    return { success: true, message: "Lesson removed from lessonCalender" };
  } catch (error) {
    console.error("removeLessonFromLessonCalender error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== ROUTE HANDLERS ====================

export const createAvailability = async (req, res) => {
  try {
    const userId = req.user._id;
    const { weeklyHours, dateSpecificHours, timeZone } = req.body;

    // Check if exists already
    const existing = await Availability.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({
        status: false,
        message: "Availability already exists — use update instead"
      });
    }

    const newAvailability = await Availability.create({
      user: userId,
      weeklyHours: weeklyHours || [],
      dateSpecificHours: dateSpecificHours || [],
      timeZone: timeZone || "UTC"
    });

    res.json({
      status: true,
      message: "Availability created successfully",
      data: newAvailability
    });

  } catch (error) {
    console.error("createAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const userId = req.user._id;
    const { weeklyHours, dateSpecificHours, timeZone } = req.body;

    const availability = await Availability.findOne({ user: userId });

    if (!availability) {
      return res.status(404).json({
        status: false,
        message: "No availability found — create first"
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
        // If incoming slot already has lessons (sent with full data), use those
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

    await availability.save();

    res.json({
      status: true,
      message: "Availability updated successfully",
      data: availability
    });

  } catch (error) {
    console.error("updateAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
export const getAvailability = async (req, res) => {
  try {
    const availability = await Availability.findOne({ user: req.user._id });

    if (!availability) {
      return res.json({
        status: true,
        data: {
          weeklyHours: [],
          dateSpecificHours: [],
          timeZone: "UTC"
        }
      });
    }

    res.json({
      status: true,
      data: availability
    });

  } catch (error) {
    console.error("getAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
export const teacherAvailability = async (req, res) => {
  try {
    const {id}=req.params
    const availability = await Availability.findOne({ user: id });

    if (!availability) {
      return res.json({
        status: true,
        data: {
          weeklyHours: [],
          dateSpecificHours: [],
          timeZone: "UTC"
        }
      });
    }
    res.json({
      status: true,
      data: availability
    });

  } catch (error) {
    console.error("getAvailability error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
