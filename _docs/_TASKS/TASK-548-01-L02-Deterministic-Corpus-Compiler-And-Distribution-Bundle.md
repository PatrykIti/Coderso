# TASK-548-01-L02: Deterministic Corpus Compiler and Distribution Bundle
# FileName: TASK-548-01-L02-Deterministic-Corpus-Compiler-And-Distribution-Bundle.md

**Parent Subtask:** TASK-548-01
**Priority:** Critical
**Category:** Documentation Platform / Build / Distribution
**Estimated Effort:** Large
**Dependencies:** TASK-548-01-L01
**Status:** ⏳ To Do

---

## Overview

Build the single deterministic compiler for the v2 contracts. Compile every
currently ingestible English `docs/guide/**/*.md` document through an explicit
legacy-to-v2 compatibility adapter, join strict examples and TASK-548-02 visual
records when present, emit a deterministic native-migration report for
TASK-548-06 at `.tmp/docs-corpus/migration-report-v1.json`, and write
`core/generated/docs/coderso-docs-v2.json`.

Own new compiler modules under `core/services/documentation/compiler/`,
`scripts/docs/compile-corpus.ts`, focused fixtures/tests and the generated
bundle/report. Do not mass-edit production Guide Markdown; TASK-548-06 is its
single writer and freezes the reported IDs into native v2 frontmatter. Do not
add package scripts or CI wiring here; TASK-548-02-L03 owns those shared files
after all commands exist. Do not read `docs/develop` into this bundle.

This leaf is the exclusive whole-family writer of
`core/generated/docs/coderso-docs-v2.json`. Its first run produces the
pre-pilot bundle/report. After TASK-548-02-L02 promotes all five pilot visual
image/receipt/scenario triples, orchestration re-dispatches this same owner
exactly once to refresh and gate the bundle/report before TASK-548-02-L03 or
TASK-548-03 starts. After TASK-548-06-L01 edits the final native Guide sources
and visual triples, orchestration pauses TASK-548-06 and re-dispatches this same
owner exactly once more to regenerate and verify the final bundle and
`.tmp/docs-corpus/migration-report-v1.json`. TASK-548-02 and TASK-548-06 cannot
write either final. No per-wave or per-promotion handback is valid.

## Compiler Contract

- Discover only `docs/guide/**/*.md` after applying the existing explicit
  template/README/coverage exclusions; all discovery is sorted.
- Every discovered ingestible document must compile exactly once, and every
  strict example/scenario/promoted asset/receipt must resolve to exactly one
  document section.
- Preserve existing stable slugs. For legacy input, derive transitional
  `docId`/`sectionId` deterministically from normalized relative path and
  heading occurrence, record them in the migration report, and require
  TASK-548-06 to write back those exact values. Native v2 input must carry
  explicit IDs through L01's exact `[[coderso-section:<ordinal>:<section-id>]]`
  directives before every ATX heading; runtime identity is never derived after
  migration.
- Classify source before parsing. Native v2 frontmatter contains exactly
  `schema: "coderso.docs-document@v2"` and the strict v2 key set. Legacy input
  has no `schema` and must match the frozen allowlist of keys verified from the
  pre-task corpus. A missing/unknown discriminator combined with any v2-only
  key, a native discriminator combined with legacy-only keys, or any partially
  migrated shape fails as `docs_compile_source_ambiguous`; it never guesses.
- Native parsing calls `parseNativeDocsSectionDirectivesV1`; every report
  `headingOccurrence` is the directive's exact one-based ordinal. Legacy parsing
  rejects native directives, while native parsing rejects missing directives.
- Build links nowhere. The bundle carries `slug`, locale, version range and
  `adminPath`; downstream consumers derive Help/public links centrally.
- Serialize with a documented canonical JSON serializer, LF endings and one
  final newline. Exclude timestamps, absolute paths and filesystem metadata.
- Compute `sourceHash` over normalized relative path + exact file bytes for the
  manifest, Markdown, examples, scenario manifests, canonical PNGs and
  promotion receipts. Repeated builds with identical source must be
  byte-identical.
- The generated bundle is the only runtime input. Markdown is not a production
  fallback, and public/embedded consumers do not fetch an external service per
  query.

## Migration Report Contract

The report path and shapes are exact:

```ts
type DocsMigrationReportEntryV1 = {
  sourcePath: string;
  documentId: string;
  locale: string;
  slug: string;
  nativeV2: boolean;
  sourceHash: string;
  sections: {
    headingOccurrence: number;
    sectionId: string;
  }[];
};

type DocsMigrationReportV1 = {
  schema: "coderso.docs-migration-report@v1";
  bundleSourceHash: string;
  bundleSha256: string;
  entries: DocsMigrationReportEntryV1[];
};
```

Entries sort by normalized `sourcePath`; section rows sort by one-based
`headingOccurrence`, exactly matching native directive ordinals. All paths are
repository-relative, hashes are lowercase
SHA-256, all objects reject unknown fields, and the report uses the same
canonical JSON/LF serializer as the bundle. TASK-548-06 consumes this exact
temporary artifact, writes the reported document/section IDs into native v2
frontmatter, and is the only task that edits production Guide Markdown.

After that rewrite, compiling legacy and native representations must preserve
normalized document semantics, permission requirements, capability IDs and
stable IDs. Because exact source bytes change, their `sourceHash` and bundle
bytes are expected to change deterministically; cross-representation
whole-bundle byte parity is explicitly not required.

## Security Contract

- **Endpoint/auth/RBAC/CSRF/rate limit:** no endpoint; build/local command only.
- **Input boundary:** accept only confined files selected from fixed
  `docs/guide` directories; reject symlinks escaping root, traversal, duplicate
  normalized paths, unknown extensions and case-colliding paths.
- **Validation:** run TASK-548-01-L01 schemas before joins and after bundle
  creation; fail on unresolved/orphan refs, hash mismatch, remote asset,
  unsupported media, unsafe Markdown or unknown key.
- **Anti-abuse:** bounded file bytes/counts/aggregate bytes/diagnostics; no
  nonce/HMAC/CAPTCHA applies.
- **Secrets/privacy:** never print document/example bodies in diagnostics; scan
  source metadata and examples for secret-like values before output.

## Recoverable Pair-Promotion Protocol

The single reusable owner is
`core/services/documentation/artifacts/durablePairPromotionV1.ts`. No visual or
compiler module may duplicate its phase/recovery state machine. It exports
exactly:

```ts
type DurablePairPromotionPhaseV1 =
  | "prepared"
  | "member-0-promoted"
  | "member-1-promoted"
  | "verified-commit";

type DurablePairPromotionMemberV1 = {
  memberId: "member-0" | "member-1";
  finalPath: string;
  stagedPath: string;
  backupPath: string | null;
  previous:
    | { state: "absent" }
    | { state: "present"; sha256: string };
  nextSha256: string;
};

type DurablePairPromotionJournalV1 = {
  schema: "coderso.durable-pair-promotion@v1";
  transactionKind: string;
  transactionId: string;
  phase: DurablePairPromotionPhaseV1;
  members: [
    DurablePairPromotionMemberV1,
    DurablePairPromotionMemberV1
  ];
};

type DurablePairPromotionConfigV1 = {
  transactionKind: string;
  journalPath: string;
  allowedRoots: readonly string[];
};

type DurablePairPromotionInputMemberV1 = {
  memberId: "member-0" | "member-1";
  finalPath: string;
  bytes: Uint8Array;
};

type DurablePairPromotionResultV1 = {
  committed: true;
  transactionId: string;
  cleanup: "complete" | "retry-required";
};

type DurablePairRecoveryResultV1 = {
  state: "none" | "restored-previous" | "retained-commit";
  cleanup: "complete" | "retry-required";
};

durablePairPromotionV1(input: {
  config: DurablePairPromotionConfigV1;
  members: readonly [DurablePairPromotionInputMemberV1, DurablePairPromotionInputMemberV1];
  validateCommittedPair: () => Promise<void>;
}): Promise<DurablePairPromotionResultV1>;

recoverDurablePairPromotionV1(
  config: DurablePairPromotionConfigV1
): Promise<DurablePairRecoveryResultV1>;
```

The public final paths remain exactly
`core/generated/docs/coderso-docs-v2.json` and
`.tmp/docs-corpus/migration-report-v1.json`. Pair promotion additionally owns
the confined config
`DOCS_WORKSPACE_ARTIFACT_PROMOTION_V1 = { transactionKind:
"docs-workspace-bundle-report", journalPath:
".tmp/docs-corpus/promotion-transaction-v1.json", allowedRoots:
["core/generated/docs", ".tmp/docs-corpus"] }`.

Each member records bounded repository-relative final/staged/nullable-backup
paths plus old/new lowercase SHA-256 identities and prior absence. Unknown
fields, absolute/traversing/symlinked paths, mismatched transaction IDs or
hashes fail closed. Journal creation and **every** phase transition, including
`verified-commit`, use exactly: write a temporary sibling → fsync that temporary
file → atomic rename to the journal path → fsync the owning directory. Every
final/backup rename also fsyncs its owning directory before the next phase.

The workspace wrapper is exactly
`recoverDocsWorkspaceArtifactPromotionV1()`, which delegates to
`recoverDurablePairPromotionV1(DOCS_WORKSPACE_ARTIFACT_PROMOTION_V1)`. It runs
only before repository compiler `--write`/`--check`, migration, portal build,
coverage and release tooling reads the workspace pair. Recovery always reopens
and recursively validates the durable journal and current final/staged/backup
hashes; caught code never trusts an in-memory `phase`. Recovery is idempotent:

- no journal allows either both finals absent for the initial `--write` or both
  present and pair-valid; mixed presence fails closed;
- `prepared`, `member-0-promoted` or `member-1-promoted` is pre-commit and restores
  both old identities or prior absence from the journal, regardless of which
  rename actually completed, then verifies the restored pair;
- `verified-commit` validates both new identities, never rolls back, and retries
  only owned backup/staging/journal cleanup;
- missing/tampered recovery material blocks every consumer with
  `docs_compile_recovery_required`; it never guesses or accepts a mixed pair.

`durablePairPromotionV1` owns one outer `try/catch` around staging, every phase
write, both member promotions, committed-pair validation and cleanup. On every
caught exception it discards any cached journal object and calls
`recoverDurablePairPromotionV1(input.config)`, which reopens the durable journal
and recomputes every artifact hash before deciding rollback versus
commit-retention. This also covers the boundary where the `verified-commit`
journal rename has landed but the following directory-fsync helper throws:
fresh recovery observes the on-disk committed phase, verifies and retains both
new members, and reports cleanup separately. If recovery itself fails, preserve
the original bounded error as primary and attach bounded recovery/cleanup
evidence without masking either failure.

Production Docker/package output contains the validated generated bundle only,
not `.tmp`, the migration report, workspace backups or this journal. Production
startup/reindex validates and loads that packaged bundle independently and never
calls workspace recovery.

## Implementation Pseudocode

```ts
export async function compileDocsCorpusV2(options: CompileDocsOptions) {
  const root = await resolveConfinedDocsRoot(options.root);
  const manifest = normalizeDocsCorpusManifestV2(await readRootManifest(root));
  const sourceFiles = await collectSortedDocsSources(root);
  const parsed = sourceFiles.markdown.map((source) => {
    const kind = classifyDocsSourceKind(source.frontmatter);
    if (kind === "native-v2") {
      return parseNativeDocsDocumentV2(
        source,
        parseNativeDocsSectionDirectivesV1(source.body)
      );
    }
    if (kind === "legacy-v1") {
      return parseLegacyDocsDocumentV1ToV2(source);
    }
    throw new Error("docs_compile_source_ambiguous");
  });
  const documents = parsed.map((item) => item.document);
  const examples = loadStrictExamples(sourceFiles.examples);
  const visuals = loadPromotedVisuals(sourceFiles.scenarios, sourceFiles.images, sourceFiles.receipts);
  const joined = attachExamplesAndVisuals(documents, examples, visuals);
  assertCompleteCorpusGraph(joined, sourceFiles);
  const sourceHash = hashCanonicalSourceSet(sourceFiles);
  const bundle = normalizeDocsDistributionBundleV2({ ...manifest, sourceHash, documents: joined });
  const bundleBytes = serializeCanonicalDocsBundle(bundle);
  const migrationReport = normalizeDocsMigrationReportV1({
    schema: "coderso.docs-migration-report@v1",
    bundleSourceHash: sourceHash,
    bundleSha256: sha256(bundleBytes),
    entries: buildCanonicalMigrationEntries(parsed),
  });
  return { bundle, bundleBytes, migrationReport };
}

export async function promoteDocsArtifactPair(result: CompiledDocsCorpusV2) {
  await recoverDocsWorkspaceArtifactPromotionV1();
  const reportBytes = serializeCanonicalMigrationReport(result.migrationReport);
  await validateDocsArtifactPairBytes({
    bundleBytes: result.bundleBytes,
    reportBytes,
    reportSchema: "coderso.docs-migration-report@v1",
    expectedBundleSha256: result.migrationReport.bundleSha256,
    expectedBundleSourceHash: result.migrationReport.bundleSourceHash,
  });
  const promotion = await durablePairPromotionV1({
    config: DOCS_WORKSPACE_ARTIFACT_PROMOTION_V1,
    members: [
      { memberId: "member-0", finalPath: DOCS_BUNDLE_PATH, bytes: result.bundleBytes },
      {
        memberId: "member-1",
        finalPath: ".tmp/docs-corpus/migration-report-v1.json",
        bytes: reportBytes,
      },
    ],
    validateCommittedPair: () => validateFinalDocsArtifactPair({
      expectedBundleSha256: result.migrationReport.bundleSha256,
      expectedBundleSourceHash: result.migrationReport.bundleSourceHash,
    }),
  });
  return {
    ...promotion,
    bundleSha256: result.migrationReport.bundleSha256,
  };
}
```

**Data flow:** confined sorted file set → strict parse → graph join →
post-join validation → canonical sort/serialization → SHA-256 → staged pair
validation → durable prepared journal → phase-recorded final renames → verified
commit point → settled cleanup. Before `verified-commit`, any caught error or
later process restart invokes fresh on-disk recovery, restores both prior
artifacts or their prior absence and preserves primary, rollback and cleanup
diagnostics. After the durable commit
phase no rollback is attempted: recovery validates the new pair and cleanup
cannot mask or corrupt it. Incomplete committed cleanup returns structured
`committed: true` evidence and leaves the verified journal for idempotent retry.
Thus both public final identities advance or neither does, including process
termination between renames. `--check` compiles both in memory, first recovers
any journal, and compares both final byte sets without mutation.

**Error handling:** use bounded `docs_compile_source_missing`,
`docs_compile_source_escaped`, `docs_compile_ref_missing`,
`docs_compile_orphan`, `docs_compile_hash_mismatch`,
`docs_compile_source_ambiguous`, `docs_compile_migration_report_invalid`,
`docs_compile_nondeterministic`, `docs_compile_generated_stale` and
`docs_compile_recovery_required`. A failure must not truncate or partially
replace the last valid bundle.

**Regression-test shape:** compile the same fixture under different absolute
roots, directory enumeration order and timezone and assert byte/hash identity;
test stale `--check`, atomic-write failure, orphan/missing/case-colliding paths,
duplicate IDs, tampered PNG/receipt, docs/develop exclusion and all legacy
English document coverage. Assert the migration report is stable, collision-safe
and assigns every legacy document/section exactly once; generated documents
must equal the discovered ingestible set exactly. Reject partial/ambiguous
frontmatter. Convert a legacy fixture using the report and prove native-v2
recompilation preserves normalized semantics and stable IDs while changing
`sourceHash` deterministically. Inject failure at each staged/final rename,
every journal temp-write/fsync/rename/directory-fsync, final-pair validation,
rollback, backup retirement and staging cleanup; prove
pre-commit failures restore both previous identities and preserve every
diagnostic, while post-commit cleanup failures report a valid committed pair
without rollback or error masking. Spawn and terminate a real child process
after every durable journal phase and each final rename, then run recovery in a
fresh process; assert old-pair restoration before commit, new-pair retention
after commit, idempotent repeated recovery and fail-closed tampered/missing
recovery material. Include the exact fault where the `verified-commit` journal
rename has landed and the subsequent helper throws, and prove the catch path
rereads the journal and retains the verified new pair. Force each owned cleanup
operation to fail once, assert `cleanup: "retry-required"`, then prove a fresh
recovery retries and completes cleanup without changing either final identity.
Reject native files with missing/orphan/reordered directives, invalid ordinals,
duplicate section IDs or directive/frontmatter confusion; prove legacy report
entries serialize to exact native directives and round-trip back to identical
section IDs/one-based heading occurrences.

## Sub-Tasks

- [ ] Add small compiler files for discovery, graph joins, hashing,
  serialization, durable journal recovery and atomic output; never grow the 5,530-line
  `scripts/playwright-widget-contract-smoke.ts`.
- [ ] Add `scripts/docs/compile-corpus.ts` with `--write` and read-only `--check`
  modes and safe, bounded diagnostics.
- [ ] Emit a complete stable native-migration report for the current English
  corpus at `.tmp/docs-corpus/migration-report-v1.json`; TASK-548-06 applies the
  exact schema without changing IDs or normalized semantics.
- [ ] Accept the one orchestrator checkpoint after TASK-548-02-L02 has promoted
  all five pilot triples; refresh and gate the same exclusive bundle/report
  before TASK-548-02-L03 or TASK-548-03 starts.
- [ ] Accept the orchestrator handback after TASK-548-06-L01, regenerate the
  same exclusive generated bundle/report from final native sources and return
  verification evidence before TASK-548-06 resumes checks/coverage.
- [ ] Generate the bundle and add
  `tests/vitest/documentation/docs-corpus-compiler.test.ts` plus small fixtures.

## Testing Requirements

- `bun scripts/docs/compile-corpus.ts --check`
- `bun test tests/unit/documentation/docsCorpusPromotionRecovery.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-corpus-compiler.test.ts tests/vitest/documentation/docs-corpus-contract.test.ts`
- run two clean compiles in distinct temporary roots and compare bundle bytes
  and SHA-256
- compile legacy then report-migrated native fixtures; compare normalized
  semantics/stable IDs and assert the changed source bytes produce the expected
  new deterministic `sourceHash`
- failure-inject every pair-promotion rename, validation, rollback and cleanup
  boundary; assert the exact pre-commit rollback/post-commit evidence contract
- terminate a child process between both final renames and at every journal
  phase; run fresh-process recovery before each consumer-read fixture
- land the `verified-commit` journal rename, throw from its following helper,
  and prove catch-time fresh recovery retains the new pair; then prove cleanup
  retry completes in a later fresh process
- after TASK-548-02-L02, run the one same-owner post-pilot refresh and pass this
  complete gate before any L03 staleness or TASK-548-03 consumer work
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Record the exact source inventory, migration rule and deterministic-build command
for TASK-548 closure. Do not publish a second authoring workflow.
