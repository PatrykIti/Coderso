# TASK-468-05-L05: Runtime Entry Tests And Legacy Bridge Guard
# FileName: TASK-468-05-L05-Runtime-Entry-Tests-And-Legacy-Bridge-Guard.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Cutover Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-468-05-L04
**Status:** ⏳ To Do

---

## Overview

Close the runtime and entry-editing cutover by proving active record list,
record preview, and entry editing routes no longer use the legacy widget bridge.
This leaf also records validation evidence before assistant and cleanup work.

## Sub-Tasks

- [ ] Add integration tests for list, record preview, edit, validation, save,
  reload, and delete/publish actions where supported.
- [ ] Add import/bundle guard coverage to prevent active runtime routes from
  statically importing `WidgetRenderer` or `screen-field-*` widgets.
- [ ] Verify migrated legacy screens render explicit placeholders only where
  unsupported.
- [ ] Record final TASK-468-05 evidence and follow-up gaps if any.

## Files To Change

| File | Required change |
|---|---|
| `tests/vitest/ui-integration/custom-screens/*RuntimeCutover*.test.tsx` | Runtime/list/entry cutover tests. |
| `tests/vitest/customScreens/*migration*.test.ts` | Legacy placeholder fixture coverage. |
| `scripts/check-admin-boundary.*` or bundle guard config | Runtime import guard if supported. |
| `_docs/_TASKS/TASK-468-05-Screen-Runtime-Records-List-And-Entry-Editing-Cutover.md` | Validation evidence and drift notes. |

## Implementation Pseudocode

```ts
function assertNoLegacyRuntimeBridge(bundle: AdminBundleManifest) {
  const runtimeRoutes = routeChunks(bundle, ["CustomScreenEntries", "CustomScreenEntryEditor"]);
  for (const route of runtimeRoutes) {
    expect(route.staticImports).not.toContain("WidgetRenderer");
    expect(route.staticImports).not.toContain("screen-field-value");
  }
}
```

Data flow:

- Tests load V4 and migrated legacy fixtures through service/client paths.
- Runtime renders V4 document and entry draft controls.
- Save/reload proves entry writes use content entry routes with screen-bound
  payload construction.

Error handling:

- Unsupported legacy blocks are non-writable placeholders and cannot submit
  arbitrary widget props as entry values.
- Failed entry saves preserve draft state and validation errors.
- Bundle guard failures block TASK-468-05 closure.

Regression-test shape:

```tsx
test("entry editor saves via field bindings without widget bridge", async () => {
  render(<CustomScreenEntryEditor fixture={boundEntryFixture} />);
  await user.clear(screen.getByLabelText("Title"));
  await user.type(screen.getByLabelText("Title"), "Updated title");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(api.lastEntryPatch.values).toEqual({ title: "Updated title" });
  expect(widgetRendererSpy).not.toHaveBeenCalled();
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen and custom
  content entry routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for list/detail; `content:write` plus existing
  stronger checks for mutations.
- **CSRF expectations:** required for entry mutations.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** tests assert arbitrary widget props cannot pass
  into entry write payloads.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** fixtures use synthetic data; assertions must not snapshot
  cookies, CSRF tokens, or protected field values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- Bun route tests for entry write/publish/delete paths touched.
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-468-05-Screen-Runtime-Records-List-And-Entry-Editing-Cutover.md`

## Acceptance Criteria

1. Active runtime/list/entry routes are V4 screen-runtime based.
2. Legacy widget bridge is not an active runtime dependency.
3. Entry write tests prove payloads are derived from screen bindings and content
   type schema.
