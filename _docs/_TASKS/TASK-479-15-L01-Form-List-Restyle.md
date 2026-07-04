# TASK-479-15-L01: Form List Restyle
# FileName: TASK-479-15-L01-Form-List-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Forms / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
**Parent Subtask:** TASK-479-15

---

## Overview

Restyle the forms list to the prototype's `FormsPage`: a soft-card **stat band**
over a `rounded-2xl` **DataTable**-style list. All real data, filters, selection,
bulk actions, pagination, the create drawer, and the delete/bulk-delete confirm
flows are preserved — only presentation changes.

- **Goal:** Give the forms list the soft/violet, `rounded-2xl` look of the
  prototype (stat band + restyled table) while keeping the live `useForms`
  data, search/status/access filters, bulk publish/draft/archive/delete,
  selection, pagination, create drawer, and delete confirm flows fully intact.
- **Owning module/service:** `core/admin/ui/forms/FormListPage.tsx`
  (plus its presentational children `FormTable.tsx`, `FormFilters.tsx`,
  `FormBulkActionsBar.tsx`, `FormRowActions.tsx`), backed by
  `core/admin/services/formsClient.ts` and `core/admin/ui/forms/hooks/useForms.ts`.
- **Source-of-truth docs:** `_docs/FORMS_SPEC.md`, `_docs/DESIGN_TOKENS.md`;
  prototype source `_docs/_PROTOTYPE/src/pages/advanced/FormsPage.tsx` and shared
  primitives
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,DataTable,StatusBadge}.tsx`,
  `_docs/_PROTOTYPE/src/components/ui/{card,button,badge}.tsx`.
- **Out of scope:** No change to `formsClient` calls, `useForms`, `cacheKeys`,
  the bulk-action semantics, or the create/delete server flows. No new columns
  backed by data the real `FormRecord` does not carry (see decision below).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Target file: `core/admin/ui/forms/FormListPage.tsx` (keep the entire
state/effect/handler block from the current file — `useForms()`,
`getUserSettings`/`setUserSetting` effect, `filterForms`, `useListPagination`,
`visibleSelectedIds`/`isAllSelected`/`isIndeterminate`, `handleCreate`,
`handleSetStatus`, `runDelete`, `runBulkAction`, `handleBulkApply`,
`handleDrawerOpenChange`, both `ConfirmActionDialog`s, `FormCreateDrawer`). Only
the returned JSX (header, stat band, table wrapper) changes.

Port from prototype `FormsPage.tsx` (StatCard band + DataTable columns + the
"Recent submissions" footer link).

```tsx
// FormListPage.tsx — RENDER ONLY changes. Logic above `return` is unchanged.

// 1) Stat band — derive ONLY from data already in `items` (no fetch, no effect,
//    no setState). FormRecord has NO fieldCount/submissionCount, so the
//    prototype's "Submissions this month / Avg. conversion" numbers are MOCK and
//    MUST NOT be fabricated. Show real, derivable stats instead.
const stats = useMemo(() => {
  const total = items.length;
  const active = items.filter((f) => f.status === "published").length;
  const drafts = items.filter((f) => f.status === "draft").length;
  return { total, active, drafts };
}, [items]);

// 2) Stat band markup (ports FormsPage StatCard row; uses the SHARED StatCard
//    from 479-06-L02, NOT the prototype's mock-spark StatCard). The shared
//    StatCard contract is { label, value (string), icon?, accent?, delta? } —
//    there is NO `hint`/spark prop, so stringify the derived counts and drop the
//    mock subline (the legacy dashboard-local StatCard at
//    core/admin/ui/dashboard/StatCard.tsx has the same prop shape).
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  <StatCard label="Total forms" value={String(stats.total)} icon={<ClipboardList />} accent="primary" />
  <StatCard label="Active" value={String(stats.active)} icon={<CheckCircle2 />} accent="success" />
  <StatCard label="Drafts" value={String(stats.drafts)} icon={<FileEdit />} />
</div>

return (
  <AdminShell activeHref="/admin/advanced/forms" breadcrumbs={["Content", "Forms"]}>
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Forms"
        description="Collect submissions and route them anywhere."
        actions={/* keep selectedCount>0 ? <FormBulkActionsBar .../> + the New <Button onClick={() => handleDrawerOpenChange(true)}> */}
      />
      {/* keep the error + submitError <Alert> blocks verbatim */}
      {/* stat band (above) */}
      <FormFilters
        search={searchQuery} status={statusFilter} access={accessFilter}
        onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onAccessChange={setAccessFilter}
      /> {/* restyled to rounded-2xl card; same props */}
      {isLoading ? <FormTableSkeleton /> :
        <FormTable
          items={pagination.visibleRows}
          emptyMessage={items.length > 0 ? "No forms match your current filters." : undefined}
          selectedIds={visibleSelectedIds} isAllSelected={isAllSelected} isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll} onToggleForm={handleToggleForm}
          onEdit={handleEdit} onSubmissions={handleSubmissions} onActionLogs={handleActionLogs}
          onPublish={(id) => handleSetStatus(id, "published", "publish")}
          onMoveToDraft={(id) => handleSetStatus(id, "draft", "draft")}
          onArchive={(id) => handleSetStatus(id, "archived", "archive")}
          onDelete={setPendingDeleteId}
        />}
      <ListPaginationFooter resourceLabel="forms" pagination={pagination} isLoading={isLoading} />
    </div>
    {/* keep FormCreateDrawer + both ConfirmActionDialog blocks verbatim */}
  </AdminShell>
);
```

`FormTable.tsx` restyle: keep the `<Table>` structure, the per-row `Checkbox`,
the name `AdminLink href={`/advanced/forms/${encodeURIComponent(form.id)}`}
prefetch`, the Status/Access `Badge`s, `formatDate`, and `FormRowActions`. Change
only the container chrome to `rounded-2xl` + soft shadow, give the name cell the
prototype's `size-9 rounded-xl bg-primary-soft` icon chip, and swap the local
`statusStyles`/`accessStyles` literals for the shared semantic `StatusBadge`
tokens where they map cleanly. Keep all `onToggle*`/`on*` callbacks.

The loading state replaces the current inline `Loading forms…` text with
`FormTableSkeleton` — the shared table/list skeleton **created by 479-06-L02**
(`FormTableSkeleton`/`ListSkeleton`, or the generic `TableSkeleton`); it does NOT
exist in core today, so do not invent a divergent local skeleton here.

**Data flow:** `useForms()` hydrates from cache + background-revalidates →
`filterForms(items, …)` (memo) → `useListPagination` → `FormTable`. Stat band is
pure render-time derivation from `items` (no new state, no effect).

**Error handling:** unchanged — keep the `error` Alert (load failure) and the
`submitError` Alert (mutation failure); keep `runBulkAction`'s
`Promise.allSettled` + `summarizeBulkAction` partial-failure handling that sets
`submitError` and re-selects `summary.failedTargets`; keep both
`ConfirmActionDialog`s for single + bulk delete.

**Decision to honor:** the prototype list shows `Fields` and `Submissions` count
columns plus `Last submission` — these are **mock** in `FormsPage.tsx`. The real
`FormRecord` carries none of them and there is no per-form count on the list
endpoint. DO NOT add a fetch to fabricate counts and DO NOT add those columns.
Keep the real columns (Form / Status / Access / Last updated / Actions) and a
stat band derived only from `items`. If product later wants per-form submission
counts, that is a data/API change tracked separately, not part of this restyle.

**Routing:** the name link stays `AdminLink` + `prefetch`; row actions keep
calling `navigate(...)` via the existing `handleEdit`/`handleSubmissions`/
`handleActionLogs`. The prototype footer `<Link to="…/submissions">` is dropped
(the list has many forms, not one) — do not port a hand-built href. No
hand-built `<a href>`.

**Regression-test shape (see L04):** an SSR snapshot (`renderToString` under
`AdminRouterProvider`, the existing forms-suite idiom) asserts the stat-band
labels (`Total forms`/`Active`/`Drafts`) with values derived from a seeded
`items` fixture, one table row per visible form with Status/Access badges, the
name link rendered via `AdminLink` whose **resolved** `href` is the path-helper
admin path (e.g. `/admin/advanced/forms/<id>`) — not a hand-built/unresolved
anchor (`AdminLink` itself emits an `<a>`, so do NOT assert "no `<a href>`").
Selection→`FormBulkActionsBar` and New→drawer are interaction-dependent and stay
covered by the existing behavioral suites (or an explicit `createRoot`+`act`
test), not by the single SSR snapshot.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms-list-restyle.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`

Update the literal class/markup assertions in `forms.test.tsx` /
`forms-pages-wave.test.tsx` where the stat band + table chrome intentionally
change; keep all behavioral (filter/selection/bulk/pagination/create/delete)
assertions. State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-15-L01`.
- `_docs/FORMS_SPEC.md` — note the list's stat-band presentation if the spec
  describes the list UX (no data/API change; record the explicit decision that
  per-form field/submission counts are NOT shown).
