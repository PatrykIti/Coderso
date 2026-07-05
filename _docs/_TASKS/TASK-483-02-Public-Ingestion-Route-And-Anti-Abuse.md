# TASK-483-02: Public Ingestion Route And Anti-Abuse
# FileName: TASK-483-02-Public-Ingestion-Route-And-Anti-Abuse.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Public API / Security
**Estimated Effort:** Large
**Dependencies:** TASK-483-01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

Add the public **beacon collector**: a single public-write endpoint that accepts
minimal pageview/session events from the published site and persists them via the
TASK-483-01 repository. Because this is a public write surface, it MUST reuse the
existing forms/booking anti-abuse stack (HMAC nonce mirroring
`core/services/forms/submissionNonce.ts`), the `public_write` rate-limit bucket,
server-side bot/DNT filtering, and IP/PII redaction so no raw IP is ever stored
or logged.

**Captcha decision (resolved, binding for L02 and TASK-483-03-L01):** the beacon
does **NOT** call `enforceBotProtection` — the client snippet sends only
`{ event, nonce }` via `sendBeacon` and never acquires a captcha token, and the
real helper (`core/services/security/botProtection.ts`) throws
`bot_protection_required` (400) for every token-less request whenever bot
protection is enabled, which would silently kill the whole analytics pipeline.
Forms/booking themselves only enforce captcha when `access.requireCaptcha`
(`core/server/publicBookingApi.ts:379-387`,
`core/server/routes/formsRoutes.ts:195-204`); the beacon is a no-value write, so
nonce + `public_write` rate limit + `classifyBot`/DNT filtering are the complete
anti-abuse stack for this surface.

The endpoint is dispatched inside `handlePublicRequest` (public host, begins at
`core/server/publicSite.tsx:1467`), mirroring how `handlePublicBookingApi` is
dispatched at `core/server/publicSite.tsx:1473`.

## Security Contract

This subtask introduces a **public-write** API surface; the leaves carry the full
per-module detail (L01 nonce issuance, L02 route/Bun.serve wiring + rate limit,
L03 IP/PII redaction + bot/DNT). Summary contract for the surface:

- **Endpoint visibility:** PUBLIC WRITE (anonymous, cross-origin `sendBeacon`);
  no session, no admin scope.
- **Auth model:** trust derives from the HMAC nonce (mirroring
  `core/services/forms/submissionNonce.ts`), not a session cookie or bearer.
- **RBAC / CSRF:** N/A — anonymous public beacon, not an admin write; the nonce +
  bot/DNT filtering replace CSRF for this surface (detail in L01/L02).
- **Rate-limit bucket:** `public_write` (shared with forms/booking), enforced in
  L02 at the route boundary.
- **Strict validation:** the payload is validated through the L01
  `beaconRequestSchema` with `additionalProperties: false`; oversized and
  unknown-field requests are rejected (reject-unknown allowlist).
- **Anti-abuse stack:** HMAC nonce (L01) + `public_write` rate limit (L02) +
  server-side `classifyBot`/DNT filtering (L03). This is the COMPLETE stack for
  this no-value write; the beacon does **NOT** call `enforceBotProtection`
  (`core/services/security/botProtection.ts`) — see the binding captcha decision
  in the Overview above — because a token-less beacon would 400 whenever bot
  protection is enabled and kill the pipeline.
- **IP/PII handling:** no raw IP or PII is ever stored or logged; IP is reduced
  to a salted `visitorHash` and the referrer to host-only, per L03 and
  TASK-483-01.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-02-L01 | Beacon Payload Contract And Nonce Issuance | Medium | ✅ Done |
| TASK-483-02-L02 | Public Ingestion Route And Bun Serve Wiring | Large | ✅ Done |
| TASK-483-02-L03 | IP/PII Redaction And Bot/DNT Classification | Medium | ✅ Done |

## Dependencies

- TASK-483-01 (repository + domain contract). L02 depends on L01 + L03.

## Testing Requirements

- **Vitest** for L01 (payload schema + nonce sign/verify, Bun-free) and L03
  (pure IP-hash/UA/DNT classifiers).
- **Bun** for L02: `tests/integration/routes/*` for the dispatched collector and
  `tests/security/*` for nonce/HMAC rejection, captcha exemption (beacon stays
  `204` with bot protection enabled — see the captcha decision above), rate-limit
  `public_write` bucket, oversized/unknown-field rejection, and no-raw-IP/no-PII
  logging assertions.
- **Shared remote test DB:** all DB-backed assertions use uniquely scoped
  fixtures (unique per-run path/visitorHash keys), assert only on rows matching that
  key, and clean up only rows they created — never truncate/delete whole
  analytics tables and never depend on global table emptiness (the Postgres in
  `.env` is one shared render.com DB used concurrently by the owner and the
  TASK-482/484 streams).
- Security scanners per `_docs/SECURITY_SPEC.md` for the public-write change.
