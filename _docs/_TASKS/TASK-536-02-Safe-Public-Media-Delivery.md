# TASK-536-02: Safe Public Media Delivery

# FileName: TASK-536-02-Safe-Public-Media-Delivery.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Media Delivery / HTTP / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-01-L03
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Serve local and remote media through one persisted, fail-safe proxy response policy. A request
must resolve the exact media row/key before delivery; the filesystem suffix or remote
redirect alone cannot establish MIME or disposition. Canonical new rows preserve inline
passive images, while legacy mismatch/unknown/active rows download safely.

## Grounded anchors

- core/server/httpServer.ts:427-513 implements media access and delivery.
- httpServer.ts:489-500 redirects public remote objects or streams internal ones.
- httpServer.ts:504-512 uses Bun.file(targetPath).type, which is suffix-driven.
- Media dispatch occurs before the general API security-header path at
  httpServer.ts:530-546.

## Leaf

TASK-536-02-L01 is the sole source writer and owns its pre-gate delivery compatibility/
changed-behavior assertions. TASK-536-05-L01 owns only additive cross-contract delivery
cases, browser smoke evidence, docs, and closure; it cannot re-baseline L01 assertions.

## Security Contract

- **Visibility:** GET/HEAD /media/* retains public/internal delivery mode.
- **Auth/RBAC:** public_read needs no media permission; internal mode requires session
  media:read or API-key media.read.
- **CSRF/nonce/captcha:** not applicable to GET/HEAD. Unsupported methods fail closed.
- **Rate/anti-abuse:** preserve the existing read limiter/access evaluator and key
  traversal checks; exact DB key ownership is required.
- **Headers:** every final successful response—not a redirect—has nosniff and
  server-owned Content-Type and Content-Disposition. Only a freshly byte-confirmed
  passive image may be inline.
- **Validation:** decoded keys reject traversal, ambiguity, absent DB rows, and key/row
  mismatches. Remote objects are read with `adapter.get`; media delivery never redirects
  to or renders a provider URL.

## Compatibility

The existing `/media/<key>` URL and DB columns do not change. Media-domain reads adapt
legacy provider URLs to that route without rewriting rows. New canonical passive raster rows deliver inline;
canonical PDF, SVG, UTF-8 text, octet-stream, and other active profiles always deliver
as attachments with their safe canonical MIME when the DB MIME and canonical key agree;
remote provider metadata is write-time defense in depth, never a read-time prerequisite.
A legacy
row whose persisted MIME, suffix, or supported policy disagrees is served as
application/octet-stream attachment, never reclassified inline. Missing rows return 404
even if a file happens to exist on disk.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/integration/routes/media.test.ts \
  tests/integration/server/mediaDeliveryAccess.test.ts
bun run gates:coderso
~~~
