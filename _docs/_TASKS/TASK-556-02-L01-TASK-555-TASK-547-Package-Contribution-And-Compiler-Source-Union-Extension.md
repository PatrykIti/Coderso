# TASK-556-02-L01: TASK-555 TASK-547 Package Contribution and Compiler Source Union Extension
# FileName: TASK-556-02-L01-TASK-555-TASK-547-Package-Contribution-And-Compiler-Source-Union-Extension.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-02
**Priority:** High
**Category:** Designer / Async Release / Static Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-556 external terminal gate; TASK-556-01-L02
**Start Receipt:** Complete TASK-556-01 reviewed landed receipts; exact TASK-555 async accessor and TASK-547 exports recorded
**Completion Receipt:** Reviewed owned diff plus every command/budget below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Adapt TASK-555's landed asynchronous server-only verified immutable release
accessor to the static registry and add a pure compiler branch. Never duplicate
artifact loading, release verification, package ownership, or installer behavior.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/services/designer/staticSources/formaDomStaticSourceContribution.ts`;
- `core/services/designer/staticSources/staticTrustedReleaseSnapshot.ts`;
- `core/services/designer/staticSources/staticPackageCompilerInput.ts`;
- exact additive static branch in `core/services/designer/packageCompiler.ts`;
- `tests/vitest/designer/designer-formadom-static-source-contribution.test.ts`;
- `tests/vitest/designer/designer-static-package-compiler.test.ts`;
- `tests/vitest/designer/designer-static-package-source-boundary.test.ts`.

Forbidden paths: all TASK-555 owner files, especially `core/assets/curated-starters/**`,
`core/services/kits/curatedStarter*`, direct-install clients/routes/components and
both host regions; all `core/services/kits/fullSitePackage/**`,
`core/services/kits/fullSiteInstall/**`, generator/artifact/CLI files; every
terminal semantic/provider/private compiler region outside the named branch;
DB/stage/receipt/routes/UI/runtime-facade composition/capability/smoke,
Agent/Assistant action files,
task/changelog indexes, root config, `AGENTS.md`, `_TMP*`, non-TASK-556 tasks.

## Async Release and Compiler Contract

Union-extension declaration: `code_owned_static` extends the terminal
`DesignerMaterializationSourceBindingV1` and adds `formadom-studio` as the first
code-owned member of the closed `DesignerImportSourceIdV1` union through the
TASK-414-08-L02/07-L03 successor seams (the union owner is TASK-414-07-L03 and
the TASK-414-03-L02 contract reserves TASK-556 as the first consumer of this
seam; the registry's closedness applies to dynamic plugin contributions only).
TASK-414-08-L02 remains the sole writer of `packageCompiler.ts` until terminal;
this leaf adds only its exact additive static branch after that receipt, per the
serialized successor clause recorded at the start gate.

After the service's bounded exact-replay preflight misses, the landed TASK-555
accessor is awaited exactly once before Transaction A. Consume its exported
`LoadedCuratedFullSiteRelease` without flattening it:

```ts
type LoadedCuratedFullSiteRelease = Readonly<{
  definition: CuratedStarterDefinitionV1;
  manifest: CuratedFullSiteReleaseManifestV1;
  package: FullSitePackageV1;
}>;
```

It is server-only, verifies the literal artifact asynchronously, and returns a
deep-frozen release. `definition.source.releaseKey` is exactly
`formadom-studio@1.0.0`; version and all three upstream digests come from the
strict manifest. TASK-555 has already called
`normalizeFullSitePackageForWrite` and `buildReferencePlan` once inside that
accessor. Before Transaction A, TASK-556 verifies only literal manifest/source/
expected-digest facts and freezes the upstream accessor result; it performs no
second package pass and does not bind a current registry brief/version yet.

Only a request that receives Transaction A's dispatch fence performs exactly one
additional terminal Designer compiler-side pass: call
`normalizeFullSitePackageForWrite`, serialize canonical bytes, verify
`fullSitePackageFingerprint` against the manifest, and call
`buildReferencePlan` once. The compiler branch consumes that pass's result and
does not repeat any member. Thus a completed seed has exactly two end-to-end
package validations: one upstream TASK-555 accessor pass and one TASK-556 pass.
A unique-race loser may finish only the upstream accessor pass and performs zero
TASK-556 normalize/canonical-byte/fingerprint/reference-plan, compile, or stage
dispatch. Designer `bindingDigest` includes `designerBriefDigest`; it never
recomputes TASK-555 `releaseDescriptorDigest` with Designer facts.

Transaction A returns the exact compilation facts with every dispatch. For
takeover and the sole retry these are the persisted normalized generation-run
`static_brief`,
brief digest, contribution/registry/compiler versions, and complete binding
identity. For new and promoted-fork only they are current frozen registry/compiler
facts. The compiler consumes that returned projection and never re-reads the
current registry to reconstruct a retained binding. It rejects a missing,
non-normalized, digest-mismatched, or canonical UTF-8 >512 KiB run brief before
package compilation.

```ts
type DesignerCompilationInputV1 =
  | TerminalSemanticInput
  | Readonly<{
      kind: "code_owned_static";
      claim: CodeOwnedStaticBoundDesignerGenerationClaimV1;
    }>;

export async function loadTrustedStaticReleaseSnapshot(expectedDigest, deps) {
  const release = await deps.getCuratedFullSiteRelease("formadom-studio@1.0.0");
  assertExpectedDescriptor(expectedDigest, release.manifest);
  // No TASK-556 package normalization/reference work before dispatch ownership.
  return deepFreeze(projectTrustedUpstreamReleaseSnapshot(release));
}

export function prepareCodeOwnedStaticCompilation(
  input,
  snapshot,
  compilationFacts,
  deps,
) {
  assertExpectedDescriptorAndClaim(input, snapshot);
  const facts = requireDispatchCompilationFacts(compilationFacts);
  const normalized = normalizeFullSitePackageForWrite(snapshot.package);
  const canonicalBytes = canonicalizeFullSiteJsonValue(normalized);
  const packageFingerprint = fullSitePackageFingerprint(normalized);
  assertCanonicalPackageIdentityUnchanged(
    snapshot.package,
    normalized,
    canonicalBytes,
    packageFingerprint,
    snapshot.manifest,
  );
  const referencePlan = buildReferencePlan(normalized);
  return compileStaticPackagePure(
    normalized,
    canonicalBytes,
    referencePlan,
    facts.binding,
    facts.designerBrief,
    facts.designerBriefDigest,
    facts.compilerVersion,
    deps,
  ); // consumes this validated pass; no nested normalize/fingerprint/reference call
}
```

Compile outside every DB transaction. Use terminal TASK-547 reference plan and
terminal TASK-414 bundle/graph/native-stage preparation with exact empty sidecars.
No live-state installer plan/apply, provider draft, private input, network, storage
write, canonical ID, or side effect.

## Numeric Budgets

- Artifact/accessor await timeout 5,000 ms; no retry inside Designer.
- TASK-555 enforces the manifest's exact 288,066 artifact bytes. TASK-547 remains
  authoritative for package limits: 8 MiB, 512 resources, 4,096 reference edges,
  depth 64, and 100 diagnostics; compile timeout is 3,000 ms.
- At most 1 TASK-555 accessor call after a replay miss. The dispatch owner
  performs exactly 1 TASK-556 terminal pass comprising normalization/equality,
  canonical bytes, fingerprint verification, and reference planning for a new/
  taken-over compile.
  End to end this is exactly the accessor's upstream pass plus the one TASK-556
  pass. A unique-race loser may already have completed its accessor (and thereby
  only TASK-555's upstream pass), but performs 0 TASK-556 package-pass/compiler/
  stage calls; exact retained replay requires 0 accessor/package-pass/compile
  calls. No third pass is permitted in stage or receipt construction.
- Current registry/compiler facts are read only by Transaction A for a new or
  promoted-fork root. Takeover/retry call counts for current facts are exactly
  zero and their persisted run `static_brief`/digest/version/binding projection must match the
  locked rows byte-for-byte.
- No DB query or lock is permitted in this leaf's compile path.

## Implementation Pseudocode

See both helpers above. The workspace service first resolves retained replay,
then loads the already upstream-validated trusted snapshot outside a transaction,
passes its upstream identities into Transaction A, and only a returned dispatch
fence plus its persisted-or-current compilation facts enters the one TASK-556
compiler validation pass.
The compiler returns prepared private-stage evidence and performs no persistence
or canonical CMS write.

**Data flow:** replay miss -> exact-key async TASK-555 verified release (upstream
normalize/reference pass 1) -> frozen upstream snapshot -> Transaction-A dispatch
fence plus persisted facts for takeover/retry or current facts for new/promoted-
fork -> one terminal Designer normalize/canonical-byte/fingerprint/reference-plan
pass 2 -> exact returned Designer binding/brief/compiler version -> TASK-414 pure
bundle/graph/native-stage output. No dispatch means no pass 2.

**Errors:** `designer_static_release_unavailable`,
`designer_static_release_descriptor_stale`, `designer_static_artifact_mismatch`,
`designer_static_package_fingerprint_mismatch`, `designer_static_claim_invalid`,
`designer_static_compile_invalid`, `designer_static_compile_timeout`. Expose no
path/package/provider/stack details.

## Tests

- Awaited accessor call count, delayed/rejected accessor, timeout, frozen snapshot.
- All three upstream identities and three Designer digests remain distinct;
  brief mutation changes brief/binding only, and registry version mutation never
  changes release descriptor or brief digest.
- Every FormaDom resource/reference compiles in stable order with empty sidecars.
- Exact limits/timeouts/diagnostic caps and one-field drift failures.
- Existing semantic fixtures and `FullSitePackageV1` golden bytes unchanged;
  the one TASK-556 terminal pass is idempotent, does not mutate the accessor
  package, and produces canonical byte/fingerprint/reference-plan equality.
- Injected call-count cases prove exact replay `0/0`, unique-race loser
  `1 accessor/0 TASK-556 pass`, and dispatch winner `1 accessor/1 TASK-556 pass`;
  no third normalize/fingerprint/reference invocation is reachable.
- Registry, brief, and compiler-version evolution fixtures prove takeover/retry
  compile with the persisted normalized run `static_brief` and zero current-registry
  reads; new/promoted-fork
  use current facts. The unique loser may complete only TASK-555's immutable
  upstream package pass and cannot compile either projection.
- Missing/malformed/non-normalized/digest-mismatched and >512 KiB persisted
  `static_brief` fail before package/compiler/stage work.
- Import graph forbids `_docs`, scripts, TASK-555 direct install, TASK-547 apply/
  rollback, provider/Agent/Assistant and dynamic source.

## Security Contract

- **Visibility:** server-only contribution/compiler; no endpoint.
- **Authentication/RBAC:** fenced server claim; release digest never authorizes.
- **CSRF/rate:** upstream route-owned; compile bounded by numeric budgets.
- **Validation:** terminal strict release/package/reference/native validators and exact identities.
- **Anti-abuse/privacy:** no public input/provider/network/write; no sensitive diagnostics.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-formadom-static-source-contribution.test.ts tests/vitest/designer/designer-static-package-compiler.test.ts tests/vitest/designer/designer-static-package-source-boundary.test.ts
bun run check:admin-boundary
git diff --check
```

Run exact terminal TASK-555 accessor and TASK-547 package/reference/fingerprint
regressions read-only. Run `wc -l` on touched human-authored production/test
files and fail above 1,000.

## Documentation Updates Required

Record landed accessor/export names, limits, compiler facts, empty-sidecar and
import-boundary evidence for TASK-556-04-L02. Edit no shared docs/metadata here.
