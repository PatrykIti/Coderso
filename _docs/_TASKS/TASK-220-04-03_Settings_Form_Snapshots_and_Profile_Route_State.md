# TASK-220-04-03: Settings Form Snapshots and Profile Route State
# FileName: TASK-220-04-03_Settings_Form_Snapshots_and_Profile_Route_State.md

**Priority:** High
**Category:** Settings + Route-Derived State
**Estimated Effort:** Large
**Dependencies:** TASK-220-04
**Status:** To Do

---

## Overview

Refactor settings/profile/user pages that copy props or route/search values into
state from effects. Form snapshots should be initialized from loaded values or
reset by explicit load/open transitions, not repaired after render.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/seo/SeoManagerPage.tsx | 119 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedId(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/AssistantSettingsPage.tsx | 91 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(normalizeValues(values));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/GeneralSettingsPage.tsx | 56 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(normalizeValues(values));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/SettingsPage.tsx | 54 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTokenOverrides(tokens);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/settings/SettingsPage.tsx | 58 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm(values);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/site/SiteSettingsPage.tsx | 194 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setStatus("loading");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/site/SiteSettingsPage.tsx | 224 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setForm((prev) => ({` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/themes/ThemesPage.tsx | 121 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `refresh({ force: true }).catch(() => undefined);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/users/UsersRolesPage.tsx | 119 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPendingSelectUserId(userId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/users/UsersRolesPage.tsx | 153 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `void refresh();` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/users/UsersRolesPage.tsx | 175 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedUserId(pendingSelectUserId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/users/UsersRolesPage.tsx | 189 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedRoleId(pendingSelectRoleId);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move settings form normalization into load-result handling or reducer
  initialization.
- [ ] Derive route/search selected ids without post-render `setState` where
  possible.
- [ ] Preserve explicit dirty/edit state when forms are already modified.

## Files to Change

- `core/admin/ui/settings/SettingsPage.tsx`
- `core/admin/ui/settings/AssistantSettingsPage.tsx`
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
- `core/admin/ui/site/SiteSettingsPage.tsx`
- `core/admin/ui/themes/ThemesPage.tsx`
- `core/admin/ui/users/UsersRolesPage.tsx`
- `core/admin/ui/seo/SeoManagerPage.tsx`
- Existing settings/theme/users/SEO Vitest suites under `tests/vitest/ui/**`.

Ownership note: `ThemeEditorPage.tsx` is route/profile bootstrap work owned by
TASK-220-02-01; this leaf owns `ThemesPage.tsx` and settings/profile snapshot
repair only.

## Security Contract

- Visibility: internal admin settings/profile/user surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing settings/theme/user/SEO permissions.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: settings route schemas remain source of truth.
- Anti-abuse: do not expose privileged settings or make client-only RBAC
  decisions.
- Secret handling: keep provider keys, tokens, and secret settings redacted and
  backend-only.

## Pseudocode

```ts
const [formState, dispatch] = useReducer(formReducer, values, initFormState);

useEffect(() => {
  dispatch({ type: "loaded", values });
}, [valuesVersion]);

// If this still trips set-state-in-effect, load values in the async boundary and
// dispatch from the promise resolution instead of from a props-copy effect.
```

## Testing Requirements

- Loaded settings render normalized form values.
- Dirty form edits are not overwritten by unrelated route/search changes.
- Secret fields stay redacted.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` only if secret-handling behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed settings/profile/user files are free of `set-state-in-effect`
   findings.
2. Existing settings save and validation behavior is unchanged.
3. Secret redaction remains covered where touched.
