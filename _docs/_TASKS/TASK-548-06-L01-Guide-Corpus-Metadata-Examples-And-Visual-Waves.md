# TASK-548-06-L01: Guide Corpus Metadata, Examples and Visual Waves
# FileName: TASK-548-06-L01-Guide-Corpus-Metadata-Examples-And-Visual-Waves.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-06
**Priority:** High
**Category:** Documentation / Content Migration / Visuals
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 is `✅ Done` and TASK-547 is terminal; the TASK-548
parent names every literal final TASK-547-overlapping
user/developer/shared-doc path and serializes its owner before any
implementation; TASK-548-05-L02;
TASK-548-01-L02 recovery-capable original report/bundle pair before migration
and one same-owner final regeneration dispatch after all three internal waves
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Convert every active ingestible English Guide source to native
`coderso.docs-corpus@v2` authoring and enrich material workflows with strict
examples and reviewed visuals. Preserve the compiler migration report's stable
IDs and existing valid slugs; remove the legacy adapter from the final active
corpus path only after normalized semantic/stable-identity parity passes. Before
any owned write, load, link and freeze exactly one original migration report plus
owner-generated bundle; every wave uses that immutable baseline. Native
frontmatter changes source bytes, so the final deterministic `sourceHash` must
change rather than equal the frozen legacy-adapted bundle hash. At most one final
TASK-548-01-L02 regeneration is allowed after all source/visual edits; its
read-only verified handback fact is safely reconstructed on every restart.

## Exclusive Ownership

This leaf is the sole migration writer for:

- active English documents below `docs/guide/getting-started/`,
  `docs/guide/screens/`, `docs/guide/coderso/`, `docs/guide/playbooks/`, and
  `docs/guide/solution-kits/`;
- their new strict example sidecars in the TASK-548-01-owned localized layout
  `docs/guide/examples/<docId>/<canonical-bcp47-locale>/<exampleId>.json`;
- every non-pilot TASK-548 scenario, canonical PNG, and promotion receipt under
  the TASK-548-02-owned locale-bearing paths
  `docs/guide/assets/scenarios/<docId>/<canonical-bcp47-locale>/<visualId>.json`,
  `docs/guide/assets/images/<docId>/<canonical-bcp47-locale>/<visualId>.png`,
  and
  `docs/guide/assets/receipts/<docId>/<canonical-bcp47-locale>/<visualId>.json`;
- executable migration driver `scripts/docs/migrate-guide-corpus.ts`;
- durable baseline helper
  `scripts/docs/guide-migration/frozenGuideMigrationBaselineV1.ts`;
- focused native-migration fixtures/tests in
  `tests/vitest/documentation/docs-corpus-native-migration.test.ts`;
- filesystem/restart contract tests in
  `tests/unit/documentation/docsGuideMigrationBaseline.test.ts`.

Do not edit `docs/guide/README.md`, `_TEMPLATE.md`, `corpus.manifest.json`,
`_COVERAGE_MATRIX.md`, TASK-548-02's named pilot files, shared tooling, root
package/lock/workflows, `core/generated/docs/coderso-docs-v2.json`, the generated
migration report, or any guide path still owned by TASK-547. TASK-548-01-L02
remains their sole generator/writer; this leaf dispatches at most one final
regeneration and repeatably verifies its strict in-memory fact. L02 owns the
generated matrix and reconciliation code.

Implementation is blocked until TASK-545 is `✅ Done`, TASK-547 is terminal,
and the TASK-548 parent has been amended with every literal final overlapping
path.
Those paths are forbidden here until the serialized TASK-547 handoff completes;
no wildcard or prose-only ownership claim authorizes a concurrent edit.

## Migration Waves

Execute and review waves sequentially so failures remain attributable:

1. Getting started, dashboard, authentication, settings, users/roles, media,
   Pages, Menus, themes, SEO, redirects, search, and operational/security screens.
2. Advanced content types, entries, custom screens, page templates, Forms,
   Listings/filters/public search, Posts, Booking, Commerce, reviews, popups, and
   Solution Kits.
3. Playbooks and applied Solution Kit guidance, reusing stable references only
   where the exact same screen/state is genuinely demonstrated.

For each active source, write exact native v2 frontmatter:
`schema: "coderso.docs-document@v2"`, `docId`, `locale: en`, stable `slug`,
`title`, `summary`, the one-element `audience` array, `productArea`,
`productVersionRange`, canonical `adminPath` or `null`,
`permissionRequirement`, catalog-backed `capabilityIds`, ordered
`publicationTargets`, and `keywords`. Every value must equal the complete
TASK-548-01-L02 frozen legacy projection for that exact source path; migration
may not enrich or reinterpret route, permission, capability, version, target,
summary, audience or keyword fields. Preserve exact
`permissionRequirement: null | { mode: "allOf" | "anyOf"; permissions:
string[] }` semantics. `requiredPermissions`, plural `audiences`, a generic
permission set, and any alternate capability field fail strict validation.
Use the exact IDs emitted by the migration report; do not rederive or prettify
them. Document uniqueness and every downstream join use `(docId, locale)`;
translations may deliberately share one `docId`, so a bare `docId` is never a
unique document key.

Every procedural document includes verifiable outcome/troubleshooting text. Add
bounded examples where copyable JSON/TypeScript/Bash/text materially helps. Each
strict authored sidecar lives below
`docs/guide/examples/<docId>/<canonical-bcp47-locale>/<exampleId>.json`, binds
the owning `{ docId, locale, sectionId }`, validates the path-derived `docId` and
canonical BCP-47 `locale` against the exact strict
`DocsExampleSidecarV1` envelope, and
contains no live credential or destructive production command. `exampleId` and
`visualId` remain bundle-global even though every reference retains its owning
localized document-section tuple.

## Migration Report Handoff

Before any original-pair read, call
`recoverDocsWorkspaceArtifactPromotionV1()`, then load exactly:

```text
.tmp/docs-corpus/migration-report-v1.json
core/generated/docs/coderso-docs-v2.json
```

Recursively validate discriminator `coderso.docs-migration-report@v1` and the
exact TASK-548-01-L02 fields `bundleSourceHash`, `bundleSha256`, and sorted
`entries[]`. Read the exact report and owner-generated bundle bytes, regenerate
the legacy-compatible distribution bundle from the same unmodified Guide tree
without writing owner output, and prove its `sourceHash` plus exact SHA-256 match
the report linkage.

The driver receives one explicit caller-created `migrationRunId` produced by
`createDocsVisualRunIdV1({ scope: "migration" }, deps?)` under the same
CSPRNG/test-injection/collision contract and, before any Guide/example/scenario/
PNG/receipt write, atomically publishes this exact three-regular-file inventory
with no symlink, nested entry, or extra member:

```text
.tmp/docs-corpus/task-548-migration-baseline/
  original-docs-bundle-v2.json
  original-migration-report-v1.json
  frozen-guide-migration-baseline-v1.json
```

The strict recursively reject-unknown receipt is:

```ts
export const FROZEN_GUIDE_MIGRATION_BASELINE_LIMITS_V1 = {
  maxReceiptBytes: 16_384,
  maxBundleBytes: 67_108_864,
  maxReportBytes: 16_777_216,
  maxMigrationRunIdLength: 42,
} as const;

export type FrozenGuideMigrationBaselineV1 = {
  schema: "coderso.guide-migration-baseline@v1";
  migrationRunId: string;
  sourceInventorySha256: string;
  semanticProjectionSha256: string;
  bundle: {
    file: "original-docs-bundle-v2.json";
    byteLength: number;
    sha256: string;
    sourceHash: string;
  };
  report: {
    file: "original-migration-report-v1.json";
    byteLength: number;
    sha256: string;
    bundleSourceHash: string;
    bundleSha256: string;
  };
};

export type FrozenGuideMigrationSourceV1 = {
  relativePath: string;
  bytes: Uint8Array;
};

export type CreateFrozenGuideMigrationBaselineInput = {
  migrationRunId: string;
  reportPath: ".tmp/docs-corpus/migration-report-v1.json";
  bundlePath: "core/generated/docs/coderso-docs-v2.json";
  sources: readonly FrozenGuideMigrationSourceV1[];
};

export type ReopenedFrozenGuideMigrationBaselineV1 = {
  receipt: FrozenGuideMigrationBaselineV1;
  report: DocsMigrationReportV1;
  bundle: DocsDistributionBundleV2;
};

export function normalizeFrozenGuideMigrationBaselineV1(
  value: unknown
): FrozenGuideMigrationBaselineV1;

export async function createOrResumeFrozenGuideMigrationBaselineV1(
  input: CreateFrozenGuideMigrationBaselineInput
): Promise<ReopenedFrozenGuideMigrationBaselineV1>;

export async function reopenFrozenGuideMigrationBaselineV1(
  input: { migrationRunId: string }
): Promise<ReopenedFrozenGuideMigrationBaselineV1>;
```

The helper above owns these exports and exact limits. IDs are bounded lowercase
token strings; byte lengths are safe positive integers within the caps; hashes
are lowercase 64-hex. `bundle.sourceHash`,
`report.bundleSourceHash`, and the parsed bundle `sourceHash` must be identical;
`report.bundleSha256` must equal `bundle.sha256`. The source-inventory digest is
over sorted confined source paths plus original bytes, and the semantic digest
is over the canonical stable legacy projection. There are no timestamps,
absolute paths, host data, or unknown keys. `CreateFrozenGuideMigrationBaselineInput`
has exactly the four keys above and its source collection key is exactly
`sources`; `sourceTree`, a wave selector, and alternate path keys reject.

Build all three members in one fresh sibling staging directory beneath
`.tmp/docs-corpus`, serialize the normalized receipt as canonical JSON, write
and fsync each file, fsync the staging directory, reopen/validate exact inventory
and hashes, then atomically rename the directory to
`task-548-migration-baseline` and fsync `.tmp/docs-corpus`. Never overwrite an
existing final capsule. A published partial/extra/symlinked inventory, leftover
foreign stage, identity mismatch, stale source inventory, or changed bytes is a
hard error, not a reason to snapshot again.

Restart/resume calls recovery first, reopens this receipt and exact stored bytes,
and requires the same explicit `migrationRunId`; all three waves and the
final TASK-548-01-L02 regeneration and owner verification retain that
immutable identity. The
deterministic intended compile first produces the exact owner
`DocsFinalNativePairExpectedIdentityV1`. If the recovered workspace is still the
frozen original, orchestration dispatches the TASK-548-01-L02 writer exactly
once; an already exact intended pair skips that dispatch. Both paths then call
`recoverDocsWorkspaceArtifactPromotionV1()` followed by the exact read-only
`verifyDocsFinalNativePairHandbackV1({ expected, bundlePath, reportPath })`.
That owner helper reopens and canonical-byte/hash-validates both finals and
returns a strict in-memory verified fact containing the pair. It is repeatable
after restart and never regenerates, promotes, writes, or counts as another
handback. A raw recovered pair cannot substitute for the verified fact. Only
final migration parity consumes `verifiedHandback.pair`; neither value reaches
`docs:check` or coverage. Packaged runtime/startup loads the bundle only and
never requires this `.tmp` capsule or report.

On create and every reopen, inventory and `lstat` checks reject links and
non-regular or extra members. The receipt byte cap is enforced before parsing
the receipt. Its exact run identity, file names, safe lengths, and hashes then
gate both stored members: each member is bounded and hashed as bytes and all
receipt/report/bundle linkage is validated before either member is decoded or
passed to `JSON.parse`. Only after strict member normalization succeeds may the
helper return `ReopenedFrozenGuideMigrationBaselineV1`; callers never reopen or
parse the stored report/bundle independently.

For every entry, match `entry.sourcePath` to exactly one owned active source,
copy `entry.documentId` byte-for-byte into frontmatter `docId`, preserve
`entry.locale` and `entry.slug`, and map each
`entry.sections[].headingOccurrence` to that heading occurrence's exact
`sectionId`. Emit
`serializeNativeDocsSectionDirectiveV1({ sectionId, headingOccurrence })`
immediately before the matched level 1–4 ATX heading with no blank line:
`[[coderso-section:<1-based-ordinal>:<lowercase-kebab-section-id>]]`. Ordinals
must be contiguous `1..N` in source order. Reparse the complete document through
`parseNativeDocsSectionDirectivesV1`; every source, document ID, heading
occurrence, heading, and section ID joins once. Missing, duplicate, reordered,
orphaned, detached, or alternate-location directives fail before writing.

No per-wave/per-promotion regeneration is allowed. After the final edit, request
exactly one same-owner TASK-548-01-L02 final write only when the recovered pair
is still baseline. On crash/restart, rederive the expected identity and invoke
the idempotent owner verifier; never request a second regeneration. Compare the
verifier-returned final pair with the expected identity and stored original:
every non-evidence `DocsDocumentV2` field and section content stays equal, including
intentionally null actions and the sole empty orientation capability array.
Only strict visual/example objects and their section ID arrays may be enriched.
Adapter diagnostics are empty and deterministic `sourceHash` differs. Only the
final migration parity verifier may consume the verified pair. After that
boundary, the parent runs read-only `bun run docs:check` without migration
values; 06-L02 then uses its read-only hazard inspector and packaged
distribution loader before reconciliation.
`runTask54801L02FinalNativeRegenerationOnce` is an orchestration-only callback:
when invoked, the same 01-L02 owner compiles, proves its identity equals
`expected`, and promotes once; it returns no pair, receipt, or persisted
handback. Baseline state invokes it once; intended state and any restart that
recovers the already-landed intended pair invoke it zero times.

## Visual Review Contract

A material visual workflow needs at least one screenshot when location, control
state, hierarchy, geometry, theme, responsive behavior, or visible result is
harder to understand from prose. Conceptual/repeated playbooks may reference
their exact underlying Guide document rather than duplicating images.

Each new visual:

- has one strict scenario and synthetic scoped fixture profile;
- stores the owning canonical BCP-47 `locale` in the strict scenario and binds
  the reference to `{ docId, locale, sectionId }`; capture, receipt, coverage,
  Guide evidence, and Help/CMS/public actions may not recover ownership from a
  bare `docId`, `sectionId`, or asset ID;
- receives a caller-owned ID from the exact TASK-548-02-L01 helper
  `createDocsVisualRunIdV1({ scope: "migration" }, deps?)`; production entropy
  is 128-bit CSPRNG, output is `migration-<32-lowercase-hex>`, and collision
  handling fails after at most eight retries. Only deterministic tests inject
  entropy. The executable migration caller supplies the explicit ID and capture
  validates/passes it unchanged but never invents, replaces, normalizes, or
  reuses it;
- uses the pinned `playwright-cli` runner, named task session, canonical route,
  fixed viewport/theme/locale/timezone, and visible-effect assertions;
- captures into `.tmp`, fails on console/page/request-policy errors, and cleans
  only owned fixtures/processes;
- is inspected for correctness, cropping, legibility, sensitive data, light/dark
  intent, and prose/alt/caption agreement before explicit promotion;
- produces canonical PNG plus receipt with image, scenario, and source hashes;
- joins one existing stable document section and does not replace explanatory
  prose.

Migration/capture run IDs are operational identity only. They may appear in the
confined temporary baseline/candidate state, but never in native Markdown,
example/visual sidecars, canonical PNG/receipt bytes, the distribution bundle,
coverage output, or other canonical product artifacts.

TASK-548-02's pilot remains byte-owned by TASK-548-02-L02. This leaf validates
but does not rename, recapture, or re-promote it.

## TASK-547 Serialization

TASK-545 must be `✅ Done` and TASK-547 must be terminal before this leaf
implements anything. After TASK-547 is terminal, amend the TASK-548 parent with every
literal final overlapping user/developer/shared-doc path and the serialized
single writer for each. This leaf reads the resulting shipped bytes and migrates
an overlapping Guide path only when that literal parent ownership row assigns
it here. Never document a TASK-547 route or installer state from task prose;
derive only from shipped route/permission/source state.

## Security Contract

- **Endpoint visibility:** no new endpoint. Scenarios use current internal Admin
  and existing public read routes only.
- **Auth/RBAC/CSRF/rate limit:** synthetic scenario accounts have the minimum
  declared permissions; existing write CSRF and rate buckets remain enabled.
- **Validation:** native v2 strict schemas, permission catalog, canonical
  `adminPath`, confined sidecars/PNGs/receipts, hash and ref closure.
- **Anti-abuse:** no public write is added; existing public-write nonce/HMAC/
  CAPTCHA policy is exercised where a documented real flow reaches it. Bound
  fixtures, actions, pixels, bytes, sessions, retries, and timeouts.
- **Secrets/privacy:** no real accounts, submissions, access/audit rows, API keys,
  cookies, CSRF/provider tokens, mail addresses, or unstable timestamps in any
  source, example, image, receipt, log, or evidence.

## Implementation Pseudocode

```ts
type FinalNativeOwnerHandoffDependency = {
  runTask54801L02FinalNativeRegenerationOnce(input: {
    expected: DocsFinalNativePairExpectedIdentityV1;
  }): Promise<void>;
};

type GuideCorpusMigrationResultV1 = {
  baseline: ReopenedFrozenGuideMigrationBaselineV1;
  verifiedHandback: VerifiedDocsFinalNativePairHandbackV1;
};

export async function migrateGuideCorpus(
  options: { migrationRunId: string; allWaves: true },
  dependencies: GuideMigrationDependencies &
    FinalNativeOwnerHandoffDependency = productionDependencies
): Promise<GuideCorpusMigrationResultV1> {
  const migrationRunId = requireExplicitCallerMigrationRunId(
    options.migrationRunId
  );
  await recoverDocsWorkspaceArtifactPromotionV1();
  const baseline = await createOrResumeFrozenGuideMigrationBaselineV1({
    migrationRunId,
    reportPath: ".tmp/docs-corpus/migration-report-v1.json",
    bundlePath: "core/generated/docs/coderso-docs-v2.json",
    sources: await readUnmodifiedOwnedActiveEnglishSources(),
  });
  assertExactAllWavesRequest(options);
  for (const wave of INTERNAL_GUIDE_MIGRATION_WAVES_1_2_3) {
    for (const source of selectOwnedActiveEnglishSources(
      baseline.report,
      wave
    )) {
      const entry = requireUniqueMigrationEntry(
        baseline.report,
        source.relativePath
      );
      const identity = {
        docId: entry.documentId,
        locale: entry.locale,
        slug: entry.slug,
        sectionIdsByHeadingOccurrence: new Map(
          entry.sections.map(({ headingOccurrence, sectionId }) => [
            headingOccurrence,
            sectionId,
          ])
        ),
      };
      const intended = await buildExactIntendedMigratedState({
        source,
        identity,
        metadata: requireExactFrozenLegacyProjectionForSource(
          baseline,
          source.relativePath
        ),
        serializeDirective: serializeNativeDocsSectionDirectiveV1,
        examples: planStrictExamples(source, {
          docId: identity.docId,
          locale: identity.locale,
          sectionIds: identity.sectionIdsByHeadingOccurrence,
        }),
      });
      const state = await classifySourceSidecarsAndReceiptsAgainstBaseline({
        source,
        baseline,
        intended,
      });
      if (state === "baseline") {
        await atomicallyWriteIntendedMigratedState(intended);
      } else {
        assertExactIntendedMigratedState(state, intended);
      }
      assertExactNativeDirectiveGraph(
        parseNativeDocsSectionDirectivesV1(await source.readBody())
      );
      for (const scenario of planMaterialVisualScenarios(source, {
        docId: identity.docId,
        locale: identity.locale,
        sectionIds: identity.sectionIdsByHeadingOccurrence,
      })) {
        assertScenarioOwnsCanonicalDocumentSectionTuple(scenario, identity);
        const intendedVisual =
          await buildExactIntendedCanonicalVisualAndReceipt(scenario);
        const visualState = await classifyVisualAndReceiptAgainstBaseline({
          baseline,
          intended: intendedVisual,
        });
        if (visualState === "intended") continue;
        assertExactBaselineVisualState(visualState);
        const runId = await createDocsVisualRunIdV1(
          { scope: "migration" },
          dependencies.docsVisualRunIdDeps
        );
        assertCallerOwnsUniqueRunIdForScenario({
          migrationRunId,
          runId,
          visualId: scenario.visualId,
          waveId: wave.waveId,
        });
        // Direct API call: there is no public capture command accepting runId.
        const captureIdentity = {
          docId: scenario.docId,
          locale: scenario.locale,
          sectionId: scenario.sectionId,
          visualId: scenario.visualId,
          runId,
        } as const;
        const candidate = await captureDocsVisual(captureIdentity);
        assertCaptureIdentity(candidate, captureIdentity);
        await assertVisibleEffectsAndCleanState(candidate);
        await requireExplicitReviewedPromotion(candidate);
      }
    }
  }
  const intendedFinalCompile = await compileDocsCorpusV2({
    root: "docs/guide",
    mode: "check",
    visuals: {
      state: "active",
      validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
    },
  });
  const expectedFinalPair = buildDocsFinalNativePairExpectedIdentityV1({
    migrationRunId,
    compiled: intendedFinalCompile,
  });
  await recoverDocsWorkspaceArtifactPromotionV1();
  const finalPairState =
    await classifyRecoveredGeneratedPairAgainstBaselineOrExpected({
      baseline,
      expected: expectedFinalPair,
    });
  if (finalPairState === "baseline") {
    await dependencies.runTask54801L02FinalNativeRegenerationOnce({
      expected: expectedFinalPair,
    });
  } else {
    assertExactExpectedFinalNativePairState(finalPairState, expectedFinalPair);
  }
  await recoverDocsWorkspaceArtifactPromotionV1();
  const verifiedHandback = await verifyDocsFinalNativePairHandbackV1({
    expected: expectedFinalPair,
    bundlePath: "core/generated/docs/coderso-docs-v2.json",
    reportPath: ".tmp/docs-corpus/migration-report-v1.json",
  });
  const reopened = await reopenFrozenGuideMigrationBaselineV1({
    migrationRunId,
  });
  return {
    baseline: reopened,
    verifiedHandback,
  };
}
```

**Data flow:** exact public command
`bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id> --all-waves`
→ explicit caller migration identity → workspace recovery → atomic stored
original pair/receipt → internal waves 1 then 2 then 3, with each source,
localized example/visual reference, sidecar, and receipt proven to retain
`{ docId, locale, sectionId }` and to be exact frozen-baseline bytes or exact intended
migrated bytes before an idempotent write/resume → per-visual caller-owned
CSPRNG bounded collision-checked `runId` → direct lower capture API with exact
unchanged `{ docId, locale, sectionId, visualId, runId }` copied from the
strict scenario and caller-owned run identity → full localized owner/result
identity assertion → candidate inspection/promotion → one final
deterministic intended compile → exact expected run/source/bundle/report/pair
identity → recovery and baseline-or-intended classification → zero or one
same-owner compiler regeneration → recovery → exact read-only owner verifier →
strict in-memory verified handback fact containing the canonical reopened pair
→ fact linked to the expected identity and frozen original → final
native-vs-stored-original normalized parity plus source-hash-change report →
verified pair returned only for parent final-parity verification → migration
values leave scope → parent read-only `bun run docs:check` → 06-L02 hazard
inspection and packaged distribution load before coverage reconciliation.

**Error handling:** use existing bounded compiler/visual error codes. Identity or
slug/locale drift, unknown permission/path, source not in report, missing section,
orphan sidecar, stale receipt, visual mismatch, cleanup failure, unsafe example,
unexpected stable-identity drift, unchanged/nondeterministic source hash, or
compatibility diagnostic fails the wave without promoting remaining assets.
Baseline overwrite/mutation, partial/extra/symlinked inventory, stale/foreign
source or run identity, a write before atomic freeze, malformed/reused/colliding
or capture-substituted `runId`, canonical run-ID serialization, capture identity
mismatch in any `docId`, canonical `locale`, `sectionId`, `visualId`, or `runId`,
including cross-locale/document/section ownership, per-wave/per-promotion
regeneration, a second owner dispatch, dispatch before the last owned edit, or
consumption without recovery also fails. A missing/stale/replaced final member,
noncanonical on-disk bytes, report-to-bundle linkage mismatch, wrong expected
`migrationRunId`, `sourceHash`, `bundleSha256`, `reportSha256`, or
`pairTransactionIdentitySha256`, or frozen-original mismatch also fails. A raw
reopened pair cannot substitute for `VerifiedDocsFinalNativePairHandbackV1`;
neither the expected identity, verified fact, nor pair may reach
`docs:check`/coverage. No parity/hash assertion or return value may consume a
pre-recovery in-memory candidate pair.
A source, sidecar, or receipt that is neither its exact frozen baseline state nor
its deterministic intended migrated state is a conflict and fails before any
later write. The CLI has no wave/skip/reorder/resume-position input; the exact
all-waves invocation always walks internal waves `1 → 2 → 3`. An already exact
intended visual/receipt is not recaptured, and an already exact intended final
owner pair is verified rather than requesting a second regeneration dispatch.

## Sub-Tasks

- [ ] Serialize TASK-547 ownership and migrate all active English metadata/IDs.
- [ ] Add strict, section-bound examples for materially useful workflows.
- [ ] Capture, inspect, and explicitly promote every non-pilot visual wave.
- [ ] Prove native-only normalized semantic identity, expected source-hash
  change, complete joins, and safe cleanup.

## Testing Requirements

- legacy-adapted and native semantic projections preserve every exact
  non-evidence `DocsDocumentV2` field and section byte/identity from the
  68-source golden projection; only planned strict visual/example records and
  their section refs enrich while final `sourceHash` changes deterministically;
- every discovered active English source compiles exactly once natively;
- every example/visual/receipt resolves once by its owning canonical
  `{ docId, locale, sectionId }`; bundle-global `exampleId`/`visualId`
  duplicates, tuple tampering, locale/path mismatch, and orphan refs fail;
- fixture tests cover all three waves, pilot exclusion, TASK-547 forbidden path,
  unsafe examples, exact schema/audience/permissionRequirement/capability errors,
  path errors, same-`docId`/different-locale sources with distinct section
  ownership, cross-locale example/visual/action rejection, and no false `pl`
  completion metadata;
- `tests/unit/documentation/docsGuideMigrationBaseline.test.ts` proves recovery
  precedes the original read; exact three-file atomic/fsync inventory; strict
  receipt round-trip; same immutable caller/run/hash identity across three
  waves, restart, and final verified handback fact; and rejection of prior write,
  partial/extra/nested/symlinked/tampered/stale/foreign inventory, overwrite,
  replacement, wrong discriminator, source inventory/projection drift,
  `bundleSourceHash`/`bundleSha256` mismatch, changed caller identity, and
  recovery failure before any source write;
- run exactly
  `bun test tests/unit/documentation/docsGuideMigrationBaseline.test.ts`;
- native migration tests prove the exact immediately-before-heading directive
  serializer/parser round-trip and reject missing, duplicate, non-contiguous,
  reordered, orphaned, detached, alternate-location, or mismatched
  `headingOccurrence`→`sectionId` joins;
- prove this leaf never writes `core/generated/docs/coderso-docs-v2.json` or the
  generated report; per-wave/per-promotion regeneration rejects; exactly one
  final owner regeneration dispatch occurs after the final edit from baseline
  state; intended state and post-land restart dispatch zero times.
  Missing/stale members,
  a second dispatch, or wrong expected identity blocks `docs:check` and coverage;
- type/shape-negative fixtures pass `verifiedHandback.pair` where
  `VerifiedDocsFinalNativePairHandbackV1` is required and reject it before
  semantic parity. Independently alter expected `migrationRunId`, `sourceHash`,
  `bundleSha256`, `reportSha256`, and `pairTransactionIdentitySha256`; each
  fails before final parity;
- order spies require recovery followed immediately by
  `verifyDocsFinalNativePairHandbackV1({ expected, bundlePath:
  "core/generated/docs/coderso-docs-v2.json", reportPath:
  ".tmp/docs-corpus/migration-report-v1.json" })`. The owner verifier itself
  performs read-only hazard inspection then the strict pair reopen. Replace,
  remove, stale, or mismatch either final member and prove return remains
  blocked. Invoke the same verifier again after simulated restart with the
  already-landed pair and rederived byte-identical expected identity; it returns
  the same strict fact
  and canonical pair with zero compile/promotion/write calls and no additional
  owner dispatch. Only final migration parity receives the verified pair;
  expected identity, fact, and pair never reach `docs:check` or coverage;
- run the only public migration invocation exactly as
  `bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id> --all-waves`;
  its strict CLI rejects unknown/duplicate options, missing or duplicate
  `--migration-run-id`, missing or duplicate `--all-waves`, every `--wave`,
  skip/reorder/resume-position input, and any attempt to serialize operational
  run identity into canonical output;
- inject a crash after each atomic source, sidecar, candidate, and receipt
  promotion boundary; every restart reopens the same typed baseline, resumes
  internal waves `1 → 2 → 3`, accepts only exact baseline-or-intended state,
  and a complete rerun is byte-idempotent; a post-land restart invokes only the
  owner verifier, with no second regeneration dispatch or writer;
- before DB-backed capture, run:

```bash
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable })); if (!reachable) process.exit(1)'
```

- for every exact non-pilot scenario ID in the migration inventory, the
  migration API generates one bounded collision-checked caller-owned CSPRNG
  `runId` and directly calls the lower capture API with
  `{ docId: scenario.docId, locale: scenario.locale, sectionId:
  scenario.sectionId, visualId: scenario.visualId, runId }`; there is no public
  `docs:visual:capture --run-id` command. The TASK-548-02 runner derives the full
  `playwright-cli -s=docs548-<bounded-run-id>` session, restarts the Bun server,
  verifies Admin/front health, and proves scoped fixture cleanup/absence;
- API/CLI parity tests prove the planned scenario resolves to exact
  `{ docId: scenario.docId, locale: scenario.locale, sectionId:
  scenario.sectionId, visualId: scenario.visualId, runId }` at the lower API
  input and capture result, with every field preserved unchanged through
  session and task-scoped temp ownership. Use same-`docId`/same-`sectionId`
  fixtures in two locales plus separate-document and separate-section fixtures;
  reject cross-locale ownership and independently altered `docId`, `locale`,
  `sectionId`, `visualId`, or `runId` before review/promotion. Exact
  `createDocsVisualRunIdV1({ scope: "migration" }, deps?)` yields
  `migration-<32-lowercase-hex>` from 128-bit CSPRNG, injects entropy only in
  deterministic tests, retries collisions at most eight times, and rejects
  malformed/oversized/reused identity, canonical run-ID serialization, or
  runner substitution/generation/normalization;
- inspect each candidate, then run
  `bun run docs:visual:promote --scenario <id>
  --run-id <bounded-run-id-returned-by-capture>
  --raw-reviewed-sha256 <64-lowercase-hex> --reviewed-by <bounded-id>
  --confirm-alt-caption` and retain its reviewed receipt; no `--session`,
  missing/wrong/ambiguous run ID or digest alias, missing explicit content
  confirmation, or loop may auto-approve. The selected ID alone is claimed,
  journaled, recovered and consumed; an otherwise-eligible duplicate is unchanged;
- after all three waves and every non-pilot promotion, run
  `bun run docs:visual:check -- --all`, then request exactly one TASK-548-01-L02
  same-owner final regeneration only from baseline state, run recovery, and call
  the owner verifier with the deterministic expected identity. Return its strict
  in-memory fact only for parent final-parity verification; after simulated
  restart rederive the same expected identity and call the verifier again with
  zero regeneration, promotion, or write, then discard all migration values;
- after parent parity, order spies prove read-only `bun run docs:check` runs
  without an expected-identity/verified-fact/pair input before 06-L02
  independently calls
  `assertNoDocsWorkspaceArtifactPromotionHazardsV1()`, then
  `loadPackagedDocsDistributionBundleV2()`, then reconciliation in both coverage
  modes; neither downstream path calls recovery or the migration pair loader;
- run `bunx vitest run --config vitest.config.ts
  tests/vitest/documentation/docs-corpus-native-migration.test.ts`;
- run `bun --cwd core lint:types` and `bun --cwd core lint`;
- count every touched human-authored production/test file, fail any count above
  1,000 physical lines, and run `git diff --check`.

## Documentation Updates Required

Keep unpromoted candidates and operational logs in task-owned temporary storage;
canonical Guide PNGs/receipts live only in this leaf's Guide asset layout. This
leaf writes no TASK-548 acceptance evidence or alternate evidence file. Pass
bounded final source/visual inventory, normalized parity/source-hash receipt,
DB/health/capture/cleanup summaries, and any justified non-visual document list
to L02 and TASK-548-07 for task/changelog closeout. 07-L01 alone writes the
exact eight final acceptance screenshots.
