# TASK-546-02-L01: Fix Node 26 and Dependency Regressions

# FileName: TASK-546-02-L01-Fix-Node-26-And-Dependency-Regressions.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-02
**Priority:** High
**Category:** Compatibility / Build / Regression Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-546-01-L01
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope and conditional ownership

Read the landed manifests and locks fresh. Run compatibility probes and make
the smallest source/config/test repairs required by Node `26.5.0`, Bun `1.3.14`,
TypeScript `6.0.3`, and the selected dependency graph. An owned file becomes
writable only after a named failing gate proves the dependency-shaped cause;
record that evidence before editing it.

This leaf may own:

- root/core/SDK/store compiler or linter configuration required for TypeScript
  6.0.3 and the selected ESLint 9 line;
- production modules directly broken by a selected dependency API/type/runtime
  change;
- focused tests for those repaired contracts, excluding the three version-pin
  suites owned by TASK-546-01-L01.

It must not edit package manifests, either Bun lockfile, Docker, GitHub
workflows, version-pin docs/tests, TASK-545 or `_docs/_workflows/**`, task or
changelog indexes, or `_TMP-pr-feature-tasks-fixes.md`. If all gates pass, make
no speculative source edit.

## Required compatibility matrix

| Boundary | Required proof |
|---|---|
| Node 26 release tooling | semantic-release core/plugins import and config validation succeed under Node `26.5.0` |
| TypeScript/typescript-eslint | root, core, SDK, store, and prototype typechecks pass on exact TS `6.0.3` |
| Argon2 v2 | Node 26 and Bun hash/verify round trips plus password/auth regression tests |
| canonicalize v3 | ESM import succeeds; store/signing/undo canonical-byte and verification assertions remain exact |
| AWS/Azure | adapter/provider unit tests pass without network credentials or leaked config |
| React/Radix/Lucide | Admin/UI typecheck and focused render/accessibility suites show no missing export or semantic drift |
| Vite/Tailwind/Vitest | Admin, site, and standalone prototype builds pass; Vitest and coverage plugin load |
| SDK | peer breadth remains React 18/19 and SDK types/tests compile without Bun APIs |

The Node 26 `DEP0205` warning emitted by a third-party `module.register` caller
must be traced to its owner. Do not patch application code or silence process
warnings when the repository does not call the deprecated API. Record an
upstream-only warning accurately if the latest admitted dependency still owns it.

## Implementation Pseudocode

```ts
const frozenGraph = fingerprint(["package.json", "bun.lock", "_docs/_PROTOTYPE/package.json", "_docs/_PROTOTYPE/bun.lock"]);
const probes = runCompatibilityMatrix();

for (const probe of probes) {
  if (probe.pass) continue;

  const isolated = rerunNamedFailureAlone(probe);
  if (!isolated.reproduces) {
    recordFlakeAndContinueWithoutSourceEdit(isolated);
    continue;
  }

  const owner = traceFailureToSelectedDependencyOrNode26(isolated);
  if (!owner.inTaskScope) throw new Error("task_546_unowned_failure");

  addOrStrengthenFocusedRegressionTest(owner.contract);
  repairSourceOrConfigWithoutChangingPublicBehavior(owner);
  requireTargetedGatePass(owner);
}

assertFingerprintUnchanged(frozenGraph);
assertNoAnyNoDisabledRuleNoScannerSuppression();
```

Prefer ESM imports/adapters admitted by the upgraded package over compatibility
shims. Preserve canonical byte identity, password verification compatibility,
strict validation, UI accessibility semantics, and storage error/redaction
behavior. Do not rebaseline a failing assertion unless L01 intentionally changed
the documented tooling pin and the product behavior is unchanged.

## Security Contract

- **Endpoint visibility:** no route is added, removed, or made public.
- **Auth/RBAC/CSRF:** current session/API-key authentication, permissions, CSRF,
  and public-write hardening remain unchanged.
- **Rate limits/anti-abuse:** existing buckets, nonce/signature/HMAC, optional
  captcha, and replay protections remain unchanged.
- **Validation:** external/admin/plugin/runtime documents remain schema-first,
  reject unknown fields, and fail closed. No allowlist is widened for convenience.
- Argon2 repairs preserve hash verification and never log passwords/hashes.
  Canonicalize repairs preserve exact signed bytes and fail closed on mismatch.
  Storage tests use fakes and never require or print provider credentials.
- No `any`, lint disable, process-warning suppression, scanner ignore, dependency
  downgrade, test-only production fallback, or weakened assertion is allowed.

## Regression-test shape

For every actual repair, add the smallest owning-lane regression that fails on
the upgraded graph before the source/config fix. Bun owns native/runtime/auth,
store-signing, and server integrations; Vitest owns Bun-free TypeScript/UI/SDK
logic. Preserve exact byte comparisons and error codes. For UI regressions assert
rendered semantic/ARIA state, not only component presence.

At minimum run existing password/auth (`tests/unit/auth/password.test.ts` and
the dependency-shaped auth suites), store verifier, S3/Azure adapter, SDK,
release config, and Admin bundle suites. Do not invent a database fixture when
the affected module is pure; load `.env` before any DB-backed test.

## Validation

```bash
node --version
bun --version
node -e "Promise.all([import('semantic-release'), import('@semantic-release/commit-analyzer'), import('@semantic-release/git'), import('@semantic-release/github'), import('./scripts/semantic-release-pr-notes.cjs')]).then(() => { require('./release.config.cjs'); console.log('release config and plugins ok'); })"
(cd core && node -e "import('@node-rs/argon2').then(async ({hash, verify}) => { const digest = await hash('task-546-node'); if (!(await verify(digest, 'task-546-node'))) process.exit(1); })")
(cd core && bun -e "import { hash, verify } from '@node-rs/argon2'; const digest = await hash('task-546-bun'); if (!(await verify(digest, 'task-546-bun'))) process.exit(1)")

bun --cwd core lint:types
bun --cwd core lint
bun --cwd store lint
./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bun --cwd _docs/_PROTOTYPE typecheck

bun --cwd core build:admin
bun --cwd core build:site
bun --cwd _docs/_PROTOTYPE build
bun run check:admin-boundary
bun run check:admin-bundle

set -a && source .env && set +a
bun -e "const { default: postgres } = await import('postgres'); if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing'); const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, idle_timeout: 1 }); try { await sql\`select 1\`; } finally { await sql.end({ timeout: 1 }); }"
bun test tests/unit/auth/password.test.ts \
  tests/unit/auth/seedAdminPassword.test.ts \
  tests/unit/assistant/actionExecutorService.db.test.ts \
  tests/unit/media/s3Adapter.test.ts \
  tests/unit/media/azureAdapter.test.ts \
  tests/unit/media/storageResolver.test.ts \
  tests/unit/store/verifier.test.ts \
  tests/unit/sdk \
  tests/integration/store/install.test.ts
bun test tests/unit/release/releaseConfig.test.ts \
  tests/unit/release/releaseWorkflowConfig.test.ts
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/action-undo-manifest.test.ts
bun run test:vitest
bun run test:coverage
git diff --check
```

Adapt the exact targeted file list to proven imports and rerun any named failure
alone. If the bounded DB probe fails, mark the DB-backed files NOT RUN and block
this leaf while continuing independent gates; never print `DATABASE_URL`. Do
not run live cloud-provider tests. Confirm manifests and lockfiles are unchanged
after this leaf.

## Acceptance criteria

- Node 26 and Bun probes, every compile lane, all three production builds, and
  dependency-shaped tests pass on the frozen graph.
- Any source/config edit has a focused regression and a recorded causal failure.
- Native hashing, signed-byte identity, storage redaction, UI semantics, and SDK
  peer compatibility remain intact.
- No dependency pin/lock, version-pin test/doc, workflow, Docker, TASK-545 file,
  or closure index was reopened.
