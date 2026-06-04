# TASK-404-07: Assistant Current Implementation Drift Audit and Repair Loop
# FileName: TASK-404-07_Assistant_Current_Implementation_Drift_Audit_and_Repair_Loop.md

**Priority:** High
**Category:** Assistant + QA + Drift Audit + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-404, TASK-403
**Status:** In Progress (2026-06-04)

---

## Overview

Audit the current Assistant implementation end to end, find product/UX/runtime
drifts, repair them in dependency order, and keep looping with Claude,
sub-agents, automated tests, and Playwright CLI until no blocking drift remains.

This is a quality gate for TASK-404. Full-service generation must not build on
top of unresolved Assistant drift in settings, provider availability, mode
selection, action planning, dry-run review, execution, docs indexing, admin UI,
or public runtime verification.

Claude max/xhigh reviews must be given enough time to complete. Use a long
timeout window, normally 15-25 minutes, for broad source/UI reviews instead of
classifying an empty early poll as a completed review.

## Sub-Tasks

- Run a current-state Assistant audit with Claude and at least the relevant
  sub-agent perspectives:
  - UX/product/admin UI,
  - architecture/security/action contracts,
  - QA/E2E/runtime.
- Reproduce drifts through local tests or Playwright CLI before fixing where
  feasible.
- Fix every blocking drift in dependency order.
- Restart `coderso-dev-core-host` after fixes that affect runtime/admin UI.
- Verify with Playwright CLI on:
  - admin UI: `http://coderso-b.localhost:5175/admin/`,
  - assistant settings: `http://coderso-b.localhost:5175/admin/settings/assistant`,
  - public front: `http://coderso-b.localhost:3001/`.
- Repeat audit -> fix -> test -> Playwright -> Claude/agent review until the
  latest pass has no blocking drift.

## Files To Change

| Area | Likely files |
|---|---|
| Assistant admin UI | `core/admin/ui/assistant/*`, `core/admin/ui/settings/*` |
| Assistant clients/cache | `core/admin/services/assistantClient.ts`, related admin cache helpers if touched |
| Assistant runtime | `core/services/assistant/*`, `core/server/routes/assistantRoutes.ts`, `core/server/validation/assistantActionSchemas.ts` |
| Settings/provider integration | `core/services/settings/*`, `core/services/integrations/*`, provider adapters |
| Docs startup/indexing | `core/server/startupAssistantDocs.ts`, docs ingest/reindex services if drift is found |
| Tests | `tests/vitest/assistant/*`, `tests/vitest/ui/assistant-*`, `tests/unit/assistant/*`, `tests/integration/routes/assistant.test.ts`, live/provider lanes |
| Docs/tasks | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, task/changelog files on closure |

## Implementation Pseudocode

```ts
type AssistantDriftFinding = {
  id: string;
  source: "claude" | "agent-ux" | "agent-architecture" | "agent-qa" | "playwright" | "test";
  severity: "blocking" | "non-blocking";
  area: "admin-ui" | "settings" | "planner" | "executor" | "routes" | "docs-index" | "public-runtime";
  expected: string;
  actual: string;
  ownerFiles: string[];
  regressionTest: string;
};

async function runAssistantDriftLoop() {
  let pass = 0;
  while (true) {
    pass += 1;
    const findings = await collectAssistantDrifts({
      claudeTimeoutMs: 25 * 60 * 1000,
      agents: ["ux", "architecture-security", "qa-e2e"],
      playwrightUrls: ASSISTANT_PLAYWRIGHT_URLS,
      tests: ASSISTANT_TARGETED_TESTS,
    });

    const blocking = findings.filter((finding) => finding.severity === "blocking");
    if (blocking.length === 0) return { status: "passed", pass };

    for (const finding of sortByDependency(blocking)) {
      await fixFinding(finding);
      await runRegressionTest(finding.regressionTest);
    }

    await restartDevHelperIfRuntimeChanged();
    await runPlaywrightAssistantAudit();
  }

  // The loop exits only on no blocking drift or on a documented repeated
  // blocker that satisfies the repo blocked-task rules.
}
```

Data flow:

- Claude, sub-agents, Playwright, and tests produce explicit drift findings.
- Findings are deduplicated, severity-ranked, and mapped to owner files/tests.
- Fixes land through normal code paths, not test-only production fallbacks.
- Every fixed drift gets a targeted regression test or documented reason why the
  existing lane covers it.
- Final pass records no blocking drift from Claude, agents, tests, or
  Playwright.

Error handling:

- If a Claude or agent review times out, rerun with a smaller focused prompt
  before classifying it as unavailable.
- If the same blocker remains after three loop passes, mark the task blocked
  with concrete evidence instead of silently downgrading scope.
- If Playwright cannot reach the helper URLs, fix/restart the helper or record
  the environment blocker before closure.

## Security Contract

- Endpoint visibility: assistant routes remain internal admin routes under
  `/admin/api/assistant/*`; do not introduce public assistant write endpoints.
- Auth model: existing admin session.
- RBAC:
  - preserve `settings:read/write`, `content:read/write/publish`,
    `forms:read/write`, `menus:read/write`, media read, and solution-kit
    permission contracts for the touched actions,
  - add route permission tests for any changed route/action family.
- CSRF: required on every POST route.
- Rate-limit bucket: `assistant` for chat, status, provider metadata, planning,
  dry-run, and execute.
- Reject unknown validation: any touched request/action/settings schema must
  reject unknown fields before persistence or execution.
- Anti-abuse:
  - no public assistant write,
  - no assistant nonce/HMAC/reCAPTCHA path,
  - public forms continue to rely on existing Forms nonce/captcha hardening.
- Secret handling:
  - no provider keys, cookies, CSRF tokens, auth headers, session IDs, raw
    prompts containing secrets, upload bytes, signed URLs, raw form submissions,
    or secret-like settings in logs, diagnostics, browser storage, Playwright
    artifacts, Claude prompts, tasks, or changelog.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Targeted assistant/admin UI suites for every touched area, for example:
  - `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-settings.test.tsx`
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
- Route/runtime lanes when backend behavior changes:
  - `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- Live provider lanes when credentials are available:
  - `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
  - `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter`
- Playwright CLI after helper restart:
  - `playwright-cli -s=task404-assistant-drift run-code --filename .tmp/task-404-assistant-drift-audit.js`
- Claude/sub-agent final review pass with no blocking drift.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if runtime capability or gates change.
- `docs/develop/assistant.md` if contributor/runtime behavior changes.
- `_docs/_TASKS/TASK-404*.md` and changelog on closure.

## Acceptance Criteria

- Current Assistant implementation has been audited by Claude and sub-agents.
- Every blocking drift found by Claude, agents, tests, or Playwright is fixed or
  the task is explicitly blocked with repeatable evidence.
- Playwright CLI verifies Assistant Settings, floating assistant mode behavior,
  LLM Guide planning/dry-run/execute access, and relevant public runtime output
  after helper restart.
- Final Claude/agent pass returns no blocking implementation drift.
- Validation results list each drift, fix, test lane, Playwright run, and any
  non-blocking follow-up.
