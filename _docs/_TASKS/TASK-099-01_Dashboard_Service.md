# TASK-099-01: Dashboard Service
# FileName: TASK-099-01_Dashboard_Service.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-099, TASK-002, TASK-003, TASK-005, TASK-014, TASK-020-10  
**Status:** Done (2026-02-09)  

---

## Overview

Implementacja backendowego agregatora danych dla dashboardu.

Serwis ma zwracac pojedynczy, stabilny DTO dla UI, oparty o dane z:
- `pages`
- `content_entries`
- `media`
- `users`
- `security.settings`

---

## Contract

```ts
type DashboardStatus = "ok" | "warning" | "critical";

type DashboardRecentEdit = {
  id: string;
  type: "page" | "entry" | "media";
  title: string;
  path: string | null;
  status: "draft" | "published" | "scheduled" | "archived" | "active";
  updatedAt: string;
  author: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
};

type DashboardPayload = {
  generatedAt: string;
  totals: {
    pages: number;
    entries: number;
    media: number;
    users: number;
  };
  recentEdits: DashboardRecentEdit[];
  storage: {
    usedBytes: number;
    limitBytes: number | null;
    usedPercent: number | null;
  };
  security: {
    status: DashboardStatus;
    issues: number;
    checks: Array<{
      id: "csrf" | "rateLimit" | "headers" | "sessionPolicy";
      label: string;
      status: DashboardStatus;
      detail: string;
    }>;
  };
};
```

---

## Pseudo-Implementation

```ts
// core/services/dashboard/dashboardService.ts
export async function getDashboardData(): Promise<DashboardPayload> {
  const [totals, recentEdits, storage, security] = await Promise.all([
    getTotals(),
    getRecentEdits(10),
    getStorageUsage(),
    getSecuritySummary(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totals,
    recentEdits,
    storage,
    security,
  };
}

async function getTotals() {
  return {
    pages: await countRows(pages),
    entries: await countRows(contentEntries),
    media: await countRows(media),
    users: await countRows(users),
  };
}

async function getRecentEdits(limit: number): Promise<DashboardRecentEdit[]> {
  const [pageRows, entryRows, mediaRows] = await Promise.all([
    selectRecentPages(limit),
    selectRecentEntries(limit),
    selectRecentMedia(limit),
  ]);

  return [...pageRows, ...entryRows, ...mediaRows]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
```

```ts
// security scoring heuristic (MVP)
const checks = [
  security.csrf.enabled ? ok("csrf") : warning("csrf"),
  security.rateLimit.enabled ? ok("rateLimit") : warning("rateLimit"),
  security.headers.enabled ? ok("headers") : warning("headers"),
  security.session.maxPerUser <= 5 ? ok("sessionPolicy") : warning("sessionPolicy"),
];

const issues = checks.filter((c) => c.status !== "ok").length;
const status = issues === 0 ? "ok" : issues <= 2 ? "warning" : "critical";
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/dashboard/dashboardTypes.ts` | new | wspolne typy payloadu dashboard |
| `core/services/dashboard/dashboardService.ts` | new | agregator totals/storage/recent/security |
| `tests/unit/dashboard/dashboardService.test.ts` | new | unit testy agregacji i heurystyk |

Rules:
- `recentEdits` to globalny top 10 po `updatedAt` (merge 3 zrodel).
- `storage.usedBytes` to suma `media.size`.
- `storage.limitBytes` na MVP moze byc `null` (jesli brak zrodla limitu).
- `usedPercent`:
  - `null`, gdy `limitBytes === null` lub `limitBytes <= 0`,
  - w innym przypadku clamp `0..100`.

---

## Testing Requirements

Unit test checklist:
- totals poprawnie liczone dla seeded danych,
- recent edits sa posortowane malejaco po czasie i przyciete do limitu,
- security status:
  - `ok` gdy wszystkie checki OK,
  - `warning` przy 1-2 issue,
  - `critical` przy >= 3 issue,
- storage percent:
  - `null` bez limitu,
  - clamp do `100` przy przekroczeniu limitu.

Suggested command:
- `bun test tests/unit/dashboard/dashboardService.test.ts`

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (sekcja dashboard payload)
- `_docs/ARCHITECTURE.md` (dashboard aggregate flow)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-service.md`

---

## Implementation Notes (Done)

- Added dashboard DTO contract in `core/services/dashboard/dashboardTypes.ts`.
- Added aggregator service in `core/services/dashboard/dashboardService.ts`:
  - totals for pages/entries/media/users,
  - merged `recentEdits` (page + entry + media),
  - storage summary (`usedBytes`, optional percent),
  - security summary with deterministic checks (`csrf`, `rateLimit`, `headers`, `sessionPolicy`).
- Added tests in `tests/unit/dashboard/dashboardService.test.ts`:
  - pure unit checks for storage percent and security scoring,
  - DB-seeded aggregate test for recent edits, storage, and summary coherence.

Verification:
- `bun test tests/unit/dashboard/dashboardService.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
