# TASK-188-02-04: Coderso Planned and Gated Modules Policy Migration
# FileName: TASK-188-02-04_Coderso_Planned_and_Gated_Modules_Policy_Migration.md

**Priority:** High
**Category:** Assistant/Core + Coderso Policy
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** Done (2026-04-19)

---

## Overview

Move Coderso preview/planned modules and gated operations into policy.

## Sub-Tasks

No child task files.

## Policy Entries

- Filters
- Coderso Search
- Booking
- Appointments
- Reviews
- Commerce
- Popups
- Mega Menu
- Portal
- Multilingual/i18n
- Solution Kits

## Pseudocode

```ts
booking: {
  routes: ["/admin/coderso/booking"],
  operations: ["inspect"],
  gatedOperations: ["create", "update", "delete", "configure"],
  gateReason: "booking_action_adapters_missing",
}
```

## Security Contract

- Visibility: internal policy data.
- RBAC: module permissions reflected.
- Reject-unknown validation: planned modules cannot be executable.
- Anti-abuse: checkout/payment/booking/refinement gaps stay gated.
- Secret handling: payment/booking/review PII not sent to provider.

## Testing Requirements

- Policy coverage for all `CODERSO_MODULE_REGISTRY` nav entries.
- Planned modules marked `not-applicable` or `live-gated`, never executable.
- Existing Coderso live-gated matrix remains green.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gate docs change
- changelog on completion

## Completion Notes (2026-04-19)

- Added `codersoModulePolicies.ts` with policy entries for Posts, Filters, Coderso Search, Booking, Appointments, Reviews, Commerce, Popups, Mega Menu, Portal, Multilingual/i18n, Solution Kits, Plugin Store, and Admin UI Theme.
- Marked preview/gated modules as `live-gated` without executable mutation modes, and planned modules as `not-applicable`.
- Kept Solution Kit typed action names represented while policy mode remains gated until guided context is available.
- Extended the assistant policy aggregate and Vitest coverage for `CODERSO_MODULE_REGISTRY` routes, planned module non-executable states, gated module mutation states, secrets, and remaining route coverage.
- No runtime planner/resolver behavior was changed in this leaf.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-schema.test.ts tests/vitest/assistant/operation-policy-lookup.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coderso-modules.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
