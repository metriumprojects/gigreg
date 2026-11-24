import { useEffect } from "react";

const DEFAULT_TITLE = "GigMake - Build Anything";
const DEFAULT_DESCRIPTION =
  "GigMake connects you with verified experts, builders, and creators. Book hourly sessions, fixed-price builds, or request custom quotes.";
const SITE_NAME = "GigMake";

const stripHtml = (input = "") =>
  String(input)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text, maxLength = 160) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const upsertMetaTag = (attrName, attrValue, content) => {
  if (typeof document === "undefined") return;
  let tag = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!content) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonical = (href) => {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

export function useDocumentMeta({
  title,
  description,
  image,
  type = "website",
  url,
} = {}) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const resolvedTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const cleanedDescription = truncate(stripHtml(description)) || DEFAULT_DESCRIPTION;
    const resolvedUrl =
      url ||
      (typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "");
    const resolvedImage = typeof image === "string" && image.trim() ? image.trim() : "";

    document.title = resolvedTitle;
    upsertMetaTag("name", "description", cleanedDescription);
    upsertMetaTag("property", "og:site_name", SITE_NAME);
    upsertMetaTag("property", "og:type", type || "website");
    upsertMetaTag("property", "og:title", resolvedTitle);
    upsertMetaTag("property", "og:description", cleanedDescription);
    upsertMetaTag("property", "og:url", resolvedUrl);
    upsertMetaTag("property", "og:image", resolvedImage);
    upsertMetaTag("name", "twitter:card", resolvedImage ? "summary_large_image" : "summary");
    upsertMetaTag("name", "twitter:title", resolvedTitle);
    upsertMetaTag("name", "twitter:description", cleanedDescription);
    upsertMetaTag("name", "twitter:image", resolvedImage);
    upsertCanonical(resolvedUrl);

    return () => {
      document.title = DEFAULT_TITLE;
      upsertMetaTag("name", "description", DEFAULT_DESCRIPTION);
      upsertMetaTag("property", "og:type", "website");
      upsertMetaTag("property", "og:title", DEFAULT_TITLE);
      upsertMetaTag("property", "og:description", DEFAULT_DESCRIPTION);
      upsertMetaTag("property", "og:image", "");
      upsertMetaTag("name", "twitter:card", "summary_large_image");
      upsertMetaTag("name", "twitter:title", DEFAULT_TITLE);
      upsertMetaTag("name", "twitter:description", DEFAULT_DESCRIPTION);
      upsertMetaTag("name", "twitter:image", "");
    };
  }, [title, description, image, type, url]);
}
