import Review from "../models/Review.js";
import cloudinary from "cloudinary";
import fs from "fs";

// Create  review
export const createReview = async (req, res) => {
  try {
    const { message, rating } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "Invalid rating" });

    const existingReview = await Review.findOne({ user: userId });
    if (existingReview) {
      return res.status(400).json({
        status: false,
        message: "You have already submitted a review. Thank you!",
        review: existingReview,
      });
    }
    
    let uploadedImage = null;

    // Upload image if provided
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "_reviews",
      });
      uploadedImage = { url: result.secure_url, public_id: result.public_id };
      fs.unlinkSync(req.file.path);
    }

    const review = await Review.create({
      user: userId,
      message,
      rating,
      image: uploadedImage,
    });

    res.status(201).json({
      status: true,
      message: "Thank you for your feedback! Pending admin approval.",
      review,
    });
  } catch (error) {
    console.error("createReview error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get approved reviews (for public display)
export const getApprovedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isApproved: true })
      .populate("user", "name image")
      .sort({ createdAt: -1 });
    res.status(200).json({ status: true, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews (admin)
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ status: true, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve or reject review (admin only)
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { isApproved },
      { new: true }
    );

    if (!review)
      return res.status(404).json({ message: "Review not found" });

    res
      .status(200)
      .json({ status: true, message: "Review status updated", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
