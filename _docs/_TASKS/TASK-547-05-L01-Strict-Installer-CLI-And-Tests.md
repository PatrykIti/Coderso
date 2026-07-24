# TASK-547-05-L01: Strict Installer CLI and Tests
# FileName: TASK-547-05-L01-Strict-Installer-CLI-And-Tests.md

**Parent Subtask:** TASK-547-05
**Priority:** High
**Category:** Developer Experience / CLI
**Estimated Effort:** Medium
**Dependencies:** TASK-547-04
**Status:** 🚧 In Progress
**Validation:** Fresh CLI and final gates are pending after lifecycle/error
contract remediation.

## Overview

Replace the hard-coded page publisher with strict dry-run/apply/rollback CLI modes
over TASK-547-02.

**Sole-writer ownership (exact):**

- `core/db/client.ts`
- `scripts/load-projekty-domow.tsx`
- `scripts/projekty-domow/fullSiteCli.ts`
- `tests/unit/kits/fullSiteCli.test.ts`

The `core/db/client.ts` change is restricted to the narrow, awaited
`closeDatabase()` lifecycle seam used by the one-shot loader. The loader must
lazy-import the shared database client only after all applicable
CLI/file/package validation and call `closeDatabase()` from `finally` after
apply/dry-run or rollback, on both success and failure. It must not alter pool
configuration, install signal handlers, or become the owner of the
application's general runtime shutdown lifecycle.

## Security Contract

Trusted local CLI; explicit syntactically valid actor UUID in all modes, checked
before any DB call; bounded file read; safe summaries;
no raw package endpoint, first-user fallback, secrets or payload logs.

## Implementation Pseudocode

```ts
type FullSiteCliArgs =
  | {
      mode: "dry-run" | "apply";
      actorId: string;
      file: string;
      allowSettingTakeover: boolean;
    }
  | { mode: "rollback"; actorId: string; sourceRunId: string };

export async function runFullSiteCli(argv, deps) {
  const args = parseFullSiteCliArgs(argv);
  if (args.mode === "rollback") {
    const result = await deps.rollback({
      sourceRunId: args.sourceRunId,
      actorId: args.actorId,
    });
    deps.writeOutput(JSON.stringify({ ok: true, mode: "rollback", runId: result.runId }));
    return;
  }
  const pkg = await deps.readPackage(args.file);
  buildReferencePlan(pkg);
  const result = await deps.apply({
    package: pkg,
    actorId: args.actorId,
    dryRun: args.mode === "dry-run",
    allowSettingTakeover: args.allowSettingTakeover,
  });
  deps.writeOutput(JSON.stringify({ ok: true, mode: args.mode, runId: result.runId }));
}

async rollback(input) {
  const [{ rollbackFullSiteInstall }, { defaultLegacyInstallLedger }, { closeDatabase }] =
    await Promise.all([
      import("../core/services/kits/fullSiteInstall/rollback"),
      import("../core/services/kits/legacyInstallRunPersistence"),
      import("../core/db/client"),
    ]);
  try {
    return await rollbackFullSiteInstall({
      sourceRunId: input.sourceRunId,
      actorId: input.actorId,
      ledger: defaultLegacyInstallLedger,
    });
  } finally {
    await closeDatabase();
  }
}
```

`--allow-setting-takeover` is an explicit operator acknowledgement accepted
only with `--dry-run` or `--apply`. It authorizes takeover solely for the
package allowlist of shell settings, never other resource kinds. Omitting it
keeps existing unmanaged settings fail-closed. Rollback never accepts the flag
and restores the exact pre-apply setting snapshots.

The existing bounded `readPackage` path ends with
`normalizeFullSitePackageForWrite`; `runFullSiteCli` then calls the existing
`buildReferencePlan` export before `deps.apply` acquires its lazy DB modules.
There is no wrapper helper or alternate validation path. Native `desired`
validation remains after reference substitution and before ledger/domain writes.
At the loader boundary rollback invokes the canonical
`rollbackFullSiteInstall({ sourceRunId, actorId, ledger, ... })` export and
retains `closeDatabase()` in `finally`.

Data flow: args → bounded parse → normalize → reference plan before DB →
ledger-backed service → safe output/exit. Stable errors for
args/file/schema/actor/conflict/service failure.

Regression tests: mutually exclusive modes, missing/malformed actor UUID in all
modes fails before a DB dependency is called, oversized/invalid file before DB,
structurally normalized bad-path refs rejected before lazy DB acquisition,
dry-run zero domain writes, exact takeover forwarding and rollback-flag
rejection, canonical `rollbackFullSiteInstall` loader delegation and redaction,
and lazy DB acquisition with the narrow `finally` close lifecycle on import,
service and close success/failure paths.

## Sub-Tasks

- [ ] Add the missing `buildReferencePlan` pre-DB seam in `runFullSiteCli` and
  assert bad-path rejection before `apply`/lazy DB acquisition.
- [ ] Add real bounded-file normalization coverage, exact takeover
  forwarding/rollback rejection, canonical loader rollback delegation, safe
  exits/redaction and `closeDatabase()` success/failure lifecycle assertions.
- [x] Remove `PAGE_ID`, arbitrary user and direct `publishPage`.

## Testing Requirements

`bun test tests/unit/kits/fullSiteCli.test.ts`; core lint/types; line counts.

## Documentation Updates Required

Send exact `<actor-uuid>` commands and semantics for
`docs/develop/full-site-packages.md` to TASK-547-06.
