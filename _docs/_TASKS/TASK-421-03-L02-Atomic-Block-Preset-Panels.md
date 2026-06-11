# TASK-421-03-L02: Atomic Block Preset Panels
# FileName: TASK-421-03-L02-Atomic-Block-Preset-Panels.md

**Parent Subtask:** TASK-421-03
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-03-L01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the block-level inspector preset surface for atomic Page blocks.
Blocks keep focused controls: content where needed, layout width/alignment,
style/typography/background, spacing, responsive, and visibility (the
Responsive tab's control content is owned by TASK-425; this leaf renders only
the category shell for it). Avoid recreating legacy widget editor complexity.

The block inspector must expose the same ergonomic primitives as sections:
segmented choices for small option sets, toggles for booleans, sliders for
bounded dimensions/opacity/spacing, swatches/pickers for colors, and media
source controls for media. Raw text remains appropriate only for copy, alt text,
hrefs, anchors, and similar free-form values.

---

## Implementation Pseudocode

```tsx
function BlockInspectorPanels({ block }) {
  const controls = getPageEditorControlsForTarget({ kind: "block", type: block.type });
  return groupBlockControlsByPanel(controls, {
    content: "type-owned text/media/options",
    layout: "width align layout-atom presets",
    style: "text color radius shadow opacity typography",
    spacing: "padding margin gap",
    background: "background type color media",
    visibility: "visible"
  });
}
```

Expected data flow:

- Atomic block controls remain owned by `pageBlockControlRegistry`.
- Layout blocks (`container`, `columns`, `group`) expose only bounded slot/layout
  controls already supported by Page v2.
- Data-bound blocks remain gated until their capability/editor controls allow
  editing.
- Card/stat/quote/divider/spacer and similar atom style controls use the shared
  adapter/primitives; they must not define one-off form controls.
- Button, image, heading, text, list, and media controls preserve their saved
  Page v2 paths while replacing native select/number/color text surfaces with
  ergonomic primitives.

Regression-test shape:

- Tests cover representative blocks: heading, button, image, divider, spacer,
  columns, group, quote.
- Tests assert the representative block controls include segmented, switch,
  slider, swatch/picker, and media primitives where applicable.
- Save payloads prove paths are unchanged.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** block fields go through existing Page v2 normalizers.
- **Anti-abuse controls:** media/url controls preserve existing safe href/media
  behavior.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- None beyond the parent family docs; TASK-421-05 owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11 (see TASK-421-03): block panels render dedicated widgets for all 14 insertable types; live classifier on button confirms segmented variant/size/target, swatch colors, slider radius/opacity, switch visible.
