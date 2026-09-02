import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "lesson", "listing", "quote_request", "quote"],
      default: "text",
    },
    image: {
      url: String,
      public_id: String,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
    },
    lessonSnapshot: {
      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
      title: String,
      price: Number,
      image: String,
      duration: String,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
    },
    listingSnapshot: {
      listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
      },
      title: String,
      price: Number,
      currency: String,
      image: String,
      duration: String,
      slug: String,
    },
    quoteRequest: {
      listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
      },
      listingTitle: String,
      listingUrl: String,
      selectedDate: String,
      selectedTimes: [String],
      estimatedPrice: Number,
      currency: { type: String, uppercase: true },
      description: String,
      images: [
        {
          url: String,
          public_id: String,
        },
      ],
    },
    quote: {
      listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
      },
      price: Number,
      currency: { type: String, uppercase: true },
      description: String,
      status: {
        type: String,
        enum: ["open", "accepted", "cancelled"],
        default: "open",
      },
      requestMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      images: [
        {
          url: String,
          public_id: String,
        },
      ],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
