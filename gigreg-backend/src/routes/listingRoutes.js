import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { compressImages } from "../middleware/compressImages.js";
import {
  createListing,
  deleteListing,
  getActiveListings,
  getListingById,
  getListingBySlug,
  getMyListings,
  updateListing,
  getAllListings,
} from "../controllers/listingController.js";

const router = express.Router();

// Admin: list all listings (protected + controller checks admin role)
router.get("/", protect, getAllListings);

router.post("/create", protect, upload.any(), compressImages, createListing);
router.get("/my-listings", protect, getMyListings);
router.get("/active", getActiveListings);
router.get("/slug/:slug", getListingBySlug);
// Backward-compatible routes used by the main frontend.
router.put("/update/:id", protect, upload.any(), compressImages, updateListing);
router.delete("/delete/:id", protect, deleteListing);

router.get("/:id", getListingById);
// Allow dashboard to call PUT /api/listings/:id and DELETE /api/listings/:id.
router.put("/:id", protect, upload.any(), compressImages, updateListing);
router.delete("/:id", protect, deleteListing);

export default router;
