# TASK-038-05: Forms List and Editor Split
# FileName: TASK-038-05_Forms_List_and_Editor_Split.md

**Priority:** High  
**Category:** CMS/Forms  
**Estimated Effort:** Large  
**Dependencies:** TASK-038-04, TASK-053-07  
**Status:** Done (2026-02-17)

---

## Overview
Replace the single-form builder screen with a WordPress-like list view and a per-form editor route. Remove the auto-create-on-load behavior and make form creation explicit. Upgrade the editor UX to support form-level settings and a richer field list.

## Goals
- Forms list table similar to Pages (search, status badge, last updated, actions).
- Dedicated editor route per form (`/forms/:id`).
- No implicit form creation on load.
- Cached list/detail for instant hydration + background refresh.
- Form-level settings (name/title + description) editable from the canvas.
- Richer field list and representation, consistent with the Forms screen style.
- Responsive editor with mobile panel toggles (left + right).

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/cachePolicy.ts` | Add `forms:list` + `forms:detail:<id>` cache keys. |
| `core/admin/services/formsClient.ts` | Add `listFormsCached`, `getFormCached`, `getCachedForms`, `getCachedFormDetail`, cache invalidation on create/update/delete/fields. Broadcast cache events. |
| `core/admin/ui/forms/FormListPage.tsx` | New list UI (table + filters + actions). Hydrate from cache, background revalidate, subscribe to cache bus. Show description + status. |
| `core/admin/ui/forms/FormEditorPage.tsx` | Refactor `FormBuilderPage` to load by `formId` param. Remove auto-create default form. |
| `core/admin/ui/forms/FormBuilderPage.tsx` | Convert into `FormEditorPage` or keep as a wrapper exporting the editor. |
| `core/admin/ui/forms/FormCanvas.tsx` | Make header dynamic (title + description). Support selecting the form container (not a field). |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | Add “Form settings” mode when form container selected (title/name + description). Persist via `updateForm`. |
| `core/admin/ui/forms/FieldLibrary.tsx` | Keep as source of field types. |
| `core/admin/ui/forms/FieldListPanel.tsx` | New panel: list all fields with icons, required badges, drag handles. Click to select field. |
| `core/admin/app/AdminApp.tsx` | Route `/forms` -> list, `/forms/:id` -> editor. |
| `core/admin/ui/navigation/sidebarConfig.ts` | Ensure Forms nav points to `/admin/forms`. |
| `core/admin/ui/layouts/EditorShell.tsx` | Reuse to get mobile left/right panel toggles for Forms editor. |
| `core/admin/utils/adminPrefetch.ts` | Optional prefetch for `/forms` -> `listFormsCached({ force: true })`. |
| `tests/unit/admin/formsClient.test.ts` | Add cache read/write coverage for list/detail. |
| `tests/unit/ui/forms-list.test.tsx` | List rendering, empty state, search filter. |
| `tests/unit/ui/forms-editor.test.tsx` | Editor loads fields, form settings, and handles errors. |

## Pseudocode

### List hydration + refresh
```ts
const cached = getCachedForms();
const [items, setItems] = useState(cached ?? []);
const [isLoading, setIsLoading] = useState(!cached);

useEffect(() => {
  if (cached) setIsLoading(false);
  refresh({ force: true });
}, []);

const refresh = async ({ force, background }) => {
  if (!background) setIsLoading(true);
  const next = await listFormsCached({ force });
  setItems(next);
  if (!background) setIsLoading(false);
};

subscribeCacheEvents((event) => {
  if (event.key === cacheKeys.formsList) refresh({ force: true, background: true });
});
```

### Editor load
```ts
const form = await getFormCached(formId, { force: true });
const fields = await listFormFields(formId);
```

### Form settings (canvas selection)
```ts
onSelectFormContainer() => setSelectedFieldId(null);

onSaveFormSettings({ name, description }) => updateForm(formId, { name, description });
```

## UX/Edge Cases
- If a form is deleted while open, show a warning and route back to `/forms`.
- Keep unsaved builder changes locally; only overwrite on explicit reload.
- If no forms exist, show an empty state with a “Create form” action.
- Use `name` as the card title and `description` as subtitle in the list.

## Documentation Updates Required
- `_docs/ADMIN_CACHE.md` (forms cache keys + behavior)
- `_docs/ADMIN_CACHE_MAP.md` (forms list + editor mapping)

## Changelog Entry (planned)
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-list-and-editor.md`
