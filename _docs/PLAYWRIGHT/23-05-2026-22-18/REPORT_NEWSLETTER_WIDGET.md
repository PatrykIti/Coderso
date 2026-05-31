# RAPORT: Newsletter Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `newsletter`
> **Edytor:** `core/admin/ui/widgets/editors/NewsletterEditors.tsx` (1451 linii)
> **Strona testowa:** `/admin/pages/f0ad3daf-aedf-47d8-9ff4-41587dff8e07` (slug `/ctr-newsletter-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/newsletter-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/newsletter.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Variant and form structure` | Variant and structure |
| 2 | `Content and copy` | (unmapped — propose canonical) |
| 3 | `Form semantics and consent` | Behavior |
| 4 | `Submission runtime` | Runtime payload (form) |
| 5 | `Integration target` | Runtime payload (integration) |
| 6 | `Colors and emphasis` | Colors |
| 7 | `Spacing and alignment` | Layout (width, padding, alignment) |

### Advanced
| # | Tytuł (obecny) | Proponowany kanon |
|---|----------------|--------------------|
| 1 | `Transport diagnostics` | Runtime payload |
| 2 | `Raw integration metadata` | Runtime payload |
| 3 | `Normalization and fallback` | Normalization and safeguards |

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_DOM nie znalazł żadnych sekcji `[data-widget-editor-section]`._

## 5. Rekomendacje per widget

1. Wizard top-level jest pusty — albo dorobić sekcje `Step 1: …`, `Step 2: …`, … albo wycofać zakładkę Wizard dla tego widgetu (CONTRACT-15).
2. Tytuły nieobjęte mapowaniem kanonicznym — wymagają decyzji: `Content and copy`.
3. Przemianować `Variant and form structure` → `Variant and structure` (CONTRACT-01).
4. Przemianować `Colors and emphasis` → `Colors` (CONTRACT-03), wyodrębniając Surface/Typography do osobnych sekcji jeżeli były razem.
5. Przemianować `Normalization and fallback` → `Normalization and safeguards` (CONTRACT-04).
6. Dodać `Raw payload snapshot` w Advanced (kanon §6.4 wspólnego raportu).

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).