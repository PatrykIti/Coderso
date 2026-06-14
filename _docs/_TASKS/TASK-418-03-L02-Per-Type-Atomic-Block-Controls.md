# TASK-418-03-L02: Per Type Atomic Block Controls
# FileName: TASK-418-03-L02-Per-Type-Atomic-Block-Controls.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / Blocks
**Estimated Effort:** Large
**Dependencies:** TASK-418-03-L01
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09
**Pre-Implementation Audit:** Read-only subagent
`019eae6a-5b8f-76c0-aaf1-fb8570798dc3` found contract drift before source
implementation; this task contract was corrected before code edits.
**Fresh Audit After Contract Correction:** Read-only subagent
`019eae6e-e9eb-75b1-a52a-1d0f18b4b1b9` reported no remaining High, Medium, or
Low contract blocker before source implementation.

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
    control("text", ["props", "text"]),
    control("level", ["props", "level"], { input: "select", options: pageHeadingLevels }),
    control("align", ["props", "align"], { input: "segmented" })
  ],
  button: [
    control("label", ["props", "label"]),
    control("href", ["props", "href"]),
    control("target", ["props", "target"], { input: "select" }),
    control("variant", ["props", "variant"], { input: "select" }),
    control("size", ["props", "size"], { input: "select" })
  ],
  image: [
    control("src", ["props", "src"], { input: "media" }),
    control("alt", ["props", "alt"]),
    control("caption", ["props", "caption"]),
    control("fit", ["props", "fit"], { input: "select" })
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
- Per-type controls use array paths (`readonly string[]`) and matching
  responsive `overridePath` values, not dot-string paths.
- `PageEditor` must consume `getPageEditorControlsForTarget`/registry metadata
  for selected block controls instead of hard-coded per-type prop knowledge.
- Registry-driven PageEditor helpers must read and patch `props`, `style`, and
  `visibility` array paths, preserving the existing rule that desktop edits write
  the base block while tablet/mobile edits write sparse responsive overrides.
- The toolbar panel model must include every registry panel that is rendered in
  this leaf. If `background` controls are exposed, `ToolbarPanel` must include
  `background`; otherwise those controls must remain deferred and hidden by the
  registry consumer contract.
- The block inserter must derive insertable choices from `pageBlockCapabilities`
  so every block with `insertable: true` is reachable from the editor, including
  `video`, `statistic`, and `quote`.
- `PageBlockCapabilitiesV2` must own an explicit `reason` for non-insertable
  block types, matching the parent requirement that each block has controls or a
  not-insertable reason.
- Any per-type prop listed in the audit report/control matrix but missing from
  `pageBlockPropKeys` must either extend the Pages owner allowlist, defaults,
  JSON schema, renderer, and tests in the same leaf, or be removed from the
  control matrix before UI controls are added.
- Select options come from owner-exported Page metadata arrays, not local UI
  literals.
- This includes adding owner arrays/normalization for enum-like block and style
  props before rendering selects or segmented controls, including at minimum
  `pageBlockWidths`, `pageImageFits`, `pageGalleryLayouts` when gallery remains
  modeled, and `pageDividerTones`.
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
- Every insertable block type appears in the admin block inserter.
- Every registry prop path under `["props", key]` is present in
  `pageBlockPropKeys[type]`.
- Every registry `select`/`segmented` option set is owner-exported from
  `pageDocumentV2`; no UI-local enum copies.
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
- Vitest parity coverage that every registry prop path is present in the Pages
  owner allowlist/schema for that block type.
- Vitest parity coverage that every select/segmented option set comes from
  owner-exported Page metadata.
- Vitest UI round-trip tests for representative block controls.
- Vitest UI coverage that the inserter exposes all owner-insertable blocks and
  hides non-insertable blocks with owner reasons.
- Runtime tests are owned by TASK-418-06 before unsupported blocks become
  insertable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`

---

## Completion Notes

- `pageDocumentV2` now owns block option arrays, non-insertable block reasons,
  enum-like prop normalization/schema, and numeric clamps for divider/spacer
  controls.
- `pageEditorControlRegistry` now provides per-type atomic controls for every
  owner-insertable block and keeps non-insertable block registries empty.
- `PageEditor` renders selected-block controls from registry metadata and derives
  the block inserter from `pageBlockCapabilities`.
- Validation passed:
  - `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - `bun --cwd core lint:types`
  - `bun --cwd core lint`
