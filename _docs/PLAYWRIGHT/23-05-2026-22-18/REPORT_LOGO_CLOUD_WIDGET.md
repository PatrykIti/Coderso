# RAPORT: Logo Cloud Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `logo-cloud`
> **Edytor:** `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` (1557 linii)
> **Strona testowa:** `/admin/pages/5958b461-fd78-4b65-b154-64692c0fa474` (slug `/ctr-logo-cloud-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/logo-cloud-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/logo-cloud.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Starter logos` | Items and order (Wizard seed) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Header copy` | Section header |
| 3 | `Logos list and links` | Items and order (+ Actions subsection) |
| 4 | `Section CTA` | Actions |
| 5 | `Display style` | (unmapped — propose canonical) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Technical layout diagnostics` | Runtime payload |
| 2 | `Normalization and safeguards` | Normalization and safeguards |
| 3 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_5 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout-structure` | `Variant and layout structure` | 0 |
| `header-copy` | `Header copy` | 0 |
| `logos-list-and-links` | `Logos list and links` | 30 |
| `section-cta` | `Section CTA` | 0 |
| `display-style` | `Display style` | 0 |

## 5. Rekomendacje per widget

1. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Display style`.
2. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Header copy` → `Section header` (CONTRACT-02).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).