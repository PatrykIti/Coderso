# TASK-512-05: UI Components — Prototype Fidelity & New Controls

# FileName: TASK-512-05-UI-Components-Fidelity-And-Controls.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Admin UI / Components / Prototype Fidelity
**Estimated Effort:** Large
**Dependencies:** TASK-512-04 (client/types/utils: `MediaItem` new fields, `mediaFoldersClient`,
`MediaFolder`, focal/tree/tag helpers, quota shape).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-05 is the SOLE WRITER of these media leaf components:**
- Extend: `core/admin/ui/media/MediaCard.tsx`, `MediaGrid.tsx`, `MediaToolbar.tsx`,
  `MediaDetailsDrawer.tsx`, `MediaSettingsDrawer.tsx`.
- NEW: `StorageQuotaCard.tsx`, `MediaFolderRail.tsx`, `TagInput.tsx`, `FocalPointPicker.tsx`,
  `MediaFilterPanel.tsx` (the "Filters" popover).

ZERO edits to `MediaLibraryPage.tsx` (that is 512-06's file — this subtask only exports
components + props it will consume). **Back-compat mandatory:** `MediaGrid`/`MediaCard` public
props stay additive-only because `MediaPicker.tsx:17` imports `MediaGrid`. **Land order:** after
512-04, before 512-06.

---

## Grounded anchors — prototype (source of truth, verified 2026-07-05)

- `_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx` — LIVE at `:5180/#/media`.
- **Storage card** (proto lines 80-96): `SectionCard title="Storage" description="6.2 GB of 10
  GB used" icon={<HardDrive/>} action={<Button variant="outline" size="sm">Manage plan</Button>}`
  → `<Progress value={62} className="h-2.5" />` + footer `flex justify-between text-xs
  text-muted-foreground`: "62% used" / "3.8 GB available" (tabular-nums). Admin lacks
  `SectionCard`/`Progress`/`FilterBar` — VERIFY equivalents: `core/admin/ui/**` has
  `Card`/`CardContent` (used today) + a `Progress` primitive (grep
  `core/admin/ui/components|ui` for `Progress`; if absent, build a token-faithful bar with a
  filled `div` — do NOT skip the bar). Reuse the current `PageHeader` (`@/ui/shared/PageHeader`).
- **FilterBar** (proto `components/patterns/FilterBar.tsx`): search input (`pl-9`, Search icon
  absolute left-3) + `filters` slot + a `<Button variant="outline" size="sm"><SlidersHorizontal/>
  Filters</Button>` + grid/list toggle (`inline-flex rounded-xl border bg-card p-0.5 shadow-soft`,
  size-7 buttons, active `bg-muted text-foreground`). Current `MediaToolbar` = search + toggle
  only, NO Filters button.
- **Grid card** (proto lines 124-149): `Card className="group overflow-hidden p-2 ...
  hover:-translate-y-0.5 hover:shadow-card"` → preview `relative flex aspect-square items-center
  justify-center rounded-xl bg-muted text-muted-foreground` with `<Badge variant="outline"
  className="absolute left-2 top-2 bg-card/80 backdrop-blur">{type}</Badge>` (TYPE badge
  TOP-LEFT) + centered kind icon; footer `px-1 pb-1 pt-2.5`: truncated name (`text-sm
  font-medium`), then row `flex justify-between text-xs text-muted-foreground` = size + a small
  tone chip (`inline-flex size-5 rounded-md` with tone class + `[&_svg]:size-3` icon).

## Grounded anchors — current admin

- `MediaCard.tsx` props (line 12 `MediaCardProps`), `MediaGrid.tsx` props (line 5 `MediaGridProps`,
  consumed by page AND `MediaPicker`). `MediaToolbar.tsx` (line 14 `MediaToolbarProps`: search/
  view/onSearchChange/onViewChange; exports `MediaFilter`/`MediaView` line 11/12).
  `MediaDetailsDrawer.tsx` (`MediaDetailsDrawerProps` line 38: item/open/usage*/dimension*/
  onSave/onDelete/onCopy/onOpen/onReplace). `MediaSettingsDrawer.tsx` (line 22: accessMode +
  save handlers). Current storage card is inline in `MediaLibraryPage.tsx:564-579` (flat Card,
  "N assets · N KB", NO progress) — 512-06 replaces it with `StorageQuotaCard`.

---

## Implementation

### StorageQuotaCard.tsx (NEW) — prototype-faithful storage card
Props: `{ usedBytes:number; totalBytes:number|null; planLabel:string|null; assetCount:number;
onManagePlan?:()=>void }`. Reproduce the proto `SectionCard` structure: HardDrive icon, "Storage"
title, description `"{formatBytes(used)} of {formatBytes(total)} used"` (or `"{count} assets ·
{formatBytes(used)}"` when `totalBytes` null — graceful degrade, no bar), a `Progress`/filled-bar
`h-2.5` at `pct = clamp(used/total*100)`, footer "N% used" / "{formatBytes(available)} available"
tabular-nums, and a "Manage plan" outline button (opens Media settings quota section →
`onManagePlan`). Use design tokens (`bg-primary`, `text-muted-foreground`) — NO literal
`bg-white` (dark-mode break per memory). Works light + dark.

### MediaFolderRail.tsx (NEW) — replaces the static type-only rail with real folders + types
Props: `{ folders:MediaFolder[]; folderTree; typeCounts; activeFolderId:string|null;
activeType:MediaFilter; onSelectType; onSelectFolder; onCreateFolder; onRenameFolder;
onDeleteFolder; onReorder }`. Render (proto rail tokens: `rounded-xl px-3 py-2 text-sm`, active
`bg-primary/10 font-medium text-primary`): TWO sections — (1) type filters (All/Images/Videos/
Documents/Audio, existing `folderDefs` + counts), (2) a "Folders" section listing user folders as
a nestable tree (indent by depth) with per-folder count, a "+ New folder" affordance, inline
rename, delete (confirm), and drag-or-buttons reorder. Selecting a folder sets `activeFolderId`
(type filter → "all"); selecting a type clears `activeFolderId`. Keep it responsive (`flex-row
flex-wrap lg:flex-col` like current).

### MediaFilterPanel.tsx (NEW) — the proto "Filters" affordance, made functional
A popover/sheet opened by the FilterBar "Filters" button. Controls (max-config): filter by
type(s), by tag(s) (multi-select from all tags present), by folder, by "has alt / missing alt",
by date range (optional). Emits a `MediaFilterState` the page applies. Prototype shows the
button; we make it a real facet panel (owner mandate: functional, not cosmetic).

### MediaToolbar.tsx (extend) — add Filters button + keep grid/list toggle
Add a `<Button variant="outline" size="sm"><SlidersHorizontal/>Filters</Button>` + `onOpenFilters`
prop + optional active-filter count badge; keep search + view toggle. Reproduce FilterBar tokens.
Keep existing props additive.

### TagInput.tsx (NEW) — chips input for `tags`
Props `{ value:string[]; onChange; max?=30 }`. Chip list + text input; Enter/comma adds, Backspace
removes last, dedupe, per-tag len cap, remove-X per chip. Token-faithful (`Badge`-like chips).

### FocalPointPicker.tsx (NEW) — draggable focal marker on image preview
Props `{ src; focalX:number|null; focalY:number|null; onChange:(x,y)=>void }`. Render the image
with a draggable crosshair marker; click/drag sets normalized `[0,1]` coords; live-preview
`object-position: {x*100}% {y*100}%`; "Reset to center" button. Keyboard-accessible (arrow keys
nudge). Only shown for image-type assets.

### MediaDetailsDrawer.tsx (extend) — new metadata fields
Add sections BELOW existing title/alt/caption: **Folder** (select from folders), **Tags**
(`TagInput`), **Description** (textarea), **Credit** (input), **Focal point** (`FocalPointPicker`,
images only). Wire to `onSave` via extended `MediaMetaUpdate` (present-only). Keep existing
preview/usage/dimension-recovery/replace intact.

### MediaCard.tsx / MediaGrid.tsx (extend) — prototype-faithful card
Rework card to proto structure: `aspect-square` muted preview, TYPE badge TOP-LEFT
(`absolute left-2 top-2 bg-card/80 backdrop-blur`), centered kind icon (or thumbnail for
images), footer name + size + small tone chip bottom-right. KEEP current functional extras
(selection checkbox, "Missing alt" affordance, list view) folded in tastefully. For images with a
focal point, apply `object-position` from `resolveFocalPosition`. Props additive only
(`MediaPicker` back-compat).

### MediaSettingsDrawer.tsx (extend) — quota config (controlled inputs only)
Add a "Storage quota" section: `planLabel` input + `totalBytes` input (accept GB, convert to
bytes). **Follow the existing CONTROLLED pattern** — the real drawer is a controlled component
(`MediaSettingsDrawer.tsx:31/43`: `accessMode` value + `onAccessModeChange` + `onSave:()=>void`;
it does NOT call `updateStorageSettings` itself). So this section only RENDERS controlled quota
inputs: add props `quotaPlanLabel:string|null`, `quotaTotalBytes:number|null`,
`onQuotaPlanLabelChange`, `onQuotaTotalBytesChange`; values flow UP and are persisted by the page's
`onSave` handler. Do NOT call `updateStorageSettings` here (the actual `updateStorageSettings({
quota })` call is owned by 512-06 in `MediaLibraryPage.tsx` — see 512-06 Implementation §5). Keep
existing access-mode control.

---

## Security Contract

- Presentational layer; no direct network trust decisions. All persistence goes through 512-04
  clients (CSRF) → 512-03 routes (RBAC/reject-unknown/clamp). Focal coords, tag caps, quota
  numbers are ALSO clamped client-side for UX but the server is authoritative.
- No `dangerouslySetInnerHTML`; media `src`/`url` rendered as attributes only (no HTML injection).
  Tag/description/credit rendered as text nodes.

## Testing Requirements

- **Vitest lane (Bun-free, render):** one test per NEW component + extended drawer:
  `StorageQuotaCard` (bar width % from used/total; null-total degrades to count-only, no bar),
  `TagInput` (add/dedupe/remove/cap), `FocalPointPicker` (drag sets `[0,1]`, reset centers,
  object-position style), `MediaFolderRail` (tree render, active states, create/rename/delete
  callbacks), `MediaFilterPanel` (emits filter state), `MediaToolbar` (Filters button fires
  `onOpenFilters`), `MediaDetailsDrawer` (new fields present + onSave carries them),
  `MediaCard` (type badge top-left, tone chip, focal object-position). Assert VISIBLE effect
  (computed classes/styles), per owner smoke mandate, not mere presence.
- **Back-compat test:** `MediaPicker` render still passes with unchanged props.
- `lint:types` + root `tsc` green.

## Acceptance Criteria

1. Storage card = prototype-faithful progress card (quota-backed) light+dark; degrades gracefully
   when no quota. "Filters" button present + functional. Grid cards match proto (top-left type
   badge, tone chip, aspect-square).
2. Real folder rail (create/rename/nest/reorder/delete + counts); details drawer gains folder/
   tags/description/credit/focal; settings drawer gains quota config.
3. `MediaPicker` unaffected (additive props). All component Vitest tests green; `tsc` green.
