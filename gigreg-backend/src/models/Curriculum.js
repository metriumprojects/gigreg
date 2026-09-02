import mongoose from "mongoose";

const curriculumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
     message: String,
    price: Number,
    currency: { type: String, required: true, uppercase: true, default: "USD" },
      category: String,
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
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
      // Do not create an empty `{ type: "Point" }` for online curricula.
      // A 2dsphere index only accepts a Point when coordinates are present.
    },


    calender: { type: Boolean, default: false },
    calenderId: { type: String, default: null },
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
      required: true,
    },
    lessonPosition: [{
      position: Number,
      lId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson"
      },
       unitPosition: Number,
       unitName: String
    }],
      isOnline: { type: Boolean, default: true },
    supportsInPerson: { type: Boolean, default: false },
    totalLesson: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
    averageRating: { type: Number, default: 0, max: 100 },
    totalRatings: { type: Number, default: 0 },
     calender:{ type: Boolean, default:false },
    calenderId:{ type: String, default:null }
  },

  { timestamps: true }
);

curriculumSchema.pre("validate", function () {
  const hasCoordinates =
    Array.isArray(this.geoLocation?.coordinates) &&
    this.geoLocation.coordinates.length === 2 &&
    this.geoLocation.coordinates.every(Number.isFinite);

  if (!hasCoordinates && Number.isFinite(this.lng) && Number.isFinite(this.lat)) {
    this.geoLocation = { type: "Point", coordinates: [this.lng, this.lat] };
  } else if (!hasCoordinates) {
    this.geoLocation = undefined;
  }
});

curriculumSchema.index({ geoLocation: "2dsphere" });
curriculumSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model("Curriculum", curriculumSchema);
