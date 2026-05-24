# RAPORT: FAQ Accordion Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `faq-accordion`
> **Edytor:** `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` (1357 linii)
> **Strona testowa:** `/admin/pages/639e28ec-1203-4fbe-8273-bf3fd0bba203` (slug `/ctr-faq-accordion-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/faq-accordion-visual.png`, `faq-accordion-advanced.png`, `faq-accordion-wizard.png`
> **DOM raw:** `_raw/faq-accordion.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Questions and answers` | Items and order |
| 4 | `Move up` | (ignore — UI control mis-labeled as section) |
| 5 | `Move down` | (ignore — UI control mis-labeled as section) |
| 6 | `Remove` | (ignore — UI control mis-labeled as section) |
| 7 | `Display behavior` | Behavior |
| 8 | `Layout and typography` | Layout (+ split Typography) |
| 9 | `Colors and panel style` | Colors (+ split Surface) |
| 10 | `SEO and structured data` | Semantics and SEO |
| 11 | `Remove FAQ item?` | (ignore — confirm dialog) |
| 12 | `Delete selected FAQ items?` | (ignore — confirm dialog) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Open-state and fallback controls` | Behavior |
| 2 | `Technical style tokens` | Technical tokens |
| 3 | `Normalization and safeguards` | Normalization and safeguards |
| 4 | `Raw payload snapshot` | Raw payload snapshot |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Header copy` → `Section header` (CONTRACT-02).
4. Przemianować `Colors and panel style` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
5. Przemianować `Technical style tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).