# TASK-105-08-03-L03: Field and Schema Residuals
# FileName: TASK-105-08-03-L03-field-schema-residuals.md

**Parent Subtask:** TASK-105-08-03
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-03-L02 validated handoff; fresh L03 contract audit
**Status:** ⏳ To Do

---

## Overview

Fill ten source-proven reachable field-editor/schema-builder lines with valid authoring
interactions and persisted-schema validation. This is test-only and does not change the
content-type schema contract.

## Exact Single-Writer Scope

**Read-only production targets:**

- core/admin/ui/content-types/FieldEditor.tsx
- core/admin/ui/content-types/SchemaBuilderPage.tsx

**Exclusive test writers:**

- tests/vitest/ui/field-editor.test.tsx
- tests/vitest/ui/schema-builder-page.test.tsx

Do not edit source, content-type editor suites, a shared fixture outside these paths, another
task document, changelog, board, or coverage configuration.

## Source-Line and Behavior Map

| Source lines | Test writer | Real interaction and assertion |
|---|---|---|
| FieldEditor.tsx:81,82 | field-editor | Create target and target-2 option values, change another to target, and assert deterministic target-3 collision resolution. |
| :108,109 | same | In a number field clear Step; assert emitted config drops step while preserving min/max. |
| :396 | same | Toggle Allow multiple selections on a select field; assert emitted multiple: true. |
| :571 | same | Toggle Allow multiple on a relation field; assert relation payload has multiple: true. |
| SchemaBuilderPage.tsx:116,117 | schema-builder-page | Press Enter/Space on an unselected field node; assert default prevention and selected-field pane transition. |
| :214 | same | Hydrate cached content type while forced list refresh rejects; assert the cached editor stays usable. |
| :326 | same | Load a persisted schema containing duplicate select options, Save, and assert visible uniqueness validation with no update request. |

The duplicate-options case is a valid stored-document regression: schema mapping preserves
such existing data, while the UI's normal option editor prevents creating it afresh.

## Implementation Pseudocode

~~~tsx
const storedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      xFieldType: "select",
      xFieldConfig: { select: { options: [{ value: "same" }, { value: "same" }] } },
    },
  },
};

renderSchemaBuilder({ cachedSchema: storedSchema });
await user.click(screen.getByRole("button", { name: "Save" }));
expect(screen.getByText("Select option values must be unique.")).toBeVisible();
expect(updateContentType).not.toHaveBeenCalled();
~~~

Drive public controls and persisted input through the existing client seams. Preserve the
normalizer and reject-unknown behavior; no test helper may mutate private component state or
relax validation to produce coverage.

## Testing Requirements

Run each owned suite independently:

~~~bash
for test_path in   tests/vitest/ui/field-editor.test.tsx   tests/vitest/ui/schema-builder-page.test.tsx
do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Then run a scoped V8 receipt for FieldEditor.tsx and SchemaBuilderPage.tsx and assert all
ten mapped lines, followed by:

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

## 1000-Line Rule

field-editor.test.tsx is 520 lines and schema-builder-page.test.tsx is 700 before this leaf.
Keep each under 1,000 physical lines; extract a focused fixture rather than growing either
past the gate.

## Security Contract

Non-API test work. Existing internal admin auth/RBAC/CSRF, schema normalization, strict
validation, and persistence behavior are unchanged. Tests use no credential, no public
write, and no client-side authorization bypass.

## Sub-Tasks

None.

## Documentation Updates Required

Return exact changed test paths, scoped V8 rows, targeted/static receipts, and line counts
to the parent. The closure writer alone updates L12/status/board/changelog.

## Acceptance Criteria

1. All ten mapped lines are covered through real UI or persisted-schema behavior.
2. Duplicate persisted select options fail closed without an update request.
3. All named validation gates and line-count checks pass.
