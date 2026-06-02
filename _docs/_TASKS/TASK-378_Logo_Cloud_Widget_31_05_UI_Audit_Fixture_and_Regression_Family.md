# TASK-378: Logo Cloud 31-05 UI Audit Fixture and Regression Family
# FileName: TASK-378_Logo_Cloud_Widget_31_05_UI_Audit_Fixture_and_Regression_Family.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + Media Fixtures + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-343, _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_LOGO_CLOUD_WIDGET.md
**Status:** Done (2026-06-01)

---

## Overview

The Logo Cloud report found no product defect; close the MediaPicker fixture gap with deterministic media evidence.

Source report: `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_LOGO_CLOUD_WIDGET.md`.

This task family is intentionally scoped to everything the report calls out for Logo Cloud. Do not downgrade it to a partial MVP; if implementation discovers the report is stale, update the report, this task, and the changelog with evidence before closing.

## Report Evidence

- LC-31-05-01: Seed media assets for browser-level MediaPicker proof

## Sub-Tasks

- [x] [TASK-378-01](TASK-378-01_LC_31_05_01_Seed_Media_Assets_For_Browser_Level_MediaPicker_Proof.md): LC-31-05-01 - Seed media assets for browser-level MediaPicker proof

## Implementation Pseudocode

1. Reproduce the report fixture and capture the failing admin/public state before editing.
2. Move contract logic into the widget/domain owner, not ad hoc route or editor code.
3. Normalize external/admin/import payloads through explicit helper functions before persistence, rendering, caching, or runtime binding.
4. Keep legacy data non-destructive: preserve saved dormant state only when the UI labels it as inactive; otherwise clear it through an explicit migration/normalizer path.
5. Add focused tests first for each report finding, then implement until those tests and the existing widget lane pass.

## Security Contract

No new public write endpoint. Any media seed must use existing internal admin/media APIs with auth/RBAC/CSRF and must not include secrets or external keys.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- Logo Cloud Playwright media selection smoke
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

For DB-backed tests, load env before execution: `set -a && source .env && set +a`. If DB is unavailable, record the skipped validation explicitly in the task closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/README.md` status row when this task starts or closes.
- Reserved changelog number 1068; create the changelog entry only when this family is implemented or closed, and list the parent task ID plus every leaf task ID closed by that entry.

## Acceptance Criteria

- Every report finding listed above is either fixed, covered by a regression test, or reclassified with new evidence and updated docs.
- Admin Visual/Wizard/Advanced copy matches the effective runtime state.
- Public SSR/runtime does not expose unsafe CSS, unsafe URLs, malformed identifiers, or misleading active-state markers.
- Targeted widget tests, relevant route/security tests, lint/typecheck, and `git diff --check` have been run or explicitly documented as unavailable.

## Closure Notes (2026-06-01)

- Reproduced LC-31-05-01 as a fixture/data gap: the Logo Cloud renderer/editor already support image-backed logos, but the local Media Library had no deterministic records for browser proof.
- Added Logo Cloud media fixture detection to `scripts/playwright-widget-contract-smoke.ts`. When selected cases include `logo-cloud`, the harness now seeds `widget-fixture-logo-cloud-acme.svg` through the existing authenticated `/admin/api/media` route with CSRF before running browser probes.
- Added a Logo Cloud `mediaProof` to the Playwright admin probe: it opens the real MediaPicker, selects the seeded asset, checks admin preview image/alt/grayscale/hover classes, publishes the fixture page, and checks the public `<img>` output on the fixture route.
- Kept the change out of production widget code and did not add any public endpoint or browser-visible secret state.
- Added Bun helper coverage for the Logo Cloud media-fixture selection contract plus the authenticated admin upload/PATCH contract. The focused test failed before the helper existed and passes after implementation.
- Full live Playwright replay was environment-blocked in this session: `playwright-cli` is installed, but `localhost:5173` and `localhost:3000` were not running, and `.env` did not provide `CODERSO_PLAYWRIGHT_EMAIL` / `CODERSO_PLAYWRIGHT_PASSWORD`. The targeted smoke dry-run for `logo-cloud` passed inventory validation.
- Validation: `bun test tests/unit/playwright-widget-contract-smoke.test.ts -t "media fixture bootstrap"`; `bun test tests/unit/playwright-widget-contract-smoke.test.ts`; `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx`; `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget logo-cloud --output-json .tmp/task-378-logo-cloud-smoke-dry-run.json --output-md .tmp/task-378-logo-cloud-smoke-dry-run.md`.
- Covered by changelog `1068` together with TASK-378-01.
