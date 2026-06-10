# TASK-424-02-L01: Render Dedicated Typography Controls And Shared Text Surface Ux
# FileName: TASK-424-02-L01-Render-Dedicated-Typography-Controls-And-Shared-Text-Surface-Ux.md

**Parent Subtask:** TASK-424-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-424-02, TASK-424-01-L01
**Status:** ⏳ To Do

---

## Overview

Replace the missing typography path from the audit with a real inspector surface
for font family, size, weight, line height, letter spacing, align, and text
color, using the dedicated widgets introduced by TASK-421.

---

## Implementation Pseudocode

```tsx
function TypographyPanel({ target }) {
  const controls = getTypographyControlsForTarget(target);
  return controls.map((control) => renderRegistryControl(control, { panel: "typography" }));
}
```

Expected data flow:

- Text-bearing blocks and sections read/write the same typography fields.
- `textAlign` and `textColor` move into a coherent typography surface.
- Inspector changes immediately re-render canvas and front-preview content.

Error handling:

- Unsupported targets hide the panel instead of exposing invalid controls.
- Long token labels stay human-readable and accessible.

Regression-test shape:

- Vitest UI coverage for typography panel rendering and value propagation.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** inspector writes must stay inside registry-owned typography
  fields only.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

