# TASK-368: Spacer 31-05 UI Audit Closure and Regression Guard Family
# FileName: TASK-368_Spacer_Widget_31_05_UI_Audit_Closure_and_Regression_Guard_Family.md

**Priority:** Medium
**Category:** Widgets + Spacer + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPACER_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

The Spacer report found no new functional defect; convert that result into durable regression coverage and fixture documentation.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPACER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Spacer. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- SPC-31-05-01: Lock responsive/fixed/unsafe-length behavior as a regression guard

## Sub-Tasks

- [x] [TASK-368-01](TASK-368-01_SPC_31_05_01_Lock_Responsive_Fixed_Unsafe_Length_Behavior_As_A.md): SPC-31-05-01 - Lock responsive/fixed/unsafe-length behavior as a regression guard

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No route or public write change. Preserve existing unsafe length fallback and strict schema behavior.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/SPACER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPACER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1058; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Confirmed the report remains a closure/guard family: no production Spacer contract change was required.
- Added renderer regressions that lock the 31-05 responsive `24/20/16` public markers and CSS variables, fixed-mode desktop reuse, public guide gating, explicit `showGuideInEditor=false`, and invalid variant fail-closed behavior through `WidgetRenderer`; existing unsafe length fallback coverage remains part of the guard lane.
- Ramanujan read-only agent confirmed existing coverage for fixed reuse, unsafe fallback, guide gating, and read-only editors; its suggested no-guide and invalid-variant public guards were added before closure.
- Claude staged-diff review returned no blockers; its non-blocking wording note about pre-existing unsafe fallback coverage was fixed before closure.
- Browser breakpoint computed-height proof remains the 31-05 Playwright evidence; the new automated guard asserts the deterministic SSR markers/classes/vars that drive those browser heights.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx`; broader Spacer/UI lane with renderer, `styleNoneTokens`, and shared block-layout coverage; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1058` together with TASK-368-01.
