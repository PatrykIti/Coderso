# TASK-479-26-L06: Redirects Restyle
# FileName: TASK-479-26-L06-Redirects-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Redirects screen to the prototype: a `PageHeader` (Signpost icon +
"Add redirect" action), a **stat row** (Total / Permanent 301+308 / Temporary 302+307 —
covering all four real `RedirectStatusCode`s), an inline **add row** (source →
destination + status-code Select + Add), and a soft `rounded-2xl` `DataTable` with
source/arrow/destination/type/status + row actions. All redirect data loading, the
create/update/delete + bulk flows, the edit drawer, and the `cacheKeys.redirectsList`
contract stay byte-for-byte the same. The prototype's "404s caught" stat and the per-row
**hit count** are DROPPED — `RedirectItem` has no hit metric (the presentation row's
`lastHit` is a hardcoded "-" placeholder).

- **Goal:** `core/admin/ui/redirects/RedirectsPage.tsx` (+ `RedirectsTable.tsx`,
  `RedirectDrawer.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/RedirectsPage.tsx` while preserving the existing
  redirect logic and cache contract.
- **Owning module/service:** `core/admin/ui/redirects/RedirectsPage.tsx`,
  `core/admin/ui/redirects/RedirectsTable.tsx`,
  `core/admin/ui/redirects/RedirectDrawer.tsx`. `PageHeader`, `StatCard`
  (`core/admin/ui/shared/StatCard.tsx`), `DataTable`, and `StatusBadge` (mapping the real
  `"active"|"inactive"`) are **created/ported by TASK-479-06-L02**; `Card`/`Input`/
  `Select`/`Button` are 06-L01 `@/components/ui/*` restyles, and `Pagination` is the
  existing shared `ListPaginationFooter`.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/RedirectsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,DataTable,StatusBadge,Pagination}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{card,input,select,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `redirectsClient` (`createRedirect`, `updateRedirect`,
  `deleteRedirect`, `getCachedRedirects`, `listRedirectsCached`), to
  `cacheKeys.redirectsList`, to `subscribeCacheEvents` background revalidation, to the
  bulk-action semantics, to the `ConfirmActionDialog` destructive flow, to the
  `RedirectDrawer` edit form, or to RBAC. Stat-row numbers must be **derived from the
  loaded redirect data** (all four `RedirectStatusCode`s 301/302/307/308), not the
  prototype's hard-coded "142/118/24/36" mock; the "404s caught" figure and per-row hit
  count have no backing and are dropped/flagged feature-incomplete.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `RedirectsPage.tsx` (the lazy-init
`useState(createInitialRedirectsState)`, the `listRedirectsCached` hydrate effect, the
`subscribeCacheEvents(cacheKeys.redirectsList)` background revalidation, `filtered`/
`paginated`/`activeCount` `useMemo`s, the selection refs, `runBulkAction`,
`handleSave`/`handleToggle`/`runDelete`, and the drawer/confirm dialog state).

```tsx
// RedirectsPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader (icon + action) — keep the existing bulk cluster (shown when
//    selectedCount > 0) and the "Create" Button (openCreate). Rename label to
//    "Add redirect" to match the prototype if desired; handler unchanged.
<PageHeader title="Redirects"
  description={`Site management - ${activeCount} active routes.`}
  icon={<Signpost />}
  actions={/* UNCHANGED bulk cluster + Create/Add redirect button */} />

// 2) Stat row — DERIVE from loaded `items` (the render-time `RedirectRow[]`; NO new
//    effect). `RedirectRow.type` is a string "301"|"302"|"307"|"308" (mapped from the
//    numeric `RedirectItem.statusCode`):
const redirectStats = useMemo(() => {
  const byCode = (code: RedirectRow["type"]) => items.filter((r) => r.type === code).length;
  return {
    total: items.length,
    permanent: byCode("301") + byCode("308"),   // 301 + 308 are permanent
    temporary: byCode("302") + byCode("307"),   // 302 + 307 are temporary
  };
}, [items]);
// Render shared <StatCard>s from 479-06-L02 (Total / Permanent / Temporary) — all four
// real `RedirectStatusCode`s are counted. DROP the prototype's "404s caught" stat:
// `RedirectItem` exposes no 404/hit metric (flag feature-incomplete). Omit delta/trend
// unless a real comparison exists.

// 3) Inline add row — shared <Card className="p-3"> with a form (onSubmit calls the
//    EXISTING create flow): <Input placeholder="/old-path" font-mono> → ArrowRight →
//    <Input placeholder="/new-path" font-mono> → <Select> offering ALL FOUR codes
//    (301/302/307/308) → <Button>Add</Button>. On submit, build the existing
//    `RedirectCreateInput` ({ fromPath, toPath, statusCode }) with a NUMERIC `statusCode`
//    (301|302|307|308) and call `handleSave` (the same handler the drawer uses) — do NOT
//    add a second create path. Keep the search box. The RedirectDrawer stays for EDIT
//    (openEdit); the inline row is quick-create only.

// 4) RedirectsTable.tsx — restyle wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card", selectable) with
//    columns over the EXISTING `RedirectRow` ({ id, from, to, type, status, lastHit }):
//      - Source: mono `from`.
//      - arrow: ArrowRight muted (w-8).
//      - Destination: mono muted `to`.
//      - Type: a <Badge> per the real `type` (string "301"|"302"|"307"|"308") — map all
//        four codes (301/308 permanent tone, 302/307 temporary tone), matching the
//        existing `typeBadge` record in RedirectsTable.
//      - Status: shared <StatusBadge status={row.status} /> over the real
//        `"active"|"inactive"` (mapped from `RedirectItem.enabled`).
//      - DROP the "Hits" column: `RedirectRow.lastHit` is a hardcoded "-" placeholder and
//        `RedirectItem` has no hit counter (flag feature-incomplete; do NOT
//        `toLocaleString` a fake number).
//      - Actions: keep the existing row menu (Edit→openEdit, toggle, Delete→
//        setPendingDeleteRedirect). Selection checkboxes (isAllSelected/isIndeterminate/
//        onToggleAll/onToggleRedirect) unchanged.
//    Keep the existing ListPaginationFooter / Pagination wired to page/total state.
```

**Data flow:** `createInitialRedirectsState()` (reads `getCachedRedirects`) lazy init →
`listRedirectsCached({force})` hydrate + `subscribeCacheEvents(cacheKeys.redirectsList)`
background revalidation → `filtered` → `paginated` → `RedirectsTable`; create/edit/
delete/bulk go through the existing client calls → `refresh({background:true})`. The
restyle changes none of these edges; the stat row + inline add only read existing data
and call the existing `handleSave`.

**Navigation/href constraint (preserve):** Redirect edit opens the in-page
`RedirectDrawer` (not a route). Keep `activeHref="/admin/redirects"` and breadcrumbs
`["Site Management","Redirects"]`. Do NOT hand-build any URL.

**Error handling:** Keep the destructive `Alert` ("Redirects unavailable") with its
existing condition; restyle the card only. The single + bulk delete `ConfirmActionDialog`
keep their copy + conditions. The create/update/delete toasts (sonner) are unchanged.
Keep the loading + empty/filtered-empty states (restyle to the soft dashed `EmptyState`
card). No new error surfaces.

**React-hooks/cache rules:** Stat-row counts derive at render via `useMemo` over `items`
— no effect, no synchronous `setState` in an effect, no fabricated numbers. The inline
add reuses `handleSave` (single create path). Do not add a mount effect that
force-refetches; the existing hydrate effect + cacheBus subscription are the only data
effects (no dirty-state overwrite, no refetch loop).

**Regression-test shape:** see L07 — render `RedirectsPage` with a seeded
`getCachedRedirects`; assert: header + Add/Create button, StatCards with counts derived
from seeded items (total / permanent / temporary across 301/302/307/308), the inline add
row submits through `createRedirect` (via `handleSave`) with a numeric `statusCode`, the
table renders source/dest/type/status rows (NO Hits column) with selectable checkboxes,
selecting rows shows the bulk cluster, Edit opens `RedirectDrawer`, Delete opens
`ConfirmActionDialog`, and the wrapper carries the rounded-2xl/card classes.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-redirects-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing redirects suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx tests/vitest/admin/redirectsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L06`.
- If the shared `StatCard`/`StatusBadge`/`DataTable` styling is introduced/changed for
  Redirects, note it alongside the TASK-479-06 shell notes so the other Tools screens reuse it.
