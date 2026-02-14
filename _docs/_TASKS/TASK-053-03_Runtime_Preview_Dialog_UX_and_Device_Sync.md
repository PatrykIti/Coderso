# TASK-053-03: Runtime Preview Dialog UX + Device Sync
# FileName: TASK-053-03_Runtime_Preview_Dialog_UX_and_Device_Sync.md

**Priority:** Medium  
**Category:** CMS/Pages + Admin/UI + Preview  
**Estimated Effort:** Medium  
**Dependencies:** TASK-052-04  
**Status:** To Do  

---

## Overview

Improve runtime preview dialog UX:
- remove duplicate close button,
- sync runtime preview device with the page editor device selection,
- clarify that the device selector controls **runtime preview only** (not canvas rendering).

---

## Decision

Keep the device switcher in the Page Editor header, but relabel it as **Preview device** and synchronize it with the runtime preview dialog.

---

## Scope

1. **Single close button**: remove the extra close icon from dialog content.
2. **Device sync**: the device selected above the editor becomes the default for runtime preview.
3. **Controlled device state**: allow `RuntimePreviewDialog` to be controlled via props (with a safe default).
4. **Device switcher semantics**: label the switcher as a preview device selector (no effect on canvas).
5. **Dialog switcher sync**: changing device in the dialog updates the header switcher state and vice versa.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/preview/RuntimePreviewDialog.tsx` | update | add `device` + `onDeviceChange` props (fallback to local state) |
| `core/admin/ui/preview/RuntimePreviewDialog.tsx` | update | pass `showCloseButton={false}` to `DialogContent` |
| `core/admin/ui/pages/DeviceSwitcher.tsx` | update | make controlled; accept `value`, `onChange`, `className` |
| `core/admin/ui/pages/PageEditor.tsx` | update | keep `previewDevice` state; pass to `DeviceSwitcher` + `RuntimePreviewDialog` |
| `core/admin/ui/pages/PageEditor.tsx` | update | change label text to “Preview device” |
| `core/admin/ui/entries/EntryEditor.tsx` | optional | align preview dialog props (can keep default behavior) |
| `core/admin/ui/widgets/WidgetTemplatePreviewDialog.tsx` | optional | align preview dialog props (can keep default behavior) |
| `tests/unit/ui/runtime-preview-dialog.test.tsx` | new | ensure device prop changes update iframe URL query `device=` |
| `tests/unit/ui/page-editor.test.tsx` | update | ensure runtime preview opens with current preview device |

---

## Acceptance Criteria

1. Runtime preview dialog shows a single close button.
2. Device selection above the editor is used by runtime preview.
3. Device selector is clearly labeled as a runtime preview control.
4. Device changes in the dialog and header stay in sync.

---

## Testing Requirements

- `bun test tests/unit/ui/runtime-preview-dialog.test.tsx`
- `bun test tests/unit/ui/page-editor.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (device sync + runtime preview behavior)
