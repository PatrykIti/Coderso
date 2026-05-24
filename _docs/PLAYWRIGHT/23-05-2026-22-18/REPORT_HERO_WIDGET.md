# RAPORT: Hero Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `hero`
> **Edytor:** `core/admin/ui/widgets/editors/HeroEditors.tsx` (3139 linii)
> **Strona testowa:** `/admin/pages/1216108b-7cc2-4ed9-956e-afa97351aca5` (slug `/ctr-hero-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/hero-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/hero.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and Presets` | Variant and structure |
| 2 | `Badge and headline` | (unmapped — propose canonical) |
| 3 | `CTA` | Actions |
| 4 | `Rich copy and social proof` | (unmapped — propose canonical) |
| 5 | `Media` | Media |
| 6 | `Typography` | Typography |
| 7 | `Appearance` | (unmapped — propose canonical) |
| 8 | `Colors and Borders` | Colors (+ split Surface for borders) |
| 9 | `Background` | Background |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Hero Layout` | Layout (width, padding, alignment) |
| 2 | `Background` | Background |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_10 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `hero.variant-presets` | `Variant and Presets` | 0 |
| `hero.badge-headline` | `Badge and headline` | 4 |
| `hero.cta` | `CTA` | 0 |
| `hero.rich-copy-social-proof` | `Rich copy and social proof` | 3 |
| `hero.media` | `Media` | 0 |
| `hero.typography` | `Typography` | 0 |
| `hero.appearance` | `Appearance` | 0 |
| `hero.colors-borders` | `Colors and Borders` | 10 |
| `hero.background` | `Background` | 2 |
| `hero.structure` | `Structure` | 1 |

## 3. Krytyczne uwagi kontraktu

**Kolizja `Background`** w Visual i Advanced — ten sam koncept ma dwa miejsca konfiguracji. Zlać do Visual, usunąć z Advanced (CONTRACT-07).

## 4. Kolizje (ten sam tytuł w wielu zakładkach)

| Tytuł | Występuje w |
|-------|--------------|
| `Background` | visual, advanced |

Naprawa: nadać unikalne tytuły lub scalić sekcje w jedno miejsce.

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Appearance`, `Badge and headline`, `Rich copy and social proof`.
3. Przemianować `Variant and Presets` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Colors and Borders` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
5. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).