# TASK-496-01: Shared Editor-Chrome Shell and Pages Adoption
# FileName: TASK-496-01-Shared-Editor-Chrome-Shell-And-Pages-Adoption.md

**Priority:** High
**Category:** Admin UI / Page Builder / Editor Architecture / Refactor
**Estimated Effort:** Large
**Dependencies:** TASK-495 (done — the proven builder chrome shipped in `PageEditor.tsx`, commit `3625712f`), TASK-479-06-L06 (the orphaned `shared/CanvasEditor.tsx` port), TASK-479-06-L05 (`EditorShell variant="canvas"`), TASK-479-08-L02 (floating-panel control model)
**Status:** ✅ Done
**Completed:** 2026-06-30
**Parent Task:** TASK-496

---

## Overview

Extract the **proven** page-builder chrome — the in-content `PageHeader` + the separated rounded card + the "Page builder" sub-toolbar + the light 280px right-docked collapsible floating rail + the dark-correct dotted canvas — out of the ~5,352-line `core/admin/ui/pages/PageEditor.tsx` builder branch into **ONE shared editor-chrome shell**, and route Pages **and** Page Templates through it with **zero behavioral change** (byte-equivalent DOM, identical handler wiring, identical `PAGE_MODEL`/cache/dirty/autosave/preview/history flow). The look is proven (Pages + Page Templates already share it today via `editorHost.mode`), but it is **inlined** JSX inside the builder branch (`PageEditor.tsx:3373-3534`, gated by `useBuilderChrome` at `:985-987`), so Screens cannot reuse it. This leaf turns that inlined look into an importable unit so TASK-496-02 (Screens) can mount the identical frame over its own `ScreenDocumentV1` engine.

This leaf also **resolves the orphan**: `core/admin/ui/shared/CanvasEditor.tsx` already exists as a purely-presentational shell whose docstring (`:15-32`) explicitly names "the page, post, custom-screen entry-view, entry-content, and page-template editors" as reuse targets — but it has **zero PRODUCTION importers**. (Its only references outside itself are a comment in `EditorShell.tsx:13` **and** the TASK-479-06-L06 unit spec `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx:11`, which imports the orphan and exercises its CURRENT uncontrolled API — a built-in "Hide panel"/"Show panel" toggle that flips the shell's own state, plus `panelTitle` / `defaultPanelOpen` / `aria-pressed`. The controlled read-only body swap below removes that built-in toggle and those props, so this leaf **retargets that spec in place** — see Step 3 + the regression-test shape — so it is never left orphaned/red.) The new builder chrome re-inlined the look instead of consuming it. Per the NO-DEAD-CODE mandate, the orphan **becomes** the shared shell, **repurposed in place** — same file path and same `CanvasEditor` export name (the established prototype name the screen children already reference), body replaced with the real slot-based extraction, dead `BlockChip` export removed. After this leaf there is exactly **one** shell file with **real importers** and **zero** orphaned editor-shell paths.

- **Goal:** a single `core/admin/ui/shared/CanvasEditor.tsx` (the repurposed orphan) owning the in-content `PageHeader` region + card / sub-toolbar / right-rail look + dotted canvas region + `panelPosition: "right" | "bottom"` + the panel show/hide UX; `PageEditor.tsx`'s builder branch renders through it, **byte-equivalent** for Pages and Page Templates. The menu (legacy) branch is untouched.
- **Owning modules:** `core/admin/ui/shared/CanvasEditor.tsx` (repurpose in place — orphan → live shared shell); `core/admin/ui/pages/PageEditor.tsx` (builder branch consumes the shell); `core/admin/ui/layouts/EditorShell.tsx` (refresh the `CanvasEditor` comment at `:12-16` so it describes the now-wired shell).
- **Source-of-truth:** `_docs/PAGE_MODEL.md` (document model — **never** change block/section shapes, normalization, or responsive-override semantics), `_docs/PREVIEW_SPEC.md` (preview/runtime contract). **Prototype reference:** `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx` (the shell's design ancestor; `panelPosition="right"|"bottom"`). Background memories: **[[pages-editor-v2-remediation-program]]**, **[[page-editor-color-toolbar-live-findings]]** (real-input toolbar regression the rail must NOT reintroduce), **[[pageeditor-tsx-grep-binary-trap]]** (PageEditor.tsx is binary to `rg`/`grep` — use `Read` or `grep -an`).
- **Out of scope:** No `PAGE_MODEL`/schema/payload changes, no preview-token or runtime contract changes, no endpoint/RBAC/cache changes, no new builder features, no visual restyle (this is a **structural extraction**, not a re-skin — the emitted DOM/classes stay identical). Screens adoption is TASK-496-02; the dead-code closure sweep is TASK-496-03.

> **Behavior-preservation invariant (HARD):** after this leaf, the Pages and Page-Templates editor DOM must be **byte-equivalent** to `feature/visual` HEAD. The extraction MOVES JSX into a component; it must not change a single class, `data-*` attribute, `aria-label`, ref, or handler. Every `page-editor-*` + `page-authoring-canvas` + `menu-design-editor-flow` suite stays green with **no assertion weakened**. If a class/attribute must change to make the slot seam work, the extraction is wrong — re-shape the slot, not the DOM.

---

## Security Contract

UI-only structural refactor. **No** route, RBAC, cache-key, or `adminPaths` change. Preview/autosave/publish keep flowing through the existing `pagesClient` helpers and the `pageEditorHostContract` capability gating (`editorHost.preview`/`publish`/`settingsLabel`, `revisionsHost`); the cache contract (`getCachedDetail`/`loadDetail`/`autosaveDocument`/`saveDocument`, `subscribeCacheEvents`, no mount-force refetch, no dirty-state overwrite) and the `RuntimePreviewDialog` preview-token guards are preserved unchanged. No contract schema is added or refreshed in this leaf (the shell is presentational; the `PageEditorHost` contract — `pageEditorHostContract.ts:177-222` — is **not** touched). The repurposed shell imports only `@/lib/utils` (`cn`) + `react` types (`ReactNode`/`Ref`) — the header, sub-toolbar, panel body, badge, and reopen affordance are all host-supplied `ReactNode` slots, so the repurpose **drops** the orphan's `@/components/ui/button` + `lucide-react` imports and adds **no** `@/ui/shared/PageHeader` and **no** data/service import. (The host — `PageEditor.tsx`, and in 496-02 the screen surfaces — constructs the `PageHeader` node and passes it into the `header` slot.) That keeps the shell well inside the boundary-legal presentational set, so it stays legal under the `custom-screen-authoring-boundary` rules for the Screen consumers added in 496-02.

---

## Implementation Pseudocode

### Step 0 — Map the proven chrome that is being extracted (verified anchors)

The inlined builder chrome lives inside the `EditorShell` return of `PageEditor`:

- `PageEditor.tsx:2681` — `return ( <EditorShell ... >`; breadcrumbs (legacy vs builder), `:2708` `topbarActions={useLegacyChrome ? topbarActions : undefined}`, `:2709-2710` `centerScroll={false} contentClassName="h-full"`.
- `:2712-2716` — outer wrapper `relative flex h-full min-h-0 flex-col` (`bg-dotted` for menu / `bg-background` for builder).
- `:2717-2797` — the Alert banners (error/preview/autosave/revalidation/recovery-check/recoverable-autosave). **Stay in the host, above the shell.**
- `:2809` — `const canvasRegionChildren = ( <> …` (no hooks added).
- `:2830-2853` — canvas scroller: `data-page-editor-canvas-scroller` `:2834`, builder right-clearance `paddingRight: 300` when `panelOpen && hasFloatingPanelSelection` `:2849-2850`, `onClick={() => selectSection(null)}` `:2853`.
- `:2855-2867` — page frame: `bg-card` `:2856`, `style={canvasSiteTokenVariables}` `:2859`, `data-page-editor-canvas-frame` `:2860`, `data-page-editor-canvas-device` `:2861`, `editorHost.canvasChrome` mount `:2863-2866`.
- `:3013-3038` — the floating rail: `panelOpen && selectedSection && resolvedSelectedSection ?` `:3013` → `EditorControlToneContext.Provider value={panelTone}` `:3014` + `ref={toolbarElementRef}` `:3016`, builder class `:3020` (`absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(280px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop`) vs legacy `:3019` (`bg-slate-950`), `aria-label={`${toolbarTargetLabel} tools`}` `:3031`, `data-page-editor-floating-toolbar` `:3032`, `data-page-editor-toolbar-collapsed` `:3033`.
- `:3355-3370` — reopen chip: rendered when `!panelOpen && hasFloatingPanelSelection`; builder placement `right-4 top-4`, legacy `bottom-6 right-6` `:3364`; `aria-label="Show panel"`.
- `:3373-3534` — **the builder/menu ternary** (`return useBuilderChrome ? (...) : (...)`). Builder arm `:3374-3528` = `<PageHeader className="mb-0 shrink-0 px-6 pb-3 pt-4" .../>` (`:3378-3433`, title + Settings/History/Preview/Save/Publish actions, host-capability gated) + the card `mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card` (`:3440`) wrapping the sub-toolbar (`:3444-3512`: `Page builder` title + `Save only` badge `:3447-3452` + `StatusBadge`/Unsaved `:3456-3461` + Undo/Redo `:3466-3485` + `DeviceSwitcher` `:3488` + Layers `:3490-3498` + Panel toggle `:3500-3510`) + the device-context strip (`:3518-3525`, `data-page-editor-canvas-context={device}`) + `<BuilderCanvasRegion builder={true}>{canvasRegionChildren}</BuilderCanvasRegion>` (`:3526`).
- `:3529-3533` — the MENU (legacy) flat branch: `<BuilderCanvasRegion builder={false}>{canvasRegionChildren}</BuilderCanvasRegion>`.
- `BuilderCanvasRegion` helper (`:749-752`): `builder ? <div className="relative flex min-h-0 flex-1 flex-col">{children}</div> : <>{children}</>`.
- Host state the chrome reads: `panelOpen` (`:784`), `panelTone` (`:987`), `hasFloatingPanelSelection` (`:976`), `floatingToolbarVisible` (`:979`), `canvasSiteTokenVariables` (`:790`), `toolbarElementRef` (`:837`), `toolbarTargetLabel` (`:1022`).

### Step 1 — Repurpose the orphan in place into the shared shell

Keep `core/admin/ui/shared/CanvasEditor.tsx` (path + `CanvasEditor` export name) and **replace its body** with the slot-based extraction below. The orphan's `CanvasEditor` body (fixed-height card + built-in disabled undo/redo + static device + grip panel header) is superseded; the dead `BlockChip` export (zero importers — verified `grep -rn "BlockChip" core` = self only) is **deleted**. The shell owns only **layout + the PageHeader region + the card/sub-toolbar/rail look + panel placement/visibility**. It is presentational (no `PAGE_MODEL`, no fetch). `panelOpen` becomes a **controlled** prop — the host stays the single source of truth because it derives canvas clearance (`paddingRight:300`, `:2850`) and `floatingToolbarVisible` (`:979`) from the same flag; an internal `panelOpen` would fork that state and break clearance. (This is the one deliberate deviation from the orphan's uncontrolled-`panelOpen` model — documented in the shell header.) The shell is **controlled read-only**: it only READS `panelOpen` (to decide whether to render the panel + reopen affordance) and **never calls** `onPanelOpenChange` — both the panel toggle (in the `toolbar` slot) and the `reopenAffordance` are host-supplied slots that flip the host's own `setPanelOpen` directly (`PageEditor.tsx:3504` toggle / `:3362` reopen, verified). `onPanelOpenChange` is the host setter passed through purely for controlled-prop symmetry and to keep `setPanelOpen` referenced (so surfaces with no built-in hide toggle don't leave an unused setter); because the shell does not consume it, the shell body MUST use property access (`p.onPanelOpenChange` is simply never referenced) and **must not** destructure it, or `@typescript-eslint/no-unused-vars` under `--max-warnings=0` would fire — that property-access style is exactly why the Step-1 pseudocode uses the `p.` form, and that choice is deliberate, not incidental.

```tsx
// core/admin/ui/shared/CanvasEditor.tsx  (repurposed in place; same export name)
// ONE shared editor-chrome shell. Reproduces the PROVEN PageEditor builder chrome
// (TASK-495-03) so Pages, Page Templates (this leaf) and Screens (TASK-496-02)
// render the identical frame. Presentational only — host owns the canvas tree,
// the panel body, history, autosave, and the panelOpen flag (controlled READ-ONLY:
// the shell reads panelOpen and NEVER calls onPanelOpenChange — both panel
// affordances are host-supplied slots that flip the host's own setter).
// IMPORTS (the FULL set — repurposed body is slot-only): cn + react types only.
// The header/toolbar/panel/badge/reopen are host-supplied ReactNode slots, so the
// shell imports NO PageHeader, NO Button, NO lucide-react (the orphan's Button +
// lucide + GripHorizontal/Monitor/etc. are dropped). Keeps no-unused-vars clean.
import { cn } from "@/lib/utils";
import type { ReactNode, Ref } from "react";

type CanvasEditorProps = {
  // In-content PageHeader region rendered ABOVE the card (host supplies the node,
  // incl. its className "mb-0 shrink-0 px-6 pb-3 pt-4" — PageEditor.tsx:3378-3379).
  header?: ReactNode;

  // Sub-toolbar (chrome bar) — PageEditor.tsx:3444-3512
  title: ReactNode;            // "Page builder"
  badge?: ReactNode;           // <Badge variant="soft">Save only</Badge> when !publish (:3447-3452)
  toolbar?: ReactNode;         // host control cluster, VERBATIM: StatusBadge+Unsaved | Undo/Redo | DeviceSwitcher | Layers | Panel-toggle (:3454-3511). The shell renders NO built-in undo/redo/device — the host's wired controls win.

  // Device-context strip — PageEditor.tsx:3518-3525 (omit for Screens)
  deviceContext?: { value: string; label: ReactNode }; // value → data-page-editor-canvas-context

  // Canvas region (shell owns the BuilderCanvasRegion relative wrapper, :749-752)
  canvas: ReactNode;           // host: dotted scroller + page frame + sections + layers overlay

  // Single floating panel (shell positions + shows/hides)
  panel?: ReactNode;           // host body (already wrapped in EditorControlToneContext by the host); pass null when nothing is selected so byte-equiv: no rail without a selection
  panelOpen: boolean;          // CONTROLLED (read-only) — host single source of truth; the shell only READS it.
  onPanelOpenChange: (open: boolean) => void; // host's setPanelOpen passthrough (controlled-prop symmetry; keeps
                               // setPanelOpen referenced for surfaces without a built-in hide toggle). The shell
                               // NEVER calls it — the toolbar toggle + reopenAffordance slots flip the host setter
                               // directly. Access via `p.` only; do NOT destructure (else no-unused-vars fires).
  panelPosition?: "right" | "bottom"; // default "right"
  panelRef?: Ref<HTMLDivElement>;     // = toolbarElementRef (byte-equiv)
  panelAriaLabel?: string;            // = `${toolbarTargetLabel} tools`
  panelDataProps?: Record<string, string | undefined>; // data-page-editor-floating-toolbar / -toolbar-collapsed passthrough
  reopenAffordance?: ReactNode;       // host-gated "Show panel" chip; shell renders it only when !panelOpen

  className?: string;
};

// Container classes are the EXACT strings lifted from PageEditor — see Step 0 anchors.
const PANEL_POS_CLASS = {
  right:
    "absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(280px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop", // PageEditor.tsx:3020
  bottom:
    "absolute bottom-5 left-1/2 z-30 -translate-x-1/2 ...", // prototype CanvasEditor.tsx:132 — first exercised by Screens entry-content (496-02), NOT by Pages
} as const;

export function CanvasEditor(p: CanvasEditorProps) {
  return (
    <>
      {p.header}
      {/* Separated card (PageEditor.tsx:3440) */}
      <div className={cn(
        "mx-6 mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        p.className,
      )}>
        {/* Sub-toolbar (PageEditor.tsx:3444) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{p.title}</span>
            {p.badge}
          </div>
          <div className="flex items-center gap-1.5">{p.toolbar}</div>
        </div>
        {/* Device-context strip (PageEditor.tsx:3518) — optional */}
        {p.deviceContext ? (
          <div
            className="flex shrink-0 items-center justify-center bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
            data-page-editor-canvas-context={p.deviceContext.value}
          >
            {p.deviceContext.label}
          </div>
        ) : null}
        {/* Canvas region = BuilderCanvasRegion builder=true (PageEditor.tsx:751, 3526) */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {p.canvas}
          {p.panelOpen && p.panel ? (
            <div
              ref={p.panelRef}
              className={PANEL_POS_CLASS[p.panelPosition ?? "right"]}
              aria-label={p.panelAriaLabel}
              {...p.panelDataProps}
            >
              {p.panel}
            </div>
          ) : null}
          {!p.panelOpen ? p.reopenAffordance : null}
        </div>
      </div>
    </>
  );
}
```

### Step 2 — Consume the shell from `PageEditor`'s builder branch (byte-equivalent)

The faithful extraction **forks the shared `canvasRegionChildren` value (`:2809`)** into:
- `canvasBody` — the dotted scroller + page frame + `SectionCanvas` map + layers overlay (everything in `canvasRegionChildren` **except** the floating rail and the reopen chip). Shared by both menu and builder, unchanged DOM.
- the **floating rail** (`:3013-3038`) and **reopen chip** (`:3355-3370`) — their `useLegacyChrome ? … : …` conditionals are split: the **legacy** arm stays inline in the menu branch (byte-identical, incl. the draggable transform `:3024-3030` + drag `data-*`), the **builder** arm moves into the shell's `panel` / `reopenAffordance` slots. The `EditorControlToneContext.Provider value={panelTone}` (`:3014`, always `"light"` for builder) wraps the panel body the host passes in.

```tsx
// PageEditor.tsx return (:2681) — builder branch rewires to the shell.
return (
  <EditorShell breadcrumbs={/* unchanged */} topbarActions={useLegacyChrome ? topbarActions : undefined}
               centerScroll={false} contentClassName="h-full">
    <div className={`relative flex h-full min-h-0 flex-col ${useLegacyChrome ? "bg-dotted" : "bg-background"}`}>
      {/* all Alert banners stay here, unchanged (:2717-2797) */}
      {(() => {
        const canvasBody = (<> {/* :2810-… MINUS the rail+reopen — scroller/frame/sections/layers, unchanged */} </>);

        const builderRail = (selectedSection && resolvedSelectedSection) ? (
          <EditorControlToneContext.Provider value={panelTone /* "light" */}>
            {/* the EXISTING builder rail body — every control component + prop unchanged (:3046-3351) */}
          </EditorControlToneContext.Provider>
        ) : null;

        const builderReopen = (!panelOpen && hasFloatingPanelSelection) ? (
          <button type="button" onClick={() => setPanelOpen(true)} aria-label="Show panel"
            className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary">
            <SlidersHorizontal className="size-3.5" /> Show panel
          </button>
        ) : null;

        return useBuilderChrome ? (
          <CanvasEditor
            header={/* the EXACT <PageHeader className="mb-0 shrink-0 px-6 pb-3 pt-4" title=... actions=...> from :3378-3433 */}
            title="Page builder"
            badge={!editorHost.publish ? <Badge variant="soft">Save only</Badge> : null}
            toolbar={/* the EXACT cluster from :3454-3511: StatusBadge+Unsaved, Undo/Redo, DeviceSwitcher, Layers, Panel toggle (button still calls setPanelOpen) */}
            deviceContext={{ value: device, label: device === "desktop"
              ? `${deviceScopeReadout("desktop")} · base view`
              : `${deviceScopeReadout(device)} · override context` }}
            canvas={canvasBody}
            panel={builderRail}
            panelOpen={panelOpen}
            onPanelOpenChange={setPanelOpen}
            panelPosition="right"
            panelRef={toolbarElementRef}
            panelAriaLabel={`${toolbarTargetLabel} tools`}
            panelDataProps={{
              "data-page-editor-floating-toolbar": "true",
              "data-page-editor-toolbar-collapsed": toolbarCollapsed ? "true" : "false",
            }}
            reopenAffordance={builderReopen}
          />
        ) : (
          // MENU (legacy): UNCHANGED — flat region with the legacy inline rail + reopen chip.
          <BuilderCanvasRegion builder={false}>
            {canvasBody}
            {/* legacy rail (:3019 bg-slate-950, draggable) + legacy reopen (:3364 bottom-6 right-6) stay inline, byte-identical */}
          </BuilderCanvasRegion>
        );
      })()}
    </div>
  </EditorShell>
);
```

Page Templates need **no separate change**: `PageTemplateEditorPage.tsx:214` sets `mode: "page-template"` → `useBuilderChrome === true` → it flows through the same shell automatically (exactly as it shares the inlined chrome today). The `Save only` badge (`!editorHost.publish`) and the Preview-button omission (`editorHost.preview` absent) keep working because those are host-capability reads passed straight into the slots.

### Step 3 — Orphan resolution (NO DEAD CODE)

- `shared/CanvasEditor.tsx` keeps its path + `CanvasEditor` export but is no longer orphaned: it gains a real importer (`PageEditor.tsx`).
- **Retarget the existing importer test in this leaf (NO orphaned/red test):** `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx` is a LIVE importer (`:11` `import { CanvasEditor } from "@/ui/shared/CanvasEditor"`) of the orphan. Its four cases assert the orphan's OLD uncontrolled API — clicking a built-in "Hide panel"/"Show panel" toggle that flips the shell's own state (`:49-71`), `panelTitle="Block"` (`:55`), `defaultPanelOpen` + `aria-pressed="true"` (`:73-76`), `panelPosition="bottom"` + `aria-pressed` (`:78-85`), and the built-in toggle flipping `aria-pressed` (`:87-104`). The controlled read-only body removes the built-in toggle and drops `panelTitle`/`defaultPanelOpen`/`device` (and `panelOpen` becomes required, so a bare `<CanvasEditor canvas=.. panel=.. />` is a tsc error), so all four cases would go red. **This leaf rewrites that file in place** to the new controlled read-only API (it becomes the shell unit spec — the (a)–(d) coverage points in the regression-test shape below land HERE, not in a parallel new file). It is **kept + retargeted**, not deleted.
- The dead `BlockChip` export is removed (zero importers — verified).
- `EditorShell.tsx:12-16` comment refreshed to describe the now-wired shell (drop any "out of scope / orphan" implication).
- `BuilderCanvasRegion` (`:749-752`): its `builder={true}` behavior is now inside the shell. Keep the helper only if the **menu** branch still calls `builder={false}` (it does, `:3533`) — but since that path is just `<>{children}</>`, inline it at the menu call site and delete the one-use helper, OR keep it imported/used. Decide during impl; either way leaves **zero** unused symbols.

### De-risking fallback (only if the lifted-rail byte-fidelity destabilizes the floating-panel suite)

If splitting `canvasRegionChildren` and re-homing the builder rail drifts the `page-editor-floating-panel` / `page-authoring-canvas` `data-*` assertions, ship the **outer-chrome-only** shell: the shell owns the PageHeader + card + sub-toolbar + device strip + relative canvas wrapper, and `canvas` = the **full** unchanged `canvasRegionChildren` (rail + reopen chip stay inside, host-positioned). This still yields ONE shell + ZERO orphans + byte-equivalent Pages; the only cost is that the shell's `panel`/`panelPosition` slot is first exercised by Screens in 496-02 rather than by Pages here. Prefer the faithful lift; fall back only on a measured byte-diff failure, and record the choice in the 496-03 closure.

**Data flow (unchanged):** `getCachedDetail`/`loadDetail` hydrate → `PAGE_MODEL` document state drives `SectionCanvas`/layers → section/block ops mutate the document via the existing `createPageBlockV2`/responsive-override helpers → `autosaveDocument`/`saveDocument` persist with the dirty-state guard (`useAdminDirtyNavigationGuard`) → `subscribeCacheEvents` background-revalidates without overwriting dirty state → `preview` + `RuntimePreviewDialog` honor preview tokens. The shell only re-homes the chrome JSX; it changes **which component emits the markup**, never **which handler runs**.

**Error handling:** the Alert banners (`:2717-2797`) stay in the host above the shell, unchanged; `createAdminActionToastAdapter` + `isSessionExpiredApiError` handling untouched. Panel open/close and device switch must not refetch or clear dirty state (the controlled `panelOpen` keeps the existing no-effect-setState discipline; memory **[[page-editor-color-toolbar-live-findings]]** — add **no** panel-wide `onMouseDown` `preventDefault`, keep per-fragment color / URL input / inline-mark controls focusable).

**Regression-test shape:**
- The existing `page-editor-*` + `page-authoring-canvas` suites are the byte-equivalence oracle: assert the chrome renders, the floating panel + show/hide toggle (`aria-pressed`) exist, `data-page-editor-canvas-frame` / `-canvas-device` / `-canvas-context` / `-floating-toolbar` / `-toolbar-collapsed` / `-device-option` hooks are intact, Undo/Redo keep their `aria-label`, and Settings/History/Preview/Save/Publish gate on host capability. **Do not weaken** any assertion.
- **Retarget the existing importer spec** `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx` (the TASK-479-06-L06 spec — it ALREADY imports `@/ui/shared/CanvasEditor`; do **not** create a parallel `tests/vitest/ui/shared-canvas-editor.test.tsx`, the two would overlap). Drop the OLD uncontrolled-API cases (built-in "Hide panel"/"Show panel" toggle, `panelTitle`, `defaultPanelOpen`) and rewrite it to render the controlled read-only `CanvasEditor` directly and assert (a) it emits the optional `header`, the card + sub-toolbar (+ device-context strip when `deviceContext` is set) + relative region; (b) `panelOpen={false}` hides the panel and renders the `reopenAffordance`, `panelOpen={true}` shows the `panel` (the shell never toggles its own state — `panelOpen` is a required prop with no default); (c) `panelPosition="right"` yields the `w-[min(280px,…)]` rail container and `"bottom"` the centered container; (d) `panelRef` / `panelAriaLabel` / `panelDataProps` land on the single rail div. (This is the only shell unit spec — it lives at the existing `ui-integration/canvas-editor/` path, not a new `ui/` file.)
- Add a guard test (or extend `page-editor-layout-shell.test.tsx`) asserting Pages **and** Page Templates both render through the shared `CanvasEditor` shell (one shell, two resources) and that the menu host does **not** (legacy branch preserved).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui/page-editor-template-picker.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx`
- All other `tests/vitest/ui/page-editor-*` suites + `tests/vitest/pages/page-template-boundary.test.ts` stay green (no weakened assertions). The `menu-design-editor-flow` suite proves the legacy branch is byte-untouched.
- Real-input verification (playwright real mouse+keyboard, per **[[page-editor-color-toolbar-live-findings]]**): in the right rail — swatch click applies, URL input focuses, inline mark live-updates — guarding the documented regression after the rail moves into the shell slot.

### NO-DEAD-CODE / dead-import acceptance check (this leaf)

- `grep -rn "BlockChip" core` → **0** matches (dead export removed).
- `grep -arln "shared/CanvasEditor" core` (the `-a` flag is **mandatory**: `PageEditor.tsx` reads as binary to plain `grep`/`rg` — `grep -rln` returns NOTHING for it, so the sole importer is invisible without `-a`; excluding `_PROTOTYPE` + the shell file itself) → **≥1** real importer (`PageEditor.tsx`) — the shell is **used**, not orphaned. Equivalently anchor the proof on `grep -an "shared/CanvasEditor" core/admin/ui/pages/PageEditor.tsx` plus the lint/types pass.
- `grep -an "CanvasEditor" core/admin/ui/layouts/EditorShell.tsx` → the `:13` comment now accurately describes the **wired** shell (no "orphan"/"out of scope" implication).
- No unused imports/symbols introduced in `PageEditor.tsx` after the extraction (lint `--max-warnings=0` enforces this; verify `BuilderCanvasRegion` is either still used by the menu branch or deleted — no one-use dead wrapper).
- `bun --cwd core lint` passes with zero warnings (the repo-wide editor-surface sweep is finalized in TASK-496-03).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-496** + **TASK-496-01**, stating this is a **behavior-preserving extraction** (no `PAGE_MODEL`/preview/RBAC change) that turns the inlined builder chrome into the shared `shared/CanvasEditor.tsx` shell and resolves the orphan.
- No `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md` edit is expected (pure structural refactor) — state explicitly in the changelog that none was required. The shared-shell contract is documented inline in `CanvasEditor.tsx`'s header; Screens' adoption + any contract refresh is TASK-496-02.
