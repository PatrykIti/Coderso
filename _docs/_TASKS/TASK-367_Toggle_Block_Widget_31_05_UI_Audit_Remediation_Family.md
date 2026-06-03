# TASK-367: Toggle Block 31-05 UI Audit Remediation Family
# FileName: TASK-367_Toggle_Block_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Toggle Block + Runtime Security + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TOGGLE_BLOCK_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Prevent imported Toggle Block style strings from reaching public inline CSS and CSS custom properties.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TOGGLE_BLOCK_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Toggle Block. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- TGL-31-05-01: Sanitize Toggle Block clearable color fields

## Sub-Tasks

- [x] [TASK-367-01](TASK-367-01_TGL_31_05_01_Sanitize_Toggle_Block_Clearable_Color_Fields.md): TGL-31-05-01 - Sanitize Toggle Block clearable color fields

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new route. Imported/admin style payloads are untrusted and must be normalized before public rendering; schema remains strict and unknown fields rejected.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/TOGGLE_BLOCK.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TOGGLE_BLOCK_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1057; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Reproduced the report drift in code: Toggle Block root colors used trim-only normalization and reached public inline styles plus `--nextless-toggle-*` custom properties.
- Toggle Block now owns `normalizeToggleBlockColorValue()` around the shared bounded CSS color helper and applies it at normalization plus render-time style assembly.
- The widget schema now rejects obvious unsafe import/API color strings for the four clearable color fields, while the renderer still fails closed for legacy saved data that bypassed schema validation.
- Advanced style diagnostics now read normalized/effective root colors, so unsafe saved strings are not presented as active configured behavior.
- Kuhn read-only agent confirmed the report drift and flagged the Advanced diagnostics raw-value drift before closure.
- Claude staged-diff review returned no blockers; its non-blocking schema case-sensitivity note was fixed before closure.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx`; broader Toggle Block/UI lane with renderer and shared block-layout coverage; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1057` together with TASK-367-01.
