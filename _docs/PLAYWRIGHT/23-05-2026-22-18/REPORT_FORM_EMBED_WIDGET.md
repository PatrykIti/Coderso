# RAPORT: Form Embed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `form-embed`
> **Edytor:** `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` (1243 linii)
> **Strona testowa:** `/admin/pages/fed7fa7d-b498-439c-858d-72ac0a89926f` (slug `/ctr-form-embed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/form-embed-visual.png`, `form-embed-advanced.png`, `form-embed-wizard.png`
> **DOM raw:** `_raw/form-embed.txt`

---

## 1. Sekcje per zakładka (źródło: parser kodu, top-level funkcje)

### Wizard
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3) — Wizard pusty: redaktor widzi tylko nagłówek widgetu + przycisk „Continue to layout and styling)_

### Visual
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3))_

### Advanced
_(brak sekcji top-level (sekcje istnieją w helperach — patrz §3))_

## 2. Sekcje siedzące w helperach (poza top-level funkcjami)

Sekcje (`<EditorSection title=…>`) zdefiniowane wewnątrz pomocniczych komponentów, nie w głównej funkcji editora — przez to parser top-level nie znalazł ich w §1, ale renderują się w UI:

- `Form selection` → **Data source**
- `Content` → **(ignore — screen widget label)**
- `Layout` → **Layout (width, padding, alignment)**
- `Field labels` → **Items and order (form fields subsection)**
- `Style` → **(unmapped — propose canonical)**
- `Multi-step navigation` → **Behavior**
- `Submit behavior` → **Behavior**
- `Diagnostics` → **Runtime payload**
- `Normalized payload snapshot` → **Raw payload snapshot**

## 3. Krytyczne uwagi kontraktu

Jw. — wszystkie 3 zakładki puste na poziomie main funkcji.

## 5. Rekomendacje per widget

1. Brak rekomendacji wykraczających poza wspólny kontrakt — widget zgodny.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).