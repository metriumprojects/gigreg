import express from "express";
import {
  createAvailability,
  updateAvailability,
  getAvailability,
  teacherAvailability
} from "../controllers/availabilityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { getTimeLockByUser } from "../controllers/lockTimeController.js";
import { getLessonCalender, lessonCalenderById, lessonCalenderByUser, updateCalender } from "../controllers/lessonCalenderController.js";

const router = express.Router();

router.post("/create", protect, createAvailability);
router.post("/update", protect, updateAvailability);
router.get("/me", protect, getAvailability);
router.get("/teacher-availability/:id",  teacherAvailability);
router.get("/teacher-timelock/:userId",  getTimeLockByUser);

router.get("/lesson-calender/:id",  getLessonCalender);
router.get("/lesson-calender-user", protect, lessonCalenderByUser);
router.get("/lesson-calender-by-id/:id", lessonCalenderById);
router.put("/update-calender/:id", updateCalender);

export default router;
