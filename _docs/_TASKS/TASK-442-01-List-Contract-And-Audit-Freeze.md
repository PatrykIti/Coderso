# TASK-442-01: List Contract And Audit Freeze
# FileName: TASK-442-01-List-Contract-And-Audit-Freeze.md

**Parent Task:** TASK-442
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-421, TASK-422
**Status:** 🚧 In Progress
**Started:** 2026-06-11

---

## Overview

Freeze the List-block remediation contract from `_docs/AUDIT/list-2026-06-10.md`,
especially the audited disappearing default-empty list state and the current
`ordered` toggle drift. This subtask is reproduction-first, mirroring
TASK-449-01-L01's "record the first layer that drops the block" contract:
replay editor insert → save → reopen → publish across the write/read/publish
normalizers AND the live admin flow, including the stale-CSRF save-failure +
cache-event rehydration path (`PageEditor.tsx:1520-1554`). The pure schema
layer is verified green at HEAD `ae9dcc44` (an empirical bun round trip
preserves a default empty list), so the contract must point at whichever
layer the reproduction confirms — or record explicitly that the drop no
longer reproduces at HEAD. A failing reproduction is a hard precondition for
the persistence fix in TASK-442-01-L01.

---

## Sub-Tasks

- [ ] TASK-442-01-L01: Empty-list persistence, ordered toggle, and shared
      editing surface.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

---

## Progress Notes

Reproduction executed live on 2026-06-11 (evidence:
`.tmp/phase0/list-repro.md`). The audited empty-list prune is **not
reproducible at HEAD**: the default empty list survives send-time payload,
store, reopen, publish, and renders a real `<ul>` on the front. The data-loss
end state is reachable only through the block-agnostic stale-cache
rehydration dropper recorded by TASK-449-01 and fixed by TASK-449-02
(`PageEditor.tsx` monotonic freshness guard). Schema-layer pins for the list
contract (empty list survives; non-array `items` coerce to `[]`; populated
list round-trips) landed in
`tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`. Remaining
TASK-442-01-L01 scope (ordered-toggle adoption, inline items registration) is
gated on TASK-421/TASK-422, so TASK-442-01 remains open for task-graph
consistency until that direct child is closed or explicitly superseded.
