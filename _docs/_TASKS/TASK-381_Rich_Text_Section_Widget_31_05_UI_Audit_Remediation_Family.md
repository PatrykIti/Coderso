# TASK-381: Rich Text Section 31-05 UI Audit Remediation Family
# FileName: TASK-381_Rich_Text_Section_Widget_31_05_UI_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Rich Text + Admin UI + Sanitizer + Media Fixtures + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md
**Status:** To Do

---

## Overview

Fix Rich Text sanitizer diagnostics drift and decide the default HTML-vs-block source contract.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Rich Text Section. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- RTS-31-05-01: Do not lose body sanitizer diagnostics after structured block edits
- RTS-31-05-02: Resolve default HTML-vs-block source drift
- RTS-31-05-03: Add image/document media fixture and paste/link sanitizer browser smoke

## Sub-Tasks

- [ ] [TASK-381-01](TASK-381-01_RTS_31_05_01_Do_Not_Lose_Body_Sanitizer_Diagnostics_After_Structured.md): RTS-31-05-01 - Do not lose body sanitizer diagnostics after structured block edits
- [ ] [TASK-381-02](TASK-381-02_RTS_31_05_02_Resolve_Default_HTML_Vs_Block_Source_Drift.md): RTS-31-05-02 - Resolve default HTML-vs-block source drift
- [ ] [TASK-381-03](TASK-381-03_RTS_31_05_03_Add_Image_Document_Media_Fixture_And_Paste_Link.md): RTS-31-05-03 - Add image/document media fixture and paste/link sanitizer browser smoke

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new route. Sanitizer behavior is security-sensitive: do not widen allowed HTML/URL protocols, reject unknown fields, and keep media URLs safe/public only.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- Rich Text Playwright media/sanitizer smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1071; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.
