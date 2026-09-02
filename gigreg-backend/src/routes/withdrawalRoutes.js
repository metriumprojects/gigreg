import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import { approveWithdrawal, createWithdrawal, getAllWithdrawals, getUserWithdrawals } from "../controllers/withdrawalController.js";

const router = express.Router();

router.post("/add-withdrawal", protect,  createWithdrawal);
router.post("/approved-withdrawal/:id", protect,  approveWithdrawal);
router.get("/user-withdrawal",protect, getUserWithdrawals);
router.get("/all-withdrawal", protect,  getAllWithdrawals);

export default router;
