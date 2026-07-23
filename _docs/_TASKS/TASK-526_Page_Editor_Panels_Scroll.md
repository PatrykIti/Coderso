# TASK-526: Page Editor Panels — Vertical Scroll Containment (Layers Tree)

# FileName: TASK-526_Page_Editor_Panels_Scroll.md

**Priority:** Medium
**Category:** Admin UI / Pages (Page Editor v2) / Accessibility
**Estimated Effort:** Small
**Dependencies:**
- TASK-197 (changelog 724, "Pages Builder Library Panel Scroll Containment") — the
  prior art this task MIRRORS. 197 is exactly why the builder Pickers
  (`WidgetPicker`/`FormPicker`) already carry the correct
  `flex h-full min-h-0 flex-col` + `min-h-0 flex-1 overflow-y-auto` shape; this task
  applies the SAME idiom to the one page-editor list panel that lacks it (the Layers
  tree). No code dependency, cited as the reference pattern only.
- The existing Page Editor v2 layer/command-palette surfaces
  (`core/admin/ui/pages/editor/`) — `PageEditorCommandPalette.tsx` is the in-repo
  reference implementation of the sticky-header + scroll-body shape this task copies.

**Status:** ✅ Done (2026-07-08)
**Closure changelog:** 1236. Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). As of authoring the highest on disk is **1235**, so
this task takes the then-current next-free at ITS closure (do **NOT** hardcode a
colliding number). Do **NOT** edit `_CHANGELOG/*` or `_TASKS/README.md` — the
orchestrator owns those.

---

## Overview

The owner reports the Page Editor v2 **Layers window is unscrollable** ("nie widzę
wszystkich warstw") — a tall block tree grows past its container and the lower layers
become unreachable because there is no vertical scroll region.

A read-only ground audit of every list/tree-rendering file under
`core/admin/ui/pages/editor/` and `core/admin/ui/pages/builder/` (plus the two
Pickers reached through `LibraryPanel`'s tabs) found that **exactly ONE panel** is
missing a scroll container; every other candidate is either already correctly
scroll-contained (mirroring TASK-197) or is host-scrolled inner content that MUST NOT
be modified.

This is a **pure UI/structure change**: className/structure only — no logic, no model,
no API, no route, **no migration**. The single fix bounds the `PageEditor.tsx` Layers
popover with a self-contained `max-h` and puts a `min-h-0 flex-1 overflow-y-auto`
scroll region on its section list, then ships a structural class-assertion test that
drives the live host.

## Ground audit (read-only — SYMBOL names authoritative; re-grep line anchors at implement time)

> **GROUND AUDIT CORRECTION (pre-audit HIGH, 2026-07-08).** The first pass of this
> audit used `--include`-filtered `rg`/`grep`, which **silently skipped
> `core/admin/ui/pages/PageEditor.tsx`**: that file reads as `data`/binary to plain
> `grep`/`rg` (a documented repo trap — project memory `pageeditor-tsx-grep-binary-trap`;
> `grep -c` errors "binary file", `file` reports "data"). The re-audit uses `grep -an`
> (binary-safe) and OVERTURNS the original "only importer is its test" ground fact.

**KEY STRUCTURAL FACT (corrected):** `editor/PageEditorLayers.tsx` exports ONLY the
recursive row renderer `LayerBlockRows` (`:35`) — a bare `<div className="space-y-1">`
(`:60`) with no flex/overflow/height bound. **But `LayerBlockRows` is NOT unused.** The
LIVE host is **`core/admin/ui/pages/PageEditor.tsx`**, which imports it
(`import { LayerBlockRows } from "./editor/PageEditorLayers";` at `:245`) and renders it
inside the actual floating **Layers popover** (`:2692`–`:2757`, opened via `layersOpen`,
header `'Layers'` at `:2695`). Verified with `grep -an` (binary-safe):
`grep -an "LayerBlockRows" PageEditor.tsx` → import `:245`, render `:2738`.

The unscrollable window is therefore **the popover in `PageEditor.tsx`, not
`PageEditorLayers.tsx`**. Structure (re-grep anchors at implement time):

- `:2692` `{layersOpen ? (` — the floating popover:
  `:2693` `<div className="absolute left-4 top-16 z-20 w-72 rounded-2xl border border-border bg-popover p-3 shadow-pop">`
  — an **`absolute`-positioned box with NO `max-h`, NO `overflow`, NO height bound**. It
  is OUT of its parent's flex flow, so `flex-1`/`h-full` from a detached wrapper would
  resolve against nothing (still unscrollable) or collapse it. The proven idiom for a
  viewport-anchored popover is `max-h`+`overflow-hidden` on the container (NOT the
  `flex-1`/`h-full`-host chain).
- `:2694`–`:2704` header row `<div className="mb-2 flex items-center justify-between">`
  with the `'Layers'` label and close `X` — this is the region that must become `shrink-0`.
- `:2705` `<div className="space-y-1">` — the **section list** that
  `pageDocument.sections.map` (`:2706`) fills. Each iteration renders a section button
  (`:2708`) PLUS a per-section `<LayerBlockRows>` (`:2738`). The tree's height is driven
  by THIS multi-section stack (host markup), NOT by any single `LayerBlockRows`. **This
  `:2705` container is where the ONE scroll region belongs.**
- The popover sits inside the `relative` container at `:2488`
  (`relative flex h-full min-h-0 flex-col bg-background`) as a **sibling** of the canvas
  scroller at `:2590` (`min-h-0 flex-1 overflow-auto overscroll-contain`), so the inner
  list needs `overscroll-contain` to avoid chaining wheel events into the canvas behind it.

**In-file reference idiom (already correct 3×):** the viewport-safe host-appearance
panel at `:2968`
(`mt-2 flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`) →
`shrink-0` header (`:2976`) → `min-h-0 flex-1 overflow-y-auto overscroll-contain` body
(`:2999`). The Layers popover fix MIRRORS this, not the `LibraryPanel:37`
`h-full`-host chain (which cannot engage on an `absolute` popover).

### Per-file verdict

| # | File | Verdict |
|---|------|---------|
| 1 | `pages/PageEditor.tsx` (Layers popover `:2692`–`:2757`) | **NEEDS SCROLL FIX** (the confirmed report) — `absolute` popover with NO `max-h`/`overflow`/height bound; the `:2705` section list grows past the viewport. This IS the "unscrollable Layers window." |
| 1a | `editor/PageEditorLayers.tsx` (`LayerBlockRows`) | **NO EDIT** — stays byte-identical. It is host-scrolled inner content (one section's blocks); the scroll region lives on its host at `PageEditor.tsx:2705`, NOT inside the recursive renderer. |
| 2 | `builder/LibraryPanel.tsx` | NO FIX — `Tabs` root `flex h-full min-h-0 flex-col overflow-hidden` (`:37`); `TabsList shrink-0` (`:38`); each `TabsContent min-h-0 flex-1 overflow-hidden` (`:42/:50`). Correct. |
| 3 | `builder/WidgetPicker.tsx` | NO FIX — root `flex h-full min-h-0 flex-col overflow-hidden` (`:78`); `shrink-0` header (`:79`); list in `<ScrollArea className="min-h-0 flex-1 p-4">` (`:102`). TASK-197's fix. Correct. |
| 4 | `builder/FormPicker.tsx` | NO FIX — identical correct pattern (root `:37`, `shrink-0` header `:38`, `<ScrollArea className="min-h-0 flex-1 p-4">` `:49`). Correct. |
| 5 | `builder/VisualPanel.tsx` | NO FIX — inner content block inside `WidgetEditorModeRoot`; host inspector owns scroll. Adding overflow = nested double-scrollbar. Leave as-is. |
| 6 | `builder/AdvancedPanel.tsx` | NO FIX — same rationale (`WidgetEditorModeRoot ... space-y-6` `:51`, sequential sections, host owns scroll). |
| 7 | `builder/WizardPanel.tsx` | NO FIX — same rationale (short/sequential, host owns scroll). |
| 8 | `builder/LayoutPanel.tsx` | NO FIX — short fixed form (`<div className="space-y-4">` `:38`), nested inside VisualPanel. Not a tall list. |
| 9 | `editor/PageEditorCommandPalette.tsx` | NO FIX — already correct; the REFERENCE idiom. Modal `flex ... max-h-[calc(100dvh_-_8rem)] min-h-0 flex-col overflow-hidden` (`:80`); search `shrink-0` (`:83`); results `min-h-0 flex-1 overflow-y-auto overscroll-contain` (`:98`); footer `flex shrink-0` (`:147`). |

Host of the affected panel (edited): `pages/PageEditor.tsx` — the Layers popover
`:2692`–`:2757` (import `:245`, render `:2738`) is the sole file that gets the fix.

Not list panels (no scroll relevance): `editor/FloatingEditorToolbar.tsx`,
`editor/PageAuthoringCanvas.tsx`, `editor/pageEditorHostContract.ts`,
`editor/pageEditorLabels.ts`, `editor/pageEditorOptions.ts`, `builder/BlockList.tsx`,
`builder/BlockSettings.tsx`, `builder/BlockToolbar.tsx`, `builder/blockUtils.ts`,
`builder/types.ts`, `builder/widgetRegistry.ts`, `builder/bookingFlowContext.ts`,
`builder/AdminWidgetPreviewRuntimeBridge.tsx`.

**SINGLE ACTION REQUIRED:** fix #1 only — the Layers popover in `PageEditor.tsx`. All
other candidate panels are already correctly scroll-contained or are host-scrolled inner
content and **MUST NOT** be modified. `PageEditorLayers.tsx` (`LayerBlockRows`) stays
byte-identical.

## The fix (className/structure only — in `PageEditor.tsx`)

The affected panel is the **`absolute`-positioned Layers popover** at
`PageEditor.tsx:2693`. An absolute box is out of its parent's flex flow, so the
`flex-1`/`h-full`/`LibraryPanel:37` chain **cannot engage** here — it would leave the
popover unscrollable (bug persists) or collapse it. Use the **viewport-anchored popover
idiom already proven in-file 3× (host-appearance panel `:2968`/`:2976`/`:2999`)**: a
self-bound `max-h` on the popover container plus an inner scroll body.

Apply, at implement time (re-grep anchors first with `grep -an`, NEVER plain `grep`/`rg`):

1. **Popover container** (`:2693`): add
   `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden` to the existing
   `absolute left-4 top-16 z-20 w-72 rounded-2xl border border-border bg-popover p-3 shadow-pop`.
   Also add a stable test hook: `data-page-editor-layers-panel="true"`.
2. **Header row** (`:2694` `mb-2 flex items-center justify-between`): add `shrink-0`.
3. **Section list** (`:2705` `space-y-1`): change to
   `min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-1` and add
   `data-page-editor-layers-scroll="true"`. This is the **single** scroll region — it
   wraps the WHOLE `pageDocument.sections.map` stack, so a many-section tree scrolls as
   one list (not per-section nested boxes).
4. **`LayerBlockRows` / `PageEditorLayers.tsx`:** UNCHANGED (byte-identical). No overflow
   is added inside the recursive renderer.

- Precise className contract: **`min-h-0 flex-1 overflow-y-auto overscroll-contain`** on
  the `:2705` list region; **`shrink-0`** on the `:2694` header; **`max-h-[min(72vh,calc(100dvh-8rem))] flex flex-col overflow-hidden`**
  on the `:2693` container.
- **Why NOT the `flex-1`/`h-full` wrapper idiom here:** the popover has no
  bounded-height flex ancestor (`:2488` is `flex-col` but the popover is `absolute`,
  removing it from that flow). A `max-h` is self-bounding and is the only shape that
  scrolls an absolute popover. The abstract `LayerBlockTree` wrapper from the earlier
  draft is DROPPED — it would be dead code (nothing consumes it) and its `flex-1` would
  divide against nothing.
- **`overscroll-contain`** on the inner list prevents wheel-scroll chaining into the
  sibling canvas scroller (`:2590`); `box-shadow` still paints outside `overflow-hidden`,
  so the popover's `shadow-pop`/`rounded-2xl` render intact.

## Subtask breakdown

| # | Subtask | Sole-writer file(s) | Leaves |
|---|---------|--------------------|--------|
| 526-01 | Layers popover scroll containment | `core/admin/ui/pages/PageEditor.tsx` (Layers popover `:2692`–`:2757`); `tests/vitest/ui/page-editor-layers.test.tsx` (append — targets the live host) | L01 (per affected panel — the ONE panel that needs the fix: the `PageEditor.tsx` Layers popover) |

There is exactly ONE affected panel, so subtask 526-01 has ONE leaf (per-panel).

## Hard Invariants

1. **Pure UI / structure** — className-only edits to the `PageEditor.tsx` Layers popover
   (`:2693` container, `:2694` header, `:2705` list) plus two `data-*` test hooks. No
   logic, model, API, route, prop-signature, or behavioral change.
2. **No migration / no DDL** — nothing touches the DB or the page document schema.
3. **ONE scroll region, on the section list** — `overflow-y-auto` on the `:2705`
   `space-y-1` sections container ONLY. NEVER inside `LayerBlockRows` and NEVER on the
   recursed inner instances (`PageEditorLayers.tsx:165`). Exactly one `overflow-y-auto`
   in the popover subtree.
4. **Container is `max-h`-bounded, not `flex-1`/`h-full`-host-bound** — the `absolute`
   popover self-bounds via `max-h-[min(72vh,calc(100dvh-8rem))] flex flex-col overflow-hidden`
   (`:2693`); header `shrink-0` (`:2694`); list `min-h-0 flex-1 overflow-y-auto overscroll-contain`
   (`:2705`). The `LibraryPanel:37` `h-full`-host chain is NOT used (cannot engage on an
   absolute popover).
5. **`PageEditorLayers.tsx` stays byte-identical** — `LayerBlockRows` recursive output is
   unchanged; no wrapper is added there. The abstract `LayerBlockTree` from the earlier
   draft is NOT created.
6. **Structural class-assertion test on the LIVE host only** — render `PageEditor`, open
   Layers, assert the popover's `data-page-editor-layers-scroll` region carries
   `min-h-0 flex-1 overflow-y-auto` and the container carries the
   `max-h-[min(72vh,calc(100dvh-8rem))]` bound; assert exactly one `overflow-y-auto` in
   the popover subtree. NO `scrollHeight`/layout-metric reliance (jsdom does not layout).
   Do NOT assert against a detached component in isolation.
7. **No other panel touched** — the 7 "NO FIX" files and the 13 non-list files stay
   byte-identical; `PageEditorLayers.tsx` stays byte-identical. `PageEditor.tsx` is the
   sole edited file (Layers popover only).

## Acceptance Criteria

1. The Layers popover (`PageEditor.tsx:2693`) carries
   `max-h-[min(72vh,calc(100dvh-8rem))] flex flex-col overflow-hidden`; its header row
   carries `shrink-0`; its section list (`:2705`) carries
   `min-h-0 flex-1 overflow-y-auto overscroll-contain`.
2. On a page with a tall / many-section block tree, the Layers popover scrolls vertically
   as ONE list and the lowest layers become reachable ("widzę wszystkie warstwy") — the
   `max-h` self-bound makes overflow engage without any host change.
3. There are NO nested scroll boxes: exactly one `overflow-y-auto` in the popover subtree;
   `LayerBlockRows` and its recursion add none.
4. Structural class-assertion test green — renders the LIVE `PageEditor`, opens Layers,
   asserts the container `max-h` bound + the list-region classes + exactly one
   `overflow-y-auto` in the popover; no scrollHeight.
5. `PageEditorLayers.tsx` and every other audited panel are byte-identical (no unintended
   edits); `PageEditor.tsx` diff is limited to the Layers popover.
6. Gates green (root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`,
   vitest, `bun test`, `gates:coderso`); 0 console errors in the admin Page Editor.
7. Live-verified (light + dark) in the admin Page Editor: the popover's `rounded-2xl`
   corners and `shadow-pop` render intact, the last layer is reachable, and wheel events
   at the list bounds do not chain into the canvas behind it.

## Definition of done

The `PageEditor.tsx` Layers popover self-bounds with
`max-h-[min(72vh,calc(100dvh-8rem))] flex flex-col overflow-hidden` (`:2693`), a
`shrink-0` header (`:2694`), and a single `min-h-0 flex-1 overflow-y-auto overscroll-contain`
scroll region on the section list (`:2705`) so a tall multi-section tree scrolls as one
list and all layers are reachable; `PageEditorLayers.tsx`/`LayerBlockRows` stays
byte-identical (no nested scroll boxes); a structural class-assertion test drives the
LIVE `PageEditor` (opens Layers, asserts the container bound + list classes + exactly one
`overflow-y-auto`); no other panel is modified; pure UI change, no migration; every gate
green; live-verified light+dark; closure documented under the then-current next-free
changelog (grep highest+1). Work in worktree `feature/task-526`.
</content>
</invoke>
