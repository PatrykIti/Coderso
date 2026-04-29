# TASK-242: Widget Style Token None Options

# FileName: TASK-242_Widget_Style_Token_None_Options.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-215
**Status:** To Do

---

## Overview

Add a consistent `none` option to widget configuration controls where the
current token set forces a visual preset and gives the editor no way to turn it
off. This applies to spacing, gap, padding, radius, max-width, typography size,
logo/input/button size, and equivalent visual tokens.

The main product issue is that many widget options default to values like
`base`, `lg`, `xl`, `2xl`, numeric spacing, or radius tokens, but the admin user
cannot disable that styling when a final page composition needs tighter custom
layout or inherited typography.

`none` must be supported end-to-end:

- JSON schema accepts it.
- Normalizers preserve it instead of falling back to defaults.
- Runtime renderers map it to the correct off behavior.
- Widget editors expose it with a clear `None` label.
- Existing saved values remain backward compatible.

## Scope Policy

Add `none` only to visual token fields where it can disable an applied class,
style, spacing, size, or width constraint.

Do not add `none` to structural or semantic choices:

- column counts, item counts, spans, ratios, alignments, variants, sources,
  statuses, and content modes;
- existing Boolean controls such as `guides.enabled`;
- fields that already have a dedicated off token, unless the UI needs a
  compatibility alias.

Numeric zero tokens such as `"0"` already disable spacing, but they are not a
clear product-facing `none` option. Keep legacy `"0"` values readable and render
them the same as `none` where the field is an off-capable visual token.

## Current Inventory

Primary fields missing a `none` off switch:

| Area | Files | Fields |
|---|---|---|
| Layout spacing/gap/padding | `stack.tsx`, `splitLayout.tsx`, `divider.tsx`, `spacer.tsx`, `gridColumns.tsx`, `screenTwoColumn.tsx` | `gap`, responsive `gap`, divider margins, spacer height, `gapX`, `gapY`, `columnPadding` |
| Hero and global shell sizing | `hero.tsx`, `navigation.tsx`, `footer.tsx` | `maxWidth`, `contentWidth`, `paddingY`, `itemGap`, `columnGap`, `sectionPaddingY`, radius and size tokens |
| Content/composite spacing | `statsKpi.tsx`, `featureGrid.tsx`, `contentList.tsx`, `postsFeed.tsx`, `entryTeaser.tsx`, `galleryMosaic.tsx`, `ctaBanner.tsx`, `pricingPlans.tsx`, `faqAccordion.tsx`, `team.tsx`, `testimonials.tsx` | `spacing`, `gap`, `padding`, missing radius off switches |
| Forms and conversion widgets | `contact.tsx`, `newsletter.tsx`, `formEmbed.tsx`, `logoCloud.tsx` | `spacing`, `gap`, `logoHeight`, `width`, `inputSize`, radius |
| Typography and timeline labels | `richTextSection.tsx`, `timeline.tsx`, `compareTimeline.tsx`, `navigation.tsx`, `footer.tsx`, `hero.tsx` | `fontScale`, `fontSize`, `headlineSize`, `subheadSize`, `bodySize`, `titleSize`, `descriptionSize`, track/step/segment label sizes |

Fields that already have an off switch and should mostly need regression
coverage or no-op confirmation:

- global block layout `spacingTokens` in `core/widgets/types.ts` already includes
  `none`;
- `section.radius`, `ctaBanner.radius`, `featureGrid.radius`,
  `galleryMosaic.radius`, `pricingPlans.radius`, `team.radius`, and
  `gridColumns.columnRadius` already include `none`;
- border width fields already use `"0"` as the established off value.

Explicit exclusions unless product scope changes:

- `columns`, `ratio`, `span`, `orientation`, `align`, `variant`, `source`,
  `lineStyle`, `guideStyle`, and similar structural choices;
- `textTransform`, because it already has semantic `none`;
- media type fields, because they already use `none` as a content mode.

## Execution Readiness Review

Reviewed on 2026-04-29 against the current repository state.

The TASK-242 family is granular enough for implementation:

- umbrella scope is tracked in this file;
- semantic audit is owned by TASK-242-01 and TASK-242-01-01;
- runtime/schema rollout is split into layout/composite leaves under
  TASK-242-02, with typography/width/size runtime work isolated under
  TASK-242-03-02;
- editor select regressions are isolated under TASK-242-03-01;
- validation, docs, changelog, and board closure are isolated under
  TASK-242-04-01.

The implementation inventory with exact source files, current line references,
editor owners, test owners, and documentation owners lives in
`TASK-242-01-01_Widget_Config_Token_Inventory.md`. Treat that leaf as the
current execution map before touching code. If code shifts before
implementation starts, refresh the line references there with `rg` and keep the
same owner split.

## Sub-Tasks

- [ ] TASK-242-01: Widget Token Audit and None Semantics
- [ ] TASK-242-02: Layout, Spacing, Gap, Padding, and Radius None Rollout
- [ ] TASK-242-03: Typography, Size, Width, and Editor UI None Rollout
- [ ] TASK-242-04: Validation, Docs, Changelog, and Board Closure

## Files to Change

Widget contracts and renderers:

- `core/widgets/core/*.tsx`
- `core/widgets/types.ts` only if shared token helpers need an owner

Admin widget editors:

- `core/admin/ui/widgets/editors/*.tsx`

Tests:

- `tests/vitest/ui/*editor-wave.test.tsx`
- `tests/unit/widgets/*.test.tsx`

Docs and board:

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/*.md` for impacted widget token examples
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entry on closure

## Security Contract

- Visibility:
  - admin editor controls are internal admin UI;
  - rendered widget output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - widget edits keep the existing authenticated admin page/template save flow.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - widget schemas must explicitly accept `none` only for approved fields;
  - unrelated unknown fields remain rejected.
- Anti-abuse:
  - no public write surface is added;
  - public renderers must not emit invalid class names or raw untrusted token
    values into class strings.
- Compatibility:
  - saved legacy values must continue to render;
  - legacy `"0"` spacing values may normalize to `none` only when that does not
    change visible output.

## Implementation Order

1. Lock the inventory and exact `none` semantics.
2. Update schema, type, normalizer, and render maps for visual tokens.
3. Update widget editor select options and labels.
4. Add focused tests for schema acceptance, normalization, rendering, and editor
   select options.
5. Update widget docs, task board, and changelog on closure.

## Implementation Pseudocode

Use local token ownership unless a shared helper clearly removes repeated logic.

```ts
const spacingTokens = ["none", "sm", "md", "lg"] as const;
type WidgetSpacing = (typeof spacingTokens)[number];

const spacingClassMap: Record<WidgetSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

function resolveSpacing(value: unknown, fallback: WidgetSpacing): WidgetSpacing {
  if (value === "0") return "none";
  return spacingTokens.includes(value as WidgetSpacing) ? (value as WidgetSpacing) : fallback;
}
```

For optional class presets such as typography size:

```ts
const fontSizeClassMap: Record<WidgetFontSize, string> = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};
```

## Testing Requirements

- Focused Vitest editor tests for every touched editor select.
- Unit/widget render tests proving `none` produces no forced class or a zero
  spacing class, depending on field semantics.
- Schema/normalizer tests proving `none` is accepted and bogus values still
  fall back or reject as they do today.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md` examples and token lists
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Acceptance Criteria

1. Every off-capable widget visual token exposes `none` in the admin editor.
2. Runtime rendering treats `none` deterministically without invalid class names.
3. Existing saved widget data remains backward compatible.
4. Structural options do not receive misleading `none` values.
5. Focused editor, schema, normalizer, render, lint, and type checks are recorded.
