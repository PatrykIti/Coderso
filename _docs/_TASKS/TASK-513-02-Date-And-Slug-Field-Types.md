# TASK-513-02: `date` + `slug` Field Types (Model → Mapping → Editor → Renderer)

# FileName: TASK-513-02-Date-And-Slug-Field-Types.md

**Parent Task:** TASK-513
**Priority:** High
**Category:** Content (Engine) / Field Model / JSON-Schema Mapping / Entry Rendering
**Estimated Effort:** Medium
**Dependencies:** none code-wise (independent of 513-01); lands 2nd in order
**Status:** ⏳ To Do

---

## Scope (single-writer)

**513-02 is the SOLE WRITER of:**
- `core/admin/ui/content-types/SchemaBuilder.tsx` (the `FieldType` union + `ContentField` type +
  `validateFieldName`/helpers)
- `core/admin/ui/content-types/FieldEditor.tsx` (per-type config UI)
- `core/admin/ui/content-types/schemaMapping.ts` (`fieldTypeMap`, `resolveFieldType`,
  build/parse round-trip)
- `core/admin/ui/entries/FieldRenderer.tsx` (entry value rendering)

Adds two field types — **`date`** and **`slug`** — end-to-end so the prototype's field list
(`Published at` = Date, `Slug` = Slug) and the SchemaBuilder rail (Date) are real, not labels.
The `FieldType` union widening is **additive**; downstream non-owned consumers
(`entries/EntryEditor.tsx`, `custom-screens/*`) already treat unknown field types as passthrough
(text-like) — 513-06 adds a guard test.

**Land order (strict):** 513-01 → 513-02 (this) → 513-04 → 513-03 → 513-05 → 513-06.

---

## Security Contract

**Admin-UI + pure mapping only — no route/DB/RBAC/migration.** `date`/`slug` are ordinary field
types serialized into the existing `content_types.schema` JSON via the established `xFieldType`
convention. Both map to JSON-Schema `type: "string"`; `date` additionally sets `format: "date"`.
`assertContentSchema` (ajv, `core/services/content/validation.ts`) already accepts `format` and
the `x*` keywords — **NO new ajv keyword, NO validation.ts edit**. Entry data for these fields is
still validated by the per-type ajv validator (`validateEntryData`) as strings; no new server
trust surface.

---

## What this subtask ships (anchors verified 2026-07-05)

### 1. `SchemaBuilder.tsx` — widen the union
```ts
export type FieldType =
  | "text" | "richtext" | "number" | "boolean"
  | "select" | "media" | "relation"
  | "date" | "slug";
```
- `ContentField` optionally gains `slug?: { source?: string; editable?: boolean }` and
  `date?: { includeTime?: boolean }` config sub-objects (both optional; present-only). Keep it
  minimal: `slug.source` = the field name to derive the slug from (default none → free text);
  `date.includeTime` toggles `datetime-local` vs `date`.
- No behavior change to `validateFieldName`/`slugifyFieldName`.
- **Export the canonical label map** — the SINGLE source of truth for `FieldType → human label`:
  ```ts
  export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    text: "Text", richtext: "Rich text", number: "Number", boolean: "Boolean",
    select: "Select", media: "Media", relation: "Relation",
    date: "Date", slug: "Slug",
  };
  ```
  Typed `Record<FieldType, string>` so it is a compile-time exhaustiveness guard (tsc fails if a
  future type is missing a label). This is the ONLY exported FieldType→label source in the
  content-types module. Downstream consumers **read it, never re-declare**: 513-03's
  `ContentTypeFieldsPanel` Badge and 513-05's `typeLabel`/`FIELD_TYPES` palette both import it
  read-only (see those subtasks). Do NOT hand-roll a parallel map or `capitalize(field.type)`
  (which yields `Richtext`, not `Rich text`).

### 2. `FieldEditor.tsx` — type options + per-type config
- Add to `fieldTypes` array: `{ value: "date", label: "Date" }`, `{ value: "slug", label: "Slug" }`
  — source each `label` from the exported `FIELD_TYPE_LABELS[value]` (do not hardcode a second copy)
  so this local dropdown array cannot drift from the canonical map.
- Add to `fieldTypeHelp` record: `date` (helper "Calendar date (optionally with time)." / tooltip)
  and `slug` (helper "URL-safe identifier, optionally derived from another field." / tooltip) —
  the record is typed `Record<FieldType, …>` so BOTH entries are **required** for the union to
  compile (compile-time guard that no type is missing).
- Choose an icon per new type where icons are shown (`CalendarDays` for date, `Link2`/`Hash` for
  slug — reuse lucide already imported elsewhere).
- Conditional config blocks (mirror the existing `field.type === "number"` block pattern):
  - `date`: a `Switch` "Include time" bound to `field.date.includeTime` (present-only update).
  - `slug`: a `Select` "Derive from" populated from sibling field names (the other fields' `name`);
    `existingNames` prop already available in `FieldEditor` — pass through / reuse the sibling list
    from the parent (it is already threaded as `existingNames`). Plus a `Switch` "Editable" bound
    to `field.slug.editable`.
- The shared "Default value" input: for `date` use `type="date"` (or `datetime-local` when
  `includeTime`); for `slug` keep `type="text"`.

### 3. `schemaMapping.ts` — build + parse
- `fieldTypeMap` gains `date: "string"`, `slug: "string"`.
- `buildSchemaFromFields`: for `date`, set `definition.format = "date"` (add `format?: "date" |
  "date-time"` to `ContentSchemaProperty`); if `date.includeTime` use `"date-time"`. For `slug`,
  emit `definition.format = undefined` but persist `xFieldConfig.slug` = `{ ...(source?{source}:{}),
  ...(editable===false?{editable:false}:{}) }` when non-empty, and `xFieldConfig.date` for date.
- `resolveFieldType(definition)`: BEFORE the generic `type:"string" ⇒ text` fallback, detect:
  `if (definition.xFieldType === "date" || definition.format === "date" || definition.format ===
  "date-time") return "date";` and `if (definition.xFieldType === "slug") return "slug";`.
  (Order matters: check `xFieldType` explicitly first, matching how relation/media are detected.)
- `fieldsFromSchema`: read back `date`/`slug` config into `field.date`/`field.slug` via small
  readers mirroring `readNumberConfig`/`readMediaConfig` (`readSlugConfig`, `readDateConfig`).
- Round-trip invariant: `fieldsFromSchema(buildSchemaFromFields(fields))` preserves type +
  config for date/slug (513-06/unit test).

### 4. `entries/FieldRenderer.tsx` — render the value input
Add `case "date":` and `case "slug":` to the field `switch` (currently text/richtext/number/
boolean/select/media/relation, lines ~221-379):
- `date`: an `<input type="date">` (or `datetime-local` when `field.date?.includeTime`) bound to
  the entry value; store ISO string. Reuse the existing text-field wrapper/label/help/error
  markup pattern from the `text` case.
- `slug`: a text input that slugifies on blur (reuse `slugifyFieldName` from SchemaBuilder);
  when `field.slug?.source` is set and `field.slug.editable !== true`, derive read-only from the
  source field's current value (mirror the label→name auto behavior). Keep it a controlled input
  writing a URL-safe string.
- Ensure the `default:` arm still falls back to a text input so unknown future types never crash.

---

## Testing requirements (lanes + shared-DB safety)

**Vitest pure lane** (`tests/vitest/**`, no Bun/DB):
- `schemaMapping` round-trip: a field list containing `date` (with/without includeTime) and `slug`
  (with/without source) survives `build → fields` unchanged; `date` emits `format`, `slug` emits
  `xFieldConfig.slug`.
- `resolveFieldType`: a legacy property with `format:"date"` but no `xFieldType` resolves to
  `date`; `xFieldType:"slug"` resolves to `slug`; a plain `type:"string"` still resolves `text`.

**Vitest admin/UI lane** (`tests/vitest/ui/**`):
- `FieldEditor` renders the Date "Include time" switch and Slug "Derive from" select when the
  respective type is selected; toggling updates `field.date`/`field.slug` present-only.
- `FieldRenderer` renders a `type="date"` input for a date field and a slugifying input for a slug
  field; entering a value calls `onChange` with the expected shape.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` (the
`Record<FieldType,…>` in FieldEditor + `fieldTypeMap` are compile-time exhaustiveness guards —
tsc fails if a new arm is missing).

---

## UI/UX-fidelity & max-config-flexibility notes

Matches the prototype field list (`Slug`, `Published at` Date) and the SchemaBuilder rail's Date
icon. Flexibility: slug supports free-text OR derive-from-source with an editable override; date
supports date OR datetime — all present-only so existing schemas are unchanged. Integrate the new
config blocks using the SAME card/switch/select styling already used by the number/media blocks
(no new visual idiom).
