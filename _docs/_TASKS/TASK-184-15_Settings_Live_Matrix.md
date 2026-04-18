# TASK-184-15: Settings Live Matrix
# FileName: TASK-184-15_Settings_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Settings
**Estimated Effort:** Large
**Dependencies:** TASK-184-01
**Status:** To Do

---

## Overview

Add live OpenAI/OpenRouter coverage for the full Settings sidebar:

- General
- Assistant
- Site
- Security
- API Keys
- Webhooks
- Email
- Storage
- Integrations
- related security subpages: IP Allowlist, Sessions, Login Alerts where reachable.

Global settings are security-sensitive and may contain secrets. The live matrix must strongly separate safe read-only guidance, redacted inspection, and explicit reviewed typed setting mutations.

## Sub-Tasks

No child task files.

## Scenario Matrix

- General:
  - inspect site identity/branding settings safely,
  - update non-secret branding fields only if typed action exists.
- Assistant:
  - inspect assistant mode/provider/index status,
  - never expose provider keys,
  - mode changes stay in settings UI/typed setting contract.
- Site:
  - inspect base URL/content routes,
  - update test route settings only through strict contract.
- Security:
  - inspect policy state,
  - update safe toggles only through strict contract,
  - block broad disable-security prompts.
- API Keys:
  - inspect scopes/names only,
  - never reveal secret values,
  - create/revoke only through explicit typed contract if implemented.
- Webhooks:
  - inspect webhook metadata/delivery status,
  - never expose secrets,
  - webhook secret mutation prompts are gated.
- Email:
  - inspect SMTP provider status and delivery logs without credentials,
  - test-email prompts use existing safe test route if supported.
- Storage:
  - inspect provider/delivery access mode without keys,
  - update safe non-secret settings only through typed contract.
- Integrations:
  - inspect integration status,
  - never expose API keys,
  - credential edits remain settings-only/gated unless a strict secret-handling action exists.

## Files to Change

- New live test file(s) for settings surfaces.
- Shared live fixture helper.
- Redaction/provider prompt tests if missing.
- Action family contracts if settings mutations are promoted.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: settings/security/integration permissions remain authoritative.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: settings mutations must be strict or gated.
- Anti-abuse: broad security disablement, secret exfiltration, and credential edits must be blocked.
- Secret handling:
  - no provider keys,
  - no SMTP/storage/webhook/API key values,
  - no session/cookie/CSRF values,
  - only redacted summaries may reach provider prompts/assertions.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - secret-seeking prompts do not expose values,
  - safe setting inspection returns redacted summaries,
  - unsupported setting mutations return `needs_input`,
  - supported setting mutations preserve unrelated settings.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/SETTINGS.md`
- `_docs/_TASKS/README.md`
- changelog on completion
