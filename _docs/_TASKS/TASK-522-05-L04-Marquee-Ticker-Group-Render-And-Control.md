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

- `group` block render (grep `renderGroupBlock` / the group branch in
  `pageRendererV2.tsx`; `group` props `["direction","wrap","gap"]`,
  `pageBlockPropKeys.group`). VERIFY the group render function live.
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
// group render — when style.marquee set, wrap children in a moving track:
const marquee = block.style?.marquee;
if (marquee) {
  const track = <div className="cx-marquee-track">{children.map(renderChildFrame)}</div>;
  return (
    <div className="cx-marquee-viewport" /* overflow:hidden; the frame resolver already
         put data-marquee + --marquee-speed + data-marquee-dir on the block wrapper */>
      {track}
      {marquee.seamless ? <div className="cx-marquee-track" aria-hidden="true">{children.map(renderChildFrame)}</div> : null}
    </div>
  );
}
// else render the group as today (flow).
// NOTE: the animation binds `.cx-marquee-track` by CLASS (522-01-L04), so the
// overflow:hidden `.cx-marquee-viewport` clip window stays put while the inline-flex
// track scrolls. Both base rules live in 522-01-L04.
```

```ts
// pageEditorControlRegistry.ts — append to pageBlockControlRegistry.group (per-type;
// live control({...}) shape). The model is { speed?; direction?; seamless? } guarded
// by assertKnownKeys (522-01-L03) — there is NO `enabled` key, and writing one would
// throw an unknown-key PageDocumentError + fail the additionalProperties:false schema.
// PRESENCE convention: the marquee object exists (a speed is set) ⇒ ticker ON; clearing
// speed empties the object which normalize omits ⇒ OFF. So `speed` IS the on/off:
control({ id:"group.marquee.speed", panel:"style", target:"block", label:"Ticker speed",
  path:["style","marquee","speed"], input:"number", responsive:true, clamp:{min:8,max:40}, unit:"s" }),
control({ id:"group.marquee.direction", panel:"style", target:"block", label:"Ticker direction",
  path:["style","marquee","direction"], input:"select", responsive:true, options:pageMarqueeDirections }),
control({ id:"group.marquee.seamless", panel:"style", target:"block", label:"Seamless loop",
  path:["style","marquee","seamless"], input:"switch", responsive:true }),
// No `enabled` key (unallowlisted). No showWhen (direction/seamless always shown —
// inert with no speed). Set a speed to enable; clear it to disable (documented UX).
```

## Regression-test shape (delegated to 522-05-L05, asserted here)

- A `group` block with `style.marquee.speed:18`,`seamless:true` → the block-FRAME
  wrapper carries `data-marquee` + `--marquee-speed:18s`, its content is one
  `.cx-marquee-viewport` containing two `.cx-marquee-track`s (one aria-hidden);
  `direction:"right"` → `data-marquee-dir="right"`; no marquee (no speed) → normal
  group flow (byte-identical). The `group.marquee.*` controls write only
  `speed`/`direction`/`seamless` (NO `enabled` key — a `marquee:{enabled:…}` write
  throws `PageDocumentError`).
- **Lane:** Vitest `page-renderer-v2.test.tsx` + `page-editor-control-registry.test.ts`.

## Hard Invariants

1. Marquee is a `group`-only per-type control; other block types unaffected.
2. Ticker animation binds `.cx-marquee-track` (not the viewport) + reduced-motion
   gated (522-01-L04); static row for reduce.
3. No marquee → byte-identical group; presence via `speed` (no `enabled` key).
</content>
