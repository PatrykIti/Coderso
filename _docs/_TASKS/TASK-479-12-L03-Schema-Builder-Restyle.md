# TASK-479-12-L03: Schema Builder Restyle
# FileName: TASK-479-12-L03-Schema-Builder-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Restyle the schema builder to the prototype's floating-panel canvas: a left
**field-type palette** rail, a center **canvas of field nodes** connected
vertically with an "Add field" affordance, and a right **field inspector**
(validation/settings). The real schema model, field cards, content-type sidebar
navigation, and live JSON preview are preserved — only the layout/chrome changes.

- **Goal:** Move `SchemaBuilderPage.tsx` from the current sidebar + stacked
  `FieldCard` list to the prototype's three-zone editor frame (rail / canvas /
  inspector) using the soft/violet language, without changing how fields map to
  the schema or how the preview is computed.
- **Owning module/service:** `core/admin/ui/content-types/SchemaBuilderPage.tsx`
  (with `FieldCard.tsx`, `ContentTypeSidebar.tsx`, `SchemaPreviewPanel.tsx`,
  `schemaMapping.ts`), backed by `core/admin/services/contentTypesClient.ts`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/pages/advanced/SchemaBuilderPreview.tsx` plus
  `_docs/_PROTOTYPE/src/components/patterns/EditorPreviewFrame.tsx`
  (`EditorPreviewFrame`, `EditorRailGroup`, `EditorRailItem`) and
  `_docs/_PROTOTYPE/src/components/ui/{card,badge,input,select,switch,button}.tsx`.
- **Out of scope:** No change to `buildSchemaFromFields`/`fieldsFromSchema`, the
  `ContentSchema` shape, the `SplitShell` right-panel preview contract, or the
  content-type list/detail load flow. The current page keeps "Save schema"
  disabled (preview-grade write) — do NOT wire a new save endpoint here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target file: `core/admin/ui/content-types/SchemaBuilderPage.tsx`. Keep `typeId`
resolution (`resolveContentTypeIdFromPath`), the cached-list/detail effects,
`fields`/`schema`/`list` state, `buildSchemaFromFields`, and the
`ContentTypeSidebar` `navigate('/content-types/:id/schema')` wiring. Replace JSX.

Port from prototype `SchemaBuilderPreview.tsx` (EditorPreviewFrame: left rail =
field types, canvas = `FieldNode` chain, right = field inspector).

```tsx
// SchemaBuilderPage.tsx — render layer over the SAME fields/schema state.
const [selectedFieldId, setSelectedFieldId] = useState<string | null>(() => fields[0]?.id ?? null);
const selectedField = fields.find(f => f.id === selectedFieldId) ?? fields[0] ?? null;

const FIELD_TYPES = [ // palette mirrors typeLabel()/iconForType() already in this file
  { type: "text", label: "Text", icon: <Type /> }, { type: "number", label: "Number", icon: <Hash /> },
  { type: "boolean", label: "Boolean", icon: <Binary /> }, { type: "date", label: "Date", icon: <CalendarDays /> },
  { type: "richtext", label: "Rich text", icon: <WholeWord /> }, { type: "media", label: "Media", icon: <ImageIcon /> },
  { type: "relation", label: "Relation", icon: <GitBranch /> }, { type: "select", label: "Select", icon: <ListChecks /> },
];

return (
  <SplitShell activeHref="/admin/content-types" rightPanel={<SchemaPreviewPanel schema={schema} />}
    breadcrumbs={["Content", "Schema Builder", contentType?.name ?? "Content Type"]}
    topbarActions={/* keep Discard + (disabled) Save schema */}>
    <div className="flex flex-col gap-6">
      <PageHeader title={contentType?.name ?? "Schema Builder"} description="Compose your content model visually." actions={…} />
      {/* keep error Alert */}
      <EditorPreviewFrame
        title="Schema builder"
        toolbar={<Badge variant="outline">{fields.length} fields</Badge>}
        device={false}
        left={<EditorRailGroup label="Field types">
          {FIELD_TYPES.map(ft => <EditorRailItem key={ft.type} icon={ft.icon}>{ft.label}</EditorRailItem>)}
        </EditorRailGroup>}
        canvas={<div className="mx-auto flex max-w-xl flex-col items-stretch gap-3">
          {fields.map((field, i) => <FieldNode key={field.id}
            icon={iconForType(field.type)} name={field.label}
            type={`${typeLabel(field.type)}${field.required ? " · required" : ""}`}
            selected={field.id === selectedField?.id}
            onSelect={() => setSelectedFieldId(field.id)} />)}
          {/* keep the disabled "Add new field" affordance until a real schema-save is wired (out of scope) */}
        </div>}
        right={<FieldInspector field={selectedField} />}  // ports InspectorRow/ToggleRow markup, bound to selectedField (read-only/preview parity with current page)
      />
    </div>
  </SplitShell>
);

// FieldNode/FieldInspector are small presentational components ported from the prototype,
// fed by REAL `fields` — they do not re-implement the schema model.
```

**Data flow:** `getCachedContentTypes()` → `fieldsFromSchema` lazy-init →
`getContentTypeCached({force})` on mount sets `fields`/`schema` → canvas renders
`fields`; `schema` continues to feed the right-panel `SchemaPreviewPanel`.
Selection is local UI state (lazy init, no effect). The content-type switcher
keeps `ContentTypeSidebar` + `navigate` — relocate it into the rail header or keep
it as a compact picker, but do not change its navigation target.

**Error handling:** keep the `error` Alert and the loading/empty states. Because
this page's "Save schema" is intentionally inert, the inspector edits stay
preview-only (parity with current `FieldCard` behavior) — do NOT introduce a
save/PATCH here; field editing with persistence lives in the Content Type Editor
(L02). No sync `setState` in effects (ESLint 9).

**Routing:** `ContentTypeSidebar.onSelect` keeps `navigate('/content-types/:id/schema')`;
any new link uses `AdminLink` + `resolveAdminRoutePath`. No hand-built `<a href>`.

**Regression-test shape (see L05):** SSR render asserts the rail "Field types"
group with the 8 type labels, the canvas field nodes (one per real field, label +
type text, required marker), the field count Badge, the inspector header, and that
`SchemaPreviewPanel` still receives the schema.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-schema-builder-restyle.test.tsx tests/vitest/ui/schema-builder.test.tsx`

Update literal-markup assertions in `tests/vitest/ui/schema-builder.test.tsx`
where the rail/canvas/inspector replaces the old sidebar + stacked-card layout;
keep assertions that the real fields and the preview panel render. State in the
summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-12-L03`.
- `_docs/CONTENT_TYPES_SPEC.md` — note the canvas/rail/inspector schema-builder
  layout if the spec documents it (no data/API change).
