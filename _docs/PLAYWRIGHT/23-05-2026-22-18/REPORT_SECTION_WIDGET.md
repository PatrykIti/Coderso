# RAPORT: Section Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `section`
> **Edytor:** `core/admin/ui/widgets/editors/SectionEditors.tsx` (2559 linii)
> **Strona testowa:** `/admin/pages/d37f900c-e8c2-4608-a71e-4a038300a048` (slug `/ctr-section-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/section-visual.png`, `section-advanced.png`, `section-wizard.png`
> **DOM raw:** `_raw/section.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Section setup` | Wizard combined (Variant + Section header + Background) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and structure` | Variant and structure |
| 2 | `Heading and intro` | Section header |
| 3 | `Semantics and anchor` | Semantics and SEO |
| 4 | `Width and spacing` | Layout (width, padding, alignment) |
| 5 | `Surface and borders` | Surface (border, radius, shadow) |
| 6 | `Background media and layers` | Background |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical tokens` | (unmapped — propose canonical) |
| 2 | `Raw payload snapshot` | Raw payload snapshot |

## 3. Krytyczne uwagi kontraktu

Sekcja `Background media and layers` powinna nazywać się `Background` (kanon). Sekcja `Width and spacing` — `Layout (width, padding, alignment)`. Sekcja `Heading and intro` — `Section header`.

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Technical tokens`.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).