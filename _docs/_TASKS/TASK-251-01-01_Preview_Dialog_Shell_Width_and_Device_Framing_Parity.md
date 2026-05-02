# TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
# FileName: TASK-251-01-01_Preview_Dialog_Shell_Width_and_Device_Framing_Parity.md

**Priority:** High
**Category:** Coderso Custom Screens + Preview + Dialog UX
**Estimated Effort:** Medium
**Dependencies:** TASK-251-01
**Status:** To Do

---

## Overview

Widen the Custom Screens workspace preview modal so `List View` and
`Editor View` previews have comparable breathing room to Pages.

The current issue is not only the inner device width. The outer dialog is
already narrow before the editor preview applies its own device clamp. The fix
must remove that double clamp while keeping the dialog usable on smaller
viewports.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx` as reference only unless a
  shared preview-shell helper is deliberately extracted
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`

## Implementation Pseudocode

```tsx
const dialogClassName =
  mode === "list-view"
    ? "w-[min(96vw,1600px)] max-w-none overflow-hidden p-0"
    : "w-[min(96vw,1600px)] max-w-none overflow-hidden p-0";

<DialogContent className={dialogClassName}>
  <DialogHeader ... />
  <div className="min-h-0 max-h-[88vh] overflow-auto bg-muted/20 p-6">
    {mode === "list-view" ? (
      <div className="mx-auto w-full min-w-[1100px]">{/* table preview */}</div>
    ) : (
      <div className="mx-auto w-full">
        <div
          data-preview-device={device.id}
          className="mx-auto rounded-3xl border bg-background shadow-sm"
          style={{ width: resolvedDeviceWidth, minHeight: resolvedDeviceMinHeight }}
        >
          <CustomScreenPreview ... />
        </div>
      </div>
    )}
  </div>
</DialogContent>
```

If extracting shared constants helps, keep the ownership small and avoid
coupling the local Custom Screens preview to iframe-only Pages runtime logic.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged `content:read` for preview data already owned elsewhere.
- CSRF: no write path.
- Rate-limit bucket: unchanged admin read behavior only.
- Reject-unknown validation: no payload contract change.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- Add mounted assertions for:
  - list-view preview using the roomy shell without the old narrow clamp,
  - editor-view preview exposing the device frame inside the larger dialog,
  - desktop/tablet/mobile controls still toggling the editor preview device.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `List View` preview no longer feels like a table squeezed into a modal card.
2. `Editor View` preview device framing sits inside a spacious shell rather
   than being double-clamped by both the modal and the device wrapper.
3. Responsive behavior remains usable on smaller laptop viewports.
