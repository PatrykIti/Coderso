# TASK-053-08: Admin SPA Navigation + Optional Prefetch
# FileName: TASK-053-08_Admin_SPA_Navigation_and_Prefetch.md

**Priority:** High  
**Category:** Admin/UI + Core/Platform  
**Estimated Effort:** Large  
**Dependencies:** TASK-053-07  
**Status:** Planned  

---

## Overview
Reduce the "Loading..." flash between admin screens by switching from full-page reloads
(`window.location.assign` + `<a href>`) to in-app SPA navigation. Add optional
route prefetch to warm caches on hover/intent.

## Goals
- Instant route transitions inside `/admin/*` without full reloads.
- Preserve WordPress-like UX (fast, resilient, no blank screens).
- Keep hard reloads only where required (auth/public, external URLs, plugin activation).
- Add opt-in prefetch on hover/focus to reduce list fetch latency.

## Non‑Goals
- Replace the entire admin with a full router library.
- Client-side code splitting (out of scope for now).

## Scope
1. **Router core**: `path` state, `navigate()`, `prefetch()`, `popstate` handling.
2. **Internal links**: sidebar + primary actions use SPA navigate.
3. **Redirect rules**: keep full reload for auth/public routes.
4. **Optional prefetch**: hover/focus on nav items triggers cache warmup.

---

## Subtasks
- `TASK-053-08-01_Admin_Router_Core.md`
- `TASK-053-08-02_Admin_Links_and_Redirects.md`
- `TASK-053-08-03_Route_Prefetch_Strategy.md`
- `TASK-053-08-04_Tests_and_Docs.md`

---

## Acceptance Criteria
1. Switching between `/admin/pages`, `/admin/widgets`, `/admin/content-types` does **not** reload the page.
2. Auth/public routes still force full reload (login/logout/reset/preview).
3. Optional prefetch warms cache without breaking navigation.
4. No regressions in existing cached screens (menus, widgets, pages).

---

## Documentation Updates Required
- `_docs/ADMIN_NAVIGATION.md` (new)
- `_docs/ADMIN_CACHE.md` (prefetch usage)
- `_docs/ADMIN_CACHE_MAP.md` (route prefetch mapping)
- `_docs/_CHANGELOG/*.md`
