# TASK-555-01-L03: Docker Runtime Loading Integrity and No Arbitrary Source
# FileName: TASK-555-01-L03-Docker-Runtime-Loading-Integrity-And-No-Arbitrary-Source.md

**Parent Subtask:** TASK-555-01
**Priority:** High
**Category:** Bun Runtime / Docker / Integrity / Security
**Estimated Effort:** Large
**Dependencies:** TASK-555-01-L02 and the unchanged parent workflow/start receipts
**Status:** ⏳ To Do

---

## Overview

Load registered full-site artifacts through one bounded server-only runtime loader,
verify FormaDom during Docker build and startup, and change the trusted local CLI's
default to the runtime artifact. The product runtime accepts only a registry starter
ID. It never accepts or derives a package path, URL, module path, or raw source from
an HTTP/browser payload or environment variable.

The terminal TASK-547 CLI may retain explicit local-operator `--file` support because
it is not an API or product runtime source. That trusted diagnostic seam cannot be
imported by routes and is not a fallback for registry loading.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/services/kits/curatedStarters/runtimeArtifactLoader.ts` (new);
- `core/services/kits/curatedStarters/verifyRuntimeArtifacts.ts` (new);
- `core/server/dockerStart.ts` (startup verification call only);
- `scripts/projekty-domow/fullSiteCli.ts` (default-path constant only);
- `Dockerfile` (build-time artifact verification only);
- `.github/workflows/coderso-pr-gates.yml` only to use the repository release
  baseline `APP_VERSION=1.0.0` for the image boot gate instead of incompatible
  sentinel `0.0.0`;
- `.env.example` only to align `CORE_VERSION=1.0.0` with the shipped root/core
  package and immutable release compatibility range;
- `tests/unit/kits/curatedStarterRuntimeArtifact.test.ts` (new);
- `tests/unit/kits/fullSiteCli.test.ts` (default-path assertions only); and
- `tests/unit/release/curatedStarterPrImageVersion.test.ts` (new);
- `tests/unit/release/curatedStarterExampleEnvVersion.test.ts` (new); and
- `tests/integration/server/curatedStarterStartupArtifact.test.ts` (new).

It does not edit the artifact/manifest/registry bytes or general Docker dependency
pruning/boot logic.

## Dependencies and Land Order

Final TASK-555-01 leaf. It consumes L01/L02 and hands an integrity-verified runtime
resolver to TASK-555-02. Startup verification occurs before migrations, every DB
operation, and production import, and performs no DB query itself.

## Forbidden Paths

- TASK-414/489/545/547/548/551/554 tasks, all foreign
  changelogs/indexes/workflows/smoke, and the read-only tracked TASK-555 bootstrap;
- package/release JSON and generator/registry files owned by L01/L02;
- route/Admin/Setup code, DB schema/migrations, provider/assistant code;
- unrelated Dockerfile regions and owner dirty files.

## Security Contract

- **Endpoint visibility:** no route; server-only loader later backs internal routes.
- **Auth/RBAC/CSRF/rate limit:** not applicable at this layer.
- **Validation:** literal artifact lookup, same-handle bounded regular-file read,
  strict UTF-8/JSON/package normalization, exact byte count/SHA-256, package key,
  release manifest, and running-core SemVer range.
- **Anti-abuse:** no request/env path, URL, glob, directory scan, symlink follow,
  network fallback, nonce, HMAC, or CAPTCHA.
- **Secrets:** errors expose only stable codes/starter ID/release version, never
  absolute paths, file bytes, environment values, or package content.

## Implementation Pseudocode

```ts
const ARTIFACT_LOCATORS = Object.freeze({
  "formadom-studio@1.0.0": new URL(
    "../../../assets/curated-starters/formadom-studio/1.0.0/site-package.json",
    import.meta.url,
  ),
});

async function loadRegisteredFullSitePackage(
  starterId: CuratedStarterId,
): Promise<LoadedCuratedFullSiteRelease> {
  const definition = requireCuratedStarter(starterId);
  if (definition.source.kind !== "full-site-package") {
    throw new Error("curated_starter_provider_mismatch");
  }
  const manifest = definition.releaseManifest;
  assertCoreSatisfies(resolveRunningCoreVersion(), manifest.coreCompatibility);
  const locator = ARTIFACT_LOCATORS[definition.source.releaseKey];
  if (!locator) throw new Error("curated_starter_artifact_invalid");
  const bytes = await readLiteralRegularFileBounded(locator, manifest.artifactBytes + 1);
  assertArtifactIdentity(bytes, manifest);
  const pkg = normalizeFullSitePackageForWrite(parseFatalUtf8Json(bytes));
  buildReferencePlan(pkg);
  assertPackageReleaseIdentity(pkg, manifest);
  return deepFreeze({ definition, manifest, package: pkg });
}

export async function verifyRuntimeCuratedStarterArtifacts(): Promise<void> {
  await getCuratedFullSiteRelease("formadom-studio@1.0.0");
}
```

Export exactly one production-safe server accessor for post-terminal TASK-556:
`getCuratedFullSiteRelease(releaseKey): Promise<Readonly<LoadedCuratedFullSiteRelease>>`.
It performs the complete literal-source verification above and returns a deep-frozen
copy. No sync, mutable, raw-path, request-selected, or bypass accessor is exported.

`resolveRunningCoreVersion` accepts only strict `CORE_VERSION` or the shipped core
package fallback. `CORE_VERSION` can identify the running release but cannot alter
artifact location/range/digest. The reader opens the literal file once, rejects
non-regular/symlink/mutated/truncated/growing sources, caps allocation, decodes fatal
UTF-8, and closes exactly once with primary-error precedence.

`dockerStart.ts` calls verification before migrations and `import("./prod")`. `Dockerfile` runs the
same verifier in the builder/runner filesystem after `core` is copied, so a missing
artifact fails image construction. Existing migration/assistant-doc startup order and
Docker resolve checks remain unchanged.

## Data Flow

Registry ID -> fixed release key -> private literal URL -> bounded bytes ->
manifest/core/digest verification -> strict package/reference validation -> frozen
server package. No DB/network/browser step exists.

## Error Handling

- Missing/non-regular/symlink/read/decode/JSON: `curated_starter_artifact_invalid`.
- Byte/digest/key/schema mismatch: `curated_starter_artifact_integrity_failed`.
- Running core outside range: `curated_starter_core_incompatible`.
- Unknown/provider mismatch: `curated_starter_not_found` or
  `curated_starter_provider_mismatch`.
- Startup/build stops before serving on every integrity error; no fallback path.

## Regression Tests

- Real registered artifact loads and matches exact release/package/fingerprint.
- Unknown ID, legacy provider ID, missing locator, symlink, directory/FIFO, short/
  oversized/growing/rewritten file, malformed UTF-8/JSON, one-byte digest drift,
  wrong package key/schema, and incompatible core all fail before DB/service calls.
- Reader open/stat/read/stat/close ordering and primary-error precedence are pinned.
- Loader API has no path/URL/file/package argument and source contains no env path,
  fetch, glob, scan, or `_docs` fallback.
- Dockerfile copies/verifies the runtime artifact and startup calls verification once
  before migration, DB work, and production import.
- PR image workflow supplies `APP_VERSION=1.0.0`, remains local/nonpublishing, and
  a source test rejects any image-gate version outside the pinned manifest range.
- `.env.example` supplies `CORE_VERSION=1.0.0`; the example environment, root/core
  package versions, Docker build arg, and manifest range pass one compatibility test.
- CLI default is the runtime artifact; explicit trusted `--file` remains CLI-only and
  route modules do not import it.

## Testing Requirements

```bash
bun test tests/unit/kits/curatedStarterRuntimeArtifact.test.ts \
  tests/unit/kits/fullSiteCli.test.ts \
  tests/unit/release/curatedStarterPrImageVersion.test.ts \
  tests/unit/release/curatedStarterExampleEnvVersion.test.ts \
  tests/integration/server/curatedStarterStartupArtifact.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
docker build -t coderso-task555-artifact --build-arg APP_VERSION=1.0.0 -f Dockerfile .
git diff --check
```

If Docker is unavailable, record it as CI-only and do not claim a local build. Run
`wc -l` on all modified human-authored source/test files and fail above 1,000.

## Documentation Updates Required

None here. TASK-555-07-L01 documents the startup/build/CLI distinction before runtime
smoke. TASK-555-07-L03 remains closure metadata only.
