# TASK-513: Engine (Content Type Editor) — Prototype-Fidelity Editor

# FileName: TASK-513_Engine_Content_Type_Editor_Prototype_Fidelity.md

**Priority:** High
**Category:** Admin UI / Content (Engine / Content Types) / Editor Fidelity / Schema Extension
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Closure Changelog (pinned):** 1225

---

## Goal

Bring the Engine **content-type editor** to prototype fidelity with the **same editor
ergonomics as the POST editor**, full functionality (not a cosmetic shell), and DB schema
extensions where the prototype implies richer content-type configuration. Maximum
configuration flexibility; every new control integrated cleanly into the prototype UI/UX.

Prototype source of truth (read, do not screenshot-guess):
- `_docs/_PROTOTYPE/src/pages/advanced/ContentTypeEditorPreview.tsx` (the editor) — live at
  `http://localhost:5180/#/advanced/engine/sample`
- `_docs/_PROTOTYPE/src/pages/advanced/SchemaBuilderPreview.tsx` (the visual schema builder)
  — live at `http://localhost:5180/#/advanced/engine/sample/schema`
- `_docs/_PROTOTYPE/src/pages/advanced/EnginePage.tsx` (the landing grid) — already matched by
  the current `ContentTypeList` (out of scope except where noted).

Current implementation (verified fresh 2026-07-05):
- Editor: `core/admin/ui/content-types/ContentTypeEditor.tsx` (route `/advanced/engine/:id`,
  wired at `core/admin/app/AdminApp.tsx:668-672`, lazy in `adminRouteComponents.tsx:112-114`).
- Field model + panels: `SchemaBuilder.tsx` (`ContentField`/`FieldType` types, `FieldsListPanel`,
  `FieldSettingsPanel`, `validateFieldName`), `FieldEditor.tsx` (per-type config UI).
- JSON-Schema mapping: `schemaMapping.ts` (`buildSchemaFromFields`/`fieldsFromSchema`,
  `xFieldType`/`xFieldConfig`/`xRelationTarget` extension keys, `countSchemaFields`).
- Visual builder page: `SchemaBuilderPage.tsx` (route `/advanced/engine/:id/schema`) — currently
  a **non-functional** preview (Save disabled, Add-field disabled).
- Backend: `core/server/routes/contentTypeRoutes.ts`, `core/services/content/typeService.ts`
  (`normalizeContentType{Name,Slug,Status}`, `createContentType`/`updateContentType`/
  `duplicateContentType`/`deleteContentType`), `core/server/validation/contentSchemas.ts`
  (`contentTypeCreate/Update/DuplicateSchema`, all `additionalProperties: false`),
  `core/services/content/validation.ts` (ajv `assertContentSchema` + `x*` keywords).
- Client: `core/admin/services/contentTypesClient.ts` (`ContentTypeSummary`, cache upsert/
  invalidate, `cacheKeys.contentType*`).
- DB: `core/db/schema.ts:684-692` — `content_types(id, name, slug, schema jsonb, status,
  createdAt, updatedAt)`. Entry consumer: `core/admin/ui/entries/FieldRenderer.tsx`
  (renders text/richtext/number/boolean/select/media/relation — **no date, no slug**).

---

## Prototype vs current — REAL gap analysis (source + live :5180 vs :5173, screenshots in `_docs/_workflows/_smoke/wf513-*.png`)

1. **Editor shell / structure mismatch (largest gap) — re-layout + additions, NOT greenfield.**
   The prototype editor is an **in-page** layout (breadcrumb `Engine › Article` + type-name title
   + `Boxes` icon + `Open schema` (outline) & `Save` actions), **underline Tabs** `Fields (8) ·
   Relations (2) · Settings · Permissions`, then a `lg:grid-cols-[1fr_300px]` grid: LEFT
   `SectionCard "Fields"` with an `Add field` action and a **field list** (each row:
   `GripVertical` drag handle, name, type `Badge`, `MoreHorizontal` actions menu); RIGHT a
   `Card "Type settings"`.

   **Current baseline (per element — the editor is already partly prototype-aligned; do NOT treat
   as greenfield):** `ContentTypeEditor.tsx` ALREADY has (a) a working `EditorTab =
   "fields"|"relations"|"settings"` union (`:42`) rendered as **`<Tabs><TabsList variant="line">`**
   (`:591-607`) — the admin's **`line`** variant IS the prototype's `variant="underline"` visual
   (the admin `components/ui/tabs.tsx` only exposes `variant: "default"|"line"`, no literal
   `"underline"`; the underline pill is the `line` variant's `after:` active bar), with per-tab
   count badges already wired (`fields.length`, `relationFields.length`); (b) a
   `SectionCard title="Fields"` whose description is verbatim the prototype's *"Drag to reorder.
   Click a field to edit it."* plus a `variant="soft"` **`Add field`** action (`:611-618`); (c) a
   functional **Relations** tab listing relation fields (`:645-680`); (d) a **Settings** tab with
   Name/Slug inputs, a Taxonomies card, and a Danger Zone (`:682-774`); (e) dirty-tracking
   (`hasUnsavedChanges`), cross-tab remote-update reconcile, field remove + undo, duplicate/delete.
   What is WRONG vs prototype: the whole thing is wrapped in the full-screen **`EditorShell`**
   chrome (`:437` — left `FieldsListPanel` rail + right `ContentTypePreviewPanel` **Schema Preview**
   + a sticky action toolbar with generic title `"Content Type Editor"` `:460`), the Fields tab
   renders `FieldSettingsPanel` (inline single-field editor) instead of the prototype ROW list, and
   there is no Type-settings card and no Permissions tab.

   → 513-03 is a **re-layout + additions** that MUST PRESERVE the existing tabs, dirty-state,
   Relations content, remote-reconcile, and delete/duplicate handlers — not a from-scratch rebuild.
   Concretely: (a) drop `EditorShell`, render the prototype in-page `PageHeader` (breadcrumb +
   `Boxes` icon + `Open schema`/`Save` actions) + the `lg:grid-cols-[1fr_300px]` grid on the Fields
   tab; (b) replace the Fields-tab `FieldsListPanel`+`FieldSettingsPanel` main view with the
   prototype ROW list (`GripVertical` + type `Badge` + `MoreHorizontal` menu) in `SectionCard
   "Fields"` (a NEW `ContentTypeFieldsPanel.tsx`), moving per-field editing into the row `…` menu /
   a sheet; (c) add the right-column `ContentTypeSettingsCard.tsx`; (d) add the `"permissions"` arm
   to `EditorTab` + a `TabsTrigger` + conditional render of `ContentTypePermissionsPanel` (from
   513-04). Keep the mobile `Sheet` field-detail affordance. (513-03)
2. **No "Type settings" card.** Prototype right card = **API ID** (mono, = the slug),
   **Singular name**, **Plural name**, and toggle rows **Enable drafts** + **Versioning**. None
   of `singularName`/`pluralName`/`draftsEnabled`/`versioning` exist in the model. → **Schema
   extension** (`content_types.config` jsonb) + backend + client + the card UI. (513-01, 513-03)
3. **No Permissions tab.** Prototype exposes a 4th tab `Permissions`; current has none. → Add the
   tab + a per-content-type permission configuration surface (max flexibility, config-persisted).
   (513-04 panel + persistence, 513-03 tab wiring)
4. **Field-type coverage gap.** Prototype field list uses **Slug** and **Date** field types
   (Title=Text, Slug=Slug, Body=Rich text, Cover=Media, Author/Category=Relation, Published
   at=**Date**, Featured=Boolean); the SchemaBuilder rail also lists **Date**. Current
   `FieldType` union = `text|richtext|number|boolean|select|media|relation` — **no `date`, no
   `slug`**; `FieldRenderer` cannot render them. → Add `date` + `slug` field types end-to-end.
   (513-02)
5. **No functional drag-to-reorder / row actions in the main Fields area.** Prototype rows show a
   grab handle ("Drag to reorder") + per-row `…` actions menu; current reordering does not exist
   in the main tab (rail + inline editor only). → Functional DnD reorder + row actions
   (edit / duplicate field / delete field). (513-03)
6. **Schema builder page is a cosmetic shell.** `SchemaBuilderPage.tsx` renders the prototype's
   visual node graph but Save/Add-field are disabled and nothing persists. Owner mandate = full
   functionality, no cosmetic shells. → Make it a working secondary visual editor (palette adds a
   field, inspector edits, reorder, Save persists). (513-05)
7. **Post-editor ergonomics parity.** The POST editor has dirty-tracking, keyboard save
   (Cmd/Ctrl+S), leave-guard, and a last-saved indicator; the content-type editor has a manual
   Save/Publish only. → Fold light ergonomics (dirty guard + keyboard save + last-saved hint)
   into the rebuilt editor. (513-03) Revision history is intentionally **out of scope**
   (`content_types` has no revisions table; see Open Questions).

---

## Schema-extension plan (DB)

Single new column on `content_types` for **maximum flexibility** and one migration:

- `config jsonb NOT NULL DEFAULT '{}'::jsonb` — content-type-level configuration:
  ```
  {
    singularName?: string,          // trimmed, ≤120 chars
    pluralName?: string,            // trimmed, ≤120 chars
    draftsEnabled?: boolean,        // resolved default TRUE
    versioning?: boolean,           // resolved default FALSE
    permissions?: {                 // per-role capability matrix (513-04)
      [roleKey: string]: { read?: boolean; create?: boolean; update?: boolean;
                           delete?: boolean; publish?: boolean }
    }
  }
  ```
- **API ID** in the prototype = the existing `slug` column (mono input rebinds slug); no new
  column for it.
- **Present-only / byte-identity:** `normalizeContentTypeConfig` drops empty strings and keys at
  their resolved default so a type with no custom config serializes to `{}` (legacy rows parse
  byte-unchanged). Unknown top-level or per-role keys are **rejected** (reject-unknown), bad
  scalar values fail-soft (omitted).
- Migration artifacts (DDL): the **next available** index is computed at LAND time via
  `bun run db:generate` — **the last landed migration is `0066_dashboard_layouts` (`_journal.json`
  last `idx: 66`), so the true next-free index is `0067`, NOT `0066`.** **Cross-task ordering
  (mandatory):** sibling To-Do tasks **TASK-512-01** and **TASK-514-01** ALSO need a fresh index
  off the same baseline; migration indices are single-valued + sequential, so only ONE of
  512/513/514 can be `0067` and the others bump to `0068`/`0069`. Do NOT hard-code any index —
  whichever of 512-01/513-01/514-01 merges first takes `0067`; the rest re-run `db:generate`
  against the then-current journal (which drizzle-kit picks automatically) and hand-verify the
  resulting `_journal.json` has a single fresh `idx` with no duplicate. Migration is additive with a
  default — safe on existing data. (See 513-01 §1 for the same note anchored to the subtask.)

The JSON **field schema** (`content_types.schema`) keeps its existing `x*` extension convention;
`date`/`slug` are ordinary field types mapped to JSON-Schema `type:"string"` carrying
`xFieldType` and **NO `format` keyword** (ajv-formats is not installed and the ajv `strict:true`
compile would throw on an unknown `format:"date"`, making a date-bearing type un-savable — see
513-02 Security Contract) — **no new ajv keyword** (513-02).

---

## Subtask breakdown (single-writer file ownership; strictly sequential land order)

**Land order: 513-01 → 513-02 → 513-04 → 513-03 → 513-05 → 513-06.**
(01 = model/backend foundation; 02 = new field types; 04 = permissions panel component created
before 03 imports it; 03 = editor rebuild consuming 01/02/04; 05 = functional schema builder;
06 = integration tests + smoke + closure.)

| Subtask | Title | Owns (sole writer) |
|---|---|---|
| 513-01 | Content-type `config` schema extension (DB + service + validation + client) | `core/db/schema.ts` (content_types block), `core/db/migrations/<next-idx>_*` (+meta/journal; index computed at land time, see 513-01 §1 — NOT hard-coded; last landed is 0066_dashboard_layouts so next-free is 0067), `core/services/content/contentTypeConfig.ts` (**NEW** db/Bun-free module: `normalizeContentTypeConfig` + `CONFIG_KEYS`/`CAP_KEYS`/`isRecord` + `ContentTypeConfig`/`ContentTypePermissionCapabilities` types), `core/services/content/typeService.ts` (imports the normalizer + re-exports the types from that module; wires create/update/duplicate/list), `core/server/validation/contentSchemas.ts`, `core/admin/services/contentTypesClient.ts` (client MIRROR of the config types + canonical `resolveDraftsEnabled`/`resolveVersioning` helpers + payload) |
| 513-02 | `date` + `slug` field types (model → mapping → editor → renderer) | `core/admin/ui/content-types/SchemaBuilder.tsx`, `core/admin/ui/content-types/FieldEditor.tsx`, `core/admin/ui/content-types/schemaMapping.ts`, `core/admin/ui/entries/FieldRenderer.tsx` |
| 513-04 | Permissions tab panel + per-role config helper | `core/admin/ui/content-types/ContentTypePermissionsPanel.tsx` (NEW), `core/admin/ui/content-types/contentTypePermissions.ts` (NEW helper) |
| 513-03 | Editor prototype-fidelity rebuild + Type settings card + ergonomics | `core/admin/ui/content-types/ContentTypeEditor.tsx`, `core/admin/ui/content-types/ContentTypeFieldsPanel.tsx` (NEW), `core/admin/ui/content-types/ContentTypeSettingsCard.tsx` (NEW) |
| 513-05 | Functional visual schema builder | `core/admin/ui/content-types/SchemaBuilderPage.tsx`, `core/admin/ui/content-types/SchemaPreviewPanel.tsx` |
| 513-06 | Integration tests, gates, Playwright smoke, closure | test files only (see subtask) + this task's docs |

**Coordination / shared-file notes:**
- `SchemaBuilder.tsx` exports the `ContentField`/`FieldType` types consumed widely
  (`entries/*`, `custom-screens/*`). 513-02 is the SOLE writer; the union widening is additive
  (adds `"date"|"slug"`) so downstream `switch` statements gain new arms only where they render
  values (FieldRenderer, owned by 02). Other consumers treat unknown types as passthrough — 513-06
  adds a guard test that `custom-screens`/`entries` type-narrow safely.
- 513-03 imports the panel from 513-04 (`ContentTypePermissionsPanel`) — 04 lands first so the
  file exists. 513-03 adds `"permissions"` to its local `EditorTab` union + `TabsTrigger` + the
  conditional render.
- **Config/permissions shape + normalizers (authoritative normalizer in a db-free module; UI
  minimizer separate):** the authoritative config + per-role capability shape (`ContentTypeConfig`,
  `ContentTypePermissionCapabilities`) and the server-authoritative `normalizeContentTypeConfig`
  (which reject-unknown-normalizes per-role permissions in one function — there is NO separately
  exported `normalizePermissionsMatrix` on the server) are OWNED by **513-01** and live in the
  **new db/Bun-free module `core/services/content/contentTypeConfig.ts`**. `typeService.ts`
  (server-only — it imports `db`) imports `normalizeContentTypeConfig` from that module and
  re-exports the types; the admin UI must NOT import `typeService.ts`. 513-01 MIRRORS the config
  TYPES + the canonical pure `resolveDraftsEnabled`/`resolveVersioning` helpers into the client-safe
  `core/admin/services/contentTypesClient.ts`, and the UI imports the shape/helpers from there.
  **513-04 defines its OWN UI-side `normalizePermissionsMatrix` minimizer** (in
  `contentTypePermissions.ts`) that ALIASES 513-01's client-mirrored types (`RoleCapabilities =
  ContentTypePermissionCapabilities`; `PermissionsMatrix = NonNullable<ContentTypeConfig["permissions"]>`)
  — it imports NO server module. The server normalizer (reject-unknown, authoritative, in the pure
  module) and the UI normalizer (minimizer — never sends droppable data) are intentionally mirrored
  and covered by shared test vectors. The pure module lets the Vitest Bun-free lane import
  `normalizeContentTypeConfig` directly without dragging in `db/client`.
- Only 513-01 touches backend/DB/client; 03/04/05 are admin-UI only. No subtask edits
  `contentEntryRoutes.ts` (permission ENFORCEMENT is an Open Question / follow-up).

---

## Per-subtask contracts (execution-ready)

### 513-01 — Content-type `config` schema extension (DB + service + validation + client)

**Goal:** Add one `config jsonb NOT NULL DEFAULT '{}'` column to `content_types` and thread a
strictly-allowlisted, present-only-normalized config object through the existing create/update/
duplicate envelope. No new endpoint or RBAC bucket.

**Data flow:** client `ContentTypePayload.config` → `PATCH /content-types/:id` (schema
`additionalProperties:false`, now with a typed `config`) → route handler → `typeService`
`normalizeContentTypeConfig` (server-authoritative allowlist) → `db.update(...).set({ config })`
→ row returned with normalized `config` → `contentTypesClient` upserts cache → editor reads
`type.config`.

**a. DB (`core/db/schema.ts`, content_types block ~:667-675):**
```
config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
```
Migration artifacts: `bun run db:generate` (from repo ROOT — the root `package.json` owns
`db:generate`/`db:migrate`; `bun --cwd core db:generate` fails missing-script) produces
`<idx>_*.sql` (`ALTER TABLE "content_types" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT
NULL;`), `meta/<idx>_snapshot.json`, and a new `_journal.json` `idx` entry. NEVER hand-edit the
snapshot/journal. **Index is NOT hard-coded:** the last landed migration is `0066_dashboard_layouts`
(`_journal.json` last `idx: 66`), so the next-free index is `0067` — TASK-512-01 and TASK-514-01
also need a fresh index off this same baseline (all three are To Do); whichever merges first takes
`0067` and the others bump to `0068`/`0069`. At land time run `db:generate` against the then-current
journal (drizzle-kit picks the true next index) and hand-verify `_journal.json` gains exactly one
fresh sequential `idx` with no duplicate before landing. Additive with default → safe on existing
rows (they read `{}`).

**b. Validation (`core/server/validation/contentSchemas.ts`):** add a shared `config` object
subschema (still `additionalProperties:false` at every level) to BOTH `contentTypeCreateSchema`
and `contentTypeUpdateSchema` (leave `contentTypeDuplicateSchema` untouched — duplicate copies the
source config server-side):
```
const contentTypeConfigSchema = {
  type: "object",
  properties: {
    singularName: { type: "string" },
    pluralName: { type: "string" },
    draftsEnabled: { type: "boolean" },
    versioning: { type: "boolean" },
    permissions: {
      type: "object",
      additionalProperties: {          // roleKey -> capability object
        type: "object",
        properties: {
          read: { type: "boolean" }, create: { type: "boolean" },
          update: { type: "boolean" }, delete: { type: "boolean" },
          publish: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
// add `config: contentTypeConfigSchema` to create+update `properties` (NOT in `required`)
```
The JSON-Schema layer rejects unknown top-level keys and unknown per-capability keys with the
existing 400 envelope; per-role KEYS are open (`additionalProperties: <capabilityObj>`) so any
role slug is accepted structurally but re-validated in the service.

**c. Config types + server normalizer (new db-free module
`core/services/content/contentTypeConfig.ts`; imported by `typeService.ts`):**

The `ContentTypeConfig` / `ContentTypePermissionCapabilities` types and the server-authoritative
`normalizeContentTypeConfig` (plus `CONFIG_KEYS`/`CAP_KEYS`/`isRecord`) are defined and exported
from the **new db/Bun-free module `core/services/content/contentTypeConfig.ts`**. `typeService.ts`
imports `db` at module top (`import { db } from "../../db/client"` :2) — which throws when
`DATABASE_URL` is unset and opens a `postgres` pool at load — so the normalizer is relocated to the
pure module: both `typeService.ts` (which imports `normalizeContentTypeConfig` + re-exports the
types) and the **Vitest Bun-free pure lane** import it with NO db pull-in. The admin UI must NOT
import from `typeService.ts`; the client gets a **mirror** of the config TYPES plus the pure
`resolveDraftsEnabled`/`resolveVersioning` helpers exported from
`core/admin/services/contentTypesClient.ts` (§d), which the UI (513-03/513-04) imports. Server-side
per-role permission normalization is **inlined inside `normalizeContentTypeConfig`** (one function
in the pure module — no separately exported server `normalizePermissionsMatrix`), and 513-04
supplies its OWN UI-side `normalizePermissionsMatrix` minimizer — the two are intentionally mirrored
(server reject-unknown authoritative; UI minimizer) and covered by shared test vectors. The
authoritative shape (ALIASED, not re-declared, by 513-04):
```ts
// core/services/content/contentTypeConfig.ts (db-free) — single authoritative shape
export type ContentTypePermissionCapabilities = {
  read?: boolean; create?: boolean; update?: boolean; delete?: boolean; publish?: boolean;
};
export type ContentTypeConfig = {
  singularName?: string; pluralName?: string;
  draftsEnabled?: boolean; versioning?: boolean;
  permissions?: Record<string, ContentTypePermissionCapabilities>;
};
```
`normalizeContentTypeConfig` is defined + exported here and called by create/update; duplicate
carries `source.config` through unchanged (already normalized on write):
```
export function normalizeContentTypeConfig(input: unknown): ContentTypeConfig {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: ContentTypeConfig = {};
  const s = trimOrUndefined(src.singularName, 120);   // drop empty/>120 (fail-soft omit)
  const p = trimOrUndefined(src.pluralName, 120);
  if (s) out.singularName = s;
  if (p) out.pluralName = p;
  // resolved defaults: draftsEnabled TRUE, versioning FALSE -> omit when at default
  if (src.draftsEnabled === false) out.draftsEnabled = false;
  if (src.versioning === true) out.versioning = true;
  const perms = normalizePermissions(src.permissions);       // INLINE reject-unknown loop (513-01 §2), same pure module
  if (perms) out.permissions = perms;
  return out;   // no custom config => {} (byte-identical to legacy rows)
}
```
The inlined server permission normalization (inside `normalizeContentTypeConfig`, in the pure
`contentTypeConfig.ts` module — not a separately exported helper) keeps only known capability
booleans per role, drops roles with no set
capabilities, and REJECTS unknown capability keys by throwing `content_type_config_invalid` (mapped
to HTTP 400 in the route) — since the ajv layer already blocks unknown capability keys, this is
defense-in-depth for the service-called-directly path. 513-04's UI-side `normalizePermissionsMatrix`
mirrors the KEEP/DROP behavior for the client (minimizer, so the UI never sends droppable data) but
does NOT reject-unknown (the server is authoritative). Wire into `createContentType` (`out.config =
normalizeContentTypeConfig(input.config)` before insert) and `updateContentType` (only set
`config` when `input.config !== undefined`; present-only so an update that omits `config` leaves
the column untouched). **Also edit `duplicateContentType`** (owned file, `typeService.ts`): pass
`config: (source.config ?? {}) as ContentTypeConfig` into its existing `createContentType({ name,
slug, schema: source.schema as ContentSchema, status: "draft" })` call — currently it omits
`config`, so without this step a duplicate would silently reset config to `{}` and the "duplicate
copies config" regression test (§Testing) would FAIL. `createContentType` re-runs
`normalizeContentTypeConfig` on it (idempotent — `source.config` is already normalized on write),
so the copied config round-trips byte-identically.

**d. Client (`core/admin/services/contentTypesClient.ts`):** add `config?: ContentTypeConfig` to
BOTH `ContentTypeSummary` (:35) and `ContentTypePayload` (:46). The client cannot import from
`typeService.ts` (server-only `db`), so it **MIRRORS** the `ContentTypeConfig` /
`ContentTypePermissionCapabilities` types here (kept in sync with the server shape) and exports them
for admin consumers (513-03/513-04 import from here). Also export the pure `resolveDraftsEnabled` /
`resolveVersioning` helpers here (no db/Bun) as the UI-importable source. No cache-shape change
beyond the added optional field (present-only — omit when `{}`).

**Security Contract (513-01):** The `config` object rides the EXISTING validated
`POST /content-types` (`content:write`) + `PATCH /content-types/:id` (`content:write`) envelopes —
no new endpoint, HTTP method, or RBAC bucket. Request schemas stay `additionalProperties:false` at
every nesting level; every persisted key is re-allowlisted + normalized server-side in
`typeService` (client input never trusted). Reject-unknown → machine-readable
`content_type_config_invalid` 400; bad scalar values fail-soft (omitted, never persisted raw). The
stored `permissions` matrix is DECLARATIVE only and does NOT by itself alter route authorization
(enforcement = Open Question 1). No PII, no secrets; `config` is admin-authored non-sensitive
metadata.

**Regression tests:**
- **Pure config helpers (Vitest Bun-free pure lane):** the client-mirrored `resolveDraftsEnabled` /
  `resolveVersioning` from `contentTypesClient` resolve defaults correctly. The server-authoritative
  `normalizeContentTypeConfig` lives in the db-free `contentTypeConfig.ts` module, so its cases —
  empty/`{}`/legacy → `{}`; trims + drops >120-char names; `draftsEnabled:true`/`versioning:false`
  omitted (at default); unknown top-level key rejected; unknown capability key rejected (inlined
  permission normalization); valid permissions matrix round-trips — run **here in the Vitest
  Bun-free pure lane** (importing the module directly, no `db/client` pull-in).
- **Route / persistence (Bun runtime lane, own-slug isolate + teardown):** `PATCH` with valid
  `config` persists + returns normalized; `additionalProperties`
  violation → 400; create→get round-trip byte-identical; duplicate copies config; update omitting
  `config` leaves prior value intact.

### 513-02 — `date` + `slug` field types (model → mapping → editor → renderer)

**Goal:** Widen the field union with `"date"|"slug"` end-to-end with NO new ajv keyword — both map
to JSON-Schema `type:"string"` carrying `xFieldType` and **NO `format` keyword** (ajv `strict:true`
would throw on an unknown `format:"date"`; date is identified purely by `xFieldType:"date"` — see
513-02 Security Contract).

**a. Model (`SchemaBuilder.tsx:142-149`):** widen
```
export type FieldType = "text"|"richtext"|"number"|"boolean"|"select"|"media"|"relation"|"date"|"slug";
```
Add `date`/`slug` to the `FieldType` picker options list and the `FieldsListPanel` type-label map
(prototype labels: `Date`, `Slug`). Additive — downstream `switch`es gain arms only where they
render (FieldRenderer, owned here). ALSO add a declarative `unique?: boolean` field flag +
inspector **Unique** toggle (prototype `SchemaBuilderPreview.tsx:139`, rendered under Required):
513-02 owns all three files it needs (type/editor/mapping), persists it present-only via the
existing `xFieldConfig.unique` (no ajv/DB change), and it is declarative-only (not route/DB
enforced — Open Question 5). Both editors surface it via the shared `FieldEditor`.

**b. Mapping (`schemaMapping.ts`):** the SINGLE load-bearing edit is adding two keys to the
`fieldTypeMap` `Record<FieldType, ...>` at `schemaMapping.ts:31` — `date: "string"` and
`slug: "string"`. (Extending the `FieldType` union at `SchemaBuilder.tsx:142` with `date`/`slug`
makes TS *require* these two Record entries, so this is enforced, not optional.) That one edit
carries BOTH directions:
- **Build** (`buildSchemaFromFields`, ~:184): `definition.xFieldType = field.type` is set
  unconditionally at :192, and the generic else-branch at :212 does
  `definition.type = fieldTypeMap[field.type]`, so once `date`/`slug` are in the map a date field
  serializes to `{ type:"string", xFieldType:"date" }` and slug to `{ type:"string",
  xFieldType:"slug" }` with **NO `format` keyword** (see Security Contract) — add NO explicit
  per-type build arm (the else-branch already handles them; an explicit arm would be dead code).
- **Reverse** (`resolveFieldType`, :309-312 / `fieldsFromSchema`): the existing
  `if (candidate in fieldTypeMap) return candidate` check (`candidate = String(definition.xFieldType)`)
  round-trips both back to `date`/`slug` — but ONLY because they are now in `fieldTypeMap`. Add NO
  explicit `xFieldType`/`format` branch (dead code; no `format` is ever persisted and these are
  brand-new types with no legacy `format:"date"`).

slug/date config persists present-only via `xFieldConfig.slug`/`xFieldConfig.date` (the pinned key
is `xFieldConfig.slug`, NOT a loose `xFieldConfig.sourceField`).

**c. Editor (`FieldEditor.tsx`):** add a `date` config block (a `Switch` "Include time" bound to
`field.date.includeTime`, present-only) and a `slug` config block (a `Select` "Derive from"
populated from sibling field names → `field.slug.source`, plus a `Switch` "Editable" →
`field.slug.editable`). Config shapes are `date?: { includeTime?: boolean }` and
`slug?: { source?: string; editable?: boolean }` per 513-02 §a (the sole writer). Reuse existing
label/name/required/help controls.

**d. Renderer (`FieldRenderer.tsx`, switch at :220):** add `case "date":` → `<Input type="date">`
bound to ISO string; `case "slug":` → text `<Input>` with slugify-on-blur (reuse existing
slug util if present, else inline `[a-z0-9-]` normalize). Keep required/validation parity with
`text`.

**Regression tests:** Vitest Bun-free pure lane — `schemaMapping` round-trip
`date`→schema→field and `slug`→schema→field (assert `xFieldType:"date"`/`"slug"` and **NO `format`
key**), plus a schema-persistence regression that `assertContentSchema` does not throw on the built
date field; Vitest admin lane — `FieldEditor` renders + edits date/slug config; `FieldRenderer`
renders `type="date"` input + slug input and emits normalized values. No route/DB touch → no
Security Contract.

### 513-04 — Permissions tab panel + per-role config helper

**Goal:** A pure resolver/normalizer helper + a presentational panel (created BEFORE 513-03 so the
import target exists). No route touch.

**a. Helper (`contentTypePermissions.ts`, NEW — admin-UI-side):**
```ts
// import the config TYPES from 513-01's CLIENT mirror (NOT typeService — server-only db):
import type { ContentTypeConfig, ContentTypePermissionCapabilities } from "@/services/contentTypesClient";

export const CAPABILITIES = ["read","create","update","delete","publish"] as const;
export type Capability = typeof CAPABILITIES[number];
// Alias 513-01's owned shape (do NOT re-declare a fresh Partial<Record<Capability, boolean>>):
export type RoleCapabilities = ContentTypePermissionCapabilities;
export type PermissionsMatrix = NonNullable<ContentTypeConfig["permissions"]>;

// 513-04's OWN UI-side normalizer (minimizer — keep true caps, drop empty roles; mirrors the
// server's KEEP/DROP but does NOT reject-unknown; the server is authoritative):
export function normalizePermissionsMatrix(input: PermissionsMatrix): PermissionsMatrix { ... }
export function resolveRoleCapabilities(matrix: PermissionsMatrix | undefined, role: string): RoleCapabilities { ... }
export function toggleCapability(matrix: PermissionsMatrix, role: string, cap: Capability, next: boolean): PermissionsMatrix { ... }
```
The types are ALIASED from 513-01's client-mirrored `ContentTypeConfig` /
`ContentTypePermissionCapabilities` (single authoritative shape) so
`<ContentTypePermissionsPanel permissions={config.permissions} …>` (513-03 §6) type-checks without
structural coincidence and cannot silently drift. `contentTypePermissions.ts` imports NO server
module and does NOT re-declare the shape; its `normalizePermissionsMatrix` is a UI minimizer
mirrored by shared test vectors with the server's inlined normalizer. It exposes `CAPABILITIES`,
`resolveRoleCapabilities` (effective caps for a role; missing role ⇒ `{}` = inherit/none) and
`toggleCapability` (pure set/clear, clearing the last cap removes the role). There is NO
`resolvePermissions` fn and NO import from `core/services/content/typeService.ts`.

**b. Panel (`ContentTypePermissionsPanel.tsx`, NEW):** props
`{ permissions: PermissionsMatrix | undefined; onChange: (next: PermissionsMatrix) => void;
disabled? }` — the panel receives ONLY the matrix (NOT `{ config, roles, onChange(nextConfig) }`)
and loads the role list INTERNALLY via `listAdminRoles()` from `@/services/adminRolesClient`.
Renders a role × capability toggle grid inside a `SectionCard`; each toggle calls `onChange` with
the re-normalized matrix (via `toggleCapability`); a "Reset to defaults" affordance emits `{}`;
loading/error/empty states for the roles fetch. Marks the editor dirty via the parent handler. No
persistence here (persists via 513-03's Save → 513-01 envelope). Reconcile the grid/toggle-cell
idiom with `core/admin/ui/roles/PermissionsMatrix.tsx` (transposed to role-rows × capability-cols).

**Security Contract (513-04):** This subtask ships NO route/DB code — the panel + helper are
admin-UI/pure. The matrix it produces is persisted ONLY through 513-01's already-hardened
`config.permissions` path (server re-normalizes + allowlists; client value never trusted). The
matrix is declarative config and does NOT gate `contentEntryRoutes` authorization on its own
(enforcement = Open Question 1). No new endpoint/bucket/method.

**Regression tests:** Vitest Bun-free pure lane — `normalizePermissionsMatrix` drops false caps +
empty roles and round-trips a valid matrix (UI minimizer — reject-unknown is the SERVER's job, not
asserted here); `toggleCapability` set/clear round-trip (clearing the last cap removes the role);
`resolveRoleCapabilities` returns `{}` for a missing role. Vitest admin lane — panel renders a
toggle grid for a stubbed role list, a cell toggle fires `onChange` with the expected matrix,
"Reset to defaults" emits `{}`, `disabled` disables all cells.

### 513-03 — Editor prototype-fidelity rebuild + Type settings card + ergonomics

**Goal:** Re-layout `ContentTypeEditor.tsx` to the prototype in-page structure and ADD the missing
elements while PRESERVING existing behavior (see gap-analysis point 1 baseline). Owns
`ContentTypeEditor.tsx` + NEW `ContentTypeFieldsPanel.tsx` + NEW `ContentTypeSettingsCard.tsx`.

**Per-tab content resolution (prototype is a static Fields-only display; this task defines all four
tabs concretely — no cosmetic shells):**
- **Fields tab** = the prototype `lg:grid-cols-[1fr_300px]` grid: LEFT `ContentTypeFieldsPanel`
  (`SectionCard "Fields"`, description *"Drag to reorder. Click a field to edit it."*, `Add field`
  soft action, the row list with `GripVertical` + name + type `Badge` + `MoreHorizontal` menu);
  RIGHT column = `ContentTypeSettingsCard` (`Card "Type settings"` — see below). The prototype puts
  the Type-settings card in the FIELDS-tab right column, NOT in a Settings tab — place it there.
- **Relations tab** = KEEP the current relation-field list (`ContentTypeEditor.tsx:645-680`)
  verbatim (icon + label + target-name + one/many + `Relation` badge); count badge = relation
  fields.
- **Settings tab** = KEEP the current tab's content (Name/Slug details, Taxonomies card, Danger
  Zone `:682-774`). Resolution of the API-ID/Singular/Plural OVERLAP with the Type-settings card:
  the card owns `slug` (as **API ID**, mono), `singularName`, `pluralName`, `draftsEnabled`,
  `versioning` (config, 513-01); the Settings tab's `Name` input stays (it maps to `content_types.
  name`, distinct from singular/plural); REMOVE the Settings-tab `Slug` input to avoid a dual
  writer of `slug` (single control = the card's API-ID field). Taxonomies + Danger Zone remain in
  the Settings tab.
- **Permissions tab** (NEW) = render `<ContentTypePermissionsPanel permissions={config.permissions}
  onChange={(m) => onConfigChange({ ...config, permissions: m })} />` (from 513-04); the panel loads
  the admin role list INTERNALLY (via `listAdminRoles`), so 513-03 passes ONLY `permissions` +
  `onChange` (NOT `config`/`roles`); toggles mark dirty + persist on Save.

**Type settings card (`ContentTypeSettingsCard.tsx`, NEW):** props `{ slug, config, onSlugChange,
onConfigChange }`. Layout mirrors prototype `:101-132`: `SettingRow "API ID"` (mono `Input` bound
to `slug`), `SettingRow "Singular name"` (`config.singularName`), `SettingRow "Plural name"`
(`config.pluralName`), then a divided block with two toggle rows **Enable drafts**
(`config.draftsEnabled`, resolved default checked) + **Versioning** (`config.versioning`, default
off). Every change calls the parent handler and marks dirty.

**Fields panel (`ContentTypeFieldsPanel.tsx`, NEW):** props `{ fields, onReorder, onEdit,
onDuplicate, onRemove, onAdd }`. Row list matching prototype `:84-98`; the `MoreHorizontal` menu
(admin `DropdownMenu`) exposes Edit (opens the existing field-edit `Sheet`), Duplicate field,
Delete field (→ existing `requestFieldRemoval` confirm + undo). Drag-to-reorder via the admin DnD
primitive used elsewhere (grab handle = `GripVertical`); `onReorder(nextFields)` marks dirty. Reuse
the existing `FieldSettingsPanel` inside the edit Sheet (do NOT re-implement field editing).

**Header + ergonomics:** replace `EditorShell` (:437) with in-page `PageHeader` (breadcrumb
`Engine › <name>` + `Boxes` icon + actions `Open schema` outline → `/advanced/engine/:id/schema`
and `Save`). PRESERVE dirty-tracking (`hasUnsavedChanges`), remote-update reconcile
(`remoteUpdatePending`), duplicate/delete handlers, field remove+undo. ADD POST-editor light
ergonomics: `Cmd/Ctrl+S` keyboard save (guarded by `isSaving`), a leave-guard on unsaved changes,
and a last-saved hint. Add `"permissions"` to `EditorTab`, a `TabsTrigger`, and the conditional
render; keep `<TabsList variant="line">` (= prototype `variant="underline"`).

**Regression tests:** Vitest admin/UI lane — breadcrumb + `Boxes` header renders; four tabs present
incl. Permissions; Type-settings card bindings (API-ID↔slug, singular/plural/drafts/versioning
↔config, dirty on change); drag reorder emits new order; row `…` menu Edit/Duplicate/Delete fire;
Settings tab has Name (no Slug dup); Cmd/Ctrl+S triggers save. No route/DB code (persists via
513-01) → task-level Security Contract governs.

### 513-05 — Functional visual schema builder

**Goal:** Turn `SchemaBuilderPage.tsx` from a disabled cosmetic preview into a working secondary
visual editor (the "Open schema" surface). Owns `SchemaBuilderPage.tsx` + `SchemaPreviewPanel.tsx`.

**Behavior:** load the content type (same `getContentTypeCached` path as the editor); palette
`Add field` inserts a `ContentField` (reuse `handleAddField` shape); node/inspector edits mutate
the field list; reorder persists order; **Save** calls `updateContentType(id, { schema:
buildSchemaFromFields(fields) })` (513-01 envelope) — enable the currently-disabled Save/Add
buttons. Dirty-guard + toast parity with the editor. `date`/`slug` (513-02) appear in the palette.

**Regression tests:** Vitest admin lane — palette add inserts a field; inspector edit updates it;
Save invokes `updateContentType` with mapped schema; disabled→enabled transition. No route/DB code
(persists via 513-01) → task-level Security Contract governs.

### 513-06 — Integration tests, gates, Playwright smoke, closure

**Goal:** Cross-subtask integration coverage + gates + ≥5 real-flow Playwright scenarios + closure.
Owns test files only + this task's docs (changelog number lives ONLY here — pinned 1225).

**Guard test (from Coordination note):** assert `custom-screens`/`entries` consumers of
`FieldType` type-narrow safely over the new `"date"|"slug"` arms (no runtime throw on unknown-to-
them types).

**Playwright smoke (≥5, screenshots → `_docs/_workflows/_smoke/`):** (1) deep field CRUD incl.
`date`+`slug` add/edit/reorder/delete+undo; (2) Type-settings card round-trip (API-ID/singular/
plural/drafts/versioning) persist→reload parity; (3) Permissions tab toggle matrix persist→reload;
(4) visual schema builder add+save→editor reflects; (5) cross-device (mobile Sheet field-edit) +
publish→front parity; (6) dirty-guard + Cmd/Ctrl+S save. Light + dark measured fidelity vs
prototype `http://localhost:5180/#/advanced/engine/sample`.

**Gates:** `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit`, `lint`,
`gates:coderso`, Bun + Vitest lanes green. Closure updates only `TASK-513*` subtask **Status**
fields; it does NOT edit `_TASKS/README.md` or `_CHANGELOG/*` (orchestrator adds board rows; the
pinned changelog **1225** is owner/orchestrator-driven).

---

## Testing strategy (lanes)

- **Bun runtime lane** (`bun test`, DB/route/service): 513-01 route + create/update/duplicate
  persistence round-trip (config persists/reads byte-identical, PATCH-omit preserves, duplicate
  copies), reject-unknown via the route (`content_type_config_invalid` → 400); migration applies on
  a seeded DB.
- **Vitest Bun-free pure lane**: 513-02 `schemaMapping` round-trip for `date`/`slug`; 513-04
  `normalizePermissionsMatrix`/`toggleCapability`/`resolveRoleCapabilities` (UI helpers in
  `contentTypePermissions.ts`, no db); 513-01's client-mirrored `resolveDraftsEnabled`/
  `resolveVersioning` from `contentTypesClient`; and the server-authoritative
  `normalizeContentTypeConfig` table-driven cases (reject-unknown top-level/cap key, present-only
  drop-defaults, trims/caps, permissions round-trip) imported directly from the db-free
  `core/services/content/contentTypeConfig.ts` module (no `db/client` pull-in).
- **Vitest admin/UI lane** (`tests/vitest/ui/**`): 513-03 editor structure (breadcrumb, tabs incl.
  Permissions, Type settings card bindings, drag reorder, row actions), 513-02 FieldEditor
  date/slug config, 513-05 schema-builder add/edit/save, 513-04 permissions panel toggles.
- **Shared-DB safety**: every route/DB test creates + tears down its own content type (unique
  slug per test); no reliance on seeded fixtures; self-isolate to avoid the known
  smoke-DB-pollution transient.
- **Gates**: `bun --cwd core lint:types` AND root `tsc -p tsconfig.json --noEmit` (prop-signature
  changes ripple into `tests/`), `lint`, `gates:coderso`.
- **Playwright smoke (513-06)**: ≥5 real-flow scenarios (see 513-06).

---

## Security Contract (task-level; per-subtask contracts in 513-01/513-04)

Only 513-01 touches routes/DB. The new `config` rides the existing validated
`POST /content-types` + `PATCH /content-types/:id` envelopes under `content:write`; the request
schemas (`additionalProperties:false`) gain a typed `config` object and every persisted key is
allowlisted + normalized server-side in `typeService` (client input is never trusted). Reject-
unknown throws machine-readable `content_type_config_invalid` (400); bad scalar values fail-soft
(omitted). No new endpoint, RBAC bucket, or HTTP method. Permissions config (513-04) is a stored
declarative matrix only — it does **not** by itself change route authorization (enforcement =
Open Question).

---

## Open Questions

1. **Permissions enforcement** — should the per-role `config.permissions` matrix actually gate
   `contentEntryRoutes` read/write (beyond the existing `content:read`/`content:write` buckets),
   or is 513 delivering the *configuration surface* only with enforcement as a follow-up task?
   (Default assumption: config + UI + pure resolver now; route enforcement deferred.)
2. **Versioning toggle semantics** — `content_types` has no revisions table. Should `versioning`
   merely persist as declarative config now (surfaced in the card) with a future revisions
   feature, or is a `content_type_revisions` table in scope? (Default: declarative-only now.)
3. **Two field editors** — keep BOTH the tab-based editor (513-03) and the functional visual
   builder (513-05), or make one canonical? (Default: keep both; the visual builder is the
   secondary "Open schema" surface reachable from the editor header.)
4. **Draft/enable-drafts effect** — does `draftsEnabled=false` hide the entry draft/publish
   split in the entry editor, or is it declarative-only for now? (Default: declarative-only;
   flag surfaced, entry-editor behavior a follow-up.)
5. **`unique` field-flag enforcement** — the prototype inspector shows a **Unique** toggle under
   Required (`SchemaBuilderPreview.tsx:139`). 513-02 reproduces it as a declarative
   `ContentField.unique` (persisted present-only in `xFieldConfig.unique`, surfaced in both
   editors). Should it actually enforce per-entry uniqueness (no per-field DB index exists on the
   jsonb `content_types.schema`, and entry values live in a shared store), or stay declarative
   config only? (Default: declarative-only now — surfaced + persisted, enforcement a follow-up,
   consistent with `versioning`/`permissions`.)
