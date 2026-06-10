# TASK-429: Media Split Section Audit Remediation
# FileName: TASK-429_Media_Split_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediate the Media Split findings from
`_docs/AUDIT/media-split-2026-06-10.md`. The audit proved that section variants
persist only as `data-page-variant` markers with no actual layout effect, while
the Responsive tab remains empty and all intended media/style controls degrade
to native primitives.

---

## Sub-Tasks

- [ ] TASK-429-01: Media Split runtime variant and media-surface contract.
- [ ] TASK-429-01-L01: Implement real `split`/`horizontal` layout behavior and
      adopt dedicated media, toggle, color, and segmented controls.
- [ ] TASK-429-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Media Split variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

