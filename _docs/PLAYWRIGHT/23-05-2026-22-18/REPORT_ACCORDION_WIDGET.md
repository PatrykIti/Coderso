# RAPORT: Accordion Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `accordion`
> **Edytor:** `core/admin/ui/widgets/editors/AccordionEditors.tsx` (912 linii)
> **Strona testowa:** `/admin/pages/cabe29cc-1ad6-45b7-8773-731cc5b0c503` (slug `/ctr-accordion-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/accordion-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/accordion.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Items` | Items and order |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Items` | Items and order |
| 3 | `Behavior and Style` | Behavior (+ split Surface) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Diagnostics` | Runtime payload |
| 3 | `Items` | Items and order |
| 4 | `Behavior and Style` | Behavior (+ split Surface) |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_4 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `accordion.visual.variant` | `Variant` | 1 |
| `accordion.visual.item-content` | `Item content` | 6 |
| `accordion.visual.behavior-style` | `Behavior and Style` | 14 |
| `accordion.structure` | `Structure` | 2 |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Variant`** w 3 zakładkach jednocześnie — identyczna sytuacja jak Tabs.

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Variant` | wizard, visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. **CONTRACT-09 + SHARED-HELPER:** Accordion (jak Tabs) renderuje pomocniczy komponent z `Variant`, `Items`, `Behavior and Style` w wielu zakładkach. Decyzja jak dla Tabs.
2. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).