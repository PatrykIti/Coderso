# TASK-537-01: Entry Metadata Transaction Boundary

# FileName: TASK-537-01-Entry-Metadata-Transaction-Boundary.md

**Parent Task:** TASK-537
**Priority:** High
**Category:** Content Entries / Transactions / Data Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-514, TASK-541 (program order)
**Status:** 🚧 In Progress
**Started:** 2026-07-12
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

| Leaf | Scope | Source ownership | Status |
|---|---|---|---|
| TASK-537-01-L01 | Prepare/apply taxonomy assignments through caller executor | taxonomyService.ts | 🚧 In Progress — implementation/gate complete |
| TASK-537-01-L02 | Prepare/apply SEO mutation through caller executor without cache effects | seoService.ts | 🚧 In Progress — implementation/gate complete |

## Shared executor contract

Each service owns a structural executor narrowed with `Pick<typeof db, ...>` to only the
query builders its helpers use. The type intentionally omits `transaction`, so a prepared
helper cannot open a nested transaction/savepoint. Every identifier-resolution and
validation read in a composed metadata mutation uses that executor; a global-db read
followed by a tx write is not transaction-aware. The taxonomy public adapter still accepts
a content-type UUID or slug and opens exactly one transaction for replacement. The SEO
standalone wrapper retains its API and applies its cache effect only after the DB operation
succeeds.

Taxonomy retains its existing full-replacement semantics for both enabled taxonomy kinds,
including when one nested key is omitted. SEO retains its exact per-field omitted/null/blank
merge behavior and adds no text-length policy. After taxonomy availability is resolved,
malformed UUID-shaped term input fails with an existing taxonomy domain error before the
term UUID query and before every write. Prepared plans are readonly and enforceably
immutable; apply helpers consume only their owning plan and return the existing public
service shapes.

## Security Contract

No endpoint changes. Existing internal content-entry routes retain Admin session auth,
content:write, content:publish for publish transitions, CSRF, and admin_write limiting;
this route has no API-key mode and this task adds none. Domain errors remain machine-readable. Neither helper accepts or
returns accessPassword; SEO/taxonomy state cannot enter a cache before outer commit.

## Compatibility and land order

Land L01 then L02, followed by TASK-537-02. Existing exported standalone taxonomy/SEO
functions, UUID-or-slug taxonomy adapter behavior, return shapes, timestamp representation,
and SEO present-key semantics remain backward compatible. The new internal helpers are not
route APIs.
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
