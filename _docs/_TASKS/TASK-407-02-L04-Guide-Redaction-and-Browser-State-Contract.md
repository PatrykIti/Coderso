# TASK-407-02-L04: Guide Redaction and Browser State Contract
# FileName: TASK-407-02-L04-Guide-Redaction-and-Browser-State-Contract.md

**Parent Subtask:** TASK-407-02
**Priority:** High
**Category:** Assistant + Redaction + Browser State
**Estimated Effort:** Medium
**Dependencies:** TASK-407-02-L03
**Status:** ✅ Done (2026-06-05)

---

## Overview

Define how intake sessions are packaged for provider context, diagnostics, and
browser-local persistence without leaking secrets or raw reference material.
This leaf does not build visible UI controls and does not create a second
site-builder execution context.

## Sub-Tasks

- Add redacted intake diagnostic helpers with hashes/stable ids only.
- Add policy-bounded provider context packaging from normalized intake facts.
- Define browser-local intake state shape and size limits.
- Add tests proving secrets/raw references are omitted from diagnostics,
  provider context, and local-state payloads.

## Security Contract

- Endpoint visibility: no endpoint changes in this leaf.
- Auth model: unchanged existing admin session.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: browser-state restore must discard unknown schema
  versions or unknown keys instead of merging them.
- Anti-abuse: provider context may classify bounded facts, but cannot receive
  instruction text that overrides schemas, RBAC, media gates, or confirmation.
- Secret handling: no provider keys, cookies, CSRF tokens, auth state, signed
  URLs, raw files, EXIF/OCR secrets, or raw secret-like text in diagnostics,
  provider prompts, localStorage, screenshots, or task evidence.

## Files To Change

| Area | Files |
|---|---|
| Redaction | `core/services/assistant/assistantRedaction.ts`, `core/services/assistant/assistantSiteBuilderIntakeRedaction.ts` |
| Provider context | `core/services/assistant/providerPlanningContext.ts` |
| Browser state contract | `core/admin/ui/setup/AiSiteWizard.tsx`, `core/admin/ui/setup/aiSiteWizardValidation.ts`, or new bounded intake state helper |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts`, admin state tests if touched |

## Implementation Pseudocode

```ts
export function redactAssistantSiteBuilderIntakeSession(session: AssistantSiteBuilderIntakeSession) {
  return {
    version: session.version,
    mode: session.mode,
    currentStepId: session.currentStepId,
    answeredStepIds: session.answers.map((answer) => answer.stepId),
    factsHash: hashStableJson(session.facts),
    warnings: session.securityWarnings.map(redactIntakeWarning),
  };
}

export function buildSiteBuilderIntakeProviderContext(facts: AssistantSiteBuilderIntakeFacts) {
  return {
    businessCategory: facts.businessProfile.category,
    goalIds: facts.siteGoals.ids,
    pageRoleIds: facts.siteMap.pageRoles,
    visualPreferenceIds: facts.visual.optionIds,
    blockedRawText: undefined,
  };
}
```

## Data Flow and Error Handling

- Normalized intake facts enter redaction helpers before logs, diagnostics, or
  provider context are built.
- Browser state restore validates schema version and bounded payload size before
  rehydrating; invalid state is discarded and the server-normalized session wins.
- Any value classified as secret-like is removed or replaced with a stable hash
  before leaving the service boundary.

## Closure Evidence

- Expanded `assistantRedaction.ts` so provider-bound text redacts generic
  `password=`, cookie/session/CSRF/API-key pairs, bearer tokens, OpenRouter keys,
  JWT-like tokens, and signed/tokenized URLs embedded in normal strings.
- Added `assistantSiteBuilderIntakeRedaction.ts` with:
  - `redactAssistantSiteBuilderIntakeSession(session)` for hash/stable-id-only
    diagnostics,
  - `buildSiteBuilderIntakeProviderContext(facts)` for provider-only bounded
    advisory facts.
- Added provider planning package support for `siteBuilderIntakeFacts` without
  adding a route/browser-owned `context.siteBuilderIntake` payload.
- Added `assistantSiteBuilderIntakeBrowserState.ts` as a pure browser-state
  helper with schema versioning, max serialized size, stale discard,
  strict allowed keys, no run-option cloning, and no raw answers/references.
- Curie read-only pre-implementation audit found the expected L04 drift risks:
  generic secret/signed-URL text leaks, missing provider-only intake context,
  missing browser-state restore contract, and missing diagnostics/tests. The
  implementation addresses those findings.
- Curie post-implementation re-audit found two blockers: unnormalized provider
  fact ids could cross the provider boundary, and browser-state restore trusted
  local readiness flags. The implementation now runtime-whitelists provider id
  fields and treats restored browser readiness as diagnostic-only.
- Curie final targeted re-audit reported no blocking findings after those
  fixes.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts` (38 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`

## Testing Requirements

- Tests for redacted diagnostics, provider context, and local-state snapshots.
- Tests that raw references, secret-like values, signed URLs, cookies, and
  provider keys are absent from serialized output.
- Tests that stale/unknown browser state is discarded.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `docs/develop/assistant.md` for diagnostics/local-state rules.

## Acceptance Criteria

- Intake diagnostics and provider context are sanitized and bounded.
- Browser-local intake state has explicit schema/version limits.
- This leaf introduces no mode-specific UI implementation.
