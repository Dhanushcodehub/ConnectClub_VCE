/**
 * URL, HTML, and JSON-LD sanitization helpers to prevent XSS, javascript: URI
 * injection, and script-tag breakout.
 */

const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Returns a sanitized URL suitable for <a href>, <Link href>, or window.open,
 * or null if empty / unsafe (such as javascript:, data:, vbscript:).
 */
export function getSafeHref(
  rawUrl: unknown,
  options: { allowRelative?: boolean } = {}
): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Strip ASCII control chars & zero-width whitespace often used to obfuscate schemes
  const cleaned = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (!cleaned) return null;

  const { allowRelative = true } = options;
  if (allowRelative && cleaned.startsWith("/") && !cleaned.startsWith("//")) {
    return cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates URLs used inside <img>/<video> or CSS url(...) backgrounds.
 * Permits relative paths, https:/http: URLs, and safe raster data:image/* URIs
 * (explicitly rejecting data:image/svg+xml and javascript:).
 */
export function getSafeMediaUrl(rawUrl: unknown, fallback = "/images/placeholder.jpg"): string {
  if (typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!trimmed) return fallback;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  if (/^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // invalid URL
  }
  return fallback;
}

/**
 * Safely encodes an arbitrary object for <script type="application/ld+json">
 * by escaping `<` so `</script>` inside user-controlled fields cannot break out.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Escapes HTML special characters before lightweight formatting replacements.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
