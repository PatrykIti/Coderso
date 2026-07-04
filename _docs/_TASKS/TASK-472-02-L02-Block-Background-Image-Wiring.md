# TASK-472-02-L02: Block Background Image Wiring
# FileName: TASK-472-02-L02-Block-Background-Image-Wiring.md

**Parent Subtask:** TASK-472-02
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Blocks accept `backgroundType: "image"` but no media picker is registered for
blocks (only sections), so the image type is unreachable + unpainted. Add a
block-level background-image media control and paint it, reusing the section
media-URL policy. `backgroundType: "video"` for blocks is out of scope here.

## Current State (verified)

- `core/services/pages/pageDocumentV2.ts` — block `backgroundType` allows
  `none|color|gradient|image|video`; no block `backgroundImage` field/control.
- `core/services/pages/pageRendererV2.tsx:446-468` — `toPageBlockVisualStyle`
  paints color + gradient, not an image URL background for blocks.
- Sections already expose a bg-image media picker + media-URL sanitizer (reuse).

## Sub-Tasks

- [x] Add block `style.backgroundImage` (sanitized media URL) to schema +
      `normalizeBlockStyle` (add it to `pageBlockStyleKeys`; sanitize via
      `sanitizeAuthoringMediaUrl`, mirroring section `readOptionalMediaUrl`),
      gated to `backgroundType === "image"`.
- [x] Register `block.style.backgroundImage` control (`input:"media"`,
      `panel:"background"`), surfaced when `backgroundType === "image"` (reuse the
      section media picker + policy).
- [x] Paint `background-image: url(<safe>)` with `cover`/`center` defaults.
- [x] Reproduce the section media-URL policy first; reuse verbatim.
- [x] Render + sanitizer coverage.

## Implementation Pseudocode

```ts
// pageDocumentV2.ts — PageBlockStyleV2: backgroundImage?: string (sanitized media URL)
// control: { id:"block.style.backgroundImage", panel:"background", input:"media",
//            path:["style","backgroundImage"] }   // shown when backgroundType==="image"

// pageRendererV2.tsx — toPageBlockVisualStyle
const bgUrl = style.backgroundType === "image"
  ? sanitizeAuthoringMediaUrl(style.backgroundImage)   // = sanitizeAuthoringUrl(value, "media"); reuse section owner
  : undefined;
return {
  // …unchanged
  backgroundImage: bgUrl ? `url("${bgUrl}")` : <gradient branch>,
  backgroundSize: bgUrl ? "cover" : undefined,
  backgroundPosition: bgUrl ? "center" : undefined,
};
```

Regression-test shape:
- `backgroundType:"image"` + safe URL ⇒ painted `url(...)` + cover/center.
- Unsafe/`javascript:` URL ⇒ no background-image (fails closed).
- color/gradient/none unaffected.

## Security Contract

- No new endpoints. Background image URL passes the shared media-URL sanitizer
  `sanitizeAuthoringMediaUrl` (= `sanitizeAuthoringUrl(value, "media")`, the same
  owner sections use via `readOptionalMediaUrl`); no arbitrary `url()`/
  `javascript:`/`data:` beyond the media policy. Reuse the section owner — no
  weaker one-off.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-xss-guards.test.tsx`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`, `_docs/SECURITY_SPEC.md` (media sink).
- `_docs/_TASKS/TASK-472-02*.md` status; changelog rolled up by TASK-472-06.
