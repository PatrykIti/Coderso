# TASK-407-06-L06: Legacy AI Site Wizard Reviewed Intake Convergence
# FileName: TASK-407-06-L06-Legacy-AI-Site-Wizard-Reviewed-Intake-Convergence.md

**Parent Subtask:** TASK-407-06
**Priority:** High
**Category:** Assistant + Admin UI + Site Wizard
**Estimated Effort:** Large
**Dependencies:** TASK-407-06-L04, TASK-407-06-L05
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06

---

## Overview

Retire the older `AiSiteWizard` manual siteKit mutation flow and close the
backend/admin-client shortcut that still trusts a client-supplied
`context.siteKit`. Users must reach full-site generation through the reviewed
floating `LLM Guide` site-builder intake, where the server-normalized session,
review hash, final review gates, dry-run, and execute path are authoritative.

TASK-407-06-L04 completed the floating `LLM Guide` reviewed intake surface,
review hash binding, final summary, backend review-gate enforcement, and strict
`siteKit` action-plan handoff. The parent task still names the legacy
`AiSiteWizard` as a primary surface, so this leaf owns that remaining convergence
work instead of folding it silently into L04.

## Sub-Tasks

- Retire or remove the `AiSiteWizard` executable plan/apply/rerun/clone surface
  from `core/admin/ui/kits/SolutionKitsPage.tsx`; the Solution Kits page may
  remain as a read-only catalog/detail surface with a CTA to the floating
  reviewed `LLM Guide` intake.
- Remove the admin-client helper path that builds direct `context.siteKit`
  payloads (`planAssistantSiteKitActions` / `executeAssistantSiteKitActions`)
  or make it impossible to call without a reviewed active intake session.
- Close the backend planner bypass by rejecting client-supplied
  `context.siteKit` at the `/assistant/actions/plan` request schema. Keep a
  planner-level gated fallback only as defense in depth for direct service
  calls that bypass route validation; it must never produce `site-kit.install`.
  The executable handoff must come from
  `context.siteBuilderIntakeState.activeSession` after backend review-summary
  validation.
- Update request schemas/context sanitization so stale direct `siteKit` client
  payloads are rejected consistently instead of silently planning.
- Migrate tests that currently prove compiled `context.siteKit` reaches the
  planner so they use the reviewed `siteBuilderIntakeState.activeSession` entry
  instead, and add the opposite regression for bare `context.siteKit`.
- Retiring `AiSiteWizard` removes its coupled run-history, rerun, clone, and
  rollback UI from this reviewed-intake convergence leaf. Dedicated Solution Kit
  run management may be added as a separate follow-up if product needs it, but
  L06 must not keep rollback/rerun controls inside an unreviewed full-site
  builder wizard.
- Keep stale review hash, prompt-poisoning warnings, media/reference gates,
  unsupported widget/content-engine gates, and secret redaction behavior aligned
  with L04/L05 by reusing the reviewed intake modules.

## Security Contract

- Endpoint visibility: internal admin assistant/siteKit routes only.
- Auth model: existing admin session.
- RBAC: backend action contracts remain authoritative for write/publish
  permissions; UI state is advisory.
- CSRF: required for plan, dry-run, and execute POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: action-plan route validation must reject direct
  client-authored `context.siteKit`; direct service calls with that shape must
  fail closed as a non-executable gated response. Reviewed site-builder
  execution must flow through
  `context.siteBuilderIntakeState.activeSession` and backend normalization.
- Anti-abuse: no direct apply/dry-run from an unreviewed, stale, or
  blocking-gated wizard state; no arbitrary URL media import, code execution, or
  provider-supplied actions.
- Secret handling: no provider keys, cookies, CSRF tokens, signed URLs, raw
  reference text, upload bytes, or raw auth state in local/browser state,
  diagnostics, screenshots, or provider prompts.

## Implementation Pseudocode

```ts
function planAssistantActions(input: AssistantActionPlanInput) {
  const trustedContext = sanitizeAssistantPlanningContext(input.context);
  const activeSession = trustedContext?.siteBuilderIntakeState?.activeSession;
  if (activeSession) {
    const normalized = normalizeAssistantSiteBuilderIntakeSession(activeSession);
    if (normalized.facts?.readyForExecution === true) {
      const request = buildActionPlanRequestFromReviewedIntake(normalized);
      return buildSiteKitActionPlan(request.context.siteKit);
    }
    return buildSiteBuilderNeedsInputPlan(normalized);
  }

  if (input.context?.siteKit) {
    return buildReviewedIntakeRequiredPlan({
      code: "reviewed_site_builder_intake_required",
      message: "Use the reviewed LLM Guide site-builder intake before planning a full site.",
    });
  }

  return planOtherAssistantActions(input);
}

function SolutionKitsPage() {
  return (
    <>
      <SolutionKitCatalog />
      <ReviewedSiteBuilderCta onOpenAssistant={openFloatingAssistant} />
    </>
  );
}
```

## Data Flow and Error Handling

- The legacy `AiSiteWizard` local draft (`businessType`, `locale`, `siteName`,
  `goals`, selected kit, enabled steps, rerun options) is not a reviewed intake
  session and must not produce plan, dry-run, execute, rerun, or clone-to-apply
  actions.
- Full-site execution hydrates only from server-normalized reviewed intake
  facts. Any answer or kit-selection change inside reviewed intake invalidates
  the confirmation hash through existing L04/L05 logic and returns the user to
  review.
- Blocking gates render as user-facing review items in the floating intake and
  prevent strict planning, dry-run, and apply.
- The retired Solution Kits surface may keep safe catalog/manifest details, but
  CTA copy must send users to the reviewed floating assistant intake. Do not
  preserve unsafe legacy draft data or replay old wizard run options.
- Solution Kit run history/rollback is not retained in the retired wizard. If a
  standalone run-management UI is needed, split it into a follow-up task so it
  has its own permissions, warnings, and tests instead of inheriting the
  unreviewed wizard surface.

## Testing Requirements

- Vitest UI tests proving the Solution Kits page no longer renders legacy
  plan/apply/dry-run/rerun controls and instead exposes a reviewed `LLM Guide`
  CTA/read-only kit details.
- Vitest interaction tests for the CTA if an assistant-open event/helper is
  added.
- Admin client tests proving no helper builds a divergent executable
  `context.siteKit` payload.
- Planner/schema tests proving direct client `context.siteKit` payloads are
  rejected or gated and cannot produce `site-kit.install` without a reviewed
  active intake session.
- Route-family tests for `/assistant/actions/plan` proving route validation
  rejects client `context.siteKit`, while reviewed active intake sessions still
  plan through the existing typed action route and execute keeps
  `solution-kits:write` coverage.
- Migrate `assistantSiteBuilderIntakePlanner` tests that currently call
  `planAssistantActions(buildActionPlanRequestFromReviewedIntake(session))` so
  the executable proof uses `context.siteBuilderIntakeState.activeSession`; add
  a separate assertion that bare `context.siteKit` is non-executable.
- Existing reviewed-intake tests proving stale hash, media-library, reference,
  unsupported widget/content-engine gates, and ready-for-execution checks still
  block the strict handoff.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit`
- Relevant Bun runtime tests if any execute path is changed.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md` if the documented primary UI changes.
- `_docs/_CHANGELOG/` entry and `_docs/_CHANGELOG/README.md` index update.

## Acceptance Criteria

- There is one authoritative reviewed full-site builder handoff.
- Direct client-authored `context.siteKit` requests cannot plan or execute a
  full-site builder path.
- Legacy wizard controls cannot dry-run/apply/rerun/clone into mutation without
  the same reviewed session contract as the floating assistant intake; the
  preferred implementation is to retire those controls entirely.
- Any retired or redirected legacy path is documented and tested, including the
  backend planner/schema regression.

## Completion Notes

- Removed the legacy `AiSiteWizard` UI files and the Solution Kits page no
  longer renders plan/apply/dry-run/rerun/rollback/clone controls.
- Added the typed assistant panel open event and changed Solution Kits to a
  read-only catalog with an `Open LLM Guide` CTA that starts the reviewed
  site-builder intake.
- Removed admin-client helpers that authored direct executable
  `context.siteKit` payloads.
- Rejected direct `context.siteKit` at `/assistant/actions/plan` schema
  validation, enforced `solution-kits:read` plus LLM Guide availability for
  reviewed active-session planning, stripped stale browser `siteKit` context in
  admin context sanitization, and kept planner-level defensive gating for direct
  service calls.
- Preserved reviewed active-session handoff through
  `context.siteBuilderIntakeState.activeSession`.
- Updated release-gate UX coverage so `gates:coderso` no longer points at the
  retired `ai-site-wizard` test file.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
  (8 files, 210 tests)
- `set -a && [ -f .env ] && source .env && set +a; NODE_ENV=test bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
  (3 files, 101 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run gates:coderso`
- `bun run precommit`

## Review Evidence

- Claude and subagent pre-implementation audits first found contract drift around
  direct `context.siteKit`, stale legacy wizard assumptions, and missing route
  validation coverage.
- The task contract was corrected before implementation and passed fresh
  read-only Claude/subagent audits before code changes began.
- The first post-commit subagent drift pass found stale release-gate, RBAC,
  public/user docs, and umbrella task-table drift. Those findings were fixed and
  revalidated before the final committed-head audit was rerun.
- A later post-commit pass found only low-severity stale retired-wizard wording
  in active runtime/docs surfaces; the wording was moved to reviewed LLM Guide
  site-builder language before the final committed-head audit was rerun.
