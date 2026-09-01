# TASK-105-08-05-L02: Dashboard Coverage
# FileName: TASK-105-08-05-L02-dashboard-coverage.md

**Parent Subtask:** TASK-105-08-05
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-05-L01 validated receipt; TASK-105-08-05-L02-L01 validation-complete source/static/V8 handoff; clean L05 contract audit
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

Close test-owned line gaps for six dashboard modules while preserving the existing
cache-hydration, background revalidation, dirty-state, permission, and widget-normalization
contracts. Before this task begins, L02-L01 alone repairs the source-proven unreachable
exhaustive defaults and impossible empty-catalog branch in `DashboardBuilder.tsx` plus the
exhaustive default in `widgetRegistry.ts`, and supplies the new public permission-filtered
catalog suite. L02 then treats all six sources and that child suite as
read-only coverage consumers. No L02 source, route, storage, or dashboard layout schema
change is authorized.

## Exact Single-Writer Scope

**Read-only source targets after the L02-L01 handoff:**

- `core/admin/ui/dashboard/DashboardBuilder.tsx`
- `core/admin/ui/dashboard/DashboardWidgetHost.tsx`
- `core/admin/ui/dashboard/SecurityStatusCard.tsx`
- `core/admin/ui/dashboard/SiteHealthCard.tsx`
- `core/admin/ui/dashboard/WidgetConfigForm.tsx`
- `core/admin/ui/dashboard/widgetRegistry.ts`

`TASK-105-08-05-L02-L01` is the sole writer of `DashboardBuilder.tsx`,
`widgetRegistry.ts`, and `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx`.
L02 may only read all three after the child's validated source/static/V8 handoff. It may
not re-open either source repair or edit the transferred direct suite.

**Starting draft ownership:**

- `tests/vitest/ui/dashboard-builder-residuals.test.tsx`
- `tests/vitest/ui/site-health-card.test.tsx`
- `tests/vitest/ui/widget-config-form.test.tsx`

**Transferred exclusive L02-L01 test consumer:**

- `tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx` (read-only in L02)

**Other exact suites this leaf may extend:**

- `tests/vitest/admin/dashboardWidgetRegistry.test.ts`
- `tests/vitest/ui/dashboard.test.tsx`
- `tests/vitest/ui-integration/dashboard-builder.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-config-form.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-host-dnd.test.tsx`
- `tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`

`dashboardWidgetRegistry.test.ts` is assigned here by TASK-105-08-01. This leaf does
not own generic settings, site-shell-card, media, commerce, entry, form, or page tests.
`tests/vitest/admin/dashboardLayoutArrange.test.ts` remains a read-only aggregate-coverage
consumer: it directly executes `widgetRegistry`, but this leaf gains no writer claim over it.

The only L02 writer candidates are the three starting drafts and six named extendable
suites above. Before its first edit, L02 must pass exactly that candidate list to the L05
collision guard; at handoff it must pass its exact final changed subset and report it. A
new path, a directory glob, `dashboardLayoutArrange.test.ts`, the L02-L01 direct suite, or
either L02-L01 source target requires a fresh audited contract rather than an implicit
ownership expansion.

## Implementation Pseudocode

```tsx
const dashboardClient = vi.hoisted(() => ({
  getDashboardLayoutCached: vi.fn(),
  getDashboardWidgetDataCached: vi.fn(),
  previewDashboardWidgetData: vi.fn(),
  saveDashboardLayout: vi.fn(),
  resetDashboardLayout: vi.fn(),
  subscribeDashboardCache: vi.fn(() => () => undefined),
}));
vi.mock("@/services/dashboardClient", () => dashboardClient);

const { container } = render(<DashboardBuilder canWrite can={() => true} />);
await user.click(screen.getByRole("button", { name: "Customize" }));
const widget = container.querySelector<HTMLElement>("[data-widget-id]");
expect(widget).not.toBeNull();
await user.click(screen.getByRole("button", { name: "Move right" }));
expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
await user.click(screen.getByRole("button", { name: "Save" }));
expect(dashboardClient.saveDashboardLayout).toHaveBeenCalledWith(
  expect.objectContaining({ widgets: expect.any(Array) })
);
```

**Data flow:** start from the real cached layout/data shapes → use visible controls,
pointer/keyboard interactions, and cache events → assert a real
`data-widget-id`/geometry, enabled Save or the stale alert, plus the exact saved
normalized layout. Test `widgetRegistry` table-driven by registered descriptor rather
than duplicating defaults in test fixtures.

**Error handling:** for load, preview, save, and reset, use a genuine
`new ApiClientError(code, message, status)` through the public client seam and assert the
exact visible API message. Preserve a paired opaque non-`ApiClientError` failure for each
operation (the existing `Error` fallback is acceptable only when it asserts the generic
fallback text). Preview, save, and reset must no longer be covered solely by opaque errors.
Keep the dirty draft/edit-mode or reset-layout assertions after failures; cache revalidation
must mark a dirty editor stale rather than overwrite it, and read-only/error cards must render
their public status safely.

**Regression shape:** add/remove/configure/reorder/resize widgets, keyboard and pointer
visible effects, config field validation, initial cache hydration plus background refresh,
dirty remote update affordance, health/security status variants, and descriptor/default
normalization.

## Testing Requirements

Run every changed/new file and every named consumer of a changed fixture one at a time
through the standard Vitest command. Then run all parent static gates, root ESLint over
the exact changed paths, the root TypeScript command with zero diagnostics on the
TASK-105-08-05-L02 attribution row, `git diff --check`, and the line-count gate.

Before the first L02 test edit, invoke the collision guard with exactly its allowed writer
candidates; repeat it at handoff with the exact final changed L02-owned subset. The source
repair's two production files and transferred direct suite are intentionally absent:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L02", [
  "tests/vitest/ui/dashboard-builder-residuals.test.tsx",
  "tests/vitest/ui/site-health-card.test.tsx",
  "tests/vitest/ui/widget-config-form.test.tsx",
  "tests/vitest/admin/dashboardWidgetRegistry.test.ts",
  "tests/vitest/ui/dashboard.test.tsx",
  "tests/vitest/ui-integration/dashboard-builder.test.tsx",
  "tests/vitest/ui-integration/dashboard-widget-config-form.test.tsx",
  "tests/vitest/ui-integration/dashboard-widget-host-dnd.test.tsx",
  "tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx",
]);
NODE
```

`--verify` remains structural/status-only and does not prove either source-repair or L02
coverage receipts.

The following aggregate coverage invocation is additional to the one-file-at-a-time
receipts above. It is the only L02 scoped V8 receipt and pins both the exact source targets
and every current direct coverage consumer.

~~~bash
coverage_targets=(
  core/admin/ui/dashboard/DashboardBuilder.tsx
  core/admin/ui/dashboard/DashboardWidgetHost.tsx
  core/admin/ui/dashboard/SecurityStatusCard.tsx
  core/admin/ui/dashboard/SiteHealthCard.tsx
  core/admin/ui/dashboard/WidgetConfigForm.tsx
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

coverage_dir="$(mktemp -d /tmp/task105-08-05-l02-v8.XXXXXX)"
coverage_args=(
  --coverage
  --coverage.provider=v8
  --coverage.reporter=json-summary
  "--coverage.reportsDirectory=$coverage_dir"
)
for coverage_target in "${coverage_targets[@]}"; do
  coverage_args+=("--coverage.include=$coverage_target")
done
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  "${coverage_args[@]}" "${coverage_tests[@]}"

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
~~~

The final receipt records the expanded test argv, temporary summary path, parsed rows, HEAD,
and dirty-worktree status. The temporary report is not a permanent config change and does not
replace L12's full rebaseline.

## Security Contract

Test-only. No dashboard API or permission change is permitted. Assertions preserve the
existing dashboard cache and admin authorization boundary; the later browser smoke uses
existing session, RBAC, and CSRF controls rather than a direct fixture bypass.

## Documentation Updates Required

Return the bounded child receipt after all gates pass. `TASK-105-09` alone writes it/status
in this task file after L12 and changelog 1325; no L02 implementer changes board, staging, or
commit state.

## Closure Checklist

- [ ] L02-L01 supplied its two-target source/static/V8 handoff; its sources and direct
  permission-filtered-catalog suite remain read-only in this leaf.
- [ ] Every owned dashboard test has an individual Vitest receipt.
- [ ] All six source targets have a scoped 100%-line receipt.
- [ ] Preview, save, and reset each prove a genuine `ApiClientError` visible message and an
  opaque fallback without weakening dirty/edit/reset-state assertions.
- [ ] A fresh root TypeScript run has no L02-owned diagnostics.
- [ ] The receipt preserves dirty-state/cache invariants and permits L03 to start.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-l02-final-20260825-2323/receipt.json`
  (`decision: VALIDATION_COMPLETE_PENDING_POST_AUDIT`; predecessor L02-L01 receipt
  recorded as its validated gate) at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`.
- `85` public tests green; scoped V8 reports `100%` lines for all six registered
  source targets: `DashboardBuilder.tsx`, `DashboardWidgetHost.tsx`,
  `SecurityStatusCard.tsx`, `SiteHealthCard.tsx`, `WidgetConfigForm.tsx`, and
  `widgetRegistry.ts` (`tests/vitest/admin/dashboardWidgetRegistry.test.ts` included
  per the TASK-105-08-01 assignment).
- Root TypeScript `pass_no_L02_owned_diagnostics`; static, boundary, collision,
  diff-check, and line-cap gates recorded green (max touched suite 468 lines).
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines on every `core/admin/ui/dashboard/` file.
