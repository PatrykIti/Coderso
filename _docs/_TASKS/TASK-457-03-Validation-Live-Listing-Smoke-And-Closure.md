# TASK-457-03: Validation Live Listing Smoke And Closure
# FileName: TASK-457-03-Validation-Live-Listing-Smoke-And-Closure.md

**Parent Task:** TASK-457
**Priority:** High
**Category:** Pages / Page Editor V2 / Content Types
**Estimated Effort:** Medium
**Dependencies:** TASK-457-02
**Status:** ⏳ To Do

---

## Overview

Close the family: full Vitest lane (incl. updated TASK-452 suites), Bun
pages runtime + existing collection binding suites (env loaded), lint/types/
root tsc, and a live end-to-end: content type with 3+ published entries,
collection block configured on a page, published front renders the listing
with the chosen template and limit. Docs/board/changelog sync.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
Live smoke:
1. Content type "Services" with 3 published entries.
2. Insert Collection block -> pick type (+ template, limit 2) -> canvas
   preview shows entries -> Save + Publish.
3. Front renders 2 entries with the template; limit respected; dangling
   template removed -> fail-closed state verified.
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
