# TASK-194-03-01: Save Publish Success Feedback and Runtime Preview Failure State
# FileName: TASK-194-03-01_Save_Publish_Success_Feedback_and_Runtime_Preview_Failure_State.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Runtime Preview
**Estimated Effort:** Medium
**Dependencies:** TASK-194-03
**Status:** To Do

---

## Overview

Make the editor honest about positive and negative outcomes:

- after `Save draft` or `Publish`, the user needs explicit success feedback,
- when the runtime preview target cannot load, the dialog must explain what went
  wrong and what to do next.

Current owner seams:

- `core/admin/ui/pages/PageEditor.tsx:613-681`
  - save/publish/preview handlers only set error state.
- `core/admin/ui/pages/PageEditor.tsx:822-862`
  - top action buttons expose no success surface.
- `core/admin/ui/pages/PageEditor.tsx:1009-1022`
  - preview dialog receives backend token/url state but no iframe-load failure
    diagnostics.
- `core/admin/ui/preview/RuntimePreviewDialog.tsx:70-171`
  - dialog only distinguishes loading, API error, empty, and iframe render.
- `core/admin/components/ui/sonner.tsx:1-40`
  - toast component exists, but current repo search did not show any shared
    mount or Pages usage.
- `core/admin/app/AdminApp.tsx:818-825`
  - shared admin app root is the likely place to mount `Toaster` if it is not
    already rendered elsewhere.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx:613-681`
- `core/admin/ui/pages/PageEditor.tsx:822-862`
- `core/admin/ui/pages/PageEditor.tsx:1009-1022`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx:70-171`
- `core/admin/app/AdminApp.tsx:818-825` if the shared toaster is not already
  mounted
- `tests/vitest/ui/page-editor-shell-wave.test.tsx:682-785`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx:787-835`
- `tests/vitest/ui/runtime-preview-dialog.test.tsx:1-25`

## Implementation Direction

- Prefer the existing `sonner` primitive for success feedback if it can be
  mounted once at the shared admin root.
- If mounting a global toaster is too invasive for this leaf, use a minimal
  page-local success banner only as a fallback.
- Track iframe load readiness separately from preview token generation.
- When the preview URL points at localhost/loopback and iframe load does not
  resolve within a grace window, show actionable copy such as:
  `Frontend server not running at localhost:3000. Start the public frontend and try again.`
- Keep generic fallback copy for non-local hosts.

## Implementation Sketch

```ts
await updatePage(...);
toast.success("Draft saved.");

await publishPage(...);
toast.success("Page published.");
```

```ts
useEffect(() => {
  if (!open || !previewUrl || iframeReady) return;
  const timer = window.setTimeout(() => {
    setLoadError(resolvePreviewLoadError(previewUrl));
  }, 3000);
  return () => window.clearTimeout(timer);
}, [open, previewUrl, iframeReady]);
```

## Security Contract

- Visibility: internal admin UI plus existing public read-only preview.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - success feedback fires only after the awaited mutation resolves,
  - preview failure copy must not include preview tokens,
  - local-host guidance must be derived from the preview URL host only, not from
    secret config dumps.

## Testing Requirements

- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - save/publish success feedback appears after fulfilled mutation,
  - preview API failure still surfaces explicit error,
  - generic preview path remains unchanged when the iframe loads.
- `tests/vitest/ui/runtime-preview-dialog.test.tsx`
  - dialog shows iframe sandbox contract,
  - load-failure copy appears after the unresolved iframe timeout,
  - local-host guidance and generic-host fallback are both covered.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `Save draft` and `Publish` give visible success confirmation.
2. A preview host that is unreachable results in actionable UI guidance.
3. Preview failure messaging does not leak tokens or secrets.
