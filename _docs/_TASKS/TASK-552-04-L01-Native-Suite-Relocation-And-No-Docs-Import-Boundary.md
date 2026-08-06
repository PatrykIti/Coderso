# TASK-552-04-L01: Native Suite Relocation and No-Docs-Import Boundary
# FileName: TASK-552-04-L01-Native-Suite-Relocation-And-No-Docs-Import-Boundary.md

**Parent Subtask:** TASK-552-04
**Priority:** High
**Category:** Testing Infrastructure / Module Boundaries / Migration
**Estimated Effort:** Large
**Dependencies:** TASK-552-04 corrective contract audit PASS
**Status:** ⏳ To Do
**Changelog:** 1264 (family reclosure)

---

## Objective

Freeze the exact legacy inventory and relocate only the stable, suite-neutral
TASK-540 modules into `scripts/runtime-smoke/adapters/task-540/suite/`. A module
is L01-stable only when it does not own or depend on Bun source programs,
operation descriptors/registries, worker/runtime dispatch, browser execution,
host lifecycle or final suite composition. L01 deliberately does not switch the
registered adapter: L02 first replaces the complete source-dependent operation
lane and L03 composes the browser, host and final adapter seam. This keeps every
physical file under one leaf writer.

## Grounded Inventory Contract

The source baseline contains exactly 169 tracked `.mjs` files:

- 148 legacy modules in the registered adapter's static dependency closure;
- 17 host-process files: `task-540-smoke-host.mjs` plus all 16 files under
  `task-540-smoke/host/**`;
- four workflow-only files: `task-540-codex-agent-bridge.mjs`,
  `task-540-implement.mjs`, `task-540-local-orchestrator.mjs` and
  `task-540-test-name-contract.mjs`.

The 148-module closure includes 44 import-time self-test modules: six under
`contract/self-test/**` and 38 under `executor/self-test/**`. Those tests are
ported to focused native tests; they are not copied into the executable native
suite.

L01 creates
`tests/fixtures/runtime-smoke/task540-native-source-inventory.json`. It contains
one canonical entry for each of the 169 tracked paths with its SHA-256,
reachability (`registered-static`, `host-subprocess` or `workflow-only`) and one
exclusive disposition:

- `l01-stable-contract`;
- `l02-typed-operation`;
- `l03-browser-host-composition`;
- `l04-delete-only`.

The fixture is the exact reviewed source manifest. Its entries must be sorted,
unique, repository-relative, regular tracked files and must partition all 169
paths once. Later leaves consume it read-only and may not edit it.

Disposition is based on the real dependency role, not the old directory name:

- `l02-typed-operation` includes every production module that defines, imports,
  validates, describes, registers, routes or executes a Bun bridge source body,
  plus every source-dependent executor/runtime consumer needed to preserve its
  input/output/cleanup authority. The grounded seeds include
  `executor/bridge-sources/**`, `executor/bridge-output-validators/**`,
  `executor/bridge-descriptors.mjs`, `executor/bridge-input-validators.mjs`,
  `executor/bridge-operation-registry.mjs`,
  `executor/bun-bridge-resource-sources.mjs`,
  `executor/bun-bridge-validation-primitives.mjs`,
  `executor/resource-bun-authority.mjs`, `runtime/bun-child-protocol.mjs`,
  `runtime/bun-bridge-transport.mjs`, `runtime/operation-router.mjs` and the
  `runtime/response-lost-*.mjs` family. L02 owns their full source-dependent
  closure even when a helper's old path looks generic.
- `l03-browser-host-composition` includes browser, host and final composition
  owners, including `_docs/_workflows/task-540-smoke/browser/**`,
  `_docs/_workflows/task-540-smoke/host/**`,
  `_docs/_workflows/task-540-smoke-host.mjs` and
  `_docs/_workflows/task-540-smoke-executor.mjs`. L03 alone translates those
  responsibilities and switches `scripts/runtime-smoke/adapters/task-540.ts`.
- `l01-stable-contract` is the remaining pure/stable partition only. A file
  whose role or transitive dependency is ambiguous is not assigned to L01; the
  inventory audit must resolve it to exactly one later owner before relocation.

The manifest test rejects any path claimed by more than one disposition and a
separate destination ownership table proves that no native file is created by
one leaf and rewritten by another.

## Exact Single-Writer Ownership

L01 alone owns:

- only the exact destination paths recorded for entries classified
  `l01-stable-contract`, under
  `scripts/runtime-smoke/adapters/task-540/suite/contract/**` or
  `scripts/runtime-smoke/adapters/task-540/suite/shared/**`;
- `scripts/runtime-smoke/adapters/task-540/scenario-resets.ts` when only native
  stable contract imports change;
- `tests/fixtures/runtime-smoke/task540-native-source-inventory.json`;
- `tests/unit/runtime-smoke/task540-native-source-inventory.test.ts`;
- path-only updates in `task540-environment.test.mjs` and
  `task540-scenario-resets.test.ts` when they consume L01-owned native helpers.

L01 does not create or edit:

- `scripts/runtime-smoke/adapters/task-540.ts`;
- native `suite/operations/**`, `suite/browser/**`, `suite/host/**` or
  `suite/composition/**`;
- any native `suite/executor/**` or `suite/runtime/**` path classified as
  source-dependent;
- `persistent-bridge.ts`, worker/cleanup/source modules or browser modules;
- the registered no-`_docs` boundary test, which belongs to L03 after the final
  adapter switch;
- any legacy workflow file, product code, TASK-547 file or documentation.

## Implementation Contract

- Trace the actual fixed adapter roots, including computed literal root-module
  loads, `createRequire` wrappers and subprocess entry paths. Do not rely on a
  direct-import-only regular expression.
- Record all 169 files before relocation and prove the 148/17/4 reachability
  partition plus the 44 self-test subset.
- Relocate stable modules mechanically: repository-local import changes and
  module-format changes only. Preserve exported names, manifest/action/scenario
  order, fixture identities, screenshot paths, output envelopes and failure
  tokens. Do not move a source-dependent executor/runtime, operation
  descriptor/registry, browser, host or composition module through a temporary
  L01 path for a later leaf to rewrite.
- The L01 native graph must contain no `_docs` import/require/path escape and
  must load without DB, server, worker or browser side effects.
- Keep all 169 legacy files byte-identical as the comparison baseline. L04 owns
  deletion after replacement coverage and the registered graph are green.
- Do not copy self-tests, source-string programs, Bun bridge descriptors,
  Playwright process code or host process code into L01 directories.

## Implementation Pseudocode

```ts
const legacy = await traceTask540ExecutableInventory({
  registeredAdapter: "scripts/runtime-smoke/adapters/task-540.ts",
  includeComputedFixedLoads: true,
  includeCreateRequire: true,
  includeSubprocessEntries: true,
});
assertInventoryCounts(legacy, {
  tracked: 169,
  registeredStatic: 148,
  hostSubprocess: 17,
  workflowOnly: 4,
  importTimeSelfTests: 44,
});
const inventory = classifyEveryPathOnce(legacy, {
  l02Seeds: TASK540_SOURCE_DEPENDENT_OPERATION_SEEDS,
  l03Seeds: TASK540_BROWSER_HOST_COMPOSITION_SEEDS,
});
assertExclusiveSourceAndDestinationOwners(inventory);
await writeReviewedInventory(inventory);

for (const entry of inventory.forDisposition("l01-stable-contract")) {
  assertPureStableImportClosure(entry, inventory);
  await relocateStableModule(entry.path, nativeStablePath(entry.path));
}
assertNoDocsEdge(await traceNativeStableGraph());
```

The implementation may use a reviewed mechanical rewrite tool, but generated
source is ordinary reviewed code. The registered adapter remains on the legacy
executor until L03; this is intentional and is not reported as a completed
no-`_docs` migration.

## Failure Handling

An inventory count/hash mismatch, duplicate or unclassified path, ambiguous
specifier, computed load the tracer cannot resolve, unexpected subprocess
entry, source drift outside import/module-format changes, copied self-test or
privileged operation, side effect on import, symlink/path escape or line-limit
breach blocks L01. Never hide an inventory gap behind a legacy fallback.

## Regression Tests and Gates

- Inventory tests prove exact 169/148/17/4/44 counts, exclusive leaf ownership,
  hashes and mutation rejection for a missing, duplicate, untracked, escaped,
  symlinked or newly reachable path.
- Stable native contract tests pin seven scenarios, 496 actions, the 420/76
  lane partition, 13 screenshots, action order, reset inventory and manifest
  digest inputs.
- The stable native import graph has no environment/DB/server side effect and no
  `_docs` edge.
- Run exact plan/reset/environment tests owned by this boundary, root
  TypeScript, formatting, `git diff --check` and touched-file line counts. Live
  smoke and the registered graph gate wait for L03/L04.

## Local Tooling and Security Constraints

No API route changes. Inventory paths are fixed tracked repository paths; no
remote import, arbitrary module name, shell fragment, environment dump, secret,
raw log or executable evidence content is allowed.
