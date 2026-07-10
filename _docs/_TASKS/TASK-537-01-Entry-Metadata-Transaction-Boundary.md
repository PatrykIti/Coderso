# TASK-537-01: Entry Metadata Transaction Boundary

# FileName: TASK-537-01-Entry-Metadata-Transaction-Boundary.md

**Parent Task:** TASK-537
**Priority:** High
**Category:** Content Entries / Transactions / Data Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-514, TASK-536 (program order)
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

Give taxonomy and SEO mutations transaction-aware, cache-silent internal seams that the
entry metadata coordinator can compose. This subtask does not edit entryService.ts; the
outer transaction and all entry projections are deliberately integrated by TASK-537-02
as its sole writer.

## Grounded anchors

- core/services/content/taxonomyService.ts:300-421 validates through global db and then
  opens its own transaction.
- taxonomyService.ts:423-445 resolves tag names through global db.
- core/services/seo/seoService.ts:412-462 queries/writes through global db and calls
  clearSiteCache inside the mutation.
- core/services/content/entryService.ts:954-1052 currently calls those public wrappers
  after earlier status writes.

## Leaves

| Leaf | Scope | Source ownership |
|---|---|---|
| TASK-537-01-L01 | Prepare/apply taxonomy assignments through caller executor | taxonomyService.ts |
| TASK-537-01-L02 | Prepare/apply SEO mutation through caller executor without cache effects | seoService.ts |

## Shared executor contract

Both services define or import the narrow Drizzle executor type accepted by db and the
transaction callback. Every read used to validate a composed metadata mutation must use
that executor; a global-db read followed by a tx write is not transaction-aware.
Public standalone wrappers retain their API by opening their own transaction or using db
and applying cache effects only after success.

## Security Contract

No endpoint changes. Existing internal content-entry routes retain session/API-key auth,
content:write, content:publish for publish transitions, CSRF for session writes, and
admin_write limiting. Domain errors remain machine-readable. Neither helper accepts or
returns accessPassword; SEO/taxonomy state cannot enter a cache before outer commit.

## Compatibility and land order

Land L01 then L02, followed by TASK-537-02. Existing exported standalone taxonomy/SEO
functions remain backward compatible. The new internal helpers are not route APIs.
TASK-517 must not implement until the entire TASK-537 family lands and is re-audited.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts
~~~

Re-run a named failing file alone before classifying it.
