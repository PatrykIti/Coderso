# TASK-105-08-07-L01: Blueprint Schema Boolean-Property Recovery
# FileName: TASK-105-08-07-L01-blueprint-schema-boolean-property-recovery.md

**Parent Subtask:** TASK-105-08-07
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small
**Dependencies:** Fresh TASK-105-08-07 contract audit
**Status:** ⏳ To Do

---

## Overview

Cover the one reachable fail-closed branch at
core/services/assistant/blueprints/blueprintSchemaMerger.ts:231. A boolean child is valid
general JSON Schema, yet this product's content-field merger requires each property definition
to be an object and must reject it with stable error metadata. This is a direct pure-service
test only; no source behavior changes.

## Exact Single-Writer Scope

**Read-only production target:**

- core/services/assistant/blueprints/blueprintSchemaMerger.ts

**Exclusive test writer:**

- tests/vitest/assistant/blueprint-schema-merger.test.ts

Do not edit `tests/vitest/assistant/blueprint-action-assembler-blocks.test.ts` (442 lines),
`tests/vitest/assistant/blueprint-assembler-edge.test.ts` (610 lines), or
`tests/vitest/assistant/blueprint-compose-merge-branches.test.ts` (728 lines). They are
current split assembler suites outside this leaf. The former unsplit 1,050-line filename is
historical removed context only. Also do not edit any source/service/route/schema module,
task/changelog/board file, coverage configuration, or another assistant test suite.

## Source-Line and Behavior Map

| Source line | Public input | Required assertion |
|---|---|---|
| blueprintSchemaMerger.ts:231 | A top-level valid object schema with additionalProperties: false and properties: { enabled: true }. assertContentSchema accepts the boolean child; the merger then rejects it as a non-record field definition. | Throw BlueprintSchemaMergeError with code schema_merge_conflict, fieldName enabled, and the existing must-be-a-JSON-schema-object message. |

The path is reachable from both content-type action merging and conflict resolution. It does
not need a fabricated action: mergeBlueprintSchemas is a public Bun-free helper and the test
must call it through its declared interface.

## Implementation Pseudocode

~~~ts
let thrown: unknown;
try {
  mergeBlueprintSchemas([
    {
      type: "object",
      additionalProperties: false,
      properties: { enabled: true },
    },
  ]);
} catch (error) {
  thrown = error;
}

expect(thrown).toBeInstanceOf(BlueprintSchemaMergeError);
expect(thrown).toMatchObject({
  code: "schema_merge_conflict",
  fieldName: "enabled",
});
expect((thrown as Error).message).toBe('Field "enabled" must be a JSON schema object.');
~~~

Do not bypass assertContentSchema, cast an invalid top-level schema, or change the error
code/message to suit a test. The regression protects the stricter product content-field
contract while accepting that boolean schemas exist in generic JSON Schema.

## Testing Requirements

~~~bash
export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-schema-merger.test.ts
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

Run a scoped V8 command with coverage.include set to
core/services/assistant/blueprints/blueprintSchemaMerger.ts and require line 231 to be
covered. Record the parsed row with the targeted receipt.

## 1000-Line Rule

The test file is 209 physical lines before this addition and must remain below 1,000 lines.
Do not solve a small case by reopening any of the three current split assembler suites.

## Security Contract

Non-API pure-test work. The source remains fail closed for unsupported field definitions.
No provider/API key, route, DB, persistence, session/RBAC, CSRF, rate-limit, public-write,
or anti-abuse behavior is changed or mocked as an authority bypass.

## Sub-Tasks

None.

## Documentation Updates Required

Return exact changed paths, the targeted and V8 receipts, static checks, and line count to
the parent. The closure writer alone updates L12/status/board/changelog.

## Acceptance Criteria

1. The test reaches line 231 through a valid top-level ContentSchema.
2. It pins error class, code, field name, and user-safe message.
3. All named validation and line-count gates pass.
