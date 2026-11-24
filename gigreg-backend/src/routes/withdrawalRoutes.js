import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

import { approveWithdrawal, createWithdrawal, getAllWithdrawals, getUserWithdrawals } from "../controllers/withdrawalController.js";

const router = express.Router();

router.post("/add-withdrawal", protect, createWithdrawal);
router.post("/approved-withdrawal/:id", protect, adminOnly, approveWithdrawal);
router.get("/user-withdrawal", protect, getUserWithdrawals);
router.get("/all-withdrawal", protect, adminOnly, getAllWithdrawals);

export default router;
