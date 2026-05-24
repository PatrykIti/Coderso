# RAPORT: Rich Text Section Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `rich-text-section`
> **Edytor:** `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` (1901 linii)
> **Strona testowa:** `/admin/pages/1e0f651b-d7c0-4c03-8e3b-07bff2c1d5ca` (slug `/ctr-rich-text-section-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/rich-text-section-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/rich-text-section.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3) — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and layout structure` | Variant and structure |
| 2 | `Title block copy` | Section header |
| 3 | `Body content` | Section body |
| 4 | `Structured content blocks` | Items and order |
| 5 | `Reader options` | Behavior |
| 6 | `Typography and colors` | Typography (+ split Colors) |
| 7 | `Remove structured block` | (ignore — confirm dialog) |
| 8 | `Reduce structured block count` | (ignore — confirm dialog) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Output mode and source diagnostics` | Runtime payload |
| 2 | `Raw HTML technical editor` | Technical tokens |
| 3 | `Normalization and safeguards` | Normalization and safeguards |
| 4 | `Raw payload snapshot` | Raw payload snapshot |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_6 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `variant-and-layout-structure` | `Variant and layout structure` | 0 |
| `title-block-copy` | `Title block copy` | 0 |
| `body-content` | `Body content` | 0 |
| `structured-content-blocks` | `Structured content blocks` | 0 |
| `reader-options` | `Reader options` | 0 |
| `typography-and-colors` | `Typography and colors` | 0 |

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Variant and layout structure` → **Variant and structure**
- `Title block copy` → **Section header**
- `Body content` → **Section body**
- `Structured content blocks` → **Items and order**
- `Reader options` → **Behavior**
- `Typography and colors` → **Typography (+ split Colors)**
- `Output mode and source diagnostics` → **Runtime payload**
- `Raw HTML technical editor` → **Technical tokens**
- `Normalization and safeguards` → **Normalization and safeguards**
- `Raw payload snapshot` → **Raw payload snapshot**

## 3. Krytyczne uwagi kontraktu

Sekcje siedzą tylko w helperach — top-level `RichTextSectionAdvancedEditor` jest pusty. Brakuje także `Normalization and safeguards` na widocznym poziomie kontraktu.

## 5. Rekomendacje per widget

1. Przemianować `Variant and layout structure` → `Variant and structure` (CONTRACT-01).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).