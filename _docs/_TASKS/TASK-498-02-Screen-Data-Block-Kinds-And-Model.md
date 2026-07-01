# TASK-498-02: Screen Data Block Kinds + Model
# FileName: TASK-498-02-Screen-Data-Block-Kinds-And-Model.md

**Priority:** Medium
**Category:** Custom Screens / Screen Model / Admin UI / Screen Builder
**Estimated Effort:** Large
**Dependencies:** TASK-498-01 (look parity + palette shell)
**Status:** ⏳ To Do
**Parent Task:** TASK-498

---

## Overview

Add the data-oriented block/section kind set to the screen model and editor: extend
`ScreenBlockKind`, add per-kind factories, add a **per-kind, schema-first, reject-unknown
`data` normalization** layered into `normalizeScreenBlock` (with NO `ScreenDocumentV1`
schema-version bump and NO definition version bump — backward-compatible with stored V4
screens), add per-kind inspector controls + bound-field filtering, and add the static
runtime render branches for the non-relation new kinds. The Related-list capability +
entry/front rendering are split into TASK-498-03.

New kinds: `heading`, `text`, `stat`, `divider`, `image`, `related-list`, `tabs`, `button`
(promote the dead `actions` placeholder to a real `button`). `field`, `record-header`,
`field-group`, `columns`, `rich-text` already exist and stay.

- **Goal:** the 9-chip palette inserts real, typed blocks; each new kind has a normalized,
  reject-unknown `data` shape and a per-kind inspector; `heading/text/stat/divider/image/
  button/tabs` render in builder/entry/preview; bindings flow through the existing
  allow-list. No storage migration.
- **Owning module/service:**
  `core/services/customScreens/screenDocumentOps.ts` (`ScreenBlockKind`, `screenBlockLabels`,
  `createScreenBlock`),
  `core/services/customScreens/customScreenSchemas.ts` (`normalizeScreenBlockData` in
  `normalizeScreenBlock`),
  `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` (per-kind controls + bound-field
  filtering),
  `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` (new render branches),
  `core/admin/ui/custom-screens/ScreenBlockLibrary.tsx` (wire the 9 chips → `onAddBlock`),
  `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (`handleAddBlock` passes
  `relationTarget: field?.relation?.target` into `createScreenBlock`).
- **Source-of-truth / anchors:** `ScreenBlockKind :10-17`, `screenBlockLabels :37-45`,
  `createScreenBlock :64-177` (`field` branch `:82-105`) in `screenDocumentOps.ts`;
  `normalizeScreenBlock :424-488`, `rejectUnknownKeys :232-236`, block-key allow-list
  `:426-438`, `normalizeScreenData :386-391`, `normalizeJsonValue :315-332`, `schemaVersion`
  pinned to `1` (`:136-139, :531-546`), `normalizeCustomScreenEditorViewDefinitionV4
  :1196-1226`, `getAllowedBindingFieldRoots :269-273`, `systemListFields :207-214`,
  `normalizeScreenFieldBinding :579-606` in `customScreenSchemas.ts`; `ContentField`
  (`SchemaBuilder.tsx:165`, `relation?: { target; multiple } :176`); prototype
  `CustomScreenEditorPreview.tsx` (palette `:234-246`, inspector `:250-296`).
- **Out of scope:** Related-list resolution + entry/front rendering of related entries
  (TASK-498-03). No schema-version bump, no DB migration, no route/RBAC change.

---

## Security Contract

**Schema-first / reject-unknown / backward-compatible.** The change adds a per-kind `data`
normalizer that rejects unknown keys within the new kinds' `data` (honoring strict
reject-unknown) while legacy kinds keep their permissive `normalizeScreenData` so existing
stored V4 screens read back identically. **No route, endpoint-visibility, auth, RBAC, CSRF,
or rate-limit change** — no binding endpoint is touched. Bindings for the new kinds still
flow through `normalizeScreenFieldBinding` (allow-list + `blockId ∈ document`); display
kinds use `mode:"read"`, only `field`/editable header use `readwrite`. `ScreenDocumentV1.
schemaVersion` stays `1`; definition `schemaVersion` stays `4`. New block `type` strings are
already storage-valid (`type` is any non-empty string, `data` is free JSON guarded only at
the block-key level), so this is non-destructive.

---

## Implementation Pseudocode

### B1 — extend the kind set (`screenDocumentOps.ts`)

```ts
export type ScreenBlockKind =
  | "record-header" | "field" | "field-group" | "columns" | "rich-text"
  | "heading" | "text" | "stat" | "divider" | "image" | "related-list" | "tabs" | "button"
  | "legacy-widget";              // drop "actions" from the union — promoted to "button"

// `screenBlockLabels` is `Record<ScreenBlockKind, string>`, so it MUST stay key-exact to
// the union: REMOVE the existing `actions: "Actions"` key (current `:43`) and ADD `button`.
// Keeping an `actions` key after `actions` leaves the union is an excess-property error
// (TS2353 / `@typescript-eslint`) that fails `bun --cwd core lint:types`.
export const screenBlockLabels: Record<ScreenBlockKind, string> = {
  "record-header": "Record Header",
  field: "Field",
  "field-group": "Field Group",
  columns: "Columns",
  "rich-text": "Rich Text",
  heading: "Heading", text: "Text", stat: "Stat", divider: "Divider",
  image: "Image", "related-list": "Related list", tabs: "Tabs",
  button: "Button",               // replaces the removed `actions: "Actions"` key
  "legacy-widget": "Legacy Widget",
};
// Stored `type:"actions"` blocks are remapped to `button` by the read-path repair
// (TASK-498-04); the canvas/label lookup keeps its existing fallback for any stored
// `type` string that is not in the union (e.g. a not-yet-repaired `actions`).
```

### B2 — per-kind factories (`createScreenBlock :64-177`)

**Factory-signature extension (required for `related-list`).** Today `createScreenBlock`
receives only `{ type, id?, field?, label?, mode? }` where `field` is a field-NAME string
(`:64-70`); it has no access to the relation's `target`, so `related-list` cannot set
`data.target` from inside the factory. Extend the input with an optional
`relationTarget?: string` and have the sole caller pass it from the `ContentField` it
already holds — `CustomScreenEditorPage.handleAddBlock(type, field?: ContentField)`
(`CustomScreenEditorPage.tsx:427-433`) currently calls `createScreenBlock({ type, field:
field?.name, label: field?.label })`; add `relationTarget: field?.relation?.target` to that
call (`ContentField.relation.target`, `SchemaBuilder.tsx:176`). The `related-list` branch
then sets `data.target = input.relationTarget ?? ""` (the inspector can re-derive/override
it later when the bound field changes — see B4). No other caller passes the new arg, so it
stays optional and backward-compatible. (Add `CustomScreenEditorPage.tsx` to this leaf's
touched files for the one-line `handleAddBlock` change.)

Add a branch per new kind emitting `{ block, bindings }`, mirroring the `field` branch:

```ts
// heading (static text or bound):  data: { text, level: 1|2|3, align: 'left'|'center'|'right' }
//   bindings: input.field ? [{ propPath:'text', field, mode:'read' }] : []
// text:        data: { content, tone: 'default'|'muted' };  bindings: []
// stat:        data: { label, format:'number'|'percent'|'money', trend:'auto'|'up'|'down'|'flat' }
//   bindings: input.field ? [{ propPath:'value', field: input.field, mode:'read' }] : []
//             (GATE on input.field — like heading/related-list/button. A chip-inserted stat
//              has NO field [B4 bound chip → focus Bound-field], so emit NO binding here and let
//              the inspector create the read-mode binding. Do NOT emit a placeholder-field
//              binding: `field: input.field ?? <numberField>` would write an unresolved field
//              that fails normalizeScreenFieldBinding's normalizePath/allow-list on save
//              [customScreenSchemas.ts:240,591-594].)
//             (+ optional delta binding { propPath:'delta', field, mode:'read' } ONLY when a
//              deltaField is set; never a placeholder)
// divider:     data: { variant:'line'|'space'|'label', ...(label ? { label } : {}) };  bindings: []
// image:       data: { label, fit:'cover'|'contain', ...(ratio ? { ratio } : {}) }
//   bindings: input.field ? [{ propPath:'src', field: input.field, mode:'read' }] : []
//             (GATE on input.field — chip-inserted image has NO field; the inspector creates the
//              read-mode binding. No placeholder-field binding, same reason as stat above.)
// related-list: data: { label, target: input.relationTarget ?? "", displayField, variant:'checklist'|'activity'|'cards', limit }
//   data.target comes from input.relationTarget (= field.relation.target, passed by handleAddBlock)
//   bindings: input.field ? [{ propPath:'items', field: input.field, mode:'read' }] : []  // TASK-498-03 resolves
// tabs:        data: { tabs: [{ id:'tab-1', label:'Tab 1' }, { id:'tab-2', label:'Tab 2' }] }
//   slots: { 'tab-1': [], 'tab-2': [] };  bindings: []
// button (promote actions): data: { label, action:'link'|'publish'|'custom', variant,
//   ...(href ? { href } : {}) };  bindings: input.field ? [{ propPath:'href', field, mode:'read' }] : []
```

Each binding id uses the existing `slugify(`${id}-${propPath}`)` convention; every emitted
binding still satisfies `normalizeScreenFieldBinding` (allow-listed field root + `blockId`
in document). For `related-list`/`stat`/`image`, the host (inspector) picks the field; the
palette chip inserts the block then focuses the Bound-field control (see B4).

### B0 — per-kind `data` normalization (`customScreenSchemas.ts`, NO version bump)

Layer a `normalizeScreenBlockData(type, data)` into `normalizeScreenBlock :424-488` so the
NEW kinds are schema-first/reject-unknown while LEGACY kinds fall through to the existing
permissive `normalizeScreenData`:

```ts
const screenBlockDataAllowedKeys: Record<string, readonly string[]> = {
  heading: ["text", "level", "align", "field"],
  text: ["content", "tone", "label"],
  stat: ["label", "format", "trend", "deltaField", "field"],
  divider: ["variant", "label"],
  image: ["label", "fit", "ratio", "field"],
  "related-list": ["label", "target", "displayField", "variant", "limit", "field"],
  tabs: ["tabs"],
  button: ["label", "action", "variant", "href", "field"],
};

const normalizeScreenBlockData = (type: string, value: unknown): Record<string, unknown> => {
  const data = normalizeScreenData(value);              // existing JSON-safe normalize :386-391
  const allowed = screenBlockDataAllowedKeys[type];
  if (!allowed) return data;                            // legacy kinds: permissive (backward-compat)
  rejectUnknownKeys(data, allowed);                     // throws "custom_screen_definition_invalid"
  // coerce enums to their allow-lists (level ∈ 1|2|3, align ∈ left|center|right,
  // format ∈ number|percent|money, trend ∈ auto|up|down|flat, tone ∈ default|muted,
  // variant per kind, fit ∈ cover|contain, action ∈ link|publish|custom, limit = clamped int);
  // tabs.tabs = array of { id, label } with unique ids matching slot keys.
  return data;
};
// In normalizeScreenBlock, replace `data: normalizeScreenData(value.data)` with
// `data: normalizeScreenBlockData(type, value.data)`. The block-key allow-list (:426-438)
// is UNCHANGED. schemaVersion stays 1; the V4 editor-view validator (:1196-1226) is unchanged
// (still only checks blockId-in-document + field-root allow-list) — new kinds validate freely
// today and now additionally enforce their own data shape.
```

> Backward-compat assertion: a stored V4 screen whose blocks are legacy kinds (or whose new
> kinds carry only allow-listed keys) must `normalizeScreenDocumentV1`/`...ForRead` to a
> byte-stable document. Do NOT add the per-kind reject to legacy kinds.

### B4 — inspector per-kind controls + bound-field filtering (`ScreenBlockInspector.tsx`)

The flat inspector (from TASK-498-01) keeps the Bound-field `Select` as a first-class row.
Add per-kind control rows and filter the field options per kind via `buildFieldOptions`
(`:88-98`):

```ts
// Filter FieldOption by kind:
//   stat         → number fields only
//   image        → media fields only
//   related-list → relation fields only (and derive data.target from field.relation.target)
//   field/heading/button → all fields (current behavior)
// Per-kind control rows (InspectorRow + Select/Input/Switch):
//   heading: level (1/2/3), align (left/center/right), optional bound field
//   text: tone (default/muted)
//   stat: format (number/percent/money), trend (auto/up/down/flat), optional deltaField
//   divider: variant (line/space/label) + label when variant==='label'
//   image: fit (cover/contain), optional ratio
//   related-list: target (read-only, derived), displayField (Select over target schema or
//     free path), variant (checklist/activity/cards), limit (number)
//   tabs: add/remove tab rows (id+label) — keep slots in sync with data.tabs
//   button: action (link/publish/custom), variant, href (when action==='link')
// Reuse existing onPatchBlockData / onPatchBinding; no new handler signatures.
//
// BOUND-FIELD-CHANGE WIRING (load-bearing — NOT optional). The bound chips
// (field/stat/image/related-list) insert the block with NO field (palette → onAddBlock(kind)
// → focus Bound-field), so the binding + data.target are FIRST set HERE in the inspector, not
// in the factory.
//   0. PER-KIND BOUND-FIELD propPath (load-bearing — must match the B2 factory binding AND the
//      498-03 resolver lookup). FieldBindingControls takes an EXPLICIT `propPath` prop
//      (ScreenBlockInspector.tsx:257 record-header→"title", :289 field→"value"); each bound
//      kind's Bound-field control MUST pass the propPath the B2 factory + normalizer + renderer
//      use for that kind — DO NOT copy the field branch's `propPath="value"` for every kind:
//        field         → propPath "value"   (readwrite)
//        record-header → propPath "title"   (readwrite)
//        heading       → propPath "text"
//        stat          → propPath "value"
//        image         → propPath "src"
//        button        → propPath "href"
//        related-list  → propPath "items"   ← MUST be "items", NOT "value"
//      The related-list Bound-field control MUST render FieldBindingControls with
//      `propPath="items"` (matching the B2 `{ propPath:'items', ... }` binding and the 498-03
//      host precompute lookup `bindings.find(bd => bd.blockId===block.id && bd.propPath==="items")`,
//      498-03:232). Binding it on `value` (the field-branch copy) creates an orphan binding the
//      resolver never finds → the related-list renders a SILENT perpetual empty state (no error,
//      lint/types clean). This is why the regression shape below pins `propPath === "items"`.
// Two things the generic onPatchBinding does NOT do on its own:
//   1. DISPLAY-KIND BIND MODE = read. createScreenFieldBinding defaults a brand-new binding to
//      "readwrite" (ScreenBlockInspector.tsx:83) and handlePatchBinding creates it with
//      `mode: patch.mode` (CustomScreenEditorPage.tsx:518-523), while the Bound-field control's
//      onValueChange today sends only `{ field }` (ScreenBlockInspector.tsx:126-128). So a
//      freshly-bound stat/image/related-list (and a read-only heading) would land as readwrite,
//      contradicting the B2/Security "display kinds use mode:read" rule. The display-kind
//      Bound-field control MUST pass the mode explicitly:
//      onPatchBinding(block.id, propPath, { field, mode: "read" }); only `field` (and an
//      editable header bound to `title`) stay readwrite. Use THIS single kind-based convention:
//      the inspector's display-kind Bound-field control passes `mode: "read"` EXPLICITLY; only
//      `field` (and an editable header bound to `title`) bind `readwrite`.
//      (Do NOT instead default the mode by propPath. That alternative is INVALID: `stat` binds
//      propPath `value` with `mode:'read'` (B2 :124) while `field` binds the SAME propPath `value`
//      with `mode:'readwrite'` (screenDocumentOps.ts:99,102), so a propPath-keyed default
//      (value → readwrite) would land a freshly-bound `stat` as readwrite — exposing inline
//      write-back to the bound number field at runtime, violating the Security Contract / "display
//      kinds use mode:read" rule and the kind's display-only intent, and FAILING the pinned
//      regression assertion below that a bound `stat` yields `mode === "read"`. propPath `value`
//      is shared by `field` (readwrite) and `stat` (read) and cannot disambiguate them.)
//   2. RELATED-LIST data.target SYNC. handlePatchBinding mirrors the bound field into
//      block.data ONLY when `propPath === "value"` (CustomScreenEditorPage.tsx:530-540) — it
//      does NOT fire for related-list's `items` propPath, so changing the bound field would
//      never set data.target, leaving it "" from the no-field chip insert and making the 498-03
//      resolver return [] (empty "No related …" state, no error). The related-list Bound-field
//      control MUST therefore ALSO call, on every change,
//      onPatchBlockData(block.id, { target: <relationField>.relation.target }) deriving the
//      target from the selected field. buildFieldOptions strips relation info (it maps
//      field→{value,label,type}, :88-98), but the inspector already holds the full
//      `fields: ContentField[]` prop, so resolve target =
//      fields.find((f) => f.name === field)?.relation?.target (ContentField.relation.target,
//      SchemaBuilder.tsx:176). Do NOT rely on the factory's data.target for chip-inserted
//      related-lists (it is "" when no field was passed at insert).
```

> **Cross-note (498-01 A4 dependency — read before touching the inspector tests).** The visible
> binding-mode "Interaction" `Select` (`ScreenBlockInspector.tsx:142-163`) and the "Advanced style"
> style-MODAL (`:367-384`, `[data-screen-style-dialog="true"]`) are DROPPED by the 498-01 A4 flatten,
> and the `panel` prop collapses to a single `panel="all"` body. Display-kind mode is set HERE via
> `onPatchBinding(..., { field, mode: "read" })`, NOT a user toggle — do NOT re-introduce an
> "Interaction" Select (or the style modal) to satisfy a test. The two suites that rendered
> `ScreenBlockInspector` directly and asserted the old "Interaction" row / "Advanced style" modal
> (`custom-screen-binding-panel.test.tsx`, `custom-screen-editor-binding-flow.test.tsx`) are
> STRUCTURALLY re-pointed in 498-01's Testing section (switched to `panel="all"`); THIS leaf adds
> only the BEHAVIORAL assertions on that already-flattened `panel="all"` inspector — binding a
> display kind (stat/image/related-list) via the Bound-field control yields `mode === "read"`, and a
> related-list bound to a relation field also syncs `data.target` (see Regression-test shape below).

Bound chips in the palette (`field`/`stat`/`image`/`related-list`) call `onAddBlock(kind)`
then focus the Bound-field control; presentational chips insert directly (wired in
`ScreenBlockLibrary.tsx` + `ScreenAuthoringCanvas`'s `onAddBlock` path, which already routes
through `CustomScreenEditorPage.handleAddBlock` → `addScreenBlock` + binding append).

### B-runtime — static render branches (`ScreenRuntimeRenderer.tsx`)

Add a render branch per non-relation new kind, alongside the existing branches
(`record-header :327-388`, `field :390-476`, `field-group :478-490`, `columns :492-498`,
`rich-text :500-512`, legacy fallback `:514-527`). Honor the TASK-498-01 builder/entry split:

```tsx
// heading: <h1/h2/h3> by data.level + align; builder mode → Token({{ label }}) when bound,
//   else the static text; entry/preview → resolved value or static text.
// text: muted/default paragraph from data.content (entry/preview); builder → static text.
// stat: metric card (label + big value + trend chip); builder → Token; entry/preview →
//   resolved number formatted per data.format.
// divider: <hr> (line) / spacer (space) / labelled rule (label).
// image: <img> via media resolve (entry/preview); builder → placeholder + Token.
// button: CTA button (label/variant); link action uses resolved href; builder → static.
// tabs: tabbed container rendering child blocks from slots keyed by data.tabs[].id
//   (reuse renderSlots-style child rendering; one slot per tab id).
// related-list: render branch is added in TASK-498-03 (needs the resolver); in THIS leaf,
//   render a builder-mode skeleton (prototype CustomScreenEditorPreview.tsx:164-183) and a
//   neutral placeholder in entry/preview until 498-03 wires relatedEntries.
// Unknown type still hits the existing legacy placeholder (:514-527).
```

**Data flow:** `createScreenBlock` (new branches) → `addScreenBlock` appends block + bindings
→ `normalizeScreenBlock`/`normalizeScreenBlockData` validate on save → `ScreenRuntimeRenderer`
renders per kind. Inspector edits go through `onPatchBlockData`/`onPatchBinding` →
`updateScreenBlock`/binding upsert (existing `CustomScreenEditorPage` handlers `:486-540`).

**Error handling:** `normalizeScreenBlockData` throws `custom_screen_definition_invalid` on
unknown keys / bad enums for new kinds (caught by the existing read-repair `...ForRead`
fallbacks); legacy kinds never throw on extra keys. No new UI error states.

**Regression-test shape:** `createScreenBlock` for each new kind emits expected `block.data`
+ `bindings`: the bound display kinds (`stat`/`image`/`related-list`/bound `heading`/`button`)
emit a SINGLE `mode:'read'` binding ONLY when a `field` is supplied and emit NO binding when
chip-inserted WITHOUT a field (assert no placeholder-field binding is produced — it would fail
`normalizeScreenFieldBinding` on save); `related-list` WITH a relation field emits an `items`
binding + derived `target`; `tabs` emits two slots matching `data.tabs`; `divider`/`text` emit
no binding; `normalizeScreenBlockData`
rejects an unknown key within a new kind's `data` (throws) but accepts an unknown key on a
legacy kind (backward-compat); the V4 editor-view validator still enforces blockId-in-doc +
field-root allow-list; `schemaVersion` stays `1`/def `4`; a stored V4 screen round-trips
byte-stable; the renderer renders each static new kind in builder (Token/skeleton) and
entry/preview (value). Inspector bound-field-change wiring (`custom-screen-binding-panel` /
`custom-screen-editor-binding-flow`, both rendering the FLATTENED `panel="all"` inspector — no
"Interaction" Select, no style modal, per the 498-01 A4 re-point): binding a display kind
(stat/image/related-list) via the Bound-field control creates the binding with `mode === "read"`
(NOT readwrite); binding a
`related-list` to a relation field creates a binding whose `propPath === "items"` (NOT `"value"` —
matching the B2 factory binding + the 498-03 resolver lookup; a `value`-propPath binding would be
orphaned and render a silent empty state) and ALSO sets `data.target` to that field's
`relation.target`
(asserts the `items`-propPath path syncs `data.target`, since `handlePatchBinding` only
auto-syncs `data` for `propPath === "value"`); `field` (and an editable header bound to
`title`) still bind `readwrite`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/customScreens/screenDocumentOps.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/bindingResolver.test.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- **Boundary suite must stay green:** `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
  guards `ScreenRuntimeRenderer.tsx` + `CustomScreenEditorPage.tsx` (both edited in this leaf)
  against `@/ui/pages` / `ui/pages/builder` / `@/ui/widgets` / `WidgetRenderer` imports (`:53-75`).
  The new render branches must render with local soft-token markup + lucide icons only — do NOT
  pull a Pages widget renderer or `@/ui/pages` helper to render `stat`/`image`/`button`/`tabs`.
  Running it in the per-leaf gate catches a forbidden import here, not only at 498-04's full-dir run.
- Add a dedicated `ScreenRuntimeRenderer` suite
  `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` (new file): builder
  mode renders the corner tag + `{{ label }}` Token (no live value / no Editable/Read/Unbound
  badge) for bound kinds; entry/preview render the resolved value; `divider`/`tabs` render
  with no binding; `heading`/`stat`/`image`/`button` render per kind; unknown `type` still
  hits the legacy placeholder (`:514-527`). (The `related-list` resolved-rows cases land in
  TASK-498-03's renderer assertions.)
- All other `tests/vitest/customScreens/*` and `tests/vitest/ui*/custom-screen*` suites must
  stay green (do not weaken the existing reject-unknown / round-trip / allow-list assertions).
- `bun --cwd core lint` + `bun --cwd core lint:types` clean — the union/labels change leaves
  no excess `actions` key and no unused symbol.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- The per-kind `data` schema table is documented in TASK-498-04 (`_docs/CONTENT_TYPES_SPEC.md`
  or a screens contract doc); cross-link from the closure changelog.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-498** + **TASK-498-02**, stating
  explicitly that no schema-version bump or DB migration was required.
