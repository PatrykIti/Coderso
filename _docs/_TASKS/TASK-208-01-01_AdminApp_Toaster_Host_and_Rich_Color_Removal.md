# TASK-208-01-01: AdminApp Toaster Host and Rich Color Removal
# FileName: TASK-208-01-01_AdminApp_Toaster_Host_and_Rich_Color_Removal.md

**Priority:** High
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Small
**Dependencies:** TASK-208-01
**Status:** To Do

---

## Overview

Keep the shared Admin UI toaster mounted once in `AdminApp`, but remove the
configuration that lets Sonner's rich/default state palettes bypass Admin UI
Theme tokens.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Inspect `core/admin/app/AdminApp.tsx` around the existing `<Toaster />`.
- Preserve:
  - `position="top-right"`,
  - `closeButton`,
  - `duration={4000}`,
  - `containerAriaLabel="Admin notifications"`.
- Remove `richColors` from the shared host unless the paired Sonner wrapper can
  prove that `richColors` still uses Admin UI Theme token variables.
- Do not add another toaster in any resource list.

## Pseudocode

```tsx
// core/admin/app/AdminApp.tsx
<Toaster
  position="top-right"
  closeButton
  duration={4000}
  containerAriaLabel="Admin notifications"
/>
```

Do not do this:

```tsx
// Avoid state palettes not owned by Admin UI Theme tokens.
<Toaster richColors />
```

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - update the mocked `Toaster` to expose received props,
  - assert `richColors` is absent or false,
  - assert the existing position/close/duration/aria props remain.

## Documentation Updates Required in This Round

- No source docs yet unless this leaf is bundled with `TASK-208-01-02`.
- Update this task file status and validation notes when complete.

## Acceptance Criteria

1. `AdminApp` mounts one shared toaster.
2. The toaster is still top-right, closeable, duration-bound, and accessible.
3. `richColors` no longer controls admin toast state visuals.
