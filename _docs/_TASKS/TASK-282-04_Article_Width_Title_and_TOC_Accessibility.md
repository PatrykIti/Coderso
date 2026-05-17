# TASK-282-04: Rich Text Article Width Title and TOC Accessibility

# FileName: TASK-282-04_Article_Width_Title_and_TOC_Accessibility.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + SEO
**Estimated Effort:** Large
**Dependencies:** TASK-282, TASK-282-01
**Status:** To Do

---

## Overview

Repair Rich Text Section runtime truthfulness and accessibility for the
`article` variant, title heading, section label, and TOC links.

This leaf covers KOD-08, KOD-09, A11Y-01, and the section label row from
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`.

## Scope Boundary

In scope:

- Applying `options.maxWidth` truthfully for the `article` variant inner
  `<article>`.
- Adding a bounded title heading-level model or safe automatic heading policy.
- Labeling the outer `<section>` via `aria-labelledby` or `aria-label`.
- Adding visible focus styles for TOC links.
- Preserving current TOC anchor behavior and sanitized heading extraction.

Out of scope:

- Page-shell global heading hierarchy decisions outside this widget.
- Shared focus-ring utility changes across all widgets unless TASK-256 owns
  them first.
- Rich content authoring changes from TASK-282-02 and TASK-282-03.

## Sub-Tasks

- [ ] Replace the hardcoded article inner `max-w-3xl` class with the normalized
  `maxWidthClassMap` policy or a deliberate article-specific width mapping.
- [ ] Add deterministic heading-level ownership for `titleBlock.title`, such as
  `titleBlock.headingLevel?: 1 | 2 | 3`, while defaulting legacy payloads to the
  current safe level or a documented improved default.
- [ ] Generate a stable section heading id when title text exists and connect it
  to the section with `aria-labelledby`.
- [ ] Add `aria-label` fallback when no title exists but the section still
  renders content.
- [ ] Update `RichTextSectionBlock` to accept the renderer `blockId` prop from
  the shared widget render contract and use it as the section/title id seed.
  Add duplicate-widget SSR coverage proving two Rich Text Section widgets with
  the same title do not emit duplicate `aria-labelledby` ids.
- [ ] Add `focus-visible` classes to TOC links without changing hover behavior.
- [ ] Add tests for admin preview/public SSR parity markers.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/richTextSection.tsx` | Repair article max-width at lines 573-577, title heading render at lines 551-562, section labeling at lines 536-549, TOC link focus style at lines 468-470, and add `blockId?: string` prop handling for duplicate-safe generated ids. |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | Add bounded heading-level control only if the implementation chooses persisted heading level rather than an automatic policy. |
| `tests/vitest/widgets/richTextSection.test.tsx` | Add SSR assertions for article full/XL widths, heading level, section `aria-labelledby`/`aria-label`, TOC focus class, and legacy defaults. |
| `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add editor assertions if heading level becomes editable. |
| `tests/unit/widgets/validator.test.ts` | Run/update if `titleBlock.headingLevel` or other schema fields are added. |

## Implementation Pseudocode

Article width:

```tsx
const articleClassName = joinClasses(
  "mx-auto w-full space-y-6",
  maxWidthClassMap[options.maxWidth ?? "lg"]
);
```

Heading owner:

```tsx
export function RichTextSectionBlock({
  data,
  variant,
  blockId,
}: {
  data: RichTextSectionData;
  variant: string;
  blockId?: string;
}) {
  // ...
}

const titleId = createRichTextSectionTitleId(blockId, normalized.titleBlock?.title);
const HeadingTag = resolveRichTextTitleHeadingTag(normalized.titleBlock?.headingLevel);

{title ? (
  <HeadingTag id={titleId} className="text-3xl font-semibold text-[var(--color-text)]">
    {title}
  </HeadingTag>
) : null}
```

Section label:

```tsx
<section
  aria-labelledby={title ? titleId : undefined}
  aria-label={!title ? "Rich text content" : undefined}
>
```

TOC focus:

```tsx
className="text-[var(--color-text)]/80 transition hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
```

## Error Handling

- Invalid heading levels normalize to the documented default.
- Empty titles omit `aria-labelledby` and use the fallback label.
- Duplicate section title ids must be stable per rendered widget instance; if a
  block id is available from the renderer context use it, otherwise derive a
  deterministic slug with collision avoidance inside this component. The primary
  implementation path should use the existing `blockId` prop passed by
  `WidgetRenderer`, not title text alone.
- `maxWidth` keeps the existing `resolveRichTextMaxWidth()` fallback.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: heading-level schema must reject unsupported
  values if persisted.
- Anti-abuse: generated ids must be escaped/deterministic and never include raw
  HTML.
- Secret handling: no private values in labels, ids, diagnostics, or report
  evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  if editor controls change
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or committing it
  independently
- If committed independently, also run root `bun run lint`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/RICH_TEXT_SECTION.md` with heading-level/section-label
  and article-width behavior.
- Update `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` rows KOD-08,
  KOD-09, A11Y-01, and section-label evidence after validation.

## Changelog Policy

- Covered by the TASK-282 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- `article` variant visually respects `options.maxWidth`.
- Title heading semantics are explicit, bounded, and tested.
- The rendered section is labeled for assistive technology.
- Repeated Rich Text Section widgets with the same title produce unique,
  deterministic section/title ids through the renderer `blockId`.
- TOC links show a visible keyboard focus state.
