# TASK-099: Dashboard Data Wiring (Functional)
# FileName: TASK-099_Dashboard_Data_Wiring.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-006-01, TASK-028, TASK-005, TASK-014, TASK-020-10  
**Status:** In Progress (2026-02-09)

---

## Overview

`TASK-006-01` dostarczyl dashboard wizualny z mockami. `TASK-099` zamienia go
na ekran w pelni funkcjonalny, oparty o realne dane z CMS API.

Kluczowy cel:
- jeden endpoint backendowy (`GET /dashboard`) zwraca gotowy model dashboardu,
- Admin UI przestaje trzymac hardcoded dane,
- ekran poprawnie obsluguje loading/error/empty states.

Wazne ograniczenie:
- bez dokladania nowego subsystemu analityki ruchu (brak "visitors/page views" z zewnatrz).
- pokazujemy metryki, ktore CMS realnie zna: pages, entries, media, users, storage, recent edits, security posture.

---

## Target Contract (API DTO)

```ts
type DashboardStatus = "ok" | "warning" | "critical";

type DashboardRecentEdit = {
  id: string;
  type: "page" | "entry" | "media";
  title: string;
  path: string | null;
  status: "draft" | "published" | "scheduled" | "archived" | "active";
  updatedAt: string;
  author: { id: string | null; name: string | null; email: string | null };
};

type DashboardPayload = {
  generatedAt: string;
  totals: {
    pages: number;
    entries: number;
    media: number;
    users: number;
  };
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
  recentEdits: DashboardRecentEdit[];
};
```

---

## Architecture (Target)

```txt
core/services/dashboard/
  dashboardTypes.ts
  dashboardService.ts

core/server/routes/
  dashboardRoutes.ts
  index.ts                    # registerDashboardRoutes

core/admin/services/
  dashboardClient.ts

core/admin/ui/dashboard/
  DashboardPage.tsx
  StatCard.tsx
  RecentEditsTable.tsx
  SecurityStatusCard.tsx
  SiteHealthCard.tsx

tests/unit/dashboard/
  dashboardService.test.ts
tests/integration/routes/
  dashboard.test.ts
tests/unit/admin/
  dashboardClient.test.ts
tests/unit/ui/
  dashboard.test.tsx
```

---

## Functional Scope

1. Backend aggregate:
- totals z tabel `pages`, `content_entries`, `media`, `users`,
- `recentEdits` z merge `pages + entries + media` (top 10 po `updatedAt desc`),
- storage z `sum(media.size)` i opcjonalnym limitem (jesli brak limitu -> `null`),
- security checks z `security.settings` (CSRF / rateLimit / headers / session policy).

2. API:
- nowa trasa `GET /dashboard`,
- permission na MVP: `content:read` (bez migracji RBAC w `TASK-099`).

3. Admin UI:
- pobranie danych przez `dashboardClient`,
- mapowanie API -> komponenty dashboardu,
- loading/error fallback.

---

## Non-Goals

- Brak nowej telemetrii ruchu publicznego (GA/Matomo etc.).
- Brak nowego permission `dashboard:read` w tym tasku.
- Brak reworku layoutu dashboardu (to jest task data-wiring, nie redesign).

---

## Sub-Tasks (Detailed)

- `TASK-099-01_Dashboard_Service.md` (**Done, 2026-02-09**)
- `TASK-099-02_Dashboard_API.md`
- `TASK-099-03_Dashboard_UI_Wiring.md`

---

## Acceptance Criteria

1. Dashboard UI nie ma hardcoded rows/card values.
2. `GET /dashboard` zwraca payload zgodny z kontraktem.
3. Recent edits sa globalnie sortowane po `updatedAt desc`.
4. UI pokazuje czytelny loading i blad bez crasha widoku.
5. Lint + typecheck + testy dla nowych plikow przechodza.

---

## Testing Strategy

- Unit: `dashboardService` (agregacja, sortowanie, heurystyki security).
- Integration: route wiring `GET /dashboard`.
- Unit (admin): `dashboardClient` (request path + method).
- Unit (ui): `DashboardPage` renderuje loading i sekcje z API data.

Quality gates:
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

---

## Documentation Updates Required (After Each Sub-Task)

- Po `099-01`:
  - `_docs/CMS_SPEC.md` (dashboard data model),
  - `_docs/ARCHITECTURE.md` (dashboard aggregate service).
- Po `099-02`:
  - `_docs/CMS_API.md` (`GET /dashboard` request/response/errors).
- Po `099-03`:
  - `_docs/README.md` lub odpowiedni UI index (dashboard runtime states).
- Po zamknieciu `TASK-099`:
  - `_docs/_TASKS/README.md` (status + statystyki),
  - nowy wpis w `_docs/_CHANGELOG/`.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-data-wiring.md`
