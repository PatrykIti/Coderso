# TASK-488-02: Collections CRUD Admin Surface
# FileName: TASK-488-02-Collections-CRUD-Surface.md

**Parent Task:** TASK-488
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Give administrators a first-class path to create / edit / delete commerce
collections. `createCommerceCollection`, `updateCommerceCollection`, and
`deleteCommerceCollection` already exist in `commerceClient.ts` and are routed
in `commerceRoutes.ts` (gated `commerce:write`, CSRF-wrapped), but no admin UI
imports them. Today the product editor's right panel
(`CommerceCollectionsPanel.tsx`) can only *assign* products to pre-existing
collections and instructs the user to create collections via a non-existent
"Commerce API/UI flow".

This subtask builds a collections manager component + draft model (L01) and
wires it into the admin router and navigation entry points (L02), reusing the
existing gated backend contracts only.

## Sub-Tasks

| ID                | Title                                       | Effort | Status     |
| ----------------- | ------------------------------------------- | ------ | ---------- |
| TASK-488-02-L01   | Collections manager component + draft model | Medium | ⏳ To Do   |
| TASK-488-02-L02   | Collections route & navigation entry points | Small  | ⏳ To Do   |

## Dependencies

- None on the backend (routes/client/error-mapping already shipped).
- L02 depends on L01 (the route renders the manager component).

## Testing Requirements

- Vitest lane only.
- L01: render + interaction test for create/edit/delete and slug-conflict error
  surfacing (`tests/vitest/ui-integration/`).
- L02: assert the route resolves and the entry-point buttons navigate
  (`tests/vitest/ui/` or `tests/vitest/ui-integration/`).
- No DB changes; no migration artifacts.
