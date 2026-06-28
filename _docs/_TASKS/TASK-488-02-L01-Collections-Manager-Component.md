# TASK-488-02-L01: Collections manager component + draft model
# FileName: TASK-488-02-L01-Collections-Manager-Component.md

**Parent Subtask:** TASK-488-02
**Priority:** Medium
**Category:** Commerce / Admin UI
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Build a collections management page component that lists collections
  and supports create / edit / delete, wiring the **existing**
  `commerceClient` collection functions. It reuses `AdminShell`, `PageHeader`,
  `ConfirmActionDialog`, and `@/components/ui/*` (Dialog/Input/Textarea/Button)
  exactly like `CommerceListPage`. A small pure draft model (name / slug /
  description) lives alongside it.
- **Owning module(s) to create-or-extend (new files):**
  `core/admin/ui/commerce/CommerceCollectionsPage.tsx` (page + list + create/edit
  dialog + delete confirm) and
  `core/admin/ui/commerce/commerceCollectionModel.ts` (draft model + helpers).
- **Source-of-truth docs:** `_docs/CMS_API.md` (Commerce v1 — Collections
  endpoints + payload), `_docs/CMS_SPEC.md` (Commerce v1 scope).
- **Out-of-scope:** Router registration and nav entry points (TASK-488-02-L02);
  variant editor (TASK-488-01); any backend change.

### Verified current state (client + routes already exist)

- `commerceClient.ts` exports, all unchanged by this leaf:
  - `listCommerceCollectionsCached({ force? })`, `listCommerceCollections()`
  - `createCommerceCollection(input: CommerceCollectionInput)` `{ withCsrf: true }`
  - `updateCommerceCollection(id, input: CommerceCollectionUpdateInput)` `{ withCsrf: true }`
  - `deleteCommerceCollection(id)` `{ withCsrf: true }`
  - types `CommerceCollectionRecord`, `CommerceCollectionInput`,
    `CommerceCollectionUpdateInput`, plus `broadcastCacheEvent`/local-cache
    upkeep (`upsertCollection`/`removeCollection`) already handled internally.
- `CommerceCollectionInput = { name: string; slug?: string | null;
  description?: string | null }`.
- Server schema: `commerceCollectionCreateSchema` requires `name`
  (1–160), optional `slug` (slug pattern, 1–160), optional `description`
  (≤1000); update schema is `minProperties: 1`. `additionalProperties: false`.
- Error mapping at route boundary (`mapCommerceError`):
  `commerce_collection_slug_exists` → 409,
  `commerce_collection_not_found` → 404, other `commerce_*` → 400.
- Reusable UI confirmed present: `AdminShell`, `PageHeader`,
  `ConfirmActionDialog`, `useAdminRouter`, `isApiClientError`.

## Security Contract

- **Endpoint visibility:** internal (`/admin/api/commerce/collections[/:id]`) —
  consumed, not added.
- **Auth model:** session-based admin. List/read → `commerce:read`;
  create/update/delete → `commerce:write` (existing `commerceRoutes`).
- **RBAC:** the page is reached via a `commerce:read`-gated route (L02);
  each mutation calls a `commerce:write`-gated endpoint. No new permission.
- **CSRF:** required on internal writes — already attached by `commerceClient`
  for create/update/delete (`{ withCsrf: true }`). No change.
- **Rate-limit bucket:** n/a — no new endpoint; inherits the admin API bucket of
  the existing collection write routes.
- **Validation:** Schema owner unchanged: server `commerceCollectionCreateSchema`
  / `commerceCollectionUpdateSchema` (`additionalProperties: false`,
  reject-unknown) + `commerceService` normalizers
  (`commerce_collection_name_required`, slug uniqueness). Client trims fields and
  sends `slug`/`description` as `null` when blank (server derives slug from name
  when omitted) — defensive only.
- **Anti-abuse:** n/a — authenticated internal admin write; no public/anonymous
  surface, so nonce/HMAC/CAPTCHA evaluators do not apply.
- **Secret/PII handling:** collection name/slug/description carry no secrets/PII;
  reuses the existing `cacheKeys.commerceCollectionsList` cache only.

## Implementation Pseudocode

```ts
// commerceCollectionModel.ts
import type { CommerceCollectionInput, CommerceCollectionRecord } from "@/services/commerceClient";

export type CollectionDraft = { id: string | null; name: string; slug: string; description: string };

export const emptyCollectionDraft = (): CollectionDraft =>
  ({ id: null, name: "", slug: "", description: "" });

export const draftFromCollection = (c: CommerceCollectionRecord): CollectionDraft =>
  ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "" });

export const toCollectionInput = (d: CollectionDraft): CommerceCollectionInput => ({
  name: d.name.trim(),
  slug: d.slug.trim() || null,          // server derives from name when null
  description: d.description.trim() || null,
});

export const isCollectionDraftValid = (d: CollectionDraft) => d.name.trim().length > 0;
```

```tsx
// CommerceCollectionsPage.tsx
export function CommerceCollectionsPage() {
  const { navigate } = useAdminRouter();
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<CollectionDraft | null>(null); // dialog open when non-null
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = (force = true) =>
    listCommerceCollectionsCached({ force }).then(setCollections);

  useEffect(() => { refresh().catch(setApiError).finally(() => setIsLoading(false)); }, []);

  const handleSave = async () => {
    if (!editing || !isCollectionDraftValid(editing)) return;
    setIsSaving(true); setError(null);
    try {
      if (editing.id) await updateCommerceCollection(editing.id, toCollectionInput(editing));
      else await createCommerceCollection(toCollectionInput(editing));
      await refresh(true);
      setEditing(null);
    } catch (e) {
      setError(isApiClientError(e) ? e.message : "Failed to save collection.");
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCommerceCollection(id); await refresh(true); setPendingDeleteId(null); }
    catch (e) { setError(isApiClientError(e) ? e.message : "Failed to delete collection."); }
  };

  return (
    <AdminShell activeHref="/admin/advanced/commerce" breadcrumbs={["Coderso","Commerce","Collections"]}>
      <PageHeader title="Collections"
        description="Create and manage product collections."
        actions={<Button onClick={() => setEditing(emptyCollectionDraft())}>New collection</Button>} />
      {/* error Alert; loading state; list of collections with Edit + Delete buttons */}
      {/* create/edit Dialog bound to `editing`; Save disabled unless isCollectionDraftValid */}
      <ConfirmActionDialog open={Boolean(pendingDeleteId)} title="Delete collection?"
        description="Products keep their other assignments; this removes the collection. This cannot be undone."
        confirmLabel="Delete collection"
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }} />
    </AdminShell>
  );
}
```

**Data flow:** mount → `listCommerceCollectionsCached({force:true})` →
render list. Create/Edit dialog → `toCollectionInput` → `createCommerceCollection`
/ `updateCommerceCollection` (CSRF) → `commerceClient` updates the shared cache +
`broadcastCacheEvent` → local `refresh()` re-reads. Delete →
`deleteCommerceCollection` → confirm dialog → `refresh()`.

**Error handling:** all calls wrapped in try/catch; surface
`isApiClientError(e).message`. The 409 `commerce_collection_slug_exists` and 404
`commerce_collection_not_found` already carry human messages from
`mapCommerceError`; show them inline in the dialog/page `error` Alert. The Save
button stays disabled until `isCollectionDraftValid` (non-empty name).

**Regression-test shape:**

- Model (Vitest): `toCollectionInput` trims + nullifies blanks;
  `draftFromCollection` round-trips; `isCollectionDraftValid` rejects blank name.
- UI (Vitest, ui-integration): render shows "New collection"; opening the dialog,
  typing a name, and saving calls `createCommerceCollection`; editing an existing
  row calls `updateCommerceCollection`; delete confirm calls
  `deleteCommerceCollection`; a rejected save surfaces the error message.

## Testing Requirements

- **Lane:** Vitest. Model spec in `tests/vitest/admin/`; render/interaction spec
  in `tests/vitest/ui-integration/commerce-collections-manager.test.tsx`.
- Stub/mocking follows the existing commerce UI tests
  (`tests/vitest/ui/commerce-page.test.tsx` localStorage cache seeding pattern,
  or module-level mock of `commerceClient`), keeping the test pure (no network).
- No DB changes → no migration artifacts.
- Green under `bun run lint`, `bun run typecheck`, Vitest suite.
