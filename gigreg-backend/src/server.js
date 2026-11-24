import { assertValidEnv } from "./config/env.js";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import app from "./app.js";
import socketHandler from "./socket/socketHandler.js";
import { isOriginAllowed } from "./config/corsConfig.js";
import { autoCompleteExpiredDeliveredOrders } from "./controllers/bookingController.js";

assertValidEnv();
await connectDB();

const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Pass io to socket handler
socketHandler(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 GigMake API running on port ${PORT}`);
});

const autoCompleteInterval = setInterval(() => {
  autoCompleteExpiredDeliveredOrders().catch((err) =>
    console.warn("Auto-complete sweep error:", err.message)
  );
}, 15 * 60 * 1000);
if (typeof autoCompleteInterval.unref === "function") {
  autoCompleteInterval.unref();
}

let isShuttingDown = false;
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearInterval(autoCompleteInterval);
  console.log(`Received ${signal}. Shutting down GigMake API gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10000);
  if (typeof forceExitTimer.unref === "function") {
    forceExitTimer.unref();
  }

  io.close(() => {
    server.close(async () => {
      try {
        await mongoose.connection.close(false);
        console.log("HTTP server and MongoDB connection closed.");
        process.exit(0);
      } catch (err) {
        console.error("Error closing MongoDB connection:", err?.message || err);
        process.exit(1);
      }
    });
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
