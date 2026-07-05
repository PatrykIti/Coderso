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
  `MediaFilterPanel.tsx` (the "Filters" popover). `MediaFilterPanel.tsx` also OWNS + exports the
  `MediaFilterState` type + a `countActiveFilters(state)` helper (NOT `types.ts`, which is 512-04's
  single-writer file — see MediaFilterPanel subsection). 512-06 imports `MediaFilterState` /
  `countActiveFilters` from `@/ui/media/MediaFilterPanel`.

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
  text-muted-foreground`: "62% used" / "3.8 GB available" (tabular-nums). Admin ALREADY SHIPS the
  two primitives this card needs — REUSE them, do NOT hand-roll:
  `core/admin/ui/shared/SectionCard.tsx` (import `@/ui/shared/SectionCard`; faithful port of the
  proto `patterns/SectionCard.tsx` — `icon`/`title`/`description`/`action` header over body,
  TASK-479-06-L02) and `core/admin/components/ui/progress.tsx` (import `@/components/ui/progress`;
  Radix `Progress`, token-driven `bg-primary` indicator, already used by SetPasswordPage /
  InstallerWizard / SiteHealthCard / SeoTable / StoreDetail / PluginDetailsDialog). Only
  `FilterBar` is genuinely absent and must be ported/built (see next anchor). Reuse the current
  `PageHeader` (`@/ui/shared/PageHeader`).
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
onManagePlan?:()=>void }`. REUSE the existing primitives (do NOT hand-roll a div bar): wrap the
existing `SectionCard` (`@/ui/shared/SectionCard`) with `icon={<HardDrive className="size-4"/>}`,
`title="Storage"`, `description="{formatBytes(used)} of {formatBytes(total)} used"` (or `"{count}
assets · {formatBytes(used)}"` when `totalBytes` null — graceful degrade, no bar), and
`action={<Button variant="outline" size="sm" onClick={onManagePlan}>{planLabel ?? "Manage plan"}</Button>}`.
Body = `<Progress value={pct} className="h-2.5" />` (`@/components/ui/progress`, Radix, its
indicator is already `bg-primary`) at `pct = clamp(used/total*100, 0, 100)`, then footer `<div
className="mt-2 flex items-center justify-between text-xs text-muted-foreground">`: "N% used" /
`<span className="tabular-nums">{formatBytes(available)} available</span>`. When `totalBytes` null,
render SectionCard WITHOUT the `<Progress>` + footer (count-only description). No literal `bg-white`
(dark-mode break per memory) — both primitives are already token-driven. Works light + dark. This
matches proto MediaLibraryPage.tsx:80-96 exactly and is less code than a bespoke bar.

### MediaFolderRail.tsx (NEW) — replaces the static type-only rail with real folders + types
Props: `{ folders:MediaFolder[]; folderTree; typeCounts; folderCounts:Record<string,number>;
activeFolderId:string|null; activeType:MediaFilter; onSelectType; onSelectFolder; onCreateFolder;
onRenameFolder; onDeleteFolder; onReorder }`. `folderCounts` is a `folderId → count` map (recursive,
incl. descendants) supplied by the page (512-06, via `countMediaByFolder`); the rail does NOT compute
it. Render (proto rail tokens, MediaLibraryPage.tsx:104-108: `flex
items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors`, active
`bg-primary-soft font-medium text-primary-soft-foreground`, inactive `text-muted-foreground
hover:bg-muted hover:text-foreground`). NOTE: current admin rail (`MediaLibraryPage.tsx:594`) uses
`bg-primary/10 font-medium text-primary` — that DEVIATES from the prototype and MUST be reconciled
to the `bg-primary-soft`/`text-primary-soft-foreground` tokens above. TWO sections — (1) type
filters (All/Images/Videos/
Documents/Audio, existing `folderDefs` + counts), (2) a "Folders" section listing user folders as
a nestable tree (indent by depth) with per-folder count from `folderCounts[folder.id]` (trailing
`tabular-nums`, `0` when absent), a "+ New folder" affordance, inline
rename, delete (confirm), and drag-or-buttons reorder. Selecting a folder sets `activeFolderId`
(type filter → "all"); selecting a type clears `activeFolderId`. Keep it responsive (`flex-row
flex-wrap lg:flex-col` like current).

### MediaFilterPanel.tsx (NEW) — the proto "Filters" affordance, made functional
A popover/sheet opened by the FilterBar "Filters" button. Prototype shows only the button; we make
it a real facet panel (owner mandate: functional, not cosmetic). This file OWNS the shared state
type (512-04's `types.ts` is off-limits; `MediaFilterPanel.tsx` is a NEW 512-05 file):

```ts
// core/admin/ui/media/MediaFilterPanel.tsx
import type { MediaFolder, MediaKind } from "@/ui/media/types"; // REUSE existing exports (types.ts:1
                                                                //   MediaKind = "image"|"document"|"audio"|"video")
export type MediaAltFilter = "any" | "has" | "missing";
export type MediaFilterState = {
  types: MediaKind[];        // empty = no type facet (matches all)
  tags: string[];            // empty = no tag facet
  folderId: string | null;   // null = no folder facet
  alt: MediaAltFilter;       // "any" = no alt facet
  dateFrom: string | null;   // ISO date, null = open lower bound
  dateTo: string | null;     // ISO date, null = open upper bound
};
export const EMPTY_MEDIA_FILTER: MediaFilterState =
  { types: [], tags: [], folderId: null, alt: "any", dateFrom: null, dateTo: null };

// non-empty-facet count for the toolbar badge (each active facet counts once)
export function countActiveFilters(s: MediaFilterState): number {
  return (s.types.length ? 1 : 0) + (s.tags.length ? 1 : 0) + (s.folderId ? 1 : 0)
       + (s.alt !== "any" ? 1 : 0) + (s.dateFrom || s.dateTo ? 1 : 0);
}
```

Props: `{ tags:string[]; folders:MediaFolder[]; value:MediaFilterState; onChange:(next:MediaFilterState)=>void; onReset:()=>void }`.
- **CONTROLLED** (no internal filter state) — value flows down, `onChange`/`onReset` up; the page
  (512-06) holds the canonical `MediaFilterState` and does the actual item filtering. `tags` is the
  union of all `item.tags` present in the library (deduped, sorted — derived by the page from the
  loaded items, NOT fetched here); `folders` is the 512-04 `MediaFolder[]`.
- **Controls:** type(s) multi-select (toggle chips over `MediaKind`), tag(s) multi-select (toggle
  chips over the `tags` prop), folder single-select (folders + an "Any folder" reset row), alt
  tri-state segmented `any | has alt | missing alt`, and an optional date range (`dateFrom`/`dateTo`
  date inputs). Every toggle produces a NEW `MediaFilterState` via `onChange` (immutable update).
- **Facet-combination semantics (documented so 512-06's filter matches this contract):** facets
  combine with **AND**; within a multi-select facet, members combine with **OR**. An item passes iff:
  `(types.length===0 || types.includes(item.type))` AND `(tags.length===0 || tags.every(t=>item.tags?.includes(t)))`
  (all selected tags required — AND within tags for precise narrowing) AND
  `(folderId===null || item.folderId===folderId)` AND
  `(alt==="any" || (alt==="missing" ? hasMissingImageAlt(item) : (item.type==="image" && !hasMissingImageAlt(item))))`
  (reuse 512-04's `hasMissingImageAlt` from `utils.ts` = `item.type==="image" && !item.alt?.trim()`).
  The alt facet is **image-only**: `"missing"` ⇒ image with no alt text; `"has"` ⇒ image with alt
  present. Non-image items (document/audio/video) have no alt concept and therefore NEVER satisfy
  `"has"` or `"missing"` — they are excluded whenever `alt!=="any"`. (Do NOT collapse this to
  `(alt==="missing")===hasMissingImageAlt(item)`: because `hasMissingImageAlt` is `false` for every
  non-image, that equality would wrongly surface all non-images under `"has"`.) AND
  `(!dateFrom || item.createdAt.slice(0,10) >= dateFrom)` AND `(!dateTo || item.createdAt.slice(0,10) <= dateTo)`.
  **Date-facet semantics (inclusive both bounds — compare DATE portion, not the raw timestamp):**
  `item.createdAt` is a full ISO datetime string (populated from the DB `media.created_at`
  `timestamp` column via `toMediaItem` in `utils.ts:66/75`; `types.ts:11 createdAt:string`), whereas
  `dateFrom`/`dateTo` are bare `<input type="date">` values (`"YYYY-MM-DD"`, contract lines 121-122).
  A raw lexical compare (`item.createdAt <= dateTo`) is a bug: `"2026-07-05T14:00:00Z" > "2026-07-05"`,
  so an asset created on the selected end day (any time after 00:00) fails `<= dateTo` and is wrongly
  dropped (exclusive upper bound). Therefore compare only the date portion via
  `item.createdAt.slice(0,10)` (equivalently `< nextDay(dateTo)`), giving an **inclusive** upper
  bound so items created anytime on `dateTo` pass. 512-06's filter test MUST assert this: an item
  with `createdAt="2026-07-05T14:00:00Z"` passes when `dateTo="2026-07-05"` (and when
  `dateFrom="2026-07-05"`), guarding the inclusive-boundary regression.
- **Reset affordance:** a "Clear all" / "Reset" button (disabled when
  `countActiveFilters(value)===0`) calls `onReset` → page sets `EMPTY_MEDIA_FILTER`. Panel also shows
  the active-facet count inline. Presentational only; no network calls.

### MediaToolbar.tsx (extend) — add Filters button + keep grid/list toggle
Add a `<Button variant="outline" size="sm"><SlidersHorizontal/>Filters</Button>` + `onOpenFilters`
prop + an active-filter count badge driven by a new `activeFilterCount?:number` prop (512-06 passes
`countActiveFilters(filterState)`; badge hidden when `0`/undefined). Keep search + view toggle.
Reproduce FilterBar tokens. Keep existing props additive.

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
Rework card to proto structure: `aspect-square` muted preview, TYPE badge (`<Badge
variant="outline" className="absolute left-2 top-2 bg-card/80 backdrop-blur">`), centered kind icon
(or thumbnail for images), footer name + size + small tone chip bottom-right. KEEP current
functional extras (list view) — but resolve the TOP-LEFT overlap EXPLICITLY (do NOT leave it to
"tastefully"): the current grid card packs three overlays that would collide with the new badge —
selectionMode checkbox at `absolute left-2 top-2 z-10` (`MediaCard.tsx:144-151`), "Selected" pill
at `right-2 top-2` (`MediaCard.tsx:82-86`), missing-alt marker at `right-2 bottom-2`
(`MediaCard.tsx:87-91`). Pin placement so no two overlays own the same corner:
  - **top-left** = TYPE badge always (proto).
  - **top-right** = selection affordance: render the `selectionMode` Checkbox here (move it from
    `left-2 top-2` → `right-2 top-2`), and the non-selectionMode "Selected" pill also top-right (they
    are mutually exclusive states — `selected && !selectionMode` — so they never co-occupy).
  - **bottom-right** = missing-alt marker (unchanged corner); if a focal/tone chip is also placed
    bottom-right, stack them in one `flex gap` container so they don't overlap.
**Tone-chip per-`MediaKind` color map (prototype-faithful — do NOT invent colors):** the proto
hard-codes tone classes per kind (`_docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx:30-36`
`KINDS`, applied at line 142 `item.tone`); the live screen shows distinct violet/blue/amber/green
chips. MediaCard MUST derive the tone class from `item.type` (`MediaKind`) via this exact table (no
new tokens):
```ts
// tone class for the bottom-right size-5 chip, by MediaKind
const KIND_TONE: Record<MediaKind, string> = {
  image:    "bg-primary-soft text-primary-soft-foreground", // proto "Image" → violet
  video:    "bg-info-soft text-info",                        // proto "Video" → blue
  document: "bg-warning-soft text-warning",                  // proto "Doc"   → amber
  audio:    "bg-success-soft text-success",                  // proto "Audio" → green
};
```
Apply on the `inline-flex size-5 rounded-md [&_svg]:size-3` chip. For images with a focal point,
apply `object-position` from `resolveFocalPosition`. Props additive only (`MediaPicker` back-compat).

**Reconcile the pre-existing tone representation (single-writer duty — this file already ships one).**
The current card ALREADY carries a second, proto-deviating tone representation that MUST be retired,
not left in parallel: `MediaCard.tsx:28-35` defines `typeToneMap: Record<MediaKind,'soft'|'info'|'warning'|'success'>`
(TASK-479-11-L01) and `MediaCard.tsx:105-111` renders a COLORED footer type Badge
`<Badge variant={typeToneMap[item.type]} className="text-[10px] capitalize">{item.type}</Badge>`
next to `formatBytes(item.sizeBytes)` + `item.originalName`. The prototype footer (proto lines 137-147)
shows ONLY `{size}` + the bottom-right tone chip — there is NO colored type-text badge in the footer —
and the top-left badge is neutral `variant="outline"` (proto line 131), with tone living solely on the
bottom-right chip. Therefore:
  - REPLACE the footer colored type Badge (`MediaCard.tsx:107-109`) with the proto footer row = size
    + the bottom-right `KIND_TONE` tone chip (no colored type-text badge, matching proto 137-147).
  - RETIRE the `Badge`-variant `typeToneMap` (`MediaCard.tsx:30`): the NEW class-string `KIND_TONE`
    above is the ONE surviving tone map. The top-left type badge is neutral `variant="outline"`
    (proto), so it is NOT a `typeToneMap` consumer. After this change exactly one tone source exists
    (`KIND_TONE` class strings on the chip) — do NOT leave the two parallel maps coexisting.
  - The `missing-alt` marker stays a distinct concern (moved to its pinned corner per the overlay
    rules above); only the type-text tone Badge + `typeToneMap` are being removed. Vitest asserts the
    footer no longer renders a per-type colored text Badge and that the chip carries the `KIND_TONE`
    class for each `MediaKind`.

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

- **Test file placement (align to existing media-* convention; Vitest globs `tests/vitest/**`):**
  EXTEND in place: `MediaCard` → `tests/vitest/ui/media-card.test.tsx`; `MediaDetailsDrawer` →
  `tests/vitest/ui/media-details.test.tsx` (verified: this suite imports `MediaDetailsDrawer`;
  do NOT use `tests/vitest/ui/media-details-panel.test.tsx`, which covers the separate
  `MediaDetailsPanel`); settings/quota drawer → `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
  (note: this one lives under `mediaUi/`, not `ui/`). CREATE new files under `tests/vitest/ui/` to
  match the dominant media-* convention: `tests/vitest/ui/storage-quota-card.test.tsx`,
  `tests/vitest/ui/tag-input.test.tsx`, `tests/vitest/ui/focal-point-picker.test.tsx`,
  `tests/vitest/ui/media-folder-rail.test.tsx`, `tests/vitest/ui/media-filter-panel.test.tsx`, and
  `tests/vitest/ui/media-toolbar.test.tsx`.
- **Vitest lane (Bun-free, render):** one test per NEW component + extended drawer:
  `StorageQuotaCard` (reused `Progress` receives `value=pct` from used/total — assert the
  `[data-slot=progress-indicator]` transform / value reflects the clamped pct; null-total degrades
  to count-only, no `Progress` rendered),
  `TagInput` (add/dedupe/remove/cap), `FocalPointPicker` (drag sets `[0,1]`, reset centers,
  object-position style), `MediaFolderRail` (tree render, active states, create/rename/delete
  callbacks), `MediaFilterPanel` (per-facet: toggling a type/tag chip, selecting a folder, flipping
  the alt tri-state, and setting a date each `onChange` a NEW `MediaFilterState` with only that facet
  changed; "Reset" disabled when `countActiveFilters===0` and fires `onReset`; assert
  `countActiveFilters` returns one per non-empty facet). **Alt-facet regression (must be asserted in
  512-06's filter test where the predicate lives):** with `alt==="has"`, a non-image item
  (e.g. a document/audio/video with no alt) must NOT pass, and only an image WITH alt passes; with
  `alt==="missing"`, only an image lacking alt passes — non-images pass under neither state (guards
  against the `(alt==="missing")===hasMissingImageAlt(item)` collapse that admits all non-images), `MediaToolbar` (Filters button fires
  `onOpenFilters`; badge shows `activeFilterCount` and hides at `0`), `MediaDetailsDrawer` (new fields present + onSave carries them),
  `MediaCard` (type badge top-left, tone chip — assert the resolved `KIND_TONE` class per
  `MediaKind`: image→`bg-primary-soft`, video→`bg-info-soft`, document→`bg-warning-soft`,
  audio→`bg-success-soft`; focal object-position). Assert VISIBLE effect
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
