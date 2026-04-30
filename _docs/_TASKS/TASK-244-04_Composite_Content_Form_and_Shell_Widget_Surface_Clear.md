# TASK-244-04: Composite, Content, Form, and Shell Widget Surface Clear

# FileName: TASK-244-04_Composite_Content_Form_and_Shell_Widget_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Composite Runtime + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-244-02, TASK-244-03
**Status:** To Do

---

## Overview

Add clear controls to the remaining rendered widgets with configurable or forced
surfaces, overlays, and background colors.

This subtask owns the broad marketing/content/form/global shell sweep after the
Hero and operational frame semantics are established.

## Sub-Tasks

- [ ] TASK-244-04-01: Marketing and Content Surface and Overlay Clear
- [ ] TASK-244-04-02: Form, Navigation, Footer, and Primitive Panel Color Clear

## Files to Change

- `core/widgets/core/gridColumns.tsx`
- `core/widgets/core/galleryMosaic.tsx`
- `core/widgets/core/featureGrid.tsx`
- `core/widgets/core/faqAccordion.tsx`
- `core/widgets/core/pricingPlans.tsx`
- `core/widgets/core/testimonials.tsx`
- `core/widgets/core/team.tsx`
- `core/widgets/core/statsKpi.tsx`
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/postsFeed.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/widgets/core/ctaBanner.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/widgets/core/richTextSection.tsx`
- `core/widgets/core/timeline.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `core/widgets/core/contact.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/widgets/core/formEmbed.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/widgets/core/accordion.tsx`
- `core/widgets/core/tabs.tsx`
- `core/widgets/core/toggleBlock.tsx`
- exact editor, runtime-test, editor-wave, and docs files listed in
  TASK-244-04-01 and TASK-244-04-02

## Implementation Order

1. Implement clear semantics for marketing/content widgets with card surfaces and
   overlays, including `grid-columns` column background.
2. Implement clear semantics for form widgets and global shell widgets.
3. Add primitive panel widget clear behavior for `accordion`, `tabs`, and
   `toggle-block`.
4. Keep TASK-242 `None` token behavior unchanged.
5. Update docs and tests in the same owner groups.

## Testing Requirements

- Targeted Vitest widget suites for every touched file.
- Targeted editor-wave suites for every touched editor.
- Bun-owned suites for current Bun-owned widget owners:
  - `tests/unit/widgets/contentList.test.tsx`
  - `tests/unit/widgets/postsFeedWidget.test.tsx`
  - `tests/unit/widgets/entryTeaser.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` files listed by TASK-244-04-01 and
  TASK-244-04-02; create new primitive docs only if implementation introduces
  those pages
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. All remaining real surface/background/overlay problems have clear controls.
2. `Clear` removes output rather than writing transparent sentinels.
3. Composite widgets preserve their default/new-widget visual presentation where
   required by compatibility.
4. Tests cover editor payload and runtime output.
5. Clear paths do not serialize `"transparent"` or empty strings as off-state
   payloads.
