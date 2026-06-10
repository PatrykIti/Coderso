# TASK-432-01-L01: Comparison Runtime Guard And Dedicated Controls
# FileName: TASK-432-01-L01-Comparison-Runtime-Guard-And-Dedicated-Controls.md

**Parent Subtask:** TASK-432-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-432-01
**Status:** ⏳ To Do

---

## Overview

Keep the current truthful Comparison runtime behavior and adopt the shared
dedicated inspector controls without regressing grid/cards/default output.

---

## Implementation Pseudocode

```tsx
expect(resolveComparisonTemplate("grid")).not.toEqual(resolveComparisonTemplate("default"));
renderSectionPanels(getSectionControlsForType("comparison"));
```

Expected data flow:

- Comparison variants continue to produce distinct published layouts.
- Inspector widgets upgrade without changing stored enum semantics.

Error handling:

- Unknown variants fall back to `default`.
- Control migration must not alter existing published markup unexpectedly.

Regression-test shape:

- Runtime coverage for Comparison variants and UI coverage for dedicated
  controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Comparison fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Comparison runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

