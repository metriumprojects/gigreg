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
export const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
