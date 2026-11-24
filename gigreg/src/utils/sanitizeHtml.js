import DOMPurify from "dompurify";

let hookRegistered = false;

const ensureHooks = () => {
  if (hookRegistered || typeof window === "undefined") return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  hookRegistered = true;
};

const SANITIZE_CONFIG = {
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "svg",
    "math",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "option",
    "meta",
    "link",
    "base",
    "template",
    "applet",
  ],
  FORBID_ATTR: ["style", "srcdoc", "formaction"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
};

export function sanitizeHtml(rawHtml) {
  if (typeof rawHtml !== "string" || !rawHtml) return "";

  if (typeof window === "undefined") {
    return rawHtml.replace(/<[^>]*>/g, "");
  }

  ensureHooks();
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
}

export default sanitizeHtml;
