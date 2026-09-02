import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  name: { type: String, required: true },
  accountNo: { type: String, required: true },
  bank: { type: String, required: true },
  orderNo: { type: String, required: true },
  amount: { type: Number, required: true },
  country: { type: String, required: true },
  currency: { type: String },
  iban: { type: String, },
  routingNumber: { type: String, },
  swiftBic: { type: String, },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

}, { timestamps: true });

export default mongoose.model("Withdrawal", withdrawalSchema);
