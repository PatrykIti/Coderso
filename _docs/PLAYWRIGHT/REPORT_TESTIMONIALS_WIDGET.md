# RAPORT: Testimonials Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Testimonials Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `testimonials-audit` (oddzielna od innych agentów)
> **Strona testowa:** TEST-TESTIMONIALS-0516 (`/test-testimonials-0516`)

---

## 1. Przegląd widgetu

**Typ:** Content (standalone, bez slotów)
**Kategoria:** `content`
**Warianty:** `grid`, `spotlight`, `slider-static`
**Ograniczenia elementów:** min 2 / max 24
**Plik renderera:** `core/widgets/core/testimonials.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`

Testimonials widget służy do wyświetlania cytatów klientów z ocenami gwiazdkowymi, danymi autora (imię, rola, avatar, etykieta źródła) oraz sekcją nagłówkową.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `eyebrow`, `title`, `description` |
| **Testimonials** | `id`, `quote`, optional sanitized `quoteHtml`, `author`, `role`, `avatar` (safe URL), `rating` (0–5), `sourceLabel` |
| **CTA** | `enabled`, `label`, `href`, `target`, `style` |
| **Layout / Behavior** | `layout.spotlightItemId`, `behavior.sliderNavigation`, `behavior.ratingDisplay` |
| **Pagination** | `mode`, `pageSize`, `loadMoreLabel` |
| **Style** | `sectionBackground`, `sectionGradient`, `backgroundTone`, `backgroundImage`, `cardSurface`, `cardBorder`, `textColor`, `accentColor`, `spacing`, `headerAlign`, `titleSize`, `cardRadius`, `cardBorderWidth` |

### 2.2 Warianty

| Wariant | Domyślna liczba kart | Opis |
|---------|---------------------|------|
| `grid` | 3 | Siatka 1/2/3 kolumn responsywnie (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) |
| `spotlight` | 2 | Wyróżnienie wybranego testimonialu przez `layout.spotlightItemId` z zachowaniem kart wspierających |
| `slider-static` | 3 | Poziomy pasek z `overflow-x-auto`, `snap-x snap-mandatory`, oraz SSR dot navigation bez JS karuzeli |

### 2.3 Tryby edytora

- **Wizard** — szybki start: wariant (dropdown), `eyebrow`/`title`/`description`, liczba, `quote`, `author`, `role`, `sourceLabel`, `rating`, oraz avatar URL/Media Library per testimonial
- **Visual** — główny edytor produktu: wariant (karty), spotlight pinning, quote/rich quote, avatar/media, header, section surface, colors/contrast, CTA, slider semantics, destrukcyjne zarządzanie listą
- **Advanced** — diagnostyka, import/export i pozostałe niższopoziomowe tokeny display: spacing token, slider/rating display tokens, pagination, normalizacja, import/export, raw payload JSON, padding/margin container, visibility. Bieżąca duplikacja writable spacing/navigation/rating controls między Visual i Advanced pozostaje shared residualem w `TASK-334`.

---

> **Uwaga po TASK-290:** Sekcje 3-7 zachowują historyczne obserwacje z sesji Playwright z `2026-05-16`. Aktualny stan branch-a po wdrożeniu follow-upów opisuje sekcja 8 i aktualna dokumentacja `_docs/_WIDGETS/TESTIMONIALS.md`.

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie Grid / Spotlight / Slider Static (karta-picker) | ✓ Działa |
| Grid: układ `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | ✓ Poprawny |
| Spotlight: pierwsza karta z `lg:col-span-2` + `data-testimonial-highlighted="true"` | ✓ Działa |
| Slider Static: `overflow-x-auto` na kontenerze | ✓ Działa |
| Aktywny wariant oznaczony „Selected", pozostałe „Pick" | ✓ Działa |
| Admin canvas == Frontend rendering dla wszystkich wariantów | ✓ Zgodne |

### 3.2 Zarządzanie listą testimonialów

| Test | Wynik |
|------|-------|
| Add testimonial — dodaje nowy item, count selector aktualizuje się | ✓ Działa |
| Move up / Move down — reorder bez błędów | ✓ Działa |
| Remove — usuwa item bez dialogu potwierdzenia | ✓ Działa (UX-01) |
| Remove disabled gdy tylko 2 testimoniale (minimum) | ✓ Działa |
| Move up disabled dla pierwszego, Move down disabled dla ostatniego | ✓ Działa |

### 3.3 Pola per-testimonial

| Test | Wynik |
|------|-------|
| Quote — textarea, aktualizuje canvas | ✓ Działa |
| Author — input, aktualizuje avatar fallback (inicjał) | ✓ Działa |
| Role — wyświetla pod autorem | ✓ Działa |
| Avatar URL — wstawia obraz zamiast inicjału | ✓ Działa |
| Source label — wyświetla w kolorze accent | ✓ Działa |
| Rating 0–5 — gwiazdki renderują poprawnie (aria-label: "Rating N out of 5") | ✓ Działa |
| Rating 0 — pokazuje 5 szarych gwiazdek (puste) | ✓ Działa (UX-03) |

### 3.4 Header sekcji

| Test | Wynik |
|------|-------|
| Eyebrow widoczny/ukrywany gdy pole puste | ✓ Działa |
| Title widoczny/ukrywany gdy pole puste | ✓ Działa |
| Description widoczny/ukrywany gdy pole puste | ✓ Działa |
| Cały `<header>` usunięty z DOM gdy wszystkie pola puste | ✓ Działa |

### 3.5 Kolory

| Test | Wynik |
|------|-------|
| Card background — color picker + text input działa | ✓ Działa |
| Card border — color picker + text input działa | ✓ Działa |
| Clear dla Card background i Card border | ✓ Działa |
| Accent color — zmiana koloru gwiazdek i source label | ✓ Działa |
| Text color — zmiana koloru tekstu karty | ✓ Działa |

### 3.6 Advanced

| Test | Wynik |
|------|-------|
| Card spacing token (None/Compact/Default/Spacious) | ✓ Działa |
| Normalize list to variant baseline — przywraca domyślną liczbę | ✓ Działa |
| Normalize full payload — normalizuje dane | ✓ Działa |
| Raw payload snapshot (JSON) | ✓ Wyświetla |
| Padding top/bottom container (none/sm/md/xl/2xl) | ✓ Dostępne |
| Margin top/bottom (none) | ✓ Dostępne |
| Desktop/Tablet/Mobile visibility switches | ✓ Działają |

### 3.7 Frontend vs Admin (zgodność)

| Test | Admin | Frontend | Zgodne? |
|------|-------|----------|---------|
| Grid layout | ✓ | ✓ | ✓ |
| Spotlight col-span-2 | ✓ | ✓ | ✓ |
| Slider Static overflow-x | ✓ | ✓ | ✓ |
| Rating gwiazdki | ✓ | ✓ | ✓ |
| Avatar inicjał fallback | ✓ | ✓ | ✓ |
| Header conditional | ✓ | ✓ | ✓ |
| Kolory (border/bg) | ✓ | ✓ | ✓ |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Slider Static: `snap-start` na kartach bez `scroll-snap-type` na kontenerze
**Priorytet:** Wysoki
**Środowisko:** Admin canvas + Frontend (oba)
**Opis:** Karty slidera mają klasę `snap-start` (z Tailwind), ale kontener flex (`overflow-x-auto`) nie posiada `scroll-snap-type`. Oznacza to, że snap points są zdefiniowane na elementach, ale kontener ich nie respektuje — scroll-snap w ogóle nie działa.
**Weryfikacja:** `getComputedStyle(container).scrollSnapType === "none"` — potwierdzone na froncie.
**Lokalizacja:** `core/widgets/core/testimonials.tsx:359` — `listClassName` dla `slider-static` brakuje `snap-x snap-mandatory`.
**Naprawa:** Dodać `snap-x snap-mandatory` do klasy kontenera dla wariantu `slider-static`.

#### BUG-02 — Wizard: Zmiana wariantu nie aktualizuje pola "Testimonials count"
**Priorytet:** Średni
**Opis:** W Wizard, po zmianie wariantu z Grid (domyślnie 3) na Spotlight (domyślnie 2), pole "Testimonials count" nie aktualizuje się automatycznie do domyślnej wartości dla nowego wariantu. Użytkownik konfiguruje Spotlight ale ma 3 testimonialy zamiast 2.
**Lokalizacja:** `TestimonialsEditors.tsx:336–350` — `onVariantChange` tylko zmienia wariant, nie wywołuje `setTestimonialsCount`.

#### BUG-03 — Heading level `<h3>` hardcoded bez H1/H2 context
**Priorytet:** Średni
**Opis:** Tytuł sekcji testimonialów renderuje się jako `<h3>` niezależnie od kontekstu strony. Na stronie testowej brak H1 i H2 — dostępny jest jedynie H3, co narusza hierarchię nagłówków WCAG.
**Weryfikacja:** Frontend — `document.querySelectorAll('h1, h2, h3')` zwraca tylko `["H3: Trusted by teams that ship fast"]`.
**Lokalizacja:** `core/widgets/core/testimonials.tsx:382` — `<h3>` hardcoded.
**Naprawa:** Dodać opcję `headingLevel` (h2/h3/h4) w konfiguracji lub zawsze używać odpowiedniego poziomu.

#### BUG-04 — Brak `aria-label` na sekcji i kartach `<article>`
**Priorytet:** Średni
**Opis:** Element `<section>` (wrapper testimonialów) nie posiada `aria-label` ani `aria-labelledby`. Elementy `<article>` (karty) też nie mają `aria-label`. Screen reader nie identyfikuje regionu ani poszczególnych testimonialów.
**Weryfikacja:** `section.getAttribute('aria-label') === null` — potwierdzone.

---

### 4.2 Problemy UX edytora

#### UX-01 — Remove testimonial bez dialogu potwierdzenia
**Opis:** Kliknięcie "Remove" natychmiast usuwa testimonial bez żadnego dialogu potwierdzenia. Brak opcji cofnięcia.
**Ryzyko:** Przypadkowe usunięcie testimonialów z wypełnioną treścią.
**Rekomendacja:** Dodać confirm dialog: *"Usunąć testimonial X? Akcja jest nieodwracalna."*

#### UX-02 — Inconsistency: Card background/border mają Clear, ale Text color i Accent color nie
**Opis:** W sekcji "Colors and emphasis" kontrolki `Card background` i `Card border` mają przycisk "Clear" (`ClearableFieldHeader`), ale `Text color` i `Accent color` go nie mają — mimo podobnej struktury i semantyki. Użytkownik nie może "wyczyścić" tych kolorów do wartości domyślnych.
**Lokalizacja:** `TestimonialsEditors.tsx:659–674` — `ColorField` dla `textColor` i `accentColor` bez `onClear`.

#### UX-03 — Rating 0 wyświetla 5 szarych gwiazdek (niejasne znaczenie)
**Opis:** Ustawienie oceny 0/5 renderuje 5 pustych gwiazdek zamiast ukrycia sekcji ocen. Dla odwiedzającego witrynę wygląda to jak "0 gwiazdek" — negatywna ocena — zamiast "ocena nieznana/brak oceny".
**Rekomendacja:** Przy rating = 0 ukrywać gwiazdki lub wyświetlać inny placeholder (np. "Brak oceny").

#### UX-04 — Wizard: Brak pól Rating, Role, Avatar, Source label
**Opis:** Wizard ekspozuje tylko Quote + Author dla każdego testimonial. Użytkownik konfigurujący przez Wizard od razu traci dane (Rating defaultuje do 5, ale rola/avatar/sourceLabel pozostają puste).
**Rekomendacja:** Dodać przynajmniej pole Rating w Wizard (jest kluczowe dla social proof). Rola i source label mogą pozostać w Visual.

#### UX-05 — Wizard: Brak pola "Eyebrow" i "Description" sekcji
**Opis:** Wizard pozwala edytować tylko tytuł sekcji. Eyebrow i description sekcji dostępne są tylko w zakładce Visual. Eyebrow jest ważnym elementem spójności wizualnej (często zawiera np. "Customer stories").

#### UX-06 — Brak Avatar URL picker z Media Library
**Opis:** Pole "Avatar URL" to prosty input tekstowy wymagający wklejenia URL. Brak przycisku "Pick from library" (jak w Hero widget). Użytkownik musi znać URL zewnętrzny lub ręcznie kopiować ścieżki do assetów.
**Rekomendacja:** Dodać przycisk "Pick image" otwierający Asset Picker filtrowany po `image/*`.

#### UX-07 — Brak walidacji formatu URL avatara
**Opis:** Pole Avatar URL akceptuje dowolny tekst. Wpisanie niepoprawnego URL skutkuje czarnym kwadratem zamiast inicjału (przeglądarka nie ładuje obrazu). Nie ma inline walidacji ani feedbacku o błędnym URL.

#### UX-08 — Spacing token zduplikowany w Visual i Advanced
**Opis:** Kontrolka "Card spacing" pojawia się zarówno w zakładce Visual (sekcja "Variant and layout structure") jak i w Advanced (sekcja "Display tokens"). Duplikacja bez wyjaśnienia różnicy może mylić użytkownika.
**Rekomendacja:** Usunąć z Advanced albo oznaczyć "zaawansowaną" kontrolkę jako "Spacing token (CSS class)".

---

### 4.3 Braki funkcjonalne

#### BF-01 — Slider Static bez nawigacji (strzałki / dots / autoplay)
**Priorytet:** Wysoki
**Opis:** Wariant `slider-static` to jedynie `overflow-x-auto` — brak przycisków poprzedni/następny, brak dot indicators, brak autoplay, brak swipe touch. Nazwa "Slider" sugeruje interaktywność. Scrollbar jest jedynym sposobem nawigacji.
**Naprawa 1:** Naprawić scroll-snap (BUG-01) by przynajmniej snap działał.
**Naprawa 2:** Zmienić nazwę na "Horizontal Scroll" jeśli nawigacja nie jest planowana.
**Naprawa 3:** Dodać przyciski Prev/Next nad lub pod listą.

#### BF-02 — Brak tła sekcji (background color / gradient / image)
**Priorytet:** Wysoki
**Opis:** Widget nie ma żadnej kontrolki tła sekcji. Wrapper `<section>` ma jedynie `px-4 py-8` i zawsze przezroczyste tło. Testimonials często są prezentowane na kontrastowym tle (np. ciemne tło + jasne karty jako sekcja "social proof").

#### BF-03 — Brak kontrolek typografii nagłówka (align / rozmiar)
**Priorytet:** Średni
**Opis:** Nagłówek sekcji ma hardcoded `text-center` i stały rozmiar (`text-2xl font-semibold`). Brak opcji wyrównania (left/center/right) ani rozmiaru tytułu (np. xl / 2xl / 3xl).

#### BF-04 — Spotlight: brak możliwości wyboru wyróżnionego testimonialnego
**Priorytet:** Średni
**Opis:** W wariancie `spotlight` zawsze `index === 0` (pierwszy element) jest wyróżniony (`col-span-2`). Nie ma opcji zmiany który element jest "spotlight" — jedynym sposobem jest użycie "Move up". Nie jest to oczywiste.
**Rekomendacja:** Dodać checkbox "Pin as spotlight" per-testimonial lub przycisk "Set as spotlight".

#### BF-05 — Brak atrybutu `loading="lazy"` na avatarach
**Priorytet:** Średni
**Opis:** Komponent `Avatar` renderuje `<img>` z `loading="auto"` (wartość domyślna). Przy wielu testimonialach below-the-fold wszystkie avatary ładują się natychmiast. Wpływ na czas ładowania strony.
**Lokalizacja:** `core/widgets/core/testimonials.tsx:316`.

#### BF-06 — Brak walidacji kontrastu kolorów (WCAG)
**Priorytet:** Średni
**Opis:** Użytkownik może ustawić `textColor` identyczny z `cardSurface`, czyniąc tekst niewidocznym. Brak wskaźnika kontrastu (4.5:1 WCAG AA).

#### BF-07 — Brak CTA pod sekcją testimonialów
**Priorytet:** Niski
**Opis:** Sekcja testimonialów często zawiera CTA pod listą kart (np. "Zobacz wszystkie opinie" lub "Rozpocznij teraz"). Widget nie ma pola CTA.

#### BF-08 — Brak kontrolek `borderRadius` i `borderWidth` karty
**Priorytet:** Niski
**Opis:** Karta ma hardcoded `rounded-xl` (border-radius) i `1px` border. Brak opcji zmiany zaokrąglenia ani grubości obramowania.

#### BF-09 — Limit 8 testimonialów bez paginacji
**Priorytet:** Niski
**Opis:** `testimonialsItemMax = 8`. Po osiągnięciu limitu "Add testimonial" jest wyłączony. Brak paginacji, "load more" ani stronicowania dla większych zestawów.

#### BF-10 — Brak eksportu/importu testimonialów
**Priorytet:** Niski
**Opis:** Brak możliwości eksportu listy do CSV/JSON ani importu z zewnętrznych źródeł (Trustpilot, Google Reviews, Clutch).

#### BF-11 — Brak rich text dla pola `quote`
**Priorytet:** Niski
**Opis:** Cytat to plain text — brak możliwości pogrubień, kursywy, linków wewnątrz cytatu.

#### BF-12 — Brak opcji `headingLevel` dla tytułu sekcji
**Priorytet:** Niski
**Opis:** Tytuł sekcji hardcodes `<h3>`. Brak opcji zmiany poziomu nagłówka (H2/H3/H4) zależnie od kontekstu strony.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet | Status |
|---|---------|----------|-----------|--------|
| A1 | Sekcja `<section>` bez `aria-label` ani `aria-labelledby` | WCAG 1.3.1 | Wysoki | Bug |
| A2 | Elementy `<article>` (karty) bez `aria-label` | WCAG 4.1.2 | Średni | Bug |
| A3 | H3 hardcoded bez H1/H2 — zaburzona hierarchia nagłówków | WCAG 1.3.1 | Wysoki | Bug |
| A4 | `loading="lazy"` brak na avatarach | Performance | Średni | BF |
| A5 | `alt` avatara = samo imię (bez kontekstu roli img) | WCAG 1.1.1 | Niski | Brak |
| A6 | Rating 0/5 renderuje 5 szarych gwiazdek — niejasne znaczenie | UX | Niski | UX |
| A7 | Brak walidatora kontrastu kolorów | WCAG 1.4.3 | Średni | BF |
| A8 | Rating gwiazdki — `aria-label="Rating N out of 5"` poprawne | WCAG 1.1.1 | — | ✓ OK |

---

## 6. Porównanie Admin vs Frontend

| Aspekt | Admin Canvas | Frontend | Zgodność |
|--------|-------------|----------|----------|
| Grid layout (1/2/3 cols) | ✓ | ✓ | ✓ Zgodne |
| Spotlight col-span-2 | ✓ | ✓ | ✓ Zgodne |
| Slider overflow-x | ✓ | ✓ | ✓ Zgodne |
| Scroll-snap działa | ✗ (brak snap-type) | ✗ (brak snap-type) | ✓ Zgodne (oba mają bug) |
| Rating gwiazdki | ✓ | ✓ | ✓ Zgodne |
| Avatar img loading | auto | auto | ✓ Zgodne (oba brak lazy) |
| Card colors | ✓ | ✓ | ✓ Zgodne |
| Header conditional | ✓ | ✓ | ✓ Zgodne |
| H3 hierarchia | ✗ | ✗ | ✓ Zgodne (oba mają problem) |

**Wniosek:** Widget zachowuje się identycznie w admin canvas i na froncie. Wszystkie problemy są symetryczne — brak błędów specyficznych dla jednego środowiska.

---

## 7. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Plik |
|----|------|------|
| BUG-01 | Brak `scroll-snap-type` na kontenerze Slider Static | `testimonials.tsx:359` |
| BUG-03 | H3 hardcoded — zaburzona hierarchia nagłówków | `testimonials.tsx:382` |
| BUG-04 | Brak `aria-label` na `<section>` i `<article>` | `testimonials.tsx` |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Confirm dialog przy Remove testimonial |
| UX-02 | Dodać Clear dla textColor i accentColor |
| UX-06 | Avatar URL → Media Library picker |
| UX-03 | Rating 0 → ukryć gwiazdki lub zmienić semantykę |
| BUG-02 | Wizard: zmiana wariantu → auto-update count |

### Braki funkcjonalne (priorytet)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Slider Static — nawigacja / scroll-snap / przemianowanie |
| BF-02 | Wysoki | Tło sekcji (color/gradient) |
| BF-03 | Średni | Typografia nagłówka (align/size) |
| BF-04 | Średni | Spotlight — wybór wyróżnionego elementu |
| BF-05 | Średni | `loading="lazy"` na avatarach |
| BF-06 | Średni | Walidator kontrastu WCAG |
| BF-12 | Niski | Heading level konfigurowalny |
| BF-07 | Niski | CTA pod sekcją |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 4 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 12 |
| Problemy dostępności | 7 |
| **Łącznie** | **31** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `testimonials-01-wizard-tab.png` | Wizard tab — struktura (tylko Quote + Author) |
| `testimonials-02-visual-editor.png` | Visual editor — pełny widok |
| `testimonials-03-minimum-2-items.png` | Remove disabled przy minimum 2 testimoniałach |
| `testimonials-04-slider-static-variant.png` | Slider Static wariant wybrany |
| `testimonials-05-advanced-tab.png` | Advanced tab — spacing token + normalizacja |
| `testimonials-06-canvas-preview.png` | Canvas — podgląd widgetu |
| `testimonials-07-spotlight-selected.png` | Spotlight wariant wybrany |
| `testimonials-08-slider-canvas.png` | Slider Static w canvas |
| `testimonials-09-spotlight-canvas.png` | Spotlight — podgląd canvas |
| `testimonials-10-avatar-with-image.png` | Avatar z zewnętrznym obrazem |
| `testimonials-11-grid-canvas.png` | Grid variant w canvas |
| `testimonials-12-custom-accent-color.png` | Zmiana accent color (rose) |
| `testimonials-13-no-header.png` | Widget bez nagłówka (wszystkie pola puste) |
| `testimonials-14-page-published.png` | Strona opublikowana w admin |
| `testimonials-15-frontend-grid.png` | Grid variant — frontend (localhost:3000) |
| `testimonials-16-frontend-spotlight.png` | Spotlight — frontend |
| `testimonials-17-frontend-slider-static.png` | Slider Static — frontend |
| `testimonials-18-rating-zero.png` | Rating 0 — 5 szarych gwiazdek |
| `testimonials-19-advanced-tab.png` | Advanced tab — padding/visibility |
| `testimonials-20-wizard-tab-full.png` | Wizard — pełny widok |
| `testimonials-21-colors-section.png` | Sekcja kolorów — Visual editor |

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-06-03`: current Testimonials editor/runtime lanes are green on
  `tests/vitest/ui/testimonials-editor-wave.test.tsx` and
  `tests/vitest/widgets/testimonials.test.tsx`.
- Follow-up shared-contract repairs after the first closure commit now keep the
  `slider-static` variant on a truthful scroll-snap container, synchronize
  variant-owned testimonial counts when the editor owns variant changes, expose
  `Clear` for `textColor` and `accentColor`, lazy-load avatar images, and add
  section/card labelling for the current accessibility baseline.
- Current TASK-256 shared scope stays limited to truthful shared behavior and
  accessibility baselines; richer testimonials product work continues to route
  through the `TASK-290` family.

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*

## 8. Status po TASK-290 (2026-05-22)

| ID | Finalny owner / status | Evidence |
|---|---|---|
| BUG-01 | Shared `TASK-256` owner, fixed in current branch | `core/widgets/core/testimonials.tsx` now keeps `slider-static` with `snap-x snap-mandatory`; covered by `tests/vitest/widgets/testimonials.test.tsx` and `tests/vitest/widgets/renderer.test.tsx`. |
| BUG-02 | Shared `TASK-256` owner, fixed in current branch | Wizard and Visual variant changes still patch the synced count baseline; regression covered in `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |
| BUG-03 | Shared `TASK-256` owner, excluded from TASK-290 | TASK-290 added typography controls only; heading hierarchy ownership remains outside this family by design. |
| BUG-04 | Shared `TASK-256` owner, fixed in current branch | Runtime section/article labels remain present and are still covered by `tests/vitest/widgets/testimonials.test.tsx`. |
| UX-01 | Fixed by `TASK-290-02` | Visual now uses `ConfirmActionDialog` before destructive removal; covered by `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |
| UX-02 | Shared `TASK-256` owner, fixed in current branch | Shared clear-to-default color semantics remain active for text/accent colors. |
| UX-03 | Fixed by `TASK-290-04` | `behavior.ratingDisplay` now supports `hide-empty`, `label-empty`, and `stars`; covered by `tests/vitest/widgets/testimonials.test.tsx` plus editor coverage. |
| UX-04 | Fixed by `TASK-290-01` and `TASK-290-03` | Wizard now authors role/source/rating plus avatar URL/Media Library selection; covered by `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |
| UX-05 | Fixed by `TASK-290-01` | Wizard now owns `eyebrow`, `title`, and `description`; covered by `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |
| UX-06 | Fixed by `TASK-290-03` | Avatar authoring now supports Media Library selection while persisting only the resolved public URL; covered by `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |
| UX-07 | Fixed by `TASK-290-03` | Invalid avatar URLs now surface inline feedback and fail closed at runtime; covered by widget and editor Vitest suites. |
| UX-08 | Shared `TASK-334` residual, excluded from TASK-290 | Visual and Advanced still duplicate writable spacing and display controls; the reopened shared mode-ownership task now owns the cleanup. |
| BF-01 | Fixed by `TASK-290-04` on top of shared slider baseline | `slider-static` now keeps truthful SSR dot navigation without introducing client-side carousel JS; covered by `tests/vitest/widgets/testimonials.test.tsx`. |
| BF-02 | Fixed by `TASK-290-05` | Widget now owns bounded section background color/gradient/image controls; covered by widget and editor Vitest suites. |
| BF-03 | Fixed by `TASK-290-05` | Header alignment and title-size controls now exist as bounded Testimonials-owned tokens. |
| BF-04 | Fixed by `TASK-290-02` | Spotlight now uses explicit `layout.spotlightItemId` instead of implicit first-item ordering; covered by widget and editor Vitest suites. |
| BF-05 | Shared `TASK-335` residual, excluded from TASK-290 | Avatar runtime still keeps `loading="lazy"`, but contextual alt naming remains a shared media accessibility residual. |
| BF-06 | Fixed by `TASK-290-05` | Visual now shows non-blocking contrast advisories for text/card and accent/card combinations. |
| BF-07 | Fixed by `TASK-290-06` | Testimonials now support an optional safe CTA below the list with target/style tokens; covered by `tests/vitest/widgets/testimonials.test.tsx` and editor coverage. |
| BF-08 | Fixed by `TASK-290-05` | Card radius and border-width are now bounded widget-owned controls with runtime markers and tests. |
| BF-09 | Fixed by `TASK-290-07` | Local cap is now 24 with owned SSR `load-more` pagination; covered by `tests/vitest/widgets/testimonials.test.tsx` and editor import/export coverage. |
| BF-10 | Fixed by `TASK-290-07` for local workflow; external providers remain out of scope | Widget now supports safe local JSON/CSV import-export; external review-provider sync still requires a separate security-reviewed task. |
| BF-11 | Fixed by `TASK-290-06` | Testimonials now support bounded sanitized `quoteHtml` with plain-text fallback; covered by `tests/vitest/widgets/testimonials.test.tsx`. |
| BF-12 | Shared `TASK-256` owner, excluded from TASK-290 | `headingLevel` remains shared hierarchy work, not a Testimonials-local closure item. |
| A1 / A2 | Shared `TASK-256` owner, fixed in current branch | Region/article accessible names remain present in the current runtime output. |
| A3 | Shared `TASK-256` owner, excluded from TASK-290 | TASK-290 did not claim heading hierarchy repair. |
| A4 / A5 | Shared `TASK-335` residual, excluded from TASK-290 | Lazy-loading remains present, but contextual avatar alt naming is still owned by the reopened shared media accessibility task. |
| A6 | Fixed by `TASK-290-04` | Rating-zero semantics now have an explicit hidden-or-labeled contract. |
| A7 | Fixed by `TASK-290-05` | Contrast warnings now surface locally in the Visual editor. |
| A8 | No action, preserved | Non-zero rating `aria-label` behavior remains intact in the shipped runtime output. |

### Walidacja końcowa

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/testimonials.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/renderer.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx`
- Additional validator, registry, gates, security-scan, precommit, and `git diff --check` evidence is recorded in `TASK-290-08` after the final branch validation pass.
