# TASK-378-01: LC-31-05-01 - Seed media assets for browser-level MediaPicker proof
# FileName: TASK-378-01_LC_31_05_01_Seed_Media_Assets_For_Browser_Level_MediaPicker_Proof.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + Media Fixtures + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-378
**Status:** To Do

---

## Overview

Execution-ready leaf task for LC-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_LOGO_CLOUD_WIDGET.md` and parent `TASK-378`.

Local media API returned `[]`, so the audit could not click a real logo image or verify grayscale/hover pixels on `img` elements.

## Sub-Tasks

- [ ] Reproduce LC-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Add deterministic test media seed for widget Playwright audits and rerun Logo Cloud selection, alt fallback, link label, grayscale, and hover-color checks.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Playwright fixture smoke: MediaPicker selects an image and public Logo Cloud renders an `img` with expected fallback/hover behavior.

## Owner Files

- `core/server/routes/mediaRoutes.ts`
- `scripts/playwright-widget-contract-smoke.ts`
- `core/widgets/core/logoCloud.tsx`

## Security Contract

No new public write endpoint. Any media seed must use existing internal admin/media APIs with auth/RBAC/CSRF and must not include secrets or external keys.

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

- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- Logo Cloud Playwright media selection smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Playwright fixture smoke: MediaPicker selects an image and public Logo Cloud renders an `img` with expected fallback/hover behavior.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/TASK-378_Logo_Cloud_Widget_31_05_UI_Audit_Fixture_and_Regression_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- LC-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
