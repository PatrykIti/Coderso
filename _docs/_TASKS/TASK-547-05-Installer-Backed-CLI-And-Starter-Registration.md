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
The historical `Starter-Registration` filename slug is retained only for stable
task numbering and links; it does not restore registration to scope.

**Sole-writer ownership (exact):**

- `core/db/client.ts`
- `scripts/load-projekty-domow.tsx`
- `scripts/projekty-domow/fullSiteCli.ts`
- `tests/unit/kits/fullSiteCli.test.ts`

The `core/db/client.ts` ownership is limited to the narrow, awaited
`closeDatabase()` lifecycle seam for this one-shot loader. The loader lazily
imports the shared database client only after all applicable CLI/file/package
validation and closes it exactly once after apply/dry-run or rollback. Explicit
outcome arbitration preserves the primary error if execute and close both fail,
so the process does not retain the pool or mask a safe service code. This leaf
must not change pool configuration, add signal handlers, or take ownership of
the application's general runtime shutdown lifecycle.

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

## Raw-File Boundary

The CLI owns
`export const FULL_SITE_PACKAGE_RAW_SOURCE_BYTES = 8 * 1024 * 1024`. This is the raw on-disk
byte cap and every open/stat/read/integrity/UTF-8 failure maps to the static
`site_package_file_invalid`. It is independent of TASK-547-01's permanently
named `PACKAGE_LIMITS.fileBytes`, which caps serialized in-memory JSON and
returns `site_package_too_large`. The raw reader must not consume that package
limit; its distinctly named local constant is the sole file-read source. The
equal numeric values do not couple their measurement subjects or error codes.

`readBoundedFullSitePackage` opens the path exactly once with read-only mode and
uses only that returned handle: first `handle.stat({ bigint:true })`, bounded
positional reads of at most cap+1 bytes, second handle stat, then one close in
`finally`. It never calls path-based `stat`/`readFile`, never reopens, and never
allocates or reads beyond cap+1. Both stats must describe a regular file with
the same `dev`, `ino`, `size`, `mtimeNs` and `ctimeNs`; final size must equal the
actual byte count. A path swap after open therefore cannot redirect the read,
and growth, shrink or rewrite during the read fails closed. Positive short reads
continue; a zero read ends the loop. Initial/observed oversize, invalid read
metadata, byte-count/stat mismatch, second-stat drift and close failure all use
`site_package_file_invalid`.

Decode only after the second stat with
`new TextDecoder("utf-8", { fatal:true })`; reject both malformed UTF-8 and a
decoded U+FFFD replacement character as `site_package_file_invalid`. Only a
stable decoded file reaches `JSON.parse`: syntax failure is
`site_package_json_invalid`, then
`normalizeFullSitePackageForWrite` preserves `site_package_invalid`,
`site_package_too_large`, `site_package_too_complex` and
`site_package_setting_forbidden` unchanged.
A narrow injected handle factory used by tests must be the same factory seam as
production, not an alternate reader.

## Security Contract

- **Endpoint:** none; trusted local CLI calls the same service boundary.
- **Auth/RBAC/CSRF/rate limit:** n/a for direct CLI, but actor attribution is
  mandatory and audit evidence is identical to service/API installs.
- **Validation:** actor plus the exact TASK-547-01 parser/graph checks finish
  before any applicable lazy DB import or access; unknown keys and unsafe file
  content fail closed.
- **Secrets:** never print package content, settings values, credentials or form
  submissions. Summaries contain resource keys, operations and safe error codes.
- Registration remains server-chosen; do not let `/setup/starter-content/apply`
  accept a raw client package.

## Loader Composition and Failure Precedence

`scripts/load-projekty-domow.tsx` must be side-effect-free when imported. It
exports a typed `FullSiteLoaderImporter` over the closed keys
`database|apply|ledger|resolver|rollback`,
`createFullSiteLoaderDeps(importModule, sinks)` and
`runLoadProjektyDomowMain(argv,deps):Promise<number>`. The production importer is
the sole dynamic-import implementation; tests inject that same importer seam to
fail each key deterministically. Only an `if (import.meta.main)` guard invokes
main and assigns its returned `0|1` to `process.exitCode`.

The loader imports `database` first and captures `closeDatabase`; all other
module imports occur inside the protected execute callback. Freeze the outcome
matrix: execute success + close success returns the service result; execute
failure + close success rethrows the original service/import error; execute
success + close failure throws a fresh cause-free
`site_package_cli_failed`; execute failure + close failure still rethrows the
original primary error and never leaks the close error. Once captured, close is
called exactly once. A database-module import failure has no closer to call and
is safely mapped by main.

## Implementation Pseudocode

```ts
type FullSiteLoaderModules = {
  database: { closeDatabase(): Promise<void> };
  apply: { applyFullSitePackage: typeof applyFullSitePackage };
  ledger: { defaultLegacyInstallLedger: FullSiteInstallLedgerPort };
  resolver: { createFullSiteCurrentResourceResolver: typeof createFullSiteCurrentResourceResolver };
  rollback: { rollbackFullSiteInstall: typeof rollbackFullSiteInstall };
};
export type FullSiteLoaderImporter = <K extends keyof FullSiteLoaderModules>(
  key: K,
) => Promise<FullSiteLoaderModules[K]>;
type FullSiteLoaderModuleFactories = {
  [K in keyof FullSiteLoaderModules]: () => Promise<FullSiteLoaderModules[K]>;
};
type FullSiteLoaderSinks = Readonly<{
  readPackage: FullSiteCliDeps["readPackage"];
  writeOutput: FullSiteCliDeps["writeOutput"];
  writeError(line: string): void;
}>;
type FullSiteLoaderDeps = FullSiteCliDeps &
  Readonly<{ writeError(line: string): void }>;

function createTypedImporter(
  factories: FullSiteLoaderModuleFactories,
): FullSiteLoaderImporter {
  return <K extends keyof FullSiteLoaderModules>(key: K) => factories[key]();
}

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
  buildReferencePlan(pkg); // validate and discard; never add a plan to CLI deps
  const result = await deps.apply({
    package: pkg,
    dryRun: args.mode === "dry-run",
    actorId: args.actorId,
    allowSettingTakeover: args.allowSettingTakeover,
  });
  deps.writeOutput(JSON.stringify({ ok: true, mode: args.mode, runId: result.runId }));
}

async function readBoundedFullSitePackage(path, fileDeps = DEFAULT_FILE_DEPS) {
  const handle = await openFileOrThrowSafe(fileDeps, path, "r"); // one path open
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

async function withLoadedDatabase<T>(
  importModule: FullSiteLoaderImporter,
  execute: () => Promise<T>,
): Promise<T> {
  const { closeDatabase } = await importModule("database");
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: await execute() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  try {
    await closeDatabase();
  } catch {
    if (outcome.ok) throw new Error("site_package_cli_failed");
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

async function applyWithImports(
  input: Parameters<FullSiteCliDeps["apply"]>[0],
  importModule: FullSiteLoaderImporter,
) {
  return withLoadedDatabase(importModule, async () => {
    const [{ applyFullSitePackage }, { defaultLegacyInstallLedger }, resolver] =
      await Promise.all([
        importModule("apply"),
        importModule("ledger"),
        importModule("resolver"),
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

async function rollbackWithImports(
  input: Parameters<FullSiteCliDeps["rollback"]>[0],
  importModule: FullSiteLoaderImporter,
) {
  return withLoadedDatabase(importModule, async () => {
    const [{ rollbackFullSiteInstall }, { defaultLegacyInstallLedger }] =
      await Promise.all([
        importModule("rollback"),
        importModule("ledger"),
      ]);
    return rollbackFullSiteInstall({
      sourceRunId: input.sourceRunId,
      actorId: input.actorId,
      ledger: defaultLegacyInstallLedger,
    });
  });
}

export function createFullSiteLoaderDeps(
  importModule: FullSiteLoaderImporter,
  sinks: FullSiteLoaderSinks,
): FullSiteLoaderDeps {
  return {
    ...sinks,
    apply: (input) => applyWithImports(input, importModule),
    rollback: (input) => rollbackWithImports(input, importModule),
  };
}

export async function runLoadProjektyDomowMain(
  argv: readonly string[],
  deps: FullSiteLoaderDeps,
): Promise<number> {
  try {
    await runFullSiteCli(argv, deps);
    return 0;
  } catch (error) {
    deps.writeError(JSON.stringify(safeCliError(error)));
    return 1;
  }
}

const PRODUCTION_IMPORTER = createTypedImporter({
  database: () => import("../core/db/client"),
  apply: () => import("../core/services/kits/fullSiteInstall/execute"),
  ledger: () => import("../core/services/kits/legacyInstallRunPersistence"),
  resolver: () => import("../core/services/kits/fullSiteInstall/currentResourceResolver"),
  rollback: () => import("../core/services/kits/fullSiteInstall/rollback"),
});
const PRODUCTION_SINKS: FullSiteLoaderSinks = {
  readPackage: readBoundedFullSitePackage,
  writeOutput: (line) => console.log(line),
  writeError: (line) => console.error(line),
};

if (import.meta.main) {
  const deps = createFullSiteLoaderDeps(PRODUCTION_IMPORTER, PRODUCTION_SINKS);
  process.exitCode = await runLoadProjektyDomowMain(process.argv.slice(2), deps);
}
```

`deps.readPackage` is the one-handle bounded reader whose final operation is
`normalizeFullSitePackageForWrite`. `buildReferencePlan(pkg)` must then succeed
before `deps.apply` performs its existing lazy DB imports. Its result is not
forwarded; `ApplyFullSitePackageInput` and `FullSiteCliDeps` expose no structural
plan, and the service builds its own exact private plan. The loader-boundary
rollback callback must invoke the canonical `rollbackFullSiteInstall({
sourceRunId, actorId, ledger, ... })` export at the loader boundary. After
validation, the typed importer captures `closeDatabase` first; only then may its
protected callback import apply/rollback/ledger/resolver. Every partial import
failure follows the frozen primary/close precedence matrix above.
TASK-547-02 alone owns post-substitution native desired validation before its
run/item/domain writes; this CLI neither duplicates nor weakens that validation.

**Data flow:** dry-run/apply use strict args → bounded file read/JSON parse →
`normalizeFullSitePackageForWrite` → `buildReferencePlan` → lazy DB acquisition
→ apply service → safe summary → stable exit code. Rollback uses strict args →
lazy DB acquisition → canonical rollback service → safe summary → stable exit
code, with zero package read or graph build. Native `desired` validation remains
after reference substitution and before `createRun`, item or domain writes.

**Error handling:** invalid args/schema/file/actor/conflict return non-zero with a
machine-readable code. Do not partially publish a Page or bypass the run ledger.

**Regression-test shape:** flag exclusivity, missing/oversized/invalid JSON,
actor/file/schema validation before DB (including malformed and missing UUID
cases); exact raw 8 MiB/8 MiB+1 boundaries; one open/handle/two-fstat/one-close
ordering; path replacement cannot redirect the opened handle; growth/shrink/
same-size metadata drift, malformed read results, fatal UTF-8 and literal U+FFFD
all fail with the static file code and no payload leakage; JSON syntax and
serialized in-memory overage retain their distinct codes. A forbidden setting
retains `site_package_setting_forbidden` through `readBoundedFullSitePackage`,
`runFullSiteCli` and `safeCliError`, with its key/value sentinel absent. Also prove dry-run
ledger evidence with zero domain writes, actor requirement in every mode, bad
reference paths rejected before lazy DB acquisition with no graph added to deps,
`allowSettingTakeover` forwarded exactly for dry-run/apply and rejected for
rollback, apply/rollback delegation through the canonical exports, safe stdout
and stable non-zero exits. The CLI suite proves one graph build after its one
reader normalization and before `deps.apply` for dry-run/apply, zero graph builds
for rollback, and does not assert service internals; 02-L02 owns the independent
service build. Also prove the absence of any `PACKAGE_LIMITS.fileBytes`
raw-reader use, side-effect-free loader import/`import.meta.main` guarding, every
typed module-import failure, and all four execute×close outcomes with exact
primary-error precedence and one close after capture.

## Sub-Tasks

- [ ] **TASK-547-05-L01** — strict installer CLI, safe output and tests.

## Testing Requirements

- `bun test tests/unit/kits/fullSiteCli.test.ts`
- `bun test tests/unit/kits/solutionKitsService.test.ts tests/integration/routes/solutionKitsRoutes.test.ts tests/integration/routes/setupStarterContent.test.ts tests/integration/routes/starterContent.test.ts`
- `bun run lint:repo:types` (root lane owns `scripts/**/*.ts{x}` and CLI tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide operator-guide content to TASK-547-06, the sole shared-doc writer:
commands/actors plus two independent 8 MiB limits. Document raw on-disk bytes as
`FULL_SITE_PACKAGE_RAW_SOURCE_BYTES`/`site_package_file_invalid` and serialized
in-memory JSON as historic `PACKAGE_LIMITS.fileBytes`/`site_package_too_large`;
equal numbers do not share a measurement, constant or error contract.
