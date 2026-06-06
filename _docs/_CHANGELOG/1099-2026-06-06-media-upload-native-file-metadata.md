# 1099 - Media upload native File metadata

Date: 2026-06-06
Version: unreleased
Tasks: TASK-405

## Key Changes

### Media Uploads

- Fixed admin media upload and replace when Bun/native `File` metadata is exposed
  through non-enumerable getters. Buffered media uploads now preserve `name`,
  normalized `type`, `size`, and `arrayBuffer` explicitly instead of spreading
  the native file object.
- Normalized MIME essence before whitelist checks, media type resolution, image
  dimension extraction, storage adapter content metadata, and DB persistence.
  Empty MIME now fails closed as `media_mime_not_allowed` instead of reaching an
  unmapped `startsWith` runtime exception.
- Added Bun regression coverage using native `File` objects so future changes do
  not rely only on plain object upload helpers.

### Audit And QA

- Ran read-only Claude and subagent audits before implementation. Both identified
  the same native `File` metadata loss as the root cause of the reported
  production `500 internal_error`.
- Confirmed via direct `playwright-cli` sanity that native browser `File`
  instances expose `name/type/size` directly while object spread drops those
  fields.

## Validation

- `set -a && source .env && set +a && bun test tests/unit/media/mediaService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/media.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/media/mediaService.test.ts tests/integration/routes/media.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `playwright-cli -s=coderso-media-upload-sanity open about:blank`
- `playwright-cli -s=coderso-media-upload-sanity run-code '<native File spread sanity>'`
- `playwright-cli -s=coderso-media-upload-sanity close`

Full authenticated Playwright CLI upload smoke was intentionally not run because
the current `.env` points `DATABASE_URL` at Render Postgres and does not provide
Playwright-specific local admin credentials; running that smoke would mutate
production-backed media/session/access-log data.
