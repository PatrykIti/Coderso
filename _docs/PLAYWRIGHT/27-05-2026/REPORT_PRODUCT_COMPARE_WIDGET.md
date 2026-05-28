# RAPORT: Product Compare Widget — current-state weryfikacja
> **Status:** Fixture gap
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_PRODUCT_COMPARE_WIDGET.md`
---
## 1. Zakres
- **Typ widgetu:** `product-compare`
- **Fixture admin:** `/ctr-product-compare-2305`
- **Fixture public:** `/test-product-compare-0516`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `passed`
- `visual`: status `passed`, roots `1`, visible sections `12`, declared sections `12`.
- `advanced`: status `passed`, roots `1`, visible sections `6`, declared sections `6`.
- **Public status:** `fixture-gap`
- Public path `/test-product-compare-0516` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/test-product-compare-0516` still returns `200` and does not crash.
## 4. Co nie dziala / follow-up
- Public route returns `200` and renders the empty comparison state instead of crashing.
- Observed copy: `No products to compare` / `Update source filters or publish products.`
- This pass cannot verify populated compare rows because the fixture is empty.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.