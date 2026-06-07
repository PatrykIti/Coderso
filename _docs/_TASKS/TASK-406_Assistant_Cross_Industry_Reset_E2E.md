# TASK-406: Assistant Cross-Industry Reset E2E
# FileName: TASK-406_Assistant_Cross_Industry_Reset_E2E.md

**Priority:** High
**Category:** Assistant + Site Builder + Media Profiles + Playwright QA
**Estimated Effort:** Large
**Dependencies:** TASK-405
**Status:** To Do

---

## Overview

Validate that the assistant behaves as a generic CMS helper and full-site
generator after TASK-405, not as an architecture-only shortcut. The test must
start from a cleaned site state, use a slightly nontechnical prompt for a
different industry/theme, and verify that the assistant either selects a
matching curated media profile or stays media-empty/fail-closed instead of
reusing unrelated architecture imagery.

This is a destructive/reset-style QA task and must run in an isolated local test
database or a deliberately disposable seeded environment. It should not reuse
the Studio Forma content produced by TASK-405 except as a comparison baseline.

## Sub-Tasks

- Prepare an isolated reset strategy for pages, menus, forms, listings, custom
  screens, content types, entries, SEO documents, and assistant conversation
  state created by the previous full-site E2E.
- Add or select at least one non-architecture test prompt, for example a
  restaurant, clinic, fitness studio, or local service business.
- If a matching curated profile exists, verify the selected media profile and
  source/license metadata. If no matching profile exists, verify that no
  unrelated curated images are inserted and media readiness does not claim
  satisfaction.
- Run the assistant through the real admin UI as a nontechnical user:
  plan -> dry-run -> execute -> public runtime validation.
- Verify the generated site feels like a real service website: home, offer,
  proof/content, contact/lead capture, navigation/footer, SEO, detail routes
  where applicable, and mobile rendering.
- Repeat with Claude/agent UX review and fix any blocking drift before closure.

## Security Contract

- Endpoint visibility: no new endpoints; use existing internal admin assistant
  routes under `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC: existing assistant/page/content/menu/SEO/form write permissions.
- CSRF: unchanged for admin/internal writes.
- Rate-limit bucket: existing `assistant` bucket.
- Reject unknown validation: all planned actions must continue through strict
  assistant action schemas.
- Anti-abuse: no public assistant write endpoint; public lead forms retain
  existing nonce/CAPTCHA/session hardening.
- Media trust boundary: unsupported industries must not receive unrelated
  curated URLs. Arbitrary prompt/provider media URLs remain rejected unless a
  backend-owned profile asset explicitly owns them.
- Secret handling: do not print OpenRouter keys, cookies, CSRF tokens, or raw
  auth state in logs, docs, screenshots, or task evidence.

## Files To Change

| Area | Files |
|---|---|
| Test harness | `.tmp/*` during local validation; committed harness only if reusable |
| Assistant/media profiles | `core/services/media/curatedMediaProfiles.ts` if adding a new profile |
| Planner/runtime tests | Relevant assistant planner/executor/runtime suites |
| Docs/closure | `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, changelog entry |

## Implementation Pseudocode

```ts
async function resetDisposableSiteState(db, ownerTag) {
  await deleteRowsCreatedByAssistantE2E(ownerTag);
  await clearAssistantConversationState();
  await assertNoPublishedPagesFromPreviousRun();
}

async function runCrossIndustryPrompt(prompt) {
  const plan = await assistant.plan(prompt);
  assert(plan.status === "ready" || plan.questions.length > 0);

  if (plan.intentId === "service-business-full-site") {
    assert(!planContainsUnmatchedCuratedMedia(plan));
  }

  const dryRun = await assistant.dryRun(plan);
  assertNoBlockingConflicts(dryRun);

  const execution = await assistant.execute(plan);
  assert(execution.summary.failed === 0);

  await assertPublicSite({
    pages: expectedPagesForPrompt(prompt),
    noHorizontalScroll: true,
    noConsoleErrors: true,
    mediaPolicy: expectedMediaPolicyForPrompt(prompt),
  });
}
```

## Testing Requirements

- Load environment before DB-backed reset or execution:
  `set -a && source .env && set +a`.
- Restart `coderso-dev-core-host` after code changes.
- Use Playwright CLI against:
  - admin: `http://coderso-b.localhost:5175/admin/`
  - front: `http://coderso-b.localhost:3001/`
  - site Vite assets: `http://coderso-b.localhost:5176/site/`
- Verify plan/dry-run/execute, public pages, contact form, media policy,
  desktop/mobile viewports, and console/page errors.
- Run targeted planner/executor/runtime tests for any changed assistant or
  media-profile contract.
- Run `bun --cwd core lint`, `bun --cwd core lint:types`, and `git diff --check`.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if the generic site-builder/media policy
  contract changes.
- `docs/develop/assistant.md` if contributor workflow or E2E expectations
  change.
- `_docs/MEDIA_SPEC.md` if media profile/provider rules change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry for completed TASK-406.
