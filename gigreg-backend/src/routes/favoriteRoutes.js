import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { toggleFavorite, getUserFavorites, getTeacherFavoritesByID, getUserFavoritesByUser } from "../controllers/favoriteController.js";

const router = express.Router();

// Toggle favorite (add/remove)
router.post("/save/:id", protect, toggleFavorite);

// Get all user favorites
router.get("/all-favorites", protect, getUserFavorites);
router.get("/favorites-by-teacher/:id", getTeacherFavoritesByID);
router.get("/favorites-by-user/:id", getUserFavoritesByUser);

export default router;
