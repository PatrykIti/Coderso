# TASK-211-01-02: Runtime Preview Dialog Error State
# FileName: TASK-211-01-02_Runtime_Preview_Dialog_Error_State.md

**Priority:** High
**Category:** Admin/UI + Runtime Preview
**Estimated Effort:** Medium
**Dependencies:** TASK-211-01-01
**Status:** Done (2026-04-25)

---

## Overview

Teach `RuntimePreviewDialog` to consume real preview probe results and avoid
treating every iframe `load` as a successful runtime preview.

The dialog should render the existing Admin UI failure placeholder when probe
metadata says the target failed, when loopback preflight fails, or when iframe
loading times out. A successful iframe load may clear fallback timeout state,
but it must not override a failed probe result.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/preview/RuntimePreviewDialog.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`, `core/admin/ui/posts/**`, and
  `core/admin/ui/widgets/WidgetTemplatePreviewDialog.tsx` only if a prop change
  cannot stay optional; prefer avoiding caller churn.
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx` if Page editor passes new
  probe metadata.

## Implementation Direction

- Add a typed `probeResult` or `loadDiagnostic` prop to
  `RuntimePreviewDialog`.
- The new prop must be optional and backward compatible with all existing
  RuntimePreviewDialog callers.
- Reset load state on `open`, `previewUrl`, `device`, and `probeResult`
  changes.
- If `probeResult.ok === false`, render the failure placeholder before the
  iframe is shown.
- Keep timeout fallback for legacy callers that do not provide probe metadata.
- Keep the sanitized target label logic in one helper and strip preview tokens.
- Keep device switching behavior unchanged.

## Pseudocode

```tsx
type RuntimePreviewProbeResult =
  | { ok: true; targetLabel: string }
  | { ok: false; reason: string; status?: number; targetLabel: string };

const loadFailure = resolvePreviewLoadFailure({
  probeResult,
  loadError,
  previewTargetLabel,
});

if (loadFailure) {
  return <PreviewUnavailableCard failure={loadFailure} />;
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged in UI; route/probe security is owned by
  `TASK-211-01-01`.
- Reject-unknown validation: prop normalization rejects/ignores unexpected
  probe shapes at the client boundary.
- Anti-abuse:
  - UI copy must use sanitized target labels only;
  - no preview token, raw URL query, response headers, cookies, or internal
    server diagnostics in visible text.

## Testing Requirements

- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
  - probe failure renders `Live preview unavailable`;
  - probe failure does not render iframe;
  - token is redacted from visible text;
  - successful probe plus iframe load renders iframe;
  - no-probe callers still use the existing timeout fallback and can still show
    a successful iframe after `onLoad`;
  - legacy timeout fallback still renders the placeholder;
  - device switching updates iframe URL when no failure is active.
- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - Page editor passes probe metadata from `previewPage` into the dialog if the
    route/client response changes.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Probe failure wins over iframe `onLoad`.
2. The fallback placeholder is visible for failing preview targets.
3. Successful previews and device switching remain unchanged.
