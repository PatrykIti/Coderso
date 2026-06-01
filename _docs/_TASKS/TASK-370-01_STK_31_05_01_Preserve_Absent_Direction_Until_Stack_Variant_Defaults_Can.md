# TASK-370-01: STK-31-05-01 - Preserve absent `direction` until Stack variant defaults can apply
# FileName: TASK-370-01_STK_31_05_01_Preserve_Absent_Direction_Until_Stack_Variant_Defaults_Can.md

**Priority:** High
**Category:** Widgets + Stack + Runtime Normalization + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-370
**Status:** To Do

---

## Overview

Execution-ready leaf task for STK-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_STACK_WIDGET.md` and parent `TASK-370`.

Generic validator merges vertical `stackDefaults.direction` before `normalizeStackData`, so responsive/horizontal imported payloads without `direction` render vertical.

## Sub-Tasks

- [ ] Reproduce STK-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Use widget-definition `preserveAbsentDefaultKeys: ["direction"]` or equivalent owner logic so absent direction remains absent until variant-aware defaults resolve.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** WidgetRenderer regressions for responsive => `row/row/column`, horizontal => `row/row/row`, and validator no longer injects vertical direction into non-empty omitted payloads.

## Owner Files

- `core/widgets/core/stack.tsx`
- `core/widgets/validator.ts`

## Security Contract

No route or public write change. Keep Stack schema strict for invalid variants and unknown breakpoint keys.

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

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: WidgetRenderer regressions for responsive => `row/row/column`, horizontal => `row/row/row`, and validator no longer injects vertical direction into non-empty omitted payloads.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_STACK_WIDGET.md`
- `_docs/_TASKS/TASK-370_Stack_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Do not create a standalone changelog for this leaf unless closure policy changes; the parent family uses the reserved changelog number at implementation closure.

## Acceptance Criteria

- STK-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
