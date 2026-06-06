# TASK-405: Media Upload Native File Metadata
# FileName: TASK-405_Media_Upload_Native_File_Metadata.md

**Priority:** High
**Category:** Media / Admin API / Runtime Storage
**Estimated Effort:** Small
**Dependencies:** TASK-005-09, TASK-201, TASK-206
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Fix admin media upload and replace failures where Bun/native `File` metadata is
available through getters but is not enumerable. The media service previously
rebuilt buffered uploads with object spread, which dropped `name` and `type` and
let `undefined` reach MIME checks. In production this surfaced as generic
`internal_error` responses for `POST /admin/api/media`.

The fix keeps storage configuration UI-driven and does not add new runtime
environment variables. Storage path/provider settings continue to come from the
storage settings service.

---

## Security Contract

- **Endpoint visibility:** internal admin endpoints under `/admin/api/media`.
- **Auth model:** session-authenticated admin requests.
- **RBAC:** `media:write` for upload/replace/delete and `media:read` for reads.
- **CSRF:** admin write requests remain CSRF-protected by the shared admin API
  middleware.
- **Rate-limit bucket:** `admin_write` for upload/replace/delete and
  `admin_read` for reads; no new public endpoint.
- **Validation:** `mediaUploadSchema` and `mediaReplaceSchema` keep
  reject-unknown request-body validation, while the media service owns MIME
  normalization before persistence and storage adapter calls.
- **Anti-abuse controls:** session + CSRF + RBAC; nonce/signature/HMAC and
  reCAPTCHA are not applicable because this is not a public write endpoint.

---

## Sub-Tasks

- [x] Confirm production failure path and DB/storage-setting state without
      exposing secrets.
- [x] Run read-only external audits before implementation.
- [x] Fix native `File` metadata preservation in the media service.
- [x] Normalize MIME essence before whitelist checks, dimension detection, media
      type resolution, adapter metadata, and DB persistence.
- [x] Add Bun regression tests for native `File` upload/replace, empty MIME
      rejection, MIME-parameter normalization, and route error mapping.
- [x] Run targeted validation, lint, typecheck, and direct Playwright CLI sanity.

---

## Implementation Pseudocode

```ts
function normalizeMimeType(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function createBufferedUploadFile(file: UploadFile, buffer: Buffer): UploadFile {
  return {
    name: file.name,
    type: normalizeMimeType(file.type),
    size: buffer.byteLength,
    arrayBuffer: async () =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}
```

Expected data flow:

- Route validation confirms an upload-shaped file object and delegates to the
  media service.
- The media service reads the file bytes, rebuilds a buffered upload with
  explicit `File` getters, and normalizes MIME before policy checks.
- Empty or unknown MIME fails closed with `media_mime_not_allowed` instead of an
  unmapped runtime exception.
- Normalized MIME is used consistently for storage adapter content metadata and
  the persisted media row.

Regression-test shape:

- Use native `File`, not only plain object helpers, for upload and replace.
- Assert `originalName`, key extension, `mimeType`, media `type`, dimensions, and
  empty MIME rejection.
- Keep route mapping coverage for known media service errors.

---

## Testing Requirements

- ✅ `set -a && source .env && set +a && bun test tests/unit/media/mediaService.test.ts`
- ✅ `set -a && source .env && set +a && bun test tests/integration/routes/media.test.ts`
- ✅ `set -a && source .env && set +a && bun test tests/unit/media/mediaService.test.ts tests/integration/routes/media.test.ts`
- ✅ `bun --cwd core lint`
- ✅ `bun --cwd core lint:types`
- ✅ `playwright-cli -s=coderso-media-upload-sanity open about:blank`
- ✅ `playwright-cli -s=coderso-media-upload-sanity run-code '<native File spread sanity>'`
- ✅ `playwright-cli -s=coderso-media-upload-sanity close`
- ⚠️ Full authenticated Playwright CLI upload smoke was not run because the
  checked-out `.env` points `DATABASE_URL` at Render Postgres and lacks
  Playwright-specific local admin credentials; running it would mutate
  production-backed media/session/access-log data.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`: task board status and statistics.
- `_docs/_CHANGELOG/1099-2026-06-06-media-upload-native-file-metadata.md`:
  task-linked changelog entry.
