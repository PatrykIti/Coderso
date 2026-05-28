# RAPORT: Pricing Plans Widget — current-state weryfikacja
> **Status:** Metadata gap
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_PRICING_PLANS_WIDGET.md`

> **Status 2026-05-28:** superseded przez `TASK-342`; targeted rerun
> `task-342-02-pricing-plans` i final full rerun
> `_docs/PLAYWRIGHT/widget-contract-smoke-task-342-final-2026-05-28.md`
> potwierdzily `metadataGaps=0`.
---
## 1. Zakres
- **Typ widgetu:** `pricing-plans`
- **Fixture admin:** `/ctr-pricing-plans-2305`
- **Fixture public:** `/test-pricing-plans-0516`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `metadata-gap`
- `visual`: status `passed`, roots `1`, visible sections `8`, declared sections `8`.
- `advanced`: status `passed`, roots `1`, visible sections `5`, declared sections `5`.
- **Public status:** `passed`
- Public path `/test-pricing-plans-0516` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/test-pricing-plans-0516` returns `200` and shows no unmarked overflow.
- Focused replay did not reproduce a user-facing editor failure; the finding is limited to automation metadata on real Visual controls.
## 4. Co nie dziala / follow-up
- pricing-plans.visual.plan-actions: `pricing-plans.plan.1.surface`, `pricing-plans.plan.2.surface`, `pricing-plans.plan.3.surface`
- pricing-plans.visual.colors-emphasis: `pricing-plans.style.cardSurface`, `pricing-plans.style.cardBorder`, `pricing-plans.style.highlightRing`, `pricing-plans.style.spacing`, `pricing-plans.style.radius`, `pricing-plans.style.featureMarker`
- Impact: functional authoring still loads, but the widget fails the strict automation/control-ownership contract for these controls.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.
