# TASK-479-12-L02: Content Type Editor Restyle
# FileName: TASK-479-12-L02-Content-Type-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Restyle the content type editor to the prototype's editor preview: a tabbed
layout (**Fields / Relations / Settings / Permissions**), a `SectionCard` of
draggable, clickable fields with type badges, and a right-hand **type settings**
card. Every schema operation, dirty-state guard, taxonomy toggle, and
save/publish/duplicate/delete action is preserved — only chrome changes.

- **Goal:** Apply the soft/violet card + underline-tab look to the content type
  editor while keeping `fields` state, `hasUnsavedChanges`/`hasUnsavedChangesRef`
  protection, the field add/remove/undo flow, taxonomy toggles, and all
  save/publish/duplicate/delete server calls intact.
- **Owning module/service:** `core/admin/ui/content-types/ContentTypeEditor.tsx`
  (with its panels `SchemaBuilder.tsx` → `FieldsListPanel`/`FieldSettingsPanel`,
  `ContentTypePreviewPanel.tsx`), backed by
  `core/admin/services/contentTypesClient.ts` and
  `core/admin/services/taxonomyClient.ts`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/pages/advanced/ContentTypeEditorPreview.tsx` plus
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,SectionCard}.tsx` and
  `_docs/_PROTOTYPE/src/components/ui/{tabs,card,badge,input,switch,button}.tsx`.
- **Out of scope:** No change to schema validation
  (`validateFieldsForSave`/`validateFieldName`), the field model, the
  `updateContentType` payload, or `EditorShell` left/right panel contracts. The
  "Relations/Permissions" tabs surface EXISTING data only — no new endpoints.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target file: `core/admin/ui/content-types/ContentTypeEditor.tsx`. Keep ALL state,
`applyContentType`/`refreshContentType`, the three effects (load,
`subscribeCacheEvents(cacheKeys.contentTypeDetail)`, relation targets),
`setUnsavedChanges`, `handleSave`/`handlePublish`/`handleDuplicate`/`handleDelete`,
`handleAddField`/`requestFieldRemoval`/`confirmFieldRemoval`/`undoFieldRemoval`,
and `handleTaxonomyToggle`. Replace only JSX.

Port from prototype `ContentTypeEditorPreview.tsx` (Tabs `underline` +
`SectionCard` fields list + right settings `Card`).

```tsx
// ContentTypeEditor.tsx — render layer.
type EditorTab = "fields" | "relations" | "settings" | "permissions";
const [tab, setTab] = useState<EditorTab>("fields"); // local UI state, lazy init, no effect

// Fields tab body reuses the REAL panels (no reimplementation):
//   <FieldsListPanel … />  drives selection; <FieldSettingsPanel … /> is the inspector.
// Wrap them in the prototype's SectionCard chrome + type Badges.

return (
  <EditorShell
    activeHref="/admin/content-types"
    leftPanel={<FieldsListPanel fields={fields} selectedId={activeSelectedFieldId} onSelect={setSelectedFieldId} onAdd={handleAddField} />}
    rightPanel={previewHidden ? null : <div className="flex h-full min-h-0 flex-col overflow-hidden p-6"><ContentTypePreviewPanel name={name} slug={slug} fields={fields} /></div>}
    rightPanelClassName="p-0"
    breadcrumbs={["Content", "Content Types"]}
  >
    <>
      <div className="border-b px-6 py-6">
        <PageHeader title="Content Type Editor" description="…" actions={<Badge variant="soft">{status}</Badge>} />
        {/* keep error / remoteUpdatePending / hasUnsavedChanges / lastRemovedField Alerts verbatim */}
      </div>

      {/* sticky action bar: keep Hide preview + Collection workspace + Duplicate + Save draft + Publish + Delete,
          restyled (rounded-2xl, soft). Collection workspace nav uses navigate(...) as today. */}

      <div className="px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as EditorTab)} variant="underline"
          items={[
            { value: "fields", label: "Fields", count: fields.length },
            { value: "relations", label: "Relations", count: fields.filter(f => f.type === "relation").length },
            { value: "settings", label: "Settings" },
            { value: "permissions", label: "Permissions" },
          ]} />
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        {tab === "fields" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <SectionCard title="Fields" description="Drag to reorder. Click a field to edit it."
              action={<Button variant="soft" size="sm" className="gap-1.5" onClick={handleAddField}><Plus className="size-4" /> Add field</Button>} padded={false}>
              {/* render `fields` rows: GripVertical + name + <Badge variant="soft">{typeLabel}</Badge> + actions;
                  selecting a row sets selectedFieldId. Keep FieldSettingsPanel as the inspector below/right. */}
            </SectionCard>
            <FieldSettingsPanel field={selectedField} nameError={nameError} defaultError={defaultError}
              relationError={relationError} relationTargets={relationTargets}
              existingNames={fields.map(f => ({ id: f.id, name: f.name }))}
              onChange={(next) => handleFieldChange(fields.map(f => f.id === next.id ? next : f))}
              onRemove={requestFieldRemoval} className="h-fit" />
          </div>
        )}
        {tab === "settings" && (/* Name/Slug Inputs (setUnsavedChanges(true) on change) + Taxonomies Switch card, restyled */)}
        {tab === "relations" && (/* read-only relation summary derived from existing `fields` of type "relation" */)}
        {tab === "permissions" && (/* surface existing RBAC summary only — no new gating logic */)}
        {/* keep Danger Zone Card (Delete type) */}
      </div>
    </>
    {/* keep the detailsOpen + previewSheetOpen Sheets and both ConfirmActionDialogs verbatim */}
  </EditorShell>
);
```

**Data flow:** cached type lazy-init → `getContentTypeCached({force})` on mount →
`applyContentType` → `fields`/`name`/`slug`/`status`. Tab switching is local UI
state only. Every edit routes through `handleFieldChange`/`setUnsavedChanges` so
the dirty guard and `remoteUpdatePending` flow are unchanged.

**Error handling:** keep `validateFieldsForSave` before save; keep the
destructive `ConfirmActionDialog`s for type delete and field removal; keep the
`lastRemovedField` undo Alert; keep taxonomy optimistic-toggle rollback in
`handleTaxonomyToggle`. Do not introduce sync `setState` in any effect (ESLint 9
react-hooks).

**Routing:** "Collection workspace" keeps `navigate('/advanced/engine/:id/collection')`;
no new hand-built `<a>`. If any tab adds a link, use `AdminLink` +
`resolveAdminRoutePath`.

**Regression-test shape (see L05):** SSR render asserts the four tab labels with
counts, the Fields `SectionCard` ("Add field"), the field rows with type badges,
the settings tab Name/Slug inputs + Taxonomies switches, and that the sticky
actions (Save draft / Publish / Duplicate / Delete / Collection workspace) and
the unsaved-changes Alert markers are present.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-content-type-editor-restyle.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-preview-panel.test.tsx`

`tests/vitest/ui/content-type-editor.test.tsx` asserts several literal class
strings (e.g. `sticky top-0 z-10 border-b bg-background/80 …`); update those that
the restyle intentionally changes and keep the behavioral assertions (Save draft,
Publish, Collection workspace, Duplicate, Delete). State in the summary if any
suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-12-L02`.
- `_docs/CONTENT_TYPES_SPEC.md` — note the tabbed editor layout if the spec
  documents the editor UX (no data/API change).
