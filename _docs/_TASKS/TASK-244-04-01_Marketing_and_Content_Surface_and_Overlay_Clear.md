# TASK-244-04-01: Marketing and Content Surface and Overlay Clear

# FileName: TASK-244-04-01_Marketing_and_Content_Surface_and_Overlay_Clear.md

**Priority:** High
**Category:** Widgets + Marketing + Content
**Estimated Effort:** Large
**Dependencies:** TASK-244-04
**Status:** To Do

---

## Overview

Add clear controls and runtime output omission for marketing/content widgets with
card surfaces, caption overlays, section backgrounds, and highlighted surfaces.

Target widgets:

- `gallery-mosaic`
- `feature-grid`
- `faq-accordion`
- `pricing-plans`
- `testimonials`
- `team`
- `stats-kpi`
- `content-list`
- `posts-feed`
- `entry-teaser`
- `cta-banner`
- `logo-cloud`
- `rich-text-section`
- `timeline`
- `compare-timeline`

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- runtime files listed above under `core/widgets/core/`
- matching editor files under `core/admin/ui/widgets/editors/`
- matching runtime/editor tests
- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`

## Implementation Notes

Pay special attention to these current surfaces:

- `gallery-mosaic`: caption overlay defaults to a dark rgba value.
- `feature-grid`, `faq-accordion`, `pricing-plans`, `testimonials`, `team`,
  `content-list`, `posts-feed`, and `entry-teaser`: card/panel surfaces default
  to `var(--color-bg)` or equivalent.
- `cta-banner`: container, badge, and button backgrounds are style-owned and
  should support clear where safe.
- `logo-cloud` and `stats-kpi`: repeated item/tile backgrounds are currently
  class-driven and need clearable surface contracts.
- `timeline` and `compare-timeline`: classify marker/line/highlight colors
  carefully; do not remove semantic timeline readability states by accident.

## Implementation Pseudocode

For card/surface widgets:

```ts
const cardBackground = resolveClearableStyleValue(style.cardSurface);
const cardStyle = compactStyle({
  backgroundColor: cardBackground,
  borderColor: resolveClearableStyleValue(style.cardBorder),
});
```

For overlay widgets:

```tsx
const overlay = resolveClearableStyleValue(style.overlay);
return overlay ? (
  <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ background: overlay }} />
) : null;
```

For content-list/posts-feed, keep the mapping explicit:

```ts
mapPostsFeedToContentListData({
  style: {
    ...contentListStyle,
    backgroundColor: postsStyle.backgroundColor,
  },
});
```

When cleared, the mapped field should be absent, not `"transparent"`.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx`
- Bun-owned current owners:
  - `set -a && source .env && set +a && bun test tests/unit/widgets/contentList.test.tsx`
  - `set -a && source .env && set +a && bun test tests/unit/widgets/postsFeedWidget.test.tsx`
  - `set -a && source .env && set +a && bun test tests/unit/widgets/entryTeaser.test.tsx`
- Matching editor-wave tests:
  - `gallery-mosaic`, `feature-grid`, `faq-accordion`, `pricing-plans`,
    `testimonials`, `team`, `stats-kpi`, `content-list`, `posts-feed`,
    `entry-teaser`, `cta-banner`, `logo-cloud`, `rich-text-section`,
    `timeline`, and `compare-timeline`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Marketing/content card surfaces can be cleared.
2. Gallery overlays can be cleared without leaving transparent overlay nodes.
3. Content-list/posts-feed background mapping preserves cleared absence.
4. Timeline/compare color clears do not remove semantic readability states.
5. Runtime/editor tests prove default and cleared output.
