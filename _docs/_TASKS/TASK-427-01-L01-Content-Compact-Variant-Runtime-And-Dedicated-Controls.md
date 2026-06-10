# TASK-427-01-L01: Content Compact Variant Runtime And Dedicated Controls
# FileName: TASK-427-01-L01-Content-Compact-Variant-Runtime-And-Dedicated-Controls.md

**Parent Subtask:** TASK-427-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-427-01
**Status:** ⏳ To Do

---

## Overview

Implement a real published-layout effect for the Content section's `compact`
variant and adopt the shared dedicated control widgets for the rest of the
section surface.

---

## Implementation Pseudocode

```tsx
const templateClass = resolveContentSectionTemplate(section.layout.variant);
return <section className={templateClass}>{renderSectionBlocks(section.blocks)}</section>;
```

Expected data flow:

- `compact` changes real runtime classes/layout, not only `data-page-variant`.
- Content inspector uses shared segmented/swatch/slider/toggle widgets.
- Section updates keep using the shared section patch path.

Error handling:

- Unknown Content variants fall back to `default`.
- Legacy saved `compact` values keep rendering safely.

Regression-test shape:

- Runtime coverage for default vs compact output and UI coverage for control
  widgets.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Content-section fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Content runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

