# TASK-407-07-L04: Follow Up Refinement and Fail Closed E2E
# FileName: TASK-407-07-L04-Follow-Up-Refinement-and-Fail-Closed-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Follow-Up E2E + Security
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L03
**Status:** ⏳ To Do

---

## Overview

Validate follow-up refinement and fail-closed behavior after a generated site
exists. The assistant must scope changes to trusted resources and reject
unknown/poisoned/media-reference cases.

## Sub-Tasks

- Prompt for a refinement such as changing a generated projects/services page.
- Verify the assistant asks for a target when the prompt is ambiguous.
- Complete a scoped refinement and verify public runtime updates.
- Exercise rejected unknown guided fields, poisoned text, unsafe media/reference
  input, and unsupported action requests.

## Security Contract

- Endpoint visibility: no public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: target read permissions and action-specific write permissions.
- CSRF: all admin POSTs use normal UI/API CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: E2E or targeted tests must include unknown field/id
  rejection for refinement/reference payloads.
- Anti-abuse: free text cannot choose mutation targets; targets must resolve
  from active context or trusted server catalogs.
- Secret handling: no auth state, cookies, CSRF tokens, provider keys, raw
  provider output, raw screenshots with secrets, or raw uploaded bytes in
  committed evidence.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts only unless sanitized reusable harness is added |
| Closure evidence | TASK-407 closure notes/changelog once complete |

## Implementation Pseudocode

```ts
async function runFollowUpAndFailClosedE2E(page) {
  await prompt("chce zmienic podstrone projekty");
  await assertTargetQuestionWhenAmbiguous(page);
  await chooseTrustedTarget(page);
  await completeScopedRefinement(page);
  await assertPublicRuntimeUpdated();
  await submitTamperedGuidedPayload();
  await assertRejectedBeforePlan();
}
```

## Data Flow and Error Handling

- Existing generated resources provide trusted target candidates.
- Ambiguous follow-up text returns a target question; scoped answers become a
  reviewed refinement plan.
- Tampered payloads, prompt poisoning, unsafe media/reference cases, or
  unsupported actions must fail before mutation.

## Testing Requirements

- Playwright CLI follow-up refinement flow.
- Fail-closed checks for unknown fields, poisoned text, unsafe references, and
  unsupported media/action requests.
- Public runtime check after successful scoped refinement.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` if follow-up behavior changes.

## Acceptance Criteria

- Follow-up refinements are scoped and reviewable.
- Unknown/poisoned/reference cases fail closed.
- Successful refinement updates public runtime without unrelated mutation.
