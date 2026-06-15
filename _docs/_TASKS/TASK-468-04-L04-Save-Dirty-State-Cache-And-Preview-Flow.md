# TASK-468-04-L04: Save Dirty State Cache And Preview Flow
# FileName: TASK-468-04-L04-Save-Dirty-State-Cache-And-Preview-Flow.md

**Parent Subtask:** TASK-468-04
**Priority:** High
**Category:** Admin UI / Custom Screens / Save And Preview
**Estimated Effort:** Large
**Dependencies:** TASK-468-04-L03, TASK-467-02
**Status:** ⏳ To Do

---

## Overview

Wire V4 editor save, cache invalidation, dirty-state protection, and admin
preview behavior. This leaf must preserve existing admin cache conventions and
avoid force-refetch loops or dirty-state overwrites.

## Sub-Tasks

- [ ] Add save orchestration for V4 definitions with conflict handling.
- [ ] Update Custom Screen cache keys, TTLs, invalidation, and `cacheBus`
  broadcasts if ownership changes.
- [ ] Add preview hydration for the local V4 draft without persisting draft-only
  state.
- [ ] Preserve unsaved-change guards on navigation.
- [ ] Add tests for save success, validation failure, conflict, cache broadcast,
  reload, and preview.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | Save/preview wiring. |
| `core/admin/services/customScreensEditorClient.ts` | Save and preview helpers. |
| `core/admin/services/customScreensClient.ts` | Existing Custom Screen cache hydration/invalidation updates if needed. |
| `core/admin/services/customScreenShortcutsClient.ts` | Shortcut/sidebar cache invalidation updates if needed. |
| `core/admin/services/cachePolicy.ts` | Cache key/TTL updates if ownership changes. |
| `core/admin/ui/custom-screens/RuntimePreviewDialog.tsx` or equivalent | V4 preview support. |
| `_docs/ADMIN_CACHE.md` | Update if cache keys/owners change. |
| `_docs/ADMIN_CACHE_MAP.md` | Update if cache keys/owners change. |
| `tests/vitest/ui-integration/custom-screens/*Save*.test.tsx` | Save/cache/preview coverage. |

## Implementation Pseudocode

```ts
async function saveCustomScreenDraft(state: CustomScreenEditorState) {
  const payload = normalizeCustomScreenDefinitionV4(state.draft);
  const result = await customScreensEditorClient.updateDefinition({
    id: state.screenId,
    definition: payload,
    serverVersion: state.serverVersion,
  });
  cacheBus.emit("customScreens:changed", { id: state.screenId });
  return markCleanFromServer(result);
}

function createScreenPreviewPayload(state: CustomScreenEditorState) {
  return {
    screenId: state.screenId,
    definition: state.draft,
    contentTypeId: state.contentType.id,
  };
}
```

Data flow:

- Save validates local draft through V4 normalizer before network write.
- Save goes through `customScreensEditorClient`; do not import the lightweight
  `customScreensClient`/`updateCustomScreen` path from editor UI or model code,
  because TASK-467 keeps full editor normalization out of list/cache clients.
- Internal admin route persists definition and returns normalized server state.
- Cache invalidation updates list/sidebar/editor consumers.
- Preview receives a sanitized V4 draft plus bounded sample metadata.

Error handling:

- Validation errors keep dirty state and point to the affected section/block.
- Conflict errors keep local draft and expose reload/overwrite actions.
- Preview errors are isolated to the dialog and do not mutate editor state.

Regression-test shape:

```tsx
test("successful save marks editor clean and broadcasts cache invalidation", async () => {
  render(<CustomScreenEditorPage fixture={dirtyScreenFixture} />);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(cacheBusEvents()).toContainEqual(expect.objectContaining({ id: "screen-a" }));
  expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin Custom Screen save/preview
  routes only.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:write` for save; `content:read` for preview metadata.
- **CSRF expectations:** required for save; preview write-like draft endpoints
  must require CSRF if they accept POST payloads.
- **Rate-limit bucket:** existing admin write bucket for save and preview draft
  generation.
- **Reject unknown validation:** server rejects unknown V4 fields and preview
  payload keys.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** preview payloads must be sanitized and must not persist
  draft-only raw entry values or protected settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- Bun route tests for Custom Screen save/preview endpoints if route behavior changes.
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior changes.
- `_docs/CMS_API.md`

## Acceptance Criteria

1. Save, conflict, validation, and preview paths preserve dirty-state safety.
2. Cache invalidation follows shared admin cache conventions.
3. Preview uses V4 screen runtime inputs without storing draft-only data.
