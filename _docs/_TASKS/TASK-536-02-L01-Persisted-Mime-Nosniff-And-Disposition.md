# TASK-536-02-L01: Persisted MIME, Nosniff, and Disposition

# FileName: TASK-536-02-L01-Persisted-Mime-Nosniff-And-Disposition.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-02
**Priority:** Critical
**Category:** HTTP Delivery / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01-L03
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Extract the media HTTP boundary from the monolithic server and replace suffix-driven
local delivery and unqualified remote redirects with a DB-owned delivery decision.
Emit consistent MIME, disposition, nosniff, access, and method semantics for local files
and remote provider objects. TASK-536-04-L01 later performs the one production-server
wiring edit after this handler passes its direct gate.

## Source ownership

This leaf is the only writer of new `core/server/mediaDelivery.ts`. It moves the current
media request boundary into the exported `handleMediaDeliveryRequest(req)` handler and
keeps policy helpers private there. It reads `mediaFileTrust.ts` and storage metadata
contracts without editing them. It solely owns the conversion of
`tests/integration/server/mediaDeliveryAccess.test.ts` to call the real extracted
handler directly before its gate. It must not edit `httpServer.ts`, `mediaRoutes.ts`,
`tests/integration/routes/media.test.ts`, adapters, other tests, docs, or
changelog/task indexes.

The direct suite is hermetic: it must not start the full server, mutate the shared
`settings` family, create API keys, or require `DATABASE_URL`. A typed dependency seam
in `mediaDelivery.ts` supplies the production functions by default and permits only
production-guarded Bun-test overrides. TASK-536-04-L01 owns the later full-server wiring
assertion against the real defaults.

`mediaDelivery.ts` must also be importable without `DATABASE_URL`: DB/settings/storage/
session/API-key/RBAC production owners are loaded only inside lazy default functions.
Their shapes enter through type-only imports or explicit narrow types. Static imports
are limited to Bun/Node primitives and pure media/access/error helpers.

## Implementation Pseudocode

~~~ts
const MEDIA_DELIVERY_PREFIX_BYTES = 12; // longest current passive signature (WebP)

type MediaDeliveryDecision = {
  contentType: string;
  disposition: string;
  inline: boolean;
};

type InspectedMediaStream = {
  passiveIdentity: CanonicalMediaIdentity | null;
  replayStream: Readable;
  destroy: () => Promise<void>;
};

type DestroyableAsyncReadable = NodeJS.ReadableStream &
  AsyncIterable<Buffer | Uint8Array | string> & {
    destroyed: boolean;
    destroy: (error?: Error) => unknown;
  };

type MediaDeliveryDeps = {
  loadSecuritySettings: () => Promise<SecuritySettings>;
  chargeRateLimit: typeof checkRateLimit;
  loadAccessMode: () => Promise<MediaDeliveryAccessMode>;
  attachSession: (ctx: AuthContext) => Promise<void>;
  authenticateApiKeyScopes: (authorization: string | null) => Promise<string[] | null>;
  requireSessionMediaRead: (user: { id: string }) => Promise<void>;
  findRecord: (key: string) => Promise<MediaDeliveryRecord | null>;
  resolveAdapter: () => Promise<MediaStorageAdapter>;
};

// Production defaults lazy-import the real settings/auth/RBAC/record/adapter owners
// inside each invocation; importing this module performs no DB/runtime initialization.
// __setMediaDeliveryDepsForTests(partial|null) rejects non-null overrides in
// NODE_ENV=production; getDeps ignores any previously installed override in production.

function parseCanonicalMediaKey(pathname: string): string {
  // pathname is the observable WHATWG-normalized URL pathname. Raw dot-segment spelling
  // is unavailable at this Request boundary and is never claimed as an input signal.
  require pathname to start exactly `/media/` with a nonempty encoded suffix;
  decodeURIComponent exactly once; URIError -> media_key_invalid;
  canonicalPath = buildMediaDeliveryPath(decodedKey);
  require canonicalPath === pathname byte-for-byte;
  // No leading-slash stripping, second decode, lowercase percent alias, encoded slash,
  // percent-bearing/double-encoded segment, control, dot segment, or alternate spelling.
  return decodedKey;
}

function classifyMediaReadError(error: unknown): "missing" | "unavailable" {
  inspect only own string code/name/message and finite HTTP status fields;
  return missing for the exact local/provider shapes pinned below;
  return unavailable for every other value; never expose the provider error/body;
}

async function inspectMediaStreamPrefix(
  stream: NodeJS.ReadableStream,
  expectedSize: number
): Promise<InspectedMediaStream> {
  require stream to narrow to DestroyableAsyncReadable or fail unavailable before reads;
  own exactly one async iterator for the source;
  define one idempotent closeOnce(): mark closed; if source is not already destroyed,
    call source.destroy() exactly once; do not also call iterator.return(), because Node
    Readable destruction terminates its async iterator;
  accumulate at most MEDIA_DELIVERY_PREFIX_BYTES into prefix with backpressure;
  retain any remainder from a chunk crossing the boundary; when a chunk ends exactly
    at the boundary, perform one iterator lookahead and retain it instead of dropping it;
  if EOF occurs at/before the boundary, require observed bytes === expectedSize and use
    canonicalizeMediaBytes(prefix), accepting only a passive canonical identity;
    otherwise use classifyCanonicalMediaPrefix(prefix);
  if already-observed bytes exceed expectedSize, fail before response creation;
  create Readable.from(one async generator) that yields prefix -> retained remainder ->
    unread iterator tail exactly once, counts bytes, and throws on short/excess size;
  wrap only iterator.next() tail failures and explicit integrity failures as generic
    `media_stream_failed`; cancellation/return is not caught or converted into an error;
  generator finally calls closeOnce(); replay close/cancel also calls the same closeOnce;
  convert that one Node replay stream with Readable.toWeb only at the Response boundary;
  destroy() calls closeOnce for HEAD before returning a bodyless response;
  prefix/read error calls closeOnce and preserves the error for HTTP normalization;
  exactly-once assertions count the underlying source close/_destroy outcome, not calls
    to idempotent wrapper functions;
  return { passiveIdentity, replayStream, destroy };
}

function resolveMediaDelivery(
  row: MediaDeliveryRecord,
  passiveIdentity: CanonicalMediaIdentity | null
): MediaDeliveryDecision {
  if passiveIdentity, row.mimeType, and key extension are the same canonical
     passive-raster identity:
    return canonical MIME + inline safe filename;
  if row.mimeType and key extension are a canonical PDF/SVG/text/octet attachment pair:
    return canonical MIME + attachment safe filename;
  return application/octet-stream + attachment-safe `download.bin` policy;
}

export async function handleMediaDeliveryRequest(req) {
  require the exact `/media/<nonempty>` mount; outside/empty -> 404;
  require GET or HEAD; otherwise 405 + `Allow: GET, HEAD` before rate/record/adapter work;
  load security settings and charge `public_read` exactly once from IP + user-agent;
  // URL.pathname is already WHATWG-normalized; validate only this observable value.
  key = parseCanonicalMediaKey(url.pathname); // invalid -> 400 before record/adapter
  mode = await deps.loadAccessMode();
  if mode === internal:
    attach session, otherwise authenticate API-key scopes;
    evaluateMediaAccess and require session media:read;
    return stable 401/403 before record lookup for every valid key when unauthorized;
  row: MediaDeliveryRecord | null = await deps.findRecord(key);
  if row === null: return 404;
  require row.key === key and row.size is a finite nonnegative safe integer;
  adapter = await deps.resolveAdapter();
  source: NodeJS.ReadableStream = await adapter.get(key); // never getPublicUrl
  inspected = await inspectMediaStreamPrefix(source, row.size);
  try {
    decision = resolveMediaDelivery(row, inspected.passiveIdentity);
    headers = {
      "Content-Type": decision.contentType,
      "Content-Disposition": decision.disposition,
      "X-Content-Type-Options": "nosniff",
    };

    if HEAD:
      await inspected.destroy();
      return new Response(null, {
        headers: { ...headers, "Content-Length": String(row.size) },
      });
    webBody = Readable.toWeb(inspected.replayStream);
    response = new Response(webBody, { headers });
    // Response now owns webBody/replay; cancel/close reaches closeOnce.
    return response;
  } catch (error) {
    await inspected.destroy();
    throw error; // normalized by the outer boundary
  }

  // Map every error before Response construction at this boundary:
  // expected auth/access -> 401/403; ApiError rate limit -> 429;
  // key-invalid -> 400; classifyMediaReadError(error)==missing -> 404;
  // all other settings/DB/adapter/prefix/integrity errors -> generic 503.
}
~~~

Never call `getPublicUrl`, redirect to `row.url`, or infer safety from a URL suffix.
The byte peek is capped and replayed without loss. A complete object that ends at or
before the 12-byte boundary is not promoted from a signature alone; longer passive
objects may be promoted only by the delivery-only passive signature classifier. An
unsupported passive inline format or passive MIME/key/byte disagreement yields an
`application/octet-stream`/`.bin` attachment. Attachment delivery intentionally uses
persisted canonical MIME plus canonical key-extension agreement only: this bounded
passive-prefix seam does not claim full PDF/SVG/text/octet byte classification.
Declared row/object size mismatch is a storage-integrity failure, not an attachment
downgrade. Provider object metadata remains defense in depth, not the final-response
trust boundary.
The server does not read provider metadata through `adapter.get`, so provider metadata is
never a condition in `resolveMediaDelivery`. S3/Azure metadata remains write-time defense
in depth; the final response always overwrites MIME/disposition from the DB/key/byte
decision above (with bytes participating only in passive inline promotion). Local, S3,
and Azure all use the same existing
`Promise<NodeJS.ReadableStream>` adapter contract.

The application does not author `Content-Length` on an asynchronous GET stream. Bun may
remove a declared length when the size is not known at transport time and owns the final
transfer framing; forcing parity would require whole-object memory materialization or
provider-specific/temp-file branches. HEAD always emits the exact persisted length. If
Bun can synthesize a GET length for an already-known body, it must equal `row.size`;
callers must otherwise use the byte-exact body or HEAD rather than assuming that streamed
GET has a length header.

## Security Contract

- **Visibility/auth:** existing GET/HEAD /media/* public_read or internal session
  media:read/API-key media.read contract; no new public object URL.
- **RBAC:** internal delivery preserves media:read. Session/API-key evaluation completes
  before record lookup, so missing and existing valid keys produce the same 401/403 for
  an unauthorized caller and reveal no row/storage detail.
- **CSRF/rate:** read-only methods need no CSRF, nonce, or captcha and retain the existing
  `public_read` limiter exactly once in both access modes. Unsupported methods reject
  before charging; a valid-method media request is charged before deep key validation.
- **Validation/anti-abuse:** one-pass decode plus canonical re-encode identity, exact DB
  key/row equality, safe size, access mode, passive inline MIME/extension/byte agreement,
  attachment MIME/extension agreement, nosniff, and safe disposition are mandatory.
  Unknown/legacy mismatch is an attachment, not an inline fallback.

## Errors and compatibility

- Outside/empty media mount: 404. On the observable normalized pathname, invalid
  encoding, noncanonical percent spelling, encoded slash/percent/control, NUL sentinel,
  or invalid key is 400 with zero record or adapter work. WHATWG-normalized raw/plain or
  encoded dot segments cannot be recovered from `Request.url`: aliases that normalize
  inside `/media/` deliberately receive that canonical path's outcome, while aliases
  normalized outside the mount return 404. Neither can reach a traversal storage key.
- Unsupported method on a nonempty media path: 405 + `Allow: GET, HEAD`, with zero rate,
  record, or adapter work. Rate exhaustion is 429.
- No DB row, row/key mismatch, or a recognized missing object is 404 without exposing
  storage layout. Missing normalization recognizes local `ENOENT`, the adapter sentinels
  `s3_object_missing` / `azure_object_missing`, provider codes/names `NoSuchKey`,
  `NotFound`, `BlobNotFound`, `ResourceNotFound`, and provider HTTP status 404.
- Authorization failure is 401/403 before lookup. Settings/record/adapter resolution,
  non-missing get/prefix errors, invalid row size, and pre-header size mismatch are 503.
- Once a GET 200 response exists, a tail read error, client cancellation, or later
  short/excess byte count aborts/errors the body and destroys the source; it cannot
  retroactively change the status. Tail rejection is generic and never carries the raw
  provider error. HEAD performs the prefix decision, trusts persisted length for the
  unread tail, destroys the source, and returns no body with exact persisted
  `Content-Length`. GET transfer framing remains runtime-owned.
- Legacy mismatch: successful attachment with octet-stream; no destructive rewrite.

## Regression-test shape

This leaf updates its one named Bun integration suite before the source gate. Most cases
call the extracted handler directly; an additive transport case wraps that same handler
in an ephemeral real `Bun.serve` instance without starting the full Coderso server. The
suite installs typed in-memory deps and fake Node streams, resets the seam to
`null` in both `afterEach` and `afterAll`, proves non-null production overrides reject,
proves an override installed before switching to production is not invoked, and does
not pin that invocation's response status because the production defaults legitimately
depend on current access mode, rate state, settings availability, and record state,
and never imports `httpServer`, mutates settings, creates shared DB rows, or calls
provider URLs. Its named command unsets `DATABASE_URL` and passes Bun
`--no-env-file`, so a static import of any DB-coupled default fails the test instead of
being silently restored from repository `.env`.
Required cases:

- canonical passive raster GET gets exact inline MIME, safe disposition, nosniff, and
  byte-exact body; HEAD additionally gets exact persisted length;
- canonical PDF/SVG/text/octet-stream GET gets exact attachment-safe MIME/name and
  byte-exact body; HEAD additionally gets exact persisted length;
- legacy persisted MIME/key mismatch or passive inline byte mismatch gets octet-stream
  plus canonical `.bin` attachment;
- canonical attachment MIME/key pairs remain attachments regardless object prefix; the
  bounded classifier makes no false full-byte-identity claim for active formats;
- suffix spoof cannot override persisted/canonical policy;
- unregistered storage object is not served and does not resolve/read an adapter;
- public mode plus internal anonymous/session-permission/API-key scope matrices preserve
  auth; missing/existing internal keys have identical pre-lookup 401/403 behavior;
- local/S3/Azure-shaped missing errors map 404; other pre-header failures map 503;
  provider URL/getPublicUrl is a throwing sentinel that is never consulted;
- GET/HEAD policy headers agree, HEAD alone has application-authored persisted length,
  has no body, and destroys its stream; non-read methods return exact 405/Allow with
  zero downstream work;
- exactly one `public_read` charge uses IP/user-agent in public/internal modes, and an
  injected rate-limit error maps to 429;
- the L03 unsafe-legacy sentinel request `/media/%00unavailable/<media-id>` decodes to
  an invalid NUL-bearing key, returns 400, and performs zero delivery-record lookups or
  adapter resolution/I/O;
- valid encoded space/Unicode round-trip; malformed percent, lowercase/noncanonical
  encoding, encoded slash, double-encoded percent/dot, empty, and prefix-alias paths fail
  with the pinned 400/404 and zero delivery work; plain and encoded dot-segment Requests
  explicitly pin their observable WHATWG-normalized canonical/404 outcomes;
- one-byte chunks and an oversized first chunk replay byte-for-byte with no dropped
  boundary remainder; EOF at/before the prefix cannot promote signature-only truncated
  content; prefix errors, tail errors, short/excess size, HEAD, and Web-stream
  cancellation produce one underlying close/_destroy; cancellation emits no synthetic
  body error, while a secret-bearing tail source error rejects exactly with
  `media_stream_failed` and no raw message/cause;
- valid GET body length equals persisted size; short/excess GET bodies reject after the
  already-created 200 response, while HEAD remains bodyless with the persisted length;
- real ephemeral `Bun.serve` transport over the real local/S3/Azure adapter fixtures
  returns byte-exact GET bodies and canonical policy headers without redirects; a GET
  `Content-Length`, when synthesized by Bun, equals persisted size, while HEAD always
  exposes the exact persisted length. No test requires or forbids runtime-owned
  `Transfer-Encoding`.

TASK-536-04-L01 owns one full-server dispatch/wiring assertion in a different test file;
TASK-536-05-L01 may add cross-provider/security combinations after that gate but cannot
re-baseline these direct handler assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
set -a && source .env && set +a && env -u DATABASE_URL bun --no-env-file test --timeout=15000 \
  tests/integration/server/mediaDeliveryAccess.test.ts
bun run gates:coderso
git diff --check
~~~

Re-run either named file alone before classifying a failure.

## Acceptance criteria

- Bun.file(...).type and filename suffix no longer decide response MIME.
- Every final successful media response follows the same nosniff/disposition policy.
- Remote public delivery cannot bypass the server policy through a redirect/provider URL.
- Legacy content remains reachable only through the fail-safe attachment policy.
- Internal auth cannot be used as a media-row existence oracle; stream ownership closes
  on success, HEAD, failure, or cancellation without losing or duplicating bytes.

## Runtime-smoke correction

The first real browser smoke found that the direct `Response` test observed the authored
GET length while Bun's live async stream selected chunked framing and removed it.
Reproduction on the pinned and workspace Bun runtimes found no provider-neutral API
that guarantees a length for an asynchronous stream. Already-known/materialized bodies
may let Bun synthesize it, while true streaming may use chunked framing. The contract
therefore keeps provider-neutral bounded streaming, makes exact length a HEAD guarantee,
and adds a real `Bun.serve` regression instead of replacing the media boundary with
unbounded buffering.

## Pre-implementation audit correction

Two independent fresh read-only passes on the final L03 working tree found the stale
lookup-before-auth order, ambiguous key inverse, contradictory missing/provider error
mapping, underspecified stream ownership, shared-settings test mutation, unpinned HTTP
statuses/rate semantics, and unused persisted size. This contract incorporates all
HIGH/MEDIUM findings and the size/truncation LOW before implementation. A fresh audit of
this changed contract is mandatory; the earlier passes are obsolete.
