import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
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
dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost",
  "capacitor://localhost",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean);

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
      // Allow mobile apps, curl, server-to-server or listed origins
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cookieParser());
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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});


export default app;
