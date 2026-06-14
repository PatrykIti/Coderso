# TASK-468-04-L05: Editor Cutover Tests And Legacy Builder Guard
# FileName: TASK-468-04-L05-Editor-Cutover-Tests-And-Legacy-Builder-Guard.md

**Parent Subtask:** TASK-468-04
**Priority:** High
**Category:** Admin UI / Custom Screens / Cutover Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-468-04-L04
**Status:** ⏳ To Do

---

## Overview

Close the editor cutover by proving the active Custom Screen editor no longer
uses the legacy widget builder surface. This leaf adds regression tests and
bundle/import guards before runtime and record editing work begins.

## Sub-Tasks

- [ ] Add tests for create empty screen, add section, add field, save, reload,
  and edit existing V4 screen.
- [ ] Add tests proving legacy `custom-screen-builder` widgets are not imported
  by the active editor route.
- [ ] Add migration fixture coverage for legacy rows opened in the new editor.
- [ ] Run admin bundle checks and record chunk evidence in the task closeout.

## Files To Change

| File | Required change |
|---|---|
| `tests/vitest/ui-integration/custom-screens/*EditorCutover*.test.tsx` | End-to-end editor cutover coverage. |
| `tests/vitest/customScreens/*legacy*.test.ts` | Legacy-opened-as-V4 fixture coverage. |
| `scripts/check-admin-boundary.*` or bundle guard config | Guard active editor route from legacy builder import if available. |
| `_docs/_TASKS/TASK-468-04-Custom-Screen-Canvas-Editor-Cutover.md` | Record validation evidence before closing. |

## Implementation Pseudocode

```ts
function assertNoLegacyBuilderImport(bundle: AdminBundleManifest) {
  const editorRoute = routeChunk(bundle, "CustomScreenEditorPage");
  expect(editorRoute.staticImports).not.toContain("custom-screen-builder");
  expect(editorRoute.staticImports).not.toContain("screen-field-value");
}
```

Data flow:

- Tests open legacy fixtures through service migration adapters.
- Editor receives normalized V4 definitions.
- Save/reload confirms V4 persists without active legacy builder fields.

Error handling:

- If unsupported legacy widgets remain, they must render as explicit
  non-writable placeholder blocks until TASK-468-07 removes the bridge.
- Tests fail on silent fallback to arbitrary widget rendering.

Regression-test shape:

```tsx
test("new empty screen can be authored and reloaded as V4", async () => {
  render(<CustomScreenEditorPage fixture={emptyV4ScreenFixture} />);
  await addScreenSection("Details");
  await addFieldBlock("Title");
  await saveScreen();
  await reloadScreen();
  expect(currentEditorDocument().schemaVersion).toBe(1);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen routes only.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for load; `content:write` for save.
- **CSRF expectations:** required for write tests.
- **Rate-limit bucket:** existing admin buckets.
- **Reject unknown validation:** tests must assert legacy fields do not bypass V4
  validation on new writes.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** fixtures must use synthetic entry data only.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun run test:vitest -- tests/vitest/customScreens`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-468-04-Custom-Screen-Canvas-Editor-Cutover.md`

## Acceptance Criteria

1. Active editor route authors V4 screen documents without legacy widget builder
   dependencies.
2. Legacy fixtures open through migration adapters, not through arbitrary widget
   rendering.
3. Bundle/import evidence is recorded before TASK-468-04 closes.
