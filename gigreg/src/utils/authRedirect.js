export const AUTH_REDIRECT_STORAGE_KEY = "auth_redirect_target";

/**
 * Returns a clean redirect path based on current location/path string.
 * Disallows auth-related paths to prevent loops.
 */
export const getSafeRedirectPath = (locationOrPath) => {
  let path = "";
  if (typeof locationOrPath === "string") {
    path = locationOrPath;
  } else if (locationOrPath && typeof locationOrPath === "object") {
    path = `${locationOrPath.pathname || ""}${locationOrPath.search || ""}${locationOrPath.hash || ""}`;
  }

  if (!path || !path.trim()) return "";

  const trimmed = path.trim();
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("/login") ||
    lower.startsWith("/register") ||
    lower.startsWith("/forget") ||
    lower.startsWith("/new-password") ||
    lower.startsWith("/verify-email") ||
    lower.startsWith("/mail-verify")
  ) {
    return "";
  }

  return trimmed;
};

/**
 * Builds login URL preserving redirect query parameter
 */
export const getLoginUrl = (locationOrPath, extraParams = {}) => {
  const safePath = getSafeRedirectPath(locationOrPath);
  const params = new URLSearchParams();
  if (safePath) {
    params.set("redirect", safePath);
  }
  Object.entries(extraParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, val);
    }
  });
  const query = params.toString();
  return `/login${query ? `?${query}` : ""}`;
};

/**
 * Builds register URL preserving redirect query parameter
 */
export const getRegisterUrl = (locationOrPath, extraParams = {}) => {
  const safePath = getSafeRedirectPath(locationOrPath);
  const params = new URLSearchParams();
  if (safePath) {
    params.set("redirect", safePath);
  }
  Object.entries(extraParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, val);
    }
  });
  const query = params.toString();
  return `/register${query ? `?${query}` : ""}`;
};
