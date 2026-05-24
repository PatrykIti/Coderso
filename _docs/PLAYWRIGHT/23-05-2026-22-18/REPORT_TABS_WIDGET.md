# RAPORT: Tabs Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `tabs`
> **Edytor:** `core/admin/ui/widgets/editors/TabsEditors.tsx` (918 linii)
> **Strona testowa:** `/admin/pages/0be2cb49-8113-4a88-8d17-0ed70d5c5fdd` (slug `/ctr-tabs-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/tabs-visual.png`, `tabs-advanced.png`, `tabs-wizard.png`
> **DOM raw:** `_raw/tabs.txt`

---

## 1. Sekcje per zakładka (historyczne źródło: parser kodu, top-level funkcje)

Poniższe tabele są historycznym stanem z audytu 2026-05-23. Aktualny stan po
TASK-336-07 jest opisany w sekcji `2026-05-24 TASK-336-07 status`.

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

## 3. Krytyczne uwagi kontraktu (historyczne)

**Kolizja `Variant`** w 3 zakładkach jednocześnie — ten sam tytuł sekcji w Wizard, Visual, Advanced. Trzeba przemianować: Visual `Variant and structure`, Advanced `Behavior` lub `Runtime payload`, Wizard `Step 1: Variant`.

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

## 2026-05-24 TASK-336-07 status

Ten raport zachowuje pierwotne ustalenia z audytu 2026-05-23. Aktualny stan
po TASK-336-07 superseduje sekcje powyżej:

### Wizard

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Starter tabs` | setup: liczba startowych zakładek i domyślna zakładka |

### Visual

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Variant` | wariant |
| 2 | `Tab content` | etykiety, intro panelu, trigger metadata, ikony, disabled |
| 3 | `Layout` | orientation/alignment/overflow/padding/gaps |
| 4 | `Trigger style` | typografia triggera i motion |
| 5 | `Colors` | kolory powierzchni, triggera i panelu |

### Advanced

| # | Tytuł aktualny | Rola |
|---|----------------|------|
| 1 | `Runtime diagnostics` | read-only |
| 2 | `Technical ids` | read-only |
| 3 | `Runtime payload` | read-only |
| 4 | `Contract summary` | read-only |

Kolizja `Variant` i duplikacja Visual w Advanced zostały usunięte. Uwaga
procesowa: TASK-336-07 nie wdraża jeszcze docelowego one-time Wizard lifecycle;
Wizard pozostaje widoczną zakładką do czasu TASK-336-16.
