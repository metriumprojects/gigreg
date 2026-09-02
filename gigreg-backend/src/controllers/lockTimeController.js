import moment from "moment-timezone";
import LockTime from "../models/lockTimeModel.js";

const calculateEndTime = (startDateUTC, durationMinutes) => {
  return moment(startDateUTC).add(durationMinutes, "minutes").toDate();
};

const formatTime = (date, timezone) => {
  return moment(date).tz(timezone).format("HH:mm");
};

const parseDurationToMinutes = (duration) => {
  if (!duration) return 60;

  if (duration.includes("h")) {
    return parseInt(duration) * 60;
  }

  if (duration.includes("m")) {
    return parseInt(duration);
  }

  return 60;
};

const isSlotOverlapping = (startA, endA, startB, endB) => {
  return startA < endB && startB < endA;
};


export const checkAndSaveSlot = async ({
  teacher,
  scheduledAtUTC,
  timezone,
  duration,
  lessonId = null,
  group = false,
  usecapacity = 1,
  capacity = 0,
}) => {
  const durationMinutes = parseDurationToMinutes(duration);

  const startUTC = scheduledAtUTC;
  const endUTC = calculateEndTime(startUTC, durationMinutes);

  const bookingDate = moment(startUTC).tz(timezone).format("YYYY-MM-DD");
  const dayName = moment(startUTC).tz(timezone).format("ddd"); // Mon, Tue

  const startTime = formatTime(startUTC, timezone);
  const endTime = formatTime(endUTC, timezone);

  let lockTime = await LockTime.findOne({ user: teacher });

  if (!lockTime) {
    lockTime = await LockTime.create({
      user: teacher,
      timeZone: timezone,
      weeklyHours: [],
      dateSpecificHours: [],
    });
  }

  // 🔍 Date-specific availability check
  let dateEntry = lockTime.dateSpecificHours.find(d => d.date === bookingDate);

  if (!dateEntry) {
    dateEntry = {
      date: bookingDate,
      available: true,
      slots: [],
    };
    lockTime.dateSpecificHours.push(dateEntry);
  }

  if (!dateEntry.available) {
    throw new Error("Teacher not available on selected date");
  }

  // 🔍 Find existing slot with same time (used for grouping)
  const existingSlot = dateEntry.slots.find(
    (s) => s.start === startTime && s.end === endTime
  );
  const normalizedLessonId = lessonId ? String(lessonId) : null;

  // 🔍 Slot overlap check (skip the exact same slot when grouping)
  for (const slot of dateEntry.slots) {
    const sameLesson =
      !normalizedLessonId || !slot.lessonId || String(slot.lessonId) === normalizedLessonId;
    const canShareGroupSlot =
      (group || slot.group) && existingSlot && slot === existingSlot && sameLesson;

    // allow reusing the exact same slot window when grouping
    if (canShareGroupSlot) continue;

    const slotStart = moment(`${bookingDate} ${slot.start}`, "YYYY-MM-DD HH:mm")
      .tz(timezone)
      .toDate();

    const slotEnd = moment(`${bookingDate} ${slot.end}`, "YYYY-MM-DD HH:mm")
      .tz(timezone)
      .toDate();

    if (isSlotOverlapping(startUTC, endUTC, slotStart, slotEnd)) {
      throw new Error("Selected time slot already booked");
    }
  }

  if ((group || existingSlot?.group) && existingSlot) {
    const maxCapacity = Number(capacity || 0);
    if (maxCapacity > 0 && (existingSlot.usecapacity || 0) >= maxCapacity) {
      throw new Error("Selected time slot is fully booked");
    }

    existingSlot.group = true;
    existingSlot.usecapacity = (existingSlot.usecapacity || 0) + 1;
    if (lessonId) existingSlot.lessonId = lessonId;
  } else {
    // ✅ Slot save (new slot)
    dateEntry.slots.push({
      start: startTime,
      end: endTime,
      group,
      usecapacity: group ? 1 : usecapacity || 1,
      lessonId: lessonId || undefined,
    });
  }

  await lockTime.save();

  return { startTime, endTime };
};

export const releaseSlot = async ({
  teacher,
  scheduledAtUTC,
  timezone,
  duration,
  group = false,
  usecapacity = 1,
}) => {
  if (!teacher || !scheduledAtUTC || !timezone) return null;

  const durationMinutes = parseDurationToMinutes(duration);
  const startUTC = scheduledAtUTC;
  const endUTC = calculateEndTime(startUTC, durationMinutes);
  const bookingDate = moment(startUTC).tz(timezone).format("YYYY-MM-DD");
  const startTime = formatTime(startUTC, timezone);
  const endTime = formatTime(endUTC, timezone);

  const lockTime = await LockTime.findOne({ user: teacher });
  if (!lockTime) return null;

  const dateEntry = lockTime.dateSpecificHours.find((d) => d.date === bookingDate);
  if (!dateEntry) return null;

  const slotIndex = dateEntry.slots.findIndex(
    (slot) => slot.start === startTime && slot.end === endTime
  );

  if (slotIndex === -1) return null;

  const slot = dateEntry.slots[slotIndex];
  if (group && slot.usecapacity > (usecapacity || 1)) {
    slot.usecapacity -= usecapacity || 1;
  } else {
    dateEntry.slots.splice(slotIndex, 1);
  }

  if (dateEntry.slots.length === 0) {
    lockTime.dateSpecificHours = lockTime.dateSpecificHours.filter(
      (dateSlot) => dateSlot.date !== bookingDate
    );
  }

  await lockTime.save();
  return { startTime, endTime };
};

const cleanPastDateSpecificHours = async (lockTime) => {
  if (!lockTime?.dateSpecificHours?.length) return;

  const today = moment().tz(lockTime.timeZone || "UTC").format("YYYY-MM-DD");

  // sirf aaj aur future ki dates rakho
  lockTime.dateSpecificHours = lockTime.dateSpecificHours.filter(
    d => d.date >= today
  );

  await lockTime.save();
};

export const getTimeLockByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);

    let lockTime = await LockTime.findOne({ user: userId })
      .populate("user", "name email");

    if (!lockTime) {
      return res.status(404).json({
        status: false,
        message: "No time lock found for this user",
      });
    }

    // 🧹 AUTO DELETE PAST DATES
    // await cleanPastDateSpecificHours(lockTime);

    return res.status(200).json({
      status: true,
      data: lockTime,
    });

  } catch (error) {
    console.error("getTimeLockByUser error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
