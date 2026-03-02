# 330 - TASK-063-16-05 section paragraph quote div alias normalization

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-05

## Key Changes

### Section paragraph/quote command stability
- Normalize `div` block wrappers to paragraph semantics during command execution.
- Ensure paragraph command replaces `div` with `p` instead of no-op when aliasing occurs.
- Extend section selection logic to treat `div` as a block tag for command targeting.

### Tests
- Updated unit coverage for block tag normalization.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-command-engine.test.ts` -> pass.
- `bun test tests/integration/ui/post-editor-section-paragraph-quote-nodes.test.tsx` -> pass.
