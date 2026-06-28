# TASK-479-12-L04: Collection Workspace & Detail Template Restyle
# FileName: TASK-479-12-L04-Collection-Workspace-And-Detail-Template.md

**Priority:** Medium
**Category:** Admin UI / Engine / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-12

---

## Overview

Restyle the two collection surfaces to the prototype: the **collection
workspace** gains the line-variant tab set (**Entries / Detail template /
Settings**) and soft-card overview + readiness chrome, and the **detail-template
editor** gets the soft/violet editor chrome (header, tabs, panels) over its
existing page-builder. The detail-template editor intentionally keeps its existing
3-pane `EditorShell` page-builder (no prototype canvas source) — it does NOT adopt
the floating `CanvasEditor`; that decision is deliberate. All data, the
detail-template create/delete + site-route linking flow, autosave/publish, and the
block-builder logic are preserved.

- **Goal:** Bring `CollectionWorkspacePage.tsx` and `DetailTemplateEditorPage.tsx`
  to the prototype look while keeping the workspace summary/readiness data, the
  detail-template create/link/delete flow (with its `siteSettings.contentRoutes`
  upsert/rollback), and the detail-template page-builder (BlockList/BlockSettings/
  LibraryPanel) behavior fully intact.
- **Owning module/service:**
  `core/admin/ui/content-types/CollectionWorkspacePage.tsx` (+ `CollectionOverview.tsx`,
  `CollectionReadinessChecklist.tsx`) and
  `core/admin/ui/content-types/DetailTemplateEditorPage.tsx` (+
  `DetailTemplateBindingPanel.tsx`, `detailTemplateEditorModel.ts`), backed by
  `contentTypesClient.ts`, `detailPagesClient.ts`, `siteSettingsClient.ts`.
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md`,
  `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/pages/advanced/CollectionWorkspacePage.tsx` plus
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,FilterBar,DataTable}.tsx`
  and `_docs/_PROTOTYPE/src/components/ui/tabs.tsx`. In core, `PageHeader`,
  `SectionCard`, `FilterBar`, and `DataTable` come from TASK-479-06-L02; the real
  Tabs primitive is `core/admin/components/ui/tabs.tsx`
  (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, Radix — no `items` prop; the
  underline style is `<TabsList variant="line">`). The prototype's
  `EditorPreviewFrame` is **not** ported (06-L02 out of scope): the collection
  workspace stays on `AdminShell` and the detail-template editor stays on the real
  `EditorShell`.
- **Out of scope:** No change to the page-builder block model, the
  detail-template document normalization (`detailTemplateEditorModel.ts`), the
  autosave/publish/restore endpoints, or the `contentRoutes` schema. The shared
  block primitives are restyled by the Pages-editor migration / TASK-479-07 — here
  we reuse them and restyle only the surrounding editor chrome.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

### A) CollectionWorkspacePage.tsx

Keep `resolveContentTypeIdFromPath`, `refreshWorkspace`, the
`getCachedContentTypeCollectionWorkspace` hydrate + `getContentTypeCollectionWorkspaceCached`
revalidate, the `requestSeq` race guard, `subscribeCacheEvents`
(`contentTypeCollectionWorkspace`/`contentTypeDetail`/`contentTypesList`) →
`remoteUpdatePending`, and `handleCreateDetailTemplate`/`handleConfirmDetailTemplateDelete`
(including the `siteSettings.contentRoutes` upsert + rollback). Replace JSX.

Port the tab set from prototype `CollectionWorkspacePage.tsx`.

```tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // real Radix Tabs (no `items` prop)
type WsTab = "entries" | "template" | "settings";
const [tab, setTab] = useState<WsTab>("entries"); // local UI state, lazy init, no effect

return (
  <AdminShell activeHref="/admin/advanced/engine" breadcrumbs={["Advanced", "Engine", "Collection"]}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader title={headerTitle} description={headerDescription} actions={/* keep Ready/Open Badge + Refresh */} />
      {/* keep remoteUpdatePending / error / isLoading blocks verbatim */}
      {/* Real Tabs API: <Tabs> controls trigger state; bodies render below by `tab`. Underline = variant="line". */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as WsTab)}>
        <TabsList variant="line">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="template">Detail template</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>
      {summary && tab === "entries" && (
        <>
          {/* "Edit detail template" link → AdminLink to buildDetailTemplateEditorHref(...) via resolveAdminRoutePath */}
          <CollectionOverview summary={summary} … /> {/* restyle its internals to soft cards; keep create/delete handlers */}
        </>
      )}
      {summary && tab === "template" && (/* CollectionOverview's detail-template section / readiness, restyled */)}
      {summary && tab === "settings" && (<CollectionReadinessChecklist summary={summary} />)}
    </div>
    {/* keep the detail-template delete ConfirmActionDialog verbatim */}
  </AdminShell>
);
```

If the entries tab adopts the prototype's `FilterBar` + `DataTable` +
`Pagination`, it must bind to REAL workspace entry data (or the existing
`CollectionOverview` content) — do NOT add a new fetch; reuse the data already on
`summary`. The "New entry" / "Edit detail template" links route through
`AdminLink` + `resolveAdminRoutePath` (targets =
`buildDetailTemplateEditorHref(contentTypeId, detailPageId)` and the existing
entry routes). No hand-built `<a href>`.

### B) DetailTemplateEditorPage.tsx

This is a full page-builder on `EditorShell` with `Tabs`
(`TabsList`/`TabsTrigger`/`TabsContent`) and `BlockList`/`BlockSettings`/
`LibraryPanel`. Keep ALL of it: `getCachedDetailPage` hydrate +
`getDetailPageCached`, autosave/`updateDetailPage`/`publishDetailPage`/
`unpublishDetailPage`/revision restore/discard, the `cacheKeys`/`subscribeCacheEvents`
wiring, the assistant surface context, and the block utils. Restyle chrome only.

```tsx
// DetailTemplateEditorPage.tsx — chrome only.
// 1) EditorShell header/toolbar → prototype editor look (soft/violet, rounded-2xl,
//    "Preview"/"History"/"Save"/"Publish" buttons restyled; keep onClick handlers).
// 2) Keep <Tabs> for the editor's existing sections (real Template/Data/Widget
//    TabsList/TabsTrigger/TabsContent); restyle TabsList with variant="line"
//    (NOT "underline"). Do NOT change tab values or TabsContent wiring.
// 3) BlockList / BlockSettings / LibraryPanel reused as-is (restyled by TASK-479-07).
// 4) DetailTemplateBindingPanel restyled to a soft inspector card; binding data flow unchanged.
```

**Data flow:** workspace summary hydrate → revalidate (race-guarded) → tabbed
render; detail template document hydrate → autosave/publish on the existing
debounced flow. Tab switching is local UI state. No mount-force refetch loop is
added; the existing single revalidate-on-mount stays.

**Error handling:** keep `getErrorMessage`, the workspace `error`/`remoteUpdatePending`
Alerts, the create-then-rollback (`deleteDetailPage` cleanup) and
delete-then-restore (`updateSiteSettings(previousRoutes)`) compensation paths, and
the editor's autosave/publish toast adapters. Preserve dirty-state — do not
overwrite unsaved editor state on background revalidation. No sync `setState` in
effects (ESLint 9 react-hooks).

**Regression-test shape (see L05):** an SSR `renderAdminUi` render asserts the
always-visible chrome — the workspace's three tab triggers (Entries / Detail
template / Settings) + the Refresh button + header — and that the detail-template
editor renders its `EditorShell` chrome, its Template/Data/Widget tab triggers,
and the BlockList/LibraryPanel/BindingPanel region markers. Do NOT assert the
Ready/Open badge (gated on `summary`), `CollectionOverview` (renders only when
`summary` is present), or `CollectionReadinessChecklist` (lives in the inactive
**Settings** tab) under SSR — exercise those in a **seeded** test with the repo
idiom (`// @vitest-environment happy-dom` + `createRoot`/`act` + a `vi.mock` of the
workspace clients, like the existing
`tests/vitest/ui/collection-workspace.test.tsx`), where you can also assert the
"Edit detail template" / "New entry" links resolve through `AdminLink` to
admin-prefixed canonical hrefs (not hand-built unresolved hrefs).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx tests/vitest/ui/collection-workspace.test.tsx`

Update literal-markup assertions in `tests/vitest/ui/collection-workspace.test.tsx`
where tabs replace the old stacked layout; keep behavioral assertions (Refresh,
Ready/Open badge, create/delete detail-template affordances). State in the
summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-12-L04`.
- `_docs/CONTENT_TYPES_SPEC.md` — note the tabbed collection workspace + restyled
  detail-template editor if the spec documents that UX (no data/API change).
