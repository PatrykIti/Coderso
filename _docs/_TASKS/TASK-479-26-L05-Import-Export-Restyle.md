# TASK-479-26-L05: Import / Export Restyle
# FileName: TASK-479-26-L05-Import-Export-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Import / Export screen to the prototype: an **Export Data** section of
**per-target export cards** (Site Settings / Navigation Menus / Theme Configuration /
Redirect Rules — each with its real per-`include` Checkbox list + a Download button) and
an **Import Data** section with a dashed **dropzone** (+ Browse Files) that previews and
applies a whole JSON bundle, plus the existing **Recent Imports** history list. All import
upload + export-config flows stay byte-for-byte the same. The prototype's single Export
card + **Format select** (json/csv/zip) and its **"what to import" checklist** are DROPPED
— export is always JSON via per-target `include`, and import applies an entire
`ExportBundle` file, not a target checklist.

- **Goal:** `core/admin/ui/import-export/ImportExportPage.tsx` (+ `ImportDropzone.tsx`,
  `ExportCards.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/ImportExportPage.tsx` while preserving the existing
  `importExportClient`/`adminExportClient` job flow.
- **Owning module/service:** `core/admin/ui/import-export/ImportExportPage.tsx`,
  `core/admin/ui/import-export/ImportDropzone.tsx`,
  `core/admin/ui/import-export/ExportCards.tsx`. `PageHeader`, `SectionCard`,
  `DataTable`, and `StatusBadge` (whose mapping must cover the real `ImportHistoryStatus`
  enum `validating`/`preview-ready`/`applying`/`applied`/`failed`) are **created/ported by
  TASK-479-06-L02**; `Checkbox`/`Button` are 06-L01 `@/components/ui/*` restyles. (No
  Format `Select` is used — export is JSON-only.)
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/ImportExportPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,DataTable,StatusBadge}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{checkbox,select,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `importExportClient` (`exportConfig`,
  `ExportRequest = { target?, include? }`, `ExportTarget`, `ExportIncludeOption`,
  `previewImport`, `importConfig`, `getCachedImportHistory`, `ImportHistoryItem`) or
  `adminExportClient`, to the export-target/include schema, to the import-upload
  validation, or to RBAC. The **Recent Imports** list renders the import history the
  client already exposes (`getCachedImportHistory()`, import-only) — do NOT invent a new
  jobs endpoint or any export-job rows; when history is empty, render the existing/empty
  state, not the prototype's mock rows.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT change the import upload handler, the `exportConfig` call, the
selected-target state, or the `breadcrumbs={["Data","Import & Export"]}` /
`activeHref="/admin/tools/import-export"` shell wiring.

```tsx
// ImportExportPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader — keep title/description; no new action needed. (The real page also has
//    a disabled "Activity Log" topbar action — leave it as-is.)
<PageHeader title="Import & Export" description="Data management and portability." />

// 2) Two STACKED sections (matching the real layout: Export Data, <Separator/>, Import
//    Data) — NOT an Import|Export two-column grid:
//    - Export Data → ExportCards.tsx: the FOUR real per-target cards (`ExportTarget`
//      settings|menus|themes|redirects — `full` is NOT a card) in a
//      `md:grid-cols-2 xl:grid-cols-4` grid. Each card restyles to the soft look but
//      KEEPS its real per-`include` <Checkbox> list (`ExportIncludeOption`s, with the
//      existing dependency/dependent toggling) and its Download <Button> calling the
//      EXISTING `onExport({ target: card.id, include: selected })` → `exportConfig`.
//      DROP the invented json/csv/zip Format <Select>: export is ALWAYS JSON (the bundle
//      downloads as a `.json` blob); there is no format option.
//    - Import Data → ImportDropzone.tsx: dashed dropzone (rounded-2xl border-dashed
//      bg-muted/40) with a primary-soft Upload tile, drag hint, and "Browse Files" button
//      — ALL bound to the EXISTING `handleDrop`/`handleBrowse` (read a JSON file →
//      `previewImport(bundle)` → `importConfig(bundle)`). DROP the "What to import"
//      checklist: import applies a whole `ExportBundle`; there is NO import-target
//      selection state.

// 3) Recent Imports — this list ALREADY exists inside ImportDropzone, backed by
//    `getCachedImportHistory()` → `ImportHistoryItem[]`
//    ({ fileName, type, sizeBytes, status, progress, createdAt, … }). Restyle it (it is
//    IMPORT-only — there is no export-job history):
//      - Status: shared <StatusBadge status={item.status} /> over the real
//        `ImportHistoryStatus` enum `validating` | `preview-ready` | `applying` |
//        `applied` | `failed` (NOT "completed/processing/failed").
//    When history is empty, keep the existing empty copy / EmptyState — do NOT fabricate
//    the prototype's 5 mock rows or any export-job rows.
```

**Data flow:** the per-target export cards drive the unchanged
`exportConfig(request: ExportRequest)` via `onExport({ target, include })`; the import
dropzone reads a JSON file → `previewImport(bundle)` → `importConfig(bundle)` unchanged;
the export-card `include` checkboxes only read/write the existing per-card selection
state. The **Recent Imports** list renders `getCachedImportHistory()` (import-only).

**Navigation/href constraint (preserve):** Keep `activeHref="/admin/tools/import-export"`
and the AdminShell breadcrumbs `["Data","Import & Export"]` exactly. Export download is a
client call, not an admin route — do NOT hand-build URLs.

**Error handling:** Keep the destructive `Alert` (import/export API error) with its
existing condition; restyle the card only. Keep the import validation errors (bad file
type/size) and the export success/error toasts. The dropzone drag-reject state keeps its
existing behavior. No new error surfaces.

**React-hooks/cache rules:** The export-card `include` selections + the import history are
controlled by the existing state — no synchronous `setState` in an effect, no fabricated
format state or mock rows. Do not add a mount effect that force-refetches or overwrites
dirty selections.

**Regression-test shape:** see L07 — render `ImportExportPage`; assert: header present,
the Export Data section renders the four per-target cards each with a real `include`
checklist + Download button calling `exportConfig`, the Import Data section renders the
dashed dropzone + "Browse Files" (NO import checklist, NO Format select), toggling an
export `include` checkbox updates that card's selection, and the Recent Imports list
renders seeded `ImportHistoryItem`s with `StatusBadge` over the real status enum (or the
empty copy when none).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-import-export-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing import/export suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/import-export.test.tsx tests/vitest/admin/importExportClient.test.ts tests/vitest/admin/adminExportClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L05`.
- If the shared `SectionCard`/`StatusBadge`/`Checkbox` styling is introduced/changed for
  Import/Export, note it alongside the TASK-479-06 shell notes so the other Tools screens reuse it.
