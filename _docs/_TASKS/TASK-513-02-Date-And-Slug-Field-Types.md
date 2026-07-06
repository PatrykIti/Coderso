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
(`Published at` = Date, `Slug` = Slug — grounded in
`_docs/_PROTOTYPE/src/pages/advanced/ContentTypeEditorPreview.tsx:21-30`, `Slug`@:23, `Date`@:28,
plus the entry-side slug inputs at `advanced/EntryEditorPreview.tsx:42` and
`content/PostEditorPreview.tsx:86`) and the SchemaBuilder rail (Date @
`advanced/SchemaBuilderPreview.tsx:110`, dropdown @:131, field node @:158) are real, not labels.
NB: `SchemaBuilderPreview.tsx` shows Date as a first-class selectable type but does NOT list Slug
in its rail (:107-114) or type dropdown (:128-135) — Slug appears there only as a read-only field
TYPE BADGE, and the ContentTypeEditor Fields tab is where the Slug badge lives. Date is a 1:1
reproduction of a prototype-selectable type; **surfacing `slug` as a selectable type in
FieldEditor's dropdown (and 513-05's palette) is a deliberate max-config-flexibility EXTENSION**
beyond the prototype's selector (see §UI/UX-fidelity notes).
It ALSO adds the prototype inspector's **`Unique`** field flag (a declarative per-field boolean the
prototype renders directly under `Required` at `SchemaBuilderPreview.tsx:139`), because 513-02 is
the sole writer of the three files that flag needs (the `ContentField` type in `SchemaBuilder.tsx`,
the inspector `Switch` in `FieldEditor.tsx`, and the `xFieldConfig` persistence in
`schemaMapping.ts`). `unique` is declarative-only (surfaced + persisted, NOT DB/route-enforced — see
parent Open Question 5), mirroring the parent's `versioning`/`permissions` declarative pattern; both
editors (513-03 tabbed + 513-05 visual) surface it automatically because both consume this
`FieldEditor`/`FieldSettingsPanel`.
The `FieldType` union widening is **additive**; downstream non-owned consumers
(`entries/EntryEditor.tsx`, `custom-screens/*`) already treat unknown field types as passthrough
(text-like) — 513-06 adds a guard test.

**Land order (strict):** 513-01 → 513-02 (this) → 513-04 → 513-03 → 513-05 → 513-06.

---

## Security Contract

**Admin-UI + pure mapping only — no route/DB/RBAC/migration.** `date`/`slug` are ordinary field
types serialized into the existing `content_types.schema` JSON via the established `xFieldType`
convention. Both map to JSON-Schema `type: "string"` and carry **no `format` keyword** — the
type is identified purely by `xFieldType: "date"|"slug"` plus optional `xFieldConfig.date` /
`xFieldConfig.slug`.

> **Why no `format`:** `assertContentSchema` (`core/services/content/validation.ts:33`) compiles
> the built schema with `new Ajv({ allErrors: true, strict: true })` (validation.ts:3) and
> registers ONLY the `xFieldType`/`xRelationTarget`/`xFieldConfig` keywords — **ajv-formats is NOT
> installed** (`core/package.json` has no `ajv-formats`; ajv `^8.17.1`). Under `strict: true`, an
> unknown `format` (`"date"`/`"date-time"`) makes `ajv.compile` **throw** (`unknown format "date"
> ignored in schema …`), which `assertContentSchema` re-raises as `ContentValidationError`. That
> path runs on every save — `createContentType` (`typeService.ts:189`) and `updateContentType`
> (`typeService.ts:218`) both call `assertContentSchema(input.schema)` — so emitting `format` would
> make any content type containing a date field **un-savable**. We therefore do NOT emit `format`
> and do NOT touch `validation.ts`.

`assertContentSchema` already accepts the `x*` keywords — **NO new ajv keyword, NO validation.ts
edit** (the "no validation.ts edit" claim is only true because we omit `format`). Entry data for
these fields is still validated by the per-type ajv validator (`validateEntryData`) as strings; no
new server trust surface.

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
  minimal: `slug.source` = the field name the slug is declaratively associated with (authoring
  intent; default none → free text — entry-time auto-derive is a FUTURE enhancement, see §4
  renderer); `date.includeTime` toggles `datetime-local` vs `date`.
- `ContentField` also gains `unique?: boolean` (present-only, applies to ANY field type — it is a
  field-level flag, not a per-type config). This reproduces the prototype inspector's **Unique**
  toggle (`SchemaBuilderPreview.tsx:139`, rendered right under Required). Declarative-only: it is
  persisted and surfaced but NOT enforced at the DB/route layer (the `content_types.schema` is
  jsonb; there is no per-entry uniqueness index) — see parent Open Question 5. Omit when falsy.
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
- **Unique toggle:** add a second `Switch` row immediately AFTER the existing "Required" row
  (`FieldEditor.tsx:688-696`), reusing that row's exact `flex … rounded-lg border p-3` markup:
  label **"Unique"**, helper "Value must be unique across entries.", bound to `field.unique`
  (`checked={field.unique ?? false}`, `onCheckedChange={(checked) => onChange({ ...field, unique:
  checked || undefined })}` so it stays present-only). Applies to every field type (not gated on
  `field.type`), matching the prototype's always-visible Unique row.

### 3. `schemaMapping.ts` — build + parse
- `fieldTypeMap` (`schemaMapping.ts:30`, typed `Record<FieldType, "string"|"number"|"boolean">`)
  gains `date: "string"`, `slug: "string"`. Because it is a `Record<FieldType, …>`, tsc forces
  both entries once the union widens (compile-time exhaustiveness guard). **Do NOT add a `format`
  field to `ContentSchemaProperty`** and do NOT emit `format` anywhere — see Security Contract.
- `buildSchemaFromFields` (the `fields.reduce` at `schemaMapping.ts:189`): `definition.type` for
  both types falls through to the existing `else { definition.type = fieldTypeMap[field.type]; }`
  arm (line 211-212) ⇒ `"string"`, no special-casing needed there. Persist config into the same
  `fieldConfig` object the number/media/relation blocks already build (assigned to
  `definition.xFieldConfig` at line 284-285 only when non-empty):
  - `date`: `if (field.type === "date" && field.date?.includeTime) fieldConfig.date = { includeTime: true };`
    (present-only — omit entirely when `includeTime` is falsy so existing schemas stay byte-identical).
  - `slug`: build `const slugConfig = { ...(field.slug?.source ? { source: field.slug.source } : {}),
    ...(field.slug?.editable === false ? { editable: false } : {}) };` and
    `if (field.type === "slug" && Object.keys(slugConfig).length > 0) fieldConfig.slug = slugConfig;`.
  - `unique` (ALL types): `if (field.unique) fieldConfig.unique = true;` — rides the SAME
    `fieldConfig`→`definition.xFieldConfig` object (assigned only when non-empty at line 284-285), so
    NO new property on `ContentSchemaProperty` and NO ajv keyword (`xFieldConfig` is already
    registered). Present-only: omitted entirely when `field.unique` is falsy so legacy schemas stay
    byte-identical.
  - `order` (ALL types — field-ORDER persistence, parent Open Question 6 / §Field-ORDER block below):
    `fieldConfig.order = index;` using the field's 0-based position in the `fields` array (the
    `fields.reduce` at :189 already exposes the index). This is the ONE key that is intentionally NOT
    present-only — a total order needs a value on every field — so `fieldConfig` is now non-empty for
    every field and `xFieldConfig` is emitted on every property (the :284-285 "only when non-empty"
    gate is always satisfied). Still NO new `ContentSchemaProperty` property and NO ajv keyword
    (`xFieldConfig` is registered); NO top-level `xFieldOrder` (would throw under ajv `strict:true`).
- `resolveFieldType(definition)` (`schemaMapping.ts:309`): **no new branch required.** The function
  already returns any `xFieldType` that is a key of `fieldTypeMap` at the very top
  (lines 310-313: `if (definition.xFieldType) { const candidate = String(definition.xFieldType)
  as FieldType; if (candidate in fieldTypeMap) return candidate; }`). Once `fieldTypeMap` gains
  `date`/`slug`, `xFieldType: "date"|"slug"` resolve automatically via that top check — do NOT add
  explicit `xFieldType === "date"/"slug"` branches (they would be **unreachable dead code**), and do
  NOT add a `format`-based fallback (no `format` is ever persisted, and `date`/`slug` are brand-new
  types so there are no legacy schemas carrying `format:"date"`).
- `fieldsFromSchema`: read back `date`/`slug` config into `field.date`/`field.slug` via small
  readers mirroring `readNumberConfig`/`readMediaConfig` (`readSlugConfig` reads
  `xFieldConfig.slug` → `{ source?, editable? }`; `readDateConfig` reads `xFieldConfig.date` →
  `{ includeTime? }`), each returning `undefined` when the config is absent so unrelated fields
  are untouched. Also read back `unique`: `unique: definition.xFieldConfig?.unique === true ? true :
  undefined` (present-only, all types).
- **Order-aware re-sort (field-ORDER persistence):** read the ordinal from the raw
  `definition.xFieldConfig?.order` (NEVER from the mapped field), pair each mapped field with its
  ordinal in a tuple, stable-sort the tuples, then project back to fields — so the returned
  `ContentField` objects are never mutated with a temp `order`/`__order` key:
  ```ts
  const ordered = Object.entries(schema.properties)
    .map(([name, def]) => ({
      order: typeof def.xFieldConfig?.order === "number" ? def.xFieldConfig.order : Number.POSITIVE_INFINITY,
      field: mapField(name, def),
    }))
    .sort((a, b) => a.order - b.order) // stable: missing order = Infinity → keeps Object.entries position, sorts AFTER ordered
    .map((t) => t.field);
  ```
  This makes the authored order survive Save→reload despite jsonb key-canonicalization. Do NOT surface
  `order` as a `ContentField` field — the ordinal lives ONLY on the sort tuple, never on the returned
  field; it is reconstructed from `xFieldConfig.order` on the next build (do NOT round-trip it onto `ContentField`).
- Round-trip invariant: `fieldsFromSchema(buildSchemaFromFields(fields))` preserves type +
  config for date/slug (513-06/unit test).

> **Field-ORDER persistence — DELIVERED by 513-02 via per-property `xFieldConfig.order` (resolves the
> 513-06 §1 CROSS-SUBTASK item; parent Open Question 6).** `content_types.schema` is a Postgres `jsonb`
> column (`core/db/schema.ts:688`) that canonicalizes object keys (length, then bytewise), and
> `ContentSchema` (schemaMapping.ts:23-31) carries no order array — `fieldsFromSchema` reads
> `Object.entries(schema.properties)` (~:389), so raw key order does NOT survive a Save→reload
> (verified empirically in 513-06 §1: `jsonb_build_object('title',1,'publishedAt',2,'urlSlug',3)` reads
> back `{title, urlSlug, publishedAt}`). A reorder control that silently discards its result would be a
> cosmetic shell (forbidden by the parent Goal), so 513-02 makes order **data, not key-position**:
> - **Build** (`buildSchemaFromFields`): write `fieldConfig.order = index` (0-based array index) for
>   **every** field, so `definition.xFieldConfig.order` records the authored position. Because `order`
>   is always present, `xFieldConfig` is now emitted for every property (the line 284-285 "only when
>   non-empty" gate is always satisfied) — this is the ONE key that is intentionally NOT present-only
>   (a total order needs a value on every field); `unique`/`date`/`slug` stay present-only as before.
> - **Read** (`fieldsFromSchema`): after building the `Object.entries(schema.properties)` list, do a
>   **stable sort by `xFieldConfig.order`** (numeric ascending; fields lacking `order` keep their
>   `Object.entries` position and sort AFTER ordered ones — a stable sort with `order ?? Infinity`).
>   This makes jsonb key-canonicalization irrelevant: authored order round-trips regardless of how
>   Postgres reorders the keys.
> - **No ajv/keyword change:** `order` rides the already-registered `xFieldConfig` keyword — NO top-level
>   `xFieldOrder` (it would be an unknown keyword under `assertContentSchema`'s `new Ajv({ strict:true })`
>   at validation.ts:3 and THROW on compile — the same wall we avoid for `format`), NO `validation.ts`
>   edit, NO 513-01 normalizer change (schema is validated by `assertContentSchema`, which already
>   accepts `xFieldConfig`).
> - **Byte-identity (honest):** because `order` is written for every field, a schema re-saved after this
>   ships gains `xFieldConfig.order` on each property (additive, ajv-safe). **Legacy schemas without
>   `order` are unaffected on READ** — the `order ?? Infinity` fallback keeps their existing jsonb-canonical
>   order exactly as today, so there is no read regression.
>
> Consequently 513-03/513-05 reorder PERSISTS (marking the editor dirty is correct — the change survives
> Save→reload) and 513-06 asserts EXACT round-tripped order.

### 4. `entries/FieldRenderer.tsx` — render the value input
Add `case "date":` and `case "slug":` to the field `switch` (currently text/richtext/number/
boolean/select/media/relation, lines ~221-379):
- `date`: an `<input type="date">` (or `datetime-local` when `field.date?.includeTime`) bound to
  the entry value; store ISO string. Reuse the existing text-field wrapper/label/help/error
  markup pattern from the `text` case.
- `slug`: a plain **editable** text input that slugifies on blur (reuse `slugifyFieldName` from
  SchemaBuilder), writing a URL-safe controlled string. **`field.slug.source`/`field.slug.editable`
  are DECLARATIVE-only here** (persisted + surfaced in the FieldEditor authoring UI, NOT entry-time
  auto-derived) — mirroring how 513-02 already scopes the `unique` flag as declarative-only. Do NOT
  attempt to derive the value read-only from the source field's current value: `FieldRenderer`'s
  props are `{ field, value, onChange, relationTargets?, display? }` (`FieldRenderer.tsx:20-26`)
  with **NO access to sibling/entry values**, and its sole caller passes only
  `value={values[field.name]}` (`EntryEditor.tsx:898-904`). Threading a source value would require
  editing `entries/EntryEditor.tsx` to add a sibling-values prop — and `EntryEditor.tsx` is OUTSIDE
  513-02's sole-writer set (§Scope lists only `SchemaBuilder`/`FieldEditor`/`schemaMapping`/
  `FieldRenderer`), so entry-time auto-derive-from-source is NOT deliverable within scope. It is a
  deliberate FUTURE enhancement gated on an explicit `EntryEditor` prop addition, not shipped here.
- **Change the `default:` arm** — it currently `return null` (renders nothing;
  `FieldRenderer.tsx:407-408`). Change it to fall back to a text input so unknown future types render
  an editable value instead of vanishing. (This is a NEW change, not a preservation.) NB: the scope's
  "downstream consumers already treat unknown field types as passthrough (text-like)" claim (§Scope
  above) refers to `entries/EntryEditor.tsx` / `custom-screens/*`, NOT to this switch's current
  `null` default.

---

## Testing requirements (lanes + shared-DB safety)

**Vitest pure lane** (`tests/vitest/**`, no Bun/DB):
- `schemaMapping` round-trip: a field list containing `date` (with/without includeTime) and `slug`
  (with/without source) survives `build → fields` unchanged; the built `date` property has
  `type:"string"`, `xFieldType:"date"`, **no `format` key**, and `xFieldConfig.date.includeTime`
  only when set; the built `slug` property has `type:"string"`, `xFieldType:"slug"`, and
  `xFieldConfig.slug` only when source/editable is set. A field with `unique: true` round-trips
  (`xFieldConfig.unique === true`, read back to `unique: true`); `unique` omitted when falsy.
- **Field-ORDER round-trip (mandatory — parent Open Question 6):** pass a fields list to
  `buildSchemaFromFields` in a REORDERED sequence; assert each built property carries
  `xFieldConfig.order` = its new array index, and that `fieldsFromSchema(built)` reads the fields
  back in that reordered sequence (compare `.map(f => f.name)`), proving order survives independent
  of jsonb key-canonicalization. Also assert a legacy-shaped schema whose properties carry NO `order`
  reads back in `Object.entries` order (the `order ?? Infinity` fallback → no read regression), and
  that `order` is NOT surfaced onto the returned `ContentField` objects.
- `resolveFieldType`: `xFieldType:"date"` resolves to `date`, `xFieldType:"slug"` resolves to
  `slug` (both via the existing top-of-function `in fieldTypeMap` check), and a plain
  `type:"string"` with no `xFieldType` still resolves `text`.
- **Schema-persistence regression (mandatory — guards the ajv-strict break):** run
  `buildSchemaFromFields([<a date field, a slug field>])` and assert its output passes
  `assertContentSchema(schema)` (from `core/services/content/validation.ts`, 1-arg signature at
  validation.ts:33) WITHOUT throwing, then feed a sample entry
  (`{ "published-at": "2026-07-05", "slug": "hello-world" }`) through
  `validateEntryData("<unique-test-typeId>", schema, entry)` and assert it validates. **Note the real
  signature is `validateEntryData(typeId, schema, data)` (validation.ts:72) — 3 args, typeId FIRST.**
  Because `getEntryValidator` (validation.ts:63-69) memoizes the compiled validator in a module-level
  `validatorCache` keyed by `typeId`, use a UNIQUE `typeId` per test (or call
  `invalidateValidator(typeId)` from validation.ts:59 in setup/teardown) so a stale validator is not
  returned across tests. This proves the built schema actually persists under
  `new Ajv({ strict: true })` (which would throw on a stray `format` keyword) — the pure
  `build → fields` round-trip alone does NOT exercise ajv and would miss that break.

**Vitest admin/UI lane** (`tests/vitest/ui/**`):
- `FieldEditor` renders the Date "Include time" switch and Slug "Derive from" select when the
  respective type is selected; toggling updates `field.date`/`field.slug` present-only.
- `FieldEditor` renders the "Unique" switch for every field type; toggling it on sets
  `field.unique: true` and toggling off removes the key (present-only).
- `FieldRenderer` renders a `type="date"` input for a date field and a slugifying input for a slug
  field; entering a value calls `onChange` with the expected shape.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` (the
`Record<FieldType,…>` in FieldEditor + `fieldTypeMap` are compile-time exhaustiveness guards —
tsc fails if a new arm is missing).

---

## UI/UX-fidelity & max-config-flexibility notes

Matches the prototype field list (`Slug`, `Published at` Date —
`advanced/ContentTypeEditorPreview.tsx:23`/`:28`) and the SchemaBuilder rail's Date icon
(`advanced/SchemaBuilderPreview.tsx:110`). **Fidelity nuance (honest):** the SchemaBuilder inspector
in the prototype offers **Date** as a choosable type (rail :110, dropdown :131) but does NOT offer
**Slug** — neither the rail (:107-114) nor the type dropdown (:128-135) lists it; Slug appears only
as an existing field's read-only type badge (in the ContentTypeEditor Fields tab, and as an
entry-side input at `EntryEditorPreview.tsx:42` / `PostEditorPreview.tsx:86`). So `date` is a 1:1
reproduction of a prototype-selectable type, while adding `slug` to FieldEditor's dropdown (and
513-05's palette) is a **deliberate extension** that surfaces Slug as first-class for
max-config-flexibility — the prototype's badge value is made real as a selectable type.
Flexibility: slug supports free-text OR derive-from-source with an editable override; date
supports date OR datetime — all present-only so existing schemas are unchanged. Integrate the new
config blocks using the SAME card/switch/select styling already used by the number/media blocks
(no new visual idiom).
