# TASK-537-02: Secret-Minimal Entry Projections

# FileName: TASK-537-02-Secret-Minimal-Entry-Projections.md

**Parent Task:** TASK-537
**Priority:** High
**Category:** Content Entry Service / Transactions / Secret Handling
**Estimated Effort:** Large
**Dependencies:** TASK-537-01-L01, TASK-537-01-L02
**Status:** ⏳ To Do
**Changelog:** 1249 (pinned; create only at implementation closure)

---

## Scope

As the sole entryService.ts writer, integrate the transaction-aware taxonomy/SEO seams
into one updateEntryMetadata transaction and narrow every audited update/publish/delete
query. This integration keeps transaction/projection changes in one source owner and
prevents an intermediate revision from reintroducing broad secret-bearing rows.

## Grounded anchors

- core/services/content/entryService.ts:685-688 deleteEntry uses full returning().
- entryService.ts:830-865 updateEntry uses an unused full returning().
- entryService.ts:868-917 publishEntry begins with full select().
- entryService.ts:954-1052 updateEntryMetadata performs status, taxonomy, visibility,
  password, and SEO through separate owners.
- Public/minimal read projections already exist around entryService.ts:618-714 and must
  remain the response boundary.

## Leaf

TASK-537-02-L01 is the only leaf and the sole TASK-537 writer of entryService.ts.
TASK-537-02-L01 owns its pre-gate entry/route/cache behavior-test updates.
TASK-537-03-L01 owns only additive cross-domain tests plus docs/status/changelog edits
and cannot re-baseline source-owner assertions.

## Security Contract

No route changes. Existing admin content endpoints retain session/API-key auth,
content:write, content:publish for transitions, CSRF for session writes, admin_write,
strict route envelopes, and centralized domain-error mapping. Plaintext password exists
only long enough to hash. Queries may compute hasPassword in SQL but may not materialize
the accessPassword column/value in JavaScript.

## Compatibility and land order

Land after both 537-01 leaves. Return/error/cache behavior remains compatible except
that the formerly partial metadata commit becomes atomic. TASK-517 is blocked until this
leaf and closure pass; its planned entryService changes must be rebased and freshly
audited against the explicit projection/helper shape.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts
~~~
