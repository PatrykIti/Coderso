# TASK-479-26-L02: SEO Manager Restyle
# FileName: TASK-479-26-L02-SEO-Manager-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-26
**Started:** 2026-06-28
**Completed:** 2026-06-29

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
  `core/admin/ui/seo/SeoAuditDialog.tsx`. `PageHeader` (with the `icon` prop added by
  06-L02), `StatCard` (`core/admin/ui/shared/StatCard.tsx`), `DataTable`, and `FilterBar`
  are **created/ported by TASK-479-06-L02**; `Progress` is the 06-L01
  `@/components/ui/progress` restyle; the `success`/`warning`/`destructive` Badge variants
  come from TASK-479-05. (This screen uses the meta/social Badge variants directly; there
  is no per-page status pill that needs the shared `StatusBadge`.)
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

// 1) Replace the ad-hoc header with the shared PageHeader (icon + action). The `icon`
//    prop is the one TASK-479-06-L02 ADDS — today's shared PageHeader is
//    title/description/actions only (no icon/breadcrumbs).
<PageHeader
  title="SEO manager"
  description="Monitor search performance and fix on-page issues across your site."
  icon={<Gauge />}
  actions={<Button className="gap-1.5" onClick={openAudit}><ScanLine className="size-4" /> Run audit</Button>}
/>
// `openAudit` = the EXISTING audit-dialog opener (`setAuditDialogOpen(true)` in
// SeoManagerPage). Do not change it.

// 2) Stat row — DERIVE from the loaded `items` (the render-time `SeoItem[]` that
//    SeoManagerPage maps from `SeoDocumentItem` via `mapSeoItem`; NO new effect). The
//    real `SeoItem` (core/admin/ui/seo/SeoTable.tsx) exposes ONLY: `score:number`,
//    `metaStatus:"optimized"|"short"|"missing"`, `socialStatus:"ready"|"missing"`,
//    `analysisStatus:"passed"|"attention"`, `analysisNotes:string[]` (+ title/path/...).
//    There is NO `issues`/`indexed`/`titleLength`/`meta` field — bind to the real ones:
const seoStats = useMemo(() => {
  const scores = items.map((i) => i.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return {
    avg,                                                                  // real `score`
    // real issue count = notes on pages flagged `attention` (a `passed` page carries the
    // single "No issues found" placeholder note, which is NOT counted):
    issues: items.reduce((n, i) => n + (i.analysisStatus === "attention" ? i.analysisNotes.length : 0), 0),
    optimized: items.filter((i) => i.metaStatus === "optimized").length,  // real `metaStatus`
    warnings: items.filter((i) => i.metaStatus === "short" || i.metaStatus === "missing").length,
  };
}, [items]);
// Render 4 shared <StatCard> (from 479-06-L02): Avg score / Issues / Optimized pages /
// Warnings — ALL derived from the real fields above. The prototype's "Indexed pages"
// stat is DROPPED: no index-status field exists on `SeoItem` or the `SeoDocumentItem`
// DTO — flag it feature-incomplete (needs a backend `indexed` field) rather than
// fabricating a count. Pass delta/trend only if a real comparison exists; otherwise omit
// (do NOT fabricate the prototype's "+4 / -6" mock deltas — the cache holds no
// previous-period SEO snapshot).

// 3) FilterBar — replace the bespoke search box with the shared FilterBar
//    (searchPlaceholder="Search pages…", view="list"). Keep the existing query state +
//    onChange handler; no filter logic moves.

// 4) SeoTable.tsx — restyle the wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") and adopt the
//    prototype columns over the EXISTING `SeoItem` rows (real fields only):
//      - Page: rounded-xl FileText tile + `title` + mono `path`. Open the existing
//        SeoDrawer via the EXISTING per-row edit action `onEdit?.(item.id)` — the real
//        SeoTable has an `onEdit` pencil action, there is NO `onRowClick` prop. The whole
//        row MAY become clickable but must call the same `onEdit` handler.
//      - Score: <span className={scoreTextTone(score)}>{score}</span> + shared
//        <Progress value={score} className="w-20" /> (06-L01 `@/components/ui/progress`;
//        tone via the className/variant 06 supplies — the base Progress takes only
//        `value`). Use the real thresholds already in SeoTable's `getScoreTone`: >=80
//        success, >=50 warning, else destructive.
//      - Meta description: 3-state from the real `metaStatus` — <Badge variant="success">
//        Optimized</Badge> | variant="warning" "Too short" | variant="destructive"
//        "Missing". The prototype's separate "Title length" column is DROPPED (no
//        `titleLength` field; the only meta signal is the 3-state `metaStatus`).
//      - Social: from the real `socialStatus` — <Badge variant="success">Ready</Badge> |
//        muted "Missing" (replaces the unbacked "title length" column).
//      - Issues: right-aligned tabular-nums = `analysisStatus === "attention" ?
//        analysisNotes.length : 0` (muted when 0).
//    Use the SAME field names present on the real `SeoItem` — do not rename or invent data.

// 5) Pagination — use the shared ListPaginationFooter / Pagination with the EXISTING
//    page/total state. No page-size or paging logic changes.
```

**Data flow:** `getCachedSeo()` lazy init → `listSeoCached({force})` hydrate +
`subscribeCacheEvents` background revalidation → `items` → derived `seoStats`
(render-time `useMemo`) + `SeoTable` rows → `SeoDrawer` on row click /
`SeoAuditDialog` on action. The restyle changes none of these edges.

**Navigation/href constraint (preserve):** SEO rows open the in-page `SeoDrawer` (not a
route), so there is no href to hand-build; keep the existing `onEdit(id)` action wired to
the drawer open (there is no `onRowClick` prop on the real SeoTable). If any cell links to
the live page or a page editor, keep it routed via the existing `AdminLink`/`adminPaths`
wiring — do NOT string-concat URLs.

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
(avg/issues/optimized/warnings — NOT a fabricated "Indexed pages"), the table renders
score progress bars + meta/social badges (from `metaStatus`/`socialStatus`) + issue
counts (from `analysisNotes`), the wrapper carries the rounded-2xl/card classes, and
triggering the row's `onEdit` action opens the `SeoDrawer`.

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
