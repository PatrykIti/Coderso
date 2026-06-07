# TASK-407-06-L05: UI Warnings Local State and Redaction
# FileName: TASK-407-06-L05-UI-Warnings-Local-State-and-Redaction.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + UI Security Hardening
**Estimated Effort:** Medium
**Dependencies:** TASK-407-06-L04
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Harden warning rendering, browser-local assistant cache redaction, dirty-state
preservation, stale cache handling, and UI redaction for site-builder intake
flows.

L05 is residual hardening over the reviewed floating assistant intake surface
completed by L01-L04. It must not re-open the legacy `AiSiteWizard` handoff;
TASK-407-06-L06 owns that convergence. The active intake answers remain
React-state only in the live `AssistantPanel`; L05 must instead lock that
no-persistence contract, keep the existing versioned browser snapshot bounded,
and harden the broader assistant conversation cache so guided prompts, plans,
previews, and executions cannot retain raw hostile or secret-like payloads.

## Sub-Tasks

- Render poisoning/reference/media warnings as redacted user-facing gates in
  the floating site-builder intake stepper.
- Persist only bounded assistant browser state: active intake answers stay out
  of localStorage, intake browser snapshots store stable redacted facts only,
  and the broader conversation cache drops or redacts unsafe prompt/plan data.
- Discard stale, oversized, schema-incompatible, unknown-version, or
  unknown-key cached intake/conversation state.
- Preserve unsaved local draft edits during background/session revalidation
  while keeping submitted-answer acknowledgements server-authoritative.
- Add tests that localStorage/debug payloads/screenshots cannot leak raw
  secrets, signed URLs, raw references, or prompt-poisoning text.

## Security Contract

- Endpoint visibility: no public endpoint.
- Auth model: existing admin session.
- RBAC: UI warnings do not replace backend enforcement.
- CSRF: unchanged backend POST protection.
- Rate-limit bucket: `assistant` on backend.
- Reject unknown validation: restored local state must reject unknown versions
  and unknown keys.
- Anti-abuse: warning UI cannot offer bypass actions for blocked media,
  poisoned references, unsupported actions, or unreviewed execution.
- Secret handling: no provider keys, cookies, CSRF tokens, auth state, raw
  files, signed URLs, EXIF/OCR secrets, or raw suspicious text in localStorage,
  diagnostics, screenshots, or test snapshots.

## Files To Change

| Area | Files |
|---|---|
| Local state | `core/admin/ui/assistant/assistantConversationState.ts`, `core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState.ts`, `core/admin/ui/setup/assistantSiteBuilderIntakeUiState.ts` |
| Warning UI | `core/admin/ui/assistant/components/SiteBuilderIntakeBasicStepper.tsx` |
| Assistant panel | `core/admin/ui/assistant/AssistantPanel.tsx` only if cache or dirty-state wiring needs panel-level protection |
| Tests | `tests/vitest/ui/assistant-site-builder-intake-redaction.test.tsx`, `tests/vitest/ui/assistant-conversation-state.test.ts`, `tests/vitest/ui/assistant-site-builder-intake-state.test.ts` |

## Implementation Pseudocode

```ts
export function sanitizeAssistantConversationSnapshotForStorage(snapshot: AssistantConversationSnapshot) {
  return {
    messages: snapshot.messages.map(redactAssistantConversationEntry).filter(Boolean),
    activePlan: redactAssistantActionPlanForStorage(snapshot.activePlan),
    activePreview: redactAssistantActionPreviewForStorage(snapshot.activePreview),
    activeExecution: redactAssistantActionExecutionForStorage(snapshot.activeExecution),
    planningState: normalizeAssistantPlanningState(snapshot.planningState),
    assistantMode: normalizeAssistantMode(snapshot.assistantMode),
  };
}

export function serializeAssistantConversationState(snapshot: AssistantConversationSnapshot) {
  const payload = buildVersionedPayload(sanitizeAssistantConversationSnapshotForStorage(snapshot));
  const serialized = JSON.stringify(payload);
  return serialized.length <= ASSISTANT_CONVERSATION_STATE_MAX_CHARS ? serialized : null;
}

export function redactSiteBuilderIntakeUiText(value: string) {
  return redactAssistantText(filterPromptPoisoningPhrases(value), SITE_BUILDER_INTAKE_UI_TEXT_MAX_CHARS);
}

export function reconcileSiteBuilderIntakeDraft(previous: DraftState, nextSession: AssistantSiteBuilderIntakeSession) {
  if (!previous.dirtyStepId) return draftFromServerSession(nextSession);
  if (isSubmittedAnswerAcknowledgement(previous, nextSession)) return draftFromServerSession(nextSession);
  return { ...previous, serverSession: nextSession, dirtyStepId: previous.dirtyStepId };
}
```

## Data Flow and Error Handling

- Active site-builder intake answers are not persisted. The live panel may
  restore a redacted plan shell, but if answer state is missing the UI must
  require restart before saving more steps.
- The existing intake browser snapshot is serialized through
  `assistantSiteBuilderIntakeBrowserState.ts` and remains facts-hash only.
- The broader assistant conversation cache is sanitized before storage and
  discarded when stale, oversized, unknown-version, unknown-key, or unsafe.
- Restore failures discard local state and request fresh server state.
- Warning components receive redacted warning summaries and never render raw
  suspicious payloads.
- Background revalidation may update server truth without replacing a dirty
  unsaved draft. A submitted step acknowledgement may replace local draft with
  the normalized server answer.

## Testing Requirements

- Tests for localStorage serialization bounds, unknown-key rejection,
  prompt-poisoning redaction, and stale-state discard across the intake browser
  snapshot and assistant conversation cache.
- Tests for warning/review rendering without raw suspicious text leakage,
  signed URLs, raw reference ids, OCR-like strings, or token values.
- Tests for dirty-state preservation during background revalidation and
  server-authoritative replacement after submitted-answer acknowledgement.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-site-builder-intake-redaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts tests/vitest/ui/assistant-site-builder-intake-state.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.tsx tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit`
- `bun run precommit` before manual commit

## Documentation Updates Required

- `docs/develop/assistant.md` for local-state/redaction rules.
- `_docs/ASSISTANT_SITE_BUILDER.md` for the reviewed intake cache/redaction
  contract.
- `_docs/_CHANGELOG/1125-2026-06-06-task-407-ui-warning-local-state-redaction.md`
  plus `_docs/_CHANGELOG/README.md` on closure.

## Acceptance Criteria

- Site-builder intake UI stores only bounded sanitized state.
- Warning UI is useful without leaking raw hostile or secret-like content.
- Stale client state cannot overwrite server-normalized sessions.

## Completion Notes

- Added prompt-poisoning-aware UI/cache redaction through the shared assistant
  redaction helper.
- Hardened assistant conversation localStorage with unknown-key rejection,
  serialized-size bounds, prompt-poisoning filtering, and active plan/previews
  sanitization.
- Preserved dirty site-builder intake drafts during background revalidation
  while keeping submitted-answer acknowledgements server-authoritative.
- Added screenshot/cache regression tests for warning rendering, localStorage
  payloads, stale/unknown cache rejection, and dirty-state behavior.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-site-builder-intake-redaction.test.tsx tests/vitest/ui/assistant-conversation-state.test.ts tests/vitest/ui/assistant-site-builder-intake-browser-state.test.ts tests/vitest/ui/assistant-site-builder-intake-state.test.ts tests/vitest/ui/assistant-site-builder-intake-*.test.tsx tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts`
  (8 files, 34 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Pre-Implementation Audit Notes

- 2026-06-06 Claude and subagent read-only audits found contract drift before
  implementation: stale `AiSiteWizard` file guidance, pseudocode for
  non-existent local-state helpers, missing conversation-cache leakage coverage,
  too-narrow UI redaction, and ambiguous dirty-state wording.
- L05 was corrected to keep active intake answers in React state only, harden
  the broader assistant conversation cache, use the floating stepper as the UI
  surface, and leave legacy wizard convergence to TASK-407-06-L06.
