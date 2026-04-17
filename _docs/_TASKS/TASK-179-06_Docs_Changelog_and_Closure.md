# TASK-179-06: Docs, Changelog, and Closure
# FileName: TASK-179-06_Docs_Changelog_and_Closure.md

**Priority:** High
**Category:** Docs/Assistant + QA
**Estimated Effort:** Small
**Dependencies:** TASK-179-01, TASK-179-02, TASK-179-03, TASK-179-04, TASK-179-05, TASK-179-07
**Status:** To Do

---

## Overview

Close `TASK-179` after surface hints, filters, inspection UX, and natural prompt tests are implemented.
Also verify assistant-executed mutations refresh admin SPA cache/sidebar state without reload.

## Sub-Tasks

No child task files.

## Architecture

Docs must clearly state:

- user prompts may use natural UI language,
- `surfaceHint` is not a target name,
- filters are allowlisted,
- read-only inspection is not an action plan,
- live provider smokes are opt-in and test-only.

## Integration with Current Code

- Update source-of-truth docs only; no runtime code unless closure uncovers drift.
- Keep `TASK-178` docs consistent with the follow-up `TASK-179` improvements.

## Files to Change

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- relevant `docs/` assistant corpus pages if user-facing behavior changed.

## Acceptance Criteria

1. All `TASK-179` leaves are done.
2. Docs describe surface hints and filters.
3. Acceptance matrix lists natural prompt/live provider coverage.
4. Targeted lint/type/test/live smoke results are recorded.
5. Admin cache docs cover assistant action invalidation.
6. Task board and changelog are synchronized.

## Security Contract

- Visibility: docs/process only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: docs must not weaken schema contracts.
- Anti-abuse: docs must keep read-only inspection separate from mutation.
- Secret handling: docs must mention test-only live provider env handling.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites touched by TASK-179
- targeted admin cache/UI suites touched by TASK-179-07
- opt-in OpenAI/OpenRouter live tests when env vars are present.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
