import mongoose from "mongoose";
const lessonSchema = new mongoose.Schema({
  lesson: { type: String,  }, // lesson id
  lessonGroup: { type:Boolean, default: false}
});


const slotSchema = new mongoose.Schema({
  start: String, // "09:00"
  end: String,    // "12:00"
  usecapacity: { type: Number, default: 0 },
  slotGroup: { type: Boolean, default: false }, // per-slot group flag (true = group, false = 1:1)
  lessons: [lessonSchema]
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

const LessonCalenderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lesson",
    required: false,
  },
  curriculum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Curriculum",
    required: false,
  },
  name: { type: String, default: "Calendar" },
  weeklyHours: [weeklySchema],
  dateSpecificHours: [dateSpecificSchema],
  type: { type: String, default: "lesson" },
  timeZone: { type: String, default: "UTC" }
}, { timestamps: true });

export default mongoose.model("LessonCalender", LessonCalenderSchema);
