# TASK-514-02: Entries Admin Client — Visibility Types & Cache Round-Trip

# FileName: TASK-514-02-Entries-Admin-Client-Visibility-Roundtrip.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Admin Client / Cache
**Estimated Effort:** Small
**Dependencies:** TASK-514-01 (server returns `visibility` + `hasPassword`, accepts them in the metadata payload)
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

5. **Present-only guard.** A server response that (transitionally) omits
   `visibility` must not crash consumers — but 514-01 always returns it, so no
   defensive default is added here (keeps the type honest). If a defensive default
   is deemed necessary in review, default `visibility` to `"public"` /
   `hasPassword` to `false` in `toEntrySummary` and document it.

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

### SMOKE

Covered indirectly by the 514-06 visibility flow (write via panel → cache → reload).

---

## Deferred

Revision client methods (TASK-487-02-L01). Any new cached resource.
