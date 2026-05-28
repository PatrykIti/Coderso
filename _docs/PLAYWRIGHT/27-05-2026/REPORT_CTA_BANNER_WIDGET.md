# RAPORT: CTA Banner Widget — current-state weryfikacja
> **Status:** Metadata gap
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_CTA_BANNER_WIDGET.md`
---
## 1. Zakres
- **Typ widgetu:** `cta-banner`
- **Fixture admin:** `/ctr-cta-banner-2305`
- **Fixture public:** `/test-cta-banner-0516`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `metadata-gap`
- `visual`: status `passed`, roots `1`, visible sections `7`, declared sections `7`.
- `advanced`: status `passed`, roots `1`, visible sections `5`, declared sections `5`.
- **Public status:** `passed`
- Public path `/test-cta-banner-0516` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/test-cta-banner-0516` returns `200` and shows no unmarked overflow.
- Focused replay did not reproduce a user-facing editor failure; the finding is limited to automation metadata on real Visual controls.
## 4. Co nie dziala / follow-up
- cta-banner.visual.colors-borders: `cta-banner.style.text`, `cta-banner.style.badgeBackground`, `cta-banner.style.badgeText`, `cta-banner.style.primaryButtonBg`, `cta-banner.style.primaryButtonText`, `cta-banner.style.primaryButtonBorder`, `cta-banner.style.secondaryButtonBg`, `cta-banner.style.secondaryButtonText`, `cta-banner.style.secondaryButtonBorder`, `cta-banner.style.border`
- cta-banner.visual.background-motion: `cta-banner.background.color`, `cta-banner.background.gradient`
- Impact: functional authoring still loads, but the widget fails the strict automation/control-ownership contract for these controls.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.