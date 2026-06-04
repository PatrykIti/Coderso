# 1097 - TASK-403 assistant docs and LLM Guide UX repair

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-403, TASK-403-01, TASK-403-02, TASK-403-03, TASK-403-04, TASK-403-05

## Key Changes

### Assistant Runtime

- Made the floating assistant composer mode-aware so Docs Assistant waits for
  the docs index, while LLM Guide is enabled by provider availability instead
  of being blocked by docs-only readiness.
- LLM Guide now starts a new chat in provider-backed mode when the global
  default is docs-only but the docs index is empty and the LLM provider is
  available, avoiding stale per-user docs-only state dead ends.
- Extended deterministic setup routing so architecture-studio prompts compose a
  portfolio catalog, services directory, and lead-capture site instead of
  collapsing to the house-projects catalog.
- Added OpenRouter model metadata resolution through the assistant provider
  contract and internal `/assistant/model-metadata` route with strict request
  validation.

### Assistant Settings

- Reworked `Settings -> Assistant` so routine setup shows only primary controls,
  while token limits, quotas, timeout, startup reindex override, and support
  reindex live in collapsed `Advanced`.
- Routed OpenRouter/OpenAI API key guidance to encrypted `Settings ->
  Integrations` secrets and moved `Enable LLM Guide` before provider/model
  controls.
- Simplified corpus copy around the official `docs/guide` source and automatic
  startup indexing.

### Docker And Docs

- Added the Docker/startup assistant docs indexing helper after startup
  migrations, keyed by image/docs fingerprint, with support override envs and
  advisory-lock protection.
- Copied `docs/` into the Docker image so the `docs/guide` corpus is available
  to the startup helper.
- Refreshed user and developer docs for Assistant Settings, Integrations,
  getting started, admin orientation, and assistant architecture.

### Testing

- Added focused Vitest coverage for composer gating, settings Advanced behavior,
  OpenRouter metadata parsing/client calls, startup docs helper idempotency, and
  route registration.
- Updated the OpenRouter live pages matrix fixture to match the current Hero
  widget schema.
- Fixed Form Embed runtime schema validation for transient resolved form data
  (`formId`, `submissionNonce`) so assistant-created contact pages render the
  public lead form instead of an invalid-widget boundary.
- Stabilized assistant action review list keys for repeated dry-run warnings.

### E2E Findings

- Playwright CLI verified the full admin flow after restarting
  `coderso-dev-core-host` on `3001/5175/5176`: prompt -> plan -> dry-run ->
  execute -> public `/portfolio`, `/uslugi`, and `/kontakt` checks.
- Claude read-only product review classified the result as a working typed
  scaffold, not a launch-ready premium service site. Home/about/process/
  references, seeded entries, media assets, navigation, and full SEO metadata
  remain follow-up scope.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/server/startupAssistantDocs.test.ts tests/vitest/server/startupMigrations.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter`
- `playwright-cli -s=task403-assistant-2 run-code --filename .tmp/task-403-assistant-settings-probe.js`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-panel.test.tsx tests/vitest/widgets/formEmbed.test.tsx`
- `playwright-cli -s=task403-assistant-full-service run-code --filename .tmp/task-403-assistant-full-service-e2e.js`
- `claude -p --effort max ...` read-only UX review with Playwright CLI
- `claude -p --effort max ...` read-only full-service scaffold review
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run gates:coderso`
