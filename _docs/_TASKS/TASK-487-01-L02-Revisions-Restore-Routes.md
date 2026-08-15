# TASK-487-01-L02: Wire `revisions` + `restore` Routes + Error Mapping
# FileName: TASK-487-01-L02-Revisions-Restore-Routes.md

**Parent Subtask:** TASK-487-01
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Small
**Dependencies:** TASK-487-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Register the two internal entry-revision endpoints in
  `registerContentEntryRoutes` and map the new domain error to a clean HTTP
  status, mirroring `postsRoutes.ts:358-380` and `mapPostError` (`:114-115`).
- **Owning module(s) to create-or-extend:**
  `core/server/routes/contentEntryRoutes.ts` (extend — owns
  `registerContentEntryRoutes` `:171`, `mapContentEntryError` `:90`,
  `withContentEntryErrors` `:160`).
- **Source-of-truth docs:** `_docs/CMS_API.md` (content-entries endpoints
  `:2485-2491`; posts revisions reference `:791`), `_docs/RBAC_SPEC.md`
  (`content:read` / `content:write` `:10-12`), `_docs/SECURITY_SPEC.md`.
- **Out of scope:** service logic (L01), client/UI (TASK-487-02), any new
  validation schema (restore has an empty body; revisions list is a GET).

---

## Security Contract

- **Endpoint visibility:** `internal` — both routes register under the admin API
  surface (`/admin/api/*`) like every other content-entry route.
- **Auth model:** session (admin). Same `requirePermission`/`validate` deps that
  `index.ts:71` already passes into `registerContentEntryRoutes`.
- **RBAC:**
  - `GET /content/:type/entries/:id/revisions` → `requirePermission("content:read")`
  - `POST /content/:type/entries/:id/revisions/:revisionId/restore` →
    `requirePermission("content:write")`
  - (matches posts: `content:read` list, `content:write` restore.)
- **CSRF:** required for the restore POST — enforced globally by `enforceCsrf`
  (`core/server/httpServer.ts:358`, `core/server/middleware/csrf.ts`) for
  internal writes. No per-route CSRF code needed; the admin client must send the
  token (TASK-487-02-L01 uses `withCsrf: true`).
- **Rate-limit bucket:** `admin` (inherited from the internal admin pipeline).
- **Validation:** params only (`:type`, `:id`, `:revisionId`); no request body
  on restore, so no new schema. Do **not** add a permissive body schema. Type +
  entry-ownership guard (`entry.typeId !== type.id → entry_not_found`) reused
  from the sibling routes (`contentEntryRoutes.ts:208-209`).
- **Anti-abuse:** n/a (internal-only; no public write, no nonce/HMAC/CAPTCHA).
- **Secret/PII handling:** response shape comes straight from L01's PII-redacted
  `listEntryRevisions`. Routes must not re-query users or add raw email.

---

## Implementation Pseudocode

```ts
// core/server/routes/contentEntryRoutes.ts

import {
  // ...existing imports...
  listEntryRevisions,
  restoreEntryRevision,
} from "../../services/content/entryService";

// 1) Extend mapContentEntryError (entryService domain code -> ApiError).
//    Add inside the switch in mapContentEntryError (:99):
case "entry_revision_not_found":
  return new ApiError("entry_revision_not_found", "Revision not found.", 404);

// 2) Register routes inside registerContentEntryRoutes (after the publish/
//    unpublish routes, :360-375).
router.get(
  "/content/:type/entries/:id/revisions",
  requirePermission("content:read"),
  async (ctx) => {
    return withContentEntryErrors(async () => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      return listEntryRevisions(entry.id);
    });
  }
);

router.post(
  "/content/:type/entries/:id/revisions/:revisionId/restore",
  requirePermission("content:write"),
  async (ctx) => {
    return withContentEntryErrors(async () => {
      const type = await getContentTypeBySlug(ctx.params.type);
      if (!type) throw new Error("content_type_not_found");
      const entry = await getEntry(ctx.params.id);
      if (!entry || entry.typeId !== type.id) throw new Error("entry_not_found");
      const result = await restoreEntryRevision(
        entry.id,
        ctx.params.revisionId,
        ctx.user?.id ?? null
      );
      return {
        ok: true,
        restored: result.restored,
        revision: result.revision,
        entry: result.entry,
      };
    });
  }
);
```

**Data flow:** validate params + RBAC → resolve type → entry-ownership guard →
delegate to service → `withContentEntryErrors` maps domain errors. The
`ContentValidationError` thrown by a schema-incompatible restore is already
handled by `mapContentEntryError` (`:91`) → 400 `entry_validation_failed`.

**Error handling:** new `entry_revision_not_found` → 404; existing
`entry_not_found` / `content_type_not_found` → 404; validation failure → 400.
All via centralized `mapContentEntryError`.

**Regression-test shape:**

- Route registration (Bun): `registerContentEntryRoutes` now also wires
  `GET /content/:type/entries/:id/revisions` (`content:read`) and
  `POST /content/:type/entries/:id/revisions/:revisionId/restore`
  (`content:write`) — extend the `expect.arrayContaining([...])` assertion in
  `tests/integration/routes/contentEntriesRoutes.test.ts`.
- `mapContentEntryError("entry_revision_not_found")` → `ApiError` 404.

---

## Testing Requirements

- Lane: **Bun** (route registration + runtime integration).
- `tests/integration/routes/contentEntriesRoutes.test.ts` — add the two paths to
  the registration assertion and a `mapContentEntryError` case for
  `entry_revision_not_found`.
- Optional end-to-end DB flow mirroring
  `tests/integration/posts/posts-revisions-flow.test.ts`: publish → list → restore
  → assert restored data + 404 on bad revision id.
- `set -a && source .env && set +a` before DB-backed tests.
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- Update `_docs/CMS_API.md` with the two endpoints on closure.
- No DB schema change → **no migration artifacts**.
