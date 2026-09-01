# TASK-105-08-05-L01-L02: Menu Item Drawer Dead-Guard Repair
# FileName: TASK-105-08-05-L01-L02-menu-item-drawer-dead-guard-repair.md

**Parent Subtask:** TASK-105-08-05-L01
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-16 terminal `r4`; TASK-105-08-05-L01-L01 validation-complete source/static/V8 handoff; fresh L01-L02 contract audit
**Status:** ✅ Done
**Completed:** 2026-09-01
**Started:** 2026-08-23

---

## Overview

The L01 V8 diagnostic established one additional source-proven unreachable line after
the L01-L01 split/dead-path repair: `MenuItemDrawerContent.handleSave()` currently
returns when `item` is falsy at `MenuItemDrawer.tsx:103`, but the same component
already renders its no-item helper state and returns at lines 135–141. A supported
`MenuItemDrawer` UI flow therefore cannot invoke `handleSave` with a null item.

This strictly second source-repair leaf follows L01-L01 and precedes L01's final
original-17-target aggregate. It removes or refactors only that redundant dead guard
while preserving the public `MenuItemDrawer` and `MenuItemInspector` contracts. The
transferred direct suite proves the real public surfaces at 100% V8 lines; it does not
invent a private-content seam or alter any menu behavior.

## Exact Single-Writer Scope

**Production source writer:**

- `core/admin/ui/menus/MenuItemDrawer.tsx`

**Transferred exclusive test writer:**

- `tests/vitest/ui/menu-item-drawer.test.tsx`

This leaf may edit no other source, test, route, service, schema, cache-policy,
coverage configuration, task/changelog, runtime-smoke, fixture, or manifest path.
`MenuItemDrawer.tsx` remains one of L01's historic 17 menu coverage targets, but L01
may only read it and the transferred direct suite as fixed aggregate-coverage consumers
after this leaf's validated handoff. All other L01 and L01-L01 writers remain exclusive
to their existing contracts.

## Implementation Pseudocode

```tsx
function MenuItemDrawerContent({
  item,
  pages,
  parentOptions,
  disabledParentIds,
  onClose,
  onSave,
  onDelete,
}: MenuItemDrawerProps) {
  const [draft, setDraft] = useState(() => toFormValue(item));
  const [errors, setErrors] = useState<{ label?: string; link?: string } | null>(null);
  const isEditing = Boolean(item?.id);
  const canDelete = Boolean(item?.id);
  const title = item?.id ? "Edit Menu Item" : "Add Menu Item";

  const validate = () => {
    // Preserve existing label/page-or-URL validation and error rendering.
  };

  // Both useState calls and this helper-text useMemo stay lexically before the
  // no-item return. They are hooks and must not move behind the conditional.
  const helperText = useMemo(() => {
    if (!item) return "Select a menu item to edit details.";
    if (draft.linkType === "page" && pages.length === 0) {
      return "Create at least one page to link a menu item.";
    }
    return "Update the selected menu item settings.";
  }, [item, draft.linkType, pages.length]);

  if (!item) {
    return (
      <div className="flex h-full flex-col justify-center text-sm text-muted-foreground">
        {helperText}
      </div>
    );
  }

  // Only this non-hook handler moves after the public no-item return, which
  // narrows `item`. Do not keep a second guard for an impossible handler path.
  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...item,
      label: draft.label.trim(),
      linkType: draft.linkType,
      pageId: draft.linkType === "page" ? draft.pageId : "",
      href: draft.linkType === "url" ? draft.href : "",
      parentId: draft.parentId ?? null,
      settings: normalizeMenuItemSettings(/* existing draft settings projection */),
    });
  };

  // Keep the existing header, MenuItemForm, close/delete controls, and save binding below.
}
```

**Data flow:** preserve the existing item → form-value → validated draft → normalized
`onSave` projection. The no-item public drawer state continues to render only its helper
text, while active drawers preserve page and URL validation, save normalization, close,
and delete behavior. `MenuItemInspector` keeps its separate live `onChange` projection,
menu-settings-slot fallback, open-in-new-tab switch, Advanced disclosure, and removal
callback unchanged.

**Error handling:** retain the existing visible validation errors and never call `onSave`
for an invalid page or URL. Do not add a catch/fallback, change error text, weaken
normalization, or introduce a test-only branch. The repair is complete only when the
non-null item is derived from the already-rendered public state, not when a new guard is
added elsewhere.

**Regression-test shape:** extend only the transferred suite through the two exported
components. Exercise the no-item drawer helper plus all three public validation failures:
blank navigation label, page-without-page selection, and URL-without-href. Retain valid
page and URL saves, close, and delete assertions. For every save, declare a complete typed
`MenuItemDraft` expected value and assert equality with `toHaveBeenCalledWith(expected)` —
never `objectContaining` — including exact page-or-URL XOR (`pageId`/`href`) and normalized
`settings`. Render `MenuItemInspector` with no active item to prove the
`menuSettingsSlot` fallback, then with an active item to change its public label/link
state, toggle `Open in new tab`, open `Advanced`, and remove the item. Assert complete,
exact normalized `MenuItemDraft` arguments for each inspector `onChange` and the exact
active typed `MenuItemDraft` argument for its `onDelete` call. Do not import or mount `MenuItemDrawerContent`,
`MenuItemInspectorContent`, or other private helpers.

## Security Contract

This is an internal admin UI repair only; it creates no endpoint and changes no request.
Existing menu reads/writes remain session-authenticated under their current
`menus:read`/`menus:write` RBAC checks, and existing internal write CSRF enforcement and
rate-limit buckets remain unchanged. Server-side strict reject-unknown validation and
authoritative page-or-URL XOR validation remain in force; this UI refactor must not
persist a malformed item or grant client-side authority. No public write exists here, so
nonce/signature/HMAC and reCAPTCHA policies are not applicable. Do not expose secrets,
settings, user data, or session values in tests or receipts.

## Testing Requirements

Before edits and again from the final two writer paths, verify that the shared-worktree
collision guard accepts this complete, duplicate-free exact leaf scope. The repair leaves
fail closed on missing or unexpected writer paths, and every leaf rejects a path claimed by
the other exact-writer repair leaf:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L01-L02", [
  "core/admin/ui/menus/MenuItemDrawer.tsx",
  "tests/vitest/ui/menu-item-drawer.test.tsx",
]);
NODE
```

`--verify` is only the workflow's structural gate: it checks declared leaf order, task
existence, canonical H1/FileName/parent metadata, and allowed status syntax. It does not
prove this leaf's receipt or advance L01's status/progression.

Run the transferred suite independently, then the one-target reproducible V8 receipt:

```bash
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/menu-item-drawer.test.tsx

coverage_dir="$(mktemp -d /tmp/task105-08-05-l01-l02-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
coverage_target="core/admin/ui/menus/MenuItemDrawer.tsx"
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage \
  --coverage.provider=v8 \
  --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  "--coverage.include=$coverage_target" \
  tests/vitest/ui/menu-item-drawer.test.tsx || exit $?

node - "$coverage_dir/coverage-summary.json" "$coverage_target" <<'NODE'
const fs = require("node:fs");
const [summaryPath, target] = process.argv.slice(2);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const key = Object.keys(summary)
  .filter((candidate) => candidate !== "total")
  .find((candidate) => candidate.endsWith(target));
const row = { target, key: key ?? null, lines: key ? summary[key]?.lines?.pct : null };
console.log(JSON.stringify({ summaryPath, rows: [row] }, null, 2));
if (row.key === null || row.lines !== 100) process.exit(1);
NODE
```

Then run the exact two-path lint, required core gates, and ownership checks:

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/menus/MenuItemDrawer.tsx \
  tests/vitest/ui/menu-item-drawer.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
wc -l core/admin/ui/menus/MenuItemDrawer.tsx \
  tests/vitest/ui/menu-item-drawer.test.tsx
```

The root TypeScript command may retain diagnostics owned by other active leaves, but it
must produce zero diagnostics attributed to either path above. Both paths must remain at
most 1,000 physical lines. Record the individual-test receipt, V8 temporary summary path
and parsed row, exact lint/static output, root-TSC attribution, diff check, line counts,
HEAD, and dirty-worktree context for the orchestrator. Do not update task statuses, board
statistics, changelog, staging, or commits.

## Documentation Updates Required

Return only the bounded source/test handoff to the orchestrator. `TASK-105-09` is the
sole terminal documentation writer after L12 and changelog 1325; it records this leaf's
actual source/static/V8 receipt alongside L01-L01 and L01–L04. This leaf writes no
task-board row, task status, changelog, or source/test path outside its exact scope.

## Sub-Tasks

- None — executable source-repair leaf.

## Closure Checklist

- [ ] L01-L01 supplied its validation-complete source/static/V8 handoff first.
- [ ] Both `useState` calls and `helperText` `useMemo` remain before the null return; only the
  redundant dominated `handleSave` guard was removed or refactored afterward.
- [ ] The two public components retain visible behavior and exact normalized typed callback
  payloads, including page-or-URL XOR and settings.
- [ ] The transferred direct suite passes independently and reports 100% V8 lines for
  `MenuItemDrawer.tsx`.
- [ ] The exact two-path lint, core lint/types, root-TSC attribution, diff, and line-cap
  gates pass before L01 resumes its original-17-target aggregate.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-l01-l02-validation-20260825/receipt.json`
  (`receiptStatus: VALIDATION_COMPLETE_PENDING_POST_AUDIT`) at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`.
- The redundant `MenuItemDrawerContent.handleSave` null guard was removed as
  contracted (hooks and the `helperText` memo untouched), and the direct public
  suite `tests/vitest/ui/menu-item-drawer.test.tsx` (9 tests, 489 lines) drives the
  exported `MenuItemDrawer` and `MenuItemInspector` seams only.
- Scoped V8 (`/home/coder/.jcode/scratch/task105-audit-l01l02-1787696502/coverage-row.json`):
  `core/admin/ui/menus/MenuItemDrawer.tsx` at `100%` lines; root TypeScript
  `pass_no_owned_diagnostics`; `git diff --check` and line-cap gates green.
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines for `MenuItemDrawer.tsx`.
