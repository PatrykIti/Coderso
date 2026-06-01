# TASK-377-01: PP-31-05-01 - Resolve billing toggle contract: static display vs visitor-side toggle
# FileName: TASK-377-01_PP_31_05_01_Resolve_Billing_Toggle_Contract_Static_Display_Vs_Visitor.md

**Priority:** Medium
**Category:** Widgets + Pricing Plans + Product Contract + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-377
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for PP-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRICING_PLANS_WIDGET.md` and parent `TASK-377`.

Admin copy says `Billing toggle`, but public runtime renders a static `role=status` cycle display, not an interactive monthly/annual switch.

## Sub-Tasks

- [x] Reproduce PP-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Keep public Pricing Plans read-only for this remediation and rename/copy the admin control as a static billing-cycle display, not a visitor-side toggle. Do not add hydrated visitor state unless a later product task explicitly expands the contract.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** UI copy and renderer regression prove the public cycle display remains static `role=status` copy and the admin label no longer promises an interactive visitor toggle.

## Owner Files

- `core/widgets/core/pricingPlans.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`

## Security Contract

No public write endpoint. If adding hydrated runtime, it must be read-only client behavior and must not persist visitor state server-side.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Endpoint visibility must be explicit if a route is touched: internal admin routes require session/RBAC/CSRF; public routes require the existing widget-specific public access contract.
- Public writes must use nonce/signature/HMAC or the existing equivalent, optional CAPTCHA where configured, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for malformed IDs, unsafe hrefs, unsafe CSS, stale runtime data, and empty resolver states.
- Browser-visible state must not contain secrets, provider keys, privileged settings, persisted nonce values, or internal-only identifiers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: UI copy and renderer regression prove the public cycle display remains static `role=status` copy and the admin label no longer promises an interactive visitor toggle.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/_TASKS/TASK-377_Pricing_Plans_Widget_31_05_UI_Audit_Contract_Decision_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- PP-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Confirmed the public renderer already matched the chosen product contract: billing output is static `role="status"` with `data-pricing-billing-toggle="static"` and no visitor-side switch behavior.
- Changed the editor contract title, Visual section title, switch label, helper copy, and Advanced diagnostic label to use `Billing cycle display` / `Billing display` instead of `Billing toggle`.
- Preserved `billingToggle` data keys and existing normalization to avoid a destructive migration for saved content.
- Added focused UI and renderer/contract regressions: admin copy no longer contains `Billing toggle` or `Enable billing toggle`, the shared editor contract title is `Billing cycle display`, and public output does not expose visitor-side switch markers.
- Validation: focused widget/UI regressions failed before the copy fix and passed after; Pricing Plans Vitest lane passed; widget-template visual-section regression passed; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`; Carver sidecar reported no drift beyond the admin/docs copy fixed here; Claude re-review reported no blockers after the stale template assertion was fixed.
- Covered by changelog `1067`.
