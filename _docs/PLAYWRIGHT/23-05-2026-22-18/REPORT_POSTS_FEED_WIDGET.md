# RAPORT: Posts Feed Widget — kontrakt edytora

> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Widget ID:** `posts-feed`
> **Edytor:** `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (1607 linii)
> **Strona testowa:** `/admin/pages/160c954b-1b3e-4798-bf37-74f697a18e24` (slug `/ctr-posts-feed-2305`)
> **Sesja Playwright:** `contract-admin-pc` (świeża, izolowana)
> **Screenshoty:** `screenshots/posts-feed-visual.png`, `posts-feed-advanced.png`, `posts-feed-wizard.png`
> **DOM raw:** `_raw/posts-feed.txt`

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

- `Runtime status` → **Runtime payload**
- `Source setup` → **Data source**
- `Display` → **(unmapped — propose canonical)**
- `Section header` → **Section header**
- `Layout and style` → **(unmapped — propose canonical)**
- `Empty state` → **Empty state**
- `Runtime payload` → **Runtime payload**

## 3. Krytyczne uwagi kontraktu

Wszystkie 3 zakładki mają pustą main funkcję — sekcje w helperach. Należy podnieść do top-level lub udokumentować helpery jako część kontraktu (CONTRACT-13).

## 5. Rekomendacje per widget

1. Brak rekomendacji wykraczających poza wspólny kontrakt — widget zgodny.

---

> Raport powiązany: `REPORT_COMMON_CONTRACT.md` (pełna lista kanonów i TASK-336+).