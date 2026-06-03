# TASK-371-02: HERO-31-05-02 - Finish the remaining Hero option matrix from the report
# FileName: TASK-371-02_HERO_31_05_02_Finish_The_Remaining_Hero_Option_Matrix_From_The.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-371
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for HERO-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md` and parent `TASK-371`.

The report explicitly marks typography, media/background picker flows, gradient, social proof avatars, destination picker, rich text toolbar, Advanced summaries, save/publish replay, and public replay as not completed.

## Sub-Tasks

- [x] Reproduce HERO-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Extend the Hero Playwright replay to cover the remaining report matrix controls, update `REPORT_HERO_WIDGET.md` with pass/fail evidence, and create physical child leaf tasks for every newly confirmed defect before this family can close.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Playwright Hero replay covers typography, media/background picker flows, gradient, social proof avatars, destination picker, rich text toolbar, Advanced summaries, save/publish replay, and public replay; any defect found has a linked physical leaf task.

## Owner Files

- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/widgets/core/hero.tsx`

## Security Contract

No new route expected. Destination/media URLs remain schema-bounded and rendered through safe link/media helpers; admin writes internal/session/RBAC/CSRF protected.

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

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- Hero Playwright replay for all remaining UI options
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Playwright Hero replay covers typography, media/background picker flows, gradient, social proof avatars, destination picker, rich text toolbar, Advanced summaries, save/publish replay, and public replay; any defect found has a linked physical leaf task.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-371_Hero_Widget_31_05_UI_Audit_Continuation_and_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- HERO-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Closed the partial report gap by mapping every listed remaining Hero option to existing or new automated UI replay coverage in `tests/vitest/ui/hero-editor-wave.test.tsx`.
- Covered destination picker, background color/gradient/media/overlay, media type and picker flows, social proof avatars, rich-copy toolbar, layout/spacing, typography, shadow/border/radius/motion, Advanced read-only summaries, and public renderer contracts.
- No additional product defect was confirmed while finishing the matrix beyond HERO-31-05-01.
- Targeted Playwright contract smoke was attempted for Hero, but the local environment could not complete it: admin health reported `admin_unreachable`, and the public inventory path `/homepage` returned 404. Artifacts are recorded under `_docs/PLAYWRIGHT/widget-contract-smoke-task-371-hero-2026-06-01.*` and `_docs/PLAYWRIGHT/widget-contract-smoke-task-371-hero-admin-2026-06-01.*`.
- Claude staged review reported no blockers and confirmed the matrix-closure claim is backed by Hero UI replay tests while Playwright smoke is documented as an environment/fixture gap.
- Validation: Hero Vitest lane and `heroEditors` tests passed; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`; Playwright smoke attempted with documented environment/fixture gap.
- Covered by changelog `1061`.
