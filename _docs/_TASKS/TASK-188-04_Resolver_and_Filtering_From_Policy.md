# TASK-188-04: Resolver and Filtering From Policy
# FileName: TASK-188-04_Resolver_and_Filtering_From_Policy.md

**Priority:** High
**Category:** Assistant/Core + Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** To Do

---

## Overview

Replace scattered resolver aliases and filter interpretation with policy-driven resolver rules.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. `cmsTargetResolver` reads resource aliases, filter aliases, and surface-only rules from policy.
2. Existing behavior from TASK-179/TASK-180/TASK-184 live tests remains green.
3. `publiczny`, `opublikowane`, `widoczne`, layout/limit and similar aliases are policy entries, not one-off code.
4. Surface-only fallback is policy-defined and not applied to real search terms.

## Security Contract

- Visibility: internal resolver.
- Auth model: no runtime change.
- RBAC: resolver only filters authorized summaries.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: unknown filters fail closed.
- Anti-abuse: destructive target count safeguards remain.
- Secret handling: resolver never reads secret payloads.

## Testing Requirements

- Port existing resolver tests to policy-driven assertions.
- Full live assistant smoke/matrix remains green.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- changelog on completion
