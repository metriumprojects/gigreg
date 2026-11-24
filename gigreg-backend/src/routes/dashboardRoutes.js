import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

import { changeUserRole, deleteUser, getAllData, getAllUser, getSettings, loginAdmin, loginUserByAdmin, updateSettings, updateUser } from "../controllers/dashboardController.js";


const router = express.Router();

router.post("/admin-login", loginAdmin);
router.get("/user-login/:id", protect, adminOnly, loginUserByAdmin);
router.get("/all-user", protect, adminOnly, getAllUser);
router.post("/update-user/:id", protect, adminOnly, updateUser);
router.delete("/delete-user/:id", protect, adminOnly, deleteUser);
router.patch("/change-role/:id", protect, adminOnly, changeUserRole);

router.get("/all-data", protect, adminOnly, getAllData);
router.get("/settings", protect, adminOnly, getSettings);
router.put("/settings", protect, adminOnly, updateSettings);

export default router;
