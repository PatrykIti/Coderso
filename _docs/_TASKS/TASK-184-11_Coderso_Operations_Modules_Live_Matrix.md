# TASK-184-11: Coderso Operations Modules Live Matrix
# FileName: TASK-184-11_Coderso_Operations_Modules_Live_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Coderso Modules
**Estimated Effort:** Large
**Dependencies:** TASK-184-01, TASK-184-05, TASK-184-06
**Status:** Done (2026-04-18)

---

## Overview

Add live OpenAI/OpenRouter coverage for Coderso navigation modules not fully covered by the core CMS leaves:

- Filters
- Search
- Booking
- Reviews
- Commerce
- Popups
- Solution Kits

The suite should verify supported create/search/update/delete flows where typed actions/services exist, and safe `needs_input`/gated behavior where action adapters are intentionally not implemented yet.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Filters/Search:
  - create or seed listing-filter/search fixtures,
  - ask for filters/search presets by name/source,
  - patch filter/query settings where supported,
  - verify unrelated filters/search configs are excluded.
- Booking:
  - inspect resources/services/reservations/blackouts,
  - create/update/delete only if typed booking actions exist,
  - otherwise verify booking setup prompts return gated `needs_input`.
- Reviews:
  - inspect review moderation queues by status/rating/product target,
  - update moderation status only if supported,
  - verify unsupported broad deletion is blocked.
- Commerce:
  - inspect products/collections by name/status,
  - create/update/delete only if action adapters exist,
  - checkout/payment prompts must stay gated.
- Popups:
  - create/search/update/archive/delete test-prefixed popups where supported,
  - verify targeting/action config stays bounded.
- Solution Kits:
  - recommend/install/validate test kit flows using existing `site-kit.*` typed actions,
  - verify refinement prompts without server-derived installed-kit context stay gated.

## Files to Change

- New live test file(s) for Coderso operations modules.
- Shared live fixture helper.
- Resource catalog builders for missing module summaries where required.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: module-specific permissions remain authoritative.
- CSRF: preserve route/service ownership from harness.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: unsupported module action families must not become executable through provider output.
- Anti-abuse: booking/payment/checkout/refinement gaps must stay gated unless typed adapters exist.
- Secret handling: no payment secrets, booking personal data, review PII, webhook secrets, or provider keys in prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - supported module operations produce typed plans,
  - gated modules return `needs_input`,
  - no provider draft can invent unsupported action types.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/CODERSO_RELEASE_GATES.md` if gate coverage changes
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- changelog on completion

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/codersoOperationsLiveMatrix.test.ts`.
- OpenAI/OpenRouter live cases cover Booking, Commerce checkout/payment, Reviews destructive prompts, Popups create prompts, and Solution Kits without installed-kit context.
- The suite verifies unsupported Coderso operation modules do not produce executable action plans or provider-invented unsupported actions.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/codersoOperationsLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
