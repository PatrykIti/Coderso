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
before any DB call; one-handle bounded file read; safe summaries;
no raw package endpoint, first-user fallback, secrets or payload logs.

Exported `FULL_SITE_PACKAGE_RAW_SOURCE_BYTES` is exactly 8 MiB of raw file data. It is not
TASK-547-01's serialized in-memory JSON limit: raw open/stat/read/integrity/
UTF-8 failures are `site_package_file_invalid`, JSON syntax is
`site_package_json_invalid`, and package normalization preserves
`site_package_too_large|site_package_too_complex|site_package_invalid`. Replace the existing
raw-reader use of permanent serialized-object `PACKAGE_LIMITS.fileBytes` with
this distinctly named constant. The file reader may not consume the package
normalizer's cap; equal numeric values do not couple the boundaries/error codes,
and no alias or cross-owner cleanup is introduced.

Production and tests use one typed file-handle factory. The reader performs
exactly: one read-only `open(path)`; first `handle.stat({ bigint:true })`;
positional handle reads bounded by cap+1; second handle stat; fatal UTF-8 decode;
JSON parse; package normalize; one `handle.close()` in `finally`. It performs no
path `stat`, `readFile` or reopen. Both stats must be regular and identical in
`dev/ino/size/mtimeNs/ctimeNs`, and final size must equal bytes read. Initial or
observed oversize, growth/shrink/rewrite, malformed read metadata, malformed
UTF-8, decoded U+FFFD and close failure use only the static file code; a path
replacement cannot redirect the already-open handle. Positive short reads
continue, zero ends the loop, and total allocation/read is at most cap+1.

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

export async function runFullSiteCli(
  argv: readonly string[],
  deps: FullSiteCliDeps,
): Promise<void> {
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
  buildReferencePlan(pkg); // validate/discard before deps.apply lazy imports
  const result = await deps.apply({
    package: pkg,
    actorId: args.actorId,
    dryRun: args.mode === "dry-run",
    allowSettingTakeover: args.allowSettingTakeover,
  });
  deps.writeOutput(JSON.stringify({ ok: true, mode: args.mode, runId: result.runId }));
}

async function withLoadedDatabase<T>(execute: () => Promise<T>): Promise<T> {
  const { closeDatabase } = await import("../core/db/client");
  try {
    return await execute();
  } finally {
    await closeDatabase();
  }
}

async apply(input) {
  return withLoadedDatabase(async () => {
    const [{ applyFullSitePackage }, { defaultLegacyInstallLedger }, resolver] =
      await Promise.all([
        import("../core/services/kits/fullSiteInstall/execute"),
        import("../core/services/kits/legacyInstallRunPersistence"),
        import("../core/services/kits/fullSiteInstall/currentResourceResolver"),
      ]);
    return applyFullSitePackage(input, {
      ledger: defaultLegacyInstallLedger,
      resolveCurrentResource: resolver.createFullSiteCurrentResourceResolver(
        input.package.key,
        defaultLegacyInstallLedger,
      ),
    });
  });
}

async rollback(input) {
  return withLoadedDatabase(async () => {
    const [{ rollbackFullSiteInstall }, { defaultLegacyInstallLedger }] =
      await Promise.all([
        import("../core/services/kits/fullSiteInstall/rollback"),
        import("../core/services/kits/legacyInstallRunPersistence"),
      ]);
    return rollbackFullSiteInstall({
      sourceRunId: input.sourceRunId,
      actorId: input.actorId,
      ledger: defaultLegacyInstallLedger,
    });
  });
}

async function readBoundedFullSitePackage(path, fileDeps = DEFAULT_FILE_DEPS) {
  const handle = await openFileOrThrowSafe(fileDeps, path, "r");
  try {
    const before = await handleStatOrThrowSafe(handle);
    assertRegularAndInitiallyBounded(before, FULL_SITE_PACKAGE_RAW_SOURCE_BYTES);
    const bytes = await readAtMostOrThrowSafe(handle, FULL_SITE_PACKAGE_RAW_SOURCE_BYTES + 1);
    if (bytes.byteLength > FULL_SITE_PACKAGE_RAW_SOURCE_BYTES) throw fileInvalid();
    const after = await handleStatOrThrowSafe(handle);
    assertStableSameHandleFile(before, after, bytes.byteLength);
    const source = decodeFatalUtf8OrThrowFileInvalid(bytes);
    if (source.includes("\uFFFD")) throw fileInvalid();
    return normalizeFullSitePackageForWrite(parseJsonOrThrowJsonInvalid(source));
  } finally {
    await closeHandleOrThrowFileInvalid(handle);
  }
}
```

`--allow-setting-takeover` is an explicit operator acknowledgement accepted
only with `--dry-run` or `--apply`. It authorizes takeover solely for the
package allowlist of shell settings, never other resource kinds. Omitting it
keeps existing unmanaged settings fail-closed. Rollback never accepts the flag
and restores the exact pre-apply setting snapshots.

The one-handle `readPackage` path ends with
`normalizeFullSitePackageForWrite`; `runFullSiteCli` then calls the existing
`buildReferencePlan` export before `deps.apply` acquires its lazy DB modules.
It discards the result: no `referencePlan`/graph is added to `FullSiteCliDeps`,
its apply input or public service input. TASK-547-02 independently builds and
closes over its private plan; post-substitution native `desired` validation is
owned there before `createRun`, item or domain writes.
At the loader boundary rollback invokes the canonical
`rollbackFullSiteInstall({ sourceRunId, actorId, ledger, ... })` export and
retains `closeDatabase()` in `finally`. After validation, import `db/client`
first and capture its closer before entering the `try` that imports every other
apply/rollback dependency, so any later partial import failure closes once.

Data flow: args → bounded parse → normalize → reference plan before DB →
ledger-backed service → safe output/exit. Stable errors for
args/file/schema/actor/conflict/service failure.

Regression tests: mutually exclusive modes, missing/malformed actor UUID in all
modes fails before a DB dependency is called; exact raw 8 MiB acceptance and
8 MiB+1 rejection; one-open/two-handle-stat/bounded-read/one-close call order;
path swap reads only the opened handle; growth, shrink, same-size metadata
rewrite and malformed read metadata reject; fatal UTF-8 and encoded U+FFFD reject
without replacement; open/stat/read/integrity/decode/close failures expose only
`site_package_file_invalid`; JSON syntax stays `site_package_json_invalid` and
serialized-object overage stays `site_package_too_large`. Structurally normalized
bad-path refs reject before lazy DB acquisition and no structural plan enters deps;
dry-run zero domain writes, exact takeover forwarding and rollback-flag
rejection, canonical `rollbackFullSiteInstall` loader delegation and redaction,
no `PACKAGE_LIMITS.fileBytes` raw-file-cap read, and lazy DB acquisition with the narrow
`finally` close lifecycle on import, service and close success/failure paths,
including each non-DB import failing after the closer is captured.

## Sub-Tasks

- [ ] Add the missing `buildReferencePlan` pre-DB seam, discard its result and
  assert bad-path rejection before `apply`/lazy DB acquisition with no plan dep.
- [ ] First decouple the raw cap from serialized-object `PACKAGE_LIMITS.fileBytes`,
  then replace the path-stat/read race with the exact one-handle reader and its
  cap/race/UTF-8/static-error matrix; add exact takeover
  forwarding/rollback rejection, canonical loader rollback delegation, safe
  exits/redaction and `closeDatabase()` success/failure lifecycle assertions.
- [x] Remove `PAGE_ID`, arbitrary user and direct `publishPage`.

## Testing Requirements

`bun test tests/unit/kits/fullSiteCli.test.ts`; core lint/types; line counts.

## Documentation Updates Required

Send exact `<actor-uuid>` commands and semantics for
`docs/develop/full-site-packages.md` to TASK-547-06.
