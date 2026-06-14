# TASK-456-03: Validation Live Submit Smoke And Closure
# FileName: TASK-456-03-Validation-Live-Submit-Smoke-And-Closure.md

**Parent Task:** TASK-456
**Priority:** High
**Category:** Pages / Page Editor V2 / Forms
**Estimated Effort:** Medium
**Dependencies:** TASK-456-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-12

---

## Overview

Close the family: full Vitest lane (incl. updated TASK-452 suites), Bun
pages runtime + existing public form submit suites (env loaded), lint/types/
root tsc, and a live end-to-end: create a form in Forms admin, insert the
form block, pick the form, publish, perform a REAL submit on the front
(nonce/anti-abuse path), verify the submission lands in admin. Docs/board/
changelog sync.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
Live smoke:
1. Forms admin -> create "Contact" (name/email/message), publish.
2. Page editor -> insert Form block -> combobox pick "Contact" -> canvas
   shows disabled preview -> Save + Publish.
3. Front: fill + submit (real nonce flow) -> success state.
4. Admin: submission visible; no console errors anywhere.
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

Closure executed 2026-06-12: lanes green; live end-to-end Contact form submit through the existing nonce path verified on the front with the submission retrievable; Submissions admin surface landed post-smoke (7d975441).
