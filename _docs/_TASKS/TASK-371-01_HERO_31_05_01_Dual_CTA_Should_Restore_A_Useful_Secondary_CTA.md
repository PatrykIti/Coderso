# TASK-371-01: HERO-31-05-01 - Dual CTA should restore a useful secondary CTA after Single CTA
# FileName: TASK-371-01_HERO_31_05_01_Dual_CTA_Should_Restore_A_Useful_Secondary_CTA.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-371
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for HERO-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md` and parent `TASK-371`.

Single CTA deletes `secondaryCta`; switching back to Dual recreates an empty object, so the UI says Dual but public preview still renders one link.

## Sub-Tasks

- [x] Reproduce HERO-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Preserve the last non-empty secondary CTA in `HeroVisualEditor` state while the author switches to Single CTA; when switching back to Dual, restore that saved CTA or fall back to `heroDefaults.secondaryCta` if no authored value exists.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** UI regression: Single -> Dual yields visible secondary CTA or a clear warning/restore flow; renderer continues to omit truly empty CTA.

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
- Focused regression: UI regression: Single -> Dual yields visible secondary CTA or a clear warning/restore flow; renderer continues to omit truly empty CTA.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-371_Hero_Widget_31_05_UI_Audit_Continuation_and_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- HERO-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced the report bug with a focused UI regression: switching to Single removed `secondaryCta`, and switching back to Dual restored an empty secondary CTA object.
- Fixed Visual mode by preserving the last non-empty secondary CTA in editor-local ref state while Single is selected, restoring it on Dual, and falling back to `heroDefaults.secondaryCta` when no authored secondary CTA exists.
- Kept renderer and domain behavior unchanged: `normalizeHeroData()` still drops empty CTA data, and saved single-CTA Hero blocks still preserve absent `secondaryCta`.
- Regression coverage proves both restoration paths: authored secondary CTA survives `Single -> Dual`, and an initially single-CTA Hero restores the default useful secondary CTA when Dual is selected.
- Claude staged review reported no blockers for hooks compiler shape, CTA restoration correctness, and runtime/domain contract preservation.
- Validation: focused regression failed before the fix and passed after; Hero Vitest lane and `heroEditors` tests passed; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1061`.
