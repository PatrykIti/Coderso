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
TASK-548-06 at the workspace-only ignored path
`.tmp/docs-corpus/migration-report-v1.json`, and write the durable tracked
runtime artifact `core/generated/docs/coderso-docs-v2.json`.

Own new compiler modules under `core/services/documentation/compiler/`,
`scripts/docs/compile-corpus.ts`, focused fixtures/tests and the generated
bundle/report. TASK-548-02-L03 owns the later mutating orchestration command
`scripts/docs/recover-artifacts.ts`, because it lands after the strict visual
validator owner and can wire both recovery families without reopening this
leaf. Do not mass-edit production Guide Markdown; TASK-548-06 is its
single writer and freezes the reported IDs into native v2 frontmatter. Do not
add package scripts or CI wiring here; TASK-548-02-L03 wires the exact
`docs:recover` package command after all commands exist. Do not read
`docs/develop` into this bundle.
This leaf also exclusively owns
`core/services/documentation/artifacts/durablePairPromotionV1.ts`,
`core/services/documentation/artifacts/docsWorkspaceArtifactPromotionV1.ts`
and
`core/services/documentation/artifacts/docsVisualPairPromotionV1.ts`; later
visual, portal, migration, coverage and release leaves import these modules
without reopening them.

This leaf is the exclusive whole-family writer of
`core/generated/docs/coderso-docs-v2.json`. Its first run produces the
pre-pilot bundle/report. After TASK-548-02-L02 promotes all five pilot visual
image/receipt/scenario triples, orchestration re-dispatches this same owner
exactly once to refresh and gate the bundle/report before TASK-548-02-L03 or
TASK-548-03 starts. After TASK-548-06-L01 edits the final native Guide sources
and visual triples, orchestration pauses TASK-548-06 and re-dispatches this same
owner exactly once more to regenerate and verify the final bundle and
`.tmp/docs-corpus/migration-report-v1.json`. TASK-548-02 and TASK-548-06 cannot
write either final. The linked two-member transaction is used only by these
explicit TASK-548-01-L02 authoring/migration `--write` runs and handbacks. The
ignored report is not a clean-checkout, runtime, portal, Docker, release,
`docs:check`, or coverage-check prerequisite. No per-wave or per-promotion
handback is valid.

## Compiler Contract

- Discover only `docs/guide/**/*.md` after applying the existing explicit
  template/README/coverage exclusions; all discovery is sorted.
- Every discovered ingestible document must compile exactly once, and every
  strict example/scenario/promoted asset/receipt must resolve to exactly one
  document section by `(docId, locale, sectionId)`. Example sidecars are read
  only from `examples/<docId>/<locale>/<exampleId>.json`; visual triples are
  read only from their matching
  `assets/{scenarios,images,receipts}/<docId>/<locale>/<visualId>.*` paths.
  Every path segment must agree with its strict envelope/receipt identity.
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
Each report `documentId` is exactly the document's translation-family `docId`;
report-entry uniqueness is `(documentId, locale)`, so two locale variants may
intentionally carry the same value.

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
  | "preparing"
  | "prepared"
  | "member-0-promoted"
  | "member-1-promoted"
  | "verified-commit";

type DurablePairPromotionMemberV1 = {
  memberId: "member-0" | "member-1";
  finalPath: string;
  stagingTempPath: string;
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
  journalTempPath: string;
  phase: DurablePairPromotionPhaseV1;
  members: [
    DurablePairPromotionMemberV1,
    DurablePairPromotionMemberV1
  ];
};

type DurablePairPromotionMemberDescriptorV1 = {
  memberId: "member-0" | "member-1";
  finalPath: string;
};

type DurablePairStableMemberV1 = DurablePairPromotionMemberDescriptorV1 & {
  sha256: string;
  bytes: Uint8Array;
};

type DurablePairStablePairV1 =
  | { state: "absent" }
  | {
      state: "partial";
      members: readonly [
        DurablePairStableMemberV1 | null,
        DurablePairStableMemberV1 | null
      ];
    }
  | {
      state: "present";
      members: readonly [
        DurablePairStableMemberV1,
        DurablePairStableMemberV1
      ];
    };

type DurablePairStablePairValidatorV1 = (
  pair: DurablePairStablePairV1
) => Promise<void>;

type DurablePairPromotionConfigV1 = {
  transactionKind: string;
  journalPath: string;
  allowedRoots: readonly string[];
  members: readonly [
    DurablePairPromotionMemberDescriptorV1,
    DurablePairPromotionMemberDescriptorV1
  ];
  validateStablePair: DurablePairStablePairValidatorV1;
};

type DurablePairPromotionInputMemberV1 = {
  memberId: "member-0" | "member-1";
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
}): Promise<DurablePairPromotionResultV1>;

recoverDurablePairPromotionV1(
  config: DurablePairPromotionConfigV1
): Promise<DurablePairRecoveryResultV1>;
```

The public final paths and validator are encoded in the durable config, not
supplied ad hoc by a caller:

```ts
const DOCS_WORKSPACE_ARTIFACT_PROMOTION_V1 = {
  transactionKind: "docs-workspace-bundle-report",
  journalPath: ".tmp/docs-corpus/promotion-transaction-v1.json",
  allowedRoots: ["core/generated/docs", ".tmp/docs-corpus"],
  members: [
    {
      memberId: "member-0",
      finalPath: "core/generated/docs/coderso-docs-v2.json",
    },
    {
      memberId: "member-1",
      finalPath: ".tmp/docs-corpus/migration-report-v1.json",
    },
  ],
  validateStablePair: validateDocsWorkspaceArtifactStablePairV1,
} as const satisfies DurablePairPromotionConfigV1;
```

`validateDocsWorkspaceArtifactStablePairV1` recognizes exactly three stable
workspace prestates:

- `bootstrap-none`: both members absent before the initial owner write;
- `packaged-bundle-only`: member 0 is the strict tracked generated bundle and
  member 1 is absent, as in a clean clone/tag/runtime package;
- `linked-pair`: both strict members are present and the report's exact
  `bundleSourceHash`/`bundleSha256` linkage matches member 0.

Report-only partial state is always invalid. The generic partial representation
exists only so this workspace config can preserve a clean-checkout
`packaged-bundle-only` prestate across an interrupted explicit owner promotion;
the visual-pair validator rejects every partial state. Every promotion input
must match the config's two member IDs in tuple order; callers cannot replace
either final path or validator.

Before any member temp write or staged rename, compute both next hashes, inspect
and hash both prior finals, allocate the bounded transaction ID, and derive
every exact repository-relative path from the config plus that ID. Member temp,
staged and nullable-backup paths and the exact journal temp path are all
recorded in the journal; callers cannot supply or substitute them. Unknown
fields, absolute/traversing/symlinked paths, mismatched derived paths,
transaction IDs or hashes fail closed.

The first durable action is writing phase `preparing`: write the exact journal
temp → fsync that file → atomic rename to `config.journalPath` → fsync the
journal directory. No member temp/staged/backup write or rename is reachable
until that directory fsync succeeds. Then stage each next member independently:
write its recorded `stagingTempPath` → fsync it → rename it to the recorded
`stagedPath` → fsync the owning directory. Reopen and hash both staged files,
construct the exact present stable pair and run `config.validateStablePair`;
only after it passes may the journal transition to `prepared`. Every transition
through `prepared`, both promoted phases and `verified-commit` repeats the exact
journal-temp write/fsync/rename/directory-fsync sequence. Every final/backup
rename also fsyncs its owning directory before the next phase.

The workspace wrapper module
`core/services/documentation/artifacts/docsWorkspaceArtifactPromotionV1.ts`
exports exactly:

```ts
type DocsWorkspaceArtifactStablePrestateV1 =
  | "bootstrap-none"
  | "packaged-bundle-only"
  | "linked-pair";

assertNoDocsWorkspaceArtifactPromotionHazardsV1(): Promise<
  DocsWorkspaceArtifactStablePrestateV1
>;

recoverDocsWorkspaceArtifactPromotionV1(): Promise<
  DurablePairRecoveryResultV1
>;

loadAndValidateRecoveredDocsArtifactPair(input: {
  bundlePath: "core/generated/docs/coderso-docs-v2.json";
  reportPath: ".tmp/docs-corpus/migration-report-v1.json";
}): Promise<{
  bundle: DocsDistributionBundleV2;
  report: DocsMigrationReportV1;
}>;
```

`recoverDocsWorkspaceArtifactPromotionV1()` delegates to
`recoverDurablePairPromotionV1(DOCS_WORKSPACE_ARTIFACT_PROMOTION_V1)` and is
mutating. It runs only from the explicit recovery command or a write command
that intentionally invokes recovery. `assertNoDocsWorkspaceArtifactPromotionHazardsV1`
is read-only: it rejects a live journal in any phase, an orphan journal temp,
any owned staging/backup artifact, report-only state, symlink/path anomaly,
invalid packaged bundle or invalid linked pair with
`docs_compile_recovery_required`; it never renames, deletes, truncates or
creates a file. It accepts and strictly validates `bootstrap-none`,
`packaged-bundle-only`, and `linked-pair`, returning the exact classification.
`loadAndValidateRecoveredDocsArtifactPair` is workspace-only, requires both
members and may run only after successful recovery in an explicit
TASK-548-01-L02 authoring/migration `--write` flow or from the corresponding
TASK-548-06-L01 migration handback. It reopens both exact finals without
following symlinks, validates both strict schemas plus exact
`bundleSourceHash`/`bundleSha256` linkage, and rejects an absent report or any
live journal before returning either value. The packaged production loader
`loadPackagedDocsDistributionBundleV2()` is separate and never imports this
workspace module or reads `.tmp`.

The same leaf pre-lands the visual wrapper module so the initial compiler can
recover pilot transactions before TASK-548-02-L02 exists. It exports exactly:

```ts
createDocsVisualPairPromotionConfigV1(input: {
  docId: string;
  locale: string;
  sectionId: string;
  visualId: string;
  validateStablePair: DurablePairStablePairValidatorV1;
}): DurablePairPromotionConfigV1;

type DocsVisualPairIdentityV1 = {
  docId: string;
  locale: string;
  sectionId: string;
  visualId: string;
};

type DocsVisualStablePairValidatorFactoryV1 = (
  identity: DocsVisualPairIdentityV1
) => DurablePairStablePairValidatorV1;

assertNoDocsVisualPairPromotionHazardsV1(input: {
  validateStablePairForVisual: DocsVisualStablePairValidatorFactoryV1;
}): Promise<void>;

recoverAllDocsVisualPairPromotionsV1(input: {
  validateStablePairForVisual: DocsVisualStablePairValidatorFactoryV1;
}): Promise<DurablePairRecoveryResultV1[]>;
```

The visual config validates canonical `docId`, BCP-47 `locale`, `sectionId` and
bundle-global `visualId`, returns transaction kind
`"docs-visual-image-receipt"`, uses
`.tmp/docs-visuals/transactions/<docId>/<locale>/<visualId>/promotion-transaction-v1.json`,
and owns exact descriptors for
`docs/guide/assets/images/<docId>/<locale>/<visualId>.png` and
`docs/guide/assets/receipts/<docId>/<locale>/<visualId>.json`. It allows only
those roots and that exact localized transaction directory. TASK-548-02-L02
supplies the same `DocsVisualStablePairValidatorFactoryV1` to both mutating
recovery and the read-only hazard inspector; this wrapper owns no receipt
schema and never substitutes an absence-only validator after visuals exist.
Both operations resolve the complete identity from the strict scenario
registry, walk only the exact four-segment transaction layout, sort by locale,
`docId`, `sectionId`, then `visualId`, reject symlink/traversal/unknown entries,
and build each exact config with the factory result. The read-only inspector
performs the same semantic stable-pair validation but never calls recovery or
mutates an artifact.

Recovery always reopens and recursively validates the durable journal and
current final/staged/backup hashes; caught code never trusts an in-memory
`phase`. Recovery is idempotent:

- with no journal, inspect the two exact `config.members` final paths and the
  owned journal-temp/staging/backup namespace. An exact orphan journal temp is
  safe for mutating recovery to remove only because the protocol forbids every
  member write before the preparing-journal rename and directory fsync; the
  read-only inspector reports it without mutation. Both finals absent calls
  `config.validateStablePair({ state: "absent" })`; both present are reopened,
  hashed and passed as an exact ordered `state: "present"` tuple; mixed presence
  or any owned staging/backup artifact fails with
  `docs_compile_recovery_required`;
- `preparing` verifies both finals still match the recorded prior identities,
  deletes only the journal-recorded member temp/staged artifacts, validates the
  restored absent/present stable pair, and retires the exact journal. A final or
  backup mutation while phase is `preparing` is impossible under the protocol
  and fails closed as tampering;
- `prepared`, `member-0-promoted` or `member-1-promoted` is pre-commit and restores
  both old identities or prior absence from the journal, regardless of which
  rename actually completed, then reopens and passes the restored absent/present
  state through `config.validateStablePair`;
- `verified-commit` reopens and passes both new identities through
  `config.validateStablePair`, never rolls back, and retries only owned
  backup/staging/journal cleanup;
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

TASK-548-02-L03 owns `scripts/docs/recover-artifacts.ts` and the one
`recoverDocsArtifactsV1()` orchestration helper after TASK-548-02-L02 exports
the strict validator factory. It imports these unchanged owner APIs, performs
workspace recovery followed by sorted visual-pair recovery with that factory,
and backs `bun run docs:recover`. This leaf does not pre-land a weaker
orchestration helper or reopen it later.

## Implementation Pseudocode

```ts
type CompileDocsOptions = {
  root: "docs/guide";
  mode: "check" | "write";
  visuals:
    | { state: "pre-pilot-empty" }
    | {
        state: "active";
        validateStablePairForVisual: DocsVisualStablePairValidatorFactoryV1;
      };
};

export async function prepareDocsCompilerArtifactStateV1(
  options: Pick<CompileDocsOptions, "mode" | "visuals">
): Promise<void> {
  if (options.mode === "check") {
    await assertNoDocsWorkspaceArtifactPromotionHazardsV1();
  } else {
    await recoverDocsWorkspaceArtifactPromotionV1();
  }
  if (options.visuals.state === "pre-pilot-empty") {
    await assertDocsVisualSourceAndTransactionRootsEmptyV1();
    return;
  }
  if (options.mode === "check") {
    await assertNoDocsVisualPairPromotionHazardsV1({
      validateStablePairForVisual:
        options.visuals.validateStablePairForVisual,
    });
    return;
  }
  await recoverAllDocsVisualPairPromotionsV1({
    validateStablePairForVisual:
      options.visuals.validateStablePairForVisual,
  });
}

export async function compileDocsCorpusV2(options: CompileDocsOptions) {
  await prepareDocsCompilerArtifactStateV1(options);
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
  const examples = loadStrictLocalizedExampleSidecars(
    sourceFiles.examples,
    documents
  );
  const visuals = await loadPromotedVisuals(
    sourceFiles.scenarios,
    sourceFiles.images,
    sourceFiles.receipts
  );
  const joined = attachExamplesAndVisualsByLocalizedOwner(
    documents,
    examples,
    visuals
  );
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
      { memberId: "member-0", bytes: result.bundleBytes },
      {
        memberId: "member-1",
        bytes: reportBytes,
      },
    ],
  });
  return {
    ...promotion,
    bundleSha256: result.migrationReport.bundleSha256,
  };
}
```

The sole initial pre-pilot owner call uses `visuals.state:
"pre-pilot-empty"` and succeeds only when the scenario, image, receipt and
visual-transaction inventories are all absent. It is not a public CLI flag or
an absence validator for an existing pair. After the first TASK-548 visual
lands, every compiler check/write and both same-owner refreshes must use
`visuals.state: "active"` with TASK-548-02-L02's exact
`createDocsVisualStablePairValidatorV1`; a missing factory is a hard
configuration error. TASK-548-02-L03 wires the same active factory into the
root package commands.

**Data flow:** confined sorted file set → strict parse → graph join →
post-join validation → canonical sort/serialization → SHA-256 → prior-final
inspection → durable preparing intent → staged-pair validation → durable
prepared transition → phase-recorded final renames → verified commit point →
settled cleanup. Before `verified-commit`, any caught error or
later process restart invokes fresh on-disk recovery, restores both prior
artifacts or their prior absence and preserves primary, rollback and cleanup
diagnostics. After the durable commit
phase no rollback is attempted: recovery validates the new pair and cleanup
cannot mask or corrupt it. Incomplete committed cleanup returns structured
`committed: true` evidence and leaves the verified journal for idempotent retry.
Thus both public final identities advance or neither does, including process
termination between renames. `--check` first runs only the two read-only hazard
inspectors, compiles both artifacts in memory and compares final bytes without
any filesystem mutation. A journal, backup, staging artifact or mixed pair
returns `docs_compile_recovery_required` and directs the operator to the exact
mutating `bun run docs:recover` command. `--write` may explicitly recover before
staging.

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
an exact duplicate `(docId, locale)`, bundle-global visual/example duplicates,
tampered PNG/receipt, localized path/envelope drift, docs/develop exclusion and
all legacy English document coverage. Accept the same translation-family
`docId` and section ID in two supported locales, then prove example/visual
sidecars join only their explicit locale.
Assert the migration report is stable, collision-safe and assigns every legacy
document/section exactly once; its `(documentId, locale)` pairs and generated
documents must equal the discovered ingestible set exactly. Reject partial/ambiguous
frontmatter. Convert a legacy fixture using the report and prove native-v2
recompilation preserves normalized semantics and stable IDs while changing
`sourceHash` deterministically. Inject failure at the preparing-journal temp
write, file fsync, rename and directory fsync, then at each member's recorded
staging-temp write, file fsync, staged rename and directory fsync. Prove no
member write is reachable before durable `preparing`; no durable `prepared`
transition exists until both staged bytes are reopened, hashed and accepted by
`validateStablePair`. Also inject every final rename,
every journal temp-write/fsync/rename/directory-fsync, stable-pair validation,
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
Terminate a fresh process at every preparing and member-staging boundary;
recovery must remove only journal-recorded pre-final debris and preserve and
validate both prior finals. Exercise no-journal both-absent, both-present-valid
and mixed-presence states for workspace and visual configs; prove validation
runs for both stable states, an orphan exact journal temp is safely recoverable
only with no member debris, and mixed presence or unrecorded staging/backup
fails closed. Instrument filesystem
mutators and prove `--check` makes zero write/rename/delete/fsync calls for
clean, stale and recovery-required fixtures, while `docs:recover` performs the
required recovery and a following `--check` remains read-only.
Reject native files with missing/orphan/reordered directives, invalid ordinals,
duplicate section IDs or directive/frontmatter confusion; prove legacy report
entries serialize to exact native directives and round-trip back to identical
section IDs/one-based heading occurrences.

## Sub-Tasks

- [ ] Add small compiler files for discovery, graph joins, hashing,
  serialization, durable journal recovery and atomic output; never grow the 5,530-line
  `scripts/playwright-widget-contract-smoke.ts`.
- [ ] Add `scripts/docs/compile-corpus.ts` with `--write` and read-only `--check`
  modes and safe, bounded diagnostics. `--check` must never call recovery or
  perform any write/rename/delete/fsync; a hazard returns
  `docs_compile_recovery_required`.
- [ ] Hand the unchanged workspace/visual recovery exports and
  `DocsVisualStablePairValidatorFactoryV1` type to TASK-548-02-L03; that leaf
  owns `scripts/docs/recover-artifacts.ts`, `recoverDocsArtifactsV1()` and the
  sole root-package `docs:recover` wiring after the strict receipt validator
  exists.
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
- cover the preparing-journal temp/file-fsync/rename/directory-fsync boundary,
  both staging file/directory fsyncs before `prepared`, and no-journal
  absent/present/mixed plus orphan journal-temp and owned staging/backup states
- terminate a child process at every preparing/member-staging boundary,
  between both final renames and at every later journal phase; run fresh-process
  recovery before each consumer-read fixture
- land the `verified-commit` journal rename, throw from its following helper,
  and prove catch-time fresh recovery retains the new pair; then prove cleanup
  retry completes in a later fresh process
- after TASK-548-02-L02, run the one same-owner post-pilot refresh and pass this
  complete gate before any L03 staleness or TASK-548-03 consumer work
- spy every filesystem mutator to prove `--check` is read-only and the exact
  `docs:recover` command is the only operator-directed recovery path
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Record the exact source inventory, migration rule and deterministic-build command
for TASK-548 closure. Do not publish a second authoring workflow.
