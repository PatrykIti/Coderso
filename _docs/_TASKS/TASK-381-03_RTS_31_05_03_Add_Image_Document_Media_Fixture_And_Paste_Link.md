# TASK-381-03: RTS-31-05-03 - Add image/document media fixture and paste/link sanitizer browser smoke
# FileName: TASK-381-03_RTS_31_05_03_Add_Image_Document_Media_Fixture_And_Paste_Link.md

**Priority:** High
**Category:** Widgets + Rich Text + Admin UI + Sanitizer + Media Fixtures + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-381
**Status:** Done (2026-06-01)

---

## Overview

Execution-ready leaf task for RTS-31-05-03 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md` and parent `TASK-381`.

Media API empty prevented real image/attachment selection; unsafe paste/link paths were not browser-smoked end to end.

## Sub-Tasks

- [x] Reproduce RTS-31-05-03 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Seed image/document media and add browser-level smoke for paste/link sanitizer while keeping targeted tests for renderer sanitization.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Playwright media selection and sanitizer smoke.

## Owner Files

- `scripts/playwright-widget-contract-smoke.ts`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- `tests/unit/playwright-widget-contract-smoke.test.ts`

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
- Focused regression: Playwright media selection and sanitizer smoke.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_RICH_TEXT_SECTION_WIDGET.md`
- `_docs/_TASKS/TASK-381_Rich_Text_Section_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- RTS-31-05-03 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-01)

- Reproduced as failing Bun helper regressions: `rich-text-section` did not require media bootstrap and uploaded no deterministic fixtures.
- Fixed in `scripts/playwright-widget-contract-smoke.ts` by adding Rich Text Section image/PDF seeds and `runRichTextSectionMediaAndSanitizerProof`.
- The proof path selects image and document fixtures through MediaPicker, checks admin/public image and attachment rendering, verifies unsafe link command guidance, blocks raw iframe paste, publishes, and checks public output when the live environment is available.
- Live replay remains environment-blocked: admin HTTP `000`, frontend HTTP `000`, and no Playwright credentials in `.env`.
- Validation is recorded in the TASK-381 parent closure notes and changelog 1071.
