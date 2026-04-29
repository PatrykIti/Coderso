# TASK-243-01: Menus Editor Header Actions and Lifecycle Publish
# FileName: TASK-243-01_Menus_Editor_Header_Actions_and_Lifecycle_Publish.md

**Priority:** High
**Category:** CMS/Menus + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-243
**Status:** To Do

---

## Overview

Make the Menus editor action model match the rest of the admin editor
experience.

The current editor puts navigation/reload actions in the main header and puts
real mutation actions in a secondary status strip. That is backwards for an
editing surface. New menus also start as draft, but the editor has no direct
publish action.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
  - remove `Back to menus` and `Refresh` from `PageHeader.actions`;
  - move `Discard` and `Save changes` into `PageHeader.actions`;
  - add lifecycle status badge and `Publish` / `Move to Draft` action;
  - extend editor menu state to include `status` and `publishedAt`;
  - centralize save/publish mutation flow.
- `core/admin/services/menusClient.ts`
  - reuse `publishMenu`, `moveMenuToDraft`, and `updateMenu`;
  - add no new client method unless the editor needs a small typed wrapper.
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - cover action placement, no header back/refresh buttons, and publish flow.
- `tests/vitest/ui/menu-editor.test.tsx`
  - update static shell expectations if needed.
- `tests/vitest/admin/menusClient.test.ts`
  - extend only if a new client wrapper is introduced.

## Current Contract

- `createMenu()` creates draft menus by default.
- `publishMenu(menuId)` is already available and maps to
  `PATCH /menus/:id` with `{ status: "published" }`.
- `moveMenuToDraft(menuId)` is already available and maps to
  `PATCH /menus/:id` with `{ status: "draft" }`.
- `MenuEditorPage` currently tracks only `id`, `name`, `location`, and
  `createdAt` in `originalMenu`, so lifecycle state must be added before UI can
  render status or publish from the editor.

## Security Contract

- Visibility: internal admin Menus editor.
- Auth model: unchanged authenticated admin session.
- RBAC: existing `menus:write`.
- CSRF: unchanged `updateMenu` / `publishMenu` / `moveMenuToDraft` CSRF path.
- Rate-limit bucket: unchanged admin write bucket.
- Reject-unknown validation: lifecycle update must emit only existing
  `status`, `name`, and `location` fields accepted by `PATCH /menus/:id`.
- Anti-abuse: no public write endpoint, no raw server error stack display, and
  no concurrent publish/save races.

## Implementation Pseudocode

Represent the selected menu with the existing client type instead of a partial
local shape:

```ts
type EditableMenu = MenuWithItems["menu"];

const [originalMenu, setOriginalMenu] = useState<EditableMenu | null>(
  () => initialMenu?.menu ?? null
);

const menuStatus = originalMenu?.status ?? "draft";
const isPublished = menuStatus === "published";
```

Use one mutation path for save and publish so item validation, cache refresh,
toasts, and in-flight protection stay consistent:

```ts
const mutationInFlightRef = useRef(false);
const [pendingAction, setPendingAction] = useState<"save" | "publish" | "draft" | null>(null);

async function persistMenuEditorState(options?: {
  nextStatus?: MenuSummary["status"];
  successMessage?: string;
}) {
  if (!menuId || mutationInFlightRef.current) return;
  mutationInFlightRef.current = true;
  setPendingAction(options?.nextStatus === "published" ? "publish" : "save");
  setError(null);

  const validation = validateMenuItemsPayload(items);
  if (!validation.ok) {
    setError(validation.message);
    setActiveItemId(validation.itemId);
    mutationInFlightRef.current = false;
    setPendingAction(null);
    return;
  }

  try {
    const metadataPatch = buildMenuMetadataPatch({
      name: menuName,
      location: menuLocation,
      originalMenu,
      nextStatus: options?.nextStatus,
    });

    if (metadataPatch) {
      await updateMenu(menuId, metadataPatch);
    }

    if (isDirty) {
      await replaceMenuItems(menuId, buildMenuItemsPayload(items));
    }

    await loadMenu(menuId, {
      force: true,
      allowUnsaved: true,
      setLoading: false,
      preserveItemId: activeItemId,
    });

    toast.success(options?.successMessage ?? "Menu saved.");
  } catch (err) {
    const message = isApiClientError(err)
      ? err.message
      : "Failed to save menu changes.";
    setError(message);
    toast.error(message);
  } finally {
    mutationInFlightRef.current = false;
    setPendingAction(null);
  }
}
```

Header action sketch:

```tsx
<PageHeader
  title={title}
  description="Edit one menu at a time. Change metadata, refine the structure, and publish when ready."
  actions={
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isPublished ? "default" : "outline"}>
        {isPublished ? "Published" : "Draft"}
      </Badge>
      <Button variant="ghost" onClick={handleDiscard} disabled={!canSave || isMutating}>
        Discard
      </Button>
      <Button variant="secondary" onClick={() => persistMenuEditorState()} disabled={!canSave || isMutating}>
        <Save className="h-4 w-4" />
        {pendingAction === "save" ? "Saving..." : "Save changes"}
      </Button>
      {!isPublished ? (
        <Button onClick={() => persistMenuEditorState({ nextStatus: "published", successMessage: "Menu published." })} disabled={isMutating}>
          Publish
        </Button>
      ) : (
        <Button variant="outline" onClick={() => persistMenuEditorState({ nextStatus: "draft", successMessage: "Menu moved to draft." })} disabled={isMutating}>
          Move to Draft
        </Button>
      )}
    </div>
  }
/>
```

Keep refresh only in contextual recovery:

```tsx
{remoteUpdatePending ? (
  <Alert>
    <AlertTitle>Updated in another tab</AlertTitle>
    <AlertDescription>
      <Button onClick={() => loadMenu(menuId, { force: true, allowUnsaved: true })}>
        Refresh
      </Button>
    </AlertDescription>
  </Alert>
) : null}
```

## Error Handling

- Invalid item payload:
  - keep current inline error;
  - focus/select the invalid item;
  - do not publish.
- API error:
  - show mapped API message;
  - emit toast error;
  - clear pending action.
- Concurrent click:
  - synchronous ref guard must ignore rapid second clicks before React disabled
    props update.

## Testing Requirements

- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - editor header does not contain `Back to menus` or header `Refresh`;
  - header contains `Discard`, `Save changes`, status badge, and `Publish` for
    a draft menu;
  - clicking `Publish` with unsaved metadata calls `updateMenu` with metadata
    and `status: "published"`;
  - rapid save/publish clicks do not start two mutations.
- `tests/vitest/ui/menu-editor-validation.test.ts`
  - update helper coverage if item payload building is extracted.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/screens/menus.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Header primary actions are editor actions, not navigation/reload actions.
2. Draft menu editor exposes `Publish`.
3. Published menu editor exposes current lifecycle state and an intentional
   draft transition path.
4. Publish persists valid unsaved editor state first.
5. Save and publish cannot run concurrently.
