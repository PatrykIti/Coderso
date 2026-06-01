# TASK-361: Section 31-05 UI Audit Remediation Family
# FileName: TASK-361_Section_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Section + Admin UI + Runtime + Security + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

Close every Section issue from the 31-05 UI-first report: unsafe style serialization, invalid payload writes reaching public render, and incomplete region-control metadata.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Section. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- SC-31-05-01: Sanitize unsafe style/color strings before public inline CSS
- SC-31-05-02: Reject or normalize invalid Section payloads on admin save/publish/import
- SC-31-05-03: Complete metadata for builder-owned Region actions and labels

## Sub-Tasks

- [x] [TASK-361-01](TASK-361-01_SC_31_05_01_Sanitize_Unsafe_Style_Color_Strings_Before_Public_Inline.md): SC-31-05-01 - Sanitize unsafe style/color strings before public inline CSS
- [x] [TASK-361-02](TASK-361-02_SC_31_05_02_Reject_Or_Normalize_Invalid_Section_Payloads_On_Admin.md): SC-31-05-02 - Reject or normalize invalid Section payloads on admin save/publish/import
- [x] [TASK-361-03](TASK-361-03_SC_31_05_03_Complete_Metadata_For_Builder_Owned_Region_Actions_And.md): SC-31-05-03 - Complete metadata for builder-owned Region actions and labels

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

Touches admin write validation and public render safety. Admin endpoints stay internal, session/RBAC/CSRF protected, and must reject unknown widget payload fields. No new public write endpoint is introduced; anti-abuse remains unchanged.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test` targeted admin page save/publish route coverage for widget validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_SECTION_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1051; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Completion Notes (2026-06-01)

- Added shared `resolveClearableCssColorValue()` and routed Section public inline
  color sinks through it, so unsafe `url(...)`, `javascript:`, `expression(...)`,
  arbitrary CSS functions, and non-`--color-*` variables fail closed at render
  time while safe color grammar still renders.
- Added page-service widget-block normalization before create/update/autosave
  snapshots and publish, so invalid Section enum payloads now fail with
  `widget_schema_invalid` before `currentData` or `publishedData` persistence.
  The current import/export bundle does not import page-builder data, so no
  page import route was widened.
- Added stable builder metadata for Section Region controls: Add Region maps to
  `regions`, each region row maps to `regions.<instanceId>`, and the label input
  maps to `regions.<instanceId>.label` with writable ownership.
- Cross-checked the diff with Claude CLI in read-only mode; no blocking drift
  was reported.

## Validation Executed (2026-06-01)

- `bun test tests/unit/pages/pageWidgetData.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts --test-name-pattern "page routes reject invalid Section widget payloads before persistence"`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
