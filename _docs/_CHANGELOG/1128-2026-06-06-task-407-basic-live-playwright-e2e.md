# 1128 - TASK-407 Basic live Playwright E2E

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-07-L02, TASK-407-07, TASK-407

## Key Changes

### Assistant Site Builder
- Added a generic `local-service-business` solution kit for single-business
  service sites so Basic prompts such as a local repair/service business do not
  drift into the multi-provider directory kit.
- Tightened directory detection so `katalog uslug` for one business remains a
  local service site, while explicit provider catalogs, marketplaces, search
  directories, and comparison prompts still select `services-directory`.
- Added reviewed site-kit launch-readiness metadata and post-execute
  reconciliation for `site-kit.install` results.
- Mapped the Basic `process` section to the supported `feature-grid` widget
  alias instead of blocking execution.

### Runtime and Forms
- Added solution-kit install-time form reference resolution from blueprint
  form slugs to real form IDs before page data is persisted.
- Wired the local-service contact page to its generated public
  `service-inquiry` form so public runtime exposes a real contact form after
  execute.

### Live E2E
- Restarted `coderso-dev-core-host` and ran the live Basic
  `playwright-cli` E2E through the real admin UI and public runtime.
- The live flow completed Basic intake, review confirmation, dry-run, execute,
  public page checks, contact form presence, desktop/mobile screenshots, SEO
  description basics, and console/page error checks.
- The live smoke did not claim personalized media/image coverage; that remains
  with later TASK-407 live leaves.

### Docs and Tasks
- Closed TASK-407-07-L02 and synchronized TASK-407/TASK-407-07 task state,
  board statistics, live coverage matrix, assistant site-builder docs, and
  changelog numbering.
- Updated the public guide corpus so Solution Kits user docs and applied
  examples include `local-service-business` alongside the existing kits.
- Reconciled guide coverage paths for Coderso advanced-module docs after the
  `docs/guide/coderso/*` split, and updated developer docs to describe six
  solution-kit verticals.
- Recorded Claude and subagent read-only audit findings that materially changed
  the implementation.

## Validation

- `git diff --check`
- `set -a && source .env && set +a && bun test tests/unit/kits/solutionKitsCatalog.test.ts tests/unit/kits/installService.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/siteBuilderPlanner.test.ts`
- `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l02-basic-e2e.js`
