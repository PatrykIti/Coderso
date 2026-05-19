# RAPORT: Logo Cloud Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Logo Cloud Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `logo-cloud-audit` (oddzielna od innych agentów)
> **Strona testowa:** TEST-LOGO-CLOUD-0516 (`/test-logo-cloud-0516`)

### Routing note — 2026-05-19 current checkout

This report remains the original 2026-05-16 Playwright evidence, but the live
checkout has moved since then:

- shared safe-href output for external logo links, fallback section naming, and
  `hoverColor` truthfulness already landed under `TASK-256-06-02`;
- the remaining shared residuals still missing on current `HEAD` are now
  reopened under `TASK-313`: Advanced duplicate controls, shared Link URL
  feedback, shared heading semantics, and safe `logoHeight: "none"` output;
- `TASK-274` continues to own only Logo Cloud product/UX work that is local to
  this widget after those shared prerequisites are honest.

### Shared residual closure note — 2026-05-19

- `UX-07` is fixed under `TASK-313-01`: Advanced is now diagnostics-only for
  shared `logoHeight`, `gap`, and `alignment`, while Visual remains the sole
  editable owner for those controls.
- The shared `BF-10` Link URL feedback slice is fixed under `TASK-313-01`:
  Visual now warns on unsafe `Link URL` values. Widget-local image
  preview/unavailable feedback remains `TASK-274-02`.
- `BUG-02` / `BF-09` are fixed under `TASK-313-02`: the shared section shell
  now renders the title as `<h2>` and uses `aria-labelledby`, with fallback
  `aria-label="Partner logos"` when the title is omitted.
- `BUG-05` is fixed under `TASK-313-02`: `logoHeight: "none"` still preserves
  the token in normalized data but no longer leaves runtime image height
  unbounded.

---

## 1. Przegląd widgetu

**Typ:** Content (standalone, bez slotów)
**Kategoria:** `content`
**Warianty:** `grid`, `strip`, `dense`
**Ograniczenia elementów:** min 1 / max 24
**Plik renderera:** `core/widgets/core/logoCloud.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`

Logo Cloud widget służy do prezentacji logotypów partnerów i klientów w celu budowania wiarygodności (trust building). Obsługuje trzy warianty siatki, opcjonalny nagłówek sekcji, oraz style visual dla każdego kafelka logo (tło, obramowanie, grayscale, hover).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `title`, `description` |
| **Logos** | `id`, `name`, `image` (URL), `href` (link) |
| **Style** | `logoHeight` (none/sm/md/lg/xl), `grayscale` (bool), `hoverColor` (bool), `gap` (none/sm/md/lg), `alignment` (start/center/end), `tileBackground` (CSS), `tileBorderColor` (CSS) |

### 2.2 Warianty

| Wariant | Klasy kontenera | Opis |
|---------|-----------------|------|
| `grid` | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | Wyważona siatka 4 kolumny |
| `strip` | `flex flex-wrap items-center` | Poziomy pasek z zawijaniem |
| `dense` | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` | Gęsta matryca 6 kolumn |

### 2.3 Tryby edytora

- **Wizard** — szybki start: wybór wariantu (dropdown), tytuł sekcji, liczba logotypów, nazwy logotypów (bez Image URL i Link URL)
- **Visual** — pełny edytor: wybór wariantu (karty), logo count, header (title/description), logos list (name/image/href per logo), display style (height/gap/alignment/grayscale/hoverColor/tileBackground/tileBorder)
- **Advanced** — diagnostyka: logo height/gap/alignment tokens (duplikaty z Visual), normalizacja, reset do defaults, raw payload JSON, layout tokens (padding top/bottom, margin, visibility per breakpoint)

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Wizard

| Test | Wynik |
|------|-------|
| Wybór wariantu przez dropdown (Grid/Strip/Dense) | ✓ Działa |
| Pole "Section title" — input, aktualizuje canvas | ✓ Działa |
| "Logo count" — dropdown 1–24 | ✓ Działa |
| "Basic logo names" — input per logo | ✓ Działa |
| Brak pól Image URL / Link URL w Wizard | ✓ Potwierdzone (UX-03) |

### 3.2 Visual editor

| Test | Wynik |
|------|-------|
| Karty wariantów Grid/Strip/Dense (Selected/Pick badges) | ✓ Działa |
| Header — Title (input) + Description (textarea) | ✓ Działa |
| Header — BRAK pola Eyebrow | ✓ Potwierdzone (BF-01) |
| Logo item — Name / Image URL / Link URL per logo | ✓ Działa |
| Move up (disabled dla pierwszego), Move down, Remove | ✓ Działa |
| Remove logo bez dialogu potwierdzenia | ✓ Potwierdzone (UX-02) |
| Add logo — dodaje nowy item | ✓ Działa |
| Logo height select (None/Small/Medium/Large/Extra large) | ✓ Działa |
| Gap select (None/Compact/Default/Spacious) | ✓ Działa |
| Alignment select (Start/Center/End) | ✓ Działa |
| Grayscale logos switch | ✓ Działa |
| Colorize on hover — aktywny gdy grayscale = false | ✓ Potwierdzone (UX-01) |
| Tile background z Clear | ✓ Działa |
| Tile border z Clear | ✓ Działa |
| Image URL renderuje logo w canvas | ✓ Działa |

### 3.3 Advanced editor

| Test | Wynik |
|------|-------|
| Logo height / Gap / Alignment tokens (duplikaty z Visual) | ✓ Potwierdzone (UX-07) |
| Normalize now — normalizuje payload | ✓ Działa |
| Reset to defaults — przywraca defaults | ✓ Działa |
| Raw payload snapshot (JSON) | ✓ Wyświetla poprawnie |
| Padding top/bottom container (xl domyślnie) | ✓ Działa |
| Margin top/bottom (none) | ✓ Działa |
| Visibility per breakpoint (Desktop/Tablet/Mobile) | ✓ Działa |

### 3.4 Warianty na froncie

| Wariant | Klasy kontenera (zweryfikowane) | Frontend |
|---------|--------------------------------|----------|
| Grid | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` | ✓ Renderuje |
| Strip | `flex flex-wrap items-center gap-4 justify-center` | ✓ Renderuje |
| Dense | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4` | ✓ Renderuje |

### 3.5 Inne

| Test | Wynik |
|------|-------|
| `loading="lazy"` na obrazach logo | ✓ Potwierdzone |
| Logo bez Image URL → renderuje tekst `name` | ✓ Działa |
| Logo z Image URL → renderuje `<img>` | ✓ Działa |
| Logo z `href` → renderuje jako `<a>` | ✓ Działa |
| Logo bez `href` → renderuje jako `<div>` | ✓ Działa |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Logo link (`<a>`) bez `rel` i bez opcji `target`
**Priorytet:** Średni
**Środowisko:** Admin canvas + Frontend (oba)
**Opis:** Linki logotypów renderują jako `<a href="...">` z `rel=null` i `target=null`. Zewnętrzne linki partnerów/klientów bez `rel="noopener noreferrer"` są podatne na atak `window.opener`. Brak opcji konfiguracji `target` w edytorze.
**Weryfikacja Playwright:** `firstLinkRel: null, firstLinkTarget: null` — potwierdzone na froncie.
**Lokalizacja:** `logoCloud.tsx:307–315` — `<a>` bez `rel` i `target`.
**Naprawa:** Dodać `rel="noopener noreferrer"` na stałe + opcjonalny toggle "Open in new tab".

#### BUG-02 — H3 hardcoded — zaburzona hierarchia nagłówków
**Priorytet:** Średni
**Środowisko:** Admin canvas + Frontend (oba)
**Opis:** Tytuł sekcji renderuje się zawsze jako `<h3>` niezależnie od kontekstu strony.
**Weryfikacja Playwright:** `document.querySelectorAll('h1,h2,h3')` → tylko `[{"tag":"H3","text":"Trusted by teams worldwide"}]` — brak H1 i H2 na stronie testowej.
**Lokalizacja:** `logoCloud.tsx:389` — `<h3>` hardcoded.
**Naprawa:** Dodać opcję `headingLevel` lub zmienić domyślnie na `<h2>`.

#### BUG-03 — Brak `aria-label` na `<section>`
**Priorytet:** Średni
**Środowisko:** Admin canvas + Frontend (oba)
**Opis:** Element `<section>` nie posiada `aria-label` ani `aria-labelledby`. Screen reader nie identyfikuje regionu landmark.
**Weryfikacja Playwright:** `ariaLabel: null, ariaLabelledby: null` — potwierdzone.
**Lokalizacja:** `logoCloud.tsx:376` — `<section>` bez aria attributes.

#### BUG-04 — `hoverColor` aktywny gdy `grayscale: false` — zbędna klasa CSS
**Priorytet:** Niski
**Opis:** Klasa `group-hover:grayscale-0` jest dodawana do obrazu gdy `hoverColor === true`, niezależnie od stanu `grayscale`. Gdy grayscale jest wyłączony, ta klasa jest bezużyteczna.
**Lokalizacja:** `logoCloud.tsx:289`.

#### BUG-05 — `logoHeight: "none"` — brak ograniczenia wysokości obrazu
**Priorytet:** Niski
**Opis:** Przy `logoHeight = "none"` obraz nie ma klasy `h-*`, więc renderuje się w naturalnym rozmiarze. Bardzo wysokie obrazy mogą przepełnić kafelek.
**Lokalizacja:** `logoCloud.tsx:38–44`.

---

### 4.2 Problemy UX edytora

#### UX-01 — `Colorize on hover` dostępne gdy `Grayscale logos: false` — mylące
**Priorytet:** Wysoki
**Weryfikacja Playwright:** Po wyłączeniu Grayscale switch — Colorize on hover switch pozostaje `checked` i `disabled: null` — nie jest wyłączony ani ukryty.
**Opis:** Hover color effect (usuwanie grayscale przy hover) działa tylko gdy grayscale jest włączony. Bez grayscale switch "Colorize on hover" jest bezużyteczny ale UI nie informuje o tym.
**Lokalizacja:** `LogoCloudEditors.tsx:581–594`.
**Rekomendacja:** Wyłączyć/ukryć switch gdy `grayscale === false` z info-tooltip.

#### UX-02 — Remove logo bez dialogu potwierdzenia
**Priorytet:** Wysoki
**Weryfikacja Playwright:** Kliknięcie Remove → logo usunięte natychmiast, `document.querySelector('[role="dialog"]') === null`.
**Opis:** Natychmiastowe usunięcie bez potwierdzenia. Brak cofnięcia (undo).
**Rekomendacja:** Dodać confirm dialog lub inline "Undo".

#### UX-03 — Wizard: Brak pól Image URL i Link URL
**Priorytet:** Wysoki
**Weryfikacja Playwright:** Wizard eksponuje tylko: Logo cloud layout, Section title, Logo count, Basic logo names — brak Image URL i Link URL.
**Opis:** Bez obrazu widget wyświetla jedynie tekst. Użytkownik kończący Wizard widzi "gotowy" widget, ale na froncie są tylko tekstowe plakietki.
**Rekomendacja:** Dodać pole "Image URL" per logo w Wizard.

#### UX-04 — Brak miniaturki podglądu obrazu w edytorze
**Priorytet:** Średni
**Opis:** Każdy logo item to trzy pola tekstowe bez podglądu. Nie wiadomo czy URL jest poprawny bez sprawdzenia frontu.
**Rekomendacja:** Dodać thumbnail 32×32 px obok pola Image URL.

#### UX-05 — Brak osobnego pola `alt` text per logo
**Priorytet:** Średni
**Opis:** `alt` = automatycznie `name`. Nieinformacyjna wartość `name` (np. "Logo 1") daje nieinformacyjny alt.
**Rekomendacja:** Dodać opcjonalne pole "Alt text" per logo.

#### UX-06 — Brak Image Picker (Media Library)
**Priorytet:** Średni
**Opis:** Pole "Image URL" to prosty input bez Asset Picker.
**Rekomendacja:** Dodać przycisk "Pick image" jak w Hero widget.

#### UX-07 — Advanced duplikuje Logo height / Gap / Alignment z Visual
**Priorytet:** Średni
**Weryfikacja Playwright:** Advanced tab zawiera "Technical layout tokens" z identycznymi Logo height, Gap, Alignment select jak Visual → "Display style".
**Rekomendacja:** Usunąć duplikaty z Advanced lub oznaczyć różnicę semantyczną (CSS class tokens vs display controls).

#### UX-08 — Brak drag-and-drop reorder logotypów
**Priorytet:** Średni
**Opis:** Jedynym sposobem zmiany kolejności jest Move up / Move down. Przy 24 logotypach = 23 kliknięcia by przenieść ostatni na pozycję 1.
**Rekomendacja:** Drag handle (⠿) per logo.

#### UX-09 — Brak opcji `target="_blank"` dla linków logo
**Priorytet:** Średni
**Opis:** Brak toggle "Open in new tab" per logo lub globalnie.
**Rekomendacja:** Dodać switch "Open links in new tab" w Display style.

---

### 4.3 Braki funkcjonalne

#### BF-01 — Brak `eyebrow` w headerze sekcji
**Priorytet:** Wysoki
**Weryfikacja Playwright:** Header copy section zawiera tylko Title + Description — brak pola Eyebrow.
**Opis:** Eyebrow (krótki tekst nad tytułem np. "Our partners", "Trusted by 500+") jest standardowym elementem trust sections. Hero, Feature Grid, CTA Banner, Pricing Plans — wszystkie mają eyebrow.

#### BF-02 — Brak tła sekcji (background color / image)
**Priorytet:** Wysoki
**Opis:** `<section>` ma zawsze przezroczyste tło. Logo Cloud często prezentowany na ciemnym tle. Brak kontrolki `sectionBackground`.

#### BF-03 — Dense variant: 6 kolumn — potencjalny overflow
**Priorytet:** Średni
**Weryfikacja Playwright:** `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4` — przy 24 logotypach tworzy 4 wiersze × 6. Na ekranach ~1280px min-w-[8.5rem] × 6 = ~816px + gap = może ciasno.

#### BF-04 — Strip variant: brak opcji nowrap / scroll
**Priorytet:** Średni
**Weryfikacja Playwright:** Strip = `flex flex-wrap` — logotypy zawijają się bez kontroli nad liczbą per wiersz. Brak opcji single-row z overflow-x-auto.

#### BF-05 — Brak animacji marquee dla Strip
**Priorytet:** Średni
**Opis:** Strip jest statyczny — brak toggle animowanego scrollowania (popularny efekt w logo cloud sekcjach).

#### BF-06 — ~~Brak kontrolek kontenera~~ — kontrolki SĄ w Advanced ✓
**Priorytet:** —
**Status:** Nie dotyczy — Advanced zawiera Padding top/bottom, Margin top/bottom, Container, Visibility per breakpoint (Desktop/Tablet/Mobile). Kontrolki są dostępne.

#### BF-07 — Brak kontrolek typografii nagłówka (align, size)
**Priorytet:** Niski
**Opis:** Nagłówek ma hardcoded `text-center text-2xl font-semibold`. Brak wyrównania i rozmiaru.

#### BF-08 — Brak `borderRadius` i `borderWidth` kafelka
**Priorytet:** Niski
**Opis:** Kafelek ma hardcoded `rounded-lg` i `border` (1px). Brak kontrolek zaokrąglenia i grubości.

#### BF-09 — Brak `headingLevel` dla tytułu sekcji
**Priorytet:** Niski
**Opis:** `<h3>` hardcoded. Powiązane z BUG-02.

#### BF-10 — Brak walidacji URL obrazu i linku
**Priorytet:** Niski
**Opis:** Dowolny tekst przyjmowany jako URL. Błędny URL = broken image bez feedbacku.

#### BF-11 — Brak CTA pod sekcją logo
**Priorytet:** Niski
**Opis:** Brak pola CTA pod listą logotypów.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet | Status |
|---|---------|----------|-----------|--------|
| A1 | `<section>` bez `aria-label` / `aria-labelledby` (null) | WCAG 1.3.1 | Wysoki | Bug |
| A2 | `<h3>` hardcoded — tylko H3 na stronie, brak H1/H2 | WCAG 1.3.1 | Wysoki | Bug |
| A3 | Logo link bez `rel="noopener noreferrer"` (rel=null) | Security | Średni | Bug |
| A4 | Brak opcji `target="_blank"` dla linków zewnętrznych | UX | Średni | BF |
| A5 | `alt` = `name` — może być nieinformacyjny ("Logo 1") | WCAG 1.1.1 | Średni | BF |
| A6 | `hoverColor` bez `grayscale` — niepotrzebna klasa CSS | UX | Niski | UX |
| A7 | `loading="lazy"` na obrazach ✓ (poprawne) | Performance | — | ✓ OK |

---

## 6. Porównanie Admin vs Frontend

| Aspekt | Admin Canvas | Frontend | Zgodność |
|--------|-------------|----------|----------|
| Grid: `grid-cols-2/3/4` | ✓ | ✓ | ✓ Zgodne |
| Strip: `flex flex-wrap` | ✓ | ✓ | ✓ Zgodne |
| Dense: `grid-cols-2/3/6` | ✓ | ✓ | ✓ Zgodne |
| Logo z Image URL → `<img loading="lazy">` | ✓ | ✓ | ✓ Zgodne |
| Logo bez Image URL → tekst `name` | ✓ | ✓ | ✓ Zgodne |
| Logo z `href` → `<a>` | ✓ | ✓ | ✓ Zgodne |
| `rel=null` na `<a>` | ✗ | ✗ | ✓ Zgodne (oba mają bug) |
| `<section>` bez `aria-label` | ✗ | ✗ | ✓ Zgodne (oba mają bug) |
| H3 hardcoded (brak H1/H2) | ✗ | ✗ | ✓ Zgodne (oba mają bug) |
| Grayscale + hoverColor CSS | ✓ | ✓ | ✓ Zgodne |
| Header conditional (ukryty gdy puste) | ✓ | ✓ | ✓ Zgodne |

**Wniosek:** Widget zachowuje się identycznie w admin canvas i na froncie. Wszystkie błędy są symetryczne — brak regresji specyficznych dla jednego środowiska.

---

## 7. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Plik |
|----|------|------|
| BUG-01 | Logo link bez `rel="noopener noreferrer"` | `logoCloud.tsx:307` |
| BUG-02 | H3 hardcoded — hierarchia nagłówków | `logoCloud.tsx:389` |
| BUG-03 | `<section>` bez `aria-label` | `logoCloud.tsx:376` |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Wyłącz "Colorize on hover" gdy grayscale = false |
| UX-02 | Confirm dialog przy Remove logo |
| UX-03 | Wizard: dodać Image URL per logo |
| UX-06 | Image Picker (Media Library) dla Image URL |
| BF-01 | Dodać `eyebrow` w headerze sekcji |
| BF-02 | Tło sekcji (section background color) |

### Braki funkcjonalne (priorytet)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Eyebrow w headerze sekcji |
| BF-02 | Wysoki | Tło sekcji (background) |
| BF-03 | Średni | Dense — sprawdzenie overflow przy max logotypach |
| BF-04 | Średni | Strip — nowrap / single-row scroll opcja |
| BF-05 | Średni | Strip marquee / auto-scroll animacja |
| UX-08 | Średni | Drag-and-drop reorder logotypów |
| UX-09 | Średni | Open links in new tab option |
| BF-07 | Niski | Typografia nagłówka (align/size) |
| BF-08 | Niski | borderRadius/borderWidth kafelka |
| BF-10 | Niski | Walidacja URL obrazu i linku |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 |
| Problemy UX edytora | 9 |
| Braki funkcjonalne | 10 |
| Problemy dostępności | 6 |
| **Łącznie** | **30** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `logo-cloud-01-page-created.png` | Nowa strona TEST-LOGO-CLOUD-0516 w admin |
| `logo-cloud-02-widget-added.png` | Widget Logo Cloud dodany do strony |
| `logo-cloud-03-wizard-editor.png` | Wizard tab — layout, title, count, logo names (bez Image URL) |
| `logo-cloud-04-visual-editor.png` | Visual editor — pełny widok po kliknięciu Continue |
| `logo-cloud-05-grayscale-off-hover-enabled.png` | Grayscale OFF — Colorize on hover nadal ENABLED (UX-01) |
| `logo-cloud-06-image-url-set.png` | Logo 1 z ustawionym Image URL (Amazon logo) |
| `logo-cloud-07-strip-variant.png` | Strip variant w admin canvas |
| `logo-cloud-08-dense-variant.png` | Dense variant w admin canvas |
| `logo-cloud-09-grid-variant.png` | Grid variant w admin canvas |
| `logo-cloud-10-advanced-tab.png` | Advanced tab — tokeny, normalizacja, payload, layout controls |
| `logo-cloud-11-published.png` | Strona opublikowana w admin |
| `logo-cloud-12-frontend-grid.png` | Grid variant — frontend (localhost:3000) z obrazem |
| `logo-cloud-13-frontend-strip.png` | Strip variant — frontend |
| `logo-cloud-14-frontend-dense.png` | Dense variant — frontend |
| `logo-cloud-15-admin-canvas-final.png` | Finalny stan admin canvas (Grid) |
| `logo-cloud-16-frontend-final.png` | Finalny stan frontend (Grid) |

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-06-02`: logo links now resolve through the shared safe-href helper
  and external URLs emit safe `rel="noopener noreferrer"` attributes.
- `TASK-256-06-02`: `hoverColor` is now truthful. When grayscale mode is off,
  the editor locks the toggle with an explicit explanation and runtime no
  longer claims active hover-color behavior.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx
  tests/vitest/widgets/logoCloud.test.tsx
  tests/vitest/widgets/widgetSafeHref.test.ts` passed on 2026-05-17.

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
