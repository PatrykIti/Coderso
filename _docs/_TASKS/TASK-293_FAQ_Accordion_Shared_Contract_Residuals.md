# TASK-293: FAQ Accordion Shared Contract Residuals

# FileName: TASK-293_FAQ_Accordion_Shared_Contract_Residuals.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-04, TASK-256-06-03
**Status:** In Progress (2026-05-17)

---

## Overview

Repair the FAQ Accordion residual shared-contract drift that is still present in
the live FAQ files after TASK-256 closure.

This task exists because the current FAQ report family still routes clear/token,
ARIA/chevron, and spacing-contract rows away from TASK-266, but the live FAQ
owner files still expose those residuals. The fix must stay shared-contract
scoped and must not hide product follow-up work inside `TASK-266`.

## Scope Boundary Against TASK-266

In scope:

- report rows C2, C3, W15, U2, U3, and A1-A5 from
  `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md`;
- FAQ adoption of the shared Clear/token contract for `border` and `divider`;
- FAQ runtime accessibility semantics: named section, summary/content labeling,
  explicit chevron affordance, and truthful `aria-expanded` synchronization;
- FAQ shared spacing contract: `spacing="md"` guard correctness and
  `spacing="none"` border-collision output.

Out of scope:

- FAQ-local product work owned by `TASK-266-01` through `TASK-266-05`;
- new layout, typography, rich-answer, SEO, or item-management product fields;
- widening the generic shared helper surface beyond what FAQ needs right now.

## Report Classification Matrix

| Report rows | Owner | TASK-293 action |
|---|---|---|
| C2, A1-A5 | TASK-293 | Add section labeling, explicit chevron affordance, summary/content relationships, and runtime `aria-expanded` sync. |
| C3, W15 | TASK-293 | Repair `spacing="md"` normalization guard and collapse double borders for `spacing="none"`. |
| U2, U3 | TASK-293 | Adopt shared clear hooks for `border`/`divider` and keep CSS-variable token entry truthful. |
| C1, W13 | TASK-256-06-03 / TASK-256-04 | Already shared-contract owned and must not be re-opened here unless live evidence shows a fresh regression outside the current FAQ residual set. |
| W1-W14, U1, U4-U11 | TASK-266 | Remain in the FAQ product follow-up family. |

## Sub-Tasks

- [ ] Add FAQ runtime section labeling and per-item accessibility semantics
  without introducing page-global IDs or public placeholder leakage.
- [ ] Add a visible chevron affordance and synchronize `aria-expanded` on FAQ
  summaries after native `<details>` toggles.
- [ ] Fix the `spacing="md"` guard and collapse `spacing="none"` panel borders
  so stacked FAQ items do not render doubled separators.
- [ ] Adopt shared clear controls for `style.border` and `style.divider` in the
  FAQ Visual editor and keep CSS-variable/token text entry intact.
- [ ] Update focused FAQ widget/editor tests so the shared residual rows have
  direct evidence instead of relying on stale report prose.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/faqAccordion.tsx` | Repair FAQ shared render semantics: section labeling, chevron affordance, `aria-expanded` synchronization, spacing guard correctness, and `spacing="none"` border collapse. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add shared clear hooks for `border` and `divider`, and keep token-picker behavior truthful for FAQ. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Add focused runtime assertions for section labeling, chevron output, shared spacing behavior, and any FAQ-local runtime script markers. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Extend the FAQ `spacing="none"` evidence so the shared border-collapse contract is covered. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add shared editor assertions for clear controls and token-preservation behavior. |
| `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` | Reclassify the shared FAQ residual rows away from TASK-256 and record fresh evidence after the repair lands. |
| `_docs/_WIDGETS/FAQ.md` | Update the FAQ shared runtime/editor contract notes after the residual fixes land. |

## Implementation Pseudocode

Runtime semantics:

```tsx
const sectionLabelId = showHeader ? scopedId(rootInstanceId, "heading") : undefined;

<section
  aria-labelledby={sectionLabelId}
  aria-label={sectionLabelId ? undefined : "Frequently asked questions"}
  data-coderso-faq="1"
>
  <details className="group" data-coderso-faq-item-details>
    <summary
      aria-expanded={open ? "true" : "false"}
      data-coderso-faq-summary
    >
      <span>{item.question}</span>
      <span aria-hidden="true">▾</span>
    </summary>
  </details>
</section>
```

Spacing repair:

```ts
const resolveFaqAccordionSpacing = (value: string | undefined): FaqAccordionSpacing => {
  return value === "none" || value === "sm" || value === "md" || value === "lg"
    ? value
    : "md";
};
```

Editor clear adoption:

```tsx
<ColorField
  label="Panel border"
  value={normalized.style?.border}
  onChange={(next) => updateStyle(value, onChange, { border: next })}
  onClear={() => clearStyleField(value, onChange, "border")}
/>
```

Error handling:

- Shared residual fixes must not duplicate TASK-266 product fields.
- Runtime ID/label changes must stay instance-scoped through `createWidgetInstanceId`
  and `scopedId`.
- CSS-variable values remain source-of-truth in text inputs even when the color
  swatch falls back to a display-only hex value.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged; this task repairs shared adoption and
  runtime semantics, not schema shape.
- Anti-abuse: runtime affordances must not introduce unsafe inline event
  handlers, third-party scripts, or raw HTML output.
- Secret handling: no secrets in editor state, diagnostics, report evidence, or
  runtime output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this task, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` shared-row ownership
  and evidence.
- Update `_docs/_WIDGETS/FAQ.md` shared runtime/editor notes.
- Update `_docs/_TASKS/README.md` with the new task row and active status.

## Changelog Policy

- Covered by its own changelog entry or by a final shared FAQ closure entry
  before moving to `Done`.

## Acceptance Criteria

- FAQ shared report rows no longer rely on stale TASK-256 closure assumptions;
  they have direct code/test evidence in the current worktree.
- FAQ runtime output exposes visible expand/collapse affordances and explicit
  section/content accessibility semantics without page-global collisions.
- FAQ editor clear/token behavior for `border` and `divider` is truthful and
  test-covered.
