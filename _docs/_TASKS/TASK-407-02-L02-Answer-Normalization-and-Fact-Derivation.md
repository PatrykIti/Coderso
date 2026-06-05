# TASK-407-02-L02: Answer Normalization and Fact Derivation
# FileName: TASK-407-02-L02-Answer-Normalization-and-Fact-Derivation.md

**Parent Subtask:** TASK-407-02
**Priority:** High
**Category:** Assistant + Validation + Facts
**Estimated Effort:** Large
**Dependencies:** TASK-407-02-L01
**Status:** ⏳ To Do

---

## Overview

Add strict answer schemas, `normalize*` helpers, and fact derivation for guided
site-builder sessions. This leaf owns the rule that user text is bounded content
data, not executable instruction.

## Sub-Tasks

- Define per-step answer schemas for profile, goals, site map, menu, sections,
  hero, subpages, media policy, design preset, reference intake, and review.
- Reject unknown keys at every nested answer level.
- Clamp and redact bounded text fields before facts are derived.
- Resolve all option ids through registries from TASK-407-02-L01.
- Derive normalized facts used by planners and review summaries.

## Security Contract

- Endpoint visibility: no endpoint changes in this leaf.
- Auth model: unchanged existing admin session.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: every answer schema must reject unknown keys and
  unknown option ids.
- Anti-abuse: instruction-like user text cannot change mode, step ids, schemas,
  action families, RBAC, CSRF, media policy, or execution confirmation.
- Secret handling: secret-like text is redacted from facts, diagnostics, tests,
  provider context, and review summaries.

## Files To Change

| Area | Files |
|---|---|
| Normalizers | `core/services/assistant/guidedSiteBuilderNormalizer.ts`, `core/services/assistant/guidedSiteBuilderFacts.ts` |
| Domain errors | `core/services/assistant/guidedSiteBuilderErrors.ts` |
| Tests | `tests/vitest/assistant/guidedSiteBuilderNormalizer.test.ts` |

## Implementation Pseudocode

```ts
export function normalizeGuidedAnswer(input: unknown, step: GuidedSiteBuilderStepDefinition) {
  const record = readRecord(input, "guided_answer_invalid");
  rejectUnknownKeys(record, step.allowedKeys);
  return step.schema.normalize(record, {
    clampText: clampGuidedText,
    resolveOption: getGuidedOption,
    redact: redactSecretLikeValue,
  });
}

export function deriveGuidedSiteBuilderFacts(session: GuidedSiteBuilderSession) {
  const answersByStep = indexAnswersByStep(session.answers);
  const siteMap = deriveSiteMapFacts(answersByStep);
  const menu = deriveMenuFacts(answersByStep, siteMap);
  const visual = deriveVisualFacts(answersByStep);
  return {
    businessProfile: deriveBusinessProfile(answersByStep),
    siteGoals: deriveSiteGoalFacts(answersByStep),
    siteMap,
    menu,
    homepageSectionRoles: deriveHomepageSectionRoles(answersByStep),
    homepageSections: deriveHomepageSections(answersByStep),
    hero: deriveHeroFacts(answersByStep),
    subpages: deriveSubpageFacts(answersByStep, siteMap),
    contentEngines: deriveRequestedContentEngineFacts(answersByStep),
    visual,
    media: deriveMediaPolicyFacts(answersByStep),
    readyForReview: hasRequiredAnswers(session.mode, answersByStep),
  };
}
```

## Data Flow and Error Handling

- The UI or route submits unknown input; this leaf converts it to normalized
  answers and derived facts before any provider or planner call.
- Missing required values produce `guided_answer_required`; unsupported option
  ids produce `guided_option_invalid`; suspicious text is redacted or flagged.
- Derived facts preserve user intent as bounded fields and never include raw
  files, raw OCR/EXIF, provider keys, cookies, or executable instructions.

## Testing Requirements

- Tests for unknown-key rejection at each step.
- Tests for option-id rejection and deterministic defaults.
- Tests for text bounds, secret redaction, and prompt-injection text preserved
  only as sanitized content data.
- Tests for fact derivation from valid Basic and Advanced answer sets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for answer/fact boundaries.

## Acceptance Criteria

- Every guided answer normalizes through service-owned helpers.
- Derived facts are deterministic, bounded, and provider-safe.
- Unknown or hostile input fails closed before planner/provider handoff.
