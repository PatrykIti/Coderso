# TASK-536-01: Canonical Media Byte Identity and Storage Keys

# FileName: TASK-536-01-Canonical-Media-Byte-Identity-And-Storage-Keys.md

**Parent Task:** TASK-536
**Priority:** Critical
**Category:** Media / Storage / Security
**Estimated Effort:** Large
**Dependencies:** TASK-536 parent prerequisites
**Status:** ✅ Done
**Completed:** 2026-07-11
**Changelog:** 1248

---

## Scope

Replace filename- and declared-MIME-owned media identity with one byte-authoritative
contract. L01 owns only the pure trust vocabulary and helpers, L02 carries that identity
through the dedicated media-storage path without changing generic backup storage, and
L03 integrates both seams into create, replace, and media-domain URL projection. Upload
and replacement use the same path; captcha, auth mode, and caller privilege never disable
it.

## Grounded anchors

- core/services/media/mediaService.ts:36-77 preserves the client name/type in the
  buffered upload object.
- core/services/media/mediaService.ts:211-317 contains the current partial magic-byte
  checks and conditional public-only inspection.
- core/services/media/mediaService.ts:328-388 and :456-508 persist declared MIME and
  pass the original filename to storage for upload and replacement.
- core/services/media/storage/adapter.ts:1-17 exposes only the untrusted UploadFile
  shape to put().
- core/services/media/storage/local.ts:22-50, s3.ts:56-90, and azure.ts:63-100 derive
  keys or object metadata from caller-controlled filename/type.

## Leaves

| Leaf | Scope | Source ownership |
|---|---|---|
| TASK-536-01-L01 | Define byte identity, PDF safe subset, safe disposition, and delivery-path helpers | new mediaFileTrust.ts plus creation/pre-gate pure media-file-trust suite |
| TASK-536-01-L02 | Carry canonical identity into local, S3, and Azure storage | storage/adapter.ts, local.ts, s3.ts, azure.ts |
| TASK-536-01-L03 | Integrate upload/replace, provider-independent URLs, and post-audit admin projections | mediaService.ts, new mediaUrlProjection.ts, dashboard recent-media seam, mediaClient.ts, media UI types/utils/MediaPicker/MediaDetailsDrawer, PostEditorCanvas.tsx |

## Fixed identity policy

- The detector returns one canonical MIME and extension for each supported signature.
  Alias declarations such as image/jpg never survive persistence.
- `CANONICAL_MEDIA_PROFILES` is the one closed nine-member MIME→extension→delivery map;
  `CanonicalMediaMime`, extension, delivery, and the discriminated identity type derive
  from it and every consumer imports rather than mirrors it.
- The initial recognized corpus must cover the signatures already implemented:
  PNG, JPEG, GIF87a/GIF89a, WebP, BMP, and PDF. Preserve the currently configurable
  text/plain contract through a byte-owned UTF-8 profile: fatal UTF-8 decode, no NUL or
  disallowed controls, no HTML/XML/SVG/script markup grammar, and canonical .txt
  attachment identity.
- A separately recognized bounded SVG root maps to image/svg+xml/.svg only as active
  attachment content when the effective allowlists explicitly permit it. It is never
  passive/inline. HTML, generic XML, script-bearing markup, ambiguous/polyglot data, and
  conflicting signatures are rejected even when the declaration is benign.
- Unknown binary maps only to application/octet-stream/.bin attachment. It is accepted
  only when global and field policies explicitly allow that canonical MIME; otherwise it
  fails. Truncated data fails closed rather than being reclassified as text or unknown.
- Only passive verified raster images may be inline. PDF, SVG, text, octet-stream, and
  every other active/ambiguous type are attachment-only. Legacy rows are handled by
  TASK-536-02 and never cause the upload path to trust their suffix.
- Canonical PDF is a conservative inspectable subset: decoded active-form names,
  encryption, and compressed object streams fail closed, while benign compressed page
  content remains an attachment-compatible PDF.
- Original filename is retained only as bounded display metadata. The adapter receives a
  bytes-only transport; the validated canonical identity alone supplies MIME, extension,
  key suffix, and delivery policy.
- Global storage allowlists and Form field accept rules are evaluated against the
  canonical MIME, not the declared header.

## Security Contract

This subtask changes the shared media write boundary used by existing admin and public
Forms routes. It creates no endpoint. Existing session/API-key permissions, CSRF,
nonce/captcha, and rate buckets remain owned by their routes, but no route may bypass
byte canonicalization. Errors remain machine-readable: media_file_invalid,
media_file_too_large, media_mime_not_allowed, and media_storage_unavailable. No rejected
bytes reach storage or the database.

## Land order and compatibility

Land `L01 → L02 → L03`, then TASK-536-02. L01 owns only the pure trust contract,
L02 owns the adapter transport, and L03 is the sole mediaService.ts writer. New writes
receive canonical keys/MIME. No database migration occurs. Current tests that construct
fake image bytes with only a declared MIME must be corrected to real signature fixtures,
not supported by a production fallback.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/services/mediaSchemas.test.ts \
  tests/vitest/services/media-file-trust.test.ts \
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
  tests/unit/media/localAdapter.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/backups/backupRemoteStorage.test.ts \
  tests/unit/backups/backupService.test.ts
~~~

TASK-536-01-L01 is the sole creator and pre-gate changed-behavior owner of
`tests/vitest/services/media-file-trust.test.ts`. Its direct suite stays Bun-free and
pure. L02/L03 and TASK-536-04 own adapter/service/access assertions in their existing Bun
suites; TASK-536-05-L01 adds only cross-layer closure cases. Re-run any named failing
file once in isolation before declaring a failure.
