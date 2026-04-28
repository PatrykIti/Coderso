# 308 - TASK-061-04 Clipboard Image Upload and Inline Media

- **Date:** 2026-02-22
- **Version:** 0.1.308
- **Tasks:** TASK-061, TASK-061-04

## Key Changes

### Clipboard Image Upload Flow
- Added clipboard image handling in post rich-text editor:
  - detect image files in clipboard payload,
  - upload through internal media endpoint (`/admin/api/media`),
  - insert inline media HTML at cursor after successful upload.

### Media Client Enhancements
- Added clipboard-focused media client helpers:
  - `uploadClipboardImage(file)`,
  - `normalizeClipboardImageFile(file)` (image-only guard),
  - deterministic fallback filename generation for unnamed clipboard files.

### Rich Text Contract Hardening
- Extended rich-text schema/sanitizer to support safe inline images:
  - allowlisted `img` tag,
  - strict attribute sanitization (`src`, `data-media-id`, `alt`, `loading`, optional dimensions),
  - unsafe image sources removed during sanitize.

### Tests and Validation
- Added integration coverage:
  - `tests/integration/ui/post-editor-paste-image.test.tsx`.
- Extended unit coverage:
  - `tests/unit/admin/mediaClient.test.ts`,
  - `tests/unit/posts/post-richtext-serializer.test.ts`.
- Full validation run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test` (`1374 pass`, `149 skip`, `0 fail`).

## Result
- Post editor now supports practical clipboard image authoring with internal-only media upload and safe inline rendering path.
