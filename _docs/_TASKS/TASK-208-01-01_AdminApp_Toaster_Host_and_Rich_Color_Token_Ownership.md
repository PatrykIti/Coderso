# TASK-208-01-01: AdminApp Toaster Host and Rich Color Token Ownership
# FileName: TASK-208-01-01_AdminApp_Toaster_Host_and_Rich_Color_Token_Ownership.md

**Priority:** High
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Small
**Dependencies:** TASK-208-01
**Status:** Done (2026-04-24)

---

## Overview

Keep the shared Admin UI toaster mounted once in `AdminApp`, but make its
documented Sonner rich-color state path safe for Admin UI Theme tokens.

In this repo, "rich color token ownership" means keeping Sonner's documented
typed-state path while making the Admin UI Theme the visual source of truth.
Do not remove the `richColors` prop: Sonner uses `richColors` to activate typed
success/error/warning/info selectors, and the shared wrapper must make those
selectors read token-backed CSS variables instead of Sonner's bundled palette.
The single shared toaster must also be the only host that receives the active
Admin UI Theme template/profile variables used by the floating toast shell,
description, border, close button, and typed state colors.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Inspect `core/admin/app/AdminApp.tsx` around the existing `<Toaster />`.
- Preserve:
  - `position="top-right"`,
  - `richColors`,
  - `closeButton`,
  - `duration={4000}`,
  - `containerAriaLabel="Admin notifications"`.
- Do not remove `richColors`; instead pair it with `TASK-208-01-02`, which
  proves that Sonner's rich-color variables are backed by Admin UI Theme tokens.
- Do not add another toaster in any resource list.
- Do not add resource-local styling for floating toasts. The shared toaster host
  and wrapper must be the only owner for Admin UI Theme template/profile-driven
  toast visuals.

## Pseudocode

```tsx
// core/admin/app/AdminApp.tsx
<Toaster
  position="top-right"
  richColors
  closeButton
  duration={4000}
  containerAriaLabel="Admin notifications"
/>
```

Do not do this:

```tsx
// core/admin/components/ui/sonner.tsx
// Avoid leaving only normal variables while AdminApp enables richColors.
style={{
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
}}
```

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - update the mocked `Toaster` to expose received props,
  - assert `richColors` is present and true,
  - assert the existing position/close/duration/aria props remain.

## Documentation Updates Required in This Round

- No source docs yet unless this leaf is bundled with `TASK-208-01-02`.
- Update this task file status and validation notes when complete.

## Acceptance Criteria

1. `AdminApp` mounts one shared toaster.
2. The toaster is still top-right, closeable, duration-bound, and accessible.
3. `richColors` remains enabled, but Sonner's default bundled palette no longer
   controls admin toast state visuals.
4. The shared toaster remains the single inheritance point for Admin UI Theme
   template/profile-driven floating toast visuals.
