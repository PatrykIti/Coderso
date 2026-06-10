# 1156 - TASK-418 public runtime block parity

**Date:** 2026-06-10
**Version:** Unreleased
**Tasks:** TASK-418-06-L01

## Key Changes

### Pages Runtime

- Added real static public rendering for Page `gallery` blocks emitted by
  solution-kit conversion. Gallery remains hidden from Page editor and assistant
  insertion until authoring controls and tests ship.
- Replaced the generic public placeholder branch for `collection`, `form`, and
  `embed` with explicit fail-closed inert states. These blocks still do not
  resolve resources, inject raw HTML, expose unsafe URLs, or leak internal ids
  before TASK-418-06-L04.
- Decoupled `runtimeRenderer: "real"` from editor/assistant exposure for
  `gallery` while preserving the invariant that every editor-insertable,
  runtime-insertable, or assistant-emittable Page block has a real renderer.

### QA And Docs

- Added Vitest parity coverage for Page block capabilities and assistant/
  solution-kit emitted Page documents.
- Added Bun public runtime coverage for every currently insertable Page block
  type plus static gallery rendering and inert data-bound states.
- Updated `_docs/PAGE_MODEL.md`, `_docs/CMS_SPEC.md`, TASK-418-06, and
  TASK-418-06-L01 with the corrected runtime capability matrix.
- Pre-implementation audit `019eafab-3bba-7023-9477-3a8870ec8914` found real
  task-contract drift. After the contract correction, the fresh audit found no
  high or medium drift and one low gallery exposure decision; implementation
  kept gallery runtime-real but editor/assistant-gated.
- Post-implementation drift audit
  `019eafab-3bba-7023-9477-3a8870ec8914` found one medium coverage gap around
  direct registered assistant business blueprint pack Page sections. The
  emitter parity test now enumerates `listBusinessBlueprintPacks()` for those
  direct outputs, and the fresh drift audit found no remaining material drift.
- Validation passed: focused Pages capability/renderer Vitest suites, focused
  PageEditor flow Vitest suite, targeted Bun Pages runtime suite,
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
