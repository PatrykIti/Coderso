# TASK-548-01: Canonical Documentation Contract and Compiler
# FileName: TASK-548-01-Canonical-Documentation-Contract-And-Compiler.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Documentation Platform / Contracts / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-109, TASK-403
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Replace the current Markdown-only, path-identified assistant input with one
strict, versioned documentation contract and one deterministic compiler.
`docs/guide/` remains the sole authored end-user source and the sole corpus
eligible for assistant retrieval. The resulting bundle is the common input for
the embedded Admin Help surface, the existing DB-only assistant reindex, and the
end-user part of the static public documentation site.

The initial compiler excludes `docs/develop/`. A future explicit public-only
feed may reuse these contracts as a separate developer collection, but it must
never be merged into assistant retrieval.
This child creates no Designer/canvas implementation and no runtime dependency
on an AI provider.

**Single-writer ownership:** this child owns the shared documentation types,
schemas, normalizers, compiler, generated distribution bundle, assistant-ingest
v2 migration, pure DB retrieval/permission filtering and their focused tests.
L01 owns its exact declared Bun/DB/React/Core-free source allowlist under
`packages/docs-contracts/src/` for contracts, Markdown parsing, targets and
browser-safe DTOs; it excludes L02's private `docsMigrationReport.ts`, server-
only `nodeArtifactGuard.ts`/`nodeFixedWorkspace.ts`, and L03's `nodeLoader.ts`.
L01 also owns its contract Core shims and a generated
IDs-only Admin-permission catalog snapshot with a mandatory live-catalog parity
gate. TASK-548-02-L02 later creates the
workspace manifests, exports the two
Node-only subpaths and reconciles lock/Docker dependencies (it owns ALL
dependency-bearing toolchain bytes: root/core package manifests, root bun.lock,
Dockerfile, all three documentation workspace manifests, root docs scripts,
exact root devDependency pins `@playwright/cli: 0.1.18` and `pixelmatch: 7.2.0`,
the one lock-producing `bun install --lockfile-only` reconciliation plus the
separate `bun install --frozen-lockfile` verification, the
repo-local-only dispatcher resolver and the Chromium install/verify; it lands
and gates terminally before its pilots; TASK-548-02-L03 consumes those bytes
read-only).
To keep L01/L02 gates executable before that activation, L01's stable Core
named re-export shims permanently use the confined exact
`../../../packages/docs-contracts/src/index.ts`/owner-module edge; no later
writer rewrites them. All direct consumers after activation use the package.
TASK-548-01-L03 owns no Assistant route/service orchestration file: after this
child lands, TASK-548-03-L03 is the sole TASK-548 writer of
`core/server/routes/assistantRoutes.ts`,
`core/services/assistant/assistantService.ts`, their centralized mapper/wiring,
and route/service tests. TASK-548-01-L03 DOES own the legacy startup producer
removal in `core/server/httpServer.ts` (the one-line
`initializeDocsIndexOnBootIfEnabled` import/call removal) and
`core/services/assistant/docsIndexService.ts` (the retired source-root startup
export removal) as the V1 freeze gate before `v1_active → v1_frozen`;
that removal is not route/service orchestration and TASK-548-03-L03 must not
edit or own those files. TASK-548-02 owns capture scenarios, screenshots and
visual receipts; downstream Help/portal children only consume the bundle.
TASK-548-01-L02 is the exclusive whole-family writer of
`core/generated/docs/coderso-docs-v2.json`; it lands and gates ONCE as the sole
compiler/source owner. Later generated-artifact-only checkpoints — the
post-pilot refresh after TASK-548-02-L02 and the final native-corpus
regeneration after
TASK-548-06-L01 changes native sources and visuals — invoke the ALREADY-LANDED
exact compiler CLI (no agent writer, no human-authored source/task/status edit,
each with its own gate). No other child redefines the
shared shapes or writes that generated final.

The generated bundle is a durable tracked runtime artifact. The ignored
`.tmp/docs-corpus/migration-report-v1.json` is workspace-only and joins the
bundle in one durable pair only during explicit TASK-548-01-L02
authoring/migration `--write` runs and the two named generated-artifact-only
checkpoints. The exact stable
prestates are `bootstrap-none`, clean-checkout `packaged-bundle-only`, and
`linked-pair`; report-only and transaction debris fail closed. Clean
clone/tag/runtime, portal, Docker, release, `docs:check`, and coverage-check
consumers validate the packaged bundle without requiring or recreating the
ignored report.
Runtime reads only through L02's zero-argument Core named shim or L03's public
`@coderso/docs-contracts/node-loader` alias. L02's package-private
`nodeFixedWorkspace.ts` derives the repository/Core/bundle/report/journal URLs
solely from its own `import.meta.url`; it accepts no capability/path/env/cwd.
Both entrypoints are the exact
`guardAndLoadFixedDocsWorkspaceBundleV2(): Promise<DocsDistributionBundleV2>`
function reference. That zero-input transaction
transaction: it opens and holds the exact bundle handle across full hazard
inventory, strict optional-report/sourceHash/artifact linkage, same-handle
bounded read and bundle normalization, rechecks identities/inventory, then
closes handles in reverse. Persistence/publication projections independently
normalize the returned object. Public `./node-artifact-guard` exposes only the
zero-input read-only authoring/check inspector; byte consumers call only the
atomic loader, never guard then load. Node sources use exact `node:fs` and
`node:fs/promises` plus pure contracts, with no `Bun.*`, DB, settings, server,
Core or runtime-adapter edge. Core uses permanent repo-relative preactivation
wrappers; after activation, portal imports only the public zero-input loader.
Static guards keep both Node subpaths out of every browser entry.

## Locked Contract

The canonical type names are `DocsCorpusManifestV2`, `DocsDocumentV2`,
`DocsSectionV2`, `DocsPermissionRequirementV1`, `DocsVisualV1`,
`DocsExampleV1` and `DocsDistributionBundleV2`. `DocsVisualV1` and its
publication counterpart `DocsPublicationVisualV1` carry the compiler-derived
bounded `scenarioStepSearchText` projection defined by TASK-548-01-L02; it is
the only scenario-derived searchable field and never contains locators,
fixture refs, expected values, watch paths, route, viewport or fixture bytes.
The root discriminator field is
exactly:

```ts
schema: "coderso.docs-corpus@v2";
```

`@coderso/docs-contracts` is the sole package owner of these
compiled schemas/types/normalizers, safe Markdown parser output and publication
target selector. Its top-level `.` export stays dependency-neutral and browser
safe; the separately exported build/server-only
`./node-artifact-guard` and `./node-loader` subpaths never enter that barrel.
The package also owns the exact publication DTO schema/projector that
omits `DocsDocumentV2.sourcePath` and `DocsVisualV1.assetPath`, replaces the
latter with a deterministic opaque output key, and rejects those source fields
at every serialization boundary. The stable graph is `docs-contracts -> []`,
`docs-renderer -> docs-contracts`, `core -> docs-contracts + docs-renderer` and
`docs-portal -> docs-contracts + docs-renderer`; package-edge tests reject every
reverse import. Core Admin routing, canonical path resolution and RBAC remain
Core-owned and are supplied later to the shared renderer only as explicit safe
host-adapter results. Within renderer integration only that Core adapter may
import `adminPaths`, the live permission catalog or authenticated RBAC state.
Package-edge tests allow the one named-re-export-only Core shim family above,
plus L02's report/zero-input loader named-only Core shims, resolve them inside the
contracts root and require delegated reference identity; every other deep Core
or reverse edge fails. Public Node entries may import only the package-private
fixed-workspace owner, which itself imports exact platform builtins and pure
contracts; any client/Vite import is a hard failure.

`publicationTargets` is a non-empty, duplicate-free array whose values are
exactly `assistant | embedded-help | public-docs` and whose canonical output
order follows that enum order. Stable authored keys are `docId`, `sectionId`,
`visualId` and `exampleId`. Documents also carry a BCP-47 `locale`, SemVer
`productVersionRange`, stable `slug`, canonical nullable `adminPath`,
`permissionRequirement: DocsPermissionRequirementV1 | null`, bounded
`capabilityIds` and publication targets. `DocsPermissionRequirementV1` is
exactly `{ mode: "allOf" | "anyOf"; permissions: string[] }`; its permissions
are non-empty, unique, canonically sorted and validated against the live
catalog. `capabilityIds` is unique, canonically sorted and validated against the
code-owned documentation capability catalog. Consumer URLs are derived from
those fields; authors never enter embedded-help or public-site links.

The original area catalog and `capabilityIds` remain byte-compatible. A
separate strict `DocsCapabilityCompositionCatalogV1` relates generated stable
`docs.control.*` atomic identities and `docs.workflow.*` workflow identities to
those area IDs and to exact localized `{ docId, locale, sectionId }` owners.
Workflow relations are acyclic, unique, canonically serialized, and contain an
ordered non-empty list of known atomic IDs. No second frontmatter field or
Guide API is introduced: section bindings are generated from the explicit
route/control, shipped-workflow, and section-binding registries, never inferred
from prose/title/path. TASK-548-01-L02 owns the three exact tracked pre-bundle
registries, compiles the relation into the bundle, and includes their bytes in
`sourceHash`; TASK-548-06 owns only relation validation and coverage projection;
TASK-414-02 consumes it instead of inventing another docs taxonomy. Guide must
reauthorize every active DB section and publication target before projecting a
related atom/workflow card.

`docId` is the stable translation-family ID and may be reused by different
locales. Document identity and uniqueness are exactly `(docId, locale)`;
duplicate pairs fail closed, while the same `docId` in two supported locales is
valid. `sectionId` is unique within one localized document. `visualId` and
`exampleId` remain bundle-global, but every source sidecar and visual
image/receipt pair explicitly binds its owning canonical locale and section.
No source, Help or Guide join may collapse a localized owner to bare `docId`.
Canonical document order is locale then `docId`.

Targets are enforced by each consumer, not treated as descriptive metadata.
Assistant ingest/retrieval eligibility is the conjunction `assistant` AND
`embedded-help`: every successful basic Guide answer must carry one authorized
non-null `Open in Help` action to a complete localized section, so an
`assistant`-only document fails ingest/coverage and `public-docs` is
additional, never required. Embedded Help search/render includes only
documents containing `embedded-help`; the portal includes only documents
containing `public-docs`. A record lacking a consumer's required target cannot
leak into that consumer even when all other fields match.

The authored layout is:

```text
docs/guide/
  corpus.manifest.json
  **/*.md
  examples/<docId>/<locale>/<exampleId>.json
  assets/scenarios/<docId>/<locale>/<visualId>.json
  assets/images/<docId>/<locale>/<visualId>.png
  assets/receipts/<docId>/<locale>/<visualId>.json
core/generated/docs/coderso-docs-v2.json
```

`core/generated/docs/coderso-docs-v2.json` is generated, deterministic and
reviewed through a regenerate-and-diff gate. It is not a second authored source.
The compiler fingerprints the root manifest, every included Markdown document,
example, scenario, promoted PNG and receipt. It rejects missing/orphan assets
instead of silently omitting them.
Every example sidecar uses the exact strict `DocsExampleSidecarV1` envelope and
its normalized `docId`, canonical BCP-47 `locale`, `sectionId` and
bundle-global `exampleId` must agree with both its path and exactly one
localized document section. Visual scenarios, promoted images and receipts use
the same locale-bearing owner identity.

Markdown uses a closed safe subset: headings, paragraphs, emphasis, ordered and
unordered lists, safe links, inline code, fenced code blocks, bounded
non-nesting callouts and bounded pipe tables. TASK-548-01-L01 owns the exact
callout/table token shapes and parser rules; consumers may not widen them. Raw
HTML, Markdown images, dangerous URL schemes, traversal, remote image URLs,
duplicate IDs and unknown fields fail closed. Product screenshots are
referenced through strict visual records, never arbitrary Markdown URLs.

Atomic/composed classification describes only shipped documentation coverage.
It does not authorize an action family, provider tool, Designer canvas, or CMS
mutation. A composed workflow may reference only controls that are available in
the same shipped product/version context.

The compatibility boundary is exactly the current 68 ingestible legacy Guide
files and the frozen legacy key allowlist
`{ title, audience, productArea, language, keywords }`.
TASK-548-01-L02 owns a complete source-path context catalog and corpus-wide
golden projection for every required `DocsDocumentV2` field; no route,
permission, capability, target, version, summary, identity or section rule is
left to implementer judgment. Unknown/new legacy sources fail closed. The
TASK-547 re-freeze pins source commit
`a13d186167a05901e644bf1a3a7aefee6f780471` and 68 ingestible legacy files as
recorded by the parent. Implementation re-proves those exact bytes/context; a
count or context change requires an explicit task amendment and fresh audit.

## Security Contract

- **Endpoint visibility:** no new endpoint. The compiler is local/build-time.
  Existing `POST /assistant/reindex` remains an internal admin endpoint.
- **Auth/RBAC:** reindex remains authenticated session +
  `settings:write`; compiled files do not weaken document-level
  `permissionRequirement`. `allOf` requires every listed permission; `anyOf`
  requires at least one. Null means no extra catalog permission; route
  visibility/authentication is independently owned by the route registry,
  including public token-gated `/preview` and authenticated `/help`. Authored
  requirements reject `*`; permission consumers accept only the exact live
  ready snapshot `["*"]` as full access and reject duplicate/mixed wildcard
  snapshots.
- **CSRF/rate limit:** reindex remains CSRF-protected and in the `assistant`
  bucket. Compiler commands have no HTTP boundary.
- **Validation:** reject unknown fields recursively; validate BCP-47, SemVer,
  IDs, permissions, canonical paths, path confinement, hashes, media bounds and
  the safe Markdown subset before emitting bytes or starting a DB transaction.
- **Anti-abuse:** nonce/HMAC and CAPTCHA are not applicable because there is no
  public write. Apply byte/count/depth/string/diagnostic caps to source and
  bundle compilation.
- **Privacy/secrets:** reject credentials, tokens, PII fixture values,
  credential-bearing URLs and external image dependencies. Binary assets stay
  packaged files, never DB blobs.

## Implementation Shape

```ts
const prePilotVisuals = { state: "pre-pilot-empty" } as const;
const initialWrite = await compileDocsCorpusV2({
  root: "docs/guide",
  mode: "write",
  visuals: prePilotVisuals,
});
await assertDeterministicBundleBytes(initialWrite.bundleBytes);
await promoteDocsArtifactPair(initialWrite);
const initialCheck = await compileDocsCorpusV2({
  root: "docs/guide",
  mode: "check",
  visuals: prePilotVisuals,
});
await assertGeneratedBundleBytesEqual(initialCheck.bundleBytes);

const activeVisuals = {
  state: "active",
  validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
} as const;
const activeWrite = await compileDocsCorpusV2({
  root: "docs/guide",
  mode: "write",
  visuals: activeVisuals,
});
await promoteDocsArtifactPair(activeWrite);
const activeCheck = await compileDocsCorpusV2({
  root: "docs/guide",
  mode: "check",
  visuals: activeVisuals,
});
await assertGeneratedBundleBytesEqual(activeCheck.bundleBytes);

// Runtime ingest is EXCLUSIVELY the guarded fixed packaged entrypoint
// `ingestPackagedAssistantDocsV2` (TASK-548-01-L03), which loads the packaged
// bundle exactly once and builds its own plan/admission data internally. The
// compiler/promote/check flow never calls `ingestDocsDistributionBundleV2`
// directly and carries no lock session or ingest inputs.

// Packaged runtime/startup is a separate fixed-path read-only boundary.
const packaged = await loadPackagedDocsDistributionBundleV2();
assertEqual(packaged.sourceHash, activeWrite.bundle.sourceHash);
```

Data flows from strict local sources through normalization, referential and
security validation, canonical sort and SHA-256 hashing into one compile result.
Every compiler call supplies exact `root`, `mode` and `visuals`; there is no
one-argument form or implicit visual default. The initial write/check alone use
`pre-pilot-empty`. Every call after the first visual lands uses `active` plus
TASK-548-02-L02's exact validator factory. The exact compile `bundleBytes`
drive determinism comparison, pair promotion and post-write byte verification.
The persistence boundary receives the same normalized bundle object and
independently revalidates it; runtime reindex instead calls the one fixed
packaged loader exactly once. That loader remains distinct from compiler/
workspace recovery. Ingest persists the bounded localized visual, example,
source, link-input and provenance records required for Guide answers under the
same active `snapshotId` and `sourceHash` in the separate V2 table set (legacy
`assistant_docs`/`assistant_doc_chunks` stay byte/DDL-compatible and are never
enriched in place). Activation and successful-run
finalization commit atomically, so PostgreSQL-authoritative no-cache queries
observe either the complete previous snapshot or the complete next snapshot.
Per-run activation additionally requires the persisted one-time V2 cutover
fence to be exactly `v2_activated` (TASK-548-01-L03 owns the fence state
machine, shadow-parity gate and consumer-readiness declarations); before that
fence the active pointer stays on the frozen V1 legacy snapshot and no V2 row
is served by any consumer. Local Help and public builds
consume the packaged byte contract through their independently normalizing
publication projections. Runtime Guide retrieval consumes only the active DB
snapshot; it never reads the bundle, Markdown, or an external documentation
service per question.

Machine-readable failures use the bounded `docs_corpus_*`/`docs_compile_*`
families plus exactly these seven public Assistant-docs domain errors:
`assistant_docs_bundle_invalid`, `assistant_docs_ingest_failed`,
`assistant_docs_reindex_conflict`, `assistant_docs_db_unavailable`,
`assistant_docs_capacity_exceeded`,
`assistant_docs_permission_snapshot_invalid`, and
`assistant_docs_cutover_required` (the stable seventh public error for manual
preactivation/backfill/source-drift operator action; TASK-548-03-L03 maps it
to HTTP 409 and it is never collapsed into a generic 500). TASK-548-01-L03 owns their pure
error definitions/normalizers plus two internal sentinels: the cutover-only
`assistant_docs_v2_consumer_not_ready` and the context-only
`assistant_docs_search_context_invalid`; TASK-548-03-L03 later maps all seven
public errors once at the centralized route boundary, maps the context
sentinel to public `ApiError` code `validation_error`/400 with bounded details
(never exposing the sentinel code), and RETAINS the cutover sentinel
internally through preactivation, mapping it to public
`assistant_index_missing`/503 + `docs_not_ready`; the cutover sentinel is
never removed before activation and never appears as a public code, and the
internal `deferred_cutover_backfill` startup result remains non-HTTP (startup
logs it; only the route/service layer surfaces `assistant_docs_cutover_required`).
Diagnostics contain no source body, credential,
permission inventory or fixture-value echo.

## Sub-Tasks

| Task | Scope | Single writer | Depends on |
| --- | --- | --- | --- |
| TASK-548-01-L01 | Strict shared schemas, stable identity, browser-safe publication DTOs and safe Markdown policy | dependency-neutral contracts source/tsconfig except four exact L02/L03 files; stable contract Core re-export shims, permission snapshot/artifact and focused tests | None |
| TASK-548-01-L02 | Deterministic compiler, compatibility adapter, canonical report/bundle and complete artifact inspection | compiler, private `docsMigrationReport.ts`/`nodeFixedWorkspace.ts`, public guard, report/loader Core shims, generated pair/tests | TASK-548-01-L01 |
| TASK-548-01-L03 | Packaged loader alias, Assistant DB migration/ingest/atomic activation, compatibility, permission retrieval, typed errors, persisted V2 cutover fence (with the resumable building-lifecycle backfill and the executable source-drift reset to `v1_frozen`), the acyclic run-provenance model (`assistant_docs_v2_ingest_run_results`), the era-aware facade (`searchAssistantDocsAuthoritativeV2`) plus the closed `assistant_docs_v2_legacy_acl` (deployed by TASK-548-03-L03 before activation through the gated consumer cutover so Guide stays available — dispatch at EXACTLY `shadow_parity_clean` — never merely at/past `backfill_complete` — with one complete prepared snapshot, the closed `legacy_acl_snapshot_id` binding and facade code compatible with the row's `deploymentIdentity`/`rolloutGeneration` — the persisted rollout receipt is recorded for that exact facade build AFTER deployment and is never a deployment precondition; the post-activation rollback restores `v1_frozen`, preserving the guards/ACL binding/facade), the ONE status-matrix CHECK, the single combined V2 chunk vector, the exact V2 section chunker (`assistantDocsChunkerV2.ts`), Guide search-context DTO, legacy startup producer removal (V1 freeze) and the ingest result union with the canonical `assertAssistantDocsIngestResultClosureV2`; no route/service orchestration | public `packages/docs-contracts/src/nodeLoader.ts` alias plus the cohesive `core/db/tables/assistantDocsV2.ts` schema module (separate V2 tables; legacy `assistant_docs`/`assistant_doc_chunks` stay byte/DDL-compatible), assistant DB/runtime modules/migrations/tests, `assistantDocsSearchContext.ts`, `assistantDocsAbortSignal.ts`, `assistantDocsChunkerV2.ts`, the cutover/activation/rollback scripts, the `httpServer.ts`/`docsIndexService.ts` legacy startup removal with its focused test, and `tests/unit/server/httpServerDocsStartupRemoval.test.ts`; excludes Core shims and later TASK-548-03-L03 route/service/mapper files/tests | TASK-548-01-L02; the complete terminal TASK-551 family with the exact
02-L02/04-L02/05-L01 handoff exports |

Land strictly in table order. TASK-548-02 starts only after TASK-548-01 is
green, then adds canonical visuals without changing these shared shapes. After
TASK-548-02-L02 writes the five pilot triples, that stream pauses for exactly
one post-pilot-generated-bundle-refresh-gate — a generated-artifact-only
invocation of the ALREADY-LANDED compiler CLI (no agent writer, no
human-authored source/task/status edit, its own gate) — before 02-L03 or 03
starts. After
TASK-548-06-L01 edits final native sources/visuals, orchestration pauses 06 for
exactly one final-native-corpus-generated-bundle-handback-gate of
`core/generated/docs/coderso-docs-v2.json` plus the canonical migration report
(the same already-landed exact CLI, generated-artifact-only).
TASK-548-06 resumes `docs:check` and coverage only after that checkpoint passes;
TASK-548-06 never writes the generated final.
After TASK-548-01-L03 is green, TASK-548-03-L03 consumes its pure exports and is
the only TASK-548 leaf allowed to edit Assistant route/service orchestration,
the centralized error mapper, or their focused route/service tests.

TASK-548-08 dispatches implementation in three deploy-gated phases, each with
its own strict owner commit/merge/deploy pause and a fresh mutually exclusive
resume mode; no phase trusts prior-process memory:

1. **Foundation** (initial committed-bootstrap implementation): `01-L01 →
   01-L02 → 01-L03`, gated, then an owner action to commit/merge and
   deploy the migration-capable foundation. The operator then runs the V1
   freeze → cutover backfill → shadow-parity sequence under 01-L03.
2. **Facade** (fresh `task548-foundation-migration-resume`): verify the exact
   committed/deployed foundation bytes and the DB cutover state EXACTLY
   `shadow_parity_clean`, rerun the current-tree audit, then implement
   `02-L01 → 02-L02 → post-pilot-generated-bundle-refresh-gate →
   02-L03 → 03-L01 →
   03-L02 → 03-L03`; the 03-L03 facade dispatch is gated at EXACTLY
   `shadow_parity_clean` (never merely at/past `backfill_complete`).
3. **Consumer cutover** (fresh `task548-consumer-cutover-resume`): verify the
   exact facade deployment, the rollout receipt for that build, consumers
   ready, and the DB cutover state EXACTLY `v2_activated`, rerun drift, then
   implement `04-L01 → 04-L02 → 04-L03 → 05-L01 → 05-L02 → 06-L01 →
   final-native-corpus-generated-bundle-handback-gate → 06-L02` and enter the
   prerelease
   post-audit/final release pause.

## Acceptance Criteria

- All 68 ingestible English files currently under `docs/guide/` compile through
  v2 with a stable identity; locale support is ready for Polish without claiming
  the Admin UI or corpus is fully localized.
- The same translation-family `docId` compiles in multiple supported locales;
  an exact duplicate `(docId, locale)` is rejected. Visual and example IDs stay
  unique across the complete bundle, while their source paths/envelopes still
  round-trip the exact localized owner.
- Identical source bytes produce byte-identical bundle bytes and SHA-256 on
  repeated builds, independent of filesystem order, absolute path or wall clock.
- TASK-548-06's native-v2 rewrite must preserve normalized semantic records and
  stable IDs from L02's report. Because authored bytes change, `sourceHash` must
  change deterministically; cross-representation bundle byte equality is not an
  acceptance condition.
- `assistant`, `embedded-help` and `public-docs` consume the same normalized
  records; `docs/develop` never enters assistant retrieval.
- A failed compile or DB reindex leaves the previous complete assistant corpus
  available; no mixed v1/v2, generation or `sourceHash` snapshot is observable.
- The legacy V1 corpus stays active until the persisted V2 cutover fence
  passes (`v1_active → v1_frozen → backfill_complete → shadow_parity_clean →
  consumers_ready → v2_activated`); before the fence the direct V2 consumer
  refuses reads with the internal cutover sentinel while the era-aware facade
  keeps Guide available over the ACL-joined frozen V1 corpus (one backend per
  question, never both), and no consumer mixes V1/V2
  evidence. Every CAS carries the exact `revision` (incremented on every
  transition); consumer readiness is idempotent for the same deployment
  identity and `rolloutGeneration` (stable through one rollout, incremented
  only on rollback/source-drift reset/new rollout) across replicas/restarts;
  `consumers_ready` additionally requires the persisted bounded deployment
  rollout receipt proving zero serving V1-only replicas; the destructive
  legacy-resume transition (any pre-fence state, including `v1_frozen` after a
  post-activation rollback, back to `v1_active`) is the ONLY way to re-enable
  mutable legacy writes — it is an explicit destructive/maintenance operator
  action that clears the `legacy_acl_snapshot_id` binding and marks Guide
  unavailable until a fresh freeze + backfill recreates it, never normal
  rollback; and the
  explicit
  `v2_activated → v1_frozen` rollback row increments `revision` and
  `rollout_generation`, demotes the active V2 snapshot, restores the frozen V1
  pointer, and atomically clears cutover evidence while PRESERVING the trigger
  guards, the immutable frozen V1 rows and the `legacy_acl_snapshot_id`
  binding (the closed ACL survives so
  the facade keeps serving the frozen V1 corpus with no Guide gap and legacy
  writes stay frozen).
  The TASK-548-03-L03 consumer cutover that deploys the facade is
  dispatch/deploy-gated on the cutover row being EXACTLY `shadow_parity_clean`
  (never merely at/past `backfill_complete`) with
  exactly one complete prepared snapshot, the closed `legacy_acl_snapshot_id`
  binding and facade code compatible with the row's
  `deploymentIdentity`/`rolloutGeneration` — never a preexisting rollout
  receipt, which is recorded for that exact facade build AFTER deployment and
  proves zero V1-only serving replicas; before those bytes are deployed
  the legacy service remains serving, and a facade binary starting without the
  binding fails readiness (zero authorized rows). The rollout receipt remains
  mandatory for `consumers_ready` and activation; the canonical deploy order
  (freeze → backfill → parity → facade deployment → rollout receipt →
  consumer readiness → activation) prevents an availability gap.
  The cutover backfill command (`bun scripts/docs/migrate-assistant-docs-v2.ts`)
  is the SOLE preactivation producer: it runs only after `v1_frozen` under the
  same ingest advisory lock, loads the fixed packaged bundle once, and is
  RESUMABLE — its durable start transaction commits the pending
  `request_kind='cutover_backfill'` run, the sole `building` snapshot, the
  `assistant_docs_v2_legacy_acl` rows and the bounded
  cursor/progress/plan/sourceHash on the run, WITHOUT touching the pointer's
  `legacy_acl_snapshot_id` (an initial backfill leaves it NULL and stays
  not-ready mid-flight; a source-drift replacement retains/pins the old valid
  ACL binding so V1 readiness has no gap while the new cohort is assembled);
  bounded child batches
  (≤500 rows/4 MiB) CAS-update progress in separate transactions; its final
  transaction verifies closure and atomically transitions
  `building → prepared`, finalizes the terminal
  prepared run with the exact acyclic run-result row, binds (initial) or
  rebinds (replacement) the pointer's `legacy_acl_snapshot_id` to that
  complete closed-ACL prepared snapshot, and advances
  `v1_frozen → backfill_complete` itself (`--abort` CASes
  the pending `cutover_backfill` run to `failed`, DELETES the building
  snapshot cohort with cascades and frees pending slot/capacity while leaving
  any retained prior binding UNTOUCHED — an initial abort leaves NULL; the
  never-bound building cohort is never named by the pointer — and the
  building snapshot is NEVER converted to `inactive`, exactly like the
  destructive legacy-resume and source-drift reset disposal paths); startup
  and manual reindex never
  create a building/prepared snapshot at any preactivation state (pre-freeze
  they
  return the bounded internal `deferred_cutover_backfill` result; later
  preactivation states allow only same-hash prepared reuse, and hash drift
  returns a bounded operator-required conflict that requires the executable
  source-drift reset (back to `v1_frozen`, retiring the prepared snapshot to
  `inactive` and DISPOSING any mid-flight `building` cohort — run CAS-failed,
  cohort deleted with cascades, capacity freed, never
  `building → inactive`; the never-bound cohort's disposal never touches the
  retained binding — while clearing evidence and receipt) + rerun of the
  same backfill command, whose durable start retains the old binding and
  whose FINAL transaction rebinds the pointer to the new complete closed-ACL
  snapshot).
- The V1 freeze gate passes before `v1_active → v1_frozen`: the
  migration installs DB-authoritative row-level trigger guards on
  `assistant_docs`/`assistant_doc_chunks` that reject every legacy
  INSERT/DELETE/UPDATE once the cutover row is past `v1_active` (no V2-shaped
  write is ever permitted on V1 tables; while `v1_active` legacy writes stay
  compatible), the freeze transition transaction drains in-flight legacy writers with
  `SHARE ROW EXCLUSIVE` plus `SET LOCAL lock_timeout='5s'` (a timeout maps to a
  bounded freeze conflict and the operator reruns; no automatic retry), the
  legacy
  startup producer is removed from `core/server/httpServer.ts`/
  `docsIndexService.ts` as the static gate, writes can never corrupt frozen V1,
  the cutover backfill command (the sole preactivation producer) runs only
  against the immutable frozen V1 rows, persists the terminal
  `cutover_backfill` prepared run and the sole prepared snapshot, and
  `v1_frozen → backfill_complete` requires its final keyset and closure,
  activation additionally requires the persisted deployment rollout receipt
  proving zero serving V1-only replicas, a rogue unsupported old binary after
  activation may only read stale frozen V1 (never V2 or mutate V1), and
  `dockerStart.ts` keeps the sole awaited packaged startup path.
- Every ingest call returns the strict `AssistantDocsIngestResultV2` union
  (`prepared` with changed true/false and the literal `activeSnapshot: null`,
  `unchanged`, `activated`, plus the bounded internal
  `deferred_cutover_backfill` member at `v1_active`/`v1_frozen` — pre-freeze
  startup and manual reindex never call ingest or create a snapshot); pre-fence
  reindex reports `prepared` as a successful pending-activation result with
  the complete inactive snapshot verified, never as failure, and the
  `prepared` run is terminal — it is never transitioned or finalized again
  (activation records a separate activation event).
- Guide retrieval returns complete authorized localized visual/example/source/
  link/provenance records from the active DB identity only. Per-question code
  never loads the packaged bundle; Help/portal projections still independently
  normalize their build-time packaged input.
- There is no runtime filesystem fallback, per-question remote fetch, new docs
  API or DB storage of screenshots.
- All touched human-authored production/test files are at most 1,000 physical
  lines; legacy oversized files are split by responsibility before modification.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/documentation tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsPermissionSnapshot.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/assistantDocsIngestV2.test.ts` when `DATABASE_URL` is reachable
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- deterministic two-build byte/hash comparison and the canonical
  NUL-safe line-count gate over the leaf write set (identical contract in
  every TASK-548 task file; a file above 1,000 makes the gate fail with
  `exit 1`, including a non-newline final line):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```
- exact 68-source legacy inventory/golden projection plus route, permission,
  capability, target, collision and exhaustive legacy→native semantic parity
  validation against the parent's frozen TASK-547 source identity
- explicit duplicate-`(docId, locale)` rejection and same-`docId`,
  different-locale acceptance coverage, including same-section-ID example and
  visual fixtures that prove locale-bearing paths/envelopes never cross-join
- fixed-loader parity from repository root, `core/`,
  `packages/docs-portal/`, Node/Vite-config context, and an unrelated Docker
  cwd; zero-input package/Core parity, bundle/directory replacement between
  every atomic held-handle loader phase, export/client-graph checks, atomic activation plus
  mixed-sourceHash, zero-per-query-filesystem and persisted cutover-fence
  coverage, explicit replacement-abort retention/readiness fixtures (an
  `--abort` NEVER updates `active_pointer.legacy_acl_snapshot_id`: an initial
  abort leaves NULL and a replacement abort retains the prior valid binding
  with V1 readiness still `ready` on it) and unexpired-event
  destructive-resume/retention fixtures (activation-event rows stay immutable
  with their RESTRICT pins until exact `event_at + 30d` pruner eligibility;
  destructive legacy resume clears only cutover-row `activated_at`/receipt
  fields)

## Documentation Updates Required

Provide verified contract and migration deltas to TASK-548-07-L01, the sole
closeout-documentation writer, for
`_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`,
`_docs/SECURITY_SPEC.md`, `docs/develop/assistant.md` and
`docs/guide/README.md`. This child does not edit those shared closeout files.
Because Guide retrieval is explicitly no-cache, `_docs/ADMIN_CACHE.md` and
`_docs/ADMIN_CACHE_MAP.md` receive no new Guide family.
