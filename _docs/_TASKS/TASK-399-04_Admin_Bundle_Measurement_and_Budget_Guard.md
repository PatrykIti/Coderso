# TASK-399-04: Admin Bundle Measurement and Budget Guard
# FileName: TASK-399-04_Admin_Bundle_Measurement_and_Budget_Guard.md

**Priority:** High
**Category:** Build Performance + Vite/Rolldown + Regression Gates
**Estimated Effort:** Medium
**Dependencies:** TASK-399-01, TASK-399-02, TASK-399-03
**Status:** To Do

---

## Overview

Add an explicit build measurement and regression guard so route-level code
splitting cannot silently collapse back into one large admin chunk.

This task must measure the real output after the lazy-route migration. It should
not set a fake budget before implementation and should not merely raise Vite's
warning limit.

## Source Findings

- Baseline admin build on 2026-06-04:
  - `dist/client/assets/index-*.js`: `4,369.13 kB` raw / `1,036.45 kB` gzip.
  - one JavaScript chunk.
- Vite 8 uses `build.rolldownOptions`; `build.rollupOptions` is a deprecated
  compatibility alias.
- `build.chunkSizeWarningLimit` is a warning threshold, not a splitting
  mechanism.
- Vite/Rolldown split route chunks when the graph has dynamic `import()`
  boundaries.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `scripts/check-admin-bundle.ts` or `core/scripts/check-admin-bundle.ts` | New bundle report and budget guard script. |
| `package.json` or `core/package.json` | Add script entry if needed for the guard. |
| `tests/vitest/admin/adminBundleReport.test.ts` | Pure tests for bundle report parsing/budget decisions if the script has reusable logic. |
| `_docs/ARCHITECTURE.md` | Document admin route-level code splitting and the budget meaning. |
| `tests/README.md` | Document the bundle guard only if it becomes a regular validation command. |
| `_docs/CODERSO_RELEASE_GATES.md` | Update only if the guard is added to `gates:coderso`. |

## Implementation Pseudocode

```ts
type AdminBundleAsset = {
  file: string;
  rawBytes: number;
  gzipBytes: number;
  isEntry: boolean;
};

type AdminBundleReport = {
  jsChunkCount: number;
  entryJsGzipBytes: number;
  largestJsChunkBytes: number;
  totalJsGzipBytes: number;
};

function readAdminBundle(distDir = "core/dist/client"): AdminBundleReport {
  const assets = readAssets(distDir);
  const jsAssets = assets.filter((asset) => asset.file.endsWith(".js"));
  const entry = resolveEntryChunk(jsAssets);
  return {
    jsChunkCount: jsAssets.length,
    entryJsGzipBytes: gzipSize(entry),
    largestJsChunkBytes: Math.max(...jsAssets.map((asset) => asset.rawBytes)),
    totalJsGzipBytes: sum(jsAssets.map(gzipSize)),
  };
}

function assertAdminBundleBudget(report: AdminBundleReport) {
  if (report.jsChunkCount < 2) throw new Error("admin_bundle_not_split");
  if (report.entryJsGzipBytes > ADMIN_ENTRY_GZIP_BUDGET_BYTES) {
    throw new Error("admin_entry_chunk_over_budget");
  }
}
```

Budget-setting flow:

```text
run clean admin Vite build after TASK-399-03
read bundle report
record before/after table in TASK-399 docs
set entry gzip budget to measured after-value + small maintenance margin
assert chunk count > 1 and entry gzip <= budget
do not assert total JS is lower unless measured output proves it
```

Data flow:

- Vite build writes `core/dist/client`.
- Bundle script reads actual generated assets.
- Script prints a compact table for local/CI logs.
- Guard fails only on regressions that contradict the TASK-399 contract.

Error handling:

- Missing `dist/client` reports a clear "run admin build first" error.
- Missing JS assets fails clearly.
- If Vite output naming changes, entry resolution must fail loudly instead of
  treating the largest chunk as success.

## Security Contract

- Endpoint visibility: no endpoints.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: script accepts only local file paths/options.
- Anti-abuse: no public write path.
- Secret handling: bundle report must not print environment variables, source
  maps with inline source, `.env` values, cookies, tokens, or local absolute
  secret paths.

## Testing Requirements

- `bun x vite build --config vite.config.ts` from `core/`
- bundle guard script
- Pure Vitest tests if report parsing is factored into importable helpers.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `tests/README.md` if this becomes a regular validation command
- `_docs/CODERSO_RELEASE_GATES.md` if promoted into release gates
- `_docs/_TASKS/README.md` on status changes
- Changelog entry when this leaf is closed, either standalone or through the
  parent TASK-399 closure changelog.

## Acceptance Criteria

- Guard fails on a one-JS-chunk admin build.
- Guard records the baseline and after metrics in a reproducible format.
- Guard does not hide Vite warnings by changing `chunkSizeWarningLimit`.
- Guard is documented where developers will actually find it.
- Follow-up candidates are recorded for largest remaining route chunk if one
  route still exceeds the warning threshold.
