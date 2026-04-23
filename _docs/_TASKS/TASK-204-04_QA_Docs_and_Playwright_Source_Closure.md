# TASK-204-04: QA Docs and Playwright Source Closure
# FileName: TASK-204-04_QA_Docs_and_Playwright_Source_Closure.md

**Priority:** Medium
**Category:** CMS/Posts + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-204-01, TASK-204-02, TASK-204-03, TASK-204-04-01
**Status:** Done (2026-04-23)

---

## Overview

Close `TASK-204` after the follow-up fixes land. This closure task exists
because the source report already contains both original findings and the
2026-04-23 replay state; final docs must not blur what was fixed in `TASK-195`
versus what `TASK-204` repaired or intentionally left open.

## Sub-Tasks

- `TASK-204-04-01_Runtime_Console_Error_Triage_Settings_and_Autosave.md`

## Scope

- Run lint, typecheck, and the union of leaf-declared Vitest/Bun suites.
- Replay the relevant Posts flows with Playwright CLI or equivalent browser
  evidence.
- Update `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` with per-item closure evidence for
  the `TASK-204` follow-up findings:
  - `BUG-5`,
  - `UX-1`,
  - `UX-4`,
  - `UX-7`,
  - `BUG-6`,
  - `BUG-7`.
- Keep the same source report explicit that `TASK-195`-owned original findings
  were already fixed/verified and are only regression-smoked in this family
  unless a new run proves otherwise:
  - `BUG-1` bulk select,
  - `BUG-2` Posts search placeholder,
  - `BUG-3` Details button semantics,
  - `BUG-4` category/featured-image picker replacement,
  - `UX-2` focus mode/right-rail discoverability,
  - `UX-3` collapsed SEO summary visibility,
  - `UX-5` slug URL context,
  - `UX-6` typography helper copy.
- Classify the `Bledy z konsoli real time` block separately from `BUG-7`:
  - `site.adminPath` settings read failed with raw Drizzle query output;
  - `POST /admin/api/posts/:id/autosave` failed after `CONNECTION_CLOSED`.
- Consume the explicit `TASK-204-04-01` evidence before closing: each console
  finding must be fixed in-family, classified as environment-only with proof,
  or linked to a follow-up with the exact owner seam.
- Verify the implementation followed the family contract-repair rules:
  no duplicate owner paths, no test-only production fallbacks, existing route
  boundaries and UI seams are the touched surfaces, and any unclear ownership is
  documented in the source report or task/changelog notes.
- Separate fixed, still-open capability, and environment/runtime failure states.
- If those console failures remain reproducible, record named follow-up owners:
  `core/services/settings/settingsService.ts` for settings/admin-path reads and
  `core/server/routes/postsRoutes.ts` for autosave route/error behavior.
- Update product docs if the editor/API contract changed.
- Update task board and changelog when `TASK-204` is complete.

Out of scope:

- closing `TASK-203`, `TASK-201`, or unrelated Playwright report families;
- claiming `UX-4` fully fixed if Video/Gallery/Audio/File were not implemented
  end to end;
- running broad destructive DB scenarios without verifying `DATABASE_URL`
  reachability first.
- treating the settings/autosave console errors as fixed merely because the
  taxonomy selector no longer leaks raw SQL.
- closing from the source report alone without running or recording the
  `TASK-204-04-01` triage decision.

## Files to Change

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/_TASKS/TASK-204*.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if taxonomy API contract changed
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor UX changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-204`

## Security Contract

- No new route or auth model during closure.
- Final QA must verify that any changed internal admin API route still requires
  the existing auth/RBAC path.
- Final docs must explicitly state that no raw SQL, stack traces, tokens,
  secrets, or private media URLs are exposed in the fixed taxonomy/revision
  paths.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites from `TASK-204-01` through `TASK-204-03`
- Bun taxonomy route suite if `taxonomyRoutes.ts` changed:
  - `set -a && source .env && set +a && bun test tests/integration/routes/taxonomy.test.ts`
- Bun settings/posts route suites if `TASK-204-04-01` changes those boundaries:
  - `set -a && source .env && set +a && bun test tests/integration/routes/settings.test.ts tests/integration/routes/postsRoutes.test.ts`
- Vitest admin/client/UI suites if `TASK-204-04-01` changes browser handling:
  - `bun run test:vitest -- tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/ui-integration/post-autosave-flow.test.tsx`
- Additional media block contract suites if new media block types were accepted.
- Manual Playwright replay of the Posts scenarios listed in the
  `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` re-verification section.
- Regression smoke for the original `TASK-195`-owned report items must include:
  list bulk/select behavior, Posts search placeholder, Add block vs Details
  semantics, category/featured-image picker surfaces, focus/right-rail
  discoverability, collapsed SEO summary, create/edit slug route context, and
  typography helper copy.
- Console capture must explicitly state whether the `site.adminPath` settings
  query and posts autosave `CONNECTION_CLOSED` failures reproduced or were
  environment-only during the replay.
- Console/network capture must distinguish browser-visible API payloads from
  server-only logs so route/client leaks are not confused with diagnostic logs.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if API error contracts changed
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor UX changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for `TASK-204`

## Acceptance Criteria

1. Every original and replayed Posts source finding has closure evidence, an
   explicit open state, `TASK-195` prior-closure regression smoke, or a named
   follow-up.
2. Source docs, task board, and changelog agree with the final implementation.
3. Validation commands are recorded with pass/fail status.
4. Any skipped DB/runtime validation is stated with the concrete reason.
5. The source report's realtime console errors are not left ambiguous: each has
   fixed evidence, environment-only evidence, or a named follow-up owner.
