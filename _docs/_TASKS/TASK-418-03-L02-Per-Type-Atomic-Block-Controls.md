# TASK-418-03-L02: Per Type Atomic Block Controls
# FileName: TASK-418-03-L02-Per-Type-Atomic-Block-Controls.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / Blocks
**Estimated Effort:** Large
**Dependencies:** TASK-418-03-L01
**Status:** ⏳ To Do

---

## Overview

Expose small, focused controls for every insertable block type. These controls
must be atomic enough to keep Pages maintainable, but complete enough that a
user can actually configure default inserted blocks without falling back to raw
JSON or hidden widget-style panels.

---

## Implementation Pseudocode

```ts
const pageBlockControlRegistry = defineBlockControls({
  heading: [
    control("text", "props.text"),
    control("level", "props.level", { input: "select", options: pageHeadingLevels }),
    control("align", "props.align", { input: "segmented" })
  ],
  button: [
    control("label", "props.label"),
    control("href", "props.href"),
    control("target", "props.target", { input: "select" }),
    control("variant", "props.variant", { input: "select" }),
    control("size", "props.size", { input: "select" })
  ],
  image: [
    control("src", "props.src", { input: "media" }),
    control("alt", "props.alt"),
    control("caption", "props.caption"),
    control("fit", "props.fit", { input: "select" })
  ]
});

function renderBlockControls(blockType, block) {
  return pageBlockControlRegistry[blockType].map((definition) =>
    renderControl(definition, readPath(block, definition.path))
  );
}
```

Expected data flow:

- Per-type controls are generated from or validated against `pageBlockPropKeys`.
- Editor controls patch the selected block, not the first block.
- Controls are grouped into content/style/layout/background/visibility panels.

Error handling:

- If a block type lacks a real renderer or persistence contract, mark it
  not-insertable until runtime parity lands.
- Invalid list/gallery/collection/form payloads must normalize or fail with
  bounded UI copy.

Regression-test shape:

- Each `pageBlockTypes` member has controls or an explicit not-insertable
  reason.
- Button label/href/target/variant/size round-trip.
- Image src/alt/caption/fit round-trip.
- List items and ordered mode round-trip.
- Card/statistic/quote/divider/spacer controls round-trip.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages write permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** controls must write only allowlisted props for that block type
  and must preserve strict reject-unknown server validation.
- **Anti-abuse controls:** media/embed/html-like controls must preserve existing
  sanitizer and trusted-source policies; no secrets in browser state.

---

## Testing Requirements

- Vitest registry coverage for all block types.
- Vitest UI round-trip tests for representative block controls.
- Runtime tests are owned by TASK-418-06 before unsupported blocks become
  insertable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
