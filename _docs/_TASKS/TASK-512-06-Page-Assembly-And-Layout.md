# TASK-512-06: Media Library Page Assembly & Prototype Layout

# FileName: TASK-512-06-Page-Assembly-And-Layout.md

**Parent Task:** TASK-512
**Priority:** High
**Category:** Admin UI / Page Assembly / Prototype Fidelity
**Estimated Effort:** Large
**Dependencies:** TASK-512-05 (all leaf components + new controls), TASK-512-04 (clients/types/
utils/quota).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**512-06 is the SOLE WRITER of `core/admin/ui/media/MediaLibraryPage.tsx`.** It wires the new
components into the prototype-faithful layout and adds all new page state (folder filter, tag
filter, filter panel, quota fetch + quota save via `updateStorageSettings({ delivery, quota })`,
focal/tags/desc/credit save-through). ZERO edits to leaf
components (512-05) or clients (512-04). **Land order:** after 512-05, before 512-07.

---

## Grounded anchors (verified 2026-07-05)

- `MediaLibraryPage.tsx` current state (lines 82-116): items/selectedId/selectedIds/isDrawerOpen/
  search/filter/view/openAfterUpload/upload+settings state. `folderDefs` (line 74) = static type
  rail. `filteredItems` (line 203) filters by search + `filter` type. `folderCounts` (220) +
  `totalBytes` (225) are render-time derivations. Storage card inline at 564-579 (flat Card —
  REPLACE with `StorageQuotaCard`). Rail inline at 581-606 (REPLACE with `MediaFolderRail`).
  Toolbar at 608-613. Bulk bar at 614-646 (KEEP — functional superset). Drawer at 702-717.
  Settings drawer 718-728. `handleSaveMeta` (274) already round-trips `MediaMetaUpdate` — new
  fields flow through once `MediaMetaUpdate` widened (512-04).
- Live layout confirmed via `:5173/admin/media` vs `:5180/#/media` (screenshots
  `_docs/_workflows/_smoke/wf512-admin-media.png` + `wf512-proto-media.png`): current LACKS
  progress bar/quota/Manage-plan + Filters button; grid card structure differs (no top-left type
  badge). Prototype grid is `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`;
  rail/content grid `lg:grid-cols-[200px_minmax(0,1fr)]` (current already matches this grid).

---

## Implementation

1. **Quota fetch:** on mount (or with existing settings load), call `getStorageSettings()` and
   read `settings.quota` (512-04 shape). Pass `usedBytes={totalBytes}`,
   `totalBytes={quota.totalBytes}`, `planLabel={quota.planLabel}`, `assetCount={items.length}`,
   `onManagePlan={handleOpenMediaSettings}` to `<StorageQuotaCard/>` (replaces the inline
   flat Card at 564-579). Null quota → count-only card (no bar).
2. **Folders:** fetch via `listMediaFoldersCached()` into `folders` state + `subscribeCacheEvents`
   on `cacheKeys.mediaFolders`. Build `folderTree` with `buildFolderTree`. Render
   `<MediaFolderRail/>` (replaces inline rail): pass folders/tree/typeCounts/activeFolderId/
   activeType + create/rename/delete/reorder handlers (call `mediaFoldersClient`). Add
   `activeFolderId` state; selecting a folder filters the grid to that folder (incl. descendants
   via `countMediaByFolder`/membership); selecting a type clears folder.
3. **Filters panel:** add `filterPanelOpen` + `mediaFilterState` state; wire `MediaToolbar`
   `onOpenFilters` → open `<MediaFilterPanel/>`; extend `filteredItems` memo to also apply
   folder + tag + alt-status + date filters from `mediaFilterState` (compose with existing search/
   type filter). Keep existing search/type behavior.
4. **Details drawer save-through:** `handleSaveMeta` already forwards `MediaMetaUpdate`; ensure new
   fields (folderId/tags/focalX/focalY/description/credit) are included in the drawer's onSave
   payload (drawer built in 512-05). On folderId change, refresh folder counts (derive from items;
   optionally re-broadcast). Upload flow may accept a target folder (`activeFolderId`) — pass to
   `uploadMedia` meta so new uploads land in the current folder.
5. **Quota SAVE (page owns it):** the real `MediaSettingsDrawer` is CONTROLLED — the actual
   persistence call lives in the page (`handleSaveMediaSettings` at line 507 calls
   `updateStorageSettings({ delivery: { accessMode } })` and wires `onSave={handleSaveMediaSettings}`
   at line 727; 512-05 only renders controlled quota INPUTS + onChange props). So the PAGE owns the
   quota save: add `quotaPlanLabel`/`quotaTotalBytes` state (seed from the `getStorageSettings()`
   quota fetch in §1), pass them + `onQuotaPlanLabelChange`/`onQuotaTotalBytesChange` as controlled
   props into `<MediaSettingsDrawer/>`, and extend `handleSaveMediaSettings` to include `quota:{
   totalBytes, planLabel }` in the SAME `updateStorageSettings({ delivery, quota })` call (512-04
   extended shape). On success, refresh `StorageQuotaCard` (re-derive from updated settings).
6. **Layout fidelity:** keep the `lg:grid-cols-[200px_minmax(0,1fr)]` rail/content grid; order:
   PageHeader → StorageQuotaCard → [rail | (Toolbar+Filters → bulk bar → upload card → grid)].
   Grid uses proto column steps. Preserve all existing effects (cache hydration, usage load,
   dimension recovery, bulk ops, upload dropzone). Verify light + dark parity vs `:5180`.

---

## Security Contract

- No new network calls beyond 512-04 clients (all CSRF-guarded, RBAC-gated server-side). Page is
  orchestration only; the server remains the trust boundary. Folder/tag/focal inputs are
  clamped in components + normalized/rejected server-side. No `dangerouslySetInnerHTML`.

## Testing Requirements

- **Vitest lane (Bun-free, page render/integration):** `tests/vitest/ui/media-library-page.test.tsx`
  (extend/NEW): (a) renders `StorageQuotaCard` with quota (bar) AND without quota (count-only);
  (b) folder rail create→select filters grid; (c) Filters button opens panel, tag filter narrows
  grid; (d) details drawer save forwards new fields to `updateMedia` (mock client, assert
  payload); (e) upload into active folder passes folderId. Mock `mediaClient`/`mediaFoldersClient`/
  `settingsClient`. Assert visible effect (rendered rows/geometry), not just control presence.
- **Bun lane:** none new (page is client).
- `lint:types` + root `tsc` green (page is the biggest tsc surface — verify).

## Acceptance Criteria

1. Page layout matches prototype side-by-side (storage progress card, Filters affordance,
   top-left type-badge grid, folder rail) in light AND dark; `:5173` HTTP 200.
2. Folder create/select/nest/reorder/delete + assign + filter all work end-to-end; deleting a
   folder un-files (never deletes) its media in the UI.
3. Tag/focal/description/credit persist and round-trip via the drawer; quota card reflects real
   used/total and degrades gracefully when unset.
4. All existing functionality (bulk bar, upload, usage, dimension recovery, picker) intact.
5. Vitest page tests green; `tsc` green.
