# TASK-479-23-L01: Templates List Restyle
# FileName: TASK-479-23-L01-Templates-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced (Page Templates)
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-23

---

## Overview

Restyle the real Page Templates library list to the prototype look: a `PageHeader`
with title + description + "New template" action, a violet **propagation note**
card ("change a site-wide template once and every page using it updates
automatically"), and the template entries shown with a **scope** indicator, a
**usage hint** + section count, and Edit / Preview / Duplicate / Delete actions.
The list keeps its real data source (`usePageTemplates`), search + status tabs,
create dialog, duplicate, and delete-confirm flows untouched.

- **Goal:** `core/admin/ui/pages/templates/PageTemplatesPage.tsx` renders in the new
  design language (soft/violet, `rounded-2xl`, soft shadows) without changing its
  data flow, filtering, create/duplicate/delete handlers, or the cache contract.
- **Owning module/service:** `core/admin/ui/pages/templates/PageTemplatesPage.tsx`
  (+ `usePageTemplates.ts` consumed read-only); shared
  `core/admin/ui/shared/PageHeader.tsx`, `core/admin/components/ui/{card,badge,button,table,tabs,input,dialog}.tsx`,
  `core/admin/ui/shared/ConfirmActionDialog.tsx`.
- **Source-of-truth docs:** `_docs/DESIGN_TOKENS.md` (token names),
  `_docs/TESTING_STRATEGY.md` (Vitest lane). **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/pages/advanced/PageTemplatesPage.tsx` (card grid + `PageThumb`
  + scope `Badge` + "Used on N pages · M sections" + propagation note card +
  Edit/Preview) and pattern primitives in
  `_docs/_PROTOTYPE/src/components/{patterns/PageHeader,ui/card,ui/badge,ui/button}.tsx`.
- **Out of scope:** No change to `listPageTemplatesCached` / `getCachedPageTemplates`
  / `createPageTemplate` / `duplicatePageTemplate` / `deletePageTemplate` clients, no
  new endpoints, no schema fields. **Honesty guard:** the prototype's `scope`
  ("Site-wide / Section / Page") and `usedOn` count are mock fields — the real
  `PageTemplateSummary` (`id,name,slug,description,category,status,sectionsCount,
  createdAt,updatedAt`) has neither. Do **not** invent a scope enum or a random
  usage number. Render the scope indicator only from a **real** signal (e.g. derive
  a "Site-wide" vs "Page" hint from `category` if and only if the data already
  encodes it, otherwise show `category` / `status`), and surface "N sections" from
  the real `sectionsCount`; show a usage count only if the real summary later gains
  one, else omit it (no em-dash needed where the metric simply does not exist).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Row navigation and the "New template" CTA keep
routing through `useAdminRouter().navigate` to `/advanced/page-templates/:id` (and
canonical helpers where a real `<a>`/prefetch is used); nothing here touches auth,
RBAC, CSRF, or the `cacheKeys.pageTemplatesList` cache key.

---

## Implementation Pseudocode

Keep `PageTemplatesPage`'s entire state/handler block (`useState`/`useMemo` for
`search`/`statusFilter`/`createOpen`/`deleteTarget`/`duplicatingId`, `filtered`,
`counts`, and the `handleCreate`/`handleDuplicate`/`handleDelete` async handlers,
plus `usePageTemplates()` and `createDefaultPageDocumentV2()`) **verbatim** — that is
the data/cache contract. Only the **returned JSX** and the entry presentation change.

```tsx
// core/admin/ui/pages/templates/PageTemplatesPage.tsx  (render only — logic unchanged)
// Port the visual shells from _docs/_PROTOTYPE/src/pages/advanced/PageTemplatesPage.tsx
return (
  <AdminShell activeHref="/admin/pages" breadcrumbs={[{label:"Content"},{label:"Pages",href:"/pages"},{label:"Templates"}]}>
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader   /* shared PageHeader from TASK-479-06-L02 */
        title="Page Templates"
        // KEEP the existing description copy verbatim — the green
        // `page-templates-surface.test.tsx` asserts `toContain("Reusable Page v2
        // section stacks")`; do NOT relabel it here (the "edit once, update
        // everywhere" propagation message lives in the dedicated note card below,
        // not the header). Relabel only if L03 simultaneously updates that assertion.
        description="Reusable Page v2 section stacks"
        actions={/* keep existing: New template Button -> setCreateOpen(true) */}
      />

      {/* PROPAGATION NOTE — port the prototype's violet soft card + RefreshCw icon.
          Use shared soft tokens (bg-primary-soft/50, text-primary, rounded-2xl) from
          TASK-479-05. Static, informational; no data binding required. HONESTY /
          OWNERSHIP: keep the copy page-scoped ("every page using it updates"). A Page
          Template can be the site FOOTER (site.footerTemplateId); the header / main
          menu is a published Menu (site.navigationMenuId, owned by TASK-479-10), NOT a
          template — do not imply the main menu propagates from here (see the parent
          23 propagation-ownership reconciliation note). */}
      <Card className="flex items-center gap-3 bg-primary-soft/50 p-4">
        <RefreshCw className="size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Change a <span className="font-medium text-foreground">site-wide</span> template once and
          every page using it updates automatically.
        </p>
      </Card>

      {error ? <Alert variant="destructive">…</Alert> : null}
      {actionError ? <Alert variant="destructive">…</Alert> : null}

      {/* Keep the EXISTING search + status Tabs filter row (All/Published/Draft with
          real counts from `counts`); restyle to soft tokens only. */}
      <FilterRow search/setSearch statusFilter/setStatusFilter counts={counts} />

      {/* ListSkeleton + EmptyState are the shared primitives from TASK-479-06-L02
          (do not invent local variants); soft/success Badge + soft Button variants
          and font-display are TASK-479-05 tokens. */}
      {isLoading ? <ListSkeleton/> : filtered.length === 0 ? <EmptyState/> : (
        // ENTRY PRESENTATION — adopt the prototype's card-grid look (PageThumb +
        // name + scope Badge + "N sections" + Edit/Preview/Duplicate/Delete). A
        // restyled DataTable is an acceptable alternative IF the grid hurts scanning
        // of name/category/status/sections/updated; either way KEEP every existing
        // action handler and the data-page-template-row={item.id} hook.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <Card key={item.id} data-page-template-row={item.id} className="flex h-full flex-col p-4">
              <PageThumb />{/* port the prototype skeleton thumb (pure presentation) */}
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="text-left font-display text-[15px] font-semibold hover:underline"
                  onClick={() => navigate(`/advanced/page-templates/${item.id}`)}>{item.name}</button>
                {/* SCOPE badge: real signal only — show category or status tone,
                    NOT a fabricated "Site-wide". success tone for published. */}
                <Badge variant={item.status === "published" ? "success" : "outline"}>
                  {item.category ?? item.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.slug} · {item.sectionsCount} {item.sectionsCount === 1 ? "section" : "sections"}
                {" · "}Updated {new Date(item.updatedAt).toLocaleDateString()}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="soft" size="sm" className="flex-1 gap-1.5"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => navigate(`/advanced/page-templates/${item.id}`)}>
                  <Pencil className="size-4" /> Edit
                </Button>
                {/* Preview keeps the existing semantics (previewPageTemplate via the
                    editor today); if the list has no preview action yet, wire it to
                    navigate to the editor + open preview — do NOT add a new endpoint. */}
                <Button variant="ghost" size="icon-sm" aria-label={`Duplicate ${item.name}`}
                  disabled={duplicatingId === item.id} onClick={() => handleDuplicate(item.id)}>
                  <Copy className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.name}`}
                  onClick={() => setDeleteTarget(item)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
    {/* Create Dialog + ConfirmActionDialog (delete) unchanged — restyle to soft tokens only */}
  </AdminShell>
);
```

**Data flow:** `getCachedPageTemplates()` lazy-init (via `usePageTemplates`) → render
from cache → mount `listPageTemplatesCached({force:true})` hydrate →
`subscribeCacheEvents` on `cacheKeys.pageTemplatesList` triggers `refresh(true)` →
`filtered`/`counts` derive from the loaded `items` with `useMemo`. **None of this
moves;** restyle is presentational. Create navigates to
`/advanced/page-templates/:id` on success; duplicate/delete call `refresh(true)`.

**Error handling:** keep the existing `error` and `actionError` Alert banners and the
`resolveActionError` mapping; restyle to the soft destructive tokens. Search/tab
changes must not refetch (they filter the already-loaded array). Do **not** add a
mount-force refetch or any `useEffect` that synchronously `setState`s from derived
data — keep `counts`/`filtered` as `useMemo`/render-time derivation (ESLint 9
react-hooks compliant).

**Regression-test shape:** see TASK-479-23-L03 — assert the header + description, the
propagation note, status tabs with real counts, a seeded template's name + section
count, and the scope/status badge from real fields (not a fabricated "Site-wide"/usage
number). Navigation is via `onClick={() => navigate("/advanced/page-templates/:id")}`,
so the route string is **never** emitted in the SSR `renderToString` output — assert
the row/action affordances via the SSR-emitted hooks instead: `data-page-template-row={id}`
plus the `aria-label="Edit/Duplicate/Delete …"` buttons and that the create dialog still
renders. (Do **not** assert `toContain("/advanced/page-templates/:id")` — unsatisfiable
under `renderAdminUi`.)

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/page-templates-list.test.tsx`
- The pre-existing assertions in `page-templates-surface.test.tsx` that target the
  list must remain true (they are the real on-disk assertions): header `"Page Templates"`,
  description `"Reusable Page v2 section stacks"`, `"New template"`, the breadcrumb
  `href="/admin/pages"` + `aria-current="page">Templates`, the seeded
  `data-page-template-row="tpl-1"` + `"Landing stack"` / `"landing-stack"` / `"marketing"`,
  the status-tab counts (`"Published (1)"` / `"Draft (0)"` after stripping SSR
  `<!-- -->` markers), and `aria-label="Duplicate/Delete Landing stack"`. There is **no**
  `/advanced/page-templates/:id` route-string assertion (navigation is `onClick`, not an
  `href`, so the SSR string never contains it). Update any of these only if the visual
  structure intentionally relabels — and then update the assertion in the same change;
  add the new-structure assertions in L03.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-23-L01**.
- No contract-doc changes expected (visual-only). If the scope/usage hint resolution
  materially differs from `PageTemplateSummary` (e.g. a real `usedOn`/scope field is
  introduced), note it explicitly in the changelog entry.
