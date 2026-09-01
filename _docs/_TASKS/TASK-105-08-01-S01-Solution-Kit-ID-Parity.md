# TASK-105-08-01-S01: Solution Kit ID Parity
# FileName: TASK-105-08-01-S01-Solution-Kit-ID-Parity.md

**Parent Subtask:** TASK-105-08-01
**Priority:** High
**Category:** Correctness + QA
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-05-L02 validated receipt; current TASK-105-08-01
browser-service ownership; clean exact four-path collision receipt
**Blocks:** TASK-105-08-05-L03-L01; TASK-105-08-05-L03 remains blocked until the separate
card-parity receipt is complete
**Status:** ✅ Done
**Completed:** 2026-09-01

---

## Overview

Repair the verified browser/server solution-kit ID drift without coupling the Admin SPA to
server modules. The authoritative server tuple contains six IDs, including
`local-service-business`, while the browser type and each of its two local strict validator
allowlists currently contain only five.

This is a narrow present-contract repair. Add the missing literal to the typed browser union
and to the two existing local allowlists, then prove accepted list/detail and selection
round trips while preserving strict rejection of unknown IDs. Do not refactor validator
ownership or widen any validator to arbitrary strings.

## Why This Blocks TASK-105-08-05-L03

`TASK-105-08-05-L03` tests the Solution Kits page and hooks as consumers of the browser
client. The server can already return the authoritative `local-service-business` catalog
entry. Until the browser union and both local guards accept that ID, a valid server-owned
catalog value can be discarded by browser cache or selection validation, and L03 would be
testing a stale five-ID client contract.

The executable order is strict: after the validated TASK-105-08-05-L02 receipt, this child
lands its exact four-path implementation, direct Vitest, scoped V8, owned static gates,
compiler-attribution receipts, and fresh scoped audit. `TASK-105-08-05-L03-L01` then consumes
that validated handoff, repairs the card, and proves the transitional diagnostic is gone. Only
that card receipt may unblock L03.

This child does not own `SolutionKitCard.tsx`. Its current exhaustive
`Record<SolutionKitId, KitVisual>` necessarily becomes incomplete when the browser union gains
the sixth ID. The resulting `SolutionKitCard.tsx` diagnostic is a required transitional
cross-owner diagnostic in this child's `lint:types` and root-TSC attribution receipts. Those
receipts must prove zero diagnostics on the two production paths for core `lint:types` and all
exact four owned paths for root TSC, capture the card diagnostic's path/code/message, and
assign it to `TASK-105-08-05-L03-L01`. The diagnostic is
not waived, not unrelated baseline noise, and not permission to call either compiler command
globally green. The card must not be repaired before this scoped receipt. L03 remains blocked
until the separate card owner clears the diagnostic and returns its own validated receipt.

Any reconcile receipt issued before this contract-order repair is stale and cannot authorize
implementation. A fresh reconcile must validate this S01-first handoff before source editing.

## Verified Current-State Anchors

Verified on 2026-08-25 at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`
with a dirty shared worktree:

- `core/services/kits/solutionKitTypes.ts:3-10` is the read-only authority. Its six-ID
  `solutionKitIds` tuple includes `local-service-business` at line 7.
- `core/services/kits/solutionKitsCatalog.ts:1384-1407` contains the matching read-only
  catalog definition, with `id: "local-service-business"` at line 1385.
- `core/admin/services/solutionKitsClient.ts:6-11` owns the browser `SolutionKitId` union
  and currently omits the sixth ID.
- `core/admin/services/solutionKitsClient.ts:172-187` owns the first local strict
  allowlist and `isSolutionKitId` guard.
- `core/admin/services/solutionKitsClient.ts:208-222` composes that guard into list and
  detail validators. `core/admin/services/solutionKitsClient.ts:318-322` attaches those
  validators to local cache reads.
- `core/admin/services/solutionKitsClient.ts:232-239` also applies the same strict guard to
  `SiteBuilderPlanOutput.recommendedKitId`, and
  `core/admin/services/solutionKitsClient.ts:396-411` rejects an invalid
  `previewSolutionKitPlan` response with `Invalid solution kit plan response`.
- `core/admin/services/solutionKitSelection.ts:13-27` owns the second local strict
  allowlist and guard.
- `core/admin/services/solutionKitSelection.ts:32-80` applies that guard to localStorage,
  storage events, and custom events.
- `tests/vitest/admin/solutionKitsClient.coverage.test.ts:185-203` provides the real local
  cache validation seam. Existing list and detail suites begin at lines 223 and 250.
- `tests/vitest/admin/solutionKitsClient.coverage.test.ts:276-305` owns the existing
  `previewSolutionKitPlan` accepted-response and invalid-response assertions.
- `tests/vitest/admin/solutionKitSelection.test.ts:16-39` covers preference and same-tab
  event round trips. Its current unknown storage-event assertion is at lines 134-148.
- `_docs/_TASKS/TASK-105-08-01-admin-services-and-utils.md:82-106` gives
  TASK-105-08-01 sole writer ownership of both browser modules and their direct admin
  suites.
- `_docs/_TASKS/TASK-105-08-05-L03-solution-kits-coverage.md:37-53` reserves these exact
  four repair paths to TASK-105-08-01 and forbids L03 from absorbing the repair.

## Naming and Contract-Drift Decision

The filename `TASK-105-08-01-S01-Solution-Kit-ID-Parity.md` had no exact or
case-insensitive physical collision when authored. The `S01` suffix is acceptable under
`AGENTS.md:134-149`: it is zero-padded, uses the optional deeper-subtask suffix, uses a
hyphenated physical-child slug, and declares its parent explicitly. No earlier physical
`-S01-` file was found, but the documented naming rule does not require a precedent.

## Cross-Contract Boundaries and Transitional Handoff

The following cross-contract boundaries define the authorized repair and its transitional handoff:

1. `_docs/_TASKS/TASK-105-08-01-admin-services-and-utils.md:20-45` explicitly carves out
   `TASK-105-08-01-S01` as the parent's sole bounded production exception. While active, S01
   exclusively owns exactly four paths: two browser production modules and two direct admin
   suites. Production edits are limited to adding the sixth solution-kit literal to the existing
   browser union and allowlists. The parent remains `🚧 In Progress`; S01 must not edit the parent
   or any other path, and all existing strict-validation, browser-boundary, and unchanged
   security, cache, and API contracts remain in force.
2. `_docs/_TASKS/TASK-105-08-05-L03-solution-kits-coverage.md:132-148` documents the current
   semantics: network list/detail methods are typed pass-throughs and do not invoke the local
   `isSolutionKitId` validators. Strict validation applies at the existing cached list/detail
   read seams and the planner response seam for `recommendedKitId`; selection storage and event
   handling retain their own strict guard. The repair brings those existing strict cached,
   planner, and selection boundaries to the authoritative six-ID set, including
   `local-service-business`, while preserving their fail-closed handling of unknown IDs. S01 must
   not add network list/detail validation or otherwise widen its source scope. L03 consumes the
   validated behavior without widening its own scope.
3. `core/admin/ui/kits/SolutionKitCard.tsx:29-39` declares an exhaustive
   `Record<SolutionKitId, KitVisual>` with only the current five literals. Expanding the union
   exposes a cross-owner TypeScript failure there. The card is outside TASK-105-08-01's
   browser-service ownership. This child must capture that exact causal diagnostic as a live
   transitional handoff to `TASK-105-08-05-L03-L01`, without editing the card, waiving the
   diagnostic, calling it unrelated, or requiring the card repair before the S01 scoped
   receipt is complete.

## Exact Single-Writer Scope

### Production writers

Only these production paths may change:

1. `core/admin/services/solutionKitsClient.ts`
2. `core/admin/services/solutionKitSelection.ts`

The only allowed production edits are:

- add `"local-service-business"` to the `SolutionKitId` union in
  `solutionKitsClient.ts`;
- add the same literal to the existing `solutionKitIds` array in
  `solutionKitsClient.ts`;
- add the same literal to the existing `solutionKitIds` array in
  `solutionKitSelection.ts`.

Do not rename, export, relocate, deduplicate, or otherwise refactor these local validators.
The deliberate duplication preserves the browser-only boundary and keeps this repair
independent from server/runtime imports.

### Direct test writers

Only these direct suites may change:

1. `tests/vitest/admin/solutionKitsClient.coverage.test.ts`
2. `tests/vitest/admin/solutionKitSelection.test.ts`

Do not add a third suite, shared fixture, snapshot, manifest fixture, or permanent coverage
configuration change.

### Read-only authority and forbidden paths

All other files are read-only, including:

- `core/services/kits/solutionKitTypes.ts`;
- `core/services/kits/solutionKitsCatalog.ts`;
- every solution-kit manifest, route, server, cache-policy, and persistence module;
- `core/admin/ui/kits/SolutionKitCard.tsx`, which requires its own named source-repair owner;
- `_docs/_TASKS/TASK-105-08-01-admin-services-and-utils.md`;
- `_docs/_TASKS/TASK-105-08-05-L03-solution-kits-coverage.md`;
- `_docs/_TASKS/README.md` and every board/status file;
- `_docs/_CHANGELOG/**`;
- `_docs/_workflows/**`;
- test manifests, runner manifests, package manifests, and lockfiles.

The implementer must not stage or commit. Return a scoped receipt to the orchestrator.

## Implementation Pseudocode

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
// Keep this local browser validator strict and byte-for-byte aligned by literal value.
const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "local-service-business",
  "services-directory",
  "small-ecommerce",
];
```

```ts
// tests/vitest/admin/solutionKitsClient.coverage.test.ts
const localServiceSummary = summary({
  id: "local-service-business",
  title: "Local Service Business",
});
const localServiceDefinition = definition({
  id: "local-service-business",
  title: "Local Service Business",
});

// Accepted network list/detail behavior remains unchanged and the detail argument type-checks.
apiRequest.mockResolvedValueOnce({ items: [localServiceSummary] });
await expect(listSolutionKits()).resolves.toEqual([localServiceSummary]);
apiRequest.mockResolvedValueOnce(localServiceDefinition);
await expect(getSolutionKit("local-service-business")).resolves.toEqual(
  localServiceDefinition
);

// The existing preview validator accepts the sixth ID and still rejects an otherwise-valid
// response whose recommendedKitId is unknown.
const localServicePlan = planOutput({
  recommendedKitId: "local-service-business",
  recommendations: [
    { kitId: "local-service-business", score: 0.9, reasons: ["local services"] },
  ],
});
apiRequest.mockResolvedValueOnce(localServicePlan);
await expect(
  previewSolutionKitPlan({ businessType: "custom", goals: [], locale: "pl" })
).resolves.toEqual(localServicePlan);

apiRequest.mockResolvedValueOnce(planOutput({ recommendedKitId: "unknown-kit" }));
await expect(
  previewSolutionKitPlan({ businessType: "custom", goals: [], locale: "pl" })
).rejects.toThrow("Invalid solution kit plan response");

// Accepted local cached list/detail values pass the existing strict validators.
writeLocalCache(cacheKeys.solutionKitsList, [localServiceSummary]);
expect(getCachedSolutionKits()).toEqual([localServiceSummary]);
writeLocalCache(
  cacheKeys.solutionKitDetail("local-service-business"),
  localServiceDefinition
);
await expect(getSolutionKitCached("local-service-business")).resolves.toEqual(
  localServiceDefinition
);

// Unknown local cached list/detail IDs remain rejected.
clearSolutionKitsCache(); // Clear the accepted list from the real in-memory/local cache seam.
writeLocalCache(cacheKeys.solutionKitsList, [summary({ id: "unknown-kit" })]);
expect(getCachedSolutionKits()).toBeNull();
writeLocalCache(
  cacheKeys.solutionKitDetail("local-service-business"),
  definition({ id: "unknown-kit" })
);
apiRequest.mockRejectedValueOnce(new Error("detail cache rejected"));
await expect(getSolutionKitCached("local-service-business")).rejects.toThrow(
  "detail cache rejected"
);
```

```ts
// tests/vitest/admin/solutionKitSelection.test.ts
const listener = vi.fn();
const unsubscribe = subscribeActiveSolutionKitId(listener);
try {
  setActiveSolutionKitId("local-service-business");
  expect(window.localStorage.getItem("coderso.solutionKits.activeKit.v1")).toBe(
    "local-service-business"
  );
  expect(getActiveSolutionKitId()).toBe("local-service-business");
  expect(listener).toHaveBeenLastCalledWith("local-service-business");

  window.dispatchEvent(
    new CustomEvent("coderso:solution-kit-selection", {
      detail: { kitId: "local-service-business" },
    })
  );
  expect(listener).toHaveBeenLastCalledWith("local-service-business");

  window.localStorage.setItem("coderso.solutionKits.activeKit.v1", "unknown-kit");
  expect(getActiveSolutionKitId()).toBeNull();
  window.dispatchEvent(
    new CustomEvent("coderso:solution-kit-selection", {
      detail: { kitId: "unknown-kit" },
    })
  );
  expect(listener).toHaveBeenLastCalledWith(null);
} finally {
  unsubscribe();
}
```

Use the existing builders and cache mock. Keep assertions behavior-focused. Do not expose a
private validator merely to test it.

### Ordered implementation and receipt pseudocode

```text
1. Verify the exact four owned paths are collision-free.
2. Add the sixth literal only in the three owned browser union/allowlist positions.
3. Add accepted and unknown-ID regressions only in the two owned direct suites.
4. Run both direct Vitest suites, then the exact two-source scoped V8 receipt.
5. Run exact-path ESLint, core lint, and the Admin-boundary gate as normal pass/fail gates.
6. Run core lint:types and root TSC as captured attribution commands.
7. Require zero core lint:types diagnostics on both production writers and zero root-TSC
   diagnostics on all four S01-owned paths; record the expected SolutionKitCard.tsx
   missing-sixth-ID diagnostic as transitional_cross_owner.
8. Obtain a fresh S01-scoped audit and hand the validated receipt to L03-L01.
9. Do not authorize L03 until L03-L01 repairs the card and clears that exact diagnostic.
```

## Data Flow and Error Handling

1. The server-owned six-ID tuple and catalog remain read-only.
2. A list/detail value with `id: "local-service-business"` crosses the existing
   `apiRequest` boundary and remains typed as `SolutionKitId` in browser consumers.
3. The same value passes the existing local cached-list and cached-detail validators.
4. The existing `previewSolutionKitPlan` validator accepts the same literal as
   `recommendedKitId` and rejects an otherwise-valid payload carrying an unknown ID.
5. Selection writes the accepted literal to the canonical localStorage key, reads it back,
   and emits it through the existing canonical and legacy same-tab custom events.
6. An unknown cached list ID is treated as a cache miss. An unknown cached detail ID is not
   returned and falls through to the existing network path. Unknown stored, storage-event,
   or custom-event IDs map to `null`.
7. No new fallback, coercion, normalization, arbitrary-string acceptance, or network error
   mapping is introduced.

## Regression-Test Shape

`tests/vitest/admin/solutionKitsClient.coverage.test.ts` must prove all of the following:

- an accepted list response containing `local-service-business` is returned unchanged;
- accepted detail retrieval type-checks with `getSolutionKit("local-service-business")` and
  returns the existing response shape;
- accepted cached list and detail payloads survive the existing strict local validators;
- an unknown cached list ID is rejected as a miss;
- an unknown cached detail ID is rejected and cannot be returned as the requested kit;
- `previewSolutionKitPlan` accepts an otherwise-valid response whose `recommendedKitId` is
  `local-service-business`;
- `previewSolutionKitPlan` rejects an otherwise-valid response whose `recommendedKitId` is
  an unknown string with the existing `Invalid solution kit plan response` error;
- cache keys, TTL ownership, cache publication, endpoint paths, and HTTP options are
  unchanged.

`tests/vitest/admin/solutionKitSelection.test.ts` must prove all of the following:

- `setActiveSolutionKitId("local-service-business")` writes and reads the same literal;
- the same-tab subscription receives the accepted literal through existing custom events;
- an explicitly dispatched accepted canonical custom event round-trips the same literal;
- unknown canonical storage and custom-event values map to `null`;
- legacy key/event support and unsubscribe behavior remain intact.

## Security Contract

This task changes no route and creates no endpoint.

- **Endpoint visibility:** unchanged internal admin solution-kit endpoints.
- **Authentication and RBAC:** unchanged. No auth, session, role, permission, or scope edit.
- **CSRF:** unchanged. This task adds no write request and changes no request options.
- **Rate limiting and anti-abuse:** unchanged. No public write, nonce, signature, HMAC, or
  CAPTCHA path is involved.
- **Validation:** both browser allowlists remain explicit and fail closed for unknown IDs.
- **Cache and persistence:** no cache key, TTL, invalidation, localStorage key, database,
  schema, migration, or persistence-policy change.
- **Boundary:** no direct import from `core/services/kits/**`, `core/server/**`, or
  `core/db/**` may be added to either browser module or direct suite.

## Collision and Scope Gates

Run this before implementation. The exact four writer paths must be clean so this task does
not overwrite another active stream:

```bash
owned_paths=(
  core/admin/services/solutionKitsClient.ts
  core/admin/services/solutionKitSelection.ts
  tests/vitest/admin/solutionKitsClient.coverage.test.ts
  tests/vitest/admin/solutionKitSelection.test.ts
)

collision_output="$(git status --short -- "${owned_paths[@]}")"
if [[ -n "$collision_output" ]]; then
  printf '%s\n' "$collision_output" >&2
  exit 1
fi
```

At handoff, all four and only these four owned paths must appear in the complete task-attributable
changed set. The orchestrator supplies `parity_task_attributable_paths` from its unfiltered task
edit attribution. It is invalid to construct that array by querying Git only through
`${owned_paths[@]}`, because doing so would hide an extra task-attributable path:

```bash
node --input-type=module - "${parity_task_attributable_paths[@]}" <<'NODE'
import { assertTask105L05FinalTaskAttributablePathsAreExact } from "./_docs/_workflows/task-105-08-05-implement.mjs";

assertTask105L05FinalTaskAttributablePathsAreExact("TASK-105-08-01-S01", {
  attribution: "complete-unfiltered-task-attribution",
  paths: process.argv.slice(2),
});
NODE
```

Record `git status --short` before and after the work. Review the final patch to confirm no
L03, parent, board, changelog, status, workflow, manifest, server, or runner file was edited
by this task. Any collision or concurrent change to an owned path stops implementation and
returns to the orchestrator.

## Required Validation Gates

Do not run browser automation or runtime smoke. This is a Bun-free Admin service contract
owned by Vitest.

Load the repository environment only when present, then run each direct suite separately:

```bash
export TMPDIR=/tmp
if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi

NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/solutionKitSelection.test.ts
```

Run one scoped V8 receipt for exactly the two browser modules and both direct suites. Both
source rows must exist and report `100` percent lines. Do not change permanent coverage
configuration:

```bash
parity_coverage_dir="$(mktemp -d /tmp/task105-08-01-s01-v8.XXXXXX)"
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$parity_coverage_dir" \
  --coverage.include=core/admin/services/solutionKitsClient.ts \
  --coverage.include=core/admin/services/solutionKitSelection.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts \
  tests/vitest/admin/solutionKitSelection.test.ts

node - "$parity_coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const targets = [
  "core/admin/services/solutionKitsClient.ts",
  "core/admin/services/solutionKitSelection.ts",
];
const keys = Object.keys(summary).filter((key) => key !== "total");
const rows = targets.map((target) => {
  const key = keys.find((candidate) => candidate.endsWith(target));
  return { target, key: key ?? null, lines: key ? summary[key]?.lines?.pct : null };
});
console.log(JSON.stringify(rows, null, 2));
if (rows.some((row) => row.key === null || row.lines !== 100)) process.exit(1);
NODE
```

Run the S01-owned static gates after the direct and V8 receipts. Each command below is a
normal pass/fail gate and must exit zero:

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/services/solutionKitsClient.ts \
  core/admin/services/solutionKitSelection.ts \
  tests/vitest/admin/solutionKitsClient.coverage.test.ts \
  tests/vitest/admin/solutionKitSelection.test.ts
bun --cwd core lint
bun run check:admin-boundary
```

Then run core `lint:types` as a captured attribution command. At this strict intermediate land
point, its expected non-zero status must be caused by the still-unrepaired exhaustive card
record. The receipt must show zero diagnostics on the two S01-owned production paths and must
retain the exact card path, TypeScript code, and message containing
`"local-service-business"`:

```bash
core_type_log="$(mktemp /tmp/task105-08-01-s01-core-types.XXXXXX.log)"
set +e
bun --cwd core lint:types 2>&1 | tee "$core_type_log"
core_type_status=${PIPESTATUS[0]}
set -e

for path in \
  admin/services/solutionKitsClient.ts \
  admin/services/solutionKitSelection.ts; do
  if grep -F "$path" "$core_type_log" >/dev/null; then
    echo "S01-owned core TypeScript diagnostic: $path" >&2
    exit 1
  fi
done

mapfile -t core_card_diagnostics < <(
  grep -F "admin/ui/kits/SolutionKitCard.tsx" "$core_type_log" || true
)
(( ${#core_card_diagnostics[@]} > 0 ))
printf '%s\n' "${core_card_diagnostics[@]}" | grep -E 'error TS[0-9]+:' >/dev/null
printf '%s\n' "${core_card_diagnostics[@]}" | grep -F '"local-service-business"' >/dev/null
if grep -E 'error TS[0-9]+:' "$core_type_log" | \
  grep -vF "admin/ui/kits/SolutionKitCard.tsx"; then
  echo "unexpected core TypeScript diagnostic outside the transitional card path" >&2
  exit 1
fi
if printf '%s\n' "${core_card_diagnostics[@]}" | grep -vF '"local-service-business"'; then
  echo "unexpected SolutionKitCard.tsx diagnostic" >&2
  exit 1
fi
(( core_type_status != 0 ))
printf 'core_lint_types_status=%s classification=transitional_cross_owner owner=TASK-105-08-05-L03-L01\n' \
  "$core_type_status"
```

Run root TypeScript next and retain its exact exit code/output. The gate requires zero
diagnostic attribution to any of the four owned paths and the same explicit causal card
diagnostic. Diagnostics outside the owned paths and expected card line must be enumerated with
their existing owners; they may not be silently hidden or folded into the card classification:

```bash
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

for path in "${owned_paths[@]}"; do
  if grep -F "$path" "$root_tsc_log" >/dev/null; then
    echo "owned TypeScript diagnostic: $path" >&2
    exit 1
  fi
done

mapfile -t root_card_diagnostics < <(
  grep -F "core/admin/ui/kits/SolutionKitCard.tsx" "$root_tsc_log" || true
)
(( ${#root_card_diagnostics[@]} > 0 ))
printf '%s\n' "${root_card_diagnostics[@]}" | grep -E 'error TS[0-9]+:' >/dev/null
printf '%s\n' "${root_card_diagnostics[@]}" | grep -F '"local-service-business"' >/dev/null
if printf '%s\n' "${root_card_diagnostics[@]}" | grep -vF '"local-service-business"'; then
  echo "unexpected SolutionKitCard.tsx root diagnostic" >&2
  exit 1
fi
(( root_tsc_status != 0 ))
printf 'root_tsc_status=%s classification=transitional_cross_owner owner=TASK-105-08-05-L03-L01\n' \
  "$root_tsc_status"
```

These compiler receipts validate S01 attribution, not a globally clean typecheck. The expected
card diagnostic remains an open, named obligation and therefore is neither waived nor treated
as unrelated. A missing expected card diagnostic, a different diagnostic on that path, or any
diagnostic on an S01-owned path is ordering/contract drift and blocks the handoff. The separate
card owner must clear the recorded diagnostic before L03 or any final family gate proceeds.

Run diff and physical-line gates:

```bash
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

A global `git diff --check` failure outside the four owned paths must be isolated and
reported as unrelated shared-worktree evidence. Any scoped failure blocks this task.

## Fresh Post-Implementation Audit Gate

After the implementation patch and every required S01-scoped gate or attribution receipt is
complete, and before the card owner edits either of its paths, run a fresh-context, read-only
audit against the current HEAD and dirty-worktree state. The audit must inspect:

- this child contract, its parent ownership, and the L03 dependency contract;
- the read-only six-ID server tuple and matching catalog entry;
- the browser union and both local validator allowlists;
- `isSiteBuilderPlanOutput` and `previewSolutionKitPlan` accepted/unknown-ID behavior;
- both direct suites and their accepted/unknown behavior assertions;
- the separately named `SolutionKitCard.tsx` owner and the exact transitional diagnostic
  assigned to it, without requiring that downstream repair or assigning the path to this child;
- the exact four-path diff, collision receipt, scoped V8 rows, passing owned static gates,
  captured `lint:types` and root-TSC statuses, zero owned-path attribution, explicit
  `transitional_cross_owner` card attribution, diff, and line-count receipts;
- scope fidelity, strict fail-closed behavior, browser/server boundary safety, cross-stream
  ownership, and test integrity.

The audit must return concrete `file:line` evidence and no unresolved HIGH or MEDIUM finding
inside S01's scope. It must affirm that the card diagnostic is an open downstream obligation,
not a waived finding or a globally green compiler result. Any source, test, task, workflow, or
validation-contract change after the audit makes it stale. Fix verified S01 findings only
inside this task's four-path ownership, rerun the affected gates, and obtain a new fresh audit.

At the instant `TASK-105-08-05-L03-L01` starts, this S01 audit must be fresh. The planned card
edit then deliberately makes the S01-only audit stale for final-family use; the card leaf's
fresh combined post-implementation audit becomes the required authority before L03. Do not
start L03 from the S01 receipt alone, a verbal claim, a stale audit, a missing V8 row, an
uncleared card diagnostic, or an unresolved ownership contradiction.

## Handoff Receipt

Return a concise receipt containing:

- HEAD and `git status --short` before and after;
- the exact four changed paths;
- the six literal IDs compared read-only with
  `core/services/kits/solutionKitTypes.ts:3-10`;
- individual Vitest results and scoped V8 rows;
- passing exact-path ESLint, core lint, and Admin-boundary results;
- captured core `lint:types` and root-TSC exit statuses, zero core diagnostics on both owned
  production paths, zero root-TSC diagnostics on all exact four owned paths, and the exact
  `SolutionKitCard.tsx` TypeScript code/message classified as `transitional_cross_owner` for
  `TASK-105-08-05-L03-L01`;
- scoped and global diff-check results;
- physical line counts for all four changed files;
- the fresh post-implementation audit result and concrete evidence;
- confirmation that the S01 receipt is the next input to the separately named card owner and
  does not unblock L03 or any final family gate;
- confirmation that no browser/smoke, stage, commit, parent, L03, board, changelog,
  workflow, manifest, API, cache-policy, auth, permission, or persistence edit occurred.

## Acceptance Criteria

- [ ] `local-service-business` is present in the browser `SolutionKitId` union.
- [ ] Both existing local strict validator allowlists contain exactly the same six accepted
  literals as the read-only server tuple.
- [ ] No validator accepts arbitrary strings and unknown IDs remain fail closed on every
  existing local list/detail, storage, and custom-event guard path.
- [ ] Accepted list/detail and localStorage/custom-event round trips are behavior-asserted in
  the two exact direct suites.
- [ ] `previewSolutionKitPlan` accepts `local-service-business` as `recommendedKitId` and
  rejects an otherwise-valid payload carrying an unknown recommended ID.
- [ ] No direct server/runtime import or API/cache/auth/permission/persistence policy change
  is introduced.
- [ ] `SolutionKitCard.tsx` remains untouched by this child and has the separately named
  `TASK-105-08-05-L03-L01` source-repair owner next in land order.
- [ ] Direct Vitest, scoped V8, exact-path ESLint, core lint, and Admin-boundary gates pass;
  core `lint:types` attributes zero diagnostics to both production writers and root TSC
  attributes zero diagnostics to all exact four owned paths.
- [ ] Both compiler receipts preserve the expected causal `SolutionKitCard.tsx`
  missing-`local-service-business` diagnostic as `transitional_cross_owner`; neither receipt
  waives it, calls it unrelated, or claims a globally clean typecheck.
- [ ] Exactly four implementation paths changed and every changed production/test file remains
  at or below 1,000 physical lines.
- [ ] A fresh S01-scoped read-only audit has no unresolved HIGH or MEDIUM finding and validates
  the explicit card handoff.
- [ ] The validated S01 receipt is available to TASK-105-08-05-L03-L01, while L03 and the final
  family gate remain blocked until the card receipt clears the recorded diagnostic.

## Terminal Closure Receipt (TASK-105-09, 2026-09-01)

Status written by the family's terminal documentation owner after changelog 1325;
the contract prose above is unchanged.

- Receipt: `/home/coder/.jcode/scratch/task105-s01-final-20260825/receipt.json`
  (`decision: VALIDATED_S01_SCOPED_HANDOFF_WITH_OPEN_DOWNSTREAM_CARD_OBLIGATION`)
  at HEAD `18a45f0687dc0b23baa49f05eada60a874235b09`.
- Exactly the four contracted writer paths
  (`core/admin/services/solutionKitsClient.ts`,
  `core/admin/services/solutionKitSelection.ts`,
  `tests/vitest/admin/solutionKitsClient.coverage.test.ts`,
  `tests/vitest/admin/solutionKitSelection.test.ts`); direct Vitest `24/24` + `8/8`;
  scoped V8 `32/32` with both source rows at `100%` lines; six server-side IDs kept
  as browser authority.
- The recorded downstream obligation (the `transitional_cross_owner` missing-
  `local-service-business` diagnostic on `core/admin/ui/kits/SolutionKitCard.tsx`)
  was cleared by `TASK-105-08-05-L03-L01`, so nothing remains open downstream;
  static, admin-boundary, collision, attribution, diff, and line-cap evidence plus
  the independent PASS/CLEAN post-audit are in the receipt.
