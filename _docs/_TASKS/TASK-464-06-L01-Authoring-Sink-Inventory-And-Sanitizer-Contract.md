# TASK-464-06-L01: Authoring Sink Inventory And Sanitizer Contract
# FileName: TASK-464-06-L01-Authoring-Sink-Inventory-And-Sanitizer-Contract.md

**Parent Subtask:** TASK-464-06
**Priority:** High
**Category:** Pages / Admin UI / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-464-05-L03
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Inventory every author-controlled value that enters Page Editor rendering or
mutation paths and freeze the sanitizer ownership contract before adding new
helpers.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] List text sinks: inline edit, labels, template summaries, layer labels,
      tooltip/control labels, and host appearance copy from data.
- [x] List URL/media/embed sinks.
- [x] List style/color/numeric sinks.
- [x] Freeze a field-by-field policy for current Page v2 sinks: block
      `href`, `src`, `image`, `url`, and `html`; list item `href`; media
      gallery/video/image sources; section `backgroundImage`; block
      style/background/color fields; gradients; embed URLs/HTML; host
      appearance fields; and Menu Design style fields.
- [x] Identify existing sanitizer owners and missing gaps, including
      `widgetSafeHref`, existing widget color normalizers,
      `pageInlineEditContract`, and TASK-463 embed sanitizers.
- [x] Update security docs or TASK-464 docs with the sanitizer contract.

---

## Implementation Pseudocode

```ts
type AuthoringSink = {
  source: "inline-edit" | "registry-control" | "template" | "host-appearance" | "runtime-binding";
  valueKind: "text" | "url" | "media" | "style" | "html-like";
  fieldPath: string;
  renderSink: string;
  mutationSink: string;
  allowedPolicy: "text" | "link-url" | "media-url" | "embed-url" | "safe-html" | "color" | "gradient" | "numeric" | "enum";
  sanitizerOwner: string;
};

function freezeAuthoringSinkInventory(): readonly AuthoringSink[] {
  return inspectEditorModules().map(classifyAuthoringSink);
}
```

Expected data flow:

- Documentation-only or test-only changes.
- No runtime behavior changes in this leaf.

Error handling:

- Unknown sink ownership blocks TASK-464-06-L02 until resolved.
- Missing field-path policy for any render-sensitive sink blocks
  TASK-464-06-L02 until resolved.

Regression-test shape:

- Add failing tests only when they describe a concrete sanitizer gap to fix in
  TASK-464-06-L02.

---

## Security Contract

- No route changes.
- No sanitizer bypasses may be accepted as known debt unless split into a
  blocking follow-up before TASK-464 closes.
- The inventory must explicitly cover link URLs, media URLs, image/video/gallery
  sources, section background images, embed URLs/HTML, colors, gradients, host
  appearance style fields, and Menu Design style fields.
- Do not create duplicate URL/color sanitizer ownership if an existing owner can
  be reused or moved into a shared authoring sanitizer module.
- Do not add scanner suppressions in this leaf.

---

## Testing Requirements

- `rg -n "dangerouslySetInnerHTML|innerHTML|javascript:|onerror|style=|backgroundImage|iframe|embed" core/admin core/services/pages tests`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if the reusable sanitizer policy changes.
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
