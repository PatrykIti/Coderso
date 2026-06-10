# TASK-421-03-L02: Atomic Block Preset Panels
# FileName: TASK-421-03-L02-Atomic-Block-Preset-Panels.md

**Parent Subtask:** TASK-421-03
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-03-L01
**Status:** ⏳ To Do

---

## Overview

Implement the block-level inspector preset surface for atomic Page blocks.
Blocks keep focused controls: content where needed, layout width/alignment,
style/typography/background, spacing, responsive, and visibility. Avoid
recreating legacy widget editor complexity.

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

Regression-test shape:

- Tests cover representative blocks: heading, button, image, divider, spacer,
  columns, group, quote.
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
