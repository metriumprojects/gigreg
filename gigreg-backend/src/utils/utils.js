import jwt from "jsonwebtoken";
export function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export const generateToken = (id, tokenVersion = 0) =>
  jwt.sign({ id, tv: Number(tokenVersion || 0) }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

export const buildAuthCookieOptions = (req, { clear = false } = {}) => {
  const host = String(req?.headers?.host || "");
  const isLocalHost = host.includes("localhost") || host.includes("127.0.0.1");
  const isProduction = process.env.NODE_ENV === "production" && !isLocalHost;

  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "lax",
    path: "/",
  };

  if (clear) {
    return { ...base, maxAge: 0, expires: new Date(0) };
  }
  return { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 };
};

export function parseLessonDuration(duration) {
  let minutes = 0;

  const hourMatch = duration.match(/(\d+)\s*h/);
  const minMatch = duration.match(/(\d+)\s*m/);
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);
  return minutes;
}

export function generateOrderNo() {
  const random = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  return `WD${date}${random}`;
}
