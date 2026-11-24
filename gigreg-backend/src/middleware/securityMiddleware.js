import { sanitizeMongoObject } from "../utils/sanitize.js";

export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitizeMongoObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    sanitizeMongoObject(req.query);
  }
  next();
};

export const securityHeaders = (req, res, next) => {
  if (typeof res.removeHeader === "function") {
    res.removeHeader("X-Powered-By");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  next();
};

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 30,
  keyPrefix = "rl",
  message = "Too many requests. Please try again later.",
  maxEntries = 5000,
} = {}) => {
  const hits = new Map();

  const pruneExpired = (now) => {
    for (const [key, entry] of hits.entries()) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  };

  const cleanupInterval = setInterval(() => {
    pruneExpired(Date.now());
  }, Math.min(Math.max(windowMs, 30 * 1000), 10 * 60 * 1000));

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  const limiter = (req, res, next) => {
    const now = Date.now();
    const rawIp =
      req.ip ||
      req.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const key = `${keyPrefix}:${rawIp}`;

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size >= maxEntries) {
        pruneExpired(now);
        if (hits.size >= maxEntries) {
          const oldestKey = hits.keys().next().value;
          if (oldestKey) hits.delete(oldestKey);
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);

    if (typeof res.setHeader === "function") {
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
    }

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      if (typeof res.setHeader === "function") {
        res.setHeader("Retry-After", String(retryAfterSeconds));
      }
      return res.status(429).json({
        status: false,
        message,
        retryAfterSeconds,
      });
    }

    next();
  };

  limiter.reset = () => hits.clear();
  return limiter;
};
