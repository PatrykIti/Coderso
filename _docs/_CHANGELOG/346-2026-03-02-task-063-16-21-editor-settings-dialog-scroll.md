# 346 - TASK-063-16-21 editor settings dialog scroll

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-21

## Key Changes

### Editor settings dialog
- Clamped the settings dialog height to the viewport and added scrollable content to prevent overflow.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
