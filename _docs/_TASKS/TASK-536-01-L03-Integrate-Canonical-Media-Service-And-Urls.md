# TASK-536-01-L03: Integrate Canonical Media Service and URLs

# FileName: TASK-536-01-L03-Integrate-Canonical-Media-Service-And-Urls.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-01
**Priority:** Critical
**Category:** Media Service / Security / Compatibility
**Estimated Effort:** Large
**Dependencies:** TASK-536-01-L01, TASK-536-01-L02
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope and exclusive ownership

This leaf is the only TASK-536 writer of:

- `core/services/media/mediaService.ts`;
- new `core/services/media/mediaUrlProjection.ts`;
- the recent-media projection only in `core/services/dashboard/dashboardService.ts`;
- post-audit active/passive and usage projections in
  `core/admin/services/mediaClient.ts`, `core/admin/ui/media/types.ts`,
  `core/admin/ui/media/utils.ts`, `core/admin/ui/media/MediaPicker.tsx`, and
  `core/admin/ui/media/MediaDetailsDrawer.tsx`; and
- the active Post block media consumer in
  `core/admin/ui/posts/editor/PostEditorCanvas.tsx`.

It integrates the pure byte identity and `putMedia` adapter path into upload/replace,
removes caller-controlled sniffing, and ensures media-domain and dashboard results never
expose a persisted provider URL. It owns changed-behavior updates in:

- `tests/unit/media/mediaService.test.ts`;
- new `tests/vitest/services/mediaUrlProjection.test.ts`;
- `tests/vitest/admin/mediaUtils.test.ts`;
- `tests/vitest/ui/media-picker.test.tsx`, `tests/vitest/ui/media-card.test.tsx`,
  and `tests/vitest/ui/media-details.test.tsx`;
- `tests/vitest/ui/post-editor-canvas-wave.test.tsx` for projected-kind admission and
  legacy selected-record rendering;
- `tests/unit/server/publicFormsUploadApi.test.ts` (canonical-byte fixtures plus removal
  of shared storage-settings mutation); and
- `tests/unit/dashboard/dashboardService.test.ts`.

`tests/unit/media/mediaMeta.test.ts`, `tests/integration/routes/media.test.ts`, the
L02-owned `tests/unit/backups/backupRemoteStorage.test.ts`, and
`tests/unit/backups/backupService.test.ts` are read-only compatibility gates. TASK-536-04
reruns `publicFormsUploadApi.test.ts` read-only and owns its security changes in the other
L04 test files. L03 must not edit the trust owner, adapters, HTTP delivery, Forms route
source, other tests, docs, task indexes, or changelog files.

Grounded seams: `mediaService.ts:41-77` allowlists/types; `:211-317` conditional
sniff/declaration logic; `:328-388` upload; `:391-395` list/get; `:456-508` replace;
`dashboardService.ts:158-182` selects and returns persisted `media.url` directly.

## Implementation Pseudocode

```ts
async function prepareCanonicalUpload(file, constraints, globalConfig) {
  global max must be a finite positive safe integer (absent uses the fixed 10 MiB
    service default; malformed configured state fails media_storage_unavailable);
  if constraints.maxSizeBytes is present, require a finite nonnegative safe integer or
    throw media_file_invalid; absent field max is Infinity;
  const maxBytes = min(normalized global max, normalized/absent field max);
  if file.size is not a finite, nonnegative safe integer: throw media_file_invalid;
  if file.size > maxBytes: throw media_file_too_large before arrayBuffer;
  materialized = await file.arrayBuffer, mapping throw/non-ArrayBuffer to media_file_invalid;
  // UploadFile exposes only arrayBuffer, so allocation is body-parser-bounded by L04;
  // this service check is necessarily post-materialization defense in depth.
  if materialized.byteLength > maxBytes: throw media_file_too_large;
  buffer = Buffer.from(materialized);
  const identity = canonicalizeMediaBytes(buffer); // L01
  if (identity === null) throw media_mime_not_allowed;
  if (!isMimeAllowed(identity.mimeType, globalConfig.allowedMime))
    throw media_mime_not_allowed;
  if (!mimeMatchesAccept(identity.mimeType, constraints?.allowedMime))
    throw media_mime_not_allowed;
  if identity is SVG or octet-stream:
    require an exact canonical MIME entry in the global policy;
    when a field constraints object is present, also require an exact entry in its
      allowedMime list (missing/empty/wildcard-only is not explicit authorization);
    // Wildcard/name/declaration cannot admit active SVG or unknown bytes.
  return {
    buffer,
    identity,
    storageBytes: { size: buffer.byteLength, arrayBuffer: exact buffered bytes },
  };
}

type UploadConstraints = {
  allowedMime?: string[];
  maxSizeBytes?: number;
  /** Deprecated staged compatibility input; deliberately ignored. */
  sniffContent?: boolean;
};

const MAX_MEDIA_DISPLAY_NAME_BYTES = 255;
function normalizeDisplayFileName(name, canonicalExtension) {
  if name is not a string, use fallback;
  take basename after either `/` or `\\`; remove C0/C1 controls, bidi controls and
    unpaired surrogates; normalize NFC; trim Unicode whitespace; remove trailing dots/
    spaces; truncate by whole Unicode code point to <=255 UTF-8 bytes; remove any new
    trailing dot/space after truncation;
  if empty, return `upload${canonicalExtension}`;
  // It may populate originalName/title/downloadName but never MIME, key, or delivery.
}

// mediaUrlProjection.ts: pure and shared with dashboardService.
function tryBuildAddressableMediaPath(key) {
  try return buildMediaDeliveryPath(key);
  catch return null;
}
function resolveMediaKeyProjection({ id, key }) {
  path = tryBuildAddressableMediaPath(key);
  if path return { addressable: true, url: path };
  return {
    addressable: false,
    url: `/media/%00unavailable/${id}`, // decoded NUL is always key-invalid
  };
}

function toMediaDomainRow(row) {
  return { ...row, url: resolveMediaKeyProjection(row).url };
}

export type MediaDeliveryRecord = {
  key: string;
  mimeType: string;
  originalName: string | null;
  size: number;
};

export async function getMediaDeliveryRecordByKey(
  key: string
): Promise<MediaDeliveryRecord | null> {
  const [row] = await db.select({
    key: media.key,
    mimeType: media.mimeType,
    originalName: media.originalName,
    size: media.size,
  }).from(media).where(eq(media.key, key)).limit(1);
  return row ?? null; // no provider URL or unrelated media projection
}

uploadMedia(...) {
  prepared = await prepareCanonicalUpload(...);
  passive = isPassiveCanonicalMediaMime(prepared.identity.mimeType);
  type = passive ? "image" : "file"; // active SVG remains attachment/file
  dimensions = read only when passive;
  adapter = resolve inside the same media_storage_unavailable try as putMedia;
  stored = await adapter.putMedia({
    bytes: prepared.storageBytes,
    identity: prepared.identity,
    downloadName: normalized display filename,
  });
  proxyUrl = tryBuildAddressableMediaPath(stored.key);
  if proxyUrl is null: media_storage_unavailable with zero delete/DB work;
  try insert key=stored.key, proxy url, normalized originalName/title/downloadName,
    canonical mime/type/actual size/dimensions;
  catch/no returning row: best-effort delete stored.key, then media_storage_unavailable;
  return toMediaDomainRow(row);
}

replaceMedia(...) {
  require existing row;
  prepared = await prepareCanonicalUpload(...);
  resolve/store/validate proxy exactly as upload;
  try update the row to the complete new canonical fields;
  on update throw: best-effort delete new key, preserve old row/key, then
    media_storage_unavailable;
  on no returned row: best-effort delete new key, never delete old key, then
    media_not_found;
  only after returned update: best-effort delete old key when the old projection is
    addressable; otherwise perform zero cleanup adapter I/O;
  return toMediaDomainRow(row);
}

list/get/update/recover results:
  map every returned row through toMediaDomainRow;
  recover only when persisted mime is an own canonical passive MIME,
    isPassiveCanonicalMediaMime returns true, and key projection is addressable;
    SVG/alias/active/unsafe-key rows never resolve an adapter or call adapter.get;

delete:
  addressable key preserves adapter-delete-then-row behavior;
  unsafe key performs zero adapter resolution/I/O and deletes only its DB metadata row;

dashboard recent media:
  select id/key (not media.url) and set path=resolveMediaKeyProjection(row).url;

admin media projection:
  derive passive image MIME membership from CANONICAL_MEDIA_PROFILES, never a
    second regex/list owner;
  function resolveAdminMediaKind(record: Pick<MediaRecord, "type" | "mimeType">): MediaKind:
    `image` requires both a canonical profile with delivery=inline and
      record.type="image";
    SVG and every attachment/unsupported image profile resolve to `document`, even
      though their MIME may start with image/;
    audio/video legacy MIME may retain their non-image icon kind, otherwise document;
  function toMediaItem(record: MediaRecord): MediaItem:
    pass both persisted type and MIME to resolveAdminMediaKind;
  function matchesAccept(item: Pick<MediaItem, "type" | "mimeType">, accept?): boolean:
    empty or */* accepts any projected item;
    exact MIME match wins, including an explicitly authored exact SVG file MIME;
    image/* requires both image/ MIME prefix and item.type="image";
    other family wildcards require their matching projected family kind;
  card/details image preview, focal point, and alt warnings consume projected kind
    and therefore cannot render SVG through an img element;
  Post image/gallery/video/audio/file pickers consume only the shared projected
    MediaItem.type, never a second MIME-prefix classifier;
  Post image/gallery rendering rechecks the projected kind for already persisted media
    IDs, so legacy SVG, unsupported image MIME, and persisted-type mismatches fall back
    to the editor placeholder instead of an img element; explicit legacy URL overrides
    retain their existing separate compatibility path;

admin usage projection:
  include `submission` in the server-client/UI usage discriminant;
  map it to a stable non-image icon before rendering AdminLink;
  keep the server-provided bounded href/title/context unchanged;

test-only dependencies:
  production defaults own config loading, adapter resolution, insert and replace update;
  __setMediaServiceDepsForTests(partial|null) is forbidden when NODE_ENV=production,
    merges typed overrides only for Bun tests, and is reset in every test finally/afterEach;
```

Delete the `sniffContent` branch and declaration-based duplicate sniff helpers. Retain
the optional `UploadConstraints.sniffContent` property only as an explicitly deprecated,
ignored staged compatibility input because `formsRoutes.ts` remains owned by
TASK-536-04-L01 and still passes it until that later leaf. True, false, and omitted must
execute byte canonicalization identically; captcha/auth callers cannot influence
preparation. Provider `StoredMedia.url` is ignored by this domain; the
backup subsystem retains its generic adapter path and artifact URL behavior.
This leaf is the sole policy/error owner: L01 only returns a canonical identity or
`null`; this service applies both effective allowlist layers and is the only seam that
maps byte or allowlist rejection to `media_mime_not_allowed`.

## Error and compatibility flow

- Malformed/unreadable transport fails `media_file_invalid`; declared or actual oversize
  fails `media_file_too_large`; bad/forbidden bytes or policy mismatch fails
  `media_mime_not_allowed`. None reaches adapter or DB.
- Adapter resolver/put failure maps to `media_storage_unavailable`. A returned key that
  fails projection validation is never passed to `adapter.delete`; it fails before DB
  with zero cleanup I/O. After a projection-validated new key exists, DB insert/update
  failure compensating-deletes it best effort and maps to `media_storage_unavailable`.
  A replace no-row race maps to `media_not_found`; cleanup failure never masks the pinned
  primary error.
- Replacement never deletes the old key until a returned DB update points at the new key;
  post-success old-object cleanup remains best effort.
- Existing DB rows are not rewritten. List/get/update adapt their URL in memory to
  `/media/<encoded key>`; new/replacement writes persist that route. An unsafe historical
  key maps to `/media/%00unavailable/<media-id>` instead of throwing the whole list or
  falling back to `media.url`; the delivery handler decodes the NUL, rejects before DB/
  storage lookup, and returns its safe invalid-key 4xx.
  Dashboard recent-media projection uses the same helper. No provider URL leaves either
  surface.
- Unsafe historical keys are never passed to adapter `get` or `delete`: recover returns
  the projected unavailable row without adapter resolution, successful replace skips old-
  key cleanup, and delete removes only the metadata row. This intentionally orphans an
  unaddressable legacy object rather than risking filesystem/provider traversal.
- No endpoint, migration, schema version, permission, or backup contract changes.
- Admin code does not reinterpret an attachment-only `image/*` MIME as inline image.
  The server-owned passive boundary reaches cards, details, and image-only pickers.
- Persisted Form submission usage round-trips through the admin client and renders a
  stable usage row; the pre-submit upload remains unreferenced until final submission.
- The HTTP seam receives only the minimal delivery projection; provider URL and unrelated
  metadata never cross that boundary.

## Regression-test shape

This leaf updates all four owned suites before the source gate and reruns the four named
consumer/backup suites read-only and sequentially. Tests prove upload/replace parity,
unconditional canonicalization for every service call with deprecated `sniffContent`
true/false/omitted parity, exact SVG/octet-stream allowlisting,
global/field effective canonical-MIME allowlists, rejected input/no adapter or DB write,
resolver/storage failure/no row, upload DB-failure new-key compensation, replace
update-throw/no-row compensation, and fake-adapter unsafe-key upload/replace cases that
map `media_storage_unavailable`, perform zero delete/DB mutation, and never consult provider
URL. Validated-key DB failures compensating-delete the new key. An event-order assertion
proves old-key deletion observes the DB already pointing at the new key. Upload insert-
throw plus cleanup-delete-throw still returns `media_storage_unavailable`; replace no-row
plus cleanup-delete-throw still returns `media_not_found` and never deletes the old key.
They pin persisted route URLs,
safe and unsafe legacy list/get/update/recover projection, passive PNG recovery versus
SVG/legacy-alias no-read behavior, PNG/BMP create+replace as `image`, SVG create+replace
as `file` with null dimensions, dashboard proxy paths, and proof that mediaService
calls `putMedia` while
ignoring `StoredMedia.url`/never calling `getPublicUrl`, while the read-only backup suite
proves backupService continues to call generic `put`. TASK-536-05-L01 owns later additive
cross-layer cases and final reruns only.

Fixtures use structurally valid canonical bytes from the L01 corpus. Declared MIME and
filename mismatches must not be preserved as identity; tests with empty/parameterized/
poisoned declarations assert byte-owned canonical MIME and extension. Oversize tests
prove both an honest declared oversize is rejected before `arrayBuffer` and a lying small
size is rejected after the bounded actual-byte check; NaN, fractional, negative, and
unsafe-integer field caps fail `media_file_invalid` without adapter/DB work. An absent/
null global max uses exactly 10 MiB; zero, fractional, negative, nonfinite, and unsafe-
integer global maxima fail `media_storage_unavailable` before byte read/adapter/DB. The
delivery projection test pins
every upload/list/get/update/recover/replace path to `/media/<encoded key>`, verifies the
persisted route for new writes, and asserts the minimal key lookup returns no provider
URL or unrelated columns.

Display-name tests pin both separator basenames, C0/C1+bidi+unpaired-surrogate removal,
whole-code-point Unicode truncation to at most 255 UTF-8 bytes, trailing-dot removal
after truncation, and empty fallback `upload<canonical-extension>`. The exact normalized
value reaches `originalName`, default title, and adapter `downloadName`, while deceptive
suffixes never influence canonical MIME/key/type.

Dedicated unsafe historical-key tests prove recover performs zero resolver/get, replace
updates to the new safe key but performs zero old-key delete, and delete removes only its
uniquely owned DB row with zero resolver/delete. No unsafe key is ever passed to any
adapter, including compensation paths.

The direct Bun-free `mediaUrlProjection.test.ts` pins encoded safe keys and the
`/media/%00unavailable/<id>` invalid-key sentinel without importing DB/settings/runtime.
Admin Vitest regressions pin SVG/file -> document projection, passive MIME plus
server-type agreement, no SVG img/focal UI, exclusion from `image/*` selection,
and a rendered `submission` usage row with a defined icon. Post canvas regressions pin
the same projected kind for picker admission and for already persisted image/gallery
IDs, so SVG, unsupported images, and persisted-type mismatches cannot reach an img
element. Exact SVG acceptance may remain available only when a caller explicitly
authors that exact file MIME policy.
The Bun media-service suite also proves non-null test dependency overrides are rejected
under `NODE_ENV=production`, a null reset remains allowed, and the prior environment plus
default dependencies are restored in `finally`.

All three owned DB suites create unique media/form/dashboard rows and delete only their
IDs/objects.
They never delete, replace, or snapshot the shared `settings` family: the production-
guarded dependency seam supplies hermetic config/adapters and is reset in `afterEach` and
`afterAll`, including failure paths. The public Forms suite's previous invalid PNG fixture
is replaced with the exact structurally valid L01 corpus fixture. All DB suites in this
gate run with `--parallel=1` because the read-only backup suites still exercise the
singleton storage driver.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bun run test:vitest -- \
  tests/vitest/services/mediaUrlProjection.test.ts \
  tests/vitest/admin/mediaUtils.test.ts \
  tests/vitest/ui/media-picker.test.tsx \
  tests/vitest/ui/media-card.test.tsx \
  tests/vitest/ui/media-details.test.tsx \
  tests/vitest/ui/post-editor-canvas-wave.test.tsx
set -a && source .env && set +a && bun test --parallel=1 --timeout=15000 \
  tests/unit/media/mediaService.test.ts \
  tests/unit/media/mediaMeta.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/integration/routes/media.test.ts \
  tests/unit/dashboard/dashboardService.test.ts \
  tests/unit/backups/backupRemoteStorage.test.ts \
  tests/unit/backups/backupService.test.ts
```

Re-run a named failure alone before classification.
