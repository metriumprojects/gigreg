const STATIC_ALLOWED_ORIGINS = [
  "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5180",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "https://gigmake.com",
  "https://www.gigmake.com",
  "https://gigreg-admin.onrender.com",
  "https://gigreg-frontend.onrender.com",
];

export const getAllowedOrigins = () => {
  const envOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    process.env.DASHBOARD_URL,
  ].filter(Boolean);

  const isProd = process.env.NODE_ENV === "production";
  const base = isProd
    ? STATIC_ALLOWED_ORIGINS.filter((origin) => !origin.startsWith("http://localhost"))
    : STATIC_ALLOWED_ORIGINS;

  return [...new Set([...base, ...envOrigins].map((url) => String(url).replace(/\/+$/, "")))];
};

export const isOriginAllowed = (origin) => {
  // Allow mobile native apps, curl, server-to-server webhooks without Origin header
  if (!origin) return true;
  if (origin.startsWith("capacitor://")) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  // Allow arbitrary localhost ports ONLY outside production
  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return true;
  }

  return false;
};
