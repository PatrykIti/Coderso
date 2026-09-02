# TASK-105-08-05-L01: Menus Coverage Reconciliation
# FileName: TASK-105-08-05-L01-menus-coverage-reconciliation.md

**Parent Subtask:** TASK-105-08-05
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-16 `r4`; TASK-105-08-05-L01-L01 and TASK-105-08-05-L01-L02 validation-complete handoffs; clean L05 contract audit
**Status:** ✅ Done
**Completed:** 2026-09-01
**Started:** 2026-08-22

---

## Overview

This active task coordinates the final test-only coverage receipt for the 17 original
menu targets in the L05 parent. Before that receipt, its nested source-repair children
land in strict order: `TASK-105-08-05-L01-L01` cohesively splits the oversized editor,
removes its source-proven dead paths, and proves three exact production targets at 100%
lines; then `TASK-105-08-05-L01-L02` removes or refactors only the redundant unreachable
`MenuItemDrawer` save guard and proves that original target at 100% lines. L01 remains
`🚧 In Progress` with its existing start date; it owns no production source path itself.

After both validation-complete handoffs, L01 adopts its remaining 11 menu drafts, uses
the real menu client/router seams, and closes the original 17-target scoped V8 receipt.
It changes no route, schema, cache policy, permission rule, or runtime behavior.

## Exact Single-Writer Scope

**Read-only source targets for this coordination/coverage task:**

`core/admin/ui/menus/{MenuAppearancePanel,MenuCreateDialog,MenuDesignEditor,MenuDesignEditorBarPanel,MenuDesignEditorBlockFields,MenuDesignEditorBlockPanel,MenuDesignEditorBrandNavControls,MenuDesignEditorCanvas,MenuDesignEditorControls,MenuDesignEditorPage,MenuEditorPage,MenuItemDrawer,MenuItemForm,MenuItemRow,MenuListPage,MenuTree,SiteShellDialog}.tsx`.

`TASK-105-08-05-L01-L01` is the sole writer of `MenuEditorPage.tsx`, new
`menuEditorItemState.ts`, and `MenuListPage.tsx`; `TASK-105-08-05-L01-L02` is the sole
writer of `MenuItemDrawer.tsx`. L01 may only read all four files after the respective
child handoffs. The L01-L01 helper is outside this task's historic 17-target V8 list and
has the child's separate three-target 100%-line proof; L01-L02 separately proves the
already-counted `MenuItemDrawer.tsx` target before L01's aggregate repeats it.

**Starting draft ownership:**

- `tests/vitest/ui/menu-design-editor-block-fields.test.tsx`
- `tests/vitest/ui/menu-design-editor-controls.test.tsx`
- `tests/vitest/ui/menu-item-form.test.tsx`
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
- `tests/vitest/ui/menu-tree.test.tsx`
- `tests/vitest/ui/menuDesignEditorFixtures.tsx` (fixture-only; validated through its consumers)
- `tests/vitest/ui/site-shell-dialog.test.tsx`
- `tests/vitest/ui/menu-appearance-panel.test.tsx`
- `tests/vitest/ui/menu-create-dialog.test.tsx`
- `tests/vitest/ui/menu-design-editor-canvas-units.test.tsx`
- `tests/vitest/ui/menu-editor-page-flows.test.tsx` (baseline only; no additions)

**Transferred exclusive test-writer scope for `TASK-105-08-05-L01-L01`:**

- `tests/vitest/ui/menu-editor-validation.test.ts`
- `tests/vitest/ui/menu-list-page-flows.test.tsx`

L01 reads those two transferred files only as fixed coverage consumers after the child
has validated them. It must not edit them or treat a directory glob as an ownership grant.

**Transferred exclusive test-writer scope for `TASK-105-08-05-L01-L02`:**

- `tests/vitest/ui/menu-item-drawer.test.tsx`

L01 reads all three transferred child suites only as fixed coverage consumers after their
validated handoffs. It must not edit them or treat a directory glob as an ownership grant.

**Existing named suites this leaf may extend only when their source target requires it:**

- `tests/vitest/ui/menu-design-editor-{structure,canvas,brand-nav}.test.tsx`
- `tests/vitest/ui/menu-{color-alpha,editor-refresh-policy,editor-shell-wave,item-delete-dialog,item-row,leaf-components,list-page}.test.tsx`
- `tests/vitest/ui/menu-editor-page-residuals.test.tsx` (new; the only permitted home for
  new `MenuEditorPage` behavior while the 934-line flow suite remains frozen)
- `tests/vitest/services/{menu-item-settings-variant,normalize-menu-appearance,menu-document-v2,menu-document-v2-navchrome,menu-document-v2-scrolled,menu-document-v2-styles}.test.ts`
- `tests/vitest/services/menu-document-v2-devices-residual.test.ts` (new; the only
  permitted home for new device-normalization behavior)
- `tests/vitest/site/{menu-document-css,menu-document-css-508,menu-document-css-542}.test.ts`

**Required existing direct-target consumers:**

- `tests/vitest/ui/menu-editor.test.tsx` is the existing direct `MenuEditorPage` suite
  (163 physical lines).
- `tests/vitest/ui/menu-design-editor-revalidation.test.tsx` is the existing direct
  `MenuDesignEditorPage` suite (637 physical lines).

Both suites are owned by L01, may be extended only when their named menu source target
requires it, join the ≤1,000-line gate if touched, and are mandatory inputs to the L01
scoped-coverage command even when unchanged.

`tests/vitest/services/menu-document-v2-devices.test.ts` is a 946-line read-only
baseline. This leaf must not append to it; it must use the residual suite above (or first
perform a cohesive split) for any required device case.

No glob grants ownership. In particular, this leaf must not touch
`site-shell-card-actions.test.tsx`, `list-action-toasts.test.ts`, any custom-screen,
media, commerce, entry, form, audit, backup, redirect, or assistant suite.

## Implementation Pseudocode

```tsx
assertSourceRepairReceipts([
  {
    id: "TASK-105-08-05-L01-L01",
    sourceTargets: ["MenuEditorPage.tsx", "menuEditorItemState.ts", "MenuListPage.tsx"],
  },
  {
    id: "TASK-105-08-05-L01-L02",
    sourceTargets: ["MenuItemDrawer.tsx"],
  },
].map((receipt) => ({ ...receipt, lineCoverage: 100, lineCap: 1000, rootTscOwnAttribution: 0 })));

const navigateSpy = vi.fn();
const menuClient = vi.hoisted(() => ({
  getCachedMenuDetail: vi.fn(),
  getMenuWithItemsCached: vi.fn(),
  replaceMenuItems: vi.fn(),
  updateMenu: vi.fn(),
}));
const pagesClient = vi.hoisted(() => ({
  getCachedPages: vi.fn(),
  listPagesCached: vi.fn(),
}));

vi.mock("@/services/menusClient", () => menuClient);
vi.mock("@/services/pagesClient", () => pagesClient);
vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ path: "/admin/menus/menu-1", navigate: navigateSpy }),
}));

// MenuEditorPage has no props: the route is the public test seam.
render(<MenuEditorPage />);
await user.click(screen.getByRole("button", { name: "Save" }));
expect(menuClient.updateMenu).toHaveBeenCalledWith("menu-1", expectedMetadata);
```

**Data flow:** hydrate from the real cached menu and page-client seams (with typed
`PageSummary[]` cached/list return shapes) → render a route-shaped admin state → interact
through accessible controls → assert the visible state, exact client payload,
cache/dirty-state behavior, and saved projection. First consume the verified L01-L01 and
L01-L02 source/static handoffs; then test only L01-owned files. The three transferred
child tests remain read-only consumers in this task's aggregate V8 command.

**Error handling:** use the actual `ApiClientError`/opaque-error paths; preserve the UI
fallback instead of changing source or weakening the assertion. Do not fabricate a
`menuId` prop or nonexistent `getMenus`/`saveMenu` export.

**Regression shape:** menu creation, item add/edit/reparent/delete, published/draft
transition, list filtering/action errors, design controls/device reset, canvas visible
state, appearance output, mobile inspector/sheet behavior, and server/cache refresh
without clobbering a dirty draft.

## Testing Requirements

Do not begin the final L01 receipt until L01-L01 and L01-L02 return their
validation-complete handoffs: L01-L01's three named production files and L01-L02's
`MenuItemDrawer.tsx` are at most 1,000 lines; each child has its targeted tests/static
gates, zero own-attribution root-TSC diagnostics, and parsed 100%-line V8 rows for its
exact target set. This is a gate, not a request for L01 to edit either child's source or
three transferred test paths.

Before L01 validation, derive `changed_test_paths` from L01's exact writer list above:
every L01-owned new or modified `*.test.*` path is mandatory, including an allowed residual
suite. Do not use a directory glob as an ownership grant. The 11 adopted drafts are the
initial set; any existing permitted UI/service/site suite becomes mandatory when changed.
The two required direct-target consumers are fixed scoped-coverage inputs and join the
individual Vitest loop when changed. The fixture-only `menuDesignEditorFixtures.tsx` is
validated through each changed consumer and through the three split-suite consumers below.

```bash
for test_path in "${changed_test_paths[@]}"; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
```

Run `menuDesignEditorFixtures.tsx` through the changed consumers and through
`menu-design-editor-{structure,canvas,brand-nav}.test.tsx`; never invoke a fixture module
as a test. Then run the parent static gates, an explicit root ESLint command over every
changed owned path, the root TypeScript command with zero diagnostics on the
TASK-105-08-05-L01 attribution row, `git diff --check`, and the physical-line gate.

The following aggregate coverage invocation is additional to the one-file-at-a-time
receipts above. It pins every UI test that is currently required to exercise the 17 original
menu source targets; `menu-editor-validation.test.ts`, `menu-list-page-flows.test.tsx`, and
`menu-item-drawer.test.tsx` are read-only child-owned consumers in this argv. The new helper
is deliberately absent: L01-L01 owns and separately proves it with its three-target command.
`MenuItemDrawer.tsx` remains in the 17-target list, but L01-L02 separately proves its
source/static/V8 repair before L01 repeats it here. If `menu-editor-page-residuals.test.tsx`
is created, append it to `coverage_tests` before running. Do not add another
coverage-consumer path without a fresh audited contract update.

~~~bash
coverage_targets=(
  core/admin/ui/menus/MenuAppearancePanel.tsx
  core/admin/ui/menus/MenuCreateDialog.tsx
  core/admin/ui/menus/MenuDesignEditor.tsx
  core/admin/ui/menus/MenuDesignEditorBarPanel.tsx
  core/admin/ui/menus/MenuDesignEditorBlockFields.tsx
  core/admin/ui/menus/MenuDesignEditorBlockPanel.tsx
  core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx
  core/admin/ui/menus/MenuDesignEditorCanvas.tsx
  core/admin/ui/menus/MenuDesignEditorControls.tsx
  core/admin/ui/menus/MenuDesignEditorPage.tsx
  core/admin/ui/menus/MenuEditorPage.tsx
  core/admin/ui/menus/MenuItemDrawer.tsx
  core/admin/ui/menus/MenuItemForm.tsx
  core/admin/ui/menus/MenuItemRow.tsx
  core/admin/ui/menus/MenuListPage.tsx
  core/admin/ui/menus/MenuTree.tsx
  core/admin/ui/menus/SiteShellDialog.tsx
)
coverage_tests=(
  tests/vitest/ui/menu-appearance-panel.test.tsx
  tests/vitest/ui/menu-create-dialog.test.tsx
  tests/vitest/ui/menu-design-editor-block-fields.test.tsx
  tests/vitest/ui/menu-design-editor-brand-nav.test.tsx
  tests/vitest/ui/menu-design-editor-canvas.test.tsx
  tests/vitest/ui/menu-design-editor-canvas-units.test.tsx
  tests/vitest/ui/menu-design-editor-controls.test.tsx
  tests/vitest/ui/menu-design-editor-revalidation.test.tsx
  tests/vitest/ui/menu-design-editor-structure.test.tsx
  tests/vitest/ui/menu-editor-page-flows.test.tsx
  tests/vitest/ui/menu-editor-refresh-policy.test.tsx
  tests/vitest/ui/menu-editor-shell-wave.test.tsx
  tests/vitest/ui/menu-editor-validation.test.ts
  tests/vitest/ui/menu-editor.test.tsx
  tests/vitest/ui/menu-item-drawer.test.tsx
  tests/vitest/ui/menu-item-form.test.tsx
  tests/vitest/ui/menu-item-row.test.tsx
  tests/vitest/ui/menu-leaf-components.test.tsx
  tests/vitest/ui/menu-list-page.test.tsx
  tests/vitest/ui/menu-list-page-actions.test.tsx
  tests/vitest/ui/menu-list-page-flows.test.tsx
  tests/vitest/ui/menu-tree.test.tsx
  tests/vitest/ui/site-shell-dialog.test.tsx
)

coverage_dir="$(mktemp -d /tmp/task105-08-05-l01-v8.XXXXXX)" || exit 1
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
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
export TMPDIR=/tmp
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
~~~

The final receipt records the expanded test argv, temporary summary path, parsed rows, HEAD,
and dirty-worktree status. Do not edit `vitest.config.ts`, expand `coverage.exclude`, add
an ignore comment, or treat this scoped report as L12's canonical rebaseline.

## Security Contract

L01 itself is test-only. No endpoint, auth, RBAC, CSRF, rate-limit, schema, cache policy,
or persistence contract changes are allowed. The separate L01-L01 and L01-L02 source repairs
keep the existing internal menu session/RBAC/CSRF contract and server-authoritative XOR
enforcement; neither may create a route or client-side authority. Mocked clients model the
existing internal-admin behavior; a later L04 browser flow must use existing session/RBAC/CSRF
protection rather than a test-only route or bypass.

## Documentation Updates Required

Return the L01-owned test set, targeted-test receipts, original-17-target scoped-coverage
result, root TypeScript attribution, and line-count result to the orchestrator after
validation. Preserve and cite the separate L01-L01 and L01-L02 source/static/V8 receipts
rather than rewriting them. `TASK-105-09` alone writes the bounded receipt/status in this
leaf after L12 and changelog 1325; no L01 implementer changes task status, board statistics,
changelog, staging, or commits.

## Sub-Tasks

- [ ] `TASK-105-08-05-L01-L01-menu-source-split-and-dead-path-repair.md` — must be
  validation-complete first.
- [ ] `TASK-105-08-05-L01-L02-menu-item-drawer-dead-guard-repair.md` — must be
  validation-complete after L01-L01 and before this task's final test-only V8 receipt.

## Closure Checklist

- [ ] L01-L01 has supplied its three-target source/static/V8 handoff, then L01-L02 has
  supplied its `MenuItemDrawer.tsx` source/static/V8 handoff, before final L01 work.
- [ ] Every L01-owned draft is adopted, repaired, and independently runnable.
- [ ] The 934-line flow suite was not extended; any new editor behavior is cohesive.
- [ ] All 17 named sources have a scoped 100%-line receipt.
- [ ] The helper has the separate L01-L01 100%-line receipt; L01-L02 separately proved the
  existing `MenuItemDrawer.tsx` target; L01 did not falsely count the helper inside the
  historical 17-target list.
- [ ] No L01 path appears in a fresh root TypeScript diagnostic.
- [ ] The L01 receipt permits L02 to start.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-l01-final-20260825/receipt.json`
  (`decision: VALIDATION_COMPLETE_PENDING_POST_AUDIT`) at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`,
  branch `feat/task-105-final-vitest-coverage`, dirty shared worktree (219 porcelain
  entries, 0 staged).
- Direct: `23` suites / `264` tests, `0` failures; aggregate scoped V8 for the
  original `17`-target menu inventory reports `100%` lines on every target
  (`/home/coder/.jcode/scratch/task105-audit-aggregates-1787696758/l01-rows.json`).
- Static gates recorded green: exact-path ESLint `--max-warnings=0`, `core lint`,
  `core lint:types`, admin boundary, workflow `--verify`, `git diff --check`; max
  touched file `942` lines. Root `tsc` exited `2` globally with zero owned-path
  diagnostics.
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines on every `core/admin/ui/menus/` file.
