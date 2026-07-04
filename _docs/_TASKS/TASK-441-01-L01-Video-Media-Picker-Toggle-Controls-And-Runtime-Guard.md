# TASK-441-01-L01: Video Media Picker Toggle Controls And Runtime Guard
# FileName: TASK-441-01-L01-Video-Media-Picker-Toggle-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-441-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-441-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Verify the shared media-picker path for Video, the dedicated switch controls
for autoplay/muted/visible, and the remaining shared dedicated-control drift
from the audit for layout/style/background/visibility through the shared
`TASK-421` surface work. This leaf also owns the runtime fix: `block.props.autoplay`
binds to the rendered `<video>` element with the standard autoplay-policy
companions, and `block.props.title` reaches the rendered media element as
accessible labeling metadata.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Editor surface: the registry already declares the right inputs
// (core/services/pages/pageEditorControlRegistry.ts:684-689 — src: "media",
// autoplay/muted: "switch"); verify they resolve through
// getPageEditorControlsForTarget({ kind: "block", type: "video" })
// (pageEditorControlRegistry.ts:870-890) and render via the shared TASK-421
// media-picker/toggle widgets in PageEditor.
const videoControls = getPageEditorControlsForTarget({ kind: "block", type: "video" });

// Runtime fix in the `case "video"` branch of renderPageBlockContent
// (core/services/pages/pageRendererV2.tsx:1452-1468):
const autoplay = readBoolean(block.props.autoplay, false);
const title = readText(block.props.title);
<video
  className="w-full rounded"
  src={src}
  title={title || undefined}
  aria-label={title || undefined}
  controls
  autoPlay={autoplay}
  // Autoplay-policy companions: browsers only honor autoplay when muted;
  // playsInline avoids forced fullscreen on mobile.
  muted={readBoolean(block.props.muted, true) || autoplay}
  playsInline={autoplay || undefined}
/>;
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Video source selection resolves through the shared media picker.
- Autoplay/muted/visible write through boolean owner fields, not select strings.
- `autoPlay={readBoolean(block.props.autoplay, false)}` reaches the rendered
  `<video>` element in the `case "video"` branch of
  `core/services/pages/pageRendererV2.tsx`, with `muted`/`playsInline` forced on
  while autoplay is enabled so browser autoplay policies allow playback; the
  toggle must have a visible published-front effect, not stay a dead prop.
- `title` reaches the rendered `<video>` as both `title` and `aria-label` when
  present, and stays absent when empty.
- Published runtime keeps rendering a real video block.

Error handling:

- Unsupported media types remain rejected.
- Missing or unsafe sources degrade to the current safe runtime behavior.

Regression-test shape:

- Vitest UI coverage for media/toggle controls.
- Vitest renderer regression (extend `tests/vitest/pages/page-renderer-v2.test.tsx`,
  which today only exercises an empty-src video placeholder) asserting that
  `autoplay` and `muted` reach the rendered `<video>` element: autoplay=true
  emits `autoplay` plus the muted/playsinline companions, autoplay=false emits
  no `autoplay` attribute, and `title` emits accessible media labels.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Video fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Video runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
