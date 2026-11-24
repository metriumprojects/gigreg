import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Read token from Authorization header (for mobile apps)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // ✅ Read token from cookie (for website)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Please login your account" });
    }

    // Verify token (pinned to HS256)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    const user = await User.findById(decoded.id)
      .select("-password -resetPasswordToken -resetPasswordExpire -verifyEmailToken -verifyEmailExpires")
      .lean();
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    user.id = String(user._id);
    req.user = user;

    if (
      decoded.tv !== undefined &&
      Number(decoded.tv) !== Number(req.user.tokenVersion || 0)
    ) {
      return res.status(401).json({ message: "Session has been invalidated. Please log in again." });
    }

    if (
      req.user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < new Date(req.user.passwordChangedAt).getTime()
    ) {
      return res.status(401).json({ message: "Password recently changed. Please log in again." });
    }

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

export const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.id)
      .select("-password -resetPasswordToken -resetPasswordExpire -verifyEmailToken -verifyEmailExpires")
      .lean();

    if (!user) {
      req.user = null;
      return next();
    }
    if (
      decoded.tv !== undefined &&
      Number(decoded.tv) !== Number(user.tokenVersion || 0)
    ) {
      req.user = null;
      return next();
    }
    if (
      user.passwordChangedAt &&
      decoded.iat &&
      decoded.iat * 1000 < new Date(user.passwordChangedAt).getTime()
    ) {
      req.user = null;
      return next();
    }

    user.id = String(user._id);
    req.user = user;
    next();
  } catch {
    req.user = null;
    next();
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ status: false, message: "Admin access required" });
  }
  next();
};

