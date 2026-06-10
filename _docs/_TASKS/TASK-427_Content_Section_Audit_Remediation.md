# TASK-427: Content Section Audit Remediation
# FileName: TASK-427_Content_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-424
**Status:** ⏳ To Do

---

## Overview

Remediate the Content-section findings from
`_docs/AUDIT/content-2026-06-10.md`. The main section-specific bug is that
`variant=compact` persists only as data and produces no published-layout change.
The family also closes the shared dedicated-control drift for this text-led
section.

---

## Sub-Tasks

- [ ] TASK-427-01: Content variant runtime contract and control ownership.
- [ ] TASK-427-01-L01: Implement a real `compact` runtime/layout effect and
      adopt the shared dedicated inspector controls.
- [ ] TASK-427-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for content variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

