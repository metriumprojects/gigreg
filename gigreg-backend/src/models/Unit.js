import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    position: Number,
     price:Number,
    isIndependent: { type: Boolean, default: false },
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: "Curriculum" },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Unit", unitSchema);
