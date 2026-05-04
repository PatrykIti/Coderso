# TASK-242-04-01: Widget None Token Test Matrix and Docs Closure

# FileName: TASK-242-04-01_Widget_None_Token_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widget QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-242-02, TASK-242-03
**Status:** Done (2026-04-29)

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
bun run precommit
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
For full TASK-242 closure, run the current Vitest-owned runtime widget matrix:

```bash
./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/widgets/hero.test.tsx \
  tests/vitest/widgets/navigation.test.tsx \
  tests/vitest/widgets/footer.test.tsx \
  tests/vitest/widgets/stack.test.tsx \
  tests/vitest/widgets/splitLayout.test.tsx \
  tests/vitest/widgets/gridColumns.test.tsx \
  tests/vitest/widgets/divider.test.tsx \
  tests/vitest/widgets/spacer.test.tsx \
  tests/vitest/widgets/screenWidgets.test.tsx \
  tests/vitest/widgets/statsKpi.test.tsx \
  tests/vitest/widgets/featureGrid.test.tsx \
  tests/vitest/widgets/galleryMosaic.test.tsx \
  tests/vitest/widgets/ctaBanner.test.tsx \
  tests/vitest/widgets/pricingPlans.test.tsx \
  tests/vitest/widgets/faqAccordion.test.tsx \
  tests/vitest/widgets/team.test.tsx \
  tests/vitest/widgets/testimonials.test.tsx \
  tests/vitest/widgets/contact.test.tsx \
  tests/vitest/widgets/newsletter.test.tsx \
  tests/vitest/widgets/formEmbed.test.tsx \
  tests/vitest/widgets/logoCloud.test.tsx \
  tests/vitest/widgets/richTextSection.test.tsx \
  tests/vitest/widgets/timeline.test.tsx \
  tests/vitest/widgets/compareTimeline.test.tsx
```

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

## Validation Results

Completed on 2026-04-29.

- [x] `bun --cwd core lint:types` - PASS.
- [x] `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` -
  PASS, 6 tests.
- [x] Vitest runtime widget matrix - PASS, 25 files / 188 tests.
- [x] Changed editor-wave matrix - PASS, 23 files / 111 tests:
  `compare-timeline`, `contact`, `content-list`, `cta-banner`,
  `entry-teaser`, `faq-accordion`, `feature-grid`, `footer`, `form-embed`,
  `grid-columns`, `hero`, `logo-cloud`, `navigation`, `newsletter`,
  `posts-feed`, `pricing-plans`, `rich-text-section`, `split-layout`, `stack`,
  `stats-kpi`, `team`, `testimonials`, and `timeline`.
- [x] `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/contentList.test.tsx --test-name-pattern "content list preserves none gap token"` - PASS.
- [x] `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/entryTeaser.test.tsx --test-name-pattern "entry teaser preserves none spacing and radius tokens"` - PASS.
- [x] `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/postsFeedWidget.test.tsx --test-name-pattern "posts feed preserves none gap token through content list mapping"` - PASS.
- [x] `bun --cwd core lint` - PASS.
- [x] `git diff --check` - PASS.
- [x] `bun run gates:coderso` - PASS; optional DB-backed checks skipped because
  `DATABASE_URL` is not configured in the task worktree environment.
- [x] `bun run precommit` - PASS.

Known unrelated validation notes:

- Running the Bun-owned widget files without the main checkout `.env` fails with
  `DATABASE_URL is not set`.
- A broad run of `tests/unit/widgets/contentList.test.tsx` currently exposes
  `Cannot access 'POST_CONTENT_TYPE_SLUG' before initialization` in the existing
  posts-source resolver test; TASK-242 closure is covered by the focused passing
  tests above.

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
