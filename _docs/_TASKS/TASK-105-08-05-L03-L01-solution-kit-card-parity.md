# TASK-105-08-05-L03-L01: Solution Kit Card Parity
# FileName: TASK-105-08-05-L03-L01-solution-kit-card-parity.md

**Parent Subtask:** TASK-105-08-05-L03
**Priority:** High
**Category:** UI Correctness + QA
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-05-L02 validated receipt; TASK-105-08-01-S01 validated exact
four-path browser-parity receipt and fresh scoped audit, including zero owned-path root-TSC
attribution and the open transitional `SolutionKitCard.tsx` sixth-ID diagnostic
**Blocks:** TASK-105-08-05-L03
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

Land the missing deterministic visual entry for `local-service-business` in the Admin
`SolutionKitCard` immediately after the separately owned browser ID-parity repair and
immediately before `TASK-105-08-05-L03` starts its test-only solution-kit coverage work.

`SolutionKitCard` imports the browser `SolutionKitId` type. Once
`TASK-105-08-01-S01` adds `local-service-business` to that type and its strict browser
allowlists, the card's `Record<SolutionKitId, KitVisual>` must explicitly map the sixth
literal. This leaf owns that one UI-source repair and one new direct Vitest card suite.
It must neither absorb the browser client/selection repair nor move the source change into
L03's test-only scope.

The S01 receipt consumed here is intentionally scoped, not a claim that global TypeScript is
already clean. It must record the card's missing-sixth-ID diagnostic as
`transitional_cross_owner` for this leaf. This leaf closes that exact open obligation, proves
zero root-TSC diagnostics on both card-owned paths, and returns the only receipt that may
unblock L03 and the final family gate.

The deterministic visual is the current generic-card visual promoted from a fallback to an
explicit typed entry:

```tsx
"local-service-business": {
  icon: Boxes,
  tone: "bg-muted text-muted-foreground",
},
```

The five existing IDs retain their exact current `icon` and `tone` fields. The fallback
constant and `?? FALLBACK_VISUAL` lookup are removed because the `Record` is exhaustive;
there is no `as` cast, permissive union, string widening, or generic fallback path.

## Verified Current-State Anchors

Verified at `18a45f06` in a dirty shared worktree on 2026-08-25:

- `core/services/kits/solutionKitTypes.ts:3-10` is the read-only server authority and has
  six literals, including `local-service-business` at line 7.
- `core/services/kits/solutionKitsCatalog.ts:1385-1407` has the matching read-only
  `Local Service Business` catalog entry.
- `core/admin/services/solutionKitsClient.ts:6-11` currently exposes only five browser
  `SolutionKitId` literals. `TASK-105-08-01-S01` exclusively owns adding the sixth literal
  and its existing strict allowlist at lines 172-187.
- `core/admin/ui/kits/SolutionKitCard.tsx:24-39` owns `KitVisual`, the
  `Record<SolutionKitId, KitVisual>`, the five existing entries, the `Boxes` fallback, and
  `visualFor`. The source is currently 83 physical lines and clean in the verified starting
  status.
- `TASK-105-08-05-L03-solution-kits-coverage.md` reserves browser parity to
  TASK-105-08-01, declares all four UI/hook sources read-only, and makes L03 a test-only
  coverage leaf.
- That L03 contract owns exactly five page/hook/integration test paths. It does not own the
  new direct card path below.
- `tests/vitest/ui/solution-kit-card-parity.test.tsx` does not exist at the verified
  starting point. Existing nearby direct card suites, such as
  `tests/vitest/ui/media-card.test.tsx`, establish `tests/vitest/ui/` as the correct
  Bun-free Admin/UI Vitest lane.

## Naming, Parent, and Land Position

`TASK-105-08-05-L03-L01-solution-kit-card-parity.md` has no exact or case-insensitive
physical collision. Its `L03-L01` shape follows the established nested source-repair names
`TASK-105-08-05-L01-L01-*` and `TASK-105-08-05-L02-L01-*`.

Its immediate physical parent is `TASK-105-08-05-L03`, matching the `L03-L01` ID. It is the
source-repair child that must land **immediately before its parent executes the test-only L03
coverage body**; that parent relationship does not permit L03 to absorb either writer path.
Its required validated-receipt order is:

```text
TASK-105-08-05-L02 validated receipt
  -> TASK-105-08-01-S01 implementation + direct/V8/owned-static receipts
  -> TASK-105-08-01-S01 zero-owned-path compiler attribution + expected open card diagnostic
  -> TASK-105-08-01-S01 fresh scoped audit and validated handoff
  -> TASK-105-08-05-L03-L01 card parity receipt that clears the diagnostic
  -> TASK-105-08-05-L03 test-only solution-kit coverage
  -> TASK-105-08-05-L04 shared runtime smoke
```

Any reconcile receipt issued before this contract-order repair is stale and cannot authorize
implementation. A fresh reconcile must confirm this exact S01-then-card order and the separate
writer scopes before either implementation begins.

### Registered coordination position

The family parent and `_docs/_workflows/task-105-08-05-implement.mjs` register this leaf after
the validated S01 handoff and immediately before the L03 coverage body, with exactly the two
writer paths below. Structural `--verify` must fail on a missing/misordered entry, wrong immediate
parent, or writer-path mismatch. It does not fabricate a receipt, infer one from task status, or
change any status. Implementation remains blocked until the orchestrator has the real L02 and
S01 validated receipts and the fresh scoped audit required here.

This leaf must **not** edit the parent task, L03 contract, workflow, task board, changelog, or
statuses. The existing registration grants only the two-path writer scope below.

## Why L03 Cannot Absorb This Repair

L03 is a test-only consumer after the browser parity receipt. Its contract declares
`SolutionKitCard.tsx` read-only and reserves browser source changes to TASK-105-08-01.
Absorbing the card change there would give a coverage leaf a production writer, conflate the
browser strict-validation fix with a visual mapping, and invalidate its current one-writer
candidate set.

After the browser type gains the sixth literal, TypeScript must force this card mapping to
be complete. This repair is intentionally separate so that it restores the UI's exhaustive
render contract before L03 measures page and hook coverage. L03 may then consume the fixed
card and its direct regression without editing either owned path.

## Exact Single-Writer Scope

### Production writer

- `core/admin/ui/kits/SolutionKitCard.tsx`

### New direct Vitest UI test writer

- `tests/vitest/ui/solution-kit-card-parity.test.tsx`

The final writer set is exactly those two paths. `SolutionKitCard.tsx` is currently 83
physical lines, and the new direct suite must remain at or below 1,000 physical lines.
The final source file must also remain at or below 1,000 physical lines.

All other paths are read-only, including:

- `core/admin/services/solutionKitsClient.ts` and
  `core/admin/services/solutionKitSelection.ts`;
- `tests/vitest/admin/solutionKitsClient.coverage.test.ts` and
  `tests/vitest/admin/solutionKitSelection.test.ts`;
- `core/services/kits/solutionKitTypes.ts` and
  `core/services/kits/solutionKitsCatalog.ts`;
- `core/admin/ui/kits/SolutionKitsPage.tsx`,
  `core/admin/ui/kits/hooks/useSolutionKitRuns.ts`, and
  `core/admin/ui/kits/hooks/useSolutionKits.ts`;
- `tests/vitest/kits/use-solution-kit-runs.test.tsx`,
  `tests/vitest/kits/use-solution-kits.test.tsx`,
  `tests/vitest/ui/solution-kits-page-flow.test.tsx`,
  `tests/vitest/ui/solution-kits-page.test.tsx`, and
  `tests/vitest/ui-integration/solution-kits-restyle.test.tsx`;
- every route, server, manifest, cache policy, schema, migration, task/board/changelog,
  workflow, runtime-smoke, coverage-configuration, staging, and commit path.

## Exact Collision-Guard Candidates

The exact candidate set already registered by the coordination workflow is:

```bash
card_parity_candidates=(
  "core/admin/ui/kits/SolutionKitCard.tsx"
  "tests/vitest/ui/solution-kit-card-parity.test.tsx"
)
```

The standard family guard must receive exactly that set before editing and again against the
final changed set:

```bash
node --input-type=module - <<'NODE'
import { assertTask105L05CandidatePathsAreCollisionFree } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05CandidatePathsAreCollisionFree("TASK-105-08-05-L03-L01", [
  "core/admin/ui/kits/SolutionKitCard.tsx",
  "tests/vitest/ui/solution-kit-card-parity.test.tsx",
]);
NODE
```

An unknown-leaf result, parent mismatch, missing path, extra path, or overlapping writer claim
is a hard failure. Verify the production path is clean, the test path is absent/unclaimed,
capture the shared-tree status before editing, and stop on any collision. Neither the L03 test
candidates nor the TASK-105-08-01 browser parity paths are candidates for this leaf.

At handoff, both declared card writer paths must be present in the complete task-attributable
changed set. A non-empty subset is not sufficient. The orchestrator supplies
`card_parity_task_attributable_paths` from its unfiltered task edit attribution. It is invalid
to derive that array by querying Git only through the two candidates, because that would hide an
extra task-attributable path. The final guard leaves S01 and L03 paths out of the allowed set,
not out of attribution:

```bash
node --input-type=module - "${card_parity_task_attributable_paths[@]}" <<'NODE'
import { assertTask105L05FinalTaskAttributablePathsAreExact } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05FinalTaskAttributablePathsAreExact("TASK-105-08-05-L03-L01", {
  attribution: "complete-unfiltered-task-attribution",
  paths: process.argv.slice(2),
});
NODE
```

This guard proves exactly both registered writer paths and fails on any missing, duplicate, extra,
foreign-claimed, or externally guarded task-attributable path. It is receipt-only: it does not
infer or edit status, and it cannot bypass the registered `S01 -> L03-L01 -> L03` order.

## Implementation Pseudocode

### Ordered handoff pseudocode

```text
1. Consume the fresh S01 four-path receipt before editing either card-owned path.
2. Verify that receipt has zero diagnostics on all four S01 paths and records the exact
   SolutionKitCard.tsx path/code/message for the missing local-service-business member as
   transitional_cross_owner assigned to this leaf.
3. Add the explicit sixth visual, remove only the now-dead fallback, and add the direct public
   rendered-card regression in the exact two owned paths.
4. Run direct Vitest, scoped V8, exact-path ESLint, core lint:types, and core lint.
5. Run root TSC and prove both card-owned paths have zero diagnostics and the recorded
   missing-sixth-ID card diagnostic is absent.
6. Return the validated card receipt and fresh combined audit; only then may L03 start.
```

```tsx
// `Boxes` is already imported. Keep the five existing entries byte-for-byte in meaning.
const KIT_VISUALS: Record<SolutionKitId, KitVisual> = {
  "automotive-workshop": { icon: Car, tone: "bg-warning-soft text-warning" },
  "medical-clinic": { icon: Stethoscope, tone: "bg-info-soft text-info" },
  "beauty-salon": { icon: Scissors, tone: "bg-primary-soft text-primary" },
  "local-service-business": { icon: Boxes, tone: "bg-muted text-muted-foreground" },
  "services-directory": { icon: ListChecks, tone: "bg-success-soft text-success" },
  "small-ecommerce": { icon: ShoppingBag, tone: "bg-primary-soft text-primary" },
};

// Delete FALLBACK_VISUAL. The exhaustive typed record supplies the one valid visual.
const visualFor = (id: SolutionKitId): KitVisual => KIT_VISUALS[id];
```

**Data flow:** the validated browser client preserves a server-issued
`local-service-business` literal as `SolutionKitId` -> `SolutionKitsPage` supplies a typed
summary -> `SolutionKitCard` indexes its exhaustive visual record -> the public card renders
the explicit `Boxes` icon and muted tone -> its existing `onSelect` callback receives the
same typed literal.

**Error handling:** no new catch, fallback, or unknown-ID acceptance is added. Strict
unknown-ID rejection remains solely in the TASK-105-08-01 browser client and selection
validators. Once its type is widened to six valid literals, the exhaustive `Record` makes an
omitted card visual a compile-time error instead of silently rendering a generic fallback.

**Preservation requirements:** retain the existing card markup, active-card styling, badge,
button wording, module badges, callback signature, all five existing visual mappings, and
all existing `KitVisual` fields. Do not add a test-only export, data attribute, private
visual resolver seam, `as` assertion, index-signature escape hatch, optional record key, or
fallback branch.

### Direct rendered-card regression shape

Create one focused `// @vitest-environment happy-dom` suite in the owned path. Use a typed
`SolutionKitSummary` fixture whose literal `id` is `"local-service-business"` without a
cast. Mount the exported public `SolutionKitCard` through a local `createRoot` and
`React.act` harness, registering roots/containers for `afterEach` cleanup.

The regression must:

1. render the sixth card inactive and visibly assert its title, short description,
   recommended-module label, `Select kit` button, `lucide-boxes` icon output, and the exact
   `bg-muted text-muted-foreground` tone on the icon container;
2. dispatch the public select button click and assert the callback receives exactly
   `"local-service-business"`;
3. re-render the same typed kit active and assert the existing `Selected` badge and active
   visual state; and
4. use no private helper import or cast to fabricate an unknown/invalid ID.

Rendering both active states and dispatching the click covers the exported component's real
public behavior, including the existing callback path, rather than asserting the private
record directly. It also supplies the direct proof that the sixth browser-valid ID now has a
rendered card.

## Security Contract

No route or endpoint changes. This is an internal Admin UI presentation repair only:

- **Visibility:** no new public or internal endpoint.
- **Auth/RBAC:** existing session-authorized Solution Kits page behavior is unchanged.
- **CSRF/rate limit:** no write request is added, so existing route CSRF and rate-limit
  policies remain untouched.
- **Validation/anti-abuse:** this card accepts the existing typed summary prop only; strict
  unknown browser IDs remain rejected by the separately owned client/selection validators.
- **Secrets/privacy:** do not add browser storage, logging, credentials, user data, or
  debug payloads.

## Validation Requirements

Do not begin source edits until L02 supplies its validated receipt, TASK-105-08-01-S01 then
supplies its validated exact four-path receipt and fresh scoped audit, and workflow `--verify`
confirms the exact order, immediate parent, and collision candidates above. The S01 receipt must
prove zero root-TSC
diagnostics on all four S01-owned paths and preserve the exact `SolutionKitCard.tsx`
path/code/message for the missing `"local-service-business"` member as
`transitional_cross_owner` assigned to this leaf. A missing signature, a different card
diagnostic, or a receipt that calls the compiler globally green is contract drift and blocks
editing here.

This leaf owns no browser/runtime smoke and must not create a task-local smoke runner;
`TASK-105-08-05-L04` remains the family-wide shared runtime-smoke owner.

Run the direct owned UI suite first:

```bash
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi
export TMPDIR=/tmp
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/ui/solution-kit-card-parity.test.tsx
```

Run an isolated V8 receipt that includes only the repaired card source and the one direct
suite. Do not modify permanent coverage configuration. The parsed row for the source must
exist and report exactly `100` line coverage:

```bash
card_coverage_dir="$(mktemp -d /tmp/task105-08-05-l03-l01-card-v8.XXXXXX)"
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage \
  --coverage.provider=v8 \
  --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$card_coverage_dir" \
  --coverage.include=core/admin/ui/kits/SolutionKitCard.tsx \
  tests/vitest/ui/solution-kit-card-parity.test.tsx
node - "$card_coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const target = "core/admin/ui/kits/SolutionKitCard.tsx";
const key = Object.keys(summary).find((candidate) => candidate.endsWith(target));
const lines = key ? summary[key]?.lines?.pct : null;
console.log(JSON.stringify({ target, key: key ?? null, lines }, null, 2));
if (key === undefined || lines !== 100) process.exit(1);
NODE
```

Run explicit static gates on both owned paths. Core `lint:types` must now exit zero, proving
that the open S01 card diagnostic has been repaired at the core project boundary:

```bash
card_owned_paths=(
  core/admin/ui/kits/SolutionKitCard.tsx
  tests/vitest/ui/solution-kit-card-parity.test.tsx
)

./node_modules/.bin/eslint --max-warnings=0 \
  "${card_owned_paths[@]}"
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
```

Run root TypeScript as a captured attribution gate. It must have zero diagnostics on both
card-owned paths and no remaining diagnostic matching the S01 handoff's
`SolutionKitCard.tsx` plus `"local-service-business"` signature:

```bash
card_owned_paths=(
  core/admin/ui/kits/SolutionKitCard.tsx
  tests/vitest/ui/solution-kit-card-parity.test.tsx
)

root_tsc_log="$(mktemp /tmp/task105-08-05-l03-l01-root-tsc.XXXXXX.log)"
set +e
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false \
  2>&1 | tee "$root_tsc_log"
root_tsc_status=${PIPESTATUS[0]}
set -e

for path in "${card_owned_paths[@]}"; do
  if grep -F "$path" "$root_tsc_log" >/dev/null; then
    echo "card-owned TypeScript diagnostic: $path" >&2
    exit 1
  fi
done

if grep -F "core/admin/ui/kits/SolutionKitCard.tsx" "$root_tsc_log" | \
  grep -F '"local-service-business"' >/dev/null; then
  echo "S01 transitional sixth-ID diagnostic was not cleared" >&2
  exit 1
fi
printf 'root_tsc_status=%s expected_card_diagnostic=cleared\n' "$root_tsc_status"

git diff --check -- "${card_owned_paths[@]}"
git diff --check
wc -l "${card_owned_paths[@]}"
for path in "${card_owned_paths[@]}"; do
  lines="$(wc -l < "$path")"
  if (( lines > 1000 )); then
    echo "$path exceeds 1000 physical lines: $lines" >&2
    exit 1
  fi
done
```

Existing root-TSC diagnostics outside this exact two-path attribution must retain their current
owner and must not be silently waived or misreported as a globally clean run. Any diagnostic on
either card path, or any survival of the expected sixth-ID card signature, blocks this receipt.
Record the direct Vitest argv, V8 summary path and parsed row, ESLint/core lint/type results,
root-TSC exit status and zero-path attribution, explicit diagnostic-clearance result, final
collision set, line counts, scoped/global `git diff --check`, HEAD, and dirty-worktree status in
the handoff.

## Fresh Post-Implementation Audit

After the source/test changes and all required static/targeted receipts, obtain a fresh-context,
read-only audit against the current HEAD and dirty worktree. It must inspect:

- the validated TASK-105-08-01-S01 browser type and strict allowlists, its zero four-path
  compiler attribution, and its exact open transitional card diagnostic;
- the six-ID server tuple and matching catalog entry;
- the final two-path diff and exact collision-guard registration;
- `SolutionKitCard`'s six-entry exhaustive record, absence of a fallback/cast/widened union,
  and preservation of each pre-existing visual field;
- the public direct card regression and its V8/ESLint/core lint/type/root-TSC receipts,
  including zero diagnostics on both card paths and explicit clearance of the S01 signature;
- L03's retained test-only ownership and the required pre-L03 land position; and
- source/test physical line caps, unexpected file changes, and security invariants.

The audit must report concrete file/line evidence and leave no unresolved HIGH or MEDIUM
finding. It is the fresh combined post-S01/post-card authority that replaces the now-stale
S01-only audit for final-family use. Any finding is fixed in the owning scope, revalidated, and
followed by a fresh audit; it never authorizes L03 to edit this leaf's source or test. L03 and
the final family gate remain blocked until this audit and the complete card receipt exist.

## Documentation and Handoff Boundaries

Return the validated receipt and the workflow structural-verification result to the
orchestrator. The implementer does not change task status, task board, changelog, workflow,
source-of-truth documentation, staging, or commit state. `TASK-105-09` remains the final
family documentation/closure owner. The receipt must carry forward the S01 diagnostic
path/code/message and show its absence after this repair; a generic "types passed" statement
is insufficient.

## Closure Checklist

- [ ] TASK-105-08-01-S01 has a validated exact four-path six-ID browser-parity receipt and a
  fresh scoped audit that records zero owned-path diagnostics plus the exact open transitional
  card diagnostic assigned to this leaf.
- [ ] Workflow structural verification confirms this leaf's immediate L03 parent, position
  after S01 and before the L03 coverage body, and its two exact collision candidates without
  fabricating receipts or changing statuses.
- [ ] `SolutionKitCard` maps `local-service-business` to `Boxes` plus
  `bg-muted text-muted-foreground` and preserves all existing visual fields.
- [ ] No fallback, `as` cast, index-signature escape hatch, or union weakening remains.
- [ ] One direct public happy-dom rendered-card suite proves the sixth ID renders and selects.
- [ ] Direct Vitest, 100%-line scoped V8, explicit ESLint, core lint/types, diff, collision,
  and line-count receipts pass.
- [ ] Root TSC attributes zero diagnostics to both card-owned paths and contains no surviving
  `SolutionKitCard.tsx` missing-`local-service-business` diagnostic from the S01 receipt.
- [ ] A fresh combined post-implementation audit has no unresolved HIGH or MEDIUM finding.
- [ ] L03 receives the fixed card as read-only input and the final family/L03 gate opens only
  after this complete receipt; the S01 receipt alone never authorizes L03.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-card-final-20260825/receipt.json` at
  HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`, consuming the validated S01
  four-path receipt.
- Explicit `local-service-business` `Boxes`/muted-tone mapping added, redundant
  generic fallback removed, five existing mappings/markup/callback preserved; direct
  public DOM regression `1/1` (`solution-kit-card-parity.test.tsx`); scoped V8
  `SolutionKitCard.tsx` at `100%` lines.
- The exact S01 `transitional_cross_owner` signature is cleared: no root-TSC
  diagnostic remains for `SolutionKitCard.tsx` containing `local-service-business`
  (root exit `2` from unrelated shared-worktree diagnostics only, zero on both owned
  paths); unfiltered L03 attribution and final collision guard pass.
- Post-audit recorded in the receipt: `PASS` / `CLEAN`, `0 HIGH / 0 MEDIUM / 0 LOW`.
