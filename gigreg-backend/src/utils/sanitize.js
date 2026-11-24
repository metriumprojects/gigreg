const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);

export const escapeRegex = (value, maxLength = 120) =>
  String(value ?? "")
    .trim()
    .slice(0, maxLength)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DANGEROUS_HTML_TAGS =
  "script|style|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link|base|template|applet";

export const sanitizeRichHtml = (input) => {
  if (typeof input !== "string") return "";
  let html = input;

  // Strip HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Strip dangerous paired tags and their contents
  const pairedTagRegex = new RegExp(
    `<(${DANGEROUS_HTML_TAGS})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
    "gi"
  );
  let previous;
  do {
    previous = html;
    html = html.replace(pairedTagRegex, "");
  } while (html !== previous);

  // Strip dangerous self-closing or unclosed tags
  const singleTagRegex = new RegExp(`<\\/?(${DANGEROUS_HTML_TAGS})\\b[^>]*>`, "gi");
  html = html.replace(singleTagRegex, "");

  // Strip inline event handler attributes (onclick=, onerror=, onload=, etc.)
  html = html.replace(
    /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ""
  );

  // Strip srcdoc / formaction attributes
  html = html.replace(
    /\s+(?:srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ""
  );

  // Neutralize javascript:, vbscript:, and data:text/html URLs inside href/src/action
  html = html.replace(
    /\b(href|src|action)\s*=\s*(["'])\s*(?:javascript|vbscript|data\s*:\s*text\/html)[\s\S]*?\2/gi,
    '$1="#"'
  );
  html = html.replace(
    /\b(href|src|action)\s*=\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^\s>]*/gi,
    '$1="#"'
  );

  // Strip CSS expression() / url(javascript:...) inside style attributes
  html = html.replace(
    /\s+style\s*=\s*(["'])([\s\S]*?)\1/gi,
    (match, quote, styleContent) => {
      if (/expression\s*\(|javascript\s*:|vbscript\s*:|@import|url\s*\(/i.test(styleContent)) {
        return "";
      }
      return match;
    }
  );

  return html;
};

const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const sanitizeMongoObject = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 12) return value;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      sanitizeMongoObject(value[i], depth + 1);
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key) || key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeMongoObject(value[key], depth + 1);
  }
  return value;
};
