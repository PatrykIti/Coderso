# TASK-441-01-L01: Video Media Picker Toggle Controls And Runtime Guard
# FileName: TASK-441-01-L01-Video-Media-Picker-Toggle-Controls-And-Runtime-Guard.md

**Parent Subtask:** TASK-441-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-441-01
**Status:** ⏳ To Do

---

## Overview

Replace raw source entry with the shared media-picker path for Video, replace the current yes/no selects for autoplay/muted/visible with the dedicated toggle controls, and close the remaining shared dedicated-control drift from the audit for layout/style/background/visibility through the shared `TASK-421` surface work. This leaf also owns a runtime fix, not just preservation: `block.props.autoplay` is currently a dead prop — the `case "video"` branch of `core/services/pages/pageRendererV2.tsx` (~lines 770-784) binds only `src`/`controls`/`muted`, so toggling Autoplay has zero effect on the published page. The leaf must bind autoplay to the rendered `<video>` element with the standard autoplay-policy companions.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Editor surface: the registry already declares the right inputs
// (core/services/pages/pageEditorControlRegistry.ts:418-421 — src: "media",
// autoplay/muted: "switch"); verify they resolve through
// getPageEditorControlsForTarget({ kind: "block", type: "video" })
// (pageEditorControlRegistry.ts:508) and render via the shared TASK-421
// media-picker/toggle widgets in RegistryControlField (PageEditor.tsx ~2524-2614).
const videoControls = getPageEditorControlsForTarget({ kind: "block", type: "video" });

// Runtime fix in the `case "video"` branch of renderPageBlockContent
// (core/services/pages/pageRendererV2.tsx ~770-784) — bind the dead autoplay prop:
const autoplay = readBoolean(block.props.autoplay, false);
<video
  className="w-full rounded"
  src={src}
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
  no `autoplay` attribute.

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
