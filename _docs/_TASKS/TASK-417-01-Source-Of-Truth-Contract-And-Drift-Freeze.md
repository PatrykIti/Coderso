# TASK-417-01: Source Of Truth Contract And Drift Freeze
# FileName: TASK-417-01-Source-Of-Truth-Contract-And-Drift-Freeze.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Pages / Architecture / Documentation
**Estimated Effort:** Large
**Dependencies:** TASK-417
**Status:** ⏳ To Do

---

## Overview

Freeze the Pages v2 source-of-truth before implementation. The current product
docs and route examples still describe Pages v1 `blocks[]`, while the new UX
spec describes section containers, atomic blocks, and responsive cascade. This
subtask makes the contract explicit and reruns read-only audits after every
task-contract correction.

---

## Security Contract

- **Endpoint visibility:** no endpoint behavior changes in this child.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** this child defines the planned v2 reject-unknown validation
  contract for later server work.
- **Anti-abuse controls:** not applicable.

---

## Sub-Tasks

- [ ] TASK-417-01-L01: Page model v2 normative docs.
- [ ] TASK-417-01-L02: Task contract drift audit loop.

---

## Testing Requirements

- `git diff --check`
- Read-only Claude/subagent task drift audits after task/doc contract changes.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/content-and-widgets.md`
