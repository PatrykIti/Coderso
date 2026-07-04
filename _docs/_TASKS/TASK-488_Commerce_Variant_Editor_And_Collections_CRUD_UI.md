# TASK-488: Commerce — Product Variant Editor & Collections CRUD UI
# FileName: TASK-488_Commerce_Variant_Editor_And_Collections_CRUD_UI.md

**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Medium
**Dependencies:** None (backend already shipped — frontend-only)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

The Coderso Commerce backend already models, validates, and persists **product
variants** and supports full **collections CRUD**, but the admin UI exposes
neither:

1. `core/admin/ui/commerce/components/CommerceEditorSections.tsx` renders only
   Identity / Pricing / Stock cards — there is **no variant control**, so
   variants can only be authored by hand-crafting raw `/admin/api/commerce/*`
   calls. The product draft already carries `variants`
   (`commerceEditorModel.ts`) and round-trips them through
   `toCommerceProductInput`, so the gap is purely a missing editor surface.
2. `createCommerceCollection` / `updateCommerceCollection` /
   `deleteCommerceCollection` exist in `commerceClient.ts` and are routed in
   `commerceRoutes.ts`, but are imported **nowhere** in the admin UI. The
   product editor's right panel (`CommerceCollectionsPanel.tsx`) literally tells
   the user to "Create collections from the Commerce API/UI flow" — a flow that
   does not exist. There is **no UI path to create a collection.**

This task delivers a variant add/edit/remove editor and a collections
create/edit/delete admin surface, both wiring **existing** gated backend
contracts. No new backend, no schema/migration work.

---

## Scope

### In scope

- Variant editor card inside `CommerceEditorSections.tsx` (round-tripping the
  existing `draft.variants` through the already-wired POST/PATCH product path).
- Pure model helpers for variant mutation/serialization in
  `commerceEditorModel.ts`.
- A collections management surface (list + create + edit + delete) wiring the
  existing `commerceClient` collection functions and `commerceRoutes`
  endpoints, reachable from the Commerce admin navigation.
- Co-located Vitest unit/model + render tests, plus documentation capability
  notes in the source-of-truth docs.

### Out of scope

- Orders / cart / checkout / payment flows — **explicitly excluded** from v1
  product scope by design (`CMS_SPEC.md`: "Zaawansowany e-commerce (jako
  plugin)" is out of v1; checkout is a service+plugin-hook contract, not an
  admin CRUD surface — `CMS_API.md` Commerce v1 preview).
- Any new backend route, service function, DB column/table, or migration.
- Public (`/api/commerce/*`) endpoints — v1 adds none (`CMS_API.md`).
- Media-picker integration for variant imagery (remains the existing
  comma-separated media-IDs flow).

### What TASK-479 (admin reskin) already covers vs. what this task adds

- **TASK-479 covers:** the soft/violet Notion-like visual language, shared
  tokens/primitives, and the `EditorShell` / `AdminShell` chrome the commerce
  pages already render inside. It is a **reskin** — it does not add any missing
  functional control.
- **TASK-488 adds:** the missing *functional* surfaces (variant CRUD inside the
  product editor; collections CRUD as a first-class admin flow). New UI must
  reuse the existing `@/components/ui/*` primitives so it inherits the TASK-479
  styling automatically; it must not fork bespoke styling.

---

## Sub-Tasks

| ID            | Title                                   | Effort | Status     |
| ------------- | --------------------------------------- | ------ | ---------- |
| TASK-488-01   | Product Variant Editor                  | Medium | ⏳ To Do   |
| TASK-488-02   | Collections CRUD Admin Surface          | Medium | ⏳ To Do   |
| TASK-488-03   | Verification & Documentation            | Small  | ⏳ To Do   |

---

## Testing Requirements

- **Lane:** Vitest only — every change is pure TS model logic or admin-UI render
  flow with no runtime/route/DB dependency (`tests/vitest/*`,
  `tests/vitest/ui-integration/*`). No Bun-lane work: this task adds no route,
  plugin-lifecycle, `Bun.serve`/`Bun.file`, perf, or security-gate surface.
- Variant model helpers: unit-test mutation + serialization (drop-empty, trim,
  single-default, attribute edits) in `tests/vitest/`.
- Variant card + collections manager: render + interaction tests in
  `tests/vitest/ui-integration/`.
- Extend the existing `tests/vitest/ui/commerce-page.test.tsx` to assert the new
  variant card renders in the product editor.
- No migration artifacts are required (no DB changes).
- Full gate before closure: `bun run lint`, `bun run typecheck`, and the Vitest
  suite must be green.

## Documentation Updates Required

- `_docs/CMS_API.md` — Commerce v1 preview section: add an admin-UI capability
  note that product variants are now editable in the product editor and that
  collections have a full admin CRUD surface (no new endpoints; existing routes
  only).
- `_docs/CMS_SPEC.md` — Commerce coverage note if the admin-capability summary
  references variant/collection authoring.
- Do **not** edit `_docs/_TASKS/README.md` or add changelog entries — the
  orchestrator syncs the board.

## Notes

- Backend contracts to consume (verified present):
  - Product write path already serializes `variants` end-to-end:
    `commerceService.normalizeVariantList` →
    `commerceProductBaseProperties.variants` (max 100, `commerceVariantSchema`,
    `title` required) → persisted under `commerceProducts.data.variants`.
  - Collection routes: `POST/PATCH/DELETE /commerce/collections[/:id]`
    (`requirePermission("commerce:write")`), `GET` variants
    (`commerce:read`). Client wrappers all pass `{ withCsrf: true }`.
  - Domain error mapping at the route boundary (`mapCommerceError`):
    `commerce_collection_slug_exists` (409),
    `commerce_collection_not_found` (404), `commerce_*` (400).
- Route ordering constraint (see TASK-488-02-L02): a literal
  `/advanced/commerce/collections` route MUST be registered **before** the
  existing `/advanced/commerce/:id` param route in `AdminApp.tsx`, otherwise the
  editor would treat `collections` as a product id.
- Keep YAGNI/KISS: reuse `ConfirmActionDialog`, `PageHeader`, `AdminShell`,
  `EditorShell`, and `@/components/ui/*`; do not introduce a new design system.
