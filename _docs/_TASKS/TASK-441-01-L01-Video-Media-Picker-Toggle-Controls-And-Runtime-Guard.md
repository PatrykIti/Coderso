# TASK-441-01-L01: Video Media Picker Toggle Controls And Runtime Guard
# FileName: TASK-441-01-L01-Video-Media-Picker-Toggle-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-441-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-441-01
**Status:** ⏳ To Do

---

## Overview

Replace raw source entry with the shared media-picker path for Video and replace
the current yes/no selects for autoplay, muted, and visible with the dedicated
toggle controls.

---

## Implementation Pseudocode

```tsx
renderMediaPickerControl("video");
renderToggleControl("autoplay");
renderToggleControl("muted");
```

Expected data flow:

- Video source selection resolves through the shared media picker.
- Autoplay/muted/visible write through boolean owner fields, not select strings.
- Published runtime keeps rendering a real video block.

Error handling:

- Unsupported media types remain rejected.
- Missing or unsafe sources degrade to the current safe runtime behavior.

Regression-test shape:

- Vitest UI coverage for media/toggle controls and runtime coverage for Video
  rendering.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Video fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

