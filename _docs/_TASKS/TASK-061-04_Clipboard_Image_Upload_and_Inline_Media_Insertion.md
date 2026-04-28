# TASK-061-04: Clipboard Image Upload and Inline Media Insertion
# FileName: TASK-061-04_Clipboard_Image_Upload_and_Inline_Media_Insertion.md

**Priority:** High  
**Category:** Admin/UI + Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-061-03  
**Status:** Done (2026-02-22)

---

## Overview
Dodac obsluge obrazow z clipboard w writing canvas: image blob -> upload do Media -> automatyczne wstawienie inline.

## Scope
1. Wykrywanie obrazow w `clipboardData.items`.
2. Upload przez istniejacy internal media endpoint.
3. Wstawienie nodu `image` do writing canvas w miejscu kursora.
4. Progress/error UX (toasts + retry).
5. Limity MIME/rozmiaru zgodne z media settings.

## Security Contract
- **Visibility:** internal only (admin editor flow).
- **Auth path:** authenticated session lub scoped API key (existing media policy).
- **Rate-limit bucket:** `admin_write`.
- **Nonce/HMAC:** n/a (internal request + CSRF).
- **reCAPTCHA:** n/a.
- **Internal mode:** yes; wykorzystuje istniejacy kontrakt `/admin/api/media`.

## Files to Create / Change
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/integration/ui/post-editor-paste-image.test.tsx` (new)
- `tests/unit/admin/mediaClient.test.ts` (extend)

## Pseudocode
```ts
onPaste(event):
  imageItem = findImageClipboardItem(event)
  if (!imageItem) return

  blob = imageItem.getAsFile()
  upload = await uploadMedia({ file: blob, folder: "posts" })
  insertWritingNode({ type: "image", mediaId: upload.id, wrap: "none", width: 50 })
```

## Acceptance Criteria
1. Paste obrazu z clipboard tworzy poprawny media asset i inline node.
2. Na bledzie uploadu user dostaje czytelny komunikat i moze sprobowac ponownie.
3. Brak nowego public endpointu.

## Testing Requirements
- Integration UI: paste image -> upload -> node insert.
- Unit: upload contract mapping.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`
  - Result: `1374 pass`, `149 skip`, `0 fail`

## Closure Notes
- Added clipboard image upload path for post rich-text editing:
  - image detection from `clipboardData.items/files`,
  - upload through internal `/admin/api/media` via `uploadClipboardImage`,
  - inline insertion as sanitized `<img>` with `data-media-id`.
- Extended media client helpers for clipboard image normalization:
  - deterministic filename fallback for unnamed clipboard files,
  - MIME guard for image-only uploads.
- Extended rich-text sanitizer/schema to support safe inline images (`img` allowlist with strict attrs).
- Added tests:
  - `tests/integration/ui/post-editor-paste-image.test.tsx`,
  - `tests/unit/admin/mediaClient.test.ts` (extended),
  - `tests/unit/posts/post-richtext-serializer.test.ts` (extended).
