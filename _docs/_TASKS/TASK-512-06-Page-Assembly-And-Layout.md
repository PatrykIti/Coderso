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

1. **Quota fetch (MOUNT-time, explicit):** the existing `getStorageSettings()` call is LAZY —
   `loadMediaSettings` (line 484) fires ONLY from `handleOpenMediaSettings` (line 502-504) when the
   settings drawer opens, and the mount effect (line 153) `refresh(...)` loads MEDIA only (line
   117-142). So the card would stay count-only until the user opens Media settings. Add a NEW
   mount-time effect (mirror the `getUserSettings` mount effect at line 165-179, with an `active`
   guard) that calls `getStorageSettings()`, reads `settings.quota` (512-04 shape), and populates
   the quota state (`quotaTotalBytes`/`quotaPlanLabel`, §5). ALSO extend `loadMediaSettings` (line
   484) to set the SAME quota state on drawer open so card + drawer stay in sync after a save.
   Pass `usedBytes={totalBytes}`, `totalBytes={quotaTotalBytes}`, `planLabel={quotaPlanLabel}`,
   `assetCount={items.length}`, `onManagePlan={handleOpenMediaSettings}` to `<StorageQuotaCard/>`
   (replaces the inline flat Card at 564-579). Null/absent quota → count-only card (no bar).
2. **Folders:** fetch via `listMediaFoldersCached()` into `folders` state + `subscribeCacheEvents`
   on `cacheKeys.mediaFolders`. Build `folderTree` with `buildFolderTree`. Render
   `<MediaFolderRail/>` (replaces inline rail): pass folders/tree/typeCounts/folderCounts/
   activeFolderId/activeType + create/rename/delete/reorder handlers (call `mediaFoldersClient`).
   Build the per-folder map the rail's `folderCounts` prop (512-05) requires — use a DISTINCT
   identifier to avoid shadowing the EXISTING `folderCounts` (line 220), which is the TYPE-count map
   (`all`/`image`/… → count) that feeds the `typeCounts` prop: `const folderItemCounts =
   useMemo(() => Object.fromEntries(folders.map((f) => [f.id, countMediaByFolder(items, f.id)])),
   [folders, items])` (recursive count incl. descendants), then pass `folderCounts={folderItemCounts}`
   (and `typeCounts={folderCounts}` — the existing line-220 map). Add `activeFolderId` state; selecting a folder filters the grid to that folder
   **incl. descendants** (see §3 for the inline descendant-membership filter — `countMediaByFolder`
   is a COUNT helper, used only to build the rail's per-folder `folderItemCounts`, NOT for filtering the
   list); selecting a type clears folder.
3. **Filters panel + folder/tag filter (inline, page-owned):** add `filterPanelOpen` +
   `mediaFilterState` state. Wire `MediaToolbar` with BOTH props 512-05 exposes: pass
   `onOpenFilters={() => setFilterPanelOpen(true)}` AND
   `activeFilterCount={countActiveFilters(mediaFilterState)}` (import `countActiveFilters` from
   `@/ui/media/MediaFilterPanel` — see §"MediaFilterState" import block; 512-05's MediaToolbar hides
   the badge at `0`/undefined and lights it when facets are active, so this consumes 512-05's
   `activeFilterCount?` contract). 512-05's `<MediaFilterPanel/>` is CONTROLLED with required props
   `{ tags; folders; value; onChange; onReset }` and does NOT fetch tags itself — the PAGE derives the
   tag union from the loaded items and supplies every prop (gate the panel's visibility on
   `filterPanelOpen`):
   ```ts
   const filterTags = useMemo(
     () => [...new Set(items.flatMap((i) => i.tags ?? []))].sort(),
     [items],
   ); // deduped, sorted union of all item.tags — the panel's tag chip source
   // rendered when filterPanelOpen (popover/sheet):
   <MediaFilterPanel
     tags={filterTags}
     folders={folders}                               // 512-04 MediaFolder[] (fetched in §2)
     value={mediaFilterState}
     onChange={(next) => {
       setMediaFilterState(next);
       // reconcile: a panel-selected folder is authoritative-writes-through to the rail's
       // activeFolderId (the grid's single folder source of truth — the memo filters folders
       // by activeFolderId ONLY, never by mediaFilterState.folderId, so without this write a
       // panel folder would be counted by countActiveFilters yet have ZERO grid effect).
       // Setting a panel folder clears the rail's active TYPE (folder + type are exclusive, per §2).
       setActiveFolderId(next.folderId);
       if (next.folderId) setFilter("all"); // clear rail type selection when a folder is chosen
     }}
     onReset={() => {
       setMediaFilterState(EMPTY_MEDIA_FILTER);
       setActiveFolderId(null); // reset clears the reconciled folder too
     }}
   />
   ```
   Then extend the `filteredItems` memo to also apply folder + tag + alt + date filters (compose with
   existing search/type filter, keep existing search/type behavior).

   **`MediaFilterState` (single writer = 512-05):** the type, `EMPTY_MEDIA_FILTER`, and
   `countActiveFilters` are DEFINED AND EXPORTED by 512-05's `MediaFilterPanel.tsx`
   (512-05 §"MediaFilterPanel.tsx"). 512-06 IMPORTS them and holds the value in `mediaFilterState`
   state — it MUST NOT re-declare the type (a local re-definition is the exact cross-file drift the
   memory warns about; it would diverge from the single writer and break root `tsc`):
   ```ts
   import type { MediaFilterState } from "@/ui/media/MediaFilterPanel";
   import { EMPTY_MEDIA_FILTER, countActiveFilters } from "@/ui/media/MediaFilterPanel";
   ```
   For reference (do NOT copy/redeclare — this is the AUTHORITATIVE 512-05 shape 512-06 codes
   against; all fields empty-means-inactive so the memo degrades to today's search+type behavior when
   the panel has never been opened):
   ```ts
   // 512-05 MediaFilterPanel.tsx (single writer) — IMPORTED here, never redefined:
   export type MediaAltFilter = "any" | "has" | "missing";
   export type MediaFilterState = {
     types: MediaKind[];        // extra type facets (empty = no type facet beyond rail `filter`)
     tags: string[];            // AND-match tags (empty = no tag facet)
     folderId: string | null;   // panel-driven folder facet (rail `activeFolderId` is separate; see note)
     alt: MediaAltFilter;       // alt-text facet ("any" = inactive)
     dateFrom: string | null;   // ISO createdAt lower bound (null = open)
     dateTo: string | null;     // ISO createdAt upper bound (null = open)
   };
   // export const EMPTY_MEDIA_FILTER: MediaFilterState =
   //   { types: [], tags: [], folderId: null, alt: "any", dateFrom: null, dateTo: null };
   ```
   `mediaFilterState` seeds from the imported `EMPTY_MEDIA_FILTER`. The rail's `activeFolderId` (§2) and the
   panel's `mediaFilterState.folderId` are reconciled to a single effective folder: rail selection
   is authoritative; when the panel sets a folder it writes `activeFolderId` too (keep one source of
   truth for the grid — do NOT double-filter). The folder filter is DESCENDANT-AWARE and computed
   INLINE in the page memo (no `filterByFolder` helper exists in 512-04's utils.ts and 512-06 cannot
   add one — 512-04 is the single writer of that file; 512-04 owns only `buildFolderTree`,
   `countMediaByFolder` (count), `filterByTag`). `FolderNode` is the `buildFolderTree` return type —
   shape `MediaFolder & { children: FolderNode[] }`. **Cross-subtask dependency:** 512-04 must EXPORT
   `FolderNode` from `core/admin/ui/media/utils.ts` (it currently annotates `buildFolderTree(folders):
   FolderNode[]` but must also `export type FolderNode`); 512-06 IMPORTS it as
   `import type { FolderNode } from "@/ui/media/utils"`. (512-06 cannot declare the export itself —
   utils.ts is 512-04's single-writer file.) The page also uses `buildFolderTree` (rail tree),
   `countMediaByFolder` (rail `folderCounts`, above), `filterByTag`, and `hasMissingImageAlt` (all
   512-04 exports from `utils.ts`) — add them to 512-06's value imports:
   `import { buildFolderTree, countMediaByFolder, filterByTag, hasMissingImageAlt } from
   "@/ui/media/utils"` (verified present: `hasMissingImageAlt` at `utils.ts:54`).
   ```ts
   // page-local pure helper (or inline in the filteredItems memo) — self-contained DFS, no external findNode
   function folderDescendantIds(tree: FolderNode[], folderId: string): Set<string> {
     const ids = new Set<string>();
     let matched = false;
     const collectSubtree = (n: FolderNode) => {
       ids.add(n.id);
       for (const c of n.children ?? []) collectSubtree(c);
     };
     const find = (nodes: FolderNode[]) => {
       for (const n of nodes) {
         if (matched) return;
         if (n.id === folderId) { matched = true; collectSubtree(n); return; }
         if (n.children?.length) find(n.children);
       }
     };
     find(tree); // walk once; on hit, collect that node + all descendants
     return ids;  // empty set if folderId not present in the tree
   }
   // in filteredItems memo (compose AFTER the existing search + type filter, before returning):
   let next = items.filter(/* existing search + rail `filter` type predicate (line 205-214) */);
   const f = mediaFilterState;
   if (activeFolderId) {
     const descendantIds = folderDescendantIds(folderTree, activeFolderId);
     next = next.filter((i) => i.folderId != null && descendantIds.has(i.folderId));
   }
   if (f.types.length)   next = next.filter((i) => f.types.includes(i.type));
   if (f.tags.length)    next = f.tags.reduce((acc, t) => filterByTag(acc, t), next); // filterByTag (512-04), AND-match
   if (f.alt !== "any")
     next = next.filter((i) =>
       f.alt === "missing" ? hasMissingImageAlt(i) : (i.type === "image" && !hasMissingImageAlt(i)),
     ); // image-only facet: "missing" ⇒ image w/o alt, "has" ⇒ image w/ alt; non-images excluded.
       // Do NOT collapse to `(f.alt === "missing") === hasMissingImageAlt(i)` — hasMissingImageAlt is
       // false for every non-image (utils.ts:54 = type==="image" && !alt), so that equality would
       // wrongly surface all documents/audio/video under "has" (512-05 §Details lines 148-153 forbid it).
   if (f.dateFrom) next = next.filter((i) => i.createdAt.slice(0, 10) >= f.dateFrom!); // DATE portion (inclusive lower bound)
   if (f.dateTo)   next = next.filter((i) => i.createdAt.slice(0, 10) <= f.dateTo!);   // DATE portion (inclusive upper bound)
   // NB: compare the DATE portion, NOT the raw ISO timestamp — createdAt is a full ISO datetime
   // ("2026-07-05T14:00:00Z") but dateFrom/dateTo are <input type=date> "YYYY-MM-DD"; a raw lexical
   // compare drops assets created on the selected end day (exclusive upper bound). Per 512-05 §Details.
   return next;
   // memo deps: [items, search, filter, activeFolderId, folderTree, mediaFilterState]
   ```
   Keep `folderDescendantIds` pure so it is Vitest-testable (see Testing Requirements).
4. **Details drawer save-through:** `handleSaveMeta` already forwards `MediaMetaUpdate`; ensure new
   fields (folderId/tags/focalX/focalY/description/credit) are included in the drawer's onSave
   payload (drawer built in 512-05). On folderId change, refresh folder counts (derive from items;
   optionally re-broadcast). **Upload-into-folder = upload-first-then-PATCH** (NOT via upload meta):
   when `activeFolderId` is set, call `uploadMedia(file, { alt?, title?, caption? })` (upload meta
   stays minimal — `mediaUploadSchema` is `additionalProperties:false` and does NOT carry
   `folderId`/`tags`, per 512-02 §A / 512-03 reconciliation, so a `folderId` in the upload body is
   rejected 4xx at the route boundary), THEN `updateMedia(returnedId, { folderId: activeFolderId })`
   on the returned media id so the new asset lands in the current folder. Do NOT pass `folderId`
   into `uploadMedia` meta.
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

- **Vitest lane (Bun-free, page render/integration):** EXTEND the REAL existing page suite
  `tests/vitest/ui/media-library.test.tsx` (imports `MediaLibraryPage` — do NOT create a new
  `media-library-page.test.tsx`, it does not exist and would duplicate/miss existing coverage). A
  second page suite `tests/vitest/mediaUi/mediaLibrary.test.tsx` also exists — consolidate page-level
  coverage there if appropriate. Add: (a) renders `StorageQuotaCard` with quota (bar) AND without quota (count-only);
  (b) folder rail create→select filters grid; (c) Filters button opens panel, `MediaFilterState`
  facets (tag AND-match, `alt`, `dateFrom`/`dateTo`) each narrow the grid, AND the toolbar Filters
  badge shows `countActiveFilters(mediaFilterState)` when facets are active (hidden at 0); **(c0)
  date-facet inclusive-boundary regression (the predicate is authored in this file's Implementation
  §, lines 185-186; 512-05 §Details lines 167-169 delegate the assertion here): an item with
  `createdAt="2026-07-05T14:00:00Z"` MUST pass when `dateTo="2026-07-05"` (and when
  `dateFrom="2026-07-05"`) — guards against the raw-ISO lexical compare that drops assets created
  any time on the selected end day;** **(c1)
  alt-facet regression (this is the "filter test where the predicate lives" that 512-05 §Testing
  delegates here — the memo predicate is authored in this file's Implementation §, lines 172-178):**
  with `alt==="has"`, a non-image item (document/audio/video with no alt) must NOT appear in the
  grid and only an image WITH alt does; with `alt==="missing"`, only an image lacking alt appears —
  non-images pass under neither state (guards against the
  `(f.alt==="missing")===hasMissingImageAlt(i)` collapse that would admit all non-images under
  "has"); (d) details drawer save
  forwards new fields to `updateMedia` (mock client, assert payload); (e) upload into an active folder
  uses upload-first-then-PATCH: assert `uploadMedia` is called with meta carrying NO `folderId`, then
  `updateMedia(returnedId, { folderId })` is called with the active folder id. Mock
  `mediaClient`/`mediaFoldersClient`/`settingsClient`. Assert visible effect
  (rendered rows/geometry), not just control presence.
- **Vitest lane (Bun-free, pure) — `folderDescendantIds`:** unit-test the page-local pure helper
  directly (export it for test, or test via a tiny wrapper): returns the folder + all nested
  descendant ids on a hit, an EMPTY set for an id absent from the tree, and handles leaf/undefined
  `children`. Pure (no React) so it runs without render.
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
