# RAPORT: Template Section Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `template-section`
> **Edytor:** `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` (279 linii)
> **Strona testowa:** `/admin/pages/56a31dad-cf02-4671-89f4-15ecd77fa67f` (slug `/ctr-template-section-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/template-section-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/template-section.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Wizard` | (meta-label only, not actual section) |
| 2 | `Preview and metadata` | Runtime payload |
| 3 | `Runtime behavior` | Runtime payload |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Visual` | (meta-label only, not actual section) |
| 2 | `Preview and metadata` | Runtime payload |
| 3 | `Runtime behavior` | Runtime payload |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Advanced` | (meta-label only, not actual section) |
| 2 | `Resolved payload` | Runtime payload |
| 3 | `Preview and metadata` | Runtime payload |
| 4 | `Runtime behavior` | Runtime payload |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_2 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `template-section.visual.active-template` | `Active template` | 0 |
| `template-section.visual.presentation-fields` | `Template presentation` | 2 |

## 3. Krytyczne uwagi kontraktu

Sekcje nazwane literalnie `Wizard`, `Visual`, `Advanced` (meta-labele) — to nie są prawdziwe sekcje, tylko wrappery trybu. Sekcja `Resolved payload` w Advanced powinna nazywać się `Runtime payload`.

## 5. Rekomendacje per widget

1. **META-LABEL:** sekcje literalnie nazwane `Wizard`, `Visual`, `Advanced` — to wrappery trybu zamiast prawdziwych sekcji. Usunąć i zastąpić sekcjami z prawdziwymi nazwami. `Resolved payload` → `Runtime payload`.
2. Przemianować `Runtime behavior` → `Runtime payload` (CONTRACT-05).
3. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).