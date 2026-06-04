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
| `scripts/check-admin-bundle.ts` | Root bundle report and budget guard script that writes `.tmp/admin-bundle-report.json`. |
| `core/package.json` | Add `build:admin` as the canonical admin Vite build command. |
| `package.json` | Add `check:admin-bundle` for the root guard command. |
| `.github/workflows/coderso-pr-gates.yml` or equivalent PR gate workflow | Add an `admin-bundle-gate` job that runs the admin build and guard. |
| `tests/vitest/admin/adminBundleReport.test.ts` | Pure tests for bundle report parsing/budget decisions if the script has reusable logic. |
| `_docs/ARCHITECTURE.md` | Document admin route-level code splitting and the budget meaning. |
| `tests/README.md` | Document the bundle guard as a regular validation command. |
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
  viteVersion: string;
  rolldownVersion: string;
  jsChunkCount: number;
  initialJsRawBytes: number;
  initialJsGzipBytes: number;
  allJsChunkCount: number;
  dynamicRouteChunkCount: number;
  largestInitialChunkRawBytes: number;
  largestInitialChunkGzipBytes: number;
  largestLazyRouteChunkRawBytes: number;
  largestLazyRouteChunkGzipBytes: number;
  totalJsGzipBytes: number;
  cssRawBytes: number;
  cssGzipBytes: number;
  budget: {
    initialJsGzipBytes: number;
  };
};

function readAdminBundle(distDir = "core/dist/client"): AdminBundleReport {
  const html = readFile(join(distDir, "index.html"));
  const assets = readAssets(distDir);
  const jsAssets = assets.filter((asset) => asset.file.endsWith(".js"));
  const entryFiles = resolveEntryScriptsFromHtml(html);
  const entryAssets = jsAssets.filter((asset) => entryFiles.has(asset.file));
  if (entryAssets.length === 0) throw new Error("admin_bundle_entry_missing");
  return {
    viteVersion: readPackageVersion("vite"),
    rolldownVersion: readPackageVersion("rolldown"),
    jsChunkCount: jsAssets.length,
    initialJsRawBytes: sum(entryAssets.map((asset) => asset.rawBytes)),
    initialJsGzipBytes: sum(entryAssets.map((asset) => gzipSize(asset))),
    allJsChunkCount: jsAssets.length,
    dynamicRouteChunkCount: jsAssets.length - entryAssets.length,
    largestInitialChunkRawBytes: Math.max(...entryAssets.map((asset) => asset.rawBytes)),
    largestInitialChunkGzipBytes: Math.max(...entryAssets.map((asset) => gzipSize(asset))),
    largestLazyRouteChunkRawBytes: maxLazyRaw(jsAssets, entryFiles),
    largestLazyRouteChunkGzipBytes: maxLazyGzip(jsAssets, entryFiles),
    totalJsGzipBytes: sum(jsAssets.map(gzipSize)),
    cssRawBytes: totalCssRaw(assets),
    cssGzipBytes: totalCssGzip(assets),
    budget: readBudgetConfig(),
  };
}

function assertAdminBundleBudget(report: AdminBundleReport) {
  if (report.jsChunkCount < 2) throw new Error("admin_bundle_not_split");
  if (report.initialJsGzipBytes > ADMIN_ENTRY_GZIP_BUDGET_BYTES) {
    throw new Error("admin_entry_chunk_over_budget");
  }
}
```

Budget-setting flow:

```text
run clean admin Vite build after TASK-399-03
read bundle report
record before/after table in TASK-399 docs and `.tmp/admin-bundle-report.json`
set entry gzip budget to measured after-value + small maintenance margin
assert chunk count > 1 and entry gzip <= budget
do not assert total JS is lower unless measured output proves it
```

Data flow:

- Vite build writes `core/dist/client`.
- Bundle script reads actual generated assets and resolves initial entry scripts
  from `core/dist/client/index.html`.
- Script prints a compact table for local/CI logs.
- Script writes `.tmp/admin-bundle-report.json` for PR artifacts and changelog
  evidence.
- Guard fails only on regressions that contradict the TASK-399 contract.

Error handling:

- Missing `dist/client` reports a clear "run admin build first" error.
- Missing JS assets fails clearly.
- If Vite output naming changes, entry resolution must fail loudly instead of
  treating the largest chunk as success.
- The guard must not infer entry chunks by file size or filename prefix alone.

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

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- Pure Vitest tests if report parsing is factored into importable helpers.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types` for root script type coverage.
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `tests/README.md`
- `_docs/CODERSO_RELEASE_GATES.md` if promoted into release gates
- `_docs/_TASKS/README.md` on status changes
- Changelog entry when this leaf is closed, either standalone or through the
  parent TASK-399 closure changelog.

## Acceptance Criteria

- Guard fails on a one-JS-chunk admin build.
- Guard records the baseline and after metrics in a reproducible format.
- Guard does not hide Vite warnings by changing `chunkSizeWarningLimit`.
- Guard is documented where developers will actually find it.
- PR gate runs the admin build and bundle guard, and uploads or preserves the
  `.tmp/admin-bundle-report.json` evidence.
- Follow-up candidates are recorded for largest remaining route chunk if one
  route still exceeds the warning threshold.
