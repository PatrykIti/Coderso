# TASK-105-08-05-L01-L01: Menu Source Split and Dead-Path Repair
# FileName: TASK-105-08-05-L01-L01-menu-source-split-and-dead-path-repair.md

**Parent Subtask:** TASK-105-08-05-L01
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-16 terminal `r4`; fresh L01-L01 contract audit
**Status:** ✅ Done
**Completed:** 2026-09-01
**Started:** 2026-08-23

---

## Overview

The current L01 V8 diagnostic passed 23 suites / 249 tests, yet reported eight lines
that cannot be reached through a real supported menu UI seam:

- `MenuEditorPage.tsx:253,254,256`: the only payload-builder call follows the exact-XOR
  `validateMenuItemsPayload()` guard, which rejects both-link and no-link records.
- `MenuEditorPage.tsx:561,982`: `loadMenu()` maps supported errors internally and resolves,
  making its callers' no-op `.catch()` callbacks unreachable.
- `MenuListPage.tsx:70`: a string timestamp's invalid `Date` value renders `Invalid Date`; it
  does not throw into the defensive catch.
- `MenuListPage.tsx:438,453`: every private `refresh()` call explicitly requests a background
  refresh, so the foreground-spinner branches cannot execute.

L01 is otherwise test-only, but `MenuEditorPage.tsx` is 1,081 physical lines. This child is
the first narrowly authorized menu source repair: it removes the dead paths, makes malformed
menu timestamps use the intended raw-value fallback, and extracts cohesive menu-item state
helpers so every touched production file is at most 1,000 lines. Its validated handoff unlocks
the strictly second L01-L02 `MenuItemDrawer` dead-guard repair; both receipts are required
before L01's final 17-target coverage aggregate. It does not add a feature or alter the menu
API contract.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/menuEditorItemState.ts` (new)
- `core/admin/ui/menus/MenuListPage.tsx`

**Test writers transferred from L01:**

- `tests/vitest/ui/menu-editor-validation.test.ts`
- `tests/vitest/ui/menu-list-page-flows.test.tsx`

The current L01 test inventory is read-only input except for those two named suites. This child
may not edit any route, service, schema, migration, cache-policy module, task document,
coverage configuration, manifest, runtime-smoke file, or another test path. In particular,
`menu-editor-page-flows.test.tsx` remains frozen at 934 lines and is a read-only coverage
consumer here.

## Implementation Pseudocode

```ts
// core/admin/ui/menus/menuEditorItemState.ts
const collectRecordDescendants = /* private record-tree walk used by moveMenuItems */;
export const buildMenuItemsPayload = (items: MenuItemRecord[]): MenuItemInput[] =>
  items.map((entry) => {
    const href = entry.href?.trim() ?? "";
    const base = {
      id: entry.id,
      label: entry.label.trim(),
      parentId: entry.parentId ?? null,
      orderIndex: entry.orderIndex,
      settings: normalizeMenuItemSettings(entry.settings),
    };

    // Preserve existing priority for malformed direct inputs; normal UI input is XOR-validated.
    return { ...base, ...(entry.pageId ? { pageId: entry.pageId } : href ? { href } : {}) };
  });

export const moveMenuItems = /* move/reindex with descendant-cycle prevention */;
export const moveMenuItemToRoot = /* move/reindex root siblings */;
export const validateMenuItemsPayload = /* label + exactly-one pageId/href validation */;

// MenuEditorPage.tsx
import {
  buildMenuItemsPayload,
  moveMenuItems,
  validateMenuItemsPayload,
} from "./menuEditorItemState";
export { moveMenuItems, moveMenuItemToRoot, validateMenuItemsPayload } from "./menuEditorItemState";

// The internal loader already maps API and opaque failures to visible state.
void loadMenu(menuId, { force: true, setLoading: false, preserveItemId: activeItemId });

// MenuListPage.tsx
const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const refresh = useCallback(async () => {
  setError(null);
  try {
    setItems(await listMenusCached({ force: true }));
  } catch (error) {
    setError(isApiClientError(error) ? error.message : "Failed to load menus.");
  }
}, []);

// Remove `useRef`, `hasHydratedRef`, and `resolveCacheRefreshBackground` from this page.
// The cache subscription calls `void refresh()`; publish, draft, delete, and bulk actions
// each call `await refresh()`. Keep the independent mount effect and its `active` guard.
```

**Data and cache behavior:** keep the existing menu item XOR rule, server validation,
`replaceMenuItems` invalidation/broadcast, skip-count protection, and background reconciliation
semantics. The mount effect remains separate and keeps its active/unmount guard. Do not route
the mount effect through `refresh()`, add a fetch dedupe policy, or change how mutations prime
and broadcast the menu-list cache.

**Regression shape:** extend the transferred validation suite to prove valid page-only and
URL-only item payload behavior plus dual-link rejection. Replace the current malformed-date
expectation in the transferred list-page flow with `Updated not-a-date`. Extend its cache-event
case using a deferred real mocked client result: after the event, assert `{ force: true }`, the
old rows remain visible and `Loading menus...` is absent until resolution, then assert the new
rows render. Use real component/client/cache seams; never mock a private helper to manufacture
a dead branch.

## Security Contract

This is an internal admin UI refactor only. No endpoint visibility, RBAC (`menus:read` /
`menus:write`), session, CSRF, rate-limit bucket, strict validation, persistence, migration, or
public-write anti-abuse contract may change. Existing server-side exact-XOR menu-item validation
remains authoritative. The UI must keep rejecting malformed legacy/corrupt dual-link or no-link
records before any mutation; it must not silently normalize and persist them. No secrets,
settings, or raw client data may enter tests or receipts.

## Testing Requirements

Before edits and again from the exact final five writer paths, run the exported fail-closed
collision assertion. `--verify` is a structural/status report; this explicit call is the
candidate-path enforcement for L01-L01:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L01-L01", [
  "core/admin/ui/menus/MenuEditorPage.tsx",
  "core/admin/ui/menus/menuEditorItemState.ts",
  "core/admin/ui/menus/MenuListPage.tsx",
  "tests/vitest/ui/menu-editor-validation.test.ts",
  "tests/vitest/ui/menu-list-page-flows.test.tsx",
]);
NODE
```

Run each changed writer test independently, then use the existing L01 consumer set as read-only
inputs for the three-target scoped V8 proof:

```bash
for test_path in \
  tests/vitest/ui/menu-editor-validation.test.ts \
  tests/vitest/ui/menu-list-page-flows.test.tsx; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done

coverage_dir="$(mktemp -d /tmp/task105-08-05-l01-l01-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
coverage_targets=(
  core/admin/ui/menus/MenuEditorPage.tsx
  core/admin/ui/menus/menuEditorItemState.ts
  core/admin/ui/menus/MenuListPage.tsx
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
coverage_args=(
  --coverage
  --coverage.provider=v8
  --coverage.reporter=json-summary
  "--coverage.reportsDirectory=$coverage_dir"
)
for target in "${coverage_targets[@]}"; do coverage_args+=("--coverage.include=$target"); done
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  "${coverage_args[@]}" "${coverage_tests[@]}" || exit $?
node - "$coverage_dir/coverage-summary.json" "${coverage_targets[@]}" <<'NODE'
const fs = require("node:fs");
const [summaryPath, ...targets] = process.argv.slice(2);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const rows = targets.map((target) => {
  const key = Object.keys(summary).find((candidate) => candidate.endsWith(target));
  return { target, lines: key ? summary[key]?.lines?.pct : null };
});
console.log(JSON.stringify({ summaryPath, rows }, null, 2));
if (rows.some((row) => row.lines !== 100)) process.exit(1);
NODE
```

Then run:

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/menus/MenuEditorPage.tsx \
  core/admin/ui/menus/menuEditorItemState.ts \
  core/admin/ui/menus/MenuListPage.tsx \
  tests/vitest/ui/menu-editor-validation.test.ts \
  tests/vitest/ui/menu-list-page-flows.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
wc -l core/admin/ui/menus/MenuEditorPage.tsx \
  core/admin/ui/menus/menuEditorItemState.ts \
  core/admin/ui/menus/MenuListPage.tsx \
  tests/vitest/ui/menu-editor-validation.test.ts \
  tests/vitest/ui/menu-list-page-flows.test.tsx
```

The root TypeScript command may retain diagnostics owned by other active leaves, but it must
produce zero diagnostics on the five paths owned here. Every listed production/test file must
be at most 1,000 physical lines. Capture the temporary report path, parsed 100%-line rows,
HEAD, and dirty-worktree context for the orchestrator; do not update task statuses, board,
changelog, or evidence docs.

## Closure Checklist

- [ ] A fresh read-only contract audit and cross-leaf reconcile pass before source edits.
- [ ] `MenuEditorPage.tsx`, `menuEditorItemState.ts`, and `MenuListPage.tsx` each have a
  100%-line V8 receipt and are at most 1,000 lines.
- [ ] Existing public imports from `MenuEditorPage` remain stable through re-exports.
- [ ] The two transferred test writers pass independently; the full consumer proof passes.
- [ ] Root TypeScript attribution contains no L01-L01-owned path.
- [ ] A fresh post-implementation audit passes before L01-L02 begins, then before L01 resumes
  its final coverage gate after both source-repair handoffs.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Split-first source repair landed as contracted: record-centric descendants,
  payload building, move helpers, and XOR validation moved to the new
  `core/admin/ui/menus/menuEditorItemState.ts` with stable re-exports; the private
  menu-list cache refresh is forced and background-only; `formatDate` returns
  invalid input unchanged.
- Scoped V8 (`/home/coder/.jcode/scratch/task105-audit-l01l01-1787696316/v8/coverage-summary.json`):
  `MenuEditorPage.tsx` `320/320`, `MenuListPage.tsx` `168/168`,
  `menuEditorItemState.ts` `77/77` — all `100%` lines, at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`.
- Independent validation/orchestration audits for this leaf exist under
  `/home/coder/.jcode/scratch/task105-audit-l01l01-1787696316/` and the L01 family
  receipt; writer sets stayed collision-free (`assertTask105L05CandidatePathsAreCollisionFree`).
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines on all three owned source paths, and `menuEditorItemState.ts` remains at
  most 1,000 physical lines.
