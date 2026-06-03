---
title: "Admin Search"
audience: "admin"
productArea: "search"
language: "en"
keywords:
  - search
  - admin search
  - navigation
  - results
---

# Basic

Admin Search is the global cross-surface search workspace for the admin panel.
It is where you search across pages, content entries, media, and users from one
dedicated route instead of navigating manually through the sidebar.

In the current UI, this screen includes:
- a large search field with a `Cmd K` hint,
- a `Recent Searches` sidebar,
- left-side filters:
  `Date Range`, `Category`, `Clear`,
- content-type tabs:
  `All`, `Pages`, `Content`, `Media`, `Users`,
- grouped search results when matches are available.

# Medium

Use Search when you know the thing you need but not the exact screen, when you
are working across many modules, or when you need to jump to an item quickly.

This route is more than a simple omnibox. It is a search workspace with:
- minimum query gating:
  you need at least 2 characters before search runs,
- recent-search shortcuts in two places:
  the left sidebar list and the `Try:` chips under the main search field;
  generic chips appear when you do not have recent searches yet,
- date narrowing with:
  `Last 7 days`, `Last 30 days`, `Last 12 months`, and `All time`,
- content narrowing through tabs and category filters,
- grouped results that can route directly to the right admin surface.

The current route is designed to help you:
- reopen previous searches quickly,
- narrow broad queries before clicking into a result,
- move directly from search into the relevant page, entry, media, or user view.

# Instruction

1. Open `Search`.
2. Start with the main search field or reuse a term from `Recent Searches`.
3. Remember the minimum rule:
   search starts only after at least 2 characters.
4. Use the `Try:` chips under the search field when one of the recent queries is
   close to what you need.
5. Use the left `Recent Searches` list when you want to rerun an earlier query
   without typing again.
6. After the query runs, use the left sidebar filters:
   - `Date Range`
   - `Category`
   - `Clear`
   Use `All time` when a precise query should include older content.
7. Use the content-type tabs to narrow the result set:
   - `All`
   - `Pages`
   - `Content`
   - `Media`
   - `Users`
8. Review grouped result sections instead of clicking the first visible match.
9. Use `View All` inside a result group when you want to focus one content type.
10. Open the result card that matches the title, subtitle, or badge metadata.
11. Treat Search as a navigation accelerator, not as a replacement for knowing
    ownership or data structure.

Use this safe search order when you want fewer wrong clicks:
1. Start with a precise term.
2. Confirm the query is specific enough.
3. Narrow by tabs or category filters.
4. Review grouped results.
5. Open the exact result only after the group/type is clear.

# Advanced

- `Recent Searches` is part of the workflow, not decorative history. It speeds
  up repeat admin tasks and helps recover a route you used earlier.
- The search page and the smaller topbar search are related but not equivalent:
  this route gives you the full filtering workspace.
- Tabs and category filters solve different problems:
  tabs narrow by broad content type, while category filters refine the current
  result set after matches are available.
- Empty states name the cause: minimum query length, no searchable content, no
  match, date range too narrow, or category filters too narrow.
- Search is strongest when titles, slugs, and category labels are stable.
  Weak naming conventions reduce the value of the whole surface.

# Troubleshooting

- Nothing happens when you type:
  make sure the query has at least 2 characters.
- Categories do not appear yet:
  that is expected before a search returns categorized results. After a
  completed search, the helper explains whether no categories match the query or
  the workspace has no searchable content yet.
- A precise query returns no results:
  switch `Date Range` to `All time` before assuming the item does not exist.
- The result set is too broad:
  switch away from `All` and use a more specific content-type tab or category.
- Search stays empty or fails:
  refine the term and retry; if the failure persists, treat it as a route/API
  problem rather than assuming the item does not exist.

# Decision Guide

- Choose recent query vs new query:
  use recent searches when you are repeating known work; type a new query when
  the target changed.
- Choose `All` vs a specific tab:
  use `All` for discovery; switch to a specific tab when the target type is
  already known.
- Choose Search vs sidebar navigation:
  use Search when you know the target concept; use the sidebar when you are
  exploring an area more broadly.

# Checklist

1. Confirm the query is at least 2 characters long.
2. Check whether a recent-search shortcut already exists.
3. Narrow the result set with tabs or categories when needed.
4. Verify the result type before opening it.
5. Only then jump to the destination route.

# Security

- Admin Search is an authenticated admin surface and should only be used by
  users with `content:read` level access to searchable resources.
- Search can expose cross-surface discovery of content, media, and user data, so
  permissions still matter even when the UI feels lightweight.
- Recent searches are user-level operational history and should be treated as
  workspace context, not public metadata.
