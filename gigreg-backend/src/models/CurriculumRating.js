import mongoose from "mongoose";

const curriculumRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: "Curriculum", required: true },
    rating: { type: Number, min: 1, max: 100, required: true },
    review: { type: String, maxlength: 10000 },
       image: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true }
);

// Prevent duplicate rating by same user
curriculumRatingSchema.index({ user: 1, curriculum: 1 }, { unique: true });

export default mongoose.model("CurriculumRating", curriculumRatingSchema);
