# TASK-551-03-L02: Bounded Admin Lists and Oversized Service Splits
# FileName: TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / API / Admin / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-03-L01, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Move admin collections to projection-specific read services and keyset
pagination. Split the oversized booking service by cohesive responsibility
before altering it, preserve SPA/cache behavior, and make booking/user/session
write races explicit rather than relying on read-then-write checks.

## Exact File Ownership

**Read services:** `core/services/pages/pageReadService.ts`,
`core/services/content/entryReadService.ts`,
`core/services/content/postReadService.ts`,
`core/services/admin/userReadService.ts`,
`core/services/forms/submissionReadService.ts`,
`core/services/media/mediaReadService.ts`,
`core/services/booking/bookingReadService.ts`,
`core/services/booking/bookingMutationService.ts`,
`core/services/booking/bookingScheduleService.ts`,
`core/services/booking/bookingService.ts`,
`core/services/admin/usersService.ts`, and
`core/services/auth/sessionService.ts`.

**Route/schema adapters:** `core/server/routes/pageRoutes.ts`,
`core/server/routes/contentEntryRoutes.ts`, `core/server/routes/postsRoutes.ts`,
`core/server/routes/adminUsersRoutes.ts`, `core/server/routes/formsRoutes.ts`,
`core/server/routes/mediaRoutes.ts`, `core/server/routes/bookingRoutes.ts`,
`core/server/validation/pageSchemas.ts`,
`core/server/validation/contentSchemas.ts`,
`core/server/validation/postSchemas.ts`,
`core/server/validation/adminUserSchemas.ts`,
`core/server/validation/formSchemas.ts`,
`core/server/validation/mediaSchemas.ts`, and
`core/server/validation/bookingSchemas.ts`.

**Admin consumers:** `core/admin/services/pagesClient.ts`,
`core/admin/services/entriesClient.ts`, `core/admin/services/postsClient.ts`,
`core/admin/services/adminUsersClient.ts`, `core/admin/services/formsClient.ts`,
`core/admin/services/mediaClient.ts`, `core/admin/services/bookingClient.ts`,
`core/admin/ui/pages/PageListPage.tsx`, `core/admin/ui/entries/EntryList.tsx`,
`core/admin/ui/posts/PostsListPage.tsx`,
`core/admin/ui/users/UsersRolesPage.tsx`,
`core/admin/ui/forms/FormSubmissionsPage.tsx`,
`core/admin/ui/media/MediaLibraryPage.tsx`,
`core/admin/ui/media/MediaPicker.tsx`, and
`core/admin/ui/booking/BookingPage.tsx`.

**Cohesive UI extractions required before behavior changes:**
`core/admin/ui/booking/BookingReservationsPanel.tsx` owns the reservation table,
row actions, and pagination controls formerly embedded in `BookingPage.tsx`;
`core/admin/ui/media/MediaLibraryFolderState.ts` owns folder-operation types and
pure state helpers, while `core/admin/ui/media/MediaLibraryResults.tsx` owns the
grid/list result renderer and page controls formerly embedded in
`MediaLibraryPage.tsx`; and `core/admin/ui/users/UsersRolesContent.tsx` owns the
member/invitation list, role cards, filters, and page controls formerly embedded
in `UsersRolesPage.tsx`. The page modules retain orchestration, cache hydration,
dirty-state guards, dialogs, and selection state. These names are part of the
single-writer allowlist; do not invent generic helper dumping grounds.

**Tests:** `tests/integration/routes/task551BoundedAdminLists.test.ts`,
`tests/integration/routes/bookingRoutes.test.ts`,
`tests/integration/database/task551AdminWriteConcurrency.test.ts`,
`tests/vitest/admin/task551PaginatedClients.test.ts`,
`tests/vitest/admin/task551PaginatedListViews.test.tsx`,
`tests/vitest/validation/task551ListSchemas.test.ts`, and
`tests/perf/database-admin-list-budgets.test.ts`.

No other files may be edited. In particular, TASK-517 owns
`core/services/content/entryService.ts` and `core/server/publicSite.tsx`;
TASK-493 owns GSC/Search Console code; TASK-511 owns backup services; TASK-518
owns its migration files. Schema, migration, search, cache, board, changelog,
and workflow paths are forbidden.

## Implementation Pseudocode

```ts
async function listPages(input: StrictPageQuery, deps: ReadDeps): Promise<BoundedPage<PageListItem>> {
  const limit = parsePageLimit(input.limit);
  const cursor = input.cursor
    ? decodeKeysetCursor(input.cursor, "admin:pages", deps.paginationCursorKeys)
    : null;
  const rows = await deps.db.select(PAGE_LIST_COLUMNS)
    .from(pages).where(buildPageFilters(input, cursor))
    .orderBy(desc(pages.updatedAt), desc(pages.id)).limit(limit + 1);
  return toBoundedPage(rows, limit, deps.encodeCursor);
}

async function createBooking(command: BookingCommand, tx: Tx): Promise<Booking> {
  // Validate first, acquire a stable resource/day advisory lock, write once.
  // Map the named exclusion/unique conflict already landed by 551-05-L01 to
  // booking_conflict; do not recreate its constraint or migration here.
}

async function rotateSession(command: RotateSession, tx: Tx): Promise<Session> {
  // Conditional UPDATE/DELETE or row lock; never accept stale/revoked state.
}
```

Implement the same projection/keyset shape for entries, posts, users, form
submissions, media, and bookings. Keep `bookingService.ts` as a compatibility
facade after extracting read/mutation/schedule modules; all four files must be
under 1,000 physical lines. Route code validates and maps known domain errors;
admin clients concatenate/invalidate pages without overwriting dirty state.
Load the validated keyring from L01 once at server startup and inject it into
every route/read service; route handlers must not read `process.env`.

Before adding pagination behavior, perform the named Booking, Media Library,
and Users/Roles UI extractions above and prove their existing render/action
contracts unchanged. Pagination state then belongs in the extracted result
components, while cache identity and mutation state remain in their page owner.

## Regression-Test Shape

- Seed small and large fixtures with equal sort timestamps; traverse every page
  and prove exact set equality, stable order, no offset SQL, and no duplicates.
- Assert list projections omit document blobs, password/session hashes, secret
  settings, and unrelated columns.
- Count SQL per endpoint (`<= 3`) and assert `LIMIT <= 101`; invalid cursor,
  unknown filters, and limit 0/101 fail before DB execution.
- Race concurrent booking creation, session rotation/revocation, and role
  updates; exactly one incompatible mutation wins and losers get stable
  conflict responses without partial writes.
- UI/client tests cover first/next/reset, filter invalidation, empty/end pages,
  cache hydration, background refresh, and dirty-state protection.
- Extraction tests pin the existing booking reservation actions, media
  grid/list selection, and member/role actions before and after pagination;
  each extracted file remains independently importable and focused.

## Security Contract

- Existing `/admin/api/*` routes remain internal: session auth, current RBAC,
  CSRF on writes, existing admin read/write rate-limit buckets, and strict
  reject-unknown request schemas.
- This leaf adds no public writes. Existing public booking nonce/signature or
  CAPTCHA/access-evaluator policy is preserved exactly; do not weaken it.
- Authorization filters are applied inside each query before limit/cursor;
  cursors are scope-bound, signed by the L01 keyring, age-limited, and never
  grant access or expose hidden columns. Missing/weak key configuration prevents
  the paginated server from accepting traffic.
- Known conflicts map through centralized route error helpers; SQL/details,
  binds, cursor payloads, session material, and PII are not logged.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/integration/routes/task551BoundedAdminLists.test.ts tests/integration/routes/bookingRoutes.test.ts tests/integration/database/task551AdminWriteConcurrency.test.ts`
- `bunx vitest run tests/vitest/admin/task551PaginatedClients.test.ts tests/vitest/admin/task551PaginatedListViews.test.tsx tests/vitest/validation/task551ListSchemas.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-admin-list-budgets.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Supply endpoint cursor/limit/error deltas and service split map
to TASK-551-10-L02; that closure leaf owns `_docs/CMS_API.md`, ORM docs, and
changelog 1263.

## Quantified Acceptance

- All seven collection families default to at most 50 and reject limits above
  100; no endpoint issues an unbounded select or uses offset pagination.
- Every representative 100k-row list request is at most 3 SQL statements and
  meets the L01/L02 p95 budget; response size stays within its fixture budget.
- Fifty concurrent conflicting booking/session/role attempts yield one valid
  state, no duplicate invariant, and zero partial commits.
- The booking write path consumes the named constraint catalog from 551-05;
  this leaf emits no schema or migration artifact.
- Every touched/split production and test file is at most 1,000 physical lines.
