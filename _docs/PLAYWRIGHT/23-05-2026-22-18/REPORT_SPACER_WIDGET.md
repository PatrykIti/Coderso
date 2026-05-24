# RAPORT: Spacer Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `spacer`
> **Edytor:** `core/admin/ui/widgets/editors/SpacerEditors.tsx` (500 linii)
> **Strona testowa:** `/admin/pages/719cca9b-25fe-43ba-a17c-24407f3f2d36` (slug `/ctr-spacer-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/spacer-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/spacer.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and responsive behavior` | Variant and structure |
| 2 | `Responsive heights` | Responsive overrides |
| 3 | `Editor guide` | (internal helper card — not contract) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical height tokens` | Technical tokens |
| 2 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_3 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `spacer.visual-variant-behavior` | `Variant and responsive behavior` | 0 |
| `spacer.visual-responsive-heights` | `Responsive heights` | 0 |
| `spacer.visual-editor-guide` | `Editor guide` | 0 |

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Przemianować `Variant and responsive behavior` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Technical height tokens` → `Technical tokens` (CONTRACT-06).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).