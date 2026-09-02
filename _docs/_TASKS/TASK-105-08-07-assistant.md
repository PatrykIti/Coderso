# TASK-105-08-07: Assistant Services and UI
# FileName: TASK-105-08-07-assistant.md

**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small follow-up
**Dependencies:** TASK-105-08-11 split receipt; fresh L01 contract audit
**Parent Task:** TASK-105-08
**Status:** ✅ Done (2026-09-02)
**Started:** 2026-08-21
**Reopened:** 2026-08-29

---

## Overview

The broad 34-file assistant wave closed historically on 2026-08-22. A current source review
of the L12 residual ledger identifies one genuine, fail-closed pure-service branch not covered
by that receipt: blueprintSchemaMerger.ts:231. This parent is reopened solely for L01; it
does not revive ownership of other historical assistant drafts or suites.

## Current Reconciliation Scope

| Source line | Disposition | Owner |
|---|---|---|
| core/services/assistant/blueprints/blueprintSchemaMerger.ts:231 | REACHABLE-GAP | L01 |
| core/services/assistant/blueprints/blueprintCapabilityRegistry.ts:725 | UNREACHABLE | retained historical L12 record |

mergeBlueprintSchemas first calls assertContentSchema at 223, but that validator accepts valid
JSON Schema boolean child definitions: its properties guard is only object-shaped
(core/services/content/validation.ts:33-56). A schema with properties: { enabled: true }
reaches Object.entries at 229 and the non-record definition rejection at 230-236. The
exported merger is used by content-type action merging
(core/services/assistant/blueprints/blueprintActionAssembler.ts:540-553) and conflict
resolution (core/services/assistant/blueprints/blueprintConflictResolver.ts:49-70). This is a
real fail-closed contract path, not an invalid-union test seam.

No other historical assistant residual classification is reconfirmed by this restart. It
remains unresolved for its owning fresh audit and is not an ownership grant to L01.

## Child Order and Single-Writer Boundaries

1. TASK-105-08-07-L01-blueprint-schema-boolean-property-recovery.md — sole writer of
   tests/vitest/assistant/blueprint-schema-merger.test.ts; source remains read-only.

The former unsplit `blueprint-action-assembler.test.ts` is historical removed context, not a
current path. Current split suites
`tests/vitest/assistant/blueprint-action-assembler-blocks.test.ts` (442 lines),
`tests/vitest/assistant/blueprint-assembler-edge.test.ts` (610 lines), and
`tests/vitest/assistant/blueprint-compose-merge-branches.test.ts` (728 lines) are read-only
outside L01. No child may reopen that broader assistant test inventory without a fresh task
contract.

## Implementation Pseudocode

~~~ts
const schema = {
  type: "object",
  additionalProperties: false,
  properties: { enabled: true },
};

expect(() => mergeBlueprintSchemas([schema])).toThrow(BlueprintSchemaMergeError);
// Assert code === "schema_merge_conflict" and fieldName === "enabled".
~~~

The direct pure-service test asserts the stable error code, field name, and message rather
than merely raising coverage. It does not bypass assertContentSchema, cast an invalid
top-level schema, or change merger behavior.

## Testing Requirements

L01 runs its one exact suite and static gates:

~~~bash
export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-schema-merger.test.ts
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

It then uses a scoped V8 report including
core/services/assistant/blueprints/blueprintSchemaMerger.ts and asserts line 231 is hit.

## 1000-Line Rule

The named direct suite is 209 physical lines before this work and can accept the focused
case. Measure it after editing. The three current split assembler suites are outside L01's
writer scope regardless of their present under-cap counts.

## Security Contract

Pure test-only contract work. The test preserves a fail-closed merger boundary: boolean JSON
Schema children remain rejected as unsupported content-field definitions. No route, provider
credential, persistence, session/RBAC, CSRF, rate-limit, or public-write behavior changes.

## Historical Receipt

The former terminal assistant receipt remains historical evidence; it does not cover the
newly verified line-231 branch. This parent cannot return to terminal status until L01 and
L12 have fresh receipts.

## Sub-Tasks

- [ ] TASK-105-08-07-L01-blueprint-schema-boolean-property-recovery.md

## Documentation Updates Required

L01 returns only its focused source/test/coverage receipt to this parent and L12. Board,
changelog, staging, and commits remain orchestrator-owned.

## Acceptance Criteria

1. A public merger test proves the boolean-property rejection with stable error metadata.
2. L12 retains this line as a reachable gap until the focused V8 receipt is validated.

## Closure (2026-09-02)

The reopened scope is satisfied: the sole physical child TASK-105-08-07-L01 flipped Done (2026-09-02) on landing commit d9de3ed8, with tests/vitest/assistant/blueprint-schema-merger.test.ts hitting blueprintSchemaMerger.ts:231 (DA:231,1, 5/5 tests) and pinning the fail-closed error metadata.
Root tsc --noEmit and bun --cwd core lint both exit 0 on this tree.
Residual disposition: the 08-07 cluster attribution in TASK-105-08-12 is 12 files / 35 lines.
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
