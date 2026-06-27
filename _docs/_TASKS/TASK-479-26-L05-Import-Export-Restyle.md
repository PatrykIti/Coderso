# TASK-479-26-L05: Import / Export Restyle
# FileName: TASK-479-26-L05-Import-Export-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Import / Export screen to the prototype: a two-column grid with an
**Import** card (dashed **dropzone** + "what to import" checklist + Import button) and
an **Export** card ("what to export" checklist + Format Select + Export button),
followed by a **recent jobs** table. All import upload + export-config flows stay
byte-for-byte the same.

- **Goal:** `core/admin/ui/import-export/ImportExportPage.tsx` (+ `ImportDropzone.tsx`,
  `ExportCards.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/ImportExportPage.tsx` while preserving the existing
  `importExportClient`/`adminExportClient` job flow.
- **Owning module/service:** `core/admin/ui/import-export/ImportExportPage.tsx`,
  `core/admin/ui/import-export/ImportDropzone.tsx`,
  `core/admin/ui/import-export/ExportCards.tsx`. Shared `PageHeader`/`SectionCard`/
  `DataTable`/`StatusBadge`/`Checkbox`/`Select`/`Button` primitives from TASK-479-06.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/ImportExportPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard,DataTable,StatusBadge}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{checkbox,select,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `importExportClient` (`exportConfig`,
  `ExportRequest`, `ExportTarget`) or `adminExportClient`, to the export-target schema,
  to the import-upload validation, or to RBAC. The **recent jobs** table renders the
  jobs the existing client already exposes — do NOT invent a new jobs endpoint; if no
  jobs source exists yet, render the existing/empty state, not the prototype's mock
  rows.

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

// 1) PageHeader — keep title/description; no new action needed.
<PageHeader title="Import & Export" description="Move content in and out of your site with a single file." />

// 2) Two-column grid (grid-cols-1 md:grid-cols-2 gap-4):
//    - Import card → ImportDropzone.tsx wrapped in shared SectionCard
//      title="Import" icon={<ArrowDownToLine/>}:
//        dashed dropzone (rounded-2xl border-dashed bg-muted/40) with a primary-soft
//        Upload tile, "Drag a file or browse" + supported-formats hint, and a
//        "Browse files" button — ALL bound to the EXISTING file-select/drop handler.
//        Then the "What to import" checklist: each row a shared <Checkbox> bound to the
//        EXISTING import-target state (the prototype's IMPORT_ITEMS is mock; use the
//        real targets). Submit Button = the existing import handler.
//    - Export card → ExportCards.tsx wrapped in shared SectionCard
//      title="Export" icon={<ArrowUpFromLine/>}:
//        "What to export" checklist of shared <Checkbox> bound to the EXISTING
//        ExportTarget selection, a Format <Select> (json/csv/zip) bound to the existing
//        format state, and an Export Button calling the EXISTING exportConfig(request).

// 3) Recent jobs — shared DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") with columns
//    job/type/items/status/date over the rows the client ALREADY exposes:
//      - Type: <Badge variant="info"><ArrowDownToLine/> Import> | <Badge variant="soft"><ArrowUpFromLine/> Export>.
//      - Status: shared <StatusBadge status={row.status} /> (completed/processing/failed).
//    If there is no jobs list source today, render the EmptyState ("No recent jobs yet")
//    instead of fabricating the prototype's 5 mock rows.

// ChecklistRow helper (port from prototype) — a label row with a shared Checkbox; its
// checked/onCheckedChange must drive the REAL target state, not defaultChecked mock.
```

**Data flow:** existing import-upload handler (file → validate → upload) and
`exportConfig(request: ExportRequest)` are unchanged; the checklists/format Select only
read/write the existing import-target / `ExportTarget` / format state. The recent-jobs
table renders whatever the client already returns.

**Navigation/href constraint (preserve):** Keep `activeHref="/admin/tools/import-export"`
and the AdminShell breadcrumbs `["Data","Import & Export"]` exactly. Export download is a
client call, not an admin route — do NOT hand-build URLs.

**Error handling:** Keep the destructive `Alert` (import/export API error) with its
existing condition; restyle the card only. Keep the import validation errors (bad file
type/size) and the export success/error toasts. The dropzone drag-reject state keeps its
existing behavior. No new error surfaces.

**React-hooks/cache rules:** Checklist + format are controlled by the existing state —
no synchronous `setState` in an effect, no fabricated mock rows. Do not add a mount
effect that force-refetches or overwrites dirty selections.

**Regression-test shape:** see L07 — render `ImportExportPage`; assert: header present,
Import SectionCard renders the dashed dropzone + "Browse files" + import checklist bound
to real state, Export SectionCard renders the export checklist + Format Select + Export
button calling `exportConfig`, toggling a checklist row updates the target selection, and
the recent-jobs table renders existing rows with `StatusBadge` (or the EmptyState when
none).

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
