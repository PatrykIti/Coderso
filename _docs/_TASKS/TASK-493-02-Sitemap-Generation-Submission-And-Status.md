# TASK-493-02: Sitemap Generation, Submission & Status Tracking
# FileName: TASK-493-02-Sitemap-Generation-Submission-And-Status.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-03-L01 (GSC client, for submission only)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Generate a real sitemap from published pages/entries (honouring `robots`/noindex
from `seo_documents` + public SEO resolution), serve it publicly at
`/sitemap.xml` with a `robots.txt` `Sitemap:` directive, and let an admin submit
that sitemap to Google and track its submission status in
`seo_sitemap_submissions` (from subtask 01).

Core today has **no** sitemap or robots.txt route — `handlePublicRequest`
(`core/server/publicSite.tsx:1449`) dispatches `/api/search`, site assets,
`/preview`, and page rendering, but nothing for `/sitemap.xml`. This subtask
adds it.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | Sitemap XML builder + public `/sitemap.xml` & `robots.txt` directive | Vitest (builder) + Bun (route) | ⏳ To Do |
| L02 | Sitemap submission + status tracking (internal routes) | Bun | ⏳ To Do |

---

## Dependencies

- L01 depends only on subtask 01 (status table is optional for generation) and
  existing pages/entries/public-SEO resolution.
- L02 depends on subtask 01 (`seo_sitemap_submissions`) **and** `TASK-493-03-L01`
  (the GSC auth client used to call the sitemap-submit API).

---

## Testing Requirements

- L01 — Vitest for the pure XML builder (URL set, lastmod, noindex exclusion,
  XML escaping); Bun route-integration for `GET /sitemap.xml` (content-type,
  `public_read` rate-limit bucket, robots.txt directive).
- L02 — Bun route-integration + security for the internal submit/status routes
  (auth/RBAC/CSRF, secret-never-to-client, error mapping).
