# TASK-513-05: Functional Visual Schema Builder

# FileName: TASK-513-05-Schema-Builder-Functional.md

**Parent Task:** TASK-513
**Priority:** Medium
**Category:** Content (Engine) / Admin UI / Schema Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-513-01 (client `config`/save), TASK-513-02 (`FieldType` union widened with
`date`/`slug` — the prerequisite that makes this file's new palette entries type-valid — plus the
`buildSchemaFromFields`/`fieldsFromSchema` mapping and `FieldEditor` config UI)
**Status:** ✅ Done (2026-07-06)

---

## Scope (single-writer)

**513-05 is the SOLE WRITER of:**
- `core/admin/ui/content-types/SchemaBuilderPage.tsx`
- `core/admin/ui/content-types/SchemaPreviewPanel.tsx`

Turns the currently **non-functional** visual schema builder (route
`/advanced/engine/:id/schema`, prototype `SchemaBuilderPreview.tsx`) into a working secondary
editor: the field-types palette adds fields, the node graph selects, the inspector edits, fields
reorder, and **Save persists** via `updateContentType`. This is the "Open schema" surface reached
from the 513-03 editor header. It reuses the existing `buildSchemaFromFields`/`fieldsFromSchema`
(513-02 owns that file) and `ContentField`/`FieldType`/`FIELD_TYPE_LABELS` (513-02) — read-only
consumers here.

**Land order (strict):** 513-01 → 513-02 → 513-04 → 513-03 → 513-05 (this) → 513-06.

---

## Security Contract

**Admin-UI only — no route/DB/RBAC/migration.** Save uses the hardened `updateContentType`
(`content:write`, CSRF via the client). Field-name validation (`validateFieldName`) runs before
save (reuse from `SchemaBuilder.tsx`). No new client cache key; on save it upserts the content-type
cache + broadcasts (the client already does this).

---

## What this subtask ships (anchors verified 2026-07-05)

Current `SchemaBuilderPage.tsx` state: loads the content type, maps `fields`, renders a read-only
node graph (`FieldNode`), a static field-types palette (buttons with no onClick), a read-only
`FieldInspector`, and a **disabled** Save + **disabled** "Add new field". Make it functional while
keeping the prototype visual (`SplitShell`, 3-column `[240px_minmax(0,1fr)_300px]`, node graph with
connector lines, `SchemaPreviewPanel` on the right).

1. **Palette → add field**: each `FIELD_TYPES` button gets an `onClick` that appends a
   `ContentField` of that type (unique name via `makeUniqueFieldName`, default label), selects it,
   and marks dirty. Enable the dashed "Add new field" button (adds a text field).
   **513-05 must ALSO add `date` and `slug` entries to its own `FIELD_TYPES` palette array**
   (`SchemaBuilderPage.tsx:34-42` — `{ type: "date", label: "Date", icon: <CalendarDays /> }` and
   `{ type: "slug", label: "Slug", icon: <Link2 /> }`, reusing lucide icons).
   **Insertion order (prototype fidelity, do NOT append blindly):** the prototype palette is exactly
   8 entries in this order — Text, Number, Boolean, **Date**, Rich text, Media, Relation, Select
   (`SchemaBuilderPreview.tsx:107-114`, live-verified: Date sits between Boolean and Rich text).
   So `date` MUST be inserted at **index 3** (after `boolean`, before `richtext`) — appending it at
   the end would break prototype fidelity. `slug` has **NO prototype palette entry** (the prototype
   shows exactly those 8 types, no Slug), so it is a **beyond-prototype extension** enabled by 513-02
   widening the `FieldType` union; append it as the **9th/last** entry (after `select`) so the first 8
   match the prototype byte-for-byte. Resulting order:
   `text, number, boolean, date, richtext, media, relation, select, slug`.
   513-05 is the SOLE
   WRITER of `SchemaBuilderPage.tsx`, so this palette addition is on 513-05, NOT 513-02: 513-02 only
   widens the `FieldType` union (the prerequisite that makes these entries type-valid) and adds
   date/slug to a DIFFERENT, separate array — `FieldEditor.tsx`'s local `fieldTypes` (`:24`) — which
   513-05 does not touch. Without this explicit addition the visual builder palette will NOT surface
   date/slug.
   **Label source (no drift):** derive every palette entry's `label` AND the `typeLabel` helper
   (`SchemaBuilderPage.tsx:63`) from the exported `FIELD_TYPE_LABELS` map (import read-only from
   `./SchemaBuilder`, owned/exported by 513-02) rather than hardcoding label strings a third time.
   `FIELD_TYPES` still owns the per-type `icon` (icons are 513-05-local), but its label text comes
   from the canonical map so it cannot drift from FieldEditor's `fieldTypes` (513-02) or 513-03's
   Badge.
   **ALSO update `iconForType` (`SchemaBuilderPage.tsx:44-61`) — the helper the NODE GRAPH uses
   (`iconForType(field.type)` at `:286`).** Today its `switch` has arms for
   `number`/`boolean`/`select`/`media`/`relation`/`richtext` and a `default` (Text) only, so a `date`
   or `slug` field node falls through to `<Type />`. Add `case "date": return <CalendarDays className="size-4" />;`
   (the prototype's `SchemaBuilderPreview.tsx:158` renders the "Published at" Date node with a
   `CalendarDays` icon — this is the exact node the prototype highlights) and
   `case "slug": return <Link2 className="size-4" />;` so node-graph icons match the palette entries.
   Import `CalendarDays` and `Link2` from `lucide-react` (both are currently un-imported in this
   file). Icons stay 513-05-local; do NOT touch 513-02's `FieldEditor`/`SchemaBuilder` icons.
2. **Node graph → select + reorder**: `FieldNode` already has `onSelect`; add an explicit reorder
   **affordance** (the current `FieldNode`, `SchemaBuilderPage.tsx:66-105`, is a single
   `<button onClick={onSelect}>` with props `{icon,name,type,selected,onSelect}` only — no reorder
   control and no keyboard handler, so there is nothing to drive the reorder today).
   **2a — Convert the outer element from `<button>` to a focusable div FIRST (mandatory, DOM
   validity).** The current `FieldNode` root is a `<button type="button" onClick={onSelect}>`
   (`SchemaBuilderPage.tsx:80`). If it stays a `<button>`, the up/down `<button>` children in step 2b
   are **nested interactive buttons** — invalid HTML that triggers a React DOM-nesting/hydration
   warning and will NOT implement cleanly. Convert the root to
   `<div role="button" tabIndex={0} onClick={onSelect} onKeyDown={...} className={...(same classes)}>`
   (Enter/Space → `e.preventDefault(); onSelect()`; ArrowUp/ArrowDown handled in step 2b). This also
   matches the prototype more faithfully — the prototype's `FieldNode` root is a `<Card>` (a `div`),
   NOT a button (`SchemaBuilderPreview.tsx:57`). Keep the existing class list byte-for-byte.
   **2b — 513-05 owns `SchemaBuilderPage.tsx`, so extend `FieldNode` here**: add two optional
   callback props `onMoveUp?: () => void` / `onMoveDown?: () => void` **and two edge-state flags
   `canMoveUp?: boolean` / `canMoveDown?: boolean`** (the current props `{icon,name,type,selected,onSelect}`
   carry no `index`/`fields.length`, so `FieldNode` cannot derive first/last on its own — the edge
   flags must be threaded in from the map, which is the only place `index` and `fields.length` exist,
   `SchemaBuilderPage.tsx:282`). Render small up/down icon buttons
   (`<ChevronUp/>`/`<ChevronDown/>` from `lucide-react`, `size-4`, `type="button"`) inside the node —
   each with `onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}` (respectively `onMoveDown`) so
   the reorder click does not also trigger the node's `onSelect`; render them
   `disabled={!canMoveUp}` / `disabled={!canMoveDown}` respectively. ALSO handle
   `ArrowUp`/`ArrowDown` in the node's `onKeyDown` (from 2a) — `e.preventDefault()` then call
   `onMoveUp?.()` / `onMoveDown?.()` (the callback is a no-op at the edges because the flag-gated
   button is disabled, but guard with the flags too: only move when `canMoveUp`/`canMoveDown`).
   **Wire from the map (`:282-293`), deriving the edge flags from `index`/`fields.length`:**
   ```tsx
   <FieldNode
     …
     canMoveUp={index !== 0}
     canMoveDown={index !== fields.length - 1}
     onMoveUp={() => moveField(field.id, -1)}
     onMoveDown={() => moveField(field.id, 1)}
   />
   ```
   (uses the `moveField` helper in Step 2 of the pseudocode; `moveField` already no-ops on
   out-of-range so the flags are purely for the disabled affordance). Selecting still drives the
   inspector. The UI test clicks these up/down buttons to assert reorder.
   **ORDER-PERSISTENCE NOTE (parent Open Question 6; delivered by 513-02 §schemaMapping):** reorder
   PERSISTS. It updates `fields` and the live `SchemaPreviewPanel` (derived from `fields`), and because
   Save serializes `fields` via `buildSchemaFromFields` — which stamps a per-property integer
   `xFieldConfig.order` from the array index that `fieldsFromSchema` re-sorts by — the authored order
   survives Save→reload despite jsonb key-canonicalization. So "Save persists via `updateContentType`"
   covers field TYPE + CONFIG **and** order. 513-05 makes NO schema-mapping change (the mechanism is
   513-02-owned); it only emits the reordered `fields` array. The UI test asserts the reorder CONTROL +
   the live preview change; the reloaded persisted order is asserted end-to-end in 513-06.
3. **Inspector → editable**: replace the read-only `FieldInspector` with the real editable
   `FieldSettingsPanel` from `SchemaBuilder.tsx` (consume, do not edit) so Label /
   API id / Field type / Required / **Unique** / per-type config / Default / Help are editable and
   update `fields` (the **Unique** toggle is the one 513-02 adds under Required, matching the
   prototype inspector `SchemaBuilderPreview.tsx:138-139` — it surfaces automatically here because
   this reuses the shared `FieldSettingsPanel`; do NOT re-add it). Keep it inside the prototype's
   right/inspector visual frame.
   **DELETE the now-orphaned local helpers (mandatory — `lint`/no-unused-vars gate):** once the
   `<FieldInspector field={selectedField} />` render (`SchemaBuilderPage.tsx:306`) is swapped for
   `FieldSettingsPanel`, the three module-level helpers `FieldInspector`
   (`SchemaBuilderPage.tsx:125-146`), `InspectorRow` (`:107-114`), and `ToggleRow` (`:116-123`) become
   unused (`FieldInspector` was the only caller of `InspectorRow`/`ToggleRow`; `FieldInspector` itself
   had exactly one render site, now removed). Leaving them tripped the `lint` gate this task lists in
   Testing/Gates (no-unused-vars on the function declarations). **Remove all three.**
   **Keep the `Badge` import (`:13`) — it stays used** by the PageHeader actions
   `actions={<Badge variant="outline">{fields.length} fields</Badge>}` (`:236`), so do NOT drop it
   even though its two other uses (inside the deleted `ToggleRow`/`FieldInspector` at `:120`/`:133`)
   go away. **Keep the `typeLabel` helper (`:63`)** — after the deletion its remaining consumer is the
   node-graph `type={…}` prop at `:288`, plus the new palette `label`/`iconForType` work in Step 1, so
   it is still referenced.
   **Thread ALL the props `FieldSettingsPanel` needs to be fully functional** — mirror
   `ContentTypeEditor.tsx:628-636` exactly (`FieldSettingsPanel` accepts these at
   `SchemaBuilder.tsx:97-101`). Passing only `field`/`onChange` silently degrades the reused editor:
   without `existingNames` the API-id uniqueness dedup breaks; without `relationTargets` the relation
   config falls back to a free-text input; without `nameError` no INLINE inspector error can render
   (see the test in the next section). Wire:
   - `field={selectedField}`
   - `onChange={(next) => setFields((prev) => prev.map((f) => (f.id === next.id ? next : f)))}`
     (mark dirty). **`onRemove` takes NO argument** — its prop type is `onRemove: () => void`
     (`SchemaBuilder.tsx:103`; `ContentTypeEditor.tsx:638` passes the zero-arg `requestFieldRemoval`,
     which operates on `selectedField`/`selectedFieldId`, `ContentTypeEditor.tsx:369-372`). So wire
     `onRemove={() => { if (!selectedField) return; const i = fields.findIndex((f) => f.id === selectedField.id); const next = fields.filter((f) => f.id !== selectedField.id); setFields(next); setSelectedFieldId(next[i]?.id ?? next[i - 1]?.id ?? next[0]?.id ?? null); }}`
     — remove the currently-selected field and reselect its neighbor by index (mirrors
     `confirmFieldRemoval`, `ContentTypeEditor.tsx:374-383`); do NOT reference a passed `id`, none is
     supplied.
   - `existingNames={fields.map((f) => ({ id: f.id, name: f.name }))}`
   - `relationTargets={list.map(({ slug, name }) => ({ slug, name }))}` — `ContentTypeSummary`
     carries both `slug` and `name` (`contentTypesClient.ts:37-38`), so `list` (already fetched into
     state for the sidebar) is the mirror of `ContentTypeEditor`'s `relationTargets`.
   - `nameError`, `defaultError`, `relationError` from `useMemo` that mirror
     `ContentTypeEditor.tsx:420-430`:
     `nameError = selectedField ? validateFieldName(selectedField.name, existingNames, selectedField.id) : null`
     (consume the exported `validateFieldName` from `SchemaBuilder.tsx` read-only);
     `defaultError = selectedField?.required && !selectedField.defaultValue ? "Required fields need a default value." : null`;
     `relationError = selectedField?.type === "relation" && !selectedField.relation?.target ? "Select a related content type." : null`.
4. **Live schema + Save**: make `schema` **derived**, not stored — the current
   `const [schema, setSchema] = useState<ContentSchema>(buildSchemaFromFields(initialFields))`
   (`SchemaBuilderPage.tsx:164`) goes stale because the mutation handlers (add/move/inspector
   `onChange`) only call `setFields` and never `setSchema`, so `<SchemaPreviewPanel schema={schema} />`
   (`:220`) would show pre-edit JSON. **Replace that `useState` with the ANNOTATED memo
   `const schema = useMemo<ContentSchema>(() => buildSchemaFromFields(fields), [fields]);`** and
   **delete the two `setSchema(...)` calls** (the `:164` initializer is subsumed by the memo; the
   `:193` load-effect call becomes redundant because `setFields(mappedFields)` already re-derives it).
   **Keep the `type ContentSchema` import alive:** `ContentSchema` is referenced in
   `SchemaBuilderPage.tsx` ONLY at line 30 (`import { …, type ContentSchema } from "./schemaMapping"`)
   and at the `:164` `useState<ContentSchema>` annotation being deleted, so the explicit
   `useMemo<ContentSchema>(…)` type argument is REQUIRED — it re-uses the import and prevents the
   unused-import `lint` failure this task lists in Testing/Gates. (Do NOT instead drop the import: the
   annotation is the clearer contract and documents the memo's return type.) Then the preview
   and every handler stay consistent with zero extra wiring. Keep `SchemaPreviewPanel`'s JSON view.
   Enable **Save schema**: `validateFieldsForSave`-style
   guard — duplicate the minimal name/select/number checks locally in this file (do NOT extract:
   the aggregate save-validator `validateFieldsForSave` is a local, non-exported const inside
   `ContentTypeEditor.tsx`, owned by 513-03, and `SchemaBuilder.tsx` exports only the per-name
   `validateFieldName`, owned by 513-02 — reaching into either would violate single-writer; may
   consume the exported `validateFieldName` from `SchemaBuilder.tsx` read-only for per-name checks)
   then `await updateContentType(typeId,
   { schema })`; toast + clear dirty; **Discard** reverts to last-loaded fields.
5. **Guards**: disable Save while loading/saving/invalid; unsaved-changes indication consistent
   with 513-03.

---

## Execution-ready pseudocode (per handler)

New state (added to `SchemaBuilderPage`):

```ts
const [isSaving, setIsSaving] = useState(false);
// snapshot of the last-persisted field list — Discard target + dirty baseline
const [lastLoaded, setLastLoaded] = useState<ContentField[]>(initialFields);
```

In BOTH the initial-load and `getContentTypeCached` effect (`:187-193`), set the snapshot alongside
`setFields`: `setLastLoaded(mappedFields)` (so Discard reverts to what the server last returned, and
`isDirty` is false right after a successful load/save).

```ts
// derived — REPLACES the stale `const [schema, setSchema] = useState(...)` at :164;
// delete both setSchema(...) calls (:164 initializer + :193 load effect).
// The explicit <ContentSchema> type-arg keeps the line-30 `type ContentSchema` import used
// (it was otherwise only referenced by the deleted useState<ContentSchema> annotation) — required
// to keep the `lint` gate green.
const schema = useMemo<ContentSchema>(() => buildSchemaFromFields(fields), [fields]);
const isDirty = useMemo(
  () => JSON.stringify(fields) !== JSON.stringify(lastLoaded),
  [fields, lastLoaded]
);
const nameError = useMemo(
  () => (selectedField
    ? validateFieldName(selectedField.name,
        fields.map((f) => ({ id: f.id, name: f.name })), selectedField.id)
    : null),
  [selectedField, fields]
);
const hasBlockingError = useMemo(
  () => fields.some((f) =>
    validateFieldName(f.name, fields.map((x) => ({ id: x.id, name: x.name })), f.id) != null),
  [fields]
);
const saveDisabled = isLoading || isSaving || fields.length === 0 || hasBlockingError;
```

```ts
// Step 1 — palette add
function addFieldOfType(type: FieldType) {
  const name = makeUniqueFieldName(type, fields.map((f) => ({ id: f.id, name: f.name })));
  const field: ContentField = {
    id: crypto.randomUUID(),
    name,
    type,
    label: typeLabel(type),      // from FIELD_TYPE_LABELS-derived helper
    keyAuto: true,               // MANDATORY: mirror the canonical add-field paths so editing a
                                 // newly-added field's LABEL auto-derives its API id (name) via
                                 // FieldEditor.handleLabelChange (FieldEditor.tsx:159-168 only
                                 // re-slugs when field.keyAuto is truthy). Both canonical adds set
                                 // it — SchemaBuilder.handleAddField (SchemaBuilder.tsx:258) and
                                 // ContentTypeEditor's new-field literal (ContentTypeEditor.tsx:245).
                                 // Omitting it would diverge the visual builder from the 513-03
                                 // tabbed editor that reuses the same FieldEditor ("no divergent
                                 // field logic" mandate).
    required: false,
  };
  setFields((prev) => [...prev, field]);
  setSelectedFieldId(field.id);   // select the new node
}
// dashed "Add new field" button → addFieldOfType("text"); remove the `disabled` attr.
```

```ts
// Step 2 — reorder (mirror moveSelectOption up/down idiom)
function moveField(id: string, dir: -1 | 1) {
  setFields((prev) => {
    const i = prev.findIndex((f) => f.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
}
```

```ts
// Step 4 — local save-guard (do NOT extract 513-03's validateFieldsForSave; duplicate the minimal
// name/select/number checks locally — mirror ContentTypeEditor.tsx:252-288)
function validateFields(): string | null {
  const names = fields.map((f) => ({ id: f.id, name: f.name }));
  for (const f of fields) {
    const e = validateFieldName(f.name, names, f.id);
    if (e) return e;
    if (f.type === "select") { /* labels+values present, values unique */ }
    if (f.type === "number") { /* min<=max, step>0, integer default */ }
  }
  return null;
}

async function handleSave() {
  if (!typeId) return;
  const err = validateFields();
  if (err) { setError(err); return; }
  setIsSaving(true);
  setError(null);
  try {
    const nextSchema = buildSchemaFromFields(fields);
    await updateContentType(typeId, { schema: nextSchema }); // client upserts cache + broadcasts
    setLastLoaded(fields);        // clears dirty; new baseline
    toast.success("Schema saved");
  } catch (e) {
    setError(isApiClientError(e) ? e.message : "Failed to save schema."); // load pattern at :196-203
  } finally {
    setIsSaving(false);
  }
}

// Step 5 — Discard
function handleDiscard() {
  setFields(lastLoaded);
  setSelectedFieldId(lastLoaded[0]?.id ?? null);
  setError(null);
}
```

Wire into `topbarActions` (`:222-229`): `<Button variant="ghost" onClick={handleDiscard} disabled={!isDirty || isSaving}>Discard</Button>`
and `<Button onClick={handleSave} disabled={saveDisabled}>{isSaving ? "Saving…" : "Save schema"}</Button>`.

---

## Testing requirements (lanes)

**Vitest admin/UI lane** (`tests/vitest/ui/**`) — mock `contentTypesClient`:
- Clicking a palette type (e.g. Date) appends a field of that type and selects it.
- Editing the inspector label updates the node graph label + the live schema preview.
- Reorder: clicking a field node's up/down control (from Step 2) changes field order (and the live
  schema preview reflects the new order).
- Save calls `updateContentType(typeId, { schema })` with the built schema; Discard reverts.
- Invalid field name blocks Save with an inline error.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit`, `lint`.

---

## UI/UX-fidelity & max-config-flexibility notes

Keeps the prototype's distinctive node-graph visual (connector lines, selected ring, palette,
inspector) but makes every affordance real — no "non-functional preview" caption. Reuses the
canonical `FieldEditor` so the two editors (513-03 tabbed, 513-05 visual) share one field-config
implementation (no divergent field logic). Light+dark parity via tokens.
