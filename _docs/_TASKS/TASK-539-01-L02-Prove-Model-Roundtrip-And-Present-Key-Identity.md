# TASK-539-01-L02: Prove Model Round-trip and Present-Key Identity

# FileName: TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md

**Parent Subtask:** TASK-539-01
**Priority:** High
**Category:** Pages / Bun DB Route Integration
**Estimated Effort:** Small
**Dependencies:** TASK-539-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Ownership

Edit only `tests/integration/routes/pages.test.ts`.

Do not edit production, Page model Vitest files/helpers, routes, services, schemas,
parents/indexes/changelogs, or dependencies. L01 already owns and gates every unit,
stored-read, schema, resolution, facade, and no-mutation case.

The route file is 797 physical lines at the verified repair baseline. Keep it at most
1,000 lines by using the existing router/DB fixture helpers and one compact
table-driven route contract rather than duplicating setup.

## Registered route proof

Use the actual handlers registered by `registerPageRoutes` and uniquely scoped DB
rows. Add only route persistence/error/no-write assertions:

1. PATCH an owned draft Page with a canonical gallery containing:
   - one safe media row with required `src/alt/caption/category`,
   - one caption-only row, and
   - one alt-only row, and
   - the exact `{src:"",alt:"",caption:""}` draft sentinel.
   Assert the returned and persisted `currentData` carry those exact canonical rows,
   including the sentinel.
2. Starting from that known persisted document, table-drive rejected PATCH attempts:
   - an arbitrary nested gallery key and each representative legacy alias use HTTP
     400 / `page_document_unknown_field`, and the `ApiError.details` object contains
     the exact path such as
     `sections.0.blocks.0.props.items.0.url`;
   - a missing required field, unsafe nonempty `src`, malformed category, and 121 raw
     items use HTTP 400 / `page_document_invalid`;
   - `src`/`alt`/`caption` cap+1 input and outer-whitespace variants of each required
     string use HTTP 400 / `page_document_invalid`.
3. After every rejected request, query the owned Page and prove `currentData`,
   `status`, and `publishedData` remain exactly unchanged. Do not truncate tables or
   clean another suite's data.

Do not assert `details.path` for `page_document_invalid`: the current
`mapPageError` intentionally maps that code without details. This leaf does not change
the mapper. Unit-only cases such as stored-read aliases, layer merge, responsive
anchor/base-only-style rejection and stored-read drop, text-transform reset, effects,
divider cleanup, byte identity, or input mutation are forbidden here and remain
L01-owned.

## Implementation Pseudocode

```text
edit tests/integration/routes/pages.test.ts only
testIfDb with the existing registered-route and uniquely scoped Page fixtures:
  create one owned draft Page and capture currentData/status/publishedData
  PATCH through the real registerPageRoutes handler with all four canonical row forms
  assert the response and a fresh DB read preserve every row byte, including sentinel

  for each locked invalid/unknown-field case:
    PATCH a copy of the known persisted document through the same handler
    assert HTTP 400 and the exact domain error code
    if page_document_unknown_field, assert ApiError.details.path is exact
    if page_document_invalid, do not assert a details path
    reload the owned row and assert all three captured persistence fields are unchanged

  clean up only the fixture rows owned by this test

run the DB route file, lint/type gates, family line-limit gate, and diff check below;
a skipped test or unreachable DB is a blocking result
```

## Security Contract

- **Visibility:** the exercised Page mutation is the existing internal
  `/admin/api/*` route; no public endpoint is added.
- **Auth/RBAC:** preserve the existing session-cookie-only authentication and
  `content:write` RBAC check; no API-key path is introduced. Tests invoke the
  registered handler with the existing dependency harness rather than weakening
  middleware contracts.
- **CSRF/rate limit:** existing session-backed CSRF enforcement and the
  `admin_write` rate-limit behavior are unchanged.
- **Validation:** the real Page service write normalizer is exercised before DB
  persistence; nested reject-unknown and unsafe media/category failures must be
  fail-closed.
- **Anti-abuse:** no public write exists, so nonce/HMAC and captcha do not apply.

## Validation

Load repository environment variables, verify the configured database is reachable,
and ensure the added `testIfDb` test actually runs rather than skips:

```bash
set -a && source .env && set +a && bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

A missing/unreachable DB or skipped new case is a blocked validation, not a pass.
Rerun the named route file alone once before classifying a failure.
