import dotenv from "dotenv";

dotenv.config();

const MIN_PROD_JWT_SECRET_LENGTH = 32;

export const validateEnv = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const isProd = env.NODE_ENV === "production";

  if (!env.MONGO_URI) {
    errors.push("MONGO_URI is required");
  }

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required");
  } else if (String(env.JWT_SECRET).trim().length < MIN_PROD_JWT_SECRET_LENGTH) {
    warnings.push(
      `JWT_SECRET should be at least ${MIN_PROD_JWT_SECRET_LENGTH} characters long for HS256 security`
    );
  }

  if (!env.STRIPE_SECRET_KEY) {
    const msg = "STRIPE_SECRET_KEY is not configured";
    if (isProd) errors.push(msg);
    else warnings.push(msg);
  } else if (isProd && String(env.STRIPE_SECRET_KEY).startsWith("sk_test_")) {
    warnings.push("STRIPE_SECRET_KEY is using a Stripe TEST key while NODE_ENV=production");
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    warnings.push(
      "STRIPE_WEBHOOK_SECRET is required so /api/stripe/webhook can verify Stripe events"
    );
  }

  const frontendUrl = String(env.FRONTEND_URL || env.CLIENT_URL || "").trim();
  if (isProd && (!frontendUrl || /localhost|127\.0\.0\.1/i.test(frontendUrl))) {
    warnings.push("FRONTEND_URL / CLIENT_URL should point to your live HTTPS domain in production");
  }

  if (isProd && !env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_IDS) {
    warnings.push("GOOGLE_CLIENT_IDS (or GOOGLE_CLIENT_ID) is not explicitly configured");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
};

export const assertValidEnv = (env = process.env) => {
  const result = validateEnv(env);
  for (const warning of result.warnings) {
    console.warn(`[env] Warning: ${warning}`);
  }
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`[env] Error: ${error}`);
    }
    throw new Error(`Invalid environment configuration: ${result.errors.join("; ")}`);
  }
  return result;
};
