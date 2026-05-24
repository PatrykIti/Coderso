# RAPORT: Tabs Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `tabs`
> **Edytor:** `core/admin/ui/widgets/editors/TabsEditors.tsx` (918 linii)
> **Strona testowa:** `/admin/pages/0be2cb49-8113-4a88-8d17-0ed70d5c5fdd` (slug `/ctr-tabs-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/tabs-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/tabs.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Layout` | Layout (width, padding, alignment) |
| 3 | `Tabs Structure` | Items and order |

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Tabs Structure` | Items and order |
| 3 | `Trigger style` | Behavior (+ split Surface) |
| 4 | `Layout` | Layout (width, padding, alignment) |
| 5 | `Colors` | Colors |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant` | Variant and structure |
| 2 | `Diagnostics` | Runtime payload |
| 3 | `Tabs Structure` | Items and order |
| 4 | `Trigger style` | Behavior (+ split Surface) |
| 5 | `Layout` | Layout (width, padding, alignment) |
| 6 | `Colors` | Colors |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `tabs.visual.variant` | `Variant` | 1 |
| `tabs.visual.item-content` | `Tab content` | 10 |
| `tabs.visual.layout` | `Layout` | 6 |
| `tabs.visual.trigger-style` | `Trigger style` | 3 |
| `tabs.visual.colors` | `Colors` | 6 |
| `tabs.structure` | `Structure` | 2 |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Variant`** w 3 zakładkach jednocześnie — ten sam tytuł sekcji w Wizard, Visual, Advanced. Trzeba przemianować: Visual `Variant and structure`, Advanced `Behavior` lub `Runtime payload`, Wizard `Step 1: Variant`.

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Variant` | wizard, visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. **CONTRACT-09 + SHARED-HELPER:** Tabs renderuje pomocniczy komponent z 5 sekcjami (`Variant`, `Layout`, `Tabs Structure`, `Trigger style`, `Colors`) w obu Visual i Advanced — Wizard też re-renderuje 3 z nich. Zakładki nie różnicują treści. Decyzja: albo każda zakładka renderuje rozłączny podzbiór sekcji, albo `Tabs` ma tylko jedną zakładkę bez tabs trybów edytora.
2. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
3. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
4. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).