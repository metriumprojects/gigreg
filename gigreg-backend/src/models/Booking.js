import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  curriculum: { type: mongoose.Schema.Types.ObjectId, ref: "Curriculum", },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  user: { type:  mongoose.Schema.Types.ObjectId, ref: "User" },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  firstname: { type: String, required: true },
  lastname: { type: String},
  country: { type: String },
  review: { type: Boolean, default: false },
  lessonPosition: [{
    position: Number,
    lId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson"
    },
    unitPosition: Number,
    unitName: String,
    group:  { type: Boolean },
    status: { type: String, default: "pending" },
    scheduledAt: { type: Date }, // when user wants class
    timezone: { type: String }, // when user wants class
    review: { type: Boolean, default: false },
  }],
  scheduledAt: { type: Date }, // when user wants class
  timezone: { type: String }, // when user wants class

  amount: { type: Number, required: true }, // store in smallest currency unit or float
  currency: { type: String, default: "usd" },
  chargedAmount: { type: Number },
  chargedCurrency: { type: String },
  exchangeRate: { type: Number, default: 1 },
  exchangeRateDate: { type: String },
  type: String,
  group:  { type: Boolean},
  welcomeMessageSent: { type: Boolean, default: false },
  
  status: { type: String, default: "pending" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "cancelled", "part"], default: "pending" },
  stripePaymentIntentId: { type: String },
  stripeSessionId: { type: String },
  stripeTransferId: { type: String },
  stripeApplicationFeeAmount: { type: Number },
  presentmentAmount: { type: Number },
  presentmentCurrency: { type: String },
  teacherSettlementAmount: { type: Number },
  teacherSettlementCurrency: { type: String },
  teacherExchangeRate: { type: Number },
  lesson_price: { type: Number },
  lesson_currency: { type: String },
  itemSnapshot: {
    itemId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String },
    price: { type: Number },
    currency: { type: String },
    duration: { type: String },
    pricingType: { type: String },
    quantity: { type: Number },
    bookedHours: { type: String },
    selectedDate: { type: String },
    selectedTimes: [{ type: String }],
  },
  display_price: { type: Number },
  display_currency: { type: String },
  exchange_rate_used: { type: Number, default: 1 },
  stripe_payment_intent_id: { type: String },
  stripe_session_id: { type: String },
  payment_status: { type: String, default: "pending" },
  meta: { type: Object }, // optional extra data
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
