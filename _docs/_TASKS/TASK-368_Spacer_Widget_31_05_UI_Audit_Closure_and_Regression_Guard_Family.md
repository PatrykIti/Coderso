# TASK-368: Spacer 31-05 UI Audit Closure and Regression Guard Family
# FileName: TASK-368_Spacer_Widget_31_05_UI_Audit_Closure_and_Regression_Guard_Family.md

**Priority:** Medium
**Category:** Widgets + Spacer + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPACER_WIDGET.md
**Status:** To Do

---

## Overview

The Spacer report found no new functional defect; convert that result into durable regression coverage and fixture documentation.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SPACER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Spacer. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- SPC-31-05-01: Lock responsive/fixed/unsafe-length behavior as a regression guard

## Sub-Tasks

- [ ] [TASK-368-01](TASK-368-01_SPC_31_05_01_Lock_Responsive_Fixed_Unsafe_Length_Behavior_As_A.md): SPC-31-05-01 - Lock responsive/fixed/unsafe-length behavior as a regression guard

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
- Reserved changelog number 1058; create the changelog entry only when this family is implemented or closed.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
