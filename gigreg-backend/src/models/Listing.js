import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: String,
    public_id: String,
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true, index: true },
    description: { type: String, required: true },
    message: String,
    category: { type: String, required: true },
    duration: String,
    price: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true, default: "USD" },
    pricingType: {
      type: String,
      enum: ["hourly_calendar", "hourly", "fixed", "fixed_on_demand"],
      default: "hourly_calendar",
    },
    allowMessageWithoutPayment: { type: Boolean, default: true },

    isOnline: { type: Boolean, default: true },
    supportsInPerson: { type: Boolean, default: false },
    location: String,
    address: String,
    placeId: String,
    lat: Number,
    lng: Number,
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },

    coverImage: imageSchema,
    images: [imageSchema],

    status: { type: String, default: "Active" },
    isGroupAvailable: { type: Boolean, default: false },
    usecapacity: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    calender: { type: Boolean, default: true },
    calenderId: { type: String, default: null },
    weeklyHours: { type: mongoose.Schema.Types.Mixed, default: null },
    dateSpecificHours: { type: mongoose.Schema.Types.Mixed, default: null },
    timeZone: String,
    calendarName: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

listingSchema.index({ geoLocation: "2dsphere" });

export default mongoose.model("Listing", listingSchema);
