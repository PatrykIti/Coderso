# TASK-546-01-L01: Upgrade Manifests, CI, Docker, and Lockfile

# FileName: TASK-546-01-L01-Upgrade-Manifests-Ci-Docker-And-Lockfile.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-01
**Priority:** High
**Category:** Toolchain / Dependencies / Supply Chain
**Estimated Effort:** Medium
**Dependencies:** TASK-546 contract audit PASS
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope and exclusive ownership

Upgrade and resolve the complete requested package surface without modifying
production compatibility code. This leaf exclusively owns:

- `package.json` and root `bun.lock`;
- root `bunfig.toml`, including the hoisted workspace linker and dependency
  release-age policy;
- `core/package.json`, `store/package.json`, and `packages/sdk/package.json`;
- `_docs/_PROTOTYPE/package.json` and `_docs/_PROTOTYPE/bun.lock`;
- `Dockerfile`;
- `.github/workflows/coderso-pr-gates.yml` and
  `.github/workflows/release.yml`;
- `tests/unit/release/releaseConfig.test.ts`;
- `tests/unit/release/releaseWorkflowConfig.test.ts`;
- `tests/unit/security/securityGateConfig.test.ts`;
- `tests/unit/toolchain/bunInstallSecurityConfig.test.ts`;
- hardcoded version-contract statements in `_docs/RELEASE_PROCESS.md`,
  `_docs/TESTING_STRATEGY.md`, `_docs/CODERSO_RELEASE_GATES.md`, and
  `docs/develop/getting-started.md`.

Read every owned file fresh before editing. Do not touch `_TMP-pr-feature-tasks-fixes.md`,
TASK-545 files, `_docs/_workflows/**`, task/changelog indexes, production source,
or any unrelated dirty-tree file.

`store/package.json` may remain byte-identical when it has no outdated package.
That inspection is required, but an artificial dependency is forbidden.

Within its already-owned `core/package.json` and `Dockerfile`, this leaf also
owns the exact production-preload activation in `start:prod` and the container
entrypoint. TASK-546-02-L01 exclusively owns the referenced
`core/server/productionReactRuntime.ts` implementation and its focused
regression test; neither leaf may edit the other's side of that seam.

## Selection contract

- Record fresh stable registry metadata immediately before editing and apply the
  parent target matrix unless a newer compatible stable patch is proven.
- Pin Node to `>=26.5.0 <27`, the package manager to `bun@1.3.14`, TypeScript
  exactly to the compatible `6.0.3` line, and ESLint/`@eslint/js` to `9.39.5`.
  Do not force TypeScript 7 or ESLint 10 through incompatible peer ranges.
- Preserve the SDK React peer breadth `^18.0.0 || ^19.0.0`; move app/prototype
  React and React type packages in lockstep.
- Keep secure legacy-major hoists `brace-expansion@1.1.16` and
  `minimatch@3.1.5`; keep compatible-major overrides for `js-yaml`, `undici`,
  and `sigstore` rather than forcing an owner-incompatible major.
- Set the root `fast-uri` override to compatible `3.1.4+`. Never select 4.x
  while Ajv admits only `^3.0.1`.
- Use Bun `1.3.14` in CI and both Docker builder/runner stages. Coderso remains
  Bun-runtime software; Node 26 is the tooling/release compatibility contract.

At authoring, the verified action pins are:

| Action | Stable tag | Full SHA |
|---|---|---|
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | `v7.0.0` | `820762786026740c76f36085b0efc47a31fe5020` |
| `oven-sh/setup-bun` | `v2.2.0` | `0c5077e51419868618aeaa5fe8019c62421857d6` |
| `actions/upload-artifact` | `v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/setup-python` | `v7.0.0` | `5fda3b95a4ea91299a34e894583c3862153e4b97` |
| `actions/create-github-app-token` | `v3.2.0` | `bcd2ba49218906704ab6c1aa796996da409d3eb1` |
| `docker/setup-buildx-action` | `v4.2.0` | `bb05f3f5519dd87d3ba754cc423b652a5edd6d2c` |
| `docker/login-action` | `v4.4.0` | `af1e73f918a031802d376d3c8bbc3fe56130a9b0` |
| `docker/build-push-action` | `v7.3.0` | `53b7df96c91f9c12dcc8a07bcb9ccacbed38856a` |
| `github/codeql-action/upload-sarif` | `v4.37.3` | `e4fba868fa4b1b91e1fdab776edc8cfbe6e9fb81` |
| `aquasecurity/trivy-action` | `v0.36.0` | `ed142fd0673e97e23eac54620cfb913e5ce36c25` |
| `gitleaks/gitleaks-action` | `v3.0.0` | `e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e` |

Re-verify tags and SHAs before applying them. Pin the current stable Semgrep
Python package exactly (`1.170.1` at authoring), not a floating install. Preserve
workflow permissions, cache keys, SARIF uploads, release ordering, and secrets
handling while updating action schemas/comments and the tests that assert them.

## Implementation Pseudocode

```ts
type Candidate = {
  owner: string;
  packageName: string;
  current: string;
  latestStable: string;
  admitted: boolean;
  reason: string;
};

const inventory = readAllOwnedManifestsAndWorkflowPins();
const candidates = queryAuthoritativeStableMetadata(inventory);

for (const candidate of candidates) {
  if (candidate.admitted) {
    updateOwningManifestOrImmutablePin(candidate);
  } else {
    retainHighestAdmittedVersion(candidate.reason);
  }
}

setRootEngines({ node: ">=26.5.0 <27" });
setRootPackageManager("bun@1.3.14");
setAllBunRuntimePins("1.3.14");
updateHardcodedPinTestsAndDocsFromTheSameMatrix();

run("bun install");                 // regenerate root bun.lock once
run("bun install --frozen-lockfile");
assertNoManifestOrRootLockDiffAfterFrozenInstall();

run("bun --cwd _docs/_PROTOTYPE install");
run("bun --cwd _docs/_PROTOTYPE install --frozen-lockfile");
assertNoPrototypeManifestOrLockDiffAfterFrozenInstall();

assertResolved("fast-uri", versionAtLeast("3.1.4"));
assertAbsentFromLocks("fast-uri@3.1.2");
```

If Bun resolution or a peer contract rejects a candidate, stop and record the
owning range. Do not use `--force`, delete an intentional peer constraint,
hand-edit either lockfile, or downgrade a security fix. A newer stable patch is
allowed only with updated evidence and matching tests/docs.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limits/anti-abuse:** no route or
  behavior changes; all existing internal/public, session/API-key, permission,
  CSRF, bucket, nonce/HMAC, and captcha contracts remain unchanged.
- **Validation:** no schema or normalizer changes; strict reject-unknown behavior
  remains intact.
- **Supply chain:** actions are full immutable SHAs with accurate stable-tag
  comments; Semgrep is exact-pinned; lockfiles are generated only by Bun.
- No secret, token, provider credential, raw environment value, allowlist,
  suppression, or scanner exception may enter code, logs, tests, or evidence.
- `bun why fast-uri`, the lockfile text, `bun audit --audit-level high`, and the
  Trivy vulnerability lane must jointly prove both reported HIGH CVEs are gone.

## Direct test shape

Update the three owned configuration suites before changing the asserted pins.
They must require Node `26.5.0`, Bun `1.3.14`, both matching Docker stages,
`packageManager`/engine metadata, immutable 40-hex action refs with current tag
comments, exact Semgrep pinning, and preserved workflow security permissions.
Add an assertion that builder and runner Bun image versions are identical and
that the runtime stage remains non-root. Do not reduce existing workflow or
release assertions to snapshots or mere substring presence when a structural
invariant is available.

## Validation

```bash
node --version
bun --version
bun outdated --recursive
bun pm ls
bun why fast-uri
bun install --frozen-lockfile
bun --cwd _docs/_PROTOTYPE install --frozen-lockfile
(cd _docs/_PROTOTYPE && bun outdated)
(cd _docs/_PROTOTYPE && bun audit --audit-level high)
bun test tests/unit/release/releaseConfig.test.ts \
  tests/unit/release/releaseWorkflowConfig.test.ts \
  tests/unit/security/securityGateConfig.test.ts
bun audit --audit-level high
if rg -n -F 'fast-uri@3.1.2' bun.lock _docs/_PROTOTYPE/bun.lock; then
  echo 'vulnerable fast-uri remains' >&2
  exit 1
fi
git diff --check
```

Run `_docs/_PROTOTYPE` typecheck/build only after L01 has landed, in L02's
compatibility gate. Docker is unavailable in the authoring container: statically
validate both stages here and require the real image build from CI or another
authorized Docker host before claiming it.

## Acceptance criteria

- Root and standalone prototype locks are freshly generated and frozen-stable.
- The selected graph is latest stable admitted by the verified
  peer/engine/owner bounds and the configured seven-day release-age policy;
  fresh quarantined patches are recorded rather than force-installed.
- Node/Bun, CI/action/scanner, Docker, hardcoded tests, and docs agree exactly.
- `fast-uri@3.1.2` is absent and the compatible fixed 3.x version is explained.
- No production compatibility source, TASK-545 workflow, or closure index was
  edited by this leaf.
