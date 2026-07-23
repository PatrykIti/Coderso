# TASK-548-07: Acceptance, Smoke, Documentation and Closure
# FileName: TASK-548-07-Acceptance-Smoke-Documentation-And-Closure.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Acceptance / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-05-L02, TASK-548-06-L02
**Status:** ⏳ To Do

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
- `scripts/docs/run-acceptance-smoke.ts`;
- `_docs/_workflows/_smoke/task-548/acceptance/**`;
- final documentation files listed by the parent and L01;
- exact required assistant workflow sources
  `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md`;
- all `TASK-548*.md` status/completion fields, the TASK-548 board row and
  statistics in `_docs/_TASKS/README.md`;
- changelog 1261 and its `_docs/_CHANGELOG/README.md` index row.

This child does not reopen schema, compiler, ingest, visual, Help, Guide,
Agent, portal, corpus, or release production files. A failure is assigned to
the leaf that owns the defective contract.

## Required Real Browser Flows

Use a restarted runtime and named `playwright-cli -s=wf548smoke` session. The
ordered scenario IDs are:

1. `help-offline-local-search`;
2. `guide-no-provider-grounded-answer`;
3. `agent-unavailable-isolation`;
4. `permission-aware-open-cms`;
5. `visual-example-source-parity`;
6. `portal-local-exact-latest-rollback`;
7. `responsive-theme-keyboard`;
8. `explicit-guide-agent-handoff`.

Every scenario asserts a visible effect through computed style, geometry,
DOM/ARIA state, URL/state transition, or rendered evidence. Selector presence
alone is insufficient. Every flow requires zero console/page errors and no
unexpected network request.

## End-to-End Acceptance Matrix

- Local Help searches and reads the packaged bundle with the public origin
  blocked and no provider configured.
- Guide returns a DB-grounded answer with stable source, Help link, visual or
  example when declared, permission-safe CMS action, and version-correct public
  link.
- Agent disablement/provider failure stays inside Agent state and never hides,
  clears, or relabels Guide/Help.
- Allowed and denied permission snapshots produce canonical `adminPaths`
  behavior without leaking inaccessible destinations.
- Embedded and public renderers agree on document/section/visual/example
  identity, safe content, hashes, captions, and alt text.
- A disposable local retained-Pages bare remote/static fixture publishes two
  exact SemVer capsules, promotes and rolls back `latest`, and proves exact bytes
  never mutate. Acceptance never writes the real Pages branch or release.
- Production availability is consumed only by downloading the exact
  TASK-548-05-L02 artifact
  `docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` from the selected
  successful release/deployment run, extracts it into a resolved task-owned
  temporary directory, and requires exactly one root regular member
  `docs-post-deploy-health-v1.json`. Missing, duplicate, nested, extra,
  directory, symlink, device, or renamed members fail before recursively
  validating `DocsPostDeployHealthReceiptV1`. It must cover exact/latest, both
  retained manifests and one hashed asset. Closure does not publish, deploy,
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

## Implementation Shape

```ts
async function acceptTask548(ctx: DocsAcceptanceContext): Promise<SmokeReceipt> {
  await ctx.runAllTargetedContracts();
  const artifact =
    await ctx.downloadPostDeployHealthArtifactFromExactSuccessfulRun();
  const health = await ctx.extractExactSingleRootHealthReceiptToOwnedTemp(
    artifact,
    "docs-post-deploy-health-v1.json"
  );
  await ctx.verifyReleaseArtifactCorpusCoverageAndDeployHealthReceipt(health, {
    expectedSchema: "coderso.docs-post-deploy-health@v1",
    expectedArtifact:
      `docs-post-deploy-health-${ctx.version}-${ctx.gitSha}-${ctx.workflowRunId}`,
  });
  await ctx.prepareDisposableRetainedPagesFixture();
  await ctx.restartRuntimeAndPortal();
  const scenarios = await ctx.runOrderedPlaywrightFlows(REQUIRED_FLOW_IDS);
  const receipt = await ctx.assertEvidence({
    scenarios,
    consoleErrors: 0,
    pageErrors: 0,
    verifySha256: true,
  });
  await ctx.cleanupOwnedFixturesAndAssertRestored();
  await ctx.runFullGatesAndLineAudit();
  return receipt;
}
```

**Data flow:** verified corpus/artifact + exact-run read-only post-deploy receipt
artifact → scoped CMS and disposable retained-Pages fixtures → restarted
Admin/local static portal → eight real flows → screenshots plus SHA-256 manifest
→ cleanup/restoration → full gates → fresh TASK-548-08 audit → docs, changelog,
and descendant-first closure.

**Error handling:** a missing result/screenshot/hash, skipped lane, stale visual,
broken link, missing/malformed/oversized/stale/wrong-run/wrong-version/wrong-tag/
wrong-SHA/wrong-deployment post-deploy receipt, receipt identity/hash mismatch,
unexpected request, console/page error, dirty cleanup, unresolved HIGH/MEDIUM
finding, or touched file above 1,000 lines blocks closure.

**Regression shape:** acceptance pins ordered scenario IDs, stable evidence
joins, local exact/latest/rollback integrity, production health-receipt
verification, offline/no-provider independence, separate tab state, safe CMS
links, responsive/a11y visible effects, and cleanup idempotency.

## Sub-Tasks

- [ ] **TASK-548-07-L01** — run targeted and full gates, execute eight real
  browser flows, publish docs/evidence/changelog, and close the family.

## Testing Requirements

- every targeted Vitest/Bun/DB/security/release/portal suite named by 01..06;
- `bun run docs:check` and `bun run docs:visual:check -- --all`;
- portal build plus artifact, disposable local publication/rollback, and
  read-only production-health receipt validation;
- exact successful-run health-artifact download and hostile receipt validation;
- exact one-root-regular-member artifact inventory, with missing, duplicate,
  nested, extra, directory and symlink fixtures;
- read-only validation of TASK-548-01-L01's owned `docs/guide/_TEMPLATE.md`; this
  closure task does not edit that file;
- `bun --cwd core lint` and `bun --cwd core lint:types`;
- `bun run test`, `bun run precommit:check`, `bun run gates:coderso`;
- `bun run scan:security:strict`;
- task graph/H1/FileName/status and touched-file line-count audits;
- eight-flow `playwright-cli` smoke and final TASK-548-08 drift pass.

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
TASK-548. Update board statistics exactly once. Changelog 1261 records final
commands, browser evidence hashes, audit findings that changed the result, and
any genuinely unavailable validation; TASK-548 cannot close with a required
lane unavailable.
