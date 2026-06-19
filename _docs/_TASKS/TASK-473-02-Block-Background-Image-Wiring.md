# TASK-473-02: Block Background Image Wiring
# FileName: TASK-473-02-Block-Background-Image-Wiring.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Blocks accept `backgroundType: "image"` in the schema, but no media picker is
registered for blocks (only sections have one), so the image background type is
unreachable from the UI and unpainted. Add a block-level background-image media
control and paint it, reusing the section media-URL policy and sanitizer.

`backgroundType: "video"` for blocks is explicitly **out of scope** here (defer
to a follow-up) unless it is trivially shared with the image path.

---

## Current State (verified)

- `core/services/pages/pageDocumentV2.ts` (`PageBlockStyleV2`, `pageBackgroundTypes`)
  — block `backgroundType` allows `none|color|gradient|image|video`, but there is
  no block `backgroundImage` field/control wired.
- `core/services/pages/pageRendererV2.tsx:446-468` — `toPageBlockVisualStyle`
  paints `backgroundColor` and the gradient `backgroundImage`, but not an image
  URL background for blocks.
- Sections already expose a background-image media picker + media-URL sanitizer
  (reference pattern to reuse).

---

## Sub-Tasks

- [ ] Add a block `style.backgroundImage` field (sanitized media URL) to the
      schema + `normalizeBlockStyle`, gated to `backgroundType === "image"`.
- [ ] Register a `block.style.backgroundImage` control (`input: "media"`,
      `panel: "background"`), surfaced when `backgroundType === "image"` (reuse
      the section media picker pattern + media-URL policy).
- [ ] Paint the image in `toPageBlockVisualStyle`: `background-image: url(<safe>)`
      with sensible `background-size: cover` / `background-position: center`
      defaults; ensure it composes with text color/overlay legibility.
- [ ] Reproduce the section background-image media-URL policy first; reuse it
      verbatim (no weaker one-off).
- [ ] Add render + sanitizer coverage (safe URL paints; unsafe/`javascript:`/
      arbitrary `url()` fails closed).

---

## Implementation Pseudocode

```ts
// pageDocumentV2.ts — PageBlockStyleV2: backgroundImage?: string (sanitized media URL)
// control: { id:"block.style.backgroundImage", panel:"background", input:"media",
//            path:["style","backgroundImage"] }  // shown when backgroundType==="image"

// pageRendererV2.tsx — toPageBlockVisualStyle
const bgUrl = style.backgroundType === "image"
  ? sanitizeAuthoringUrl(style.backgroundImage, { kind: "media-url" })   // reuse owner
  : undefined;
return {
  // …unchanged
  backgroundImage: bgUrl ? `url("${bgUrl}")` : <gradient branch>,
  backgroundSize: bgUrl ? "cover" : undefined,
  backgroundPosition: bgUrl ? "center" : undefined,
};
```

Regression-test shape:
- `backgroundType:"image"` + safe media URL ⇒ painted `url(...)` + cover/center.
- Unsafe/`javascript:` URL ⇒ no background-image (fails closed).
- `backgroundType:"color"`/`"gradient"`/`"none"` unaffected (no regression).

---

## Security Contract

- No new endpoints. Background image URL passes the shared media-URL
  policy/sanitizer (`sanitizeAuthoringUrl({ kind: "media-url" })`); no arbitrary
  `url()` injection, no `javascript:`/`data:` beyond the media policy. Reuse the
  section owner — no weaker one-off.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md` (media sink).
- `_docs/_TASKS/TASK-473*.md` (status), `_docs/_CHANGELOG/` on task closure.
