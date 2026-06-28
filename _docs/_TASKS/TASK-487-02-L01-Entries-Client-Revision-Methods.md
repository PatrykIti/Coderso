# TASK-487-02-L01: Entries Client Revision Methods + Cache Contract
# FileName: TASK-487-02-L01-Entries-Client-Revision-Methods.md

**Parent Subtask:** TASK-487-02
**Priority:** Medium
**Category:** Engine / Entries
**Estimated Effort:** Small
**Dependencies:** TASK-487-01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Add `listEntryRevisions`, `listEntryRevisionsCached`, and
  `restoreEntryRevision` to the entries admin client with the shared cache
  contract (new `entries:revisions:<id>` key), mirroring `postsClient.ts:368-403`.
- **Owning module(s) to create-or-extend:**
  `core/admin/services/entriesClient.ts` (extend — owns the entry admin client +
  its local-cache helpers), `core/admin/services/cachePolicy.ts` (extend — owns
  `cacheKeys` `:28`; add `entryRevisions`).
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md` (posts revisions cache note
  `:472`; entries cache section `:487`), `_docs/ADMIN_CACHE_MAP.md`,
  `_docs/CMS_API.md`.
- **Reference to mirror:** `postsClient.ts` — `PostRevision` type (`:80`),
  `listPostRevisions`/`listPostRevisionsCached` (`:368-380`),
  `restorePostRevision` (`:382-403`), `getCachedPostRevisions`/
  `writePostRevisionsCache` (`:197-237`).
- **Out of scope:** drawer/editor UI (TASK-487-02-L02), backend (TASK-487-01).

---

## Security Contract

- **Endpoint visibility:** `internal` — consumes the L02 routes under the admin
  API; no new endpoints defined here.
- **Auth model:** session (admin), via the shared `apiRequest` client.
- **RBAC:** enforced server-side (`content:read` list / `content:write` restore).
  Client adds no bypass.
- **CSRF:** the `restoreEntryRevision` POST **must** pass `{ withCsrf: true }`
  (mirror `deleteEntry`/`duplicateEntry`, `entriesClient.ts:388`/`:458`). The GET
  list does not.
- **Rate-limit bucket:** `admin` (server-side).
- **Validation:** server owns it; the client sends an empty body on restore.
- **Anti-abuse:** n/a (internal).
- **Secret/PII handling:** the cached `EntryRevision[]` only carries the
  PII-redacted author shape from TASK-487-01-L01. Do **not** add or persist any
  secret/raw email. Cache lives in the same local-cache layer as other entry
  caches (no new sensitivity).

---

## Implementation Pseudocode

```ts
// core/admin/services/cachePolicy.ts  (add next to postRevisions :40)
entryRevisions: (id: string) => `entries:revisions:${id}`,

// core/admin/services/entriesClient.ts
export type EntryRevisionAuthor = { id: string; name: string | null; email: string };
export type EntryRevision = {
  id: string;
  entryId: string;
  version: number;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: EntryRevisionAuthor | null;
};

const cachedEntryRevisions = new Map<string, EntryRevision[]>();
const isEntryRevisionList = (v: unknown): v is EntryRevision[] => Array.isArray(v);

const readEntryRevisionsCache = (id: string) =>
  readLocalCache(cacheKeys.entryRevisions(id), cacheTtlMs.detail, isEntryRevisionList);

const writeEntryRevisionsCache = (id: string, revisions: EntryRevision[]) => {
  const sorted = [...revisions].sort((a, b) => b.version - a.version);
  cachedEntryRevisions.set(id, sorted);
  writeLocalCache(cacheKeys.entryRevisions(id), sorted);
};

export const getCachedEntryRevisions = (id: string) =>
  cachedEntryRevisions.get(id) ?? readEntryRevisionsCache(id) ?? null;

export async function listEntryRevisions(typeSlug: string, id: string) {
  return apiRequest<EntryRevision[]>(`/content/${typeSlug}/entries/${id}/revisions`, {
    method: "GET",
  });
}

export async function listEntryRevisionsCached(
  typeSlug: string,
  id: string,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = getCachedEntryRevisions(id);
    if (cached) return cached;
  }
  const revisions = await listEntryRevisions(typeSlug, id);
  writeEntryRevisionsCache(id, revisions);
  return revisions;
}

export async function restoreEntryRevision(typeSlug: string, id: string, revisionId: string) {
  const result = await apiRequest<{
    ok: boolean;
    restored: boolean;
    revision: EntryRevision;
    entry: EntryDetail;
  }>(
    `/content/${typeSlug}/entries/${id}/revisions/${revisionId}/restore`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.entry) {
    upsertCachedEntry(typeSlug, result.entry); // existing helper :152
    // restore may write a new "pre-restore" revision -> invalidate the list
    broadcastCacheEvent({ key: cacheKeys.entryRevisions(id), action: "invalidate" });
    broadcastCacheEvent({ key: cacheKeys.entriesList(typeSlug), action: "update" });
    broadcastAllEntriesListEvent("update"); // existing :236
    broadcastCacheEvent({ key: cacheKeys.entryDetail(typeSlug, id), action: "update" });
  }
  return result;
}
```

**Data flow:** UI calls `listEntryRevisionsCached` (hydrate from local cache,
else fetch + write) and `restoreEntryRevision` (POST with CSRF → patch entry
detail/list caches + invalidate the revisions cache + broadcast on `cacheBus`).
Follow the existing entries cache helpers; do **not** introduce a
mount-force-refetch loop or overwrite dirty editor state.

**Error handling:** propagate `apiRequest` `ApiError`s to the caller (UI shows
them); no swallowing.

**Regression-test shape (Vitest, mirror `postsClient.test.ts`):**

- `listEntryRevisionsCached` returns cached array on second call without a second
  fetch; `force: true` refetches and rewrites cache (sorted desc by version).
- `restoreEntryRevision` patches `entries:detail:<typeSlug>:<id>`, invalidates
  `entries:revisions:<id>`, and broadcasts the expected `cacheBus` events.
- restore sends `withCsrf: true`; list GET does not.

---

## Testing Requirements

- Lane: **Vitest** (admin client is Bun-free).
- Extend the existing `tests/vitest/admin/entriesClient.test.ts` (already
  covers the entry client cache contract), modeled on the revision cases in
  `tests/vitest/admin/postsClient.test.ts` (mock `apiRequest`/`cacheBus`,
  assert cache + broadcast contract).
- `bun --cwd core lint`, `bun --cwd core lint:types`.
- Update `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` with the
  `entries:revisions:<id>` key on closure.
- No DB schema change → **no migration artifacts**.
