# TASK-407-06-L05: UI Warnings Local State and Redaction
# FileName: TASK-407-06-L05-UI-Warnings-Local-State-and-Redaction.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + UI Security Hardening
**Estimated Effort:** Medium
**Dependencies:** TASK-407-06-L04
**Status:** ⏳ To Do

---

## Overview

Harden warning rendering, localStorage/session persistence, dirty-state
preservation, stale cache handling, and UI redaction for site-builder intake
flows.

## Sub-Tasks

- Render poisoning/reference/media warnings as redacted user-facing gates.
- Persist only bounded intake UI state, never raw secrets or raw reference data.
- Discard stale or schema-incompatible cached intake state.
- Preserve dirty local edits during background revalidation without overwriting
  server truth.
- Add tests that localStorage/debug payloads/screenshots cannot leak raw secrets.

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
| Local state | `core/admin/ui/setup/AiSiteWizard.tsx`, `core/admin/ui/setup/aiSiteWizardValidation.ts`, or intake state helper |
| Warning UI | site-builder intake warning/review components |
| Tests | `tests/vitest/ui/assistant-site-builder-intake-redaction.test.tsx` |

## Implementation Pseudocode

```ts
export function serializeSiteBuilderIntakeUiStateForStorage(state: SiteBuilderIntakeUiState) {
  return {
    version: SITE_BUILDER_INTAKE_UI_STORAGE_VERSION,
    sessionId: state.sessionId,
    mode: state.mode,
    currentStepId: state.currentStepId,
    dirtyDraft: redactSiteBuilderIntakeDraft(state.dirtyDraft),
  };
}

export function restoreSiteBuilderIntakeUiState(raw: unknown) {
  const state = normalizeStoredSiteBuilderIntakeUiState(raw);
  return state.version === SITE_BUILDER_INTAKE_UI_STORAGE_VERSION ? state : null;
}
```

## Data Flow and Error Handling

- UI state is serialized through a redaction helper before storage.
- Restore failures discard local state and request fresh server state.
- Warning components receive redacted warning summaries and never render raw
  suspicious payloads.

## Testing Requirements

- Tests for localStorage serialization bounds and stale-state discard.
- Tests for warning rendering without raw suspicious text leakage.
- Tests for dirty-state preservation with server revalidation.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `docs/develop/assistant.md` for local-state/redaction rules.

## Acceptance Criteria

- Site-builder intake UI stores only bounded sanitized state.
- Warning UI is useful without leaking raw hostile or secret-like content.
- Stale client state cannot overwrite server-normalized sessions.
