# TASK-407-04-L03: Reference Input Validation and Redaction
# FileName: TASK-407-04-L03-Reference-Input-Validation-and-Redaction.md

**Parent Subtask:** TASK-407-04
**Priority:** High
**Category:** Assistant + Media Reference Safety
**Estimated Effort:** Large
**Dependencies:** TASK-407-04-L02
**Status:** ⏳ To Do

---

## Overview

Validate reference media/file inputs and redact unsafe metadata before any
design brief extraction. This leaf does not import arbitrary remote media or
execute instructions from images/files.

## Sub-Tasks

- Accept existing media-library asset ids only after permission/read checks.
- Accept temporary reference ids only after size/type scan and metadata
  redaction.
- Reject arbitrary remote media URLs unless a backend-owned trusted adapter owns
  the source.
- Redact filenames, EXIF, OCR text, alt text, and extracted text before they can
  influence facts or provider context.

## Security Contract

- Endpoint visibility: internal admin assistant/media reference paths only if a
  dedicated route is needed; otherwise use existing internal plan context.
- Auth model: existing admin session.
- RBAC: media/file metadata read requires existing media read permission; execute
  remains action-specific.
- CSRF: required for POST if adding or using a write/scan route.
- Rate-limit bucket: `assistant` for assistant reference analysis; existing
  media bucket may still apply to upload routes.
- Reject unknown validation: media ids, reference ids, URL fields, and extracted
  metadata payloads must reject unknown keys.
- Anti-abuse: EXIF/OCR/filename/text cannot issue instructions, bypass media
  gates, or override system/provider policy.
- Secret handling: raw bytes, signed URLs, EXIF secrets, OCR secrets, filenames
  with secrets, cookies, tokens, and provider keys must not enter diagnostics,
  localStorage, task evidence, or provider prompts.

## Files To Change

| Area | Files |
|---|---|
| Reference policy | `core/services/assistant/assistantSiteBuilderIntakeReferencePolicy.ts` |
| Media trust | `core/services/assistant/assistantMediaTrust.ts`, `core/services/media/curatedMediaProfiles.ts` only if needed |
| Route validation | `core/server/validation/assistantActionSchemas.ts` if reference context is carried in plan requests |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeReferencePolicy.test.ts`, route tests if route schema changes |

## Implementation Pseudocode

```ts
export async function normalizeSafeReferenceInput(input: unknown, deps: ReferenceDeps) {
  const record = readRecord(input);
  rejectUnknownKeys(record, ["mediaAssetIds", "temporaryReferenceIds", "textBrief"]);
  return {
    mediaAssets: await resolveReadableMediaAssets(record.mediaAssetIds, deps),
    temporaryReferences: await resolveScannedReferenceIds(record.temporaryReferenceIds, deps),
    textBrief: redactAndClampReferenceText(record.textBrief),
    remoteUrls: buildUnsupportedRemoteUrlGate(record),
  };
}
```

## Data Flow and Error Handling

- Raw reference input enters validation and becomes `SafeReferenceInput` or a
  gate before design brief extraction.
- Unreadable assets, unscanned files, arbitrary remote URLs, oversized content,
  and instruction-like metadata fail closed or become reviewable gates.
- No raw bytes or unredacted metadata leaves this boundary.

## Testing Requirements

- Tests for readable media asset ids, unreadable ids, unknown ids, and duplicate
  ids.
- Tests for arbitrary remote URL rejection.
- Tests for EXIF/OCR/filename/text redaction and instruction-like metadata.
- Route tests if a dedicated reference route or plan context schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md` if reference intake changes media rules.
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Acceptance Criteria

- Reference input becomes sanitized `SafeReferenceInput` before use.
- Arbitrary remote media and raw file instructions fail closed.
- No raw reference secrets are stored, logged, or sent to providers.
