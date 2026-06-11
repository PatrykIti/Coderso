# TASK-426-02: Hero Validation Docs And Closure
# FileName: TASK-426-02-Hero-Validation-Docs-And-Closure.md

**Parent Task:** TASK-426
**Priority:** High
**Category:** Pages / Page Editor V2 / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-425, TASK-426-01, TASK-439-01-L01
**Status:** ⏳ To Do

---

## Overview

Close the Hero family with targeted validation, a live browser replay of the
audit expectations, and docs/board/changelog synchronization.

This subtask explicitly consumes the matching responsive-panel closure from `TASK-425` so the audit's empty Responsive-tab finding cannot be dropped from the family.

It also depends on `TASK-439-01-L01`: closure replays the hero-side accent verification (the section emits `--coderso-section-accent` and the published hero button visibly reflects it) only after the TASK-439-owned accent->button binding fix lands, so the two families cannot both implement the same change in `core/services/pages/pageRendererV2.tsx`.

---

## Sub-Tasks

- [ ] Run the targeted validation set and capture final evidence.
- [ ] Synchronize the owned docs, task-board rows, and changelog coverage.
- [ ] Split any residual drift into explicit follow-up tasks before closure if needed.

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Hero runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` Hero smoke.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` entry on completion

