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
- `core/admin/ui/entries/EntryEditorHeader.tsx` (94 lines — exports
  `EntryEditorHeader` + `EntryEditorHeaderActions`; **ORPHANED**: NOT imported or
  rendered by `EntryEditor.tsx` (grep `:1-53` confirms no import), referenced ONLY
  by two Vitest mocks — see the repurpose-vs-delete decision below).

**`EntryEditorHeader` repurpose-vs-delete decision (parent mandate, lines 299-314;
parent 277-292 is the 514-02 admin-client section, not this decision).**
Parent decision = **REPURPOSE** `EntryEditorHeader`/`EntryEditorHeaderActions` into
the in-page `PageHeader` actions cluster (move Save draft / Publish / History +
the status/Unsaved badges into it), rendered at the top of `EntryEditor` in place
of the inline sticky bar. Fallback if repurposing is heavier than an inline
`PageHeader`: **DELETE** `EntryEditorHeader.tsx`. **Either path MUST reconcile the
two orphaned Vitest mocks** — see Testing Requirements.

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
- **Dispose of the existing shell chrome to avoid duplication (single owner =
  in-page `PageHeader`, prototype-faithful).** The current `AdminShell` at
  `EntryEditor.tsx:699-712` passes BOTH:
  - `breadcrumbs={["Content", typeLabel, entry?.title ?? editorLabel]}` (`:703`)
  - `topbarActions={<status Badge + Unsaved Badge>}` (`:704-711`)
  When the trail + badges move onto the in-page `PageHeader` below, **REMOVE the
  `AdminShell breadcrumbs` prop AND the `topbarActions` prop entirely** — otherwise
  the screen renders a duplicate breadcrumb trail (shell + PageHeader) and duplicate
  status/Unsaved badges (top bar + PageHeader actions).
  - Rationale: the live prototype (`wf514audit-r2-proto-editor.png`) shows the
    trail `Entries › Article` in-page directly above the "Edit entry" title and the
    status/Unsaved-equivalent badges in the PageHeader actions row — the prototype
    top bar carries NO trail and NO badges. Carrying both on the in-page PageHeader
    is the faithful match.
  - **Accepted divergence from siblings (flag in closure):** `EntryList.tsx:501`
    and `ContentTypeEditor.tsx:455` keep the trail on the shell and pass a PageHeader
    with NO breadcrumbs (`EntryList:503`, `ContentTypeEditor:459`). 514-03 instead
    carries the trail in-page for prototype fidelity; this is intentional and must
    be the SOLE owner of the trail (shell prop removed). Do NOT keep both.
- Add `PageHeader` (from `@/ui/shared/PageHeader`) with:
  - `breadcrumbs={[{label:"Entries", href:"/entries"}, {label: typeLabel}]}`
    (admin `PageHeader` crumbs are `{ label: string; href?: string }`
    (`PageHeader.tsx:15`) routed via `AdminLink`, which prepends the admin base
    path — so route-relative `/entries` matches `activeHref="/admin/entries"`; do
    NOT use the prototype's `to:` prop — it is an excess property that fails root
    `tsc` and yields a non-linking crumb) (uses
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
- **Media `SectionCard` — decided rule (schema-driven): render the Media
  `SectionCard` ONLY when the schema has ≥1 media field (i.e. `tabGroups` produced a
  `"Media"` tab — `EntryEditor.tsx:655` maps `field.type === "media"` → `"Media"`).
  When no media field exists, OMIT the card entirely (no empty placeholder).**
  - **Accepted divergence from the prototype (flag in closure):** the prototype
    (`EntryEditorPreview.tsx:70-82`) ALWAYS renders a Media card with a *static*
    aspect-16/9 cover mock + "Upload cover" button. That is a mock affordance (same
    class as the prototype's mocked `ent_8f21a0` id that 514-04 replaces with the real
    UUID) — the real editor is schema-driven, so an always-on Media card would be
    empty/meaningless for content types with no media field. We therefore diverge:
    real media fields → Media card; no media field → no card. This is intentional and
    must be surfaced in the closure alongside the 514-04 metadata mock divergence.
  - When present, the Media card holds the media-tab fields via `FieldRenderer` (real
    upload widgets), NOT the prototype's static cover placeholder.
- Loading + empty states (`:826-833`) re-homed into the Content card.

### 3. Right column — mount redesigned panel (both mounts)

- Right grid cell mounts `<EntryMetadataPanel .../>` (514-04) directly (no fixed
  `w-96 aside`; the `320px` grid track sizes it). Keep the mobile `Sheet`
  (`:947-980`) mounting the SAME panel for small screens (hide the in-grid panel
  `lg:` and show the Sheet trigger below `lg`), mirroring the current dual-mount.
- **Internal ScrollArea reconciliation (resolves the 514-04 §4 contradiction).**
  The current desktop mount wraps the panel in `<aside className="… min-h-0 w-96
  … overflow-hidden lg:flex …">` (`EntryEditor.tsx:920`) whose bounded height lets
  the panel's internal `ScrollArea` scroll. Once the aside is removed and the panel
  flows in the unbounded `320px` grid track, an internal `ScrollArea` has NO bounded
  height → it collapses / breaks and is non-faithful. The live prototype
  (`wf514audit-r2-proto-editor.png`) shows the right column (Publish + Taxonomy
  cards) flowing WITH the page to the page bottom (page-level scroll, no inner
  scroller). Therefore:
  - **Desktop in-grid mount: the 320px column flows with the page — NO internal
    `ScrollArea` (and no bounded-height wrapper).** The panel renders as plain
    stacked `SectionCard`s in normal document flow.
  - **Mobile `Sheet` mount: keep the internal `ScrollArea`** (the Sheet gives it a
    bounded height, so scrolling is correct and needed there).
  - This is a 514-04-owned internal (this subtask only mounts the panel), so
    **514-04 §4 must be corrected**: its "the panel keeps its `ScrollArea` + footer
    for the desktop `aside` AND the mobile `Sheet`" is STALE — the desktop `aside`
    no longer exists; the `ScrollArea` must be scoped to the mobile `Sheet` mount
    ONLY, and the desktop in-grid mount flows with no inner scroller.
  - **⚠ LAND-ORDER INVERSION — this correction belongs UPSTREAM in 514-04, not in
    a 514-03 closure reconcile.** Parent Land Order (parent lines 415-420) lands
    **514-04 (step 3) BEFORE 514-03 (step 4)**. If 514-04 authors the
    ScrollArea-for-both-mounts internal as its contract currently reads
    (514-04 §4, lines 197-198), it will SHIP the wrong internal and 514-03 would only
    be flagging it after the fact. A post-hoc closure reconcile is therefore NOT
    sufficient. **Orchestrator action (before 514-04 lands):** edit 514-04 §4 to scope
    the `ScrollArea` (+ footer) to the mobile `Sheet` mount only and state the desktop
    mount renders plain stacked `SectionCard`s in normal document flow. 514-03 cannot
    edit 514-04 (single-writer discipline) — this flag exists to drive that upstream
    fix, with a closure reconcile as the backstop, not the primary mechanism.

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
- **Orphaned `EntryEditorHeader` mock reconcile (MANDATORY — parent lines 299-314).**
  `EntryEditorHeader` is referenced by two `vi.mock` blocks:
  `tests/vitest/ui/entry-editor-shell-wave.test.tsx:365` (mocked props
  `{ entryLabel, status }`) and `tests/vitest/ui/post-classic-editor-shell-wave.test.tsx:293`
  (mocked props `{ status, hasUnsavedChanges, contentType, entryLabel }`).
  - If **REPURPOSED** (default): update BOTH `vi.mock` blocks — the import path (if
    it changes) and the mocked prop surface — to track the new
    `EntryEditorHeader`/`EntryEditorHeaderActions` signature actually rendered by
    `EntryEditor`, and adjust any assertions reading the mock's rendered output.
  - If **DELETED**: remove BOTH `vi.mock` blocks and every assertion that depends on
    them (a `vi.mock` of a non-existent module resolves to nothing / breaks Vitest).
  - Note this cross-file test impact in the 514-03 closure (these two test files are
    NOT in this subtask's owned-files list, so surface the reconcile explicitly).

### SMOKE

Editor fidelity + visibility + metadata card are ≥3 of the 514-06 scenarios.

---

## Deferred

Revision drawer (TASK-487-02-L02). SEO extra fields (TASK-487-03-L02). Front-end
visibility enforcement (parent open question).
