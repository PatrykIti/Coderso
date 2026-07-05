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
- Keep the status `Badge` near the title (draft/published) — the prototype has no status pill but
  our model needs it; place it subtly next to the title (soft badge).
- Preserve the "Updated in another tab" / "Unsaved changes" / "Field removed (Undo)" alerts.

### 2. Tabs (underline) with Permissions
- `EditorTab = "fields" | "relations" | "settings" | "permissions"`.
- Underline `Tabs`/`TabsList` (existing `TabsList variant="line"`), triggers with count badges:
  Fields (`fields.length`), Relations (`relationFields.length`), Settings, Permissions.

### 3. Fields tab: `ContentTypeFieldsPanel` (NEW) + reorder + actions
- LEFT column `SectionCard title="Fields" description="Drag to reorder. Click a field to edit it."
  action={Add field soft button}` — render `ContentTypeFieldsPanel`.
- `ContentTypeFieldsPanel` rows (match prototype exactly): `divide-y`, each row
  `flex items-center gap-3 px-5 py-3 hover:bg-accent` → `GripVertical` (grab), truncated field
  **label**, `Badge variant="soft"` = type label rendered as `FIELD_TYPE_LABELS[field.type]`
  (import the exported map read-only from `./SchemaBuilder` — 513-02 owns/exports it, incl.
  Date/Slug). Do NOT re-declare a local label map or use `capitalize(field.type)` (would drift from
  513-02 + 513-05 and yield `Richtext`).
- **Functional drag reorder**: pointer/keyboard reorder updating `fields` order (persist order on
  save — order is already implied by property insertion order in `buildSchemaFromFields`; verify
  `fieldsFromSchema` preserves `Object.entries` order — it does). Use a minimal DnD approach
  consistent with existing admin patterns (grep for an existing reorder util, e.g. the select-
  option `moveSelectOption` up/down pattern in `FieldEditor.tsx`, or an existing dnd hook in
  `posts`/`custom-screens`); if no shared DnD hook exists, provide keyboard up/down + drag with a
  small local handler. **Anchor check at impl time**: confirm whether a shared reorder primitive
  exists before hand-rolling.
- Row `…` menu (`DropdownMenu`): **Edit** (selects the field → opens the inline editor / details
  sheet), **Duplicate field** (clone with a unique name via `makeUniqueFieldName`), **Delete**
  (existing `requestFieldRemoval` confirm flow).
- Selecting a row opens the field settings: on `lg` show `FieldSettingsPanel` (from
  `SchemaBuilder.tsx`, consumed read-only — NOT edited here) below/inline; on small screens the
  existing details `Sheet`. Preserve the current `FieldSettingsPanel` usage & props.

### 4. RIGHT column: `ContentTypeSettingsCard` (NEW) = prototype "Type settings"
- `Card "Type settings"` with:
  - **API ID** — `Input` (mono `font-mono text-xs`) bound to `slug` (edits the slug; keep the
    existing slug in Settings tab too, or make this the canonical slug editor — reconcile so
    there's ONE source of truth; recommended: this card is canonical, Settings tab shows slug
    read-only or removes the duplicate).
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
- Retain **Taxonomies** (categories/tags) + **Danger Zone** (delete) as today. Remove the
  now-duplicated Name/Slug block if API ID/names moved to the Type-settings card (keep **Name**
  editable somewhere — the prototype title is the name; put Name in the Type-settings card too, or
  keep a compact identity block in Settings). Ensure exactly one editor per field (no double-write
  React state races).

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
- Drag/keyboard reorder changes field order and the saved schema property order reflects it.
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
