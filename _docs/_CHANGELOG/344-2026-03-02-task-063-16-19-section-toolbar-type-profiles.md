# 344 - TASK-063-16-19 section toolbar type profiles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-19

## Key Changes

### Toolbar behavior
- Type dropdown now converts section blocks to paragraph/heading/quote block types, with writing-canvas content preserved during transforms.
- Paragraph and heading toolbar profiles are narrowed to core inline actions plus inline alignment and clear formatting, while list/code groups are hidden.
- Added heading level dropdown for heading blocks and block-type command mapping for type switches.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/block-transforms.test.ts` -> pass.
- `bun test tests/unit/ui/post-richtext-block-transform.test.ts` -> pass.
- `bun test tests/unit/ui/post-richtext-adapter-command-dispatch.test.tsx` -> pass.
- `bun test tests/unit/ui/post-editor-richtext-toolbar-profiles.test.tsx` -> pass.
- `bun test tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` -> pass.
- `bun test tests/integration/ui/post-editor-richtext-command-contract.test.tsx` -> pass.
- `bun test tests/integration/ui/post-editor-toolbar-inspector-dedup.test.tsx` -> pass.
