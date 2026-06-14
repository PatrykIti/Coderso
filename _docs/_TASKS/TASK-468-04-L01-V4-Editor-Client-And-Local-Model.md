# TASK-468-04-L01: V4 Editor Client And Local Model
# FileName: TASK-468-04-L01-V4-Editor-Client-And-Local-Model.md

**Parent Subtask:** TASK-468-04
**Priority:** High
**Category:** Admin UI / Custom Screens / Editor Model
**Estimated Effort:** Large
**Dependencies:** TASK-468-02-L03, TASK-468-03-L04
**Status:** ⏳ To Do

---

## Overview

Add the admin editor client and local editing model for V4 Custom Screen
definitions. This leaf owns loading, local draft state, dirty tracking, conflict
metadata, and mapping server errors into editor-safe UI state.

## Sub-Tasks

- [ ] Add a V4-aware `customScreensEditorClient` that imports V4 helpers from
  the service contract owner.
- [ ] Add `useCustomScreenEditorModel` or equivalent reducer-based local model.
- [ ] Preserve cache hydration and background revalidation without overwriting
  dirty local state.
- [ ] Keep list-view configuration available while editor-view canvas work is
  introduced.
- [ ] Add focused client/model tests.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/services/customScreensEditorClient.ts` | New or updated V4 editor client. |
| `core/admin/ui/custom-screens/useCustomScreenEditorModel.ts` | New local model/reducer. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Use V4 editor model. |
| `tests/vitest/customScreens/customScreensEditorClient.test.ts` | V4 client coverage. |
| `tests/vitest/ui-integration/custom-screens/*EditorModel*.test.tsx` | Dirty/conflict model coverage. |

## Implementation Pseudocode

```ts
type CustomScreenEditorState = {
  serverVersion: string | null;
  draft: CustomScreenDefinitionV4;
  baseline: CustomScreenDefinitionV4;
  status: "idle" | "loading" | "saving" | "conflict" | "error";
};

function customScreenEditorReducer(
  state: CustomScreenEditorState,
  action: CustomScreenEditorAction
): CustomScreenEditorState {
  switch (action.type) {
    case "loaded":
      return stateIsDirty(state) ? state : hydrateFromServer(action.payload);
    case "patchDocument":
      return applyDraftPatch(state, action.patch);
    case "saved":
      return markClean(action.payload);
    case "conflict":
      return { ...state, status: "conflict", serverVersion: action.serverVersion };
  }
}
```

Data flow:

- Editor route loads screen metadata through cached admin client wrappers.
- V4 definition is normalized before it enters local state.
- Reducer owns draft mutations and dirty-state decisions.
- Save submits the full V4 definition plus server version/etag when available.

Error handling:

- Server `custom_screen_definition_invalid` shows field-level or document-level
  validation feedback without discarding local edits.
- Conflict responses keep the local draft and expose reload/overwrite actions.
- Missing content type metadata blocks write-capable field insertion.

Regression-test shape:

```ts
test("background reload does not overwrite dirty editor draft", () => {
  const dirty = reduce(cleanState, patchTitleAction);
  const reloaded = reduce(dirty, loadedFromServerAction);
  expect(reloaded.draft.editorView.document).toEqual(dirty.draft.editorView.document);
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen read/write
  routes only.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for load; `content:write` for save.
- **CSRF expectations:** required for save mutations.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** client normalizes before save; server remains
  authoritative and rejects unknown fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** do not persist raw entry values, cookies, CSRF tokens, or
  privileged settings in localStorage/cache/debug output.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/customScreensEditorClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache ownership changes.

## Acceptance Criteria

1. V4 editor state is normalized, typed, and reducer-owned.
2. Background revalidation cannot overwrite dirty drafts.
3. Conflict and validation errors are represented explicitly in editor state.
