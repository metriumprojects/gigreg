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
import { checkAndSaveSlot, releaseSlot } from "./lockTimeController.js";
import Availability from "../models/availabilityModel.js";
import LessonCalender from "../models/LessonCalender.js";
import { requireCurrency, requirePositivePrice, roundMoney, toSmallestUnit } from "../services/currencyService.js";
import { convertWithStripeFx } from "../services/stripeFxService.js";
import { getCommissionRate } from "../services/appSettingsService.js";
import { emitChatMessage, emitChatMessageUpdate } from "../socket/socketHandler.js";
import { getStripe } from "../services/stripeService.js";

const stripe = getStripe();

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
    return res.status(err.status || 500).json({
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

    const parsedMeta = meta
      ? typeof meta === "string" ? JSON.parse(meta) : meta
      : {};
    const requestedCurrency = requireCurrency(checkoutCurrency);

    if (!id || !firstname || !lastname || !type) {
      return res.status(400).json({
        status: false,
        message: "id, firstname, lastname, and type are required",
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
        bookedHours: parsedMeta?.hours || itemData.duration || "",
        selectedDate: parsedMeta?.selectedDate || "",
        selectedTimes: Array.isArray(parsedMeta?.selectedTimes) ? parsedMeta.selectedTimes : [],
      };

      if (quoteCheckout) {
        const quoteMessage = await Message.findById(parsedMeta.quoteMessageId);
        if (
          !quoteMessage ||
          quoteMessage.type !== "quote" ||
          String(quoteMessage.quote?.listingId) !== String(itemData._id) ||
          !["open", "accepted"].includes(quoteMessage.quote?.status)
        ) {
          return res.status(400).json({ status: false, message: "Quote not found" });
        }
        const quoteRoom = await ChatRoom.findById(quoteMessage.roomId).select("student teacher");
        if (!quoteRoom || String(quoteRoom.student) !== String(req.user._id) || String(quoteRoom.teacher) !== String(itemData.createdBy?._id)) {
          return res.status(403).json({ status: false, message: "This quote does not belong to this booking" });
        }
        amountFloat = quoteMessage.quote.price;
        bookingCurrencyOverride = quoteMessage.quote.currency || itemData.currency || "USD";
        bookingSnapshot.price = quoteMessage.quote.price;
        bookingSnapshot.currency = bookingCurrencyOverride;
      } else if (["hourly", "hourly_calendar"].includes(itemData.pricingType)) {
        const quantity = Math.max(1, Array.isArray(parsedMeta.selectedTimes) ? parsedMeta.selectedTimes.length : 1);
        amountFloat = roundMoney(amountFloat * quantity);
        bookingSnapshot.quantity = quantity;
        bookingSnapshot.price = amountFloat;
        bookingSnapshot.bookedHours = parsedMeta?.hours || itemData.duration || "";
      }
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
    const amountInSmallestUnit = toSmallestUnit(paymentAmount, paymentCurrency);

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
      meta: Object.keys(parsedMeta).length
        ? {
            ...parsedMeta,
            preferredCustomerCurrency: requestedCurrency,
            listingCurrency: itemCurrency,
            checkoutExchangeRate: display.rate,
            checkoutExchangeStale: Boolean(display.stale),
            stripeFxQuoteId: display.quoteId || undefined,
          }
        : {
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
    // STRIPE CHECKOUT SESSION (Corrected!)
    // ----------------------------------------------------------------
    const teacherAccount = await User.findById(teacher).select("stripeConnectAccountId stripeConnect");
    if (!teacherAccount?.stripeConnectAccountId) {
      await Booking.findByIdAndDelete(booking._id);
      return res.status(409).json({
        status: false,
        message: "This teacher has not completed Stripe payout setup yet",
      });
    }

    const connectAccount = await stripe.accounts.retrieve(teacherAccount.stripeConnectAccountId, {
      expand: ["external_accounts"],
    });
    const connectReady = connectAccount.payouts_enabled
      && connectAccount.capabilities?.transfers === "active";
    if (!connectReady) {
      await Booking.findByIdAndDelete(booking._id);
      return res.status(409).json({
        status: false,
        message: "This teacher's Stripe verification or payouts setup is incomplete",
      });
    }

    const commissionRate = await getCommissionRate();
    const applicationFeeAmount = Math.min(
      amountInSmallestUnit,
      Math.max(0, Math.round(amountInSmallestUnit * commissionRate))
    );
    booking.stripeApplicationFeeAmount = applicationFeeAmount;

    const teacherPayoutCurrency = String(connectAccount.default_currency || "").toUpperCase();
    // Adaptive Pricing is intentionally omitted: we already convert with Stripe FX Quotes
    // so Checkout matches catalogue prices. Enabling it would re-quote and diverge.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user?.email || undefined,
      branding_settings: { display_name: "Skill Slide" },
      metadata: {
        bookingId: String(booking._id),
        teacherId: String(teacher),
        lessonCurrency: itemCurrency,
        preferredCustomerCurrency: requestedCurrency,
        chargedCurrency: paymentCurrency,
        teacherPayoutCurrency,
        stripeFxQuoteId: display.quoteId || "",
        checkoutExchangeRate: String(display.rate ?? 1),
      },
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: teacherAccount.stripeConnectAccountId },
        metadata: {
          bookingId: String(booking._id),
          chargedCurrency: paymentCurrency,
          lessonCurrency: itemCurrency,
          teacherPayoutCurrency,
        },
      },

      line_items: [
        {
          price_data: {
            currency: paymentCurrency.toLowerCase(),
            product_data: {
              name: `TEACHER: ${teacherName} - ${
                type === "lesson" ? "LESSON" : type === "listing" ? "LISTING" : "CURRICULUM"
              }: ${itemName} `,

              images: productImage ? [productImage] : [],
            },
            unit_amount: amountInSmallestUnit, // cents
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.FRONTEND_URL}/after-payment-curri/${
        booking?._id || 12323
      }`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel/${booking._id}`,
    });

    // Save stripe session id
    booking.stripeSessionId = session.id;
    booking.stripe_session_id = session.id;
    await booking.save();
    console.log(session, "sessions");

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
      teacherPayoutCurrency,
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

// --------------------------- Confirm Booking -------------------------------

export const confirmBooking = async (req, res) => {
  try {
    const {
      bookingId,
      type,
      group,

      usecapacity,
    } = req.body;


    if (!bookingId) {
      return res
        .status(400)
        .json({ status: false, message: "bookingId required" });
    }

    // ðŸ” Find booking & populate data
    const booking = await Booking.findById(bookingId)
      .populate("curriculum")
      .populate("lesson")
      .populate("listing")
      .populate("user", "name email");

    if (!booking) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    if (String(booking.user?._id || booking.user) !== String(req.user._id)) {
      return res.status(403).json({ status: false, message: "You cannot confirm another user's booking" });
    }

    // Prevent duplicate confirmations with multiple safety checks
    if (booking.paymentStatus === "paid" && booking.status === "paid") {
      // If already paid, check if we need to create welcome message
      if (!booking.welcomeMessageSent) {
        // This shouldn't happen, but ensure message exists
        return res.status(400).json({
          status: false,
          message: "Booking already confirmed but processing...",
        });
      }
      return res.status(400).json({
        status: false,
        message: "Booking already confirmed",
      });
    }

    if (booking.welcomeMessageSent) {
      return res.status(400).json({
        status: false,
        message: "Booking already processed",
      });
    }

    const checkoutSessionId = booking.stripeSessionId || booking.stripe_session_id || booking.stripePaymentIntentId;
    if (!checkoutSessionId) {
      return res.status(400).json({
        status: false,
        message: "No Stripe session found for this booking",
      });
    }

    // â­ Retrieve Checkout Session with paymentIntent expanded
    const session = await stripe.checkout.sessions.retrieve(
      checkoutSessionId,
      { expand: ["payment_intent"] }
    );

    if (!session) {
      return res.status(400).json({
        status: false,
        message: "Unable to retrieve Stripe checkout session",
      });
    }

    const paymentIntent = session.payment_intent;

    if (!paymentIntent) {
      booking.paymentStatus = "failed";
      booking.payment_status = "failed";
      await booking.save();
      return res.status(400).json({
        status: false,
        message: "Payment not completed or no payment found",
      });
    }

    // â­ Payment success logic
    if (paymentIntent.status === "succeeded" && type === "succeeded") {
      // bookSlot(group, global, slotId, day, specific, calenderId);
      const confirmedGroup =
        group ||
        (booking.type === "lesson" && booking.lesson?.isGroupAvailable) ||
        false;

      const claimedBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          paymentStatus: { $ne: "paid" },
          status: { $ne: "paid" },
        },
        {
          $set: {
            paymentStatus: "paid",
            payment_status: "paid",
            status: "paid",
            stripePaymentIntentId: paymentIntent.id,
            stripe_payment_intent_id: paymentIntent.id,
            group: confirmedGroup,
            "meta.stripe": {
              id: paymentIntent.id,
              status: paymentIntent.status,
            },
          },
        },
        { new: true }
      );

      if (!claimedBooking) {
        return res.status(200).json({
          status: true,
          message: "Booking already confirmed",
          booking,
        });
      }

      booking.paymentStatus = claimedBooking.paymentStatus;
      booking.payment_status = claimedBooking.payment_status;
      booking.status = claimedBooking.status;
      booking.stripePaymentIntentId = claimedBooking.stripePaymentIntentId;
      booking.stripe_payment_intent_id = claimedBooking.stripe_payment_intent_id;
      booking.group = claimedBooking.group;
      booking.meta = claimedBooking.meta;

      // ðŸ§  Determine type (lesson, listing or curriculum)
      const isLesson = booking.type === "lesson";
      const isListing = booking.type === "listing";
      const item = isLesson ? booking.lesson : isListing ? booking.listing : booking.curriculum;
      const itemTitle = item?.title || "Purchased Content";

      
    console.log(group, usecapacity, "groupvalue");

     
      // if(isLesson){

      // }else{
      //   if (booking.lessonPosition && booking.lessonPosition.length > 0) {
      //     booking.lessonPosition[0].group = true;
      //   }
      // }
      // ðŸ§‘â€ðŸ« Get teacher
      const teacher = await User.findById(item.createdBy);
      const student = booking.user;
      const commissionRate = await getCommissionRate();
      if (isLesson || isListing) {
        const earningCurrency = requireCurrency(
          isLesson
            ? booking.lesson_currency || "USD"
            : booking.itemSnapshot?.currency || booking.currency || item.currency || "USD"
        );
        const teacherAmount = roundMoney(booking.amount - booking.amount * commissionRate, earningCurrency);
        await User.findByIdAndUpdate(teacher._id, {
          $inc: { [`balances.pending.${earningCurrency}`]: teacherAmount },
        });
      } else {
        const commission = booking.amount * commissionRate;
        const finalAmount = booking.amount - commission;
        teacher.moneyPending = (teacher.moneyPending || 0) + finalAmount;
        await teacher.save();
      }

      if (isLesson) {
        let duration;
        let newDateUTC;
        let lessonId;
        duration = booking.lesson.duration;
        newDateUTC = booking.scheduledAt;
        lessonId = booking.lesson;
        await checkAndSaveSlot({
          teacher: teacher._id,
          scheduledAtUTC: newDateUTC,
          timezone: booking.timezone,
          duration,
          lessonId,
          group: booking.group || false,
          usecapacity: 1,
          capacity: booking.lesson.usecapacity || 0,
        });
      } else if (isListing && booking.scheduledAt) {
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
        }
      } else if (!isListing) {
        let duration;
        let newDateUTC;
        let lessonId;
        // For curriculum, get the first lesson's duration
        const firstLessonId = booking.curriculum.lessonPosition[0]?.lId;
        lessonId = firstLessonId;
        newDateUTC = booking.lessonPosition[0]?.scheduledAt;
        if (firstLessonId) {
          const firstLesson = await Lesson.findById(firstLessonId);
          duration = firstLesson?.duration || "60m";
        } else {
          duration = "60m";
        }
        await checkAndSaveSlot({
          teacher: teacher._id,
          scheduledAtUTC: newDateUTC,
          timezone: booking.timezone,
          duration,
          lessonId,
          group: group || false,
          usecapacity: usecapacity || 1,
        });
      }

      if (isListing && booking.meta?.quoteMessageId) {
        const acceptedQuoteMessage = await Message.findOneAndUpdate(
          {
            _id: booking.meta.quoteMessageId,
            type: "quote",
            "quote.status": { $ne: "cancelled" },
          },
          { $set: { "quote.status": "accepted" } },
          { new: true }
        ).populate("userId", "name email image");

        if (acceptedQuoteMessage) {
          emitChatMessageUpdate(acceptedQuoteMessage.roomId, acceptedQuoteMessage);
        }
      }

      // ðŸ’¬ Create chat room if not exists
      const primaryFilter = { student: student._id, teacher: teacher._id };
      const legacyFilter = { student: teacher._id, teacher: student._id };

      let chatRoom = await ChatRoom.findOne({ $or: [primaryFilter, legacyFilter] });

      if (!chatRoom) {
        chatRoom = await ChatRoom.create({
          ...primaryFilter,
          lesson: isLesson ? item._id : undefined,
          curriculum: !isLesson && !isListing ? item._id : undefined,
        });
      }

      // Create welcome message - only create if this is a new booking confirmation
      // Use atomic operation to ensure only ONE message is created even with concurrent requests
      const updatedBooking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          welcomeMessageSent: { $ne: true } // Only update if NOT already sent
        },
        {
          $set: { welcomeMessageSent: true }
        },
        { new: true }
      );

      // Only create message if the update was successful (meaning it hadn't been sent before)
      if (updatedBooking) {
        if (isListing && !booking.meta?.quoteMessageId) {
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
          emitChatMessage(chatRoom._id, bookingAcceptedMessage);
        }

        const defaultWelcomeMessage = isLesson
          ? "thank you for booking a lesson with me!"
          : isListing
          ? "thank you for booking my service!"
          : "thank you for booking with me!";
        const teacherWelcomeMessage =
          (isLesson ? booking.lesson?.message : isListing ? booking.listing?.message : booking.curriculum?.message)
            ?.trim() || defaultWelcomeMessage;

        await Message.create({
          roomId: chatRoom._id,
          userId: teacher._id,
          message: `Hi ${student.name || booking.firstname}, ${teacherWelcomeMessage}`,
        });
      }

//       thank you for booking a lesson with me!
// I'm really looking forward to working with you.
// If you'd like, feel free to share your experience level, goals, or anything specific you'd like to focus on, so I can tailor the session to you.

      chatRoom.lastMessage = `Chat started for ${
        isLesson ? "lesson" : isListing ? "listing" : "course"
      } "${itemTitle}"`;
      await chatRoom.save();

      // âœ‰ï¸ Emails
      const teacherMail = {
        from: process.env.SMTP_USER,
        to: teacher.email,
        subject: `ðŸŽ“ Your ${
          isLesson ? "lesson" : isListing ? "listing" : "course"
        } "${itemTitle}" was purchased!`,
        html: `<p>Hello ${teacher.name},</p>
            <p>${booking.firstname} ${booking.lastname} purchased <b>${itemTitle}</b>.</p>
            <p><a href="${process.env.FRONTEND_URL}/chat/${chatRoom._id}">Open Chat</a></p>`,
      };

      const studentMail = {
        from: process.env.SMTP_USER,
        to: student.email,
        subject: `ðŸ“˜ You enrolled in "${itemTitle}"`,
        html: `<p>Hello ${booking.firstname},</p>
            <p>You purchased <b>${itemTitle}</b> by ${teacher.name}.</p>
            <p><a href="${process.env.FRONTEND_URL}/chat/${chatRoom._id}">Go to Chat Room</a></p>`,
      };

      const emailResults = await Promise.all([
        sendEmail(teacherMail),
        sendEmail(studentMail),
      ]);

      const failedEmails = emailResults.filter((result) => !result.status);
      if (failedEmails.length) {
        console.error("Booking confirmed but notification email failed:", {
          bookingId: booking._id,
          failedCount: failedEmails.length,
          errors: failedEmails.map((result) => result.error),
        });
      }

      return res.status(200).json({
        status: true,
        message: "Booking confirmed successfully",
        chatRoomId: chatRoom._id,
        booking,
      });
    }

    // ðŸ”´ Payment Failed / Requires Payment
    if (
      paymentIntent.status === "requires_payment_method" ||
      paymentIntent.status === "canceled" ||
      type === "failed"
    ) {
      const failedStatus = paymentIntent.status === "canceled" ? "cancelled" : "failed";
      booking.paymentStatus = failedStatus;
      booking.payment_status = failedStatus;
      booking.stripePaymentIntentId = paymentIntent.id;
      booking.stripe_payment_intent_id = paymentIntent.id;
      await booking.save();

      return res.status(400).json({
        status: false,
        message: `Payment failed: ${paymentIntent.status}`,
      });
    }

    // Other payment states
    return res.status(400).json({
      status: false,
      message: `Payment not completed: ${paymentIntent.status}`,
    });
  } catch (err) {
    console.error("confirmBooking error:", err);
    return res
      .status(500)
      .json({ status: false, message: err.message || "Server error" });
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
      // upcoming / active orders
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

    const filter = {
      user: req.user._id,
      type: "listing",
      paymentStatus: "paid",
    };

    if (statusFilter === "completed") {
      filter.status = "completed";
    } else if (statusFilter === "cancelled" || statusFilter === "canceled") {
      filter.status = "cancelled";
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
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 1ï¸âƒ£ If TYPE = LESSON â†’ full booking cancel
    if (type === "lesson" || type === "listing") {
      if (type === "listing") {
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

      booking.status = "cancelled";
      if (type === "lesson" || type === "listing") booking.scheduledAt = null;

      await booking.save();

      return res.json({
        status: true,
        message: type === "listing" ? "Order cancelled successfully" : "Lesson booking cancelled successfully",
        booking,
      });
    } else {
      if (!lId) {
        return res.status(400).json({
          status: false,
          message: "lId is required for curriculum lesson cancellation",
        });
      }

      // Find lesson in lessonPosition
      const idx = booking.lessonPosition.findIndex(
        (ls) => ls.lId.toString() === lId.toString()
      );

      if (idx === -1) {
        return res.status(404).json({
          status: false,
          message: "Lesson not found in this booking",
        });
      }

      // Cancel only this lesson
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

export const completeLessonByTeacher = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { type, lId } = req.body;

    // 1. Fetch booking
    const booking = await Booking.findById(bookingId)
      .populate("user", "_id")
      .populate("teacher", "_id");

    if (!booking) {
      return res
        .status(404)
        .json({ status: false, message: "Booking not found" });
    }

    // --------------------------------------------
    //  TYPE = LESSON â†’ COMPLETE FULL BOOKING
    // --------------------------------------------
    if (type === "lesson" || type === "listing") {
      booking.status = "completed";

      await booking.save();

      if (type === "listing") {
        if (booking.teacher?._id) {
          const earningCurrency = requireCurrency(booking.chargedCurrency || booking.currency || "USD");
          const commissionRate = await getCommissionRate();
          const teacherAmount = roundMoney(booking.amount - booking.amount * commissionRate, earningCurrency);
          await User.findByIdAndUpdate(
            booking.teacher._id,
            {
              $inc: {
                [`balances.pending.${earningCurrency}`]: -teacherAmount,
                [`balances.available.${earningCurrency}`]: teacherAmount,
                [`balances.total.${earningCurrency}`]: teacherAmount,
              },
            },
            { new: true }
          );
        }

        return res.json({
          status: true,
          message: "Order completed successfully",
          booking,
        });
      }

      // Increment user stats
      if (booking.user?._id) {
        await User.findByIdAndUpdate(
          booking.user._id,
          {
            $inc: {
              classesAttended: 1,
            },
          },
          { new: true }
        );
      }

      // Increment teacher stats
      if (booking.teacher?._id) {
        const earningCurrency = requireCurrency(booking.lesson_currency || "USD");
        const commissionRate = await getCommissionRate();
        const teacherAmount = roundMoney(booking.amount - booking.amount * commissionRate, earningCurrency);
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
      }
      return res.json({
        status: true,
        message: "Lesson completed successfully",
        booking,
      });
    }

    // --------------------------------------------
    // TYPE = CURRICULUM â†’ COMPLETE ONLY ONE LESSON
    // --------------------------------------------
    if (type === "curriculum") {
      if (!lId) {
        return res.status(400).json({
          status: false,
          message: "lId is required for curriculum lesson completion",
        });
      }

      // find target lesson
      const index = booking.lessonPosition.findIndex(
        (ls) => ls.lId.toString() === lId.toString()
      );

      if (index === -1) {
        return res.status(404).json({
          status: false,
          message: "Lesson not found in this booking",
        });
      }

      // Update that specific lesson
      booking.lessonPosition[index].status = "completed";

      await booking.save();

      // update classes attended/hosted
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

      return res.json({
        status: true,
        message: "Curriculum lesson completed successfully",
        booking,
      });
    }

    // Invalid type
    return res.status(400).json({ status: false, message: "Invalid type." });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const upcomingBookingsByUserId = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { id } = req.params;
    if (!id) {
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
      user: id,
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

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
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


