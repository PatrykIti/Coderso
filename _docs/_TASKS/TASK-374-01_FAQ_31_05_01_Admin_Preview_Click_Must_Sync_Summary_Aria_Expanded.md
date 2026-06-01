# TASK-374-01: FAQ-31-05-01 - Admin preview click must sync `summary[aria-expanded]` or show a boundary notice
# FileName: TASK-374-01_FAQ_31_05_01_Admin_Preview_Click_Must_Sync_Summary_Aria_Expanded.md

**Priority:** Medium
**Category:** Widgets + FAQ Accordion + Admin Preview + Accessibility + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-374
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for FAQ-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FAQ_ACCORDION_WIDGET.md` and parent `TASK-374`.

Public runtime synchronizes `aria-expanded`, but dynamic admin React preview does not execute the injected script, so admin details open while `aria-expanded` stays null.

## Sub-Tasks

- [x] Reproduce FAQ-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Add an admin-safe FAQ preview effect that runs the same disclosure sync logic for `[data-coderso-faq="1"]` roots after admin canvas render, so clicking a summary updates `aria-expanded` like public runtime.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** UI regression: clicking an admin preview summary updates `aria-expanded` through the admin-safe FAQ preview effect.

## Owner Files

- `core/admin/ui/pages/PageEditor.tsx`
- `core/widgets/core/faqAccordion.tsx`

## Security Contract

No API route or public write changes. Admin bootstrap must be read-only and must not execute arbitrary persisted scripts.

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

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: UI regression: clicking an admin preview summary updates `aria-expanded` through the admin-safe FAQ preview effect.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FAQ.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FAQ_ACCORDION_WIDGET.md`
- `_docs/_TASKS/TASK-374_FAQ_Accordion_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- FAQ-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced FAQ-31-05-01 with a focused UI regression: rendering FAQ in the admin preview bridge fixture failed before implementation because no admin-side disclosure binder existed.
- Added FAQ-owned DOM sync helpers for `[data-coderso-faq="1"]` roots and a page-builder `AdminWidgetPreviewRuntimeBridge` that binds those helpers after React preview render.
- Wired the bridge into `BlockList` canvas preview, `BlockSettings` shared live preview, and custom-screen read-only widget preview so admin disclosure toggles update `summary[aria-expanded]` like public runtime.
- No route, public write, persistence, or arbitrary script execution behavior changed.
- Claude staged review reported no blockers for the base page-builder bridge diff; final re-review after the custom-screen bridge delta was unavailable due budget/timeout.
- Validation: focused regression failed before the fix and passed after; FAQ Accordion Vitest lane passed; `tests/vitest/widgets/screenWidgets.test.tsx` passed for custom-screen read-only preview; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1064`.
