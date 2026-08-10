# TASK-548-07: Acceptance, Smoke, Documentation and Closure
# FileName: TASK-548-07-Acceptance-Smoke-Documentation-And-Closure.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Acceptance / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 `✅ Done`; TASK-547 terminal; TASK-548-05-L02;
TASK-548-06-L02. The parent's frozen terminal handoff re-proven with every
literal final overlapping user/developer/shared-doc path and serialized owner,
plus the TASK-548-08 phased post-audit/final-drift handoffs, are sequencing
gates described in the body, not task edges.
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Prove the complete hybrid documentation platform as one installed product,
publish the final user/developer/architecture documentation, and close every
TASK-548 descendant in terminal order. This child adds acceptance-only
validation and evidence; defects return to their exclusive implementation
owner and all affected gates rerun.

TASK-548-07-L01 is the sole writer of changelog 1261, TASK-548 task statuses,
the task-board row/statistics, and final shared documentation. No earlier leaf
may perform partial closeout.

## Exclusive Ownership

- `tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- `scripts/docs/task548ClosurePhases.ts` for phase payloads/orchestration only;
- the focused final eight-flow scenario contribution module
  `scripts/runtime-smoke/adapters/task-548/final-scenarios.ts` plus its focused
  test `tests/unit/runtime-smoke/task-548-final-scenarios.test.ts`, consumed by
  TASK-548-02-L02's already-landed `task-548` adapter shell; this leaf NEVER
  edits the L02-owned adapter shell (`adapters/task-548.ts`), the L02-owned
  pilot modules, or the L02-owned adapter/worker tests
  (`task-548-adapter.test.ts`/`task-548-worker.test.ts`);
- final canonical shared-runner `report.json`, TASK-545 `manifest.json`, plus
  exactly eight screenshot bytes under
  `_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`; TASK-545
  `createResumeCheckpoint` phase 1 is the sole byte writer of the sibling
  `resume-checkpoint.json`;
- final documentation files listed by the parent and L01;
- exact required assistant workflow sources
  `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md`;
- all `TASK-548*.md` status/completion fields, the TASK-548 board row and
  statistics in `_docs/_TASKS/README.md`;
- changelog 1261 and its `_docs/_CHANGELOG/README.md` index row.

This child does not reopen schema, compiler, ingest, visual, Help, Guide,
Agent, portal, corpus, or release production files. A failure is assigned to
the leaf that owns the defective contract.

TASK-548-02-L02 is the SOLE writer of the shared runtime-smoke seams
(`contracts.ts`, `cli.ts`, `registry.ts`, `cli-registry.test.ts`, and the
cookbook) and of the five-flow `task-548` pilot adapter/tests; it declares
BOTH fixed TASK-548 suite rows (`task-548` and `task-548-portal`) after
terminal TASK-554.
TASK-548-04-L03 preserves those rows read-only and implements only the focused
`task-548-portal` contribution modules. L01 contributes only the focused final
eight-flow scenario module to the already-landed `task-548` adapter shell
while validating registry/CLI/contracts/central tests read-only; it never
edits the shared seams, the adapter shell, or the cookbook. Later
TASK-414 waits for TASK-548 and TASK-554. Concurrent shared-file edits are
forbidden.

The frozen TASK-547 bytes must remain available and byte-identical before any
TASK-548 implementation. The TASK-548 parent already records every literal
final overlapping path and its serialized writer. In particular, this
child may not edit `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md` concurrently with any
TASK-547 owner; an unresolved or wildcard ownership claim blocks.

## Required Real Browser Flows

Run through the shared entry point and the `task-548` static adapter; the
adapter's shared `BrowserTransport` owns one named Playwright session matching
the validated runtime-smoke session. The ordered scenario IDs are:

1. `help-offline-local-search`;
2. `guide-no-provider-grounded-answer`;
   this flow asks one atomic-control and one composed-workflow question,
   requires default `basic` within 440 Unicode scalars/two sentences or three
   steps plus a non-null complete internal deep link, and
   verifies the exact ordered workflow-to-atom relation;
3. `agent-unavailable-isolation`;
4. `permission-aware-open-cms`;
5. `visual-example-source-parity`;
6. `portal-local-exact-latest-rollback`;
7. `responsive-theme-keyboard`;
8. `explicit-guide-agent-handoff`.

Both profiles execute the same eight IDs through:

```bash
bun scripts/runtime-smoke.ts run \
  --suite task-548 --profile fast --session task-548-fast
bun scripts/runtime-smoke.ts run \
  --suite task-548 --profile certification --session task-548-certification
```

Before any runner starts a real browser, the fresh runner executes
TASK-548-02-L02's Pinned Local Browser Install Contract: verify the local
pinned `@playwright/cli` package version from the pinned manifest/lock,
resolve the dispatch executable only as repo-local
`./node_modules/.bin/playwright-cli` through the injected repo-local-only
resolver (no ambient PATH/global/npx fallback), run
`./node_modules/.bin/playwright install --with-deps chromium` (the exact local
binary), and verify the underlying Playwright version and installed Chromium
executable/revision; missing or version-drifted browser/package blocks before
any scenario (`docs_visual_tool_version_mismatch`). Global/`npx`-latest
install paths are forbidden.

The adapter follows TASK-548-04-L03's already-landed
`docs/develop/runtime-smoke-cookbook.md` recipe and composes the
existing shared runner, lifecycle/process/polling wrappers and helpers,
persistent profile worker/operation registry, pooled DB worker and set-based
ownership helpers, browser segment compiler/transport, checkpoints, repository
guard, redaction, timing, screenshot, cleanup, and report primitives. The
suite-specific files may own strict documentation fixtures, selectors,
operations, and assertions only. They may not copy a wrapper, helper/worker
loop, server/Playwright lifecycle, DB cleanup loop, fixed-sleep poller,
checkpoint store, redactor, or reporter. A shared-harness defect is fixed once
in its shared owner and focused harness tests rerun.

The worker pool is registered with the shared lifecycle before its exact L02
retained-session create operation. Immediately after successful allocation and
pre-mount verification, the adapter registers a parent-side idempotent session
proxy before any mount/integration/browser use. Reverse lifecycle close stops
browser/process resources, dispatches full post-use verification plus session
disposal/absence, then closes the worker pool. Partial worker creation cleans
itself. No closure module owns an outer cleanup wrapper or direct helper call.

The fast profile is the prerelease feedback lane. The certification profile is
the final post-release/checkpoint input and alone promotes the exact eight
reviewed canonical screenshots below. Fast evidence remains task-scoped and is
cleaned/proven absent before the immutable release phase; it cannot enter the
TASK-545 canonical evidence inventory.

Every scenario asserts a visible effect through computed style, geometry,
DOM/ARIA state, URL/state transition, or rendered evidence. Selector presence
alone is insufficient. Every flow requires zero console/page errors and no
unexpected network request.

The final canonical directory is
`_docs/_workflows/_smoke/evidence/task-548/task-548-certification/` and has a
split single-writer contract. TASK-548-07-L01 alone captures the shared
runner's canonical stdout byte-for-byte as `report.json`, writes the strict
TASK-545 `manifest.json`, and writes exactly these eight screenshots:

```text
01-help-offline-local-search.png
02-guide-no-provider-grounded-answer.png
03-agent-unavailable-isolation.png
04-permission-aware-open-cms.png
05-visual-example-source-parity.png
06-portal-local-exact-latest-rollback.png
07-responsive-theme-keyboard.png
08-explicit-guide-agent-handoff.png
```

Immediately before TASK-545 phase 1, 07 obtains the current committed exact-six
bootstrap receipt and passes it only to
`requireTask548CommittedSixPathBootstrapAuthorizationV1({ repoRoot, receipt })`.
Only after that gate passes does the exact ten-key `createResumeCheckpoint`
call—`repoRoot`, `expectedTask`, `pinnedChangelogNumber`,
`pinnedChangelogSlug`, `expectedWorkflowRole`, `executingImportMetaUrl`,
`expectedSuite`, `expectedProfile`, `expectedSession`, and `runtimeResult`—
atomically write `resume-checkpoint.json`; the bootstrap receipt is not an
eleventh argument. The exact regular-file inventory after phase 1 is therefore
`report.json`, `manifest.json`, eight screenshots, and checkpoint (11 files),
but 07-L01 never writes checkpoint bytes.
No alternate acceptance or TASK-548-08 workflow-evidence tree is valid.
The fresh release-resume downloads and validates TASK-548-05-L02's exact
successful-run portal-prepublication report/seven-PNG workflow artifact. A
missing/stale/identity-drifted artifact aborts closure and requires a new
committed release cycle. L01 independently imports L03's action module and
executes all seven portal groups as scenario-06 variants against its disposable
session. L01 alone writes `06-portal-local-exact-latest-rollback.png` and the
final manifest during its own final smoke.

The manifest is exactly the TASK-545-owned canonical manifest schema. TASK-548
does not add audit, bundle, network, cleanup, workflow-summary, or other fields
to it. Pre-checkpoint page-error, unexpected-network, bundle-identity,
production-health and cleanup checks remain mandatory and any failure blocks
phase 1, but TASK-548 neither persists nor later reconstructs or claims those
historical results. Post-resume closeout may cite only facts durably present in
the verified checkpoint identity/frozen revision/closure contract, canonical
report/manifest/eight screenshots, deterministic current frozen on-disk product/task
facts and durable repository receipts, and the existing non-authorizing
planning-audit record. Among the eight screenshots,
`06-portal-local-exact-latest-rollback.png` is the sole canonical portal
screenshot.

## End-to-End Acceptance Matrix

- Local Help searches and reads the packaged bundle with the public origin
  blocked and no provider configured.
- Guide returns a DB-grounded answer whose evidence, visual/example resolution,
  `Open in Help`, `Open in CMS`, and public link all retain the owning canonical
  BCP-47 `{ docId, locale, sectionId }` tuple. `visualId` and `exampleId` remain
  bundle-global, and a same-`docId` answer in another locale cannot supply the
  card, action, or deep link.
  The default answer remains concise; atomic and composed evidence resolves
  bidirectionally through the catalog relation, while missing/unauthorized
  atoms or workflows leak no ID/title/route and cannot be replaced by an
  area-only capability mapping.
- Agent disablement/provider failure stays inside Agent state and never hides,
  clears, or relabels Guide/Help.
- Allowed and denied permission snapshots produce canonical `adminPaths`
  behavior without leaking inaccessible destinations.
- Embedded and public renderers agree on `{ docId, locale, sectionId }`,
  bundle-global visual/example identity, safe content, hashes, captions, and alt
  text.
- Exactly one TASK-548-05-L02 operational
  `DocsRetainedPagesValidationHandoffV1` session contains two ordered plain-
  SemVer capsules, the exact local validation ref/first-parent commit chain,
  published/rolled-back/restored snapshots, and canonical publication/rollback/
  restore receipt hashes. Acceptance strictly validates the handoff, serves all
  three sealed roots read-only, verifies exact/latest behavior in every state,
  proves rollback preserves immutable bytes and restore equals published, then
  disposes it. Only the 05-L02 helper may drive writers against its scoped local
  bare repository before browsing; scenario 6 invokes no writer.
- Production availability is consumed only by the fresh release-resume, which
  first fetches the authoritative selected run/attempt metadata, derives the
  run kind from its exclusive workflow event/input/job metadata (Docker
  recovery ALWAYS rejected; `released == "true"` required only for release;
  rollback requires a successful `workflow_dispatch` with the exact rollback
  dispatch mode/target), and enumerates
  the selected run's health artifacts requiring exactly ONE matching family. It
  validates the health receipt against the PUBLIC docs tree (equal to
  `runtimeTree` for release; derived from the separately verified target
  release/tag/capsule at `targetVersion`/`originalGitSha` for rollback, never
  from the workflow-run HEAD). It
  then downloads
  the exact
  TASK-548-05-L02 artifact
  `docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` (release) or
  `docs-post-deploy-rollback-health-<targetVersion>-<originalGitSha>-<workflowRunId>`
  (docs-rollback) from the selected
  successful release/deployment run, extracts it into a resolved task-owned
  temporary directory, and requires exactly one root regular member
  `docs-post-deploy-health-v1.json` or
  `docs-post-deploy-rollback-health-v1.json` respectively. Missing, duplicate,
  nested, extra,
  directory, symlink, device, or renamed members fail before recursively
  validating `DocsPostDeployHealthReceiptV1` or
  `DocsPostDeployRollbackHealthReceiptV1`. It must cover exact/latest, both
  retained manifests, one hashed asset, and exact `search`. The `results`
  inventory must contain `target: "search-index"` and bind `search.locale`,
  `search.path`, HTTP 200 status, bounded bytes, and SHA-256 to both the selected
  `DocsSearchPublicationReceiptV1` record and detached portal manifest;
  `search.locale` must equal `selectedRoute.locale`, and the attempt's
  path/status/bytes/body hash must equal the `search` fact. The verifier removes
  its owned temporary tree before preparation returns, and smoke consumes the
  verified receipt without a second download. Because the artifact families are
  exclusive, a docs-rollback run is validated INSTEAD through the
  rollback-specific post-deploy health receipt (`DocsPostDeployRollbackHealthReceiptV1`,
  `coderso.docs-post-deploy-rollback-health@v1`) with its exact binding from/to
  latest version, target version, target original identity/hashes
  (`originalGitSha`, `portalManifestSha256`, `artifactRootSha256`), retained
  commit and deployment identity, plus the same bounded exact/latest/404 read
  facts and `status: "pass"` — rollback is certifiable end-to-end; release and
  rollback families never mix and duplicates fail. Both families embed the
  SHARED strict `DocsPostDeployReadFactsV1` (owner: TASK-548-05-L02
  `docsPostDeployHealthReceipt.ts`) — the closure-required same-origin facts
  bound to the selected public `DocsReleaseTreeBindingV1` with its
  normalizer/serializer as the single authority — and the rollback receipt
  adds from/to/target/original/retained/deployment identity on top of the
  same shape.
  Closure does not publish, deploy,
  promote, roll back, or otherwise mutate production.
- Wide/narrow, light/dark, reduced-motion, keyboard/focus and screen-reader
  semantics remain usable.
- Explicit handoff is redacted, bounded, prefilled, never auto-sent, and does
  not merge histories.

## Security Contract

- **Visibility/auth:** `/admin/help` and assistant routes remain internal to an
  authenticated Admin session; the portal remains static public read only.
- **RBAC:** exercise Help destination filtering plus the existing assistant
  read/write permissions without broadening them.
- **CSRF/rate limit:** assistant POST routes retain CSRF and the `assistant`
  bucket. The static portal has no write, CSRF, nonce/HMAC, or CAPTCHA surface.
- **Validation:** run strict reject-unknown, path, URL, hash, link, route,
  permission, artifact, and renderer hostile fixtures.
- **Privacy:** use synthetic scoped fixtures only. Evidence must contain no
  cookie, session/CSRF value, provider key/prompt, real user data, or PII.
- **Cleanup:** remove only task-owned rows/files/processes/sessions even on
  failure and verify the prior settings/index state is restored.

## Phased Implementation Shape

The exact normal-path post-06-L02 order is split across three mutually
exclusive invocations; TASK-548-08 dispatches the pre-07 implementation in
three deploy-gated phases (foundation → facade → consumer cutover) with the
08-created foundation/facade owner actions and the fresh resume modes
`task548-foundation-migration-resume` (EXACTLY `shadow_parity_clean`) and
`task548-consumer-cutover-resume` (EXACTLY `v2_activated`):

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

All seven normal-path 07 labels, plus the conditional checkpoint-retirement
pause and retirement-confirmation labels, invoke the same physical
TASK-548-07-L01 owner. Its status remains open until terminal closeout. The
prerelease invocation finishes owned documentation, derives strict planned
release inputs and runs dependency-shaped prerelease gates. TASK-548-08 then
runs its canonical post-audit. Every fix returns to its exact owning leaf and
reruns the affected gates plus the release-input receipt. Only a fresh pass may
produce the exact owner-only commit/merge-to-release-branch action (the owner
reviews, commits and merges to the protected release branch and WAITS;
semantic-release is the SOLE release authority and alone creates the generated
version/lock/changelog release commit, the plain SemVer tag and the GitHub
release; TASK-548-05-L02's NORMAL RELEASE publication deploys Cloudflare only
when `released == "true"` (docs rollback never requires the semantic-release
output);
the owner never runs `git tag`/`gh release`);
07/08 do not perform any of those mutations, and that process terminates.

Only a new `task548-release-resume` invocation may accept the recursively
strict `runKind: "release" | "rollback"` union: release binds `version`, `tag`,
`gitSha`, `workflowRunId`, `workflowRunAttempt`, `deploymentId`, `origin`, and
`basePath`; rollback binds `targetVersion`, `originalGitSha`, `workflowRunId`,
`workflowRunAttempt`, `deploymentId`, `origin`, and `basePath`; mixed or
opposite keys reject. It trusts no
pre-pause object. It FIRST fetches the authoritative selected run/attempt
metadata and derives the run kind from its exclusive workflow event/input/job
metadata. Docker recovery is ALWAYS rejected — never a docs release/rollback
source; `released == "true"` is required ONLY for release; a rollback requires
a successful `workflow_dispatch` with the exact rollback dispatch mode/target
and does NOT require a semantic-release `released` output. A mismatched kind,
or mixed
artifacts reject, then it enumerates the selected run's health artifacts and
requires exactly one matching family. It accepts the repository-selected Git object format and thus
requires exact lowercase 40-hex SHA-1 or 64-hex SHA-256 commit/tree OIDs with no
mixed width. Release proves clean HEAD/tag equality (the tag target equals
`gitSha`) and clean index/worktree; rollback proves the clean HEAD equals the
WORKFLOW RUN HEAD and separately resolves the target release/tag/capsule to
`originalGitSha` — the run HEAD and the target SHA are never equated. The
resume keeps TWO tree identities: `runtimeTree` from the clean workflow-run
HEAD (the committed-head drift/preparation identity) and `publicRuntimeTree`
(equal to runtimeTree for release; derived from the separately verified target
release/tag/capsule for rollback, never from the workflow-run HEAD). Both
feed the
untouched bounded canonical Git record stream to TASK-548-05-L01's pure
`createDocsReleaseTreeBindingV1`, then normalize/serialize the
`DocsReleaseTreeBindingV1` objects through the same L01 owner. Immutable release,
artifact, retained-publication, portal-prepublication evidence and the
exactly-one matching TASK-548-05-L02
health receipt must carry
the PUBLIC tree binding byte-for-byte, while the committed-HEAD drift gate
stays bound to `runtimeTree`; 07 defines no local tree DTO/hash contract and never
imports L02's release-only Git adapter. It then downloads and strictly validates
the one-member post-deploy-health
artifact (only `docs-post-deploy-health-*` for release validated through
`validateDocsPostDeployHealthReceiptV1`; only
`docs-post-deploy-rollback-health-*` for rollback validated through
`validateDocsPostDeployRollbackHealthReceiptV1`; opposite/both/duplicate
families fail), and removes its temporary tree before returning its
current-invocation
receipt. A fresh 08 committed-HEAD drift pass then gates read-only runtime docs
and full-gate preparation. Final smoke consumes only that verified preparation
receipt; it never downloads or revalidates health by itself. It may invoke the
05-L02 local retained-Pages helper only against its task-owned disposable bare
repository, with no real publication authority.

Final smoke writes only the exact shared-runner report, TASK-545 manifest, and
eight screenshots, then runs the bootstrap-receipt gate immediately before TASK-545's exact
phase-1 call with pinned changelog number `1261`, slug
`task-548-hybrid-visual-documentation`, role `implement`, its own
`import.meta.url`, and the smoke result. TASK-545 atomically creates the sole
checkpoint, returns `owner_action_required`, and the release-resume process
terminates without metadata, staging, commit or any later action. Only a fresh
checkpoint-bound closure resume may verify owner-reviewed tracked parity. On a
first `frozen` attempt, 08 runs substantive final drift before any terminal
write. A pass allows 07 to consume TASK-545's sole `closureIdentity`, create the
canonical changelog 1261 file first and its matching index row next through the
sole TASK-545 owner export
`writeOrResumeOrderedDurableChangelogFileThenIndexV1`, then close descendants
before parents. Both `frozen` and `metadata_recovery` invoke that helper with
exact marker `ordered-durable-changelog-file-then-index@v1`; no local alias,
direct write, recovery bypass, or index-first path exists. A pre-write crash
remains `frozen` and
reruns final drift; a later crash enters `metadata_recovery`, validates the
existing changes as an exact prefix of the same deterministic plan, and
idempotently completes only missing metadata. 07 returns the five-key
mechanical delta, 08 emits it exactly once, and neither persists it. Nothing
substantive follows terminal metadata.

If substantive final drift is non-pass, 08 first returns through this same leaf
the exact `Task548InvalidatedCheckpointOwnerActionRequired`; it performs no
metadata or evidence mutation. Its expected paths are derived from the
checkpoint's exact `evidenceFiles` and are exactly `report.json`,
`manifest.json`, the eight named PNGs, and `resume-checkpoint.json`—eleven
paths—in the canonical TASK-548
evidence directory. TASK-545 remains the sole checkpoint-byte writer, and
agents never delete or unstage reviewed evidence. The owner verifies the
task/run/path/checkpoint hash, unstages only those eleven paths, and either archives
them outside the repository or removes them before invoking `restartArgv`.
The `retirement-restart invocation` first runs
`confirmTask548InvalidatedCheckpointRetired()`, requiring those exact paths
absent from index and worktree and the canonical directory absent or empty
without a symlink. Wrong args, partial retirement, a remaining path, extra
member or no-overwrite checkpoint conflict blocks before fixes or phase 1.
After confirmation, 08 runs a fresh current-tree read-only drift, derives the
affected owners only from its verified findings, and dispatches their fixes and
per-leaf gates. The same invocation then runs release inputs, canonical
prerelease post-audit and the replacement owner release pause, where it
terminates. Only a separate fresh release-resume may verify the replacement
committed/released identity before preparation, smoke and a new phase 1. The
restart skips bootstrap, authoring and the already-landed full implementation
sequence; old findings and retired evidence are never read. This owner-mediated
transition is neither evidence nor closeout metadata; `metadata_recovery` and a
clean pre-metadata crash never use it.

The conditional `retirement-restart invocation` is separate from every normal
invocation:

```text
07-L01-invalidated-checkpoint-owner-retirement-pause
--- process terminates; owner retires the exact eleven paths ---
07-L01-confirm-invalidated-checkpoint-retired
08-retirement-restart-fresh-current-tree-drift
derive-affected-owners-from-fresh-verified-findings
affected-owner-fixes-and-per-leaf-gates
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-release-branch-pause
--- process terminates; replacement release-resume is fresh ---
```

The exact preparation command surface is the
TASK-548-07-L01 **Exact Closure Validation Allowlist**: its named
Vitest/Bun/DB tests, read-only `bun run docs:check`,
`bun run docs:visual:check -- --all`,
`bun run docs:coverage -- --check`, package checks/builds, lint/type/admin
checks, full gates, strict security scan, and diff/line audits. It consumes the
landed packaged bundle, coverage outputs, reviewed visual assets/receipts,
release capsule/manifest receipt, search publication receipt, detached portal
manifest, and selected post-deploy health artifact read-only.

No 07 phase invokes the public Guide migration CLI, `bun run docs:compile` or
direct compiler `--write`, `bun run docs:recover` or a workspace recovery API,
Guide-visual capture/promotion, coverage `--write`, release-artifact regeneration, or
real publication/deployment/rollback mutation. Producer behavior is exercised
only by the exact named isolated tests, except that each final shared-runner
invocation asks its already-registered worker pool for exactly one
TASK-548-05-L02-owned retained-Pages session against a credential-free
task-owned local bare repository. The worker completes
publish→rollback→restore and pre-mount verification before returning a safe
handle. The adapter immediately registers its session proxy with the shared
`RuntimeLifecycle`, then mounts only `/published/**`, `/rolled-back/**`, and
`/restored/**`. It projects exactly
`TASK548_RETAINED_PAGES_VALIDATION_ORIGIN` and
`TASK548_RETAINED_PAGES_VALIDATION_RUN_ID` to the shared-supervised integration
test and browser operations using that same session; values are never logged,
persisted or inherited ambiently. If any other producer write becomes
necessary, closure returns to that exact owner without invoking it.

The release-resume verifier removes its health/prepublication-artifact temp
trees before preparation. No `runWithTask548CleanupV1`, task-local
`Promise.allSettled`, server/Playwright lifecycle, signal handler or report loop
exists. The shared runner closes all registered resources in reverse order on
success, failure and signal. The session proxy runs full post-use verification,
idempotent disposal and real absence proof before the worker pool closes;
partial worker allocation cleans itself. Primary product errors and bounded
cleanup failures remain distinct in the shared report, and phase 1 requires
both report pass and top-level cleanup pass. A frozen attempt never recreates
the session; a final-drift non-pass first returns the owner-retirement action.

```ts
import {
  createResumeCheckpoint,
  requireTask548CommittedSixPathBootstrapAuthorizationV1,
  writeOrResumeOrderedDurableChangelogFileThenIndexV1,
  type VerifiedTask545Checkpoint,
  type Task545ClosureIdentity,
  type VerifiedTask545MetadataRecoveryDelta,
  type Task545ClosureResume,
  type Task548CommittedSixPathBootstrapReceiptV1,
} from "./lib/smoke-evidence.mjs";
import {
  createDocsReleaseTreeBindingV1,
  normalizeDocsReleaseTreeBindingV1,
  serializeDocsReleaseTreeBindingV1,
  type DocsReleaseTreeBindingV1,
} from "./docsReleaseTreeBinding";
import { TASK_548_PORTAL_SCENARIO_IDS } from
  "../runtime-smoke/adapters/task-548-portal/browser-actions";

// Recursively strict runKind union; mixed or opposite keys reject.
export type Task548ReleaseResumeRequestV1 = Readonly<
  | {
      runKind: "release";
      version: string; tag: string; gitSha: string; // repository-format OID
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

export type PassedTask548ReleaseResume = Readonly<{
  pass: true; request: Task548ReleaseResumeRequestV1;
  runtimeTree: DocsReleaseTreeBindingV1; // current committed-head
    // drift/preparation identity (clean workflow-run HEAD for both run kinds)
  publicRuntimeTree: DocsReleaseTreeBindingV1; // selected PUBLIC docs identity:
    // for release it equals runtimeTree; for rollback it is derived from the
    // separately verified target release/tag/capsule at targetVersion/
    // originalGitSha, NEVER from the workflow-run HEAD
  cleanIndexAndWorktree: true;
  immutableReleaseHandoffsSha256: string;
  portalPrepublicationGateSha256: string;
  health: Task548VerifiedHealthReceiptV1; // discriminated health receipt/hash
    // (the only health hash; no generic postDeployHealthSha256 exists)
  currentInvocationBinding: CurrentProcessOnly;
}>;

export type Task548ReleaseOwnerActionRequired = {
  pass: false; code: "owner_action_required";
  action: "commit_merge_release_branch_and_wait_semantic_release";
  taskId: "TASK-548"; plannedVersion: string; plannedTag: string;
  plannedOrigin: string; plannedBasePath: string;
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

export type PassedTask548CommittedHeadDriftGate = Readonly<{
  pass: true; runtimeTree: DocsReleaseTreeBindingV1; findings: [];
  currentInvocationBinding: CurrentProcessOnly;
}>;

export const REQUIRED_FLOW_IDS = [
  "help-offline-local-search", "guide-no-provider-grounded-answer",
  "agent-unavailable-isolation", "permission-aware-open-cms",
  "visual-example-source-parity", "portal-local-exact-latest-rollback",
  "responsive-theme-keyboard", "explicit-guide-agent-handoff",
] as const;

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
    argv: ["bun", "scripts/runtime-smoke.ts", "run", "--suite", "task-548",
      "--profile", "fast", "--session", "task-548-fast"],
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
  // Yield owner_action_required and terminate this process immediately. The
  // owner reviews, commits and merges to the protected release branch and
  // waits for semantic-release (the sole release authority).
}
// Exact executable run-kind derivation (mirrored in 07-L01): strict successful
// run/attempt provenance bound to the workflow path
// `.github/workflows/release.yml`, the workflow event (`push` or an ALL-EMPTY
// manual `workflow_dispatch` for release; `workflow_dispatch` with the exact
// docs rollback pair for rollback), the normalized dispatch mode/target, the
// EXACT complete final job/status maps for all four known jobs (`semantic-release`,
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
// Exact complete final workflow job/status maps for ALL FOUR known jobs. The
// selected-run jobs API includes condition-skipped jobs, so the complete map
// names every job with its exact final status:
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
    rejectAllZeroGitSha: true, // mirrors the 07-L01 leaf option name
    requirePlainSemVerTagEqualityForRelease: true,
    requireHttpsOriginAndCanonicalBasePath: true,
  });
  // Fetch the AUTHORITATIVE selected run/attempt metadata FIRST and derive the
  // run kind from its exclusive workflow event/input/job metadata. Docker
  // recovery is ALWAYS rejected (never a docs release/rollback source);
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
  // Exact executable run-kind derivation (mirrored in 07-L01): strict
  // successful run/attempt provenance bound to the workflow path
  // `.github/workflows/release.yml`, the workflow event, the normalized
  // dispatch mode/target, the EXACT COMPLETE final job/status maps for all
  // four known jobs (release: `semantic-release` + `docker-image` `success`
  // with `recover-docker-image` + `docs-rollback` `skipped`; rollback:
  // `docs-rollback` `success` with the other three `skipped`; the jobs API
  // includes condition-skipped jobs; unknown jobs or any status mismatch
  // reject), the `released` output
  // (release only), the run head and the deployment ID. Release and rollback
  // combinations are explicit; Docker recovery, unknown jobs, any status
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
    expectedFamily: request.runKind === "release"
      ? "docs-post-deploy-health-*"
      : "docs-post-deploy-rollback-health-*",
    rejectOppositeBothOrDuplicate: true,
  });
  // Inventory the selected run+attempt's portal-prepublication artifacts
  // exactly as health: one matching release/rollback family;
  // opposite/both/duplicate reject, and workflowRunAttempt is bound in the
  // strict portal report/receipt.
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
      requireOriginalBoundedGitRecordBytes: true,
      requireRepositorySelectedSha1OrSha256: true,
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
      requireOriginalBoundedGitRecordBytes: true,
      requireRepositorySelectedSha1OrSha256: true,
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

export type Task548VerifiedCheckpoint = VerifiedTask545Checkpoint;
export type Task548ClosureIdentity = Task545ClosureIdentity;
export type Task548MetadataDeltaReceipt =
  VerifiedTask545MetadataRecoveryDelta;

export type PassedTask548FinalDrift = {
  pass: true;
  frozenRuntimeRevisionSha256: string;
  findings: [];
};

type VerifiedTask548DriftFinding = Readonly<{ severity: "HIGH" | "MEDIUM" | "LOW"; area: string; finding: string; evidence: string; recommendation: string }>;
export type NonPassingTask548FinalDrift = Readonly<{
  pass: false; frozenRuntimeRevisionSha256: string;
  findings: readonly VerifiedTask548DriftFinding[];
}>;

export type Task548ClosureResume = Task545ClosureResume;

type EmptyTask548PhasePayload = Readonly<Record<string, never>>;
type Task548TerminalCloseoutPayloadV1 =
  | Readonly<{ resume: Extract<Task548ClosureResume, { state: "frozen" }>;
      finalDrift: PassedTask548FinalDrift }>
  | Readonly<{ resume: Extract<Task548ClosureResume,
      { state: "metadata_recovery" }>; finalDrift?: never }>;
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
  const closureIdentity = input.resume.closureIdentity;
  const durable = await ctx.readDeterministicDurableCloseoutSources({
    checkpointIdentity: input.resume.checkpoint,
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
      checkpoint: input.resume.checkpoint,
      runId: input.resume.checkpoint.runId,
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
  return delta; // 07 never emits or persists it; 08 emits exactly once
}
```

**Data flow:** owned product/runtime docs → strict plain-SemVer release inputs
and prerelease gates → complete shared `task-548` fast smoke plus candidate
cleanup → canonical 08 post-audit/fix/revalidation → owner-only
commit/merge-to-release-branch action (semantic-release is the sole release
authority: it alone creates the generated version/lock/changelog release
commit, the plain SemVer tag and the GitHub release, and TASK-548-05-L02
deploys Cloudflare only when `released == "true"` for the NORMAL RELEASE
publication only; docs rollback never requires the semantic-release output)
→ terminate. Fresh strict
runKind-union
release-resume (release: version/tag/gitSha/run/attempt/deployment/origin/base;
rollback: targetVersion/originalGitSha/run/attempt/deployment/origin/base;
mixed/opposite keys reject) → authoritative selected run/attempt metadata first
with the run kind derived from exclusive workflow event/input/job metadata
(Docker recovery ALWAYS rejected; `released == "true"` required only for
release; rollback requires a successful `workflow_dispatch` with the exact
rollback dispatch mode/target; mismatched kind or mixed artifacts
reject) → exactly-one matching health artifact family → committed HEAD/tag
equality for release or workflow-run-head plus separately resolved
target-originalGitSha for rollback, and clean index/worktree → TWO tree
identities: `runtimeTree` from the clean workflow-run HEAD (committed-head
drift/preparation identity) and `publicRuntimeTree` (equal to runtimeTree for
release; derived from the verified target release/tag/capsule for rollback,
never from the workflow-run HEAD) → one
L01-normalized repository-format `DocsReleaseTreeBindingV1` per identity →
byte-identical
immutable release/publication/health PUBLIC-tree binding plus the exact
matching-family
health artifact and
release-run portal-prepublication report/seven-PNG validation/temporary cleanup
(committed-head drift downstream stays bound to `runtimeTree`)
→ fresh 08 committed-HEAD drift → read-only `docs:check`, one zero-input
atomic packaged-bundle load, landed handoffs and exact full-gate allowlist → one
registered adapter-worker retained-Pages session → supervised integration →
restarted Admin/local portal → eight real flows with seven scenario-06 variants
→ shared lifecycle cleanup/restoration → exact report/manifest/eight screenshots →
TASK-545 phase 1 with pinned `1261` and
`task-548-hybrid-visual-documentation` → owner review/stage pause → terminate.

Fresh checkpoint-bound closure resume → tracked parity → substantive 08 final
drift on `frozen` → TASK-545-owned closure identity → deterministic closeout
sources → ordered recoverable changelog 1261 file then matching index-row first
protocol → descendant-before-parent status, board and statistics updates → exact
five-key mechanical delta returned by 07 and emitted once by 08. A pre-write
crash remains `frozen` and reruns final drift; a later crash enters
`metadata_recovery`, validates the exact deterministic prefix and completes only
missing metadata without smoke, final drift, or a pre-crash in-memory payload.

**Error handling:** a missing result/screenshot/hash, skipped lane, stale visual,
broken link, missing/malformed/oversized/stale/wrong-run/wrong-version/wrong-tag/
wrong-SHA/wrong-deployment post-deploy receipt, a wrong-kind/duplicate/absent
health artifact family, Docker recovery at any time, a missing
`released == "true"` output on a release run, a rollback run that is not a
successful `workflow_dispatch` with the exact rollback dispatch mode/target, a
workflow-run-head versus public-tree target mismatch (the run HEAD and the
target SHA/tree are never equated),
missing/malformed/stale/wrong-run
portal-prepublication report/PNG artifact, receipt identity/hash mismatch,
missing/extra/unknown retained-Pages handoff key, unsafe ref/root, wrong
commit ancestry/tree/site-index/receipt hash, mutable exact byte, failed
published/restore parity, escaped cleanup,
unexpected request, console/page error, dirty cleanup, unresolved HIGH/MEDIUM
finding, or touched file above 1,000 lines blocks closure.
Any workspace journal/staging/backup hazard, report-only state, stale packaged
bundle or canonical-byte/source mismatch blocks read-only acceptance and is
returned to the declared TASK-548-01-L02 authoring/migration write handback.
Closure never invokes recovery, creates a migration report, regenerates the
bundle/report pair, or becomes a generated-artifact writer.
Any required migration, compile write, recovery, Guide-visual capture/promotion,
coverage write, release-artifact regeneration, or publication/deployment/
rollback mutation outside the exact ephemeral 05-L02 validation-session helper
aborts closure and returns to its exact owner before a new prerelease audit,
owner release, fresh release-resume, preparation and smoke snapshot. In
`frozen`, the checkpoint remains
unchanged while the exact retirement owner action is returned; no producer runs
in that frozen attempt.
Any product/runtime/docs/workflow/evidence/source/test/config change after the
final smoke snapshot, or any non-metadata change after tracked resume,
invalidates smoke/audit and requires a fresh pre-checkpoint run. The final drift
audit is read-only and precedes every terminal write; any finding makes it
non-pass, aborts resume without metadata mutation, invalidates the snapshot,
and returns to its owner before the normal validation/smoke/checkpoint lifecycle
reruns only after exact owner retirement is confirmed, fresh current-tree drift
derives the affected owner, and a replacement released identity passes a new
release-resume. Any
pre-phase-1 task/changelog/board/status write, recovery delta without exact
changelog-first deterministic-prefix parity, extra summary file,
manifest/checkpoint extension, or claim that an unavailable pre-pause agent or
runtime payload survived blocks resume. No finding is fixed after terminal
metadata.

The phase-1 result has exactly the fields shown in
`Task548OwnerActionRequired`; missing or extra fields fail. After every
descendant and parent status plus board/index/statistics and changelog update,
the metadata delta has exactly `{ pass, taskId, runId,
closureMetadataRevision, changedPaths }`. This mechanical result is the final
external owner handoff and is never written to task/changelog, the TASK-545
manifest/checkpoint, or another evidence file. The closure-only branch records
only durable facts from the bounded sources above plus the fixed literal
`final-drift: passed-before-closure`. It does not reconstruct historical
authoring/post-audit, page-error, unexpected-network, bundle, production-health,
or cleanup results; serialize dynamic final-drift findings/resolutions; or
fabricate `authoring.pass`/`postAudit.pass` fields.

**Regression shape:** acceptance pins prerelease fast-smoke order, ordered final
scenario IDs, exact seven portal variants, stable evidence
joins, strict two-slot retained-Pages ref/commit/tree/receipt closure, immutable
rollback plus published/restored parity, release-resume-owned production-health
verification (with the exactly-one matching health family and the PUBLIC tree
identity binding, while committed-head drift stays bound to `runtimeTree`),
release-run portal-gate identity and smoke consumption of both
verified receipts without a second download, offline/no-provider independence,
separate tab state, safe CMS links, responsive/a11y visible effects, immediate
resource registration, reverse lifecycle cleanup and idempotent absence proof.

## Sub-Tasks

- [ ] **TASK-548-07-L01** — run targeted and full gates, execute eight real
  browser flows, publish docs/evidence/changelog, and close the family.

## Testing Requirements

- exactly the named tests and commands in TASK-548-07-L01's **Exact Closure
  Validation Allowlist**, including read-only `bun run docs:check`,
  `bun run docs:visual:check -- --all`, and
  `bun run docs:coverage -- --check`; the vague 01..06 producer-command set is
  not a closure command surface;
- exact zero-input atomic `loadPackagedDocsDistributionBundleV2()` before landed coverage/visual/
  release/search/publication handoff validation. A clean-checkout fixture with
  the tracked bundle and ignored migration report absent must pass with zero
  bundle/report recovery, generation, or mutation;
- renderer/Admin/portal package builds from the landed bundle, the named Docker
  workspace/runtime contract test, and read-only immutable release
  capsule/manifest, publication/rollback receipt, and production-health receipt
  validation; no artifact rebuild or publication/deployment/rollback mutation;
- exact successful-run health-artifact download and hostile receipt validation
  inside the fresh release-resume only; smoke must consume the verified
  preparation receipt and perform zero health-artifact downloads;
- exact successful-run
  `docs-portal-prepublication-gate-<version>-<gitSha>-<workflowRunId>` (release)
  or `docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
  (rollback; the target-bound artifact produced inside the 05-L02 candidate
  callback before any retained/Cloudflare mutation) download
  only during fresh release-resume, with report plus seven root PNGs plus the
  canonical prepublication receipt (the exact NINE-member inventory), canonical
  runner bytes, exact IDs/variants/assertions/hashes, receipt-bound
  workflowRunId/workflowRunAttempt/runHeadSha and release/manifest/artifact-
  root identity against the PUBLIC docs tree and zero errors/shared cleanup;
  final smoke downloads none;
- exact `health.search` plus `results[].target: "search-index"` validation:
  canonical locale/path, HTTP 200, bounded bytes and SHA-256 must match the
  search publication receipt and detached portal manifest; missing, duplicate,
  wrong-locale/path/status/bytes/hash, or unlinked search evidence fails;
- exact one-root-regular-member artifact inventory, with missing, duplicate,
  nested, extra, directory and symlink fixtures;
- exactly one 05-L02 retained-Pages session per shared-runner invocation with a
  fixed no-hidden-input fixture: registered worker pool before create, exact
  `phase: "pre-mount"`, immediate parent session-proxy registration before use,
  same two ephemeral keys for shared-supervised integration/browser consumers,
  domain-separated tree/receipt/ref/ancestry closure, reverse-order exact
  `phase: "post-use"`, disposal and real absence proof. Tests reject an outer
  wrapper, task-local `Promise.allSettled`, direct closure helper call or copied
  lifecycle/report loop;
- read-only validation of TASK-548-01-L01's owned `docs/guide/_TEMPLATE.md`; this
  closure task does not edit that file;
- `bun --cwd core lint` and `bun --cwd core lint:types`;
- `bun run test`, `bun run precommit:check`, `bun run gates:coderso`;
- `bun run scan:security:strict`;
- task graph/H1/FileName/status audits and the canonical NUL-safe line-count
  gate over every added/modified production and test file in the leaf write set
  (identical contract in every TASK-548 task file; a file above 1,000 makes the
  gate fail with `exit 1`, including a non-newline final line); the verified
  pre-family baseline spans all intermediate commits and staging and cannot
  narrow:

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
- exact integration test in its ordinary isolated lane plus a final-adapter
  assertion proving the same test process receives only the adapter-owned
  retained-session projection;
- exact shared `task-548` fast and certification commands plus focused adapter,
  worker, CLI/registry, lifecycle, DB/browser/checkpoint/report tests;
- eight-flow cookbook-backed runtime smoke (with `playwright-cli` only behind
  shared `BrowserTransport`), TASK-545 phase1
  exact `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
  checkpointSha256, runId, resumeArgv, resumeCommand, frozenRuntimeRevision }`
  owner-action payload/owner-stage/resume/tracked-parity lifecycle;
- exact post-06-L02 three mutually exclusive invocation modes and ten-label
  normal order, with the same physical 07-L01 owner in all seven normal 07
  labels and both conditional retirement labels. Fixtures pin both mandatory
  process terminations, the strict release/rollback `runKind` union fields
  (Docker recovery always rejected; `released == "true"` required only for
  release; rollback requires a successful `workflow_dispatch` with the exact
  rollback dispatch mode/target), the two tree identities (`runtimeTree` from
  the clean workflow-run HEAD for committed-head drift; `publicRuntimeTree`
  equal to runtimeTree for release and derived from the verified target
  capsule for rollback), no pre-pause
  payload authority, nonterminal status through final drift, and no 07/08
  staging, commit, merge, tag, release, Cloudflare publication or rollback. A
  write/recovery need returns to the exact owner; a final-drift non-pass returns
  the exact 11-path retirement payload without mutating its checkpoint. Only
  owner-confirmed retirement, fresh current-tree drift, derived owner fixes,
  prerelease audit and a replacement owner release pause permit a separate new
  release-resume/preparation/smoke/checkpoint lifecycle;
- pre-phase-1 lifecycle fixtures prove zero task/changelog/board/status or
  checkpoint writes by 07, exact report/manifest/eight-screenshot inventory, immediate
  TASK-545 phase 1 as sole atomic checkpoint creator, pause, and no summary
  sidecar or manifest/checkpoint extension;
- resume fixtures prove `frozen` reruns a fresh final drift and requires
  `{ pass: true, findings: [] }`, while `metadata_recovery` never reruns smoke
  or final drift and never requires a lost final-drift object. Both derive the
  same deterministic metadata plan only from verified checkpoint
  identity/frozen revision/closure contract, exact canonical report/manifest/eight
  screenshots, rereadable frozen on-disk facts/durable repository receipts, and
  the existing non-authorizing planning record. Recovery accepts only an exact
  ordered `ordered-durable-changelog-file-then-index@v1` prefix, idempotently completes
  missing writes, and rejects
  unavailable agent/runtime payloads, invented authoring/post-audit pass fields,
  and dynamic final-drift serialization;
- exact metadata-only
  `{ pass, taskId, runId, closureMetadataRevision, changedPaths }` validation
  after every descendant/parent/index/changelog update; it is external-only,
  and no substantive audit follows terminal metadata;
- exact TASK-545 manifest and eight-file screenshot inventory tests reject
  audit/bundle/network/cleanup fields and alternate evidence files.
- same-`docId`/different-canonical-locale fixtures prove Guide evidence, local
  Help/CMS actions, public links, visuals, and examples remain bound to the
  owning `{ docId, locale, sectionId }` while visual/example IDs stay
  bundle-global.

Load `.env` before DB/settings lanes and first prove `DATABASE_URL` reachable.
Re-run a named failure alone before classifying it. Any skipped or unavailable
lane is recorded as blocking rather than silently accepted.

## Documentation Updates Required

TASK-548-07-L01 writes every parent-required user, developer, architecture,
security, release/health, testing, changelog, board, and closeout update exactly
once. `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md` are
mandatory because Guide/Agent separation changes the shared assistant workflow.
The Guide authoring template remains TASK-548-01-L01-owned and is validated
read-only here.

## Closure Rule

Close leaves before their technical parent and technical parents before
TASK-548. Update board statistics exactly once. The canonical changelog 1261
file is created first and its matching index row next through the recoverable
`ordered-durable-changelog-file-then-index@v1` protocol. Changelog 1261 records final
durable browser-manifest facts/hashes, deterministic shipped-tree facts, the
non-authorizing planning-audit reference, and the fixed
`final-drift: passed-before-closure` marker. It does not claim non-persisted
command, page-error, network, bundle/health, cleanup, authoring/post-audit, or
dynamic final-drift details. Required pre-checkpoint lanes still block phase 1
when unavailable or failed.
