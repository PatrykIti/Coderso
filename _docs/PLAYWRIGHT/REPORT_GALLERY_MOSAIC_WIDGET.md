# RAPORT: Gallery Mosaic Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright — Gallery Mosaic Widget
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** TBD (dedykowana strona w sesji)

---

## 1. Przegląd widgetu

**Typ:** Media Gallery
**Moduł:** Content
**Warianty:** `mosaic`, `uniform-grid`, `feature-left`
**Max elementów:** 16 | **Min elementów:** 1

Gallery Mosaic to widget do tworzenia sekcji galerii mediów — zdjęć i filmów. Odpowiada za: układ siatki (kafelkowy, jednolity, featured-left), wyświetlanie obrazów/wideo, podpisy (inside/below/hover), overlay kolorystyczny, proporcje kafelków oraz nagłówek sekcji.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `title`, `description` |
| **Items (1–16)** | `id`, `image` (URL), `video` (URL), `caption`, `href` |
| **Style** | `ratio` (4 opcje), `gap` (4 opcje), `radius` (4 opcje), `overlay` (RGBA), `captionPosition` (3 opcje) |

### 2.2 Warianty layoutu

| Wariant | Opis | Siatka |
|---------|------|--------|
| `mosaic` | Asymetryczny — pierwszy kafelek zajmuje 2×2 | `grid-cols-4` (lg) |
| `uniform-grid` | Jednolite kafelki 3-kolumnowe | `grid-cols-3` (lg) |
| `feature-left` | Duże medium po lewej, kolumna wsparcia po prawej | `grid-cols-3` (lg) |

### 2.3 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Wariant, tytuł sekcji, liczba elementów, media library picker |
| **Visual** | Wariant + liczba, header copy, lista elementów (image/video/caption/href), overlay+caption, ratio/gap/radius |
| **Advanced** | Zduplikowane tokeny stylu (ratio/gap/radius/captionPosition/overlay), normalizacja, JSON snapshot |

---

## 3. Problemy znalezione w kodzie (statyczna analiza)

### 3.1 Błędy logiczne (Code Bugs)

#### CODE-01 — `resolveGalleryMosaicRatio` pomija "4:3" w explicit check
**Plik:** `core/widgets/core/galleryMosaic.tsx:159`
**Opis:** Funkcja sprawdza `"1:1" || "16:9" || "3:4"` — wartość `"4:3"` wpada do `return "4:3"` przez `else`. Działa poprawnie, ale jest nieczytelne i łatwo skopane przy refaktorze. To samo dotyczy `resolveGalleryMosaicGap` (pomija "md") i `resolveGalleryMosaicRadius` (pomija "lg").

#### CODE-02 — Podwójny `lg:row-span-2` w wariancie `mosaic`
**Plik:** `core/widgets/core/galleryMosaic.tsx:493–507`
**Opis:** W wariancie `mosaic`, wrapper `<div>` dla elementu 0 otrzymuje `lg:col-span-2 lg:row-span-2`. Ten sam element przekazuje `featured` prop do `GalleryCard`, który wewnętrznie dodaje kolejne `lg:row-span-2` do `<div>` karty. Zagnieżdżone `row-span-2` wewnątrz `row-span-2` — klasa na karcie jest nadmiarowa i może powodować nieprzewidywalne zachowanie w niektórych konfiguracjach grid.

#### CODE-03 — `featured` prop w `feature-left` — `row-span-2` na elemencie w jednej kolumnie
**Plik:** `core/widgets/core/galleryMosaic.tsx:434–441`
**Opis:** W wariancie `feature-left` lead card dostaje `featured` prop, co dodaje `lg:row-span-2`. Jednak lead jest w kolumnie `lg:col-span-2` bez elementów w tej samej kolumnie poniżej — `row-span-2` nie robi nic użytecznego. Proporcje wyglądają prawidłowo dzięki ratio, ale klasa jest zbędna i myląca.

#### CODE-04 — Brak walidacji minimalnej liczby elementów w `feature-left`
**Plik:** `core/widgets/core/galleryMosaic.tsx:406–407`
**Opis:** W wariancie `feature-left` kod robi `const [lead, ...rest] = items`. Przy jednym elemencie (`rest = []`) prawa kolumna renderuje pusty `<div class="flex flex-col gap-...">`. Wizualnie pojawia się duże puste pole po prawej stronie.

#### CODE-05 — Overlay: picker koloru vs rgba — utrata przezroczystości
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:92–98, 178`
**Opis:** `resolvePickerColor` zwraca `pickerFallback` (`"#0f172a"`) dla wartości rgba, bo nie pasuje do `hexColorPattern`. Picker `<input type="color">` nie obsługuje kanału alpha. Zmiana koloru overlaya przez picker trwale usuwa przezroczystość (`rgba(...)` → `#xxxxxx`). Brak osobnego suwaka opacity.

#### CODE-06 — Oba pola (Image URL + Video URL) widoczne jednocześnie
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:559–598`
**Opis:** W Visual editor każdy element ma widoczne jednocześnie pola "Image URL" i "Video URL". Logika renderera traktuje video jako priorytet nad image. Użytkownik może przypadkowo ustawić oba i nie rozumieć, że video wygrywa. Brak wskaźnika "aktywny typ medium".

#### CODE-07 — `caption` jako alt text obrazu — duplikacja semantyczna
**Plik:** `core/widgets/core/galleryMosaic.tsx:347`
**Opis:** `<img alt={item.caption ?? \`Gallery item ${index + 1}\`}>` — caption (widoczny tekst) jest jednocześnie alt tekstem. Caption jest skróconym opisem wizualnym, alt text powinien opisywać obraz dla czytników ekranowych. Brak osobnego pola `alt` w modelu danych i edytorze.

#### CODE-08 — Wizard MediaPicker akceptuje tylko `image/*`
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:448`
**Opis:** `accept={["image/*"]}` w Wizard MediaPicker wyklucza wybór filmów z biblioteki. Użytkownik musi wejść do Visual editor i ręcznie wpisać URL wideo. Niekonsekwentne — model danych wspiera wideo, wizard nie.

### 3.2 Problemy UX edytora (kod)

#### UX-01 — Duplikacja kontrolek w Visual + Advanced
**Opis:** Sekcje "Technical ratio and layout tokens" w Advanced zawierają identyczne kontrolki (Ratio, Gap, Radius, Caption position, Overlay) jak sekcja "Layout style" w Visual. Zmiana w jednym miejscu wpływa na oba, ale oba wyglądają niezależnie. Użytkownik może być dezorientowany.

#### UX-02 — Brak podglądu miniatury przy edycji elementów
**Opis:** Lista elementów w Visual editor pokazuje tylko pola tekstowe (URL, caption, href). Brak podglądu thumbnailem jakie zdjęcie jest aktualnie przypisane do slotu. Przy 10+ elementach bardzo trudno zidentyfikować, który element to który.

#### UX-03 — "Move up" / "Move down" — brak drag-and-drop
**Opis:** Reorder elementów odbywa się przyciskami "Move up" / "Move down". Przy 16 elementach przestawienie ostatniego na pierwszą pozycję wymaga 15 kliknięć. Brak drag-and-drop.

#### UX-04 — "Add item" jako jedyna droga dodania elementu w Visual
**Opis:** W Visual jest przycisk "Add item" na dole. "Items count" select też działa (zmiana liczby). Dwie drogi zarządzania liczbą elementów mogą dezorientować — select nie usuwa danych elementów, "Remove" tak.

#### UX-05 — Brak wpisu MediaPicker dla elementów w Visual editor
**Opis:** Visual editor pozwala wpisać Image URL ręcznie. Nie ma przycisku "Wybierz z biblioteki" (media picker) przy poszczególnych elementach. Trzeba znać publiczny URL obrazu — nieergonomiczne dla zwykłego użytkownika CMS.

#### UX-06 — Brak informacji o typie medium w nagłówku elementu
**Opis:** Nagłówek każdego elementu to "Item 1", "Item 2" itd. Brak badge/ikony wskazującej czy to obraz czy wideo. Przy wypełnionej galerii niemożliwe odróżnienie typów bez scrollowania.

---

## 4. Wyniki testów Playwright — Admin UI

> *(Sekcja zostanie uzupełniona po testach)*

### 4.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie mosaic / uniform-grid / feature-left | — |
| Badge "Selected" na aktywnym wariancie | — |
| Podgląd canvas aktualizuje się po zmianie wariantu | — |

### 4.2 Wizard

| Test | Wynik |
|------|-------|
| Wybór wariantu przez Select | — |
| Pole Section title | — |
| Select Initial media count | — |
| MediaPicker multi-select | — |
| Przejście do Visual po Continue | — |

### 4.3 Visual editor

| Test | Wynik |
|------|-------|
| Variant cards — zmiana wariantu | — |
| Items count select — zmiana liczby elementów | — |
| Header title/description edit | — |
| Image URL input per item | — |
| Video URL input per item | — |
| Caption input per item | — |
| Link URL input per item | — |
| Move up / Move down buttons | — |
| Remove item (disabled przy 1 elemencie) | — |
| Add item button (disabled przy max) | — |
| Caption position select | — |
| Overlay color — picker | — |
| Overlay color — clear | — |
| Ratio select | — |
| Gap select | — |
| Radius select | — |

### 4.4 Advanced editor

| Test | Wynik |
|------|-------|
| Duplicate controls działają | — |
| Normalize now button | — |
| Reset to defaults button | — |
| Raw payload snapshot | — |

### 4.5 Canvas — podgląd wariantów

| Test | Wynik |
|------|-------|
| Mosaic — lead tile 2×2 | — |
| Mosaic — pozostałe kafelki w siatce | — |
| Uniform-grid — 3 kolumny | — |
| Feature-left — 2-kol. lead + prawa kolumna | — |
| Feature-left z 1 elementem — puste pole | — |
| Hover caption effect | — |
| Below caption — widoczny pod kafelkiem | — |
| Inside caption — overlay na kafelku | — |
| Gap none / sm / md / lg | — |
| Radius none → xl | — |
| Ratio 1:1 / 4:3 / 16:9 / 3:4 | — |

---

## 5. Wyniki testów Playwright — Frontend (localhost:3000)

> *(Sekcja zostanie uzupełniona po testach)*

| Test | Admin | Frontend | Zgodność |
|------|-------|----------|----------|
| Renderowanie mosaic | — | — | — |
| Renderowanie uniform-grid | — | — | — |
| Renderowanie feature-left | — | — | — |
| Hover caption | — | — | — |
| Video autoplay | — | — | — |
| Linki href | — | — | — |

---

## 6. Braki funkcjonalne

### 6.1 Zidentyfikowane z analizy kodu

| ID | Opis | Priorytet |
|----|------|-----------|
| BF-01 | Brak `alt` jako osobnego pola (caption ≠ alt text) | Wysoki |
| BF-02 | Brak MediaPicker dla poszczególnych elementów w Visual editor | Wysoki |
| BF-03 | Wizard MediaPicker nie obsługuje wideo | Wysoki |
| BF-04 | Brak suwaka opacity dla overlaya (picker usuwa alpha) | Wysoki |
| BF-05 | Brak drag-and-drop reorder elementów | Średni |
| BF-06 | Brak podglądu miniaturki przy elemencie w edytorze | Średni |
| BF-07 | Brak toggle "tylko obraz" / "tylko wideo" per element | Średni |
| BF-08 | Brak walidacji przy 1 elemencie w feature-left | Średni |
| BF-09 | Brak opcji lightbox / zoom na kliknięcie | Średni |
| BF-10 | Brak kontroli `object-position` (focus point zdjęcia) | Średni |
| BF-11 | Brak per-item ratio (wszystkie kafelki mają ten sam ratio) | Niski |
| BF-12 | Brak lazy loading / IntersectionObserver kontroli | Niski |
| BF-13 | Brak animacji wejścia (fade, slide) | Niski |
| BF-14 | Brak video poster image field | Niski |
| BF-15 | Brak paginacji / infinite scroll przy 16 elementach | Niski |
| BF-16 | Brak breakpoint per-column (np. 2-kol mobile, 4-kol desktop) | Średni |

---

## 7. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | `caption` jako alt text — duplikacja, brak semantycznej separacji | WCAG 1.1.1 | Wysoki |
| A2 | Brak `rel="noopener noreferrer"` na linkach href w elementach | Bezpieczeństwo | Wysoki |
| A3 | Brak atrybutu `title` na wideo (w HTML `<video>`) | WCAG 1.2 | Średni |
| A4 | Hover-caption niedostępny klawiaturowo / dotykowo | WCAG 2.1 SC 1.4.13 | Wysoki |
| A5 | `<video>` autoplay bez opcji wyłączenia przez użytkownika | WCAG 2.2 SC 2.2.2 | Wysoki |
| A6 | Brak `<figure>` + `<figcaption>` dla semantyki galerii | HTML5 semantics | Średni |
| A7 | `loading="lazy"` brak na `<img>` (jest w kodzie ✓) — OK | — | — |

---

## 8. Podsumowanie wstępne (do uzupełnienia po testach)

| Kategoria | Liczba |
|-----------|--------|
| Błędy w kodzie (Code Bugs) | 8 |
| Problemy UX edytora | 6 |
| Braki funkcjonalne | 16 |
| Problemy dostępności | 5 |
| **Łącznie (wstępnie)** | **35** |

---

## 9. Screenshoty

> *(Do uzupełnienia po testach Playwright)*

---

*Raport w toku — 2026-05-16. Sekcje 4–5 i 9 zostaną uzupełnione po testach Playwright.*
