# TASK-457-02: Registry Controls Capability And Guard Test Update
# FileName: TASK-457-02-Registry-Controls-Capability-And-Guard-Test-Update.md

**Parent Task:** TASK-457
**Priority:** High
**Category:** Pages / Page Editor V2 / Content Types
**Estimated Effort:** Large
**Dependencies:** TASK-457-01
**Status:** ⏳ To Do

---

## Overview

Implement: capability flip (`collection` insertable, reason removed, palette
entry), registry controls (three comboboxes + limit slider through the shared
adapter), canvas preview with fail-closed empty states, deliberate TASK-452
guard-test update to the final frozen catalog. Reuses the TASK-456-02
combobox primitive — do not fork it.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// registry: contentTypeId/queryId/templateId comboboxes (queryId options
// filtered by the chosen contentTypeId; cleared when type changes),
// limit -> slider 1..50 via existing bounded-number upgrade.
// pageDocumentV2: capability flip + palette entry; 452 suites updated.
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
