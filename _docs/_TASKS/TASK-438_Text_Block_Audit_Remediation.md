# TASK-438: Text Block Audit Remediation
# FileName: TASK-438_Text_Block_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422, TASK-424, TASK-451-02
**Status:** ⏳ To Do

---

## Overview

Remediate the Text-block findings from `_docs/AUDIT/text-2026-06-10.md`. The
block renders and persists, but it still lacks dedicated controls and its
toolbar label leaks placeholder copy. The `format:rich` renders-plain claim
comes from the §5 block-table row in
`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` (not from `text-2026-06-10.md`,
which only records Format widget drift); it must be reproduced on HEAD during
the contract freeze before any fix contract is executed. The floating-toolbar
label derivation fix is owned by TASK-451-02-L01; this family only verifies the
`Text tools` fallback after that owner lands.

---

## Sub-Tasks

- [ ] TASK-438-01: Text block content/toolbar/typography contract freeze,
      including reproducing `format:rich` rendering on HEAD.
- [ ] TASK-438-01-L01: Adopt inline-edit and dedicated controls, verify
      toolbar labeling (owned by TASK-451-02-L01), and make `format:rich`
      produce sanitized rich output.
- [ ] TASK-438-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Text block renderer/format coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if text format semantics change
- `_docs/_TASKS/README.md`

