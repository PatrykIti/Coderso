# TASK-184-14: Admin Users, Roles, Audit, and Access Logs Live Matrix
# FileName: TASK-184-14_Admin_Users_Roles_Audit_and_Access_Logs_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Admin/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter coverage for Admin navigation surfaces:

- Users
- Roles Matrix
- Audit Logs
- Access Logs

These surfaces are security-sensitive. The live matrix must verify that the assistant can inspect and explain safely, and only mutate users/roles through explicit reviewed contracts if those contracts exist.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Users:
  - search users by name/email/role using test fixtures,
  - invite/update/deactivate/delete only if typed action contracts exist,
  - block broad user deletion and privilege escalation prompts.
- Roles Matrix:
  - inspect role permissions,
  - update roles only through strict typed action if implemented,
  - block prompts that grant broad admin privileges without explicit review.
- Audit Logs:
  - search audit entries by actor/action/resource/date,
  - remain read-only.
- Access Logs:
  - search access logs by actor/ip/status/date,
  - remain read-only and redact sensitive values.

## Files to Change

- New live test file for admin/security surfaces.
- Shared live fixture helper.
- Action family contracts only if user/role mutations are promoted.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: users/roles/audit/access permissions remain authoritative.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: any user/role mutation action must be strict or gated.
- Anti-abuse: broad privilege escalation/deletion prompts must return `needs_input` or blocked conflicts.
- Secret handling: no session ids, cookies, CSRF tokens, raw IP allowlist secrets, API keys, or access log sensitive payloads in provider prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - audit/access logs are read-only,
  - user/role mutation prompts are gated unless typed action exists,
  - redaction rules hold in outputs.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- changelog on completion
