# TASK-359-02: Settings SPA Navigation, Dirty Guard, and Mobile Navigation
# FileName: TASK-359-02_Settings_SPA_Navigation_Dirty_Guard_and_Mobile_Navigation.md

**Priority:** High
**Category:** Admin UI + Settings + Navigation + Dirty State + Mobile UX
**Estimated Effort:** Large
**Dependencies:** TASK-359-01
**Status:** To Do

---

## Overview

Bring Settings navigation in line with the rest of Admin: use canonical SPA
links/prefetch, avoid full document reloads and auth bootstrap bursts, protect
dirty forms, and add mobile section navigation.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `core/admin/ui/settings/SettingsSidebar.tsx`
- `core/admin/ui/layouts/SettingsShell.tsx`
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/settings/**`
- `core/admin/ui/site/SiteSettingsPage.tsx`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/settings/SettingsSidebar.tsx` | Replace raw anchors with `AdminLink`, canonical paths, and prefetch. |
| `core/admin/ui/layouts/SettingsShell.tsx` | Keep layout ownership for dirty guard wiring and mobile section navigation. |
| Settings pages/forms | Expose dirty state and save/discard hooks to shell or shared guard. |
| Admin route helpers | Use `adminPaths`, `AdminLink`, and `prefetchAdminRoute`; no hand-built href matching. |
| Tests | Cover SPA transitions, request budget, dirty cancel/preserve, and mobile navigation. |

## Implementation Pseudocode

```tsx
function SettingsNavLink({ href, children, isDirty }: SettingsNavLinkProps) {
  const { confirmNavigation } = useDirtyNavigationGuard({ isDirty });
  return (
    <AdminLink
      href={href}
      prefetch
      onClick={(event) => {
        if (!confirmNavigation()) event.preventDefault();
      }}
    >
      {children}
    </AdminLink>
  );
}
```

Data flow:

- Settings shell receives the current section, canonical section links, and
  aggregated dirty state from active form context.
- Clicking section links uses SPA navigation and prefetch.
- Dirty navigation opens confirm, preserves draft on cancel, and proceeds only
  after confirm, successful save, or explicit discard.
- Mobile viewport exposes section navigation because the desktop sidebar is
  hidden below `lg`.

Error handling:

- Dirty cancel leaves form draft intact.
- Browser back/refresh uses the same guard where feasible.
- High-risk security changes are not silently auto-saved; they are delegated to
  confirm flows in `TASK-359-05`.
- Quick Settings switching must not turn `auth/me` rate limits into false
  logout/login redirects.

## Security Contract

- Endpoint visibility: none for navigation itself.
- Auth model/RBAC: unchanged; navigation links still respect
  `TASK-359-01` access flags.
- CSRF/rate-limit: unchanged; the change should reduce redundant read requests.
- Reject unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: dirty-state snapshots cannot include secret values in
  cache/debug payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI/Playwright: clicking between Settings sections does not trigger a
  full document reload.
- Request-budget test: transitions do not refetch `auth/me` on every section
  switch or trigger bootstrap 429 false logout.
- Dirty form navigation cancel preserves draft.
- Mobile viewport can navigate to every Settings section.
- Confirm auto-save/manual-save classification is covered for touched forms.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/ADMIN_CACHE.md` if request budget/cache behavior is documented there
- `docs/guide/screens/settings.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Settings section switches are SPA transitions.
- Dirty Settings drafts cannot be lost silently.
- Mobile users can reach every Settings section.
