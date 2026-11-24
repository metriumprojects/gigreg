import TeacherRating from "../models/TeacherRating.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";

export const addTeacherRating = async (req, res) => {
  try {
    const { teacherId, rating, review } = req.body;
    const userId = req.user._id;

    if (!teacherId) {
      return res.status(400).json({ status: false, message: "teacherId is required" });
    }

    if (String(teacherId) === String(userId)) {
      return res.status(400).json({ status: false, message: "You cannot rate yourself" });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 100) {
      return res.status(400).json({ message: "Invalid rating. Rating must be between 1 and 100." });
    }

    const hasPaidBooking = await Booking.exists({
      user: userId,
      teacher: teacherId,
      paymentStatus: "paid",
      status: { $ne: "cancelled" },
    });
    if (!hasPaidBooking) {
      return res.status(403).json({
        status: false,
        message: "You can only rate sellers you have an active or completed paid booking with",
      });
    }

    let rate = await TeacherRating.findOne({ user: userId, teacher: teacherId });

    if (rate) {
      rate.rating = numericRating;
      rate.review = review;
      await rate.save();
    } else {
      rate = await TeacherRating.create({ user: userId, teacher: teacherId, rating: numericRating, review });
    }

    // Update average teacher rating
    const stats = await TeacherRating.aggregate([
      { $match: { teacher: rate.teacher } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const avg = stats[0]?.avg || 0;
    const count = stats[0]?.count || 0;

    await User.findByIdAndUpdate(teacherId, {
      averageRating: avg,
      totalRatings: count,
    });

    res.status(200).json({ status: true, message: "Teacher rated successfully", rate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
