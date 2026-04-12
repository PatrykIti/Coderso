# TASK-170-01: Action Family Contract and Permission Model
# FileName: TASK-170-01_Action_Family_Contract_and_Permission_Model.md

**Priority:** High  
**Category:** Core/Assistant + Security + Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170  
**Status:** Done (2026-04-12)

---

## Overview

Define the contract shape for the next `LLM Guide` action families before any executor work lands. This subtask owns the action taxonomy, permissions, strict input schema ownership, and the split into leaf tasks.

## Sub-Tasks

- `TASK-170-01-01_Entry_Action_Contracts.md`
- `TASK-170-01-02_Menu_SEO_Media_Action_Contracts.md`
- `TASK-170-01-03_Form_Page_Listing_Expansion_Contracts.md`

## Pseudocode

```ts
const nextActionFamilies = [
  "entry.*",
  "menu.*",
  "seo.*",
  "media.*",
  "form.*",
  "page.*",
  "listing.*",
] as const;

for (const family of nextActionFamilies) {
  defineActionContract({
    schemaOwner: resolveDomainContractModule(family),
    requiredPermissions: resolveReadWritePermissions(family),
    previewShape: { conflicts: [], dependencies: [], warnings: [] },
    executeBoundary: "existing-domain-service",
  });
}
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/server/validation/assistantActionSchemas.ts` if split from current assistant schemas is needed
- relevant domain contract modules that own schemas/normalizers for touched resources

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC: every new action family must declare read/write/publish requirements that route/domain checks enforce.
- CSRF: existing action endpoints remain CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict per-action input schemas; no pass-through provider JSON.
- Anti-abuse: no public writes in this subtask; no nonce/HMAC/reCAPTCHA path.
- Idempotency: execute keeps actor/plan/hash idempotency.
- Secret handling: no secret-like keys in schemas, previews, audit metadata, or persisted idempotency payloads.

## Testing Requirements

- Vitest:
  - schema accepts valid new action contracts,
  - schema rejects unknown fields and unsupported action types,
  - registry type coverage for new families.
- Bun:
  - no Bun tests required until route/executor behavior is added.

## Documentation Updates Required

- Update `TASK-170` progress notes when contracts are finalized.
- Update `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, and `_docs/SECURITY_SPEC.md` when the action contract becomes executable.
- Update `_docs/_TASKS/README.md` whenever status changes.

## Acceptance Criteria

1. Action families have explicit names and input ownership.
2. Required permissions are documented before implementation.
3. Leaf tasks can implement families without redefining the security model.

## Completion Notes (2026-04-12)

- Added `core/services/assistant/actionFamilyContracts.ts` as a typed contract registry for executable and contract-only action families.
- Kept `assistantActionTypes` as the executable whitelist, so new contract-only families are known for planning work but still rejected by strict plan/provider execution paths until adapters land.
- Added Vitest coverage for contract uniqueness, permissions, strict contract normalization, and executable-boundary rejection.
