# TASK-242-01-01: Widget Config Token Inventory

# FileName: TASK-242-01-01_Widget_Config_Token_Inventory.md

**Priority:** High
**Category:** Widgets + Inventory
**Estimated Effort:** Small
**Dependencies:** TASK-242-01
**Status:** To Do

---

## Overview

Create a checked inventory of widget schema enums and editor option arrays that
look like visual tokens. Use the current code, not only docs, as the source of
truth.

## Inventory Owners

| Owner group | Files to inspect |
|---|---|
| Core definitions | `core/widgets/core/*.tsx` |
| Admin editors | `core/admin/ui/widgets/editors/*.tsx` |
| UI tests | `tests/vitest/ui/*editor-wave.test.tsx` |
| Widget render tests | `tests/unit/widgets/*.test.tsx` |
| Docs | `_docs/WIDGETS.md`, `_docs/_WIDGETS/*.md` |

## Required Classification

Each enum-like field must be classified as one of:

- `add-none`: visual token that needs a new off option;
- `legacy-zero`: visual token where `"0"` already disables output and `none`
  should be accepted as a clearer alias;
- `already-none`: field already supports `none`;
- `exclude-structural`: counts, ratios, variants, source modes, and alignment;
- `exclude-existing-off`: field already has another clear off switch, such as
  `guides.enabled`.

## Initial Findings

Use this as the seed list and update it if the scan finds drift:

| Widget | Add or alias `none` for |
|---|---|
| `hero` | `layout.maxWidth`, `layout.contentWidth`, `style.headlineSize`, `style.subheadSize`, `style.bodySize`, `style.borderRadius`, `style.mediaRadius`, `style.primaryButtonSize`, `style.secondaryButtonSize` |
| `navigation` | `layout.maxWidth`, `layout.paddingY`, `layout.itemGap`, `style.fontSize` |
| `footer` | `layout.maxWidth`, `layout.columnGap`, `layout.sectionPaddingY`, `style.fontSize` |
| `stack` | responsive `gap` tokens, preserving `"0"` compatibility |
| `splitLayout` | `gap`, preserving `"0"` compatibility |
| `gridColumns` | `layout.gapX`, `layout.gapY`, `style.columnPadding` |
| `divider` | `marginTop`, `marginBottom`, preserving `"0"` compatibility |
| `spacer` | responsive `height`, preserving `"0"` compatibility |
| `screenTwoColumn` | `gap` |
| `statsKpi` | `style.spacing` |
| `featureGrid` | `style.gap` |
| `contentList` | `style.gap` |
| `postsFeed` | `style.gap` |
| `entryTeaser` | `style.spacing`, `style.radius` |
| `galleryMosaic` | `style.gap` |
| `ctaBanner` | `style.padding` |
| `pricingPlans` | `style.spacing` |
| `faqAccordion` | `style.spacing` |
| `team` | `style.gap` |
| `testimonials` | `style.spacing` |
| `contact` | `style.spacing` |
| `newsletter` | `style.spacing` |
| `formEmbed` | `layout.width`, `layout.spacing`, `style.radius`, `style.inputSize` |
| `logoCloud` | `style.logoHeight`, `style.gap` |
| `richTextSection` | `style.fontScale`, `style.spacing`; confirm whether `options.maxWidth = "full"` remains the off switch |
| `timeline` | `layout.spacing`, `style.titleSize`, `style.descriptionSize`; confirm whether marker/line size needs `none` or should stay structural |
| `compareTimeline` | `layout.trackSpacing`, `style.trackLabelSize`, `style.stepLabelSize`, `style.segmentLabelSize` |

Explicitly exclude unless product scope changes:

- `columns` in content/list/grid/team/product widgets;
- `ratio` in gallery and split layout;
- `borderWidth`/`borderTopWidth`, because `"0"` is already the border off
  value;
- `textTransform`, media `type`, and background media `type`, because they
  already use semantic `none`.

## Pseudocode

```ts
const offCapableNames = /spacing|gap|padding|radius|font|size|height|width/i;
const structuralNames = /columns|span|ratio|variant|source|align|orientation/i;

function classifyField(name: string, values: string[]) {
  if (structuralNames.test(name)) return "exclude-structural";
  if (values.includes("none")) return "already-none";
  if (values.includes("0")) return "legacy-zero";
  if (offCapableNames.test(name)) return "add-none";
  return "review";
}
```

## Testing Requirements

- No production test changes in this leaf.
- Record the final inventory in TASK-242 before implementation starts.

## Documentation Updates Required

- `_docs/_TASKS/TASK-242_Widget_Style_Token_None_Options.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every core widget enum-like visual field has an owner decision.
2. Editor option arrays are mapped to the same field decisions.
3. Exclusions are explicit and defensible.
