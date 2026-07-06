# TASK-513-03: Content-Type Editor — Prototype-Fidelity Rebuild + Type Settings + Ergonomics

# FileName: TASK-513-03-Editor-Prototype-Fidelity-Rebuild.md

**Parent Task:** TASK-513
**Priority:** High
**Category:** Content (Engine) / Admin UI / Editor Fidelity
**Estimated Effort:** Large
**Dependencies:** TASK-513-01 (`config` types + client), TASK-513-02 (`date`/`slug` types +
exported `FIELD_TYPE_LABELS` map for the type badges), TASK-513-04 (`ContentTypePermissionsPanel`)
**Status:** ⏳ To Do

---

## Scope (single-writer)

**513-03 is the SOLE WRITER of:**
- `core/admin/ui/content-types/ContentTypeEditor.tsx` (full rebuild)
- `core/admin/ui/content-types/ContentTypeFieldsPanel.tsx` (NEW — the prototype field list rows)
- `core/admin/ui/content-types/ContentTypeSettingsCard.tsx` (NEW — the "Type settings" right card)

Rebuilds the editor to the prototype's **in-page** structure and wires the new `config` surface +
Permissions tab + functional field reorder/actions + light post-editor ergonomics. Consumes
`ContentTypePermissionsPanel` (513-04) and the widened `FieldType` (513-02).

**Land order (strict):** 513-01 → 513-02 → 513-04 → 513-03 (this) → 513-05 → 513-06.

---

## Security Contract

**Admin-UI only — no route/DB/RBAC/migration.** Persists via the already-hardened
`updateContentType` / `duplicateContentType` / `deleteContentType` clients (513-01). `config`
(singular/plural/drafts/versioning/permissions) is sent inside the existing `PATCH` payload; the
server normalizes/allowlists it (513-01). The editor sends `config` on every save (present-only
shape from the card/panel state). No new client cache key. Field-name validation
(`validateFieldName`) and save-time schema validation (`validateFieldsForSave`) are preserved.

---

## Prototype structure to reproduce (from `ContentTypeEditorPreview.tsx`, verified 2026-07-05)

```
<div>                                          ← in-page (AdminShell content), NOT EditorShell
  <PageHeader
     breadcrumbs=[{Engine → /advanced/engine}, {name}]   title={name}  icon={<Boxes/>}
     description="Define the fields and behavior of this content type."
     actions=[ <Open schema> (outline, → /advanced/engine/:id/schema), <Save> (primary) ] />
  <Tabs variant="underline" items=[ Fields(n) · Relations(n) · Settings · Permissions ] />
  <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
     <SectionCard title="Fields" description="Drag to reorder. Click a field to edit it."
                  action={<Add field> soft} padded={false}>
        { field rows: GripVertical · name · <Badge type> · <MoreHorizontal actions> }
     </SectionCard>
     <Card "Type settings">  ← API ID(mono) · Singular · Plural · Enable drafts · Versioning
  </div>
</div>
```

---

## What this subtask ships

### 1. Shell: EditorShell → in-page AdminShell layout
- Replace the `EditorShell` wrapper (current left FIELDS rail + right Schema-Preview-JSON + sticky
  toolbar) with the `AdminShell` in-page content pattern already used by `ContentTypeList.tsx`
  (`AdminShell activeHref="/admin/content-types" breadcrumbs={["Content","Content Types"]}`), a
  centered `max-w-*` container, and the shared `PageHeader`.
- `PageHeader`: breadcrumbs `[{label:"Engine", href:.../advanced/engine}, {label:name}]`, title =
  the type **name** (not "Content Type Editor"), `icon={<Boxes/>}`, description as prototype.
  Actions cluster: **Open schema** (outline, navigates to `/advanced/engine/:id/schema`) + **Save**
  (primary → `handleSave("draft")` or a Save/Publish split — keep Publish + Save draft, but the
  prototype's single "Save" is primary; retain Duplicate/Delete/Collection-workspace in a
  `DropdownMenu` "More" to keep the header tidy and prototype-faithful rather than the current
  6-button sticky bar).
- **Fix the stale post-mutation navigation while relocating the retained handlers (this file is the
  sole writer — the dead routes MUST NOT be carried forward verbatim).** Two of the retained handlers
  currently navigate to a route that DOES NOT EXIST in the route table: `handleDuplicate` navigates
  to `/content-types/${duplicated.id}` (ContentTypeEditor.tsx:336) and `handleDelete` navigates to
  `/content-types` (:354), but `AdminApp.tsx` defines only `/advanced/engine` (list, :664),
  `/advanced/engine/:id` (editor, :669), `/advanced/engine/:id/collection` (:674),
  `/advanced/engine/:id/collection/detail-template/:detailPageId` (:679) and
  `/advanced/engine/:id/schema` (:684) — there is NO `/content-types` pattern, so today a successful
  duplicate/delete lands on an unmatched/blank route. When rebuilding, correct these to the real
  routes: after duplicate → `navigate(`/advanced/engine/${encodeURIComponent(duplicated.id)}`)`
  (the editor route for the new copy); after delete → `navigate("/advanced/engine")` (the Engine
  landing/list, matching the prototype breadcrumb). The Collection-workspace nav
  (`/advanced/engine/:id/collection`, :526) is already correct — keep it as-is.
- Keep the status `Badge` near the title (draft/published) — the prototype has no status pill but
  our model needs it; place it subtly next to the title (soft badge).
- Preserve the "Updated in another tab" / "Unsaved changes" / "Field removed (Undo)" alerts.

### 2. Tabs (underline) with Permissions
- `EditorTab = "fields" | "relations" | "settings" | "permissions"`.
- Underline `Tabs`/`TabsList` (existing `TabsList variant="line"`), triggers with count badges:
  Fields (`fields.length`), Relations (`relationFields.length`), Settings, Permissions.

### 3. Fields tab: `ContentTypeFieldsPanel` (NEW) + reorder + actions
- **Reconciliation with the existing field list (single-writer boundary — do this first).** The
  current editor imports and renders `FieldsListPanel` **and** `FieldSettingsPanel` from
  `./SchemaBuilder` (ContentTypeEditor.tsx:34-38 imports both + `validateFieldName` + type
  `ContentField`; `FieldsListPanel` is rendered at :440 and :621, `FieldSettingsPanel` at :628 and
  :782). The rebuilt Fields tab **stops importing/rendering `FieldsListPanel`** (the old field-list
  surface) and instead composes the NEW `ContentTypeFieldsPanel` (list) + `FieldSettingsPanel`
  (settings, imported **read-only** from `./SchemaBuilder`) directly — so there is exactly ONE
  field-list surface, never two. The `SchemaBuilder` wrapper component (SchemaBuilder.tsx:239) is
  NOT rendered by the editor today and stays unused. Because `ContentTypeEditor.tsx` is 513-03's
  sole-writer file, dropping the `FieldsListPanel` import/usage here is in scope; **removing the now
  unused `FieldsListPanel` export from `SchemaBuilder.tsx` is NOT 513-03's file** (513-02 owns
  `SchemaBuilder.tsx`) — leave that export in place (513-03 simply stops consuming it); any cleanup
  of the dead export belongs to 513-02/513-05, not this subtask.
- LEFT column `SectionCard title="Fields" description="Drag to reorder. Click a field to edit it."
  action={Add field soft button}` — render `ContentTypeFieldsPanel`.
- **Prop signature (execution-ready)** — the panel is presentational; the editor owns `fields`
  state and all mutations, the panel only emits intent. `ContentField`/`FieldType` and the
  `FIELD_TYPE_LABELS` map are imported read-only from `./SchemaBuilder` (513-02 owns/exports both):
  ```ts
  interface ContentTypeFieldsPanelProps {
    fields: ContentField[];              // ordered; render order = array order
    selectedId: string | null;           // highlights the active row
    onSelect: (id: string) => void;       // click row/Edit → selects field for FieldSettingsPanel
    onReorder: (fromIndex: number, toIndex: number) => void; // drag/keyboard reorder
    onDuplicateField: (id: string) => void;
    onDeleteField: (id: string) => void;  // triggers the editor's requestFieldRemoval(id) confirm flow
  }
  // Row render: fields.map((field, index) => Row(
  //   grip=<GripVertical>, label={field.label} (truncate),
  //   badge=<Badge variant="soft">{FIELD_TYPE_LABELS[field.type] ?? field.type}</Badge>,
  //   menu=<DropdownMenu> Edit→onSelect(field.id) · Duplicate→onDuplicateField(field.id) ·
  //        Delete→onDeleteField(field.id) </DropdownMenu>,
  //   selected={field.id === selectedId} ))
  // No local label map, no capitalize(field.type) (would drift from 513-02/513-05 → "Richtext").
  ```
- **Editor-side handlers (data flow, in `ContentTypeEditor`, funnel through the EXISTING
  `handleFieldChange(next)` which does `setFields(next)` + `setUnsavedChanges(true)` —
  ContentTypeEditor.tsx:364 — so dirty-tracking stays single-sourced)**:
  ```ts
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;                 // no-op guard
    if (fromIndex < 0 || toIndex < 0 ||                // bounds guard (drop-outside / stale index)
        fromIndex >= fields.length || toIndex >= fields.length) return;
    const next = fields.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    handleFieldChange(next);                           // reorders the fields[] array (PERSISTS — see NOTE)
  };
  // ORDER-PERSISTENCE NOTE (parent Open Question 6; delivered by 513-02 §schemaMapping):
  // reorder PERSISTS. `content_types.schema` is a Postgres `jsonb` column (core/db/schema.ts:688) that
  // canonicalizes object keys, so 513-02 records the authored position in a per-property integer
  // `xFieldConfig.order` (written by buildSchemaFromFields for every field) and re-sorts by it in
  // `fieldsFromSchema` — so the fields[] array order set here is exactly what reloads. Marking the
  // editor dirty via handleFieldChange is therefore CORRECT (the reorder survives Save→reload), NOT a
  // cosmetic affordance. Nothing extra to do here: emitting the reordered fields[] is sufficient because
  // Save serializes it via buildSchemaFromFields, which stamps xFieldConfig.order from array index.
  const handleDuplicateField = (id: string) => {
    const src = fields.find(f => f.id === id); if (!src) return;
    const existingNames = fields.map(f => ({ id: f.id, name: f.name }));
    const clone: ContentField = {
      ...src,
      id: crypto.randomUUID(),                         // matches new-field id idiom (SchemaBuilder.tsx:254)
      name: makeUniqueFieldName(src.name, existingNames), // SchemaBuilder.tsx:210, no currentId → forces new name
      label: `${src.label} copy`,
    };
    const at = fields.findIndex(f => f.id === id);
    handleFieldChange([...fields.slice(0, at + 1), clone, ...fields.slice(at + 1)]); // insert after source
    setSelectedFieldId(clone.id);                      // select the clone
  };
  // onDeleteField(id): the current requestFieldRemoval() (ContentTypeEditor.tsx:369) takes NO arg
  // and removes `selectedField`. The rebuild MUST make row-Delete target THAT row, not the selected
  // one — either generalize to requestFieldRemoval(id) (setPendingFieldRemoval(fields.find(id)))
  // or setSelectedFieldId(id) first then call it. Keep confirmFieldRemoval/undoFieldRemoval + the
  // Undo alert (:374/:385) unchanged.
  ```
- `ContentTypeFieldsPanel` rows (match prototype exactly): `divide-y`, each row
  `flex items-center gap-3 px-5 py-3 hover:bg-accent` → `GripVertical` (grab), truncated field
  **label**, `Badge variant="soft"` = type label rendered as `FIELD_TYPE_LABELS[field.type]`
  (import the exported map read-only from `./SchemaBuilder` — 513-02 owns/exports it, incl.
  Date/Slug). Do NOT re-declare a local label map or use `capitalize(field.type)` (would drift from
  513-02 + 513-05 and yield `Richtext`).
- **Functional drag reorder — execution-ready interaction layer.** A shared reorder primitive
  **EXISTS and is verified** (2026-07-05): `core/admin/ui/posts/editor/blocks/blockDnD.ts` exports
  pure helpers `reorderItemsById<T extends {id:string}>(items, itemId, targetIndex)`,
  `clampDropIndex(value, length)`, and `resolveDropIndexFromPointer(targetIndex, clientY, rect)`;
  `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx` is a full working consumer (HTML5 drag
  + `Alt`+Arrow keyboard). `FieldEditor.tsx:209`'s `moveSelectOption(optionId, -1|1)` is
  SELECT-OPTION-scoped only (mutates `field.options`, not a generic row reorder) — do NOT reuse it.
  Pick ONE of the two shapes below and stay internally consistent with the panel prop + `handleReorder`:
  - **(chosen, simplest) keep `onReorder(fromIndex, toIndex)`** + the `handleReorder` splice above,
    and hand-roll a tiny local drag-state layer inside `ContentTypeFieldsPanel` using FINAL from/to
    indices (no target-index-before-removal math). Rows keyed by `field.id` so focus follows the
    moved row:
    ```tsx
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const clearDrag = () => setDragIndex(null);
    // each row: draggable; <GripVertical> is the visual grab handle
    <div
      key={field.id}                                  // stable key → focus retention after move
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragIndex(index); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} // enables drop
      onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) onReorder(dragIndex, index); clearDrag(); }}
      onDragEnd={clearDrag}
      onKeyDown={(e) => {                               // keyboard reorder on the row/grip
        if (e.key === "ArrowUp")   { e.preventDefault(); onReorder(index, index - 1); }
        if (e.key === "ArrowDown") { e.preventDefault(); onReorder(index, index + 1); }
      }}
      className={dragIndex === index ? "opacity-60" : undefined} // drag feedback
    >…</div>
    ```
    `handleReorder` already no-ops on equal / out-of-bounds indices, so `index - 1` at the top and
    `index + 1` at the bottom are safe (no guard needed at the call site). Mirror `PostListViewPanel`'s
    hint UX: the `SectionCard` description already says "Drag to reorder…"; add a small `<kbd>`
    keyboard hint (e.g. "Keyboard: Arrow keys").
  - **(alt) reuse `reorderItemsById`** exactly like `PostListViewPanel`: emit an id-based
    `onMoveFieldToIndex(id, targetIndex)` intent instead of `onReorder(fromIndex, toIndex)`, compute
    `targetIndex` via `resolveDropIndexFromPointer(index, e.clientY, rect)` on `onDragOver`, and in
    the editor call `handleFieldChange(reorderItemsById(fields, id, targetIndex))`. If chosen you
    MUST adopt its target-index-BEFORE-removal convention (its `Alt`+ArrowDown uses `index + 2`,
    ArrowUp uses `index - 1`) and DROP the `handleReorder(fromIndex, toIndex)` splice + the
    `onReorder` prop. Do NOT mix the two conventions (one uses after-removal `toIndex`, the other
    before-removal `targetIndex`).
  Either shape emits a reordered `fields[]` array, and in BOTH the reorder PERSISTS: Save serializes
  `fields[]` via `buildSchemaFromFields`, which stamps `xFieldConfig.order` from the array index, and
  `fieldsFromSchema` re-sorts by it on reload (513-02 §Field-ORDER block; parent Open Question 6).
  513-03 makes NO schema-mapping change — the order mechanism is entirely owned by 513-02; 513-03 only
  produces the reordered array + marks dirty. The live schema preview reflects the new order too.
- Row `…` menu (`DropdownMenu`): **Edit** (selects the field → opens the inline editor / details
  sheet), **Duplicate field** (clone with a unique name via `makeUniqueFieldName`), **Delete**
  (existing `requestFieldRemoval` confirm flow).
- Selecting a row opens the field settings: on `lg` show `FieldSettingsPanel` (from
  `SchemaBuilder.tsx`, consumed read-only — NOT edited here) below/inline; on small screens the
  existing details `Sheet`. Preserve the current `FieldSettingsPanel` usage & props.

### 4. RIGHT column: `ContentTypeSettingsCard` (NEW) = prototype "Type settings"
- **Prop signature (execution-ready)** — presentational/controlled; the editor owns `slug` +
  `config` state. `ContentTypeConfig` is imported read-only from `@/services/contentTypesClient`
  (513-01 owns/exports it; `config.permissions: PermissionsMatrix`). No local persistence — the
  card only emits intent, `handleSave` sends `config`:
  ```ts
  interface ContentTypeSettingsCardProps {
    slug: string;                                     // API ID (mono input)
    config: ContentTypeConfig | undefined;            // singularName/pluralName/draftsEnabled/versioning/permissions
    onSlugChange: (next: string) => void;             // marks unsaved
    onConfigChange: (next: ContentTypeConfig) => void; // present-only patch; marks unsaved
    disabled?: boolean;
  }
  // Controls (each edit → onConfigChange({ ...config, <field>: value }) or onSlugChange):
  //   API ID       → Input font-mono text-xs  value={slug}                          onChange→onSlugChange
  //   Singular     → Input                     value={config?.singularName ?? ""}    onChange→{...config, singularName}
  //   Plural       → Input                     value={config?.pluralName ?? ""}      onChange→{...config, pluralName}
  //   Enable drafts→ Switch checked={resolveDraftsEnabled(config)} onChange→{...config, draftsEnabled}
  //   Versioning   → Switch checked={resolveVersioning(config)}    onChange→{...config, versioning}
  // resolveDraftsEnabled/resolveVersioning imported from @/services/contentTypesClient (513-01),
  // NOT from core/services/content/typeService.ts (server-only db/drizzle — bundle-boundary break).
  // Present-only: never write draftsEnabled:true / versioning:false explicitly if that equals the
  // resolved default (let the server normalizer drop defaults, per 513-01 §normalizeContentTypeConfig).
  ```
- **Editor-side wiring**: the editor holds `const [config, setConfig] = useState<ContentTypeConfig>(...)`
  seeded from the loaded type; `onConfigChange={(next) => { setConfig(next); setUnsavedChanges(true); }}`,
  `onSlugChange={(s) => { setSlug(s); setUnsavedChanges(true); }}`. `handleSave` includes
  `config` (present-only) and `slug` in the PATCH payload. `config.permissions` is threaded to the
  Permissions tab's `<ContentTypePermissionsPanel permissions={config.permissions} onChange={(m) =>
  onConfigChange({ ...config, permissions: m })} />` (513-04) — ONE `config` object, one writer.
- `Card "Type settings"` with:
  - **API ID** — `Input` (mono `font-mono text-xs`) bound to `slug`. This card is the **SOLE
    writer of `slug`** (single control, per parent Per-tab resolution): the Settings tab's `Slug`
    input is REMOVED (§5) so there is no dual React-state writer of `slug`. Do NOT keep or mirror a
    slug editor in the Settings tab.
  - **Singular name** — `Input` bound to `config.singularName`.
  - **Plural name** — `Input` bound to `config.pluralName`.
  - **Enable drafts** — `Switch` bound to `resolveDraftsEnabled(config)` (default on).
  - **Versioning** — `Switch` bound to `resolveVersioning(config)` (default off).
  - Import both helpers from the client file 513-01 owns:
    `import { resolveDraftsEnabled, resolveVersioning } from "@/services/contentTypesClient"`.
    Do NOT import from `core/services/content/typeService.ts` — it is server-only (`db`/drizzle)
    and would break the admin bundle boundary.
- Emits an `onConfigChange(nextConfig)` present-only patch to the editor state; the editor sends
  `config` in `handleSave`. Mark `hasUnsavedChanges` on any config edit.
- Keep the existing preview toggle (`ContentTypePreviewPanel`) reachable, but the prototype's
  right column is the Type-settings card — move the schema/entry preview to a header button /
  drawer (existing `previewSheetOpen` Sheet) so the right column matches the prototype.

### 5. Settings tab
- Retain **Taxonomies** (categories/tags) + **Danger Zone** (delete) as today. **REMOVE the
  Settings-tab `Slug` input** — the API ID (slug) is now edited ONLY by the Type-settings card (§4),
  so a Settings-tab slug field would be a second writer of `slug` (forbidden double-write). **KEEP
  the Settings-tab `Name` input** — it maps to `content_types.name` (distinct from
  `config.singularName`/`config.pluralName`) and is NOT duplicated into the Type-settings card.
  Net: exactly ONE editor per field — `slug` in the card, `Name` in Settings — with no double-write
  React state races (per parent Per-tab resolution).

### 6. Permissions tab
- Render `<ContentTypePermissionsPanel permissions={config.permissions} onChange={...} />` (513-04);
  updates `config.permissions` present-only + marks unsaved.

### 7. Ergonomics (post-editor parity, light)
- `handleSave` sends the full payload incl. `config`. Add **Cmd/Ctrl+S** keyboard save (reuse the
  posts shortcut hook pattern if importable, else a local `keydown` listener) and a **last-saved**
  hint + dirty indicator near the header actions. Keep the leave-guard alert already present.
- Revision history: OUT of scope (parent Open Question #2).

---

## Testing requirements (lanes + shared-DB safety)

**Vitest admin/UI lane** (`tests/vitest/ui/**`) — mock `contentTypesClient`:
- Renders breadcrumb `Engine`, type-name title, `Boxes` icon, and `Open schema` + `Save` actions.
- Renders 4 underline tabs incl. **Permissions** with correct counts.
- Type-settings card: editing Singular/Plural + toggling Enable drafts/Versioning updates state
  and a subsequent Save calls `updateContentType` with the expected present-only `config`
  (drafts default dropped, versioning:true kept).
- Fields list rows show label + type Badge (incl. a Date and a Slug field) + actions menu; row
  `…` → Duplicate adds a uniquely-named clone; Delete opens the confirm flow.
- Drag/keyboard reorder changes the field order, the LIVE schema preview reflects it, AND the order
  PERSISTS through Save→reload via `xFieldConfig.order` (513-02 §Field-ORDER; parent Open Question 6).
  The admin-lane test asserts the reorder emits the new array order; the exact saved/reloaded order is
  asserted end-to-end in 513-06 (Bun route round-trip + smoke scenario 3).
- API ID input edits slug; Save sends the new slug.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit`, `lint`. Watch the
Typecheck scope gotcha — run root tsc because editor prop changes touch `tests/`.

---

## UI/UX-fidelity & max-config-flexibility notes

Faithful reproduction of the prototype in-page editor (PageHeader breadcrumbs + underline tabs +
`[1fr_300px]` grid + Fields SectionCard rows + Type-settings card). Light+dark parity required
(no literal `bg-white`; use tokens as the rest of the admin does). Max flexibility: every prototype
control is real (API ID, singular, plural, drafts, versioning, permissions) and drag reorder +
per-row actions + all field types (incl. date/slug) are functional. New controls reuse existing
`Card`/`SectionCard`/`Switch`/`Input`/`Badge`/`DropdownMenu` primitives for a native, tasteful fit.
Visual acceptance = live side-by-side vs prototype at :5180 (gate on :5173 == 200).
