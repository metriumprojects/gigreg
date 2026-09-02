import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  start: String, // "09:00"
  end: String,    // "12:00"
    group: { type: Boolean, default: false },
  usecapacity: { type: Number, default: 0 },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
});

const weeklySchema = new mongoose.Schema({
  day: { type: String, required: true }, // M,T,W,T,F,S,S
  available: { type: Boolean, default: true },
  slots: [slotSchema]
});

const dateSpecificSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "2025-11-28"
  available: { type: Boolean, default: true },
  slots: [slotSchema]
});

const lockTimeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true, // only one availability per user
    required: true,
  },
  weeklyHours: [weeklySchema],
  dateSpecificHours: [dateSpecificSchema],
  timeZone: { type: String, default: "UTC" }
}, { timestamps: true });

export default mongoose.model("LockTime", lockTimeSchema);
