# TASK-105-08-03-L02: Detail Template Residuals
# FileName: TASK-105-08-03-L02-detail-template-residuals.md

**Parent Subtask:** TASK-105-08-03
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-03-L01 validated handoff; fresh L02 contract audit
**Status:** ⏳ To Do

---

## Overview

Fill 16 reachable detail-template residual lines without manufacturing impossible control
states. This leaf is test-only and leaves all production source read-only.

## Exact Single-Writer Scope

**Read-only production targets:**

- core/admin/ui/content-types/DetailTemplateCanvas.tsx
- core/admin/ui/content-types/DetailTemplateEditorPage.tsx
- core/admin/ui/content-types/DetailTemplateInspector.tsx

**Exclusive test writers:**

- tests/vitest/ui/detail-template-canvas-paths.test.ts (new)
- tests/vitest/ui/detail-template-editor-flows.test.tsx
- tests/vitest/ui/detail-template-inspector.test.tsx

Do not edit the modified detail-template-canvas.test.tsx, detail-template-editor-residual.test.tsx
(942 lines), detail-template-editor.test.tsx (954 lines), source, fixture outside this set,
another task document, changelog, board, or coverage configuration.

## Source-Line and Behavior Map

| Source lines | Test writer | Real contract / interaction assertion |
|---|---|---|
| DetailTemplateCanvas.tsx:91-96,102,105,117,123,126 | new detail-template-canvas-paths | Call exported findDetailTemplateBlockPath with a valid root block whose first slot misses and second slot contains the target; assert the exact nested path, then assert a missing id returns null. |
| DetailTemplateEditorPage.tsx:298,299 | detail-template-editor-flows | Complete initial load, trigger cache refresh with a deferred client promise, edit before it resolves, resolve remote data, and assert the dirty local draft survives with pending remote-update state. |
| :321,322 | same | Start deferred initial forced fetch, edit before it resolves, resolve remote data, and assert the local edit survives. |
| DetailTemplateInspector.tsx:246 | detail-template-inspector | Render a valid gallery block with its gallery control and assert the unsupported-control fallback is visibly rendered. |

The native section-variant select at DetailTemplateInspector.tsx:321,322,328 is excluded:
current section variants have at most four options and the shared control model converts any
select with at most six options to segmented UI. Do not use an invented large option list.

## Implementation Pseudocode

~~~tsx
const remote = deferred<DetailPage>();
renderEditor({ cachedRecord });
await user.type(screen.getByLabelText("Name"), "Local draft");
remote.resolve(remoteRecord);
await flushEffects();

expect(screen.getByLabelText("Name")).toHaveValue("Local draft");
expect(screen.getByRole("alert")).toHaveTextContent(/remote update/i);
~~~

For the canvas helper, construct only a valid page-document tree and assert its exported
return value. For editor cases, control real cached/force-fetch seams with deferred promises.
For inspector, use an actual supported gallery block rather than calling a private renderer.
Preserve real dirty-state/cache behavior and existing error UI.

## Testing Requirements

Run each owned suite independently:

~~~bash
for test_path in   tests/vitest/ui/detail-template-canvas-paths.test.ts   tests/vitest/ui/detail-template-editor-flows.test.tsx   tests/vitest/ui/detail-template-inspector.test.tsx
do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Then run a scoped V8 receipt for the three source targets and assert the 16 mapped lines,
followed by:

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
~~~

## 1000-Line Rule

detail-template-editor-flows.test.tsx starts at 801 lines and inspector at 539; keep each
under 1,000 lines. The new pure canvas suite should stay under 200 lines.

## Security Contract

Non-API test work. Existing internal admin session/RBAC/CSRF, draft/cache hydration, strict
page-document normalization, and persistence behavior remain unchanged. No test may inject
an invalid external document, expose settings/secrets, or add a route/public write.

## Sub-Tasks

None.

## Documentation Updates Required

Return the three exact test paths, deferred-flow proof, scoped V8 output, static receipts,
and line counts to the parent. The closure writer alone updates L12/status/board/changelog.

## Acceptance Criteria

1. All 16 mapped lines receive a public helper or visible UI assertion.
2. Dirty drafts survive both in-flight remote-load situations.
3. No test attempts to cover the source-proven unreachable native-select branch.
