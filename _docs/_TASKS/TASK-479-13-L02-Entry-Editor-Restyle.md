# TASK-479-13-L02: Entry Editor Restyle
# FileName: TASK-479-13-L02-Entry-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-13-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-13
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the **functional** Entry editor to the prototype look: a calm two-column
layout — a content card on a warm canvas (Title / Slug / schema-driven field cards)
plus a soft right-hand sidebar holding Publish, Taxonomy, and Metadata sections.
This is a real, working editor — NOT the non-functional preview — so the
schema-driven field rendering, taxonomy/SEO/checklist wiring, publish/preview/delete
flows, and dirty-state protection are preserved exactly; only chrome, canvas, and
sidebar styling change.

- **Goal:** `core/admin/ui/entries/EntryEditor.tsx` and the metadata sidebar
  `core/admin/ui/entries/EntryMetadataPanel.tsx` (+ the per-field `Card` shells and
  `FieldRenderer.tsx`) read like
  `_docs/_PROTOTYPE/src/pages/advanced/EntryEditorPreview.tsx` — same warm tokens,
  `rounded-2xl` `SectionCard`s, soft Publish/Taxonomy/Metadata sidebar — without
  losing any behavior.
- **Owning module/service:** `core/admin/ui/entries/EntryEditor.tsx`,
  `core/admin/ui/entries/EntryMetadataPanel.tsx`,
  `core/admin/ui/entries/FieldRenderer.tsx` (field card chrome only). Shared
  primitives (`SectionCard`/`Card`/`Input`/`Select`/`Badge`/`Button`) restyled
  centrally in TASK-479-06.
- **Source-of-truth docs:** prototype editor
  `_docs/_PROTOTYPE/src/pages/advanced/EntryEditorPreview.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard}.tsx`; prototype
  UI `_docs/_PROTOTYPE/src/components/ui/{card,input,select,label,badge,button,separator}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No change to `entriesClient`/`contentTypesClient`/
  `taxonomyClient`/`siteSettingsClient`, the content-type schema model
  (`fieldsFromSchema`/`buildSchemaFromFields`), `buildEntryChecklist`, the
  `tabGroups` derivation, the autosave-adjacent `updateEntry`/`updateEntryMetadata`/
  `publishEntry`/`previewEntry`/`deleteEntry` calls, the dirty-state refs/guards, the
  `cacheKeys.entryDetail` subscription, the `beforeunload` guard, or RBAC. No new
  editor capabilities. The list screen restyle is L01. Tokens/shell land in
  TASK-479-05/06 and are consumed here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

The editor is wired through `AdminShell` (`activeHref="/admin/entries"`,
`showSearch={false}`, `contentClassName="p-0 overflow-hidden"`, breadcrumbs +
`topbarActions` status/unsaved Badges) and a two-pane flex: a scrollable content
column (sticky toolbar + Title/Slug + schema `Tabs`/field `Card`s) and a fixed right
`aside` rendering `EntryMetadataPanel` (also mirrored into a mobile `Sheet`). Keep
that structure and every binding; restyle the surfaces. Do NOT alter the
`resolveEntryParams` lazy init, the `applyEntry`/`refreshEntry` flow, the
`remoteUpdatePending` dirty-guard, the `tabGroups` `useMemo`, or the title-textarea
auto-grow effect.

```tsx
// 1) Header / sticky toolbar (content column top bar) — port the prototype
//    PageHeader chrome: keep breadcrumbs via AdminShell, keep the REAL
//    Runtime preview / Save draft / Publish buttons + handlers (handlePreview,
//    handleSaveDraft, handlePublish) and the status/"Unsaved changes" Badges in
//    AdminShell topbarActions. Restyle to: outline "Runtime preview", secondary/
//    ghost "Save draft", primary(violet) "Publish/Update". The mobile "Details"
//    button (setDetailsOpen) keeps its handler; restyle to soft outline. No handler
//    edits, no remount.

// 2) Two-column layout — keep the existing flex (content column + right aside).
//    Mirror the prototype grid feel: warm canvas behind the content column
//    (bg-muted/30 -> warm token), white rounded-2xl content surfaces. Keep the
//    `max-w-4xl` centered content rhythm; the right aside stays `lg:flex` desktop /
//    `Sheet` on mobile (do NOT change the responsive split).

// 3) Title + Slug block — keep the auto-grow Textarea (titleRef + height effect),
//    handleTitleChange, and the slug Input + handleSlugChange + handleGenerateSlug
//    (RefreshCcw). Restyle to the prototype "Content" SectionCard look: Label above
//    each control, font-display title, mono slug input inside a soft
//    rounded-xl border bg-muted/30 row. Bindings (value/onChange) UNCHANGED so the
//    dirty flag still flips via setUnsavedChanges(true).

// 4) Schema field cards — keep `tabGroups` Tabs (TabsList variant="line") and the
//    per-field <Card> + <FieldRenderer> render exactly. Restyle each field Card to
//    the soft prototype SectionCard (rounded-2xl border bg-card shadow-card, xs
//    Label/help, Required Badge). PRESERVE the missing-required tinting
//    (border-destructive/40 bg-destructive/5) and the compact (`border-dashed`)
//    variant — they are behavioral signals, not decoration. FieldRenderer's control
//    internals stay wired to handleFieldChange(field.name, value).

// 5) Right sidebar — EntryMetadataPanel.tsx — restyle to the prototype Publish /
//    Taxonomy / Metadata SectionCards:
//      - "Publish": status Select (handleStatusChange), schedule row + date
//        (handleScheduledAtChange), Separator, Save metadata + Delete buttons
//        (onSave=handleSaveMetadata isSaving, onDelete=setDeleteDialogOpen).
//      - "Taxonomy": category Select + tags Badges + add (onCategoryChange,
//        onTagIdsChange, onCreateCategory/onCreateTag) — keep the create-term flow
//        and the taxonomySettingsHref AdminLink.
//      - "Metadata": author + the SEO/checklist surfaces. Keep buildEntryChecklist
//        output (blocking issues / missing required) rendered; restyle to soft
//        rounded-xl border bg-muted/30 cards. The SEO description textarea stays
//        bound to seoDescription/handleSeoDescriptionChange.
//    EVERY prop EntryEditor passes into EntryMetadataPanel stays identical; only
//    classNames inside the panel change. The SAME restyled panel renders in both the
//    desktop aside and the mobile Sheet — restyle once, reused twice.

// 6) Alerts — the three inline Alerts (load error "Unable to load entry",
//    "Updated in another tab" remoteUpdatePending refresh prompt, "Unsaved changes")
//    keep copy + conditions; restyle to the soft token cards. The
//    remoteUpdatePending Refresh button keeps refreshEntry({ allowUnsaved: true }).
```

**Data flow:** `resolveEntryParams(pathname)` lazy init → `getEntryCached` +
`listContentTypesCached` hydrate → `applyEntry` maps schema → `fields`/`values`/
`status`/taxonomy → Title/Slug + `tabGroups` field cards + `EntryMetadataPanel`
controls read/write local state → `updateEntry`/`updateEntryMetadata`/`publishEntry`
persist. The restyle touches only JSX/classNames in these render trees; no client,
schema, or handler logic changes.

**Dirty-state / guard (preserve):** Do not change when the editor marks dirty
(`setUnsavedChanges` / `setMetadataUnsavedChanges` and their refs), the
`beforeunload` guard (`hasAnyUnsavedChanges`), or the `remoteUpdatePending`
cache-event guard that refuses to overwrite unsaved local edits. The restyle must NOT
remount the content column or the field cards (no `key` churn) and must NOT reset
controlled inputs — keep the same component identities so React preserves editor
state and the dirty flags. The title-textarea auto-grow effect stays as-is.

**Navigation/href constraint (preserve):** Breadcrumbs (AdminShell), the
`taxonomySettingsHref` link, and the post-delete `navigate("/entries")` keep routing
through `AdminShell`/`AdminLink`/`adminPaths`. Do not hand-build hrefs while
restyling.

**React-hooks rules:** No new sync `setState` in effects. Reuse the existing
`detailsOpen` state for the mobile Sheet; do not add a second open-state source.
Derive any presentational flags at render. Respect the existing effect shapes
(hydrate, cacheBus subscribe, siteSettings load, title auto-grow) — do not duplicate
them.

**Error handling:** Editor error/empty/loading states ("Unable to load entry",
"Loading entry fields...", "This content type has no fields yet.") keep their current
copy and conditions; they inherit the new card/token styling. The
`RuntimePreviewDialog` and `EntryDeleteDialog` keep their props/flows. No new error
surfaces.

**Regression-test shape:** see L03 — render `EntryEditor` with a seeded cached entry
+ content type; assert the content column carries the rounded-2xl/card classes, the
Title/Slug inputs are bound (typing flips the unsaved Badge), at least one
schema-driven field Card renders via FieldRenderer, the right sidebar renders the
Publish status Select (still bound to handleStatusChange) + Save metadata/Delete,
and the header exposes Runtime preview / Save draft / Publish — a behavioral guard
that the restyle did not sever the store/handler wiring.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/entry-editor-restyle.test.tsx`
  (new suite in L03)
- The existing editor suites MUST stay green — at minimum re-run:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/content-entry-editor.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-metadata.test.tsx tests/vitest/ui/entry-field-relation.test.tsx tests/vitest/contentUi/entryEditor.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-13-L02`.
- If the `EntryMetadataPanel` section/`SectionCard` restyle introduces a shared
  inspector pattern, record it alongside the TASK-479-06 shell notes so the Post
  editor inspector (TASK-479-09-L02) and custom-screen editors stay consistent.
