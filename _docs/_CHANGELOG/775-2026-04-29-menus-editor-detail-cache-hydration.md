# 775. Menus editor detail cache hydration

Date: 2026-04-29
Version: 1.0.0
Tasks: Ad hoc Menus editor bug fix

## Key Changes

### CMS Menus/Admin Cache
- Fixed the Menus editor mount policy so a cached pages list no longer keeps a
  newly opened menu detail in foreground loading after `GET /menus/:id`
  succeeds.
- Documented that only the route-selected `menus:detail:<id>` cache can make
  `MenuEditorPage` perform its initial menu detail load in the background.

## Validation

- `bun run test:vitest -- tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/menu-editor-refresh-policy.test.tsx tests/vitest/ui/menu-editor.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
