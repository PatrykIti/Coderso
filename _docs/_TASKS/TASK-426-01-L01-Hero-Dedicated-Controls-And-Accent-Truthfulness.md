# TASK-426-01-L01: Hero Dedicated Controls And Accent Truthfulness
# FileName: TASK-426-01-L01-Hero-Dedicated-Controls-And-Accent-Truthfulness.md

**Parent Subtask:** TASK-426-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-426-01
**Status:** ⏳ To Do

---

## Overview

Adopt the shared dedicated inspector controls for Hero and verify that variant,
accent, alignment, and background behavior remain truthful on the published
front instead of regressing into marker-only state.

---

## Implementation Pseudocode

```tsx
const heroControls = getSectionControlsForType("hero");
renderSectionPanels(heroControls);
renderHeroSectionTemplate({
  variant: section.layout.variant,
  accent: section.style.accent,
});
```

Expected data flow:

- Hero inspector swaps native selects/text boxes for dedicated widgets.
- Accent/variant edits flow through the shared section update path.
- Published front preserves real Hero-specific layout and styling behavior.

Error handling:

- Unknown Hero variants fall back to `default`.
- Missing accent tokens degrade to the current safe default.

Regression-test shape:

- Vitest UI coverage for Hero panels and runtime tests for variant/accent output.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Hero fields may be written.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Hero runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

