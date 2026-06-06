# 1129 - TASK-407 Advanced live Playwright E2E

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-07-L03, TASK-407-07, TASK-407

## Key Changes

### Assistant Site Builder
- Added bounded, schema-owned `advancedRuntimeOverrides` for reviewed Advanced
  menu, CTA, Hero, and homepage section choices.
- Kept Basic reviewed intake on its previous exact `siteKit` contract while
  allowing only registry-derived Advanced runtime choices into Advanced
  `siteKit` action input.
- Propagated Advanced overrides through compiler, strict action normalization,
  planner cloning, executor handoff, and explicit `site-kit.install` execution.

### Public Runtime
- Applied Advanced menu behavior through the existing Navigation widget
  contract, including menu-backed links, CTA target resolution, sticky mode, and
  mobile drawer mode.
- Applied supported Hero and section choices through existing widget `variant`
  fields without copying raw prompt text, arbitrary URLs, CSS, references, or
  unsupported media claims into executable payloads.
- Published installed solution-kit menus so menu-backed public Navigation
  widgets resolve the installed primary menu instead of falling back to manual
  links after execute.
- Fixed dry-run updates for existing menus so page links planned by the same kit
  can be represented as predicted ids without mutating database rows.

### Live E2E
- Restarted `coderso-dev-core-host` and ran the live Advanced Playwright CLI
  flow through `http://coderso-b.localhost:5175/admin/` and
  `http://coderso-b.localhost:3001/`.
- The live flow used a nontechnical Polish prompt, switched to Advanced mode,
  completed reviewed menu/hero/section/design/reference steps, proved
  unreviewed reference text stays gated, dry-ran, executed, and verified public
  runtime output.
- Public checks covered menu source, mobile drawer, CTA target, supported
  section variants, generated pages, contact form, SEO descriptions,
  desktop/mobile layout, broken images, console errors, and page errors.
- This entry claims Advanced runtime mechanics only. The resulting public site
  still used generic local-service copy/branding and a media placeholder, so
  full prompt-specific copy/media personalization remains TASK-407-07 follow-up
  scope.

### Docs and Tasks
- Closed TASK-407-07-L03 and synchronized TASK-407/TASK-407-07 task rows,
  board statistics, live coverage matrix, assistant site-builder docs, API docs,
  and changelog numbering.
- Recorded the Claude/subagent pre-implementation drift finding that changed
  L03 from metadata-only validation into bounded runtime override work. Later
  Claude narrow re-audit retries hit provider overload `529`; subagent review
  found no blocker after the task contract was clarified.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test tests/unit/assistant/siteBuilderExecutor.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/unit/server/schemaValidator.test.ts tests/unit/kits/installService.test.ts`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts`
- `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l03-advanced-e2e.js`
- `git diff --check`
- `bun run gates:coderso`
