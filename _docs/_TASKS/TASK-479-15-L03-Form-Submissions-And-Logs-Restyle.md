# TASK-479-15-L03: Form Submissions & Action Logs Restyle
# FileName: TASK-479-15-L03-Form-Submissions-And-Logs-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Forms / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
**Parent Subtask:** TASK-479-15

---

## Overview

Restyle the two read/monitor screens under a form — the **submissions** viewer
and the **action logs** (automation runs) viewer — to the prototype's
`FormSubmissionsPage`: a soft-card **stat band** over a `rounded-2xl` table with
a filter bar. All real data, the intentional no-submissions-cache decision, the
client-side pagination, the status filter, and the action-run retry flow are
preserved — only presentation changes.

- **Goal:** Give both viewers the soft/violet, `rounded-2xl` look (stat band +
  restyled table + filter row) while keeping the live read paths
  (`getFormDetailCached` + `listFormSubmissions`; `getForm` +
  `listFormActionRuns`), the read-only submissions contract, client-side
  pagination, the action-run status filter, and the `retryFormActionRun` flow
  fully intact.
- **Owning module/service:** `core/admin/ui/forms/FormSubmissionsPage.tsx` and
  `core/admin/ui/forms/FormActionLogsPage.tsx`, backed by
  `core/admin/services/formsClient.ts` and `core/admin/services/cachePolicy.ts`.
- **Source-of-truth docs:** `_docs/FORMS_SPEC.md`, `_docs/DESIGN_TOKENS.md`;
  prototype source `_docs/_PROTOTYPE/src/pages/advanced/FormSubmissionsPage.tsx`
  and shared primitives
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,FilterBar,DataTable,Pagination,StatusBadge}.tsx`,
  `_docs/_PROTOTYPE/src/components/ui/{button,avatar}.tsx`.
- **Out of scope:** No change to the read endpoints, the read-only submissions
  contract, the `cachePolicy` (the absence of a submissions cache key is
  deliberate), the action runner, or the retry endpoint. No new server export
  endpoint (see decision below).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

Submissions are read-only and may contain visitor PII — the restyle adds no new
read path, no client-side caching of submission payloads, and nothing that ships
submission data anywhere new. The action-run **retry** (`retryFormActionRun`) is
a privileged write; keep its existing gating and confirm shape unchanged.

---

## Implementation Pseudocode

### A) `FormSubmissionsPage.tsx`

Keep the entire logic block — `resolveFormId`, the lazy `formId` init, `load`
(`Promise.all([getFormDetailCached(formId), listFormSubmissions(formId)])`),
`applyResult`, `handleLoadError`, the fetch-on-open effect (flips `isLoading`
only at the async boundary), `refresh`, `formatPayloadValue`, and the
client-side `PAGE_SIZE = 20` pagination. Only the returned JSX changes.

```tsx
// FormSubmissionsPage.tsx — RENDER ONLY changes.

// 1) Stat band — derive ONLY from `submissions` already in state (no fetch).
//    Prototype's "Spam blocked / This week" are mock; compute real equivalents.
const stats = useMemo(() => {
  const total = submissions.length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = submissions.filter((s) => new Date(s.createdAt).getTime() >= oneWeekAgo).length;
  const spam = submissions.filter((s) => s.status === "spam").length;
  return { total, thisWeek, spam };
}, [submissions]);

return (
  <AdminShell activeHref="/admin/advanced/forms" breadcrumbs={["Content", "Forms", formName, "Submissions"]}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        title="Form submissions"
        description="Review what visitors submitted through this form (read-only)."
        actions={/* keep Back to form + Refresh buttons; see Export decision below */}
      />
      {/* keep error <Alert> verbatim */}
      {/* uses the SHARED StatCard from 479-06-L02; its `value` prop is a string,
          so stringify the derived counts (no `hint`/spark prop). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={String(stats.total)} icon={<Inbox />} />
        <StatCard label="This week" value={String(stats.thisWeek)} icon={<CalendarDays />} />
        <StatCard label="Spam" value={String(stats.spam)} icon={<ShieldAlert />} />
      </div>
      {/* restyle the existing <table> wrapper to rounded-2xl + soft shadow; keep
          the Received / Submission(dl of payload via formatPayloadValue) / Status
          columns, the loading + empty rows, and fieldLabels lookup unchanged */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card"> … existing table … </div>
      {/* keep the existing Previous/Next pager (pageCount>1) — restyled buttons only */}
    </div>
  </AdminShell>
);
```

**Export decision (honor):** the prototype shows an `Export` button, but there is
**no existing server export endpoint** for submissions. DO NOT fabricate one.
Either (a) omit the button for this leaf, or (b) implement a **pure client-side**
CSV/JSON download of the `submissions` already loaded in state (no new fetch, no
new endpoint, no secret handling) gated behind the existing screen permission. If
(b) is chosen, build the file from the in-memory rows + `fieldLabels` and trigger
a Blob download; add NO network call. Default to (a) unless product asks for (b).

### B) `FormActionLogsPage.tsx`

Keep the entire logic block — `resolveFormId`, lazy `formId`, `refresh`
(`Promise.all([getForm(formId), listFormActionRuns(formId, { status, limit })])`),
the fetch-on-open effect, `subscribeCacheEvents(cacheKeys…)` invalidation, the
`statusFilter` state, and `retryFormActionRun` + `isRetrying`. Only JSX changes.

```tsx
// FormActionLogsPage.tsx — RENDER ONLY changes.

// Stat band derived from `runs` already in state (no fetch). The real
// FormActionRunStatus enum is "success" | "failed" | "skipped" (NO "succeeded",
// NO "queued"/"running") — match it exactly.
const stats = useMemo(() => ({
  total: runs.length,
  failed: runs.filter((r) => r.status === "failed").length,
  succeeded: runs.filter((r) => r.status === "success").length,
}), [runs]);

return (
  <AdminShell activeHref="/admin/advanced/forms" breadcrumbs={["Content", "Forms", formName, "Action logs"]}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader title="Form action logs" description="Automation runs triggered by this form's submissions." actions={/* keep Back + Refresh */} />
      {/* keep error <Alert> */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Runs" value={String(stats.total)} />
        <StatCard label="Succeeded" value={String(stats.succeeded)} />
        <StatCard label="Failed" value={String(stats.failed)} />
      </div>
      {/* keep the existing status-filter <Select> — the REAL options are
          all/success/failed/skipped (FormActionRunStatus | "all"); restyle into a
          rounded-2xl filter card; same statusFilter state */}
      {/* restyle the runs table wrapper to rounded-2xl + soft shadow; keep the
          run columns, StatusBadge, and the per-row Retry button wired to
          retryFormActionRun + isRetrying */}
    </div>
  </AdminShell>
);
```

**Data flow:** both pages fetch-on-open; submissions has NO cache key by design
(always fresh, read-only) while only the form detail hydrates through the cached
client; action logs revalidate via `subscribeCacheEvents`. Stat bands are pure
render-time derivation. No new state, no new effect, no synchronous `setState` in
effects.

**Error handling:** unchanged — keep the `isApiClientError` mapping and the
`error` Alerts; keep the action-logs retry error surface and `isRetrying`
disabling. Pagination stays client-side (`PAGE_SIZE`/`currentPage`).

**Routing:** Back buttons keep using `useAdminRouter().navigate` to
`/advanced/forms/:id`; any new link goes through `AdminLink`. No hand-built
`<a href>`.

**Regression-test shape (see L04):** SSR snapshots (`renderToString` under
`AdminRouterProvider`). Submissions asserts the stat band (Total/This week/Spam
from a seeded `submissions` fixture), a row per visible submission with the
payload `dl` + `fieldLabels`, and the empty state; "no submissions cache key is
introduced" is a static check (the page still calls `listFormSubmissions`
directly — assert no `cacheKeys.formSubmissions`-style key exists, not via render).
Action-logs asserts the stat band, the status filter (default `all`), and a row
per run with `StatusBadge`. The Retry click → `retryFormActionRun` is
interaction-dependent (an explicit `createRoot`+`act` test or the existing
behavioral suite), not the single SSR snapshot.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms-submissions-restyle.test.tsx tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx tests/vitest/ui/form-submissions-page.test.tsx tests/vitest/ui/form-action-logs-page.test.tsx`

Update literal class/markup assertions in `form-submissions-page.test.tsx` /
`form-action-logs-page.test.tsx` where the stat band + table chrome intentionally
change; keep all behavioral (load/empty/error, pagination, status filter, retry)
assertions. State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-15-L03`.
- `_docs/FORMS_SPEC.md` — note the viewers' stat-band restyle and record the
  Export decision (no new endpoint) if the spec describes these screens (no
  data/cache contract change).
