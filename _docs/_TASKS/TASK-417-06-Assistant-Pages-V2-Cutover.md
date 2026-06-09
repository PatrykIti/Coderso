# TASK-417-06: Assistant Pages V2 Cutover
# FileName: TASK-417-06-Assistant-Pages-V2-Cutover.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Assistant / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-417-02, TASK-417-03, TASK-417-04, TASK-417-05
**Status:** ⏳ To Do

---

## Overview

Cut assistant page active surfaces, action schemas, blueprints, policy, dry-run,
executor, and diff output from legacy widget `blocks[]` to Pages v2 `sections[]`.
The assistant must not emit Page actions that the v2 public runtime cannot
render.

TASK-414 remains active in the same assistant action/blueprint/executor area.
Before implementing TASK-417-06-L02, rebase against current assistant work and
rerun a read-only drift pass focused on `actionPlanSchema.ts`,
`actionExecutorService.ts`, `actionUndoManifest.ts`, and `blueprints/*`.

---

## Security Contract

- **Endpoint visibility:** assistant admin endpoints remain internal.
- **Auth model:** existing admin session and assistant availability gates.
- **RBAC:** existing assistant and content permissions.
- **CSRF:** existing admin write CSRF behavior for execute routes.
- **Rate-limit bucket:** existing assistant/provider quota and admin buckets.
- **Validation:** assistant action schemas must reject unknown v1 Page block
  payloads for Page actions and normalize v2 sections through the Pages owner.
- **Anti-abuse controls:** provider output remains bounded by action schemas,
  policy gates, redaction, and local executor validation; no public write
  endpoint is introduced.

---

## Sub-Tasks

- [ ] TASK-417-06-L01: Active surface and action schemas sections.
- [ ] TASK-417-06-L02: Blueprint emitters, executor, and policy cutover.

---

## Testing Requirements

- Vitest assistant schema/policy/planner/blueprint tests for v2 Page actions.
- Bun assistant route/executor tests for dry-run/execute persistence and public
  renderability of generated Pages.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- Assistant guide docs under `docs/guide/` if user-facing behavior changes.
