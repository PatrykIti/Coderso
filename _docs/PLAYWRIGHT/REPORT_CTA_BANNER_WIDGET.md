# RAPORT: CTA Banner Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright #1 (CTA Banner Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona testowa:** CTA Banner Test (`/admin/pages/[TBD]`)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Kategoria:** `content`
**Warianty:** `centered`, `split`, `with-badge`
**Slot:** sekcja konwersyjna — pasek CTA z nagłówkiem i przyciskami akcji

Widget CTA Banner to kompaktowy pasek konwersyjny służący do osadzania wezwania do działania z opcjonalnym badge'em, nagłówkiem, opisem i dwoma przyciskami (primary + secondary CTA). Obsługuje trzy układy (centered, split, with-badge) oraz szerokie możliwości stylowania kolorów, obramowania, zaokrąglenia i paddingu. Wbudowany w system trójpoziomowych edytorów (Wizard / Visual / Advanced).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `content.badge` | `string` | `"Limited offer"` | Tekst badge'a nad tytułem |
| `content.title` | `string` | `"Ready to launch..."` | Główny nagłówek bannera |
| `content.description` | `string` | `"Use reusable sections..."` | Podtytuł / linia wsparcia |
| `actions.primaryCta.label` | `string` | `"Get started"` | Etykieta przycisku głównego |
| `actions.primaryCta.href` | `string` | `"#"` | URL przycisku głównego |
| `actions.secondaryCta.label` | `string` | `"Contact sales"` | Etykieta przycisku drugorzędnego |
| `actions.secondaryCta.href` | `string` | `"#"` | URL przycisku drugorzędnego |
| `style.background` | `string` | `var(--color-surface)` | Kolor tła bannera |
| `style.text` | `string` | `var(--color-text)` | Kolor tekstu |
| `style.border` | `string` | `var(--color-border)` | Kolor obramowania |
| `style.borderWidth` | `"0"\|"1"\|"2"\|"3"` | `"1"` | Grubość obramowania |
| `style.radius` | `"none"\|"md"\|"lg"\|"xl"\|"2xl"` | `"xl"` | Zaokrąglenie narożników |
| `style.padding` | `"none"\|"sm"\|"md"\|"lg"\|"xl"` | `"md"` | Wewnętrzny padding bannera |
| `style.badgeBackground` | `string` | `var(--color-primary)` | Kolor tła badge'a |
| `style.badgeText` | `string` | `var(--color-bg)` | Kolor tekstu badge'a |
| `style.primaryButtonBg` | `string` | `var(--color-primary)` | Tło przycisku primary |
| `style.primaryButtonText` | `string` | `var(--color-bg)` | Tekst przycisku primary |
| `style.primaryButtonBorder` | `string` | `transparent` | Obramowanie przycisku primary |
| `style.secondaryButtonBg` | `string` | `transparent` | Tło przycisku secondary |
| `style.secondaryButtonText` | `string` | `var(--color-text)` | Tekst przycisku secondary |
| `style.secondaryButtonBorder` | `string` | `var(--color-border)` | Obramowanie przycisku secondary |

### 2.2 Warianty

| ID | Etykieta | Opis |
|----|----------|------|
| `centered` | Centered | Wycentrowane treści i przyciski, klasyczny układ |
| `split` | Split | Treść po lewej, przyciski po prawej |
| `with-badge` | With Badge | Badge wyeksponowany nad nagłówkiem |

### 2.3 Tryby edytora

| Tryb | Zakres pól |
|------|-----------|
| **Wizard** | Wariant (Select), Headline, Primary CTA label — tylko 3 pola |
| **Visual** | Pełny zestaw: wariant (karty), badge, title, description, primary CTA (label+href), secondary CTA (label+href), 8 pól kolorów, border color, border width, radius, padding |
| **Advanced** | Surowe tokeny CSS (background, text, border, primaryButtonBorder, secondaryButtonBorder), Normalize now, Reset to defaults, Raw payload snapshot |

### 2.4 Ograniczenia renderera

- Zewnętrzny wrapper `<section>` ma stałe klasy: `mx-auto w-full max-w-6xl px-4 py-8` — brak opcji full-width
- Przyciski zawsze mają `rounded-md` — niezależnie od ustawionego `radius` kontenera
- Opis (`description`) ma hardcoded kolor `text-[var(--color-text)]/80` — ignoruje `style.text`
- Klasa `border` jest zawsze na kontenerze — przy `borderWidth=0` może generować subtelne obramowanie zależnie od motywu

---

## 3. Wyniki testów Playwright

### 3.1 Admin UI — panel edycji (Visual Editor)

| Test | Wynik | Uwagi |
|------|-------|-------|
| Załadowanie strony z widgetem CTA Banner | — | Do weryfikacji |
| Wyświetlenie wariantów jako kart w Visual Editorze | — | Do weryfikacji |
| Zmiana wariantu na `split` | — | Do weryfikacji |
| Zmiana wariantu na `with-badge` | — | Do weryfikacji |
| Edycja treści badge | — | Do weryfikacji |
| Edycja title | — | Do weryfikacji |
| Edycja description | — | Do weryfikacji |
| Edycja primary CTA label | — | Do weryfikacji |
| Edycja primary CTA href | — | Do weryfikacji |
| Edycja secondary CTA label | — | Do weryfikacji |
| Edycja secondary CTA href | — | Do weryfikacji |
| Zmiana koloru tła (color picker) | — | Do weryfikacji |
| Zmiana koloru przycisku primary | — | Do weryfikacji |
| Zmiana border width na "2px" | — | Do weryfikacji |
| Zmiana radius na "2xl" | — | Do weryfikacji |
| Zmiana padding na "xl" | — | Do weryfikacji |
| Wyczyść (Clear) pole background | — | Do weryfikacji |
| Przełączenie do Advanced Editora | — | Do weryfikacji |
| Normalize now | — | Do weryfikacji |
| Reset to defaults | — | Do weryfikacji |

### 3.2 Admin UI — Wizard Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Zmiana wariantu przez Select | — | Do weryfikacji |
| Edycja headline | — | Do weryfikacji |
| Edycja primary CTA label | — | Do weryfikacji |
| Brak pola href w Wizardzie | — | Znany brak — do potwierdzenia |
| Brak secondary CTA w Wizardzie | — | Znany brak — do potwierdzenia |

### 3.3 Frontend — widok publiczny (localhost:3000)

| Test | Wynik | Uwagi |
|------|-------|-------|
| Wariant `centered` renderuje się poprawnie | — | Do weryfikacji |
| Wariant `split` — układ responsive | — | Do weryfikacji |
| Wariant `with-badge` — badge wyświetlony | — | Do weryfikacji |
| Empty badge w wariancie `with-badge` | — | Spodziewany bug — pusty `<span>` |
| Kolory z CSS tokenów renderują się poprawnie | — | Do weryfikacji |
| Kolory hex renderują się poprawnie | — | Do weryfikacji |
| Responsywność na mobile | — | Do weryfikacji |
| Kliknięcie primary CTA | — | Do weryfikacji |
| Kliknięcie secondary CTA | — | Do weryfikacji |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Pusty `<span>` badge w wariancie `with-badge` gdy badge text jest pusty
**Priorytet:** Średni
**Opis:** W wariancie `with-badge` flaga `showBadge` jest zawsze `true` (bo `resolvedVariant === "with-badge"`), przez co renderuje się `<span>` z pustą treścią gdy użytkownik nie wpisze tekstu badge'a. Generuje to niepotrzebny element DOM i potencjalnie widoczny artefakt wizualny (pusta pigułka badge'a).
**Lokalizacja:** `core/widgets/core/ctaBanner.tsx:304-363`
**Repro:** Ustaw wariant `with-badge`, wyczyść pole Badge — widget renderuje pusty `<span>` zamiast ukryć badge.

#### BUG-02 — Kolor opisu ignoruje `style.text`
**Priorytet:** Średni
**Opis:** Linia `<p className="text-sm text-[var(--color-text)]/80">` używa hardcoded tokenu CSS `var(--color-text)` zamiast wartości z `style.text`. Nawet jeśli użytkownik ustawi własny kolor tekstu, opis będzie zawsze renderował się jako `var(--color-text)` z 80% opacity.
**Lokalizacja:** `core/widgets/core/ctaBanner.tsx:369`

#### BUG-03 — Klasa `border` zawsze obecna przy `borderWidth=0`
**Priorytet:** Niski
**Opis:** Kontener bannera ma zawsze klasę Tailwind `border` (`border-width: 1px` w domyślnym Tailwind). Przy `borderWidth="0"` inline style ustawia `borderWidth: "0px"`, co nadpisuje klasę, ale może być niestabilne w zależności od specificity CSS i konfiguracji Tailwind.
**Lokalizacja:** `core/widgets/core/ctaBanner.tsx:337`

#### BUG-04 — Niespójność w funkcjach `resolveCtaBannerRadius` i `resolveCtaBannerPadding`
**Priorytet:** Niski
**Opis:** Funkcje `resolveCtaBannerRadius` (default: `"xl"`) i `resolveCtaBannerPadding` (default: `"md"`) nie sprawdzają jawnie swojej wartości domyślnej w warunku — domyślna wartość jest zwracana tylko przez fallback `return`. Analogicznie `resolveCtaBannerBorderWidth` nie sprawdza `"1"`. Kod działa poprawnie, ale jest niespójny i mylący — każda funkcja pomija dokładnie jedną wartość z walidacji.
**Lokalizacja:** `core/widgets/core/ctaBanner.tsx:185-200`

### 4.2 Problemy UX edytora

#### UX-01 — Brak przycisku `Clear` dla pól "Text color", "Badge text", "Primary button text", "Secondary button text"
**Opis:** W `CtaBannerVisualEditor` tylko wybrane pola koloru mają `onClear` prop (background, badgeBackground, primaryButtonBg, secondaryButtonBg). Pola tekstowe i inne kolory (`text`, `badgeText`, `primaryButtonText`, `secondaryButtonText`) nie mają opcji Clear — użytkownik nie może zresetować ich do tokenu CSS bez wchodzenia do Advanced Editora.
**Rekomendacja:** Dodać `onClear` do wszystkich pól koloru w Visual Editorze, aby umożliwić powrót do CSS tokenów.

#### UX-02 — Brak pól `primaryButtonBorder` i `secondaryButtonBorder` w Visual Editorze
**Opis:** Sekcja "Colors and button styles" w Visual Editorze nie zawiera pól dla obramowań przycisków. Są one dostępne wyłącznie w Advanced Editorze. To ogranicza możliwości stylowania bez przechodzenia do widoku technicznego.
**Rekomendacja:** Przenieść `primaryButtonBorder` i `secondaryButtonBorder` do Visual Editora w sekcji kolorów.

#### UX-03 — Wizard Editor nie posiada pola `href` dla primary CTA
**Opis:** Wizard Editor zawiera tylko etykietę CTA (`label`), bez pola URL. Użytkownik który używa tylko Wizarda nigdy nie ustawi docelowego linku — przycisk pozostaje z domyślnym `#`.
**Rekomendacja:** Dodać pole `href` do Wizard Editora obok pola label.

#### UX-04 — Wizard Editor nie zawiera secondary CTA
**Opis:** Wizard Editor całkowicie pomija sekcję secondary CTA. Użytkownik musi przejść do Visual Editora by ustawić drugi przycisk, co jest nieoczywiste dla początkujących.
**Rekomendacja:** Dodać przynajmniej pole label + href dla secondary CTA w Wizard Editorze.

#### UX-05 — Brak wizualnego podglądu wariantów w Wizard Editorze
**Opis:** Wizard Editor używa zwykłego `<Select>` dropdownu dla wyboru wariantu, bez podglądu jak wygląda każdy wariant. Visual Editor ma ładne karty z opisem, ale Wizard powinien też dawać wizualne wskazówki.
**Rekomendacja:** Zamienić Select w Wizard na karty wariantów (tak jak w Visual Editorze) lub dodać miniaturki podglądów.

#### UX-06 — Pola w sekcji Actions nie są oznaczone jako "Label" i "URL"
**Opis:** W sekcji Actions, dla każdego przycisku są dwa pola `<Input>` pod rząd, bez jawnych etykiet (`Label` vs `URL/href`). Użytkownik odróżnia je tylko po placeholder (`"Get started"` vs `"#"`), co jest nieoczywiste.
**Rekomendacja:** Dodać jawne etykiety "Label" i "URL" nad każdym polem.

#### UX-07 — Brak walidacji URL / feedback o nieprawidłowym href
**Opis:** Pola href akceptują dowolny tekst. Gdy `normalizeWidgetSafeHref` odrzuci wartość jako niebezpieczną (np. `javascript:`), href automatycznie resetuje się do `#` bez żadnego powiadomienia dla użytkownika.
**Rekomendacja:** Dodać inline walidację URL z komunikatem błędu lub ostrzeżenia gdy href jest odrzucony przez `normalizeWidgetSafeHref`.

#### UX-08 — Nieoczywisty sposób ukrycia secondary CTA
**Opis:** Aby ukryć secondary CTA, użytkownik musi wyczyścić oba pola (label i href). Brak jawnego przełącznika "Pokaż/Ukryj secondary CTA". Mechanizm jest nieoczywisty.
**Rekomendacja:** Dodać checkbox lub toggle "Włącz secondary CTA" obok sekcji.

### 4.3 Braki funkcjonalne

#### BF-01 — Brak kontroli zaokrąglenia przycisków
**Opis:** Przyciski CTA zawsze mają klasę `rounded-md` niezależnie od ustawienia `radius` kontenera. Brakuje opcji dopasowania zaokrąglenia przycisków do stylu bannera (np. sharp, pill, rounded).

#### BF-02 — Brak opcji `target` i `rel` dla linków CTA
**Opis:** Brak możliwości ustawienia `target="_blank"` (otwarcie w nowej karcie) ani `rel="noopener noreferrer"` dla linków CTA. Krytyczne dla linków zewnętrznych.

#### BF-03 — Brak ikon w przyciskach CTA
**Opis:** Przyciski CTA są tylko tekstowe. Brak opcji dodania ikon (strzałka, chevron, itp.) przed lub za etykietą.

#### BF-04 — Brak gradientowego tła
**Opis:** Pole `background` przyjmuje tylko wartości `string` — system CSS tokens lub kolory hex. Brak dedykowanego UI dla gradientów (linear, radial), które są popularne w bannerach konwersyjnych.

#### BF-05 — Brak trybu full-width (bleed)
**Opis:** Banner jest zawsze ograniczony do `max-w-6xl` z paddingiem `px-4 py-8`. Brak opcji rozciągnięcia bannera na pełną szerokość okna (edge-to-edge).

#### BF-06 — Brak wsparcia obrazka/mediów w tle
**Opis:** Banner obsługuje tylko kolory tła. Brak możliwości ustawienia obrazka tła z opcjami `cover/contain/repeat`.

#### BF-07 — Brak rozróżnienia rozmiaru primary vs secondary button
**Opis:** Oba przyciski mają identyczne klasy `px-4 py-2 text-sm font-semibold`. Brak możliwości uczynienia primary CTA większym/bardziej wyeksponowanym.

#### BF-08 — Brak trzeciego CTA / linku tekstowego
**Opis:** Wiele bannerów konwersyjnych używa wzorca: primary button + secondary button + "No thanks" / link tekstowy. Widget wspiera tylko dwa przyciski.

#### BF-09 — Brak opcji ukrycia description bez czyszczenia pola
**Opis:** Aby ukryć opis, użytkownik musi ręcznie wyczyścić pole textarea. Brak toggle "Pokaż opis".

#### BF-10 — Brak animacji/efektów wejścia
**Opis:** Widget jest statyczny — brak opcji animacji fade-in, slide-in przy pojawieniu się w viewport. Ogranicza atrakcyjność wizualną bannera konwersyjnego.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | `<section>` bez `aria-label` ani `aria-labelledby` — czytnik ekranu nie ma kontekstu sekcji | WCAG 1.3.1 | Średni |
| A2 | Przyciski CTA (`<a>`) bez `aria-label` gdy label jest skrótem; brak `role="link"` description | WCAG 2.4.6 | Średni |
| A3 | Badge `<span>` bez semantyki — nie opisuje roli wizualnej etykiety w kontekście | WCAG 1.3.1 | Niski |
| A4 | Brak klas `focus-visible:` na przyciskach CTA — niewidoczny focus przy nawigacji klawiaturą | WCAG 2.4.7 | Wysoki |
| A5 | Opis (`description`) ma kolor `var(--color-text)/80` — przy ciemnym tle może nie spełniać kontrastu 4.5:1 | WCAG 1.4.3 | Średni |

---

## 6. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | Pusty `<span>` badge renderuje się w wariancie `with-badge` gdy badge text pusty | Renderer |
| BUG-02 | Kolor opisu ignoruje `style.text` — hardcoded `var(--color-text)` | Renderer |
| A4 | Brak focus-visible na przyciskach CTA — problem dostępności klawiaturowej | Accessibility |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Dodać przycisk Clear dla wszystkich pól koloru w Visual Editorze |
| UX-02 | Przenieść primaryButtonBorder i secondaryButtonBorder do Visual Editora |
| UX-03 | Dodać pole href w Wizard Editorze dla primary CTA |
| UX-06 | Dodać jawne etykiety "Label" i "URL" w sekcji Actions |
| UX-07 | Walidacja URL z feedbackiem gdy href odrzucony |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-02 | Wysoki | Brak opcji `target="_blank"` i `rel` dla linków CTA |
| BF-01 | Średni | Brak kontroli zaokrąglenia przycisków |
| BF-05 | Średni | Brak trybu full-width bannera |
| BF-07 | Średni | Brak rozróżnienia rozmiarów primary vs secondary button |
| BF-03 | Niski | Brak ikon w przyciskach CTA |
| BF-04 | Niski | Brak gradientowego tła |
| BF-08 | Niski | Brak trzeciego CTA / linku tekstowego |

---

## 7. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 4 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 10 |
| Problemy dostępności | 5 |
| **Łącznie** | **27** |

---

## 8. Screenshoty

| Plik | Opis |
|------|------|
| `cta-banner-admin-visual.png` | Widok Visual Editora w panelu admin |
| `cta-banner-admin-wizard.png` | Widok Wizard Editora |
| `cta-banner-admin-advanced.png` | Widok Advanced Editora |
| `cta-banner-centered-frontend.png` | Wariant centered na froncie |
| `cta-banner-split-frontend.png` | Wariant split na froncie |
| `cta-banner-with-badge-frontend.png` | Wariant with-badge na froncie |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16. Sekcja 3 (wyniki testów) zostanie uzupełniona po sesji Playwright.*
