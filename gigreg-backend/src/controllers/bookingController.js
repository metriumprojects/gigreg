import Curriculum from "../models/Curriculum.js";
import Booking from "../models/Booking.js";
import sendEmail from "../utils/sendEmail.js";
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";
import Lesson from "../models/Lesson.js";
import Listing from "../models/Listing.js";
import User from "../models/User.js";
import moment from "moment-timezone";
import { parseLessonDuration } from "../utils/utils.js";
import { escapeHtml } from "../utils/sanitize.js";
import { checkAndSaveSlot, isSlotAvailable, releaseSlot } from "./lockTimeController.js";
import Availability from "../models/availabilityModel.js";
import LessonCalender from "../models/LessonCalender.js";
import {
  requireCurrency,
  requireMinimumStripeCharge,
  requirePositivePrice,
  roundMoney,
  toSmallestUnit,
} from "../services/currencyService.js";
import { convertWithStripeFx } from "../services/stripeFxService.js";
import { getCommissionRate } from "../services/appSettingsService.js";
import { getFrontendUrl, getStripe } from "../services/stripeService.js";
import { processPendingTeacherPayouts } from "./stripeConnectController.js";
import { sendPushNotification } from "../services/notificationService.js";
import { emitChatMessage, emitChatMessageUpdate } from "../socket/socketHandler.js";

const stripe = getStripe();

export const ORDER_AUTO_COMPLETE_DAYS = Math.max(1, Number(process.env.ORDER_AUTO_COMPLETE_DAYS) || 3);
const ORDER_AUTO_COMPLETE_MS = ORDER_AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000;

const activeBookingFilter = {
  status: { $ne: "cancelled" },
  $or: [
    { paymentStatus: "paid" },
    { payment_status: "paid" },
    { status: "paid" },
    { status: "scheduled" },
  ],
};

const releaseBookedSlot = async ({ teacher, scheduledAt, timezone, duration, group, usecapacity }) => {
  if (!teacher || !scheduledAt || !timezone) return;

  await releaseSlot({
    teacher,
    scheduledAtUTC: scheduledAt,
    timezone,
    duration: duration || "60m",
    group: group || false,
    usecapacity: usecapacity || 1,
  });
};

const parseTimeForDate = (dateKey, time, timezone) => {
  const [timeValue, modifier] = String(time || "").trim().split(" ");
  let [hours, minutes] = String(timeValue || "").split(":").map(Number);

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return moment
    .tz(
      `${dateKey} ${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`,
      "YYYY-MM-DD HH:mm:ss",
      timezone
    )
    .utc()
    .toDate();
};

const getListingBookingSlots = (booking, listing) => {
  const selectedDate = booking.meta?.selectedDate || booking.itemSnapshot?.selectedDate;
  const selectedTimes = booking.meta?.selectedTimes || booking.itemSnapshot?.selectedTimes;

  if (selectedDate && Array.isArray(selectedTimes) && selectedTimes.length) {
    return selectedTimes.map((time) => ({
      scheduledAt: parseTimeForDate(selectedDate, time, booking.timezone),
      duration: listing?.duration || booking.itemSnapshot?.duration || "60m",
    }));
  }

  return booking.scheduledAt
    ? [{ scheduledAt: booking.scheduledAt, duration: listing?.duration || booking.itemSnapshot?.duration || "60m" }]
    : [];
};

const formatServerHoursLabel = (totalMinutes) => {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "";
  if (totalMinutes < 60) return `${totalMinutes} mins`;
  const hours = totalMinutes / 60;
  const formatted = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "");
  return `${formatted} ${Number(formatted) === 1 ? "hour" : "hours"}`;
};

export const verifyStripeSessionMatchesBooking = ({ session = null, paymentIntent = null, booking }) => {
  if (!booking) {
    return { ok: false, reason: "Booking record missing" };
  }
  const expectedCurrency = requireCurrency(booking.chargedCurrency || booking.currency || "USD");
  const expectedMajor = booking.chargedAmount ?? booking.amount;
  const expectedMinor = toSmallestUnit(expectedMajor, expectedCurrency);
  const bookingIdStr = String(booking._id);

  if (session) {
    if (session.metadata?.bookingId && String(session.metadata.bookingId) !== bookingIdStr) {
      return { ok: false, reason: "Stripe session bookingId mismatch" };
    }
    if (session.currency && String(session.currency).toUpperCase() !== expectedCurrency) {
      return { ok: false, reason: "Stripe session currency mismatch" };
    }
    if (typeof session.amount_total === "number" && session.amount_total !== expectedMinor) {
      return { ok: false, reason: "Stripe session amount mismatch" };
    }
  } else if (paymentIntent) {
    if (paymentIntent.metadata?.bookingId && String(paymentIntent.metadata.bookingId) !== bookingIdStr) {
      return { ok: false, reason: "Stripe payment intent bookingId mismatch" };
    }
    if (paymentIntent.currency && String(paymentIntent.currency).toUpperCase() !== expectedCurrency) {
      return { ok: false, reason: "Stripe payment intent currency mismatch" };
    }
    const received = paymentIntent.amount_received ?? paymentIntent.amount;
    if (typeof received === "number" && received < expectedMinor) {
      return { ok: false, reason: "Stripe payment intent amount below expected total" };
    }
  }

  return { ok: true };
};

export const checkAvailablityBooking = async (req, res) => {
  try {
    const { lId, newDate, timezone } = req.body;

    if (!newDate || !timezone || !lId) {
      return res.status(400).json({
        message: "lId, newDate and timezone are required",
      });
    }

    // Convert local â†’ UTC
    const newStartUTC = moment.tz(newDate, timezone).utc().toDate();

    // ============================================================
    // 1ï¸âƒ£ GET LESSON (to extract teacher + duration)
    // ============================================================

    const lessonData = await Lesson.findById(lId);
    if (!lessonData) {
      return res.status(404).json({
        status: false,
        message: "Lesson not found",
      });
    }

    const teacherId = lessonData.createdBy; // ðŸŸ¢ teacher found from lesson schema
    const duration = parseLessonDuration(lessonData.duration || "60m");
    const requestedLessonId = String(lessonData._id);
    const requestedIsGroup = lessonData.isGroupAvailable === true;

    const newEndUTC = moment(newStartUTC).add(duration, "minutes").toDate();

    // ============================================================
    // 2ï¸âƒ£ CHECK STUDENT'S OWN BOOKINGS
    // ============================================================

    const userBookingsAtTime = await Booking.find({
      user: req.user._id,
      ...activeBookingFilter,
    }).populate("lesson");

    for (const b of userBookingsAtTime) {
      if (b.scheduledAt) {
        const existStart = b.scheduledAt;
        const existEnd = moment(existStart)
          .add(parseLessonDuration(b.lesson?.duration || "60m"), "minutes")
          .toDate();

        if (newStartUTC < existEnd && newEndUTC > existStart) {
          return res.status(400).json({
            status: false,
            message: "You already have a booking at this time.",
          });
        }
      }

      if (Array.isArray(b.lessonPosition)) {
        for (const pos of b.lessonPosition) {
          if (!pos.scheduledAt || pos.status === "cancelled") continue;

          const posStart = pos.scheduledAt;
          const posEnd = moment(posStart)
            .add(parseLessonDuration(pos.duration || b.lesson?.duration || "60m"), "minutes")
            .toDate();

          if (newStartUTC < posEnd && newEndUTC > posStart) {
            return res.status(400).json({
              status: false,
              message: "You already have a booking at this time.",
            });
          }
        }
      }
    }

    // ============================================================
    // 3ï¸âƒ£ GET ALL BOOKINGS OF THIS TEACHER
    // ============================================================

    const teacherBookings = await Booking.find({
      teacher: teacherId,
      ...activeBookingFilter,
    }).populate("lesson");

    // ============================================================
    // 4ï¸âƒ£ CHECK ALL POSSIBLE OVERLAPS
    // ============================================================

    for (const b of teacherBookings) {
      const mainDur = parseLessonDuration(b.lesson?.duration || "60m");

      // A) MAIN scheduledAt check
      if (b.scheduledAt) {
        const existStart = b.scheduledAt;
        const existEnd = moment(existStart).add(mainDur, "minutes").toDate();

        if (newStartUTC < existEnd && newEndUTC > existStart) {
          // âœ… Allow overlap if existing booking is a GROUP lesson (group: true)
          const sameLesson = b.lesson?._id && String(b.lesson._id) === requestedLessonId;
          const existingIsGroup = b.group === true || b.lesson?.isGroupAvailable === true;
          if (sameLesson && requestedIsGroup && existingIsGroup) {
            continue; // Group slots can accommodate multiple students
          }

          return res.status(400).json({
            status: false,
            message: "Teacher already has another class at this time.",
          });
        }
      }

      // B) lessonPosition check
      if (Array.isArray(b.lessonPosition)) {
        for (const pos of b.lessonPosition) {
          if (!pos.scheduledAt) continue;

          const posDur = parseLessonDuration(
            pos.duration || b.lesson?.duration || "60m"
          );

          const posStart = pos.scheduledAt;
          const posEnd = moment(posStart).add(posDur, "minutes").toDate();

          if (newStartUTC < posEnd && newEndUTC > posStart) {
            // âœ… Allow overlap if existing booking position is a GROUP lesson
            if (pos.group === true) {
              continue; // Group slots can accommodate multiple students
            }

            return res.status(400).json({
              status: false,
              message: "Teacher has another lesson during this slot.",
            });
          }
        }
      }
    }

    // ============================================================
    // 5ï¸âƒ£ AVAILABLE
    // ============================================================

    return res.json({
      status: true,
      available: true,
      message: "Slot is available.",
    });
  } catch (error) {
    console.log(error);
    return res.status(error.status || 500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const initiateBooking = async (req, res) => {
  try {
    const {
      id,
      scheduledAt,
      timezone,
      firstname,
      lastname,
      country,
      checkoutCurrency = "USD",
      type,
      meta
    } = req.body;

    let parsedMeta = {};
    if (meta !== undefined && meta !== null && meta !== "") {
      try {
        parsedMeta = typeof meta === "string" ? JSON.parse(meta) : meta;
      } catch {
        return res.status(400).json({ status: false, message: "Invalid meta payload" });
      }
      if (!parsedMeta || typeof parsedMeta !== "object" || Array.isArray(parsedMeta)) {
        return res.status(400).json({ status: false, message: "Invalid meta payload" });
      }
    }
    const requestedCurrency = requireCurrency(checkoutCurrency);

    if (!id || !firstname || !lastname || !type) {
      return res.status(400).json({
        status: false,
        message: "id, firstname, lastname, and type are required",
      });
    }

    if (!["listing", "lesson", "curriculum"].includes(type)) {
      return res.status(400).json({
        status: false,
        message: "Invalid booking type",
      });
    }

    if (type !== "listing") {
      return res.status(410).json({
        status: false,
        message: "Legacy lesson and curriculum bookings are disabled. Only listing bookings are supported.",
      });
    }

    let itemData = null;
    let itemName = "";
    let amountFloat = 0;
    let teacher = null;
    let lessonList = [];
    let teacherName = "";
    let productImage = "";
    let bookingCurrencyOverride = null;
    let bookingSnapshot = null;

    // ----------------------------------------------------------------
    // ðŸ“Œ CURRICULUM BOOKING
    // ----------------------------------------------------------------
    if (type === "curriculum") {
      itemData = await Curriculum.findById(id).populate(
        "createdBy",
        "_id name"
      );
      if (!itemData) {
        return res
          .status(404)
          .json({ status: false, message: "Curriculum not found" });
      }

      itemName = itemData.title;
      amountFloat = itemData.price || 0;
      teacher = itemData.createdBy?._id;
      teacherName = itemData.createdBy?.name;
      productImage = itemData.coverImage.url;
      bookingSnapshot = {
        itemId: itemData._id,
        title: itemData.title,
        price: itemData.price || 0,
        currency: itemData.currency || "USD",
        duration: itemData.duration,
        pricingType: "lesson",
      };

      // Load all curriculum lessons
      lessonList = await Lesson.find({ curriculums: id }).sort({ position: 1 });

      if (!lessonList.length) {
        return res.status(400).json({
          status: false,
          message: "No lessons found under this curriculum",
        });
      }
    }

    // ----------------------------------------------------------------
    // ðŸ“Œ LESSON BOOKING
    // ----------------------------------------------------------------
    else if (type === "lesson") {
      itemData = await Lesson.findById(id).populate("createdBy", "_id name");
      if (!itemData) {
        return res
          .status(404)
          .json({ status: false, message: "Lesson not found" });
      }

      itemName = itemData.title;
      amountFloat = itemData.price || 0;
      teacher = itemData.createdBy?._id;
      teacherName = itemData.createdBy?.name;
      productImage = itemData.coverImage.url;
    }
    else if (type === "listing") {
      itemData = await Listing.findById(id).populate("createdBy", "_id name");
      if (!itemData) {
        return res
          .status(404)
          .json({ status: false, message: "Listing not found" });
      }

      if (String(itemData.status || "").toLowerCase() !== "active") {
        return res.status(400).json({
          status: false,
          message: "This listing is not currently available for booking",
        });
      }

      const quoteCheckout = Boolean(parsedMeta?.quoteMessageId);

      if (!["fixed", "hourly_calendar", "hourly", "fixed_on_demand"].includes(itemData.pricingType)) {
        return res.status(400).json({
          status: false,
          message: "This listing must be requested by quote",
        });
      }

      if (itemData.pricingType === "fixed_on_demand" && !quoteCheckout) {
        return res.status(400).json({
          status: false,
          message: "This listing must be purchased from an accepted quote",
        });
      }

      if (itemData.pricingType === "hourly_calendar" && (!scheduledAt || !timezone)) {
        return res.status(400).json({
          status: false,
          message: "Date, time and timezone are required for calendar listings",
        });
      }

      const rawSelectedTimes = Array.isArray(parsedMeta.selectedTimes)
        ? parsedMeta.selectedTimes
            .filter((t) => typeof t === "string" && t.trim())
            .map((t) => t.trim())
        : [];
      const sanitizedSelectedTimes = [...new Set(rawSelectedTimes)];
      if (sanitizedSelectedTimes.length > 24) {
        return res.status(400).json({
          status: false,
          message: "Too many time slots selected in a single booking",
        });
      }

      const slotMinutes = parseLessonDuration(itemData.duration || "60m");
      const baseBookedHours = itemData.duration ? formatServerHoursLabel(slotMinutes) : "";

      itemName = itemData.title;
      amountFloat = itemData.price || 0;
      teacher = itemData.createdBy?._id;
      teacherName = itemData.createdBy?.name;
      productImage = itemData.coverImage?.url;
      bookingSnapshot = {
        itemId: itemData._id,
        title: itemData.title,
        price: itemData.price || 0,
        currency: itemData.currency || "USD",
        duration: itemData.duration || "",
        pricingType: itemData.pricingType,
        quantity: 1,
        bookedHours: baseBookedHours,
        selectedDate: typeof parsedMeta.selectedDate === "string" ? parsedMeta.selectedDate.trim() : "",
        selectedTimes: sanitizedSelectedTimes,
      };

      if (quoteCheckout) {
        const quoteMessage = await Message.findById(parsedMeta.quoteMessageId);
        if (
          !quoteMessage ||
          quoteMessage.type !== "quote" ||
          String(quoteMessage.quote?.listingId) !== String(itemData._id) ||
          quoteMessage.quote?.status !== "open"
        ) {
          return res.status(400).json({ status: false, message: "Valid open quote not found" });
        }
        if (String(quoteMessage.userId) !== String(itemData.createdBy?._id)) {
          return res.status(403).json({ status: false, message: "Quote was not issued by the listing seller" });
        }
        const quoteRoom = await ChatRoom.findById(quoteMessage.roomId).select("student teacher");
        if (!quoteRoom || String(quoteRoom.student) !== String(req.user._id) || String(quoteRoom.teacher) !== String(itemData.createdBy?._id)) {
          return res.status(403).json({ status: false, message: "This quote does not belong to this booking" });
        }
        const existingPaidQuoteBooking = await Booking.findOne({
          "meta.quoteMessageId": { $in: [quoteMessage._id, String(quoteMessage._id)] },
          paymentStatus: "paid",
        }).select("_id");
        if (existingPaidQuoteBooking) {
          return res.status(400).json({ status: false, message: "This quote has already been paid" });
        }
        amountFloat = quoteMessage.quote.price;
        bookingCurrencyOverride = quoteMessage.quote.currency || itemData.currency || "USD";
        bookingSnapshot.price = quoteMessage.quote.price;
        bookingSnapshot.currency = bookingCurrencyOverride;
        if (sanitizedSelectedTimes.length > 0) {
          bookingSnapshot.quantity = sanitizedSelectedTimes.length;
          bookingSnapshot.bookedHours = formatServerHoursLabel(slotMinutes * sanitizedSelectedTimes.length);
        }
      } else if (["hourly", "hourly_calendar"].includes(itemData.pricingType)) {
        const quantity = Math.max(1, sanitizedSelectedTimes.length || 1);
        const listingCurrencyForRound = requireCurrency(itemData.currency || "USD");
        amountFloat = roundMoney(amountFloat * quantity, listingCurrencyForRound);
        bookingSnapshot.quantity = quantity;
        bookingSnapshot.price = amountFloat;
        bookingSnapshot.bookedHours = formatServerHoursLabel(slotMinutes * quantity);
      }
    }

    if (teacher && String(teacher) === String(req.user._id)) {
      return res.status(400).json({ status: false, message: "You cannot book your own listing" });
    }

    if (req.user?.role === "teacher") {
      await User.findByIdAndUpdate(req.user._id, { role: "user" });
    }

    // ----------------------------------------------------------------
    // Convert user date to UTC
    // ----------------------------------------------------------------
    const newDateUTC =
      scheduledAt && timezone ? moment.tz(scheduledAt, timezone).utc().toDate() : null;


    const itemCurrency = requireCurrency(bookingCurrencyOverride || itemData.currency || "USD");
    const finalAmount = requirePositivePrice(amountFloat, itemCurrency);
    // Charge Stripe Checkout with the same Stripe FX quote used on lesson/listing cards
    // so Checkout matches the converted price the student already saw.
    const display = itemCurrency === requestedCurrency
      ? { amount: finalAmount, rate: 1, providerDate: null, stale: false, quoteId: null }
      : await convertWithStripeFx(finalAmount, itemCurrency, requestedCurrency);
    const paymentCurrency = requestedCurrency;
    const paymentAmount = requirePositivePrice(display.amount, paymentCurrency);
    const amountInSmallestUnit = requireMinimumStripeCharge(
      toSmallestUnit(paymentAmount, paymentCurrency),
      paymentCurrency
    );

    const safeMeta = {};
    if (parsedMeta.quoteMessageId) safeMeta.quoteMessageId = String(parsedMeta.quoteMessageId);
    if (parsedMeta.requestMessageId) safeMeta.requestMessageId = String(parsedMeta.requestMessageId);
    if (typeof parsedMeta.selectedDate === "string" && parsedMeta.selectedDate.trim()) {
      safeMeta.selectedDate = parsedMeta.selectedDate.trim();
    }
    if (type === "listing" && bookingSnapshot?.selectedTimes?.length) {
      safeMeta.selectedTimes = bookingSnapshot.selectedTimes;
    }
    if (type === "listing" && bookingSnapshot?.bookedHours) {
      safeMeta.hours = bookingSnapshot.bookedHours;
    }

    // Pre-check slot availability before creating a Booking or Stripe Checkout session
    if (type === "listing" && itemData?.pricingType === "hourly_calendar" && newDateUTC && timezone && teacher) {
      const requestedSlots = getListingBookingSlots(
        { scheduledAt: newDateUTC, timezone, meta: safeMeta, itemSnapshot: bookingSnapshot },
        itemData
      );
      for (const slot of requestedSlots) {
        const slotCheck = await isSlotAvailable({
          teacher,
          scheduledAtUTC: slot.scheduledAt,
          timezone,
          duration: slot.duration,
          lessonId: null,
          group: false,
        });
        if (!slotCheck.available) {
          return res.status(409).json({
            status: false,
            message: slotCheck.reason || "One or more selected time slots are no longer available",
          });
        }
      }
    }

    // Reuse an existing open Stripe Checkout session for the same quote to prevent double-click duplicates
    if (type === "listing" && safeMeta.quoteMessageId) {
      const existingPending = await Booking.findOne({
        user: req.user._id,
        "meta.quoteMessageId": safeMeta.quoteMessageId,
        paymentStatus: "pending",
        status: "pending",
        stripeSessionId: { $exists: true, $ne: null },
      }).sort({ createdAt: -1 });

      if (existingPending?.stripeSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
          const sameTotal =
            existingSession?.status === "open" &&
            existingSession?.payment_status !== "paid" &&
            existingSession?.amount_total === amountInSmallestUnit &&
            String(existingSession?.currency || "").toUpperCase() === paymentCurrency &&
            existingSession?.url;

          if (sameTotal) {
            return res.status(200).json({
              status: true,
              reusedSession: true,
              message: "Listing booking initiated successfully",
              bookingId: existingPending._id,
              clientSecret: existingSession.client_secret,
              amount: existingPending.amount,
              currency: itemCurrency,
              chargedAmount: existingPending.chargedAmount ?? paymentAmount,
              chargedCurrency: existingPending.chargedCurrency || paymentCurrency,
              displayAmount: existingPending.display_price ?? paymentAmount,
              displayCurrency: existingPending.display_currency || paymentCurrency,
              teacherPayoutCurrency: existingPending.teacherPayoutCurrency || itemCurrency,
              type,
              url: existingSession.url,
            });
          }

          if (existingSession?.status === "open") {
            await stripe.checkout.sessions.expire(existingPending.stripeSessionId).catch(() => {});
          }
          await Booking.findOneAndUpdate(
            { _id: existingPending._id, paymentStatus: "pending" },
            { $set: { paymentStatus: "cancelled", payment_status: "cancelled", payoutStatus: "cancelled" } }
          );
        } catch (reuseErr) {
          console.warn("Pending quote session check notice:", reuseErr.message);
        }
      }
    }

    // ----------------------------------------------------------------
    // Save booking
    // ----------------------------------------------------------------
    const bookingData = {
      user: req.user?._id || null,
      teacher,
      firstname,
      lastname,
      country,
      amount: finalAmount,
      currency: itemCurrency.toLowerCase(),
      chargedAmount: paymentAmount,
      chargedCurrency: paymentCurrency,
      exchangeRate: display.rate,
      exchangeRateDate: display.providerDate,
      lesson_price: type === "lesson" ? finalAmount : undefined,
      lesson_currency: type === "lesson" ? itemCurrency : undefined,
      display_price: paymentAmount,
      display_currency: paymentCurrency,
      exchange_rate_used: display.rate,
      payment_status: "pending",
      timezone,
      type,
      itemSnapshot: bookingSnapshot || undefined,
      meta: {
        ...safeMeta,
        preferredCustomerCurrency: requestedCurrency,
        listingCurrency: itemCurrency,
        checkoutExchangeRate: display.rate,
        checkoutExchangeStale: Boolean(display.stale),
        stripeFxQuoteId: display.quoteId || undefined,
      },

      paymentStatus: "pending",
    };

    if (type === "lesson") {
      bookingData.lesson = itemData._id;
      bookingData.scheduledAt = newDateUTC;
    } else if (type === "listing") {
      bookingData.listing = itemData._id;
      if (newDateUTC) bookingData.scheduledAt = newDateUTC;
    } else {
      bookingData.curriculum = itemData._id;
    }

    const booking = await Booking.create(bookingData);

    // ----------------------------------------------------------------
    // Curriculum lesson scheduling
    // ----------------------------------------------------------------
    if (type === "curriculum") {
      const lessonPositionArray = lessonList.map((lesson, index) => ({
        position: index + 1,
        lId: lesson._id,
        unitPosition: lesson.unitPosition || 0,
        unitName: lesson.unitName || "",
        status: index === 0 ? "scheduled" : "pending",
        scheduledAt: index === 0 ? newDateUTC : null,
        timezone: index === 0 ? timezone : null,
      }));

      booking.lessonPosition = lessonPositionArray;
      await booking.save();
    }

    // ----------------------------------------------------------------
    // STRIPE CHECKOUT SESSION (Unified Platform Escrow)
    // ----------------------------------------------------------------
    const commissionRate = await getCommissionRate();
    const earningCurrency = requireCurrency(
      type === "lesson"
        ? booking.lesson_currency || "USD"
        : booking.itemSnapshot?.currency || booking.currency || itemData?.currency || "USD"
    );
    const commissionAmount = roundMoney(booking.amount * commissionRate, earningCurrency);
    const teacherPayoutAmount = roundMoney(booking.amount - commissionAmount, earningCurrency);
    const applicationFeeAmount = Math.min(
      amountInSmallestUnit,
      Math.max(0, Math.round(amountInSmallestUnit * commissionRate))
    );

    booking.commissionRate = commissionRate;
    booking.commissionAmount = commissionAmount;
    booking.stripeApplicationFeeAmount = applicationFeeAmount;
    booking.payoutStatus = "pending_completion";
    booking.teacherPayoutAmount = teacherPayoutAmount;
    booking.teacherPayoutCurrency = earningCurrency;

    await booking.save();

    const sessionMetadata = {
      bookingId: String(booking._id),
      teacherId: String(teacher),
      lessonCurrency: itemCurrency,
      preferredCustomerCurrency: requestedCurrency,
      chargedCurrency: paymentCurrency,
      teacherPayoutCurrency: earningCurrency,
      commissionRate: String(commissionRate),
      payoutMode: "escrow",
      stripeFxQuoteId: display.quoteId || "",
      checkoutExchangeRate: String(display.rate ?? 1),
    };

    const paymentIntentData = {
      transfer_group: `booking_${booking._id}`,
      metadata: {
        bookingId: String(booking._id),
        teacherId: String(teacher),
        chargedCurrency: paymentCurrency,
        lessonCurrency: itemCurrency,
        teacherPayoutCurrency: earningCurrency,
        commissionRate: String(commissionRate),
        payoutMode: "escrow",
      },
    };

    const frontendUrl = getFrontendUrl();

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: req.user?.email || undefined,
          branding_settings: { display_name: "GigMake" },
          metadata: sessionMetadata,
          payment_intent_data: paymentIntentData,

          line_items: [
            {
              price_data: {
                currency: paymentCurrency.toLowerCase(),
                product_data: {
                  name: `SELLER: ${teacherName} - ${
                    type === "lesson" ? "LESSON" : type === "listing" ? "LISTING" : "CURRICULUM"
                  }: ${itemName} `,

                  images: productImage ? [productImage] : [],
                },
                unit_amount: amountInSmallestUnit, // minor units
              },
              quantity: 1,
            },
          ],

          success_url: `${frontendUrl}/after-payment-curri/${booking._id}`,
          cancel_url: `${frontendUrl}/payment-cancel/${booking._id}`,
        },
        { idempotencyKey: `checkout_booking_${booking._id}` }
      );
    } catch (stripeErr) {
      // Prevent orphaned pending booking documents when Stripe Checkout creation fails
      await Booking.findByIdAndDelete(booking._id).catch(() => {});
      throw stripeErr;
    }

    // Save stripe session id
    booking.stripeSessionId = session.id;
    booking.stripe_session_id = session.id;
    await booking.save();

    // Return data
    return res.status(201).json({
      status: true,
      message: `${
        type === "lesson" ? "Lesson" : type === "listing" ? "Listing" : "Curriculum"
      } booking initiated successfully`,
      bookingId: booking._id,
      clientSecret: session.client_secret, // used for Embedded Checkout
      amount: finalAmount,
      currency: itemCurrency,
      chargedAmount: paymentAmount,
      chargedCurrency: paymentCurrency,
      displayAmount: paymentAmount,
      displayCurrency: paymentCurrency,
      teacherPayoutCurrency: earningCurrency,
      type,
      url: session.url,
    });
  } catch (err) {
    console.error("initiateBooking error:", err);
    return res.status(err.status || 500).json({
      status: false,
      message: err.message || "Internal server error",
    });
  }
};

// --------------------------- Confirm & Fulfill Paid Booking -------------------------------

const findOrCreateBookingChatRoom = async ({ studentId, teacherId, isLesson, isListing, itemId }) => {
  if (!studentId || !teacherId) return null;
  const primaryFilter = { student: studentId, teacher: teacherId };
  const legacyFilter = { student: teacherId, teacher: studentId };

  let chatRoom = await ChatRoom.findOne({ $or: [primaryFilter, legacyFilter] });
  if (!chatRoom) {
    try {
      chatRoom = await ChatRoom.create({
        ...primaryFilter,
        lesson: isLesson ? itemId : undefined,
        curriculum: !isLesson && !isListing ? itemId : undefined,
      });
    } catch (error) {
      if (error?.code === 11000) {
        chatRoom = await ChatRoom.findOne({ $or: [primaryFilter, legacyFilter] });
      } else {
        throw error;
      }
    }
  }
  return chatRoom;
};

export const fulfillPaidBooking = async ({
  bookingId,
  session = null,
  paymentIntent,
  group = false,
  usecapacity = 1,
}) => {
  const booking = await Booking.findById(bookingId)
    .populate("curriculum")
    .populate("lesson")
    .populate("listing")
    .populate("user", "name email");

  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const isLesson = booking.type === "lesson";
  const isListing = booking.type === "listing";
  const item = isLesson ? booking.lesson : isListing ? booking.listing : booking.curriculum;
  const itemTitle = item?.title || booking.itemSnapshot?.title || "Purchased Content";
  const teacherId = item?.createdBy || booking.teacher;
  const teacher = teacherId ? await User.findById(teacherId) : null;
  const student = booking.user;
  const studentId = student?._id || booking.user;

  const confirmedGroup = Boolean(
    group || (isLesson && booking.lesson?.isGroupAvailable)
  );
  const stripeChargeId =
    typeof paymentIntent?.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent?.latest_charge?.id;

  const verification = verifyStripeSessionMatchesBooking({ session, paymentIntent, booking });
  if (!verification.ok) {
    const error = new Error(`Payment verification failed: ${verification.reason}`);
    error.status = 400;
    throw error;
  }

  const nextEscrowPayoutStatus = ["direct", "transferred"].includes(booking.payoutStatus)
    ? booking.payoutStatus
    : "pending_completion";

  const claimedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      paymentStatus: { $ne: "paid" },
    },
    {
      $set: {
        paymentStatus: "paid",
        payment_status: "paid",
        status: "paid",
        payoutStatus: nextEscrowPayoutStatus,
        stripePaymentIntentId: paymentIntent?.id || undefined,
        stripe_payment_intent_id: paymentIntent?.id || undefined,
        ...(stripeChargeId ? { stripeChargeId } : {}),
        group: confirmedGroup,
        ...(session?.presentment_details?.presentment_amount != null
          ? { presentmentAmount: session.presentment_details.presentment_amount }
          : {}),
        ...(session?.presentment_details?.presentment_currency
          ? { presentmentCurrency: session.presentment_details.presentment_currency.toUpperCase() }
          : {}),
        ...(paymentIntent?.id
          ? { "meta.stripe": { id: paymentIntent.id, status: paymentIntent.status } }
          : {}),
        ...(session?.payment_status
          ? { "meta.stripeCheckoutPaymentStatus": session.payment_status }
          : {}),
      },
    },
    { new: true }
  );

  if (!claimedBooking) {
    let existingRoom = null;
    if (studentId && teacher?._id) {
      existingRoom = await ChatRoom.findOne({
        $or: [
          { student: studentId, teacher: teacher._id },
          { student: teacher._id, teacher: studentId },
        ],
      }).select("_id");
    }
    return {
      alreadyConfirmed: true,
      booking,
      chatRoomId: existingRoom?._id || null,
    };
  }

  booking.paymentStatus = claimedBooking.paymentStatus;
  booking.payment_status = claimedBooking.payment_status;
  booking.status = claimedBooking.status;
  booking.stripePaymentIntentId = claimedBooking.stripePaymentIntentId;
  booking.stripe_payment_intent_id = claimedBooking.stripe_payment_intent_id;
  booking.stripeChargeId = claimedBooking.stripeChargeId;
  booking.group = claimedBooking.group;
  booking.meta = claimedBooking.meta;

  const fallbackRate =
    typeof booking.commissionRate === "number"
      ? booking.commissionRate
      : await getCommissionRate();

  const earningCurrencyForFulfill =
    isLesson || isListing
      ? requireCurrency(
          booking.teacherPayoutCurrency ||
            (isLesson
              ? booking.lesson_currency || "USD"
              : booking.itemSnapshot?.currency || booking.currency || item?.currency || "USD")
        )
      : "USD";
  const teacherAmountForFulfill =
    booking.teacherPayoutAmount != null
      ? booking.teacherPayoutAmount
      : isLesson || isListing
      ? roundMoney(booking.amount - booking.amount * fallbackRate, earningCurrencyForFulfill)
      : booking.amount - booking.amount * fallbackRate;

  const lockedSlots = [];
  try {
    if (isLesson && booking.lesson && teacher?._id) {
      await checkAndSaveSlot({
        teacher: teacher._id,
        scheduledAtUTC: booking.scheduledAt,
        timezone: booking.timezone,
        duration: booking.lesson.duration,
        lessonId: booking.lesson,
        group: booking.group || false,
        usecapacity: 1,
        capacity: booking.lesson.usecapacity || 0,
      });
      lockedSlots.push({
        teacher: teacher._id,
        scheduledAt: booking.scheduledAt,
        timezone: booking.timezone,
        duration: booking.lesson.duration,
        group: booking.group || false,
      });
    } else if (isListing && booking.scheduledAt && teacher?._id) {
      const listingSlots = getListingBookingSlots(booking, booking.listing);
      for (const slot of listingSlots) {
        await checkAndSaveSlot({
          teacher: teacher._id,
          scheduledAtUTC: slot.scheduledAt,
          timezone: booking.timezone,
          duration: slot.duration,
          lessonId: null,
          group: false,
          usecapacity: 1,
        });
        lockedSlots.push({
          teacher: teacher._id,
          scheduledAt: slot.scheduledAt,
          timezone: booking.timezone,
          duration: slot.duration,
          group: false,
        });
      }
    } else if (!isListing && teacher?._id && booking.curriculum?.lessonPosition?.length) {
      const firstLessonId = booking.curriculum.lessonPosition[0]?.lId;
      const newDateUTC = booking.lessonPosition?.[0]?.scheduledAt;
      let duration = "60m";
      if (firstLessonId) {
        const firstLesson = await Lesson.findById(firstLessonId);
        duration = firstLesson?.duration || "60m";
      }
      if (newDateUTC && booking.timezone) {
        await checkAndSaveSlot({
          teacher: teacher._id,
          scheduledAtUTC: newDateUTC,
          timezone: booking.timezone,
          duration,
          lessonId: firstLessonId,
          group: group || false,
          usecapacity: usecapacity || 1,
        });
        lockedSlots.push({
          teacher: teacher._id,
          scheduledAt: newDateUTC,
          timezone: booking.timezone,
          duration,
          group: group || false,
          usecapacity: usecapacity || 1,
        });
      }
    }
  } catch (slotErr) {
    // Roll back any slots locked earlier in this multi-slot booking
    for (const locked of lockedSlots) {
      await releaseBookedSlot(locked).catch(() => {});
    }

    const isSlotConflict = /already booked|not available|fully booked/i.test(slotErr.message || "");
    if (isSlotConflict) {
      let autoRefundId = null;
      let nextRefundStatus = "failed";
      const piId = paymentIntent?.id || booking.stripePaymentIntentId;
      if (piId) {
        try {
          const refund = await stripe.refunds.create(
            {
              payment_intent: piId,
              reason: "requested_by_customer",
              metadata: {
                bookingId: String(booking._id),
                autoRefundReason: "slot_conflict",
              },
            },
            { idempotencyKey: `auto_refund_slot_conflict_${booking._id}` }
          );
          autoRefundId = refund.id;
          nextRefundStatus = "refunded";
        } catch (refundErr) {
          console.error(`Auto-refund failed after slot conflict for booking ${booking._id}:`, refundErr.message);
        }
      }

      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          status: "cancelled",
          payoutStatus: "cancelled",
          refundStatus: nextRefundStatus,
          ...(autoRefundId ? { stripeRefundId: autoRefundId, refundedAt: new Date() } : {}),
          cancelledAt: new Date(),
          transferError: "Auto-refunded due to simultaneous slot booking",
        },
      });

      const conflictError = new Error(
        autoRefundId
          ? "Selected time slot was just booked by another customer. Your payment has been automatically refunded."
          : "Selected time slot was just booked by another customer. Please contact support for a refund."
      );
      conflictError.status = 409;
      throw conflictError;
    }

    throw slotErr;
  }

  // Credit seller pending balance ONLY AFTER slot reservation succeeds
  if (isLesson || isListing) {
    if (teacher?._id) {
      await User.findByIdAndUpdate(teacher._id, {
        $inc: { [`balances.pending.${earningCurrencyForFulfill}`]: teacherAmountForFulfill },
      });
    }
  } else if (teacher) {
    await User.findByIdAndUpdate(teacher._id, {
      $inc: { moneyPending: teacherAmountForFulfill },
    });
  }

  if (isListing && booking.meta?.quoteMessageId) {
    const acceptedQuoteMessage = await Message.findOneAndUpdate(
      {
        _id: booking.meta.quoteMessageId,
        type: "quote",
        "quote.status": { $nin: ["cancelled", "withdrawn"] },
      },
      { $set: { "quote.status": "accepted" } },
      { new: true }
    ).populate("userId", "name email image");

    if (acceptedQuoteMessage) {
      await ChatRoom.findByIdAndUpdate(acceptedQuoteMessage.roomId, {
        lastMessage: "Offer accepted",
        updatedAt: new Date(),
      });
      emitChatMessageUpdate(acceptedQuoteMessage.roomId, acceptedQuoteMessage, [
        studentId,
        teacher?._id,
      ]);
    }
  }

  const chatRoom = await findOrCreateBookingChatRoom({
    studentId,
    teacherId: teacher?._id,
    isLesson,
    isListing,
    itemId: item?._id,
  });

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      welcomeMessageSent: { $ne: true },
    },
    { $set: { welcomeMessageSent: true } },
    { new: true }
  );

  if (updatedBooking && chatRoom && teacher?._id) {
    if (isListing && !booking.meta?.quoteMessageId && item?._id) {
      const bookingAcceptedMessage = await Message.create({
        roomId: chatRoom._id,
        userId: teacher._id,
        type: "quote",
        message: `Booking accepted for "${itemTitle}"`,
        quote: {
          listingId: item._id,
          price: booking.amount,
          currency: requireCurrency(
            booking.itemSnapshot?.currency || booking.currency || item.currency || "USD"
          ),
          description: `Booking accepted for ${itemTitle}`,
          status: "accepted",
        },
      });
      await bookingAcceptedMessage.populate("userId", "name email image");
      emitChatMessage(chatRoom._id, bookingAcceptedMessage, [
        studentId,
        teacher?._id,
      ]);
    }

    const defaultWelcomeMessage = isLesson
      ? "thank you for booking a lesson with me!"
      : isListing
      ? "thank you for booking my service!"
      : "thank you for booking with me!";
    const teacherWelcomeMessage =
      (isLesson ? booking.lesson?.message : isListing ? booking.listing?.message : booking.curriculum?.message)
        ?.trim() || defaultWelcomeMessage;

    const welcomeMsg = await Message.create({
      roomId: chatRoom._id,
      userId: teacher._id,
      message: `Hi ${student?.name || booking.firstname}, ${teacherWelcomeMessage}`,
    });
    await welcomeMsg.populate("userId", "name email image");
    emitChatMessage(chatRoom._id, welcomeMsg, [studentId, teacher?._id]);

    chatRoom.lastMessage = `Chat started for ${
      isLesson ? "lesson" : isListing ? "listing" : "course"
    } "${itemTitle}"`;
    await chatRoom.save();
  }

  const frontendUrl = getFrontendUrl();
  const fromEmail = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  const safeTeacherName = escapeHtml(teacher?.name || "Seller");
  const safeBuyerFirstName = escapeHtml(booking.firstname || "");
  const safeBuyerLastName = escapeHtml(booking.lastname || "");
  const safeItemTitle = escapeHtml(itemTitle);
  const emailPromises = [];
  if (teacher?.email && chatRoom) {
    emailPromises.push(
      sendEmail({
        from: fromEmail,
        to: teacher.email,
        subject: `Your ${isLesson ? "lesson" : isListing ? "listing" : "course"} "${itemTitle}" was purchased!`,
        html: `<p>Hello ${safeTeacherName},</p>
            <p>${safeBuyerFirstName} ${safeBuyerLastName} purchased <b>${safeItemTitle}</b>.</p>
            <p><a href="${frontendUrl}/chat/${chatRoom._id}">Open Chat</a></p>`,
      })
    );
  }
  if (student?.email && chatRoom) {
    emailPromises.push(
      sendEmail({
        from: fromEmail,
        to: student.email,
        subject: `Order confirmed: "${itemTitle}"`,
        html: `<p>Hello ${safeBuyerFirstName},</p>
            <p>You purchased <b>${safeItemTitle}</b> by ${safeTeacherName}.</p>
            <p><a href="${frontendUrl}/chat/${chatRoom._id}">Go to Chat Room</a></p>`,
      })
    );
  }

  if (emailPromises.length) {
    Promise.all(emailPromises)
      .then((emailResults) => {
        const failedEmails = emailResults.filter((result) => !result.status);
        if (failedEmails.length) {
          console.error("Booking confirmed but notification email failed:", {
            bookingId: booking._id,
            failedCount: failedEmails.length,
            errors: failedEmails.map((result) => result.error),
          });
        }
      })
      .catch((emailErr) => {
        console.error("Booking notification email dispatch error:", emailErr.message);
      });
  }

  if (teacher?._id) {
    sendPushNotification({
      userIds: teacher._id,
      title: `New Order for "${itemTitle}"`,
      body: `${booking.firstname || "A client"} purchased your service.`,
      data: {
        type: "booking",
        bookingId: String(booking._id),
        roomId: chatRoom ? String(chatRoom._id) : "",
      },
    }).catch((err) => console.error("Teacher order push notification error:", err));
  }

  if (studentId) {
    sendPushNotification({
      userIds: studentId,
      title: `Order Confirmed: "${itemTitle}"`,
      body: `Your order with ${teacher?.name || "the seller"} has been confirmed.`,
      data: {
        type: "booking",
        bookingId: String(booking._id),
        roomId: chatRoom ? String(chatRoom._id) : "",
      },
    }).catch((err) => console.error("Student order push notification error:", err));
  }

  return {
    alreadyConfirmed: false,
    booking: updatedBooking || claimedBooking,
    chatRoomId: chatRoom?._id || null,
  };
};

export const confirmBooking = async (req, res) => {
  try {
    const { bookingId, type, group, usecapacity } = req.body;

    if (!bookingId) {
      return res.status(400).json({ status: false, message: "bookingId required" });
    }

    const booking = await Booking.findById(bookingId).select(
      "user teacher amount currency chargedAmount chargedCurrency paymentStatus status refundStatus transferError stripeSessionId stripe_session_id stripePaymentIntentId"
    );

    if (!booking) {
      return res.status(404).json({ status: false, message: "Booking not found" });
    }

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ status: false, message: "You cannot confirm another user's booking" });
    }

    if (booking.paymentStatus === "paid") {
      if (booking.status === "cancelled" && ["refunded", "disputed"].includes(booking.refundStatus)) {
        return res.status(409).json({
          status: false,
          refunded: booking.refundStatus === "refunded",
          message:
            booking.transferError ||
            "This booking was cancelled and your payment has been refunded.",
          booking,
        });
      }
      const existingRoom = await ChatRoom.findOne({
        $or: [
          { student: booking.user, teacher: booking.teacher },
          { student: booking.teacher, teacher: booking.user },
        ],
      }).select("_id");
      return res.status(200).json({
        status: true,
        alreadyConfirmed: true,
        message: "Booking already confirmed",
        chatRoomId: existingRoom?._id || null,
        booking,
      });
    }

    const checkoutSessionId = booking.stripeSessionId || booking.stripe_session_id;
    let session = null;
    let paymentIntent = null;

    if (checkoutSessionId) {
      session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["payment_intent.latest_charge"],
      });
      paymentIntent = session?.payment_intent || null;
    } else if (booking.stripePaymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId, {
        expand: ["latest_charge"],
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "No Stripe session found for this booking",
      });
    }

    const isPaid = session?.payment_status === "paid" || paymentIntent?.status === "succeeded";
    if (isPaid && paymentIntent) {
      const result = await fulfillPaidBooking({
        bookingId,
        session,
        paymentIntent,
        group,
        usecapacity,
      });

      return res.status(200).json({
        status: true,
        alreadyConfirmed: result.alreadyConfirmed,
        message: result.alreadyConfirmed ? "Booking already confirmed" : "Booking confirmed successfully",
        chatRoomId: result.chatRoomId,
        booking: result.booking,
      });
    }

    if (
      session?.status === "expired" ||
      paymentIntent?.status === "canceled" ||
      (type === "failed" && session?.payment_status !== "paid")
    ) {
      if (type === "failed" && checkoutSessionId && session?.status === "open") {
        try {
          await stripe.checkout.sessions.expire(checkoutSessionId);
        } catch (expireErr) {
          // If the session was just completed in another tab during cancel, re-check and fulfill instead of cancelling.
          const latestSession = await stripe.checkout.sessions
            .retrieve(checkoutSessionId, { expand: ["payment_intent.latest_charge"] })
            .catch(() => null);
          const latestPi = latestSession?.payment_intent || null;
          if (latestSession?.payment_status === "paid" && latestPi) {
            const result = await fulfillPaidBooking({
              bookingId,
              session: latestSession,
              paymentIntent: latestPi,
              group,
              usecapacity,
            });
            return res.status(200).json({
              status: true,
              alreadyConfirmed: result.alreadyConfirmed,
              message: result.alreadyConfirmed ? "Booking already confirmed" : "Booking confirmed successfully",
              chatRoomId: result.chatRoomId,
              booking: result.booking,
            });
          }
          console.warn("Checkout session expire notice:", expireErr.message);
        }
      }

      const nextStatus =
        session?.status === "expired" || paymentIntent?.status === "canceled" || type === "failed"
          ? "cancelled"
          : "failed";
      await Booking.findOneAndUpdate(
        { _id: bookingId, paymentStatus: "pending" },
        {
          $set: {
            paymentStatus: nextStatus,
            payment_status: nextStatus,
            payoutStatus: "cancelled",
            ...(paymentIntent?.id
              ? {
                  stripePaymentIntentId: paymentIntent.id,
                  stripe_payment_intent_id: paymentIntent.id,
                }
              : {}),
          },
        }
      );

      return res.status(400).json({
        status: false,
        message: "Payment was not completed",
      });
    }

    return res.status(400).json({
      status: false,
      message: `Payment not completed yet${paymentIntent?.status ? `: ${paymentIntent.status}` : ""}`,
    });
  } catch (err) {
    console.error("confirmBooking error:", err);
    return res.status(err.status || 500).json({ status: false, message: err.message || "Server error" });
  }
};

const bookSlot = async (group, global, slotId, day, specific, calenderId) => {
  const Model = global ? Availability : LessonCalender;

  // 2ï¸âƒ£ Base query
  let query = { _id: calenderId };

  // 3ï¸âƒ£ Specific vs Weekly
  if (specific) {
    query["dateSpecificHours.slots._id"] = slotId;
    query["dateSpecificHours.slots.group"] = group;
  } else {
    query["weeklyHours.day"] = day;
    query["weeklyHours.slots._id"] = slotId;
    query["weeklyHours.slots.group"] = group;
  }

  // 4ï¸âƒ£ Capacity Increment Logic
  const update = specific
    ? {
        $inc: {
          "dateSpecificHours.$[].slots.$[slot].usecapacity": 1,
        },
      }
    : {
        $inc: {
          "weeklyHours.$[].slots.$[slot].usecapacity": 1,
        },
      };

  const options = {
    new: true,
    arrayFilters: [
      {
        "slot._id": slotId,
        "slot.group": group,
      },
    ],
  };

  const result = await Model.findOneAndUpdate(query, update, options);
};

const buildListingOrderSnapshot = (booking) => {
  const snapshot = booking.itemSnapshot || {};
  const meta = booking.meta || {};
  const selectedTimes = Array.isArray(snapshot.selectedTimes) && snapshot.selectedTimes.length
    ? snapshot.selectedTimes
    : Array.isArray(meta.selectedTimes)
    ? meta.selectedTimes
    : [];

  return {
    listingId: snapshot.itemId || booking.listing?._id || booking.listing,
    listingTitle: snapshot.title || booking.listing?.title || "Listing",
    hours: snapshot.bookedHours || meta.hours || snapshot.duration || "",
    selectedDate: snapshot.selectedDate || meta.selectedDate || "",
    selectedTimes,
    amount: booking.amount,
    currency: snapshot.currency || booking.currency || booking.listing?.currency || "USD",
  };
};

export const userBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const filter = { user: req.user._id };

    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("lesson")
      .populate("curriculum", "title price")
      .populate("teacher", "firstname lastname")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const teacherBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const filter = { teacher: req.user._id };

    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("lesson", "title price currency")
      .populate("curriculum", "title price")
      .populate("user", "firstname lastname")
      .sort({ scheduledAt: 1 }) // teacher usually wants ascending time
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const teacherListingOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const statusFilter = String(req.query.status || "upcoming").toLowerCase();

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    await autoCompleteExpiredDeliveredOrders({ teacherId: req.user._id }).catch((err) =>
      console.warn("teacherListingOrders auto-complete error:", err.message)
    );

    const filter = {
      teacher: req.user._id,
      type: "listing",
      paymentStatus: "paid",
    };

    if (statusFilter === "completed") {
      filter.status = "completed";
    } else if (statusFilter === "cancelled" || statusFilter === "canceled") {
      filter.status = "cancelled";
    } else {
      // upcoming / active orders (includes delivered orders awaiting buyer confirmation)
      filter.status = { $nin: ["completed", "cancelled"] };
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate("listing", "title price currency duration")
      .populate("user", "name firstname lastname email _id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const orders = bookings.map((booking) => {
      const snapshot = buildListingOrderSnapshot(booking);

      return {
        bookingId: booking._id,
        listingId: snapshot.listingId,
        orderDate: booking.createdAt,
        dueDate: booking.scheduledAt,
        hours: snapshot.hours,
        selectedDate: snapshot.selectedDate,
        selectedTimes: snapshot.selectedTimes,
        listingTitle: snapshot.listingTitle,
        clientName:
          booking.user?.name ||
          [booking.firstname, booking.lastname].filter(Boolean).join(" ") ||
          booking.user?.email ||
          "Client",
        clientId: booking.user?._id,
        amount: snapshot.amount,
        currency: snapshot.currency,
        status: booking.status === "paid" ? "upcoming" : booking.status,
        type: booking.type,
        deliveredAt: booking.deliveredAt || null,
        deliveryNote: booking.deliveryNote || "",
        autoCompleteAt: booking.autoCompleteAt || null,
        autoCompleted: Boolean(booking.autoCompleted),
        revisionNote: booking.revisionNote || "",
        revisionCount: booking.revisionCount || 0,
      };
    });

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const userListingOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const statusFilter = String(req.query.status || "upcoming").toLowerCase();

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    await autoCompleteExpiredDeliveredOrders({ userId: req.user._id }).catch((err) =>
      console.warn("userListingOrders auto-complete error:", err.message)
    );

    const filter = {
      user: req.user._id,
      type: "listing",
      paymentStatus: "paid",
    };

    if (statusFilter === "completed") {
      filter.status = "completed";
    } else if (statusFilter === "cancelled" || statusFilter === "canceled") {
      filter.status = "cancelled";
    } else if (statusFilter === "all") {
      filter.status = { $ne: "cancelled" };
    } else {
      filter.status = { $nin: ["completed", "cancelled"] };
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate("listing", "title price currency duration")
      .populate("teacher", "name firstname lastname email _id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const orders = bookings.map((booking) => {
      const snapshot = buildListingOrderSnapshot(booking);

      return {
        bookingId: booking._id,
        listingId: snapshot.listingId,
        orderDate: booking.createdAt,
        dueDate: booking.scheduledAt,
        hours: snapshot.hours,
        selectedDate: snapshot.selectedDate,
        selectedTimes: snapshot.selectedTimes,
        listingTitle: snapshot.listingTitle,
        sellerName:
          booking.teacher?.name ||
          [booking.teacher?.firstname, booking.teacher?.lastname].filter(Boolean).join(" ") ||
          booking.teacher?.email ||
          "Seller",
        sellerId: booking.teacher?._id,
        amount: snapshot.amount,
        currency: snapshot.currency,
        status: booking.status === "paid" ? "upcoming" : booking.status,
        type: booking.type,
        deliveredAt: booking.deliveredAt || null,
        deliveryNote: booking.deliveryNote || "",
        autoCompleteAt: booking.autoCompleteAt || null,
        autoCompleted: Boolean(booking.autoCompleted),
        revisionNote: booking.revisionNote || "",
        revisionCount: booking.revisionCount || 0,
      };
    });

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const rescheduleBooking = async (req, res) => {
  try {
    const { bookingId, newDate, timezone, group, usecapacity } = req.body;

    if (!newDate || !timezone) {
      return res.status(400).json({
        message: "New date and timezone are required",
      });
    }

    // Convert to UTC
    const newStartUTC = moment.tz(newDate, timezone).utc().toDate();

    // Find booking + lesson
    const booking = await Booking.findById(bookingId).populate("lesson");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isBuyer = String(booking.user || "") === String(req.user._id);
    const isSeller = String(booking.teacher || "") === String(req.user._id);
    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to reschedule this booking" });
    }

    // Lesson duration safe parse
    const mainLesson = booking.lesson || {};
    const lessonDuration = parseLessonDuration(mainLesson.duration || "60m"); // fallback 60m
    const newEndUTC = moment(newStartUTC)
      .add(lessonDuration, "minutes")
      .toDate();

    // Get teacher's other bookings
    const teacherBookings = await Booking.find({
      teacher: booking.teacher,
      ...activeBookingFilter,
      _id: { $ne: bookingId },
    }).populate("lesson");

    for (const b of teacherBookings) {
      const lesson = b.lesson || {};
      const mainDur = parseLessonDuration(lesson.duration || "60m");

      // -------------------------------
      // A) MAIN BOOKING TIME CHECK
      // -------------------------------
      if (b.scheduledAt) {
        const existStart = b.scheduledAt;
        const existEnd = moment(existStart).add(mainDur, "minutes").toDate();

        const isOverlap = newStartUTC < existEnd && newEndUTC > existStart;
        if (isOverlap) {
          return res.status(400).json({
            message: "Teacher already has another class (main schedule)",
          });
        }
      }

      // --------------------------------â€“
      // B) lessonPosition ARRAY CHECK
      // --------------------------------â€“
      if (Array.isArray(b.lessonPosition)) {
        for (const pos of b.lessonPosition) {
          if (!pos || !pos.scheduledAt) continue;

          const posDurationValue = pos.duration || lesson.duration || "60m";
          const posDuration = parseLessonDuration(posDurationValue);

          const posStart = pos.scheduledAt;
          const posEnd = moment(posStart).add(posDuration, "minutes").toDate();

          const isPosOverlap = newStartUTC < posEnd && newEndUTC > posStart;
          if (isPosOverlap) {
            return res.status(400).json({
              message: "Teacher already has a class in lessonPosition slot",
            });
          }
        }
      }
    }

    const previousSchedule = {
      scheduledAt: booking.scheduledAt,
      timezone: booking.timezone,
      duration: booking?.lesson?.duration || "60m",
      group: booking.group || group || false,
      usecapacity: usecapacity || 1,
    };

    await releaseBookedSlot({
      teacher: booking.teacher,
      ...previousSchedule,
    });

    try {
      await checkAndSaveSlot({
        teacher: booking.teacher,
        scheduledAtUTC: newStartUTC,
        timezone,
        duration: booking?.lesson?.duration || "60m",
        lessonId: mainLesson._id,
        group: booking.group || group || false,
        usecapacity: 1,
        capacity: mainLesson.usecapacity || 0,
      });
    } catch (lockError) {
      if (previousSchedule.scheduledAt && previousSchedule.timezone) {
        await checkAndSaveSlot({
          teacher: booking.teacher,
          scheduledAtUTC: previousSchedule.scheduledAt,
          timezone: previousSchedule.timezone,
          duration: previousSchedule.duration,
          lessonId: mainLesson._id,
          group: previousSchedule.group,
          usecapacity: previousSchedule.usecapacity,
          capacity: mainLesson.usecapacity || 0,
        });
      }
      throw lockError;
    }

    // Save rescheduled time
    booking.scheduledAt = newStartUTC;
    booking.timezone = timezone;
    booking.status = "scheduled";
    await booking.save();

    res.json({
      status: true,
      message: "Lesson rescheduled successfully",
      booking,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

export const rescheduleCLessonBooking = async (req, res) => {
  try {
    const { bookingId, lId, newDate, timezone } = req.body;

    if (!newDate || !timezone || !lId) {
      return res.status(400).json({
        message: "lId, newDate and timezone are required",
      });
    }

    // Convert to UTC
    const newStartUTC = moment.tz(newDate, timezone).utc().toDate();

    // Fetch booking + lesson data
    const booking = await Booking.findById(bookingId).populate("lesson");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isBuyer = String(booking.user || "") === String(req.user._id);
    const isSeller = String(booking.teacher || "") === String(req.user._id);
    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to reschedule this booking" });
    }

    // Find lesson inside lessonPosition
    const lessonIndex = booking.lessonPosition.findIndex(
      (lesson) => lesson.lId.toString() === lId.toString()
    );

    if (lessonIndex === -1) {
      return res.status(400).json({
        message: "Lesson not found in this booking",
      });
    }

    // Duration for THIS lesson
    const mainLesson = booking.lesson || {};
    const lessonDuration = parseLessonDuration(
      booking.lessonPosition[lessonIndex].duration ||
        mainLesson.duration ||
        "60m"
    );

    const newEndUTC = moment(newStartUTC)
      .add(lessonDuration, "minutes")
      .toDate();

    // ============================================================
    // 1ï¸âƒ£ CHECK: INSIDE SAME BOOKING (other lesson positions)
    // ============================================================

    for (const lp of booking.lessonPosition) {
      if (lp.lId.toString() === lId.toString()) continue;
      if (!lp.scheduledAt) continue;

      const existingStart = lp.scheduledAt;
      const existingDur = parseLessonDuration(
        lp.duration || mainLesson.duration || "60m"
      );
      const existingEnd = moment(existingStart)
        .add(existingDur, "minutes")
        .toDate();

      const overlap = newStartUTC < existingEnd && newEndUTC > existingStart;

      if (overlap) {
        return res.status(400).json({
          message:
            "Lesson time conflicts with another lesson slot in the same booking.",
        });
      }
    }

    // ============================================================
    // 2ï¸âƒ£ CHECK: TEACHER-WIDE CHECK (across all bookings)
    // ============================================================

    const teacherBookings = await Booking.find({
      teacher: booking.teacher,
      ...activeBookingFilter,
      _id: { $ne: bookingId }, // exclude current booking
    }).populate("lesson");

    for (const b of teacherBookings) {
      const lesson = b.lesson || {};
      const mainDur = parseLessonDuration(lesson.duration || "60m");

      // A) Check main booking time
      if (b.scheduledAt) {
        const existStart = b.scheduledAt;
        const existEnd = moment(existStart).add(mainDur, "minutes").toDate();

        const mainOverlap = newStartUTC < existEnd && newEndUTC > existStart;

        if (mainOverlap) {
          return res.status(400).json({
            message:
              "Teacher already has another class at this main schedule time.",
          });
        }
      }

      // B) Check lessonPosition times
      if (Array.isArray(b.lessonPosition)) {
        for (const pos of b.lessonPosition) {
          if (!pos.scheduledAt) continue;

          const posDur = parseLessonDuration(
            pos.duration || lesson.duration || "60m"
          );

          const posStart = pos.scheduledAt;
          const posEnd = moment(posStart).add(posDur, "minutes").toDate();

          const posOverlap = newStartUTC < posEnd && newEndUTC > posStart;

          if (posOverlap) {
            return res.status(400).json({
              message:
                "Teacher already has another class in a lessonPosition slot.",
            });
          }
        }
      }
    }

    // ============================================================
    // 3ï¸âƒ£ SAVE UPDATED TIME
    // ============================================================

    const lessonToSchedule = await Lesson.findById(booking.lessonPosition[lessonIndex].lId);
    const durationToLock =
      booking.lessonPosition[lessonIndex].duration ||
      lessonToSchedule?.duration ||
      mainLesson.duration ||
      "60m";
    const previousSchedule = {
      scheduledAt: booking.lessonPosition[lessonIndex].scheduledAt,
      timezone: booking.lessonPosition[lessonIndex].timezone,
      duration: durationToLock,
      group: booking.lessonPosition[lessonIndex].group || booking.group || false,
    };

    await releaseBookedSlot({
      teacher: booking.teacher,
      ...previousSchedule,
    });

    try {
      await checkAndSaveSlot({
        teacher: booking.teacher,
        scheduledAtUTC: newStartUTC,
        timezone,
        duration: durationToLock,
        lessonId: booking.lessonPosition[lessonIndex].lId,
        group: previousSchedule.group,
      });
    } catch (lockError) {
      if (previousSchedule.scheduledAt && previousSchedule.timezone) {
        await checkAndSaveSlot({
          teacher: booking.teacher,
          scheduledAtUTC: previousSchedule.scheduledAt,
          timezone: previousSchedule.timezone,
          duration: previousSchedule.duration,
          lessonId: booking.lessonPosition[lessonIndex].lId,
          group: previousSchedule.group,
        });
      }
      throw lockError;
    }

    booking.lessonPosition[lessonIndex].scheduledAt = newStartUTC;
    booking.lessonPosition[lessonIndex].timezone = timezone;
    booking.lessonPosition[lessonIndex].status = "scheduled";

    // Optional: update main booking time (only if needed)
    booking.scheduledAt = newStartUTC;
    booking.timezone = timezone;

    await booking.save();

    return res.json({
      status: true,
      message: "Lesson rescheduled successfully",
      booking,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { type, lId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("lesson")
      .populate("listing");
    if (!booking) return res.status(404).json({ status: false, message: "Booking not found" });

    const isBuyer = String(booking.user || "") === String(req.user._id);
    const isSeller = String(booking.teacher || "") === String(req.user._id);
    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to cancel this booking" });
    }

    const bookingType = booking.type;
    if (type && type !== bookingType) {
      return res.status(400).json({ status: false, message: "Booking type mismatch" });
    }

    if (bookingType === "lesson" || bookingType === "listing") {
      if (booking.status === "cancelled") {
        return res.status(400).json({ status: false, message: "Order is already cancelled" });
      }
      if (booking.status === "completed") {
        return res.status(400).json({ status: false, message: "Completed orders cannot be cancelled" });
      }

      const previousStatus = booking.status;
      const claimed = await Booking.findOneAndUpdate(
        { _id: bookingId, status: { $nin: ["cancelled", "completed"] } },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledBy: req.user._id,
            ...(booking.paymentStatus === "paid" ? { refundStatus: "pending" } : {}),
          },
        },
        { new: true }
      );
      if (!claimed) {
        return res.status(400).json({ status: false, message: "Order cannot be cancelled in its current state" });
      }

      const paymentIntentId = claimed.stripePaymentIntentId || claimed.stripe_payment_intent_id;
      let refundUpdate = {};

      if (claimed.paymentStatus === "paid" && paymentIntentId) {
        try {
          const refundParams = {
            payment_intent: paymentIntentId,
            reason: "requested_by_customer",
            metadata: {
              bookingId: String(claimed._id),
              cancelledBy: String(req.user._id),
            },
          };
          if (claimed.payoutStatus === "direct") {
            refundParams.reverse_transfer = true;
            refundParams.refund_application_fee = true;
          }

          const refund = await stripe.refunds.create(refundParams, {
            idempotencyKey: `refund_booking_${claimed._id}`,
          });

          refundUpdate = {
            stripeRefundId: refund.id,
            refundStatus: "refunded",
            refundedAt: new Date(),
            payoutStatus: "cancelled",
          };

          if (claimed.teacher) {
            const earningCurrency = requireCurrency(
              claimed.teacherPayoutCurrency ||
                claimed.itemSnapshot?.currency ||
                claimed.lesson_currency ||
                claimed.currency ||
                "USD"
            );
            const fallbackRate =
              typeof claimed.commissionRate === "number"
                ? claimed.commissionRate
                : await getCommissionRate();
            const teacherAmount =
              claimed.teacherPayoutAmount != null
                ? claimed.teacherPayoutAmount
                : roundMoney(claimed.amount - claimed.amount * fallbackRate, earningCurrency);

            await User.findByIdAndUpdate(claimed.teacher, {
              $inc: { [`balances.pending.${earningCurrency}`]: -teacherAmount },
            });
          }
        } catch (refundErr) {
          await Booking.findByIdAndUpdate(claimed._id, {
            $set: {
              status: previousStatus,
              cancelledAt: null,
              cancelledBy: null,
              refundStatus: "failed",
            },
          });
          return res.status(502).json({
            status: false,
            message: `Unable to process Stripe refund: ${refundErr.message}`,
          });
        }
      } else {
        const pendingSessionId = claimed.stripeSessionId || claimed.stripe_session_id;
        if (pendingSessionId) {
          stripe.checkout.sessions.expire(pendingSessionId).catch((err) =>
            console.warn("Expire unpaid checkout session on cancel notice:", err.message)
          );
        }
        refundUpdate = { payoutStatus: "cancelled" };
      }

      if (bookingType === "listing") {
        const listingSlots = getListingBookingSlots(booking, booking.listing);
        for (const slot of listingSlots) {
          await releaseBookedSlot({
            teacher: booking.teacher,
            scheduledAt: slot.scheduledAt,
            timezone: booking.timezone,
            duration: slot.duration,
            group: booking.group,
          });
        }
      } else {
        await releaseBookedSlot({
          teacher: booking.teacher,
          scheduledAt: booking.scheduledAt,
          timezone: booking.timezone,
          duration: booking.lesson?.duration,
          group: booking.group,
        });
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        claimed._id,
        {
          $set: {
            ...refundUpdate,
            scheduledAt: null,
          },
        },
        { new: true }
      );

      return res.json({
        status: true,
        message:
          bookingType === "listing"
            ? refundUpdate.stripeRefundId
              ? "Order cancelled and refunded successfully"
              : "Order cancelled successfully"
            : refundUpdate.stripeRefundId
            ? "Lesson booking cancelled and refunded successfully"
            : "Lesson booking cancelled successfully",
        booking: updatedBooking,
      });
    } else {
      if (!lId) {
        return res.status(400).json({
          status: false,
          message: "lId is required for curriculum lesson cancellation",
        });
      }

      const idx = booking.lessonPosition.findIndex(
        (ls) => ls.lId.toString() === lId.toString()
      );

      if (idx === -1) {
        return res.status(404).json({
          status: false,
          message: "Lesson not found in this booking",
        });
      }

      if (booking.lessonPosition[idx].status === "cancelled") {
        return res.status(400).json({ status: false, message: "Curriculum lesson is already cancelled" });
      }

      const lesson = await Lesson.findById(booking.lessonPosition[idx].lId);
      await releaseBookedSlot({
        teacher: booking.teacher,
        scheduledAt: booking.lessonPosition[idx].scheduledAt,
        timezone: booking.lessonPosition[idx].timezone,
        duration: booking.lessonPosition[idx].duration || lesson?.duration,
        group: booking.lessonPosition[idx].group || booking.group,
      });

      booking.lessonPosition[idx].status = "cancelled";
      booking.lessonPosition[idx].scheduledAt = null;
      booking.lessonPosition[idx].timezone = null;

      await booking.save();

      return res.json({
        status: true,
        message: "Curriculum lesson cancelled successfully",
        booking,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

export const userUpcomingBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const skip = (page - 1) * limit;

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const { scheduledAt, timezone } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required for upcoming bookings",
      });
    }

    // Convert to UTC
    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();

    // -------------------------------
    // MAIN FIXED FILTER
    // -------------------------------
    const filter = {
      user: req.user._id,
      paymentStatus: "paid",
      $or: [
        { scheduledAt: { $gte: newDateUTC } },
        { "lessonPosition.scheduledAt": { $gte: newDateUTC } },
      ],
    };

    // Pagination
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .select("-lessonPosition -stripePaymentIntentId")
      .populate(
        "lesson",
        "title duration type images totalRatings averageRating"
      )
      .populate("curriculum", "title type images totalRatings averageRating")
      .populate("teacher", "name image totalRatings averageRating")
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const userCancelBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    let filter = {
      user: req.user._id,
      paymentStatus: "paid",
      $or: [{ status: "cancelled" }, { "lessonPosition.status": "cancelled" }],
    };

    // -------------------------------
    // Pagination + Data Fetch
    // -------------------------------
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .select("-lessonPosition -stripePaymentIntentId") // REMOVE lessonPosition
      .populate(
        "lesson",
        "title type duration images totalRatings averageRating"
      )
      .populate("curriculum", "title type images totalRatings averageRating")
      .populate("teacher", "name image totalRatings averageRating")
      .sort({ scheduledAt: 1 }) // upcoming = soonest first
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
export const userUnscheduledBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    // ---------------------------------------
    // FILTER FOR UNSCHEDULED BOOKINGS
    // ---------------------------------------
    const filter = {
      user: req.user._id,
      paymentStatus: "paid",
      $and: [
        // MAIN booking.scheduledAt must be null or not exist
        {
          $or: [{ scheduledAt: null }, { scheduledAt: { $exists: false } }],
        },

        // lessonPosition.scheduledAt must be null or missing
        {
          $or: [
            { "lessonPosition.scheduledAt": null },
            { "lessonPosition.scheduledAt": { $exists: false } },
          ],
        },
      ],
    };

    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .select("-lessonPosition -stripePaymentIntentId") // REMOVE lessonPosition
      .populate(
        "lesson",
        "title type duration images totalRatings averageRating"
      )
      .populate("curriculum", "title type images totalRatings averageRating")
      .populate("teacher", "name image totalRatings averageRating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const finalizeListingOrderCompletion = async (
  booking,
  { completedBy = null, autoCompleted = false, allowedStatuses = ["delivered"] } = {}
) => {
  if (!booking?._id) return null;

  const nextPayoutStatus = ["direct", "transferred"].includes(booking.payoutStatus)
    ? booking.payoutStatus
    : "pending_connect";

  const claimed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      type: "listing",
      paymentStatus: "paid",
      status: { $in: allowedStatuses },
      refundStatus: { $nin: ["refunded", "disputed"] },
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        completedBy,
        autoCompleted,
        autoCompleteAt: null,
        payoutStatus: nextPayoutStatus,
      },
    },
    { new: true }
  );

  if (!claimed) return null;

  const earningCurrency = requireCurrency(
    claimed.teacherPayoutCurrency ||
      claimed.itemSnapshot?.currency ||
      claimed.lesson_currency ||
      claimed.currency ||
      "USD"
  );
  const teacherAmount =
    claimed.teacherPayoutAmount != null
      ? claimed.teacherPayoutAmount
      : roundMoney(
          claimed.amount -
            claimed.amount *
              (typeof claimed.commissionRate === "number"
                ? claimed.commissionRate
                : await getCommissionRate()),
          earningCurrency
        );

  const teacherId = booking.teacher?._id || booking.teacher;
  if (teacherId) {
    await User.findByIdAndUpdate(
      teacherId,
      {
        $inc: {
          [`balances.pending.${earningCurrency}`]: -teacherAmount,
          [`balances.available.${earningCurrency}`]: teacherAmount,
          [`balances.total.${earningCurrency}`]: teacherAmount,
        },
      },
      { new: true }
    );

    if (nextPayoutStatus === "pending_connect") {
      processPendingTeacherPayouts(teacherId).catch((err) =>
        console.warn("Auto transfer on complete listing error:", err.message)
      );
    }
  }

  return { claimed, teacherAmount, earningCurrency };
};

export const autoCompleteExpiredDeliveredOrders = async ({ teacherId, userId } = {}) => {
  const filter = {
    type: "listing",
    paymentStatus: "paid",
    status: "delivered",
    refundStatus: { $nin: ["refunded", "disputed"] },
    autoCompleteAt: { $lte: new Date() },
  };
  if (teacherId) filter.teacher = teacherId;
  if (userId) filter.user = userId;

  const expired = await Booking.find(filter)
    .select("_id teacher user payoutStatus")
    .lean();

  if (!Array.isArray(expired) || expired.length === 0) return 0;

  let completedCount = 0;
  for (const item of expired) {
    const finalized = await finalizeListingOrderCompletion(item, {
      completedBy: null,
      autoCompleted: true,
      allowedStatuses: ["delivered"],
    });
    if (!finalized) continue;
    completedCount += 1;

    const shortOrderId = String(item._id).slice(-6);
    if (item.user) {
      sendPushNotification({
        userIds: item.user,
        title: "Order Auto-Completed",
        body: `Order #${shortOrderId} was automatically completed after the ${ORDER_AUTO_COMPLETE_DAYS}-day review window.`,
        data: { type: "booking", bookingId: String(item._id) },
      }).catch((err) => console.error("Auto-complete buyer push error:", err));
    }
    if (item.teacher) {
      sendPushNotification({
        userIds: item.teacher,
        title: "Payment Released!",
        body: `Order #${shortOrderId} auto-completed and earnings were released for payout.`,
        data: { type: "booking", bookingId: String(item._id) },
      }).catch((err) => console.error("Auto-complete seller push error:", err));
    }
  }

  return completedCount;
};

export const deliverListingOrder = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const rawNote = typeof req.body?.deliveryNote === "string" ? req.body.deliveryNote.trim() : "";
    const deliveryNote = rawNote.slice(0, 1000);

    const booking = await Booking.findById(bookingId)
      .populate("user", "_id name")
      .populate("teacher", "_id name");

    if (!booking) {
      return res.status(404).json({ status: false, message: "Booking not found" });
    }
    if (booking.type !== "listing") {
      return res.status(400).json({ status: false, message: "Only listing orders support delivery" });
    }

    const teacherId = String(booking.teacher?._id || booking.teacher || "");
    const isAuthorized = (teacherId && teacherId === String(req.user._id)) || req.user.role === "admin";
    if (!isAuthorized) {
      return res.status(403).json({ status: false, message: "Only the seller can mark this order as delivered" });
    }
    if (["refunded", "disputed"].includes(booking.refundStatus)) {
      return res.status(400).json({ status: false, message: "Refunded or disputed orders cannot be delivered" });
    }

    const now = new Date();
    const autoCompleteAt = new Date(now.getTime() + ORDER_AUTO_COMPLETE_MS);

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        type: "listing",
        paymentStatus: "paid",
        status: { $nin: ["delivered", "completed", "cancelled"] },
        refundStatus: { $nin: ["refunded", "disputed"] },
      },
      {
        $set: {
          status: "delivered",
          deliveredAt: now,
          deliveredBy: req.user._id,
          deliveryNote,
          autoCompleteAt,
          autoCompleted: false,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({
        status: false,
        message: "Only active paid orders can be marked as delivered",
      });
    }

    const buyerId = booking.user?._id || booking.user;
    if (buyerId) {
      sendPushNotification({
        userIds: buyerId,
        title: "Order Delivered — Please Confirm",
        body: `Your order #${String(booking._id).slice(-6)} was marked as delivered. Review and confirm within ${ORDER_AUTO_COMPLETE_DAYS} days to release payment.`,
        data: { type: "booking", bookingId: String(booking._id) },
      }).catch((err) => console.error("Order delivery push error:", err));
    }

    return res.json({
      status: true,
      message: `Order marked as delivered. Payment will release once the buyer confirms or after ${ORDER_AUTO_COMPLETE_DAYS} days.`,
      booking: updated,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const confirmListingDelivery = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("user", "_id name")
      .populate("teacher", "_id name");

    if (!booking) {
      return res.status(404).json({ status: false, message: "Booking not found" });
    }
    if (booking.type !== "listing") {
      return res.status(400).json({ status: false, message: "Only listing orders can be confirmed here" });
    }

    const buyerId = String(booking.user?._id || booking.user || "");
    const isAuthorized = (buyerId && buyerId === String(req.user._id)) || req.user.role === "admin";
    if (!isAuthorized) {
      return res.status(403).json({
        status: false,
        message: "Only the buyer or admin can confirm delivery",
      });
    }
    if (["refunded", "disputed"].includes(booking.refundStatus)) {
      return res.status(400).json({
        status: false,
        message: "Refunded or disputed orders cannot be confirmed",
      });
    }

    const finalized = await finalizeListingOrderCompletion(booking, {
      completedBy: req.user._id,
      autoCompleted: false,
      allowedStatuses: ["delivered"],
    });

    if (!finalized) {
      return res.status(400).json({
        status: false,
        message: "Only delivered paid orders can be confirmed",
      });
    }

    const teacherId = booking.teacher?._id || booking.teacher;
    if (teacherId) {
      sendPushNotification({
        userIds: teacherId,
        title: "Order Confirmed — Payment Released!",
        body: `The buyer confirmed delivery for order #${String(booking._id).slice(-6)}. Funds are being transferred for payout.`,
        data: { type: "booking", bookingId: String(booking._id) },
      }).catch((err) => console.error("Order confirmation push error:", err));
    }

    return res.json({
      status: true,
      message: "Order confirmed and payment released to the seller.",
      booking: finalized.claimed,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const requestListingRevision = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const rawNote = typeof req.body?.revisionNote === "string" ? req.body.revisionNote.trim() : "";
    const revisionNote = rawNote.slice(0, 1000);

    const booking = await Booking.findById(bookingId)
      .populate("user", "_id name")
      .populate("teacher", "_id name");

    if (!booking) {
      return res.status(404).json({ status: false, message: "Booking not found" });
    }
    if (booking.type !== "listing") {
      return res.status(400).json({ status: false, message: "Only listing orders support revisions" });
    }

    const buyerId = String(booking.user?._id || booking.user || "");
    if (!buyerId || buyerId !== String(req.user._id)) {
      return res.status(403).json({
        status: false,
        message: "Only the buyer can request a revision",
      });
    }

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        type: "listing",
        paymentStatus: "paid",
        status: "delivered",
        refundStatus: { $nin: ["refunded", "disputed"] },
      },
      {
        $set: {
          status: "paid",
          deliveredAt: null,
          deliveredBy: null,
          autoCompleteAt: null,
          revisionNote,
          revisionRequestedAt: new Date(),
        },
        $inc: { revisionCount: 1 },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({
        status: false,
        message: "Revision can only be requested for delivered orders",
      });
    }

    const teacherId = booking.teacher?._id || booking.teacher;
    if (teacherId) {
      sendPushNotification({
        userIds: teacherId,
        title: "Revision Requested",
        body: `The buyer requested updates on order #${String(booking._id).slice(-6)}. Funds remain safely in escrow.`,
        data: { type: "booking", bookingId: String(booking._id) },
      }).catch((err) => console.error("Revision request push error:", err));
    }

    return res.json({
      status: true,
      message: "Revision requested. Auto-completion has been paused and funds remain in escrow.",
      booking: updated,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const completeLessonByTeacher = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { type, lId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("user", "_id")
      .populate("teacher", "_id");

    if (!booking) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    const teacherId = String(booking.teacher?._id || booking.teacher || "");
    const isAuthorized = (teacherId && teacherId === String(req.user._id)) || req.user.role === "admin";
    if (!isAuthorized) {
      return res.status(403).json({
        status: false,
        message: "Only the seller or admin can mark this order as complete",
      });
    }

    const bookingType = booking.type;
    if (type && type !== bookingType) {
      return res.status(400).json({
        status: false,
        message: "Booking type mismatch",
      });
    }

    if (bookingType === "listing") {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          status: false,
          message: "Sellers must mark the order as delivered. Funds release once the buyer confirms or after the review window.",
        });
      }
      if (["refunded", "disputed"].includes(booking.refundStatus)) {
        return res.status(400).json({
          status: false,
          message: "Refunded or disputed orders cannot be completed",
        });
      }

      const finalized = await finalizeListingOrderCompletion(booking, {
        completedBy: req.user._id,
        autoCompleted: false,
        allowedStatuses: ["paid", "scheduled", "pending", "delivered"],
      });

      if (!finalized) {
        return res.status(400).json({
          status: false,
          message: "Only active paid orders can be completed",
        });
      }

      if (booking.user?._id) {
        sendPushNotification({
          userIds: booking.user._id,
          title: "Order Completed!",
          body: `Your order #${String(booking._id).slice(-6)} has been marked as completed.`,
          data: {
            type: "booking",
            bookingId: String(booking._id),
          },
        }).catch((err) => console.error("Order completion push notification error:", err));
      }

      return res.json({
        status: true,
        message: "Order completed successfully",
        booking: finalized.claimed,
      });
    }

    if (bookingType === "lesson") {
      if (["refunded", "disputed"].includes(booking.refundStatus)) {
        return res.status(400).json({
          status: false,
          message: "Refunded or disputed orders cannot be completed",
        });
      }

      const nextPayoutStatus = ["direct", "transferred"].includes(booking.payoutStatus)
        ? booking.payoutStatus
        : "pending_connect";

      const claimed = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          paymentStatus: "paid",
          status: { $nin: ["completed", "cancelled"] },
          refundStatus: { $nin: ["refunded", "disputed"] },
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            completedBy: req.user._id,
            payoutStatus: nextPayoutStatus,
          },
        },
        { new: true }
      );

      if (!claimed) {
        return res.status(400).json({
          status: false,
          message: "Only active paid orders can be completed",
        });
      }

      const earningCurrency = requireCurrency(
        claimed.teacherPayoutCurrency ||
          claimed.itemSnapshot?.currency ||
          claimed.lesson_currency ||
          claimed.currency ||
          "USD"
      );
      const fallbackRate =
        typeof claimed.commissionRate === "number"
          ? claimed.commissionRate
          : await getCommissionRate();
      const teacherAmount =
        claimed.teacherPayoutAmount != null
          ? claimed.teacherPayoutAmount
          : roundMoney(claimed.amount - claimed.amount * fallbackRate, earningCurrency);

      if (booking.user?._id) {
        await User.findByIdAndUpdate(
          booking.user._id,
          { $inc: { classesAttended: 1 } },
          { new: true }
        );
      }

      if (booking.teacher?._id) {
        await User.findByIdAndUpdate(
          booking.teacher._id,
          {
            $inc: {
              classesHost: 1,
              [`balances.pending.${earningCurrency}`]: -teacherAmount,
              [`balances.available.${earningCurrency}`]: teacherAmount,
              [`balances.total.${earningCurrency}`]: teacherAmount,
            },
          },
          { new: true }
        );

        if (nextPayoutStatus === "pending_connect") {
          processPendingTeacherPayouts(booking.teacher._id).catch((err) =>
            console.warn("Auto transfer on complete lesson error:", err.message)
          );
        }
      }

      return res.json({
        status: true,
        message: "Lesson completed successfully",
        booking: claimed,
      });
    }

    if (bookingType === "curriculum") {
      if (
        booking.paymentStatus !== "paid" ||
        booking.status === "cancelled" ||
        ["refunded", "disputed"].includes(booking.refundStatus)
      ) {
        return res.status(400).json({
          status: false,
          message: "Only active paid bookings can be completed",
        });
      }
      if (!lId) {
        return res.status(400).json({
          status: false,
          message: "lId is required for curriculum lesson completion",
        });
      }

      const index = booking.lessonPosition.findIndex(
        (ls) => ls.lId.toString() === lId.toString()
      );

      if (index === -1) {
        return res.status(404).json({
          status: false,
          message: "Lesson not found in this booking",
        });
      }

      if (booking.lessonPosition[index].status === "completed") {
        return res.status(400).json({
          status: false,
          message: "Curriculum lesson is already completed",
        });
      }

      booking.lessonPosition[index].status = "completed";
      await booking.save();

      if (booking.user?._id) {
        await User.findByIdAndUpdate(
          booking.user._id,
          { $inc: { classesAttended: 1 } },
          { new: true }
        );
      }

      if (booking.teacher?._id) {
        await User.findByIdAndUpdate(
          booking.teacher._id,
          { $inc: { classesHost: 1 } },
          { new: true }
        );
      }

      const allLessonsDone =
        Array.isArray(booking.lessonPosition) &&
        booking.lessonPosition.length > 0 &&
        booking.lessonPosition.every(
          (ls) => ls.status === "completed" || ls.status === "cancelled"
        );

      let responseBooking = booking;
      if (allLessonsDone) {
        const nextPayoutStatus = ["direct", "transferred"].includes(booking.payoutStatus)
          ? booking.payoutStatus
          : "pending_connect";

        const claimedCurriculum = await Booking.findOneAndUpdate(
          {
            _id: bookingId,
            paymentStatus: "paid",
            status: { $nin: ["completed", "cancelled"] },
            refundStatus: { $nin: ["refunded", "disputed"] },
          },
          {
            $set: {
              status: "completed",
              completedAt: new Date(),
              completedBy: req.user._id,
              payoutStatus: nextPayoutStatus,
            },
          },
          { new: true }
        );

        if (claimedCurriculum) {
          responseBooking = claimedCurriculum;
          const earningCurrency = requireCurrency(
            claimedCurriculum.teacherPayoutCurrency ||
              claimedCurriculum.lesson_currency ||
              claimedCurriculum.currency ||
              "USD"
          );
          const fallbackRate =
            typeof claimedCurriculum.commissionRate === "number"
              ? claimedCurriculum.commissionRate
              : await getCommissionRate();
          const teacherAmount =
            claimedCurriculum.teacherPayoutAmount != null
              ? claimedCurriculum.teacherPayoutAmount
              : roundMoney(
                  claimedCurriculum.amount - claimedCurriculum.amount * fallbackRate,
                  earningCurrency
                );

          if (booking.teacher?._id) {
            await User.findByIdAndUpdate(
              booking.teacher._id,
              {
                $inc: {
                  moneyPending: -teacherAmount,
                  [`balances.available.${earningCurrency}`]: teacherAmount,
                  [`balances.total.${earningCurrency}`]: teacherAmount,
                },
              },
              { new: true }
            );

            if (nextPayoutStatus === "pending_connect") {
              processPendingTeacherPayouts(booking.teacher._id).catch((err) =>
                console.warn("Auto transfer on complete curriculum error:", err.message)
              );
            }
          }
        }
      }

      return res.json({
        status: true,
        message: allLessonsDone
          ? "Curriculum completed successfully"
          : "Curriculum lesson completed successfully",
        booking: responseBooking,
      });
    }

    return res.status(400).json({ status: false, message: "Invalid type." });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const upcomingBookingsByUserId = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { id } = req.params;
    if (!id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const isSelfOrAdmin =
      String(req.user?._id || "") === String(id) || req.user?.role === "admin";
    if (!isSelfOrAdmin) {
      const targetUser = await User.findById(id).select("publicType").lean();
      if (!targetUser || targetUser.publicType !== true) {
        return res.status(403).json({
          status: false,
          message: "This user's schedule is private",
        });
      }
    }

    const { scheduledAt, timezone } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required for upcoming bookings",
      });
    }

    // Convert to UTC
    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();

    // -------------------------------
    // MAIN FIXED FILTER
    // -------------------------------
    const filter = {
      user: id,
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
      $or: [
        { scheduledAt: { $gte: newDateUTC } },
        { "lessonPosition.scheduledAt": { $gte: newDateUTC } },
      ],
    };

    // Pagination
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .select("_id scheduledAt timezone type status lesson curriculum teacher")
      .populate(
        "lesson",
        "title duration type images totalRatings averageRating"
      )
      .populate("curriculum", "title type images totalRatings averageRating")
      .populate("teacher", "name image totalRatings averageRating")
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select("-stripeSessionId -stripe_session_id")
      .populate(
        "lesson",
        "title duration type images totalRatings averageRating"
      )
      .populate(
        "listing",
        "title price duration type coverImage images totalRatings averageRating message"
      )
      .populate(
        "curriculum",
        "title type images totalRatings averageRating calenderId"
      )
      .populate("teacher", "name image totalRatings averageRating")
      .populate(
        "lessonPosition.lId",
        "title duration type images totalRatings averageRating"
      ); // populate lessonPosition lessons

    if (!booking) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    const isBuyer = String(booking.user || "") === String(req.user._id);
    const isSeller = String(booking.teacher?._id || booking.teacher || "") === String(req.user._id);
    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Not authorized to view this booking" });
    }

    return res.json({
      status: true,
      booking,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const userMainUpcomingBookings = async (req, res) => {
  try {
    const { scheduledAt, timezone, page = 1, limit = 10 } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required",
      });
    }

    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();

    const bookings = await Booking.find({
      user: req.user._id,
      $or: [
        { scheduledAt: { $gte: newDateUTC } },
        { "lessonPosition.scheduledAt": { $gte: newDateUTC } },
      ],
    })
      .populate("lesson", "title price currency")
      .populate("curriculum", "title")
      .populate("teacher", "name _id")
      .lean();

    let upcomingLessons = [];

    for (const b of bookings) {
      // -------------------------
      // 1ï¸âƒ£ SINGLE LESSON BOOKING
      // -------------------------
      if (
        b.scheduledAt &&
        b.scheduledAt >= newDateUTC &&
        b.status !== "pending" // ðŸ”¥ Prevent pending
      ) {
        upcomingLessons.push({
          bookingId: b._id,
          lId: b.lesson?._id || null,
          lessonTitle: b.lesson?.title || null,
          scheduledAt: b.scheduledAt,
          amount: b.lesson?.price || b.amount,
          currency: b.lesson_currency || b.lesson?.currency || "USD",
          status: b.status,
          type: b.type,
          name: b.teacher?.name || null,
          userId: b.teacher?._id || null,
        });
      }

      // -------------------------
      // 2ï¸âƒ£ CURRICULUM LESSONS
      // -------------------------
      if (Array.isArray(b.lessonPosition)) {
        const validLessons = b.lessonPosition.filter(
          (lp) =>
            lp.scheduledAt !== null &&
            lp.scheduledAt >= newDateUTC &&
            lp.status !== "pending" // ðŸ”¥ Prevent pending
        );

        for (const lp of validLessons) {
          const lessonData = await Lesson.findById(lp.lId).select(
            "title price currency"
          );

          upcomingLessons.push({
            bookingId: b._id,
            lId: lp.lId,
            lessonTitle: lessonData?.title || null,
            scheduledAt: lp.scheduledAt,
            amount: lessonData?.price || 0,
            currency: lessonData?.currency || "USD",
            status: lp.status,
            type: b.type,
            name: b.teacher?.name || null,
            teacherId: b.teacher?._id || null,
            // â­ NEW FIELD: Curriculum Title
            curriculumTitle: b.curriculum?.title || null,
          });
        }
      }
    }

    // SORT RESULTS
    upcomingLessons.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );

    // PAGINATION
    const total = upcomingLessons.length;
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedLessons = upcomingLessons.slice(start, end);

    return res.json({
      status: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      lessons: paginatedLessons,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const teacherMainUpcomingBookings = async (req, res) => {
  try {
    const { scheduledAt, timezone, page = 1, limit = 10 } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required",
      });
    }

    // ============================
    // TIMEZONE â†’ UTC
    // ============================
    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();

    // ============================
    // FETCH BOOKINGS
    // ============================
    const bookings = await Booking.find({
      teacher: req.user._id,
      $or: [
        { scheduledAt: { $gte: newDateUTC } },
        { "lessonPosition.scheduledAt": { $gte: newDateUTC } },
      ],
    })
      .populate("lesson", "title price currency")
      .populate("curriculum", "title")
      .populate("user", "name _id")
      .lean();

    let upcomingLessons = [];

    // ============================
    // 1ï¸âƒ£ SINGLE LESSONS
    // ============================
    for (const b of bookings) {
      if (
        b.scheduledAt &&
        b.scheduledAt >= newDateUTC &&
        b.status !== "pending" &&
        b.lesson?._id
      ) {
        upcomingLessons.push({
          bookingId: b._id.toString(),
          lId: b.lesson._id.toString(),
          lessonTitle: b.lesson.title,
          scheduledAt: b.scheduledAt,
          amount: b.lesson.price || b.amount,
          currency: b.lesson_currency || b.lesson.currency || "USD",
          status: b.status,
          type: b.type,
          group: b.group === true,
          name: b.user?.name || null,
          curriculumTitle: b.curriculum?.title || null,
        });
      }

      // ============================
      // 2ï¸âƒ£ CURRICULUM LESSONS
      // ============================
      if (Array.isArray(b.lessonPosition)) {
        for (const lp of b.lessonPosition) {
          if (
            !lp.lId ||
            !lp.scheduledAt ||
            lp.scheduledAt < newDateUTC ||
            lp.status === "pending"
          )
            continue;

          const lessonData = await Lesson.findById(lp.lId).select(
            "title price currency"
          );

          upcomingLessons.push({
            bookingId: b._id.toString(),
            lId: lp.lId.toString(),
            lessonTitle: lessonData?.title || null,
            scheduledAt: lp.scheduledAt,
            amount: lessonData?.price || 0,
            currency: lessonData?.currency || "USD",
            status: lp.status,
            type: b.type,
            group: lp.group === true,
            name: b.user?.name || null,
            userId: b.user?._id || null,
                   curriculumTitle: b.curriculum?.title || null,
          });
        }
      }
    }

    // ============================
    // SORT BY DATE
    // ============================
    upcomingLessons.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );

    // ============================
    // ðŸ”¥ TIME NORMALIZER (IMPORTANT)
    // ============================
    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d.toISOString();
    };

    // ============================
    // âœ… GROUP + COUNT LOGIC (FINAL)
    // ============================
    const groupedMap = new Map();

    for (const lesson of upcomingLessons) {
      if (
        lesson.type === "lesson" &&
        lesson.group === true &&
        lesson.lId &&
        lesson.scheduledAt
      ) {
        // ðŸ”‘ SAME lesson + SAME time (minute-level)
        const timeKey = normalizeDate(lesson.scheduledAt);
        const key = `${lesson.lId}_${timeKey}`;

        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            ...lesson,
            count: 1,
          });
        } else {
          groupedMap.get(key).count += 1;
        }
      } else {
        // non-group lessons
        const key = `${lesson.bookingId}_${lesson.scheduledAt}`;
        groupedMap.set(key, {
          ...lesson,
          count: 1,
        });
      }
    }

    const finalLessons = Array.from(groupedMap.values());

    // ============================
    // PAGINATION
    // ============================
    const total = finalLessons.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const paginatedLessons = finalLessons.slice(start, end);

    return res.json({
      status: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      lessons: paginatedLessons,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



export const teacherPastLessons = async (req, res) => {
  try {
    const { scheduledAt, timezone, page = 1, limit = 10 } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required",
      });
    }

    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();
    const skip = (page - 1) * limit;

    // ---------------- AGGREGATION (AS-IS) ----------------
    const pipeline = [
      {
        $match: {
          teacher: req.user._id,
          $or: [
            { scheduledAt: { $lt: newDateUTC } },
            { "lessonPosition.scheduledAt": { $lt: newDateUTC } },
          ],
        },
      },
      {
        $project: {
          bookingId: "$_id",
          user: 1,
          amount: 1,
          scheduledAt: 1,
          lesson: 1,
          lessonPosition: 1,
          type: 1,
          review: 1,
          status: 1,
          group: 1,
        },
      },
      {
        $addFields: {
          flatLessons: {
            $concatArrays: [
              [
                {
                  lId: "$lesson",
                  scheduledAt: "$scheduledAt",
                  status: "$status",
                  bookingId: "$_id",
                  amount: "$amount",
                  review: "$review",
                  type: "$type",
                  group: "$group",
                },
              ],
              {
                $map: {
                  input: "$lessonPosition",
                  as: "lp",
                  in: {
                    lId: "$$lp.lId",
                    scheduledAt: "$$lp.scheduledAt",
                    status: "$$lp.status",
                    bookingId: "$_id",
                    amount: "$amount",
                    review: "$$lp.review",
                    type: "$type",
                    group: "$$lp.group",
                  },
                },
              },
            ],
          },
        },
      },
      { $unwind: "$flatLessons" },
      {
        $match: {
          "flatLessons.scheduledAt": { $lt: newDateUTC },
        },
      },
      { $sort: { "flatLessons.scheduledAt": -1 } },
    ];

    let lessons = await Booking.aggregate(pipeline);

    // ---------------- POPULATE + GROUP LOGIC ----------------
    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d.toISOString();
    };

    const groupMap = new Map();
    const finalLessons = [];

    for (let item of lessons) {
      const lessonInfo = await Lesson.findById(item.flatLessons.lId).select(
        "title price"
      );
      const userInfo = await User.findById(item.user).select("name _id");

      const lessonObj = {
        bookingId: item.flatLessons.bookingId,
        lId: item.flatLessons.lId,
        lessonTitle: lessonInfo?.title || null,
        amount: lessonInfo?.price || item.flatLessons.amount,
        scheduledAt: item.flatLessons.scheduledAt,
        status: item.flatLessons.status,
        review: item.flatLessons.review,
        type: item.flatLessons.type,
        group: item.flatLessons.group === true,
        name: userInfo?.name || null,
        userId: userInfo?._id || null,
        count: 1,
      };

      // âœ… GROUP TRUE â†’ MERGE
      if (lessonObj.group === true) {
        const timeKey = normalizeDate(lessonObj.scheduledAt);
        const key = `${lessonObj.lId}_${timeKey}`;

        if (!groupMap.has(key)) {
          groupMap.set(key, lessonObj);
        } else {
          groupMap.get(key).count += 1;
        }
      } else {
        // âœ… NORMAL LESSON
        finalLessons.push(lessonObj);
      }
    }

    // push grouped lessons
    finalLessons.push(...groupMap.values());

    // ---------------- PAGINATION ----------------
    const paginatedLessons = finalLessons.slice(skip, skip + Number(limit));

    return res.json({
      status: true,
      total: finalLessons.length,
      page: Number(page),
      limit: Number(limit),
      lessons: paginatedLessons,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};


export const userPastLessons = async (req, res) => {
  try {
    const { scheduledAt, timezone, page = 1, limit = 10 } = req.query;

    if (!scheduledAt || !timezone) {
      return res.status(400).json({
        status: false,
        message: "scheduledAt and timezone are required",
      });
    }

    const newDateUTC = moment.tz(scheduledAt, timezone).utc().toDate();

    const skip = (page - 1) * limit;

    // ---------------- AGGREGATION ----------------
    const pipeline = [
      // 1ï¸âƒ£ Filter bookings for this teacher
      {
        $match: {
          user: req.user._id,
          $or: [
            { scheduledAt: { $lt: newDateUTC } },
            { "lessonPosition.scheduledAt": { $lt: newDateUTC } },
          ],
        },
      },

      // 2ï¸âƒ£ Flatten single-lesson booking
      {
        $project: {
          bookingId: "$_id",
          user: 1,
          amount: 1,
          scheduledAt: 1,
          lesson: 1,
          lessonPosition: 1, // contains nested review
          type: 1,
          review: 1,
          status: 1,
        },
      },

      // 3ï¸âƒ£ Convert curriculum lessons into a flat array
      {
        $addFields: {
          flatLessons: {
            $concatArrays: [
              [
                {
                  lId: "$lesson",
                  scheduledAt: "$scheduledAt",
                  status: "$status",
                  bookingId: "$_id",
                  amount: "$amount",
                  isMainLesson: true,
                  review: "$review", // main lesson review
                  type: "$type",
                },
              ],
              {
                $map: {
                  input: "$lessonPosition",
                  as: "lp",
                  in: {
                    lId: "$$lp.lId",
                    scheduledAt: "$$lp.scheduledAt",
                    status: "$$lp.status",
                    bookingId: "$_id",
                    amount: "$amount",
                    isMainLesson: false,
                    review: "$$lp.review", // curriculum real review
                    type: "$type",
                  },
                },
              },
            ],
          },
        },
      },

      // 4ï¸âƒ£ Only past lessons (where scheduledAt < now)
      {
        $unwind: "$flatLessons",
      },
      {
        $match: {
          "flatLessons.scheduledAt": { $lt: newDateUTC },
        },
      },

      // 5ï¸âƒ£ Sort by scheduledAt DESC (latest completed first)
      {
        $sort: { "flatLessons.scheduledAt": -1 },
      },

      // 6ï¸âƒ£ Pagination at DB level
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    let lessons = await Booking.aggregate(pipeline);

    // 7ï¸âƒ£ Populate selected lessons
    for (let item of lessons) {
      let lessonInfo = await Lesson.findById(item.flatLessons.lId).select(
        "title price"
      );
      let userInfo = await User.findById(item.user).select("name _id");
    
      item.lId = item.flatLessons.lId;
      item.lessonTitle = lessonInfo?.title || null;
      item.amount = lessonInfo?.price || item.flatLessons.amount;
      item.scheduledAt = item.flatLessons.scheduledAt;
      item.status = item.flatLessons.status;
      item.review = item.flatLessons.review; // âœ… ADD THIS
      item.type = item.flatLessons.type;
      item.name = userInfo?.name || null;
      item.userId = userInfo?._id || null;
      item.bookingId = item.flatLessons.bookingId;

      delete item.flatLessons;
      delete item.lessonPosition;
    }

    return res.json({
      status: true,
      total: lessons.length,
      page: Number(page),
      limit: Number(limit),
      lessons,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const checkUserListingPurchase = async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!req.user?._id) {
      return res.status(401).json({ status: false, message: "Unauthorized", hasPurchased: false });
    }
    if (!listingId) {
      return res.status(400).json({ status: false, message: "Listing ID required", hasPurchased: false });
    }

    const hasPurchased = await Booking.exists({
      user: req.user._id,
      type: "listing",
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
      $or: [
        { listing: listingId },
        { "itemSnapshot.itemId": listingId },
      ],
    });

    return res.json({
      status: true,
      hasPurchased: Boolean(hasPurchased),
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message, hasPurchased: false });
  }
};


