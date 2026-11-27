import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escapeHtml,
  getSafeHref,
  getSafeMediaUrl,
  safeJsonLd,
} from "../sanitizeUrl";
import {
  createTwoFactorCookieValue,
  parseCookieHeader,
  verifyTwoFactorCookieValue,
} from "../admin2fa";
import { validateRegistrationIdentity } from "../../registrations/validation";

describe("sanitizeUrl & XSS prevention", () => {
  it("blocks javascript:, vbscript:, data:, and protocol-relative URLs in hrefs", () => {
    assert.equal(getSafeHref("javascript:alert(1)"), null);
    assert.equal(getSafeHref("  JaVaScRiPt:alert(1) "), null);
    assert.equal(getSafeHref("java\u0000script:alert(1)"), null);
    assert.equal(getSafeHref("vbscript:msgbox(1)"), null);
    assert.equal(getSafeHref("data:text/html,<script>alert(1)</script>"), null);
    assert.equal(getSafeHref("//evil.example.com"), null);
  });

  it("permits http, https, mailto, and safe relative paths", () => {
    assert.equal(getSafeHref("https://github.com/connectclub"), "https://github.com/connectclub");
    assert.equal(getSafeHref("http://localhost:3000/test"), "http://localhost:3000/test");
    assert.equal(getSafeHref("mailto:support@connectclubvce.in"), "mailto:support@connectclubvce.in");
    assert.equal(getSafeHref("/u/dashboard"), "/u/dashboard");
    assert.equal(getSafeHref("/u/dashboard", { allowRelative: false }), null);
  });

  it("rejects SVG data URIs and javascript URLs in media helper", () => {
    assert.equal(
      getSafeMediaUrl("data:image/svg+xml;base64,PHN2Zz4="),
      "/images/placeholder.jpg"
    );
    assert.equal(getSafeMediaUrl("javascript:alert(1)"), "/images/placeholder.jpg");
    assert.equal(
      getSafeMediaUrl("data:image/png;base64,iVBORw0KGgo="),
      "data:image/png;base64,iVBORw0KGgo="
    );
    assert.equal(
      getSafeMediaUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg"),
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );
  });

  it("escapes HTML and JSON-LD script breakouts", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert('xss')">`),
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;"
    );
    const serialized = safeJsonLd({ name: "</script><script>alert(1)</script>" });
    assert.ok(!serialized.includes("</script>"));
    assert.ok(serialized.includes("\\u003c/script\\u003e"));
  });
});

describe("admin2fa HMAC cookie verification", () => {
  it("verifies cookie bound to exact admin uid and rejects tampering/other uids", () => {
    process.env.ADMIN_2FA_COOKIE_SECRET = "test-audit-secret-key-at-least-32-chars";
    const cookieVal = createTwoFactorCookieValue("admin-uid-123");
    assert.ok(cookieVal);

    assert.equal(verifyTwoFactorCookieValue(cookieVal, "admin-uid-123"), true);
    assert.equal(verifyTwoFactorCookieValue(cookieVal, "attacker-uid-999"), false);
    assert.equal(verifyTwoFactorCookieValue(cookieVal + "x", "admin-uid-123"), false);
    assert.equal(verifyTwoFactorCookieValue(undefined, "admin-uid-123"), false);

    const parsed = parseCookieHeader(`other=1; cc_admin_2fa=${encodeURIComponent(cookieVal)}`, "cc_admin_2fa");
    assert.equal(verifyTwoFactorCookieValue(parsed, "admin-uid-123"), true);
  });
});

describe("registration identity validation", () => {
  it("validates valid student identity and rejects invalid fields", () => {
    assert.equal(
      validateRegistrationIdentity({
        name: "Ananya Reddy",
        rollNo: "24881A0501",
        email: "ananya@vce.ac.in",
        phone: "9876543210",
      }),
      null
    );
    assert.ok(
      validateRegistrationIdentity({
        name: "A",
        rollNo: "24881A0501",
        email: "ananya@vce.ac.in",
        phone: "9876543210",
      })
    );
    assert.ok(
      validateRegistrationIdentity({
        name: "Ananya",
        rollNo: "24",
        email: "ananya@vce.ac.in",
        phone: "9876543210",
      })
    );
  });
});
