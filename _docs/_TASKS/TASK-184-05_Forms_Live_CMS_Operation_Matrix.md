# TASK-184-05: Forms Live CMS Operation Matrix
# FileName: TASK-184-05_Forms_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Forms
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for form operations.

The suite should create forms, search by name/slug/status/public visibility, update form metadata/access, archive forms with retention-safe semantics, delete zero-submission forms, and verify unsafe hard deletes remain blocked.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create:
  - public lead form,
  - internal/admin-only form,
  - optional safe non-webhook automation.
- Search:
  - public forms by name,
  - internal forms by status/access,
  - exclude unrelated forms.
- Update:
  - rename form,
  - change submission access,
  - archive selected forms.
- Delete:
  - delete zero-submission forms by counted prefix,
  - archive instead of hard delete where submissions exist.
- Negative:
  - webhook automation with secrets remains unsupported/blocked,
  - hard delete with submissions blocked.

## Files to Change

- New live test file for forms.
- Shared live fixture helper.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: form mutations require forms write permissions.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `form.*` actions and automation contracts must pass strict schemas.
- Anti-abuse: public write endpoint hardening is not bypassed; tests use admin mutation flow only.
- Secret handling: no form submissions or webhook secrets in provider prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - public/internal visibility filters work,
  - archive/delete behavior follows submission count rules,
  - unsafe webhook prompt returns `needs_input` or conflict.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md` if live coverage documents form anti-abuse
- `_docs/_TASKS/README.md`
- changelog on completion
