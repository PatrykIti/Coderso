# 319 - TASK-063-06 writing canvas appender and smart paste parity

Date: 2026-02-24  
Version: Unreleased  
Tasks: TASK-063-06, TASK-063-06-01, TASK-063-06-02, TASK-063-06-03

## Key Changes

### Inline canvas appender points
- Added in-canvas `Add block` appender points:
  - between blocks,
  - at the end of the document,
  - and for empty-document state (`index=0`).
- Appender options are grouped by block category and reuse the existing block catalog labels/descriptions.

### Unified insert orchestration
- Added shared insert resolver: `resolvePostInsertMutation(...)`.
- Sidebar inserter, slash command, and canvas appender now resolve insertion targets through the same contract:
  - `after-selected`,
  - `after-block`,
  - `index`.
- `postEditorStore` insert mutation now supports explicit `atIndex`.
- Inserted block focus is deterministic via `insertFocusToken` and primary editable markers.

### Smart paste hardening
- Hardened Word heading level fidelity:
  - honors Word outline metadata (`mso-outline-level`, heading style/class metadata) before sanitization,
  - preserves intended heading hierarchy even when source tags are inconsistent.
- Hardened TOC cleanup:
  - still detects full static Word TOC and emits dynamic TOC directive (`replaceWordTocWithDynamicToc`),
  - also strips leftover static `#_Toc...` anchors from retained content when full TOC replacement is not triggered.

### QA
- Added/updated tests:
  - `tests/unit/posts/post-insert-flow.test.ts`,
  - `tests/unit/posts/postEditorStore.test.ts` (`atIndex` coverage),
  - `tests/unit/posts/post-paste-normalizer.test.ts`,
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`,
  - `tests/integration/ui/post-editor-paste-from-word.test.tsx`.
- Quality gates executed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

## Documentation
- Updated `_docs/ARCHITECTURE.md` with TASK-063-06 editor insertion and paste contracts.
- Updated `_docs/CMS_API.md` with insertion parity flow and smart paste hardening details.
- Updated `_docs/CODERSO_MODULES.md` with TASK-063-06 completion notes.
- Updated `_docs/_TASKS/README.md` and TASK-063-06 task/subtask statuses.
