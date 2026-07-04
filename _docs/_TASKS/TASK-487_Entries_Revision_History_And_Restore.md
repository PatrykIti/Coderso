# TASK-487: Entries — Revision History & Restore
# FileName: TASK-487_Entries_Revision_History_And_Restore.md

**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

Content entries already accumulate revisions on every publish, but those
snapshots can never be viewed or restored. `publishEntry`
(`core/services/content/entryService.ts:816`) calls `createEntryRevisionTx`
(`:828`), which writes a row into the `content_revisions` table
(`core/db/schema.ts:825`). A read helper `listEntryRevisions` exists
(`core/services/content/entryService.ts:962`) but is **unused by any route**:
there is no `/revisions` or `/restore` endpoint in
`core/server/routes/contentEntryRoutes.ts`, no client method in
`core/admin/services/entriesClient.ts`, no restore service, and no UI.

Every other publishable surface (Posts, Pages, Detail Pages) exposes
`GET .../revisions` + `POST .../revisions/:revisionId/restore`. This task brings
content entries to parity: editors can open a revision history drawer for an
entry, preview an earlier snapshot, and restore it — closing a silent
data-accumulation gap that has zero user value today.

`CONTENT_TYPES_SPEC.md:9` already lists "Revisions dla entries" as in-scope for
the content engine, so this is a contract completion, not a new product surface.

---

## Scope

### In scope

- Backend read + restore for entry revisions, mirroring the
  posts/pages route+service pattern:
  - `GET /content/:type/entries/:id/revisions` (`content:read`)
  - `POST /content/:type/entries/:id/revisions/:revisionId/restore`
    (`content:write`)
  - a `restoreEntryRevision` service in `entryService.ts`
  - upgrade the existing `listEntryRevisions` to a typed, author-joined,
    PII-redacted read shape (the raw row helper is currently unused by routes).
- Admin client methods + shared-cache wiring (`entries:revisions:<id>`) and a
  revision history drawer in the entry editor, mirroring
  `PostRevisionDrawer.tsx`.
- Two low-risk riders that are adjacent to the entry editor surface:
  - wire the dead Tags `<Input>` in `EntryCreateDrawer.tsx` (~`:190`),
  - surface SEO `title` / `canonicalUrl` / `robots` in the metadata panel
    (the `updateEntryMetadata` service already accepts them; only `description`
    is currently surfaced).

### Out of scope

- No new DB schema. `content_revisions` already exists with the exact columns
  needed (`id`, `entryId`, `version`, `data`, `createdAt`, `createdBy`); **no
  migration artifacts are required** by this task.
- No autosave-revision flow for entries (posts/pages have autosave; entries only
  snapshot on publish — keep that behavior, do not add autosave here).
- No revision deletion/discard endpoint (pages expose
  `DELETE .../revisions/:revisionId` for autosave discard only; entries have no
  autosave revisions to discard).
- No public endpoints. All routes stay internal `/admin/api/*`.

### What TASK-479 reskin already covers vs what this task adds

- TASK-479 (admin redesign prototype) only reskins existing editor chrome; it
  does **not** add a revision history surface for entries. This task adds the
  missing data path (service + route + client + drawer), then the redesign can
  reskin the new drawer like it does the posts/pages drawers.

---

## Sub-Tasks

| ID | Title | Effort | Status |
|----|-------|--------|--------|
| TASK-487-01 | Backend: entry revisions read + restore (service + routes) | Medium | ⏳ To Do |
| TASK-487-02 | Admin: entries client revision methods + revision drawer UI | Medium | ⏳ To Do |
| TASK-487-03 | Riders: wire dead Tags input + surface SEO fields | Small | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun lane (runtime/route/DB-backed): route registration + `map*Error` coverage
  in `tests/integration/routes/contentEntriesRoutes.test.ts`; restore/read
  service flow in `tests/unit/content/entryService.test.ts` (DB-backed, Bun
  lane); end-to-end revision flow mirroring
  `tests/integration/posts/posts-revisions-flow.test.ts`.
- Vitest lane (Bun-free): admin client cache contract in
  `tests/vitest/admin/entriesClient.test.ts`; editor drawer + riders render
  flows in `tests/vitest/ui/content-entry-editor.test.tsx` (or a sibling under
  `tests/vitest/ui-integration/*`).
- Before any DB/settings test: `set -a && source .env && set +a`.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — add the two new entry endpoints under the content-entries
  section (`:2485`+), mirroring the posts revisions doc (`:791`).
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — document the new
  `entries:revisions:<id>` cache key and its invalidation/broadcast behavior,
  mirroring the posts revisions cache note (`ADMIN_CACHE.md:472`).
- `_docs/CONTENT_TYPES_SPEC.md` — mark "Revisions dla entries" (`:9`) as
  delivered when the task closes.
- Task board + changelog handled by the orchestrator (do not edit
  `_docs/_TASKS/README.md` or add changelog entries from this authoring pass).

---

## Notes

- Mirror, do not reinvent: the canonical reference is
  `restorePostRevision` (`core/services/content/postsService.ts:973`) +
  `postsRoutes.ts:358-380` + `postsClient.ts:368-403` + `PostRevisionDrawer.tsx`.
- Restore replaces `content_entries.data` with the revision snapshot through
  `updateEntry`, which re-runs `validateEntryData`. Restoring a snapshot that no
  longer matches the current content-type schema must surface a clean validation
  error, not a 500 — covered explicitly in TASK-487-01-L01.
- Revision `createdBy` is a user id; the read shape must join `users` and run
  email through `resolveEmailValue` (`core/services/security/piiEmail.ts:118`)
  so raw/encrypted email never reaches the client cache.
