# TASK-513-05: Functional Visual Schema Builder

# FileName: TASK-513-05-Schema-Builder-Functional.md

**Parent Task:** TASK-513
**Priority:** Medium
**Category:** Content (Engine) / Admin UI / Schema Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-513-01 (client `config`/save), TASK-513-02 (`FieldType` union widened with
`date`/`slug` — the prerequisite that makes this file's new palette entries type-valid — plus the
`buildSchemaFromFields`/`fieldsFromSchema` mapping and `FieldEditor` config UI)
**Status:** ⏳ To Do

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
   (`SchemaBuilderPage.tsx:34` — `{ type: "date", label: "Date", icon: <CalendarDays /> }` and
   `{ type: "slug", label: "Slug", icon: <Link2 /> }`, reusing lucide icons). 513-05 is the SOLE
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
2. **Node graph → select + reorder**: `FieldNode` already has `onSelect`; add keyboard/drag reorder
   (mirror 513-03's reorder approach or the `moveSelectOption` up/down idiom). Selecting drives the
   inspector.
3. **Inspector → editable**: replace the read-only `FieldInspector` with the real editable
   `FieldEditor`/`FieldSettingsPanel` from `SchemaBuilder.tsx` (consume, do not edit) so Label /
   API id / Field type / Required / per-type config / Default / Help are editable and update
   `fields`. Keep it inside the prototype's right/inspector visual frame.
4. **Live schema + Save**: recompute `schema = buildSchemaFromFields(fields)` on change; feed
   `SchemaPreviewPanel` (keep its JSON view). Enable **Save schema**: `validateFieldsForSave`-style
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

## Testing requirements (lanes)

**Vitest admin/UI lane** (`tests/vitest/ui/**`) — mock `contentTypesClient`:
- Clicking a palette type (e.g. Date) appends a field of that type and selects it.
- Editing the inspector label updates the node graph label + the live schema preview.
- Reorder changes field order.
- Save calls `updateContentType(typeId, { schema })` with the built schema; Discard reverts.
- Invalid field name blocks Save with an inline error.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit`, `lint`.

---

## UI/UX-fidelity & max-config-flexibility notes

Keeps the prototype's distinctive node-graph visual (connector lines, selected ring, palette,
inspector) but makes every affordance real — no "non-functional preview" caption. Reuses the
canonical `FieldEditor` so the two editors (513-03 tabbed, 513-05 visual) share one field-config
implementation (no divergent field logic). Light+dark parity via tokens.
