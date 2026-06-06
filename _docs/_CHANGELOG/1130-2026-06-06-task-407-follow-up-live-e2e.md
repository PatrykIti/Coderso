# 1130 - TASK-407 Follow-up live Playwright E2E

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-07-L04, TASK-407-07, TASK-407

## Key Changes

### Assistant Follow-Up Planner
- Routed guided site-builder follow-up mutations through the follow-up target
  resolver before generic CMS action mapping in both local and provider-draft
  planner paths.
- Kept nontechnical active-page prompts, such as asking for a projects/gallery
  section, on the existing-site follow-up target question instead of starting a
  new blank setup.
- Gated exact-but-unsupported follow-up operations, including page archive
  prompts, as `site-builder-follow-up-operation_unsupported` with no actions.

### Runtime and Safety
- Normalized page slugs across planner/executor update guards so catalog slugs
  and persisted page slugs compare consistently.
- Extended slug normalization to reviewed `page.delete` preview and execute
  dependency guards so persisted `contact` and planned `/contact` compare
  consistently.
- Refreshed published page state after reviewed `page.update` execution so
  public runtime checks validate the actual published output.
- Limited implicit published-page refreshes to the prior published data plus the
  reviewed assistant patch, preventing unrelated pending draft edits from being
  published with a scoped update.
- Redacted secret-like prompt/query text in generic, docs-guidance,
  policy-gated, and unresolved mapper inspection plans so unsafe
  media/reference prompts do not echo API keys, signatures, or token-like
  values.
- Reused the canonical assistant redaction helper for follow-up resolver
  candidate fields, including `sk-or-*` token-like values.
- Corrected provider-path metadata for local planning-state fail-closed routing:
  `providerDraftUsed` remains `false` when no provider draft was requested.
- Recorded the subagent/Claude drift loop that found and drove the remaining
  redaction, provider metadata, `page.delete` slug-guard, and published-refresh
  fixes.

### Live E2E
- Restarted `coderso-dev-core-host` and ran the live follow-up Playwright CLI
  flow through `http://coderso-b.localhost:5175/admin/` and
  `http://coderso-b.localhost:3001/`.
- The live flow used a beginner Polish prompt on an active generated Contact
  page, returned a trusted target question with no actions, planned/dry-ran/
  executed/restored one scoped published `page.update`, and checked `/contact`
  on desktop and mobile.
- Fail-closed coverage included stale target, ambiguous target, unsupported
  resource family, unsupported operation, poisoned target text, unsafe
  media/reference text, strict unknown context rejection, broken images,
  console errors, and page errors.

### Docs and Tasks
- Closed TASK-407-07-L04 and synchronized TASK-407-07, the task board, live
  coverage matrix, assistant site-builder docs, developer assistant docs, and
  changelog numbering.

## Validation

- `git diff --check`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts`
  - Passed: 2 files, 131 tests.
- `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - Passed: 76 tests.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `playwright-cli -s=task407-l04-follow-up-e2e run-code --filename .tmp/task-407-07-l04-follow-up-e2e.js`
  - Passed after restarting `coderso-dev-core-host`.
- `bun run gates:coderso`
