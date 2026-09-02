import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema(
  {
    pair: { type: String, unique: true, required: true, default: "USD_EUR" },
    rate: { type: Number, required: true, min: 0 },
    providerDate: { type: String, required: true },
    retrievedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("ExchangeRate", exchangeRateSchema);
