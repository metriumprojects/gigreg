import express from "express";
import { protect, optionalProtect, adminOnly } from "../middleware/authMiddleware.js";
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

const listingUploadFields = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "images", maxCount: 11 },
]);

// Admin: list all listings
router.get("/", protect, adminOnly, getAllListings);

router.post("/create", protect, listingUploadFields, compressImages, createListing);
router.get("/my-listings", protect, getMyListings);
router.get("/active", getActiveListings);
router.get("/slug/:slug", getListingBySlug);
// Backward-compatible routes used by the main frontend.
router.put("/update/:id", protect, listingUploadFields, compressImages, updateListing);
router.delete("/delete/:id", protect, deleteListing);

router.get("/:id", optionalProtect, getListingById);
// Allow dashboard to call PUT /api/listings/:id and DELETE /api/listings/:id.
router.put("/:id", protect, listingUploadFields, compressImages, updateListing);
router.delete("/:id", protect, deleteListing);

export default router;
