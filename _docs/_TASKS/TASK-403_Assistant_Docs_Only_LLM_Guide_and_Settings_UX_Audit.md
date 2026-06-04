# TASK-403: Assistant Docs Only LLM Guide and Settings UX Audit
# FileName: TASK-403_Assistant_Docs_Only_LLM_Guide_and_Settings_UX_Audit.md

**Priority:** High  
**Category:** Assistant + Admin UI + Docs + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101, TASK-106, TASK-119, TASK-171, TASK-400  
**Status:** Done (2026-06-04)

---

## Overview

Audit and repair the assistant module end to end:

1. Improve `docs-only` behavior by strengthening the user-facing `docs/guide`
   corpus and preserving deterministic answers.
2. Verify `LLM Guide` with the configured OpenRouter test provider and fix the
   disabled composer state seen in production when assistant and LLM Guide are
   enabled.
3. Simplify `Settings -> Assistant` so routine users do not manage reindexing
   manually, move token/provider tuning into a collapsed Advanced section, and
   auto-read OpenRouter model limits when possible.
4. Move docs reindexing toward Docker/startup ownership: one idempotent startup
   helper per image/docs version, with manual reindex hidden from the default
   settings flow.

Claude Code may be used in max-effort read-only/design-review passes to improve
documentation and UX feedback, but production code and final integration remain
owned in this repo.

---

## Security Contract

- Visibility: internal admin assistant surfaces only (`/admin/api/assistant/*`,
  `/admin/settings/assistant`).
- Auth model: existing admin session.
- RBAC:
  - `settings:read` for status/chat/planning reads,
  - `settings:write` for settings writes and any remaining explicit reindex
    operation,
  - existing content/resource permissions for LLM Guide dry-run/execute.
- CSRF:
  - required for all POST routes, including chat, action planning, and reindex.
- Rate-limit bucket:
  - `assistant` for chat/action routes and provider metadata fetches exposed
    through assistant/admin settings contracts.
- Validation:
  - schema-first payloads,
  - reject unknown request fields,
  - normalize settings/model metadata through owner helpers before persistence.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/signature/HMAC or reCAPTCHA because this remains internal admin
    traffic,
  - provider metadata fetches must be bounded, timeout-controlled, and safe when
    the provider is unavailable.
- Secret handling:
  - OpenRouter/OpenAI keys stay backend-only through integrations runtime config
    or test-only env lanes,
  - no provider keys, session IDs, CSRF tokens, or secrets in browser cache,
    localStorage, debug payloads, docs corpus, or assistant transcript state.

---

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-403-01 | Assistant Docs Only Corpus and Answer Quality | Done (2026-06-04) |
| TASK-403-02 | LLM Guide Composer Availability and OpenRouter Live Verification | Done (2026-06-04) |
| TASK-403-03 | Assistant Settings UX and OpenRouter Model Metadata | Done (2026-06-04) |
| TASK-403-04 | Docker Startup Assistant Docs Reindex Helper | Done (2026-06-04) |
| TASK-403-05 | Assistant Docs QA Docs Changelog and Closure | Done (2026-06-04) |

### TASK-403-01: Docs-only corpus and answer quality

**Status:** Done (2026-06-04)

Implementation shape:

```ts
// docs-only runtime stays deterministic
const result = await answerAssistantQuestion({
  prompt,
  detailLevel,
  guideMode,
  retriever: docsDbRetriever,
});
```

Required work:
- Audit high-traffic assistant docs, especially assistant settings, getting
  started, admin orientation, and LLM Guide explanation docs.
- Use Claude max-effort review to propose clearer user-facing guide text.
- Keep code/comments in English and do not document unshipped behavior.
- Update `docs/guide/_COVERAGE_MATRIX.md` if route ownership changes.
- Add or update docs-answer/composer tests only if retrieval/composition logic
  changes.

Regression-test shape:
- Existing `docsAnswerComposer` and `docsDbRetriever` suites remain green.
- If docs format changes, add a focused validation or coverage-matrix test.

### TASK-403-02: LLM Guide composer availability and OpenRouter live verification

**Status:** Done (2026-06-04)

Implementation shape:

```ts
function resolveAssistantComposerState(status, currentMode) {
  if (!status?.enabled) return { disabled: true, reason: "assistant_disabled" };
  if (currentMode === "docs-only" && !status.indexReady) {
    return { disabled: true, reason: "docs_not_ready" };
  }
  if (currentMode === "llm-guide" && !status.llmAvailable) {
    return { disabled: true, reason: "llm_unavailable" };
  }
  return { disabled: false };
}
```

Required work:
- Reproduce the disabled input behavior with local admin runtime and configured
  OpenRouter test env (`TEST_OPENROUTER_API_KEY`, `TEST_OPENROUTER_MODEL`).
- Verify whether the composer is incorrectly gated by docs index readiness,
  default-mode mismatch, user settings, status shape, or provider availability.
- Fix the smallest owner module that makes the runtime truth match the selected
  mode.
- Ensure `LLM Guide` fails closed when provider config is missing, but remains
  usable when provider config is valid even if docs-only corpus needs a separate
  readiness action.

Regression-test shape:
- Vitest UI coverage for composer enabled/disabled state by mode.
- Bun route/service coverage for status `llmAvailable` and provider config
  resolution if backend status changes.
- Live OpenRouter smoke only in the explicit test lane with env loaded.

### TASK-403-03: Assistant Settings UX cleanup and OpenRouter model metadata

**Status:** Done (2026-06-04)

Implementation shape:

```ts
async function resolveAssistantModelLimits(provider, model) {
  const metadata = await provider.fetchModelMetadata?.({ model });
  return {
    maxInputTokens: metadata?.maxInputTokens ?? DEFAULT_SAFE_INPUT_TOKENS,
    maxOutputTokens: metadata?.maxOutputTokens ?? DEFAULT_SAFE_OUTPUT_TOKENS,
    source: metadata ? "provider" : "default",
  };
}
```

Required work:
- Run a Playwright CLI walkthrough of `Settings -> Assistant` using the local
  helper server command.
- Use Claude max-effort UX review on the settings screen and resulting
  screenshots/code.
- Hide routine reindex controls from default settings content; keep any manual
  action as an advanced/support affordance only if still necessary.
- Collapse token limits, timeout, quotas, and technical provider knobs under an
  Advanced section by default.
- Read OpenRouter model input/output limits from OpenRouter metadata when
  available; fall back to low safe defaults that remain editable in Advanced.

Regression-test shape:
- Vitest UI tests for collapsed Advanced defaults and advanced field visibility.
- Admin client/settings tests for model metadata defaults and save payloads.
- Provider adapter tests with mocked OpenRouter metadata responses.

### TASK-403-04: Docker/startup docs reindex helper

**Status:** Done (2026-06-04)

Implementation shape:

```ts
await maybeRunAssistantDocsStartupReindex({
  imageVersion,
  docsFingerprint,
  alreadyIndexedVersion,
  reindex: ingestOfficialDocs,
});
```

Required work:
- Integrate assistant docs reindexing with the Docker startup path after
  migrations and before serving traffic, unless disabled by an explicit ops env.
- Make the helper idempotent: reindex only when no successful run exists for the
  current docs/image version or when the version changes.
- Preserve manual/admin reindex API behavior for support scenarios unless the
  route contract is explicitly retired with tests/docs.
- Avoid import-time DB/runtime coupling in Bun-free assistant modules.

Regression-test shape:
- Bun-owned startup/helper tests for idempotency and error behavior.
- Route registration tests only if reindex route visibility changes.

### TASK-403-05: Docs, task board, changelog, and validation

**Status:** Done (2026-06-04)

Required work:
- Update user docs for the final Assistant Settings and assistant-mode behavior.
- Update developer docs/source-of-truth specs affected by startup reindex,
  OpenRouter metadata, and settings UX.
- Add changelog entry and keep task board counts synchronized on closure.
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest/Bun suites for touched contracts
  - `bun run gates:coderso` when final scope changes release-gated behavior.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- `bun run vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
- `set -a && source .env && set +a && bun run test:assistant:live` when live provider credentials are available and the lane is configured.
- Playwright CLI authenticated walkthrough for `/admin/settings/assistant` and
  floating assistant composer behavior.
- Playwright CLI authenticated end-to-end LLM Guide flow after helper restart:
  prompt -> plan -> dry-run -> execute -> public page verification.

## Validation Results

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/server/startupAssistantDocs.test.ts tests/vitest/server/startupMigrations.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts` - passed, 9 files / 90 tests.
- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-settings.test.tsx` - passed, 1 file / 5 tests after final UX polish.
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts` - passed, 45 tests.
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter` - passed, 1 live OpenRouter test.
- `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter` - passed, 15 live OpenRouter CMS matrix tests after fixing the stale pages fixture.
- `playwright-cli -s=task403-assistant-2 run-code --filename .tmp/task-403-assistant-settings-probe.js` - passed; authenticated UI probe confirmed default controls, collapsed Advanced behavior, and no console/page errors.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-panel.test.tsx tests/vitest/widgets/formEmbed.test.tsx` - passed, 5 files / 161 tests for the follow-up LLM Guide, blueprint-composition, review UI, and Form Embed runtime schema fixes.
- `playwright-cli -s=task403-assistant-full-service run-code --filename .tmp/task-403-assistant-full-service-e2e.js` - passed after restarting `coderso-dev-core-host` on `3001/5175/5176`; with `defaultMode=docs-only`, empty docs index, and OpenRouter available, LLM Guide planned `Portfolio Projects Catalog with Services Directory, Lead Capture Site`, dry-run was executable, execute returned 14 results / 0 failures, and public `/portfolio`, `/uslugi`, `/kontakt` rendered with 200 and no console/page errors.
- `claude -p --effort max ...` - read-only UX review with Playwright CLI returned overall PASS and the final non-blocking ordering/corpus-copy nits were applied.
- `claude -p --effort max ...` - read-only product review of the sanitized full-service E2E result confirmed the delivered output is a stable typed scaffold, not a launch-ready premium service site; missing home/about/process/references/sample entries/media/navigation/SEO remain explicit follow-up scope.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check` - passed.
- `bun run gates:coderso` - passed all gates: functional, ux, performance, security, reliability.

---

## Documentation Updates Required

- `docs/guide/screens/assistant-settings.md`
- `docs/guide/getting-started/admin-orientation.md`
- `docs/guide/getting-started/site-setup-and-first-publish.md`
- `docs/develop/assistant.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if API shape changes
- `_docs/SECURITY_SPEC.md` if provider/reindex security behavior changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`
