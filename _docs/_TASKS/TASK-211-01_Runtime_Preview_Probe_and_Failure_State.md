# TASK-211-01: Runtime Preview Probe and Failure State
# FileName: TASK-211-01_Runtime_Preview_Probe_and_Failure_State.md

**Priority:** High
**Category:** CMS/Pages + Runtime Preview + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-211, TASK-194-03, TASK-191
**Status:** To Do

---

## Overview

Make Pages runtime preview failure detection truthful in real browser usage.

The current dialog handles API errors and some timeout/unreachable cases, but it
still treats iframe `onLoad` as success. That is not enough: a cross-origin
iframe can load an HTTP 404/503 error document and still fire `load`, leaving
the editor with a blank/raw iframe instead of the Admin UI failure placeholder.

This round owns the probe/result contract and the dialog state transition. It
must not add a browser-side arbitrary URL probe or rely on a test-only mocked
iframe behavior.

## Sub-Tasks

- [ ] TASK-211-01-01: Preview Probe Security and Service Contract
- [ ] TASK-211-01-02: Runtime Preview Dialog Error State

## Files to Change

- `core/server/routes/pageRoutes.ts` if the existing preview response is
  extended with bounded probe metadata.
- `core/server/utils/previewUrls.ts` only if URL sanitization/probe ownership
  needs a shared helper.
- `core/services/pages/previewService.ts` only if probe metadata belongs beside
  preview token issuance.
- `core/admin/services/pagesClient.ts`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `tests/integration/routes/pages.test.ts`
- `tests/unit/pages/previewService.test.ts`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md` if response shape changes.

## Implementation Direction

- Prefer extending the existing `POST /pages/:id/preview` flow with sanitized
  probe metadata over adding a generic `POST /preview/probe` URL endpoint.
- If a separate internal endpoint is necessary, it must be resource-bound, for
  example `POST /pages/:id/preview/probe`, not arbitrary URL-bound.
- Reuse current page preview route, service, URL resolver, client, and
  validation seams wherever possible. Add a new admin route only if the
  implementation cannot keep token generation, probing, and security boundaries
  correct inside the existing route.
- The server must only probe URLs it generated or URLs derived from configured
  preview/public base URL policy.
- The UI should treat a failed probe as a first-class load error before assigning
  the iframe source.
- Keep browser-side timeout as a fallback for cases the server cannot prove.
- Do not read HTTP status from cross-origin iframe `onLoad`; that status is not
  reliably available to browser code.

## Pseudocode

```ts
const preview = await previewPage(pageId, { probe: true });
setPreviewUrl(preview.previewUrl);
setPreviewProbe(preview.probe ?? null);

if (preview.probe && !preview.probe.ok) {
  setPreviewLoadError({
    code: preview.probe.reason,
    targetLabel: preview.probe.targetLabel,
  });
}
```

```tsx
<RuntimePreviewDialog
  previewUrl={previewUrl}
  probeResult={previewProbe}
  onFixPreviewTarget={() => openPageSettings()}
/>
```

## Security Contract

- Visibility: internal admin preview generation/probe plus existing public
  token preview.
- Auth model: existing admin session/admin API key path for preview generation;
  public `/preview` remains token-only.
- RBAC: `content:read`.
- CSRF: required for preview/probe POST because the preview flow creates or
  refreshes preview token state.
- Rate-limit bucket: existing admin read/probe bucket; probe must use short
  timeout and no body download.
- Reject-unknown validation:
  - preview/probe payload accepts only documented options such as `ttlMinutes`
    and optional `probe`;
  - unknown fields are rejected.
- Anti-abuse:
  - no arbitrary URL from the browser;
  - probe URL must match generated preview URL policy and approved origin;
  - redirects to unapproved origins are rejected;
  - preview tokens are redacted from UI copy, logs, and response diagnostics;
  - response does not include fetched body content.

## Testing Requirements

- `tests/integration/routes/pages.test.ts`
  - route registration covers any new `POST /pages/:id/preview/probe` route or
    the extended `POST /pages/:id/preview` contract;
  - preview response can include successful probe metadata;
  - probe failure returns sanitized status/reason/target label;
  - token is not leaked in probe diagnostics;
  - unknown preview/probe fields are rejected.
- `tests/unit/pages/previewService.test.ts`
  - approved-origin and redirect rejection behavior if a service helper is
    introduced.
  - known probe helper/domain failures map to machine-readable codes that the
    route boundary can convert through centralized `map*Error` / `ApiError`
    handling.
- `tests/vitest/admin/pagesClient.test.ts`
  - client normalizes optional probe metadata without exposing token details.
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
  - probe failure shows placeholder immediately;
  - timeout fallback still works when no probe metadata exists.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md` if response metadata changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. A 404/503 preview target does not render as a successful blank/raw iframe.
2. Failure copy names only the sanitized target label.
3. The implementation is not vulnerable to arbitrary URL probing/SSRF.
4. Existing successful runtime preview still renders in iframe with device
   switching.
