# 334 - TASK-063-16-09 section heading icons and h6 style

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-09

## Key Changes

### Heading toolbar icons
- Use Heading5/Heading6 icons in the dropdown to match H1-H4 affordances.

### H6 styling
- Removed unintended uppercase/letter-spacing styling for H6 in admin and runtime post content.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` -> pass.
