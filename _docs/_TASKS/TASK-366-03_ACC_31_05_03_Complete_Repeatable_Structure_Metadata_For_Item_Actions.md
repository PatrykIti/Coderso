# TASK-366-03: ACC-31-05-03 - Complete repeatable Structure metadata for item actions
# FileName: TASK-366-03_ACC_31_05_03_Complete_Repeatable_Structure_Metadata_For_Item_Actions.md

**Priority:** High
**Category:** Widgets + Accordion + Runtime Security + Builder Metadata + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-366
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for ACC-31-05-03 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ACCORDION_WIDGET.md` and parent `TASK-366`.

Add Item and item row actions work but lack stable paths/targets for automation.

## Sub-Tasks

- [x] Reproduce ACC-31-05-03 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Add `slots.item` path and item instance action ids to Add, Move, and Remove controls.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Page-builder DOM regression for Accordion repeatable item metadata.

## Owner Files

- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`

## Security Contract

No new route. Style and imported widget payloads must be sanitized before public render. Admin writes remain internal/session/RBAC/CSRF protected and strict-schema validated.

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

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Page-builder DOM regression for Accordion repeatable item metadata.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ACCORDION_WIDGET.md`
- `_docs/_TASKS/TASK-366_Accordion_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- ACC-31-05-03 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced the report drift against current shared code: TASK-365 already moved add/row/action metadata into shared `VisualPanel`, and Accordion now consumes that shared path through `slots.item`.
- Added Accordion-specific VisualPanel coverage for `Add Item`, item rows, and Move up / Move down / Remove action metadata on `slots.item`.
- The closure is classified as shared-code remediation plus Accordion-specific regression coverage; no Accordion-local Structure implementation was needed.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`; broader Accordion/UI lane with renderer and shared block-layout coverage; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`; `git diff --cached --check`; Claude staged-diff review returned no blockers.
- Covered by changelog `1056`.
