# TASK-404-06: Full Service E2E Live Review Docs and Closure
# FileName: TASK-404-06_Full_Service_E2E_Live_Review_Docs_and_Closure.md

**Priority:** High
**Category:** Assistant + QA + Docs + Process
**Estimated Effort:** Large
**Dependencies:** TASK-404-01, TASK-404-02, TASK-404-03, TASK-404-04, TASK-404-05
**Status:** Done (2026-06-04)

---

## Overview

Close TASK-404 only after automated tests, live provider validation,
Playwright browser evidence, and Claude/UX review prove that `LLM Guide` creates
a full service site instead of a scaffold.

This leaf owns final docs, task board movement, changelog, and closure gates.

## Sub-Tasks

- Add the full-service Playwright CLI E2E script.
- Restart `coderso-dev-core-host` before browser validation.
- Verify expected local URLs:
  - admin UI: `http://coderso-b.localhost:5175/admin/`
  - public front: `http://coderso-b.localhost:3001/`
- Run plan -> dry-run -> execute -> public runtime verification.
- Run Claude max-effort read-only UX/product review with sanitized evidence.
- Run all targeted lanes and `bun run gates:coderso`.
- Update docs, task board, changelog, and final task statuses.

## Files To Change

| File | Required change |
|---|---|
| `.tmp/task-404-full-service-e2e.js` | Temporary Playwright CLI script during validation only; do not commit if repo ignores `.tmp`. |
| `tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts` | New DB/public runtime proof suite. |
| `tests/integration/assistant-live/*` | Extend live matrix if provider prompt coverage changes. |
| `_docs/ASSISTANT_SITE_BUILDER.md` | Final supported/gated capability docs. |
| `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` | Final action and lane status. |
| `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` | Final live prompt evidence. |
| `docs/develop/assistant.md` | Contributor-facing final contract. |
| `_docs/_TASKS/TASK-404*.md` | Status and validation results. |
| `_docs/_TASKS/README.md` | Move rows and synchronize statistics. |
| `_docs/_CHANGELOG/NNNN-*.md` | Add closure changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add changelog index row and next number. |

## Implementation Pseudocode

```ts
await restartDevHelper("coderso-dev-core-host");

const admin = "http://coderso-b.localhost:5175/admin/";
const front = "http://coderso-b.localhost:3001/";

await loginToAdmin(admin);
await assertLlmGuideAvailable({ allowEmptyDocsIndex: true });

const plan = await promptAssistant([
  "Create a premium full-service architecture studio site.",
  "Include home, services, portfolio, process, references, about/team, contact form, nav, SEO.",
]);

assertReadyFullServicePlan(plan);

const dryRun = await dryRunPlan(plan);
assertNoBlockingFailures(dryRun);

const execute = await executePlan(plan);
assert.equal(execute.summary.failed, 0);

for (const path of ["/", "/uslugi", "/portfolio", "/o-nas", "/proces", "/referencje", "/kontakt"]) {
  const page = await browser.goto(`${front}${path.replace(/^\//, "")}`);
  await assertNoConsoleErrors(page);
  await assertNoEmptyScaffoldState(page);
  await assertSeoBasics(page);
}

await assertAtLeastOneDetailPage(front, "/uslugi");
await assertAtLeastOneDetailPage(front, "/portfolio");
await runMobileAndDesktopLayoutChecks(front);
```

Data flow:

- Local/admin settings provide OpenRouter/OpenAI provider availability.
- Playwright uses the admin UI to trigger `LLM Guide`; it does not call backend
  internals directly except where existing test helpers already do so.
- Public runtime checks inspect DOM/head/navigation and detail routes.
- Claude review receives sanitized result summaries and screenshots/DOM text
  without secrets.

Error handling:

- Helper restart or port mismatch blocks E2E until fixed.
- Any missing required public page, empty catalog, unresolved nav link, missing
  detail page, console/page error, missing SEO basics, or Claude scaffold verdict
  blocks closure.
- Live provider lanes may be skipped only when env credentials are unavailable,
  and the skip must be stated in validation results.

## Security Contract

- Endpoint visibility: existing internal assistant action routes only.
- Auth model: admin session through Playwright.
- RBAC: use an admin fixture/user with the exact permissions needed for
  assistant planning/execution, content publish, forms, menus, media read, and
  SEO writes.
- CSRF: use normal admin UI/client flow so CSRF remains exercised.
- Rate-limit bucket: `assistant` for plan/dry-run/execute.
- Reject unknown validation: route and schema tests from earlier leaves must be
  included in closure.
- Anti-abuse:
  - no public assistant write endpoint,
  - public contact form checks must respect existing nonce/captcha behavior and
    avoid real external spam,
  - no raw media upload/import shortcuts.
- Secret handling:
  - Playwright logs, Claude prompts, task docs, and changelog must not include
    provider keys, cookies, CSRF tokens, auth headers, session IDs, raw prompts
    with secrets, form submissions, upload bytes, or signed URLs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Planner/schema/composer:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/blueprint-composition-fixtures.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- Admin review UI if changed:
  - `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
- Route/executor/runtime:
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`
- Live provider lanes when available:
  - `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
  - `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter`
  - OpenAI equivalents when configured.
- Playwright:
  - `playwright-cli -s=task404-full-service-e2e run-code --filename .tmp/task-404-full-service-e2e.js`
- Claude:
  - `claude -p --effort max ...` read-only review of sanitized evidence.
- Release gates:
  - `bun run gates:coderso`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `docs/develop/assistant.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/NNNN-*.md` entry on closure.

## Closure Evidence (2026-06-04)

- Restarted `coderso-dev-core-host` with admin Vite on
  `http://coderso-b.localhost:5175/admin/` and public/core on
  `http://coderso-b.localhost:3001/`.
- Playwright CLI full-service E2E passed with Assistant Settings/OpenRouter
  configured: `intentId === "service-business-full-site"`, 49 planned actions,
  `dryRun.readyToExecute === true`, zero blocking dry-run conflicts, and
  `execute.summary.failed === 0`.
- Admin review displayed the launch-readiness checklist before execution.
- Public assertions passed for `/`, `/uslugi`, `/portfolio`, `/o-nas`,
  `/proces`, `/referencje`, `/kontakt`, `/uslugi/projekt-koncepcyjny`, and
  `/portfolio/apartament-nad-parkiem`.
- Home navigation contained `/`, `/uslugi`, `/portfolio`, `/o-nas`, `/proces`,
  `/referencje`, and `/kontakt`; no unsafe `#` or `javascript:` links were
  found, and no dead `/polityka-prywatnosci` or `/regulamin` footer links were
  present.
- Mobile viewport `390x844` passed without horizontal scroll; page errors and
  severe console errors were zero. Screenshot evidence:
  `.tmp/task-404-full-service-e2e.png`.
- Committed runtime regression coverage includes
  `tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`.

## Acceptance Criteria

- Playwright E2E passes after helper restart on the expected admin/public ports.
- Plan/dry-run/execute succeeds with zero failed execute steps.
- Public pages render: `/`, `/uslugi`, `/portfolio`, `/o-nas`, `/proces`,
  `/referencje`, `/kontakt`.
- Services and portfolio listings are populated and link to working detail pages.
- Navigation and footer links resolve without unsafe `#` fallbacks.
- Contact form runtime renders through existing public Forms hardening.
- Desktop and mobile checks find no obvious overlap, horizontal scroll, or
  unusable form/nav state.
- SEO basics are present for main pages.
- Claude/UX review returns a launch-ready verdict and does not classify the
  result as scaffold-only.
- Task board, changelog, docs, and validation results are synchronized.
