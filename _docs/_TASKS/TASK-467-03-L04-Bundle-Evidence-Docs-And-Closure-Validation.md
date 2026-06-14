# TASK-467-03-L04: Bundle Evidence Docs And Closure Validation
# FileName: TASK-467-03-L04-Bundle-Evidence-Docs-And-Closure-Validation.md

**Parent Subtask:** TASK-467-03
**Priority:** High
**Category:** Validation / Docs / Bundle Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-467-03-L03
**Status:** ⏳ To Do

---

## Overview

Close the lazy widget editor split with fresh bundle evidence, import-boundary
proof, docs updates, and TASK-467 task-family synchronization.

## Sub-Tasks

- [ ] Regenerate admin build output and bundle report evidence.
- [ ] Prove `registry-*` no longer includes all widget editor code.
- [ ] Run admin boundary, lint, type, and targeted UI test lanes.
- [ ] Update contributor-facing docs if the widget editor contract changed.
- [ ] Update task statuses, changelog, and task board when the whole family is
  ready to close.

## Files To Change

| File | Required change |
|---|---|
| `scripts/adminBundleReport.ts` | Add/report per-dynamic-chunk raw-size budget fields using existing byte-based report naming. |
| `scripts/check-admin-bundle.ts` | Fail the check when TASK-467-owned dynamic raw chunk budget is exceeded. |
| `tests/vitest/admin/adminBundleReport.test.ts` | Assert/report the split registry evidence expected by TASK-467. |
| `_docs/WIDGETS.md` | Update only if contributor-facing editor registration changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack-readiness/editor contract wording changes. |
| `_docs/ARCHITECTURE.md` | Update only if a general lazy admin editor bundle rule is added. |
| `_docs/_TASKS/README.md` | Sync status when closing leaf/parent tasks. |
| `_docs/_CHANGELOG/` | Add TASK-467 family changelog on completion. |

## Implementation Pseudocode

```ts
type BundleEvidence = {
  registryChunkRawBytes: number | null;
  registryChunkGzipBytes: number | null;
  largestDynamicChunkRawBytes: number;
  largestDynamicChunkGzipBytes: number;
  initialStaticJsGzipBytes: number;
  editorChunks: Array<{ file: string; rawBytes: number; gzipBytes: number }>;
};

function collectWidgetRegistryEvidence(report: AdminBundleReport): BundleEvidence {
  const registryChunk = findChunk(report, /^registry-/);
  const editorChunks = findChunks(report, /Editor|Editors|widget/i);
  return {
    registryChunkRawBytes: registryChunk?.rawBytes ?? null,
    registryChunkGzipBytes: registryChunk?.gzipBytes ?? null,
    largestDynamicChunkRawBytes: report.largestDynamicChunkRawBytes,
    largestDynamicChunkGzipBytes: report.largestDynamicChunkGzipBytes,
    initialStaticJsGzipBytes: report.initialStaticJsGzipBytes,
    editorChunks,
  };
}
```

Validation flow:

1. Run `bun --cwd core build:admin`.
2. Run `bun run check:admin-bundle` and capture fresh evidence for:
   `registry-*`, `customScreensClient-*`, initial static graph gzip, and largest
   dynamic chunk raw/gzip.
3. Run targeted Vitest/UI lanes changed by L01-L03.
4. Run `bun run check:admin-boundary`.
5. Run lint/type checks and `git diff --check`.
6. Update docs/changelog/task statuses only after validation evidence exists.

Error handling:

- If any TASK-467-owned dynamic JS chunk remains above the 500 kB raw warning
  threshold, record the exact imported modules and do not close this leaf until
  the owner is split or an explicit follow-up owns the residual warning.
- If a broad suite fails for unrelated pre-existing reasons, isolate with
  targeted lanes and document the unrelated failure in the closeout.
- Do not raise `build.chunkSizeWarningLimit` to pass this task.

Regression-test shape:

```ts
test("registry bundle evidence is fresh and split", () => {
  const report = loadAdminBundleReport();
  const evidence = collectWidgetRegistryEvidence(report);

  expect(evidence.registryChunkRawBytes ?? 0).toBeLessThan(500_000);
  expect(evidence.largestDynamicChunkRawBytes).toBeLessThan(500_000);
  expect(evidence.editorChunks.length).toBeGreaterThan(1);
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
- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetEditorLayoutCss.test.ts tests/vitest/admin/adminBundleReport.test.ts`
- Focused UI tests touched by L03.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit` before a manual commit.

## Documentation Updates Required

- `_docs/WIDGETS.md` or `_docs/WIDGET_PACK_MATRIX.md` when the editor contract
  changes.
- `_docs/ARCHITECTURE.md` if lazy admin editor bundles become a general rule.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when TASK-467 closes.

## Acceptance Criteria

1. Fresh bundle evidence shows the widget editor registry split.
2. Import-boundary tests prove the admin registry does not import `./editors`
   eagerly.
3. Targeted widget/admin UI tests pass.
4. TASK-467 parent and descendants can close only after validation, docs, and
   changelog are synchronized.
