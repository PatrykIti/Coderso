# RAPORT: Navigation Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `navigation`
> **Edytor:** `core/admin/ui/widgets/editors/NavigationEditors.tsx` (1983 linii)
> **Strona testowa:** `/admin/pages/2789358f-ed6c-446e-954e-d5b2b0835ce5` (slug `/ctr-navigation-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/navigation-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/navigation.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

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

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_8 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-structure` | `Variant and Structure` | 0 |
| `brand-and-logo` | `Brand and Logo` | 0 |
| `navigation-links` | `Navigation Links` | 0 |
| `cta-and-right-actions` | `CTA and Right Actions` | 0 |
| `mobile-behavior` | `Mobile Behavior` | 0 |
| `colors-borders-typography` | `Colors, Borders, Typography` | 0 |
| `surface-and-runtime-behavior` | `Surface and Runtime Behavior` | 0 |
| `navigation.structure` | `Structure` | 1 |

## 3. Krytyczne uwagi kontraktu

Advanced renderuje tylko opisową kartę bez `WidgetEditorSection`. Brakuje kanonicznych `Runtime payload`, `Technical tokens`, `Raw payload snapshot` w Advanced (CONTRACT-14).

## 5. Rekomendacje per widget

1. Przemianować `Variant and Structure` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Colors, Borders, Typography` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
3. **CONTRACT-14:** Advanced jest kompletnie pusty (`NavigationAdvancedEditor` renderuje tylko opisową kartę). Dodać kanoniczne sekcje: `Runtime payload`, `Technical tokens`, `Normalization and safeguards`, `Raw payload snapshot`.
4. Wszystkie tytuły w Visual używają niespójnej kapitalizacji (`Variant and Structure`, `Brand and Logo`, `Navigation Links`, `Colors, Borders, Typography`, `Surface and Runtime Behavior`) — sentence case, rozbić `Colors, Borders, Typography` na 3 sekcje (`Colors`, `Surface`, `Typography`).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).