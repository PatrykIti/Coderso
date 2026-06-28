# TASK-479-12-L02: Content Type Editor Restyle
# FileName: TASK-479-12-L02-Content-Type-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Restyle the content type editor to the prototype's editor preview: a tabbed
layout (**Fields / Relations / Settings**), a `SectionCard` wrapping the
draggable, clickable fields list with type badges, and a right-hand **type
settings** inspector. Every schema operation, dirty-state guard, taxonomy toggle,
and save/publish/duplicate/delete action is preserved — only chrome changes.
(The prototype's "Permissions" tab is dropped: the content-type DTO exposes no
per-type RBAC data, so there is nothing real to surface — see Out of scope.)

- **Goal:** Apply the soft/violet card + line-variant tab look to the content type
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
  In core, `SectionCard` and the extended `PageHeader` come from TASK-479-06-L02;
  the real Tabs primitive is `core/admin/components/ui/tabs.tsx`
  (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, Radix-based — there is **no**
  `items` prop and the underline style is `<TabsList variant="line">`, not
  `variant="underline"`). Soft tokens/variants come from TASK-479-05.
- **Out of scope:** No change to schema validation
  (`validateFieldsForSave`/`validateFieldName`), the field model, the
  `updateContentType` payload, or `EditorShell` left/right panel contracts. The
  "Relations" tab surfaces EXISTING data only (fields of type `relation`) — no new
  endpoints. There is **no per-content-type RBAC data** on the content-type DTO,
  so no "Permissions" tab is added (re-add only when a real permissions surface
  exists; do not fabricate one).

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

Port from prototype `ContentTypeEditorPreview.tsx` (line-variant Tabs +
`SectionCard` wrapping the real `FieldsListPanel`/`FieldSettingsPanel` + type
Badges).

```tsx
// ContentTypeEditor.tsx — render layer.
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // real Radix Tabs (no `items` prop)
type EditorTab = "fields" | "relations" | "settings";
const [tab, setTab] = useState<EditorTab>("fields"); // local UI state, lazy init, no effect

// The field LIST is owned by ONE component — `FieldsListPanel` — rendered as the
// EditorShell `leftPanel` on desktop and as a `lg:hidden` inline copy on mobile
// (the existing responsive pattern). The Fields tab does NOT render a second full
// list of `fields` rows, or the list renders twice. `FieldSettingsPanel` is the
// inspector. Both are the REAL panels (no reimplementation), wrapped in SectionCard.

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

      {/* Real Tabs API: <Tabs> controls trigger state; content is rendered below by `tab`.
          Counts are inline children, not an `items` prop. Underline look = variant="line". */}
      <div className="px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as EditorTab)}>
          <TabsList variant="line">
            <TabsTrigger value="fields">Fields <Badge variant="soft" className="ml-1.5">{fields.length}</Badge></TabsTrigger>
            <TabsTrigger value="relations">Relations <Badge variant="soft" className="ml-1.5">{fields.filter(f => f.type === "relation").length}</Badge></TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        {tab === "fields" && (
          <SectionCard title="Fields" description="Drag to reorder. Click a field to edit it."
            action={<Button variant="soft" size="sm" className="gap-1.5" onClick={handleAddField}><Plus className="size-4" /> Add field</Button>}>
            {/* inline list = mobile only (lg:hidden); on desktop the list lives in EditorShell leftPanel */}
            <FieldsListPanel className="lg:hidden" fields={fields} selectedId={activeSelectedFieldId}
              onSelect={setSelectedFieldId} onAdd={handleAddField} />
            <FieldSettingsPanel field={selectedField} nameError={nameError} defaultError={defaultError}
              relationError={relationError} relationTargets={relationTargets}
              existingNames={fields.map(f => ({ id: f.id, name: f.name }))}
              onChange={(next) => handleFieldChange(fields.map(f => f.id === next.id ? next : f))}
              onRemove={requestFieldRemoval} className="h-fit" />
          </SectionCard>
        )}
        {tab === "settings" && (/* Name/Slug Inputs (setUnsavedChanges(true) on change) + Taxonomies Switch card, restyled */)}
        {tab === "relations" && (/* read-only relation summary derived from existing `fields` of type "relation" */)}
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

**Regression-test shape (see L05):** an SSR `renderAdminUi` render asserts the
always-visible chrome: the three tab triggers (Fields / Relations / Settings) with
the Fields/Relations counts, the active Fields-tab `SectionCard` ("Add field"),
the `FieldsListPanel` field rows with their type labels (the editor seeds
`defaultFields`, so rows render without cache seeding), the sticky actions (Save
draft / Publish / Duplicate / Delete / Collection workspace), and the
unsaved-changes Alert markers. Do NOT assert the Settings or Relations tab
**bodies** under SSR — they are inactive when Fields is the default tab; cover
tab-switch content with an interactive happy-dom + `createRoot`/`act` test (or
rely on the existing `content-type-editor.test.tsx` behavioral assertions).

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
