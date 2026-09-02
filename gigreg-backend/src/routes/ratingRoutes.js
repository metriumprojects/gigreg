import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addTeacherRating } from "../controllers/ratingController.js";

const router = express.Router();

router.post("/teacher", protect, addTeacherRating);

export default router;
