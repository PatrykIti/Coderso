# 355 - TASK-063-16-23 section formatting regression fixes

Date: 2026-03-05  
Version: Unreleased  
Tasks: TASK-063-16-23

## Key Changes

### Admin UI
- Unified heading level icons (H1–H6) to match the same visual treatment.
- Improved inline-code caret wrapping around whitespace tokens.
- Made inline typography list selection update list items more reliably.
- Clear formatting now removes alignment/font/text-scale attributes.
- Clamped editor settings dialog height with scrollable content.
- Added runtime preview formatting styles to admin CSS for richer preview parity.

### Runtime
- Added strike styling in runtime post content CSS.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
