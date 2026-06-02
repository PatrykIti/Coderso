# TASK-381-02: RTS-31-05-02 - Resolve default HTML-vs-block source drift
# FileName: TASK-381-02_RTS_31_05_02_Resolve_Default_HTML_Vs_Block_Source_Drift.md

**Priority:** High
**Category:** Widgets + Rich Text + Admin UI + Sanitizer + Media Fixtures + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-381
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for RTS-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md` and parent `TASK-381`.

Report notes default source drift where an untouched widget can look like conflict between saved HTML and blocks fallback.

## Sub-Tasks

- [x] Reproduce RTS-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Align Rich Text Section defaults so untouched `body.html` and `body.blocks` describe the same effective content, preventing the source-drift warning on a pristine widget.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Renderer/editor regression for untouched defaults and explicit source-drift cases.

## Owner Files

- `core/widgets/core/richTextSection.tsx`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`

## Security Contract

No new route. Sanitizer behavior is security-sensitive: do not widen allowed HTML/URL protocols, reject unknown fields, and keep media URLs safe/public only.

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

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- Rich Text Playwright media/sanitizer smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Renderer/editor regression for untouched defaults and explicit source-drift cases.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md`
- `_docs/_TASKS/TASK-381_Rich_Text_Section_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- RTS-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced as a failing renderer/domain regression: `resolveRichTextSourceDrift(richTextSectionDefaults).hasDrift` was `true`.
- Fixed in `core/widgets/core/richTextSection.tsx` by aligning the default structured block copy with the default body HTML plain text.
- Added renderer/domain coverage in `tests/vitest/widgets/richTextSection.test.tsx`; explicit drift cases remain covered by the existing test.
- Validation is recorded in the TASK-381 parent closure notes and changelog 1071.
