# TASK-369: Divider 31-05 UI Audit Remediation Family
# FileName: TASK-369_Divider_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Divider + Runtime Security + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_DIVIDER_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Sanitize Divider line and label colors so imported strings cannot leak into public inline CSS.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_DIVIDER_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Divider. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- DIV-31-05-01: Unsafe `color` and `labelColor` must be normalized

## Sub-Tasks

- [x] [TASK-369-01](TASK-369-01_DIV_31_05_01_Unsafe_Color_And_LabelColor_Must_Be_Normalized.md): DIV-31-05-01 - Unsafe `color` and `labelColor` must be normalized

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No route change. Import/admin style values are untrusted and must be normalized before public render; admin writes stay internal and strict-schema validated.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_DIVIDER_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1059; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Reproduced the report drift in code: Divider `color` and `labelColor` used non-empty string normalization and reached public inline styles plus dashed/dotted gradient strings.
- Divider now owns `normalizeDividerColorValue()` around the shared bounded CSS color helper and applies it at schema, normalization, and render-time style assembly boundaries.
- Unsafe imported `url(...)`, `expression(...)`, `javascript:`, `data:`, delimiter injection, and malformed colors now fall back to `var(--color-border)` or the sanitized line color before public output.
- Advanced preview/summary now reflects normalized effective colors through the shared Divider render/normalization path and no longer surfaces raw unsafe saved values.
- Bernoulli read-only agent confirmed the report drift before the fix and pointed to the same shared helper pattern used by Toggle Block, Tabs, and Accordion.
- Claude staged-diff review returned no blockers; its non-blocking wording note about Advanced being fixed through the shared render path was applied before closure.
- Validation: `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx`; broader Divider/UI lane with renderer, `styleNoneTokens`, and shared block-layout coverage; `bun --cwd core lint`; `bun --cwd core lint:types`; `git diff --check`.
- Covered by changelog `1059` together with TASK-369-01.
