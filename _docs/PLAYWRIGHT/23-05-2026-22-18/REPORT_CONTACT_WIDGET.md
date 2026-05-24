# RAPORT: Contact Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `contact`
> **Edytor:** `core/admin/ui/widgets/editors/ContactEditors.tsx` (1818 linii)
> **Strona testowa:** `/admin/pages/969501e7-887f-458a-887a-1c2725e815d8` (slug `/ctr-contact-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/contact-visual.png`, `contact-advanced.png`, `contact-wizard.png`
> **DOM raw:** `_raw/contact.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Contact layout` | Layout (width, padding, alignment) |
| 2 | `Section header` | Section header |
| 3 | `Contact form` | Items and order (form fields) |
| 4 | `Contact details` | Items and order |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and section header` | Variant and structure (+ split Section header) |
| 2 | `Form fields and required rules` | Items and order (form fields) |
| 3 | `Field labels, placeholders, and layout` | Items and order (form fields subsection) |
| 4 | `Contact details and business info` | Section header (Business info) |
| 5 | `Map source and display behavior` | Data source (+ Behavior) |
| 6 | `Colors, borders, and surface styling` | Colors (+ split Surface) |
| 7 | `Section layout and spacing` | Layout (width, padding, alignment) |
| 8 | `Submission runtime binding` | Runtime payload |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Map source and runtime metadata` | Runtime payload |
| 2 | `Normalization and fallback controls` | Normalization and safeguards |
| 3 | `Runtime diagnostics snapshot` | Runtime payload |

## 5. Rekomendacje per widget

1. Przemianować `Variant and section header` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Colors, borders, and surface styling` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
3. Przemianować `Normalization and fallback controls` → `Normalization and safeguards` (CONTRACT-04).
4. Przemianować `Runtime diagnostics snapshot` → `Runtime payload` (CONTRACT-05).
5. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).