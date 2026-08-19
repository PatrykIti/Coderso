# TASK-467-03-L04: Bundle Evidence Docs And Closure Validation
# FileName: TASK-467-03-L04-Bundle-Evidence-Docs-And-Closure-Validation.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Validation / Docs / Bundle Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-467-03-L03
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1308 (pinned; closure only)

---

## Overview

Close the lazy widget editor split with fresh bundle evidence, import-boundary
proof, docs updates, and TASK-467 task-family synchronization.

Pre-implementation note: at the time of authoring,
`scripts/check-admin-bundle.ts` and `scripts/adminBundleReport.ts` did not yet
enforce the TASK-467 dynamic raw budget or registry-barrel graph evidence; this
leaf owned adding those guards, and TASK-467 could not close until they were
implemented and validated. Implemented and validated in the L04 commit
(`28beb817`), including the documented lazy node-import exemption
(`TASK-467-03-L04-L01`).

## Sub-Tasks

- [x] Regenerate admin build output and bundle report evidence.
- [x] Prove `registry-*` no longer includes all widget editor code.
- [x] Run admin boundary, lint, type, and targeted UI test lanes.
- [x] Update contributor-facing docs if the widget editor contract changed.
- [x] Update task statuses, changelog, and task board when the whole family is
  ready to close.

## Files To Change

| File | Required change |
|---|---|
| `scripts/adminBundleReport.ts` | Add TASK-467 dynamic raw-size budget constants/helpers and reuse existing byte-based report fields such as `largestDynamicChunkRawBytes`, per-asset `rawBytes`, and `gzipBytes`. |
| `scripts/check-admin-bundle.ts` | Fail the check when any dynamic raw JS chunk is at or above 500 kB unless a non-TASK-467 owner is explicitly documented with a follow-up. |
| `tests/vitest/admin/adminBundleReport.test.ts` | Assert/report the split registry evidence expected by TASK-467. |
| `tests/README.md` | Document any new `check:admin-bundle` dynamic raw TASK-467-owned chunk budget semantics. |
| `_docs/WIDGETS.md` | Update only if contributor-facing editor registration changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack-readiness/editor contract wording changes. |
| `_docs/ARCHITECTURE.md` | Update only if a general lazy admin editor bundle rule is added. |
| `_docs/_TASKS/README.md` | Sync status when closing leaf/parent tasks. |
| `_docs/_CHANGELOG/` | Add TASK-467 family changelog on completion. |

## Implementation Pseudocode

```ts
type BundleEvidence = {
  registryChunkFile: string | null;
  registryChunkRawBytes: number | null;
  registryChunkGzipBytes: number | null;
  largestDynamicChunkRawBytes: number;
  largestDynamicChunkGzipBytes: number;
  initialStaticJsGzipBytes: number;
  task467OwnedChunks: Array<{ file: string; rawBytes: number; gzipBytes: number }>;
  widgetEditorChunks: Array<{ file: string; rawBytes: number; gzipBytes: number }>;
  dynamicOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  task467OwnedOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  invalidDynamicBudgetAllowlistChunks: Array<{ file: string; followUp: string }>;
  unresolvedDynamicOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  registryEditorBarrelViolations: AdminBoundaryViolation[];
  registryImportsEditorBarrel: boolean;
};

const TASK467_DYNAMIC_RAW_WARNING_BYTES = 500_000;
const documentedNonTask467DynamicBudgetFollowUps = new Map<string, string>();

function findChunk(report: AdminBundleReport, pattern: RegExp): AdminBundleAsset | null {
  return report.assets.find((asset) => pattern.test(asset.file)) ?? null;
}

function registrySourceImportsEditorBarrel(
  source = readFile("core/admin/ui/widgets/registry.ts")
): boolean {
  return (
    /from\s+["']\.\/editors(?:\/index)?["']/.test(source) ||
    /import\s*\(\s*["']\.\/editors(?:\/index)?["']\s*\)/.test(source)
  );
}

function collectRegistryEditorBarrelViolations(): AdminBoundaryViolation[] {
  return analyzeAdminBoundary({
    entrypoints: ["core/admin/ui/widgets/registry.ts"],
    forbiddenPathRules: [
      {
        label: "widget editor barrel",
        path: "core/admin/ui/widgets/editors/index.ts",
        exact: true,
      },
    ],
  }).violations;
}

function readWidgetEditorChunkModuleNames(
  source = readFile("core/admin/ui/widgets/registry.ts")
): string[] {
  const modules = [...source.matchAll(/import\s*\(\s*["']\.\/editors\/([^"']+)["']\s*\)/g)]
    .map((match) => match[1])
    .filter((moduleName) => moduleName !== "index");
  return [...new Set(modules)].sort();
}

function matchesChunkStem(assetFile: string, stem: string): boolean {
  const basename = assetFile.split("/").at(-1) ?? assetFile;
  return basename.startsWith(`${stem}-`);
}

function findTask467OwnedChunks(
  report: AdminBundleReport,
  widgetEditorModuleNames: string[]
): AdminBundleAsset[] {
  return report.assets.filter((asset) => {
    if (asset.isInitialStatic) return false;
    return (
      matchesChunkStem(asset.file, "registry") ||
      matchesChunkStem(asset.file, "customScreensClient") ||
      matchesChunkStem(asset.file, "customScreensEditorClient") ||
      widgetEditorModuleNames.some((moduleName) => matchesChunkStem(asset.file, moduleName))
    );
  });
}

function isTask467OwnedOrEditorSharedChunk(assetFile: string, widgetEditorModuleNames: string[]) {
  const basename = assetFile.split("/").at(-1) ?? assetFile;
  return (
    matchesChunkStem(assetFile, "registry") ||
    matchesChunkStem(assetFile, "customScreensClient") ||
    matchesChunkStem(assetFile, "customScreensEditorClient") ||
    widgetEditorModuleNames.some((moduleName) => matchesChunkStem(assetFile, moduleName)) ||
    /(?:WidgetEditor|EditorShared|EditorControls|EditorsShared)/.test(basename)
  );
}

function findDynamicOverBudgetChunks(report: AdminBundleReport): Array<{ file: string; rawBytes: number }> {
  return report.assets
    .filter((asset) => !asset.isInitialStatic)
    .filter((asset) => asset.rawBytes >= TASK467_DYNAMIC_RAW_WARNING_BYTES)
    .map((asset) => ({ file: asset.file, rawBytes: asset.rawBytes }));
}

function collectWidgetRegistryEvidence(report: AdminBundleReport): BundleEvidence {
  const registryChunk = findChunk(report, /(^|\/)registry-/);
  const registryEditorBarrelViolations = collectRegistryEditorBarrelViolations();
  const widgetEditorModuleNames = readWidgetEditorChunkModuleNames();
  const task467OwnedChunks = findTask467OwnedChunks(report, widgetEditorModuleNames);
  const widgetEditorChunks = task467OwnedChunks.filter((asset) =>
    widgetEditorModuleNames.some((moduleName) => matchesChunkStem(asset.file, moduleName))
  );
  const dynamicOverBudgetChunks = findDynamicOverBudgetChunks(report);
  const task467OwnedOverBudgetChunks = task467OwnedChunks
    .filter((asset) => asset.rawBytes >= TASK467_DYNAMIC_RAW_WARNING_BYTES)
    .map((asset) => ({ file: asset.file, rawBytes: asset.rawBytes }));
  const invalidDynamicBudgetAllowlistChunks = [...documentedNonTask467DynamicBudgetFollowUps]
    .filter(([file]) => isTask467OwnedOrEditorSharedChunk(file, widgetEditorModuleNames))
    .map(([file, followUp]) => ({ file, followUp }));
  const unresolvedDynamicOverBudgetChunks = dynamicOverBudgetChunks.filter(
    (asset) => !documentedNonTask467DynamicBudgetFollowUps.has(asset.file)
  );
  return {
    registryChunkFile: registryChunk?.file ?? null,
    registryChunkRawBytes: registryChunk?.rawBytes ?? null,
    registryChunkGzipBytes: registryChunk?.gzipBytes ?? null,
    largestDynamicChunkRawBytes: report.largestDynamicChunkRawBytes,
    largestDynamicChunkGzipBytes: report.largestDynamicChunkGzipBytes,
    initialStaticJsGzipBytes: report.initialStaticJsGzipBytes,
    task467OwnedChunks,
    widgetEditorChunks,
    dynamicOverBudgetChunks,
    task467OwnedOverBudgetChunks,
    invalidDynamicBudgetAllowlistChunks,
    unresolvedDynamicOverBudgetChunks,
    registryEditorBarrelViolations,
    registryImportsEditorBarrel:
      registrySourceImportsEditorBarrel() || registryEditorBarrelViolations.length > 0,
  };
}
```

`findChunk`, `findTask467OwnedChunks`, `findDynamicOverBudgetChunks`,
`isTask467OwnedOrEditorSharedChunk`,
`collectRegistryEditorBarrelViolations`, `loadAdminBundleReport`,
`registrySourceImportsEditorBarrel`, and `readWidgetEditorChunkModuleNames` are
new test/report helpers for this leaf.
Match chunk names against the normalized report `asset.file` path or its
basename; report paths currently include `assets/` prefixes. The TASK-467-owned
dynamic budget includes `registry-*`, `customScreensClient-*`,
`customScreensEditorClient-*`, and concrete lazy editor module chunks derived
from the registry loader map. Do not use broad `Editor|Editors|widget` evidence
for split success, because unrelated admin editor pages can match that pattern.
A standalone `registry-*` asset is useful evidence when Vite emits one, but its
absence is allowed when the registry source does not import the barrel and every
TASK-467-owned dynamic chunk is under budget.
Pre-implementation audit note (verified against current dist at HEAD 239bab33):
no `registry-*` chunk exists today and no `customScreensEditorClient-*` chunk is
emitted yet (current custom-screens chunks are `customScreensClient-BPa_2BHt.js`
and `CustomScreenEditorPage-Bk9mgI_Z.js`). The helper must therefore treat
`registry-*`, `customScreensClient-*`, `customScreensEditorClient-*`, and the
lazy editor module stems as OPTIONAL matches: present stems are evidence, absent
stems are allowed when the barrel guard passes and no TASK-467-owned chunk is
over budget. After L02 lands, the lazy editor modules (e.g. `HeroEditors-*.js`)
are the primary split evidence; `widgetEditorChunks.length > 1` must hold from
the loader-map-derived stems.

The raw dynamic budget check must also be fail-closed for shared chunks: every
dynamic JS chunk at or above 500 kB raw fails by default. If implementation
discovers an over-budget dynamic chunk outside TASK-467 ownership, it must add a
specific follow-up task and record the exact chunk filename plus follow-up ID in
`documentedNonTask467DynamicBudgetFollowUps`; TASK-467-owned chunks and shared
widget-editor chunks such as `WidgetEditorControls-*` or
`CommerceWidgetEditorShared-*` must not be allowlisted by this family.

The registry barrel guard must use both source checks and an import-graph check
from `core/admin/ui/widgets/registry.ts` to
`core/admin/ui/widgets/editors/index.ts`. This catches direct relative imports,
alias imports such as `@/ui/widgets/editors`, and one-hop wrapper modules that
re-export or import the barrel.

`loadAdminBundleReport` must recompute the report from the current
`core/dist/client` output through `readAdminBundleReport` after
`bun --cwd core build:admin`; it must not read stale
`.tmp/admin-bundle-report.json` as the assertion source. Missing dist output is
a fail-closed validation error.

Validation/data flow:

1. Run `bun --cwd core build:admin`.
2. Run `bun run check:admin-bundle` and capture fresh evidence for:
   optional `registry-*`, `customScreensClient-*`,
   `customScreensEditorClient-*`, concrete lazy editor chunks, initial static
   graph gzip, and largest dynamic chunk raw/gzip.
3. Run targeted Vitest/UI lanes changed by L01-L03.
4. Run `bun run gates:coderso:perf`.
5. Run `bun run check:admin-boundary`.
6. Run lint/type checks and `git diff --check`.
7. Run `bun run gates:coderso` before closure.
8. Record committed before/after bundle numbers in the TASK-467 changelog or
   closeout notes. `.tmp/admin-bundle-report.json` is only the generated source
   report, not the final evidence artifact.
   If existing baseline constants are kept for historical comparison, refresh or
   explain them in the closeout; do not treat a stale baseline constant as the
   TASK-467 budget result.
9. Update docs/changelog/task statuses only after validation evidence exists.

Error handling:

- If any TASK-467-owned or shared widget-editor dynamic JS chunk remains above
  the 500 kB raw warning threshold, record the exact imported modules and do not
  close this leaf until the owner is split under TASK-467. Follow-ups are allowed
  only for over-budget chunks with documented non-TASK-467 ownership.
- If a broad suite fails for unrelated pre-existing reasons, isolate with
  targeted lanes and document the unrelated failure in the closeout.
- Do not raise `build.chunkSizeWarningLimit` to pass this task.
- Pre-existing `bun run check:admin-boundary` failure (post-closure audit of
  TASK-9999/TASK-478, blossom 2026-08-18, MEDIUM): verified real at HEAD and
  untracked in any task/changelog. Chain:
  `core/services/assistant/actionPlanSchema.ts:20` ->
  `core/services/forms/formActionsContract.ts:1` ->
  `core/services/network/outboundHttpPolicy.ts:304,306` -> `node:dns/promises`,
  yielding 2 `admin_boundary_forbidden_import` (Node builtin) violations from
  `scripts/adminBoundaryReport.ts:153` (`dynamicImportPattern` matches both the
  type-only `typeof import(...)` at :304 and the guarded lazy `await import`
  at :306). The :304 violation is a type-only query (zero runtime bytes; likely
  an analyzer false positive), and :306 is the documented TASK-567 lazy DNS
  resolver that runs only in the server delivery transport (module header
  `outboundHttpPolicy.ts:8-10` claims browser-bundle safety).
  Disposition: this is NOT TASK-9999-eligible (a failing validation gate is a
  test/validation-integrity impact, excluded by the zero-contract-impact
  policy) and NOT owned by TASK-467-03 (L04 owns `adminBundleReport.ts` /
  `check-admin-bundle.ts`, not `adminBoundaryReport.ts`). TASK-467 cannot close
  while this gate fails: L04 MUST, at closure, either (a) fix the analyzer
  false positive for type-only `typeof import(...)` and re-run the gate, or
  (b) split an explicit execution-ready follow-up task with a concrete owner
  that fixes both the type-only false positive and verifies the :306 lazy
  import never reaches the browser bundle, and record the follow-up ID plus the
  verified evidence in the closeout and TASK-467 changelog 1308. Do not treat
  this as a soft-deferred LOW.

Regression-test shape:

```ts
test("registry bundle evidence is fresh and split", () => {
  const report = loadAdminBundleReport();
  const evidence = collectWidgetRegistryEvidence(report);

  expect(evidence.registryImportsEditorBarrel).toBe(false);
  expect(evidence.registryEditorBarrelViolations).toEqual([]);
  if (evidence.registryChunkRawBytes !== null) {
    expect(evidence.registryChunkRawBytes).toBeLessThan(500_000);
  }
  expect(evidence.task467OwnedOverBudgetChunks).toEqual([]);
  expect(evidence.invalidDynamicBudgetAllowlistChunks).toEqual([]);
  expect(evidence.unresolvedDynamicOverBudgetChunks).toEqual([]);
  expect(evidence.widgetEditorChunks.length).toBeGreaterThan(1);
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** bundle evidence and reports must not include `.env`,
  cookies, tokens, provider keys, storage credentials, raw private payloads, or
  user record contents.

## Testing Requirements

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun run gates:coderso:perf`
- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetEditorLayoutCss.test.ts tests/vitest/admin/adminBundleReport.test.ts`
- Focused UI tests touched by L03.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run gates:coderso`
- `bun run precommit` before a manual commit.

## Documentation Updates Required

- `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` when the editor contract
  changes.
- `_docs/ARCHITECTURE.md` if lazy admin editor bundles become a general rule.
- `tests/README.md` if `check:admin-bundle` reports or enforces new dynamic raw
  TASK-467-owned chunk budgets.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when TASK-467 closes.

## Acceptance Criteria

1. Fresh bundle evidence shows the widget editor registry split.
2. Import-boundary tests prove the admin registry does not import `./editors`
   eagerly.
3. Targeted widget/admin UI tests pass.
4. TASK-467 parent and descendants can close only after validation, docs, and
   changelog are synchronized.
