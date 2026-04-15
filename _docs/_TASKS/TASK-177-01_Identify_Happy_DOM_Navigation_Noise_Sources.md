# TASK-177-01: Identify Happy-DOM Navigation Noise Sources
# FileName: TASK-177-01_Identify_Happy_DOM_Navigation_Noise_Sources.md

**Priority:** High
**Category:** QA + Test Diagnostics
**Estimated Effort:** Medium
**Dependencies:** TASK-177
**Status:** To Do

---

## Overview

Identify which Vitest suites/components emit happy-dom `AsyncTaskManager` aborted errors and `ECONNREFUSED 127.0.0.1:3000` during a green full run.

## Sub-Tasks

No child task files.

## Files to Change

- diagnostic notes in this task file or a temporary local report
- no production files expected

## Security Contract

- Visibility: test diagnostics only.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse: diagnostics must not hit real external services or require a dev server.
- Idempotency: diagnostic command should be reproducible.
- Secret handling: do not log real secrets.

## Testing Requirements

- Run targeted Vitest subsets to isolate source suites.
- Capture enough evidence to name:
  - test file,
  - component or helper,
  - navigation/fetch trigger,
  - whether it is click default, programmatic navigation, or async cleanup.

## Documentation Updates Required

- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Source suite(s) for current noise are identified.
2. Root cause category is documented for each source.
3. Follow-up fixes can be scoped without broad global suppression.
