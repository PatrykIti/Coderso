# TASK-361-02: SC-31-05-02 - Reject or normalize invalid Section payloads on admin save/publish/import
# FileName: TASK-361-02_SC_31_05_02_Reject_Or_Normalize_Invalid_Section_Payloads_On_Admin.md

**Priority:** High
**Category:** Widgets + Section + Admin UI + Runtime + Security + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-361
**Status:** To Do

---

## Overview

Execution-ready leaf task for SC-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md` and parent `TASK-361`.

Admin write paths accepted `heading.level=h8`, invalid border/radius enums, then public renderer rejected the widget only at render time.

## Sub-Tasks

- [ ] Reproduce SC-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Route/service boundary must validate widget blocks with the same schema used by public rendering, or perform non-destructive normalization before persistence. Known validation failures must map to machine-readable admin errors instead of publishing invalid widgets.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Admin route/service tests for save, publish, import, and assistant mutation: invalid Section enum payload is rejected or normalized before public page publication.

## Owner Files

- `core/server/adminPages*.ts`
- `core/widgets/validator.ts`

## Security Contract

Touches admin write validation and public render safety. Admin endpoints stay internal, session/RBAC/CSRF protected, and must reject unknown widget payload fields. No new public write endpoint is introduced; anti-abuse remains unchanged.

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

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test` targeted admin page save/publish route coverage for widget validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Admin route/service tests for save, publish, import, and assistant mutation: invalid Section enum payload is rejected or normalized before public page publication.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md`
- `_docs/_TASKS/TASK-361_Section_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Do not create a standalone changelog for this leaf unless closure policy changes; the parent family uses the reserved changelog number at implementation closure.

## Acceptance Criteria

- SC-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
