# 750 - TASK-218 Post editor polish

Date: 2026-04-27
Version: Nextless Admin
Tasks: TASK-218

## Key Changes

### Posts Editor

- Moved the post status badge to the global admin topbar and kept the local
  editor back row focused on the current post title.
- Removed the published/draft status text from the primary action cluster next
  to Preview.
- Fixed focus-mode initialization so hidden Outline/Details panels are not
  visually pressed and can be reopened with one click.
- Kept the right inspector on the Post tab by default, expanded the Post
  Advanced section, and removed its toggle control.
- Auto-filled canonical URL from the trusted public post route when available.

### Cache and Runtime

- Added `posts:revisions:<id>` to the admin cache contract and patched cached
  revision lists from autosave, publish, and restore responses.
- Rendered explicit canonical URLs as `<link rel="canonical">` in public entry
  detail HTML.

### Validation

- Added/updated Vitest and Bun coverage for Posts cache, layout state, header
  rendering, inspector behavior, route registration, DB-backed revision/runtime
  publish flows, and public canonical output.
