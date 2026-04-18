# TASK-188-03: Provider Guidance and JSON Schema From Policy
# FileName: TASK-188-03_Provider_Guidance_and_JSON_Schema_From_Policy.md

**Priority:** High
**Category:** Assistant/Provider + Structured Output
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** To Do

---

## Overview

Generate provider guidance and CMS operation draft schema details from `assistantOperationPolicy`.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. Provider prompt no longer hardcodes resource/filter/field guidance in free text.
2. JSON schema remains strict and provider-safe.
3. Generated guidance includes only supported/gated policy surfaces.
4. Secret-bearing surfaces are described as redacted/gated.

## Security Contract

- Visibility: provider prompt package only.
- Auth model: no runtime change.
- RBAC: provider guidance cannot grant permissions.
- CSRF: no route change.
- Rate-limit bucket: existing provider route behavior.
- Reject-unknown validation: provider schema remains strict.
- Anti-abuse: broad destructive rules are included in guidance.
- Secret handling: generated prompt must not include secret values.

## Testing Requirements

- Snapshot/structured tests for provider guidance generated from policy.
- Existing OpenAI/OpenRouter unit/live smokes remain green.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- changelog on completion
