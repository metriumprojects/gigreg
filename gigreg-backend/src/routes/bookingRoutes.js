import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {  initiateBooking, confirmBooking, userBookings, teacherBookings, teacherListingOrders, userListingOrders,  userUpcomingBookings, userCancelBookings, userUnscheduledBookings, completeLessonByTeacher, rescheduleBooking, cancelBooking, upcomingBookingsByUserId, getBookingById, userMainUpcomingBookings, teacherMainUpcomingBookings, teacherPastLessons, userPastLessons } from "../controllers/bookingController.js";

const router = express.Router();
// Initiate booking -> returns client_secret to confirm payment on frontend
router.post("/initiate", protect, initiateBooking);

// Confirm booking after frontend payment (or use webhook)
router.post("/confirm", protect, confirmBooking);
router.get("/user", protect, userBookings);
router.get("/teacher", protect, teacherBookings);
router.get("/teacher-listing-orders", protect, teacherListingOrders);
router.get("/user-listing-orders", protect, userListingOrders);
router.post("/schedule-lesson", protect, rescheduleBooking);
router.get("/user-upcoming-lesson", protect, userUpcomingBookings);//scheduledAt=2025-12-01T10:00&timezone=Asia/Kolkata
router.get("/user-cancel-lesson", protect, userCancelBookings);
router.get("/user-unscheduled-lesson", protect, userUnscheduledBookings);
router.post("/complete-lesson/:bookingId", protect, completeLessonByTeacher);
router.get("/upcoming-lesson-by-user/:id", upcomingBookingsByUserId);
router.post("/cancel-booking/:bookingId",protect, cancelBooking);
router.get("/get-booking/:id",protect, getBookingById);
router.get("/user-main-upcoming",protect, userMainUpcomingBookings);
router.get("/teacher-main-upcoming",protect, teacherMainUpcomingBookings);
router.get("/teacher-main-past",protect, teacherPastLessons);
router.get("/user-main-past",protect, userPastLessons);



export default router;
