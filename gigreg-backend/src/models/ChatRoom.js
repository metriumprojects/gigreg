import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    curriculum: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",
    },
      lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: String,
    },
  },
  { timestamps: true }
);

// Enforce a single room per student/teacher pair
chatRoomSchema.index({ student: 1, teacher: 1 }, { unique: true });

export default mongoose.model("ChatRoom", chatRoomSchema);
