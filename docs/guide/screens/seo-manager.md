---
title: "SEO Manager"
audience: "admin"
productArea: "seo"
language: "en"
keywords:
  - seo manager
  - metadata
  - seo audit
  - meta title
  - meta description
---

# Basic

SEO Manager is the metadata review and quick-fix surface for indexed pages and
entries. It is where you monitor SEO scores, filter weak items, run a full-site
audit, and open a focused editor for title and description updates.

In the current UI, this screen includes:
- an audit status badge,
- a page search field,
- `Run Full Audit`,
- score-health filters:
  `All pages`, `Optimized`, `Needs work`, `Critical`,
- a table with score, meta-description status, social-preview status, and edit
  actions,
- a right-side `Quick SEO Edit` drawer.

# Medium

Use SEO Manager when page discovery quality needs structured review instead of
one-off metadata edits. The current route is designed for:
- spotting weak or missing SEO coverage quickly,
- narrowing the table to the problem tier you want to fix first,
- opening a lightweight editor without leaving the audit surface,
- running a broader audit when the existing scan is stale or incomplete.

The page is not only a score dashboard. It is an operational workspace that
combines:
- scan summary,
- filtering,
- per-page review,
- quick metadata editing,
- audit execution.

# Instruction

1. Open `SEO Manager`.
2. Start with the audit status badge and the page-count summary to understand
   overall health.
3. Use the search field when you already know the page title or route you want
   to inspect.
4. Use the health filters to narrow the table:
   - `All pages`
   - `Optimized`
   - `Needs work`
   - `Critical`
5. Review the table columns in order:
   - page title and path,
   - SEO score,
   - meta description status,
   - social preview status,
   - edit action.
6. Use the edit action on a row to open `Quick SEO Edit`.
7. In the drawer, review:
   - search engine preview,
   - meta title field and character counter,
   - meta description field and character counter,
   - analysis status and notes.
8. Use `Discard` when you only needed to inspect the current values.
9. Use `Update SEO` when the title or description changes are ready.
10. Use `Run Full Audit` when you need to refresh SEO checks across the content
    library.
11. In the audit dialog, review the available checks:
    - `Meta titles & descriptions`
    - `Canonical links`
    - `Robots directives`
12. Treat the audit as a heavier site-wide operation, not a casual click.

Use this safe SEO workflow when you want fewer publishing mistakes:
1. Review the scan summary.
2. Narrow the table with filters or search.
3. Open the exact page in `Quick SEO Edit`.
4. Update title/description carefully.
5. Run a broader audit only when needed.

# Advanced

- The score filters are practical triage controls, not decorative labels. They
  help choose whether to work broad-first or fix the worst pages first.
- `Quick SEO Edit` is intentionally narrow. It focuses on high-value metadata
  corrections without turning the screen into a full content editor.
- Saving in `Quick SEO Edit` updates the public page metadata used for the
  published HTML title, meta description, canonical URL, and robots directives.
- The search engine preview is one of the most useful parts of the drawer
  because it shows the likely search-result impression before you save.
- `Missing assets` in social preview status means SEO work is not only about
  text fields; preview media readiness still matters.
- Audit checks are scoped to the metadata checks currently supported by the
  backend audit service.

# Troubleshooting

- Every score looks weak or zero:
  review whether the latest audit is stale and consider running a fresh full
  audit.
- The page you want is hard to find:
  use the page search field with a title or route fragment first, then apply the
  score filter.
- A page looks fine in content but weak in SEO Manager:
  inspect meta title, description, and social-preview readiness instead of
  assuming the body copy is the problem.
- The drawer says `Needs Attention` but the notes look light:
  treat the status as a prompt to review the metadata manually before dismissing
  it.

# Decision Guide

- Choose search vs health filter:
  use search when you know the page; use health filters when you are prioritizing
  work across the whole library.
- Choose quick edit vs full audit:
  use quick edit for one-page fixes; use full audit when the issue may be broad
  or the scan is outdated.
- Choose optimized vs critical-first workflow:
  use optimized review for spot checks; use critical-first when backlog reduction
  matters more than polish.

# Checklist

1. Confirm the right page is selected.
2. Confirm the score and status match the real problem.
3. Review the preview before saving.
4. Keep title and description within reasonable limits.
5. Run a broader audit only when the workflow really requires it.

# Security

- SEO Manager is an authenticated admin surface and should only be used by users
  with content and publishing permissions appropriate for metadata changes.
- `Update SEO` changes public-facing discovery metadata, so treat it as a real
  publishing change rather than a cosmetic tweak.
- Full-site audits can touch broad content scope and should be treated as a
  controlled operational action.
