# TASK-020-11: Security Hardening (Auth, Public, Admin) + Settings UX
# FileName: TASK-020-11_Security_Hardening_and_Settings_UX.md

**Priority:** High  
**Category:** Core/Security + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-020-01..10, TASK-036, TASK-047  
**Status:** To Do  

---

## Overview

Harden security across auth, admin, and public endpoints with a WordPress-like approach:
- strict protections on auth and public write endpoints,
- safe, user-friendly admin defaults that do not block normal work,
- clear, non-technical Security Settings UI with sensible presets.

This task also clarifies internal vs public endpoints and upgrades rate limiting to handle shared/variable IPs.

---

## Decisions

- Bot protection: Google reCAPTCHA v3.
- Admin rate limits: bypass for authenticated users (WordPress-like).
- Presets: apply-only with a Custom option.
- reCAPTCHA v3 enforced in dev and prod; thresholds per action (login 0.5, reset 0.6, public_write 0.5).
- Password hashing: add optional pepper (ENV).
- Email encryption at rest: HMAC hash + AES-GCM columns.
- Admin static assets: protect with `public_read` bucket (high limit) + CDN/WAF if available.
- Public write endpoints: `POST /forms/:id/submissions` (auth endpoints remain in `auth` bucket).

## Goals

1. Auth endpoints are strongly protected (anti-bot + strict rate limits).
2. Public endpoints are protected against abuse (write stricter than read).
3. Admin endpoints do not rate-limit authenticated users into lockouts.
4. Rate limiting considers shared or variable IPs.
5. Security Settings UI is split into clear sections with tooltips and presets.
6. Documentation spells out behaviors in plain language.

---


## Config Source Policy

- **ENV-only**: critical secrets required for safe boot (DB URL, master keys, encryption keys, password pepper).
- **UI Settings**: optional security features that can be disabled at boot (e.g., reCAPTCHA, rate limits, headers), configurable runtime.
- If a feature is enabled in UI but missing required keys, it should fail fast with a clear error.

## Scope

### 1) Auth Hardening
- Verify password hashing strategy (argon2id params, optional pepper).
- Add login throttling by identifier + IP (email + IP), not only IP.
- Add reCAPTCHA v3 protection for login/reset and public write endpoints.
- Confirm CSRF + strict origin validation on auth endpoints.

### 2) Rate Limiting Tiers
- Introduce bucket separation:
  - `auth` (strict)
  - `admin_read` (high limit)
  - `admin_write` (moderate limit)
  - `public_read` (high limit)
  - `public_write` (strict)
  - `assistant` (existing)
- Key strategy:
  - Authenticated: `userId` + `bucket`
  - Anonymous: `IP` + optional `User-Agent` hash
- Handle shared IP (avoid blocking teams behind one NAT).
- Allow per-bucket configuration in settings.

### 3) Public Endpoint Hardening
- Explicitly list public endpoints and their buckets.
- Apply stricter limits to POST/PUT/PATCH/DELETE vs GET.
- Add reCAPTCHA v3 gate for public write endpoints.

### 4) Security Headers + Origin Controls
- Review/strengthen admin CSP, HSTS, and referrer policy defaults.
- Ensure admin CORS allows only configured origins.
- Keep preview endpoints locked to valid preview tokens + strict origin.

### 5) Internal vs Public Routing
- Audit routes to ensure internal endpoints require auth + RBAC.
- Add tests that unauthenticated calls to internal routes are rejected.

### 6) Security Settings UX
- Restructure Settings → Security into tabs/sections:
  - Auth & Bot Protection
  - Rate Limits
  - CSRF/CORS
  - Headers
  - Sessions
  - IP Allowlist
- Add non-technical tooltips with “Recommended” values.
- Add presets: `WordPress-like`, `Strict`, `Relaxed`.

---


## Sub-Tasks

| ID | Title | Owner | Status |
| --- | --- | --- | --- |
| TASK-020-11-01 | Rate Limit Buckets + Keying Strategy | — | To Do |
| TASK-020-11-02 | Auth Hardening + Bot Protection | — | To Do |
| TASK-020-11-03 | Public Endpoint Policy + Protection | — | To Do |
| TASK-020-11-04 | Security Settings Model + API | — | To Do |
| TASK-020-11-05 | Security Settings UI + Presets | — | To Do |
| TASK-020-11-06 | PII (Email) Encryption Decision + Implementation | — | To Do |

---

## Implementation Checklist

| Area | File(s) | Action |
| --- | --- | --- |
| Rate limit buckets | `core/server/middleware/rateLimit.ts` | add bucket types + key strategy + per-bucket config |
| Route policy | `core/server/httpServer.ts` | choose bucket by path + method + auth |
| Settings model | `core/services/settings/securitySettings.ts` | add bucket config + defaults |
| Settings API | `core/services/settings/*` | validation + persistence |
| Admin UI | `core/admin/ui/settings/SecuritySettingsPage.tsx` | new sections + tooltips + presets |
| Auth | `core/server/routes/authRoutes.ts` | add bot checks + stricter limits |
| Public routes | `core/server/publicSite.tsx` | bucket mapping for public read/write |
| Docs | `_docs/SECURITY_SPEC.md` | explain tiers + recommended defaults |

---

## Testing Requirements

- `tests/unit/security/rateLimit.test.ts`
  - per-bucket limits
  - authenticated user keying
  - shared IP scenario
- `tests/integration/routes/auth.test.ts`
  - login throttling
  - bot protection (if enabled)
- `tests/unit/settings/securitySettings.test.ts`
  - validation of new rate limit fields
- `tests/unit/ui/security-settings.test.tsx`
  - sections + tooltips + preset apply

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md` (rate limit errors / settings)
- `_docs/SETTINGS.md` (Security UI overview)
- Changelog entry when done.
