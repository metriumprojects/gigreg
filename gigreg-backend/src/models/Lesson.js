import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    message: String,
    duration: String,
    category: String,
    position: Number,
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: "USD" },

    isIndependent: { type: Boolean, default: false },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    curriculums: [{ type: mongoose.Schema.Types.ObjectId, ref: "Curriculum" }],

    usecapacity: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    isOnline: { type: Boolean, default: true },

    // ❌ OLD (keep for backup if needed)
    location: String,
    address: String,
    placeId: String,
    lat: { type: Number },
    lng: { type: Number },

    // ✅ NEW GEO LOCATION (IMPORTANT 🔥)
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        // default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        index: "2dsphere",
      },
    },

    type: { type: String, default: "lesson" },

    coverImage: {
      url: String,
      public_id: String,
    },

    images: [
      {
        url: String,
        public_id: String,
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    averageRating: { type: Number, default: 0, max: 100 },
    totalRatings: { type: Number, default: 0 },

    status: { type: String, default: "Active" },
    isGroupAvailable: { type: Boolean, default: false },

    calender: { type: Boolean, default: true },
    calenderId: { type: String, default: null },
  },
  { timestamps: true }
);

// 🔥 IMPORTANT INDEX
lessonSchema.index({ geoLocation: "2dsphere" });
lessonSchema.index({ status: 1, isIndependent: 1, createdAt: -1 });

export default mongoose.model("Lesson", lessonSchema);
