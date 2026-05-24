# RAPORT: Footer Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `footer`
> **Edytor:** `core/admin/ui/widgets/editors/FooterEditors.tsx` (1410 linii)
> **Strona testowa:** `/admin/pages/0aa97321-eeda-4455-ba63-4537cc7f2dee` (slug `/ctr-footer-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshot:** `screenshots/footer-editor.png` (Visual mode — domyślny po utworzeniu strony)
> **DOM raw:** `_raw/footer.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu rekursywny — main funkcja + helpery)

### Wizard
_(brak sekcji top-level (brak `<WidgetEditorSection>` w ogóle) — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
_(brak sekcji top-level (brak `<WidgetEditorSection>` w ogóle))_

### Advanced
_(brak sekcji top-level (brak `<WidgetEditorSection>` w ogóle))_

## 2. Live DOM scan — Visual mode (Playwright snapshot)

_1 sekcji znalezionych w DOM po `[data-widget-editor-section]`._

| `data-widget-editor-section` | Title | Kontrolki |
|------------------------------|-------|-----------|
| `footer.structure` | `Structure` | 4 |

## 3. Krytyczne uwagi kontraktu

**KRYTYCZNE:** edytor Footer NIE używa `<WidgetEditorSection>` w ogóle. Cały Wizard/Visual/Advanced zbudowany na surowych `<div className="space-y-3 rounded-xl border p-4">`. Wymaga pełnej refaktoryzacji do kontraktu (CONTRACT-11).

## 5. Rekomendacje per widget

1. **CONTRACT-11 (KRYTYCZNE):** przepisać cały edytor Footer (~1410 linii) z surowych `<div className="space-y-3 rounded-xl border p-4">` na `<WidgetEditorSection>`. Propozycja sekcji per zakładka:
2.    - Wizard: `Step 1: Variant and structure`, `Step 2: Brand and logo`, `Step 3: Columns`, `Step 4: Legal`
3.    - Visual: `Variant and structure`, `Brand and logo`, `Columns`, `Legal`, `Layout (width, padding, alignment)`, `Surface (border, radius, shadow)`, `Colors`
4.    - Advanced: `Runtime payload`, `Technical tokens`, `Normalization and safeguards`, `Raw payload snapshot`

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).