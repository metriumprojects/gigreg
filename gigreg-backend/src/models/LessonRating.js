import mongoose from "mongoose";

const lessonRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
    rating: { type: Number, min: 1, max: 100, required: true },
    review: { type: String, maxlength: 10000 },
       image: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true }
);

lessonRatingSchema.index({ user: 1, lesson: 1 }, { unique: true });

export default mongoose.model("LessonRating", lessonRatingSchema);
