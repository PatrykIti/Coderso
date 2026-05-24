# RAPORT: Accordion Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `accordion`
> **Edytor:** `core/admin/ui/widgets/editors/AccordionEditors.tsx` (912 linii)
> **Strona testowa:** `/admin/pages/cabe29cc-1ad6-45b7-8773-731cc5b0c503` (slug `/ctr-accordion-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/accordion-visual.png`, `accordion-advanced.png`, `accordion-wizard.png`
> **DOM raw:** `_raw/accordion.txt`

---

## 1. Sekcje per zakładka (historyczne źródło: parser kodu, top-level funkcje)

Poniższe tabele są historycznym stanem z audytu 2026-05-23. Aktualny stan po
TASK-336-08 jest opisany w sekcji `2026-05-24 TASK-336-08 status`.

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

## 3. Krytyczne uwagi kontraktu (historyczne)

**Kolizja `Variant`** w 3 zakładkach jednocześnie — identyczna sytuacja jak Tabs.

## 4. Kolizje (historycznie: ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Variant` | wizard, visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget (historyczne)

1. Przemianować `Variant` → `Variant and structure` (CONTRACT-01).
2. Przemianować `Diagnostics` → `Runtime payload` (CONTRACT-05).
3. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).

## 2026-05-24 TASK-336-08 status

Ten raport zachowuje pierwotne ustalenia z audytu 2026-05-23. Aktualny stan
po TASK-336-08 superseduje sekcje powyżej:

### Wizard

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Starter items` | setup: liczba startowych elementów i domyślnie otwarty element |

### Visual

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Variant` | wariant |
| 2 | `Item content` | tytuły, summary text, ikony |
| 3 | `Behavior and Style` | open behavior, layout, motion, typography, colors |

### Advanced

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Runtime diagnostics` | read-only |
| 2 | `Technical ids` | read-only |
| 3 | `Runtime payload` | read-only |
| 4 | `Contract summary` | read-only |

Kolizja `Variant` i duplikacja Visual w Advanced zostały usunięte. Uwaga
procesowa: TASK-336-08 nie wdraża jeszcze docelowego one-time Wizard lifecycle;
Wizard pozostaje widoczną zakładką do czasu TASK-336-16.
