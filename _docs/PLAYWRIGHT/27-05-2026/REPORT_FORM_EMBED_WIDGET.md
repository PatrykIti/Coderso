# RAPORT: Form Embed Widget — current-state weryfikacja
> **Status:** Passed
> **Data:** 2026-05-27
> **Sesja:** Playwright CLI (clean smoke: `widget-contract-smoke-2026-05-27-clean`)
> **Srodowisko:** http://localhost:5173/admin · http://localhost:3000
> **Referencja historyczna:** `_docs/PLAYWRIGHT/23-05-2026-22-18/REPORT_FORM_EMBED_WIDGET.md`
---
## 1. Zakres
- **Typ widgetu:** `form-embed`
- **Fixture admin:** `/ctr-form-embed-2305`
- **Fixture public:** `/ctr-form-embed-2305`
- **Tryby weryfikowane:** `visual`, `advanced`
## 2. Wynik clean smoke
- **Admin status:** `passed`
- `visual`: status `passed`, roots `1`, visible sections `9`, declared sections `9`.
- `advanced`: status `passed`, roots `1`, visible sections `6`, declared sections `6`.
- **Public status:** `passed`
- Public path `/ctr-form-embed-2305` odpowiedzial `200`; overflow: `no`.
## 3. Co dziala
- Admin editor loads correctly for the current fixture page.
- `Visual` and `Advanced` tabs both render one editor root with visible sections.
- Public route `/ctr-form-embed-2305` returns `200` and shows no unmarked overflow.
## 4. Co nie dziala / follow-up
- No regression was reproduced in the 2026-05-27 clean smoke pass.
- No additional widget-specific failure was observed beyond the baseline smoke evidence for this fixture.
## 5. Uwagi do kolejnego przebiegu
- Ten raport jest current-state rerunem po TASK-339 i nie zastępuje starszego, bardziej szczegółowego raportu historycznego.
- Dla widgetow ze statusem `metadata-gap` potrzebny jest follow-up w kontrakcie automatyzacyjnym (`data-widget-control-path`), niekoniecznie w samym UX widgetu.
- Dla widgetow ze statusem `fixture-gap` potrzebny jest bogatszy fixture content, aby przetestowac populated runtime, nie sam empty-state renderer.