# TASK-189-02: Fix Policy Resource Identity and Settings Collisions
# FileName: TASK-189-02_Fix_Policy_Resource_Identity_and_Settings_Collisions.md

**Priority:** High
**Category:** Assistant/Core + Policy
**Estimated Effort:** Large
**Dependencies:** TASK-189-01
**Status:** To Do

---

## Overview

Make policy resource identity stable and collision-free.

Current settings/admin policies use distinct resource keys such as `settings-api-keys`, `settings-assistant`, and `settings-security`, but they share `kind: "settings-surface"`. Resolver helpers return only `CmsResourceKind`, then `getResolverResourcePolicy("settings-surface")` selects the first policy entry with that kind. As a result, prompts for API Keys can resolve to the generic Settings root and lose route, field, secret, and gated metadata.

This task must keep the exact policy resource key through provider guidance, draft normalization, resolver lookup, target resolution, and read-only/gated response generation.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/operationPolicy/policyTypes.ts`
  - Add explicit stable policy resource identity if needed, e.g. `key`.
- `core/services/assistant/operationPolicy/assistantOperationPolicy.ts`
- `core/services/assistant/operationPolicy/policyLookup.ts`
- `core/services/assistant/operationPolicy/resolverPolicy.ts`
- `core/services/assistant/operationPolicy/providerGuidance.ts`
- `core/services/assistant/cmsOperationDraftSchema.ts`
  - Add a strict optional `resourceKey` or equivalent if the selected policy entry must cross provider/local draft boundaries.
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `tests/vitest/assistant/operation-policy-admin-surfaces.test.ts`
- `tests/vitest/assistant/operation-policy-resolver.test.ts`
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`

## Acceptance Criteria

1. Policy resource lookup can return the exact policy entry by key, alias, route, or prompt without falling back to the first matching `kind`.
2. `API Keys`, `Assistant Settings`, `General Settings`, `Site Settings`, `Security Settings`, `Webhooks`, `Email Settings`, `Storage Settings`, and `Integrations` all resolve to their own policy entries.
3. Gated/read-only settings plans preserve the selected route, fields, coverage state, secret metadata, and notes from the exact policy entry.
4. Provider guidance exposes stable resource keys and instructs providers to include them when ambiguity exists.
5. The CMS operation draft schema rejects unknown resource keys and prevents mismatched `resourceKind`/`resourceKey` pairs.
6. Coverage tests ensure no policy entry is hidden by another entry sharing the same `kind`.

## Security Contract

- Visibility: internal assistant planning and read-only/gated admin inspection.
- Auth model: existing admin session.
- RBAC: unchanged; settings/admin routes remain authoritative for real reads/writes.
- CSRF: unchanged; no route changes.
- Rate-limit bucket: existing assistant planning bucket.
- Reject-unknown validation: strict `resourceKey` validation if added; mismatched keys/kinds rejected.
- Anti-abuse: settings, security, users, roles, logs, and secret-bearing surfaces stay gated or read-only unless a future typed contract explicitly promotes them.
- Public-write hardening: not applicable; no public endpoint. Nonce/signature/HMAC and reCAPTCHA are not applicable.
- Secret handling: exact settings surface secret metadata must be preserved; provider prompts must not receive secret values.

## Testing Requirements

- Add/adjust Vitest coverage:
  - prompt `pokaz API Keys` resolves to `settings-api-keys`,
  - prompt `assistant settings provider key` resolves to `settings-assistant`,
  - prompt `security csrf settings` resolves to `settings-security`,
  - prompt `webhook secret` resolves to `settings-webhooks`,
  - every shared-kind policy entry can be selected by alias/route without collision.
- Run:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- Changelog entry on completion.
