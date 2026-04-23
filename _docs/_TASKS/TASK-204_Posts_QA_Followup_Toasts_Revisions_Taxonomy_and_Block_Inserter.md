# TASK-204: Posts QA Follow-up - Toasts, Revisions, Taxonomy, and Block Inserter
# FileName: TASK-204_Posts_QA_Followup_Toasts_Revisions_Taxonomy_and_Block_Inserter.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Admin/API + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-059, TASK-061, TASK-063, TASK-195
**Status:** To Do

---

## Overview

Follow up on the 2026-04-23 manual Playwright CLI re-verification captured in
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md`.

`TASK-195` closed the main Posts QA wave. This family only tracks the remaining
or newly observed issues from the fresh replay:

- `BUG-5`: publish/update calls the success path, but the browser replay did not
  show a visible toast and the live region stayed empty.
- `UX-1`: revision preview can open, but a just-created one-block revision can
  still show `No preview available for this revision.`
- `UX-4`: Media tab is cleaner (`Image` + `Embed`, no `Separator`) but still
  lacks the broader media capabilities requested by the report.
- `UX-7`: category-scoped block search exists in code, but live UI copy and
  proof still need to make the active category scope obvious.
- `BUG-6`: the Post revisions sheet still emits the Radix
  `aria-describedby` warning.
- `BUG-7`: `GET /admin/api/content-types/post/terms` can return a 500 and the
  Posts inspector can surface raw SQL/query text to users.

The same source report also includes a `Bledy z konsoli real time` block with
two runtime/database symptoms outside the taxonomy selector itself:

- `settings` read for `site.adminPath` failed with raw Drizzle query output;
- `POST /admin/api/posts/:id/autosave` failed after a
  `CONNECTION_CLOSED` database error.

`TASK-204` must not silently fold those console findings into `BUG-7`. Closure
must classify them separately as fixed, environment-only, or still-open with
named owners. If still reproducible, the durable follow-up owners are
`core/services/settings/settingsService.ts` for the settings/admin-path read and
`core/server/routes/postsRoutes.ts` for the autosave route/error contract.

This is a follow-up polish and contract-hardening family. It must not reopen
closed `TASK-195` work such as list selection, search placeholder, Details
button semantics, raw featured image IDs, category dropdown existence, slug URL
context, or typography helper copy unless the fresh replay proves a regression
in those exact seams.

Closure must map every remaining item in the manual re-verification section of
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md` to fixed evidence, an explicit open
capability decision, or a named follow-up. Do not leave the source report in a
state where closed and still-open Posts findings are indistinguishable.

## Source Report Coverage Matrix

| Source finding | 2026-04-23 replay status | TASK-204 owner |
|---|---|---|
| `BUG-5` publish/update toast | Partial: mutation feedback works, visible toast/live-region proof missing | `TASK-204-01-01` |
| `UX-1` revision preview | Partial: preview toggle exists, but short revisions can show only empty fallback | `TASK-204-01-02` |
| `UX-4` Media tab capabilities | Partial: `Image` + `Embed` are present, but `Video`, `Gallery`, `Audio`, and `File` remain capability decisions | `TASK-204-03-02` |
| `UX-7` block search scope | Partial: scoped search needs active-category copy plus regression/browser proof | `TASK-204-03-01` |
| `BUG-6` revisions Radix description warning | New replay bug | `TASK-204-01-02` |
| `BUG-7` taxonomy terms 500/raw SQL UI | New replay bug | `TASK-204-02-01`, then `TASK-204-02-02` |
| Realtime console: `site.adminPath` settings read | Separate runtime/database symptom, not taxonomy | `TASK-204-04-01` |
| Realtime console: posts autosave `CONNECTION_CLOSED` | Separate runtime/database symptom, not taxonomy | `TASK-204-04-01` |

The same replay also verified `BUG-1`, `BUG-2`, `BUG-3`, `BUG-4`, and `UX-6`
as working after `TASK-195`. `TASK-204` should keep them as regression smoke
evidence during replay, but must not allocate new implementation work to them
unless the fresh run proves they regressed.

## Sub-Tasks

- `TASK-204-01_Post_Feedback_and_Revision_Drawer_Reliability.md`
- `TASK-204-02_Taxonomy_Terms_Error_Boundary_and_Category_Retry.md`
- `TASK-204-03_Block_Inserter_Search_and_Media_Capability_Followup.md`
- `TASK-204-04_QA_Docs_and_Playwright_Source_Closure.md`
- `TASK-204-04-01_Runtime_Console_Error_Triage_Settings_and_Autosave.md`

## Scope

1. Post action feedback and revision confidence:
   - verify the real shared toast mount end to end,
   - keep publish/update feedback visible and screen-reader reachable,
   - add the missing revision sheet description,
   - make empty/short revision previews useful without dumping raw blobs.
2. Taxonomy loading failure boundaries:
   - bound `/content-types/:id/terms` server errors,
   - keep `taxonomyClient` and Posts shell errors user-safe,
   - add retry/fallback UI in the category selector.
3. Block inserter follow-up:
   - align active-category search copy with the existing scoped search contract,
   - prove category-scoped search in tests and replay,
   - decide and implement or explicitly leave open the larger media capability
     gap for `Video`, `Gallery`, `Audio`, and `File`.
4. QA/docs/closure:
   - replay the Posts report after the leaf work,
   - update source docs, task board, and changelog when the family closes.
   - classify the source report's realtime console errors separately from
     `BUG-7`, with named follow-up owners if they remain reproducible.

Out of scope:

- changing the stored Posts slug contract;
- creating public Posts write endpoints;
- adding a second Posts-only toast host or event bus;
- pretending backend/database failures succeeded in the UI;
- root-causing transient Render/Postgres availability unless the replay proves
  a deterministic app-level settings or autosave error contract bug;
- adding new media block labels in the catalog without schema/defaults,
  editor, normalizer, runtime renderer, and tests;
- broad redesign of the Posts editor shell, Entries editor, or media library.

## Architecture

Current owner seams:

- shared toast plumbing:
  - `core/admin/app/AdminApp.tsx:87`
  - `core/admin/app/AdminApp.tsx:826`
  - `core/admin/components/ui/sonner.tsx:13`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:551`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:556`
- revision drawer:
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:59`
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:89`
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:96`
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx:141`
- taxonomy route/client/inspector:
  - `core/server/routes/taxonomyRoutes.ts:34`
  - `core/server/routes/taxonomyRoutes.ts:112`
  - `core/server/routes/taxonomyRoutes.ts:152`
  - `core/admin/services/apiClient.ts:60`
  - `core/admin/services/taxonomyClient.ts:62`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:239`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx:254`
  - `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:150`
  - `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:171`
- block inserter and media capability contract:
  - `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:62`
  - `core/admin/ui/posts/editor/blocks/BlockInserter.tsx:130`
  - `core/admin/ui/posts/editor/blocks/blockCatalog.ts:22`
  - `core/admin/ui/posts/editor/blocks/blockCatalog.ts:72`
  - `core/admin/ui/posts/editor/blocks/blockCatalog.ts:100`
  - `core/services/posts/editor/postBlockDocument.ts:3`
  - `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- realtime console error triage:
  - `core/server/routes/settingsRoutes.ts`
  - `core/services/settings/settingsService.ts`
  - `core/server/routes/postsRoutes.ts`
  - `core/admin/services/siteSettingsClient.ts`
  - `core/admin/services/postsClient.ts`
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`

Reuse-first rules:

- keep `AdminApp` as the shared toast mount owner; Posts may dispatch feedback,
  but must not mount a private toaster host;
- keep `PostRevisionDrawer` as the revision UI owner and reuse existing
  revision payload data;
- keep `taxonomyRoutes` responsible for route-boundary error mapping and
  `taxonomyClient` responsible for API client calls, while the Posts shell maps
  client failures to safe UI state;
- keep `DocumentInspector` presentational for category state and retry actions;
- keep `blockCatalog.ts` as the catalog/search owner;
- if new media block types are accepted, update the full block contract across
  schema/types, defaults, normalizers, editor controls, runtime renderer, and
  tests in one coherent leaf.
- console errors from the source report must be mapped to their actual owners
  and must not be treated as taxonomy UI closure unless the failing call is the
  taxonomy terms endpoint.
- `site.adminPath` settings reads and posts autosave failures are separate
  runtime observations. They need direct triage through `TASK-204-04-01`
  before closure can decide whether they are fixed in this family,
  environment-only, or linked to a named follow-up.

## Security Contract

- Visibility: internal admin Posts UI and internal admin taxonomy endpoints only.
- Auth model: authenticated admin session or existing admin API-key path.
- RBAC:
  - `content:read` for taxonomy overview, revisions, and post detail data;
  - `content:write` for posts mutations already used by publish/update and
    autosave;
  - `content:publish` for publish/unpublish.
- CSRF: unchanged for current mutating Posts/admin calls; taxonomy overview is a
  read path.
- Rate-limit buckets: existing `admin_read` and `admin_write`.
- Reject-unknown validation: unchanged Posts/taxonomy schemas; no loose
  pass-through payloads.
- Anti-abuse:
  - no public write path,
  - no raw SQL, stack traces, secrets, tokens, headers, or DB details in API
    responses or UI copy,
  - revision preview stays read-only and bounded,
  - feedback must accurately report failures instead of masking infra issues.

## Implementation Order

1. Prove and repair visible publish/update toast delivery and revision drawer
   accessibility/preview fallback.
2. Bound taxonomy overview route/client errors and add category selector retry
   UI.
3. Tighten block inserter active-category search copy/proof.
4. Decide and implement or explicitly keep open the broader media capability
   gap with named owners.
5. Triage the source report's settings/admin-path and autosave console errors
   through `TASK-204-04-01`, fixing bounded error contracts in-family only when
   the replay proves an app-owned leak or user-facing failure.
6. Replay the Posts Playwright checklist, including console capture for
   settings/admin-path reads and autosave failures.
7. Update docs, changelog, and board with fixed, deferred, or follow-up status.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui-integration/post-block-inserter.test.tsx tests/vitest/posts/post-block-catalog-search.test.ts tests/vitest/admin/taxonomyClient.test.ts`
- Bun route/service suites if taxonomy route mapping changes:
  - `set -a && source .env && set +a && bun test tests/integration/routes/taxonomy.test.ts`
- Bun route/service suites if settings or posts autosave error mapping changes:
  - `set -a && source .env && set +a && bun test tests/integration/routes/settings.test.ts tests/integration/routes/postsRoutes.test.ts`
- Vitest suites if settings/admin-path or autosave UI/client handling changes:
  - `bun run test:vitest -- tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/ui-integration/post-autosave-flow.test.tsx`
- If new media block types are added:
  - `bun run test:vitest -- tests/vitest/posts/postBlockDocument.test.ts tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts tests/vitest/posts/post-block-runtime-renderer.test.tsx tests/vitest/posts/post-block-transforms.test.ts tests/vitest/ui-integration/post-block-inserter.test.tsx`
- QA replay:
  - rerun the Posts checklist from `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` with
    Playwright CLI or equivalent browser evidence;
  - capture the console state for the revision dialog warning and taxonomy
    terms failure path;
  - capture whether the `site.adminPath` settings read and posts autosave
    `CONNECTION_CLOSED` errors still reproduce.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if taxonomy error codes/messages change
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor UX contract notes
  change materially
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when `TASK-204` closes

## Acceptance Criteria

1. Publish/update success feedback is visible in the browser replay and covered
   by direct tests against the shared toast path.
2. Post revisions dialog has an accessible description and no longer emits the
   `aria-describedby` warning.
3. Revision preview gives useful bounded fallback information for short or
   non-text revisions.
4. Taxonomy overview failures do not leak SQL/query text through API responses
   or the Posts inspector.
5. Category selector failure state is friendly, retryable, and does not block
   unrelated editor work.
6. Block inserter search copy and tests prove active-category scope.
7. `UX-4` media capability scope is either implemented across the full Posts
   block contract or left explicitly open with named owners and no false closure.
8. `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` is updated with per-item closure evidence
   for every remaining `BUG-*` and `UX-*` item from the 2026-04-23 replay.
9. The realtime console error block from the source report is classified
   separately, with `settingsService` and/or `postsRoutes` follow-up ownership
   recorded if those failures remain reproducible.
