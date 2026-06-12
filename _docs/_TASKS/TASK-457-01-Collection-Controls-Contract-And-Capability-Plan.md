# TASK-457-01: Collection Controls Contract And Capability Plan
# FileName: TASK-457-01-Collection-Controls-Contract-And-Capability-Plan.md

**Parent Task:** TASK-457
**Priority:** High
**Category:** Pages / Page Editor V2 / Content Types
**Estimated Effort:** Medium
**Dependencies:** TASK-456-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-12

---

## Overview

Freeze the collection-block authoring contract: verify props
(`contentTypeId`, `queryId`, `limit` 1..50, `templateId` per
`pageBlockDefaultProps`/`blockPropJsonSchemaForType`), the runtime
fail-closed shapes for dangling refs (scoped binding from TASK-418-06-L04),
options sources (content types / listing queries filtered by content type /
listing templates via their cached admin clients), canvas preview semantics,
and the TASK-452 amendment values (final frozen catalog). Depends on the
combobox primitive owned by TASK-456-02.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Contract artifacts: props/controls table; optionsSource definitions
// (contentTypes, listingQueries(filterBy contentTypeId), listingTemplates);
// canvas preview = runtime render with published entries, interactivity off;
// TASK-452 final values (16 insertable / 3 gated) documented.
```

---

## Security Contract

- **Endpoint visibility:** no new endpoints (see the parent family contract).
- **Auth model / RBAC / CSRF / rate-limit:** unchanged.
- **Validation:** schema-owned props with reject-unknown preserved.
- **Anti-abuse controls:** existing public pipelines untouched.

---

## Testing Requirements

- Targeted Vitest suites for this leaf.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root `npx tsc -p tsconfig.json --noEmit`.

---

## Documentation Updates Required

- Covered by the parent family closure leaf.

---

## Completion Notes

Completed 2026-06-12: props/clamps and scoped-binding fail-closed shapes verified; options sources and filterBy semantics frozen; final catalog values recorded.
