import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  createReview,
  getApprovedReviews,
  getAllReviews,
  updateReviewStatus,
} from "../controllers/reviewController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/add-review", protect, upload.single("image"), createReview);
router.get("/approved", getApprovedReviews);
router.get("/all", protect,  getAllReviews);
router.patch("/update-review/:id", protect, updateReviewStatus);

export default router;
