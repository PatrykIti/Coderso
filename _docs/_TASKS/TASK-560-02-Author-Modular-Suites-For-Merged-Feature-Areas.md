# TASK-560-02: Author Modular Suites for Merged Feature Areas

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** High
**Size:** Very Large

# FileName: TASK-560-02-Author-Modular-Suites-For-Merged-Feature-Areas.md

**Parent Task:** TASK-560

## Purpose

Author missing modular runtime-smoke suites through the shared entry
(`bun scripts/runtime-smoke.ts run --suite <suite> --profile fast --session <name>`)
for the merged feature areas whose worktree smokes were never committed:
490 forms submissions export, 492 login alert delivery settings, 487 entry
revision history/restore drawer, 488 commerce variant editor + collections CRUD,
491 integrations (GA4 head tag, Slack/Zapier post-commit events, Sentry init,
health), 511 backup v2 (.cbk create/download, confirm-gated restore), 517 entry
visibility (private uniform 404, password prompt, unlock cookie flow, gated
cache exemption, authed bypass).

## Rules

- Add thin statically registered suite adapters only; compose the shared
  lifecycle, polling, process supervision, profile-scoped workers, database
  batches, browser segments, checkpoint primitives, redaction, timing, and
  reporting. NEVER copy those loops into a task-local executor.
- Follow `docs/develop/runtime-smoke-cookbook.md` registration/adapter recipes
  exactly; register through the shared entry point.
- At least 5 DISTINCT real-flow scenarios per area; assert VISIBLE EFFECT
  (computed styles, geometry, DOM state, aria/data attributes), never mere
  control presence; light+dark for admin surfaces; 0 console errors.
- Scenarios must mirror the original smoke scenario lists recorded in the
  closed task files/changelogs for 490/492/487/488/491/511/517 (source contract
  from TASK-560-01 gap report).
- Fixtures: uniquely scoped DB rows, cleanup only created rows, no truncates.
- Every suite file ≤ 1,000 physical lines; split adapters by responsibility
  into `scripts/runtime-smoke/adapters/task-###/` modules.
- No production code changes unless a missing seam is proven; prefer existing
  admin endpoints.

## Implementation pseudocode

Real adapter contract (audited 2026-08-15): `scripts/runtime-smoke/adapters/types.ts:55-68`
defines `SmokeAdapter` as `{ suiteId, supportedProfiles, run(context): Promise<SmokeAdapterResult>,
evidenceDirectory?(input, root): string | null }`. There is NO `{id, profiles, scenarios}`
descriptor object; scenarios are built INSIDE `run()` and returned as part of
`SmokeAdapterResult`. Mirror the task-554 adapter file structure. The shared
checkpoint/evidence helpers are in `scripts/runtime-smoke/visible-evidence.ts`
(e.g. `normalizeStrictManifestableScenario`, `assertExactUniqueScreenshotUnion`);
console-error validation is inline per adapter (mirror task-554/browser-actions.ts
`consoleErrors.length === 0` pattern). Visible-effect assertions are adapter-inline.

```ts
// scripts/runtime-smoke/adapters/task-517.ts — thin statically registered adapter
import type { SmokeAdapter } from "./types";
const adapter: SmokeAdapter = {
  suiteId: "task-517",
  supportedProfiles: ["fast", "certification"],
  evidenceDirectory: (input) =>
    `_docs/_workflows/_smoke/evidence/task-517/${input.session}`,
  async run(context) {
    // scenarios built here using the shared lifecycle/workers/browser
    // segments/checkpoints; assert visible effect + 0 console errors inline
    return { pass, scenarios, consoleErrors, screenshots, failures };
  },
};
export default adapter;
```

Registration is FOUR places (cookbook §3 `docs/develop/runtime-smoke-cookbook.md:82-106`):
1. `scripts/runtime-smoke/contracts.ts` — add id to `SUITE_IDS`.
2. `scripts/runtime-smoke/cli.ts` — `SUPPORTED_PROFILES`/option allowlists if required.
3. `scripts/runtime-smoke/registry.ts` — `ADAPTER_PATHS` entry + `DESCRIPTORS` entry.
4. `tests/unit/runtime-smoke/cli-registry.test.ts` — registry expectations.

Evidence root: canonical `_docs/_workflows/_smoke/evidence/<suite-id>/<session>/`
(task-545 convention). Do NOT copy task-554's legacy root
`_docs/_workflows/_smoke/task-554/<session>/` (audit finding MEDIUM-2).

Add cookbook examples only if a new pattern is introduced (additive only).

## Acceptance

- `bun scripts/runtime-smoke.ts run --suite task-5XX --profile fast --session <name>`
  exits 0 for every new suite with ≥5 scenarios each, 0 console errors, and
  report.json + screenshots written under `_docs/_workflows/_smoke/evidence/`.
- No task-local lifecycle/worker/cleanup/Playwright/report loop introduced.
