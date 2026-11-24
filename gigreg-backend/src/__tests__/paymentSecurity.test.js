import test from "node:test";
import assert from "node:assert/strict";

import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  securityHeaders,
  createRateLimiter,
  mongoSanitizeMiddleware,
} from "../middleware/securityMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { escapeHtml, escapeRegex, sanitizeRichHtml } from "../utils/sanitize.js";
import { isOriginAllowed } from "../config/corsConfig.js";
import { validateEnv } from "../config/env.js";
import { globalErrorHandler } from "../app.js";
import listingRoutes from "../routes/listingRoutes.js";
import dashboardRoutes from "../routes/dashboardRoutes.js";
import withdrawalRoutes from "../routes/withdrawalRoutes.js";
import stripeConnectRoutes from "../routes/stripeConnectRoutes.js";
import availabilityRoutes from "../routes/availabilityRoutes.js";
import categoryRoutes from "../routes/categoryRoutes.js";
import reviewRoutes from "../routes/reviewRoutes.js";
import homeSliderRoutes from "../routes/homeSliderRoutes.js";
import bookingRoutes from "../routes/bookingRoutes.js";
import favoriteRoutes from "../routes/favoriteRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import Booking from "../models/Booking.js";
import Availability from "../models/availabilityModel.js";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import LessonCalender from "../models/LessonCalender.js";
import LockTime from "../models/lockTimeModel.js";
import Propose from "../models/Propose.js";
import User from "../models/User.js";
import {
  createListing,
  getListingById,
  hasAnyCalendarTimeSlot,
  ensureCalendarHasTimeSlots,
} from "../controllers/listingController.js";
import Listing from "../models/Listing.js";
import Favorite from "../models/Favorite.js";
import { getTeacherFavoritesByID } from "../controllers/favoriteController.js";
import { createWithdrawal } from "../controllers/withdrawalController.js";
import {
  sendMessage,
  getMessages,
  updateQuoteMessage,
  connectUser,
} from "../controllers/chatController.js";
import { updateCalender } from "../controllers/lessonCalenderController.js";
import { isSlotAvailable } from "../controllers/lockTimeController.js";
import {
  createPropose,
  getProposeById,
  deletePropose,
  updateProposeStatus,
} from "../controllers/proposeController.js";
import {
  getUserById,
  PUBLIC_USER_PROFILE_FIELDS,
  registerUser,
  loginUser,
  logoutUser,
  updateProfile,
  isAllowedGoogleAudience,
} from "../controllers/userController.js";
import { buildAuthCookieOptions } from "../utils/utils.js";
import { addTeacherRating } from "../controllers/ratingController.js";
import { extractSocketToken } from "../socket/socketHandler.js";
import {
  initiateBooking,
  confirmBooking,
  cancelBooking,
  completeLessonByTeacher,
  deliverListingOrder,
  confirmListingDelivery,
  requestListingRevision,
  autoCompleteExpiredDeliveredOrders,
  verifyStripeSessionMatchesBooking,
} from "../controllers/bookingController.js";
import {
  computeSafeTransferMinor,
  buildClaimablePayoutQuery,
  STALE_PROCESSING_MS,
  isMissingStripeAccountError,
  handleConnectAccountUpdate,
  handleConnectAccountDeauthorized,
  evaluateDisconnectEligibility,
} from "../controllers/stripeConnectController.js";
import {
  roundMoney,
  requirePositivePrice,
  toSmallestUnit,
  requireMinimumStripeCharge,
  getExchangeRate,
  clearExchangeRateMemoryCache,
} from "../services/currencyService.js";
import ExchangeRate from "../models/ExchangeRate.js";
import Review from "../models/Review.js";
import Withdrawal from "../models/Withdrawal.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    removedHeaders: [],
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    removeHeader(name) {
      this.removedHeaders.push(name.toLowerCase());
      delete this.headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteMiddlewares(router, method, path) {
  const layer = router.stack.find(
    (item) => item.route && item.route.path === path && item.route.methods[method]
  );
  assert.ok(layer, `Expected route ${method.toUpperCase()} ${path} to exist`);
  return layer.route.stack.map((entry) => entry.handle);
}

test("adminOnly rejects unauthenticated and non-admin users, allows admin", () => {
  const resNoUser = createMockRes();
  let nextCalled = false;
  adminOnly({}, resNoUser, () => {
    nextCalled = true;
  });
  assert.equal(resNoUser.statusCode, 403);
  assert.equal(nextCalled, false);

  const resSeller = createMockRes();
  adminOnly({ user: { _id: "u1", role: "teacher" } }, resSeller, () => {
    nextCalled = true;
  });
  assert.equal(resSeller.statusCode, 403);
  assert.equal(nextCalled, false);

  const resAdmin = createMockRes();
  adminOnly({ user: { _id: "a1", role: "admin" } }, resAdmin, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test("dashboardRoutes locks down all admin endpoints with protect + adminOnly", () => {
  const loginHandlers = getRouteMiddlewares(dashboardRoutes, "post", "/admin-login");
  assert.equal(loginHandlers.includes(protect), false);

  const protectedAdminRoutes = [
    ["get", "/user-login/:id"],
    ["get", "/all-user"],
    ["post", "/update-user/:id"],
    ["delete", "/delete-user/:id"],
    ["patch", "/change-role/:id"],
    ["get", "/all-data"],
    ["get", "/settings"],
    ["put", "/settings"],
  ];

  for (const [method, path] of protectedAdminRoutes) {
    const handlers = getRouteMiddlewares(dashboardRoutes, method, path);
    assert.ok(handlers.includes(protect), `${method.toUpperCase()} ${path} missing protect`);
    assert.ok(handlers.includes(adminOnly), `${method.toUpperCase()} ${path} missing adminOnly`);
  }
});

test("withdrawalRoutes protects user endpoints and restricts admin endpoints", () => {
  assert.ok(getRouteMiddlewares(withdrawalRoutes, "post", "/add-withdrawal").includes(protect));
  assert.ok(getRouteMiddlewares(withdrawalRoutes, "get", "/user-withdrawal").includes(protect));

  for (const [method, path] of [
    ["post", "/approved-withdrawal/:id"],
    ["get", "/all-withdrawal"],
  ]) {
    const handlers = getRouteMiddlewares(withdrawalRoutes, method, path);
    assert.ok(handlers.includes(protect), `${method.toUpperCase()} ${path} missing protect`);
    assert.ok(handlers.includes(adminOnly), `${method.toUpperCase()} ${path} missing adminOnly`);
  }
});

test("stripeConnectRoutes removes raw-PII custom account endpoints", () => {
  const paths = stripeConnectRoutes.stack.filter((l) => l.route).map((l) => l.route.path);
  assert.equal(paths.includes("/custom-account"), false);
  assert.equal(paths.includes("/custom-bank-account"), false);
  assert.ok(paths.includes("/account-session"));
  assert.ok(paths.includes("/balance"));
  assert.ok(getRouteMiddlewares(stripeConnectRoutes, "post", "/disconnect").includes(protect));
});

test("evaluateDisconnectEligibility enforces zero balance, no transit payouts, and cleared escrow", async () => {
  const { evaluateDisconnectEligibility } = await import("../controllers/stripeConnectController.js");

  const clear = evaluateDisconnectEligibility({
    balance: { available: [{ amount: 0 }], pending: [{ amount: 0 }], connect_reserved: [] },
    payouts: [{ status: "paid" }],
    paidBookings: [{ payoutStatus: "transferred" }],
  });
  assert.equal(clear.canDisconnect, true);
  assert.deepEqual(clear.reasons, []);

  const blocked = evaluateDisconnectEligibility({
    balance: { available: [{ amount: 1500 }], pending: [{ amount: 0 }], connect_reserved: [] },
    payouts: [{ status: "in_transit" }],
    paidBookings: [{ payoutStatus: "pending_completion" }],
  });
  assert.equal(blocked.canDisconnect, false);
  assert.equal(blocked.reasons.length, 3);
});

test("createWithdrawal is deprecated with HTTP 410", async () => {
  const res = createMockRes();
  await createWithdrawal({ user: { _id: "u1" }, body: { amount: -100 } }, res);
  assert.equal(res.statusCode, 410);
  assert.equal(res.body?.status, false);
});

test("availabilityRoutes protects PUT /update-calender/:id and enforces ownership", async () => {
  const handlers = getRouteMiddlewares(availabilityRoutes, "put", "/update-calender/:id");
  assert.ok(handlers.includes(protect), "PUT /update-calender/:id missing protect");

  const origFindById = LessonCalender.findById;
  try {
    LessonCalender.findById = async () => ({ _id: "cal1", user: "owner-123" });
    const res = createMockRes();
    await updateCalender(
      {
        params: { id: "cal1" },
        user: { _id: "attacker-999", role: "teacher" },
        body: { weeklyHours: [], dateSpecificHours: [], timeZone: "UTC" },
      },
      res
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.status, false);
  } finally {
    LessonCalender.findById = origFindById;
  }
});

test("chatController blocks buyer from forging a custom quote (HTTP 403)", async () => {
  const origFindById = ChatRoom.findById;
  try {
    ChatRoom.findById = async () => ({
      _id: "room1",
      student: "buyer-1",
      teacher: "seller-2",
    });

    const res = createMockRes();
    await sendMessage(
      {
        user: { _id: "buyer-1", name: "Buyer" },
        body: {
          roomId: "room1",
          type: "quote",
          quote: { listingId: "listing1", price: 1, currency: "USD" },
        },
      },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.match(String(res.body?.error || ""), /Only the seller can send a quote/i);
  } finally {
    ChatRoom.findById = origFindById;
  }
});

test("Booking refundStatus enum includes partial and disputed states", () => {
  const enumValues = Booking.schema.path("refundStatus").enumValues;
  assert.ok(enumValues.includes("partial"));
  assert.ok(enumValues.includes("disputed"));
  assert.ok(enumValues.includes("refunded"));
});

test("securityHeaders sets defensive headers and strips X-Powered-By", () => {
  const res = createMockRes();
  let nextCalled = false;
  securityHeaders({}, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.ok(res.removedHeaders.includes("x-powered-by"));
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["referrer-policy"], "strict-origin-when-cross-origin");
});

test("createRateLimiter blocks excess requests with HTTP 429", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyPrefix: "test-rl" });
  const req = { ip: "127.0.0.1" };

  let passed = 0;
  for (let i = 0; i < 2; i += 1) {
    const res = createMockRes();
    limiter(req, res, () => {
      passed += 1;
    });
    assert.equal(res.statusCode, 200);
  }
  assert.equal(passed, 2);

  const blockedRes = createMockRes();
  limiter(req, blockedRes, () => {
    passed += 1;
  });
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(passed, 2);
  assert.ok(Number(blockedRes.headers["retry-after"]) >= 1);
  limiter.reset();
});

test("computeSafeTransferMinor blocks disputes/full refunds and prorates partial refunds", () => {
  const normal = computeSafeTransferMinor({
    charge: { id: "ch_1", amount: 10000, amount_refunded: 0, refunded: false, disputed: false },
    balanceTransaction: { amount: 10000, currency: "eur" },
    commissionRate: 0.05,
    payoutAmount: 95,
    earningCurrency: "EUR",
  });
  assert.equal(normal.blocked, false);
  assert.equal(normal.transferCurrency, "eur");
  assert.equal(normal.transferAmountMinor, 9500);

  // €100 charge with €40 partial refund => €60 remaining * 95% = €57.00 (5700 minor units)
  const partial = computeSafeTransferMinor({
    charge: { id: "ch_2", amount: 10000, amount_refunded: 4000, refunded: false, disputed: false },
    balanceTransaction: { amount: 10000, currency: "eur" },
    commissionRate: 0.05,
    payoutAmount: 95,
    earningCurrency: "EUR",
  });
  assert.equal(partial.blocked, false);
  assert.equal(partial.transferAmountMinor, 5700);

  const disputed = computeSafeTransferMinor({
    charge: { id: "ch_3", amount: 10000, amount_refunded: 0, refunded: false, disputed: true },
    balanceTransaction: { amount: 10000, currency: "eur" },
    commissionRate: 0.05,
  });
  assert.equal(disputed.blocked, true);
  assert.equal(disputed.reason, "disputed");

  const fullRefund = computeSafeTransferMinor({
    charge: { id: "ch_4", amount: 10000, amount_refunded: 10000, refunded: true, disputed: false },
    balanceTransaction: { amount: 10000, currency: "eur" },
    commissionRate: 0.05,
  });
  assert.equal(fullRefund.blocked, true);
  assert.equal(fullRefund.reason, "refunded");
});

test("verifyStripeSessionMatchesBooking rejects amount, currency, and bookingId tampering", () => {
  const booking = {
    _id: "b123",
    amount: 100,
    currency: "eur",
    chargedAmount: 100,
    chargedCurrency: "EUR",
  };

  assert.equal(
    verifyStripeSessionMatchesBooking({
      booking,
      session: { amount_total: 10000, currency: "eur", metadata: { bookingId: "b123" } },
    }).ok,
    true
  );

  assert.equal(
    verifyStripeSessionMatchesBooking({
      booking,
      session: { amount_total: 100, currency: "eur", metadata: { bookingId: "b123" } },
    }).ok,
    false
  );

  assert.equal(
    verifyStripeSessionMatchesBooking({
      booking,
      session: { amount_total: 10000, currency: "usd", metadata: { bookingId: "b123" } },
    }).ok,
    false
  );

  assert.equal(
    verifyStripeSessionMatchesBooking({
      booking,
      session: { amount_total: 10000, currency: "eur", metadata: { bookingId: "other-booking" } },
    }).ok,
    false
  );
});

test("currencyService enforces HUF whole-unit subunits, max price caps, and Stripe minimum charges", () => {
  assert.equal(roundMoney(1250.45, "HUF"), 1250);
  assert.equal(toSmallestUnit(1250.45, "HUF"), 125000);
  assert.equal(toSmallestUnit(1250.45, "HUF") % 100, 0);
  assert.equal(toSmallestUnit(1500, "JPY"), 1500);

  assert.throws(() => requirePositivePrice(0, "USD"), /greater than zero/i);
  assert.throws(() => requirePositivePrice(-5, "USD"), /non-negative/i);
  assert.throws(() => requirePositivePrice(1e12, "USD"), /maximum allowed limit/i);

  assert.throws(() => requireMinimumStripeCharge(10, "USD"), /Minimum checkout amount/i);
  assert.equal(requireMinimumStripeCharge(50, "USD"), 50);
  assert.equal(requireMinimumStripeCharge(50, "JPY"), 50);
});

test("bookingController rejects invalid booking types, malformed meta, and cancel/complete type confusion", async () => {
  const resInvalidType = createMockRes();
  await initiateBooking(
    {
      user: { _id: "u1" },
      body: { id: "item1", firstname: "A", lastname: "B", type: "hacked" },
    },
    resInvalidType
  );
  assert.equal(resInvalidType.statusCode, 400);

  const resBadMeta = createMockRes();
  await initiateBooking(
    {
      user: { _id: "u1" },
      body: { id: "item1", firstname: "A", lastname: "B", type: "listing", meta: "{broken-json" },
    },
    resBadMeta
  );
  assert.equal(resBadMeta.statusCode, 400);

  const origFindById = Booking.findById;
  try {
    Booking.findById = () => ({
      populate() {
        return this;
      },
      then(resolve) {
        return resolve({
          _id: "b1",
          type: "listing",
          user: "buyer1",
          teacher: "seller1",
          status: "paid",
          paymentStatus: "paid",
        });
      },
    });

    const resCancelConfusion = createMockRes();
    await cancelBooking(
      {
        params: { bookingId: "b1" },
        user: { _id: "buyer1", role: "user" },
        body: { type: "curriculum" },
      },
      resCancelConfusion
    );
    assert.equal(resCancelConfusion.statusCode, 400);
    assert.match(String(resCancelConfusion.body?.message || ""), /type mismatch/i);

    const resCompleteConfusion = createMockRes();
    await completeLessonByTeacher(
      {
        params: { bookingId: "b1" },
        user: { _id: "seller1", role: "teacher" },
        body: { type: "curriculum" },
      },
      resCompleteConfusion
    );
    assert.equal(resCompleteConfusion.statusCode, 400);
    assert.match(String(resCompleteConfusion.body?.message || ""), /type mismatch/i);
  } finally {
    Booking.findById = origFindById;
  }
});

test("buildClaimablePayoutQuery recovers stale processing payouts and blocks refunded/disputed", () => {
  const now = new Date("2026-11-24T12:10:00.000Z");
  const query = buildClaimablePayoutQuery("teacher-1", now);

  assert.equal(query.teacher, "teacher-1");
  assert.deepEqual(query.refundStatus, { $nin: ["refunded", "disputed"] });
  assert.equal(query.$or[0].payoutStatus, "pending_connect");
  assert.equal(query.$or[1].payoutStatus, "processing");
  assert.equal(
    query.$or[1].$or[0].processingStartedAt.$lte.getTime(),
    now.getTime() - STALE_PROCESSING_MS
  );
  assert.ok(Booking.schema.path("processingStartedAt"));
});

test("isSlotAvailable detects overlaps cleanly across non-UTC timezones", async () => {
  const origFindOne = LockTime.findOne;
  try {
    LockTime.findOne = () => ({
      lean: async () => ({
        user: "teacher-1",
        dateSpecificHours: [
          {
            date: "2026-12-01",
            available: true,
            slots: [{ start: "10:00", end: "11:00", group: false, usecapacity: 1 }],
          },
        ],
      }),
    });

    // 10:00 AM Asia/Karachi (UTC+5) = 05:00 UTC -> overlaps 10:00-11:00 Asia/Karachi
    const conflict = await isSlotAvailable({
      teacher: "teacher-1",
      scheduledAtUTC: new Date("2026-12-01T05:00:00.000Z"),
      timezone: "Asia/Karachi",
      duration: "60m",
    });
    assert.equal(conflict.available, false);

    // 11:00 AM Asia/Karachi (UTC+5) = 06:00 UTC -> adjacent non-overlapping slot is available
    const free = await isSlotAvailable({
      teacher: "teacher-1",
      scheduledAtUTC: new Date("2026-12-01T06:00:00.000Z"),
      timezone: "Asia/Karachi",
      duration: "60m",
    });
    assert.equal(free.available, true);
  } finally {
    LockTime.findOne = origFindOne;
  }
});

test("confirmBooking returns HTTP 409 when a paid booking was auto-refunded due to slot conflict", async () => {
  const origFindById = Booking.findById;
  try {
    Booking.findById = () => ({
      select: async () => ({
        _id: "b-conflict",
        user: "buyer-1",
        teacher: "seller-1",
        paymentStatus: "paid",
        status: "cancelled",
        refundStatus: "refunded",
        transferError: "Auto-refunded due to simultaneous slot booking",
      }),
    });

    const res = createMockRes();
    await confirmBooking(
      {
        user: { _id: "buyer-1" },
        body: { bookingId: "b-conflict", type: "succeeded" },
      },
      res
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body?.status, false);
    assert.equal(res.body?.refunded, true);
  } finally {
    Booking.findById = origFindById;
  }
});

test("extractSocketToken parses JWT from auth, Bearer header, and cookie", () => {
  assert.equal(extractSocketToken({ auth: { token: "jwt-auth" } }), "jwt-auth");
  assert.equal(
    extractSocketToken({ headers: { authorization: "Bearer jwt-header" } }),
    "jwt-header"
  );
  assert.equal(
    extractSocketToken({ headers: { cookie: "other=1; token=jwt-cookie; foo=bar" } }),
    "jwt-cookie"
  );
  assert.equal(extractSocketToken({ headers: {} }), null);
});

test("chatController getMessages blocks non-participants (HTTP 403 IDOR)", async () => {
  const origFindById = ChatRoom.findById;
  try {
    ChatRoom.findById = () => ({
      select: () => ({
        lean: async () => ({ _id: "room-9", student: "buyer-1", teacher: "seller-2" }),
      }),
    });

    const res = createMockRes();
    await getMessages(
      {
        params: { roomId: "room-9" },
        query: {},
        user: { _id: "stranger-999", role: "user" },
      },
      res
    );

    assert.equal(res.statusCode, 403);
  } finally {
    ChatRoom.findById = origFindById;
  }
});

test("categoryRoutes, reviewRoutes, and homeSliderRoutes enforce protect + adminOnly", () => {
  for (const [router, method, path] of [
    [categoryRoutes, "post", "/create"],
    [categoryRoutes, "put", "/update-category/:id"],
    [categoryRoutes, "delete", "/delete-category/:id"],
    [reviewRoutes, "get", "/all"],
    [reviewRoutes, "patch", "/update-review/:id"],
    [homeSliderRoutes, "get", "/"],
    [homeSliderRoutes, "post", "/"],
    [homeSliderRoutes, "put", "/:id"],
    [homeSliderRoutes, "delete", "/:id"],
  ]) {
    const handlers = getRouteMiddlewares(router, method, path);
    assert.ok(handlers.includes(protect), `${method.toUpperCase()} ${path} missing protect`);
    assert.ok(handlers.includes(adminOnly), `${method.toUpperCase()} ${path} missing adminOnly`);
  }

  assert.ok(getRouteMiddlewares(bookingRoutes, "get", "/upcoming-lesson-by-user/:id").includes(protect));
  assert.ok(getRouteMiddlewares(favoriteRoutes, "get", "/favorites-by-user/:id").includes(protect));
  assert.ok(getRouteMiddlewares(favoriteRoutes, "get", "/favorites-by-teacher/:id").includes(protect));
});

test("proposeController blocks non-owners from deleting or changing proposal status (HTTP 403)", async () => {
  const origFindById = Propose.findById;
  try {
    Propose.findById = async () => ({ _id: "p1", user: "owner-1", images: [] });

    const resDel = createMockRes();
    await deletePropose(
      { params: { id: "p1" }, user: { _id: "attacker-2", role: "user" } },
      resDel
    );
    assert.equal(resDel.statusCode, 403);

    const resStatus = createMockRes();
    await updateProposeStatus(
      {
        params: { id: "p1" },
        user: { _id: "attacker-2", role: "user" },
        body: { status: "Inactive" },
      },
      resStatus
    );
    assert.equal(resStatus.statusCode, 403);
  } finally {
    Propose.findById = origFindById;
  }
});

test("proposeController supports partial Drafts, hides Drafts on public lookup, and blocks incomplete publish", async () => {
  const origCreate = Propose.create;
  const origFindById = Propose.findById;
  try {
    let capturedDoc = null;
    Propose.create = async (doc) => {
      capturedDoc = doc;
      return { _id: "draft-1", ...doc };
    };

    const resDraftOk = createMockRes();
    await createPropose(
      {
        user: { _id: "buyer-1", role: "user" },
        files: [],
        body: { title: "Logo idea", status: "Draft", pricingType: "fixed" },
      },
      resDraftOk
    );
    assert.equal(resDraftOk.statusCode, 201);
    assert.equal(capturedDoc.status, "Draft");
    assert.equal(capturedDoc.title, "Logo idea");

    const resDraftEmpty = createMockRes();
    await createPropose(
      {
        user: { _id: "buyer-1", role: "user" },
        files: [],
        body: { status: "Draft", title: "   ", description: "", category: "" },
      },
      resDraftEmpty
    );
    assert.equal(resDraftEmpty.statusCode, 400);

    const resActiveIncomplete = createMockRes();
    await createPropose(
      {
        user: { _id: "buyer-1", role: "user" },
        files: [],
        body: { title: "Only title", status: "Active" },
      },
      resActiveIncomplete
    );
    assert.equal(resActiveIncomplete.statusCode, 400);

    Propose.findById = () => ({
      populate: async () => ({ _id: "draft-1", status: "Draft", title: "Private draft" }),
    });
    const resPublicDraft = createMockRes();
    await getProposeById({ params: { id: "draft-1" } }, resPublicDraft);
    assert.equal(resPublicDraft.statusCode, 404);

    Propose.findById = async () => ({
      _id: "draft-1",
      user: "buyer-1",
      status: "Draft",
      title: "Logo idea",
      description: "",
      category: "",
      price: undefined,
      supportsInPerson: false,
      location: "",
    });
    const resPublishIncomplete = createMockRes();
    await updateProposeStatus(
      {
        params: { id: "draft-1" },
        user: { _id: "buyer-1", role: "user" },
        body: { status: "Active" },
      },
      resPublishIncomplete
    );
    assert.equal(resPublishIncomplete.statusCode, 400);
  } finally {
    Propose.create = origCreate;
    Propose.findById = origFindById;
  }
});

test("userController getUserById restricts non-owner queries to safe public fields only", async () => {
  let capturedSelect = null;
  const origFindById = User.findById;
  try {
    User.findById = () => ({
      select: async (fields) => {
        capturedSelect = fields;
        return { _id: "victim-1", name: "Alice" };
      },
    });

    const res = createMockRes();
    await getUserById(
      { params: { id: "victim-1" }, user: { _id: "viewer-2", role: "user" } },
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(capturedSelect, PUBLIC_USER_PROFILE_FIELDS);
    assert.equal(capturedSelect.includes("email"), false);
    assert.equal(capturedSelect.includes("balances"), false);
    assert.equal(capturedSelect.includes("stripeConnect"), false);
    assert.equal(capturedSelect.includes("fcmTokens"), false);
  } finally {
    User.findById = origFindById;
  }
});

test("ratingController blocks self-rating (400) and unverified buyers without paid booking (403)", async () => {
  const resSelf = createMockRes();
  await addTeacherRating(
    { user: { _id: "seller-1" }, body: { teacherId: "seller-1", rating: 100 } },
    resSelf
  );
  assert.equal(resSelf.statusCode, 400);

  const origExists = Booking.exists;
  try {
    Booking.exists = async () => null;
    const resUnverified = createMockRes();
    await addTeacherRating(
      { user: { _id: "buyer-9" }, body: { teacherId: "seller-1", rating: 10 } },
      resUnverified
    );
    assert.equal(resUnverified.statusCode, 403);
  } finally {
    Booking.exists = origExists;
  }
});

test("evaluateDisconnectEligibility blocks active disputes and pending refunds", () => {
  const disputed = evaluateDisconnectEligibility({
    balance: { available: [{ amount: 0 }], pending: [{ amount: 0 }], connect_reserved: [] },
    payouts: [],
    paidBookings: [{ payoutStatus: "cancelled", refundStatus: "disputed" }],
  });
  assert.equal(disputed.canDisconnect, false);
  assert.match(disputed.reasons[0], /dispute or refund/i);
});

test("isMissingStripeAccountError detects revoked/deleted accounts without false positives", () => {
  assert.equal(isMissingStripeAccountError({ code: "resource_missing" }), true);
  assert.equal(isMissingStripeAccountError({ code: "account_invalid" }), true);
  assert.equal(isMissingStripeAccountError({ statusCode: 404 }), true);
  assert.equal(
    isMissingStripeAccountError({ statusCode: 403, message: "No such account: acct_123" }),
    true
  );
  assert.equal(isMissingStripeAccountError({ statusCode: 500, message: "Stripe timeout" }), false);
});

test("handleConnectAccountUpdate ignores delayed webhooks from old/replaced accounts", async () => {
  const origFindById = User.findById;
  let saveCalled = false;
  try {
    User.findById = async () => ({
      _id: "u-1",
      stripeConnectAccountId: "acct_NEW_123",
      save: async () => {
        saveCalled = true;
      },
    });
    await handleConnectAccountUpdate({
      id: "acct_OLD_999",
      metadata: { userId: "u-1" },
    });
    assert.equal(saveCalled, false);
  } finally {
    User.findById = origFindById;
  }
});

test("registerUser blocks admin self-registration and weak passwords", async () => {
  const resWeak = createMockRes();
  await registerUser(
    { body: { name: "Bob", email: "bob@example.com", password: "123", role: "admin" } },
    resWeak
  );
  assert.equal(resWeak.statusCode, 400);

  let createdPayload = null;
  const origFindOne = User.findOne;
  const origCreate = User.create;
  try {
    User.findOne = async () => null;
    User.create = async (payload) => {
      createdPayload = payload;
      return payload;
    };

    const resAdminAttempt = createMockRes();
    await registerUser(
      {
        body: {
          name: "Attacker",
          email: "Attacker@Example.COM ",
          password: "StrongPassword123",
          role: "admin",
        },
      },
      resAdminAttempt
    );

    assert.equal(resAdminAttempt.statusCode, 201);
    assert.equal(createdPayload.role, "user");
    assert.equal(createdPayload.email, "attacker@example.com");
  } finally {
    User.findOne = origFindOne;
    User.create = origCreate;
  }
});

test("loginUser and User.matchPassword block empty-password Google account takeover", async () => {
  const resEmpty = createMockRes();
  await loginUser({ body: { email: "googleuser@gmail.com", password: "" } }, resEmpty);
  assert.equal(resEmpty.statusCode, 401);

  const googleUser = new User({ email: "g@example.com", password: "" });
  assert.equal(await googleUser.matchPassword(""), false);
  assert.equal(await googleUser.matchPassword("anything"), false);
});

test("isAllowedGoogleAudience, buildAuthCookieOptions, and remove-push-token route are hardened", () => {
  assert.equal(
    isAllowedGoogleAudience("192141687455-hg0udlcpo4s0akkhrnobhkmut80pg6lk.apps.googleusercontent.com"),
    true
  );
  assert.equal(
    isAllowedGoogleAudience("999999999999-evilapp.apps.googleusercontent.com"),
    false
  );
  assert.equal(isAllowedGoogleAudience(""), false);

  const localOpts = buildAuthCookieOptions({ headers: { host: "localhost:5001" } });
  assert.equal(localOpts.httpOnly, true);
  assert.equal(localOpts.secure, false);
  assert.equal(localOpts.sameSite, "lax");

  const clearOpts = buildAuthCookieOptions({ headers: { host: "localhost:5001" } }, { clear: true });
  assert.equal(clearOpts.maxAge, 0);
  assert.equal(clearOpts.sameSite, localOpts.sameSite);
  assert.equal(clearOpts.secure, localOpts.secure);

  assert.ok(getRouteMiddlewares(userRoutes, "post", "/remove-push-token").includes(protect));
});

test("sanitizeRichHtml, escapeHtml, and escapeRegex neutralize XSS, phishing HTML, and ReDoS", () => {
  const dirty =
    '<p>Hello <b>World</b></p><script>alert(1)</script><img src=x onerror="fetch(1)"><a href="javascript:alert(2)">click</a><iframe src="https://evil.com"></iframe>';
  const clean = sanitizeRichHtml(dirty);
  assert.ok(clean.includes("<p>Hello <b>World</b></p>"));
  assert.equal(/<script/i.test(clean), false);
  assert.equal(/onerror=/i.test(clean), false);
  assert.equal(/javascript:/i.test(clean), false);
  assert.equal(/<iframe/i.test(clean), false);

  const escaped = escapeHtml('<a href="https://evil.com">Claim</a>');
  assert.equal(escaped.includes("<a"), false);
  assert.ok(escaped.includes("&lt;a"));

  const escapedRe = escapeRegex("((((a+)+)+))$");
  assert.doesNotThrow(() => new RegExp(escapedRe, "i"));
  assert.equal(escapeRegex("a".repeat(500)).length, 120);
});

test("mongoSanitizeMiddleware strips $ operators, dotted keys, and prototype pollution keys", () => {
  const req = {
    body: {
      email: { $ne: null },
      "nested.key": "bad",
      safe: "ok",
    },
    query: {
      pricingType: { $gt: "" },
      search: "piano",
    },
  };
  let nextCalled = false;
  mongoSanitizeMiddleware(req, {}, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.body.email, {});
  assert.equal("nested.key" in req.body, false);
  assert.equal(req.body.safe, "ok");
  assert.deepEqual(req.query.pricingType, {});
  assert.equal(req.query.search, "piano");
});

test("listingRoutes locks GET / with protect + adminOnly, upload limits files/MIME, and CORS blocks localhost in prod", () => {
  const handlers = getRouteMiddlewares(listingRoutes, "get", "/");
  assert.ok(handlers.includes(protect));
  assert.ok(handlers.includes(adminOnly));

  assert.equal(upload.limits.files, 12);

  let fakeMimeAccepted = null;
  upload.fileFilter({}, { originalname: "payload.jpg", mimetype: "text/html" }, (err, accepted) => {
    fakeMimeAccepted = !err && accepted;
  });
  assert.equal(fakeMimeAccepted, false);

  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.equal(isOriginAllowed("http://localhost:5173"), false);
    assert.equal(isOriginAllowed("https://gigreg-frontend.onrender.com"), true);
    process.env.NODE_ENV = "development";
    assert.equal(isOriginAllowed("http://localhost:5173"), true);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("validateEnv enforces required secrets in production and flags test-key / localhost / short-secret drift", () => {
  const prodMissingRequired = validateEnv({
    NODE_ENV: "production",
  });
  assert.equal(prodMissingRequired.ok, false);
  assert.ok(prodMissingRequired.errors.some((e) => e.includes("MONGO_URI")));
  assert.ok(prodMissingRequired.errors.some((e) => e.includes("JWT_SECRET")));
  assert.ok(prodMissingRequired.errors.some((e) => e.includes("STRIPE_SECRET_KEY")));

  const prodWarnings = validateEnv({
    NODE_ENV: "production",
    MONGO_URI: "mongodb+srv://example/db",
    JWT_SECRET: "short-secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    FRONTEND_URL: "http://localhost:5174",
  });
  assert.equal(prodWarnings.ok, true);
  assert.ok(prodWarnings.warnings.some((w) => w.includes("JWT_SECRET")));
  assert.ok(prodWarnings.warnings.some((w) => w.includes("STRIPE_WEBHOOK_SECRET")));
  assert.ok(prodWarnings.warnings.some((w) => w.includes("TEST key")));
  assert.ok(prodWarnings.warnings.some((w) => w.includes("FRONTEND_URL")));

  const prodValid = validateEnv({
    NODE_ENV: "production",
    MONGO_URI: "mongodb+srv://example/db",
    JWT_SECRET: "a".repeat(64),
    STRIPE_SECRET_KEY: "sk_live_123",
    STRIPE_WEBHOOK_SECRET: "whsec_live_123",
    FRONTEND_URL: "https://gigmake.com",
    GOOGLE_CLIENT_IDS: "192141687455-test.apps.googleusercontent.com",
  });
  assert.equal(prodValid.ok, true);
  assert.equal(prodValid.errors.length, 0);
  assert.equal(prodValid.warnings.length, 0);
});

test("globalErrorHandler hides 5xx details in production, maps MulterError to 400, and CORS allows gigmake.com", () => {
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    const res500 = createMockRes();
    globalErrorHandler(new Error("MongoServerError: internal stack detail"), {}, res500, () => {});
    assert.equal(res500.statusCode, 500);
    assert.equal(res500.body.message, "Internal Server Error");

    const multerErr = new Error("File too large");
    multerErr.name = "MulterError";
    const resMulter = createMockRes();
    globalErrorHandler(multerErr, {}, resMulter, () => {});
    assert.equal(resMulter.statusCode, 400);

    assert.equal(isOriginAllowed("https://gigmake.com"), true);
    assert.equal(isOriginAllowed("https://www.gigmake.com"), true);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test("handleConnectAccountDeauthorized ignores non-acct IDs and clears matching connected seller", async () => {
  const origFindOne = User.findOne;
  const origFindByIdAndUpdate = User.findByIdAndUpdate;
  let updatedPayload = null;
  let queriedAccount = null;
  try {
    User.findOne = async (q) => {
      queriedAccount = q.stripeConnectAccountId;
      return {
        _id: "seller_revoked_1",
        stripeConnectAccountId: "acct_revoked_1",
        stripeConnect: { country: "FR", chargesEnabled: true, payoutsEnabled: true },
      };
    };
    User.findByIdAndUpdate = async (id, update) => {
      updatedPayload = { id, update };
      return null;
    };

    await handleConnectAccountDeauthorized("ca_not_an_account");
    assert.equal(queriedAccount, null);
    assert.equal(updatedPayload, null);

    await handleConnectAccountDeauthorized("acct_revoked_1");
    assert.equal(queriedAccount, "acct_revoked_1");
    assert.equal(updatedPayload.id, "seller_revoked_1");
    assert.equal(updatedPayload.update.$set.stripeConnectAccountId, null);
    assert.equal(updatedPayload.update.$set.stripeConnect.lastDisconnectedAccountId, "acct_revoked_1");
  } finally {
    User.findOne = origFindOne;
    User.findByIdAndUpdate = origFindByIdAndUpdate;
  }
});

test("hourly_calendar listings require at least one available time slot (default, custom, or existing)", async () => {
  assert.equal(
    hasAnyCalendarTimeSlot(
      JSON.stringify([{ day: "Monday", available: true, slots: [] }]),
      JSON.stringify([])
    ),
    false
  );
  assert.equal(
    hasAnyCalendarTimeSlot(
      JSON.stringify([{ day: "Monday", available: false, slots: [{ start: "09:00", end: "10:00" }] }]),
      JSON.stringify([])
    ),
    false
  );
  assert.equal(
    hasAnyCalendarTimeSlot(
      JSON.stringify([{ day: "Monday", available: true, slots: [{ start: "09:00", end: "10:00" }] }]),
      JSON.stringify([])
    ),
    true
  );
  assert.equal(
    hasAnyCalendarTimeSlot(
      JSON.stringify([]),
      JSON.stringify([{ date: "2026-12-01", available: true, slots: [{ start: "14:00", end: "16:00" }] }])
    ),
    true
  );

  // Custom calendar with 0 slots is blocked
  const customEmpty = await ensureCalendarHasTimeSlots({
    userId: "seller1",
    calendarFlag: false,
    calenderId: null,
    weeklyHours: JSON.stringify([{ day: "Monday", available: true, slots: [] }]),
    dateSpecificHours: JSON.stringify([]),
  });
  assert.equal(customEmpty.ok, false);

  // Default calendar with 0 slots in DB is blocked
  const origAvailFindOne = Availability.findOne;
  try {
    Availability.findOne = () => ({ lean: async () => ({ weeklyHours: [], dateSpecificHours: [] }) });
    const defaultEmpty = await ensureCalendarHasTimeSlots({
      userId: "seller1",
      calendarFlag: true,
      calenderId: null,
    });
    assert.equal(defaultEmpty.ok, false);

    // End-to-end createListing check rejects hourly_calendar with empty custom calendar (HTTP 400)
    const res = createMockRes();
    await createListing(
      {
        user: { _id: "seller1", role: "teacher" },
        files: [
          { fieldname: "coverImage" },
          { fieldname: "images" },
          { fieldname: "images" },
        ],
        body: {
          title: "Guitar Coaching",
          category: "Music",
          description: "Detailed description of at least fifty characters for this gig.",
          duration: "1h",
          price: "50",
          inputCurrency: "USD",
          pricingType: "hourly_calendar",
          isOnline: "true",
          calender: "false",
          weeklyHours: JSON.stringify([{ day: "Monday", available: true, slots: [] }]),
          dateSpecificHours: JSON.stringify([]),
        },
      },
      res
    );
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body?.message || ""), /time slot/i);
  } finally {
    Availability.findOne = origAvailFindOne;
  }
});

test("initiateBooking disables legacy lesson and curriculum checkout with HTTP 410", async () => {
  for (const legacyType of ["lesson", "curriculum"]) {
    const res = createMockRes();
    await initiateBooking(
      {
        user: { _id: "buyer1", currency: "USD" },
        body: { id: "legacy1", firstname: "Test", lastname: "User", type: legacyType },
      },
      res
    );
    assert.equal(res.statusCode, 410);
    assert.match(String(res.body?.message || ""), /disabled|listing/i);
  }
});

test("all payment, dashboard, and maps modules import cleanly without reference errors", async () => {
  const mods = await Promise.all([
    import("../controllers/bookingController.js"),
    import("../controllers/stripeConnectController.js"),
    import("../controllers/stripeWebhookController.js"),
    import("../controllers/dashboardController.js"),
    import("../controllers/withdrawalController.js"),
    import("../controllers/chatController.js"),
    import("../controllers/lessonCalenderController.js"),
    import("../services/stripeFxService.js"),
    import("../routes/placesAutocompleteRoutes.js"),
    import("../utils/geocodeAddress.js"),
    import("../utils/getPlaceDetails.js"),
  ]);
  assert.equal(typeof mods[0].fulfillPaidBooking, "function");
  assert.equal(typeof mods[0].initiateBooking, "function");
  assert.equal(typeof mods[0].confirmBooking, "function");
  assert.equal(typeof mods[0].completeLessonByTeacher, "function");
  assert.equal(typeof mods[0].cancelBooking, "function");
  assert.equal(typeof mods[1].createConnectAccountSession, "function");
  assert.equal(typeof mods[1].processPendingTeacherPayouts, "function");
  assert.equal(typeof mods[2].stripeWebhook, "function");
  assert.equal(typeof mods[5].sendMessage, "function");
  assert.equal(typeof mods[6].updateCalender, "function");
  assert.equal(typeof mods[9].geocodeAddress, "function");
  assert.equal(typeof mods[10].getPlaceDetails, "function");
});

test("updateQuoteMessage cancels open quote, updates room lastMessage, and blocks teacher status override", async () => {
  const origMsgFindById = Message.findById;
  const origRoomFindById = ChatRoom.findById;
  try {
    let roomSaved = false;
    let msgSaved = false;
    let populatedArg = null;
    const mockMessage = {
      _id: "qmsg-1",
      roomId: "room-77",
      type: "quote",
      quote: { price: 150, currency: "USD", description: "Custom site", status: "open" },
      save: async () => {
        msgSaved = true;
      },
      populate: async (arg) => {
        populatedArg = arg;
        return mockMessage;
      },
    };
    const mockRoom = {
      _id: "room-77",
      student: "buyer-1",
      teacher: "seller-2",
      lastMessage: "Quote sent",
      updatedAt: null,
      save: async () => {
        roomSaved = true;
      },
    };

    Message.findById = async () => mockMessage;
    ChatRoom.findById = async () => mockRoom;

    const resSellerBlocked = createMockRes();
    await updateQuoteMessage(
      {
        params: { messageId: "qmsg-1" },
        body: { status: "cancelled" },
        user: { _id: "seller-2", name: "Seller" },
      },
      resSellerBlocked
    );
    assert.equal(resSellerBlocked.statusCode, 403);

    const resBuyerOk = createMockRes();
    await updateQuoteMessage(
      {
        params: { messageId: "qmsg-1" },
        body: { status: "cancelled" },
        user: { _id: "buyer-1", name: "Buyer" },
      },
      resBuyerOk
    );
    assert.equal(resBuyerOk.statusCode, 200);
    assert.equal(mockMessage.quote.status, "cancelled");
    assert.equal(mockRoom.lastMessage, "Offer declined");
    assert.ok(msgSaved);
    assert.ok(roomSaved);
    assert.ok(Array.isArray(populatedArg));
  } finally {
    Message.findById = origMsgFindById;
    ChatRoom.findById = origRoomFindById;
  }
});

test("connectUser queries ChatRoom sorted by updatedAt descending and batches unread counts via aggregate", async () => {
  const origUserFindById = User.findById;
  const origRoomFind = ChatRoom.find;
  const origAggregate = Message.aggregate;
  try {
    let sortArg = null;
    let aggregateCalls = 0;
    User.findById = () => ({
      select: () => ({ lean: async () => ({ _id: "user-1", role: "user" }) }),
    });
    Message.aggregate = async () => {
      aggregateCalls += 1;
      return [{ _id: "room-1", count: 2 }];
    };
    const mockRoomDoc = {
      _id: "room-1",
      student: "user-1",
      teacher: "seller-1",
      lastMessage: "Hi",
      updatedAt: new Date("2026-11-24T12:00:00Z"),
    };
    const chain = {
      sort(arg) {
        sortArg = arg;
        return chain;
      },
      populate() {
        return chain;
      },
      select() {
        return chain;
      },
      async lean() {
        return [mockRoomDoc];
      },
    };
    ChatRoom.find = () => chain;

    const res = createMockRes();
    await connectUser({ user: { id: "user-1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(sortArg, { updatedAt: -1 });
    assert.equal(aggregateCalls, 1);
    assert.equal(res.body?.connections?.length, 1);
    assert.equal(res.body?.connections?.[0]?.unreadCount, 2);
  } finally {
    User.findById = origUserFindById;
    ChatRoom.find = origRoomFind;
    Message.aggregate = origAggregate;
  }
});

test("currencyService caches fresh exchange rates in memory to avoid repeated MongoDB queries", async () => {
  const origFindOne = ExchangeRate.findOne;
  clearExchangeRateMemoryCache();
  try {
    let dbLookups = 0;
    ExchangeRate.findOne = () => {
      dbLookups += 1;
      return {
        lean: async () => ({
          pair: "USD_EUR",
          rate: 0.92,
          providerDate: "2026-11-24",
          retrievedAt: new Date(),
        }),
      };
    };

    const first = await getExchangeRate("USD", "EUR");
    const second = await getExchangeRate("USD", "EUR");
    assert.equal(first.rate, 0.92);
    assert.equal(second.rate, 0.92);
    assert.equal(dbLookups, 1);
  } finally {
    ExchangeRate.findOne = origFindOne;
    clearExchangeRateMemoryCache();
  }
});

test("Propose, ChatRoom, Message, Review, LessonCalender, and Withdrawal schemas declare performance indexes", () => {
  assert.ok(Propose.schema.indexes().length >= 3);
  assert.ok(ChatRoom.schema.indexes().length >= 3);
  assert.ok(Message.schema.indexes().length >= 2);
  assert.ok(Review.schema.indexes().length >= 2);
  assert.ok(LessonCalender.schema.indexes().length >= 1);
  assert.ok(Withdrawal.schema.indexes().length >= 2);
});

test("getListingById hides Draft/Inactive listings from public and non-owners, but allows owner/admin", async () => {
  const origFindById = Listing.findById;
  try {
    const draftListing = {
      _id: "listing-draft-1",
      title: "Secret Draft",
      slug: "secret-draft",
      status: "Draft",
      createdBy: { _id: "seller-owner-1", name: "Owner" },
    };
    Listing.findById = () => ({
      populate: async () => draftListing,
    });

    const resPublic = createMockRes();
    await getListingById({ params: { id: "listing-draft-1" }, user: null }, resPublic);
    assert.equal(resPublic.statusCode, 404);

    const resOther = createMockRes();
    await getListingById(
      { params: { id: "listing-draft-1" }, user: { _id: "other-user", role: "user" } },
      resOther
    );
    assert.equal(resOther.statusCode, 404);

    const resOwner = createMockRes();
    await getListingById(
      { params: { id: "listing-draft-1" }, user: { _id: "seller-owner-1", role: "teacher" } },
      resOwner
    );
    assert.equal(resOwner.statusCode, 200);
    assert.equal(resOwner.body?.listing?._id, "listing-draft-1");
  } finally {
    Listing.findById = origFindById;
  }
});

test("getTeacherFavoritesByID enforces ownership (403), validates ObjectId (400), and caps limit at 100", async () => {
  const origAggregate = Favorite.aggregate;
  try {
    let capturedPipeline = null;
    Favorite.aggregate = async (pipeline) => {
      capturedPipeline = pipeline;
      return [{ metadata: [{ total: 0 }], data: [] }];
    };

    const resIdor = createMockRes();
    await getTeacherFavoritesByID(
      { params: { id: "507f1f77bcf86cd799439011" }, query: {}, user: { _id: "507f1f77bcf86cd799439022", role: "user" } },
      resIdor
    );
    assert.equal(resIdor.statusCode, 403);

    const resBadId = createMockRes();
    await getTeacherFavoritesByID(
      { params: { id: "not-an-object-id" }, query: {}, user: { _id: "not-an-object-id", role: "admin" } },
      resBadId
    );
    assert.equal(resBadId.statusCode, 400);

    const resOk = createMockRes();
    await getTeacherFavoritesByID(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        query: { limit: "99999" },
        user: { _id: "507f1f77bcf86cd799439011", role: "teacher" },
      },
      resOk
    );
    assert.equal(resOk.statusCode, 200);
    assert.equal(resOk.body?.limit, 100);
    assert.ok(Array.isArray(capturedPipeline));
  } finally {
    Favorite.aggregate = origAggregate;
  }
});

test("logout-user requires POST (no GET CSRF), revokes tokenVersion, and securityHeaders sets API CSP", async () => {
  const getLayer = userRoutes.stack.find(
    (item) => item.route && item.route.path === "/logout-user" && item.route.methods.get
  );
  const postHandlers = getRouteMiddlewares(userRoutes, "post", "/logout-user");
  assert.equal(getLayer, undefined);
  assert.ok(postHandlers.length >= 2);

  const origFindByIdAndUpdate = User.findByIdAndUpdate;
  try {
    let bumpedId = null;
    let bumpedUpdate = null;
    User.findByIdAndUpdate = async (id, update) => {
      bumpedId = id;
      bumpedUpdate = update;
    };

    let clearedCookie = null;
    const res = createMockRes();
    res.cookie = (name, value, opts) => {
      clearedCookie = { name, value, opts };
    };

    await logoutUser({ user: { _id: "user-logout-1" }, headers: { host: "localhost:5001" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(bumpedId, "user-logout-1");
    assert.deepEqual(bumpedUpdate, { $inc: { tokenVersion: 1 } });
    assert.equal(clearedCookie?.name, "token");
    assert.equal(clearedCookie?.value, "");
  } finally {
    User.findByIdAndUpdate = origFindByIdAndUpdate;
  }

  const hdrRes = createMockRes();
  securityHeaders({}, hdrRes, () => {});
  assert.equal(hdrRes.headers["content-security-policy"], "default-src 'none'; frame-ancestors 'none'");
});

test("updateProfile allows clearing bio, youtube, and instagram while rejecting javascript: links", async () => {
  const origFindById = User.findById;
  try {
    let saved = false;
    const mockUser = {
      _id: "user-profile-1",
      name: "Alex",
      buyerName: "Alex",
      sellerName: "Alex Studio",
      role: "teacher",
      bio: "Old bio",
      youtube: "https://youtube.com/@alex",
      instagram: "@alex",
      email: "alex@example.com",
      save: async () => {
        saved = true;
      },
    };
    User.findById = async () => mockUser;

    const resBad = createMockRes();
    await updateProfile(
      {
        user: { _id: "user-profile-1" },
        body: { youtube: "javascript:alert(1)" },
        headers: { host: "localhost:5001" },
      },
      resBad
    );
    assert.equal(resBad.statusCode, 400);
    assert.equal(saved, false);

    const resClear = createMockRes();
    await updateProfile(
      {
        user: { _id: "user-profile-1" },
        body: { bio: "", youtube: "", instagram: "" },
        headers: { host: "localhost:5001" },
      },
      resClear
    );
    assert.equal(resClear.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(mockUser.bio, "");
    assert.equal(mockUser.youtube, "");
    assert.equal(mockUser.instagram, "");
  } finally {
    User.findById = origFindById;
  }
});

test("updateQuoteMessage allows seller to withdraw an open quote and blocks buyer from withdrawing", async () => {
  const origMsgFindById = Message.findById;
  const origRoomFindById = ChatRoom.findById;
  try {
    let roomSaved = false;
    let msgSaved = false;
    const mockMessage = {
      _id: "qmsg-withdraw-1",
      roomId: "room-88",
      type: "quote",
      quote: { price: 200, currency: "USD", description: "Logo redesign", status: "open" },
      save: async () => {
        msgSaved = true;
      },
      populate: async () => mockMessage,
    };
    const mockRoom = {
      _id: "room-88",
      student: "buyer-88",
      teacher: "seller-88",
      lastMessage: "Quote sent",
      updatedAt: null,
      save: async () => {
        roomSaved = true;
      },
    };

    Message.findById = async () => mockMessage;
    ChatRoom.findById = async () => mockRoom;

    const resBuyerBlocked = createMockRes();
    await updateQuoteMessage(
      {
        params: { messageId: "qmsg-withdraw-1" },
        body: { status: "withdrawn" },
        user: { _id: "buyer-88", name: "Buyer" },
      },
      resBuyerBlocked
    );
    assert.equal(resBuyerBlocked.statusCode, 403);
    assert.equal(mockMessage.quote.status, "open");

    const resSellerOk = createMockRes();
    await updateQuoteMessage(
      {
        params: { messageId: "qmsg-withdraw-1" },
        body: { status: "withdrawn" },
        user: { _id: "seller-88", name: "Seller" },
      },
      resSellerOk
    );
    assert.equal(resSellerOk.statusCode, 200);
    assert.equal(mockMessage.quote.status, "withdrawn");
    assert.equal(mockRoom.lastMessage, "Offer withdrawn");
    assert.ok(msgSaved);
    assert.ok(roomSaved);
  } finally {
    Message.findById = origMsgFindById;
    ChatRoom.findById = origRoomFindById;
  }
});

test("completeLessonByTeacher blocks seller from bypassing buyer confirmation on listing orders", async () => {
  const origFindById = Booking.findById;
  try {
    Booking.findById = () => ({
      populate() {
        return {
          populate: async () => ({
            _id: "b-listing-1",
            type: "listing",
            paymentStatus: "paid",
            status: "paid",
            user: { _id: "buyer-1" },
            teacher: { _id: "seller-1" },
          }),
        };
      },
    });

    const resSellerBlocked = createMockRes();
    await completeLessonByTeacher(
      {
        params: { bookingId: "b-listing-1" },
        user: { _id: "seller-1", role: "teacher" },
        body: { type: "listing" },
      },
      resSellerBlocked
    );
    assert.equal(resSellerBlocked.statusCode, 403);
    assert.match(String(resSellerBlocked.body?.message || ""), /delivered/i);
  } finally {
    Booking.findById = origFindById;
  }
});

test("deliverListingOrder, requestListingRevision, confirmListingDelivery, and auto-complete protect escrow", async () => {
  const origBookingFindById = Booking.findById;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingFind = Booking.find;
  const origUserFindByIdAndUpdate = User.findByIdAndUpdate;
  try {
    const baseBooking = {
      _id: "507f1f77bcf86cd799439011",
      type: "listing",
      paymentStatus: "paid",
      status: "paid",
      payoutStatus: "pending_completion",
      refundStatus: "none",
      amount: 100,
      currency: "USD",
      teacherPayoutAmount: 95,
      teacherPayoutCurrency: "USD",
      user: { _id: "buyer-55", name: "Buyer" },
      teacher: { _id: "seller-55", name: "Seller" },
    };

    Booking.findById = () => ({
      populate() {
        return {
          populate: async () => baseBooking,
        };
      },
    });

    let lastUpdate = null;
    Booking.findOneAndUpdate = async (query, update) => {
      lastUpdate = { query, update };
      return {
        ...baseBooking,
        ...(update?.$set || {}),
        revisionCount: (baseBooking.revisionCount || 0) + (update?.$inc?.revisionCount || 0),
      };
    };

    // 1. Non-seller cannot deliver
    const resBuyerDeliver = createMockRes();
    await deliverListingOrder(
      { params: { bookingId: baseBooking._id }, user: { _id: "buyer-55", role: "user" }, body: {} },
      resBuyerDeliver
    );
    assert.equal(resBuyerDeliver.statusCode, 403);

    // 2. Seller marks delivered -> sets status=delivered + 3-day autoCompleteAt (funds stay in escrow)
    const resSellerDeliver = createMockRes();
    await deliverListingOrder(
      {
        params: { bookingId: baseBooking._id },
        user: { _id: "seller-55", role: "teacher" },
        body: { deliveryNote: "Files uploaded" },
      },
      resSellerDeliver
    );
    assert.equal(resSellerDeliver.statusCode, 200);
    assert.equal(lastUpdate?.update?.$set?.status, "delivered");
    assert.equal(lastUpdate?.update?.$set?.deliveryNote, "Files uploaded");
    assert.ok(lastUpdate?.update?.$set?.autoCompleteAt instanceof Date);

    // 3. Buyer requests revision -> pauses autoCompleteAt & resets status to paid
    const resRevision = createMockRes();
    await requestListingRevision(
      {
        params: { bookingId: baseBooking._id },
        user: { _id: "buyer-55", role: "user" },
        body: { revisionNote: "Please update header" },
      },
      resRevision
    );
    assert.equal(resRevision.statusCode, 200);
    assert.equal(lastUpdate?.query?.status, "delivered");
    assert.equal(lastUpdate?.update?.$set?.status, "paid");
    assert.equal(lastUpdate?.update?.$set?.autoCompleteAt, null);
    assert.equal(lastUpdate?.update?.$inc?.revisionCount, 1);

    // 4. Buyer confirms delivery -> completes order & updates teacher balances + pending_connect
    let balanceInc = null;
    User.findByIdAndUpdate = async (id, update) => {
      balanceInc = { id, update };
      return { _id: id };
    };
    const resConfirm = createMockRes();
    await confirmListingDelivery(
      {
        params: { bookingId: baseBooking._id },
        user: { _id: "buyer-55", role: "user" },
        body: {},
      },
      resConfirm
    );
    assert.equal(resConfirm.statusCode, 200);
    assert.deepEqual(lastUpdate?.query?.status, { $in: ["delivered"] });
    assert.equal(lastUpdate?.update?.$set?.status, "completed");
    assert.equal(lastUpdate?.update?.$set?.payoutStatus, "pending_connect");
    assert.equal(lastUpdate?.update?.$set?.autoCompleted, false);
    assert.equal(balanceInc?.update?.$inc?.["balances.available.USD"], 95);
    assert.equal(balanceInc?.update?.$inc?.["balances.pending.USD"], -95);

    // 5. Auto-complete sweep finalizes expired delivered bookings
    Booking.find = () => ({
      select: () => ({
        lean: async () => [
          {
            _id: "507f1f77bcf86cd799439022",
            teacher: "seller-55",
            user: "buyer-55",
            payoutStatus: "pending_completion",
          },
        ],
      }),
    });
    const autoCount = await autoCompleteExpiredDeliveredOrders({ teacherId: "seller-55" });
    assert.equal(autoCount, 1);
    assert.equal(lastUpdate?.update?.$set?.autoCompleted, true);
  } finally {
    Booking.findById = origBookingFindById;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.find = origBookingFind;
    User.findByIdAndUpdate = origUserFindByIdAndUpdate;
  }
});
