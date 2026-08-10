# TASK-556-03: Designer API and Solution Kits Setup UI Handoff
# FileName: TASK-556-03-Designer-API-And-Solution-Kits-Setup-UI-Handoff.md

**Parent Task:** TASK-556
**Priority:** High
**Category:** Designer / Internal API / Admin UI / Setup
**Estimated Effort:** Large
**Dependencies:** External gate from TASK-556; TASK-556-02 landed receipt green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Expose the strict static seed/reopen route/client and mount one shared
`Customize in Designer` component in the explicit post-TASK-555 Solution Kits
and Setup host regions. Existing-workspace success reports the current
authoritative active revision/version/navigable state rather than a synthetic
seed-time `ready` projection. Outcome and workspace fields come from one final
locked service snapshot, never an unlocked reload. Direct install remains
byte/behavior unchanged.

## Sub-Tasks

| Order | ID | Scope | Status |
|---:|---|---|---|
| 1 | TASK-556-03-L01 | Service, route, strict client, security/error tests | ⏳ To Do |
| 2 | TASK-556-03-L02 | Shared CTA and two explicit host-slot integrations | ⏳ To Do |

L01 consumes TASK-556-02's complete receipt; L02 consumes L01's reviewed receipt.

## Route Contract

`POST /admin/api/designer/static-starters/:sourceId/workspaces` accepts exactly
`{ expectedReleaseDescriptorDigest, idempotencyKey }`, requires session plus all
three permissions, and extends terminal `registerDesignerRoutes`/
`DesignerApiFacade`. Its prefixless descriptor uses the existing
`RoutePreBodyPolicyV1` fields: Admin session, require-all permissions,
`rateLimitBucket: "admin_write"`, `csrf: "required"`, terminal owner admission,
exact JSON content type, 1 KiB wire/body cap, `parseErrorCode: "invalid_json"`,
and the terminal transport-owned cap error code (currently
`payload_too_large`) without an invented per-route field, plus strict private no-store
`RouteResponseV1` responses. Execution order is exactly host/IP/global request
context -> exact route match -> wire `Content-Length` syntax/cap -> session ->
static require-all RBAC -> rate -> CSRF -> owner admission -> content type/parse.
Strict request-schema failures map separately to `designer_static_seed_invalid`.
The one terminal `DesignerApiFacade`, centralized `mapDesignerError`, static
runtime-facade/contribution successor regions, cache invalidation/broadcast, and
single route mount remain authoritative.

## Security Contract

- **Visibility:** internal same-origin POST only.
- **Auth/RBAC:** session; require all `solution-kits:read`, `designer:read`, `designer:write`.
- **CSRF/rate:** the one terminal pre-body transport follows host/IP/global
  request context -> exact route match -> wire `Content-Length` syntax/cap ->
  session -> static require-all RBAC -> `admin_write` rate -> CSRF -> owner
  admission -> content type/parse; no new bucket or second body transport.
- **Validation:** strict params/body/response; server-owned actor/release/workspace/href.
- **Anti-abuse:** no public write, nonce/HMAC/reCAPTCHA.
- **Privacy/cache:** no package or privileged state in browser persistence; response no-store.

## Testing Requirements

Run route registration/security/idempotency/error tests, strict client/UI tests,
Admin boundary/build checks, lint/types, source guards, diff check, and <=1000 gate.

## Documentation Updates Required

Hand route matrix, UI states, host regions, canonical navigation, and error map to
TASK-556-04-L02; no shared docs/metadata here.
