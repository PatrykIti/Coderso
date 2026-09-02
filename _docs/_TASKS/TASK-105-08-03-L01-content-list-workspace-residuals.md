# TASK-105-08-03-L01: Content List and Workspace Residuals
# FileName: TASK-105-08-03-L01-content-list-workspace-residuals.md

**Parent Subtask:** TASK-105-08-03
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small
**Dependencies:** Fresh TASK-105-08-03 contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Fill the 22 source-proven reachable content-list/workspace residual lines with real admin
interactions. This is test-only. It does not change a route, client, schema, cache policy,
or production source module.

## Exact Single-Writer Scope

**Read-only production targets:**

- core/admin/ui/content-types/CollectionWorkspacePage.tsx
- core/admin/ui/content-types/ContentTypeFieldsPanel.tsx
- core/admin/ui/content-types/ContentTypeList.tsx
- core/admin/ui/content-types/ContentTypeSettingsCard.tsx
- core/admin/ui/content-types/ContentTypeTable.tsx

**Exclusive test writers:**

- tests/vitest/ui/collection-workspace-page.test.tsx
- tests/vitest/ui/content-type-fields-panel.test.tsx
- tests/vitest/ui/content-type-list-flows.test.tsx
- tests/vitest/ui/content-type-list-create-error.test.tsx (new DOM suite)
- tests/vitest/ui/content-type-settings-card.test.tsx

The existing current-worktree drafts must be adopted only after a fresh exact-diff/ownership
check. Do not edit content-type-table.test.tsx (SSR-only),
content-type-list-parity.test.tsx (its drawer mock directly invokes callbacks), a source
module, fixture outside the five writer paths, another task document, changelog, board, or
coverage configuration.

## Source-Line and Behavior Map

| Source lines | Test writer | Real interaction and assertion |
|---|---|---|
| CollectionWorkspacePage.tsx:379 | collection-workspace-page | Emit a remote cache event, click the alert's actual Refresh control, and assert refresh runs and pending feedback clears. |
| :439 | same | Switch to Templates, click Create detail template, and assert the actual create/navigation outcome. |
| :459 | same | Open delete confirmation, dismiss through its real open-change path, and assert it closes without delete. |
| ContentTypeFieldsPanel.tsx:75,76 | content-type-fields-panel | Dispatch a cancelable dragover; assert default is prevented and DataTransfer.dropEffect is move. |
| ContentTypeList.tsx:88 | content-type-list-flows | Select all visible rows, make every draft update fail, and assert exact bulk-failure feedback. |
| :261 | same | Initial load succeeds; cache-triggered force reload rejects; assert existing rows remain. |
| :276,277 | same | In table view click a different sortable header; assert the changed sort label/order. |
| :305,306,499; ContentTypeTable.tsx:177 | same | Row actions → Delete → confirm with client failure; assert destructive feedback. |
| ContentTypeList.tsx:358,361 | same | Let a bulk action succeed but reject its follow-up list read; assert Bulk action failed. |
| :449 | same | Toggle table → grid and assert pressed state plus grid/table visible effect. |
| :479 | same | Begin empty, click New type, and assert the create drawer appears. |
| :629 | content-type-list-create-error | Let the initial forced `listContentTypesCached({ force: true })` read resolve `[]`, then open the real drawer through the visible New-type action, enter a valid Name, click its actual Create Collection control while the `createContentType` client seam rejects, and assert the visible error toast. |
| ContentTypeTable.tsx:91,126,172 | content-type-list-flows | Header select-all and row checkbox change selected state; duplicate action invokes the real navigation/client seam. |
| ContentTypeSettingsCard.tsx:130 | content-type-settings-card | Edit plural name and assert emitted settings include pluralName. |

`content-type-list-create-error.test.tsx` must leave `ContentTypeCreateDrawer` real: the
current parity suite replaces it with a mock whose test-only button calls `onCreateError`
directly, so that suite is read-only and cannot prove line 629. The new suite's first physical
line must be `// @vitest-environment happy-dom`. It owns a test-local React root, renders the
list with a real `sonner` Toaster, and uses exactly two bounded data-client seams: the initial
`listContentTypesCached({ force: true })` read resolves `[]`, and `createContentType` rejects
on the actual submit. The list-read seam is required because the mount effect at
`ContentTypeList.tsx:232-250` otherwise reaches the Vitest network guard and can return
`undefined`, which then breaks `types.forEach`; it is not a replacement for the real drawer or
error path. The suite cleans up the root/container in `afterEach` and must never invoke
`onCreateError`, `onCreated`, or another component callback directly.

## Implementation Pseudocode

~~~tsx
renderSubjectWithRealClientMocks();

await user.click(screen.getByRole("button", { name: /grid view/i }));
expect(screen.getByRole("button", { name: /grid view/i })).toHaveAttribute(
  "aria-pressed",
  "true"
);

mockListContentTypesRejectedOnNextCacheRefresh();
emitCacheEvent();
expect(screen.getByText(existingTypeName)).toBeVisible();

// The focused new DOM suite uses the real drawer and user events for line 629.
listContentTypesCached.mockResolvedValue([]);
renderSubjectWithRealClientMocks();
await screen.findByRole("heading", { name: "No content types yet" });
expect(listContentTypesCached).toHaveBeenCalledWith({ force: true });
await user.click(screen.getByRole("button", { name: /new/i }));
await user.type(screen.getByPlaceholderText("Blog Post"), "News Article");
createContentType.mockRejectedValueOnce(new ApiClientError(/* source-shaped error */));
await user.click(screen.getByRole("button", { name: "Create Collection" }));
expect(await screen.findByText(/* resolved visible error toast */)).toBeVisible();
~~~

Use existing fixture/harness patterns, accessible controls, and actual cache events. For
errors, retain the source's existing ApiClientError/opaque-error message path. Never invoke
a component callback directly just to hit an arrow expression, and never assert only that a
mock was called when the UI provides a visible result.

## Testing Requirements

Run each owned suite independently:

~~~bash
for test_path in   tests/vitest/ui/collection-workspace-page.test.tsx   tests/vitest/ui/content-type-fields-panel.test.tsx   tests/vitest/ui/content-type-list-flows.test.tsx   tests/vitest/ui/content-type-list-create-error.test.tsx   tests/vitest/ui/content-type-settings-card.test.tsx
do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Then generate the task-scoped V8 receipt below. Do **not** run `bun run test:coverage`:
that wrapper clears `coverage/vitest`. This direct command clears and writes only
`coverage/task-105-08-03-l01`, emits `json-summary` to identify the five target rows, and
emits `lcov` for the required source-line proof. Its parser rejects a missing target, a
missing line receipt, or a zero-hit mapped line; aggregate percentages alone are not proof.

~~~bash
coverage_dir="coverage/task-105-08-03-l01"
rm -rf -- "$coverage_dir"
mkdir -p -- "$coverage_dir"
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage \
  --coverage.provider=v8 \
  --coverage.reporter=json-summary \
  --coverage.reporter=lcov \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/content-types/CollectionWorkspacePage.tsx \
  --coverage.include=core/admin/ui/content-types/ContentTypeFieldsPanel.tsx \
  --coverage.include=core/admin/ui/content-types/ContentTypeList.tsx \
  --coverage.include=core/admin/ui/content-types/ContentTypeSettingsCard.tsx \
  --coverage.include=core/admin/ui/content-types/ContentTypeTable.tsx \
  tests/vitest/ui/collection-workspace-page.test.tsx \
  tests/vitest/ui/content-type-fields-panel.test.tsx \
  tests/vitest/ui/content-type-list-flows.test.tsx \
  tests/vitest/ui/content-type-list-create-error.test.tsx \
  tests/vitest/ui/content-type-settings-card.test.tsx

node - "$coverage_dir/coverage-summary.json" "$coverage_dir/lcov.info" <<'NODE'
const fs = require("node:fs");

const [summaryPath, lcovPath] = process.argv.slice(2);
const required = {
  "core/admin/ui/content-types/CollectionWorkspacePage.tsx": [379, 439, 459],
  "core/admin/ui/content-types/ContentTypeFieldsPanel.tsx": [75, 76],
  "core/admin/ui/content-types/ContentTypeList.tsx": [88, 261, 276, 277, 305, 306, 358, 361, 449, 479, 499, 629],
  "core/admin/ui/content-types/ContentTypeSettingsCard.tsx": [130],
  "core/admin/ui/content-types/ContentTypeTable.tsx": [91, 126, 172, 177],
};
const normalizePath = (value) => value.replaceAll("\\", "/");
const matchesTarget = (value, target) => {
  const normalized = normalizePath(value);
  return normalized === target || normalized.endsWith(`/${target}`);
};
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const summaryRow = (target) => {
  const entry = Object.entries(summary).find(([file]) => matchesTarget(file, target));
  if (!entry) throw new Error(`json-summary is missing ${target}`);
  return entry[1];
};

const records = [];
let current = null;
for (const row of fs.readFileSync(lcovPath, "utf8").split(/\r?\n/)) {
  if (row.startsWith("SF:")) {
    current = { file: row.slice(3), hitsByLine: new Map() };
  } else if (current && row.startsWith("DA:")) {
    const match = /^DA:(\d+),(\d+)/.exec(row);
    if (match) current.hitsByLine.set(Number(match[1]), Number(match[2]));
  } else if (row === "end_of_record" && current) {
    records.push(current);
    current = null;
  }
}
const lcovRow = (target) => {
  const entry = records.find(({ file }) => matchesTarget(file, target));
  if (!entry) throw new Error(`lcov is missing ${target}`);
  return entry;
};

const failures = [];
for (const [target, lines] of Object.entries(required)) {
  const totals = summaryRow(target).lines;
  const receipt = lcovRow(target);
  const lineReceipt = lines.map((line) => {
    const hits = receipt.hitsByLine.get(line);
    if (!Number.isInteger(hits) || hits < 1) failures.push(`${target}:${line}=${hits ?? "missing"}`);
    return `${line}=${hits ?? "missing"}`;
  });
  console.log(`${target}: ${totals.covered}/${totals.total} lines; ${lineReceipt.join(", ")}`);
}
if (failures.length > 0) {
  throw new Error(`Required V8 line receipts failed: ${failures.join(", ")}`);
}
NODE
~~~

Finally run:

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

## 1000-Line Rule

Current writer counts are collection-workspace-page 571, content-type-fields-panel 186,
content-type-list-flows 636, and content-type-settings-card 156. The new create-error DOM
suite must be planned below 250 lines and every changed suite must remain below 1,000 lines.
The 580-line content-type-list-parity suite remains read-only; split by behavior before adding
a broad helper or unrelated flow.

## Security Contract

Non-API test work. Existing internal admin session/RBAC/CSRF, strict client payload
validation, cache invalidation, and rate-limit behavior remain unchanged. Mocks must not
introduce a public route, privileged browser cache value, or authority bypass.

## Sub-Tasks

None.

## Documentation Updates Required

Return the exact changed test paths, V8 rows, targeted-test receipts, static receipts, and
line counts to the parent. The closure writer alone updates task status, L12, board,
changelog, staging, and commits.

## Acceptance Criteria

1. All 22 mapped lines are covered by behavior-meaningful tests.
2. The test suite shows a visible state, event result, payload, or no-side-effect assertion
   for every branch; no synthetic callback-only test is added.
3. All named validation gates and line-count checks pass.

## Closure (2026-09-02)

Closed on tree evidence. Delivered suites (commit 85b4c725 "test(task-105): close 08-03 content types and entries residuals"): tests/vitest/ui/collection-workspace-page.test.tsx (653 lines), content-type-fields-panel.test.tsx, content-type-list-flows.test.tsx, content-type-list-create-error.test.tsx (219), content-type-settings-card.test.tsx — every writer at or under 1,000 lines.
Focused V8 re-verified 2026-09-02 on this tree: all 22 mapped rows (CollectionWorkspacePage 379/439/459, ContentTypeFieldsPanel 75-76, ContentTypeList 88-629, ContentTypeSettingsCard 130, ContentTypeTable 91-177) report hits >= 1 across 56 passing tests.
Residual disposition: the 08-03 cluster holds 6 files / 14 attributed uncovered lines in TASK-105-08-12 (Exact residual ledger, 2026-09-01); DetailTemplateInspector 321/322/328 stay documented unreachable, not claimed covered.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines (39427/39718), 291 uncovered across 87 files, canonical run 1186 files / 10444 tests / 0 failures.
