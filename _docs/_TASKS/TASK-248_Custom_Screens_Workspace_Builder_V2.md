# TASK-248: Custom Screens Workspace Builder V2
# FileName: TASK-248_Custom_Screens_Workspace_Builder_V2.md

**Priority:** High
**Category:** Coderso Custom Screens + Entries + Admin/UI + Builder UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-209, TASK-202, TASK-226
**Status:** To Do

---

## Overview

Rebuild Custom Screens as a content-type workspace builder instead of
continuing to patch the current single-canvas screen editor.

The builder must work like the Pages editor in terms of canvas ergonomics,
preview, block selection, settings panels, dirty-state protection, save flow,
and reusable layout primitives. It differs from Pages because it builds admin
workspaces for a selected custom content type. All data-aware widgets in this
surface must read and write only the selected content type and its entries.

The builder uses two explicit tabs:

- `List View`: configures the admin table/list shown for entries of the
  selected content type.
- `Editor View`: configures the create/edit entry canvas opened from the list.

This replaces the earlier TASK-248 repair plan for `New record`, primitive
binding formatting, and one-off presets. Those issues remain useful discovery
evidence, but they should be solved by the V2 workspace model rather than by
spending time on soon-to-be-legacy UI paths.

Numbering note: this checkout materializes the workspace-builder family as
`TASK-248`. Do not create a parallel `TASK-249` family unless the whole set is
renumbered first: filenames, header lines, dependencies, `_docs/_TASKS/README.md`
rows, internal task references, and later changelog references must move
together.

## Live Discovery Evidence

A Playwright CLI walkthrough on 2026-04-30 against
`http://localhost:5173/admin/advanced/custom-screens` created:

- content type: `House Projects Catalog QA 20260430`
- content type slug: `house-projects-catalog-qa-20260430`
- content type id: `c99bd4cf-8bf3-4700-ade5-a92a5708d0f0`
- sample entries:
  - `Dom Aurora 148` / `dom-aurora-148-qa-20260430`
  - `Dom Sora 112` / `dom-sora-112-qa-20260430`
- custom screen: `House Projects Workspace QA 20260430`
- custom screen id: `465f9c80-06fd-4af4-9b4d-f482c710a8f5`
- screenshot evidence:
  `.playwright-cli/page-2026-04-30T19-36-12-709Z.png`

Findings that shape V2:

1. `/admin/advanced/custom-screens` is the canonical route.
2. Existing records can open through a dedicated custom screen editor once the
   screen has writable bindings.
3. Editing an existing entry can work; a `PATCH` for `Dom Aurora 148` returned
   `200` after updating `areaM2` and `location`.
4. Creating a new entry from the current records page fails for realistic
   required schemas because the shared `EntryCreateDrawer` submits only
   `title`, `slug`, and `data: {}`.
5. The failed create returned `500 internal_error` with
   `entry_validation_failed`; route mapping still needs to expose validation as
   a 400-level admin error.
6. Primitive field-value widgets break when numeric entry fields are injected
   into string-only widget props.
7. The current builder gives users a low-level widget/binding canvas, but a
   real content workspace needs separate control over list/table behavior and
   editor behavior.

## Product Direction

Custom Screens should become a reusable admin workspace product surface:

- A screen is assigned to exactly one content type.
- `contentTypeId` remains owned by the Custom Screen record/DB row and admin
  route payload. Do not duplicate it inside `CustomScreenDefinitionV2`; pass the
  resolved content type into definition normalizers only as context for defaults,
  schema-bound validation, and UI option filtering.
- The screen definition owns a `List View` and an `Editor View`.
- `List View` controls the records table the user sees from admin navigation.
- `Editor View` controls the create/edit form canvas the user sees after
  clicking a row or adding an entry.
- The generated admin route behaves like other admin resources:
  list, filters, sort, row actions, create, edit, delete, cache hydration, and
  background revalidation.
- Public page-builder widgets are not blindly mixed into admin screens.
  Layout primitives may be reused, but data-aware widgets must be scoped to
  the selected content type.

## Required Product Behavior

1. The Custom Screen builder has clear `List View` and `Editor View` tabs.
2. `List View` can configure:
   - visible columns,
   - column labels,
   - field formatting,
   - default sort,
   - basic filters,
   - row click behavior,
   - row actions,
   - bulk action availability,
   - create button behavior.
3. The rendered Custom Screen list behaves like `/admin/pages` where it makes
   sense: stable table layout, filters, empty state, selection, row actions,
   cache hydration, background revalidation, and no forced mount refetch loop.
4. `Editor View` can configure a create/edit canvas for entries of the selected
   content type:
   - schema-bound fields,
   - grouped field sections,
   - media/relation fields where supported,
   - required-field state,
   - status/publish controls,
   - save/cancel behavior,
   - dirty-state protection.
5. Adding a new entry from a Custom Screen opens `Editor View` in create mode,
   not the generic drawer that submits `data: {}`.
6. Existing entries open in `Editor View` edit mode and save through the same
   entry service/cache contracts as the classic Entries editor.
7. V1 screens remain renderable. The V2 migration should preserve existing
   blocks and bindings as an `Editor View` fallback and generate a default
   `List View` from the assigned content type.
8. Validation errors from entry create/update are mapped as user-readable
   admin errors, not `500 internal_error`.
9. Entry create/update failures keep centralized machine-readable error codes
   for validation, duplicate slugs, media values/assets, and relation values so
   the UI can show actionable field feedback without exposing stacks.

## Workspace Definition Sketch

`contentTypeId` is intentionally omitted from the persisted definition because
the screen record already owns the content-type assignment.

```ts
type CustomScreenDefinitionV2 = {
  schemaVersion: 2;
  listView: {
    columns: CustomScreenListColumn[];
    filters: CustomScreenListFilter[];
    defaultSort?: {
      field: string;
      direction: "asc" | "desc";
    };
    rowClick: "editor-view" | "classic-editor";
    createMode: "editor-view" | "drawer";
    bulkActions: {
      delete: boolean;
      publish: boolean;
      unpublish: boolean;
    };
  };
  editorView: {
    blocks: WidgetBlock[];
    bindings: CustomScreenBinding[];
    saveMode: "entry";
  };
};
```

The exact type names can change during implementation, but the contract must
keep `List View` and `Editor View` as explicit persisted concepts. Do not hide
them as transient UI-only tabs.

Storage note: the default implementation should preserve the existing
`custom_screens` storage shape and map V2 through `schema_version`, `blocks`, and
`bindings` for backward compatibility. If implementation adds a new physical
definition/list/editor column, it must include the full migration artifacts
required by AGENTS.md.

## Sub-Tasks

- [ ] TASK-248-01: Custom Screen Definition V2 and Workspace Routing
- [ ] TASK-248-01-01: Definition Schema, Normalizer, and V1 Migration
- [ ] TASK-248-01-02: Workspace Routes, Client Cache, and Entry Error Mapping
- [ ] TASK-248-02: Custom Screen List View Builder and Records Table
- [ ] TASK-248-02-01: List View Designer and Persisted Configuration
- [ ] TASK-248-02-02: Records Table Renderer, Actions, and Cache Behavior
- [ ] TASK-248-03: Custom Screen Editor View Canvas and Entry Create Mode
- [ ] TASK-248-03-01: Editor View Designer and Admin Field Widget Controls
- [ ] TASK-248-03-02: Editor View Create Mode Draft, Save, and Validation
- [ ] TASK-248-03-03: Editor View Edit Mode Hydration, Save, and Dirty State
- [ ] TASK-248-04: Admin Widget Registry, QA, Docs, and Closure
- [ ] TASK-248-04-01: Admin Widget Registry Surface Split
- [ ] TASK-248-04-02: Playwright Replay, Docs, Changelog, and Board Closure

## Implementation Order

1. Add the V2 definition, normalizers, default generation, and V1 migration.
2. Add workspace route helpers and client/cache support for V2 screens.
3. Build the `List View` designer and the rendered records table from the V2
   `listView` definition.
4. Build the `Editor View` designer and create/edit entry renderer from the V2
   `editorView` definition.
5. Split widget registry behavior by surface so admin widgets stay scoped and
   data-aware widgets only use the selected content type.
6. Replay the House Projects workflow with Playwright CLI and close docs.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: authenticated admin session or existing admin API key model used
  by `/admin/api/custom-screens` and `/admin/api/content/:type/entries`.
- RBAC:
  - Custom Screen definition writes require the existing `content:write`
    permission used by `/admin/api/custom-screens`.
  - List/read rendering requires `content:read` for the selected content type.
  - Entry create/update/delete requires `content:write` for the selected
    content type.
  - Entry publish/unpublish actions require the existing `content:publish`
    permission when they call the current publish routes.
- CSRF:
  - all admin write mutations continue through CSRF-backed admin clients.
- Rate-limit bucket:
  - existing `admin_write` for Custom Screen and entry mutations.
- Reject-unknown validation:
  - V2 screen definitions must reject unknown top-level `listView` and
    `editorView` keys,
  - V2 screen definitions must reject definition-level `contentTypeId`; the
    content type assignment is record-level state,
  - entry create/update payloads must keep dynamic fields under `data`,
  - route modules remain orchestration-only and map domain errors centrally.
- Anti-abuse:
  - no public write endpoint is introduced,
  - no nonce/signature/HMAC/reCAPTCHA flow is required for this internal admin
    surface.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest tests for:
  - V2 definition normalization and V1 migration,
  - default `List View` generation from a content type schema,
  - `List View` designer state and save payload,
  - rendered records table columns/filters/row actions,
  - `Editor View` create mode submitting normalized entry `data`,
  - `Editor View` edit mode preserving typed entry values,
  - admin widget registry filtering by surface,
  - registered admin widgets exposing schema/defaults/normalizer/render/editor
    contracts, or being explicitly documented as internal controls outside the
    widget registry,
  - validation errors rendered inline without stack leakage.
- Targeted Bun route/service tests for:
  - Custom Screen V2 create/update strict schema validation,
  - content entry validation mapped to 400-level errors,
  - duplicate entry slugs mapped to 409-level errors,
  - media and relation entry failures mapped to bounded 400/404-level errors,
  - route registration for generated workspace entry routes.
- Playwright CLI replay:
  - create or reuse the House Projects content type,
  - configure a Custom Screen with `List View` and `Editor View`,
  - add a new house project through `Editor View` create mode,
  - edit an existing project through `Editor View` edit mode,
  - verify the list columns update and no invalid widget data appears.

## Documentation Updates Required

- `_docs/CMS_API.md` for corrected entry validation error mapping if route
  semantics change.
- `_docs/CONTENT_TYPES_SPEC.md` if Custom Screens introduce formal
  schema-derived entry defaults.
- `_docs/WIDGETS.md` and relevant `_docs/_WIDGETS/*` docs if admin widget
  registry semantics become part of the widget contract.
- `_docs/WIDGET_PACK_MATRIX.md` and `core/widgets/modulePackMatrix.ts` only when
  admin widget work changes module-facing widget readiness; otherwise record
  that admin-only controls do not alter the pack matrix.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if new cached Custom
  Screen workspace resources or invalidation keys are added.
- `_docs/PLAYWRIGHT/*` with the V2 House Projects replay evidence.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screen builder exposes `List View` and `Editor View` tabs and persists
   both views in the screen definition.
2. A screen assigned to a required-field content type can create and edit
   entries without falling back to the generic `data: {}` create drawer.
3. The rendered Custom Screen list supports configured columns and row actions
   and behaves consistently with the Pages list where applicable.
4. Public/front widgets are not mixed into admin workspaces unless explicitly
   marked as admin-safe layout primitives.
5. V1 screens still load through a deterministic migration/defaulting path.
6. Playwright CLI evidence proves the House Projects workspace flow works end
   to end.
