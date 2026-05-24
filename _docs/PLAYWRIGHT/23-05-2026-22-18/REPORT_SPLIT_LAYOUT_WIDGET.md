# RAPORT: Split Layout Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `split-layout`
> **Edytor:** `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` (697 linii)
> **Strona testowa:** `/admin/pages/c3fa7a67-99fc-42ec-a4e4-131c1dc75a58` (slug `/ctr-split-layout-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/split-layout-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/split-layout.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and pane ratio` | Variant and structure |
| 2 | `Mobile collapse behavior` | Responsive overrides |
| 3 | `Spacing and vertical alignment` | Layout (width, padding, alignment) |
| 4 | `Pane content` | Items and order (Slot subsection) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Responsive diagnostics` | Runtime payload |
| 2 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_5 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-pane-ratio` | `Variant and pane ratio` | 0 |
| `mobile-collapse-behavior` | `Mobile collapse behavior` | 0 |
| `spacing-and-vertical-alignment` | `Spacing and vertical alignment` | 0 |
| `pane-content` | `Pane content` | 0 |
| `split-layout.structure` | `Structure` | 2 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and pane ratio` → `Variant and structure` (CONTRACT-01).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).