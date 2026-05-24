# RAPORT: Navigation Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `navigation`
> **Edytor:** `core/admin/ui/widgets/editors/NavigationEditors.tsx` (1983 linii)
> **Strona testowa:** `/admin/pages/2789358f-ed6c-446e-954e-d5b2b0835ce5` (slug `/ctr-navigation-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/navigation-visual.png`, `navigation-advanced.png`, `navigation-wizard.png`
> **DOM raw:** `_raw/navigation.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Synced menu preview` | Items and order (Wizard seed) |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and Structure` | Variant and structure |
| 2 | `Brand and Logo` | Section header (Brand subsection) |
| 3 | `Navigation Links` | Items and order |
| 4 | `Current synced menu` | (ignore — internal helper card) |
| 5 | `Current fallback links` | (ignore — internal helper card) |
| 6 | `CTA and Right Actions` | Actions |
| 7 | `Mobile Behavior` | Responsive overrides |
| 8 | `Colors, Borders, Typography` | Colors (+ split Surface, Typography) |
| 9 | `Surface and Runtime Behavior` | Runtime payload (+ split Surface) |

### Advanced
_(brak sekcji top-level)_

## 3. Krytyczne uwagi kontraktu

Advanced renderuje tylko opisową kartę bez `WidgetEditorSection`. Brakuje kanonicznych `Runtime payload`, `Technical tokens`, `Raw payload snapshot` w Advanced (CONTRACT-14).

## 5. Rekomendacje per widget

1. Przemianować `Variant and Structure` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Colors, Borders, Typography` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).