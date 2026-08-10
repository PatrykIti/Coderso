# TASK-548-07-L01: Full Gates, Real Flows, Docs and Closure
# FileName: TASK-548-07-L01-Full-Gates-Real-Flows-Docs-And-Closure.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-07
**Priority:** Critical
**Category:** QA / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 `✅ Done`; TASK-547 terminal; TASK-548-05-L02;
TASK-548-06-L02. The parent's frozen terminal handoff re-proven with every
literal final overlapping user/developer/shared-doc path and serialized owner,
plus the TASK-548-08 phased post-audit/final-drift handoffs, are sequencing
gates described in the body, not task edges.
**Status:** ⏳ To Do
**Changelog:** 1261 (exclusive writer)

---

## Overview

Execute the dependency-shaped acceptance matrix, eight named real browser
flows, strict security/full gates, documentation updates, and final
descendant-first TASK-548 closure. This leaf is validation and closeout only:
implementation defects go back to the owning leaf, then every affected targeted
and downstream gate is rerun. TASK-548-08 dispatches implementation in three
deploy-gated phases; this leaf's labels begin only in the consumer-cutover
phase (after `task548-consumer-cutover-resume` verifies the exact facade
deployment, the rollout receipt for that build, consumers ready and the DB
cutover state EXACTLY `v2_activated`). Its normal path has three mutually exclusive
invocations (plus the existing conditional retirement-restart invocation):
pre-release preparation ending in an owner-only release-branch pause (the owner
reviews, commits and merges to the protected release branch and waits for
semantic-release — the sole release authority), a fresh
post-release verification/smoke invocation, and the existing checkpoint-bound
closure resume. No object from an earlier invocation authorizes a later one.

## Exclusive Single-Writer Ownership

- `tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- `scripts/docs/task548ClosurePhases.ts` for phase payloads/orchestration only;
- the focused final eight-flow scenario contribution module
  `scripts/runtime-smoke/adapters/task-548/final-scenarios.ts` (final IDs,
  titles, variants and actions consumed by TASK-548-02-L02's already-landed
  `task-548` adapter shell) plus its focused test
  `tests/unit/runtime-smoke/task-548-final-scenarios.test.ts`; this leaf NEVER
  edits the L02-owned adapter shell (`adapters/task-548.ts`), the L02-owned
  pilot modules (`task-548/browser-actions.ts`, `worker-entry.ts`,
  `worker-operations.ts`, `production-handlers.ts`, `capture-request.ts`), the
  L02-owned adapter/worker tests, or any shared runtime-smoke seam
  (`contracts.ts`, `cli.ts`, `registry.ts`, `cli-registry.test.ts`,
  `runtime-smoke-cookbook.md`); the pilot `capture-request.ts` retirement is
  TASK-548-02-L02-owned adapter work;
- final canonical shared-runner `report.json`, TASK-545 manifest, and exactly
  eight screenshots under
  `_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`;
  TASK-545 phase 1 retains sole
  ownership of the checkpoint byte in that directory;
- `README.md`, `docs/README.md`, `docs/guide/README.md`;
- `docs/develop/README.md`;
- `docs/develop/assistant.md`;
- `docs/develop/documentation-platform.md`;
- `docs/develop/documentation-visual-capture.md`;
- `docs/develop/documentation-release.md`;
- `_docs/ASSISTANT_GUIDE.md`;
- `_docs/ASSISTANT_SITE_BUILDER.md`;
- `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, `_docs/CODERSO_RELEASE_GATES.md`, and `_docs/RELEASE_PROCESS.md`;
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` only for cache changes;
- TASK-548 task status/completion fields, its board row/statistics;
- changelog 1261 file and its index row.

No other leaf writes changelog 1261 or closeout metadata. Read board/changelog
indexes fresh immediately before editing and change only TASK-548/1261 rows.
No wildcard `docs/develop/*` ownership exists. Before any shared-doc edit,
verify the TASK-548 parent's frozen terminal TASK-547/TASK-552 handoff and every
literal overlapping user/developer/shared-doc owner, then serialize this leaf
after those final bytes; an unresolved/colliding path blocks all TASK-548
implementation.
This leaf must not share `_docs/ASSISTANT_SITE_BUILDER.md`,
`_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md`
concurrently with TASK-547.
TASK-548-02-L02 is the SOLE writer of the shared runtime-smoke seams
(`contracts.ts`, `cli.ts`, `registry.ts`, `cli-registry.test.ts`,
`runtime-smoke-cookbook.md`) and of the `task-548` adapter shell; it declares
BOTH fixed TASK-548 suite rows (`task-548` and `task-548-portal`).
TASK-548-04-L03 implements only the focused `task-548-portal` contribution
modules behind its already-landed row. This leaf verifies the landed registry,
CLI, contracts, and central registry test read-only, requires the existing
runnable `task-548` descriptor/path and both profiles to match the
already-landed adapter shell, and contributes only its focused final scenario
module and test; it rewrites no shared registry, adapter shell, central test,
or cookbook file. A central-seam defect returns to its owning leaf
(TASK-548-02-L02).
The runtime-smoke contribution order is fixed: terminal TASK-554, then terminal
TASK-545, TASK-548-02-L02 (shared seams + adapter shell), TASK-548-04-L03
(portal contribution modules), this leaf (final scenario contribution), and
only then TASK-489-03-L02, TASK-555-07-L02, TASK-414-11-L01, and
TASK-556-04-L02. Every later contributor rereads and preserves all previously
registered suites, uses TASK-545's canonical evidence/checkpoint paths, and
adds only its literal suite/contribution delta without rewriting shared
seams.
TASK-548-01-L01 remains sole writer of `docs/guide/_TEMPLATE.md`; this leaf
validates its shipped v2 authoring contract read-only and does not add it to the
closeout writer set.

This leaf alone writes the canonical shared-runner `report.json`, TASK-545
`manifest.json`, and exactly these eight screenshots:
`01-help-offline-local-search.png`,
`02-guide-no-provider-grounded-answer.png`,
`03-agent-unavailable-isolation.png`,
`04-permission-aware-open-cms.png`,
`05-visual-example-source-parity.png`,
`06-portal-local-exact-latest-rollback.png`,
`07-responsive-theme-keyboard.png`, and
`08-explicit-guide-agent-handoff.png`. Extra, missing, renamed, nested,
symlinked, untracked, or hash-unbound members fail. Every alternate TASK-548
acceptance/workflow evidence path is forbidden.

TASK-545 `createResumeCheckpoint` phase 1 is the sole byte writer of
`resume-checkpoint.json`. It atomically creates that file only after validating
the ten 07-owned files. Thus the exact post-phase-1 directory inventory is
report + manifest + eight screenshots + checkpoint, with explicitly split ownership;
this leaf never writes checkpoint bytes.

`manifest.json` is exactly the TASK-545 canonical schema and receives no
TASK-548 extension fields. Pre-checkpoint page-error, unexpected-network,
bundle-identity, production-health and cleanup checks remain mandatory and
block phase 1 on failure, but are not persisted, reconstructed, or claimed as
historical closeout evidence after resume. Closeout uses only the verified
checkpoint identity/frozen revision/closure contract, canonical report/manifest/eight
screenshots, deterministic current frozen on-disk product/task facts and
durable repository receipts, and the existing non-authorizing planning-audit
record. The scenario-06 file above is the sole canonical portal screenshot; all
eight screenshots remain owned here.

The fresh release-resume downloads TASK-548-05-L02's exact successful-run
`docs-portal-prepublication-gate-<productVersion>-<gitSha>-<workflowRunId>`
artifact (release) or
`docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
(docs-rollback; the target-bound artifact uploaded inside the 05-L02 candidate
callback before any retained/Cloudflare mutation).
It validates the report plus seven PNG inventory/hashes and the canonical
prepublication receipt (the exact NINE-member inventory), exact L03
scenario/variant/assertion evidence, receipt-bound workflowRunId/
workflowRunAttempt/runHeadSha, zero errors, cleanup pass and the expected
version/SHA/portal-manifest/artifact-root facts against the PUBLIC docs tree.
Missing, stale or mismatched
evidence aborts closure and returns to 04-L03/05-L02 for a new committed release
cycle; closure never recaptures or reconstructs it. The final adapter then
independently imports L03's action module and reruns all seven portal groups as
scenario-06 variants against its disposable retained-Pages session. Only L01
writes the canonical scenario-06 PNG and final manifest during final smoke.

## Release Evidence Handoffs

Only the fresh `task548-release-resume` invocation accepts the recursively
strict `runKind: "release" | "rollback"` union as strict bounded CLI fields.
The release branch binds `runKind`, `version`, `tag`, `gitSha`,
`workflowRunId`, `workflowRunAttempt`, `deploymentId`, `origin`, and
`basePath`; the rollback branch binds `runKind`, `targetVersion`,
`originalGitSha`, `workflowRunId`, `workflowRunAttempt`, `deploymentId`,
`origin`, and `basePath`. Mixed or opposite keys reject. Bounds and
canonical forms come from TASK-548-05-L02's release-identity/post-deploy
normalizers, never local copies. The resume FIRST fetches the authoritative
selected run/attempt metadata and derives the run kind through the exact
`deriveExclusiveRunKindFromWorkflowMetadataV1` — strict successful run/attempt
provenance bound to the workflow path
`.github/workflows/release.yml`, the workflow event (`push` or an ALL-EMPTY
manual `workflow_dispatch` for release; `workflow_dispatch` with the exact
docs rollback pair for rollback), the normalized dispatch mode/target, the
exact COMPLETE final job/status maps for all four known jobs (the jobs API
includes condition-skipped jobs; unknown jobs or any status mismatch reject),
the `released`
output (release only), the run head and the deployment ID. Docker recovery is
ALWAYS rejected — it is
never a docs release/rollback source; `released == "true"` is required ONLY for
runKind `release`; a rollback requires a successful `workflow_dispatch` with
the exact rollback dispatch mode/target and does NOT require a semantic-release
`released` output. Release and rollback combinations are explicit; a
mismatched kind, mixed or unknown artifacts reject before any Git/receipt work.
It then
enumerates the selected run's health artifacts and requires exactly ONE
matching family: a release run downloads only `docs-post-deploy-health-*` and
validates only through `validateDocsPostDeployHealthReceiptV1`, while a
docs-rollback run downloads only `docs-post-deploy-rollback-health-*` and
validates only through `validateDocsPostDeployRollbackHealthReceiptV1`;
opposite, both or duplicate families fail. It inventories the selected
run+attempt's portal-prepublication artifacts exactly as health — one matching
release/rollback family
(`docs-portal-prepublication-gate-<version>-<gitSha>-*` or
`docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-*`);
opposite/both/duplicate reject, and `workflowRunAttempt` is bound in the strict
portal report/receipt (the artifact name may remain run-ID based if the receipt
proves the attempt).

The resume keeps TWO tree identities. `runtimeTree` is computed from the clean
WORKFLOW-RUN HEAD and remains the current committed-head drift/preparation
identity. `publicRuntimeTree` is the selected PUBLIC docs identity: for release
it equals `runtimeTree`; for rollback it is derived from the separately
verified target release/tag/capsule at `targetVersion`/`originalGitSha`, never
from the workflow-run HEAD — the run HEAD and the target SHA/tree are never
equated.
A release resume proves `HEAD` and the tag target both equal the `gitSha`
commit SHA; a rollback resume proves the clean `HEAD` equals the WORKFLOW RUN
HEAD and SEPARATELY resolves the target release/tag/capsule to `originalGitSha`
deriving `publicRuntimeTree` from that verified target.
Both branches prove clean
index/worktree parity, validate one bounded untouched
canonical Git record stream, and pass it directly through L01's pure
create/normalize/serialize API. They bind the exact
`DocsReleaseTreeBindingV1` objects and canonical bytes: the PUBLIC tree binds
the immutable TASK-548-05-L02 GitHub Release asset/receipt pair, retained
publication/capsule receipts, portal-prepublication evidence and the post-deploy
health receipt, while the downstream committed-head drift gate remains bound to
`runtimeTree`. A commit
SHA is never compared with or described as a tree OID. It then verifies
the immutable TASK-548-05-L02 GitHub Release asset/receipt pair plus retained
publication/capsule receipts against the same public identity. It then downloads only
the exact matching-family artifact
`docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` (release) or
`docs-post-deploy-rollback-health-<targetVersion>-<originalGitSha>-<workflowRunId>`
(rollback) from that successful
TASK-548-05-L02 run. Extract into a resolved task-owned
temporary directory, inventory without following links, and require exactly one
root regular member `docs-post-deploy-health-v1.json` or
`docs-post-deploy-rollback-health-v1.json` respectively. Reject a missing,
duplicate, nested, extra, directory, symlink, device, or renamed member before
reading bytes and recursively validating the exact discriminator
(`coderso.docs-post-deploy-health@v1` or
`coderso.docs-post-deploy-rollback-health@v1`). The producer's `.tmp` staging
hierarchy is never an artifact member.

Require identity equality for the branch's version/tag (release) or
targetVersion/originalGitSha (rollback) plus run/attempt/deployment/origin/base
path; `attemptLimit: 5`; bounded complete results; exact indexable and latest
noindex status/body-hash/canonical/version facts; both retained manifest hashes;
one content-addressed asset path/hash; exact `search` with canonical BCP-47
locale, confined path, HTTP 200, bounded bytes and SHA-256; a matching
`results[]` attempt with `target: "search-index"`; canonical `checkedAt`; and
`status: "pass"`. Search locale/path/status/bytes/hash must link exactly to both
the selected `DocsSearchPublicationReceiptV1` record and detached portal
manifest, and `search.locale` must equal `selectedRoute.locale`. Missing
or divergent attempt path/status/bytes/body hash also rejects. Missing
artifact/file/result, unknown field, stale or
wrong-identity receipt, oversized evidence, failed status, or any hash/fact
mismatch blocks before preparation or smoke. Because the selected-run health
artifacts are enumerated first and exactly one matching family is required, a
docs-rollback run is validated INSTEAD through the rollback-specific post-deploy
health receipt
(`coderso.docs-post-deploy-rollback-health@v1`) with its exact rollback
binding: from/to latest version, target version, target original
identity/hashes (`originalGitSha`, `portalManifestSha256`,
`artifactRootSha256`), retained commit and deployment identity — the same
bounded same-origin exact/latest/404 read facts and `status: "pass"` apply;
release and rollback families never mix and duplicates fail.
Both health families embed the SHARED strict `DocsPostDeployReadFactsV1`
(owner: TASK-548-05-L02 `docsPostDeployHealthReceipt.ts`) — the
closure-required same-origin facts bound to the selected public
`DocsReleaseTreeBindingV1` (attemptLimit/results, exact/latest/404,
manifest/search/asset/client-asset/header facts) with its
normalizer/serializer as the single authority; the rollback receipt adds
from/to/target/original/retained/deployment identity on top of the same
shape.
The temporary artifact is removed
before the verified current-invocation handoff returns. The download is
read-only. This leaf never stages, commits, merges, tags, creates a release,
publishes retained bytes, invokes Cloudflare Pages, promotes `latest`, or rolls
back production.

## Ordered Browser Contract

Run exactly these ordered IDs through the statically registered shared
`task-548` adapter. Its common `BrowserTransport` invokes `playwright-cli` with
the validated task-scoped session; this leaf never launches Playwright
directly:

1. `help-offline-local-search` — block public/provider origins; search, open,
   anchor-scroll and render a packaged article locally.
2. `guide-no-provider-grounded-answer` — disable provider; reindex/query and
  assert source evidence, Help/CMS actions, relevant visual/example, and
  official link all retain the owning canonical BCP-47
  `{ docId, locale, sectionId }`. Include two localized records sharing one
  `docId`; neither may supply the other locale's evidence/action/card, while
  `visualId` and `exampleId` remain bundle-global.
  Ask one atomic-control and one composed-workflow question. Each default
  answer uses `detailLevel: "basic"`, stays within 440 Unicode scalars and two
  sentences or three ordered steps, opens the complete internal section, and resolves the
  exact ordered workflow-to-atom relation. An area-only mapping, missing atom,
  unauthorized relation, or cross-locale relation fails without leaking an
  ID, title, action, or href.
3. `agent-unavailable-isolation` — fail/disable Agent and prove Guide history,
   readiness, response and Help navigation remain unchanged.
4. `permission-aware-open-cms` — allowed user opens the canonical Admin route;
   denied user sees no actionable destination or leaked href.
5. `visual-example-source-parity` — assert Help and portal share exact
   `{ docId, locale, sectionId }`, bundle-global visual/example IDs, canonical
   PNG hash, alt/caption, example bytes and safe renderer output.
6. `portal-local-exact-latest-rollback` — validate the exact TASK-548-05-L02
   operational handoff and mount its two exact capsules plus published,
   rolled-back and restored snapshots read-only. Open exact/latest section URLs
   in all three states; assert canonical/version/anchor/search/hash behavior,
   immutable exact-byte parity and restored/published equality. The 05-L02
   helper completes task-local publish→rollback→restore before the browser
   starts; this scenario invokes no writer. It also validates the
   rollback-specific post-deploy health receipt contract binding from/to
   latest, target version, target original identity/hashes, retained commit and
   deployment (05-L02's `DocsPostDeployRollbackHealthReceiptV1`), proving
   rollback is certifiable end-to-end. Import and execute all seven exact
   L03 portal action IDs as this scenario's ordered variants, retaining their
   report-owned visible assertions and zero-error arrays, while one final
   reviewed PNG owns the scenario's canonical screenshot.
7. `responsive-theme-keyboard` — wide/narrow, light/dark, reduced motion,
   skip-link, tab order, focus visibility/restore and no overflow.
8. `explicit-guide-agent-handoff` — verify redacted prefill, explicit switch,
   no auto-send, no response/plan/history transfer.

### Shared runtime-smoke adapter contract

Consume TASK-548-02-L02's already-landed literal `task-548` `SUITE_IDS` row,
both exact `SUPPORTED_PROFILES`, fixed adapter path/descriptor, and registry
tests read-only, alongside TASK-548-04-L03's portal contribution modules. This
leaf contributes ONLY the focused final eight-flow scenario module
(`scripts/runtime-smoke/adapters/task-548/final-scenarios.ts`) that the
already-landed `task-548` adapter shell consumes; it never edits the adapter
shell, the pilot modules, the registry/contracts/CLI/central test, or the
cookbook. Both profiles execute all eight IDs through:

```bash
bun scripts/runtime-smoke.ts run \
  --suite task-548 --profile fast --session task-548-fast
bun scripts/runtime-smoke.ts run \
  --suite task-548 --profile certification --session task-548-certification
```

The thin adapter must follow the L02-landed
`docs/develop/runtime-smoke-cookbook.md` recipe (read-only; this leaf never
rewrites the cookbook) and use
the existing `RuntimeSmokeContext` lifecycle, process supervisor, `pollUntil`,
`WorkerPool` and strict operation registry, one lazy DB-bearing profile with
`DB_POOL_MAX=1`, `RunFixtureLedger`/transactional set-based batch helpers,
browser segment compiler/`BrowserTransport`, checkpoint identities, repository
guard, redaction, timing, screenshots, cleanup, and report. The retained-Pages
fixture remains a task-specific bounded domain capsule. A worker pool is
registered with `RuntimeLifecycle` before dispatch; its exact create operation
allocates and pre-mount-verifies the L02 session. Immediately after that
operation succeeds, the adapter registers a parent-side `LifecycleResource`
proxy whose idempotent `close()` dispatches post-use verification and disposal
and whose `proveAbsent()` checks the worker-held repository, roots, mounts and
run ID. Registration happens before any mount, integration command or browser
action; partial worker allocation cleans itself before returning an error.
Reverse lifecycle order closes browser/process resources, then this session
proxy, then the worker pool. Only the verified loopback origin/run ID are
projected to shared supervised children.

No `scripts/docs` module starts/stops a server or Playwright, polls readiness,
owns a worker pool, loops over DB cleanup, implements checkpoint/report logic,
or invokes `playwright-cli` directly. `task548ClosurePhases.ts` only validates
phase receipts and invokes the registered shared entry point. Fast is the
prerelease feedback lane and writes no canonical TASK-545 evidence;
certification runs after immutable release verification and is the sole source
of the exact eight reviewed screenshots/manifest input below. A shared-harness
defect is repaired once in its shared owner with focused harness tests; product
failures return to the owning TASK-548 leaf.

The final adapter freezes the eight exact IDs and titles from the ordered
browser contract beside its action registry — the eight-flow contract itself is
this leaf's focused contribution module consumed by the already-landed adapter
shell. After all browser actions finish,
it derives the exact unique ordered scenario screenshot union and calls
`requireManifestableScenarioResults(rawScenarios, globalScreenshots)` directly
before returning to the shared runner. It may not use a task-local report
builder or repair/projection helper. Every fast and certification result has a
non-empty profile-specific variant set, machine-observed visible assertions,
empty per-variant console arrays, and exactly one owned screenshot; scenario 06
retains all seven ordered portal action IDs as variants while owning one final
PNG.

```ts
export async function runTask548FinalAdapter(
  context: RuntimeSmokeContext,
): Promise<SmokeAdapterResult> {
  requireExactTask548FinalInput(context.input);
  const rawScenarios = await runExactTask548FinalBrowserActions({
    context,
    contracts: REQUIRED_FLOW_CONTRACTS,
    portalVariants: TASK_548_PORTAL_SCENARIO_IDS,
  });
  const globalScreenshots = exactUniqueScenarioScreenshotUnion(rawScenarios);
  const scenarios = requireManifestableScenarioResults(
    rawScenarios,
    globalScreenshots,
  );
  return Object.freeze({
    serverUp: true,
    scenarios,
    screenshots: globalScreenshots,
    consoleErrors: Object.freeze([]),
  });
}
```

The certification invocation captures the shared runner's canonical JSON stdout
byte-for-byte as `report.json`; it does not construct or rewrite a task-local
report. The TASK-545 manifest hashes that exact byte and projects only its
validated scenario/variant/screenshot facts. Markdown stderr is transient.

Terminal TASK-545-03-L01's generic visible-evidence result/normalizer is consumed
read-only. Each of the eight adapter scenario results itself carries exact
title/pass, profile-specific variants, machine-observed assertion expected/
actual/pass values, empty variant console arrays, and its one screenshot path/
hash. The report's global screenshots are exactly the unique scenario union.
Manifest generation is a pure projection of those bytes; no closure helper may
invent, repair, or reassign evidence after the shared adapter returns. Focused
tests mutate every report/manifest scenario, variant, assertion, console, and
screenshot field and require TASK-545 mismatch failure.

Save one distinct human-reviewable screenshot per ID and populate only the exact
TASK-545 manifest fields: top-level task/suite/profile/session, report hash,
revision/generated-at/server-up values and, for each ordered scenario,
ID/title, non-empty theme/viewport variants with visible assertions and empty
`consoleErrors`, plus scenario screenshot relative path/SHA-256 records.
Page-error, unexpected-network, bundle-identity and cleanup checks are mandatory
pre-checkpoint gates and block phase 1 on failure, but they are neither
manifest fields/extra evidence files nor historical claims reconstructed during
post-resume closeout.

## Security Contract

- **Internal routes:** preserve the existing authenticated Admin session cookie
  plus RBAC behavior, POST CSRF, strict schemas, error mapping, audit and the
  `assistant` rate bucket. This acceptance flow adds no alternate auth mode.
- **Public portal:** static read only; no public API/write, credential, cookie,
  CSRF, nonce/HMAC, CAPTCHA, tracker, provider call or remote image.
- **Release:** verify tag/SHA binding, HTTPS base origin, exact-version
  no-overwrite, manifest/hash closure, latest-after-exact-success, concurrency
  guard and non-destructive rollback.
- **Fixtures:** unique synthetic identities; bounded content; clean only owned
  rows/files/sessions/processes and restore prior settings/index state.
- **Evidence:** redact logs and scan outputs/screenshots for secrets, session
  state, PII, absolute paths and internal-only material.

## Exact Phased Execution

TASK-548-08 dispatches implementation in three deploy-gated phases (foundation
→ facade → consumer cutover) with two 08-created strict owner actions
(`commit_merge_deploy_task548_foundation` and
`commit_merge_deploy_task548_era_aware_facade`) and the two fresh mutually
exclusive resume modes `task548-foundation-migration-resume` (verifies the
exact committed/deployed foundation bytes and the DB cutover state EXACTLY
`shadow_parity_clean`, then implements 02/03) and
`task548-consumer-cutover-resume` (verifies the exact facade deployment, the
rollout receipt for that build, consumers ready and the DB cutover state
EXACTLY `v2_activated`, then implements 04/05/06). The 03-L03 facade dispatch
is gated at EXACTLY `shadow_parity_clean`, never merely at/past
`backfill_complete`; no phase trusts prior-process memory. After 06-L02, invoke
these 07 phases in order:

```text
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-release-branch-pause
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

All seven normal-path 07 labels, plus the conditional retirement-pause and
retirement-confirmation labels, re-enter this same physical leaf owner. The
first invocation finishes owned runtime/product docs, derives bounded release
inputs, runs prerelease gates, and then 08 runs the canonical prerelease
post-audit. Every fix returns to its exact product leaf and reruns affected
gates plus the release-input phase. A pass returns an exact owner action asking
the owner to review, commit and merge to the protected release branch and then
WAIT for the protected semantic-release workflow; semantic-release is the SOLE
public release authority and alone creates the generated version/lock/changelog
release commit, the plain SemVer tag and the GitHub release, and the protected
TASK-548-05-L02 workflow's NORMAL RELEASE publication deploys Cloudflare only
when `released == "true"` (docs rollback never requires the semantic-release
output). The
owner never runs `git tag`/`gh release` and never guesses a version or tag; the
process then terminates. 07 performs none of those mutations.

A separate fresh invocation must select only `task548-release-resume` and
provide the recursively strict `runKind: "release" | "rollback"` union fields
(release: version/tag/gitSha/run/attempt/deployment/origin/basePath; rollback:
targetVersion/originalGitSha/run/attempt/deployment/origin/basePath; mixed or
opposite keys reject). It cannot receive or trust release inputs,
post-audit results, or any other in-memory payload from before the pause. It
trusts only verified semantic-release workflow outputs and the generated
release commit/tree (the tag and GitHub release are semantic-release-created).
It
validates the HEAD commit, separate Git tree OID, clean index/worktree,
canonical runtime-tree digest (from the clean workflow-run HEAD) plus the
PUBLIC docs tree identity (equal to runtimeTree for release; derived from the
verified target release/tag/capsule for rollback), immutable 05-L02
release/publication
receipts and the exactly-one matching post-deploy receipt against the PUBLIC
tree, then 08 performs one fresh read-only drift
gate against that committed HEAD (bound to runtimeTree). Any failure requires owner-mediated fixes and
a new release identity; the immutable released tree is never patched in place.
Only that pass allows the same invocation to run read-only preparation/full
gates and final smoke. Preparation does not close status and does not create
evidence/checkpoint bytes. The smoke phase writes only
the exact shared report plus TASK-545 manifest/eight screenshots, then TASK-545 phase 1 immediately
derives `_docs/_workflows/task-548-implement.mjs` only from its executing
`import.meta.url`, rechecks the committed exact-six bootstrap/static gates,
atomically creates the sole checkpoint and returns `owner_action_required`.
That process also terminates. The later closure-resume invocation accepts only
TASK-545 checkpoint-bound resume arguments; release-resume fields are forbidden.
It verifies owner-reviewed tracked parity without changing metadata.
`08-final-read-only-drift` then performs the
substantive frozen-runtime audit before any terminal write. This leaf becomes
terminal only after that pass on a first `frozen` closure attempt. A crash
before the first metadata write leaves the replay `frozen` and requires a fresh
read-only final drift. The first ordered transaction writes/fsyncs changelog
1261 no-replace, then CAS-temp/renames/fsyncs its index row. A crash may leave
the valid `file-only` prefix; `metadata_recovery` validates that exact prefix,
finishes the index idempotently, then completes only missing metadata without rerunning smoke/final
drift or requiring a lost in-memory result. After terminal writes, only
TASK-545's narrow mechanical metadata-delta validation runs and its result is
returned to 08 for its sole external emit.

If substantive final drift is non-pass, 08 first returns through this same leaf
the exact `Task548InvalidatedCheckpointOwnerActionRequired`; no metadata or
evidence byte changes. Its expected paths are checkpoint-derived and exactly
`report.json`, `manifest.json`, eight named PNGs and `resume-checkpoint.json`
in the canonical TASK-548 directory.
TASK-545 stays sole checkpoint-byte writer, and agents never delete or unstage
reviewed evidence. The owner verifies task/run/path/checkpoint hash, unstages
only those eleven paths, and archives them outside the repository or removes them
before invoking `restartArgv`. The `retirement-restart invocation` first calls
`confirmTask548InvalidatedCheckpointRetired()`, which requires the exact paths
absent from index/worktree and the directory absent or empty without symlink.
Wrong args, partial retirement, extra members or a remaining no-overwrite
checkpoint blocks before fixes/phase 1. Only then do the owning fix/gates and
the full prerelease-inputs→post-audit→owner-release-pause lifecycle rerun, but
only after a new current-tree read-only drift derives affected owners solely
from its fresh findings. Old findings and retired evidence are never read. A
new release-resume invocation must then verify the replacement immutable
release before preparation→smoke→new phase 1. This
owner-mediated transition is never evidence/metadata and is forbidden for
`metadata_recovery` or a clean pre-metadata crash.

## Exact Closure Validation Allowlist

`07-L01-runtime-docs-and-gates-preparation` reruns only the commands below.
It requires the current fresh release-resume receipt and committed-HEAD drift
pass. Every command is read-only with respect to tracked/canonical corpus,
visual, coverage, release, and publication state. Named tests may use uniquely
scoped DB/temp fixtures and must restore them; frozen install and package builds
may create only dependency/build output and must leave every tracked input
byte-identical to the already released commit.

```bash
bun install --frozen-lockfile

bunx vitest run --config vitest.config.ts \
  tests/vitest/documentation/docs-corpus-contract.test.ts \
  tests/vitest/documentation/docs-markdown-policy.test.ts \
  tests/vitest/documentation/docs-corpus-compiler.test.ts \
  tests/vitest/documentation/docs-corpus-native-migration.test.ts \
  tests/vitest/documentation/docs-coverage-reconciliation.test.ts \
  tests/vitest/documentation/docs-visual-scenario.test.ts \
  tests/vitest/documentation/docs-visual-fixtures.test.ts \
  tests/vitest/documentation/docs-visual-source-hash.test.ts \
  tests/vitest/documentation/docs-visual-staleness.test.ts \
  tests/vitest/documentation/docs-visual-diff.test.ts \
  tests/vitest/documentation/docs-visual-ci-contract.test.ts \
  tests/vitest/assistant/docsIngestService.test.ts \
  tests/vitest/assistant/docsDbRetriever.test.ts \
  tests/vitest/assistant/docsPermissionSnapshot.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts

bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/ui/admin-shell-nav.test.tsx \
  tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs/docs-public-links.test.ts \
  tests/vitest/docs/help-visual-asset-registry.test.ts \
  tests/vitest/ui-integration/docs-help-host-adapter.test.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-lazy-load.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts

bunx vitest run --config vitest.config.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx \
  tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-seo.test.ts \
  tests/vitest/docs-portal/portal-security.test.ts \
  tests/vitest/docs-portal/portal-accessibility.test.tsx

bun test \
  tests/unit/assistant/assistantService.test.ts \
  tests/unit/assistant/guideVisualAssetRegistry.test.ts \
  tests/unit/documentation/docsArtifactRecovery.test.ts \
  tests/unit/documentation/docsCorpusPromotionRecovery.test.ts \
  tests/unit/documentation/docsDockerWorkspaceContract.test.ts \
  tests/unit/documentation/docsGuideMigrationBaseline.test.ts \
  tests/unit/documentation/helpBuildAssetVerification.test.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/documentation/docsReleaseArtifact.test.ts \
  tests/unit/documentation/docsVisualCapture.test.ts \
  tests/unit/documentation/docsVisualPromotion.test.ts
bun test tests/unit/release

set -a && source .env && set +a && bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable })); if (!reachable) process.exit(1)'
set -a && source .env && set +a && bun test \
  tests/integration/server/assistantDocsIngestV2.test.ts \
  tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/server/docsVisualFixtureLifecycle.test.ts \
  tests/integration/routes/assistant.test.ts

bun run docs:check
bun run docs:visual:check -- --all
bun run docs:coverage -- --check

bun --cwd packages/docs-contracts check
tsc -p packages/docs-contracts/tsconfig.json --noEmit
bun --cwd packages/docs-renderer check
tsc -p packages/docs-renderer/tsconfig.json --noEmit
bun --cwd packages/docs-portal check
tsc -p packages/docs-portal/tsconfig.json --noEmit
DOCS_PRODUCT_VERSION=0.0.0-test DOCS_PUBLIC_ORIGIN=https://docs.example.invalid DOCS_PUBLIC_BASE_PATH=/docs SOURCE_DATE_EPOCH=0 bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts packages/docs-portal/dist
bun --cwd core build:admin
bun --cwd core --eval 'const contracts = await import("@coderso/docs-contracts"); const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); const helpAssets = await import("./admin/ui/help/helpBuildAssetVerification.ts"); if (typeof contracts.normalizeDocsDistributionBundleV2 !== "function" || typeof contracts.normalizeDocsPublicationPayloadV1 !== "function" || typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function" || typeof projection.createDocsPublicationProjectionFromPayloadV1 !== "function" || typeof helpAssets.normalizeEmbeddedHelpAssetReceiptV1 !== "function" || typeof helpAssets.resolveEmbeddedHelpBuildAssetFileV1 !== "function") throw new Error("docs_workspace_exports_invalid")'

bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run check:admin-bundle
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
trivy fs --scanners secret --exit-code 1 --timeout 5m packages/docs-portal/dist
git diff --check
```

The allowlist explicitly excludes the public
`bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id> --all-waves`
migration, `bun run docs:compile` and direct
`bun scripts/docs/compile-corpus.ts --write`, `bun run docs:recover` or any
workspace recovery API, `docs:visual:capture`, `docs:visual:promote`, every
Guide-visual capture/promotion API, `bun run docs:coverage -- --write`, release-artifact
regeneration, and real publication/deployment/rollback mutation. CLI behavior
for those producers is rerun only through the named tests above. The sole
bounded runtime exception after a fresh post-audit pass lives inside the
registered `task-548` adapter: one worker operation calls the
TASK-548-05-L02-owned `createDocsRetainedPagesValidationSessionV1()` against a
credential-free task-owned local bare repository. It completes
publish→rollback→restore and full pre-mount verification before returning a
safe operational handle. Neither `scripts/docs/task548ClosurePhases.ts` nor an
outer wrapper calls the helper directly.

The release-resume verifier removes its owned health-artifact temporary tree
before preparation. During each fast or certification runner invocation, the
adapter registers the worker pool, then immediately registers the returned
retained-session proxy with the shared `RuntimeLifecycle`, then registers the
loopback mount, restarted servers and named browser transport. It exposes only
`/published/**`, `/rolled-back/**`, and `/restored/**`. Exact ephemeral keys
`TASK548_RETAINED_PAGES_VALIDATION_ORIGIN` and
`TASK548_RETAINED_PAGES_VALIDATION_RUN_ID` are projected by the adapter to its
shared-supervised integration command and browser operations; they are never
logged, persisted, inherited by unrelated profiles, or accepted from ambient
process state. The adapter, not the closure phase, runs
`tests/integration/documentation/docsPlatformAcceptance.test.ts` against that
same session before the eight browser scenarios.

There is no `runWithTask548CleanupV1`, second `Promise.allSettled` domain, or
task-local signal/server/Playwright/report loop. On every success/failure/signal
path, the one shared runner stops admission and closes resources in reverse
order. The retained-session proxy always dispatches exact post-use full
verification, then idempotent disposal, and `proveAbsent()` checks the scoped
repo, snapshots, mounts and run ID. A worker-side partial allocation cleans
itself before returning. The shared report preserves the primary product error
and separately records every lifecycle cleanup/absence failure; phase 1 cannot
start unless report pass, top-level cleanup and repository-restoration proofs
all pass. Thus cleanup completes before report capture and checkpoint creation.
Closure consumes the already-landed packaged bundle, coverage report/matrix,
reviewed visual receipts/assets and the current-invocation verified immutable
release capsule/manifest, search publication, detached portal-manifest and
post-deploy-health handoff read-only. It never recreates them as acceptance
evidence.

After the allowlist and package builds, compare all tracked/canonical input
hashes with the landed handoff. If any check requires recovery, regeneration,
recapture, promotion, coverage write, artifact rebuild, or publication mutation,
abort closure without invoking it and return to that exact owner. If a
checkpoint already exists, leave the frozen tree and checkpoint unchanged,
invalidate that snapshot, perform the owner work outside frozen closure, and
start a new prerelease/owner-release/release-resume cycle before another smoke.

## Implementation Pseudocode

```ts
import { createResumeCheckpoint, requireTask548CommittedSixPathBootstrapAuthorizationV1, writeOrResumeOrderedDurableChangelogFileThenIndexV1, type Task548CommittedSixPathBootstrapReceiptV1 } from "./lib/smoke-evidence.mjs";
import type { VerifiedTask545Checkpoint, Task545ClosureIdentity, VerifiedTask545MetadataRecoveryDelta, Task545ClosureResume } from "./lib/smoke-evidence.mjs"; // exact owner exports
import { createDocsReleaseTreeBindingV1, normalizeDocsReleaseTreeBindingV1, serializeDocsReleaseTreeBindingV1, type DocsReleaseTreeBindingV1 } from "../../core/services/documentation/release/docsReleaseTreeBinding";
import { TASK_548_PORTAL_SCENARIO_IDS } from "../runtime-smoke/adapters/task-548-portal/browser-actions";
// Recursively strict runKind union; mixed or opposite keys reject.
export type Task548ReleaseResumeRequestV1 = Readonly<
  | {
      runKind: "release";
      version: string; tag: string; gitSha: string; // repository-format commit OID
      workflowRunId: string; workflowRunAttempt: number; deploymentId: string;
      origin: string; basePath: string;
    }
  | {
      runKind: "rollback";
      targetVersion: string; originalGitSha: string; // repository-format OID
      workflowRunId: string; workflowRunAttempt: number; deploymentId: string;
      origin: string; basePath: string;
    }
>;
// Discriminated health receipt/hash: exactly one matching artifact family was
// enumerated and only its owning validator ran.
export type Task548VerifiedHealthReceiptV1 = Readonly<
  | { runKind: "release"; receiptSha256: string }
  | { runKind: "rollback"; receiptSha256: string }
>;
export type Task548ReleaseOwnerActionRequired = {
  pass: false; code: "owner_action_required";
  action: "commit_merge_release_branch_and_wait_semantic_release"; taskId: "TASK-548";
  plannedVersion: string; plannedTag: string;
  plannedOrigin: string; plannedBasePath: string;
  // Semantic-release is the SOLE public release authority: the owner reviews,
  // commits and merges to the protected release branch and waits; semantic-
  // release alone creates the generated version/lock/changelog release commit,
  // the plain SemVer tag and the GitHub release; TASK-548-05-L02 deploys
  // Cloudflare only when released == "true". The owner never runs git tag / gh
  // release and never guesses a version or tag.
  releaseResumeMode: "task548-release-resume";
  // Required fields are listed BY RUN KIND. The normal continuation after this
  // owner pause is RELEASE; a rollback resume may be selected only from a
  // verified successful rollback workflow run.
  defaultContinuationRunKind: "release";
  requiredReleaseResumeFieldsByRunKind: Readonly<{
    release: readonly ["runKind", "version", "tag", "gitSha",
      "workflowRunId", "workflowRunAttempt", "deploymentId", "origin",
      "basePath"];
    rollback: readonly ["runKind", "targetVersion", "originalGitSha",
      "workflowRunId", "workflowRunAttempt", "deploymentId", "origin",
      "basePath"];
  }>;
};
export type PassedTask548ReleaseResume = Readonly<{
  pass: true; request: Task548ReleaseResumeRequestV1;
  runtimeTree: DocsReleaseTreeBindingV1; // current committed-head
    // drift/preparation identity (clean workflow-run HEAD for both run kinds)
  publicRuntimeTree: DocsReleaseTreeBindingV1; // selected PUBLIC docs identity:
    // for release it equals runtimeTree; for rollback it is derived from the
    // separately verified target release/tag/capsule at targetVersion/
    // originalGitSha, NEVER from the workflow-run HEAD
  cleanIndexAndWorktree: true; immutableReleaseHandoffsSha256: string;
  portalPrepublicationGateSha256: string;
  health: Task548VerifiedHealthReceiptV1; // discriminated health receipt/hash
    // (the only health hash; no generic postDeployHealthSha256 exists)
  currentInvocationBinding: CurrentProcessOnly; }>;
export type PassedTask548CommittedHeadDriftGate = Readonly<{
  pass: true; runtimeTree: DocsReleaseTreeBindingV1; findings: []; currentInvocationBinding: CurrentProcessOnly;
}>;
export type Task548OwnerActionRequired = {
  pass: false;
  code: "owner_action_required";
  action: "review_and_stage_evidence";
  taskId: "TASK-548";
  evidenceDirectory: "_docs/_workflows/_smoke/evidence/task-548/task-548-certification";
  checkpointPath:
    "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/resume-checkpoint.json";
  checkpointSha256: string;
  runId: string;
  resumeArgv: string[];
  resumeCommand: string;
  frozenRuntimeRevision: {
    gitHead: string;
    workingTreeDirty: boolean;
    workingTreeSha256: string;
  };
};
export const TASK_548_REPORT_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT = [
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/report.json",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/manifest.json",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/01-help-offline-local-search.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/02-guide-no-provider-grounded-answer.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/03-agent-unavailable-isolation.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/04-permission-aware-open-cms.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/05-visual-example-source-parity.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/06-portal-local-exact-latest-rollback.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/07-responsive-theme-keyboard.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/08-explicit-guide-agent-handoff.png",
  "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/resume-checkpoint.json",
] as const;
export const REQUIRED_FLOW_IDS = [
  "help-offline-local-search", "guide-no-provider-grounded-answer",
  "agent-unavailable-isolation", "permission-aware-open-cms",
  "visual-example-source-parity", "portal-local-exact-latest-rollback",
  "responsive-theme-keyboard", "explicit-guide-agent-handoff",
] as const;
export type Task548InvalidatedCheckpointOwnerActionRequired = {
  pass: false;
  code: "owner_action_required";
  action: "retire_invalidated_task548_checkpoint";
  reason: "final_drift_nonpass";
  taskId: "TASK-548";
  evidenceDirectory: "_docs/_workflows/_smoke/evidence/task-548/task-548-certification";
  checkpointPath:
    "_docs/_workflows/_smoke/evidence/task-548/task-548-certification/resume-checkpoint.json";
  checkpointSha256: string;
  runId: string;
  expectedEvidencePaths: typeof TASK_548_REPORT_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT;
  restartArgv: string[];
  restartCommand: string;
};
type Task548MetadataDeltaReceipt = VerifiedTask545MetadataRecoveryDelta;
export type PassedTask548FinalDrift = {
  pass: true; frozenRuntimeRevisionSha256: string; findings: [];
};
type VerifiedTask548DriftFinding = Readonly<{ severity: "HIGH" | "MEDIUM" | "LOW"; area: string; finding: string; evidence: string; recommendation: string }>;
export type NonPassingTask548FinalDrift = Readonly<{
  pass: false; frozenRuntimeRevisionSha256: string;
  findings: readonly VerifiedTask548DriftFinding[];
}>;
type Task548ClosureResume = Task545ClosureResume;
type EmptyTask548PhasePayload = Readonly<Record<string, never>>;
type Task548TerminalCloseoutPayloadV1 =
  | Readonly<{ resume: Extract<Task548ClosureResume, { state: "frozen" }>;
      finalDrift: PassedTask548FinalDrift }>
  | Readonly<{ resume: Extract<Task548ClosureResume, { state: "metadata_recovery" }>;
      finalDrift?: never }>;
export type Task548PhasePayloadMapV1 = Readonly<{
  "07-L01-release-inputs-and-prerelease-gates": EmptyTask548PhasePayload;
  "07-L01-owner-commit-merge-release-branch-pause": Readonly<{ prerelease: Task548PrereleaseReceipt; postAudit: PassedTask548PostAudit }>;
  "07-L01-release-resume-committed-head-tree-and-receipt-validation": Readonly<{ argv: readonly string[] }>;
  "07-L01-runtime-docs-and-gates-preparation": Readonly<{ release: PassedTask548ReleaseResume; committedHeadDrift: PassedTask548CommittedHeadDriftGate }>;
  "07-L01-final-smoke-phase1-owner-pause": Readonly<{ preparation: RuntimeDocsAndGatesReceipt }>;
  "07-L01-owner-resume-tracked-parity": Readonly<{ argv: readonly string[] }>;
  "07-L01-invalidated-checkpoint-owner-retirement-pause": Readonly<{ resume: Extract<Task548ClosureResume, { state: "frozen" }>; finalDrift: NonPassingTask548FinalDrift }>;
  "07-L01-confirm-invalidated-checkpoint-retired": Readonly<{ argv: readonly string[] }>;
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification": Task548TerminalCloseoutPayloadV1;
}>;
// A pass is bound to the frozen runtime and has no unresolved finding. Its
// dynamic payload is never serialized into closure metadata.
export async function prepareTask548ReleaseInputsAndPrereleaseGates(
  ctx: CloseoutContext,
  _payload: Task548PhasePayloadMapV1["07-L01-release-inputs-and-prerelease-gates"]
): Promise<Task548PrereleaseReceipt> {
  await assertImplementationThroughTask54806L02Complete();
  await ctx.requireTask548WorkflowOwnerImplementationReady();
  await ctx.finishAllOwnedProductRuntimeDocumentation();
  const releaseInputs = await ctx.resolveStrictPlannedReleaseInputsReadOnly({
    requirePlainSemVerTagEquality: true,
    requireHttpsOriginAndCanonicalBasePath: true,
  });
  await ctx.runPrereleaseDependencyShapedGates();
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  const fast = await ctx.runRegisteredRuntimeSmoke({
    argv: [
      "bun", "scripts/runtime-smoke.ts", "run",
      "--suite", "task-548", "--profile", "fast",
      "--session", "task-548-fast",
    ],
    expectedScenarioIds: REQUIRED_FLOW_IDS,
    canonicalEvidenceWritesForbidden: true,
  });
  await assertCompleteVisibleEvidence(fast, { consoleErrors: 0 });
  await ctx.requireSharedRuntimeSmokeCleanupAndRepositoryProof(fast);
  await ctx.removeAndProveAbsentExactFastCandidateEvidence({
    suite: "task-548", session: "task-548-fast",
  });
  await ctx.requireCurrentTreeStillMatchesPrereleaseInputs(releaseInputs);
  return ctx.createPrereleaseReceiptBoundToCurrentTree(releaseInputs);
}
export async function pauseTask548ForOwnerRelease(
  ctx: CloseoutContext,
  { prerelease, postAudit }: Task548PhasePayloadMapV1["07-L01-owner-commit-merge-release-branch-pause"]
): Promise<Task548ReleaseOwnerActionRequired> {
  await ctx.requireFreshPrereleaseReceiptAndPostAuditForCurrentTree(
    prerelease,
    postAudit
  );
  await ctx.requireNoReleaseOrRepositoryMutationByTask54807();
  return ctx.createExactOwnerReleaseAction(prerelease.releaseInputs);
  // The orchestrator yields this instruction and terminates. The owner reviews,
  // commits and merges to the protected release branch and waits for the
  // protected semantic-release workflow (the sole release authority). It does
  // not stage, commit, merge, tag, release, deploy, or continue in this process.
}
// Exact executable run-kind derivation (shared contract, mirrored in the
// TASK-548-07 parent): strict successful run/attempt provenance bound to the
// workflow path, the workflow event (`push` or an ALL-EMPTY manual
// `workflow_dispatch` for release; `workflow_dispatch` with the exact docs
// rollback pair for rollback), the normalized dispatch mode/target, the EXACT
// complete final job/status maps for all four known jobs (`semantic-release`,
// `docker-image`, `recover-docker-image`, future `docs-rollback`; the jobs API
// includes condition-skipped jobs), the `released` output (release only), the
// run head and the deployment ID. Release and rollback combinations are
// EXPLICIT; Docker recovery, unknown jobs, any status mismatch (including a
// skipped required job), mixed or unknown combinations reject BEFORE any
// artifact work.
export type Task548SelectedWorkflowRunMetadataV1 = Readonly<{
  workflowPath: string; // must byte-equal ".github/workflows/release.yml"
  event: "push" | "workflow_dispatch";
  dispatchMode: "manual-release" | "docker-recovery" | "rollback" | null;
  dispatchTarget: string | null; // exact normalized rollback target version
  jobs: Readonly<Record<string, "success" | "skipped" | "failed" | "cancelled">>;
  releasedOutput: boolean | null; // semantic-release `released` output; release only
  runHeadSha: string; // repository-format commit OID of the run head
  deploymentId: string | null; // resolved deployment identity
}>;
// Exact complete final workflow job/status maps for ALL FOUR known jobs
// (identical to the TASK-548-07 parent). The selected-run jobs API includes
// condition-skipped jobs, so the complete map names every job with its exact
// final status:
//   RELEASE  = semantic-release success, docker-image success,
//              recover-docker-image skipped, docs-rollback skipped;
//   ROLLBACK = semantic-release skipped, docker-image skipped,
//              recover-docker-image skipped, docs-rollback success.
// Any UNKNOWN job and ANY status mismatch (including a skipped required job or
// an unexpectedly successful opposite-mode job) rejects — correctly skipped
// opposite-mode jobs are expected and accepted.
export const TASK_548_RELEASE_JOB_MAP = {
  "semantic-release": "success",
  "docker-image": "success",
  "recover-docker-image": "skipped",
  "docs-rollback": "skipped",
} as const;
export const TASK_548_ROLLBACK_JOB_MAP = {
  "semantic-release": "skipped",
  "docker-image": "skipped",
  "recover-docker-image": "skipped",
  "docs-rollback": "success",
} as const;
export async function deriveExclusiveRunKindFromWorkflowMetadataV1(
  run: Task548SelectedWorkflowRunMetadataV1,
  expected: {
    workflowPath: ".github/workflows/release.yml";
    requireSuccessfulRollbackJob: boolean;
  }
): Promise<"release" | "rollback"> {
  if (run.workflowPath !== expected.workflowPath) {
    throw new Error("docs_release_run_workflow_path_invalid");
  }
  if (run.dispatchMode === "docker-recovery") {
    throw new Error("docs_release_run_kind_docker_recovery_rejected");
  }
  if (Object.keys(run.jobs).length === 0) {
    throw new Error("docs_release_run_jobs_missing");
  }
  // RELEASE: push OR a valid all-empty manual workflow_dispatch, with
  // `released === true` and the exact COMPLETE final release job map
  // (semantic-release + docker-image `success`; recover-docker-image +
  // docs-rollback `skipped`).
  const isAllEmptyManualRelease =
    run.event === "workflow_dispatch" &&
    run.dispatchMode === "manual-release";
  const releaseCombination =
    (run.event === "push" || isAllEmptyManualRelease) &&
    run.releasedOutput === true &&
    sameExactFinalJobMap(run.jobs, TASK_548_RELEASE_JOB_MAP);
  // ROLLBACK: workflow_dispatch with the exact docs rollback pair, the exact
  // COMPLETE final rollback job map (docs-rollback `success`;
  // semantic-release + docker-image + recover-docker-image `skipped`), and NO
  // semantic-release output.
  const rollbackCombination =
    run.event === "workflow_dispatch" && run.dispatchMode === "rollback" &&
    run.dispatchTarget !== null &&
    run.releasedOutput === null &&
    (expected.requireSuccessfulRollbackJob
      ? sameExactFinalJobMap(run.jobs, TASK_548_ROLLBACK_JOB_MAP)
      : false);
  if (releaseCombination === rollbackCombination) {
    throw new Error("docs_release_run_kind_mixed_or_unknown");
  }
  return releaseCombination ? "release" : "rollback";
}
// Exact complete final status map equality: the observed run job set (which
// includes condition-skipped jobs) must contain EXACTLY the four known jobs,
// each with its exact final status. An unknown/extra job, a missing job, or
// any per-job status mismatch rejects; correctly skipped opposite-mode jobs
// are accepted.
function sameExactFinalJobMap(
  jobs: Readonly<Record<string, "success" | "skipped" | "failed" | "cancelled">>,
  required: Readonly<Record<string, "success" | "skipped">>
): boolean {
  const observed = Object.keys(jobs);
  const expected = Object.keys(required);
  return observed.length === expected.length &&
    expected.every((job) => jobs[job] === required[job]);
}
export async function resumeTask548AfterOwnerRelease(
  ctx: CloseoutContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-release-resume-committed-head-tree-and-receipt-validation"]
): Promise<PassedTask548ReleaseResume> {
  await ctx.requireFreshMutuallyExclusiveInvocation("task548-release-resume", {
    forbidClosureResumeOrRetirementArgs: true,
    forbidPriorProcessPayload: true,
  });
  const request = ctx.parseExactReleaseResumeArgs(argv, {
    // Recursively strict runKind union; mixed/opposite keys reject.
    acceptRunKindUnion: {
      release: ["runKind", "version", "tag", "gitSha", "workflowRunId",
        "workflowRunAttempt", "deploymentId", "origin", "basePath"],
      rollback: ["runKind", "targetVersion", "originalGitSha",
        "workflowRunId", "workflowRunAttempt", "deploymentId", "origin",
        "basePath"],
    },
    rejectUnknownMissingDuplicateOrUnbounded: true,
    rejectMixedOrOppositeRunKindKeys: true,
    boundsOwner: "TASK-548-05-L02 release/health normalizers",
    gitSha: /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/,
    rejectAllZeroGitSha: true,
    requirePlainSemVerTagEqualityForRelease: true,
    requireHttpsOriginAndCanonicalBasePath: true,
  });
  // Fetch the AUTHORITATIVE selected run/attempt metadata FIRST and derive the
  // run kind from its exclusive workflow event/input/job metadata. Docker
  // recovery is ALWAYS rejected (it is never a docs release/rollback source);
  // `released === true` is required ONLY for runKind "release"; a rollback
  // requires a successful workflow_dispatch with the exact rollback dispatch
  // mode/target and does NOT require a semantic-release `released` output. A
  // mismatched kind or mixed artifacts reject before any Git/receipt work.
  const selectedRun = await ctx.fetchAuthoritativeSelectedWorkflowRunMetadata({
    workflowRunId: request.workflowRunId,
    workflowRunAttempt: request.workflowRunAttempt,
    requireExactlyOneSelectedRunAndAttempt: true,
    rejectDockerRecovery: true, // always; never a docs release/rollback source
    requireReleasedTrue: request.runKind === "release",
    requireSuccessfulWorkflowDispatchWithExactRollbackMode:
      request.runKind === "rollback",
  });
  // Exact executable run-kind derivation: strict successful run/attempt
  // provenance bound to the workflow path `.github/workflows/release.yml`, the
  // workflow event (`push` or an ALL-EMPTY manual `workflow_dispatch` for
  // release; `workflow_dispatch` with the exact docs rollback pair for
  // rollback), the normalized dispatch mode/target, the EXACT COMPLETE final
  // job/status maps for all four known jobs (`semantic-release` +
  // `docker-image` `success` with `recover-docker-image` + `docs-rollback`
  // `skipped` for release; `docs-rollback` `success` with the other three
  // `skipped` for rollback; the jobs API includes condition-skipped jobs;
  // unknown jobs or any status mismatch reject), the `released` output
  // (release only), the run head and the deployment ID. Release and rollback
  // combinations are EXPLICIT; Docker recovery, unknown jobs, any status
  // mismatch, mixed or unknown combinations reject before artifact work.
  const derivedRunKind = await deriveExclusiveRunKindFromWorkflowMetadataV1(
    selectedRun, {
      workflowPath: ".github/workflows/release.yml",
      requireSuccessfulRollbackJob: request.runKind === "rollback",
    }
  );
  ctx.requireRunKindMatchesRequest(derivedRunKind, request.runKind);
  // Compare the EXACT selected-run identity with the requested identity:
  // repository-format runHeadSha, workflow run id and attempt, and the
  // resolved deployment id must equal the request values; the release target
  // (`version`/`gitSha`/`tag`) must equal the run head for release, and the
  // rollback target (`targetVersion`/`originalGitSha`) must equal the
  // dispatch target for rollback. Any mismatch rejects before artifact work.
  await ctx.requireSelectedRunIdentityMatchesRequest(selectedRun, request, {
    requireRunHeadShaEqual: request.runKind === "release"
      ? request.gitSha : undefined,
    requireWorkflowRunId: request.workflowRunId,
    requireWorkflowRunAttempt: request.workflowRunAttempt,
    requireDeploymentId: request.deploymentId,
    requireDispatchTargetEqual: request.runKind === "rollback"
      ? request.targetVersion : undefined,
  });
  await ctx.requireSelectedRunHealthArtifactFamily(selectedRun, {
    // Exactly one matching family: release downloads only
    // `docs-post-deploy-health-*`; rollback downloads only
    // `docs-post-deploy-rollback-health-*`. Opposite/both/duplicate fail.
    expectedFamily: request.runKind === "release"
      ? "docs-post-deploy-health-*"
      : "docs-post-deploy-rollback-health-*",
    rejectOppositeBothOrDuplicate: true,
  });
  // Inventory the selected run+attempt's portal-prepublication artifacts
  // EXACTLY as health: require one matching release/rollback family
  // (release: `docs-portal-prepublication-gate-<version>-<gitSha>-*`;
  // rollback: `docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-*`).
  // Opposite/both/duplicate reject, and workflowRunAttempt is bound in the
  // strict portal report/receipt (the artifact name may remain run-ID based if
  // the receipt proves the attempt).
  await ctx.requireSelectedRunPortalPrepublicationArtifactFamily(selectedRun, {
    expectedFamily: request.runKind === "release"
      ? `docs-portal-prepublication-gate-${request.version}-${request.gitSha}-*`
      : `docs-portal-prepublication-gate-${request.targetVersion}-${request.originalGitSha}-*`,
    rejectOppositeBothOrDuplicate: true,
  });
  // TWO tree identities: `runtimeTree` is computed from the clean workflow-run
  // HEAD and remains the current committed-head drift/preparation identity;
  // `publicRuntimeTree` is the selected PUBLIC docs identity. For release it
  // equals runtimeTree. For rollback it is derived from the separately
  // verified target release/tag/capsule at targetVersion/originalGitSha, never
  // from the workflow-run HEAD.
  let runtimeTree: DocsReleaseTreeBindingV1;
  let runtimeTreeBytes: Uint8Array;
  let publicRuntimeTree: DocsReleaseTreeBindingV1;
  let publicRuntimeTreeBytes: Uint8Array;
  if (request.runKind === "release") {
    // Release verifies the clean HEAD and the tag target both equal gitSha.
    const checkout = await ctx.requireCleanCommittedReleaseCheckout({
      headCommitSha: request.gitSha,
      tag: request.tag,
      requireTagTargetCommitEqualsHeadCommit: true,
      requireIndexAndWorktreeClean: true,
    });
    const source = await ctx.readCanonicalDocsReleaseTreeBindingSourceV1(checkout, {
      requireOriginalBoundedGitRecordBytes: true, requireRepositorySelectedSha1OrSha256: true,
    });
    runtimeTree = normalizeDocsReleaseTreeBindingV1(
      createDocsReleaseTreeBindingV1(source));
    runtimeTreeBytes = serializeDocsReleaseTreeBindingV1(runtimeTree);
    publicRuntimeTree = runtimeTree;
    publicRuntimeTreeBytes = runtimeTreeBytes;
  } else {
    // Rollback verifies the clean HEAD equals the WORKFLOW RUN HEAD (runtimeTree
    // stays the current committed-head identity) and SEPARATELY resolves the
    // target release/tag/capsule to originalGitSha, deriving the PUBLIC tree
    // from that verified target — the run HEAD and the target SHA/tree are
    // never equated.
    const checkout = await ctx.requireCleanCommittedWorkflowRunHeadCheckout({
      headCommitSha: selectedRun.runHeadSha,
      requireIndexAndWorktreeClean: true,
    });
    const source = await ctx.readCanonicalDocsReleaseTreeBindingSourceV1(checkout, {
      requireOriginalBoundedGitRecordBytes: true, requireRepositorySelectedSha1OrSha256: true,
    });
    runtimeTree = normalizeDocsReleaseTreeBindingV1(
      createDocsReleaseTreeBindingV1(source));
    runtimeTreeBytes = serializeDocsReleaseTreeBindingV1(runtimeTree);
    const target = await ctx.resolveTargetReleaseTagAndCapsuleV1({
      targetVersion: request.targetVersion,
      expectedOriginalGitSha: request.originalGitSha,
      selectedRun,
    });
    publicRuntimeTree = target.publicRuntimeTree;
    publicRuntimeTreeBytes = target.publicRuntimeTreeBytes;
  }
  // Immutable release handoffs, portal-prepublication evidence and post-deploy
  // health all validate against the PUBLIC docs tree; the committed-head drift
  // gate downstream remains bound to runtimeTree.
  const immutable =
    await ctx.downloadAndVerifyImmutableTask54805L02ReleaseHandoffs(request, {
      requireExactNoClobberReleaseAssetAndReceiptPair: true,
      requireRetainedCapsuleManifestSearchAndAssetReceipts: true,
      expectedPublicRuntimeTree: publicRuntimeTree,
      expectedPublicRuntimeTreeBytes: publicRuntimeTreeBytes,
      requirePublicRuntimeTreeByteIdentityAcross: ["release-manifest",
        "artifact-receipt", "retained-publication-capsule",
        "rollback-selection", "rollback-receipt"],
    });
  const portalPrepublication = await ctx.withOwnedPortalGateArtifactTemp(
    async (outputRoot) => {
      const downloaded = await ctx.downloadExactSuccessfulRunArtifact(
        `docs-portal-prepublication-gate-${request.runKind === "release" ? request.version : request.targetVersion}-${request.runKind === "release" ? request.gitSha : request.originalGitSha}-${request.workflowRunId}`
      );
      const extracted = await ctx.extractExactRootRegularFiles(downloaded, {
        outputRoot,
        // NINE members exactly: report + seven PNGs + the canonical
        // prepublication receipt (producer uploads exactly these nine).
        members: ["report.json", "docs-portal-prepublication-receipt-v1.json",
          ...exactPortalGateScreenshotNames(
            TASK_548_PORTAL_SCENARIO_IDS)],
        rejectLinksDevicesNestedOrExtra: true,
      });
      return ctx.validateTask548PortalPrepublicationGate(extracted, {
        expectedRequest: request,
        expectedWorkflowRunAttempt: request.workflowRunAttempt, // bound in the
          // strict portal report/receipt; the artifact name may remain
          // run-ID based if the receipt proves the attempt
        expectedScenarioIds: TASK_548_PORTAL_SCENARIO_IDS,
        expectedPublicRuntimeTree: publicRuntimeTree,
        expectedPublicRuntimeTreeBytes: publicRuntimeTreeBytes,
        expectedPortalManifestSha256: immutable.portalManifestSha256,
        expectedArtifactRootSha256: immutable.portalArtifactRootSha256,
        requireCanonicalRunnerStdoutAndScreenshotHashes: true,
        requireCanonicalPrepublicationReceiptV1: true, // validates the receipt
          // schema/digest and binds workflowRunId/workflowRunAttempt/path/
          // event/runHeadSha, the release-or-rollback target identity,
          // deploymentId when known, report SHA-256, seven screenshot
          // name/hash records, public runtime-tree identity/hashes, portal
          // manifest hash and artifact-root hash against the PUBLIC tree
        requirePassServerUpZeroErrorsAndSharedCleanup: true,
      });
    }
  );
  const health = await ctx.withOwnedHealthArtifactTemp(async (outputRoot) => {
    // Exactly one matching family was enumerated above; download only that
    // family's single artifact and validate it ONLY through its owning helper
    // against the PUBLIC docs tree.
    const downloaded = await ctx.downloadExactSuccessfulRunArtifact(
      request.runKind === "release"
        ? `docs-post-deploy-health-${request.version}-${request.gitSha}-${request.workflowRunId}`
        : `docs-post-deploy-rollback-health-${request.targetVersion}-${request.originalGitSha}-${request.workflowRunId}`
    );
    const receipt = await ctx.extractExactSingleRootRegularFile(downloaded, {
      member: request.runKind === "release"
        ? "docs-post-deploy-health-v1.json"
        : "docs-post-deploy-rollback-health-v1.json",
      outputRoot,
    });
    if (request.runKind === "release") {
      return ctx.validateDocsPostDeployHealthReceiptV1(receipt, {
        expectedRelease: request,
        immutableReleaseHandoffs: immutable,
        expectedPublicRuntimeTree: publicRuntimeTree,
        expectedPublicRuntimeTreeBytes: publicRuntimeTreeBytes,
        requireReleaseArtifactRetainedRollbackAndHealthTreeIdentity: true,
        requireSearch: { attemptTarget: "search-index",
          linkAttemptToSearchFact: true, linkToSearchReceipt: true,
          linkToPortalManifest: true },
      });
    }
    return ctx.validateDocsPostDeployRollbackHealthReceiptV1(receipt, {
      expectedRollback: request,
      immutableReleaseHandoffs: immutable,
      expectedPublicRuntimeTree: publicRuntimeTree,
      expectedPublicRuntimeTreeBytes: publicRuntimeTreeBytes,
      requireRollbackBinding: { fromToLatestVersion: true,
        targetVersion: true, originalGitSha: true, portalManifestSha256: true,
        artifactRootSha256: true, retainedCommit: true, deploymentId: true },
    });
  });
  return ctx.createCurrentInvocationReleaseResumeReceipt({
    runKind: request.runKind,
    request, runtimeTree, publicRuntimeTree, cleanIndexAndWorktree: true,
    immutable, portalPrepublication, health,
  });
}
export async function prepareTask548RuntimeDocsAndGates(
  ctx: CloseoutContext,
  { release, committedHeadDrift }: Task548PhasePayloadMapV1["07-L01-runtime-docs-and-gates-preparation"]
): Promise<RuntimeDocsAndGatesReceipt> {
  await ctx.requireFreshCurrentInvocationReleaseResume(release);
  await ctx.requireFreshCommittedHeadDriftGate(
    committedHeadDrift,
    { runtimeTree: release.runtimeTree }
  );
  await ctx.runExactReadOnlyDocsCheck("bun run docs:check");
  const bundle = await loadPackagedDocsDistributionBundleV2();
  const landed = await ctx.loadAndValidateLandedDurableHandoffsReadOnly({
    bundle,
    coverageReport: "core/generated/docs/coderso-docs-coverage-v2.json",
    coverageMatrix: "docs/guide/_COVERAGE_MATRIX.md",
    visualReceiptsAndAssets: "docs/guide/assets",
    requireReleaseCapsuleManifestAndSearchReceipts: true,
    expectedRelease: release.request,
    verifiedReleaseResume: release,
  });
  await ctx.runExactClosureValidationAllowlist(landed);
  await ctx.assertNoCanonicalArtifactOrTrackedInputMutation(landed);
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  return ctx.createRuntimeDocsAndGatesReceipt({ landed, release });
}
export async function runTask548FinalSmokePhase1(
  ctx: CloseoutContext,
  { preparation }: Task548PhasePayloadMapV1["07-L01-final-smoke-phase1-owner-pause"]
): Promise<Task548OwnerActionRequired> {
  await ctx.requireFreshRuntimeDocsAndGatesReceipt(preparation);
  await ctx.requireCurrentReleasePortalPrepublicationGateReadOnly(
    preparation.release.portalPrepublicationGateSha256
  );
  const result = await ctx.runRegisteredRuntimeSmoke({
    argv: [
      "bun", "scripts/runtime-smoke.ts", "run",
      "--suite", "task-548",
      "--profile", "certification",
      "--session", "task-548-certification",
    ],
    expectedScenarioIds: REQUIRED_FLOW_IDS,
    expectedScenarioVariants: {
      "portal-local-exact-latest-rollback": TASK_548_PORTAL_SCENARIO_IDS,
    },
    adapterMustRunIntegrationAcceptanceAgainstItsOwnedSession: true,
    preparationReceiptSha256: preparation.sha256,
  });
  await assertCompleteVisibleEvidence(result, { consoleErrors: 0 });
  await ctx.requireSharedRuntimeSmokeCleanupAndRepositoryProof(result);
  await ctx.writeExactTask545ReportManifestAndEightScreenshots(result);
  const bootstrapReceipt: Task548CommittedSixPathBootstrapReceiptV1 =
    await ctx.requireCurrentCommittedExactSixPathBootstrapGate();
  await requireTask548CommittedSixPathBootstrapAuthorizationV1({
    repoRoot: ctx.repoRoot, receipt: bootstrapReceipt,
  });
  return createResumeCheckpoint({
    repoRoot: ctx.repoRoot,
    expectedTask: "TASK-548",
    expectedSuite: "task-548",
    expectedProfile: "certification",
    expectedSession: "task-548-certification",
    pinnedChangelogNumber: 1261,
    pinnedChangelogSlug: "task-548-hybrid-visual-documentation",
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
    runtimeResult: result,
  });
  // Returns owner_action_required immediately. No metadata write, stage,
  // commit, or post-phase-1 action.
}
export async function resumeTask548TrackedParity(
  ctx: CloseoutResumeContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-owner-resume-tracked-parity"]
): Promise<Task548ClosureResume> {
  const parsed = ctx.parseAuthoritativeTask545ResumeArgv(argv, {
    expectedTask: "TASK-548",
    expectedSession: "task-548-certification",
    rejectUnknownMissingDuplicateOrMixedModeArguments: true,
  });
  const resume = await ctx.openExactOwningWorkflowResume({
    checkpointPath: parsed.checkpointPath,
    checkpointSha256: parsed.checkpointSha256,
    runId: parsed.runId,
    expectedTask: "TASK-548",
    expectedSession: "task-548-certification",
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
  });
  await ctx.requireOwnerReviewedTrackedEvidenceParity();
  return resume;
}
export async function requireTask548InvalidatedCheckpointOwnerRetirement(
  ctx: CloseoutResumeContext,
  { resume, finalDrift }: Task548PhasePayloadMapV1["07-L01-invalidated-checkpoint-owner-retirement-pause"]
): Promise<Task548InvalidatedCheckpointOwnerActionRequired> {
  await ctx.requireExactNonPassingFinalDrift(finalDrift);
  const expectedEvidencePaths = ctx.deriveExactCheckpointEvidencePaths(
    resume.checkpoint,
    { includeCheckpointItself: true },
  );
  ctx.requireExactOrderedPaths(
    expectedEvidencePaths,
    TASK_548_REPORT_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT,
  );
  return ctx.createExactInvalidatedCheckpointOwnerAction(resume, {
    reason: "final_drift_nonpass",
    expectedEvidencePaths,
  });
}
export async function confirmTask548InvalidatedCheckpointRetired(
  ctx: CloseoutContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-confirm-invalidated-checkpoint-retired"]
): Promise<void> {
  await ctx.requireExactRestartArgsFromPriorRetirementAction(argv);
  await ctx.requireCanonicalEvidencePathsAbsentFromIndexAndWorktree(
    TASK_548_REPORT_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT
  );
  await ctx.requireEvidenceDirectoryAbsentOrEmptyNoSymlink();
}
export async function completeTask548TerminalCloseout(
  ctx: CloseoutResumeContext,
  input: Task548PhasePayloadMapV1["07-L01-terminal-metadata-closeout-and-mechanical-delta-verification"]
): Promise<Task548MetadataDeltaReceipt> {
  await ctx.requireTrackedResumeBoundToCurrentCheckpoint(input.resume);
  const checkpoint: VerifiedTask545Checkpoint = input.resume.checkpoint;
  const closureIdentity: Task545ClosureIdentity = input.resume.closureIdentity;
  const durable = await ctx.readDeterministicDurableCloseoutSources({
    checkpointIdentity: checkpoint,
    closureIdentity,
    canonicalEvidence:
      await ctx.readExactCanonicalReportManifestAndEightScreenshots(),
    frozenOnDiskFacts:
      await ctx.readCurrentFrozenOnDiskProductTaskFactsAndDurableReceipts(),
    planningAudit:
      await ctx.readExistingOnDiskNonAuthorizingPlanningAuditRecord(),
  });
  const plan = await ctx.buildDeterministicTask548MetadataPlan(durable, {
    firstWrite: "ordered-durable-changelog-file-then-index@v1",
    finalDriftGate: "passed-before-closure",
    closureIdentity,
  });
  if (input.resume.state === "frozen") {
    await ctx.requirePassedFinalDriftBoundToFrozenRuntime(input.finalDrift, {
      exactFindings: [],
    });
  } else {
    await ctx.requireNoFinalDriftPayload(input);
    await ctx.validateExactMetadataRecoveryPrefix(input.resume.delta, plan, {
      requireInitialState: ["file-only", "both"],
    });
  }
  const completedClosureIdentity =
    await writeOrResumeOrderedDurableChangelogFileThenIndexV1({
      repoRoot: ctx.repoRoot,
      checkpoint,
      runId: checkpoint.runId,
      closureIdentity,
      changelogBytes: plan.changelog1261,
      changelogIndexMutation: plan.changelogIndex1261,
      protocol: "ordered-durable-changelog-file-then-index@v1",
    });
  await ctx.completeMissingDeterministicMetadataWritesIdempotently(plan);
  const delta = await ctx.validateExactMetadataOnlyClosureDelta({
    closureIdentity: completedClosureIdentity,
    exactKeys: [
      "pass",
      "taskId",
      "runId",
      "closureMetadataRevision",
      "changedPaths",
    ],
  });
  return delta; // orchestrator emits this once; 07 never emits or persists it
}
```

**Data flow:** consumer-cutover implementation (04/05/06, dispatched by
TASK-548-08's `task548-consumer-cutover-resume` after it verifies the exact
facade deployment, rollout receipt for that build, consumers ready and the DB
cutover state EXACTLY `v2_activated`) → owned runtime/product docs → bounded
plain-SemVer release inputs and prerelease gates → complete shared `task-548`
fast smoke and candidate cleanup → canonical 08 prerelease
post-audit/fix/revalidation → exact owner commit/merge-to-release-branch action
(semantic-release is the sole release authority: it alone creates the generated
version/lock/changelog release commit, the plain SemVer tag and the GitHub
release; TASK-548-05-L02's NORMAL RELEASE publication deploys Cloudflare only
when `released == "true"` (docs rollback never requires the semantic-release
output);
the owner never runs `git tag`/`gh release`)
→ terminate. A fresh `task548-release-resume` parses only its recursively
strict `runKind: "release" | "rollback"` union CLI fields, fetches the
authoritative selected run/attempt metadata and derives the run kind from
exclusive workflow event/input/job metadata (Docker recovery is ALWAYS
rejected; `released == "true"` is required only for release; rollback requires
a successful `workflow_dispatch` with the exact rollback dispatch mode/target;
mismatched kind or mixed artifacts reject), enumerates the selected
run's health artifacts and requires exactly one matching family → release
proves HEAD/tag-target commit equality (tag created solely by
semantic-release; the resume trusts verified workflow outputs and the generated
release commit/tree) while rollback proves the clean HEAD equals the workflow
run head and separately resolves the target release/tag/capsule to
originalGitSha → TWO tree identities: `runtimeTree` from the clean
workflow-run HEAD (the committed-head drift/preparation identity) plus
`publicRuntimeTree` (the selected public docs identity: equal to runtimeTree
for release, derived from the verified target release/tag/capsule for
rollback, never from the workflow-run HEAD) → clean index/worktree parity → one
bounded untouched Git record stream → L01 pure create/normalize/serialize → exact
`DocsReleaseTreeBindingV1` PUBLIC byte identity across manifest, artifact,
retained publication, rollback, portal-prepublication evidence and the
exactly-one matching post-deploy health receipt
(only `docs-post-deploy-health-*` for release validated by
`validateDocsPostDeployHealthReceiptV1`; only
`docs-post-deploy-rollback-health-*` for rollback validated by
`validateDocsPostDeployRollbackHealthReceiptV1`; opposite/both/duplicate
families fail; a discriminated health receipt/hash is returned) → exact release-run L03
portal certification report/seven-PNG artifact and identity → fresh HEAD 08 drift
gate → read-only `docs:check`, one zero-input atomic packaged-bundle load and the exact
full-gate allowlist → registered adapter/worker creates one retained-Pages
validation session for that invocation → supervised integration acceptance →
eight ordered visible flows, including seven independent portal variants → one
shared lifecycle cleanup → exact report/manifest/eight screenshots → TASK-545
phase 1 checkpoint → second owner
pause and process termination. Neither fresh invocation receives authority from
an earlier process.

The separate checkpoint-bound closure resume verifies tracked parity and final
drift. TASK-545 returns the sole `closureIdentity`: on `frozen` it has required
canonical state `none` and selected current canonical UTC; on recovery it has
discovered one strict regular non-symlink TASK-548 changelog and zero (`file-only`)
or one (`both`) matching index row before delta allowlisting. 07 consumes that identity
directly, never rereads current time or resolves the path. It closes descendants before parents and returns (but does not emit) the
five-key delta; 08 emits it once. A pre-write crash may choose the new current
date, while a post-write UTC-boundary crash preserves the changelog date.

**Error handling:** missing/duplicate/unknown/unbounded release-resume fields;
a mixed or opposite `runKind` branch (release vs rollback keys), a wrong-kind,
duplicate or absent health artifact family; a run kind derived from the
authoritative workflow metadata that mismatches the request; Docker recovery at
any time or a missing `released == "true"` output on a release run; a rollback
run that is not a successful `workflow_dispatch` with the exact rollback
dispatch mode/target;
non-plain or unequal version/tag; wrong repository object format/OID width,
all-zero/mixed-width/uppercase commit or tree OID, wrong HEAD/tag commit for
release or a workflow-run-head/public-tree target mismatch for rollback (the
run HEAD and the target SHA/tree are never equated), dirty
index/worktree or noncanonical/divergent runtime-tree or public-tree binding; mismatched run/attempt/deployment/origin/base; mutable/conflicting
05-L02 assets; invalid/missing prepublication report/PNG identity; or invalid
post-deploy evidence blocks before drift, preparation or smoke. The prerelease
owner action terminates the process, and 07 never
stages, commits, merges, tags, releases, publishes, deploys or rolls back. A
post-release drift/gate defect returns to its owner and requires a newly
committed/released identity; released bytes are never repaired in place.

Malformed results, hash drift, console/page/network errors, inaccessible DB,
cleanup drift, unresolved findings, workspace hazards, stale packaged bytes or
a >1,000-line touched file also stop before metadata. This leaf never recovers
or regenerates corpus/bundle/coverage/visual/release/publication state. If a
checkpoint exists, it remains untouched until the owner retires its exact eleven
paths; the replacement flow restarts at prerelease inputs and obtains a new
release before smoke. Release-resume, checkpoint resume and retirement-restart invocation
arguments are mutually exclusive. Any evidence or non-metadata mutation after
smoke invalidates the snapshot. A final-drift finding writes nothing and returns
the retirement action. Pre-phase-1 metadata, schema sidecars/extensions,
non-prefix recovery, unavailable pre-pause payload claims, or substantive work
after terminal metadata rejects. Recovery also rejects index-only/corrupt/multiple
state or any filename/body/index date, task, number or path mismatch.

Phase 1 pins changelog 1261 and slug `task-548-hybrid-visual-documentation`;
its final metadata returns exactly the declared key set. Closeout
persists only durable facts plus `final-drift: passed-before-closure`; it never
reconstructs authoring/post-audit, page/network, bundle/health/cleanup or dynamic
final-drift history.

**Regression-test shape:** fixtures pin the three exclusive closure invocation
modes, both mandatory termination points, exact fast-smoke-before-post-audit
order, the deploy-gated phase handoffs from TASK-548-08
(`task548-foundation-migration-resume` at EXACTLY `shadow_parity_clean` and
`task548-consumer-cutover-resume` at EXACTLY `v2_activated`),
the strict release/rollback `runKind` union fields, clean
HEAD/tag commit for release (tag created solely by semantic-release) and
workflow-run-head plus separately resolved target-originalGitSha for rollback
(Docker recovery always rejected; `released == "true"` required only for
release; rollback requires a successful `workflow_dispatch` with the exact
rollback dispatch mode/target),
SHA-1/SHA-256
Git/tree OIDs, exact runtime-tree AND public-tree binding joins
through manifest/artifact/retained/rollback/health receipts (the exactly-one
matching health family only: `docs-post-deploy-health-*` for release,
`docs-post-deploy-rollback-health-*` for rollback — opposite/both/duplicate
fail — with the rollback-specific `DocsPostDeployRollbackHealthReceiptV1` binding from/to
latest, target version, target original identity/hashes, retained commit and
deployment; `publicRuntimeTree` equals `runtimeTree` for release and derives
from the verified target capsule for rollback, while committed-head drift stays
bound to `runtimeTree`), exact release-run
portal-gate artifact/report/PNG/version/SHA/manifest/artifact-root joins, and
rejection of injected pre-pause objects. They pin TASK-545's returned frozen/
recovery identity, no 07 clock/path resolution, and a post-changelog UTC rollover.
Child-process kills cover every journal/temp write, fsync, rename and directory-
fsync boundary; only none/file-only/both recover, with index-only/corrupt blocked.
Type checks import TASK-545's checkpoint/identity/delta/resume exports without redeclaration.
They prove no 07 release mutation, no preparation/smoke before fresh committed-
HEAD drift, and a new release after any post-release fix. Acceptance fixtures
also pin exact flow order, offline/isolation/RBAC/a11y behavior, immutable
retained-Pages ancestry/tree/receipt joins, eight hashes and idempotent cleanup;
wrong identity, path, symlink, receipt or sealed snapshot fails before evidence.

## Sub-Tasks

- [ ] Run every targeted/full gate and verify cleanup plus line counts.
- [ ] Execute all eight ordered real flows and hash the evidence.
- [ ] Finish docs before the prerelease audit; enforce the owner release pause,
  fresh release-resume verification/smoke, separate checkpoint resume, final
  drift and descendant-first metadata-only closeout.

## Testing Requirements

1. Finish owned docs, derive strict planned release inputs, run prerelease
   gates, execute all eight `task-548` fast-profile scenarios with no canonical
   evidence write, require shared cleanup and remove/prove absent its exact
   candidates, then require one canonical 08 prerelease post-audit. Assert the exact
   owner commit/merge-to-release-branch action (semantic-release is the sole
   release authority: it alone creates the generated version/lock/changelog
   release commit, the plain SemVer tag and the GitHub release, and
   TASK-548-05-L02 deploys Cloudflare only when `released == "true"` for the
NORMAL RELEASE publication only; docs rollback never requires the
semantic-release output), immediate
   process termination, and zero 07 repository/release/deployment mutation.
   Before every certification-profile runner (fast or certification), the fresh
   runner executes TASK-548-02-L02's Pinned Local Browser Install Contract
   (local pinned `@playwright/cli` version verification, repo-local
   `./node_modules/.bin/playwright-cli` dispatch binary through the injected
   repo-local-only resolver with no ambient PATH/global/npx fallback,
   `./node_modules/.bin/playwright install --with-deps chromium`, underlying
   Playwright version and Chromium executable/revision verification); missing or
   drifted browser/package blocks before any scenario.
2. In a fresh process accept only `task548-release-resume` with the recursively
   strict `runKind` union (release: version/tag/SHA/run/attempt/deployment/
   origin/base; rollback: targetVersion/originalGitSha/run/attempt/deployment/
   origin/base). Reject missing,
   duplicate, unknown, mixed/opposite run-kind keys, normalized-only, oversized
   and mixed closure/retirement
   args, plus every attempt to inject or reuse a pre-pause object.
3. Fetch the authoritative selected run/attempt metadata FIRST and derive the
   run kind from its exclusive workflow event/input/job metadata; ALWAYS reject
   Docker recovery; require `released == "true"` only for release; for rollback
   require a successful `workflow_dispatch` with the exact rollback dispatch
   mode/target (no semantic-release `released` output) — a mismatched kind or
   mixed artifacts reject.
   Enumerate the selected run's health artifacts and require exactly one
   matching family. Prove release HEAD/tag target equal the repository-format
   lowercase 40/64-hex commit
   OID; for rollback prove the clean HEAD equals the fetched workflow run head
   and separately resolve the target release/tag/capsule to originalGitSha —
   never equate the run HEAD and target SHA. Then validate one bounded
   untouched canonical Git record stream, and call L01's
   pure create/normalize/serialize API directly to derive
   `DocsReleaseTreeBindingV1` from the clean checkout. Keep TWO tree
   identities: `runtimeTree` from the clean workflow-run HEAD (committed-head
   drift/preparation identity) and `publicRuntimeTree` (equal to runtimeTree
   for release; derived from the separately verified target release/tag/capsule
   for rollback, never from the workflow-run HEAD).
   The binding is not an extra CLI field and the PUBLIC tree must remain exact
   through the
   05-L02 manifest/artifact pair, retained capsule, rollback selection/receipt,
   the exactly-one matching health receipt family (release
   `docs-post-deploy-health-*` only; rollback
   `docs-post-deploy-rollback-health-*` only; opposite/both/duplicate fail),
   portal-prepublication evidence,
   workflow/deployment identity, exact one-member 90-day
   post-deploy artifact, and exact eight-member 90-day portal-prepublication
   artifact from that same successful run, while the downstream committed-HEAD
   drift gate stays bound to `runtimeTree`. Validate its canonical runner report,
   seven screenshots and release identity. Reject every identity, hash,
   inventory, search-attempt or portal-receipt mismatch and clean both temp trees.
4. Run a fresh read-only 08 committed-HEAD drift gate before 07 preparation.
   A failure runs neither preparation nor smoke and requires a new commit/tag/
   release/deploy cycle; never mutate an immutable released identity.
5. Load `.env` and prove DB reachability. Run exactly the Vitest/Bun/DB,
   read-only docs/visual/coverage checks, package builds, lint/type/admin/full/
   security/diff commands in the allowlist; compare every tracked input hash.
   Re-run a named failure once in isolation. No excluded producer is authorized.
6. Prove the sole zero-input `loadPackagedDocsDistributionBundleV2()` atomically
   inspects hazards and loads/validates a clean checkout without the ignored report; no separate consumer guard or recovery,
   regeneration, rename, delete or fsync. Validate `docs/guide/_TEMPLATE.md`
   read-only and all landed coverage/visual/release/publication handoffs.
7. Use only the disposable 05-L02 local retained-Pages helper from the final
   registered adapter's worker operation. Pin its two slots, ancestry, trees,
   receipts and three sealed snapshots. Prove worker-pool registration before
   creation, immediate session-proxy registration before use, shared-supervised
   integration and browser consumers, exact seven portal variants, reverse
   lifecycle post-use verification/disposal/absence, all eight ordered flows,
   zero errors and exact manifest/PNG hashes. Reject any outer cleanup wrapper,
   direct closure-helper call or duplicated server/browser/report loop.
   Focused adapter tests pin all eight exact IDs/titles, both profile variant
   sets, the exact seven ordered scenario-06 portal variants, every visible
   assertion, empty console arrays, one screenshot per scenario, and the exact
   global union. Missing/changed fields, a false assertion, duplicate ownership,
   or union drift fails in `requireManifestableScenarioResults` before report
   or TASK-545 manifest creation.
8. Write only the shared-runner report, TASK-545 manifest, and eight screenshots,
   invoke its sole checkpoint
   writer, assert the exact phase-1 key set, then terminate without metadata,
   staging, commit, sidecar or later action.
9. In a separate checkpoint-bound closure resume, after owner staging, require
    `_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`, invoke the returned exact
    owning-workflow resume and require tracked parity without a metadata write.
    If `openWorkflowClosureResume` returns `frozen`, dispatch a fresh
    `08-final-read-only-drift` against the checkpoint-frozen runtime before any
    terminal status/changelog edit and require exactly no findings. Any finding
    aborts resume unchanged and returns the exact
    `retire_invalidated_task548_checkpoint` action. Verify the owner then
    unstages/retires exactly the bound report/manifest/eight PNGs/checkpoint,
    and require
    the returned argv plus absent index/worktree inventory before a new current-
    tree drift derives scoped fixes and a new phase 1. Partial retirement fails. If it returns
    `metadata_recovery`, do not rerun
    smoke or final drift and do not require an unavailable prior result.
    No allowlisted preparation command or excluded producer may run in either
    frozen resume branch. A newly discovered write/recovery need exits frozen
    closure unchanged, returns to the exact owner, and requires a new release
    and snapshot.
10. Derive one deterministic metadata plan from only the verified checkpoint
   identity/frozen revision/closure contract and TASK-545-returned
   `closureIdentity`, exact canonical
    manifest/screenshots, current rereadable frozen on-disk product/task facts
    and durable repository receipts, and the existing on-disk non-authorizing
   planning-audit record. In `frozen`, validate final drift and consume TASK-545's
   `none` identity. Write the fixed drift marker only through TASK-545's exact
   `writeOrResumeOrderedDurableChangelogFileThenIndexV1` call with
   `ordered-durable-changelog-file-then-index@v1`: checkpoint/run-bound journal;
   no-replace changelog + fsync;
   then index CAS temp/rename + fsync. In `metadata_recovery`, consume its strict
   `file-only|both` identity and immutable date, require the exact prefix, finish
   file-only's index idempotently, validate both, then
    complete only missing writes idempotently. Complete every descendant before
    its parent, update board/index/statistics and changelog, and only then run
    the narrow mechanical validator requiring exactly
    `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. Return it
    to 08 for exactly one external emit; never persist it. Any source/test/config/runtime-doc/
    workflow/evidence/HEAD or other-task delta fails. No substantive audit or
    mutation follows terminal metadata.
11. Prove the TASK-545 manifest has its exact owner schema and the directory has
    no audit/bundle/network/cleanup summary file or field. Prove closeout never
    reconstructs or claims historical page-error, unexpected-network,
    bundle/health, cleanup, authoring/post-audit, or dynamic final-drift details
    that are absent from the durable sources.
12. Run the canonical NUL-safe line-count gate over the leaf write set
    (identical contract in every TASK-548 task file; a file above 1,000 makes
    the gate fail with `exit 1`, including a non-newline final line; the
    baseline spans the full task/family dirty scope and commits/staging do not
    narrow it):

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

## Documentation Updates Required

Update only the exact owned files above. Explain one-source compilation, visual
promotion, Help, Guide/Agent isolation, offline behavior, reindex, portal
versioning, capsule release/rollback, post-deploy health, security and
validation. `_docs/ASSISTANT_GUIDE.md` and
`_docs/ASSISTANT_SITE_BUILDER.md` are mandatory shared assistant-workflow
updates, not conditional files. Claim only actually shipped locales, never
Polish/Admin UI parity.

## Acceptance Criteria

- Prerelease fast smoke, audit, owner release pause, tag-built seven-flow portal
  prepublication gate, fresh committed-HEAD/receipt gate, all full gates and
  final eight flows pass with SHA-256 evidence, zero errors and shared cleanup.
- Docs match shipped contracts; no planned TASK-547 path is called shipped.
- TASK-548-08 has no unresolved HIGH/MEDIUM drift or missing agent result.
- Final drift passes before terminal metadata; deterministic closeout is first
  written afterward, the mechanical delta receipt remains external, and no
  substantive work follows closure.
- Changelog/board update once; leaves close before parents and TASK-548 last.
