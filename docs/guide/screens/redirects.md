---
title: "Redirects"
audience: "admin"
productArea: "redirects"
language: "en"
keywords:
  - redirects
  - url redirect
  - 301
  - 302
  - redirect rules
---

# Basic

Redirects is the route-management surface for moving traffic from one URL to
another without losing control of where visitors land. It is where you search
existing rules, create new redirects, and manage redirect type and active state.

In the current UI, this screen includes:
- an active-routes summary in the page header,
- `Create redirect`,
- a redirects search field,
- a table with:
  from path, to path, type, status, last hit, actions,
- a right-side drawer for create and edit flows.

# Medium

Use Redirects when URLs change, pages move, campaigns need temporary routing, or
legacy links must keep working. The current route is designed for:
- searching redirect rules quickly,
- adding a new rule from the page header,
- reviewing redirect type and active status in one table,
- editing, toggling, deleting, or paging rules when entries already exist.

In the current local walkthrough, the page showed an empty state with:
- `0 active routes`,
- `No redirects found.`,
- an inline `Create your first redirect` action,
- the full create drawer still available from `Create redirect`.

That means the screen supports both:
- first-time setup when no redirects exist yet,
- ongoing maintenance when the table is populated.

# Instruction

1. Open `Redirects`.
2. Start with the summary line to understand how many active routes exist.
3. Use the search field when you need to narrow the table by source or
   destination path.
4. Use `Create redirect` when you need a new rule.
5. In the drawer, fill:
   - `Source URL path`
   - `Destination path`
   - `Redirect type`
   - `Active status`
6. Choose the redirect type carefully:
   - `301 - Permanent`
   - `302 - Temporary`
   - `307 - Temporary (keep method)`
   - `308 - Permanent (keep method)`
7. Keep the redirect enabled only when it is ready to go live.
8. Use the built-in SEO tip as a reminder that permanent moves usually belong on
   `301`.
9. Save with:
   - `Add redirect` in create mode
   - `Save changes` in edit mode
10. Use `Cancel` when the draft is not ready.
11. When rows exist in the table, review:
    - source path,
    - destination path,
    - type badge,
    - active/inactive status,
    - last-hit column,
    - row actions.
12. Use row-level edit, enable/disable, and delete controls when maintaining
    existing rules.
13. Confirm delete only when the rule should be removed entirely.

Use this safe redirect workflow when you want fewer routing mistakes:
1. Confirm the old path.
2. Confirm the correct destination.
3. Choose the right redirect type.
4. Decide whether the rule should be active immediately.
5. Save only after checking the full route change intentionally.

# Advanced

- Empty state is still operationally useful. It tells you the route is ready for
  first-time redirect setup even when no rules exist yet.
- Empty search results are separate from first-time setup and do not show the
  create CTA as if search had changed the underlying rule set.
- The type selector is one of the most important controls on the screen because
  it determines whether the move is treated as permanent or temporary.
- Edit and enable/disable actions are row-level maintenance tools, not page-wide
  settings. They matter more once the redirects table starts growing.
- Pagination appears only when the current table has more rows than the page
  size; single-page and empty lists do not show inert Previous/Next controls.
- The `Last hit` column is part of operational review, even if the current local
  dataset shows no historical traffic yet.
- Redirects is not only an SEO surface. It is also a traffic continuity and
  operational safety surface.
- Enabled redirects affect public traffic before page/content lookup. Disabled
  or non-matching rules fall through to the normal public route.
- Redirect destinations are internal paths. Absolute external URLs and
  protocol-relative destinations are rejected to avoid open redirect behavior.

# Troubleshooting

- The table is empty:
  that may be expected. Use `Create redirect` to start the first rule.
- You are unsure which code to choose:
  default to `301` only for a true permanent move; keep temporary cases on a
  temporary status code.
- The redirect exists but should not currently apply:
  use the active status or row-level toggle instead of deleting the rule
  immediately.
- The redirect should never apply again:
  use the row-level delete action and confirm the destructive prompt.
- Search does not find the rule you expect:
  search by either the source path or the destination path.

# Decision Guide

- Choose create vs edit:
  create for a new route rule; edit when the source, destination, or type must
  change on an existing rule.
- Choose permanent vs temporary:
  use permanent only when the old path should stay retired; use temporary when
  the route change is reversible or short-lived.
- Choose active vs inactive:
  keep a rule inactive when it is drafted but not yet ready to affect live
  traffic.

# Checklist

1. Confirm the source path is correct.
2. Confirm the internal destination path is correct.
3. Confirm the redirect type matches the real intent.
4. Confirm the active state is intentional.
5. Save only after checking the full routing outcome.

# Security

- Redirects is an authenticated admin surface and should only be used by users
  with site-management permissions appropriate for live route changes.
- A redirect can affect traffic, tracking, SEO, and user journeys, so treat it
  as an operational site change rather than a small content tweak.
- Redirect destinations must be reviewed internal paths. Do not use redirects
  for ad-hoc external experiments in production.
