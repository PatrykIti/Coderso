# TASK-548-06: Corpus and Visual Migration
# FileName: TASK-548-06-Corpus-And-Visual-Migration.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Documentation / Migration / Coverage
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 `✅ Done` and TASK-547 terminal plus a TASK-548
parent amendment naming and serializing every literal final overlapping
user/developer/shared-doc path before any implementation; TASK-548-05;
TASK-548-01-L02 workspace-pair recovery and same-owner refresh/verification gates
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Migrate the complete active English `docs/guide` corpus from compatibility input
to native v2 metadata, stable sections, strict examples, and reviewed canonical
visuals. Then generate, rather than hand-assert, complete document/Admin route/
permission/publication/link coverage.

This is a content migration over the contracts and tooling already landed in
TASK-548-01 through TASK-548-05. It cannot invent a second schema, route table,
visual workflow, public URL builder, or search source. English completion does
not imply that a Polish Admin UI or Polish documentation is complete.

## Locked Migration Contract

- Only TASK-548-06-L01's explicit migration flow reads a workspace bundle/report
  pair. Before the first original read it calls
  `recoverDocsWorkspaceArtifactPromotionV1()` and the strict pair loader. For
  the final pair it derives the exact expected identity, recovers, dispatches
  the TASK-548-01-L02 writer only from baseline state, recovers again, and calls
  the owner's read-only `verifyDocsFinalNativePairHandbackV1`; recovery failure
  `docs_compile_recovery_required` is blocking. Coverage, portal, release,
  clean clone/tag, Docker, `docs:check`, and packaged runtime/startup use the
  sole atomic tracked-bundle loader, whose same transaction inspects hazards, and never
  require `.tmp`, the report, journal, migration baseline, or verified fact.
- The exact `.tmp/docs-corpus/migration-report-v1.json` with discriminator
  `coderso.docs-migration-report@v1` must match the original bundle's
  `bundleSourceHash` and `bundleSha256`. Before any owned write, L01 atomically
  creates one strict immutable `FrozenGuideMigrationBaselineV1` capsule under
  `.tmp/docs-corpus/task-548-migration-baseline/`. Its exact inventory is the
  original bundle bytes, original report bytes, and one receipt binding both
  hashes, `sourceHash`, normalized semantic projection, caller-owned migration
  run identity, and a bounded ordered per-source inventory containing each
  relative path plus exact baseline/intended byte length and SHA-256. All three waves, process restarts, and
  the later verified-fact parity pass reopens that same capsule; they never
  regenerate, overwrite, or silently repair it. Stale, foreign, partial,
  mutated, or extra inventory blocks before a source write.
- L01 owns the exact initial-create-only four-key
  `CreateFrozenGuideMigrationBaselineInput = { migrationRunId, reportPath,
  bundlePath, sources }`; recovery by run ID selects either that pristine create
  or a path-free reopen. Both return `ReopenedFrozenGuideMigrationBaselineV1 =
  { receipt, sourceRecords, report, bundle }`. Resume never supplies or rereads
  current sources as a new baseline. The receipt is capped before parsing; then both
  stored regular members are byte-capped, hashed, run/link validated, and only
  then parsed and normalized. Parent and both leaves consume that typed result,
  never independently parse a stored member.
- `entry.documentId` maps byte-for-byte to native `docId`; the exact document
  identity is `(docId, locale)`, and translations may share a `docId`. Each
  `sections[].headingOccurrence` maps explicitly to its reported `sectionId`.
  L01 writes the exact owner directive
  `[[coderso-section:<ordinal>:<section-id>]]` immediately before, with no blank
  line, every level 1–4 ATX heading. It uses
  `serializeNativeDocsSectionDirectiveV1` and verifies with
  `parseNativeDocsSectionDirectivesV1`; ordinals are contiguous `1..N` in source
  order. Duplicate, missing, reordered, orphaned, or heading-detached mappings
  fail before promotion. Native frontmatter/directives change source bytes, so
  a deterministic new `sourceHash` is expected; stable IDs, slugs, links, and
  normalized semantic fields must remain equal to the frozen original.
- Every active ingestible English `docs/guide/**/*.md` document is migrated;
  template, README, generated matrix, retired/non-ingestible files follow the
  compiler's explicit exclusions.
- Frontmatter uses the exact v2 names and shapes:
  `schema: "coderso.docs-document@v2"`, `docId`, `locale`, `slug`, `title`,
  `summary`, singular `audience`, `productArea`, `productVersionRange`,
  `adminPath`, `permissionRequirement`, `capabilityIds`,
  `publicationTargets`, and `keywords`. Permission requirements preserve
  `null`, `allOf`, and `anyOf` semantics; no `requiredPermissions`, plural
  `audiences`, or generic permission-set alias is valid.
- Strict example and visual sources carry the owning canonical BCP-47
  `{ docId, locale, sectionId }` tuple. `sectionId` is scoped to that localized
  document, while `exampleId` and `visualId` stay bundle-global. Prose,
  captions, alt text, scenario steps, and examples carry meaning; screenshots
  are never the only explanation, and one locale can never resolve another
  locale's sidecar or action.
- TASK-548-02-L02 retains sole ownership of its pilot image/scenario/receipt.
  L01 owns every non-pilot migration scenario, reviewed PNG, receipt, and
  guide-owned example introduced by this migration.
- Visual capture uses synthetic fixtures and the landed explicit
  capture → inspect → promote flow. Generated or changed images are never
  auto-approved. The migration caller creates every bounded, collision-checked
  run ID through exact TASK-548-02-L01 owner
  `createDocsVisualRunIdV1({ scope: "migration" }, deps?)`, yielding
  `migration-<32-lowercase-hex>` from 128-bit CSPRNG with at most eight
  collision retries. It passes the ID explicitly and unchanged through capture;
  only deterministic tests inject entropy. Run IDs never enter canonical Guide,
  bundle, coverage, image, or promotion artifacts.
- TASK-548-01-L02 remains the sole writer of
  `core/generated/docs/coderso-docs-v2.json` and its generated migration report.
  After all three L01 native-source/visual waves and promotions, L01 pauses
  and deterministically builds `DocsFinalNativePairExpectedIdentityV1` from the
  caller migration run and intended final compile. Baseline state dispatches
  one same-owner TASK-548-01-L02 regeneration; exact intended state and any
  restart that recovers the landed intended pair dispatch none. After recovery,
  the owner verifier reopens canonical
  report/bundle bytes, checks every expected hash and transaction identity, and
  returns only a strict in-memory `VerifiedDocsFinalNativePairHandbackV1`.
  It never writes, regenerates, promotes, persists a receipt, or counts as a
  second handback. Final migration parity consumes that fact and the durable
  stored original, not an unverified raw pair. Subsequent read-only `docs:check`
  receives no migration value, and 06-L02 independently calls the atomic tracked-
  bundle loader once and reconciles coverage without the report.
  Per-wave/per-promotion regeneration is forbidden.
  Neither 06 leaf writes the generated bundle or report.
- The only public migration entry point is
  `bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id>
  --all-waves`. It always processes internal waves `1 → 2 → 3`, has no
  wave/skip/reorder/resume-position selector, and resumes by accepting every
  source/sidecar/receipt only when it is byte-exact frozen-baseline state or
  byte-exact deterministic intended migrated state. The direct migration API
  creates a distinct run ID per visual and invokes the lower capture API; there
  is no public capture command that accepts `--run-id`.
- Coverage comes from the compiled bundle, strict manifests, promoted receipts,
  and exact `AdminRouteDescriptorV1` constants imported from
  `core.admin-route-descriptor.ts` and `help.admin-route-descriptor.ts`.
  TASK-548-06-L02 owns only the local loader that combines those constants
  through TASK-548-03's generic normalizer; TASK-548-03 registry-pair tests prove
  Vite parity. Coverage preserves route/document `permissionRequirement`
  null/allOf/anyOf semantics and `capabilityIds`, never imports TSX or
  `import.meta.glob`, and tests the exact descriptor-module inventory.
  L02 owns the exported recursively strict `DocsCoverageReportV2`, its exact
  nested records/limits, `normalizeDocsCoverageReportV2`, canonical
  `serializeDocsCoverageReportV2`, and the sole byte-to-report boundary
  `parseDocsCoverageReportV2(bytes)`, which enforces the byte cap before
  `JSON.parse` and then delegates to the normalizer. Generated records preserve
  exact `(docId, locale)` identity, bind every example/visual asset to
  `{ docId, locale, sectionId }`, keep asset IDs bundle-global, and are
  canonically sorted by `(locale, docId)` with unknown fields rejected.
  `_COVERAGE_MATRIX.md` is
  generated output, not acceptance evidence by itself. Coverage `--write`
  and `--check` both use one zero-input atomic packaged-bundle load with internal
  workspace hazard inspection; neither recovers the pair or requires the
  ignored report. L02's fixed-path durable two-output owner preserves the prior
  JSON/Markdown pair across interrupted replacement; `--write` recovers its own
  journal before promotion, while `--check` uses a read-only inspector and
  reports recovery-required without mutation.

## TASK-547 Serialization

TASK-545 must be `✅ Done` and TASK-547 must be terminal before any TASK-548
implementation. After TASK-547 becomes terminal, the TASK-548 parent must be
amended with every
literal final overlapping user/developer/shared-doc path and a serialized
single writer for each. Before L01 edits `docs/guide`, those literal paths are
forbidden until its assigned handoff; L01 then reads final shipped bytes. L02
re-reads the shipped Admin route registry and Guide tree after that handoff.

Planned TASK-547 routes/features are not documented as available. Because
TASK-547 is terminal before implementation, its actual shipped canonical
path/permission behavior joins reconciliation; behavior from a cancelled or
superseded descendant remains absent. No two agents edit one Guide path in
parallel.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-06-L01 | Native metadata/section/example migration and all non-pilot reviewed visual waves under `docs/guide` | ⏳ To Do |
| TASK-548-06-L02 | Generated coverage matrix/report plus document/link/route/permission/publication reconciliation tooling and tests | ⏳ To Do |

The global execution order already includes one same-owner
`TASK-548-01-L02` post-pilot refresh/gate immediately after
`TASK-548-02-L02` and before `TASK-548-02-L03`/TASK-548-03. Within this family,
the land order is: `TASK-548-06-L01 recover workspace pair and atomically freeze
original report+bundle capsule → all three source/visual waves and promotions →
TASK-548-06-L01 build expected final identity and classify recovered state →
TASK-548-01-L02 one final same-owner generated-pair write/gate only if baseline
→ TASK-548-06-L01 recover and call the idempotent owner verifier → consume its
strict in-memory fact with the stored original only for final parity → read-only
`bun run docs:check` with no migration object input →
TASK-548-06-L02 one zero-input atomic packaged distribution load →
coverage reconciliation in `--write` then `--check` mode`. Operational
refresh/verification calls never change status or transfer/reopen source ownership.

After `TASK-548-06-L02`, the global lifecycle is the exact three-invocation
handoff owned by TASK-548-07-L01 and TASK-548-08:

```text
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause
--- process terminates ---
07-L01-release-resume-committed-head-tree-and-receipt-validation
08-release-resume-fresh-committed-head-drift-gate
07-L01-runtime-docs-and-gates-preparation
07-L01-final-smoke-phase1-owner-pause
--- process terminates ---
07-L01-owner-resume-tracked-parity
08-final-read-only-drift
07-L01-terminal-metadata-closeout-and-mechanical-delta-verification
```

The first invocation prepares release inputs/gates and ends at the owner-only
commit/merge/plain-tag/release/Cloudflare action. Only a fresh eight-field
release-resume may validate the committed HEAD plus TASK-548-05-L01's single
pure `DocsReleaseTreeBindingV1` in the repository-selected SHA-1 or SHA-256
object format, and require that identical binding across immutable release,
publication and TASK-548-05-L02 health receipts before fresh drift, read-only
preparation and smoke. Smoke consumes that already verified handoff and never
downloads health evidence. After the exact-six committed-bootstrap receipt gate,
the exact seven-key TASK-545 phase-1 call pins changelog 1261, slug
`task-548-hybrid-visual-documentation`, role `implement`, the executing
`import.meta.url`, and the smoke result, then pauses and terminates the second
invocation. Only a fresh
checkpoint-bound closure resume may verify tracked parity, run final drift and
perform terminal metadata closeout through TASK-545's sole
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` owner with marker
`ordered-durable-changelog-file-then-index@v1`. The same physical 07-L01 owner executes all
seven normal 07 labels and remains nonterminal until the last label; 08 emits
the returned mechanical delta exactly once. Any non-metadata finding returns to
its sole owning leaf and requires the applicable fresh prerelease/release-resume
cycle. The separately specified invalidated-checkpoint `retirement-restart
invocation` first
confirms owner retirement, derives fixes only from fresh current-tree drift and
ends at a replacement owner release pause; it never skips to smoke or closure.

Neither leaf edits root package/lock/workflows, TASK-548 task/changelog files,
portal/release source, or the TASK-548-02 pilot. Only TASK-548-07 closes statuses
and changelog 1261.

## Security Contract

- **Endpoint/auth/RBAC/CSRF/rate limit:** no endpoint changes. Documentation
  authoring/capture uses existing authenticated local Admin flows and preserves
  their RBAC, CSRF, and rate buckets.
- **Validation:** recursive reject-unknown v2 metadata/sidecars; canonical route
  registry and permission catalog; confined asset paths; hash/receipt/ref/link
  closure; no planned route accepted as shipped.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA. Bound source/asset/example
  bytes, scenario count, browser concurrency, diagnostics, and cleanup retries.
- **Secrets/privacy:** synthetic scoped fixtures only; prose/examples/images/
  receipts exclude credentials, cookies, CSRF values, provider keys, PII,
  submissions, access logs, and internal-only content.
- **Permissions/publication:** fail closed on missing/unknown permissions. A
  `public-docs` record must contain public-safe content; local-only records cannot
  leak into the portal.

## Implementation Pseudocode

```ts
const migrated: GuideCorpusMigrationResultV1 = await migrateGuideCorpus({
  migrationRunId: requireExplicitCallerMigrationRunId(),
  allWaves: true,
});
const {
  baseline,
  verifiedHandback,
} = migrated;
await assertVerifiedFinalNativePairParityAgainstFrozenOriginal({
  baseline,
  verifiedHandback,
  expectedSourceHashChange: true,
});

// No baseline, expected identity, verified fact, workspace report, or pair crosses
// this boundary; the zero-input loader atomically guards and reads one inode.
await runExactReadOnlyGate("bun run docs:check");
const packagedBundle = await loadPackagedDocsDistributionBundleV2();
const coverage = reconcileDocsCoverage({
  bundle: packagedBundle,
  adminRoutes: loadCanonicalAdminRouteCoverageSnapshot(),
  receipts: loadPromotedVisualReceipts(),
});
assertEveryExampleAndVisualOwnsCanonicalDocumentSectionTuple(coverage);
assertCompleteCoverage(
  parseDocsCoverageReportV2(serializeDocsCoverageReportV2(coverage))
);
```

**Data flow:** migration-only recovered workspace pair → one atomic durable linked original
report+bundle capsule → all three
native v2 source/example/reviewed-visual waves using the same mapping →
deterministic intended final compile and expected run/source/bundle/report/pair
identity → recovery and baseline-or-intended classification → zero or one
same-owner compiler regeneration → recovery → idempotent read-only owner
verifier → strict in-memory verified fact with its canonical reopened pair →
final native-vs-original stable-identity/semantic comparison against the
durable stored original, with the expected
source-hash change → migration workspace values leave scope → read-only
`bun run docs:check` atomic load/byte comparison → 06-L02's independent one-call
atomic packaged loader → exact descriptor/permissionRequirement/capability/link/publication
reconciliation, including `assistant`, `embedded-help`, and `public-docs`
consumer filtering → deterministic matrix/report → journaled two-member
coverage-output promotion.

**Error handling:** any report discriminator/bundle-linkage/mapping failure,
identity drift, compatibility fallback use, missing active source,
unreviewed/stale visual, descriptor-inventory or route/path mismatch,
permissionRequirement semantic leak, broken/orphan link, false locale claim,
uncovered capability, target-consumer leak, or missing/stale/wrong-owner
final generated pair or expected identity blocks the leaf. A second owner
dispatch, an attempted
per-wave/per-promotion regeneration, baseline mutation/reload, or any owned write
before the durable capsule is fsynced, reopened, and validated also blocks.
Baseline receipt/run-identity mismatch, partial/extra/symlinked inventory, or a
workspace recovery failure blocks without trusting one pair member. Wrong
expected `migrationRunId`, `sourceHash`, `bundleSha256`, `reportSha256`, or
`pairTransactionIdentitySha256`, noncanonical final bytes, and either-member
tampering fail before parity. A raw reopened pair cannot substitute for
`VerifiedDocsFinalNativePairHandbackV1`; a bundle-only migration loader or
assertion omitting either verified member is invalid. No
expected identity, verified fact, or pair may reach `docs:check` or coverage.
A pending/foreign/tampered coverage-pair journal or an unjournaled singleton
blocks; `--check` never repairs it and `--write` may recover only its exact
journal-bound old/new pair.
Packaged consumers instead reject hazards, report-only state, or invalid/stale
bundle read-only. Previously valid promoted assets remain untouched on failure.

**Regression-test shape:** recovery precedes every workspace-pair read; the
original report and bundle are linked and atomically frozen exactly once before
the first write; all three waves and a restart retain the same durable
run/hash identity; partial/extra/tampered/foreign/stale/replaced capsules and
per-wave/per-promotion regeneration fail. Baseline state dispatches the final
owner writer exactly once after the last edit; intended state and post-land
restart dispatch zero times. Recovery immediately precedes the owner verifier;
the same rederived expected identity and verifier call after simulated restart
return the same strict in-memory fact and canonical pair with zero writes.
Independently wrong expected run/source/bundle/report/transaction identity and
either-member tampering reject before parity. A raw `verifiedHandback.pair`
cannot substitute for the verified fact. Bundle-only migration loading fails.
Order spies prove the fact is consumed only by final migration parity; next is
read-only `bun run docs:check` without migration arguments, then 06-L02's one
atomic packaged-bundle load and both coverage modes.
Normalized legacy/native semantic projection parity preserves stable
IDs/slugs/links/content fields with an expected deterministic `sourceHash`
change; every active English source compiles once without adapter diagnostics;
all sidecars close; route and permission mutations make coverage fail; each
target consumer receives only eligible records and any
assistant/embedded-help/public-docs leak fails; planned TASK-547 behavior is
excluded; real shipped behavior is serialized and covered;
same-`docId`/different-locale fixtures never cross-resolve Guide evidence,
Help/CMS actions, examples, or visuals; no fake Polish route, hreflang, or
completeness claim appears.

## Acceptance Criteria

- The active English Guide corpus is entirely native v2 and compatibility-free.
- Every materially visual active Admin workflow has a relevant reviewed visual;
  every declared non-pilot visual has a current receipt and deterministic source
  hash.
- Every active Admin route/capability has one valid documentation mapping or an
  explicit code-owned exclusion with a tested reason.
- Internal Help, Guide ingest, and public portal publication targets reconcile
  from the same document records.
- One immutable pre-write report/bundle baseline drives all three waves.
  Baseline state triggers exactly one final 01-L02 regeneration; intended state
  and post-land restart trigger none. The read-only owner verifier returns the
  strict
  in-memory fact consumed with stored original bytes only for final parity.
  Read-only `docs:check` then passes without migration values before 06-L02
  reloads the packaged bundle for coverage.
- Locale contracts can accept future Polish documents, but output labels English
  as the only complete locale until real Polish content/UI evidence exists.

## Testing Requirements

- recovery-before-read plus one exact, atomic, fsynced
  `FrozenGuideMigrationBaselineV1` inventory frozen before any source/visual
  write and retained unchanged through all three waves, restart/resume, and
  final comparison
- exact
  `bun test tests/unit/documentation/docsGuideMigrationBaseline.test.ts`
- `bun run docs:visual:check -- --all` after all non-pilot promotions and before
  the final regeneration dispatch
- baseline state invokes exactly one TASK-548-01-L02 same-owner final
  regeneration after all native source/visual changes; intended state and
  post-land restart invoke none. Recovery followed by the owner verifier checks
  canonical
  report/bundle bytes and expected run/source/bundle/report/transaction
  identity; raw-pair substitution and independently wrong fields reject before
  final-vs-stored-original parity
- exact native section-directive round-trip, duplicate/reorder/orphan/heading
  detachment tests and exact
  `createDocsVisualRunIdV1({ scope: "migration" }, deps?)` CSPRNG/output/
  eight-collision-retry/injected-test-entropy/unchanged-pass-through tests
- strict `DocsCoverageReportV2` round-trip, recursive unknown/limit/tamper/
  canonical-sort, both coverage modes' read-only hazard-inspection plus
  packaged-load-before-reconciliation tests, durable coverage-pair crash/recovery
  boundaries, read-only `--check` recovery-required behavior, and a clean-clone bundle-only case
- `bun run docs:check` only after the final verified handback fact and
  migration-only parity pass, with no expected-identity/verified-fact/pair
  argument; both 06-L02 modes
  prove exact read-only hazard-inspector → packaged-loader → reconciliation order
- native-only compile and normalized semantic/stable-identity comparison, with
  expected source-hash change
- focused corpus, visual receipt, coverage, route, link, permission, and exact
  target-consumer publication tests from both leaves
- exact migration command
  `bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id>
  --all-waves`; reject public per-wave/skip/reorder inputs and public capture
  `--run-id`; inject crashes at atomic boundaries, restart through internal
  waves `1 → 2 → 3`, and prove a complete rerun byte-idempotent
- `bun run docs:coverage -- --write` followed immediately by
  `bun run docs:coverage -- --check`, including parser pre-`JSON.parse` byte-cap
  and same-`docId`/different-locale `{ docId, locale, sectionId }` identity/
  action/asset tests. These commands consume the seventh exact root
  `docs:coverage` script owned by TASK-548-02-L03; this family does not edit
  root `package.json`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- touched-file line counts and `git diff --check`

## Documentation Updates Required

Send the final inventory, visual review receipt summaries, normalized
parity/source-hash receipt, route-snapshot handoff, exclusions, coverage report,
and TASK-547 serialization outcome to TASK-548-07 closeout. This family writes
no canonical TASK-548 acceptance screenshot or alternate evidence tree:
07-L01 alone owns the exact eight final screenshots, and
`06-portal-local-exact-latest-rollback.png` is the only canonical portal
screenshot.
