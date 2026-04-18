# TASK-188-05: Action Mapping and Safety Rules From Policy
# FileName: TASK-188-05_Action_Mapping_and_Safety_Rules_From_Policy.md

**Priority:** High
**Category:** Assistant/Core + Action Mapping + Safety
**Estimated Effort:** Large
**Dependencies:** TASK-188-01, TASK-188-02, TASK-188-04
**Status:** To Do

---

## Overview

Move action mapping and destructive/bulk safety rules into the policy engine.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. `cmsOperationActionMapper` uses policy field/action mapping where possible.
2. Destructive rules such as `allowAllWhenFiltered`, `requireExpectedCount`, and `denyAllUnfiltered` are policy-driven.
3. Provider post-validation guards are represented as policy safety checks.
4. Existing strict action schemas remain the final action validator.

## Security Contract

- Visibility: internal action planning.
- Auth model: no runtime change.
- RBAC: route/domain permissions remain authoritative.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: no untyped actions.
- Anti-abuse: destructive rules deny by default.
- Secret handling: no secret values in action preview/diff metadata.

## Testing Requirements

- Mapper tests for all current executable resource families.
- Safety tests for broad delete, count mismatch, filtered all, read-only status questions.
- Live matrix remains green.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`
- changelog on completion
