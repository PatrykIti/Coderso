# RAPORT: Gallery Mosaic Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright — Gallery Mosaic Widget
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** GALLERY-MOSAIC-TEST-0516 (`/gallery-mosaic-test-0516`)
> **Page ID:** `a097da80-3d15-4b0a-8413-fac910b876e3`

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
| **Advanced** | Zduplikowane tokeny stylu (ratio/gap/radius/captionPosition/overlay), normalizacja, JSON snapshot, układ kontenera, widoczność |

---

## 3. Błędy znalezione w kodzie (statyczna analiza + potwierdzone testami)

### 3.1 Błędy logiczne (Code Bugs)

#### CODE-01 — `resolveGalleryMosaicRatio` pomija "4:3" w explicit check
**Plik:** `core/widgets/core/galleryMosaic.tsx:159`
**Status:** Potencjalny problem przy refaktorze
**Opis:** Funkcja sprawdza `"1:1" || "16:9" || "3:4"` — wartość `"4:3"` wpada do `return "4:3"` przez `else`. Działa poprawnie, ale jest nieczytelne. To samo dotyczy `resolveGalleryMosaicGap` (pomija "md", linia 164) i `resolveGalleryMosaicRadius` (pomija "lg", linia 169).

#### CODE-02 — Podwójny `lg:row-span-2` w wariancie `mosaic` ✓ POTWIERDZONE
**Plik:** `core/widgets/core/galleryMosaic.tsx:493–507`
**Status:** Nadmiarowa klasa CSS
**Opis:** W wariancie `mosaic`, wrapper `<div>` elementu 0 ma `lg:col-span-2 lg:row-span-2`. Ten sam element otrzymuje `featured` prop, który dodaje kolejne `lg:row-span-2` bezpośrednio do `<div>` karty. Potwierdzone przez eval DOM: `item1.parentElement.parentElement.className = "lg:col-span-2 lg:row-span-2"` + `item1.className zawiera "lg:row-span-2"`. Klasa na karcie jest redundantna.

#### CODE-03 — `featured` prop w `feature-left` — `row-span-2` na elemencie w jednej kolumnie
**Plik:** `core/widgets/core/galleryMosaic.tsx:434–441`
**Status:** Zbędna klasa CSS
**Opis:** Lead card w `feature-left` dostaje `featured` → `lg:row-span-2`, ale jest w jednej kolumnie — klasa nie ma efektu. Proporcje działają dzięki ratio, ale jest myląca.

#### CODE-04 — Pusta prawa kolumna w `feature-left` z 1 elementem ✓ POTWIERDZONE
**Plik:** `core/widgets/core/galleryMosaic.tsx:406–407`
**Status:** Bug wizualny
**Opis:** W wariancie `feature-left` kod wykonuje `const [lead, ...rest] = items`. Przy 1 elemencie `rest = []` → prawa kolumna renderuje pusty `<div class="flex flex-col gap-4"></div>`. Potwierdzone Playwright: `innerHTML` zawiera `<div class="flex flex-col gap-4"></div>` bez zawartości.

#### CODE-05 — Overlay: picker koloru vs rgba — utrata przezroczystości ✓ POTWIERDZONE
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:92–98, 178`
**Status:** Bug edytora
**Opis:** `resolvePickerColor` zwraca fallback `"#0f172a"` gdy wartość to `rgba(...)` (nie pasuje do `hexColorPattern`). Picker `<input type="color">` nie obsługuje kanału alpha. Zmiana koloru przez picker usuwa przezroczystość. Potwierdzone: wartość `rgba(0, 100, 200, 0.6)` → picker nadal pokazuje `#0f172a`. Brak suwaka opacity.

#### CODE-06 — Oba pola (Image URL + Video URL) widoczne jednocześnie ✓ POTWIERDZONE
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:559–598`
**Status:** UX problem edytora
**Opis:** Visual editor pokazuje jednocześnie pola "Image URL" i "Video URL" dla każdego elementu. Renderer traktuje video jako priorytet. Potwierdzone: dodanie video URL przy istniejącym image URL → element przełącza się na `data-gallery-media-type="video"`. Użytkownik nie dostaje wskaźnika który typ jest aktywny.

#### CODE-07 — `caption` jako alt text obrazu — duplikacja semantyczna ✓ POTWIERDZONE
**Plik:** `core/widgets/core/galleryMosaic.tsx:347`
**Status:** Błąd dostępności
**Opis:** `<img alt={item.caption ?? \`Gallery item ${index + 1}\`}>` — visible caption jest jednocześnie alt tekstem. Caption i alt text mają różną semantykę. Brak osobnego pola `alt` w modelu danych i edytorze.

#### CODE-08 — Wizard MediaPicker akceptuje tylko `image/*` ✓ POTWIERDZONE
**Plik:** `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx:448`
**Status:** Niekompletna funkcjonalność
**Opis:** Wizard MediaPicker ma `accept={["image/*"]}` i wyświetla "Allowed: image/*". Model danych obsługuje wideo (`video` pole), ale Wizard nie umożliwia ich wyboru z biblioteki. Potwierdzone Playwright: dialog pokazuje `Allowed: image/*`.

---

## 4. Wyniki testów Playwright — Admin UI

### 4.1 Warianty

| Test | Wynik | Uwagi |
|------|-------|-------|
| Przełączanie mosaic / uniform-grid / feature-left | ✓ Działa | Canvas aktualizuje się natychmiast |
| Badge "Selected" na aktywnym wariancie | ✓ Działa | Poprawnie pokazuje "Selected" / "Pick" |
| Canvas aktualizuje się po zmianie wariantu | ✓ Działa | `data-gallery-mosaic-variant` w DOM aktualizuje się |
| Feature-left z 1 elementem — pusta prawa kolumna | ✗ Bug | `<div class="flex flex-col gap-4"></div>` bez zawartości |

### 4.2 Wizard editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Wybór wariantu przez Select (Mosaic/Uniform Grid/Feature Left) | ✓ Działa | Variant aktualizuje się natychmiast |
| Pole Section title | ✓ Działa | Placeholder "Gallery highlights" |
| Select Initial media count (1–16) | ✓ Działa | Wszystkie 16 opcji dostępne |
| MediaPicker — Browse media button | ✗ Bug | Dialog pokazuje "Not authenticated" — 401 /api/media |
| "Allowed: image/*" — tylko obrazy | ✓ Potwierdzone | Brak obsługi wideo w Wizard |
| Continue to layout and styling | ✓ Działa | Przechodzi do Visual tab |

### 4.3 Visual editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant cards — zmiana wariantu | ✓ Działa | Wszystkie 3 warianty |
| Items count select — zmiana liczby elementów | ✓ Działa | 1–16 elementów |
| Header title edit | ✓ Działa | Live update w canvas |
| Header description edit | ✓ Działa | Live update w canvas |
| Image URL input per item | ✓ Działa | Live update w canvas |
| Video URL input per item | ✓ Działa | Priorytet nad image URL |
| Oba URL widoczne jednocześnie (CODE-06) | ✓ Potwierdzone | Brak wskaźnika aktywnego typu |
| Caption input per item | ✓ Działa | |
| Link URL input per item | ✓ Działa | |
| Move up (disabled dla item 1) | ✓ Działa | Poprawnie disabled |
| Move down (disabled dla ostatniego) | ✓ Działa | Poprawnie disabled |
| Remove item (disabled gdy 1 element) | ✓ Działa | |
| Add item (disabled przy max 16) | ✓ Działa | |
| Caption position: Inside tile | ✓ Działa | Overlay na kafelku |
| Caption position: Below tile | ✓ Działa | `<p class="mt-2 text-xs...">` pod kafelkiem |
| Caption position: On hover | ✓ Działa | `opacity-0 group-hover:opacity-100` |
| Overlay color — text input (rgba) | ✓ Działa | Aktualizuje canvas w czasie rzeczywistym |
| Overlay color — color picker (hex) | ✗ Bug | Pokazuje stały fallback `#0f172a` zamiast aktualnego koloru |
| Overlay color — Clear button | ✓ Działa | Kasuje overlay, przycisk staje się disabled |
| Ratio: 1:1 / 4:3 / 16:9 / 3:4 | ✓ Działa | Wszystkie 4 opcje, canvas aktualizuje się |
| Gap: None / Compact / Default / Spacious | ✓ Działa | |
| Radius: None / Medium / Large / Extra large | ✓ Działa | |
| Brak MediaPicker przy elementach | ✓ Potwierdzone | Tylko ręczny URL input |
| Linki bez rel="noopener noreferrer" | ✗ Bug | `rel=""` i `target=""` w DOM |

### 4.4 Advanced editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Kontrolki zduplikowane z Visual (Ratio/Gap/Radius/Caption/Overlay) | ✓ Potwierdzone | UX-01 potwierdzony |
| Normalize now button | ✓ Działa | Normalizuje dane |
| Reset to defaults button | ✓ Działa | Przywraca 5 domyślnych elementów z obrazkami |
| Raw payload snapshot | ✓ Działa | Aktualny JSON z danymi widgetu |
| Dodatkowa sekcja Layout (Container/Padding/Margin) | ✓ Dostępna | Nie jest w Visual editor |
| Visibility toggles (Desktop/Tablet/Mobile) | ✓ Działa | |

### 4.5 Zapis strony

| Test | Wynik | Uwagi |
|------|-------|-------|
| Publish button | ✗ Bug | "Page error: Not authenticated" (HTTP 401) |
| Save Draft button | ✗ Bug | HTTP 401 na `/api/pages/{id}` |

---

## 5. Wyniki testów Frontend (localhost:3000)

**STATUS: Nieterminalny — Brak możliwości przetestowania**

Strona testowa `GALLERY-MOSAIC-TEST-0516` nie mogła zostać zapisana z powodu błędów autoryzacji HTTP 401 na endpointach API (`/api/pages/{id}` i `/api/pages/{id}/publish`). To jest znany, systemowy problem z sesją API — identyczny jak opisany w raporcie Hero Widget (BUG-03).

**Efekt:** Strona nie istnieje na frontendzie (`/gallery-mosaic-test-0516` → 404). Żadna z istniejących opublikowanych stron frontendowych nie zawiera widgetu Gallery Mosaic.

**Przypuszczalna przyczyna:** Sesja użytkownika w przeglądarce admin (cookie JWT lub session token) nie jest przekazywana poprawnie do API przy operacjach zapisu — może problem z CSRF, expired token, lub SameSite cookie policy w kontekście dev.

| Test | Admin preview | Frontend | Zgodność |
|------|--------------|----------|----------|
| Renderowanie mosaic | ✓ Działa | ✗ Nie testowane | — |
| Renderowanie uniform-grid | ✓ Działa | ✗ Nie testowane | — |
| Renderowanie feature-left | ✓ Działa | ✗ Nie testowane | — |
| Hover caption | ✓ CSS działa | ✗ Nie testowane | — |
| Video autoplay/loop | ✓ Widoczne w canvas | ✗ Nie testowane | — |
| Linki href | ✓ Działają | ✗ Nie testowane | — |
| Responsywność | ✓ Breakpointy w CSS | ✗ Nie testowane | — |

---

## 6. Znalezione błędy i problemy UX

### 6.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — MediaPicker "Not authenticated" w Wizard
**Priorytet:** Wysoki
**Opis:** Kliknięcie "Browse media" w Wizard editor otwiera dialog biblioteki mediów, ale wyświetla "Not authenticated" zamiast listy plików. API `/api/media` zwraca HTTP 401.
**Lokalizacja:** Wizard → Media library → Browse media

#### BUG-02 — Publish/Save Draft — "Not authenticated" (HTTP 401)
**Priorytet:** Wysoki
**Opis:** Próba opublikowania lub zapisania strony z widgetem Gallery Mosaic kończy się błędem "Page error: Not authenticated". API zwraca 401 na endpointach zapisu.
**Lokalizacja:** Toolbar → Publish / Save draft
**Uwaga:** Ten sam problem systemowy jak w Hero Widget BUG-03.

#### BUG-03 — Overlay color picker nie synchronizuje się z rgba
**Priorytet:** Wysoki
**Opis:** Picker `<input type="color">` wyświetla stały fallback `#0f172a` zamiast aktualnego koloru. Gdy wartość overlaya jest w formacie `rgba(...)`, picker nie jest w stanie jej wyświetlić (tylko hex). Zmiana koloru przez picker usuwa przezroczystość (alpha).
**Lokalizacja:** Visual editor → Overlay and caption controls → Overlay color (picker)

#### BUG-04 — Pusta prawa kolumna w feature-left z 1 elementem
**Priorytet:** Wysoki
**Opis:** Ustawienie Items count = 1 w wariancie feature-left generuje pustą prawą kolumnę z czystym `<div class="flex flex-col gap-4"></div>`. Wizualnie — duże puste pole po prawej stronie.
**Lokalizacja:** Visual editor → Feature Left variant → Items count = 1

#### BUG-05 — Linki bez `rel="noopener noreferrer"`
**Priorytet:** Wysoki
**Opis:** Elementy galerii z wypełnionym polem href generują `<a href="...">` bez atrybutu `rel`. Dla zewnętrznych URL to luka bezpieczeństwa (reverse tabnapping).
**Plik:** `core/widgets/core/galleryMosaic.tsx:373–379`
**Potwierdzone:** DOM eval → `{rel: "", target: ""}` dla wszystkich linków.

---

### 6.2 Problemy UX edytora

#### UX-01 — Duplikacja kontrolek Visual i Advanced ✓ POTWIERDZONE
**Opis:** Sekcja "Technical ratio and layout tokens" w Advanced duplikuje Ratio, Gap, Radius, Caption position, Overlay z Visual editor "Layout style". Kontrolki są zsynchronizowane (ta sama wartość), ale ich obecność w obu miejscach dezorientuje użytkownika.

#### UX-02 — Brak podglądu miniatury przy edycji elementów
**Opis:** Lista elementów w Visual editor pokazuje tylko pola tekstowe. Brak thumbnail preview przy każdym elemencie. Przy 10–16 elementach niemożliwe wizualne zidentyfikowanie który element to który bez scrollowania do canvas.

#### UX-03 — "Move up" / "Move down" zamiast drag-and-drop
**Opis:** Przestawianie kolejności elementów przez przyciski. Przy 16 elementach zmiana ostatniego na pierwsze = 15 kliknięć. Brak drag-and-drop.

#### UX-04 — Dwa równoległe mechanizmy zmiany liczby elementów
**Opis:** "Items count" select (automatyczna normalizacja) i "Add item" + "Remove" (manualne zarządzanie). "Items count" nie usuwa danych — podnosi lub dodaje placeholder. "Remove" usuwa konkretny element z danymi. Różnica niewidoczna dla użytkownika.

#### UX-05 — Brak MediaPicker przy poszczególnych elementach w Visual ✓ POTWIERDZONE
**Opis:** Visual editor wymaga ręcznego wpisania URL zdjęcia/wideo. Brak przycisku "Wybierz z biblioteki" per element. Używalny tylko przez osoby znające publiczne URL plików.

#### UX-06 — Brak wskaźnika aktywnego typu medium per element ✓ POTWIERDZONE
**Opis:** Nagłówek elementu to "Item 1", "Item 2" itd. bez badge/ikony wskazującej czy to obraz, wideo, czy placeholder. Oba pola URL widoczne jednocześnie — użytkownik nie wie który typ "wygrywa".

#### UX-07 — Wizard Allowed: image/* — wykluczenie wideo bez wyjaśnienia
**Opis:** MediaPicker w Wizard przyjmuje tylko obrazy, ale model danych i Visual editor obsługują wideo. Użytkownik, który chce dodać wideo przez Wizard, nie ma takiej możliwości — musi przejść do Visual i ręcznie wpisać URL.

---

## 7. Braki funkcjonalne

| ID | Opis | Priorytet |
|----|------|-----------|
| BF-01 | Brak pola `alt` jako osobnego tekstu (caption ≠ alt text) | Wysoki |
| BF-02 | Brak MediaPicker dla poszczególnych elementów w Visual editor | Wysoki |
| BF-03 | Wizard MediaPicker nie obsługuje wideo | Wysoki |
| BF-04 | Brak suwaka opacity dla overlaya | Wysoki |
| BF-05 | Brak `rel="noopener noreferrer"` na linkach | Wysoki |
| BF-06 | Brak drag-and-drop reorder elementów | Średni |
| BF-07 | Brak thumbnail preview przy elementach w edytorze | Średni |
| BF-08 | Brak per-item media type toggle (obraz vs wideo) | Średni |
| BF-09 | Brak walidacji / warning gdy feature-left ma tylko 1 element | Średni |
| BF-10 | Brak opcji lightbox / zoom na kliknięcie | Średni |
| BF-11 | Brak kontroli `object-position` (punkt skupienia zdjęcia) | Średni |
| BF-12 | Brak per-item ratio (wszystkie kafelki mają jeden ratio) | Niski |
| BF-13 | Brak video poster image field (czarny ekran przy ładowaniu) | Niski |
| BF-14 | Brak animacji wejścia kafelków (fade, slide) | Niski |
| BF-15 | Brak breakpoint per-column (np. 2 kol. mobile, 4 kol. desktop) | Średni |
| BF-16 | Brak eksportu/importu konfiguracji galerii | Niski |

---

## 8. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet | Status |
|---|---------|----------|-----------|--------|
| A1 | `caption` jako alt text — duplikacja semantyczna | WCAG 1.1.1 | Wysoki | ✓ Potwierdzone (CODE-07) |
| A2 | Brak `rel="noopener noreferrer"` na linkach href | Bezpieczeństwo | Wysoki | ✓ Potwierdzone (BUG-05) |
| A3 | Hover caption niedostępny klawiaturowo / na dotyk | WCAG 2.1 SC 1.4.13 | Wysoki | ✓ Potwierdzone (CSS hover only) |
| A4 | `<video>` z `autoPlay` bez opcji wyłączenia | WCAG 2.2 SC 2.2.2 | Wysoki | Zidentyfikowane w kodzie |
| A5 | Brak `<figure>` + `<figcaption>` (semantyka galerii) | HTML5 | Średni | Zidentyfikowane w kodzie |
| A6 | Brak atrybutu `title` na elementach wideo | WCAG 1.2 | Średni | Zidentyfikowane w kodzie |

---

## 9. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | MediaPicker "Not authenticated" | Wizard / API |
| BUG-02 | Publish/Save: "Not authenticated" (HTTP 401) | API / session |
| BUG-03 | Overlay picker nie synchronizuje rgba | Visual editor |
| BUG-04 | Feature-left z 1 elementem — pusta prawa kolumna | Renderer |
| BUG-05 | Linki bez `rel="noopener noreferrer"` | Renderer / Bezpieczeństwo |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-05 | Dodać MediaPicker per element w Visual editor |
| UX-06 | Dodać wskaźnik aktywnego typu medium (obraz/wideo/placeholder) |
| UX-02 | Dodać thumbnail preview przy elementach |
| UX-07 | Obsłużyć wideo w Wizard MediaPicker lub dodać informację |
| UX-03 | Dodać drag-and-drop reorder |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Osobne pole `alt` text dla obrazów |
| BF-04 | Wysoki | Suwak opacity dla overlaya |
| BF-09 | Średni | Warning przy feature-left + 1 element |
| BF-10 | Średni | Lightbox / zoom na kliknięcie |
| BF-11 | Średni | Object-position (focus point) |
| BF-15 | Średni | Konfiguracja breakpoint kolumn |
| BF-13 | Niski | Video poster image |

---

## 10. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 |
| Problemy UX edytora | 7 |
| Błędy w kodzie (Code Bugs) | 8 |
| Braki funkcjonalne | 16 |
| Problemy dostępności | 6 |
| **Łącznie** | **42** |

---

## 11. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `gallery-mosaic-21-video-priority.png` | Video priority over image — Item 1 przełącza się na typ video |
| `gallery-mosaic-22-current-state.png` | Widok Visual editor z uniform-grid wariantem |
| `gallery-mosaic-23-hover-caption-test.png` | Test hover caption — mysz nad elementem 2 |
| `gallery-mosaic-24-mosaic-variant-full.png` | Mosaic wariant w canvas z 5 elementami |

> **Uwaga:** Pliki `gallery-mosaic-01` do `gallery-mosaic-20` nie zostały zapisane do docelowego katalogu z powodu braku katalogu `screenshots/` w trakcie pierwszych sesji. Zapis był poprawny dla ostatnich 4 screenshotów.

---

## 12. Uwagi techniczne

### Znany błąd systemowy — HTTP 401 przy zapisie
Ten sam problem z autoryzacją API pojawia się konsekwentnie we wszystkich testach widgetów (Hero, Gallery Mosaic). Sesja przeglądarki działa (logowanie OK), ale API calls do zapisu stron zwracają HTTP 401. Prawdopodobna przyczyna: token sesji nie jest dołączany do żądań POST/PUT w środowisku dev (problem z CSRF token, cookie SameSite policy lub wygaśnięcie session w trybie dev).

### Frontend nie testowany
Brak możliwości przetestowania widgetu na frontendzie — strona testowa nie mogła zostać zapisana/opublikowana z powodu błędu 401. Zachowanie frontendu (responsywność, hover, video autoplay) można ocenić tylko pośrednio przez canvas w admin preview.

---

*Raport zakończony — 2026-05-16. Testy przeprowadzone w sesji Playwright `gallery-mosaic`.*
