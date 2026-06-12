# TASK-459-05: Validation Catalog Demo And Closure
# FileName: TASK-459-05-Validation-Catalog-Demo-And-Closure.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Pages / Listings / Validation / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-459-02, TASK-459-03, TASK-459-04
**Status:** ⏳ To Do

---

## Overview

Close the family with full lanes, perf checks, and a live otodom-style
catalog demo proving the whole visitor journey end to end.

Live demo (acceptance scenario, built on the dev host):

1. Content type "Listings" with fields `price` (number), `rooms` (number),
   `area` (number) plus title/image; 12+ PUBLISHED entries spanning value
   ranges (plus at least one DRAFT entry that must never appear).
2. Saved listing query over the type; listing template with card bindings
   and a style config (columns/cardVariant) that visibly applies.
3. A published v2 page composing the filters block (facets: rooms checkbox
   or radio, price range, sort options) and the collection block
   (pagination "paged", pageSize 6 or fewer so 12+ entries paginate).
4. Visitor journey to verify: facets narrow results live (fetch-swap, URL
   updates via pushState); counts are truthful for the FULL filtered corpus
   (verify a count spanning multiple pages); sort reorders; numbered pager
   navigates and reflects totals ("N results"); the filtered URL is
   shareable — open it in a fresh session and land on the same filtered,
   sorted, paged state (pretty aliases per contract); no-JS fallback: same
   journey with JS disabled via plain GET submits and pager hrefs; card
   links open working detail pages (no 404 — dangling-route guard); the
   draft entry never appears in any state.

---

## Sub-Tasks

- [ ] Full lanes: `bun run test:vitest` (incl. amended catalog guard
      suites), Bun pages/listing/public-site suites (env loaded),
      `bun --cwd core lint`, `bun --cwd core lint:types`, root
      `npx tsc -p tsconfig.json --noEmit`.
- [ ] Perf checks: `tests/perf/*` for the TASK-459-04 contracts and
      `bun run gates:coderso`; record numbers at the seeded corpus.
- [ ] Migrations verified on the dev DB (jsonb indexes present, EXPLAIN
      shows index usage on the demo query shapes).
- [ ] Live demo via `coderso-dev-core-host` + `playwright-cli` covering the
      journey above (desktop + mobile viewport); evidence under `.tmp/`.
- [ ] Docs: `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`,
      `_docs/SEARCH_SPEC.md`, `_docs/DATA_MODEL.md`, `docs/guide/`
      authoring walkthrough (build a filterable catalog page).
- [ ] Board: family closure in `_docs/_TASKS/README.md` + statistics;
      `_docs/_CHANGELOG/` entry (final frozen catalog numbers, pagination
      default, pushdown + index strategy).

---

## Implementation Pseudocode

```text
Demo script shape (playwright-cli):
1. seed: content type + 12 published + 1 draft entries; saved query;
   template with style; page with filters + collection blocks; publish.
2. front: assert 12 results / pager / counts; apply rooms=3 -> assert
   narrowed set + URL; apply price max -> assert counts truthful vs seeded
   data; sort price desc -> assert order; page 2 -> assert slice.
3. copy URL -> new context -> assert identical state.
4. JS off -> repeat filter + page via form submit/hrefs.
5. click card -> detail renders (200), draft never listed anywhere.
```

Expected data flow: validation consumes the artifacts of 01-04 unchanged;
no new product code in this leaf beyond test/diagnostic fixes.

Error handling: any failed step routes back to the owning leaf; closure is
blocked until the full journey passes in one session, with perf numbers
recorded.

Regression-test shape: no new suites beyond what 01-04 added; this leaf
runs them all plus the live pass and pins the demo seed as a reusable
fixture where practical.

---

## Security Contract

- **Endpoint visibility / Auth / RBAC / CSRF / rate-limit:** unchanged —
  this leaf verifies the family's contracts: draft entries invisible in
  every filtered/sorted/paged state, public fragment endpoint (if built)
  rate-limited and allowlist-validated, no unvalidated visitor input
  reaches SQL or CSS/HTML output.
- **Anti-abuse controls:** verified live (rejected-token behavior, clamp
  behavior on hostile page/limit params).

---

## Testing Requirements

- All lanes listed in Sub-Tasks green in one run; perf numbers recorded.
- Live demo pass with evidence under `.tmp/`.

---

## Documentation Updates Required

- All family docs (PAGE_MODEL, CONTENT_TYPES_SPEC, SEARCH_SPEC, DATA_MODEL,
  guide walkthrough).
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on
  completion.
