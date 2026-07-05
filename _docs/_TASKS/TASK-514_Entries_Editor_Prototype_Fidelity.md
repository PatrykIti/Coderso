# TASK-514: Entries Editor — Prototype-Fidelity UI/UX (sibling of Engine)

# FileName: TASK-514_Entries_Editor_Prototype_Fidelity.md

**Priority:** High
**Category:** Admin UI / Entries / Schema
**Estimated Effort:** Large
**Dependencies:** TASK-479 (Soft-Violet admin redesign; `PageHeader`/`SectionCard`/`StatusTabs`/`AdminShell` shared patterns), TASK-468 (entries model + editor foundations), relates to **TASK-487** (revision history/restore + SEO-field surfacing — scopes kept DISTINCT; this task leaves a clean seam, see Coordination)
**Status:** ⏳ To Do

---

## Overview

The **Entries** area is the sibling of the **Engine** (content-type) area: Engine
defines the schema, Entries authors instances of it. The Engine editor was
brought to prototype fidelity in the TASK-479 redesign (in-page `PageHeader` +
underline `Tabs` + `SectionCard` grid + right settings column). The **Entries
editor was NOT** given the same treatment — it still runs the older
`AdminShell` + custom sticky action-bar + full-height fixed `w-96` aside shape,
each field wrapped in its own `Card`. This task closes that gap: bring the
Entries list + entry editor to prototype fidelity, mirroring the Engine editor's
`SectionCard`-grid approach adapted to entries, add the schema field the
prototype implies (**Visibility**), and wire full functionality (not a cosmetic
shell) with maximum configuration flexibility.

**Live gap analysis performed** (2026-07-05, session `wf514author`):
- Prototype list `http://localhost:5180/#/advanced/entries` vs current admin
  `http://coderso-a.localhost:5173/admin/entries` → screenshots
  `_docs/_workflows/_smoke/wf514-proto-list.png`, `wf514-admin-list.png`.
- Prototype editor `#/advanced/entries/article/sample` vs current admin
  `/admin/entries/:type/:id` → `wf514-proto-editor.png`, `wf514-admin-editor.png`.
- Prototype SOURCE read: `_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx`,
  `EntryEditorPreview.tsx`, and the Engine sibling `ContentTypeEditorPreview.tsx`.
- Current SOURCE read: `core/admin/ui/entries/*` (EntryEditor 1005 lines,
  EntryList 604, EntryMetadataPanel 553, EntryTable 262, EntryGrid 94 UNUSED,
  FieldRenderer, EntryFilters), `core/admin/services/entriesClient.ts`,
  `core/services/content/entryService.ts` (1006 lines), routes
  `core/server/routes/contentEntryRoutes.ts`, validation
  `core/server/validation/contentSchemas.ts`, schema `core/db/schema.ts`
  (`contentEntries` block @ `:757-797`).

## Gap Summary (prototype vs current admin — grounded)

1. **Editor chrome.** Prototype uses an **in-page `PageHeader`** (breadcrumbs
   `Entries › Article`, title "Edit entry", description, right actions Save
   draft / Publish). Current uses `AdminShell` breadcrumbs + a **sticky action
   bar** (`EntryEditor.tsx:715-762`) with no in-page PageHeader — diverges from
   the Engine editor which DOES use in-page `PageHeader` (`ContentTypeEditor.tsx:459`).
2. **Content grouping.** Prototype groups the whole body into ONE **"Content"
   `SectionCard`** (Title, Slug, Body) + a **"Media" `SectionCard`**. Current
   wraps **every field in its own `Card`** inside a `Tabs`/section grid
   (`EntryEditor.tsx:858-909`). The Engine editor uses `SectionCard` grouping;
   Entries should mirror that.
3. **Right column.** Prototype right column is an in-grid **`320px` column of
   stacked `SectionCard`s** (Publish, Taxonomy, Metadata) that flows with the
   page. Current is a **full-height fixed `w-96` `<aside>`** with an internal
   `ScrollArea` (`EntryEditor.tsx:920-945`) — heavier chrome than the prototype.
4. **Visibility control — MISSING (schema gap).** Prototype "Publish" card has a
   **Visibility** select (Public / Private / Password protected). No `visibility`
   column on `content_entries`, no client field, no UI. → schema extension.
5. **Metadata card — MISSING.** Prototype has a dedicated **"Metadata"**
   `SectionCard` (Created / Updated / Author / Entry ID). Current only shows the
   author at the panel footer (`EntryMetadataPanel.tsx:538-550`); created/updated/
   id are not surfaced.
6. **List view toggle — MISSING.** Prototype `FilterBar` has a **list/grid view
   toggle**. Current renders only `EntryTable`; `EntryGrid.tsx` **exists but is
   never imported** (dead component). → wire a real toggle.
7. **List row fidelity (minor).** Prototype row = icon tile + title + mono id
   hash sub-line + `Badge variant="soft"` type + `StatusBadge` + author `Avatar`.
   Current `EntryTable` is close (has content-type + status columns) but omits the
   mono id sub-line and author avatar; verify + adopt tasteful parity.

Note: the current admin is FUNCTIONALLY richer than the non-functional prototype
(publish checklist, taxonomy quick-add, SEO snippet, bulk actions, runtime
preview, duplicate). **Preserve all of that** — this is a layout/structure
fidelity + additive-control task, NOT a feature reduction. Do not drop the
checklist, taxonomy, bulk actions, or runtime preview; re-home them into the
prototype's `SectionCard` structure.

## Schema-Extension Plan

**One additive schema extension: entry `visibility`.**

- `content_entries.visibility` — `text NOT NULL DEFAULT 'public'`, enum
  `public | private | password`.
- `content_entries.access_password` — `text` nullable, stores a **hashed**
  password (bcrypt/argon via the app's existing password hasher) used only when
  `visibility = 'password'`; NEVER returned in API responses (a boolean
  `hasPassword` is returned instead).
- Full migration artifacts: `core/db/migrations/0066_*.sql` + matching
  `core/db/migrations/meta/0066_snapshot.json` + `_journal.json` entry (verified
  next number: last is `0065_backup_run_metadata.sql`).
- New validated keys join the **reject-unknown allowlist** in
  `contentEntryMetadataSchema` (and create/update where authored) + a
  **round-trip persistence test**. Existing rows/omitted-field writes are
  **present-only / byte-identical** (absent `visibility` in a metadata PATCH
  leaves the stored default untouched; `public` default means legacy rows behave
  exactly as today).
- **Front-end enforcement of `private`/`password` on the public render path is an
  OPEN QUESTION (see below), NOT assumed in this task's default scope.** Default
  scope: persist + round-trip + surface + respect in admin/preview. See 514-01.

## Subtask Breakdown (single-writer file ownership)

| Sub | Title | Sole-writer files |
|-----|-------|-------------------|
| 514-01 | Entry Visibility — schema, migration, service, validation, routes | `core/db/schema.ts` (contentEntries block), `core/db/migrations/0066_*` + meta, `core/services/content/entryService.ts`, `core/server/validation/contentSchemas.ts`, `core/server/routes/contentEntryRoutes.ts` |
| 514-02 | Entries admin client — visibility types + cache round-trip | `core/admin/services/entriesClient.ts` |
| 514-03 | Entry editor prototype-fidelity layout (PageHeader + SectionCard grid + Content/Media grouping + visibility wiring + revisions seam) | `core/admin/ui/entries/EntryEditor.tsx`, `core/admin/ui/entries/EntryEditorHeader.tsx` |
| 514-04 | Entry metadata panel — Publish (Status+Visibility+Schedule) / Taxonomy / **Metadata** cards | `core/admin/ui/entries/EntryMetadataPanel.tsx` |
| 514-05 | Entries list — list/grid view toggle (wire `EntryGrid`) + row fidelity | `core/admin/ui/entries/EntryList.tsx`, `EntryTable.tsx`, `EntryGrid.tsx`, `EntryFilters.tsx` |
| 514-06 | Tests, docs, closure (changelog **1226**) | changelog + README rows (orchestrator), `_docs/DATA_MODEL.md` note |

## Coordination with TASK-487 (scopes distinct — DO NOT duplicate)

TASK-487 (all subtasks currently `⏳ To Do`) owns: revision backend + restore
(487-01), **admin revision drawer UI** (487-02-L02), entries-client revision
methods (487-02-L01), entry-create tags input (487-03-L01), and **full SEO-field
surfacing** title/canonicalUrl/robots (487-03-L02).

TASK-514 therefore:
- **Leaves a clean revisions seam, does NOT build the drawer.** 514-03 adds a
  "History" trigger affordance (a `History`-icon `Button` in the PageHeader
  actions + a `revisionsSlot?: ReactNode` prop / documented insertion point) that
  487-02-L02's `EntryRevisionDrawer` plugs into. No revision fetch/render in 514.
- **Does NOT add SEO title/canonicalUrl/robots inputs.** 514-04 restructures the
  SEO `SectionCard` layout and keeps ONLY the existing `description` field; the
  extra SEO inputs are 487-03-L02's job — 514 establishes the card they slot into.
- **Shared-file conflict flag:** `EntryMetadataPanel.tsx` (514-04 vs 487-03-L02 SEO,
  487-02-L02 drawer trigger), `EntryEditor.tsx` (514-03 vs 487-02-L02),
  `entriesClient.ts` (514-02 vs 487-02-L01), `entryService.ts`/`contentEntryRoutes.ts`
  (514-01 vs 487-01). See Land Order + openQuestions for the rebase decision.

## Sequential Land Order (strict)

1. **514-01** (backend: schema + migration + service + validation + routes)
2. **514-02** (admin client: visibility types round-trip) — needs 514-01 shapes
3. **514-04** (metadata panel: Publish/Visibility/Metadata cards) — needs 514-02 field
4. **514-03** (editor layout wires the panel + visibility + revisions seam) — needs 514-04
5. **514-05** (list view toggle + row fidelity) — needs 514-02 for the visibility badge
6. **514-06** (tests/docs/closure, changelog 1226)

## Validation (whole task)

- Bun lanes: entry route/integration suite (visibility PATCH round-trip 200 +
  reject-unknown 400 + password never echoed), migration up/down against the
  resettable local DB.
- Vitest (Bun-free): `contentSchemas` allowlist (visibility enum, reject unknown,
  `accessPassword` present-only), admin UI render/interaction for the redesigned
  editor + list toggle.
- Gates: root `tsc -p tsconfig.json --noEmit` (tests included — see the typecheck
  scope gotcha), `bun --cwd core lint:types`, `gates:coderso`.
- **Runtime smoke (mandatory, ≥5 real-flow scenarios, 514-06):** live admin
  `coderso-a.localhost:5173`, light + dark, 0 console errors — (1) edit entry:
  Content/Media/right-column layout matches prototype side-by-side; (2) set
  Visibility public→private→password (password field appears/persists, reload
  shows `hasPassword`); (3) Metadata card shows real Created/Updated/Author/Entry
  ID; (4) list list↔grid toggle renders both real views; (5) publish flow +
  checklist + taxonomy still work in the new layout. Screenshots to
  `_docs/_workflows/_smoke/`.

## Non-Goals / Deferred

- Revision drawer (TASK-487-02-L02) — seam only.
- SEO title/canonical/robots inputs (TASK-487-03-L02) — card only.
- Public-front enforcement of `private`/`password` visibility (open question).
- Entry-create drawer redesign / tags input (TASK-487-03-L01) — untouched here.
