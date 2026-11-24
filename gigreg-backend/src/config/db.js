import mongoose from "mongoose";
import dns from "dns";
import User from "../models/User.js";
import { SUPPORTED_CURRENCIES } from "../services/currencyService.js";

// Only override system DNS upfront when explicitly requested via USE_CUSTOM_DNS=true.
// Otherwise use native DNS first and fall back to public DNS only if SRV/TXT lookup fails.
if (process.env.USE_CUSTOM_DNS === "true") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
  } catch (e) {
    console.warn("Could not set custom DNS servers:", e.message);
  }
}

const connectWithRetry = async () => {
  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };
  try {
    return await mongoose.connect(process.env.MONGO_URI, options);
  } catch (error) {
    const msg = String(error?.message || "");
    const isDnsLookupError =
      process.env.USE_CUSTOM_DNS !== "true" &&
      /(querySrv|queryTxt|EREFUSED|ESERVFAIL|ENOTFOUND|ETIMEOUT)/i.test(msg);
    if (!isDnsLookupError) throw error;

    console.warn(`⚠️ Native DNS MongoDB lookup failed (${msg}); retrying with 8.8.8.8...`);
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    return await mongoose.connect(process.env.MONGO_URI, options);
  }
};

const connectDB = async () => {
  try {
    const conn = await connectWithRetry();
    // Normalize only unsupported/invalid currencies without wiping valid multi-currency users.
    await User.updateMany(
      { currency: { $nin: SUPPORTED_CURRENCIES } },
      { $set: { currency: "USD" } }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
