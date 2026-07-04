# TASK-483-02: Public Ingestion Route And Anti-Abuse
# FileName: TASK-483-02-Public-Ingestion-Route-And-Anti-Abuse.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Public API / Security
**Estimated Effort:** Large
**Dependencies:** TASK-483-01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

Add the public **beacon collector**: a single public-write endpoint that accepts
minimal pageview/session events from the published site and persists them via the
TASK-483-01 repository. Because this is a public write surface, it MUST reuse the
existing forms/booking anti-abuse stack (HMAC nonce + `enforceBotProtection`),
the `public_write` rate-limit bucket, server-side bot/DNT filtering, and IP/PII
redaction so no raw IP is ever stored or logged.

The endpoint is dispatched inside `handlePublicRequest` (public host), mirroring
how `handlePublicBookingApi` is dispatched at `core/server/publicSite.tsx:1455`.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-02-L01 | Beacon Payload Contract And Nonce Issuance | Medium | ⏳ To Do |
| TASK-483-02-L02 | Public Ingestion Route And Bun Serve Wiring | Large | ⏳ To Do |
| TASK-483-02-L03 | IP/PII Redaction And Bot/DNT Classification | Medium | ⏳ To Do |

## Dependencies

- TASK-483-01 (repository + domain contract). L02 depends on L01 + L03.

## Testing Requirements

- **Vitest** for L01 (payload schema + nonce sign/verify, Bun-free) and L03
  (pure IP-hash/UA/DNT classifiers).
- **Bun** for L02: `tests/integration/routes/*` for the dispatched collector and
  `tests/security/*` for nonce/HMAC rejection, captcha threshold, rate-limit
  `public_write` bucket, oversized/unknown-field rejection, and no-raw-IP/no-PII
  logging assertions.
- Security scanners per `_docs/SECURITY_SPEC.md` for the public-write change.
