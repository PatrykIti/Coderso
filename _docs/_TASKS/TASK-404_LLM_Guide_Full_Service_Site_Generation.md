# TASK-404: LLM Guide Full Service Site Generation
# FileName: TASK-404_LLM_Guide_Full_Service_Site_Generation.md

**Priority:** High
**Category:** Assistant + LLM Guide + Site Builder + Runtime
**Estimated Effort:** Very Large
**Dependencies:** TASK-403, TASK-101, TASK-170, TASK-171, TASK-188, TASK-190
**Status:** In Progress (2026-06-04)

---

## Overview

Extend Assistant `LLM Guide` from the current architecture-studio typed scaffold
into a reviewed, executable, launch-shaped service-site generator.

TASK-403 proved that `LLM Guide` can plan, dry-run, execute, and publish a
bounded scaffold for portfolio, services, and contact. That is not enough for a
full service website. TASK-404 must make the assistant create or explicitly gate
all pieces required for a real service-business site:

- published home page,
- services/offer page and service detail routes,
- portfolio/case-study page and detail routes,
- about/team, process, references/testimonials, and contact/quote pages,
- populated public sample content, not empty listing states,
- global navigation and footer IA,
- SEO/canonical/robots/OG policy for all main pages,
- trusted media references or clear `needs_input` gates,
- Playwright and Claude/UX evidence that the result is not scaffold-only.

The implementation must keep the current trust model:

`prompt -> local/provider operation draft -> strict typed plan -> dry-run -> reviewed execute -> validate`

Provider output remains untrusted and operation-draft-only. Executable actions
must be assembled locally from strict schemas and trusted server context.

## Agent Review Inputs

- Product/UX sub-agent: defined launch-ready site requirements, UX readiness
  checklist, and failure conditions for scaffold-only output.
- Architecture/security sub-agent: identified same-plan locators, sample-entry
  publish support, menu/SEO dependency resolution, redaction, RBAC, and
  idempotency risks.
- QA/E2E sub-agent: defined Playwright-after-helper-restart flow, public runtime
  assertions, live-provider lanes, and Claude review acceptance.
- User-requested drift loops: audit the current Assistant implementation and
  audit the TASK-404 task breakdown itself with Claude and agents, then keep
  fixing and re-reviewing until no blocking drift remains.
- Claude max-effort review is required again during implementation and closure
  with sanitized plan/dry-run/execute JSON plus public DOM/screenshot evidence.
  Broad max/xhigh reviews must use long timeouts, normally 15-25 minutes,
  instead of treating an empty early poll as a finished review.

## Security Contract

- Endpoint visibility: internal admin only through existing
  `/admin/api/assistant/actions/*`; do not add public assistant write endpoints.
- Auth model: existing admin session.
- RBAC:
  - plan/dry-run require action-specific read permissions from
    `actionFamilyContracts`,
  - execute requires action-specific write/publish permissions,
  - public sample content requires `content:write` and publish support requires
    `content:publish`,
  - menu updates require `menus:write`,
  - SEO writes require `content:write`,
  - form setup uses existing `forms:read/write` boundaries.
- CSRF: required for every POST route.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: all new or extended action inputs must be
  schema-first and reject unknown fields before dry-run or execute.
- Anti-abuse:
  - no assistant public nonce/HMAC/reCAPTCHA flow because assistant traffic is
    internal admin traffic,
  - public contact forms must keep the existing Forms runtime nonce/captcha
    hardening,
  - raw media upload/import/generation remains gated until it becomes a trusted
    media-library asset id.
- Secret handling:
  - provider keys, session cookies, CSRF tokens, auth headers, raw provider
    prompts, raw form submissions, upload bytes, signed URLs, and secret-like
    settings must not appear in provider packages, browser cache, diagnostics,
    action preview payloads, audit rows, or task/changelog evidence.

## Sub-Tasks

| ID | Title | Status |
|---|---|---|
| TASK-404-01 | Full Service Site Contract and Acceptance Matrix | In Progress (2026-06-04) |
| TASK-404-02 | Same-Plan Resource Locators and Dependency Graph | In Progress (2026-06-04) |
| TASK-404-03 | Full Service Page and Section Composer | In Progress (2026-06-04) |
| TASK-404-04 | Public Sample Content Navigation Footer and Lead Form Actions | In Progress (2026-06-04) |
| TASK-404-05 | SEO Media and Launch Readiness Validation | In Progress (2026-06-04) |
| TASK-404-06 | Full Service E2E Live Review Docs and Closure | In Progress (2026-06-04) |
| TASK-404-07 | Assistant Current Implementation Drift Audit and Repair Loop | In Progress (2026-06-04) |
| TASK-404-08 | TASK-404 Task Drift Audit and Repair Loop | In Progress (2026-06-04) |

## Implementation Order

Catch-up note (2026-06-04): implementation work began before the audit leaves
were fully reflected in the board. TASK-404-07 and TASK-404-08 now run as
active repair loops over commits `7c5ecac0`, `b44b0726`, `e430a7bd`, and the
current branch changes. Do not close TASK-404 until those loops, Playwright CLI,
Claude review, docs, changelog, and board closure all pass.

1. Run TASK-404-08 so the task breakdown itself has no known drift before
   implementation starts.
2. Run TASK-404-07 so current Assistant implementation drift is fixed or
   explicitly blocked before full-service generation builds on it.
3. Freeze the full-service product contract and matrix.
4. Add same-plan locators before composing SEO/menu/sample dependencies.
5. Build deterministic page/section composition through existing widget owners.
6. Promote safe sample-content and navigation actions only after schemas,
   executor adapters, redaction, undo, and route permissions are ready.
7. Add SEO/media/readiness checks and fail-closed gates.
8. Run full E2E, Claude/UX review, docs, changelog, and task closure.

## Files To Change

| Area | Likely files |
|---|---|
| Assistant specs | `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` |
| Planner/composer | `core/services/assistant/actionPlannerService.ts`, `core/services/assistant/blueprints/*` |
| Action contracts | `core/services/assistant/actionPlanTypes.ts`, `core/services/assistant/actionPlanSchema.ts`, `core/services/assistant/actionRegistry.ts`, `core/services/assistant/actionFamilyContracts.ts` |
| Execution | `core/services/assistant/actionExecutorService.ts`, `core/services/assistant/actionUndoManifest.ts`, assistant redaction/audit helpers |
| Route validation | `core/server/validation/assistantActionSchemas.ts`, `core/server/routes/assistantRoutes.ts` if route schemas or mapping change |
| Admin review UI | `core/admin/ui/assistant/*` if readiness checklist or dry-run preview changes |
| Tests | `tests/vitest/assistant/*`, `tests/vitest/ui/assistant-*`, `tests/unit/assistant/*`, `tests/integration/routes/assistant.test.ts`, new public runtime E2E/server suite |
| Docs/closure | `docs/develop/assistant.md`, task files, changelog entry on closure |
| Drift audit loops | `_docs/_TASKS/TASK-404-07_Assistant_Current_Implementation_Drift_Audit_and_Repair_Loop.md`, `_docs/_TASKS/TASK-404-08_TASK_404_Task_Drift_Audit_and_Repair_Loop.md` |

## Implementation Pseudocode

```ts
const draft = await planAssistantActionsWithProviderDraft({
  prompt,
  context: trustedAssistantContext,
  llmAvailable,
  provider,
});

const capability = resolveFullServiceSiteCapability(draft, trustedAssistantContext);
if (!capability || capability.requiredGates.length > 0) {
  return buildNeedsInputPlan(capability.requiredGates);
}

const graph = buildFullServiceSiteGraph({
  siteMap: capability.siteMap,
  catalogs: ["portfolio-projects", "services-directory"],
  contentSeeds: capability.sampleContent,
  navigation: capability.navigation,
  seo: capability.seo,
  media: capability.media,
});

const actions = assembleStrictActions(graph, {
  locators: createSamePlanLocators(graph),
  schemas: assistantActionSchemas,
  trustedCatalog: serverCatalog,
});

return normalizeAssistantActionPlan({
  responseKind: "action_plan",
  status: "ready",
  title: "Full Service Site",
  actions,
  metadata: {
    launchReadiness: buildLaunchReadinessChecklist(graph, actions),
  },
});
```

Data flow:

- Prompt signals select the explicit full-service-site capability, not only the
  existing portfolio + services + contact scaffold.
- Provider draft can influence business narrative and section intent, but never
  supplies executable actions, ids, locators, media URLs, or raw payloads.
- The backend builds a deterministic dependency graph and typed actions from
  trusted local contracts.
- Dry-run resolves same-plan dependencies, permissions, conflicts, media gates,
  and launch readiness before execute.
- Execute applies idempotent actions and validates public output.

Error handling:

- Missing media, missing menu owner, unresolved same-plan locator, unsupported
  publish operation, SEO target ambiguity, or unsafe provider payload returns
  `needs_input`/`gated` with no partial launch-ready claim.
- Unknown action input fields fail schema normalization as
  `assistant_action_plan_invalid`.
- Executor/domain failures remain machine-readable and are mapped at route
  boundaries through existing assistant route error mapping.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Targeted Vitest planner/schema/composer suites for each leaf.
- Targeted Bun route/executor/DB/public runtime suites for any action or route
  contract touched by each leaf.
- Playwright CLI full-service E2E after restarting `coderso-dev-core-host`.
- Claude and sub-agent drift audit loops for both the current implementation and
  the TASK-404 task breakdown.
- Live OpenRouter/OpenAI assistant lanes when provider env is available.
- `bun run gates:coderso` before final closure.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `docs/develop/assistant.md`
- Task board and changelog only when implementation leaves close.

## Acceptance Criteria

- Full-service prompts no longer return only `/portfolio`, `/uslugi`, and
  `/kontakt` as a ready launch result.
- Ready plan includes home, services, portfolio, about/team, process,
  references/testimonials, contact, navigation/footer, SEO, and populated
  public content or explicit blocking gates.
- Footer IA and the public lead-capture form have explicit owners in the action
  plan; footer/contact readiness cannot be satisfied by main navigation items or
  a bare `formSlug` alone.
- Public runtime verification proves non-empty services and portfolio listings
  plus at least one working detail page for each.
- Portfolio/services detail routes are owned before final E2E through explicit
  listing query, listing template, content-route, and detail-page actions; a
  `page.upsert` collection link alone is not enough to satisfy launch readiness.
- Playwright verifies desktop/mobile public pages, nav links, contact form
  runtime, SEO head basics, and no console/page errors.
- Claude/UX review of sanitized evidence returns a launch-ready verdict, not
  `stable typed scaffold`.
- Current Assistant implementation drift loop has no unresolved blocking drift
  from Claude, agents, tests, or Playwright.
- TASK-404 task-plan drift loop has no unresolved blocking drift in scope,
  sequencing, pseudocode, security contracts, tests, Playwright requirements, or
  board statistics.
- Docs, tests, task board, and changelog are synchronized on closure.
