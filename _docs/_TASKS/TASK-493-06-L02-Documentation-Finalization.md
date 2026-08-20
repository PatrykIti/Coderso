# TASK-493-06-L02: Documentation Finalization
# FileName: TASK-493-06-L02-Documentation-Finalization.md

**Parent Subtask:** TASK-493-06
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Small
**Dependencies:** TASK-493-01, TASK-493-02, TASK-493-03, TASK-493-04, TASK-493-05
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

- **Goal:** Bring the four source-of-truth docs in line with the shipped
  pipeline so the contract is discoverable and accurate.
- **Owning module(s) to create-or-extend:**
  - `_docs/DATA_MODEL.md` (**extend** — add a **new** "SEO indexing &
    search-performance tables" section cataloguing `seo_indexed_pages`,
    `seo_search_metrics`, `seo_search_queries`, `seo_sitemap_submissions` with
    columns + indexes; DATA_MODEL.md has **no** existing `seo_documents` entry,
    so this is a new section, not an extension beside one).
  - `_docs/CMS_API.md` (**extend** — under the existing **SEO Manager** section
    (`:3052`), add `GET /seo/overview`, `GET /seo/search-performance`,
    `POST /seo/search-performance/sync`, `GET /seo/sitemap`,
    `POST /seo/sitemap/submit`, and the public `GET /sitemap.xml` + `robots.txt`
    `Sitemap:` directive, with permissions and example payloads).
  - `_docs/SEARCH_SPEC.md` (**extend** — an "SEO search-performance ingest"
    addendum: GSC source, the daily-bucket ingest, and how it differs from the
    in-app admin search this doc otherwise describes).
  - `_docs/SECURITY_SPEC.md` (**extend** — GSC credential handling: encrypted
    secret in the Integrations store, server-side-only outbound, never to client
    cache/log; reuse of `settings:write` + CSRF + `admin_write` for sync/submit).
  - `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` (**extend** — the new
    `cacheKeys.seoOverview` admin cached resource added by 05-L01: list the key
    in the SEO Manager cache rows, note it is scoped to the authenticated admin
    and invalidated/cleared by the existing identity transition + cacheBus
    rules, and add the `seo:overview` mutation-invalidation mapping).
- **Source-of-truth docs:** the four files above plus the two admin-cache docs
  are themselves the targets.
- **Changelog entry (in scope):** this leaf owns the single TASK-493 changelog
  entry, pinned to number **1309** (verified next-free; 1308 is used by
  TASK-467), plus the matching `_docs/_CHANGELOG/README.md` index row.
- **Out of scope:** `_docs/_TASKS/README.md` board rows (the orchestrator owns
  the board); any code change.

---

## Security Contract

No endpoint or permission model changes — documentation only. The doc edits
**describe** the contracts implemented in 01–04 (RBAC `content:read` reads /
`settings:write` writes, CSRF on internal writes, encrypted GSC secret,
server-side-only outbound). They must not contradict the implemented behaviour.

---

## Implementation Pseudocode

Not applicable (documentation leaf). Edit checklist:

```text
DATA_MODEL.md         -> NEW section: 4 table subsections (columns, types, indexes)
CMS_API.md (:3052)    -> 5 internal endpoints + 2 public paths, perms + examples
ADMIN_CACHE docs      -> cacheKeys.seoOverview rows (SEO Manager) + invalidation map
SEARCH_SPEC.md        -> "## SEO search-performance ingest" addendum
SECURITY_SPEC.md      -> "GSC credential & sync" note under integrations/secrets
CHANGELOG 1309        -> single task entry + `_CHANGELOG/README.md` index row
```

**Data flow / Error handling / Regression-test shape:** n/a — verified by review
against the implemented routes/tables and the 06-L01 integration test (the
documented shapes must match what that test asserts).

---

## Testing Requirements

- No automated tests (docs only). Verification = cross-check each documented
  endpoint/table/payload against the implemented `seoRoutes.ts`,
  `core/db/tables/seo.ts` tables, and the `seoTypes.ts` shapes, and against
  the 06-L01 assertions.
- Run any repo docs/markdown lint if present; otherwise visual review.
