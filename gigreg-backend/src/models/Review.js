import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  
    image: {
      url: String,
      public_id: String,
    },
    isApproved: {
      type: Boolean,
      default: false, // admin must approve before showing publicly
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ isApproved: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Review", ReviewSchema);
