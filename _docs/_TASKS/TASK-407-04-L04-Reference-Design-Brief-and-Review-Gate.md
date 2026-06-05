# TASK-407-04-L04: Reference Design Brief and Review Gate
# FileName: TASK-407-04-L04-Reference-Design-Brief-and-Review-Gate.md

**Parent Subtask:** TASK-407-04
**Priority:** High
**Category:** Assistant + Reference Review
**Estimated Effort:** Medium
**Dependencies:** TASK-407-04-L03
**Status:** ⏳ To Do

---

## Overview

Convert safe references into bounded, non-executable design brief facts and
require user review before those facts influence planning.

## Sub-Tasks

- Build `ReferenceDesignBrief` from `SafeReferenceInput` with allowed color,
  layout, density, typography, and image-treatment hints.
- Store blocked instructions as redacted warning metadata.
- Require explicit review confirmation before reference facts are merged into
  site-builder intake facts.
- Add provider-boundary tests proving reference text cannot become instructions.

## Security Contract

- Endpoint visibility: internal assistant route only if reference brief
  extraction needs server processing.
- Auth model: existing admin session.
- RBAC: same media read permissions as TASK-407-04-L03 for media-backed briefs.
- CSRF: required for POST if server extraction route is added.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: brief facts and warning ids must reject unknown
  fields and unsupported hint ids.
- Anti-abuse: design brief facts are evidence only and cannot emit executable
  actions, import media, change RBAC, skip review, or override provider/system
  policy.
- Secret handling: brief facts and warnings must not include raw EXIF/OCR,
  filenames, raw file text, signed URLs, cookies, tokens, or provider keys.

## Files To Change

| Area | Files |
|---|---|
| Brief extraction | `core/services/assistant/assistantSiteBuilderIntakeReferenceBrief.ts` |
| Facts merge | `core/services/assistant/assistantSiteBuilderIntakeFacts.ts` |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeReferenceBrief.test.ts` |

## Implementation Pseudocode

```ts
export function buildReferenceDesignBrief(reference: SafeReferenceInput) {
  return {
    colors: resolveAllowedColorHints(reference),
    layoutHints: resolveAllowedLayoutHints(reference),
    typographyHints: resolveAllowedTypographyHints(reference),
    warnings: detectReferenceInstructionWarnings(reference).map(redactWarning),
    executableActions: undefined,
  };
}

export function mergeReviewedReferenceBrief(facts, brief, reviewState) {
  if (!reviewState.referenceBriefConfirmed) return factsWithGate(facts, "reference_review_required");
  return { ...facts, visual: mergeReferenceVisualHints(facts.visual, brief) };
}
```

## Data Flow and Error Handling

- `SafeReferenceInput` becomes a bounded brief; the brief is displayed for
  review before planner facts change.
- Unconfirmed briefs produce a review-required gate.
- Unsupported visual hints, instruction-like text, or secret-like metadata are
  redacted and cannot influence actions.

## Testing Requirements

- Tests for allowed hint extraction from safe references.
- Tests that brief output contains no executable actions.
- Tests for unconfirmed brief gating and confirmed brief merge.
- Tests for provider-boundary poisoning text.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/MEDIA_SPEC.md` if reference brief behavior affects media policy.

## Acceptance Criteria

- References influence planning only through reviewed bounded design facts.
- Blocked instructions are visible as redacted warnings.
- No raw reference text or media bytes reach provider/action execution.
