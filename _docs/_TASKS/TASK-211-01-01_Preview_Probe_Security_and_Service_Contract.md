# TASK-211-01-01: Preview Probe Security and Service Contract
# FileName: TASK-211-01-01_Preview_Probe_Security_and_Service_Contract.md

**Priority:** High
**Category:** CMS/Pages + Runtime Preview + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-211-01
**Status:** To Do

---

## Overview

Define and implement the bounded preview probe contract needed by Pages runtime
preview failure detection.

This task exists because browser iframe `onLoad` cannot reliably distinguish
usable preview HTML from an HTTP error document. The probe must be server-owned
or response-owned by the existing preview route so it can inspect the status
without exposing an arbitrary URL fetch primitive to the browser.

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/routes/pageRoutes.ts`
- `core/server/validation/pageSchemas.ts` if preview payload validation needs a
  schema extension.
- `core/services/pages/previewService.ts`
- `core/server/utils/previewUrls.ts`
- `core/admin/services/pagesClient.ts`
- `tests/integration/routes/pages.test.ts`
- `tests/unit/pages/previewService.test.ts`
- `tests/vitest/admin/pagesClient.test.ts`

## Implementation Direction

- Prefer one of these bounded contracts:
  - extend `POST /pages/:id/preview` with optional `probe: true` and response
    `probe: { ok, status, reason, targetLabel }`;
  - or add `POST /pages/:id/preview/probe` if separating token generation from
    probing is cleaner.
- Do not add `POST /preview/probe { url }`.
- Probe only the generated preview URL or a server-derived URL that matches the
  configured preview URL policy.
- Use HEAD first when supported; fall back to a minimal GET only when necessary.
- Use a short timeout and no response body persistence.
- Normalize result codes into a small UI-safe enum, for example:
  `ok`, `unreachable`, `http_error`, `redirect_blocked`, `timeout`.

## Pseudocode

```ts
const result = await createPreviewToken(...);
const previewUrl = resolvePreviewUrl(...);

const probe = payload.probe
  ? await probeGeneratedPreviewUrl(previewUrl, {
      allowedOrigins: resolvePreviewAllowedOrigins(ctx),
      timeoutMs: 1500,
    })
  : undefined;

return json({
  token: result.token,
  previewUrl,
  expiresAt: result.expiresAt,
  probe: probe ? redactPreviewProbeResult(probe) : undefined,
});
```

## Security Contract

- Visibility: internal admin API only.
- Auth model: authenticated admin session/admin API key path.
- RBAC: `content:read`.
- CSRF: required for POST preview/probe calls.
- Rate-limit bucket: admin read/probe bucket; timeout-limited outbound request.
- Reject-unknown validation:
  - reject unknown payload fields;
  - clamp `ttlMinutes` to the existing preview token policy;
  - accept only documented boolean probe option if added.
- Anti-abuse:
  - no arbitrary browser-provided URL;
  - allow only generated preview URL origins or configured public/preview base
    URL origins;
  - reject redirects outside approved origins;
  - redact `token` and `device` from `targetLabel`;
  - do not return fetched body, response headers, cookies, or internal network
    details.

## Testing Requirements

- Bun route tests:
  - preview probe success returns `ok: true`;
  - preview probe 404/503 returns `ok: false` with sanitized status/reason;
  - unknown fields are rejected;
  - probe diagnostics do not include the token query value;
  - disallowed redirect/origin is rejected.
- Unit tests for any probe helper:
  - allowed-origin matching;
  - token redaction;
  - timeout mapping;
  - redirect mapping.
- Vitest admin client tests:
  - optional `probe` metadata is normalized;
  - legacy responses without `probe` still work.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The preview probe cannot be used as a generic SSRF primitive.
2. Probe result is useful enough for the admin UI to avoid blank/raw iframe
   failures.
3. Existing preview token issuance remains backward compatible.
