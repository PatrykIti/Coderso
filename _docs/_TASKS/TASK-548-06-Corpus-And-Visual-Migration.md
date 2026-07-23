# TASK-548-06: Corpus and Visual Migration
# FileName: TASK-548-06-Corpus-And-Visual-Migration.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Documentation / Migration / Coverage
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-05; TASK-548-01-L02 workspace-pair recovery and
same-owner refresh/handback gates
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

- Before the first original bundle/report read, before consuming the final
  TASK-548-01-L02 handback, and before any migration, coverage, portal, or
  release-tool workspace-pair input, call the exact owner wrapper
  `recoverDocsWorkspaceArtifactPromotionV1()`. Recovery failure
  `docs_compile_recovery_required` is blocking. Packaged runtime/startup loads
  only `core/generated/docs/coderso-docs-v2.json`; it never calls workspace
  recovery or requires `.tmp`, the report, journal, or migration baseline.
- The exact `.tmp/docs-corpus/migration-report-v1.json` with discriminator
  `coderso.docs-migration-report@v1` must match the original bundle's
  `bundleSourceHash` and `bundleSha256`. Before any owned write, L01 atomically
  creates one strict immutable `FrozenGuideMigrationBaselineV1` capsule under
  `.tmp/docs-corpus/task-548-migration-baseline/`. Its exact inventory is the
  original bundle bytes, original report bytes, and one receipt binding both
  hashes, `sourceHash`, normalized semantic projection, source inventory, and
  caller-owned migration run identity. All three waves, process restarts, and
  the later final-handback verification reopen that same capsule; they never
  regenerate, overwrite, or silently repair it. Stale, foreign, partial,
  mutated, or extra inventory blocks before a source write.
- `entry.documentId` maps byte-for-byte to native `docId`; each
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
- Strict example and visual sidecars join only by stable section ID. Prose,
  captions, alt text, scenario steps, and examples carry meaning; screenshots
  are never the only explanation.
- TASK-548-02-L02 retains sole ownership of its pilot image/scenario/receipt.
  L01 owns every non-pilot migration scenario, reviewed PNG, receipt, and
  guide-owned example introduced by this migration.
- Visual capture uses synthetic fixtures and the landed explicit
  capture → inspect → promote flow. Generated or changed images are never
  auto-approved. The migration caller creates every bounded, collision-checked
  run ID from a CSPRNG, passes it explicitly and unchanged through capture, and
  supports injected entropy only for deterministic tests. Run IDs never enter
  canonical Guide, bundle, coverage, image, or promotion artifacts.
- TASK-548-01-L02 remains the sole writer of
  `core/generated/docs/coderso-docs-v2.json` and its generated migration report.
  After all three L01 native-source/visual waves and promotions, L01 pauses
  exactly once and requests one final same-owner TASK-548-01-L02 regeneration
  handback. Recovery runs before it consumes that returned pair. L01 verifies
  the report/bundle hashes and compares final native output with the durable
  stored original, not an in-memory reconstruction, before `docs:check` or
  06-L02 coverage starts. Per-wave/per-promotion regeneration is forbidden.
  Neither 06 leaf writes the generated bundle or report.
- Coverage comes from the compiled bundle, strict manifests, promoted receipts,
  and exact `AdminRouteDescriptorV1` constants imported from
  `core.admin-route-descriptor.ts` and `help.admin-route-descriptor.ts`.
  TASK-548-06-L02 owns only the local loader that combines those constants
  through TASK-548-03's generic normalizer; TASK-548-03 registry-pair tests prove
  Vite parity. Coverage preserves route/document `permissionRequirement`
  null/allOf/anyOf semantics and `capabilityIds`, never imports TSX or
  `import.meta.glob`, and tests the exact descriptor-module inventory.
  L02 owns the exported recursively strict `DocsCoverageReportV2`, its exact
  nested records/limits, and `normalizeDocsCoverageReportV2`; generated records
  are canonically sorted and reject unknown fields. `_COVERAGE_MATRIX.md` is
  generated output, not acceptance evidence by itself.

## TASK-547 Serialization

Before L01 edits `docs/guide`, TASK-547-06 must name its exact user/developer
guide path. TASK-548 records that path as forbidden while TASK-547 owns it, or
lands after TASK-547 and reads its final shipped bytes. L02 re-reads the shipped
Admin route registry and Guide tree after that handoff.

Planned TASK-547 routes/features are not documented as available. If TASK-547 is
not shipped when the corpus freezes, its future behavior is absent from active
coverage; if it ships first, its actual canonical path/permission behavior joins
the same generated reconciliation. No two agents edit one Guide path in
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
TASK-548-01-L02 one final same-owner generated-bundle/report handback/gate →
TASK-548-06-L01 recover and verify final pair against the stored original →
TASK-548-06-L02`. Operational refresh/handback calls never change status or
transfer/reopen source ownership.

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
await recoverDocsWorkspaceArtifactPromotionV1();
const baseline = await createOrResumeFrozenGuideMigrationBaselineV1({
  migrationRunId: requireExplicitCallerMigrationRunId(),
  reportPath: ".tmp/docs-corpus/migration-report-v1.json",
  bundlePath: "core/generated/docs/coderso-docs-v2.json",
  sourceTree: readUnmodifiedActiveEnglishGuideSources(),
});
for (const wave of ALL_THREE_GUIDE_MIGRATION_WAVES) {
  await applyNativeMetadataExamplesAndReviewedVisuals({
    wave,
    frozenReport: baseline.report,
    frozenBundle: baseline.bundle,
  });
}
const regenerated =
  await requestExactlyOneFinalTask54801L02RegenerationHandback();
await recoverDocsWorkspaceArtifactPromotionV1();
assertOwnerRegeneratedReportAndBundleHashes(regenerated);
const bundle = await loadOwnerGeneratedDocsCorpusV2(regenerated.bundlePath);
assertFinalNativeOutputAgainstFrozenOriginalBaseline({
  baseline,
  regenerated,
  bundle,
  expectedSourceHashChange: true,
});
const coverage = reconcileDocsCoverage({
  bundle,
  adminRoutes: loadCanonicalAdminRouteCoverageSnapshot(),
  receipts: loadPromotedVisualReceipts(),
});
assertCompleteCoverage(normalizeDocsCoverageReportV2(coverage));
```

**Data flow:** recovered workspace pair → one atomic durable linked original
report+bundle capsule → all three
native v2 source/example/reviewed-visual waves using the same mapping → one final
same-owner compiler handback → recovery → final native-vs-stored-original
stable-identity/semantic comparison with expected source-hash change → canonical
owner-regenerated bundle
→ exact descriptor/permissionRequirement/capability/link/publication
reconciliation, including `assistant`, `embedded-help`, and `public-docs`
consumer filtering → deterministic matrix/report.

**Error handling:** any report discriminator/bundle-linkage/mapping failure,
identity drift, compatibility fallback use, missing active source,
unreviewed/stale visual, descriptor-inventory or route/path mismatch,
permissionRequirement semantic leak, broken/orphan link, false locale claim,
uncovered capability, target-consumer leak, or missing/stale/wrong-owner
final regeneration handback blocks the leaf. A second handback, an attempted
per-wave/per-promotion regeneration, baseline mutation/reload, or any owned write
before the durable capsule is fsynced, reopened, and validated also blocks.
Receipt/run-identity mismatch, partial/extra/symlinked inventory, or a workspace
recovery failure blocks without trusting one member of a pair. Previously valid
promoted assets remain untouched on failure.

**Regression-test shape:** recovery precedes every workspace-pair read; the
original report and bundle are linked and atomically frozen exactly once before
the first write; all three waves and a restart retain the same durable
run/hash identity; partial/extra/tampered/foreign/stale/replaced capsules and
per-wave/per-promotion regeneration fail; exactly one final owner handback
occurs after the last edit and recovery precedes consumption; normalized
legacy/native semantic projection parity preserves stable IDs/slugs/links/content
fields with an expected deterministic `sourceHash` change; every active English
source compiles once without adapter diagnostics; all sidecars close; route and
permission mutations make coverage fail; each target consumer receives only
eligible records and any assistant/embedded-help/public-docs leak fails; planned
TASK-547 behavior is excluded; real shipped behavior is serialized and covered;
no fake Polish route, hreflang, or completeness claim appears.

## Acceptance Criteria

- The active English Guide corpus is entirely native v2 and compatibility-free.
- Every materially visual active Admin workflow has a relevant reviewed visual;
  every declared non-pilot visual has a current receipt and deterministic source
  hash.
- Every active Admin route/capability has one valid documentation mapping or an
  explicit code-owned exclusion with a tested reason.
- Internal Help, Guide ingest, and public portal publication targets reconcile
  from the same document records.
- One immutable pre-write report/bundle baseline drives all three waves; exactly
  one final 01-L02 handback is recovered and verified against its stored
  original bytes before coverage.
- Locale contracts can accept future Polish documents, but output labels English
  as the only complete locale until real Polish content/UI evidence exists.

## Testing Requirements

- recovery-before-read plus one exact, atomic, fsynced
  `FrozenGuideMigrationBaselineV1` inventory frozen before any source/visual
  write and retained unchanged through all three waves, restart/resume, and
  final comparison
- exactly one TASK-548-01-L02 same-owner final handback after all native
  source/visual changes, followed by recovery, report/bundle hash and
  final-vs-stored-original verification
- exact native section-directive round-trip, duplicate/reorder/orphan/heading
  detachment tests and caller-owned CSPRNG/injected-test-entropy run-ID tests
- strict `DocsCoverageReportV2` round-trip, recursive unknown/limit/tamper/
  canonical-sort and recovery-before-load tests
- `bun run docs:check` only after that single final handback passes
- `bun run docs:visual:check -- --all`
- native-only compile and normalized semantic/stable-identity comparison, with
  expected source-hash change
- focused corpus, visual receipt, coverage, route, link, permission, and exact
  target-consumer publication tests from both leaves
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- touched-file line counts and `git diff --check`

## Documentation Updates Required

Send the final inventory, visual review evidence, normalized parity/source-hash
receipt, route-snapshot handoff, exclusions, coverage report, and TASK-547
serialization outcome to TASK-548-07.
