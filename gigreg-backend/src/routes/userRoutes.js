import express from "express";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  logoutUser,
  changePassword,
  updateProfileImage,
  updateProfile,
  becomeTeacher,
  isOnlineTeacher,
  getUserById,
  googleLogin,
  verifyEmail,

} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify/:token", verifyEmail);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/profile", protect, getUserProfile);
router.post("/change-password", protect, changePassword);
router.get("/logout-user", logoutUser);
router.post("/update-image", protect, upload.single("image"), updateProfileImage);
router.post("/update-profile", protect,updateProfile);
router.post("/become-teacher", protect,becomeTeacher);
router.post("/isonline-teacher", protect,isOnlineTeacher);
router.get("/user/:id", protect,getUserById);
router.post("/google-login", googleLogin);

export default router;
