import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getActiveHomeSliders,
  getAllHomeSliders,
  createHomeSlider,
  updateHomeSlider,
  deleteHomeSlider,
} from "../controllers/homeSliderController.js";

const router = express.Router();

router.get("/active", getActiveHomeSliders);
router.get("/", protect, adminOnly, getAllHomeSliders);
router.post("/", protect, adminOnly, upload.single("image"), createHomeSlider);
router.put("/:id", protect, adminOnly, upload.single("image"), updateHomeSlider);
router.delete("/:id", protect, adminOnly, deleteHomeSlider);

export default router;
