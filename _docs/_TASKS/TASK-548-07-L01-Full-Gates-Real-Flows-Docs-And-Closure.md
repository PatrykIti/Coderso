# TASK-548-07-L01: Full Gates, Real Flows, Docs and Closure
# FileName: TASK-548-07-L01-Full-Gates-Real-Flows-Docs-And-Closure.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-07
**Priority:** Critical
**Category:** QA / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-05-L02, TASK-548-06-L02
**Status:** ⏳ To Do
**Changelog:** 1261 (exclusive writer)

---

## Overview

Execute the dependency-shaped acceptance matrix, eight named real browser
flows, strict security/full gates, documentation updates, and final
descendant-first TASK-548 closure. This leaf is validation and closeout only:
implementation defects go back to the owning leaf, then every affected targeted
and downstream gate is rerun.

## Exclusive Single-Writer Ownership

- `tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- `scripts/docs/run-acceptance-smoke.ts`;
- `_docs/_workflows/_smoke/task-548/acceptance/**`;
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
resolve TASK-547's exact guide/develop path and either forbid it or serialize
this leaf after its final bytes; an unresolved/colliding path blocks closeout.
TASK-548-01-L01 remains sole writer of `docs/guide/_TEMPLATE.md`; this leaf
validates its shipped v2 authoring contract read-only and does not add it to the
closeout writer set.

## Production Health Receipt Handoff

Given the expected version, tag, 40-hex Git SHA, workflow run ID/attempt and
deployment ID, download only the exact artifact
`docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` from that successful
TASK-548-05-L02 release/deployment run. Extract into a resolved task-owned
temporary directory, inventory without following links, and require exactly one
root regular member `docs-post-deploy-health-v1.json`. Reject a missing,
duplicate, nested, extra, directory, symlink, device, or renamed member before
reading bytes and recursively validating exact discriminator
`coderso.docs-post-deploy-health@v1`. The producer's `.tmp` staging hierarchy is
never an artifact member.

Require identity equality for version/tag/SHA/run/attempt/deployment/origin/base
path; `attemptLimit: 5`; bounded complete results; exact indexable and latest
noindex status/body-hash/canonical/version facts; both retained manifest hashes;
one content-addressed asset path/hash; canonical `checkedAt`; and
`status: "pass"`. Missing artifact/file/result, unknown field, stale or
wrong-identity receipt, oversized evidence, failed status, or any hash/fact
mismatch blocks closure. The download is read-only. This leaf never invokes a
production publish, Pages deployment, latest promotion, or rollback.

## Ordered Browser Contract

Run exactly these ordered IDs with `playwright-cli -s=wf548smoke`:

1. `help-offline-local-search` — block public/provider origins; search, open,
   anchor-scroll and render a packaged article locally.
2. `guide-no-provider-grounded-answer` — disable provider; reindex/query and
   assert source, Help link, relevant visual/example and official link.
3. `agent-unavailable-isolation` — fail/disable Agent and prove Guide history,
   readiness, response and Help navigation remain unchanged.
4. `permission-aware-open-cms` — allowed user opens the canonical Admin route;
   denied user sees no actionable destination or leaked href.
5. `visual-example-source-parity` — assert Help and portal share stable IDs,
   canonical PNG hash, alt/caption, example bytes and safe renderer output.
6. `portal-local-exact-latest-rollback` — against a disposable local retained
   Pages bare remote/static fixture, publish two verified capsules, open exact
   and latest section URLs, roll latest back, and assert canonical/version/
   anchor/search/hash behavior while exact bytes remain unchanged.
7. `responsive-theme-keyboard` — wide/narrow, light/dark, reduced motion,
   skip-link, tab order, focus visibility/restore and no overflow.
8. `explicit-guide-agent-handoff` — verify redacted prefill, explicit switch,
   no auto-send, no response/plan/history transfer.

Save one distinct human-reviewable screenshot per ID plus a strict receipt
containing scenario order, relative path, viewport/theme, assertions, SHA-256,
runtime commit, bundle identity and cleanup result. Zero console/page errors and
zero unexpected requests are mandatory.

## Security Contract

- **Internal routes:** preserve authenticated Admin session/API-key behavior,
  existing assistant RBAC, POST CSRF, strict schemas, error mapping, audit and
  `assistant` rate bucket.
- **Public portal:** static read only; no public API/write, credential, cookie,
  CSRF, nonce/HMAC, CAPTCHA, tracker, provider call or remote image.
- **Release:** verify tag/SHA binding, HTTPS base origin, exact-version
  no-overwrite, manifest/hash closure, latest-after-exact-success, concurrency
  guard and non-destructive rollback.
- **Fixtures:** unique synthetic identities; bounded content; clean only owned
  rows/files/sessions/processes and restore prior settings/index state.
- **Evidence:** redact logs and scan outputs/screenshots for secrets, session
  state, PII, absolute paths and internal-only material.

## Implementation Pseudocode

```ts
export async function runTask548Closeout(ctx: CloseoutContext): Promise<void> {
  await assertDescendantsImplementedExcept("TASK-548-07-L01");
  await ctx.runTargetedGatesInDependencyOrder();
  await ctx.buildAndVerifyCorpusPortalRelease();
  const downloaded = await ctx.downloadExactSuccessfulRunArtifact(
    `docs-post-deploy-health-${ctx.version}-${ctx.gitSha}-${ctx.workflowRunId}`
  );
  const health = await ctx.extractExactSingleRootRegularFile(downloaded, {
    member: "docs-post-deploy-health-v1.json",
    outputRoot: ctx.ownedHealthArtifactTempRoot,
  });
  await ctx.validateDocsPostDeployHealthReceiptV1(health, {
    expectedRelease: ctx.expectedReleaseIdentity,
  });
  await ctx.prepareDisposableRetainedPagesBareRemote();
  await ctx.restartOwnedServers();
  try {
    const result = await ctx.playwright(REQUIRED_FLOW_IDS, "wf548smoke");
    await assertCompleteVisibleEvidence(result, { consoleErrors: 0 });
    await ctx.writeHashedSmokeReceipt(result);
  } finally {
    await ctx.cleanupAndAssertPriorState();
  }
  await ctx.runFullRepositoryAndStrictSecurityGates();
  await ctx.assertTouchedFileLineLimit(1000);
  await ctx.requireFreshTask548PostAudit();
  await ctx.updateDocsChangelogBoardAndStatuses();
}
```

**Data flow:** current validated sources → deterministic compile/reindex/build/
package + exact successful-run read-only production health artifact → local CMS,
portal and disposable retained-Pages bare remote → ordered visible flows →
bounded hashed evidence → unconditional cleanup → full gates/audits → fresh
shared indexes → docs and terminal closeout.

**Error handling:** preserve the previous valid corpus/artifact and evidence on
failure. A missing/malformed result, hash mismatch, stale receipt, console/page
error, missing/malformed/oversized/wrong-identity production receipt, unsafe
network call, skipped command, inaccessible DB, cleanup drift, unresolved
finding, or >1,000-line touched file returns nonzero and stops before metadata
closure.

**Regression-test shape:** the acceptance suite asserts exact flow identity/
order, Help offline behavior, Guide provider independence, Agent isolation,
permission-safe route resolution, stable visual/example joins, exact/latest
hash parity, responsive/a11y effects, handoff boundaries, and idempotent cleanup.

## Sub-Tasks

- [ ] Run every targeted/full gate and verify cleanup plus line counts.
- [ ] Execute all eight ordered real flows and hash the evidence.
- [ ] Require fresh post-audit success, update docs/changelog, and close in descendant order.

## Testing Requirements

1. Load `.env`; prove DB reachability before DB/settings suites.
2. Run every targeted command promised by TASK-548-01..06 in land order,
   including route/error-map, migration, hostile-render, visual, portal,
   artifact, release-workflow and coverage suites.
3. Run `bun run docs:check` and
   `bun run docs:visual:check -- --all`; never promote from CI/smoke.
4. Build and validate `packages/docs-portal/dist`, verify the immutable
   SemVer/content-addressed capsule, and exercise publication/rollback only
   against a disposable local bare remote; never write real release/Pages state.
5. Download TASK-548-05-L02's exact named 90-day artifact from the selected
   successful release/deployment run; extract into owned temp and require exactly
   root regular member `docs-post-deploy-health-v1.json`, rejecting missing,
   duplicate, nested, extra, directory, symlink, device, or renamed inventory.
   Then reject unknown, oversized, stale, wrong
   version/tag/SHA/run/attempt/deployment/origin/base, incomplete, non-pass,
   hash-drifted, or fact-drifted
   `DocsPostDeployHealthReceiptV1`. Do not publish or deploy production. Then
   restart owned CMS/local portal servers, verify health, execute all eight
   flows, close the named session and verify screenshots/receipt hashes.
6. Run `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run test`,
   `bun run precommit:check`, `bun run gates:coderso`, and
   `bun run scan:security:strict`.
7. Re-run each named failure once in isolation. No broad failure may be called
   pre-existing until isolated and evidenced.
8. Audit every added/modified production and test file with `wc -l`; any count
   above 1,000 fails.
9. Require TASK-548-08 final post-audit/evidence pass against the final working
   tree; any subsequent contract change invalidates it.
10. Validate TASK-548-01-L01's owned `docs/guide/_TEMPLATE.md` read-only.
11. Update documentation, changelog 1261, task descendants, board/statistics,
    and parent only after every required result is green.

## Documentation Updates Required

Update only the exact owned files above. Explain one-source compilation, visual
promotion, Help, Guide/Agent isolation, offline behavior, reindex, portal
versioning, capsule release/rollback, post-deploy health, security and
validation. `_docs/ASSISTANT_GUIDE.md` and
`_docs/ASSISTANT_SITE_BUILDER.md` are mandatory shared assistant-workflow
updates, not conditional files. Claim only actually shipped locales, never
Polish/Admin UI parity.

## Acceptance Criteria

- All gates and eight flows pass with SHA-256 evidence, zero errors, and cleanup.
- Docs match shipped contracts; no planned TASK-547 path is called shipped.
- TASK-548-08 has no unresolved HIGH/MEDIUM drift or missing agent result.
- Changelog/board update once; leaves close before parents and TASK-548 last.
