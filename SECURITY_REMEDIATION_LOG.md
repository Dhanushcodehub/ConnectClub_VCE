# Connect Club VCE — Security Remediation Log

**Date:** November 27, 2026  
**Repository:** `ConnectClub_VCE`  
**Pre-Audit Backup Diff:** Saved outside repository (`pre_audit.patch`, `pre_audit_status.txt`).

All modifications below were applied conservatively to eliminate verified vulnerabilities and scalability/reliability defects without altering the visual design or removing intended application functionality.

---

## 1. New Security Infrastructure Modules Created

| File | Purpose | Findings Addressed |
|---|---|---|
| `src/lib/security/sanitizeUrl.ts` | `getSafeHref`, `getSafeMediaUrl`, `safeJsonLd`, `escapeHtml` helpers blocking `javascript:`, `vbscript:`, SVG data URIs, and JSON-LD `</script>` breakouts | SEC-10, SEC-11 |
| `src/lib/security/rateLimit.ts` | Firestore-backed transactional distributed rate limiter (`checkRateLimit`, `getClientIp`, `rateLimitExceededResponse`) using `_rate_limits` collection and SHA-256 bucket hashing | SEC-07, SEC-08 |
| `src/lib/security/admin2fa.ts` | HMAC-SHA256 signed `HttpOnly` cookie creation & constant-time verification bound to admin `uid` and `12h` TTL (`cc_admin_2fa`) | SEC-04 |
| `src/lib/security/__tests__/security.test.ts` | Unit tests covering XSS sanitization, JSON-LD escaping, `admin2fa` cookie verification/tampering, and registration identity validation | SEC-04, SEC-10, SEC-11 |

---

## 2. Modified Files & Exact Changes

### Authentication, Authorization & Rules
- **`src/lib/firebase/requestAuth.ts`** (SEC-01, SEC-04, SEC-12, SEC-16):
  - Enabled `auth.verifyIdToken(token, true)` (`checkRevoked = true`).
  - Required `email_verified === true` on primary admin email match.
  - Removed insecure `users/{uid}.role` fallback (`lookupRoleFromUsers`) and replaced with server-trusted `admins/{uid}` and email-verified `members` lookup.
  - Enforced server-side `cc_admin_2fa` cookie verification inside `requireAdminRequest` when `admins/{uid}.twoFactorEnabled` is `true` (`allowPending2FA` opt-out for `/api/admin/2fa`).
  - Added `verifyStaffTokenString(idToken, requiredPermission)` for Server Actions.
  - Sanitized `ADMIN_SDK_NOT_CONFIGURED` error text so env var hints are never leaked.
- **`firestore.rules`** (SEC-01, SEC-04, SEC-09):
  - Required `email_verified == true` inside `isAdmin()`.
  - Denied client reads/writes on `admin_secrets/{userId}` and `_rate_limits/{bucketId}`.
  - Locked `users/{userId}` writes against modifying `role`, `isAdmin`, `permissions`, `uid`, `email`, `provider`, and counter fields; added URL scheme checks.
  - Locked `event_registrations` and `certificates` writes to `isAdmin()`; locked `registrations` reads to `isStaff()`.
  - Locked `user_projects` creation to `status == 'pending'` and zeroed counters; blocked owner status/counter/ownership updates; restricted `user_projects` reads to `approved`, `isAdmin()`, or owner.
  - Restricted like/comment counter updates on `projects` and `user_projects` to valid `±1` / `+1` integer transitions.
  - Restricted club `messages`, `typing_status`, `typingStatus`, `unreadCounts` to `isStaff()`, enforced `senderEmail == request.auth.token.email`, and restricted message edits/deletes to author/`isAdmin()`.
  - Locked `direct_messages` `senderRole` / delete rules, restricted `notifications` creation to `isAdmin()` and owner updates to `['read']` only, blocked direct client creates on `contact_messages`, and validated `contactInquiries` / `feedback_forms` counter increments.
- **`storage.rules`** (SEC-05):
  - Replaced global authenticated write (`allow write: if request.auth != null`) with path-scoped (`events/`, `gallery/`, `projects/`) `isStaff()` uploads restricted to `<= 10MB` and allowed image/video MIME types (excluding SVG), `isAdmin()` deletes, and default deny elsewhere.

### API Routes & Server Actions
- **`src/app/admin/event-management/inspirex/issue-action.ts`** (SEC-02, SEC-20):
  - Enforced `verifyStaffTokenString(idToken, "inspirex_certificates")`, validated inputs, replaced N+1 per-participant user/certificate lookups with pre-fetched set + batched `db.getAll`, added audit logging, and sanitized error responses.
- **`src/app/admin/event-management/inspirex/certificates/page.tsx`** (SEC-02):
  - Updated `handleIssueCertificates` to pass `await user?.getIdToken()` to `issueInspirexCertificates`.
- **`src/app/api/admin/2fa/route.ts`** (SEC-04):
  - Implemented `GET` (status) and `POST` (`setup`, `enable`, `verify`, `disable`, `logout`) storing secrets in `admin_secrets/{uid}`, verifying TOTP server-side via `otplib`, rate-limiting verification attempts, migrating any legacy `admins/{uid}.twoFactorSecret`, logging audit events, and issuing/clearing the `cc_admin_2fa` cookie.
- **`src/app/api/users/sync-external/route.ts`** (SEC-03):
  - Switched to `requireUserRequest` + distributed rate limiting, forced matching against verified `users/{uid}.rollNo`, rejected conflicted multi-account roll ownership, skipped `status === "rejected"` and records claimed by other UIDs inside Firestore transactions.
- **`src/app/api/users/retroactive-sync/route.ts`** (SEC-26):
  - Added distributed rate limiting, invalid JSON handling, strict roll format validation, duplicate `normalizedRollNo` check, and transactional check-then-create atomicity.
- **`src/app/api/upload/route.ts`** (SEC-06):
  - Removed `image/svg+xml`, enforced strict base64 `data:image/*` / `data:video/*` URI patterns on JSON payloads (blocking Cloudinary SSRF), added binary magic-byte verification on multipart uploads, added distributed rate limiting, and removed raw `details` leaks.
- **`src/app/api/auth/register/route.ts`** (SEC-07):
  - Added per-IP and per-email rate limits, safe JSON parsing, `typeof password === "string"` and `8..128` length validation, bounded `department`/`yearOfStudy`, SMTP timeouts, and sanitized 500 error.
- **`src/app/api/auth/verify-otp/route.ts`** (SEC-07):
  - Added IP rate limit, email & 6-digit format validation, atomic Firestore `runTransaction` for OTP check/attempt counter/invalidation, explicit `role: "user"` on profile persistence, and sanitized error response.
- **`src/app/api/auth/resend-otp/route.ts`** (SEC-07):
  - Added IP rate limit, email regex validation, rejection of already-verified accounts, atomic `runTransaction` enforcing 60s cooldown & OTP rotation, SMTP timeouts, and sanitized error response.
- **`src/app/api/auth/complete-profile/route.ts`** (SEC-16):
  - Added rate limit, `validateRegistrationIdentity`, `getSafeMediaUrl` sanitization for `photoURL`, cross-account `normalizedRollNo` / `normalizedPhone` conflict checks, preserved existing custom claims, trusted only `token.email`, and sanitized errors.
- **`src/app/api/ai/chat/route.ts` & `src/app/api/chat/route.ts`** (SEC-08):
  - Added IP rate limiting (`25 / 5m`), bounded per-turn history content length, gated `x-ai-force-failover` to admins, removed env/upstream error leaks, and applied prompt guardrails + validation to legacy `/api/chat`.
- **`src/lib/ai/cache.ts` & `src/lib/ai/contextBuilder.ts`** (SEC-08, SEC-20):
  - Bypassed single-turn cache when conversation history is non-empty; added 60s TTL caching and context delimiter sanitization in `buildContext()`.
- **`src/app/api/contact/route.ts`** (SEC-07, SEC-16):
  - Added IP rate limiting (`5 / 15m`), safe JSON parsing, strict string typing, and sanitized 500 error.
- **`src/app/api/admin/access/route.ts`** (SEC-12, SEC-16):
  - Added email validation, `limit(100)` on list, `auth.revokeRefreshTokens(user.uid)` and `admin_secrets` cleanup on revoke, non-silent Firestore role sync, and `logAuditEvent` for grant/revoke.
- **`src/app/api/admin/create-member/route.ts`** (SEC-13):
  - Enforced `requireAdminRequest` before parsing body, added rate limit, email & 8..128 password validation, `emailVerified: true`, audit log, and sanitized errors.
- **`src/app/api/admin/approve-registration/route.ts`** (SEC-16):
  - Enforced `authErrorResponse`, handled invalid JSON, validated `externalDocId` (reject `/`), and enforced strict `"approve" | "reject"` action enum.
- **`src/app/api/account/delete/route.ts`** (SEC-18):
  - Added rate limit, `auth_time <= 30m` recency check, staff check solely from verified token roles, and paginated cascade cleanup (including project comments).
- **`src/app/api/generate-member-list/route.ts`** (SEC-16, SEC-20):
  - Handled malformed JSON, capped documents (`<= 50`) and total rows (`<= 3000`), stripped XML control chars in `escapeXml`, switched to async `fs.promises.readFile`, deduplicated ZIP entry names, typed `MemberRow`, removed unused imports, and sanitized errors.
- **`src/app/api/inspirex-registrations/route.ts` & `attendance/route.ts`** (SEC-16, SEC-20):
  - Added query caps (`limit`), validated `registrationId` without `/`, logged audit event on attendance changes, used `authErrorResponse`, and removed raw `details` leaks.
- **`src/app/api/webhooks/external-registration/route.ts`** (SEC-16):
  - Removed wildcard `CORS` headers, replaced length-leaking pre-check with constant-time SHA-256 `timingSafeEqual`, validated `eventId`/`rollNo`/`eventTitle` formats/lengths, and capped `users` query (`limit(5)`).

### Headers, Frontend Security, Scalability & Scripts
- **`next.config.ts`** (SEC-15): Added `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Cache-Control: no-store` on `/api/(.*)`.
- **`src/app/admin/login/page.tsx`, `src/app/admin/settings/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/_components/AdminSidebar.tsx`** (SEC-04): Replaced client-side TOTP verification & `sessionStorage` gate with `/api/admin/2fa` server verification and sign-out cookie clearing; blocked child render until 2FA status resolves; removed `any` types in `settings/page.tsx`.
- **`src/app/projects/[slug]/page.tsx` & `src/app/layout.tsx`** (SEC-10, SEC-11): Applied `safeJsonLd`, `getSafeHref`, and `getSafeMediaUrl`.
- **`src/app/events/[slug]/EventDetailClient.tsx`** (SEC-11): Escaped HTML before `**bold**` formatting, validated `registrationLink` + added `noopener,noreferrer` on `window.open`, and sanitized banner URLs.
- **`src/components/ai/MarkdownContent.tsx`, `src/app/u/profile/[id]/page.tsx`, `src/app/u/projects/page.tsx`, `src/app/u/events/page.tsx`, `src/app/u/notifications/page.tsx`, `src/app/admin/notifications/page.tsx`, `src/app/admin/members/page.tsx`** (SEC-11, SEC-21): Added `getSafeHref` URL sanitization on all user/CMS links; fixed `banner` and `commentsCount` rendering on `/u/projects`; added `limit(100)` to `u/notifications`.
- **`src/lib/firebase/users.ts`, `src/lib/firebase/chat.ts`, `src/lib/firebase/feedbackForms.ts`, `src/app/feedback/[id]/page.tsx`** (SEC-17, SEC-19, SEC-20): Removed PII-containing `fallbackUsers`; filtered `getApprovedUserProjects` by `status == "approved"` + `limit(50)`; added `approvedOnly` filter on public profile projects; hardened `submitUserProject`; bounded `getAllUsers`, `subscribeToUnreadCounts`, `subscribeToLastMessages`; enforced `requireLogin`/`collectRollNo` and best-effort `responsesCount` increment on anonymous feedback submits.
- **`src/app/admin/students/page.tsx`, `src/app/admin/messages/page.tsx`, `src/app/admin/gallery/page.tsx`, `src/app/member/gallery/page.tsx`, `src/components/chat/GlobalChat.tsx`, `src/components/chat/GlobalChatListener.tsx`** (SEC-20): Bounded `onSnapshot` listeners, used chunked `commitInChunks` in `handleMarkAllRead`, added `URL.revokeObjectURL` cleanups, restricted `GlobalChatListener` to staff roles + guarded `Notification`, fixed stale scroll state, throttled typing writes (`1.5s`), and cleaned up timeouts.
- **`scripts/create-admin.js`** (SEC-14): Replaced hardcoded `"password123"` with required `ADMIN_INITIAL_PASSWORD` environment variable check (`>= 12` chars).
