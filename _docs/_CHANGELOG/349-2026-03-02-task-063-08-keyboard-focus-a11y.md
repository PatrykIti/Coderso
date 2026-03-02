# 349 - TASK-063-08 keyboard, focus, and accessibility

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-08, TASK-063-08-01, TASK-063-08-02, TASK-063-08-03

## Key Changes

### Keyboard and focus
- Added a central `usePostEditorShortcuts` registry for inserter/overview/details toggles and Escape close.
- Implemented `useFocusReturn` to restore focus to the originating toolbar toggles.
- Wired the block inserter sidebar into the editor shell with consistent focus handling.

### Accessibility
- Added region landmarks and aria labels for editor header/content/sidebars.
- Toolbar actions now expose `aria-keyshortcuts` and shortcut hints.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
