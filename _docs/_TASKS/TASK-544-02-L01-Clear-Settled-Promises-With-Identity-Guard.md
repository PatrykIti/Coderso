# TASK-544-02-L01: Clear Settled Promises with Identity Guard

# FileName: TASK-544-02-L01-Clear-Settled-Promises-With-Identity-Guard.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-02
**Priority:** Medium
**Category:** Admin Cache / Async Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-544-02
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Refactor listMediaFoldersCached so the exact request clears its dedupe slot in finally.
Keep cache writes on successful validated data only. Canonically project successful rows to
the exact six-field browser shape and use the same structural contract to validate persisted
cache envelopes.

## Source and direct-test ownership

This leaf is the sole TASK-544 writer of:

- core/admin/services/mediaFoldersClient.ts;
- tests/vitest/admin/mediaFoldersClient.test.ts.

It must not edit cacheBus/cachePolicy, MediaLibraryPage, MediaFolderRail, other tests,
docs, tasks, or changelog indexes. Add the promise-identity compatibility regressions
before the source gate; closure reruns this suite read-only and never rebaselines it.

## Implementation Pseudocode

~~~ts
let foldersRequestGeneration = 0;
const MEDIA_FOLDERS_RESPONSE_INVALID = "media_folders_response_invalid";
const MEDIA_FOLDER_KEYS = Object.freeze([
  "id", "name", "slug", "parentId", "orderIndex", "createdAt"
]);

class MediaFoldersResponseError extends Error {
  readonly code = MEDIA_FOLDERS_RESPONSE_INVALID;
  constructor() {
    super("Invalid media folders response"); // fixed, bounded, payload-free
    this.name = "MediaFoldersResponseError";
  }
}

function readOwnDataValue(value: unknown, key: PropertyKey): {value: unknown} | null {
  require value is a non-null object;
  try descriptor = Object.getOwnPropertyDescriptor(value, key);
  catch: return null;
  if !descriptor or !("value" in descriptor): return null;
  return { value: descriptor.value };
}

function projectMediaFolder(value: unknown): MediaFolder | null {
  require Object.getPrototypeOf(value) is Object.prototype or null, catching lookup failure;
  read all 6 required fields only through readOwnDataValue, never ordinary property access;
  require string id/name/slug/createdAt, string|null parentId, and finite non-negative
    integer orderIndex;
  return a newly allocated object containing exactly the 6 MEDIA_FOLDER_KEYS;
  // Ignore without reading every unknown key, including createdBy; no getter executes.
}

function isCanonicalMediaFolder(value: unknown): value is MediaFolder {
  projected = projectMediaFolder(value);
  if !projected: return false;
  safely obtain own keys and require exactly MEDIA_FOLDER_KEYS with no symbols/unknowns;
  return true;
}

function isCanonicalMediaFolderList(value: unknown): value is MediaFolder[] {
  safely require a real array and its own data-property length;
  walk every index from 0 to length - 1 through own data-property descriptors so sparse
    slots/accessors/proxy failures reject rather than being skipped by Array.prototype.every;
  return every item passes isCanonicalMediaFolder;
}

function normalizeMediaFolderList(value: unknown): MediaFolder[] {
  safely require a real dense array;
  for every own data-property item: projected = projectMediaFolder(item);
  if any structural read/projection fails: throw new MediaFoldersResponseError();
  return projected rows; // exact six-field copies; preserve the complete array and values
}

const foldersCache = createMemoryBackedLocalCache({
  key: cacheKeys.mediaFolders,
  ttlMs: cacheTtlMs.list,
  validate: isCanonicalMediaFolderList,
});

async function listMediaFoldersCached(options) {
  if !force:
    cached = getCachedMediaFolders();
    if cached: return cached;
    if cachedFoldersPromise: return cachedFoldersPromise;

  const generation = ++foldersRequestGeneration;
  const rawRequest = listMediaFolders();
  let request: Promise<MediaFolder[]>;
  request = rawRequest.then((value) => {
    items = normalizeMediaFolderList(value);
    if (foldersRequestGeneration === generation && cachedFoldersPromise === request) {
      foldersCache.write(items); // only the newest authoritative request may prime
    }
    return items;
  }).finally(() => {
    if (cachedFoldersPromise === request) {
      cachedFoldersPromise = null;
    }
  });
  cachedFoldersPromise = request; // concurrent callers share validation + cache semantics
  return request;
}

clearMediaFoldersCache() {
  foldersRequestGeneration += 1; // invalidates every older completion
  cachedFoldersPromise = null;
  foldersCache.clear();
}
~~~

Do not clear the slot from `primeFoldersCache` as a side effect that lacks request
identity. Force reads and mutation invalidation advance the generation. An older caller
may still receive its own successfully validated response, but it may neither prime data
nor clear the newer promise identity. Do not add a browser-only item-count or string-length
cap: the existing endpoint is unpaginated and valid full-array behavior remains compatible.
The finite structural walk must inspect every actual index and reject sparse/accessor-backed
required data without invoking getters.

## Error and compatibility contract

The original API/client error propagates. Rejection writes no cache and the next call
creates a new request. Malformed success payloads throw only `MediaFoldersResponseError`
with explicit `code: "media_folders_response_invalid"` and a fixed payload-free message;
raw payload content is never logged or rendered. Successful network rows are copied to the
exact six-field `MediaFolder` shape before return/cache, so backend-only `createdBy` and
unknown additions never persist. Persisted rows must already be exact; invalid envelopes are
evicted by `createMemoryBackedLocalCache` and fall through to the normal network path.
Successful requests otherwise preserve values, full-array behavior, and TTL.
Mutation invalidation and cacheBus broadcasts remain after mutation success only.

## Direct regression-test shape

This leaf owns its test edits. Use deferred promises for:

- concurrent non-force calls share one request;
- rejection clears the slot and retry performs a second request;
- old request settles after a newer forced request and cannot clear/overwrite the newer
  identity/data;
- arrays with holes, missing/wrong required item fields, non-integer/negative order, custom
  prototypes, required-field accessors, revoked/throwing descriptor proxies, and malformed
  array index descriptors reject with the exact typed code, without cache writes or getter
  execution;
- valid network rows containing `createdBy`, unknown plain keys, or unknown accessors succeed
  as exact six-field copies; unknown getters are not invoked and neither returned/cache data
  retains those keys;
- malformed localStorage envelopes (missing/wrong fields, unknown keys including
  `createdBy`, sparse-equivalent JSON values) are evicted, perform a network request, and
  never hydrate memory; a canonical six-field envelope hydrates without a request;
- success writes once, persists only the canonical projection, and later reads use cache;
- clear/mutation behavior remains compatible.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/mediaFoldersClient.test.ts
~~~

Re-run the file alone before declaring a failure.

## Acceptance criteria

- No rejected promise is sticky.
- Identity checks prevent old/new overlap corruption.
- Network and persisted-cache paths share the six-field structural contract; unknown
  transport fields are stripped before return/persistence and malformed envelopes evict.
- Successful cache and broadcast contracts remain unchanged.

## Completion evidence

Implemented and verified exactly as contracted. Rejection is retryable, old/new promise
overlap is identity- and generation-safe, malformed responses fail with the fixed
payload-free code, and backend-only/unknown keys never enter returned or persisted folder
rows. The client suite passed within the final 78/78 targeted Vitest tests.
