# TASK-547-05: Installer-Backed CLI
# FileName: TASK-547-05-Installer-Backed-CLI-And-Starter-Registration.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Developer Experience / Solution Kits / Setup
**Estimated Effort:** Medium
**Dependencies:** TASK-547-04
**Status:** 🚧 In Progress
**Validation:** Corrective lifecycle/error-contract work and fresh CLI/final
gates are pending.

---

## Overview

Replace the hard-coded single-page publisher with a thin CLI over the full-site
installer. Support validation, dry-run, apply and source-run rollback with safe,
machine-readable summaries. Catalog/onboarding registration is explicitly out of
scope because the existing closed `SolutionKitId` API does not accept this package.

**Sole-writer ownership (exact):**

- `core/db/client.ts`
- `scripts/load-projekty-domow.tsx`
- `scripts/projekty-domow/fullSiteCli.ts`
- `tests/unit/kits/fullSiteCli.test.ts`

The `core/db/client.ts` ownership is limited to the narrow, awaited
`closeDatabase()` lifecycle seam for this one-shot loader. The loader lazily
imports the shared database client only after all applicable CLI/file/package
validation and closes it in `finally` after apply/dry-run or rollback, on both
success and failure, so the process does not retain the pool. This leaf must not
change pool configuration, add signal handlers, or take ownership of the
application's general runtime shutdown lifecycle.

## CLI Contract

```text
bun scripts/load-projekty-domow.tsx --file <path> --dry-run --actor <actor-uuid>
bun scripts/load-projekty-domow.tsx --file <path> --apply --actor <actor-uuid>
bun scripts/load-projekty-domow.tsx --rollback <source-run-id> --actor <actor-uuid>
```

Default `--file` is `_docs/_DEMO/projekty-domow.site.json`. Modes are mutually
exclusive. Dry-run/apply/rollback require an explicit syntactically valid actor
UUID because the installer persists safe run-ledger/audit evidence; no arbitrary
“first user” fallback. Actor UUID, file and schema validation all occur before
DB access. Dry-run performs zero
domain-resource/settings writes but may persist run/item evidence.
`--allow-setting-takeover` is accepted only in dry-run/apply mode, defaults to
`false`, and is forwarded unchanged to `applyFullSitePackage`; rollback rejects
the flag.

## Security Contract

- **Endpoint:** none; trusted local CLI calls the same service boundary.
- **Auth/RBAC/CSRF/rate limit:** n/a for direct CLI, but actor attribution is
  mandatory and audit evidence is identical to service/API installs.
- **Validation:** exact TASK-547-01 parser; unknown keys and unsafe file content
  fail before DB access where possible.
- **Secrets:** never print package content, settings values, credentials or form
  submissions. Summaries contain resource keys, operations and safe error codes.
- Registration remains server-chosen; do not let `/setup/starter-content/apply`
  accept a raw client package.

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

export async function runFullSiteCli(argv: readonly string[], deps: FullSiteCliDeps): Promise<void> {
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
    dryRun: args.mode === "dry-run",
    actorId: args.actorId,
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

`deps.readPackage` is the existing bounded reader whose final operation is
`normalizeFullSitePackageForWrite`. `buildReferencePlan(pkg)` must then succeed
before `deps.apply` performs its existing lazy DB imports. The loader-boundary
rollback callback must invoke the canonical `rollbackFullSiteInstall({
sourceRunId, actorId, ledger, ... })` export at the loader boundary. Existing
`finally`-based `closeDatabase()` handling remains mandatory.

**Data flow:** strict args → bounded file read/JSON parse →
`normalizeFullSitePackageForWrite` → `buildReferencePlan` → lazy DB acquisition
→ apply/rollback service → safe summary → stable exit code. Native `desired`
validation remains after reference substitution and before ledger/domain writes.

**Error handling:** invalid args/schema/file/actor/conflict return non-zero with a
machine-readable code. Do not partially publish a Page or bypass the run ledger.

**Regression-test shape:** flag exclusivity, missing/oversized/invalid JSON,
actor/file/schema validation before DB (including malformed and missing UUID
cases), dry-run ledger evidence with zero domain writes, actor requirement in
every mode, bad reference paths rejected before lazy DB acquisition,
`allowSettingTakeover` forwarded exactly for dry-run/apply and rejected for
rollback, apply/rollback delegation through the canonical exports, safe stdout
and stable non-zero exits, and the loader's lazy-DB/`finally` close lifecycle.

## Sub-Tasks

- [ ] **TASK-547-05-L01** — strict installer CLI, safe output and tests.

## Testing Requirements

- targeted Bun CLI tests
- existing Solution Kit/starter-content route and service suites
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide operator-guide content for
`docs/develop/full-site-packages.md` to TASK-547-06, the sole shared-doc writer.
