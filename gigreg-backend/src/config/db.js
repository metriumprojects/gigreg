import mongoose from "mongoose";
import dns from "dns";
import User from "../models/User.js";

// Use Google Public DNS to bypass local ISP SRV record blocking (querySrv ECONNREFUSED)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    await User.updateMany(
      { currency: { $nin: ["USD", "EUR"] } },
      { $set: { currency: "USD" } }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
