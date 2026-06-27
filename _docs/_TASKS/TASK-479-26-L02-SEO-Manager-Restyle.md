# TASK-479-26-L02: SEO Manager Restyle
# FileName: TASK-479-26-L02-SEO-Manager-Restyle.md

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

Restyle the real SEO Manager screen to the prototype: a redesigned `PageHeader`
(Gauge icon + "Run audit" action), a 4-up **stat row** (Avg score / Issues / Indexed
pages / Warnings), and a soft `rounded-2xl` `DataTable` with per-page **score
progress bar**, **title-length** + **meta-description** status badges, and an
**issues** count. All SEO data loading, the audit dialog, the per-page drawer, and the
cache contract stay byte-for-byte the same.

- **Goal:** `core/admin/ui/seo/SeoManagerPage.tsx` (+ `SeoTable.tsx`, `SeoDrawer.tsx`,
  `SeoAuditDialog.tsx`) looks like `_docs/_PROTOTYPE/src/pages/tools/SeoManagerPage.tsx`
  while preserving the existing list logic and `cacheKeys.seoList` / `seoDetail`
  contract.
- **Owning module/service:** `core/admin/ui/seo/SeoManagerPage.tsx`,
  `core/admin/ui/seo/SeoTable.tsx`, `core/admin/ui/seo/SeoDrawer.tsx`,
  `core/admin/ui/seo/SeoAuditDialog.tsx`. Shared `PageHeader`/`StatCard`/`DataTable`/
  `FilterBar`/`StatusBadge`/`Progress` primitives from TASK-479-06.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/SeoManagerPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,FilterBar,DataTable,Pagination}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{progress,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `seoClient` (`getCachedSeo`, `listSeoCached`, the
  per-item detail fetch), to `cacheKeys.seoList` / `cacheKeys.seoDetail(id)`, to the
  `subscribeCacheEvents` background revalidation, to the run-audit flow
  (`SeoAuditDialog`), to the per-page `SeoDrawer`, or to RBAC. Stat-row numbers must be
  **derived from the already-loaded SEO data**, not from a new endpoint or hard-coded
  prototype values.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `SeoManagerPage.tsx` (the lazy-init
`useState(() => getCachedSeo())`, the `listSeoCached` hydrate effect, the
`subscribeCacheEvents(cacheKeys.seoList | cacheKeys.seoDetail(activeSelectedId))`
background revalidation, the search/filter state, and the drawer/audit open state).

```tsx
// SeoManagerPage.tsx — RENDER ONLY changes inside the existing return().

// 1) Replace the ad-hoc header with the shared restyled PageHeader (icon + action).
<PageHeader
  title="SEO manager"
  description="Monitor search performance and fix on-page issues across your site."
  icon={<Gauge />}
  actions={<Button className="gap-1.5" onClick={openAudit}><ScanLine className="size-4" /> Run audit</Button>}
/>
// `openAudit` = the EXISTING handler that opens SeoAuditDialog. Do not change it.

// 2) Stat row — DERIVE from the loaded `items` (render-time useMemo, NO new effect):
const seoStats = useMemo(() => {
  const scores = items.map((i) => i.score).filter((n) => typeof n === "number");
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return {
    avg,
    issues: items.reduce((n, i) => n + (i.issues ?? 0), 0),
    indexed: items.filter((i) => i.indexed).length,           // use the real field name
    warnings: items.filter((i) => i.titleLength === "warning" || i.meta === "missing").length,
  };
}, [items]);
// Render 4 shared <StatCard> (Avg score / Issues / Indexed pages / Warnings). The
// delta/trend props are optional — only pass them if a real comparison value exists;
// otherwise omit (do NOT fabricate the prototype's "+4 / -6" mock deltas).

// 3) FilterBar — replace the bespoke search box with the shared FilterBar
//    (searchPlaceholder="Search pages…", view="list"). Keep the existing query state +
//    onChange handler; no filter logic moves.

// 4) SeoTable.tsx — restyle the wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") and adopt the
//    prototype columns over the EXISTING SeoItem rows:
//      - Page: rounded-xl FileText tile + title + mono slug. Row click opens the
//        existing SeoDrawer via onRowClick (keep the handler).
//      - Score: <span className={scoreTextTone(score)}>{score}</span> + shared
//        <Progress value={score} tone={scoreTone(score)} className="w-20" />.
//        Port scoreTextTone/scoreTone (>=85 success, >=65 warning, else destructive).
//      - Title length: <Badge variant="success">Good</Badge> | variant="warning" "Too long".
//      - Meta description: <Badge variant="success">Good</Badge> | variant="destructive" "Missing".
//      - Issues: right-aligned tabular-nums count (muted when 0).
//    Use the SAME column field names already present on SeoItem — do not rename data.

// 5) Pagination — use the shared ListPaginationFooter / Pagination with the EXISTING
//    page/total state. No page-size or paging logic changes.
```

**Data flow:** `getCachedSeo()` lazy init → `listSeoCached({force})` hydrate +
`subscribeCacheEvents` background revalidation → `items` → derived `seoStats`
(render-time `useMemo`) + `SeoTable` rows → `SeoDrawer` on row click /
`SeoAuditDialog` on action. The restyle changes none of these edges.

**Navigation/href constraint (preserve):** SEO rows open the in-page `SeoDrawer` (not a
route), so there is no href to hand-build; keep `onRowClick` wired to the existing
drawer open. If any cell links to the live page or a page editor, keep it routed via
the existing `AdminLink`/`adminPaths` wiring — do NOT string-concat URLs.

**Error handling:** Keep the destructive `Alert` ("SEO unavailable" / API error) with
its existing condition; only its card styling inherits new tokens. Keep the loading and
empty states (restyle to the soft dashed `EmptyState` card). The `SeoAuditDialog`
success/error toasts are unchanged. No new error surfaces.

**React-hooks/cache rules:** Stat-row values are derived at render via `useMemo` over
`items` — no effect, no synchronous `setState` in an effect, no fabricated deltas. Do
not add a mount effect that force-refetches; the existing hydrate effect + cacheBus
subscription are the only data effects and must be left untouched (no dirty-state
overwrite, no refetch loop).

**Regression-test shape:** see L07 — render `SeoManagerPage` with a seeded
`getCachedSeo`; assert: header + "Run audit" button present (click opens
`SeoAuditDialog`), the 4 StatCards render with values derived from the seeded items
(avg/issues/indexed/warnings), the table renders score progress bars + title/meta
badges + issue counts, the wrapper carries the rounded-2xl/card classes, and clicking a
row opens the `SeoDrawer`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-seo-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing SEO suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/seo-manager.test.tsx tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx tests/vitest/admin/seoClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L02`.
- If the shared `StatCard`/`StatusBadge`/`Progress` mapping is introduced/changed for
  SEO, note it alongside the TASK-479-06 shell notes so the other Tools screens reuse it.
