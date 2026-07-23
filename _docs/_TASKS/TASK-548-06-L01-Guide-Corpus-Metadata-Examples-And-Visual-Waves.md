# TASK-548-06-L01: Guide Corpus Metadata, Examples and Visual Waves
# FileName: TASK-548-06-L01-Guide-Corpus-Metadata-Examples-And-Visual-Waves.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-06
**Priority:** High
**Category:** Documentation / Content Migration / Visuals
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-05-L02; TASK-547 guide-path ownership resolved;
TASK-548-01-L02 original report/bundle pair before migration and one same-owner
final regeneration handback after all three waves
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
change rather than equal the frozen legacy-adapted bundle hash. Exactly one final
TASK-548-01-L02 handback is allowed after all source/visual edits.

## Exclusive Ownership

This leaf is the sole migration writer for:

- active English documents below `docs/guide/getting-started/`,
  `docs/guide/screens/`, `docs/guide/coderso/`, `docs/guide/playbooks/`, and
  `docs/guide/solution-kits/`;
- their new strict example sidecars in the TASK-548-01-owned sidecar layout;
- every non-pilot TASK-548 scenario, canonical PNG, and promotion receipt under
  the TASK-548-02-owned `docs/guide` asset layout;
- focused native-migration fixtures/tests in
  `tests/vitest/documentation/docs-corpus-native-migration.test.ts`.

Do not edit `docs/guide/README.md`, `_TEMPLATE.md`, `corpus.manifest.json`,
`_COVERAGE_MATRIX.md`, TASK-548-02's named pilot files, shared tooling, root
package/lock/workflows, `core/generated/docs/coderso-docs-v2.json`, the generated
migration report, or any guide path still owned by TASK-547. TASK-548-01-L02
  remains their sole generator/writer; this leaf requests and verifies exactly one
  final handback. L02 owns the generated matrix and reconciliation code.

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
`title`, `summary`, singular `audience`, `productArea`,
`productVersionRange`, canonical `adminPath` or `null`,
`permissionRequirement`, catalog-backed `capabilityIds`, ordered
`publicationTargets`, and `keywords`. Preserve exact
`permissionRequirement: null | { mode: "allOf" | "anyOf"; permissions:
string[] }` semantics. `requiredPermissions`, plural `audiences`, a generic
permission set, and any alternate capability field fail strict validation.
Use the exact IDs emitted by the migration report; do not rederive or prettify
them.

Every procedural document includes verifiable outcome/troubleshooting text. Add
bounded examples where copyable JSON/TypeScript/Bash/text materially helps; each
sidecar binds `exampleId` and `sectionId`, validates independently, and contains
no live credentials or destructive production command.

## Migration Report Handoff

Before any Guide, example, scenario, PNG or receipt write, load exactly:

```text
.tmp/docs-corpus/migration-report-v1.json
core/generated/docs/coderso-docs-v2.json
```

Recursively validate discriminator `coderso.docs-migration-report@v1` and the
exact TASK-548-01-L02 fields `bundleSourceHash`, `bundleSha256`, and sorted
`entries[]`. Read the exact report and owner-generated bundle bytes once,
regenerate the legacy-compatible distribution bundle from the same unmodified
Guide tree without writing either owner output, and prove its `sourceHash` plus
exact file SHA-256 match the report linkage. Deep-freeze the validated report,
bundle, hashes and normalized stable semantic projection as one
`FrozenGuideMigrationBaselineV1`. A stale/foreign pair, prior owned write, later
reload, mutation or replacement blocks all writes.

For every entry, match `entry.sourcePath` to exactly one owned active source,
copy `entry.documentId` byte-for-byte into frontmatter `docId`, preserve
`entry.locale` and `entry.slug`, and map each
`entry.sections[].headingOccurrence` to that heading occurrence's exact
`sectionId`. Every source, document ID, heading occurrence, and section ID must
join once; missing, duplicate, reordered, or orphan mappings fail. The frozen
pair remains immutable pre-migration evidence through all three waves; no
per-wave/per-promotion regeneration is allowed. After the final edit, request
exactly one same-owner TASK-548-01-L02 final handback. Compare final native output
with the frozen projection: IDs, slugs, links and pre-existing normalized fields
stay equal, intentional visual/example enrichment closes, adapter diagnostics are
empty, and the deterministic `sourceHash` differs. Only then may `docs:check` and
06-L02 start.

## Visual Review Contract

A material visual workflow needs at least one screenshot when location, control
state, hierarchy, geometry, theme, responsive behavior, or visible result is
harder to understand from prose. Conceptual/repeated playbooks may reference
their exact underlying Guide document rather than duplicating images.

Each new visual:

- has one strict scenario and synthetic scoped fixture profile;
- receives a bounded, collision-checked `runId` generated and owned by this
  migration caller for its planned `visualId`; capture validates but never
  invents, replaces or reuses it;
- uses the pinned `playwright-cli` runner, named task session, canonical route,
  fixed viewport/theme/locale/timezone, and visible-effect assertions;
- captures into `.tmp`, fails on console/page/request-policy errors, and cleans
  only owned fixtures/processes;
- is inspected for correctness, cropping, legibility, sensitive data, light/dark
  intent, and prose/alt/caption agreement before explicit promotion;
- produces canonical PNG plus receipt with image, scenario, and source hashes;
- joins one existing stable document section and does not replace explanatory
  prose.

TASK-548-02's pilot remains byte-owned by TASK-548-02-L02. This leaf validates
but does not rename, recapture, or re-promote it.

## TASK-547 Serialization

Record TASK-547-06's declared guide path before editing. If it is still in
flight, forbid the exact path in this leaf and leave it to TASK-547. If TASK-547
has landed, read its final bytes and migrate them only when the parent contract
assigns this leaf ownership. Never document a TASK-547 route or installer state
from task prose; derive only from shipped route/permission/source state.

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
export async function migrateGuideCorpus(
  waves: readonly GuideMigrationWave[]
) {
  const baseline = await freezeOriginalGuideMigrationBaselineBeforeAnyWrite({
    reportPath: ".tmp/docs-corpus/migration-report-v1.json",
    bundlePath: "core/generated/docs/coderso-docs-v2.json",
    sources: await readUnmodifiedOwnedActiveEnglishSources(),
  });
  assertExactThreeOrderedMigrationWaves(waves);
  for (const wave of waves) {
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
      await writeNativeDocumentMetadata(source, identity);
      await writeStrictExamples(source);
      for (const scenario of planMaterialVisualScenarios(source)) {
        const runId = await createBoundedCollisionCheckedMigrationRunId({
          visualId: scenario.visualId,
          waveId: wave.waveId,
        });
        const candidate = await captureDocsVisual({
          visualId: scenario.visualId,
          runId,
        });
        assertCaptureIdentity(candidate, {
          visualId: scenario.visualId,
          runId,
        });
        await assertVisibleEffectsAndCleanState(candidate);
        await requireExplicitReviewedPromotion(candidate);
      }
    }
  }
  const regenerated =
    await requestExactlyOneFinalTask54801L02RegenerationHandback();
  assertOwnerGeneratedFinalNativeBundleAndReportHashes(regenerated);
  await assertNativeSemanticParityExpectedHashChangeAndNoAdapterDiagnostics({
    frozenBaseline: baseline,
    regenerated,
  });
}
```

**Data flow:** one frozen original report+bundle pair + shipped routes/permissions
→ three native Markdown/sidecar waves using the same stable mapping →
caller-owned bounded collision-checked `runId` + exact `{ visualId, runId }`
capture → candidate inspection/promotion → one final same-owner compiler handback
→ final native-vs-frozen normalized parity plus source-hash-change report.

**Error handling:** use existing bounded compiler/visual error codes. Identity or
slug drift, unknown permission/path, source not in report, missing section,
orphan sidecar, stale receipt, visual mismatch, cleanup failure, unsafe example,
unexpected stable-identity drift, unchanged/nondeterministic source hash, or
compatibility diagnostic fails the wave without promoting remaining assets.
Baseline reload/mutation, a write before freeze, malformed/reused/colliding or
capture-substituted `runId`, capture identity mismatch, per-wave/per-promotion
regeneration, zero/multiple final handbacks, or a handback before the last owned
edit also fails.

## Sub-Tasks

- [ ] Serialize TASK-547 ownership and migrate all active English metadata/IDs.
- [ ] Add strict, section-bound examples for materially useful workflows.
- [ ] Capture, inspect, and explicitly promote every non-pilot visual wave.
- [ ] Prove native-only normalized semantic identity, expected source-hash
  change, complete joins, and safe cleanup.

## Testing Requirements

- legacy-adapted and native semantic projections preserve exact document/section
  IDs, slugs, links, targets and normalized content while final `sourceHash`
  changes deterministically;
- every discovered active English source compiles exactly once natively;
- every example/visual/receipt resolves once; tampering and orphan refs fail;
- fixture tests cover all three waves, pilot exclusion, TASK-547 forbidden path,
  unsafe examples, exact schema/audience/permissionRequirement/capability errors,
  path errors, and no false `pl` completion metadata;
- migration-baseline fixtures prove the report and bundle are read/linked once
  before any write, retain one object/hash identity across all three waves, and
  reject prior write, reload, mutation, replacement, wrong discriminator, stale
  `bundleSourceHash`, wrong `bundleSha256`, `documentId`→`docId` drift,
  missing/duplicate source entry, and missing/duplicate/reordered
  `headingOccurrence`→`sectionId` joins before any source write;
- prove this leaf never writes `core/generated/docs/coderso-docs-v2.json` or the
  generated report; per-wave/per-promotion regeneration rejects; exactly one
  final handback occurs after the final edit; a missing, stale, wrong-owner,
  wrong-sourceHash, wrong-bundleSha256, zero or duplicate final handback blocks
  `docs:check` and coverage;
- before DB-backed capture, run:

```bash
set -a && source .env && set +a
bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable })); if (!reachable) process.exit(1)'
```

- for every exact non-pilot scenario ID in the migration inventory, generate one
  bounded collision-checked caller-owned `runId`, then run
  `bun run docs:visual:capture --scenario <id> --run-id
  <caller-run-id>`; the TASK-548-02 runner derives the full
  `playwright-cli -s=docs548-<bounded-run-id>` session, restarts the Bun server,
  verifies Admin/front health, and proves scoped fixture cleanup/absence;
- API/CLI parity tests prove the planned scenario resolves to exact
  `{ visualId: scenario.visualId, runId }`, session and task-scoped temp
  ownership; malformed, oversized, reused or colliding IDs, visual mismatch and
  runner substitution/generation of a different `runId` reject;
- inspect each candidate, then run
  `bun run docs:visual:promote --scenario <id>
  --raw-reviewed-sha256 <64-lowercase-hex> --reviewed-by <bounded-id>
  --confirm-alt-caption` and retain its reviewed receipt; no `--session`,
  ambiguous digest alias, missing explicit content confirmation, or loop may
  auto-approve;
- after all three waves and every non-pilot promotion, request exactly one
  TASK-548-01-L02 same-owner final regeneration handback, verify the new native
  report/bundle hashes against the frozen baseline, then run
  `bun run docs:visual:check -- --all`, `bun run docs:check`, and
  `bunx vitest run --config vitest.config.ts
  tests/vitest/documentation/docs-corpus-native-migration.test.ts`;
- run `bun --cwd core lint:types` and `bun --cwd core lint`;
- count every touched human-authored/test file and run `git diff --check`.

## Documentation Updates Required

Save candidate/review/cleanup evidence only in the TASK-548 workflow evidence
layout. Pass final source/visual inventory, normalized parity/source-hash receipt,
DB/health/capture results, and any justified non-visual document list to L02 and
TASK-548-07.
