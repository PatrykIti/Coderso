# TASK-277: Posts Feed Widget Playwright Product Followups

# FileName: TASK-277_Posts_Feed_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Posts Feed + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-07, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Posts Feed follow-up family for
`_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`.

This family owns only behavior that is local to `posts-feed`: source-mode
truthfulness, post-route/detail-link resolution, thumbnail/tag mapping, manual
post selection, admin canvas preview, editorial chrome, and Posts Feed-specific
query expansion. Shared widget-contract repairs stay in TASK-256, and global
admin auth/session repair stays outside this family.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/postsFeed.tsx`
- `core/services/content/postsFeedResolver.ts`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/widgets/core/contentList.tsx`
- `tests/unit/widgets/postsFeedWidget.test.tsx`
- `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `_docs/_WIDGETS/POSTS_FEED.md`
- `_docs/_WIDGETS/tmp/posts-feed/MATRIX.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/TASK-256_Widget_Shared_Contract_Playwright_Drift_Repair.md`
- `_docs/_TASKS/TASK-256-07_Cross_Report_Shared_Contract_Classification.md`
- `_docs/_TASKS/TASK-256-08_Playwright_Report_Completion_and_Closure.md`

## TASK-256 and Out-of-Family Exclusion Matrix

The following report findings are intentionally excluded from TASK-277
implementation leaves because they are shared widget contract or global platform
work rather than Posts Feed-only product work.

| Report finding | Evidence | Owner route | Reason |
|---|---|---|---|
| BUG-08 / A1 date rendered as plain ISO text without `<time>` | `REPORT_POSTS_FEED_WIDGET.md:169-174,257,275` | TASK-256 dynamic report classification / shared Content List renderer follow-up | The rendered date comes from `ContentListBlock`, which is shared by `content-list` and `posts-feed`; fixing it in TASK-277 would change a shared renderer contract. |
| A3 generic "Read more" links lack screen-reader context | `REPORT_POSTS_FEED_WIDGET.md:259` | TASK-256 dynamic report classification / shared Content List renderer follow-up | The CTA anchor is emitted by `ContentListBlock`, not the Posts Feed owner. |
| UX-07 columns remain active for list/compact variants | `REPORT_POSTS_FEED_WIDGET.md:209-212,352` | TASK-256 truthful-control contract | This is the same shared variant/control truthfulness class already routed through TASK-256 for other widgets. |
| UX-08 Clear without undo | `REPORT_POSTS_FEED_WIDGET.md:214-216` | TASK-256-02 / existing clear-control contract | Undo/toast behavior for `Clear` is a shared editor pattern, not a Posts Feed-only behavior. |
| BUG-06 CSRF/session expiry while editing | `REPORT_POSTS_FEED_WIDGET.md:155-160,289` | Future admin auth/session resilience task | Token refresh, expired-session modals, and unsaved-change protection are global admin/page-editor concerns. |
| BUG-09 root cause: authenticated `GET /api/posts` returns 401 after session drift | `REPORT_POSTS_FEED_WIDGET.md:176-180,298,346` | Future admin auth/session resilience task for token refresh; TASK-277-03 owns only local picker error/retry UX | TASK-277 must not implement a one-off auth refresh path inside a widget editor. |

TASK-277 leaves may depend on TASK-256 results, but they must not duplicate
shared renderer, Clear, generic control, or auth/session repairs inside
Posts Feed files.

## TASK-277 Scope Matrix

| Report finding | TASK-277 owner | Notes |
|---|---|---|
| BUG-01 manual source ignores sort but UI leaves Sort active | TASK-277-01 | Posts Feed source-mode truthfulness; disable/hide Sort with a manual-order hint. |
| BUG-03 category placeholder suggests unsupported multi-tag input | TASK-277-01 | Either implement comma-separated tag terms in the Posts Feed resolver or narrow the placeholder and tests to one term. |
| BUG-07 detail links fall back to `/post/:slug` and 404 | TASK-277-01 | Posts Feed route fallback/detail-path behavior must stay aligned to `site.contentRoutes` and public posts route ownership. |
| BUG-02 `style.textColor` exists but is not exposed in the editor | TASK-277-06 | Posts Feed editor/style control gap. |
| BUG-04 / BF-01 hardcoded `showImage: false` | TASK-277-02 | Add Posts Feed-owned thumbnail field and editor toggle before mapping to Content List. |
| BUG-05 / A2 resolver does not map `imageSrc` / `imageAlt` | TASK-277-02 | Map safe post thumbnail data into the runtime item contract. |
| BF-05 / A4 `tags: []` is hardcoded | TASK-277-02 | Map bounded post tags for existing Content List metadata display. |
| BF-09 image aspect-ratio controls | TASK-277-02 | Add bounded Posts Feed image presentation fields only after thumbnail mapping lands. |
| BUG-09 local picker failure UX | TASK-277-03 | Improve picker error state, retry, and re-auth guidance while leaving global token refresh outside scope. |
| UX-04 manual picker search | TASK-277-03 | Add local filtering over the fetched post catalog. |
| UX-05 manual picker reorder | TASK-277-03 | Preserve manual order through keyboard controls and optional drag-and-drop. |
| A5 / A6 manual picker labels and loading live region | TASK-277-03 | Add accessible labels and `aria-live` feedback to the picker. |
| UX-01 admin canvas always shows empty state | TASK-277-04 | Hydrate editor preview with existing admin post catalog data without persisting preview-only data. |
| UX-06 resolver status only appears as raw Advanced JSON | TASK-277-04 | Add readable runtime/preview sync status in the editor. |
| BF-03 View all link | TASK-277-05 | Add safe listing CTA using existing site content route/list path ownership. |
| BF-06 section heading | TASK-277-05 | Add optional Posts Feed-local heading/subheading chrome. |
| BF-10 card entry animations | TASK-277-05 | Add bounded visual polish only through safe enum/tokens. |
| UX-02 visual variant previews | TASK-277-06 | Replace bare dropdown with small variant affordances while keeping variant data stable. |
| UX-03 Wizard step flow | TASK-277-06 | Make Wizard progressive without changing the shared Posts Feed data model. |
| BF-02 pagination/load more | TASK-277-07 | Add bounded client/runtime pagination or explicit deferred design if release gate rejects it. |
| BF-04 author filter | TASK-277-07 | Add author source filtering through existing post summary data. |
| BF-07 date range filter | TASK-277-07 | Add date-range source filtering with ISO validation. |
| BF-08 featured-first sort | TASK-277-07 | Add a Posts Feed-only sort mode or source option with deterministic ordering. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-277-08 | Final documentation and evidence pass. |

## Sub-Tasks

- [ ] TASK-277-01: Posts Feed Source Mode, Route, and Filter Truthfulness
- [ ] TASK-277-02: Posts Feed Media, Tags, and Card Metadata
- [ ] TASK-277-03: Posts Feed Manual Picker Search, Reorder, and Accessibility
- [ ] TASK-277-04: Posts Feed Admin Preview and Runtime Status
- [ ] TASK-277-05: Posts Feed Section Header, View All, and Editorial Chrome
- [ ] TASK-277-06: Posts Feed Editor Flow, Variant Previews, and Style Controls
- [ ] TASK-277-07: Posts Feed Pagination, Author, Date, and Featured-First Filters
- [ ] TASK-277-08: Posts Feed Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over the TASK-256 shared fixes first. TASK-277 leaves must
   build on those contracts instead of duplicating them.
2. Complete TASK-277-01 first because source/route truthfulness affects every
   runtime and editor preview leaf.
3. Complete TASK-277-02 before preview and visual polish so preview cards can
   render the final thumbnail/tag payload.
4. Complete TASK-277-03 before broader source expansion because manual ordering
   is a separate source-mode branch and needs stable regression coverage.
5. Complete TASK-277-04 after media/source basics land so admin canvas preview
   uses the same normalized runtime item shape as public SSR.
6. Complete TASK-277-05 and TASK-277-06 after preview is stable. They touch the
   same editor/schema/docs files, so avoid parallel branches unless one merge
   owner coordinates the combined schema.
7. Complete TASK-277-07 after baseline source behavior is stable because it adds
   the broadest query surface.
8. Complete TASK-277-08 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-277*` files, Posts Feed owner files, Posts Feed tests,
  Posts Feed docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-277 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none for this planning pass. Implementation leaves may
  consume existing internal admin post reads, but must not introduce public write
  routes.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions and existing post-read
  permissions.
- CSRF: unchanged existing admin route protection. Do not implement a
  Posts Feed-only CSRF refresh workaround.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Posts Feed schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: detail/list links and media fields must keep shared safe href/media
  behavior. No raw HTML/script fields, unbounded class names, public writes, or
  browser-stored secrets may be introduced.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when public
  page rendering markers, hydrated blocks, or shared public renderer behavior
  changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or widget
  registry wiring changes.
- `bun test tests/integration/posts/posts-runtime-flow.test.ts` when route/detail
  behavior or DB-backed posts runtime behavior changes and `DATABASE_URL` is
  reachable.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/POSTS_FEED.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Posts Feed pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Posts Feed report finding is either owned by TASK-256, covered by a
  TASK-277 physical leaf, routed to an explicit non-widget platform follow-up,
  or explicitly deferred by TASK-277-08 with a reason.
- TASK-277 task docs do not duplicate TASK-256 shared-contract implementation
  scope or global auth/session remediation.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `posts-feed`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
