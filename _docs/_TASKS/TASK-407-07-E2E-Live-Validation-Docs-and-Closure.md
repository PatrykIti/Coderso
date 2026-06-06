# TASK-407-07: E2E Live Validation Docs and Closure
# FileName: TASK-407-07-E2E-Live-Validation-Docs-and-Closure.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Playwright + Claude Audit + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-407-01, TASK-407-02, TASK-407-03, TASK-407-04, TASK-407-05, TASK-407-06
**Status:** 🚧 In Progress

---

## Overview

Validate TASK-407 end to end after implementation. The closure proof must use
real admin UI flows through `playwright-cli`, restarted helper servers, public
runtime checks, live provider configuration when available, and final
Claude/agent drift reviews.

## Sub-Tasks

- Restart `coderso-dev-core-host` and expose the required local host ports.
- Run Basic site-builder intake creation from a nontechnical prompt.
- Run Advanced site-builder intake creation with design/menu/hero/section
  choices.
- Clean up only the resources created by the first E2E run, then create a
  second full site from scratch in a different industry/theme to prove the flow
  is generic and not fitted to one prompt.
- Run at least one follow-up refinement prompt against a generated subpage or
  content engine.
- Run unsupported-media/reference fail-closed validation.
- Verify public pages, navigation/footer, content engines, custom screens where
  created, contact forms, SEO basics, desktop/mobile, and console/page errors.
- Update docs, board, changelog, and closure evidence.
- Run final Claude/agent implementation and UX audit; fix any blocking drift.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-07-L01 | Targeted Validation Lanes and Release Gates | Done | Lint/typecheck/precommit/gates plus targeted Bun/Vitest suites for changed contracts. |
| TASK-407-07-L02 | Basic Live Playwright E2E | To Do | Live Basic guided creation through admin UI and public runtime checks. |
| TASK-407-07-L03 | Advanced Live Playwright E2E | To Do | Live Advanced creation with design/menu/hero/section/reference gates. |
| TASK-407-07-L04 | Follow Up Refinement and Fail Closed E2E | To Do | Scoped refinement plus rejected unknown/poisoned/media-reference cases. |
| TASK-407-07-L05 | Scoped Cleanup and Second Theme Rebuild E2E | To Do | Resource-id scoped cleanup and second different-industry/theme rebuild. |
| TASK-407-07-L06 | Final Docs Changelog Board and Drift Audit | To Do | Docs, coverage matrices, changelog leaf coverage, board sync, and final Claude/agent pass. |

## Security Contract

- Endpoint visibility: no public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: Playwright user must exercise normal admin permissions; no bypass in
  app code.
- CSRF: all POSTs go through normal admin UI/API paths.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: E2E must include at least one rejected unknown or
  poisoned intake answer where feasible.
- Anti-abuse: public form tests use existing nonce/captcha/session hardening.
- Secret handling: do not commit `.tmp` auth state, screenshots with secrets,
  provider keys, cookies, CSRF tokens, raw uploaded bytes, or secret-like prompt
  content.

## Files To Change

| Area | Files |
|---|---|
| E2E harness | `.tmp/*` local scripts; committed harness only if reusable and sanitized |
| Docs | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, live coverage matrices |
| Closure | `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, changelog entry |

## Implementation Pseudocode

```ts
async function runSiteBuilderIntakeE2E(
  mode: "basic" | "advanced",
  options: { userPrompt?: string; expectedDifferentVertical?: boolean } = {},
) {
  await openAssistant();
  await startSiteBuilderIntake({ mode, userPrompt: options.userPrompt });
  await answerStructuredSteps(mode);
  await assertReviewSummary();
  const plan = await submitSiteKitPlan();
  await assertDryRunReady(plan);
  const execution = await executeReviewedPlan(plan);
  await assertPublicRuntime(execution);
}

async function runFollowUpRefinementE2E() {
  await prompt("chce zmienic podstrone projekty");
  await assertNeedsScopedTargetOrIntakeFlow();
  await completeRefinementFlow();
  await assertPublicRuntimeUpdated();
}

async function resetGeneratedSiteAndRunSecondThemeE2E() {
  const firstRunResources = await listResourcesCreatedByE2ERun();
  await deleteOnlyScopedE2EResources(firstRunResources);
  await assertNoFirstRunPagesRemain();
  await runSiteBuilderIntakeE2E("basic", {
    userPrompt:
      "nie znam sie na cms, chce ladna strone dla zupelnie innej branzy",
    expectedDifferentVertical: true,
  });
}
```

## Data Flow and Error Handling

- Restart helper servers, open the admin assistant through `playwright-cli`,
  complete intake, review, siteKit plan, dry-run, execute, then verify public
  runtime.
- The E2E harness records only resource ids/slugs created by the current run and
  uses those identifiers for scoped cleanup before the second-theme rebuild.
- Wrong ports, missing provider configuration, auth/RBAC/CSRF failures,
  unscoped cleanup, console/page errors, mobile layout failures, or public
  runtime regressions fail the closure.
- Screenshots, traces, logs, and Claude/agent evidence must be sanitized before
  any task/changelog note is committed.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- `bun run gates:coderso`
- Targeted Vitest/Bun suites for all changed contracts.
- Playwright CLI on:
  - admin: `http://coderso-b.localhost:5175/admin/`
  - front: `http://coderso-b.localhost:3001/`
  - site Vite assets: `http://coderso-b.localhost:5176/site/`
- E2E reset validation must use scoped cleanup of generated pages/content/media
  fixtures only. It must not truncate shared tables or delete unrelated user
  resources.
- Claude/agent final review with sanitized evidence and no blocking drift.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New TASK-407 changelog entry.

## Acceptance Criteria

- Basic, Advanced, and follow-up intake flows pass live Playwright CLI E2E.
- A second full-site E2E run after scoped cleanup succeeds for a different
  industry/theme, using a nontechnical prompt and fresh generated structure.
- Public runtime output is usable on desktop and mobile.
- Unsupported media/reference cases fail closed.
- Final Claude/agent audit has no blocking findings.
- TASK-407 parent/leaves, board, docs, and changelog are synchronized.
