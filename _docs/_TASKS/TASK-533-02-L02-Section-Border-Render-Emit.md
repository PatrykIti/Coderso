# TASK-533-02-L02: Render Emit — Per-Edge Section Border on the Section Box

# FileName: TASK-533-02-L02-Section-Border-Render-Emit.md

**Parent Task:** TASK-533
**Parent Subtask:** TASK-533-02
**Priority:** High
**Category:** Site Render / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Emit the 533-02-L01 `section.style.border` per-edge fields at render, present-only, in
a labelled `TASK-533` region of `pageRendererV2.tsx`. Unset ⇒ zero bytes (byte-identical to
post-530).

**`toPageSectionStyle` has TWO return paths (verified 2026-07-09) — the border must be
placed correctly on BOTH plus the bleed box:**
- the **full-bleed** branch (`pageRendererV2.tsx:432-439`) returns ONLY
  `{--coderso-section-accent, padding, width, maxWidth, margin, gap}` — it deliberately
  carries NO `backgroundColor`/`backgroundImage`/`borderRadius`/`boxShadow`, because
  post-525 the full-bleed section PAINT (bg/radius/shadow) lives on the OUTER bleed box
  (`toPageSectionBleedStyle :464-490`), not this capped content div (see the `:424-430`
  comment);
- the **normal** branch (`:441-451`) carries `backgroundColor`/`backgroundImage`/
  `borderRadius`/`boxShadow` on the content box.

The reference `.intro-strip` draws its `border-block` on the SAME box that paints its
background/overflow. So the border must ride the box that visually IS the section frame:
for a **normal** section that is the content-box (`:441` return); for a **full-bleed**
section that is the **bleed box** (`toPageSectionBleedStyle`, the edge-to-edge frame).
Appending only to the normal-branch return would make full-bleed sections lose the border
entirely; appending only to the content-box for full-bleed would draw the hairline on the
capped inner div rather than the edge-to-edge frame — a fidelity mismatch vs `.intro-strip`.
**Decision (this leaf): emit the border on the content-box (normal branch, `:441`) AND on
the bleed box (`toPageSectionBleedStyle`, `:480` return) so it frames the section on the
same box that paints its background in each mode.** Do NOT add it to the full-bleed
content-box return (`:432`), whose paint is intentionally empty. Re-grep BOTH `toPageSectionStyle`
returns (`:432` and `:441`) AND `toPageSectionBleedStyle` (`:480`) at implement time.

## Grounded anchors (RE-GREP at implement time)

- **`toPageSectionStyle`** — `pageRendererV2.tsx:405`, with TWO returns: full-bleed
  content box (`:432-439`, paint-empty) and normal content box (`:441-451`, carries
  bg/radius/shadow). Emit the border into the **normal** return (`:441`) only.
- **`toPageSectionBleedStyle`** — `pageRendererV2.tsx:464-490`, the OUTER bleed box that
  paints bg/radius/shadow for full-bleed sections (`:480` return). Emit the same per-edge
  border here too, so a full-bleed section's frame draws edge-to-edge (matching where its
  background paints), NOT on the capped inner content div.
- **Block border emit precedent** — `toPageBlockVisualStyle` `:723-749` (uniform
  `borderColor`/`borderStyle`/`borderWidth`). 533-02's SECTION border is PER-EDGE, so
  emit `border{Top,Right,Bottom,Left}{Color,Width,Style}` keys, not the uniform ones.
- The border belongs on the SAME box that paints the section background in each mode
  (content box for normal, bleed box for full-bleed) so it frames the section like
  `.intro-strip`. Re-grep the section render structure (`toPageSectionRenderProps`
  `:641-650`, `PageSectionContent`) and both emit seams at implement time.

## Implementation pseudocode

```tsx
// TASK-533 region — shared per-edge border builder (used by BOTH the normal
// content-box return AND the bleed box). Returns {} when nothing meaningful is authored.
const toPageSectionBorderStyle = (
  border: PageSectionBorder | undefined
): PageSectionStyleProperties => {
  const borderStyle: PageSectionStyleProperties = {};
  if (!border) return borderStyle;
  for (const edge of ["top", "right", "bottom", "left"] as const) {
    const e = border[edge];
    if (!e) continue;
    const color = sanitizeAuthoringCssColor(e.color);   // re-guard at emit (already safe from L01)
    const width = typeof e.width === "number" && Number.isFinite(e.width) ? e.width : undefined;
    const style = e.style ?? (color || width ? "solid" : undefined);
    const has = style !== "none" && (Boolean(color) || (width ?? 0) > 0);
    if (!has) continue;
    const Cap = edge[0].toUpperCase() + edge.slice(1);   // Top/Right/Bottom/Left
    if (color) borderStyle[`border${Cap}Color` as const] = color;
    borderStyle[`border${Cap}Style` as const] = style;
    borderStyle[`border${Cap}Width` as const] = `${width ?? 1}px`;
  }
  return borderStyle;
};

// toPageSectionStyle — spread into the NORMAL content-box return (:441) ONLY.
// Do NOT add to the full-bleed content-box return (:432), whose paint is intentionally
// empty (the frame rides the bleed box for full-bleed sections).
const borderStyle = toPageSectionBorderStyle(section.style.border);
return {                            // NORMAL branch (:441)
  /* …existing background/borderRadius/boxShadow/padding/maxWidth/margin… */
  ...borderStyle,                   // {} when no edge authored → byte-identical
};

// toPageSectionBleedStyle — spread the SAME builder into the bleed-box return (:480),
// so a full-bleed section frames edge-to-edge on the box that paints its background:
return {                            // BLEED box (:480)
  /* …existing width:100vw/marginLeft/backgroundColor/borderRadius/boxShadow… */
  ...toPageSectionBorderStyle(section.style.border),
};
```

- **Present-only:** `borderStyle` is `{}` when `border` is unset or no edge is
  meaningful ⇒ both returns are byte-identical to post-530.
- **Full-bleed correctness:** the border rides the box that paints the background in each
  mode — normal content-box for a normal section (`:441`), the bleed box for a full-bleed
  section (`toPageSectionBleedStyle :480`) — never the paint-empty full-bleed content-box
  return (`:432`), so it frames the section like `.intro-strip` in BOTH modes.
- **`border-block`:** only `top`+`bottom` authored ⇒ only `borderTop*`+`borderBottom*`
  emitted (no left/right), matching `.intro-strip{border-block:…}`.
- Emit each edge's three sub-properties together (React camelCase inline-style keys);
  values are the already-sanitized color, the clamped width literal + `px`, and the
  enum style — all fixed-shape, no raw author string in a free position.

## Security note

Every value emitted is a sanitized/clamped/enum literal from 533-02-L01 (re-guarded
here via `sanitizeAuthoringCssColor` for defence in depth). Border props are fixed
React inline-style keys (`borderTopColor` etc.) — value positions, not rule strings —
so there is no CSS-rule injection surface. No new attacker-controlled input in the
renderer.

## Vitest test lane (authored in 533-02-L04)

`tests/vitest/pages/page-renderer-v2.test.tsx` — assert
`toPageSectionStyle(section)` for a `{top,bottom}` border emits `borderTopWidth:"1px"`
+ `borderBottomWidth:"1px"` and NO `borderLeft*`/`borderRight*`; a four-edge border
emits all four; unset ⇒ no `border*` keys (byte-identical). ALSO add a **full-bleed**
fixture (`fullBleed:true` + a border): assert `toPageSectionBleedStyle(section)` carries
the `border*` keys (the frame rides the bleed box) and the full-bleed `toPageSectionStyle`
content-box return does NOT (its paint is intentionally empty); a NON-full-bleed section
carries the border on `toPageSectionStyle` and `toPageSectionBleedStyle` returns
`undefined`.

## Regression / breaking-test ownership

Additive; existing `toPageSectionStyle` tests (no border) pass unchanged. No
rebaseline.

## Hard Invariants

1. Present-only: no `border*` keys emitted when unset → byte-identical to post-530.
2. `border-block` (top+bottom only) emits exactly `borderTop*`+`borderBottom*`.
3. Only sanitized/clamped/enum literals reach CSS (re-guarded at emit).
4. Additions in labelled `TASK-533` region (additive merge).
5. Border rides the box that paints the section background in each mode: the NORMAL
   content-box return (`toPageSectionStyle :441`) for a normal section, the bleed box
   (`toPageSectionBleedStyle :480`) for a full-bleed section — never the paint-empty
   full-bleed content-box return (`:432`) — so it frames the section like `.intro-strip`
   in both modes. A full-bleed fixture pins this.
