import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/create", protect, adminOnly, upload.single("image"), createCategory);
router.get("/all-categories", getCategories);
router.put("/update-category/:id", protect, adminOnly, upload.single("image"), updateCategory);
router.delete("/delete-category/:id", protect, adminOnly, deleteCategory);

export default router;
