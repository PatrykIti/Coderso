# TASK-220-06-03: Widget Hero and Navigation Editor Async Loaders
# FileName: TASK-220-06-03_Widget_Hero_and_Navigation_Editor_Async_Loaders.md

**Priority:** Medium
**Category:** Widget Editors + Async Loaders
**Estimated Effort:** Medium
**Dependencies:** TASK-220-06
**Status:** To Do

---

## Overview

Fix widget editor async loaders that synchronously set loading/error state in
effects. These are not public exploit surfaces, but repeated editor mounts can
amplify settings/menu reads and cause loading flicker.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/widgets/editors/HeroEditors.tsx | 751 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setPresetsLoading(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/editors/NavigationEditors.tsx | 239 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setIsLoadingMenus(true);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Refactor Hero preset loading to update state from async result/error
  boundaries rather than direct effect setup.
- [ ] Refactor Navigation menu loading the same way.
- [ ] Preserve editor empty/error/ready UI states.

## Files to Change

- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- Existing widget editor Vitest suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal widget editor UI.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing settings/menu read permissions.
- CSRF: no new writes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: avoid repeated menu/preset request storms on editor remount.
- Secret handling: preset/settings reads must not expose privileged values.

## Pseudocode

```ts
useEffect(() => {
  let active = true;
  void loadPresets().then(
    (presets) => active && setPresetState({ status: "ready", presets }),
    (error) => active && setPresetState({ status: "error", error })
  );
  return () => {
    active = false;
  };
}, [loadPresets]);
```

## Testing Requirements

- Hero preset editor shows loading/error/ready states as before.
- Navigation editor menu selector still loads current menus and handles errors.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `HeroEditors.tsx` and `NavigationEditors.tsx` have no
   `set-state-in-effect` findings.
2. Existing editor UX and data contracts are unchanged.
3. Focused widget editor tests cover behavior-sensitive changes.
