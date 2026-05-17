# TASK-275-05: Navigation Optional Style and Product Controls

# FileName: TASK-275-05_Navigation_Optional_Style_and_Product_Controls.md

**Priority:** Medium
**Category:** Widgets + Navigation + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-02, TASK-256-04, TASK-275, TASK-275-01, TASK-275-02, TASK-275-03
**Status:** To Do

---

## Overview

Parent task for lower-priority Navigation-owned visual and product controls from
the report. Implementation is intentionally split into physical child leaves so
each pass remains execution-ready and reviewable:

- TASK-275-05-01 owns `collapseOnScroll` runtime behavior.
- TASK-275-05-02 owns active-link highlighting and safe target/rel controls.
- TASK-275-05-03 owns visual tokens, dropdown direction, and bounded motion.
- TASK-275-05-04 owns logo size, CTA shape/separation, and secondary-CTA policy.

Do not implement this parent directly. Child tasks must avoid shared TASK-256
scope and must not patch Section/page-shell sticky blockers.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:74-78` - `collapseOnScroll`
  persists only a data attribute. Current widget docs also describe this as v1
  behavior, so this is a Navigation product-contract expansion.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:97-123` - hover/active state,
  second CTA, CTA radius, logo size, and CTA separator controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:127-161` - letter spacing,
  shadow, backdrop blur, dropdown animation/direction, target/rel, active
  highlighting, and mobile animation controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:201,226-235` - active state and
  visual market-standard gaps.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:403-407,431-442,452-455` -
  prioritized P0/P3 backlog rows.

## Sub-Tasks

- [ ] TASK-275-05-01: Navigation Collapse Runtime Contract
- [ ] TASK-275-05-02: Navigation Active Links and Safe Targets
- [ ] TASK-275-05-03: Navigation Visual Style Tokens
- [ ] TASK-275-05-04: Navigation Brand CTA and Logo Controls

## Files to Change

| File | Parent responsibility |
|---|---|
| `TASK-275-05-01_Navigation_Collapse_Runtime_Contract.md` | Owns the executable collapse runtime slice and sticky-routing boundary. |
| `TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md` | Owns active-link and target/rel executable slice. |
| `TASK-275-05-03_Navigation_Visual_Style_Tokens.md` | Owns visual-token, dropdown-direction, and motion executable slice. |
| `TASK-275-05-04_Navigation_Brand_CTA_and_Logo_Controls.md` | Owns brand/action executable slice and secondary-CTA policy. |
| `_docs/_TASKS/README.md` | Tracks the parent and four child leaves as separate To Do rows until implementation starts. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Closure leaf records fixed/deferred/routed evidence after child tasks land. |

## Implementation Pseudocode

```md
For each TASK-275-05 child:

1. Confirm the report row is Navigation-owned and not TASK-256/shared scope.
2. Add schema/default/normalizer/editor/runtime changes only in the child-owned
   file set.
3. Add focused renderer/editor/validator tests for the new persisted contract.
4. Update `_docs/_WIDGETS/NAVIGATION.md` and the Playwright report row.
5. Record validation in the child task and keep TASK-275-05 as parent tracking.
```

Error handling:

- If a child implementation needs shared helpers or page-shell ownership, stop
  and route the row to TASK-256/shared physical task ownership instead of
  widening TASK-275.
- Do not serialize empty-string sentinels, raw class names, raw CSS blocks, or
  unsafe link targets from child tasks.
- Keep all new behavior backward-compatible through normalizers unless a child
  task documents and tests a migration.

## Data Flow

1. TASK-275-05 tracks report rows from the optional backlog and assigns each row
   to one physical child task.
2. Child leaves define the concrete editor input, schema/default/normalizer
   shape, renderer/runtime output, tests, docs, and report evidence.
3. TASK-275-06 reads child results and updates final report/changelog/board
   state after validation is complete.
4. Shared live-preview, sticky Section/page-shell, sanitizer, or generic
   contrast rows bypass TASK-275 child implementation and remain routed to
   exact shared physical owners.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: every new persisted field must be included in
  `navigationSchema` with `additionalProperties: false`.
- Anti-abuse: style fields must be tokenized or validated CSS color values only.
  No raw class names, raw CSS blocks, raw HTML, script, or unsafe link targets.
  Runtime script must not interpolate user-authored strings.

## Testing Requirements

- Parent planning/doc changes:
  - `git diff --check`
  - `bun run precommit`
- Child implementation leaves must run their own focused commands plus:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run scan:security:strict`
  - `bun run precommit`
  - `bun run gates:coderso` when the child changes public runtime output,
    interactive behavior, accessibility, security, performance, or reliability
    contract.

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05_Navigation_Optional_Style_and_Product_Controls.md`
- `_docs/_TASKS/TASK-275-05-01_Navigation_Collapse_Runtime_Contract.md`
- `_docs/_TASKS/TASK-275-05-02_Navigation_Active_Links_and_Safe_Targets.md`
- `_docs/_TASKS/TASK-275-05-03_Navigation_Visual_Style_Tokens.md`
- `_docs/_TASKS/TASK-275-05-04_Navigation_Brand_CTA_and_Logo_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- TASK-275-05 is a parent only and has no direct code implementation scope.
- Every optional Navigation-owned visual/product report row is assigned to a
  physical child task or deferred/routed with a reason.
- Child leaves are execution-ready and include files, pseudocode, data flow,
  error handling, tests, docs, and security boundaries.
- Sticky frontend failures from Section/page-shell overflow are not claimed by
  this parent or any child.
