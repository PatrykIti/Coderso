# TASK-493-04-L01: Aggregation Service & `seoTypes` Extension
# FileName: TASK-493-04-L01-Aggregation-Service-And-Seo-Types-Extension.md

**Parent Subtask:** TASK-493-04
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-02-L02 (SeoOverview.sitemap reads `seo_sitemap_submissions` rows written by the submit flow), TASK-493-03-L02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

- **Goal:** Add the aggregation layer that turns raw `seo_search_metrics` /
  `seo_search_queries` / `seo_indexed_pages` / `seo_sitemap_submissions` rows
  into the SEO Manager's real surface, and extend `seoTypes.ts` with the result
  shapes.
- **Owning module(s) to create-or-extend:**
  - `core/services/seo/seoTypes.ts` (**extend** — add `SeoOverview`,
    `SeoSearchPerformance`, `SeoDocumentPerformance`, and a non-optional
    `performance: SeoDocumentPerformance | null` field on a new
    `SeoListItemWithPerformance` (do **not** mutate the existing
    `SeoDocument`/`SeoListItem` shapes used by current callers)).
  - `core/services/seo/seoPerformanceService.ts` (**create** —
    `getSeoOverview()`, `getSearchPerformance(opts)`,
    `listSeoDocumentsWithPerformance()` reading the 01 tables and joining to
    `seo_documents` by URL/slug; pure merge helpers extracted for unit testing).
  - **Cross-stream guard:** TASK-493 NEVER writes
    `core/services/seo/seoService.ts` (TASK-551-09-L02 owns it, lands after
    493). This leaf reads `seo_documents` (incl. `seo_documents.score`)
    directly; it does not call `analyzeSeoDocument`/`resolvePublicSeoMetadata`
    and adds no new exports to `seoService.ts`.
- **Source-of-truth docs:** `_docs/CMS_API.md` (response shapes — kept in sync in
  06-L02), `_docs/SEARCH_SPEC.md`, `_docs/DATA_MODEL.md`.
- **Out of scope:** the read routes (L02); any GSC fetch (03); UI (05); changing
  the meta heuristic or `analyzeSeoDocument`.

---

## Security Contract

- **Endpoint visibility:** n/a — service/types only (routes in L02 enforce
  `content:read`).
- **Auth model / RBAC / CSRF / Rate-limit:** n/a at this layer.
- **Validation:** option inputs (`opts.limit`, `opts.targetId`) are clamped/typed
  by the service; the L02 route schema enforces reject-unknown.
- **Anti-abuse / Secret handling:** no secrets touched here; the aggregation reads
  only persisted non-secret rows. No credential/token is referenced.

---

## Implementation Pseudocode

```ts
// core/services/seo/seoTypes.ts (append — additive, non-breaking)
import type { SeoIndexingState } from "./seoSearchPerformanceTypes"; // 01-L01

export type SeoOverview = {
  indexedPages: number;          // count of seo_indexed_pages where indexingState === "INDEXED"
  totalPages: number;
  notIndexedPages: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;            // 0..1
  averagePosition: number;
  averageScore: number;          // reuses the existing meta heuristic average
  sitemap: { status: string | null; urlCount: number | null; lastSubmittedAt: Date | null };
};

export type SeoTopQuery = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export type SeoSearchPerformance = {
  range: { startDate: string; endDate: string };
  totals: Pick<SeoOverview, "totalImpressions" | "totalClicks" | "averageCtr" | "averagePosition">;
  series: Array<{ date: string; clicks: number; impressions: number }>;
  topQueries: SeoTopQuery[];
};

export type SeoDocumentPerformance = {
  indexingState: SeoIndexingState;  // enum from 01-L01, NOT string
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

// performance is non-optional (SeoDocumentPerformance | null): documents
// without index rows carry explicit null, never a missing key.
export type SeoListItemWithPerformance = SeoListItem & { performance: SeoDocumentPerformance | null };
```

```ts
// core/services/seo/seoPerformanceService.ts
import { toNumber, normalizeIndexingState } from "./seoSearchPerformanceTypes"; // 01-L01
import type {
  SeoIndexedPage,           // 01-L01 (NOT a local "IndexedRow")
  SeoSearchMetricPoint,     // 01-L01 (NOT a local "MetricRow")
  SeoSearchQueryRow,        // 01-L01
  SeoSitemapSubmissionRow,  // 01-L01 (defined in seoSearchPerformanceTypes.ts)
} from "./seoSearchPerformanceTypes";

// pure, unit-testable merge over already-fetched rows
export function aggregateOverview(rows: {
  indexed: SeoIndexedPage[];
  metrics: SeoSearchMetricPoint[];
  sitemap?: SeoSitemapSubmissionRow | null;
  avgScore: number;
}): SeoOverview { /* count INDEXED, sum clicks/impressions via toNumber, weighted position */ }

export function aggregateSearchPerformance(rows: {
  metrics: SeoSearchMetricPoint[];
  queries: SeoSearchQueryRow[];
  range: { startDate: string; endDate: string };
  limit?: number;
}): SeoSearchPerformance { /* date series ordering, top-N query truncation, toNumber coercion */ }

export async function getSeoOverview(): Promise<SeoOverview> {
  const [indexed, metrics, sitemap] = await Promise.all([ /* select from the 01 tables */ ]);
  const avgScore = await meanSeoScore();
  // meanSeoScore() is a PRIVATE helper in THIS module — it reads
  // seo_documents.score directly. It is NOT in seoService.ts.
  return aggregateOverview({ indexed, metrics, sitemap, avgScore });
}

export async function getSearchPerformance(opts: {
  targetId?: string; startDate?: string; endDate?: string; limit?: number;
}): Promise<SeoSearchPerformance> { /* select metric/query rows, clamp limit, fold */ }

export async function listSeoDocumentsWithPerformance(): Promise<SeoListItemWithPerformance[]> {
  /* join seo_documents + seo_indexed_pages + seo_search_metrics by URL/slug;
     missing rows => performance: null (non-optional key) */
}
```

**Data flow:** select rows from the 01 tables (+ a direct `seo_documents` read —
never a write to `seoService.ts`) → coerce numeric columns via `toNumber` → fold
into `SeoOverview` / `SeoSearchPerformance` → return. DB access is thin; the
folding math lives in pure exported helpers (`aggregateOverview`,
`aggregateSearchPerformance`) so it unit-tests without a DB.

**Error handling:** empty tables yield zeroed totals (never throw); the UI shows
an explicit empty state. No domain errors needed at this layer.

**Regression-test shape:**
- `aggregateOverview`: counts INDEXED vs NOT_INDEXED, sums clicks/impressions,
  weighted average position, CTR; empty input ⇒ all zeros.
- `aggregateSearchPerformance`: date series ordering, top-N query truncation,
  `toNumber` coercion of numeric-string columns.
- `listSeoDocumentsWithPerformance`: non-optional `performance: null` for
  documents without index rows; `SeoIndexingState` values preserved (no plain
  string leaks).

---

## Testing Requirements

- **Vitest** (`tests/vitest/seo/seoPerformanceAggregation.test.ts`) — pure
  aggregation over fixture rows. Pure TS/domain ⇒ Vitest lane.
- `bun run typecheck` (new types resolve in L02 + 05 consumers).
