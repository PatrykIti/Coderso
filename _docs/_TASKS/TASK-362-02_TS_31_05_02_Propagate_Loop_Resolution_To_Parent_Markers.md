# TASK-362-02: TS-31-05-02 - Propagate loop resolution to parent markers
# FileName: TASK-362-02_TS_31_05_02_Propagate_Loop_Resolution_To_Parent_Markers.md

**Priority:** High
**Category:** Widgets + Template Section + Runtime + DB Safety + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-362
**Status:** To Do

---

## Overview

Execution-ready leaf task for TS-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TEMPLATE_SECTION_WIDGET.md` and parent `TASK-362`.

Nested self-reference is safely stopped, but the outer Template Section still reports `ready` while rendering a loop placeholder child.

## Sub-Tasks

- [ ] Reproduce TS-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** When child hydration returns `template_loop`, mark parent resolution as loop/error or expose a mixed state that cannot be read as fully ready.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Public renderer integration: self-reference returns HTTP 200, no recursion, and parent marker is not misleadingly `ready`.

## Owner Files

- `core/server/publicSite.tsx`
- `core/widgets/core/templateSection.tsx`

## Security Contract

No new route. DB-bound runtime must validate UUID shape before querying. Admin/internal writes remain authenticated, RBAC-controlled, CSRF-protected, strict reject-unknown, and must not persist malformed template references.

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

- `bun run test:vitest -- tests/vitest/widgets/template-section*.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun test` targeted template section runtime/service coverage if the owner is Bun-backed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Public renderer integration: self-reference returns HTTP 200, no recursion, and parent marker is not misleadingly `ready`.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/TEMPLATE_SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TEMPLATE_SECTION_WIDGET.md`
- `_docs/_TASKS/TASK-362_Template_Section_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- TS-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
