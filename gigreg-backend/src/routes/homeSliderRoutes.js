import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  getActiveHomeSliders,
  getAllHomeSliders,
  createHomeSlider,
  updateHomeSlider,
  deleteHomeSlider,
} from "../controllers/homeSliderController.js";

const router = express.Router();

router.get("/active", getActiveHomeSliders);
router.get("/", protect, getAllHomeSliders);
router.post("/", protect, upload.single("image"), createHomeSlider);
router.put("/:id", protect, upload.single("image"), updateHomeSlider);
router.delete("/:id", protect, deleteHomeSlider);

export default router;
