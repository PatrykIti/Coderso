# TASK-435-01-L01: CTA Variant Layout And Dedicated Controls
# FileName: TASK-435-01-L01-CTA-Variant-Layout-And-Dedicated-Controls.md

**Parent Subtask:** TASK-435-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-435-01
**Status:** ⏳ To Do

---

## Overview

Implement real published-layout behavior for CTA `centered` and `full-width`
variants and replace the current native control drift with the shared dedicated
widgets.

---

## Implementation Pseudocode

```tsx
const templateClass = resolveCtaTemplate(section.layout.variant);
return <section className={templateClass}>{renderSectionBlocks(section.blocks)}</section>;
```

Expected data flow:

- CTA variant edits produce real runtime layout differences on the front.
- Inspector controls use the shared dedicated widgets.
- Existing content blocks remain valid inside the updated layout shells.

Error handling:

- Unknown variants fall back to `default`.
- Control migration must not change CTA content persistence semantics.

Regression-test shape:

- Runtime coverage for CTA variants and UI coverage for dedicated controls.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned CTA fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- CTA runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

