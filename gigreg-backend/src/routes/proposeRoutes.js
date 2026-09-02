import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  createPropose,
  getAllProposes,
  getProposeById,
  updatePropose,
  deletePropose,  
  getProposeByUser,
  updateProposeStatus
} from "../controllers/proposeController.js";

const router = express.Router();

// CRUD Routes
router.post("/create", protect, upload.array("images", 5), createPropose);
router.get("/get-propose", getAllProposes);
router.get("/propose/:id", getProposeById);
router.put("/update-propose/:id", protect, upload.any("images", 5), updatePropose);
router.delete("/delete-propose/:id",protect, deletePropose);
router.get("/user-propose",protect,  getProposeByUser);
router.put("/update-status/:id",protect,  updateProposeStatus);


export default router;
