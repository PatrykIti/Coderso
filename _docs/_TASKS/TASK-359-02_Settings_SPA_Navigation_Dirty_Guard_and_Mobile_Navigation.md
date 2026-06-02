# TASK-359-02: Settings SPA Navigation, Dirty Guard, and Mobile Navigation
# FileName: TASK-359-02_Settings_SPA_Navigation_Dirty_Guard_and_Mobile_Navigation.md

**Priority:** High
**Category:** Admin UI + Settings + Navigation + Dirty State + Mobile UX
**Estimated Effort:** Large
**Dependencies:** TASK-359-01
**Status:** Done (2026-06-02)

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
- Settings screen docs as applicable: `docs/guide/screens/general-settings.md`,
  `docs/guide/screens/site-settings.md`, `docs/guide/screens/security-settings.md`,
  `docs/guide/screens/email-settings.md`, `docs/guide/screens/storage-settings.md`,
  `docs/guide/screens/assistant-settings.md`, and `docs/guide/screens/sessions.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Settings section switches are SPA transitions.
- Dirty Settings drafts cannot be lost silently.
- Mobile users can reach every Settings section.

## Completion Notes

- `SettingsSidebar` now uses `AdminLink` with `prefetch`; Site Settings
  empty-state admin links also use `AdminLink`.
- `AdminRouterContext` supports inert navigation blockers, and Settings
  registers a boolean-only dirty blocker that covers sidebar links, direct
  Settings `AdminLink`, browser Back/Forward, and refresh/close.
- Dirty registration covers General, Assistant, Site, Security, Email,
  Storage, Login Alerts, API key create dialog, webhook drawer, integration
  request/config drawers, and IP allowlist drawer drafts. Secret fields are
  represented only as sentinel dirty values.
- `SettingsShell` exposes mobile Settings navigation below `lg`, and the
  sidebar now includes Sessions, Login Alerts, and IP Allowlist routes.
- Playwright evidence on 2026-06-02 passed with `errors: []`,
  `authMeRequests: 0`, `documentLoadEvents: 0`, no `auth/me` 429, no login
  redirect, dirty cancel/confirm, dirty Back cancel/confirm, and 12 visible
  Settings mobile links.
