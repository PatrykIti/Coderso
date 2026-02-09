# TASK-099-03: Dashboard UI Wiring
# FileName: TASK-099-03_Dashboard_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/Dashboard  
**Estimated Effort:** Medium  
**Dependencies:** TASK-099-02, TASK-006-01, TASK-099  
**Status:** To Do  

---

## Overview

Podlaczenie dashboardu admina do endpointu runtime.

Cel:
- `DashboardPage` ma korzystac z `dashboardClient`,
- znikaja hardcoded dane w kartach i tabeli,
- UI zachowuje ten sam layout, ale renderuje real payload.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/dashboardClient.ts` | new | `getDashboardData()` -> `GET /dashboard` |
| `core/admin/ui/dashboard/DashboardPage.tsx` | update | fetch + loading/error/data states |
| `core/admin/ui/dashboard/RecentEditsTable.tsx` | update | render API rows via props |
| `core/admin/ui/dashboard/SecurityStatusCard.tsx` | update | render `security` summary via props |
| `core/admin/ui/dashboard/SiteHealthCard.tsx` | update | map storage/security metrics do progress/check rows |
| `tests/unit/admin/dashboardClient.test.ts` | new | request path/method + parse response |
| `tests/unit/ui/dashboard.test.tsx` | update | loading state + key sections after data mapping |

---

## UI Mapping Rules

1. KPI cards:
- karta 1: `Pages` (`totals.pages`)
- karta 2: `Entries` (`totals.entries`)
- karta 3: `Storage Used` (`storage.usedPercent` lub sformatowane `usedBytes`)

2. Recent edits table:
- dane tylko z `recentEdits`,
- status badge mapowany z API (`draft/published/scheduled/archived/active`),
- fallback przy pustej liscie: "No recent edits yet."

3. Security card:
- status badge z `security.status`,
- lista checkow z `security.checks`,
- liczba issue z `security.issues`.

4. Loading/error:
- loading placeholder zamiast kart i tabeli,
- error alert + retry action (ponowne wywolanie clienta).

---

## Pseudo-Implementation

```tsx
// core/admin/ui/dashboard/DashboardPage.tsx
const [data, setData] = useState<DashboardPayload | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const refresh = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const payload = await getDashboardData();
    setData(payload);
  } catch (err) {
    setError(isApiClientError(err) ? err.message : "Failed to load dashboard data.");
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  void refresh();
}, [refresh]);
```

```ts
// core/admin/services/dashboardClient.ts
export async function getDashboardData() {
  return apiRequest<DashboardPayload>("/dashboard", { method: "GET" });
}
```

---

## Testing Requirements

Unit test checklist:
- `dashboardClient` uderza w `/admin/api/dashboard` metoda `GET`,
- `DashboardPage` renderuje loading state domyslnie,
- `DashboardPage` zawiera sekcje "Recent Edits" i "Security Status" po mapowaniu danych.

Suggested commands:
- `bun test tests/unit/admin/dashboardClient.test.ts`
- `bun test tests/unit/ui/dashboard.test.tsx`

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (admin dashboard runtime behavior)
- ewentualnie `_docs/README.md` (jezeli jest sekcja ekranow admina)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-dashboard-ui-wiring.md`
