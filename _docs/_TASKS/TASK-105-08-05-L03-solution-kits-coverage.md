# TASK-105-08-05-L03: Solution Kits Coverage
# FileName: TASK-105-08-05-L03-solution-kits-coverage.md

**Parent Subtask:** TASK-105-08-05
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Medium
**Dependencies:** strict validated-receipt order: TASK-105-08-05-L02 ->
TASK-105-08-01-S01 browser solution-kit ID parity plus fresh scoped audit ->
TASK-105-08-05-L03-L01 card parity plus fresh combined audit
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

Close test-owned line gaps for the read-only solution-kit catalog page and its two
hooks. The page deliberately delegates write execution to the reviewed assistant; this
leaf tests that real boundary and must not add direct apply, rollback, cancel, or polling
UI to obtain coverage.

After L02 returns its validated receipt and before L03 begins, `TASK-105-08-01-S01` must repair
a verified browser/server catalog-contract drift: the authoritative server `solutionKitIds`
tuple and catalog contain six IDs, including `local-service-business`, while the browser client
and selection allowlists each currently declare only five. L03 is not permitted to absorb that
repair. The two browser contract modules and their direct admin suites are exclusively owned by
`TASK-105-08-01-S01`.

After the browser repair, `TASK-105-08-05-L03-L01` exclusively owns the separate
`SolutionKitCard` source and direct-card-suite parity repair. L03 remains a test-only UI/hook
leaf only after both prerequisite receipts and their fresh audits. The TASK-105-08-01 parent
does not grant card-writing authority, and neither that parent nor L03 may edit the card.

## Exact Single-Writer Scope

**Read-only L03 coverage sources, none of which is an L03 writer path:**

- `core/admin/ui/kits/SolutionKitCard.tsx`
- `core/admin/ui/kits/SolutionKitsPage.tsx`
- `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`
- `core/admin/ui/kits/hooks/useSolutionKits.ts`

**Separate browser ID-parity prerequisite, exclusively owned by TASK-105-08-01-S01:**

- Read-only authority: `core/services/kits/solutionKitTypes.ts` defines the six-ID
  `solutionKitIds` tuple, and `core/services/kits/solutionKitsCatalog.ts` defines the
  corresponding catalog entry.
- Narrow repair sources: `core/admin/services/solutionKitsClient.ts` and
  `core/admin/services/solutionKitSelection.ts`.
- Narrow repair suites: `tests/vitest/admin/solutionKitsClient.coverage.test.ts` and
  `tests/vitest/admin/solutionKitSelection.test.ts`.

`TASK-105-08-01-S01` is the sole writer of all four browser paths above under its explicit
`core/admin/services/**` and `tests/vitest/admin/*` ownership. Its repair is limited to adding
`local-service-business` to the existing typed browser union and both local runtime allowlists,
then proving accepted-ID round trips and strict unknown-ID rejection. It must not refactor
browser imports to reach server modules, loosen a validator to arbitrary strings, change API
routes, cache policy, persistence, permissions, or expose new controls. L03 may read the
validated receipt and consume the resulting public client behavior only.

**Separate card-parity prerequisite, exclusively owned by TASK-105-08-05-L03-L01:**

- Source writer: `core/admin/ui/kits/SolutionKitCard.tsx`.
- Direct-suite writer: `tests/vitest/ui/solution-kit-card-parity.test.tsx`.

Its validated two-path receipt and fresh post-implementation audit must prove the six-entry
exhaustive `Record<SolutionKitId, KitVisual>` mapping, including the explicit
`local-service-business` visual, with no fallback, cast, widened union, or missing mapping.
The direct card suite and card source are read-only coverage inputs for L03. They never become
L03 writer paths, and the TASK-105-08-01 parent has no authority to assign either path to L03.

**Exact L03 test writer candidates, registered as the five L03 workflow writer paths:**

- `tests/vitest/kits/use-solution-kit-runs.test.tsx`
- `tests/vitest/kits/use-solution-kits.test.tsx`
- `tests/vitest/ui/solution-kits-page-flow.test.tsx`
- `tests/vitest/ui/solution-kits-page.test.tsx`
- `tests/vitest/ui-integration/solution-kits-restyle.test.tsx`

`tests/vitest/kits/full-site-install-planner.test.ts` remains read-only because it is already
902 lines. It is not a sixth L03 writer candidate. A need to extend it requires a separately
authored cohesive split contract before any edit.

L03 makes zero source edits. No assistant, server, route, package-installer, full-site runtime,
or browser-service path becomes writable merely because it mentions a solution kit. The following
cross-leaf paths are explicitly forbidden to L03:

- `core/admin/services/solutionKitsClient.ts`;
- `core/admin/services/solutionKitSelection.ts`;
- `tests/vitest/admin/solutionKitsClient.coverage.test.ts`;
- `tests/vitest/admin/solutionKitSelection.test.ts`;
- `core/admin/ui/kits/SolutionKitCard.tsx`; and
- `tests/vitest/ui/solution-kit-card-parity.test.tsx`.

The two browser suites remain exclusively with `TASK-105-08-01-S01` because their direct
subjects are the browser contract modules, not an L03 UI target. The card source and direct
card suite remain exclusively with `TASK-105-08-05-L03-L01`.

## TASK-105-08-01-S01 Browser ID-Parity Prerequisite Receipt

```ts
// core/admin/services/solutionKitsClient.ts
export type SolutionKitId =
  | "automotive-workshop"
  | "medical-clinic"
  | "beauty-salon"
  | "local-service-business"
  | "services-directory"
  | "small-ecommerce";

const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "local-service-business",
  "services-directory",
  "small-ecommerce",
];

// core/admin/services/solutionKitSelection.ts
// Keep its runtime storage/event validator strict with the same six local literals.
const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "local-service-business",
  "services-directory",
  "small-ecommerce",
];
```

**Data flow:** network list/detail methods continue to trust their typed `apiRequest` results
and do not invoke the local `isSolutionKitId` validators. An accepted network value bearing
`local-service-business` therefore remains unchanged, while local cached list/detail reads,
the existing plan-response validator, and selection storage/events exercise the strict local
guards. Those guarded seams accept the sixth literal and continue to map unknown values to a
cache miss, the existing plan-response error, or `null` as their public APIs already do. This
repair must not add network list/detail validation.

**Error handling and exact regression suites:**

- In `tests/vitest/admin/solutionKitsClient.coverage.test.ts`, mock valid network list/detail
  responses whose ID is `local-service-business` and assert the typed client returns them
  unchanged. Exercise strict unknown-ID rejection only through the existing cached-list,
  cached-detail, and plan-response validator seams: an unknown cached list is a miss, an
  unknown cached detail falls through and is not returned, and an otherwise-valid plan with an
  unknown recommended ID keeps the existing `Invalid solution kit plan response` error. Do not
  invent unknown network list/detail rejection.
- In `tests/vitest/admin/solutionKitSelection.test.ts`, call
  `setActiveSolutionKitId("local-service-business")`, assert
  `getActiveSolutionKitId()` returns the same literal, and assert the same-tab subscription
  receives it. Seed or dispatch an unknown storage/custom-event ID and assert `null`; do not
  make storage or events permissive.

The TASK-105-08-01 receipt must identify the four exact repaired paths, the individual
Vitest receipts, scoped V8 rows, exact-path ESLint result, `bun --cwd core lint` result, and
`bun run check:admin-boundary` result. It must also retain captured core `lint:types` and
root-TSC exit statuses with zero diagnostics on all four S01 paths, the exact
`SolutionKitCard.tsx` diagnostic containing `"local-service-business"` classified as
`transitional_cross_owner` for `TASK-105-08-05-L03-L01`, scoped and global diff checks,
physical line counts, and the six literal IDs checked against
`core/services/kits/solutionKitTypes.ts`. L03 cannot start from a verbal claim, a stale
pre-repair audit, or an unconditional/global-green typecheck claim.

## Implementation Pseudocode

```tsx
const assistant = vi.hoisted(() => ({ openAssistantPanel: vi.fn() }));
const api = vi.hoisted(() => ({
  listSolutionKitRunsCached: vi.fn(),
  getSolutionKitRunCached: vi.fn(),
  applySolutionKit: vi.fn(),
  rollbackSolutionKit: vi.fn(),
  getCachedSolutionKits: vi.fn(),
  listSolutionKitsCached: vi.fn(),
  getSolutionKitCached: vi.fn(),
}));
vi.mock("@/services/solutionKitsClient", () => api);
vi.mock("@/ui/assistant/assistantPanelEvents", () => assistant);

const view = mountHook("automotive-workshop"); // local createRoot + React.act harness
await React.act(async () => {
  await view.value.apply({ dryRun: true });
});
expect(api.listSolutionKitRunsCached).toHaveBeenLastCalledWith({
  kitId: "automotive-workshop",
  force: true,
});

render(<SolutionKitsPage />);
await user.click(screen.getByRole("button", { name: "Open LLM Guide" }));
expect(assistant.openAssistantPanel).toHaveBeenCalledWith(
  expect.objectContaining({ mode: "llm-guide" })
);
```

**Data flow:** after the validated TASK-105-08-01 parity receipt, use typed cached-client
responses (including synchronous `getCachedSolutionKits`) → await the hook/page's public async
state transitions through the adopted local `createRoot` harness → assert list/detail selection,
forced refresh, retained/cleared selection, error state, mutation result, and visible
reviewed-assistant handoff.

**Error handling:** `useSolutionKitRuns(null)` resets safely; list/detail failures set
their existing errors; apply/rollback failures retain state and clear mutation loading.
When a returned run is absent from the refreshed list, the hook refetches its detail.

**Regression shape:** loading/error/list/detail states, active-kit preference, card
selection, assistant handoff, null-kit reset, list/detail refresh, apply/rollback success
and failure, and latest apply-run derivation. Do not assert an unshipped poll, cancel, or
page-level mutation control.

## Testing Requirements

Run every owned changed/new test one file per Vitest invocation, then the L03 static gates,
root TypeScript attribution with zero L03 diagnostics on the TASK-105-08-05-L03 attribution
row, `git diff --check`, and a physical line-count gate. The separate TASK-105-08-01 parity
prerequisite must complete first and its receipt must include the exact four-path static and
compiler attribution gates below. The expected intermediate `lint:types` and root-TSC
non-zero statuses are captured attribution receipts, not globally green gates:

```bash
# TASK-105-08-01 owns and runs these paths, one file at a time.
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/solutionKitSelection.test.ts

# Scoped V8 evidence for the two repaired browser contracts. Keep it separate from L03's
# four-target UI receipt and do not change permanent coverage configuration.
parity_coverage_dir="$(mktemp -d /tmp/task105-08-01-solution-kit-parity-v8.XXXXXX)"
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$parity_coverage_dir" \
  --coverage.include=core/admin/services/solutionKitsClient.ts \
  --coverage.include=core/admin/services/solutionKitSelection.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts \
  tests/vitest/admin/solutionKitSelection.test.ts
node -e 'const s=require(process.argv[1]); for (const [k,v] of Object.entries(s)) if (k !== "total") console.log(k, v.lines.pct)' \
  "$parity_coverage_dir/coverage-summary.json"

bun --cwd core lint
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/services/solutionKitsClient.ts \
  core/admin/services/solutionKitSelection.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts \
  tests/vitest/admin/solutionKitSelection.test.ts
bun run check:admin-boundary
core_type_log="$(mktemp /tmp/task105-08-01-s01-core-types.XXXXXX.log)"
set +e
bun --cwd core lint:types 2>&1 | tee "$core_type_log"
core_type_status=${PIPESTATUS[0]}
set -e
test "$core_type_status" -ne 0
! grep -F 'admin/services/solutionKitsClient.ts' "$core_type_log"
! grep -F 'admin/services/solutionKitSelection.ts' "$core_type_log"
grep -F 'admin/ui/kits/SolutionKitCard.tsx' "$core_type_log"
grep -F '"local-service-business"' "$core_type_log"

owned_paths=(
  core/admin/services/solutionKitsClient.ts
  core/admin/services/solutionKitSelection.ts
  tests/vitest/admin/solutionKitsClient.coverage.test.ts
  tests/vitest/admin/solutionKitSelection.test.ts
)
root_tsc_log="$(mktemp /tmp/task105-08-01-s01-root-tsc.XXXXXX.log)"
set +e
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false \
  2>&1 | tee "$root_tsc_log"
root_tsc_status=${PIPESTATUS[0]}
set -e
for path in "${owned_paths[@]}"; do ! grep -F "$path" "$root_tsc_log"; done
grep -F 'core/admin/ui/kits/SolutionKitCard.tsx' "$root_tsc_log"
grep -F '"local-service-business"' "$root_tsc_log"

git diff --check -- "${owned_paths[@]}"
git diff --check
wc -l "${owned_paths[@]}"
for path in "${owned_paths[@]}"; do
  lines="$(wc -l < "$path")"
  if (( lines > 1000 )); then
    echo "$path exceeds 1000 physical lines: $lines" >&2
    exit 1
  fi
done
```

The TASK-105-08-01 receipt consumed here must have zero diagnostics attributed to its two
source paths and two direct suites. It must also retain the exact
`core/admin/ui/kits/SolutionKitCard.tsx` path, TypeScript code, and message containing
`"local-service-business"` as `transitional_cross_owner` assigned to L03-L01; it must not call
either intermediate command globally green. The later L03-L01 receipt must clear the same
signature and prove zero diagnostics on both card-owned paths before L03 starts. L03 then
reruns the root command for its own attribution row. A prerequisite-path diagnostic, a missing
or changed transitional signature, a missing V8 row, a missing Admin-boundary result, or a
failed required static/diff/line check blocks L03 and requires the owning leaf to correct its
receipt rather than expand L03's scope.

Before the first L03 test edit, invoke the parent guard with exactly the L03 writer candidates.
The four read-only UI sources and all TASK-105-08-01 parity paths are intentionally absent:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L03", [
  "tests/vitest/kits/use-solution-kit-runs.test.tsx",
  "tests/vitest/kits/use-solution-kits.test.tsx",
  "tests/vitest/ui/solution-kits-page-flow.test.tsx",
  "tests/vitest/ui/solution-kits-page.test.tsx",
  "tests/vitest/ui-integration/solution-kits-restyle.test.tsx",
]);
NODE
```

At handoff, all five declared L03 writer paths must be present in the complete task-attributable
changed set. A non-empty subset is not sufficient. The orchestrator supplies
`l03_task_attributable_paths` from its unfiltered task edit attribution. It is invalid to derive
that array by querying Git only through the five candidates, because that would hide an extra
task-attributable path. The final guard leaves TASK-105-08-01 and L03-L01 paths out of the
allowed set, not out of attribution:

```bash
l03_candidates=(
  tests/vitest/kits/use-solution-kit-runs.test.tsx
  tests/vitest/kits/use-solution-kits.test.tsx
  tests/vitest/ui/solution-kits-page-flow.test.tsx
  tests/vitest/ui/solution-kits-page.test.tsx
  tests/vitest/ui-integration/solution-kits-restyle.test.tsx
)
node --input-type=module - "${l03_task_attributable_paths[@]}" <<'NODE'
import { assertTask105L05FinalTaskAttributablePathsAreExact } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05FinalTaskAttributablePathsAreExact("TASK-105-08-05-L03", {
  attribution: "complete-unfiltered-task-attribution",
  paths: process.argv.slice(2),
});
NODE

wc -l "${l03_candidates[@]}"
for path in "${l03_candidates[@]}"; do
  lines="$(wc -l < "$path")"
  if (( lines > 1000 )); then
    echo "$path exceeds 1000 physical lines: $lines" >&2
    exit 1
  fi
done
```

`--verify` remains structural/status-only. It does not prove parity, coverage, static gates,
or an L03 receipt.

The following aggregate coverage invocation is additional to the one-file-at-a-time
receipts above. It is the only L03 scoped V8 receipt and pins both the four exact UI source
targets and every current direct coverage consumer. It does not substitute for the separate
TASK-105-08-01 browser parity V8 receipt.

~~~bash
coverage_targets=(
  core/admin/ui/kits/SolutionKitCard.tsx
  core/admin/ui/kits/SolutionKitsPage.tsx
  core/admin/ui/kits/hooks/useSolutionKitRuns.ts
  core/admin/ui/kits/hooks/useSolutionKits.ts
)
coverage_tests=(
  tests/vitest/kits/use-solution-kit-runs.test.tsx
  tests/vitest/kits/use-solution-kits.test.tsx
  tests/vitest/ui/solution-kits-page-flow.test.tsx
  tests/vitest/ui/solution-kits-page.test.tsx
  tests/vitest/ui-integration/solution-kits-restyle.test.tsx
)

coverage_dir="$(mktemp -d /tmp/task105-08-05-l03-v8.XXXXXX)"
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
and dirty-worktree status. This may not change permanent coverage configuration or replace
L12's canonical run.

## Fresh Post-Repair Audit Gate

After TASK-105-08-01 changes either browser contract or either direct parity suite, runs its
targeted tests, scoped V8, exact-path ESLint, core lint, Admin-boundary, captured compiler
attribution, diff, and line gates, L03-L01 must consume that handoff, clear the exact
transitional card diagnostic, and return its own validated receipt
plus fresh combined audit. That audit is mandatory before L03 edits begin. It must inspect the
current HEAD and dirty-worktree state, this L03 contract, TASK-105-08-01 ownership, the six-ID
server tuple and catalog, both browser source allowlists, both direct parity suites, the card
repair, the exact five L03 candidates, and the read-only page boundary. It must report concrete
file/line evidence and find no unresolved HIGH or MEDIUM issue. The stale five-ID guards affect
validated local cache, plan-response, and selection seams; network list/detail methods remain
typed pass-throughs and are not newly validated. Any finding requires a corrected owner contract
or repair plus a new audit, never an implicit L03 scope expansion.

## Security Contract

Test-only L03 work. The separate TASK-105-08-01 prerequisite changes only typed browser
allowlists and their strict client-side validation, not an API, auth model, permission rule,
CSRF policy, cache policy, persistence, or rate-limit bucket. The page stays a
session-authorized, read-only catalog/selection surface and opens the existing reviewed
assistant flow. Hook tests may model existing client methods but may not expose their write
capability as a new apply, rollback, cancel, polling, or page control.

## Documentation Updates Required

Return the validated child receipt to the orchestrator. `TASK-105-09` alone writes its
receipt/status in this task file after L12 and changelog 1325; no L03 implementer changes
task status, board, changelog, staging, or commit state. The receipt must include the
TASK-105-08-01 parity-audit handoff reference and exact final L03 collision-guard path set.

## Closure Checklist

- [ ] The page remains read-only aside from the reviewed assistant handoff.
- [ ] L02's validated receipt precedes S01; no receipt or status is inferred from workflow
  registration alone.
- [ ] TASK-105-08-01-S01's receipt proves six-ID browser/server parity, accepted network and
  guarded local round trips, strict unknown-ID rejection only on existing guarded seams, exact
  four-path ESLint/core lint/Admin-boundary results, zero diagnostics on its four owned paths,
  and the exact open `transitional_cross_owner` card diagnostic with captured compiler, diff,
  and line-count receipts.
- [ ] L03-L01 clears that exact card diagnostic in its two owned paths and a fresh combined
  post-repair audit clears the full prerequisite chain before L03 edits.
- [ ] The final L03 writer set is exactly the five declared test paths, not a subset.
- [ ] Hook behavior matches the shipped refresh/apply/rollback API exactly.
- [ ] All four source targets have scoped 100%-line evidence.
- [ ] A fresh root TypeScript run has no L03-owned diagnostics.
- [ ] The L03 receipt permits L04 to start.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-l03-final-20260826/receipt.json` at
  HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`, started strictly after the
  validated S01 four-path receipt and the L03-L01 card clearance.
- Direct: `31/31` tests across exactly the five registered suites
  (`use-solution-kit-runs`, `use-solution-kits`, `solution-kits-page-flow`,
  `solution-kits-page`, `solution-kits-restyle`); scoped V8 reports `100%` lines on
  `SolutionKitCard.tsx` (`6/6`), `SolutionKitsPage.tsx` (`34/34`),
  `useSolutionKitRuns.ts` (`109/109`), and `useSolutionKits.ts` (`28/28`).
- Root TypeScript `PASS_ZERO_L03_DIAGNOSTICS_GLOBAL_NONZERO_UNRELATED`; ESLint,
  core lint/lint:types, admin boundary, collision guards (five-path final set), and
  line caps green (max `537` lines); `browserRuntimeSmoke: not_run` correctly
  deferred to L04.
- Canonical confirmation: the 2026-09-01 whole-lane artifact reports zero uncovered
  lines on every `core/admin/ui/kits/` file.
