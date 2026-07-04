# TASK-493-06-L02: Documentation Finalization
# FileName: TASK-493-06-L02-Documentation-Finalization.md

**Parent Subtask:** TASK-493-06
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Small
**Dependencies:** TASK-493-01, TASK-493-02, TASK-493-03, TASK-493-04
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Bring the four source-of-truth docs in line with the shipped
  pipeline so the contract is discoverable and accurate.
- **Owning module(s) to create-or-extend:**
  - `_docs/DATA_MODEL.md` (**extend** — catalogue `seo_indexed_pages`,
    `seo_search_metrics`, `seo_search_queries`, `seo_sitemap_submissions` with
    columns + indexes, beside the existing `seo_documents` entry).
  - `_docs/CMS_API.md` (**extend** — under the existing **SEO Manager** section
    (`:2726`), add `GET /seo/overview`, `GET /seo/search-performance`,
    `POST /seo/search-performance/sync`, `GET /seo/sitemap`,
    `POST /seo/sitemap/submit`, and the public `GET /sitemap.xml`/`robots.txt`,
    with permissions and example payloads).
  - `_docs/SEARCH_SPEC.md` (**extend** — an "SEO search-performance ingest"
    addendum: GSC source, the daily-bucket ingest, and how it differs from the
    in-app admin search this doc otherwise describes).
  - `_docs/SECURITY_SPEC.md` (**extend** — GSC credential handling: encrypted
    secret in the Integrations store, server-side-only outbound, never to client
    cache/log; reuse of `settings:write` + CSRF + `admin_write` for sync/submit).
- **Source-of-truth docs:** the four files above are themselves the targets.
- **Out of scope:** changelog entries and `_docs/_TASKS/README.md` (the
  orchestrator owns the board); any code change.

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
DATA_MODEL.md        -> 4 new table subsections (columns, types, indexes)
CMS_API.md (:2726)   -> 5 internal endpoints + 1 public endpoint, perms + examples
SEARCH_SPEC.md       -> "## SEO search-performance ingest" addendum
SECURITY_SPEC.md     -> "GSC credential & sync" note under integrations/secrets
```

**Data flow / Error handling / Regression-test shape:** n/a — verified by review
against the implemented routes/tables and the 06-L01 integration test (the
documented shapes must match what that test asserts).

---

## Testing Requirements

- No automated tests (docs only). Verification = cross-check each documented
  endpoint/table/payload against the implemented `seoRoutes.ts`, `schema.ts`
  tables, and the `seoTypes.ts` shapes, and against the 06-L01 assertions.
- Run any repo docs/markdown lint if present; otherwise visual review.
