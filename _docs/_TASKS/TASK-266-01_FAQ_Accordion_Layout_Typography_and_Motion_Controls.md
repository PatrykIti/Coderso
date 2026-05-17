# TASK-266-01: FAQ Accordion Layout Typography and Motion Controls

# FileName: TASK-266-01_FAQ_Accordion_Layout_Typography_and_Motion_Controls.md

**Priority:** High
**Category:** Widgets + Content + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-293, TASK-266
**Status:** Done (2026-05-17)

---

## Overview

Add FAQ Accordion-owned layout, typography, color, radius, border-width, and
motion options requested by the FAQ Playwright report.

This leaf covers report rows W1, W2, W3, W4, W5, W6, W7, W8, W12, and W14.
It does not own `spacing="none"` double-border behavior, clear/token semantics,
or ARIA/chevron repairs because those stay in TASK-293.

## Scope Boundary

In scope:

- section `maxWidth` choices such as `sm`, `md`, `lg`, `xl`, `full`;
- header alignment choices `left`, `center`, `right`;
- section padding controls for top/bottom and horizontal padding;
- question, answer, header title, and header description text colors;
- panel radius and border-width controls;
- header title size controls;
- optional motion profile for FAQ open/close transitions after TASK-293 finishes
  the FAQ shared residual runtime contract.

Out of scope:

- TASK-293 clear/none/token picker repairs;
- TASK-293 ARIA, section labeling, chevron, and the remaining FAQ shared
  runtime script;
- adding free-form arbitrary class names or raw CSS.

## Sub-Tasks

- [x] Extend `FaqAccordionData.style` with bounded layout/style fields:
  `maxWidth`, `headerAlign`, `sectionPaddingX`, `sectionPaddingY`,
  `questionTextColor`, `answerTextColor`, `headerTitleColor`,
  `headerDescriptionColor`, `panelRadius`, `borderWidth`, `headerTitleSize`,
  and `motion`.
- [x] Add explicit enums/maps for every non-color token so render output cannot
  emit arbitrary classes.
- [x] Keep legacy payloads backward compatible by defaulting missing fields to
  current behavior.
- [x] Render style fields in `FaqAccordionBlock` through compact class/style
  maps and `compactStyle()` where inline colors are intentional.
- [x] Add Visual controls for day-to-day style/layout choices and Advanced raw
  token diagnostics only where the field is truly technical.
- [x] Ensure motion is disabled by `motion="none"` and does not depend on unsafe
  inline scripts.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/faqAccordion.tsx` | Extend schema/types/defaults/normalizer and render bounded layout, typography, radius, border-width, and motion fields. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add mode-appropriate controls for the new fields without duplicating TASK-256 clear/token behavior. |
| `tests/vitest/widgets/faqAccordion.test.tsx` | Add normalization and SSR render assertions for new fields and legacy defaults. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add Visual/Advanced coverage for new controls and emitted normalized payloads. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fixture coverage requires new FAQ fields. |

## Implementation Pseudocode

Token maps:

```ts
type FaqAccordionMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
type FaqAccordionAlign = "left" | "center" | "right";
type FaqAccordionMotion = "none" | "smooth";

const maxWidthClassMap: Record<FaqAccordionMaxWidth, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

function resolveFaqStyleToken<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
```

Normalizer flow:

```ts
function normalizeFaqAccordionData(data: FaqAccordionData): FaqAccordionData {
  const current = normalizeExistingFaqFields(data);
  return {
    ...current,
    style: {
      ...current.style,
      maxWidth: resolveFaqMaxWidth(data.style?.maxWidth),
      headerAlign: resolveFaqHeaderAlign(data.style?.headerAlign),
      borderWidth: resolveFaqBorderWidth(data.style?.borderWidth),
      motion: resolveFaqMotion(data.style?.motion),
      questionTextColor: resolveClearableStyleValue(data.style?.questionTextColor),
      answerTextColor: resolveClearableStyleValue(data.style?.answerTextColor),
    },
  };
}
```

Renderer flow:

```tsx
const sectionClassName = joinClasses(
  "mx-auto w-full",
  maxWidthClassMap[style.maxWidth],
  paddingXClassMap[style.sectionPaddingX],
  paddingYClassMap[style.sectionPaddingY]
);

const summaryStyle = compactStyle({
  color: resolveClearableStyleValue(style.questionTextColor),
});
```

Error handling:

- Unknown enum values normalize to current defaults.
- Empty strings on clearable color fields are omitted, not serialized as
  transparent sentinels.
- Motion cannot block native `<details>` keyboard behavior.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: add every new style field to `faqAccordionSchema`
  and keep `additionalProperties: false`.
- Anti-abuse: no arbitrary class names, arbitrary CSS blocks, inline event
  handlers, or user-authored scripts.
- Secret handling: no secrets in style data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before any manual commit that includes this leaf, also run:
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FAQ.md` with the new style/layout/motion fields.
- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` rows W1-W8, W12, and
  W14 after validation.

## Changelog Policy

- Covered by the TASK-266 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors expose FAQ-specific layout/typography/motion controls without
  duplicating shared TASK-256 clear/token semantics.
- Runtime output preserves current legacy defaults and renders only bounded
  classes or safe inline styles.
- Focused widget/editor tests prove the new schema, normalizer, renderer, and
  controls stay synchronized.
