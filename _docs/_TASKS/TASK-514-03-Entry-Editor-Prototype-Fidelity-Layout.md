# TASK-514-03: Entry Editor — Prototype-Fidelity Layout (PageHeader + SectionCard Grid + Visibility Wiring + Revisions Seam)

# FileName: TASK-514-03-Entry-Editor-Prototype-Fidelity-Layout.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Admin UI / Entries
**Estimated Effort:** Large
**Dependencies:** TASK-514-04 (panel props: visibility/password/created/updated/entryId), TASK-514-02 (client fields)
**Status:** ⏳ To Do

---

## Overview

The main redesign. Bring the entry editor to prototype fidelity, mirroring the
**Engine** content-type editor's redesigned pattern (in-page `PageHeader` +
`SectionCard` grid + right settings column) adapted to entries. Move away from the
current `AdminShell` full-height flex + fixed `w-96` aside + per-field `Card`
shape toward: `AdminShell` (normal content) → `PageHeader` (breadcrumbs `Entries
› <Type>`, title "Edit <type>", description, right actions) → the existing
error/unsaved/remote alerts → a `grid gap-6 lg:grid-cols-[1fr_320px]` with the
left column of `SectionCard`s (Content, Media, plus the schema-driven field
tabs/sections re-homed into cards) and the right column mounting the redesigned
`EntryMetadataPanel` (514-04). Wire the Visibility control end-to-end and leave a
clean **revisions seam** for TASK-487-02-L02.

**Owned files (sole writer):**
- `core/admin/ui/entries/EntryEditor.tsx` (1005 lines — reads as binary to rg;
  use `Read`/`grep -an`).
- `core/admin/ui/entries/EntryEditorHeader.tsx` (94 lines — currently unused-ish;
  may become the PageHeader actions cluster).

**Do NOT** edit `EntryMetadataPanel.tsx` (514-04 owns its internals — this subtask
only passes props), the client (514-02), `FieldRenderer.tsx`, or the list.
**Shared-file flag:** TASK-487-02-L02 (revision drawer trigger + drawer mount)
also edits `EntryEditor.tsx` — this subtask provides the trigger button + a
documented mount point but does NOT build the drawer. Coordinate land order.

Preserve ALL current behavior: load/refresh with cache-bus subscribe, unsaved/
metadata-unsaved tracking + beforeunload guard, Save draft / Publish / status
transition, runtime preview dialog, delete dialog, taxonomy load + term create,
tab grouping of schema fields, remote-update-pending banner. This is a
layout/structure re-home + additive control, NOT a rewrite of the data flow.

---

## Execution-Ready Plan

Verified anchors in `EntryEditor.tsx`: state block (`:120-161`), `applyEntry`
(`:166-187`), metadata save (`:529-586`) — note it builds the
`updateEntryMetadata` payload (`:564-569`); tab grouping (`:651-696`); render:
`AdminShell` (`:698-712`), left canvas + sticky bar (`:713-762`), scroll body +
title/slug card (`:763-824`), field tabs (`:834-916`), desktop `aside`
(`:920-945`), mobile `Sheet` (`:947-980`), delete + preview dialogs (`:981-1002`).

### 1. Chrome → in-page PageHeader (mirror ContentTypeEditor `:459`)

- Keep `AdminShell activeHref="/admin/entries"` but drop the full-height
  `flex h-full min-h-0` + `contentClassName="p-0 overflow-hidden"` workspace
  shape; use the normal content container like `EntryList` (`max-w-6xl`,
  `flex flex-col gap-6`).
- Add `PageHeader` (from `@/ui/shared/PageHeader`) with:
  - `breadcrumbs={[{label:"Entries", to:"/entries"}, {label: typeLabel}]}` (uses
    the existing `typeLabel`/`typeSingular` from `getContentTypeLabels` `:631-635`),
  - `title={editorLabel}` (already computed, `:635`), `description="Compose and
    publish an entry in this content type."`,
  - `actions`: a status `Badge` + `Unsaved` badge (existing `:706-710`) + a
    **History** `Button variant="ghost"` (revisions seam, see §5) + `Save draft`
    + `Publish/Update` + `Runtime preview` + a `Duplicate`? (keep the current
    action set: Runtime preview, Save draft, Publish — do not silently drop).
- The current sticky action bar (`:715-762`) is REPLACED by these PageHeader
  actions; keep the mobile "Details" trigger (`:750-760`) that opens the `Sheet`.

### 2. Left column — SectionCard grid (replace per-field `Card`s)

- Wrap the whole editor body in `div className="grid gap-6 lg:grid-cols-[1fr_320px]"`.
- **Content `SectionCard`** (title "Content", description "The main body of this
  entry.") containing the title `Textarea` (auto-grow, `:795-802`) + slug row
  (`:803-823`) + the schema-driven fields. The current per-field `Card` wrapping
  (`:867-907`) becomes fields grouped inside the Content card (and Media/Relations
  cards) — keep the `tabGroups` grouping (`:651-696`) but render each TAB as a
  section within the appropriate `SectionCard` (Content tab → Content card; a
  `Media` tab → a **Media `SectionCard`**; `Relations` tab → a Relations
  `SectionCard`). If a content type has no explicit tabs, everything lands in the
  Content card. Keep `FieldRenderer` per field, required-badge, missing-required
  highlight (`:859-905`).
- **Media `SectionCard`** — if the schema has media fields (or always, matching the
  prototype's cover-image card), render them here; otherwise omit gracefully.
- Loading + empty states (`:826-833`) re-homed into the Content card.

### 3. Right column — mount redesigned panel (both mounts)

- Right grid cell mounts `<EntryMetadataPanel .../>` (514-04) directly (no fixed
  `w-96 aside`; the `320px` grid track sizes it). Keep the mobile `Sheet`
  (`:947-980`) mounting the SAME panel for small screens (hide the in-grid panel
  `lg:` and show the Sheet trigger below `lg`), mirroring the current dual-mount.

### 4. Visibility wiring (end-to-end)

- New state: `const [visibility, setVisibility] = useState<"public"|"private"|"password">("public")`,
  `const [accessPassword, setAccessPassword] = useState("")`, and read
  `hasPassword` from `entry`.
- In `applyEntry` (`:166-187`) set `visibility` from `entryResult.visibility` and
  reset `accessPassword` to `""`.
- `onVisibilityChange`/`onAccessPasswordChange` set state + `setMetadataUnsavedChanges(true)`
  (mirror `handleStatusChange` `:463-467`). When switching AWAY from `password`,
  clear `accessPassword` to `""`.
- In `handleSaveMetadata` (`:564-569`) extend the `updateEntryMetadata` payload:
  ```ts
  visibility,
  accessPassword: visibility === "password" ? (accessPassword || undefined) : null,
  ```
  (undefined = keep existing hash; null = clear.) After save, re-read
  `visibility`/`hasPassword` from the returned `updated` and reset `accessPassword`.
- Pass `visibility`, `onVisibilityChange`, `accessPassword`, `onAccessPasswordChange`,
  `hasPassword`, `createdAt: entry?.createdAt`, `updatedAt: entry?.updatedAt`,
  `entryId: entry?.id` into BOTH `EntryMetadataPanel` mounts.

### 5. Revisions seam (documented, NOT implemented)

- Add a **History** `Button` (icon `History` from lucide) in the PageHeader
  actions that is a documented insertion point: on click it should open the
  revisions drawer that TASK-487-02-L02 builds. In THIS task, either disable it
  with a `title="Revision history (coming soon)"` OR wire it to a `revisionsSlot`
  no-op; add a clear `// TASK-487-02-L02 mount point` comment where the
  `EntryRevisionDrawer` will mount (a `Sheet` sibling of the delete dialog).
- Do NOT import revision client methods or render revision data.

### 6. Preserve data flow

Keep: initial load effect (`:250-282`), cache-bus subscribe (`:284-314`),
site-settings load (`:316-326`), beforeunload guard (`:330-338`), all
handlers (title/slug/field/preview/save/publish/status/schedule/seo/category/tag/
generate-slug/create-term/delete), `buildPayloadData` (`:386-402`), checklist
(`:642-649`), preview dialog + delete dialog. The visibility additions are the
only NEW state; everything else is re-homed, not rewritten.

---

## Acceptance Criteria

1. Editor renders as: in-page `PageHeader` (breadcrumbs + title + description +
   actions) → alerts → `grid [1fr_320px]` with Content (+ Media/Relations)
   `SectionCard`s left and the metadata panel right — side-by-side match to
   `wf514-proto-editor.png`.
2. Title/slug + all schema fields edit exactly as before (FieldRenderer, required
   badges, missing-required highlight, tabs grouping preserved inside cards).
3. Visibility: change public→private→password in the panel → password input
   appears → Save metadata persists → reload shows the saved visibility +
   `hasPassword`; switching away clears the password field.
4. Metadata card shows real Created/Updated/Author/Entry ID.
5. Runtime preview, Save draft, Publish/Update, status transition, taxonomy,
   checklist, duplicate/delete, unsaved + remote-update banners, mobile Sheet all
   still work.
6. History button present as a seam (no drawer built); no revision imports.
7. Light + dark, 0 console errors.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free (admin UI)

- Editor renders PageHeader + Content SectionCard + right panel; title/slug edit
  marks unsaved.
- Visibility state: selecting password sets state + marks metadata-unsaved;
  `handleSaveMetadata` payload includes `visibility` + correct `accessPassword`
  (undefined keep / null clear) — assert via mocked `updateEntryMetadata`.
- Regression: publish blocked by checklist blocking issues; runtime preview opens;
  delete dialog confirm calls `deleteEntry`.

### SMOKE

Editor fidelity + visibility + metadata card are ≥3 of the 514-06 scenarios.

---

## Deferred

Revision drawer (TASK-487-02-L02). SEO extra fields (TASK-487-03-L02). Front-end
visibility enforcement (parent open question).
