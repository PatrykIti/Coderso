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
`normalizeFullSitePackageForWrite` owns package/serialized-size errors unchanged.
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

async function withLoadedDatabase<T>(execute: () => Promise<T>): Promise<T> {
  const { closeDatabase } = await import("../core/db/client");
  try {
    return await execute(); // all remaining lazy imports are inside this try
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
```

`deps.readPackage` is the one-handle bounded reader whose final operation is
`normalizeFullSitePackageForWrite`. `buildReferencePlan(pkg)` must then succeed
before `deps.apply` performs its existing lazy DB imports. Its result is not
forwarded; `ApplyFullSitePackageInput` and `FullSiteCliDeps` expose no structural
plan, and the service builds its own exact private plan. The loader-boundary
rollback callback must invoke the canonical `rollbackFullSiteInstall({
sourceRunId, actorId, ledger, ... })` export at the loader boundary. Existing
`finally`-based `closeDatabase()` handling remains mandatory. After validation,
the loader imports `db/client` first, captures `closeDatabase`, enters `try`, and
only then imports any apply/rollback/ledger/resolver module; a later partial
import failure still closes exactly once.
TASK-547-02 alone owns post-substitution native desired validation before its
run/item/domain writes; this CLI neither duplicates nor weakens that validation.

**Data flow:** strict args → bounded file read/JSON parse →
`normalizeFullSitePackageForWrite` → `buildReferencePlan` → lazy DB acquisition
→ apply/rollback service → safe summary → stable exit code. Native `desired`
validation remains after reference substitution and before `createRun`,
item or domain writes.

**Error handling:** invalid args/schema/file/actor/conflict return non-zero with a
machine-readable code. Do not partially publish a Page or bypass the run ledger.

**Regression-test shape:** flag exclusivity, missing/oversized/invalid JSON,
actor/file/schema validation before DB (including malformed and missing UUID
cases); exact raw 8 MiB/8 MiB+1 boundaries; one open/handle/two-fstat/one-close
ordering; path replacement cannot redirect the opened handle; growth/shrink/
same-size metadata drift, malformed read results, fatal UTF-8 and literal U+FFFD
all fail with the static file code and no payload leakage; JSON syntax and
serialized in-memory overage retain their distinct codes. Also prove dry-run
ledger evidence with zero domain writes, actor requirement in every mode, bad
reference paths rejected before lazy DB acquisition with no graph added to deps,
`allowSettingTakeover` forwarded exactly for dry-run/apply and rejected for
rollback, apply/rollback delegation through the canonical exports, safe stdout
and stable non-zero exits, the absence of any `PACKAGE_LIMITS.fileBytes`
raw-reader use, and the loader's lazy-DB/`finally` close lifecycle, including
each non-DB partial import failure after the closer is captured.

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
