import mongoose from "mongoose";

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    commissionPercent: { type: Number, default: 5, min: 0, max: 100 },
  },
  { timestamps: true }
);

export default mongoose.model("AppSetting", appSettingSchema);
