# RAPORT: Testimonials Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku  
> **Data:** 2026-05-16  
> **Sesja:** Playwright (Testimonials Widget)  
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000  
> **Sesja przeglądarki:** `testimonials-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Content (standalone, bez slotów)  
**Kategoria:** `content`  
**Warianty:** `grid`, `spotlight`, `slider-static`  
**Ograniczenia elementów:** min 2 / max 8  
**Plik renderera:** `core/widgets/core/testimonials.tsx`  
**Plik edytora:** `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`

Testimonials widget służy do wyświetlania cytatów klientów z ocenami gwiazdkowymi, danymi autora (imię, rola, avatar, etykieta źródła) oraz sekcją nagłówkową.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `eyebrow`, `title`, `description` |
| **Testimonials** | `id`, `quote`, `author`, `role`, `avatar` (URL), `rating` (0–5), `sourceLabel` |
| **Style** | `cardSurface`, `cardBorder`, `textColor`, `accentColor`, `spacing` (none/sm/md/lg) |

### 2.2 Warianty

| Wariant | Domyślna liczba kart | Opis |
|---------|---------------------|------|
| `grid` | 3 | Siatka 1/2/3 kolumn responsywnie |
| `spotlight` | 2 | Wyróżnienie pierwszej karty (col-span-2 na lg) |
| `slider-static` | 3 | Poziomy pasek z overflow-x (bez JS slidera) |

### 2.3 Tryby edytora

- **Wizard** — szybki start: wariant, tytuł sekcji, liczba, treść + autor (bez roli/avatara/sourceLabel)
- **Visual** — pełny edytor: wariant, spacing, header, wszystkie pola testimonialów, zarządzanie listą, kolory
- **Advanced** — diagnostyka: spacing token, normalizacja, raw payload JSON

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

*(Sekcja uzupełniana po testach)*

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

*(Sekcja uzupełniana po testach)*

---

### 4.2 Problemy UX edytora

*(Sekcja uzupełniana po testach)*

---

### 4.3 Braki funkcjonalne (analiza kodu)

#### BF-01 — Slider statyczny bez prawdziwego slidera
**Priorytet:** Wysoki  
**Opis:** Wariant `slider-static` to poziomy `overflow-x: auto` z kartami o stałej szerokości (`min-w-[18rem]`). Brak nawigacji (strzałki, dots, autoplay, swipe touch). Nazwa sugeruje coś więcej niż statyczny scroll.  
**Oczekiwane:** opcja przełączania na prawdziwy slider z JS lub przynajmniej jasna etykieta "Horizontal Scroll".

#### BF-02 — Brak zarządzania avatarami przez Media Library
**Priorytet:** Wysoki  
**Opis:** Pole "Avatar URL" to zwykły `<input type="text">` wymagający wklejenia URL. Brak przycisku "Pick from library" który otwierałby Asset Picker (tak jak w Hero widget). Użytkownik musi znać URL zewnętrzny lub ręcznie kopiować link z innego widgetu.

#### BF-03 — Brak opcji tła sekcji (background)
**Priorytet:** Wysoki  
**Opis:** Widget nie ma żadnej kontrolki tła sekcji (kolor, gradient, obraz). Cały wrapper `<section>` ma jedynie `px-4 py-8` — tło jest zawsze przezroczyste. Testimonials często potrzebują kontrastowego tła (ciemne tło + jasne karty) jako sekcja "social proof".

#### BF-04 — Brak kontrolek typografii nagłówka (rozmiar/wyrównanie)
**Priorytet:** Średni  
**Opis:** Nagłówek sekcji (eyebrow, title, description) ma hardcodowany `text-center` oraz stały rozmiar (`text-2xl font-semibold` dla tytułu). Brak możliwości zmiany wyrównania (left/center/right) ani rozmiaru.

#### BF-05 — Limit 8 testimonialów bez możliwości paginacji
**Priorytet:** Średni  
**Opis:** `testimonialsItemMax = 8` — po osiągnięciu limitu przycisk "Add testimonial" jest wyłączony. Brak opcji paginacji ani "load more" dla większych zestawów testimonialów.

#### BF-06 — Brak atrybutu `loading="lazy"` na avatarach
**Priorytet:** Średni  
**Opis:** Komponent `Avatar` renderuje `<img>` bez `loading="lazy"`. Przy wielu testimonialach na jednej stronie może wpłynąć na LCP i czas ładowania.

#### BF-07 — Brak `alt` dla avatar image uwzględniającego rolę
**Priorytet:** Średni  
**Opis:** `alt={author}` — samo imię autora jest wystarczające dla screen readera, ale brakuje kontekstu (np. "Zdjęcie profilowe autora: Anna Kowalska"). WCAG 1.1.1.

#### BF-08 — Spotlight: brak opcji wyboru wyróżnionego testimonialnego
**Priorytet:** Średni  
**Opis:** W wariancie `spotlight` zawsze pierwszy element (`index === 0`) jest wyróżniony (`col-span-2`). Nie ma możliwości zmiany który testimonial jest "spotlight" — jedynym sposobem jest "Move up" do pozycji 1.  
**UX-problem:** Nie jest to oczywiste dla użytkownika edytora.

#### BF-09 — Brak walidacji WCAG kontrastu w color pickerze
**Priorytet:** Średni  
**Opis:** Użytkownik może ustawić `textColor` taki sam lub zbliżony do `cardSurface`, co uczyni tekst nieczytelnym. Brak wskaźnika kontrastu.

#### BF-10 — Brak kontrolki padding/margin sekcji
**Priorytet:** Niski  
**Opis:** Wrapper sekcji ma hardcoded `py-8 px-4 max-w-6xl`. Brak kontrolek padding top/bottom w Advanced — przez co nie ma spójnego systemu spacingu z innymi widgetami (np. Hero który ma dedykowane paddingTop/paddingBottom).

#### BF-11 — Brak rich text dla pola `quote`
**Priorytet:** Niski  
**Opis:** Cytat to plain text. Brak możliwości użycia pogrubień, kursywy, linków wewnątrz cytatu.

#### BF-12 — Brak eksportu/importu testimonialów
**Priorytet:** Niski  
**Opis:** Brak możliwości eksportu listy testimonialów do CSV/JSON lub zaimportowania z zewnętrznego źródła (np. Trustpilot, Google Reviews).

#### BF-13 — Brak CTA w sekcji testimonialów
**Priorytet:** Niski  
**Opis:** Sekcja testimonialów często zawiera CTA pod listą kart (np. "Zobacz wszystkie opinie" lub "Zacznij teraz"). Widget nie ma pola CTA pod listą.

#### BF-14 — Brak kontrolki `borderWidth` i `borderRadius` karty
**Priorytet:** Niski  
**Opis:** Karta ma hardcoded `rounded-xl border` (1px border, border-radius xl). Brak możliwości zmiany grubości obramowania ani promienia rogów.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Brak `loading="lazy"` na avatarach | Performance | Średni |
| A2 | `alt` avatara = samo imię, brak kontekstu roli obrazu | WCAG 1.1.1 | Niski |
| A3 | Brak wskaźnika kontrastu w color pickerze | WCAG 1.4.3 | Średni |
| A4 | Spotlight: brak aria-label "Featured testimonial" na wyróżnionej karcie | WCAG 4.1.2 | Niski |
| A5 | `aria-label` na gwiazdkach: "Rating N out of 5" — poprawne ✓ | WCAG 1.1.1 | OK |

---

## 6. Podsumowanie — macierz priorytetów

### Błędy do naprawy

*(Uzupełniane po testach Playwright)*

### Pilne braki funkcjonalne

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Slider static bez prawdziwego slidera / nawigacji |
| BF-02 | Wysoki | Avatar URL bez Media Library picker |
| BF-03 | Wysoki | Brak tła sekcji |
| BF-04 | Średni | Brak typografii nagłówka (align/size) |
| BF-08 | Średni | Spotlight: brak wyboru wyróżnionego elementu |
| BF-09 | Średni | Brak walidatora kontrastu WCAG |
| BF-10 | Niski | Brak padding/margin sekcji |

---

## 7. Statystyki (wstępne)

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | TBD |
| Problemy UX edytora | TBD |
| Braki funkcjonalne | 14 |
| Problemy dostępności | 4 |
| **Łącznie** | **TBD** |

---

## 8. Screenshoty

*(Uzupełniane po testach Playwright)*

---

*Raport wygenerowany na podstawie analizy kodu — 2026-05-16. Uzupełniany po testach Playwright.*
