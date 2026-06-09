# TASK-418-07-L01: Targeted Lint Type Tests And Gates
# FileName: TASK-418-07-L01-Targeted-Lint-Type-Tests-And-Gates.md

**Parent Subtask:** TASK-418-07
**Priority:** High
**Category:** QA / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-02, TASK-418-03, TASK-418-04, TASK-418-05, TASK-418-06
**Status:** ⏳ To Do

---

## Overview

Run and record all relevant validation lanes for the completed TASK-418 code
changes. Validation must follow ownership: Vitest for pure/admin UI contracts
and Bun for runtime/route/preview/assistant executor behavior.

---

## Implementation Pseudocode

```ts
async function runTask418Validation() {
  run("bun --cwd core lint");
  run("bun --cwd core lint:types");
  run("bun run test:vitest -- page-editor pageDocumentV2 assistant pages");
  run("set -a && source .env && set +a && bun test <pages-runtime-and-routes>");
  run("bun run gates:coderso");
  recordValidationEvidence({
    lint: "passed",
    types: "passed",
    vitest: "targeted suites passed",
    bun: "targeted runtime suites passed",
    gates: "passed"
  });
}
```

Expected data flow:

- Collect exact commands and results.
- If a broad suite fails for unrelated legacy reasons, isolate targeted suites
  and record the pre-existing failure separately.
- Keep DB-backed tests scoped to fixtures they own.

Error handling:

- If `DATABASE_URL` is unavailable or unreachable, pause DB-backed tests and
  report the blocker.
- Do not claim a lane passed unless the command completed successfully.

Regression-test shape:

- This leaf owns evidence collection rather than a production behavior.

---

## Security Contract

- **Endpoint visibility:** validation must include route boundary coverage for
  any changed route family.
- **Auth model:** validate admin/preview/assistant auth boundaries touched by
  TASK-418.
- **RBAC:** validate existing Pages and assistant permissions.
- **CSRF:** validate internal writes still use existing CSRF protections where
  route tests cover them.
- **Rate-limit bucket:** run relevant route/security suites if buckets changed.
- **Validation:** strict unknown-field rejection must be covered.
- **Anti-abuse controls:** run relevant security/sanitizer tests for embed/form/
  media changes.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest suites for Pages domain/admin UI/assistant.
- Targeted Bun suites for Pages runtime/routes/preview/assistant executor.
- `bun run gates:coderso`

---

## Documentation Updates Required

- TASK-418 completion notes and validation evidence.
