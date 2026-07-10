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

Replace suffix-driven local delivery and unqualified remote redirects with a DB-owned
delivery decision. Emit consistent MIME, disposition, nosniff, access, and method
semantics for local files and remote provider objects.

## Source ownership

This leaf is the only writer of `core/server/httpServer.ts` for TASK-536. Keep the
delivery decision as a private pure helper in that existing file; do not create
`core/services/media/mediaDeliveryPolicy.ts` or any other optional production file.
It reads `mediaFileTrust.ts` and storage metadata contracts without editing them. It
owns changed-behavior/compatibility updates in
`tests/integration/routes/media.test.ts` and
`tests/integration/server/mediaDeliveryAccess.test.ts` before its gate. It must not
edit `mediaRoutes.ts`, adapters, other tests, docs, or changelog/task indexes.

## Implementation Pseudocode

~~~ts
type MediaDeliveryDecision = {
  contentType: string;
  disposition: string;
  inline: boolean;
};

type InspectedMediaStream = {
  passiveIdentity: CanonicalMediaIdentity | null;
  replayStream: NodeJS.ReadableStream;
};

async function inspectMediaStreamPrefix(
  stream: NodeJS.ReadableStream
): Promise<InspectedMediaStream> {
  read at most MEDIA_DELIVERY_PREFIX_BYTES with backpressure;
  passiveIdentity = classifyCanonicalMediaPrefix(prefix);
  create a NodeJS.ReadableStream that replays prefix then unread tail exactly once;
  on error destroy the source and throw media_storage_unavailable;
  return { passiveIdentity, replayStream };
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
  return application/octet-stream + attachment safe filename;
}

async function handleMedia(req, pathname) {
  require method GET or HEAD;
  decode and validate canonical relative key;
  row: MediaDeliveryRecord | null = await getMediaDeliveryRecordByKey(key);
  if row === null: return 404;
  authorize row under current public/internal delivery mode;
  source: NodeJS.ReadableStream = await adapter.get(row.key);
  inspected = await inspectMediaStreamPrefix(source);
  decision = resolveMediaDelivery(row, inspected.passiveIdentity);
  headers = {
    "Content-Type": decision.contentType,
    "Content-Disposition": decision.disposition,
    "X-Content-Type-Options": "nosniff",
  };

  // Prefix bytes are replayed before the unread tail; HEAD destroys both streams.
  return HEAD ? headers-only : inspected.replayStream, headers;
}
~~~

Never call `getPublicUrl`, redirect to `row.url`, or infer safety from a URL suffix.
The byte peek is capped and replayed without loss; failure, truncation, unsupported
format, or disagreement yields `application/octet-stream` attachment. Provider object
metadata remains defense in depth, not the final-response trust boundary.
The server does not read provider metadata through `adapter.get`, so provider metadata is
never a condition in `resolveMediaDelivery`. S3/Azure metadata remains write-time defense
in depth; the final response always overwrites MIME/disposition from the DB/key/byte
decision above. Local, S3, and Azure all use the same existing
`Promise<NodeJS.ReadableStream>` adapter contract.

## Security Contract

- **Visibility/auth:** existing GET/HEAD /media/* public_read or internal session
  media:read/API-key media.read contract; no new public object URL.
- **RBAC:** internal delivery preserves media:read and reveals no row/storage detail on
  failure.
- **CSRF/rate:** read-only methods need no CSRF, nonce, or captcha and retain the existing
  read limiter; every other method rejects.
- **Validation/anti-abuse:** exact decoded DB key, confinement, row/access mode, canonical
  MIME pair, nosniff, and safe disposition are mandatory. Unknown/legacy mismatch is an
  attachment, not an inline fallback.

## Errors and compatibility

- Invalid encoding/traversal/key: existing safe 400/404 mapping.
- No DB row or missing object: 404 without exposing storage layout.
- Authorization failure: existing 401/403 contract.
- Provider unavailable: existing bounded media/storage error response.
- Legacy mismatch: successful attachment with octet-stream; no destructive rewrite.

## Regression-test shape

This leaf updates its two named integration suites before the source gate. Required
cases:

- canonical passive raster gets exact inline MIME, disposition, and nosniff;
- canonical PDF/SVG/text/octet-stream get exact attachment-safe headers;
- forbidden active markup is never present as a new canonical row;
- legacy mismatch gets octet-stream attachment-safe headers;
- suffix spoof cannot override persisted/canonical policy;
- unregistered local file is not publicly served;
- remote public and internal modes both stream through the route and preserve auth plus
  final-response header/body parity; provider URL is never requested by the client;
- GET/HEAD agree and non-read methods reject;
- the prefix classifier replays every consumed byte, never promotes a truncated prefix,
  and provider metadata is neither required nor trusted for the final response;
- traversal and missing-key behavior remain fail closed.

TASK-536-05-L01 may add cross-provider/security combinations after this gate but cannot
re-baseline these delivery assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/integration/routes/media.test.ts \
  tests/integration/server/mediaDeliveryAccess.test.ts
bun run gates:coderso
~~~

Re-run either named file alone before classifying a failure.

## Acceptance criteria

- Bun.file(...).type and filename suffix no longer decide response MIME.
- Every final successful media response follows the same nosniff/disposition policy.
- Remote public delivery cannot bypass the server policy through a redirect/provider URL.
- Legacy content remains reachable only through the fail-safe attachment policy.
