# TASK-188-09: Policy Engine Cutover and Heuristic Removal
# FileName: TASK-188-09_Policy_Engine_Cutover_and_Heuristic_Removal.md

**Priority:** High
**Category:** Assistant/Core + Refactor
**Estimated Effort:** Large
**Dependencies:** TASK-188-03, TASK-188-04, TASK-188-05, TASK-188-06, TASK-188-07
**Status:** To Do

---

## Overview

Cut over planner/resolver/mapper to the policy engine and remove duplicated ad hoc heuristics.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. Current live matrix remains green.
2. Removed duplicate alias/filter/field lists from old modules.
3. Provider prompt, resolver, mapper, and coverage docs use policy as source of truth.
4. No behavior regression for TASK-184/TASK-185/TASK-186/TASK-187 cases.

## Security Contract

- Visibility: internal assistant core.
- Auth model: no runtime change.
- RBAC: no weakening.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: strict schema remains final.
- Anti-abuse: destructive denial defaults preserved.
- Secret handling: redaction unchanged or stronger.

## Testing Requirements

- Full targeted assistant Vitest suite.
- Full live assistant matrix:
  - `set -a && source .env && set +a && bun run test:assistant:live`
- Lint/typecheck.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- changelog on completion
