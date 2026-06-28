# TASK-483-02-L03: IP/PII Redaction And Bot/DNT Classification
# FileName: TASK-483-02-L03-IP-PII-Redaction-And-Bot-DNT-Classification.md

**Parent Subtask:** TASK-483-02
**Priority:** High
**Category:** Tools / Analytics / Security / Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Turn untrusted request signals (IP, User-Agent, DNT header) into
  privacy-safe, server-derived values: a non-reversible salted visitor hash, a
  device classification, a bot verdict, and a DNT/consent decision. These feed
  the route (L02) and repository (TASK-483-01-L03).
- **Owning module(s) to create:**
  `core/services/analytics/visitorIdentity.ts` (hash + device/bot/DNT helpers).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (Email/PII HMAC pattern),
  `_docs/DATA_MODEL.md`.
- **Out-of-scope:** the HTTP route + rate-limit + captcha wiring (L02), DB writes.

## Security Contract

- **Endpoint visibility:** none (privacy/security helper module).
- **Auth model / RBAC / CSRF:** N/A.
- **Rate-limit bucket:** N/A (route enforces `public_write`).
- **Validation schema-owner module:** N/A (operates on request metadata, not a
  payload body).
- **Anti-abuse controls:** `classifyBot(userAgent)` returns a verdict the route
  uses to drop obvious crawlers before persistence (bot filtering), independent
  of reCAPTCHA.
- **Secret/PII handling (core of this leaf):**
  - The visitor identity is `HMAC-SHA256(ANALYTICS_IP_HASH_SECRET, ip + "|" + ua + "|" + dailySalt)`
    where `dailySalt = yyyy-mm-dd` (UTC). This is **one-way**: raw IP/UA are never
    persisted or logged, and the daily salt rotation prevents cross-day visitor
    correlation, matching the `PII_HASH_KEY` posture in `_docs/SECURITY_SPEC.md`.
  - Fail-fast `analytics_ip_hash_secret_missing` if the secret is absent.
  - Honor Do-Not-Track: if the `DNT: 1` header (or a configured consent signal)
    is present, the route skips ingestion entirely; this helper exposes
    `shouldHonorDnt(headers)` so the policy is testable and centralized.

## Implementation Pseudocode

```ts
import { createHmac } from "node:crypto";
import { ApiError } from "../../server/errorHandler";
import type { TrafficDeviceClass } from "./trafficTypes";

const resolveIpHashSecret = () => {
  const s = process.env.ANALYTICS_IP_HASH_SECRET?.trim();
  if (!s) throw new ApiError("analytics_ip_hash_secret_missing", "Analytics IP hash secret is missing", 500);
  return s;
};

const dailySalt = (now = new Date()) => now.toISOString().slice(0, 10); // UTC day

export function computeVisitorHash(args: { ip?: string; userAgent?: string; now?: Date }): string {
  const ip = (args.ip ?? "0.0.0.0").trim();
  const ua = (args.userAgent ?? "").slice(0, 512);
  const payload = `${ip}|${ua}|${dailySalt(args.now)}`;
  return createHmac("sha256", resolveIpHashSecret()).update(payload).digest("hex");
}

const BOT_RE = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;
export function classifyBot(userAgent?: string): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

export function classifyDevice(userAgent?: string): TrafficDeviceClass {
  if (classifyBot(userAgent)) return "bot";
  if (!userAgent) return "unknown";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function shouldHonorDnt(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}
```

Data flow: route extracts `ip` (via the existing `x-forwarded-for` resolution in
`httpServer.ts`), `user-agent`, and DNT header; calls `shouldHonorDnt` (early
return), `classifyBot` (drop), `classifyDevice` + `computeVisitorHash` (persist).
The hash and device class are the only request-derived values that reach the DB.

Error handling: missing secret → `analytics_ip_hash_secret_missing` (500) mapped
at the route. Bot/DNT are not errors — they short-circuit to a 204 No Content so
the client cannot distinguish "dropped" from "accepted".

Regression-test shape (Vitest,
`tests/vitest/analytics/visitorIdentity.test.ts`):

```ts
test("hash is stable within a day and rotates across days", () => {
  process.env.ANALYTICS_IP_HASH_SECRET = "k";
  const d1 = new Date("2026-06-28T10:00:00Z");
  const d2 = new Date("2026-06-29T10:00:00Z");
  const a = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d1 });
  const b = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d1 });
  const c = computeVisitorHash({ ip: "1.2.3.4", userAgent: "UA", now: d2 });
  expect(a).toBe(b);
  expect(a).not.toBe(c);
  expect(a).not.toContain("1.2.3.4"); // raw IP never present
});
test("DNT honored", () => {
  expect(shouldHonorDnt(new Headers({ dnt: "1" }))).toBe(true);
});
test("crawler UA classified as bot", () => {
  expect(classifyDevice("Googlebot/2.1")).toBe("bot");
});
```

## Testing Requirements

- **Vitest** only (Bun-free; `node:crypto` allowed): hash stability/rotation,
  no-raw-IP, bot/device classification, DNT/GPC honoring, missing-secret fail-fast.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
