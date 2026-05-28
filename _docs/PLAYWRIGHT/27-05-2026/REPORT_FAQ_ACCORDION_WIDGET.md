# RAPORT: FAQ Accordion Widget — current-state weryfikacja
> **Status:** Metadata gap
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_FAQ_ACCORDION_WIDGET.md`
---
## 1. Zakres
- **Typ widgetu:** `faq-accordion`
- **Fixture admin:** `/ctr-faq-accordion-2305`
- **Fixture public:** `/test-faq-accordion-0516`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `metadata-gap`
- `visual`: status `passed`, roots `1`, visible sections `9`, declared sections `9`.
- `advanced`: status `passed`, roots `1`, visible sections `7`, declared sections `7`.
- **Public status:** `passed`
- Public path `/test-faq-accordion-0516` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/test-faq-accordion-0516` returns `200` and shows no unmarked overflow.
- Focused replay did not reproduce a user-facing editor failure; the finding is limited to automation metadata on real Visual controls.
## 4. Co nie dziala / follow-up
- faq-accordion.visual.colors-panel-style: `faq-accordion.style.panelRadius`, `faq-accordion.style.borderWidth`
- Impact: functional authoring still loads, but the widget fails the strict automation/control-ownership contract for these controls.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.