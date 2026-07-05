# TASK-483-03: Front-End Tracking Snippet
# FileName: TASK-483-03-Front-End-Tracking-Snippet.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-483-02
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

Inject a privacy-respecting tracking snippet on the published site so real
pageviews/sessions reach the TASK-483-02 collector. The snippet is minimal,
honors Do-Not-Track / consent, carries the rotating beacon nonce, and uses
`navigator.sendBeacon` with a small JSON payload. Canonical delivery: an
inline IIFE (built by L01's `buildTrackingScript`, which embeds the per-render
nonce) appended before `</body>` on every live render — never on previews. A
`Bun.file`-served static asset route (`/_analytics/a.js`) is an OPTIONAL L02
variant, not the primary design.

## Security Contract

This subtree adds only a **public-read** delivery surface (the inline snippet in
public HTML, plus the OPTIONAL `Bun.file`-served `GET /_analytics/a.js`); the
leaves carry the full per-module detail (L01 the script/payload builder + client
DNT/GPC guard, L02 the injection point, settings gate, preview exclusion, and the
optional static route). Summary contract for the surface, consistent with the
stream-level Security Contract in the parent
(`TASK-483_Real_Web_Analytics_Pipeline.md`) and the sibling 02/04 contracts:

- **Endpoint visibility:** PUBLIC READ only — a static script asset. The inline
  IIFE adds no endpoint; the optional `GET /_analytics/a.js` is `Bun.file`-served
  with immutable cache headers.
- **Auth model / RBAC / CSRF:** N/A — anonymous read of a non-secret static
  script; there is no inbound payload on this surface (ingestion lives in
  TASK-483-02).
- **Rate-limit bucket:** `public_read` if the static route lands; the inline
  variant adds no new endpoint.
- **DNT / consent:** the snippet honors Do-Not-Track / GPC / consent and
  short-circuits client-side before any network call (L01); the server also
  honors DNT (TASK-483-02-L03). When `analytics.trackingEnabled` is `false` the
  script is not injected at all (L02 settings gate).
- **Anti-abuse:** the per-render HMAC beacon nonce (`createBeaconNonce()`,
  TASK-483-02-L01) is minted fresh per page and never reused/baked into a cached
  asset. This subtree does **NOT** call `enforceBotProtection`
  (`core/services/security/botProtection.ts`) — a token-less beacon would 400
  whenever bot protection is enabled and kill the pipeline; this is the binding
  captcha-exemption decision shared with TASK-483-02's Security Contract.
- **Secret/PII handling:** the snippet embeds no secret; the client sends no raw
  IP or PII (redaction happens server-side per TASK-483-01/02-L03).
- **Preview exclusion (mandatory):** the snippet is never injected on preview
  renders, so admin preview traffic never pollutes the analytics tables (L02).

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-03-L01 | Tracking Snippet Asset And Payload Builder | Medium | ✅ Done |
| TASK-483-03-L02 | Public Site Injection And Snippet Delivery Route | Medium | ✅ Done |

## Dependencies

- TASK-483-02 (collector endpoint + nonce issuance). L02 depends on L01.

## Testing Requirements

- **Vitest** for L01 (snippet/payload builder string output, DNT guard) and the
  injected-HTML assertions in L02 (`renderDocument` uses `renderToString`, which
  is Bun-free → `tests/vitest/ui-integration/*`), including the
  preview-excluded assertion.
- **Bun** for L02's `analytics.trackingEnabled` settings round-trip persistence
  test; the `Bun.file` delivery + `handlePublicRequest` serving smoke
  (`tests/integration/routes/*`) applies ONLY if the optional static
  `/_analytics/a.js` route lands.
