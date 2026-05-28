# RAPORT: Product Table Widget — current-state weryfikacja
> **Status:** Fixture gap
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_PRODUCT_TABLE_WIDGET.md`
---
## 1. Zakres
- **Typ widgetu:** `product-table`
- **Fixture admin:** `/ctr-product-table-2305`
- **Fixture public:** `/producttabletestproducttabletest`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `passed`
- `visual`: status `passed`, roots `1`, visible sections `12`, declared sections `12`.
- `advanced`: status `passed`, roots `1`, visible sections `4`, declared sections `4`.
- **Public status:** `fixture-gap`
- Public path `/producttabletestproducttabletest` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/producttabletestproducttabletest` still returns `200` and does not crash.
## 4. Co nie dziala / follow-up
- Public route returns `200` and renders the empty table state instead of crashing.
- Observed copy: `Brak produktow w katalogu` / `Publish products or adjust source query.`
- This pass cannot verify populated product rows because the fixture is empty.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.