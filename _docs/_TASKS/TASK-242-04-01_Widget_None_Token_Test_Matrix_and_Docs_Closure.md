# TASK-242-04-01: Widget None Token Test Matrix and Docs Closure

# FileName: TASK-242-04-01_Widget_None_Token_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widget QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-242-04
**Status:** To Do

---

## Overview

Run and record the final validation for TASK-242, then close the docs, changelog,
and board state.

## Sub-Tasks

- None. This is an execution leaf.

## Validation Matrix

At minimum run:

```bash
bun --cwd core lint
bun --cwd core lint:types
git diff --check
bun run gates:coderso
```

Run focused Vitest suites for every touched widget editor. The expected suite
set includes, but is not limited to:

- `tests/vitest/ui/hero-editor-wave.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/vitest/ui/footer-editor-wave.test.tsx`
- `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `tests/vitest/ui/stack-editor-wave.test.tsx`
- `tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `tests/vitest/ui/content-list-editor-wave.test.tsx`
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `tests/vitest/ui/team-editor-wave.test.tsx`
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `tests/vitest/ui/contact-editor-wave.test.tsx`
- `tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `tests/vitest/ui/timeline-editor-wave.test.tsx`
- `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `tests/vitest/ui/screen-two-column-editor-wave.test.tsx` once added for
  `ScreenEditors.tsx`
- `tests/vitest/ui/spacer-editor-wave.test.tsx`
- `tests/vitest/ui/divider-editor-wave.test.tsx`

Also run any touched widget runtime suites that cover normalizers or render
output. Most current widget render suites are in `tests/vitest/widgets/*`; keep
existing `tests/unit/widgets/*` runs only for surfaces that already live there.
For the current Bun-owned widget suites in scope, run:

```bash
bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx
```

## Security Contract

- Visibility: validation/docs only.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: confirm schemas still reject unknown visual tokens.
- Anti-abuse: confirm renderers use fixed class maps.

## Pseudocode

Closure checklist:

```ts
for (const changedWidget of changedWidgets) {
  assert(editorSelectContainsNone(changedWidget));
  assert(schemaAcceptsNone(changedWidget));
  assert(rendererDoesNotEmitInvalidClass(changedWidget));
  assert(invalidTokenStillFallsBackOrRejects(changedWidget));
}
```

## Testing Requirements

- Record exact commands and pass/fail results in TASK-242 before moving Done.
- If a broad suite fails for unrelated pre-existing reasons, isolate it with a
  focused suite and document the blocker separately.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- Create missing per-widget docs for touched surfaces that do not currently
  have one (`FEATURE_GRID`, `PRICING_PLANS`, `TESTIMONIALS`, `FORM_EMBED`,
  `SCREEN_TWO_COLUMN`) and add them to `_docs/_WIDGETS/README.md`.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- matching TASK-242 changelog entry.

## Acceptance Criteria

1. All changed editor and render contracts have focused regression coverage.
2. Docs examples list `none` where the widget supports it.
3. Board statistics match task statuses.
4. Changelog entry closes TASK-242.
