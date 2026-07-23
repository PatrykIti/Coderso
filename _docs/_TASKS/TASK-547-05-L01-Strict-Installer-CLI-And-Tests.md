# TASK-547-05-L01: Strict Installer CLI and Tests
# FileName: TASK-547-05-L01-Strict-Installer-CLI-And-Tests.md

**Parent Subtask:** TASK-547-05
**Priority:** High
**Category:** Developer Experience / CLI
**Estimated Effort:** Medium
**Dependencies:** TASK-547-04
**Status:** ⏳ To Do

## Overview

Replace the hard-coded page publisher with strict dry-run/apply/rollback CLI modes
over TASK-547-02. Own loader, argument parser and `tests/unit/kits/fullSiteCli.test.ts`.

## Security Contract

Trusted local CLI; explicit actor in all modes; bounded file read; safe summaries;
no raw package endpoint, first-user fallback, secrets or payload logs.

## Implementation Pseudocode

```ts
export async function run(argv, deps) {
  const args = parseArgsStrict(argv);
  const actor = requireActor(args);
  if (args.rollback) return report(await deps.rollback(args.rollback, actor));
  const pkg = normalize(await deps.readBoundedJson(args.file));
  return report(await deps.install(pkg, { actor, dryRun: args.dryRun }));
}
```

Data flow: args → bounded parse/normalize before DB → ledger-backed service → safe
output/exit. Stable errors for args/file/schema/actor/conflict/service failure.

Regression tests: mutually exclusive modes, actor all modes, oversized/invalid
file before DB, dry-run zero domain writes, apply/rollback delegation and redaction.

## Sub-Tasks

- [ ] Implement strict CLI and tests.
- [ ] Remove `PAGE_ID`, arbitrary user and direct `publishPage`.

## Testing Requirements

Named Bun CLI/kit tests; core lint/types; line counts.

## Documentation Updates Required

Send exact commands and semantics to TASK-547-06.
