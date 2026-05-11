# TASK-190-08-04: Live Provider Matrix Approval and Rerun
# FileName: TASK-190-08-04_Live_Provider_Matrix_Approval_and_Rerun.md

**Priority:** High
**Category:** QA Closure
**Estimated Effort:** Small
**Dependencies:** TASK-190-08-02
**Status:** Done (2026-05-11)

---

## Overview

Rerun the TASK-190 live provider matrix after the second-pass validation drift
fixes once explicit approval is available for sending test prompts and fixture
data to the configured OpenAI/OpenRouter providers.

## Sub-Tasks

No child task files.

## Security Contract

- Visibility: QA-only validation command; no route or product behavior change.
- Auth model: uses local test-only provider credentials from `.env`.
- RBAC: no admin/user permission behavior change.
- CSRF: no runtime write route change.
- Rate-limit bucket: provider calls use the existing live-test provider paths.
- Reject-unknown validation: live matrix must exercise the existing strict
  assistant action schemas and fail closed on unsupported actions.
- Anti-abuse: do not run against production data; use the existing isolated
  live-test fixtures and cleanup stack.
- Secret handling: do not print provider keys, fixture payloads containing
  secrets, or raw provider auth headers in logs, docs, or changelog notes.

## Implementation Pseudocode

1. Confirm explicit user approval for third-party data transfer:
   - approval text must cover `bun run test:assistant:live`,
   - approval text must acknowledge sending test prompts and fixture data to
     configured OpenAI/OpenRouter providers.
2. Run the live matrix outside the sandbox:
   - command: `bun run test:assistant:live`,
   - expected coverage: route-level OpenAI/OpenRouter natural prompt suites plus
     CMS live matrix suites under `tests/integration/assistant-live`.
3. If the matrix fails:
   - classify failures as provider flake, fixture drift, or implementation drift,
   - patch implementation drift through the owning assistant/service/schema seam,
   - rerun the failed live slice and the required local gates.
4. If the matrix passes:
   - update `TASK-190-08-02` progress notes with the live result,
   - add a changelog entry or extend the current TASK-190 validation entry,
   - update `_docs/_TASKS/README.md` to move this task to Done.

## Testing Requirements

- `bun run test:assistant:live` outside the sandbox after explicit approval.
- If code changes are needed, rerun:
  - `bun run lint`
  - `bun run test:bun`
  - `bun run test:vitest`
  - `bun run scan:security:strict`

## Documentation Updates Required

- `_docs/_TASKS/TASK-190-08-02_Docs_Changelog_and_Closure.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- A TASK-190 changelog note recording the final live matrix status.

## Progress Notes

- 2026-05-11: User approved the opt-in live provider gate after confirming the
  deterministic assistant coverage remains owned by `bun run test:bun` and
  `bun run test:vitest`.
- 2026-05-11: Initial `bun run test:assistant:live` exposed live CMS harness
  drift: those tests supplied fixture `resourceCatalog` payloads without the
  required `includeResourceCatalog: true` trust flag, so the server correctly
  ignored the client-authored catalog under the current security contract.
- 2026-05-11: Added the trust flag to all live CMS matrix contexts and reran
  the gate outside the sandbox. `bun run test:assistant:live:cms:openai`
  passed (`15` tests, `263` assertions), then full
  `bun run test:assistant:live` passed: route OpenAI (`1` test, `33`
  assertions), route OpenRouter (`1` test, `43` assertions), CMS OpenAI (`15`
  tests, `263` assertions), and CMS OpenRouter (`15` tests, `263`
  assertions).
- 2026-05-11: Final post-fix gates also passed outside the sandbox:
  `bun run lint`, `bun run test:bun` (`763` tests, `2956` assertions),
  `bun run test:vitest` (`582` files, `2611` tests), and
  `bun run scan:security:strict` clean. Container image scanning remained
  skipped because `SECURITY_SCAN_IMAGE` was not set.
