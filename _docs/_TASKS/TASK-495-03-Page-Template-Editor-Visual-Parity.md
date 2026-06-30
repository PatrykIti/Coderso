# TASK-495-03: Page-Template Editor Visual Parity
# FileName: TASK-495-03-Page-Template-Editor-Visual-Parity.md

**Parent Task:** TASK-495
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Pages+Templates / Page Builder
**Estimated Effort:** Medium
**Dependencies:** **TASK-495-02** (Page-Template Editor Chrome And Panel Parity — its restructured `return (...)` block + the `useLegacyChrome`/`useBuilderChrome`/`panelTone` gate are the substrate this subtask refines; 495-02 must land first). Builds on TASK-479-05 (tokens: `--card`/`--popover`/`--muted`/`shadow-card`/`bg-dotted`) already shipped on `feature/visual`.
**Status:** ⏳ To Do

---

## Overview

TASK-495-02 correctly **restructured** the page/page-template builder (drained the
top bar, added the in-content `PageHeader` + page-builder sub-toolbar, re-docked +
relit the floating panel to a right rail). But a live comparison of the shipped
DEV builder against the redesign **prototype**
(`_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`, runs `:5180`) found
the builder does **not yet match the prototype on three things the owner flagged**
(measurements captured at `/tmp/task495-parity/measurements.json`, screenshots at
`/tmp/task495-parity/{proto-light,proto-dark,dev-light,dev-dark}.png`):

1. **DARK MODE — one glaring white slab.** The canvas page frame stays
   `bg-white` in dark mode (`PageEditor.tsx:2974`), and the canvas CTA / ghost-tile
   / add-beside-handle chrome constants are hardcoded light literals
   (`editorControls/controlChrome.ts:65-89`). In dark mode the frame is a bright
   `rgb(255,255,255)` slab (the proto frame is transparent over a `bg-card` dark
   surface — `measurements.json` `dark_mode.pageFrame_dev_dark_STILL_WHITE: true`).

2. **WIDTH / PROPORTION.** The floating rail is `340px` (`PageEditor.tsx:3134`),
   the proto rail is `280px` (`measurements.json` `widths.panel_dev: 340` vs
   `panel_proto: 280`); and the builder body is full-bleed/asymmetric instead of
   an inset card.

3. **BLENDED vs SEPARATED.** The DEV builder is full-bleed/flat
   (`measurements.json` `separation_card_wrapper.dev_has_equivalent_card: false`).
   The prototype wraps the chrome bar + dotted canvas in **one** distinct rounded
   card — `flex … flex-col overflow-hidden rounded-2xl border border-border bg-card
   shadow-card` (`CanvasEditor.tsx:53`) — with the `PageHeader` floating **above**
   it (`measurements.json` `separation_card_wrapper.proto_card.w: 1112`,
   `radius: "16px"`).

This subtask brings the builder to prototype parity for those three gaps via four
grouped edits — **P1 (dark)**, **P2 (card separation)**, **P3 (width/proportion)**,
**P4 (polish)** — all surgical DOM/className changes. No data, route, RBAC, cache,
`PAGE_MODEL`, autosave, or preview behavior changes.

- **Source-of-truth proto:** `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`
  (card `:53`, chrome bar `:58`, canvas region `:99`, dotted scroller `:100`,
  right panel `:106` `w-[280px]`). Synthesized fix spec (verified, code-grounded):
  `/tmp/task495-parity/REMEDIATION_PLAN.md`.
- **Owning files:** `core/admin/ui/pages/PageEditor.tsx` (render block only:
  `2805`, `2862`, `2938-2940`, `2948-2951`, `2968`, `2974`, `3134`) and
  `core/admin/ui/pages/editorControls/controlChrome.ts` (`59-89`). No changes to
  `EditorShell.tsx`, `AdminShell.tsx`, `globals.css`, `tokenCss.ts`, or
  `pageEditorOptions.ts`.
- **Out of scope:** the **optional proto-literal doc-column** decision-point —
  wrapping the desktop base view in `mx-auto max-w-2xl`/`max-w-3xl` (672px) and
  dropping the `paddingRight` reservation. Device frame widths
  (`pageEditorOptions.ts:281-285`, desktop `max-w-[1080px]`) are an intentional
  true-to-device preview and **stay as-is**; P2a's card inset + P3a/P3b resolve the
  *perceived* width mismatch. **Do NOT take this decision-point — it is deferred to
  the owner** (see "Deferred decision-point" below). Also out of scope: any
  `PAGE_MODEL`/schema/payload, preview-token, runtime-preview, or RBAC change; the
  TASK-495-02 control restructure itself (this only re-skins it).

`PageEditor.tsx` reads as **binary to `rg`/`grep`** ([[pageeditor-tsx-grep-binary-trap]])
— use `Read`/`Edit` or `grep -an`, **never `rg`**. The file is ~4.9k lines and
shifts; re-anchor by the exact strings below, not raw line numbers.

> ⚠️ **Precedence — THIS contract supersedes `/tmp/task495-parity/REMEDIATION_PLAN.md`
> wherever they diverge.** The plan is a useful narrative, but its *in-place
> pseudocode* predates the structural callouts below and is wrong/unsafe in three
> places an implementer must **NOT** follow literally — use the corrected forms in
> this file instead:
> - **P2a (HIGH):** the plan wraps the **shared** `<BuilderCanvasRegion>` in the
>   card "still inside the `useBuilderChrome <>`" (`REMEDIATION_PLAN.md` P2a). In
>   reality that fragment closes at `~`2932 and `BuilderCanvasRegion` (`~`2938) is a
>   **shared sibling** that is the **menu's only canvas + floating-toolbar render**.
>   Following the plan literally **cards or blanks the menu canvas** → RED
>   `menu-design-editor-flow.test.tsx:503`/`:787-792`. Use the `canvasRegionChildren`
>   hoist + conditional in **§P2a below** (authoritative).
> - **P4a / P4c (MED):** the plan labels these "builder-gated / harmless-shared" and
>   edits the **static** context-bar (`:2940`) and scroller `p-6` (`:2949`)
>   classNames **in place**, which changes the **menu** canvas (a 3rd/4th
>   menu-affecting edit). Use the `useBuilderChrome` ternaries in **§P4 below**; the
>   menu must stay `p-6` + keep its context-bar `border-b`.
> - **P1b / P3b (MED):** the plan only says "re-run tests"; this contract's required
>   constant-tracking test edits (Testing items 1 & 5 — `:3146`/`:3147`,
>   `:6584`/`:6599`) are **mandatory in the same change** or the gate goes RED.
>
> When in doubt, follow **this file**, not the plan snippet.

---

## Scope gating (critical)

The token system is already correct (`--card`/`--popover`/`--muted` flip via
`:root.dark` — `globals.css:182`, dark `--admin-card-bg: #211f24` at `:270`;
`.bg-dotted` reads `--foreground` at `:811`). Only the structural layout edits are
gated:

- **P1a + P1b are SHARED / ungated** (touch both the builder and the menu canvas).
  **P1a is light-pixel-identical**: `--card` = `--admin-card-bg` = `#ffffff` in light
  (`globals.css:112`), so the frame `bg-white`→`bg-card` swap is pixel-identical in
  light mode for both the page/page-template builder AND the legacy `menu` path, and
  it *fixes* the menu's dark-mode white slab.
  **P1b is NOT pixel-identical in light** — it swaps `border-slate-300` (`#cbd5e1`)→
  `border-border` (`#eae7e0`), `text-slate-700` (`#334155`)→`text-foreground`
  (`#1c1a17`), `hover:bg-slate-100` (`#f1f5f9`)→`hover:bg-muted` (`#f3f1ed`),
  `text-slate-500` (`#64748b`)→`text-muted-foreground` (`#79716b`), and the
  ghost-tile `bg-white` (`#fff`)→`bg-background` (`#f6f5f2`). On both paths this
  produces an **intended, subtle LIGHT-mode recolor** of the SHARED canvas CTA /
  ghost-tile / add-beside chrome (the deliberate dark-mode fix — see the P1b body
  below, which documents this accepted shift). So a menu reviewer running a *strict*
  light pixel-diff should **EXPECT those canvas buttons/tiles to change**; only P1a is
  byte-for-byte light-identical, P1b is not. P1a+P1b are nonetheless the **only** two
  edits allowed to touch the menu canvas — P1a because it is light-pixel-identical,
  P1b because the recolor is the deliberate dark-mode fix and is light-acceptable on
  both paths. (No test pins the ghost-tile/beside-handle literal values; the only
  CTA value-pins — `page-editor-v2-flow.test.tsx:3146`/`:3147` — are already in the
  required P1b test edit, so no gate goes red from this recolor.)
- **P2, P3, P4 are BUILDER-GATED** — every structural layout edit lives **only**
  inside the `useBuilderChrome` / `!useLegacyChrome` branch (page + page-template).
  The menu path (`editorHost.mode === "menu"`, `useLegacyChrome === true`) must stay
  **byte-identical** except the two SHARED P1 token swaps.

`useLegacyChrome` / `useBuilderChrome` / `panelTone` were introduced by
TASK-495-02 (Step 0, `~`944-961). Reuse them; do not re-derive.

---

## Invariants to preserve (DO NOT regress)

- **Builder/menu gate** as above — menu byte-identical except P1.
- **Every `data-page-editor-*` hook stays on its current node** (tests +
  measurement scripts depend on them): `-canvas-frame` (`:2978`), `-canvas-device`
  (`:2979`), `-canvas-context` (`:2941`), `-canvas-scroller` (`:2952`),
  `-floating-toolbar`, `-toolbar-collapsed`, `-toolbar-dragging`, `-toolbar-row`
  (`:3164`), `-toolbar-actions`, `-device-option`, plus
  `data-editor-shell-canvas` (`EditorShell.tsx:36`). Adding a wrapper `<div>` (P2a)
  must keep these hooks exactly where they are.
- **`canvasSiteTokenVariables`** stays on the frame node (`PageEditor.tsx:2977`,
  `style={canvasSiteTokenVariables}`) — it carries front-end *typography* tokens
  only; do **not** remove it when swapping the background (P1a).
- **Menu clearance/drag plumbing** (`--page-editor-toolbar-clearance` +
  `paddingBottom`, the `toolbarOffset` transform, `data-page-editor-toolbar-dragging`,
  the `useLegacyChrome` scroller branch at `~`2960-2966) is menu-only — leave
  untouched.
- **Data layer:** `PAGE_MODEL` / `pageDocument` state, `editorHost.getCachedDetail`,
  `normalizePageData`, `cloneDocument`, autosave, dirty-state guard, preview tokens —
  not touched by any edit here (pure DOM/className changes only).
- **Real-input guard** ([[page-editor-color-toolbar-live-findings]]): introduce no
  panel-wide `onMouseDown`/`onPointerDown` `preventDefault`. None of P1-P4 adds an
  event handler, so this is preserved by construction — verify it still holds after.
- **ESLint 9 `react-hooks`:** no new effects, no sync `setState` in effects; the
  single lazy-`true` `panelOpen` state stays. P1-P4 add no hooks.

---

## Security Contract

**UI-only.** No endpoint, permission, RBAC, CSRF, rate-limit, or cache changes —
this is a visual (dark-mode token + card-wrapper + panel-width) restyle of the
existing TASK-495-02 chrome. No new routes, no schema/payload changes, no new
network calls. Preview/autosave/publish keep flowing through the existing
`editorHost` helpers and the `pageEditorHostContract` gating
(`editorHost.preview`/`publish`/`settingsLabel`, `revisionsHost`); the cache
contract (`getCachedDetail`/`loadDetail`/`autosaveDocument`/`saveDocument`,
`subscribeCacheEvents`, no mount-force refetch, no dirty-state overwrite) and the
`RuntimePreviewDialog` preview-token guards are preserved unchanged. P1a/P1b swap
hardcoded color literals for design tokens; no secret/credential/cache surface is
touched.

---

## Implementation Pseudocode

Suggested order: **P1 → P2 → P3 → P4** (the order the proto-parity stacks). After
each group: toggle dark mode on the builder route, confirm the menu editor is
visually unchanged in light and now dark-correct, and re-run the page-editor +
menu-design suites.

### P1 — DARK MODE (gap #1). SHARED / ungated. Coupled pair, ship together. HIGH

The two hardcoded-light spots that bypass the (correct) token system.

**P1a — canvas page frame `bg-white` → `bg-card`** — `core/admin/ui/pages/PageEditor.tsx:2974`

```diff
- className={`mx-auto min-h-full w-full rounded-2xl bg-white p-4 shadow-soft transition-all ${canvasDeviceFrameClassMap[device]}`}
+ className={`mx-auto min-h-full w-full rounded-2xl bg-card p-4 shadow-soft transition-all ${canvasDeviceFrameClassMap[device]}`}
```

This node is **shared** (not gated). Light-pixel-safe: `--card` = `--admin-card-bg`
= `#ffffff` in light (`globals.css:112`) → pixel-identical today in both builder and
menu light mode; flips to `#211f24` in dark (`globals.css:270`), matching the proto
`bg-card`. This is the single glaring white slab. **Keep `canvasSiteTokenVariables`
(`style=`, `:2977`) and `data-page-editor-canvas-frame` (`:2978`) on this node.**

**P1b — canvas CTA / ghost-tile / add-beside-handle light literals → adaptive tokens**
— `core/admin/ui/pages/editorControls/controlChrome.ts`. These are **shared**
constants consumed by both the builder and the menu canvas. Once P1a makes the frame
dark-aware they become bright-white buttons on a dark frame, so they must move to
tokens in the **same** change.

- `:65-66` `editorCanvasCtaButtonClass`
  → `"border border-border bg-card text-foreground shadow-sm hover:bg-muted hover:text-foreground"`
- `:75-76` `editorCanvasGhostTileClass` — keep layout utils
  (`flex min-h-14 w-full items-center justify-center gap-1 rounded`); swap palette to
  `border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`
- `:79-80` `editorCanvasGhostTileCompactClass` — same palette swap, keep
  `h-8 … text-xs`
- `:88-89` `editorCanvasGhostBesideHandleClass` — keep positioning utils
  (`absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 … rounded-full shadow-sm`);
  swap palette to
  `border border-dashed border-border bg-card text-muted-foreground … hover:bg-muted hover:text-foreground`
- `:59-64` — update the now-false doc comment ("the editor canvas frame is always a
  white, site-like surface") to note the frame is now adaptive `bg-card`.

Light-mode pixels shift only subtly (ghost tiles read `bg-background`/light-gray
placeholder instead of white-on-white — acceptable for both paths). No new `.dark`
CSS needed. Eyeball the menu canvas once in light to confirm no regression.

> **Test impact (must update in this change — these are CONSTANT value-shape checks,
> not a weakening):** `tests/vitest/ui/page-editor-v2-flow.test.tsx:3146`
> `expect(editorCanvasCtaButtonClass).toContain("bg-white")` →
> `toContain("bg-card")`, and `:3147`
> `expect(editorCanvasCtaButtonClass).toContain("hover:bg-slate-100")` →
> `toContain("hover:bg-muted")`. The RENDER checks that use `.toContain(editorCanvasCtaButtonClass)`
> against the rendered node (`:1840`, `:3132`, `:3134`) reference the constant
> itself and stay green automatically.

### P2 — VISUAL SEPARATION / "blended → card" (gap #3, biggest structural gap). HIGH. Builder-gated.

The prototype wraps chrome bar + dotted canvas in ONE card
(`CanvasEditor.tsx:53`), `PageHeader` floating above it. The dev has no such card.

**P2a — introduce a BUILDER-ONLY card wrapper** around the sub-toolbar (`:2862`) +
the canvas region in `core/admin/ui/pages/PageEditor.tsx`. Read the structural
callout below first — the sub-toolbar and the canvas region are in **different
conditional scopes today**, so this is a small restructure, not an in-place wrap.

> ⚠️ **Structural reality — `BuilderCanvasRegion` is a SHARED node, NOT inside the
> `useBuilderChrome` block.** The `{useBuilderChrome ? (` fragment **opens at
> `~`2799 and closes at `~`2932 (`) : null}`)** and contains ONLY the `PageHeader`
> + the sub-toolbar. `<BuilderCanvasRegion builder={useBuilderChrome}>` (`~`2938)
> and its entire ~545-line child tree (context bar, dotted scroller, page frame,
> floating rail, reopen chip) render **OUTSIDE** that fragment and are **rendered
> for BOTH paths**: for the menu, `BuilderCanvasRegion` (`PageEditor.tsx:749-752`)
> returns `<>{children}</>`, and that bare pass-through **is the menu's ONLY
> canvas + floating-toolbar render path** (the menu-design suite mounts a bare
> `mode:"menu"` host and asserts `[data-page-editor-canvas-scroller="true"]` and
> `[data-page-editor-floating-toolbar="true"]` are present —
> `menu-design-editor-flow.test.tsx:503`, `:787-789`). Therefore the sub-toolbar
> and the canvas region live in **different conditional scopes**, so the naive
> in-place wrap is **NOT expressible** and MUST NOT be shipped:
> - Dropping a `<div className="…bg-card shadow-card">` around the shared
>   `BuilderCanvasRegion` after `:2932` **cards the MENU canvas too** → violates
>   "menu byte-identical".
> - Moving the single shared `BuilderCanvasRegion` *into* the `useBuilderChrome`
>   fragment **removes the entire canvas + floating toolbar from the menu** →
>   blank menu editor + RED `menu-design-editor-flow.test.tsx:789`.
> - An always-present `display:contents` / class-less wrapper around the menu
>   region passes attribute-based tests but **adds a menu DOM node** → a SILENT
>   byte-identical violation. **Forbidden.**

**Correct restructure (use this exact shape).** Hoist the `BuilderCanvasRegion`
**children** (context bar + dotted scroller + page frame + overlays + floating rail
+ reopen chip — everything currently between the `<BuilderCanvasRegion>` open at
`~`2938 and its matching close) into a single shared `const` in the render body
(plain JSX assignment — **no hooks added**, react-hooks-safe), then render the card
ONLY in the builder branch and the bare region in the menu branch from ONE shared
children value (no duplication, exactly one menu render):

```tsx
// In the render body, above the return's JSX for this block:
const canvasRegionChildren = (
  <>
    {/* context bar (P4a applies here) + dotted scroller (P4c) + page frame
        (P1a) + overlays + floating rail (P3a) + reopen chip — moved verbatim
        from inside BuilderCanvasRegion; all data-page-editor-* hooks stay on
        their current nodes. */}
    …existing context bar + scroller + frame + overlays + rail + reopen chip…
  </>
);

// …then, replacing both the useBuilderChrome fragment (2799-2932) AND the
// separate shared <BuilderCanvasRegion> (2938) with a single conditional:
{useBuilderChrome ? (
  <>
    <PageHeader className="mb-0 shrink-0 px-6 pb-3 pt-4" … />   {/* P2b */}
    {/* BUILDER-ONLY card — wraps sub-toolbar + canvas region. */}
    <div className="mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* sub-toolbar — currently :2862. Bump py-2 → py-2.5 to match proto chrome
          bar (CanvasEditor.tsx:58 `… px-4 py-2.5`). */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        …existing sub-toolbar contents (unchanged)…
      </div>
      <BuilderCanvasRegion builder={true}>{canvasRegionChildren}</BuilderCanvasRegion>
    </div>
  </>
) : (
  /* MENU — byte-identical flat body: same single BuilderCanvasRegion pass-through,
     NO card, NO sub-toolbar, NO PageHeader-here. */
  <BuilderCanvasRegion builder={false}>{canvasRegionChildren}</BuilderCanvasRegion>
)}
```

`BuilderCanvasRegion`'s **definition stays unchanged** (`PageEditor.tsx:749-752`,
still `if (!builder) return <>{children}</>;` else
`relative flex min-h-0 flex-1 flex-col`). `overflow-hidden` + `rounded-2xl` on the
card round the muted bar's top corners and the dotted region's bottom. This makes the
builder an inset card (proto `~1112px`) with `mx-6` gutters instead of full-bleed —
simultaneously fixing the "full-bleed / no surrounding margin" half of gap #2.

**Gate / byte-identical guarantee:** the card `<div>`, the sub-toolbar, and the
`PageHeader` render **only** in the `useBuilderChrome` branch. The menu branch emits
exactly `<BuilderCanvasRegion builder={false}>{canvasRegionChildren}</BuilderCanvasRegion>`
= `<>{canvasRegionChildren}</>` — i.e. the **same flat DOM the menu produces today**
(no card, no extra ancestor node). **Preserve all child `data-page-editor-*` hooks
on their current nodes** (hoisting into `canvasRegionChildren` is a verbatim move; it
must not add/move `-canvas-context`, `-canvas-scroller`, `-canvas-frame`,
`-floating-toolbar`, etc.).

**P2b — let the `PageHeader` float above the card** — `core/admin/ui/pages/PageEditor.tsx:2805`.
Once P2a's card supplies the visual divider, drop the header's own border/fill so it
reads as a title region above the card (proto renders `PageHeader` OUTSIDE the card):

```diff
- className="mb-0 shrink-0 border-b border-border bg-background px-6 pb-3 pt-4"
+ className="mb-0 shrink-0 px-6 pb-3 pt-4"
```

The card's `mx-6 mb-6` + the header `pb-3` create the separating gap. Builder-only
(this `PageHeader` render is inside `useBuilderChrome`).

### P3 — WIDTH / PROPORTION (gap #2). MEDIUM. Builder-gated.

Panel border/radius/shadow already match the proto — only width + reserved space are
off.

**P3a — narrow the floating rail 340 → 280** — `core/admin/ui/pages/PageEditor.tsx:3134`
(the `!useLegacyChrome` branch of the toolbar className):

```diff
- : "absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(340px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop"
+ : "absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(280px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop"
```

The head row already re-stacks vertically for the builder (`flex flex-col gap-2`,
`:3162`) so 280px fits; verify the head/icon row still wraps cleanly at 280 after the
change (the comment at `:3158` references the old 340 — update it). The `right-4
top-4` position and the reopen chip (`:3476`, already `right-4 top-4`) do not change.

**P3b — shrink the reserved right padding 360 → 300** —
`core/admin/ui/pages/PageEditor.tsx:2968` (the `useBuilderChrome` branch of the
scroller style):

```diff
- ? ({ paddingRight: 360 } as CSSProperties)
+ ? ({ paddingRight: 300 } as CSSProperties)   // 280 panel + ~20 inset
```

Keeps the centered frame clear of the now-narrower overlay rail. The
`useLegacyChrome` branch (`~`2960-2966, `paddingBottom` clearance) is untouched.

> **Test impact (REQUIRED edit — the old `360` IS pinned).** Two existing
> assertions in the required gate file hard-pin the OLD reservation:
> `tests/vitest/ui/page-editor-v2-flow.test.tsx:6584` and `:6599`
> (`expect(scroller.style.paddingRight).toBe("360px");`, in the test "PageEditor
> reserves right-rail padding on the canvas scroller … (builder chrome)"). Update
> **both** `"360px"` → `"300px"` in the **same** change as this code edit. This
> tracks the constant; it does **not** weaken — the assertion still pins the exact
> reserved width. Leave `:6586`/`:6587` (the builder branch never sets
> `paddingBottom` / the clearance var) and `:6594` (`toBe("")`, the
> selection-cleared release) **unchanged**.

### P4 — POLISH. LOW. Builder-gated.

> ⚠️ **All P4 edits target nodes inside `canvasRegionChildren` (the SHARED canvas
> body rendered for BOTH paths via `BuilderCanvasRegion` — see P2a).** Their
> classNames are currently STATIC, so editing them in place changes the **menu**
> canvas too. Each P4 edit below is therefore made **builder-gated** (ternary on
> `useBuilderChrome`) so the menu path stays byte-identical except the two SHARED
> P1 token swaps. Do **not** treat any P4 edit as "harmless-shared".

**P4a — demote the device-context strip** so it reads as chrome, not a third
separator — `core/admin/ui/pages/PageEditor.tsx:2940`: drop `border-b border-border`
from the `data-page-editor-canvas-context` bar **for the builder only** (keep
`bg-muted/40` + the text utils). This bar's className is currently **static** and the
bar is **shared** (first child of `canvasRegionChildren`, rendered for the menu too),
so the change MUST be gated or the menu's context strip silently loses its divider:

```diff
- className="flex items-center justify-center border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
+ className={`flex items-center justify-center ${
+   useBuilderChrome ? "" : "border-b border-border"
+ } bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground`}
```

Removes the extra stacked divider that compresses the builder regions while the menu
keeps its divider (byte-identical). **Keep the
`data-page-editor-canvas-context={device}` hook (`:2941`).** (No test asserts this
`border-b`; the only `-canvas-context` assertions are `textContent` checks at
`page-editor-v2-flow.test.tsx:5278`/`:5287`, which stay green — but the menu
regression would otherwise slip silently, hence the gate.)

**P4b — realign the floating rail inside the dotted region.** With the context bar
inside `BuilderCanvasRegion`, the rail's `top-4` (`:3134`) measures from the region
top — i.e. above the scroller (`measurements.json` devLight
`panelTopInsetFromScroller: -17.5`, vs proto `+16`).

> ⚠️ The `data-page-editor-canvas-context` bar is **shared** (inside
> `canvasRegionChildren`, rendered for the menu too). A "move it OUT of
> `BuilderCanvasRegion`" relocation must NOT remove it from the menu path.
>
> ⚠️ **`top-4` is a REQUIRED-GATE invariant — do NOT change the `top-` literal.**
> The builder rail (`:3134`) and the builder reopen chip (`:3476`, `right-4 top-4`)
> are both hard-pinned by `page-editor-v2-flow.test.tsx:3082-3083` (rail
> `right-4`/`top-4`) and `:3240` (chip `right-4`+`top-4`), and Testing item 3 below
> states the rail/chip **keep** `right-4`/`top-4`. So the realignment MUST be
> achieved **without** changing the `top-` literal.

**Default fix (use this — keeps `top-4`, test-safe):** the true-parity *relocation*.
Render the context strip as part of the **chrome** so the `relative` region
(`BuilderCanvasRegion`) wraps only the dotted scroller + overlay rail (like
`CanvasEditor.tsx:99`); the rail's existing `top-4` then lands ~16px inside the dots
on its own. Because the strip is **shared**, emit the context bar in the builder card
(above `BuilderCanvasRegion`) **AND** keep it inside `canvasRegionChildren` for the
menu branch — e.g. gate the in-region copy with `{!useBuilderChrome ? <contextBar/> :
null}` and emit the builder copy in the card; **never** a single relocation that drops
it from the menu. **Preserve the `-canvas-context`, `-canvas-scroller`,
`-canvas-frame` hooks on their nodes.** This keeps both `top-4` assertions
(`:3082-3083`, `:3240`) green and the panel + reopen chip in sync, with **no test
edit needed for P4b**. Because P4b is LOW polish, **deferring it** (leaving `top-4`
as-is, accepting the ~-17.5px inset) is equally test-safe and acceptable.

**Alternative offset bump (NOT recommended — breaks a required gate):** bumping the
builder rail's `top-` offset at `:3134` to clear the ~33px context bar *changes the
`top-` literal*, so it is **not** "touches no shared node, free" — it **REQUIRES**,
in the same change: (a) updating `page-editor-v2-flow.test.tsx:3083`
(`toContain("top-4")`) to the new offset; (b) bumping the reopen chip (`:3476`) the
same amount and updating `:3240` so the panel and chip stay in sync; and (c) deleting
the "keeps `top-4`" wording in Testing item 3. Do **not** ship the offset bump
without all three. Prefer the default relocation (or deferral), which needs none of
them.

**P4c — match desktop dotted inset** — `core/admin/ui/pages/PageEditor.tsx:2949`:
add `lg:p-8` to the scroller to match proto `bg-dotted p-6 lg:p-8`
(`CanvasEditor.tsx:100`). The base `p-6` is in the **shared** part of the className
(only `bg-dotted` is currently builder-gated), so `lg:p-8` MUST go **inside** the
builder ternary — putting it before the ternary would change the menu scroller's
`lg` padding (a third shared edit, violating "menu byte-identical except the two
SHARED P1 swaps"):

```diff
  className={`min-h-0 flex-1 overflow-auto overscroll-contain p-6 ${
-   useBuilderChrome ? "bg-dotted" : ""
+   useBuilderChrome ? "bg-dotted lg:p-8" : ""
  }`}
```

Builder-gated: the menu scroller stays exactly `p-6` (byte-identical); only the
builder gains the wider `lg` inset.

### Deferred decision-point (DO NOT take — owner's call)

The desktop frame is `max-w-[1080px]` (`pageEditorOptions.ts:282`) — an intentional
true-to-device preview — vs the proto's fixed `max-w-2xl` (672px) doc column. P2a's
card inset + P3a/P3b already resolve the *perceived* mismatch (rail 280, inset card,
centered frame). **Do NOT** wrap the desktop base view in `mx-auto max-w-2xl`/`max-w-3xl`
and do **NOT** drop the `paddingRight` reservation in this subtask — that literal
proto reading-width is **deferred to the owner**. Do **NOT** change
`canvasDeviceFrameClassMap` (`pageEditorOptions.ts:281-285`); those device widths must
stay for device-override previews.

### Data flow / error handling

Unchanged. P1-P4 are pure DOM/className edits — they change *how* a node paints,
never *which* handler runs. No new effects, states, network calls, or error
surfaces. All existing Alert banners and `editorHost`/cache/autosave/preview flows
are byte-identical.

---

## Testing / Regression-test shape

**Gates (required):**

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
  — the page-editor + menu-design suites must stay green.

**Add / adjust only as the three structural changes require (do NOT weaken any
assertion — no `data-page-editor-*` hook assertion may be relaxed):**

1. **P1b token swap (required edit):** update the two CONSTANT value-shape checks in
   `page-editor-v2-flow.test.tsx` — `:3146` `bg-white` → `bg-card`, `:3147`
   `hover:bg-slate-100` → `hover:bg-muted`. This tracks the token swap, it does not
   weaken — the assertion still pins the constant's exact value. (Render checks at
   `:1840`/`:3132`/`:3134` use `.toContain(editorCanvasCtaButtonClass)` and need no
   change.)
2. **P1a bg-card swap (add a guard):** add a render assertion that the
   `data-page-editor-canvas-frame="true"` node carries `bg-card` and **not**
   `bg-white` (so the dark-mode fix is regression-protected) — the frame node is
   already queried at `page-editor-v2-flow.test.tsx:2909`/`:2938`/`:2966` and
   asserted present at `page-editor.test.tsx:19`/`:36`,
   `page-editor-floating-panel.test.tsx:35`. This is a NEW positive assertion; do not
   remove the existing `-canvas-frame` presence checks.
3. **P3a width swap (add a guard):** add/adjust an assertion that the builder
   `[data-page-editor-floating-toolbar="true"]` rail className contains
   `w-[min(280px,calc(100%-2rem))]` (and keeps `right-4`/`top-4` — already asserted
   at `page-editor-v2-flow.test.tsx:3082-3083` (rail) and `:3240` (reopen chip)). No
   existing test pins the old `340`, so this is purely additive. **`top-4` stays
   green because P4b's default relocation leaves the `top-` literal unchanged** —
   only the NOT-recommended P4b offset-bump would require editing `:3083` (and
   `:3240` if the chip moves), per §P4b. Menu rail stays `bottom-6 left-1/2` (assert
   unchanged via the bare `mode:"menu"` fixture from TASK-495-02).
4. **P2a card wrapper (REQUIRED — this is the ONLY gate that catches a silent menu
   regression):** the required `menu-design-editor-flow.test.tsx` suite is purely
   attribute/`textContent`-based (`:503` canvas-scroller, `:787-789` floating-toolbar,
   `:797` not "Page builder"), so a card — or ANY class-bearing / `display:contents` /
   extra-ancestor wrapper — leaking onto the MENU canvas region would PASS every
   required assertion. The menu byte-identical gate is otherwise **BLIND** to it (this
   is exactly the "SILENT byte-identical violation" forbidden in §P2a). So the P2a
   change MUST add, in the same commit, **both** of the following (do not leave either
   optional):
   - **(negative half — REQUIRED, the regression catcher):** using the existing bare
     `mode:"menu"` TASK-495-02 fixture, assert the menu host renders **NO** ancestor
     carrying `rounded-2xl border bg-card shadow-card` around the canvas region — i.e.
     the flat menu body has no card wrapper and no extra ancestor node. This is the
     single assertion that detects a menu-card leak; without it the required suite
     cannot.
   - **(positive half — REQUIRED):** on the default `page` host, assert the sub-toolbar
     + canvas region share a common ancestor carrying `rounded-2xl border bg-card
     shadow-card` (the builder card).
   Use the existing TASK-495-02 bare-host fixtures; do **not** mount
   `MenuDesignEditorPage`. Adding the wrapper `<div>` is a pure ancestor insertion —
   verify no existing test relies on a direct parent/child relationship between the
   sub-toolbar and the canvas region (querySelector-by-attribute tests are
   unaffected).
5. **P3b reserved-padding value (REQUIRED edit — tracks the constant):** the old
   `360` is pinned by the required gate suite. Update
   `page-editor-v2-flow.test.tsx:6584` and `:6599` from
   `expect(scroller.style.paddingRight).toBe("360px")` →
   `toBe("300px")` in the same change as P3b. This is NOT a weakening — it still
   pins the exact reserved width. Leave the surrounding `paddingBottom`/clearance
   assertions (`:6586`/`:6587`) and the selection-cleared release `:6594`
   (`toBe("")`) **unchanged**. (Note: P3a's panel-width `340` is NOT pinned by any
   test — only this `paddingRight` `360` is — so P3a stays purely additive per item
   3, while P3b requires this twin edit.)

**Visual acceptance (runtime smoke via `playwright-cli`, real input — record in the
closure):**

- **DARK MODE:** on the builder route
  (`http://coderso-a.localhost:5173/admin/pages/7c075789-e294-4396-8fe1-db83f215c186`),
  toggle dark (header button `aria-label="Toggle dark mode"`) and confirm the canvas
  page frame, the canvas CTAs / ghost tiles / add-beside handle, AND the card wrapper
  all recolor to the dark `bg-card` (`#211f24`-family) — **no white slab** — matching
  the proto dark capture (`/tmp/task495-parity/proto-dark.png`). Confirm the **menu**
  editor is dark-correct too (P1 is shared) and visually unchanged in light.
- **CARD SEPARATION:** the builder body is a distinct rounded card
  (`rounded-2xl` + `border-border` + `shadow-card`) holding the chrome bar + dotted
  canvas, with the `PageHeader` floating above it and `mx-6 mb-6` gutters — matching
  the proto (`measurements.json` proto `editorWrapper.w: 1112`,
  `borderRadius: "16px"`).
- **PANEL WIDTH:** the right rail measures **280px** (proto), not 340px, with
  `right-4 top-4` and the centered frame clear of the overlay.
- **Real-input guard ([[page-editor-color-toolbar-live-findings]]):** per-fragment
  color swatch click, URL-input focus, and inline-mark live update still work with a
  **real** mouse + keyboard in the (now 280px) rail — P1-P4 add no `preventDefault`.

If `bun test` / `bun --cwd core test:bun` is run as the wider gate, it must stay
green; note any DB/wizard reset per the local-run memory.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this subtask changes
  status (this authoring step already adds the To Do row + count).
- On closure, fold into the parent **TASK-495** changelog entry (do not author a
  standalone changelog unless the family entry does not yet exist): note the three
  owner-flagged parity fixes (dark `bg-white`→`bg-card`; card-separated builder;
  280px rail) and that P1a/P1b are **shared, light-pixel-safe** token swaps that also
  fix the menu dark-mode slab.
- A pure visual restyle needs **no** `PAGE_MODEL.md` / `PREVIEW_SPEC.md` /
  `DESIGN_TOKENS.md` contract edits — state this explicitly in the changelog.

Related memories: [[admin-ui-redesign-prototype]],
[[pages-editor-v2-remediation-program]], [[page-editor-color-toolbar-live-findings]],
[[pageeditor-tsx-grep-binary-trap]].
