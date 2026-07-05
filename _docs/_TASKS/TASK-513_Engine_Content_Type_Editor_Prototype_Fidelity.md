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
- DB: `core/db/schema.ts:667-675` — `content_types(id, name, slug, schema jsonb, status,
  createdAt, updatedAt)`. Entry consumer: `core/admin/ui/entries/FieldRenderer.tsx`
  (renders text/richtext/number/boolean/select/media/relation — **no date, no slug**).

---

## Prototype vs current — REAL gap analysis (source + live :5180 vs :5173, screenshots in `_docs/_workflows/_smoke/wf513-*.png`)

1. **Editor shell / structure mismatch (largest gap).** The prototype editor is an **in-page**
   layout (breadcrumb `Engine › Article` + type-name title + `Boxes` icon + `Open schema`
   (outline) & `Save` actions), **underline Tabs** `Fields (8) · Relations (2) · Settings ·
   Permissions`, then a `lg:grid-cols-[1fr_300px]` grid: LEFT `SectionCard "Fields"` with an
   `Add field` action and a **field list** (each row: `GripVertical` drag handle, name, type
   `Badge`, `MoreHorizontal` actions menu); RIGHT a `Card "Type settings"`. The current editor
   uses the full-screen **`EditorShell`** chrome (left FIELDS rail + a raw **Schema Preview JSON**
   right panel + a sticky action toolbar with generic title `"Content Type Editor"`). → Rebuild
   the editor to the prototype's in-page structure. (513-03)
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
- Migration artifacts (DDL): `core/db/migrations/0066_*.sql` + `core/db/migrations/meta/
  0066_snapshot.json` + `_journal.json` idx 66 entry (generate via `bun run db:generate`; never
  hand-edit the snapshot). Migration is additive with a default — safe on existing data.

The JSON **field schema** (`content_types.schema`) keeps its existing `x*` extension convention;
`date`/`slug` are ordinary field types mapped to JSON-Schema `type:"string"` (+ `format:"date"`
for date) carrying `xFieldType` — **no new ajv keyword** (513-02).

---

## Subtask breakdown (single-writer file ownership; strictly sequential land order)

**Land order: 513-01 → 513-02 → 513-04 → 513-03 → 513-05 → 513-06.**
(01 = model/backend foundation; 02 = new field types; 04 = permissions panel component created
before 03 imports it; 03 = editor rebuild consuming 01/02/04; 05 = functional schema builder;
06 = integration tests + smoke + closure.)

| Subtask | Title | Owns (sole writer) |
|---|---|---|
| 513-01 | Content-type `config` schema extension (DB + service + validation + client) | `core/db/schema.ts` (content_types block), `core/db/migrations/0066_*` (+meta/journal), `core/services/content/typeService.ts`, `core/server/validation/contentSchemas.ts`, `core/admin/services/contentTypesClient.ts` (types + payload) |
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
- Only 513-01 touches backend/DB/client; 03/04/05 are admin-UI only. No subtask edits
  `contentEntryRoutes.ts` (permission ENFORCEMENT is an Open Question / follow-up).

---

## Testing strategy (lanes)

- **Bun runtime lane** (`bun test`, DB/route/service): 513-01 config normalize + reject-unknown +
  round-trip create/update/duplicate persistence; migration applies on a seeded DB.
- **Vitest Bun-free pure lane**: 513-02 `schemaMapping` round-trip for `date`/`slug`; 513-04
  `contentTypePermissions` resolve/normalize; 513-01 `normalizeContentTypeConfig` pure cases.
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
