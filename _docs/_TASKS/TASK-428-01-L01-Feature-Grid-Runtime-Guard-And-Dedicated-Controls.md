# TASK-428-01-L01: Feature Grid Runtime Guard And Dedicated Controls
# FileName: TASK-428-01-L01-Feature-Grid-Runtime-Guard-And-Dedicated-Controls.md

**Parent Subtask:** TASK-428-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-428-01
**Status:** ⏳ To Do

---

## Overview

Keep the current truthful `cards`/`grid` runtime path for Feature Grid and
replace the remaining native inspector widgets with the shared dedicated
controls.

---

## Implementation Pseudocode

```tsx
expect(resolveFeatureGridTemplate("cards")).not.toEqual(resolveFeatureGridTemplate("default"));
renderSectionPanels(getSectionControlsForType("feature-grid"));
```

Expected data flow:

- Feature Grid variants keep producing distinct runtime layouts.
- Inspector controls adopt the shared dedicated widgets without changing stored
  enum semantics.

Error handling:

- Unknown variants fall back to `default`.
- Control migration must not alter current published markup unexpectedly.

Regression-test shape:

- Runtime coverage for cards/grid/default and UI coverage for control widgets.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Feature Grid fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Feature Grid runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

