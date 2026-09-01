# TASK-105-08-05-L02-L01: Dashboard Unreachable-Branch Repair
# FileName: TASK-105-08-05-L02-L01-dashboard-exhaustive-default-repair.md

**Parent Subtask:** TASK-105-08-05-L02
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-05-L01 validated receipt; fresh L02-L01 contract audit
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

The pre-L02 scoped V8 diagnostic and source review establish that three emitted paths cannot be
reached through any valid public dashboard state:

- `DashboardBuilder.tsx:174` returns the current state from the `default` arm of a
  complete private `BuilderAction` discriminated union.
- `widgetRegistry.ts:83-85` declares a `never` fallback after handling every
  `DashboardWidgetData` variant.
- `DashboardBuilder.tsx:257-264` renders an empty permission catalog. The ordered catalog has
  six descriptors with `requiredPermissions: []`; `canRenderWidgetType` uses `every`, so those
  entries remain renderable for every supported `can` predicate, including `can={() => false}`.

This strictly ordered source-repair leaf removes or refactors only those three unreachable
branches and creates one direct public UI test for the real permission-filtered catalog. It
lands after L01's validated original-17-target receipt and before L02 begins its test-only
dashboard reconciliation.

The repair preserves every declared reducer transition, every `isWidgetDataEmpty` result,
the registry's exhaustive type contract, cache hydration/revalidation, dirty-draft
protection, presentational permission filtering, and all existing dashboard API contracts.
It does not create a private reducer/registry test seam or manufacture an invalid union
member merely to execute dead code.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/dashboard/DashboardBuilder.tsx`
- `core/admin/ui/dashboard/widgetRegistry.ts`

**New exclusive public UI test writer:**

- `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx`

**Read-only L02 coverage consumers:**

- `tests/vitest/admin/dashboardWidgetRegistry.test.ts`
- `tests/vitest/admin/dashboardLayoutArrange.test.ts`
- `tests/vitest/ui/dashboard.test.tsx`
- `tests/vitest/ui/dashboard-builder-residuals.test.tsx`
- `tests/vitest/ui/site-health-card.test.tsx`
- `tests/vitest/ui/widget-config-form.test.tsx`
- `tests/vitest/ui-integration/dashboard-builder.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-config-form.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-host-dnd.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`

This leaf may edit no other production, test, fixture, route, service, schema, cache,
coverage configuration, task/changelog, runtime-smoke, manifest, staging, or commit path.
The ten named L02 suites are aggregate-V8 consumers only in this leaf. After a validated
handoff, L02 reads both source modules and this new test as fixed coverage consumers; L02
must not edit any of them. No directory glob grants ownership.

## Implementation Pseudocode

```tsx
// @vitest-environment happy-dom
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "load:start":
      return { ...state, loading: true, error: null };
    // Preserve every existing declared BuilderAction case and its exact state projection.
    case "remote:stale":
      return { ...state, remoteStale: true };
  }
  // No emitted default return: the declared union is exhaustive.
}

export function isWidgetDataEmpty(data: DashboardWidgetData): boolean {
  switch (data.type) {
    // Preserve all nine existing data-kind results.
    case "security-summary":
      return false;
  }
  // No emitted never fallback: the declared union is exhaustive.
}

function AddWidgetCatalog(/* existing props */) {
  const entries = dashboardWidgetCatalog.filter((item) => canRenderWidgetType(item.type, can));
  // No empty branch: entries with requiredPermissions: [] always remain visible.
  return <div className="grid gap-2 md:grid-cols-3">{/* existing entries map */}</div>;
}

vi.mock("@/services/dashboardClient", () => ({
  getDashboardLayoutCached: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
  getDashboardWidgetDataCached: vi.fn(async () => initialData),
  previewDashboardWidgetData: vi.fn(async () => initialData),
  saveDashboardLayout: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
  resetDashboardLayout: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
  subscribeDashboardCache: vi.fn(() => () => undefined),
}));

const initialLayout = { version: 1 as const, widgets: [] };
const initialData = { generatedAt: "2026-08-23T00:00:00.000Z", widgets: [] };
const createdRoots: Array<{ unmount: () => void }> = [];
const createdContainers: HTMLDivElement[] = [];
afterEach(() => {
  React.act(() => {
    while (createdRoots.length > 0) createdRoots.pop()?.unmount();
  });
  while (createdContainers.length > 0) createdContainers.pop()?.remove();
});
const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};
const container = document.createElement("div");
const root = createRoot(container);
createdContainers.push(container);
createdRoots.push(root);
document.body.appendChild(container);
React.act(() => {
  root.render(
    <AdminRouterProvider initialPath="/admin">
      <DashboardBuilder canWrite can={() => false} />
    </AdminRouterProvider>
  );
});
await flush();
const customize = Array.from(container.querySelectorAll("button")).find(
  (button) => button.textContent?.includes("Customize")
);
React.act(() => customize?.click());
await flush();
const catalogCard = (description: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(description)
  ) ?? null;
expect(catalogCard("CMS or traffic totals")).toBeNull();
expect(catalogCard("Media storage usage")).toBeNull();
expect(catalogCard("Storage and security status")).toBeNull();
expect(catalogCard("Entry counts by collection")?.disabled).toBe(false);
expect(catalogCard("Content or traffic trend")?.disabled).toBe(false);
expect(catalogCard("Latest content and media changes")?.disabled).toBe(false);
expect(catalogCard("Admin protection checks")?.disabled).toBe(false);
expect(catalogCard("Common admin shortcuts")?.disabled).toBe(false);
expect(catalogCard("Filtered entry list")?.disabled).toBe(false);
```

**Data flow:** keep the existing valid `BuilderAction` and `DashboardWidgetData` unions
exhaustive at compile time, with every real case retaining its current result. The direct
test mounts the exported `DashboardBuilder` through its normal hydrated public UI using an
explicit valid empty layout/data response, passes the supported presentational
`can={() => false}` predicate, enters Customize, and finds catalog buttons solely by their
unique descriptor descriptions. It asserts that zero-permission cards remain visible and
enabled while the cards requiring `users:read` or `media:read` are absent. The empty layout prevents a
saved widget host title from satisfying a catalog assertion. It uses real client/cache import
seams and never imports `reducer`, `AddWidgetCatalog`, or a private registry helper.

**Error handling:** this repair changes neither request handling nor error extraction.
Do not add a catch/fallback or alter any message. The follow-on L02 test contract owns the
genuine `ApiClientError` and opaque-error matrix for load, preview, save, and reset while
preserving dirty drafts after failures.

**Regression shape:** prove by descriptor-description button queries that a denied permission
hides only the protected widget cards while the zero-permission cards remain actionable.
Preserve existing public tests for each valid reducer action, each `DashboardWidgetData` kind,
cache event behavior, normalization, and dashboard widget rendering. Do not use `as never`, a
casted unknown action/data payload, or a test-only exported reducer to cover the removed code.

## Security Contract

No endpoint or API route is changed. Existing dashboard reads and writes remain internal
admin operations under the current session authentication, RBAC/permission evaluation,
CSRF protections for writes, rate-limit buckets, and schema-first reject-unknown
validation. The `can` predicate stays a presentational defence-in-depth filter; it does
not authorize data access or bypass the server route boundary. There is no public write,
so nonce/signature/HMAC and reCAPTCHA are not applicable. Do not place credentials,
session values, raw user data, or settings payloads in tests or receipts.

## Testing Requirements

Because `vitest.config.ts` defaults to the `node` environment, the direct public suite must
start with the first-line pragma `// @vitest-environment happy-dom` and set
`(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true` at
module setup. Every `createRoot` container and root created by the suite must be registered in
the test's cleanup state before any render or `React.act` call. An `afterEach` must unmount
every created root inside `React.act` and remove every created container. For the six
zero-permission catalog descriptors currently present in
`core/admin/ui/dashboard/widgetRegistry.ts`, the direct public suite must include these exact
description-based enabled-state assertions, each checking the button's `disabled` property
with `toBe(false)` rather than only checking presence:

```tsx
expect(catalogCard("Entry counts by collection")?.disabled).toBe(false);
expect(catalogCard("Content or traffic trend")?.disabled).toBe(false);
expect(catalogCard("Latest content and media changes")?.disabled).toBe(false);
expect(catalogCard("Admin protection checks")?.disabled).toBe(false);
expect(catalogCard("Common admin shortcuts")?.disabled).toBe(false);
expect(catalogCard("Filtered entry list")?.disabled).toBe(false);
```

Keep the three protected absence assertions for `CMS or traffic totals`, `Media storage usage`,
and `Storage and security status`. Keep the public description-based catalog lookup and the
valid empty layout/data response; do not add a test helper, private seam, or private export to
make the branch reachable.

The exact writer set for this leaf is exactly:

- `core/admin/ui/dashboard/DashboardBuilder.tsx`
- `core/admin/ui/dashboard/widgetRegistry.ts`
- `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx`

Before editing and again from the final exact three-path writer set, verify the shared
worktree collision guard. This source-repair leaf fails closed on duplicate, missing, or
unexpected paths and on a claim owned by another exact repair leaf:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L02-L01", [
  "core/admin/ui/dashboard/DashboardBuilder.tsx",
  "core/admin/ui/dashboard/widgetRegistry.ts",
  "tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx",
]);
NODE
```

`--verify` is only the workflow's structural/status gate: it checks declared leaf order,
task existence, canonical H1/FileName/parent metadata, and allowed status syntax. It does
not prove this receipt or advance L02.

Run the owned direct suite independently as the required happy-dom suite, then run the
two-target reproducible V8 receipt. The direct suite is the sole test writer in this leaf;
the ten existing dashboard suites remain read-only coverage consumers.
The ten existing dashboard suites are deliberately read-only inputs to this command; the
new direct suite is the only test writer in this leaf.

```bash
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx

coverage_targets=(
  core/admin/ui/dashboard/DashboardBuilder.tsx
  core/admin/ui/dashboard/widgetRegistry.ts
)
coverage_tests=(
  tests/vitest/admin/dashboardWidgetRegistry.test.ts
  tests/vitest/admin/dashboardLayoutArrange.test.ts
  tests/vitest/ui/dashboard.test.tsx
  tests/vitest/ui/dashboard-builder-residuals.test.tsx
  tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx
  tests/vitest/ui/site-health-card.test.tsx
  tests/vitest/ui/widget-config-form.test.tsx
  tests/vitest/ui-integration/dashboard-builder.test.tsx
  tests/vitest/ui-integration/dashboard-widget-config-form.test.tsx
  tests/vitest/ui-integration/dashboard-widget-host-dnd.test.tsx
  tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx
)

coverage_dir="$(mktemp -d /tmp/task105-08-05-l02-l01-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
coverage_args=(
  --coverage
  --coverage.provider=v8
  --coverage.reporter=json-summary
  "--coverage.reportsDirectory=$coverage_dir"
)
for coverage_target in "${coverage_targets[@]}"; do
  coverage_args+=("--coverage.include=$coverage_target")
done
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  "${coverage_args[@]}" "${coverage_tests[@]}" || exit $?

node - "$coverage_dir/coverage-summary.json" "${coverage_targets[@]}" <<'NODE'
const fs = require("node:fs");
const [summaryPath, ...targets] = process.argv.slice(2);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const keys = Object.keys(summary).filter((key) => key !== "total");
const rows = targets.map((target) => {
  const key = keys.find((candidate) => candidate.endsWith(target));
  return { target, key: key ?? null, lines: key ? summary[key]?.lines?.pct : null };
});
const failures = rows.filter((row) => row.key === null || row.lines !== 100);
console.log(JSON.stringify({ summaryPath, rows }, null, 2));
if (failures.length > 0) process.exit(1);
NODE
```

Then run the exact three-path lint, required core gates, root TypeScript attribution,
diff, and line-cap gates:

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/dashboard/DashboardBuilder.tsx \
  core/admin/ui/dashboard/widgetRegistry.ts \
  tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
wc -l core/admin/ui/dashboard/DashboardBuilder.tsx \
  core/admin/ui/dashboard/widgetRegistry.ts \
  tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx
```

The root TypeScript command may retain diagnostics owned by other active leaves, but it
must produce zero diagnostics attributed to these exact three paths. Every path must be
at most 1,000 physical lines. Record the independent-test receipt, temporary V8 summary
path and parsed rows, exact lint/static output, root-TSC attribution, diff check, line
counts, HEAD, and dirty-worktree context for the orchestrator. Do not update task
statuses, board statistics, changelog, staging, or commits.

## Documentation Updates Required

Return only the bounded source/test handoff to the orchestrator. `TASK-105-09` is the
sole terminal documentation writer after L12 and changelog 1325; it records this leaf's
actual source/static/V8 receipt alongside L01-L01, L01-L02, L02-L01, and L01–L04. This leaf writes
no task-board row, task status, changelog, or source/test path outside its exact scope.

## Sub-Tasks

- None — executable source-repair leaf.

## Closure Checklist

- [ ] L01 supplied its validated original-17-target V8/static/root-TSC handoff first.
- [ ] All three unreachable branches were removed or refactored without adding emitted dead
  fallback code, changing a declared reducer/data variant, or creating a private test seam.
- [ ] The empty-layout public denied-permission catalog query proves protected descriptions are
  absent and zero-permission descriptions remain visible; no invalid empty-catalog state is
  manufactured.
- [ ] The exact owned suite and two-target V8 aggregate pass with parsed 100% line rows.
- [ ] Exact lint, core lint/types, root-TSC attribution, diff, collision, and line-cap gates
  pass before L02 begins its test-only reconciliation.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Repair landed as contracted: `DashboardBuilder`'s exhaustive private-reducer
  default, the source-proven impossible empty-catalog branch, and
  `widgetRegistry`'s `never` fallback were removed; the public
  permission-filtered-catalog suite
  `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx` (84 lines)
  proves `can={() => false}` hides protected cards while zero-permission cards stay.
- Receipt: `/home/coder/.jcode/scratch/task105-08-05-l02-l01-final-20260825/receipt.json`
  at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09` — direct Vitest `1/1` (exit 0),
  `DashboardBuilder.tsx` and `widgetRegistry.ts` at `100%` lines, zero owned-path
  TypeScript diagnostics (183-diagnostic inventory, all unrelated), collision guard
  pass, line-cap pass.
- Recorded caveat kept verbatim from the receipt: the raw 11-file/82-test aggregate
  log was absent, so the aggregate count came from the prior validation report while
  the coverage summary artifact was present and parsed.
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines on both owned source paths.
