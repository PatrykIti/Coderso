# TASK-226-03: Validation, Docs, and Closure
# FileName: TASK-226-03_Validation_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-226-01, TASK-226-02
**Status:** Done - 2026-04-28

---

## Overview

Close the Coderso rebrand and Advanced IA rollout with targeted validation,
source-of-truth docs, changelog, task-board sync, and residual search evidence.
This subtask owns the final proof that product branding, route aliases, assistant
context, and docs did not drift apart.

## Sub-Tasks

- [x] TASK-226-03-01: Rebrand and IA Regression Matrix
- [x] TASK-226-03-02: Source Docs, Changelog, Board, and Residual Inventory Closure

## Files to Change

- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md` or renamed Advanced catalog equivalent.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/TASK-226*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-04-27-task-226-coderso-rebrand-advanced-ia.md`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: docs, release audit trail, and validation evidence.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: docs must not claim schema loosening or omitted
  compatibility behavior.
- Anti-abuse:
  - record skipped security/perf checks explicitly,
  - do not paste secrets or live credentials in changelog evidence,
  - do not hide residual `Nextless` or `/coderso/*` matches without owner,
    reason, and removal condition.

## Testing Requirements

- Full matrix from `TASK-226-03-01`.
- `git diff --check`
- Residual scans:
  - `rg -n "Nextless|nextless|@nextless|X-Nextless" --glob '!node_modules/**' --glob '!core/node_modules/**'`
  - `rg -n "/admin/coderso|/coderso|codersoModule|CodersoModule|CODERSO_MODULE" --glob '!node_modules/**' --glob '!core/node_modules/**'`

## Documentation Updates Required

- This subtask owns final docs/changelog/board updates.

## Acceptance Criteria

1. All changed contracts have matching validation evidence.
2. Docs describe Coderso as the product and Advanced as the module group.
3. Changelog and task board match final statuses.
4. Residual rebrand/route matches are either eliminated or explicitly
   allowlisted with a removal condition.
