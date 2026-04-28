# 314 - TASK-062 posts dynamic table of contents

Date: 2026-02-23  
Version: Unreleased  
Tasks: TASK-062, TASK-062-01, TASK-062-02, TASK-062-03, TASK-062-04

## Key Changes

### Posts editor and runtime
- Added first-class `toc` post block support in editor/runtime contracts.
- Runtime now builds TOC items from live heading index (`heading` blocks + `writing-canvas` heading nodes).
- Added deterministic heading anchor reconciliation with dedupe and custom anchor support.

### Smart paste
- Extended post paste pipeline with Word TOC detection (`#_Toc...` links).
- Static Word TOC fragments are removed from pasted content and replaced by a dynamic TOC directive.
- Editor now ensures a single dynamic TOC block (idempotent behavior, no duplicate TOC blocks).

### QA
- Added unit/integration coverage for:
  - dynamic TOC mapping/rendering,
  - heading anchor stability and custom anchors,
  - Word TOC replacement directives and diagnostics.
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-062 architecture notes.
- Updated `_docs/CMS_API.md` with TOC/anchor/paste-directive contracts.
