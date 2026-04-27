# TASK-220-02-01: AdminApp Auth, Settings, and Theme Bootstrap Effects
# FileName: TASK-220-02-01_AdminApp_Auth_Settings_and_Theme_Bootstrap_Effects.md

**Priority:** High
**Category:** Admin Bootstrap + React Hooks Compiler
**Estimated Effort:** Medium
**Dependencies:** TASK-220-02
**Status:** To Do

---

## Overview

Refactor global admin bootstrap effects so protected-route auth checks, settings
refreshes, and theme profile route state do not synchronously repair React state
inside effects.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/app/AdminApp.tsx | 711 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setAuthState("checking");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/app/AdminApp.tsx | 727 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refreshSettings();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/shared/AdminThemeSwitcher.tsx | 60 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refreshProfiles();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/themes/ThemeEditorPage.tsx | 92 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setProfileId(resolveProfileId(window.location.pathname));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/themes/ThemeEditorPage.tsx | 130 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void loadProfile(profileId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Replace `setAuthState("checking")` in an effect with a route-derived
  initial/checking state or reducer transition.
- [ ] Ensure `refreshSettings()` starts from an async/subscription boundary and
  does not synchronously mutate state when called from an effect.
- [ ] Derive theme profile route state without an effect-driven initial repair.
- [ ] Keep read-through cache behavior for auth/settings/theme profiles intact.

## Files to Change

- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/themes/ThemeEditorPage.tsx`
- `core/admin/ui/shared/AdminThemeSwitcher.tsx`
- `core/admin/services/authClient.ts` only if call-shape changes are required.
- `core/admin/services/userSettingsClient.ts` only if call-shape changes are required.
- `tests/vitest/admin/apiClient.test.ts`
- `tests/vitest/ui/admin-app*.test.tsx` or nearest existing AdminApp/theme suites.

## Security Contract

- Visibility: internal admin shell.
- Auth model: existing session bootstrap through `/auth/me` and current admin
  API key/session handling.
- RBAC: unchanged.
- CSRF: no writes added.
- Rate-limit bucket: existing admin read/auth bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: do not introduce repeated auth/settings/theme bootstrap calls on
  protected-route transitions.
- Secret handling: no tokens or privileged settings in localStorage/debug output.

## Pseudocode

```ts
const [authState, dispatchAuth] = useReducer(authReducer, route, initAuthState);

useEffect(() => {
  let active = true;
  resolveAuthBootstrap().then((result) => {
    if (!active) return;
    dispatchAuth({ type: "resolved", result });
  });
  return () => {
    active = false;
  };
}, [routeKey]);
```

## Testing Requirements

- Protected route initially shows the correct checking/authenticated/anonymous
  state without an extra render repair.
- Settings refresh still runs only after authentication.
- Theme profile route load still respects canonical route/profile ids.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` only if read-through cache behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `AdminApp.tsx`, `ThemeEditorPage.tsx`, and `AdminThemeSwitcher.tsx` have no
   React Hooks Compiler findings.
2. Auth and settings bootstraps remain deduped.
3. No public route or auth semantics change.
