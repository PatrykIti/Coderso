# TASK-407-07-L04: Follow Up Refinement and Fail Closed E2E
# FileName: TASK-407-07-L04-Follow-Up-Refinement-and-Fail-Closed-E2E.md

**Parent Subtask:** TASK-407-07
**Priority:** High
**Category:** Assistant + Follow-Up E2E + Security
**Estimated Effort:** Large
**Dependencies:** TASK-407-07-L03
**Status:** ✅ Done
**Started:** 2026-06-06
**Completed:** 2026-06-06
**Changelog:** `_docs/_CHANGELOG/1130-2026-06-06-task-407-follow-up-live-e2e.md`

---

## Overview

Validate follow-up refinement and fail-closed behavior after a generated site
exists. The assistant must behave like a beginner-friendly CMS helper: explain
the proposed approach, ask for a trusted target when the prompt is ambiguous,
prepare a reviewable scoped plan, dry-run before mutation, and only then update
the CMS after explicit user execution.

The implementation target is the guided site-builder follow-up resolver in
`assistantSiteBuilderFollowUpResolver.ts`, not an accidental bypass through the
generic CMS mutation path. L04 must wire or otherwise prove that resolver in the
production planning path before claiming live E2E follow-up coverage.

## Sub-Tasks

- Start from a trusted generated site state. The E2E may reuse a L02/L03
  generated site if present, but the harness must self-create or fail with a
  clear prerequisite error instead of assuming a blank DB.
- Prompt as a nontechnical user for a refinement such as:
  `chce dodac albo poprawic sekcje z projektami domow / galeria wnetrz na stronie`
  and verify the assistant asks for a target when the target is ambiguous.
- Select or provide a trusted target from active admin context or server-derived
  resource catalog candidates. Free text may be a hint only; it cannot invent a
  mutation target.
- Complete one scoped refinement against a generated static page, content
  engine, listing, detail page, or custom screen. The plan must be reviewable,
  dry-run ready, and execute without unrelated mutations.
- If the scoped action only updates draft content, publish or otherwise route
  through an action path that makes the public runtime assertion meaningful.
  L04 must not claim public runtime updates from draft-only changes.
- Exercise the new fail-closed delta for follow-up behavior:
  stale/unknown trusted target ids, ambiguous target prompts, unsupported
  resource families or operations, prompt-poisoned target text, and unsafe
  media/reference instructions. Reuse existing Basic/Advanced reference tests
  only as supporting evidence, not as the whole L04 proof.

## Security Contract

- Endpoint visibility: no public assistant write endpoint.
- Auth model: existing admin session.
- RBAC: target read permissions and action-specific write permissions.
- CSRF: all admin POSTs use normal UI/API CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: E2E or targeted tests must include unknown field/id
  rejection for refinement/reference payloads.
- Anti-abuse: free text cannot choose mutation targets; targets must resolve
  from active context or trusted server catalogs.
- Secret handling: no auth state, cookies, CSRF tokens, provider keys, raw
  provider output, raw screenshots with secrets, or raw uploaded bytes in
  committed evidence.

## Files To Change

| Area | Files |
|---|---|
| Follow-up planner wiring | `core/services/assistant/actionPlannerService.ts`, `core/services/assistant/assistantSiteBuilderFollowUpResolver.ts`, `core/services/assistant/cmsOperationActionMapper.ts` if needed |
| Tests | `tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts`, `tests/vitest/assistant/actionPlannerService.test.ts`, relevant action-schema/mapper suites, and Bun executor tests if action execution changes |
| E2E harness | `.tmp/task-407-07-l04-follow-up-e2e.js` local script only unless sanitized reusable harness is added |
| Docs/coverage | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`, `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if policy coverage changes |
| Closure evidence | TASK-407 closure notes/changelog once complete |

## Implementation Pseudocode

```ts
async function runFollowUpAndFailClosedE2E(page) {
  await ensureGeneratedSiteExistsOrCreateOne(page);
  await openAssistantOnAdminPageOrPagesSurface(page);

  await prompt(
    "nie ogarniam cms, chce dodac sekcje/projekty domow albo galerie wnetrz na stronie"
  );
  await assertNeedsInputTargetQuestion({
    code: "target_required" | "target_ambiguous",
    actions: [],
    candidatesFromTrustedContextOnly: true,
  });

  await chooseTrustedTargetFromAssistantQuestion("portfolio albo strona z realizacjami");
  const plan = await assertReviewableScopedRefinementPlan({
    allowedActionTypes: [
      "page.upsert",
      "page.widget.patch",
      "listing-query.upsert",
      "listing-template.upsert",
      "detail-page.upsert",
      "custom-screen.upsert",
    ],
    forbiddenActionTypes: ["site-kit.install", "media.upload", "plugin.install"],
  });
  await dryRunAndAssertReady(plan);
  await executeReviewedActions(plan);
  await publishIfDraftOnly(plan);
  await assertPublicRuntimeUpdatedWithoutUnrelatedMutation(page);

  await submitStaleTargetDraftViaApi();
  await assertNeedsInputWithoutActions("target_required");
  await submitAmbiguousTargetPrompt();
  await assertNeedsInputWithoutActions("target_ambiguous");
  await submitUnsupportedFamilyOrOperationPrompt();
  await assertGatedWithoutActions(["target_family_unsupported", "operation_unsupported"]);
  await submitPromptPoisonedTargetText();
  await assertNoSecretEchoAndNoActions();
  await submitUnsafeMediaReferencePrompt();
  await assertGatedOrNeedsInputWithoutUploadActions();
}

function planSiteBuilderFollowUp(prompt, context) {
  const draft = normalizeOrBuildCmsOperationDraft(prompt, context);
  const resolution = resolveSiteBuilderFollowUpTarget({ prompt, context, draft });
  if (resolution.status === "needs_input") return buildNeedsInputPlan(resolution);
  if (resolution.status === "gated") return buildGatedPlan(resolution);
  return mapResolvedFollowUpToReviewedCmsActionPlan({ draft, resolution, context });
}
```

## Data Flow and Error Handling

- Existing generated resources provide trusted target candidates through active
  admin context and the server-derived resource catalog. Prompt text is never a
  trusted target source.
- The production planner must call `resolveSiteBuilderFollowUpTarget` or an
  equivalent service-owned wrapper before assembling mutation actions for
  guided site-builder follow-ups.
- `needs_input` and `gated` follow-up resolutions return no executable actions
  and must not fall through to generic CMS mutation assembly.
- Resolved follow-ups may delegate to the existing CMS operation/action mapper
  only after target scoping succeeds. The resulting plan must remain typed,
  dry-runnable, auditable, idempotent, and action-schema-normalized.
- Public runtime checks are valid only for executed/published changes. Draft-only
  updates require an explicit publish step or a different assertion target.
- Tampered payloads, prompt poisoning, unsafe media/reference cases, unsupported
  resource families, unsupported operations, stale ids, or ambiguous targets
  must fail before mutation.

## Testing Requirements

- `playwright-cli -s=task407-l04-follow-up-e2e run-code --filename .tmp/task-407-07-l04-follow-up-e2e.js`
  against:
  - admin: `http://coderso-b.localhost:5175/admin/`
  - front: `http://coderso-b.localhost:3001/`
  - site Vite assets: `http://coderso-b.localhost:5176/site/`
- Restart `coderso-dev-core-host` before the live run.
- Desktop/mobile public runtime checks, console/page-error checks, broken image
  checks, and sanitized screenshot evidence when useful.
- Vitest coverage for planner wiring:
  - ambiguous prompt returns `needs_input` and no actions,
  - exact active/resource-catalog target returns a scoped reviewable plan,
  - stale/spoofed target ids do not mutate,
  - unsupported family/operation gates before action assembly,
  - poisoned target text is redacted and not echoed.
- Bun executor tests only if L04 changes execution or publish semantics.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Bun/Vitest suites for touched contracts.
- `bun run gates:coderso`
- `bun run precommit` before commit.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` if follow-up behavior changes.
- `docs/develop/assistant.md` if planner wiring or helper behavior changes.
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if assistant policy/permission
  coverage changes.

## Acceptance Criteria

- Follow-up refinements are scoped and reviewable.
- Unknown/poisoned/reference cases fail closed.
- Successful refinement updates public runtime only after the relevant change is
  executable/published and without unrelated mutation.
- The assistant experience remains beginner-friendly: it explains the intended
  change, asks for missing target decisions, and does not expose implementation
  jargon as the only path forward.

## Completion Notes

- Wired production and provider-draft planning through the guided follow-up
  resolver before generic CMS action mapping for scoped site-builder follow-up
  mutations.
- Kept free-text target names as hints only: stale, ambiguous, poisoned, and
  unsupported follow-up prompts return `needs_input` or `gated` plans with no
  executable actions.
- Normalized page slugs across planner/executor update guards so trusted
  catalog slugs such as `contact` match persisted `/contact` state.
- Extended the same slug normalization to reviewed `page.delete` preview and
  execute dependency guards so delete follow-ups do not fail on `contact` versus
  `/contact` slug shape drift.
- Refreshed published page state when a reviewed `page.update` changes a
  published page, making public runtime assertions meaningful.
- Limited implicit published-page refreshes to the prior published data plus the
  reviewed assistant patch, so unrelated pending draft edits are not published
  with a scoped update.
- Added prompt-secret redaction for generic, docs-guidance, policy-gated, and
  unresolved mapper inspection plans, and reused the canonical assistant
  redaction helper for follow-up resolver candidate fields, so unsafe
  media/reference prompts do not echo `api_key`, signatures, or token-like
  values.
- Corrected provider-path metadata for local planning-state fail-closed routing:
  when the provider is not called, `providerDraftUsed` stays `false`.
- External drift passes with subagent and Claude caught the remaining redaction,
  provider metadata, `page.delete` slug-guard, and published-refresh
  inconsistencies; those findings were fixed and covered by targeted regression
  tests before closure.

## Validation Evidence

- `git diff --check`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/assistantSiteBuilderFollowUpResolver.test.ts`
  - Passed: 2 files, 131 tests.
- `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - Passed: 76 tests.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `bun run gates:coderso`
- Restarted `coderso-dev-core-host`, logged into
  `http://coderso-b.localhost:5175/admin/`, and ran
  `playwright-cli -s=task407-l04-follow-up-e2e run-code --filename .tmp/task-407-07-l04-follow-up-e2e.js`.
- Live E2E result: beginner projects/gallery prompt returned the guided target
  question with one trusted candidate and no actions; scoped `page.update`
  dry-ran, executed, checked `/contact` on desktop/mobile, and restored
  cleanly; stale, ambiguous, unsupported-family, unsupported-operation,
  poisoned-target, unsafe-media/reference, and unknown-field cases failed
  closed with `0` browser/page errors.
