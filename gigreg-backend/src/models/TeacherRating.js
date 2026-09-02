import mongoose from "mongoose";

const teacherRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 100, required: true },
    review: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

teacherRatingSchema.index({ user: 1, teacher: 1 }, { unique: true });

export default mongoose.model("TeacherRating", teacherRatingSchema);
