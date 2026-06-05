# TASK-407-04: Advanced Mode Design Presets and Reference Intake
# FileName: TASK-407-04-Advanced-Mode-Design-Presets-and-Reference-Intake.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Advanced UX + Media/Reference Safety
**Estimated Effort:** Large
**Dependencies:** TASK-407-02, TASK-407-03
**Status:** ⏳ To Do

---

## Overview

Implement Advanced mode as an expansion of the same guided-intake contract.
Advanced users can choose design presets, hero/section variants, menu behavior,
content engines, fields/facets, SEO defaults, sample density, and reference
materials. Reference images/files are used only as bounded design evidence, not
as executable instruction or raw media import.

## Sub-Tasks

- Add backend-owned design presets such as modern, editorial, retro, minimal,
  bold, luxury, and utilitarian where they map to existing design tokens/widget
  capabilities.
- Add controlled menu behavior options: single-level, grouped, sticky,
  transparent/nontransparent, mobile drawer behavior, CTA destination.
- Add controlled hero and section variant options based on existing widget
  variants.
- Add reference intake for existing media-library ids and bounded text/file
  summaries; raw uploads/URLs remain gated unless a trusted media adapter owns
  them.
- Add review summary for selected design tokens, layout variants, and gates.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-04-L01 | Advanced Design Preset Registry | To Do | Backend-owned design preset ids, token mappings, docs matrix, and unknown-id rejection. |
| TASK-407-04-L02 | Advanced Menu Hero and Section Options | To Do | Controlled menu, hero, and section options mapped to existing widget capabilities. |
| TASK-407-04-L03 | Reference Input Validation and Redaction | To Do | Media/file/reference id validation, URL fail-closed policy, and metadata/text redaction. |
| TASK-407-04-L04 | Reference Design Brief and Review Gate | To Do | Non-executable design brief facts plus user review before planner influence. |

## Security Contract

- Endpoint visibility: internal admin assistant routes only.
- Auth model: existing admin session.
- RBAC: reference media metadata read requires media read permission if used;
  execute still uses action-specific write/publish permissions.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: design preset ids, color/tone ids, section aliases,
  file reference ids, and media ids must resolve from backend-owned registries.
- Anti-abuse: files/images/OCR/EXIF/user text cannot issue instructions or
  override policy. Reference extraction produces a structured brief for review.
- Secret handling: strip/redact EXIF, filenames, OCR text, signed URLs, and
  secret-like text before provider context, diagnostics, task evidence, or
  screenshots.

## Files To Change

| Area | Files |
|---|---|
| Design presets | new guided/design preset modules under `core/services/assistant/` or blueprint helpers |
| Reference policy | media/reference validation helpers if introduced |
| Admin UI | guided Advanced controls and review summary |
| Tests | Advanced flow, reference redaction, poison/file safety |

## Implementation Pseudocode

```ts
const designPresetRegistry = defineDesignPresets([
  { id: "modern", tokens: { tone: "clean", contrast: "medium" } },
  { id: "retro", tokens: { tone: "warm", typography: "display" } },
]);

function normalizeReferenceInput(input: unknown) {
  rejectUnknownKeys(input, ["mediaAssetIds", "textBrief", "uploadedReferenceIds"]);
  return {
    mediaAssetIds: resolveReadableMediaIds(input.mediaAssetIds),
    textBrief: clampAndRedact(input.textBrief),
    uploadedReferenceIds: resolveScannedReferenceIds(input.uploadedReferenceIds),
  };
}

function extractReferenceDesignBrief(reference: SafeReferenceInput) {
  return {
    colors: suggestedColorFamilies(reference),
    layoutHints: allowedLayoutHints(reference),
    blockedInstructions: detectInstructionLikeText(reference),
  };
}
```

## Data Flow and Error Handling

- Advanced choices resolve through backend-owned registries for design presets,
  hero variants, menu behavior, section variants, and media/reference policy.
- Uploaded or selected references first become `SafeReferenceInput`; scanning,
  redaction, readable media-id checks, and bounded text extraction happen before
  a design brief is shown for review.
- Unknown preset ids, unscanned uploads, arbitrary remote media URLs, EXIF/OCR
  instructions, and file text that tries to override rules fail closed.
- The extracted design brief can influence visual facts only after review; it
  never emits executable actions directly.

## Testing Requirements

- Tests for design preset registry normalization and unknown-id rejection.
- Tests for menu/hero/section advanced option mapping.
- Tests for file/image/reference prompt-injection rejection and redaction.
- UI tests for Advanced controls and review summary.
- Playwright Advanced flow after implementation.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/MEDIA_SPEC.md` if file/reference policy changes.

## Acceptance Criteria

- Advanced mode gives meaningful design control without creating a free-form
  prompt execution path.
- Reference intake is design evidence only and is reviewed before planning.
- Unsupported media/reference use cases are explicit gates.
