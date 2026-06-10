# TASK-437-01-L01: Heading Inline Edit Typography And Dedicated Controls
# FileName: TASK-437-01-L01-Heading-Inline-Edit-Typography-And-Dedicated-Controls.md

**Parent Subtask:** TASK-437-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-437-01
**Status:** ⏳ To Do

---

## Overview

Adopt the inline-edit and typography flows for Heading while replacing the
remaining native inspector drift with the shared dedicated control widgets.

---

## Implementation Pseudocode

```tsx
renderInlineEditableHeading(block.props.text);
renderTypographyControls(getBlockControlsForType("heading"));
```

Expected data flow:

- Heading text can be edited on canvas and in the inspector through one owner
  path.
- Typography values re-render canvas and runtime output consistently.
- Width/align/style controls use the shared dedicated widgets.

Error handling:

- Empty required Heading text falls back to the current valid value.
- Unknown heading levels or typography values fall back safely.

Regression-test shape:

- Vitest UI coverage for inline edit, typography changes, and runtime output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Heading fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Heading runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

