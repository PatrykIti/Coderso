# 776 - TASK-242 widget style none tokens

Date: 2026-04-29
Version: Unreleased
Tasks: TASK-242, TASK-242-01, TASK-242-01-01, TASK-242-01-02, TASK-242-02, TASK-242-02-01, TASK-242-02-02, TASK-242-03, TASK-242-03-01, TASK-242-03-02, TASK-242-04, TASK-242-04-01

## Key Changes

### Widgets

- Added `none` as the visual off token for approved spacing, gap, padding,
  radius, max-width/content-width, typography, logo height, input size, and
  button size widget settings.
- Kept legacy numeric zero spacing values backward compatible while mapping
  `none` through fixed zero/empty render maps.
- Added focused runtime coverage for `none` token normalization and rendering,
  including the existing Bun-owned content-list, posts-feed, and entry-teaser
  suites.

### Admin UI

- Exposed `None` in widget editor selects for the approved off-capable token
  fields without changing structural choices such as variants, counts, ratios,
  source modes, or alignments.
- Added editor-wave assertions that the new `none` option remains visible in the
  changed widget editors.

### Documentation

- Documented the global widget visual off-token contract in `_docs/WIDGETS.md`.
- Added missing per-widget docs for Feature Grid, Pricing Plans, Testimonials,
  Form Embed, and Screen Two Column.
- Closed the TASK-242 task family and synchronized the task board.

## Validation

- `bun --cwd core lint:types` - PASS.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` - PASS,
  6 tests.
- Vitest runtime widget matrix - PASS, 25 files / 188 tests.
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx` - PASS, 111 tests.
- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/contentList.test.tsx --test-name-pattern "content list preserves none gap token"` - PASS.
- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/entryTeaser.test.tsx --test-name-pattern "entry teaser preserves none spacing and radius tokens"` - PASS.
- `set -a && source /Users/pciechanski/Documents/_moje_projekty/Nextless/.env && set +a && bun test tests/unit/widgets/postsFeedWidget.test.tsx --test-name-pattern "posts feed preserves none gap token through content list mapping"` - PASS.
- `bun --cwd core lint` - PASS.
- `git diff --check` - PASS.
- `bun run gates:coderso` - PASS; optional DB-backed checks skipped because
  `DATABASE_URL` is not configured in the task worktree environment.
- `bun run precommit` - PASS.

## Notes

- A broad Bun run of `tests/unit/widgets/contentList.test.tsx
  tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx`
  without the main checkout `.env` fails because `DATABASE_URL` is not set.
- The same broad run also currently exposes an unrelated
  `Cannot access 'POST_CONTENT_TYPE_SLUG' before initialization` failure in the
  existing content-list posts-source resolver test; TASK-242 validation used the
  focused passing coverage above.
