import noImageAsset from "../assets/PublicImages/no-image.png";
import badgePoacAsset from "../assets/PublicImages/badge-poac.png";

export const DEFAULT_LISTING_IMAGE = noImageAsset;
export const BADGE_POAC_IMAGE = badgePoacAsset;
export const LEGACY_FALLBACK_IMAGE_URL = "https://i.ibb.co/tpV3m2GW/no-image.png";

export const DEFAULT_AVATAR_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
      '<rect width="64" height="64" rx="32" fill="#E5E7EB"/>' +
      '<circle cx="32" cy="24" r="11" fill="#6B7280"/>' +
      '<path d="M14 54c2.8-9.2 9.8-14 18-14s15.2 4.8 18 14" fill="#6B7280"/>' +
    "</svg>"
  );

export function optimizeCloudinaryUrl(url, { width = 600, quality = "auto" } = {}) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const after = url.slice(idx + marker.length);
  if (/^(?:f_|q_|w_|c_)/.test(after)) {
    return url;
  }
  const transform = `f_auto,q_${quality},w_${width},c_limit/`;
  return `${url.slice(0, idx + marker.length)}${transform}${after}`;
}
