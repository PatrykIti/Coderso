# TASK-370: Stack 31-05 UI Audit Remediation Family
# FileName: TASK-370_Stack_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Stack + Runtime Normalization + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_STACK_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Ensure imported non-empty Stack data without `direction` still receives variant-aware direction defaults.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_STACK_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Stack. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- STK-31-05-01: Preserve absent `direction` until Stack variant defaults can apply

## Sub-Tasks

- [x] [TASK-370-01](TASK-370-01_STK_31_05_01_Preserve_Absent_Direction_Until_Stack_Variant_Defaults_Can.md): STK-31-05-01 - Preserve absent `direction` until Stack variant defaults can apply

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No route or public write change. Keep Stack schema strict for invalid variants and unknown breakpoint keys.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_STACK_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1060; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Reproduced the report drift in code: `normalizeWidgetBlock()` merged `stackDefaults.direction` into non-empty imported Stack payloads before `normalizeStackData()` could apply variant-aware defaults.
- Stack now opts into the existing validator contract with `preserveAbsentDefaultKeys: ["direction"]`, so saved/imported non-empty payloads that omit `direction` keep it absent until Stack resolves variant defaults.
- Added WidgetRenderer regressions for `variant="responsive"` without `direction` resolving to `row/row/column` and `variant="horizontal"` without `direction` resolving to `row/row/row`.
- Added Stack and Bun validator regressions proving non-empty omitted `direction` is not injected during validation.
- Hegel read-only agent confirmed the implementation and flagged docs/changelog/report closure drift; those closure updates were applied before commit.
- Claude staged review reported no blockers and confirmed the normalization contract, runtime markers, tests, task board, and changelog.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`; `bun test tests/unit/widgets/validator.test.ts`; broader Stack/UI lane with renderer, `styleNoneTokens`, widget template, and shared block-layout coverage; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1060` together with TASK-370-01.
