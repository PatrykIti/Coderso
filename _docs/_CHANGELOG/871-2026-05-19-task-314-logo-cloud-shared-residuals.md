# 871. TASK-314 Logo Cloud shared residuals

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-314, TASK-314-01, TASK-314-02, TASK-314-03

## Key Changes

### CMS Widgets

- Reopened the Logo Cloud shared-contract baseline after the `TASK-274` drift
  audit showed that several Logo Cloud rows were closed in `TASK-256` docs but
  not fully landed in the live checkout.
- Removed the duplicate Advanced owner surface for shared `logoHeight`, `gap`,
  and `alignment`, and added shared safe-link feedback for existing Logo Cloud
  `Link URL` inputs.
- Hardened the Logo Cloud shared runtime shell so section titles now render
  through the shared `<h2>` baseline with honest region naming, while
  `logoHeight: "none"` keeps the visible token without leaving tall logo images
  unbounded.

### QA and Documentation

- Refreshed `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` and
  `_docs/_WIDGETS/LOGO_CLOUD.md` so reopened shared residuals are now marked as
  `TASK-314` fixes and the remaining Logo Cloud product backlog stays routed to
  `TASK-274`.
- Synchronized `_docs/_TASKS/TASK-314*.md`, `_docs/_TASKS/README.md`, and this
  changelog index so the reopened shared family is fully closed before
  continuing Logo Cloud product work.

## Validation Addendum

- 2026-05-21 audit rerun:
  - `bun --cwd core lint` - passed
  - `bun --cwd core lint:types` - passed
  - `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx` - passed (`4` files, `66` tests)
  - `bun run gates:coderso` - passed
  - `bun run scan:security:strict` - attempted; strict wrapper failed outside the Logo Cloud scope because the local Semgrep trust store had no CA anchors and `bun audit` could not reach the advisory endpoint, while Trivy and Gitleaks sub-scanners remained clean
  - `bun run precommit` - passed repeatedly while staging the 2026-05-21 audit follow-up commits
