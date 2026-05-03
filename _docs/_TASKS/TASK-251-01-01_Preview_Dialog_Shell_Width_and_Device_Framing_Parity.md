# TASK-251-01-01: Preview Dialog Shell Width and Device Framing Parity
# FileName: TASK-251-01-01_Preview_Dialog_Shell_Width_and_Device_Framing_Parity.md

**Priority:** High
**Category:** Coderso Custom Screens + Preview + Dialog UX
**Estimated Effort:** Medium
**Dependencies:** TASK-251-01, TASK-251-01-02
**Status:** To Do

---

## Overview

Align the Custom Screens workspace preview first-open footprint with Pages for
both `List View` and `Editor View`.

The current issue is not only the inner device width. The outer dialog is
already narrow before the editor preview applies its own device clamp, and
`Editor View` currently opens on a smaller default device footprint than the
Pages reference. The fix must remove that double clamp and make the first-open
editor framing compare fairly to Pages while keeping the dialog usable on
smaller viewports.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx`
- `core/admin/ui/preview/RuntimePreviewDialog.tsx` as reference only unless a
  shared preview-shell helper is deliberately extracted
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`

## Implementation Pseudocode

```ts
type PreviewShellLayout = {
  dialogClassName: string;
  bodyClassName: string;
  listMinWidth: number;
  editorFrameMinHeight: number;
  defaultEditorDevice: "desktop" | "tablet" | "mobile";
};

function resolvePreviewShellLayout(): PreviewShellLayout {
  return {
    dialogClassName: "w-[min(96vw,1600px)] max-w-none overflow-hidden p-0",
    bodyClassName: "min-h-0 max-h-[88vh] overflow-auto bg-muted/20 p-6",
    listMinWidth: 1100,
    editorFrameMinHeight: 720,
    defaultEditorDevice: "desktop",
  };
}
```

```tsx
const layout = resolvePreviewShellLayout();
const [deviceId, setDeviceId] = useState<PreviewDeviceId>(layout.defaultEditorDevice);

<DialogContent className={layout.dialogClassName}>
  <DialogHeader ... />
  <div className={layout.bodyClassName}>
    {mode === "list-view" ? (
      <div className="mx-auto w-full" style={{ minWidth: layout.listMinWidth }}>
        <CustomScreenEntriesTable ... />
      </div>
    ) : (
      <div className="mx-auto w-full">
        <div
          data-preview-device={device.id}
          className="mx-auto rounded-3xl border bg-background shadow-sm"
          style={{
            width: resolvedDeviceWidth,
            minHeight: layout.editorFrameMinHeight,
          }}
        >
          <CustomScreenPreview ... />
        </div>
      </div>
    )}
  </div>
</DialogContent>
```

Execution notes for the implementer:

- Keep one roomy outer shell policy for both modes; the dialog must stop
  applying a narrower editor-only clamp before the device frame is rendered.
- Treat Pages parity as a first-open experience, not only a CSS width target.
  If the product keeps a non-desktop default device here, the same slice must
  prove why the first-open preview no longer feels smaller than Pages.
- The list preview may overflow horizontally inside the body scroll container;
  do not solve smaller laptop viewports by reintroducing a tighter modal clamp.
- The editor preview may keep device-specific inner widths, but only the inner
  frame owns that constraint; the outer dialog remains desktop-sized.
- No async data flow or new error path is introduced in this leaf. Regression
  risk lives in layout classes, body scroll behavior, and device toggle wiring.
- If extracting shared constants helps, keep ownership local and avoid coupling
  this dialog to iframe-only Pages preview internals.

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
  - list-view preview using the roomy shell without the old `max-w-[1200px]`
    clamp,
  - editor-view preview opening on the parity default device baseline instead of
    the current smaller first-open frame,
  - editor-view preview exposing the device frame inside the larger dialog
    shell instead of shrinking both shell and frame,
  - the body scroll container preserving access when the table or device frame
    exceeds the viewport width/height,
  - desktop/tablet/mobile controls still toggling the editor preview device.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `List View` preview no longer feels like a table squeezed into a modal card.
2. `Editor View` preview device framing sits inside a spacious shell and opens
   on a parity baseline that no longer feels smaller than the Pages reference.
3. Responsive behavior remains usable on smaller laptop viewports.
