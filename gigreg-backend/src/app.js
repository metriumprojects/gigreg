import "./config/env.js";
import express from "express";
import compression from "compression";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import proposeRoutes from "./routes/proposeRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import withdrawalRoutes from "./routes/withdrawalRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import discoverRoutes from "./routes/discoverRoutes.js";
import stripeConnectRoutes from "./routes/stripeConnectRoutes.js";
import homeSliderRoutes from "./routes/homeSliderRoutes.js";
import cookieParser from "cookie-parser";
import { stripeWebhook } from "./controllers/stripeWebhookController.js";
import placesAutocompleteRoutes from "./routes/placesAutocompleteRoutes.js";
import { createRateLimiter, mongoSanitizeMiddleware, securityHeaders } from "./middleware/securityMiddleware.js";
import { isOriginAllowed } from "./config/corsConfig.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(compression());

// Lightweight health check for Render / load balancers / uptime monitoring
app.get("/health", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? "ok" : "degraded",
    service: "gigmake-api",
    db: dbReady ? "connected" : "disconnected",
    uptime: Math.floor(process.uptime()),
  });
});

// Request logger (clean, single-line in non-production)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    if (req.originalUrl !== "/favicon.ico") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    }
    next();
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), stripeWebhook);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));
app.use(mongoSanitizeMiddleware);

app.use(cookieParser());

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyPrefix: "api",
  message: "Too many requests. Please slow down and try again shortly.",
});
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "auth",
  message: "Too many authentication attempts. Please try again later.",
});
const paymentRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  keyPrefix: "payment",
  message: "Too many payment requests. Please wait a moment and try again.",
});
const disconnectRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "disconnect",
  message: "Too many disconnect requests. Please try again later.",
});
const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyPrefix: "upload",
  message: "Too many upload requests. Please slow down and try again shortly.",
});

app.use("/api", apiRateLimiter);
app.use("/api/users/login", authRateLimiter);
app.use("/api/users/register", authRateLimiter);
app.use("/api/users/forgot-password", authRateLimiter);
app.use("/api/users/reset-password", authRateLimiter);
app.use("/api/users/change-password", authRateLimiter);
app.use("/api/users/google-login", authRateLimiter);
app.use("/api/dashboard/admin-login", authRateLimiter);
app.use("/api/book/initiate", paymentRateLimiter);
app.use("/api/book/confirm", paymentRateLimiter);
app.use("/api/stripe-connect/account-session", paymentRateLimiter);
app.use("/api/stripe-connect/disconnect", disconnectRateLimiter);
app.use("/api/listings/create", uploadRateLimiter);
app.use("/api/listings/update", uploadRateLimiter);
app.use("/api/propose/create", uploadRateLimiter);
app.use("/api/propose/update-propose", uploadRateLimiter);
app.use("/api/users/update-image", uploadRateLimiter);
app.use("/api/chat/messages", uploadRateLimiter);
app.use("/api/review/add-review", uploadRateLimiter);

app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/book", bookingRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/propose", proposeRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/stripe-connect", stripeConnectRoutes);
app.use("/api/home-slider", homeSliderRoutes);
app.use("/api", placesAutocompleteRoutes);


// Global error handler
export const globalErrorHandler = (err, req, res, next) => {
  console.error(err?.stack || err);

  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }

  const statusCode = Number(err?.status || err?.statusCode) || 500;
  const isProd = process.env.NODE_ENV === "production";
  const safeMessage =
    isProd && statusCode >= 500
      ? "Internal Server Error"
      : err?.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
};

app.use(globalErrorHandler);


export default app;
