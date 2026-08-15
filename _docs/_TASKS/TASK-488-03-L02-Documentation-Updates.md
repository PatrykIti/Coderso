# TASK-488-03-L02: Documentation updates
# FileName: TASK-488-03-L02-Documentation-Updates.md

**Parent Subtask:** TASK-488-03
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-488-01, TASK-488-02
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

> **Admin-cache docs (audit M6):** the collections manager is a new admin
> cached-resource UI (reads/writes `commerce:collections:list` cache family +
> `create/update/deleteCommerceCollection` cache-bus events). This leaf ALSO
> updates `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` (read on-disk
> state first — 487 may be editing them concurrently).

- **Goal:** Record the new admin-UI capabilities in the source-of-truth docs:
  product variants are now editable in the product editor, and collections have
  a full admin CRUD surface. These are capability notes only — **no new
  endpoints** are introduced, so the endpoint lists stay as-is.
- **Owning module(s) to create-or-extend:** `_docs/CMS_API.md` (Commerce v1
  preview section), `_docs/CMS_SPEC.md` (Commerce coverage note, if the spec
  summarizes admin authoring capabilities).
- **Source-of-truth docs:** the files being edited are themselves the
  source-of-truth; keep them consistent with the shipped UI.
- **Out-of-scope:** `_docs/_TASKS/README.md` (orchestrator-owned — do not edit);
  changelog entries (do not create); any endpoint/schema additions.

## Security Contract

- No endpoint or permission model changes. Documentation-only. Confirm the docs
  do not expose secrets and continue to state that v1 adds **no** public
  `/api/commerce/*` routes and that checkout remains a service/plugin-hook
  contract (not an admin CRUD surface).

## Implementation Pseudocode

```md
<!-- _docs/CMS_API.md — Commerce v1 preview: add an "Admin UI" capability note -->
Admin UI (internal, RBAC `commerce:read` to view / `commerce:write` to mutate):
- Product editor now edits product **variants** inline (title, SKU, pricing,
  stock, attributes, single default). Variants persist via the existing
  `POST/PATCH /commerce/products[/:id]` payload `variants[]` — no new endpoint.
- Collections have a full admin CRUD surface (list/create/edit/delete) at
  `/admin/advanced/commerce/collections`, wiring the existing
  `POST/PATCH/DELETE /commerce/collections[/:id]` endpoints — no new endpoint.
```

```md
<!-- _docs/CMS_SPEC.md — Commerce note: variant + collection authoring now in admin UI -->
```

**Data flow:** edit prose only; verify each referenced route/permission/payload
field matches the shipped code (`commerceRoutes.ts`, `commerceClient.ts`,
`commerceSchemas.ts`).

**Error handling:** n/a (docs). Cross-check that no claimed endpoint is fictional
— the endpoint list must remain byte-accurate to `commerceRoutes.ts`.

**Regression-test shape:** n/a (docs-only). Validation is a reviewer diff check
that the capability notes match the implemented UI from TASK-488-01/02.

## Testing Requirements

- No automated tests (documentation only).
- Manual check: every route/permission/field named in the new prose exists in
  `core/server/routes/commerceRoutes.ts`,
  `core/admin/services/commerceClient.ts`, and
  `core/server/validation/commerceSchemas.ts`.
- No DB changes → no migration artifacts.
