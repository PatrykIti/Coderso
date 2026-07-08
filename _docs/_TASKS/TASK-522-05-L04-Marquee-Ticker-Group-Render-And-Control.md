# TASK-522-05-L04: Marquee / Ticker Group Render + Control

# FileName: TASK-522-05-L04-Marquee-Ticker-Group-Render-And-Control.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** Medium
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Turns a `group`/row block with `style.marquee` into a horizontal
auto-scrolling strip (`@keyframes cx-ticker`, reference `.ticker`
`styles.css:76`), with an optional duplicated track for a seamless loop. Edits:
`pageRendererV2.tsx` the `group`-block render region — when `style.marquee` is set
(a `speed` present), render the children inside a `.cx-marquee-viewport` >
`.cx-marquee-track` (the block-FRAME wrapper already carries `data-marquee` +
`--marquee-speed` + `data-marquee-dir` from the 522-03 frame resolver) and, if
`seamless`, render a second aria-hidden copy of the track; `pageEditorControlRegistry.ts`
`pageBlockControlRegistry.group` — append the `group.marquee.*` control group (per
type — shows only on `group`).

## Grounded anchors

- `group` block render is the `block.type === "group"` arm of the ONE shared
  `renderPageLayoutBlockContent(block, context)` (`pageRendererV2.tsx:1742`) — NOT a
  `renderGroupBlock` function and NOT a `children` array. Today that arm returns
  `renderSlotWrapper({block, slotKey, className:flex…, children: renderPageBlockList(
  block.slots?.[slotKey] ?? [], {…context})})` (`:1744`-`:1765`); `slotKey` is the single
  group slot (`slotKeys[0]`, from `getPageBlockActiveSlotKeys` at `:1692`); `group` props
  `["direction","wrap","gap"]`. So this leaf branches INSIDE the group arm on
  `style.marquee` and sources children from `block.slots?.[slotKey]` via
  `renderPageBlockList` — there is no `children.map`.
- `pageBlockControlRegistry.group` (`pageEditorControlRegistry.ts` — the `group:`
  per-type array; `icon:[]` at `:903` for shape). Marquee is a `group`-only control
  (like a per-type prop-ish style), so it lives in the per-type registry, not the
  universal array.
- CSS: `[data-marquee] .cx-marquee-track{animation:cx-ticker …}` +
  `[data-marquee][data-marquee-dir="right"] .cx-marquee-track{animation-direction:reverse}`,
  gated by `prefers-reduced-motion: no-preference` (522-01-L04). The animation targets
  the `.cx-marquee-track` by CLASS — NOT `[data-marquee] > *`, which would hit the
  `.cx-marquee-viewport` (the overflow:hidden clip window, a direct child of the
  `data-marquee` block-frame) and translate the clip instead of scrolling content.
  `@keyframes cx-ticker{to{transform:translateX(-50%)}}` (−50% because the seamless
  track is doubled). `.cx-marquee-viewport`/`.cx-marquee-track` base rules also live in
  522-01-L04.

## Implementation pseudocode

```tsx
// EDIT the group arm of renderPageLayoutBlockContent (pageRendererV2.tsx:1742). When
// block.style?.marquee is set, render the group's SLOT children inside a marquee
// viewport>track instead of the flow flex renderSlotWrapper. Children come from
// block.slots (NO `children` array) via renderPageBlockList, exactly like the flow arm.
if (block.type === "group") {
  const marquee = block.style?.marquee;
  if (marquee) {
    const slotKey = slotKeys[0]!;              // group has a single slot (:1741)
    // `frame` toggles whether the child list is rendered with editable/selectable
    // block-frames. The PRIMARY track keeps the real context (so the builder canvas can
    // still select/edit the marquee items). The SEAMLESS duplicate is a decorative copy
    // and MUST render WITHOUT framing — omit renderBlockFrame so renderPageBlockList emits
    // NO [data-block-id] / selection chrome on the copy; otherwise the canvas would carry
    // TWO DOM nodes matching [data-block-id=…] per item (duplicate selection targets +
    // doubled chrome), since renderPageBlockContent also drives the authoring canvas
    // (Hard Invariant 8). aria-hidden alone does not strip the ids (finding 3).
    const renderTrackChildren = (frame: boolean) => renderPageBlockList(block.slots?.[slotKey] ?? [], {
      parentPath: context.blockPath,
      depth: context.depth + 1,
      includeHiddenBlocks: context.includeHiddenBlocks,
      renderBlockFrame: frame ? context.renderBlockFrame : undefined,   // copy = no frames/ids
      renderInlineText: context.renderInlineText,
      renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
      runtimeDataByBlockId: context.runtimeDataByBlockId,
      layoutMode: context.layoutMode,
      slotKey,
      parentBlock: block,
    });
    // the block-FRAME wrapper already carries data-marquee + --marquee-speed +
    // data-marquee-dir (522-03 frame resolver). Animation binds .cx-marquee-track by
    // CLASS (522-01-L04), so the overflow:hidden viewport stays put while the track scrolls.
    return (
      <div className="cx-marquee-viewport">
        <div className="cx-marquee-track">{renderTrackChildren(true)}</div>
        {marquee.seamless ? (
          <div className="cx-marquee-track" aria-hidden="true">{renderTrackChildren(false)}</div>
        ) : null}
      </div>
    );
  }
  // else: the existing group flex renderSlotWrapper branch (:1744-1765), UNCHANGED.
  return renderSlotWrapper({ block, slotKey: slotKeys[0]!, className: /* flex… */, children: /* renderPageBlockList… */ });
}
// NOTE: the seamless duplicate re-renders the SAME slot list as an aria-hidden decorative
// copy WITH FRAMING DISABLED (renderBlockFrame:undefined) so it carries NO [data-block-id]
// / selection chrome in the builder canvas — only the primary track is selectable; the two
// tracks together translateX(-50%) for a seamless loop. `.cx-marquee-*` base rules live in
// 522-01-L04.
```

```ts
// pageEditorControlRegistry.ts — append to pageBlockControlRegistry.group (per-type;
// live control({...}) shape). The model is { speed?; direction?; seamless? } guarded
// by assertKnownKeys (522-01-L03) — there is NO `enabled` key, and writing one would
// throw an unknown-key PageDocumentError + fail the additionalProperties:false schema.
// PRESENCE convention: the marquee object exists (a speed is set) ⇒ ticker ON; clearing
// speed empties the object which normalize omits ⇒ OFF. So `speed` IS the on/off:
// responsive:false — the marquee renders as a base-only .cx-marquee track + animation
// class; pageResponsiveCss.ts cannot express a per-breakpoint class/animation delta
// against the inline base, so a per-device marquee override would be a silent no-op
// (finding-6 fix; matches parent Acceptance #7).
control({ id:"group.marquee.speed", panel:"style", target:"block", label:"Ticker speed",
  path:["style","marquee","speed"], input:"number", responsive:false, clamp:{min:8,max:40}, unit:"s" }),
control({ id:"group.marquee.direction", panel:"style", target:"block", label:"Ticker direction",
  path:["style","marquee","direction"], input:"select", responsive:false, options:pageMarqueeDirections }),
control({ id:"group.marquee.seamless", panel:"style", target:"block", label:"Seamless loop",
  path:["style","marquee","seamless"], input:"switch", responsive:false }),
// No `enabled` key (unallowlisted). No showWhen (direction/seamless always shown —
// inert with no speed). Set a speed to enable; clear it to disable (documented UX).
```

## Regression-test shape (delegated to 522-05-L05, asserted here)

- A `group` block with `style.marquee.speed:18`,`seamless:true` → the block-FRAME
  wrapper carries `data-marquee` + `--marquee-speed:18s`, its content is one
  `.cx-marquee-viewport` containing two `.cx-marquee-track`s (one aria-hidden);
  `direction:"right"` → `data-marquee-dir="right"`; no marquee (no speed) → normal
  group flow (byte-identical). **Seamless copy carries NO editable frames (finding 3):**
  rendered in CANVAS mode (a `renderBlockFrame` present), the PRIMARY track's items carry
  `data-block-id` but the aria-hidden duplicate track's items carry NONE — so each item's
  `data-block-id` matches exactly ONE DOM node (no duplicate selection targets). The
  `group.marquee.*` controls write only
  `speed`/`direction`/`seamless` (NO `enabled` key — a `marquee:{enabled:…}` write
  throws `PageDocumentError`).
- **Lane:** Vitest `page-renderer-v2.test.tsx` + `page-editor-control-registry.test.ts`.

## Hard Invariants

1. Marquee is a `group`-only per-type control; other block types unaffected.
2. Ticker animation binds `.cx-marquee-track` (not the viewport) + reduced-motion
   gated (522-01-L04); static row for reduce.
3. No marquee → byte-identical group; presence via `speed` (no `enabled` key).
</content>
