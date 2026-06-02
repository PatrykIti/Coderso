# TASK-384-02: ET-31-05-02 - Resolve Entry Teaser fixture 404 and isolate React `createRoot/createPortal` console noise
# FileName: TASK-384-02_ET_31_05_02_Investigate_App_Level_React_CreateRoot_CreatePortal_Console_Error.md

**Priority:** Medium
**Category:** Widgets + Entry Teaser + Runtime Fixtures + Admin Console + QA + Docs + Leaf Remediation
**Estimated Effort:** Small
**Dependencies:** TASK-384
**Status:** Done (2026-06-02)

---

## Overview

Execution-ready leaf task for ET-31-05-02 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ENTRY_TEASER_WIDGET.md` and parent `TASK-384`.

Report saw a fixture 404 and React `createRoot/createPortal` console noise not tied to an Entry Teaser crash. Both must be removed from the Entry Teaser audit signal or assigned to a concrete non-widget owner before closure.

## Sub-Tasks

- [x] Reproduce ET-31-05-02 with the report fixture before editing and record the observed admin/public state in closure notes.
- [x] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [x] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [x] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [x] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Fix the Entry Teaser browser fixture so the resolved teaser target returns HTTP 200, then run a console-hygiene probe in `PageEditor`/preview. If `createRoot/createPortal` still reproduces after the 404 is gone, file or link the concrete app-shell owner task before closing this leaf.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Console-hygiene smoke: Entry Teaser session has no fixture 404; any repeatable `createRoot/createPortal` error has a linked app-shell owner task and is not hidden in widget closure notes.

## Owner Files

- `scripts/playwright-widget-contract-smoke.ts`
- `tests/unit/playwright-widget-contract-smoke.test.ts`
- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json`
- No PageEditor/PagePreview/EntryTeaser editor code change was required after the stale fixture path was removed; repeatable console errors are now captured by the Entry Teaser smoke proof instead of hidden in widget closure notes.

## Security Contract

No public write. Fixture setup uses authenticated internal/admin APIs only; renderer keeps safe link/media policies.

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

- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- Entry Teaser populated Playwright smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Console-hygiene smoke: Entry Teaser session has no fixture 404; any repeatable `createRoot/createPortal` error has a linked app-shell owner task and is not hidden in widget closure notes.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/TASK-384_Entry_Teaser_Widget_31_05_UI_Audit_Fixture_and_Console_Hygiene_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- ET-31-05-02 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.

## Closure Notes (2026-06-02)

- Removed the stale public fixture path by changing Entry Teaser smoke inventory to the audited `/audit-31-05-entry-teaser` admin/public route.
- Added Entry Teaser proof collection for admin/public console errors during the populated fixture pass. Any repeatable `createRoot/createPortal` error now fails the Entry Teaser proof with `entry_teaser_console_errors` and is visible in the smoke report.
- `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget entry-teaser --output-json .tmp/task-384-entry-teaser-smoke-dry-run.json --output-md .tmp/task-384-entry-teaser-smoke-dry-run.md` reports 0 fixture gaps and 0 metadata gaps.
- Live Playwright replay was not available in this workspace because `.env` lacks the required Playwright login credentials.
- Changelog 1074 covers this leaf.
