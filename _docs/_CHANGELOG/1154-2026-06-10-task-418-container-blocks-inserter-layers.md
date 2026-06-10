# 1154 - TASK-418 container block inserter and Layers

**Date:** 2026-06-10
**Version:** Unreleased
**Tasks:** TASK-418-05-L02

## Key Changes

### Pages Admin UI

- Added the staged `editorInsertable` capability so the Page editor can offer
  `container`, `columns`, and `group` for draft nested authoring without marking
  those layout blocks product/runtime insertable before L03.
- Added slot-aware Layers editing with section-scoped block paths, nested slot
  rows, explicit slot Add and Move-here controls, bounded same-list moves,
  nested toolbar edits, delete fallback, and recursive duplicate handling.
- Updated whole-section duplication to regenerate nested slot descendant ids so
  copied sections remain valid under the recursive Page document contract.
- Kept public runtime output on safe layout-block placeholders until
  TASK-418-05-L03 implements recursive real rendering and responsive cascade.

### Docs And Validation

- Documented the block-path and staged layout-block authoring contract in
  `_docs/PAGE_MODEL.md`, the Page editor spec, task files, and the audit report.
- Pre-implementation audits
  `019eaf55-2b52-7133-9b8a-3d99f5e40abd` and
  `019eaf5d-cb78-7cf1-817f-07cd8c1352ee` found task-contract drift that was
  corrected before source edits. Fresh audit
  `019eaf63-0302-7833-a76a-8b38fe23e14d` found no material drift before
  implementation.
- Post-implementation drift audit `019eaf7c-8778-7c33-8eee-7718e109a960`
  found no material L02 drift and one low UI edge. Layers Move-here disabled
  state now uses the shared block-path insert-target status helper so too-deep
  selected subtrees are disabled before dispatch, with a focused PageEditor
  regression test. Follow-up drift audit
  `019eaf86-7b73-7de3-a73f-96ccf9e226e5` found no remaining L02 findings.
- Validation passed: focused Pages block-path/capability Vitest suites, focused
  PageEditor flow Vitest suite, combined Pages/PageEditor Vitest regression
  suite, `bun --cwd core lint:types`, `bun --cwd core lint`, and
  `git diff --check`.
