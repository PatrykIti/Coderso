# TASK-514-02: Entries Admin Client — Visibility Types & Cache Round-Trip

# FileName: TASK-514-02-Entries-Admin-Client-Visibility-Roundtrip.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Admin Client / Cache
**Estimated Effort:** Small
**Dependencies:** TASK-514-01 (server returns `visibility` + `hasPassword` from **all three** read projections — per-type `entryListSelection`/`mapEntryListSelectionRow` at `entryService.ts:435-494`, the all-entries `listEntriesWithContentTypes` inline select+map at `entryService.ts:542-600`, and `getEntry` at `entryService.ts:602-664` — and accepts them in the metadata payload). See "Hard dependency on 514-01 read-path coverage" below.
**Status:** ⏳ To Do

---

## Overview

Thread the new `visibility` + `hasPassword` fields (from 514-01) through the admin
entries client so the redesigned Publish card (514-04) and list (514-05) can read
and write them, preserving the existing local-cache round-trip and cache-bus
broadcast behavior. Pure type + mapping additions — no new request, no new cache
key, no fetch behavior change.

**Owned files (sole writer):**
- `core/admin/services/entriesClient.ts`.

**Do NOT** edit `entryService.ts` (514-01), any admin UI (514-03/04/05), or add a
new cache resource. **Shared-file flag:** TASK-487-02-L01 also edits
`entriesClient.ts` (revision methods) — additive, disjoint symbols; coordinate
land order (see parent). Keep additions localized to the type blocks + the two
mapping helpers.

---

## Hard dependency on 514-01 read-path coverage (all THREE projections)

The client type surface here is a promise about server payloads. Three DISTINCT
server projections in `entryService.ts` feed the read endpoints this subtask's
types cover, and each has its own `.select({...})` + row map — extending one does
NOT extend the others:

| Server symbol | Anchor | Feeds client | Client type |
| --- | --- | --- | --- |
| `entryListSelection` + `mapEntryListSelectionRow` | `:435-494` (via `listEntries` `:496`, `listEntriesForListing` `:515`) | `listEntries` → `/content/{slug}/entries` | `EntrySummary[]` |
| `listEntriesWithContentTypes` (inline select `:544-564`, map `:570-599`) | `:542-600` | `listAllEntries` → `/content-entries` | `EntryListItem[]` |
| `getEntry` (inline select `:604+`) | `:602-664` | `getEntryDetail` → `/content/{slug}/entries/{id}` | `EntryDetail` |

**Coordinate with the parent / 514-01:** 514-01's owned-file anchor list MUST
include `listEntriesWithContentTypes` (`:542-600`) alongside `entryListSelection`
and `getEntry`, and 514-01's acceptance MUST assert all three projections return
`visibility` + `hasPassword`. If 514-01 covers only the per-type selection +
`getEntry`, the all-entries list breaks the required-field contract declared here
(see plan item 5). This subtask must not land until 514-01 covers the third
projection; the round-trip test below asserts it end-to-end for the all-entries
path.

---

## Execution-Ready Plan

`entriesClient.ts` verified anchors: `EntrySummary` (`:14-28`), `EntryDetail`
(`:52-54`), `EntryMetadataPayload` (`:69-78`), `toEntrySummary` (`:98-112`),
`toEntryDetail` (`:114-117`), `updateEntryMetadata` (`:354-378`).

1. **`EntrySummary` (`:14-28`)** — add:
   ```ts
   visibility: "public" | "private" | "password";
   hasPassword: boolean;
   ```
   (These flow into `EntryListItem` + `EntryDetail` which extend `EntrySummary`.)

2. **`EntryMetadataPayload` (`:69-78`)** — add optional write fields:
   ```ts
   visibility?: "public" | "private" | "password";
   accessPassword?: string | null; // plaintext out; server hashes; null clears
   ```

3. **`toEntrySummary` (`:98-112`)** — carry the read fields through the cache
   normalizer so cached list/detail rows keep them:
   ```ts
   visibility: entry.visibility,
   hasPassword: entry.hasPassword,
   ```
   `toEntryDetail` already spreads `toEntrySummary` — no extra change.

4. **`updateEntryMetadata` (`:354-378`)** — no body change: it already
   `JSON.stringify(payload)`; the new optional fields ride through. The
   `upsertCachedEntry` + broadcast (`:368-376`) already refresh caches; the new
   fields update via the returned `EntryDetail`. Verify the mem+local cache
   round-trip keeps `visibility`/`hasPassword` (they are part of `EntrySummary`).

5. **Present-only guard — and why a client default cannot cover ANY list-load
   path.** Because `visibility`/`hasPassword` are declared **required** on
   `EntrySummary` (`:14-28`), they propagate to `EntryListItem`
   (`EntryListItem = EntrySummary & {...}`, `:37-39`) and `EntryDetail` (`:52-54`).
   For that type to be TRUE at runtime, **all three** server read projections
   (see "Hard dependency" above) must physically select + map both fields. A
   client-side defensive default in `toEntrySummary` would NOT protect either
   list-load path, because **both list loaders prime the cache with RAW server
   rows, bypassing `toEntrySummary` entirely**:
   - `listAllEntriesCached` (`:270-281`): `const items = await request;
     primeAllEntriesCacheInternal(items)` (`:279`) writes the **raw** server
     `EntryListItem[]` straight into mem + localStorage (`:138-142`).
   - `listEntriesCached` (`:253-268`): `const items = await request;
     primeEntriesCacheInternal(typeSlug, items)` (`:266`) writes the **raw** server
     `EntrySummary[]` straight into mem + localStorage (`:135`) — the identical raw
     pattern as the all-entries path.

   `toEntrySummary` (`:98-112`) is applied ONLY inside `upsertCachedEntry`
   (`:152-166`) — i.e. on **single-entry** paths: `getEntryCached`'s network branch
   (`:302`), `createEntry`, `updateEntry`, `updateEntryMetadata`, `duplicateEntry`
   — plus the cached-list→detail fallback via `toEntryDetail(match)` (`:299`). So a
   default in `toEntrySummary` would soften only single-entry mutations/detail
   reads, NOT either bulk list load. If `listEntriesWithContentTypes` (or
   `entryListSelection`) omits the fields, list rows carry
   `visibility/hasPassword === undefined` at runtime while the type claims they
   exist (a type lie the 514-05 badge reads off list rows). Conclusion: physical
   server coverage of all three selections is **mandatory** — the server is the
   single source; we keep the type honest and add **no** client default.

---

## Acceptance Criteria

1. `EntryDetail`/`EntryListItem` (via `EntrySummary`) expose `visibility` +
   `hasPassword`; `EntryMetadataPayload` accepts `visibility` + `accessPassword`.
2. A metadata update round-trips visibility through the in-memory + localStorage
   cache (`getCachedEntryDetail` returns the new visibility after
   `updateEntryMetadata`).
3. `accessPassword` is send-only — it never appears on any cached/returned entry
   object (it is not a field of `EntrySummary`).
4. No new cache key / request / broadcast added; existing broadcasts unchanged.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free (admin client is Bun-free)

- `toEntrySummary` preserves `visibility` + `hasPassword`.
- `updateEntryMetadata` posts the payload including `visibility`/`accessPassword`
  (mock `apiRequest`) and, on the returned detail, primes the cache with the new
  `visibility`/`hasPassword` (read back via `getCachedEntryDetail`).
- Type-level: `EntryMetadataPayload` accepts `{visibility, accessPassword}` (excess
  fields would fail root `tsc` including tests — see the typecheck scope gotcha).
- **All-entries raw-prime path:** `listAllEntriesCached` (mock `apiRequest` to
  return `EntryListItem[]` carrying `visibility`/`hasPassword`) primes the
  all-entries cache via `primeAllEntriesCacheInternal` and reads back rows that
  still carry both fields — proving the raw prime (`:138-142`, no `toEntrySummary`)
  round-trips them and locking in that the third server projection
  (`listEntriesWithContentTypes`) must supply them.

### SMOKE

Covered indirectly by the 514-06 visibility flow (write via panel → cache → reload).

---

## Deferred

Revision client methods (TASK-487-02-L01). Any new cached resource.
