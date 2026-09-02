import TeacherRating from "../models/TeacherRating.js";
import User from "../models/User.js";

export const addTeacherRating = async (req, res) => {
  try {
    const { teacherId, rating, review } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 100)
      return res.status(400).json({ message: "Invalid rating. Rating must be between 1 and 100." });

    let rate = await TeacherRating.findOne({ user: userId, teacher: teacherId });

    if (rate) {
      rate.rating = rating;
      rate.review = review;
      await rate.save();
    } else {
      rate = await TeacherRating.create({ user: userId, teacher: teacherId, rating, review });
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
