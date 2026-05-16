# RAPORT: Posts Feed Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright (Posts Feed Widget)
> **Środowisko Admin:** http://localhost:5173/admin
> **Środowisko Frontend:** http://localhost:3000
> **Strona testowa:** Dedykowana strona testowa (Posts Feed Test Page)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Content / Listings
**Warianty:** `cards`, `list`, `compact`
**Kategoria:** content
**Złożoność:** composite
**Odbiorca:** beginner
**Wymaga modułu:** posts

Posts Feed Widget to widget umożliwiający wyświetlanie postów/artykułów bez konieczności budowania własnego zapytania listingowego. Pobiera dane przez server-side resolver (`resolvePostsFeedRuntimeData`) i mapuje je do wspólnego kontraktu `ContentListBlock`.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Źródło** | `source.mode` (latest/featured/category/manual), `source.category`, `source.manualPostIds` (max 64), `source.limit` (1–24), `source.sort` (6 opcji) |
| **Pola** | `fields.showExcerpt`, `fields.showAuthor`, `fields.showDate`, `fields.showCta` |
| **Empty state** | `emptyState.title`, `emptyState.description` |
| **Styl** | `style.columns` (1/2/3), `style.gap` (none/sm/md/lg), `style.cardStyle` (outlined/elevated/minimal), `style.ctaLabel`, `style.backgroundColor`, `style.borderColor`, `style.textColor` |
| **Runtime** | `resolved.items[]`, `resolved.total`, `resolved.sourceMode`, `resolved.resolvedAt`, `resolved.error` |

### 2.2 Tryby edytora

| Tryb | Sekcje |
|------|--------|
| **Wizard** | Source setup + Display |
| **Visual** | Source setup + Display + Layout and style + Empty state |
| **Advanced** | Source setup + Display + Layout and style + Empty state + Runtime payload (read-only) |

### 2.3 Resolver — logika filtrowania

| Tryb źródła | Logika |
|-------------|--------|
| `latest` | Wszystkie widoczne posty, sortowane wg `sort` |
| `featured` | Posty z tagiem "featured" LUB `data.featured === true` |
| `category` | Posty gdzie tag zawiera fragment szukanej frazy (case-insensitive) |
| `manual` | Posty w kolejności wybranych ID, sort ignorowany |

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

> *Sekcja uzupełniana po przeprowadzeniu testów*

### 3.1 Source modes

| Test | Wynik |
|------|-------|
| Przełączanie między trybami Latest / Featured / Category / Manual | - |
| Category field pojawia się przy trybie "category" | - |
| Manual post picker pojawia się przy trybie "manual" | - |
| Manual picker ładuje listę postów z API | - |
| Checkbox selection w manual pickerze | - |
| "Selected: ..." preview pod pickerem | - |
| Limit (1–24) przyjmuje wartości | - |
| Sort options (6 opcji) działają | - |

### 3.2 Display Options

| Test | Wynik |
|------|-------|
| Show excerpt toggle | - |
| Show author toggle | - |
| Show publish date toggle | - |
| Show CTA link toggle | - |

### 3.3 Layout and Style

| Test | Wynik |
|------|-------|
| Wariant: Cards / List / Compact | - |
| Columns: 1 / 2 / 3 | - |
| Gap: None / Compact / Default / Spacious | - |
| Card style: Outlined / Elevated / Minimal | - |
| CTA label — edycja tekstu | - |
| Card background — clearable | - |
| Card border — clearable | - |

### 3.4 Empty State

| Test | Wynik |
|------|-------|
| Edycja tytułu empty state | - |
| Edycja opisu empty state | - |
| Empty state widoczny w podglądzie | - |

### 3.5 Runtime snapshot (Advanced)

| Test | Wynik |
|------|-------|
| Runtime payload widoczny jako JSON | - |
| Payload aktualizuje się po zmianie konfiguracji | - |

### 3.6 Frontend (http://localhost:3000)

| Test | Wynik |
|------|-------|
| Widget renderuje się na froncie | - |
| Karty postów widoczne z poprawnymi danymi | - |
| Linki do postów działają | - |
| Autor/data/excerpt zgodne z ustawieniami | - |
| Empty state widoczny przy braku postów | - |
| Responsywność na mobile | - |

---

## 4. Znalezione błędy i problemy UX

> *Sekcja uzupełniana na bieżąco podczas testów*

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Sort ignorowany dla trybu "manual"
**Priorytet:** Informacyjny (by design)
**Opis:** W trybie "manual" opcja sort jest w UI ciągle widoczna i aktywna, mimo że resolver ją ignoruje (`mode === "manual" ? modeFiltered : sortPosts(...)`). Nie ma żadnej informacji w UI że sort nie działa dla manual mode.
**Lokalizacja:** `PostsFeedEditors.tsx:SourceSetup` → `postsFeedResolver.ts:210`
**Rekomendacja:** Ukryć/zdisablować pole "Sort" gdy mode = "manual", dodać hint "Order is determined by your selection."

#### BUG-02 — textColor nie ma clearable kontrolki
**Priorytet:** Średni
**Opis:** Pola `backgroundColor` i `borderColor` w LayoutOptions używają `ClearableInputField` (z przyciskiem Clear), natomiast `textColor` **nie jest w ogóle eksponowany w UI edytora** (istnieje w schemacie i defaults, ale brak go w `LayoutOptions`). Użytkownik nie może zmienić koloru tekstu kart.
**Lokalizacja:** `PostsFeedEditors.tsx:LayoutOptions` (linia ~540–556)
**Rekomendacja:** Dodać `ClearableInputField` dla `textColor` w siatce color fields.

#### BUG-03 — Category filter: pojedynczy tag, brak wsparcia multi-tag
**Priorytet:** Średni
**Opis:** Pole category przyjmuje jeden string i dopasowuje go do tagów przez `includes()`. Brak obsługi przecinkami oddzielonych tagów (np. `news, updates`). Placeholder w UI sugeruje multi-value: `e.g. news, updates, automotive`, ale kod filtruje wyłącznie po jednym słowie kluczowym.
**Lokalizacja:** `postsFeedResolver.ts:filterByCategory`, `PostsFeedEditors.tsx:~247`
**Rekomendacja:** Albo zmienić placeholder żeby był dokładny (jeden tag), albo zaimplementować multi-tag parsing po przecinku.

#### BUG-04 — showImage zawsze false — brak opcji obrazka karty
**Priorytet:** Wysoki
**Opis:** W `mapPostsFeedToContentListData()` pole `fields.showImage` jest hardkodowane jako `false` (linia 352). Brak jakiegokolwiek UI toggle dla obrazka. Posty mogą mieć miniatury (thumbnail/featured image) ale widget nigdy ich nie wyświetla — znaczne ograniczenie dla typowego bloga/newsroomu.
**Lokalizacja:** `postsFeed.tsx:352`
**Rekomendacja:** Dodać `showImage: boolean` do `fields`, dodać toggle w Display Options.

#### BUG-05 — imageSrc/imageAlt nie są mapowane przez resolver
**Priorytet:** Wysoki (powiązany z BUG-04)
**Opis:** Resolver `mapPostToRuntimeItem` nie mapuje `imageSrc` ani `imageAlt` — pola te są obecne w schemacie `resolved.items` ale resolver ich nie wypełnia (`postsFeedResolver.ts:166–178`). Nawet gdyby dodać `showImage: true`, obrazki by się nie wyświetliły.
**Lokalizacja:** `postsFeedResolver.ts:mapPostToRuntimeItem`
**Rekomendacja:** Zmapować `post.data.thumbnailSrc` / `post.data.featuredImage` → `imageSrc` i odpowiadające alt.

### 4.2 Problemy UX edytora

#### UX-01 — Brak wizualnego preview wariantu w selekcji
**Opis:** Wybór wariantu (Cards / List / Compact) jest zwykłym `<Select>` dropdownem. Użytkownik nie ma podglądu jak wyglądają poszczególne warianty przed wybraniem. Inne widgety (np. Hero) często pokazują miniaturki układu.
**Rekomendacja:** Dodać mini-preview (ikony układu) przy opcjach wariantu lub przynajmniej opis każdego wariantu.

#### UX-02 — Wizard i Visual mają identyczną zawartość
**Opis:** `renderPostsFeedEditor` dla `wizard` i `visual` renderuje te same sekcje (tylko wizard pomija Layout i EmptyState). Nie ma progresywnego "krok po kroku" flow w trybie Wizard charakterystycznego dla innych widgetów. Wizard powinien prowadzić przez kolejne kroki, nie pokazywać wszystkiego naraz.
**Rekomendacja:** Zaimplementować multi-step flow w Wizard (krok 1: Source, krok 2: Display, krok 3: Finish).

#### UX-03 — Manual picker: brak drag-and-drop reorder
**Opis:** W trybie manual posty wybierane są przez checkboxy. Kolejność na liście = kolejność w bazie, nie kolejność wyświetlania. Użytkownik nie może przeciągnąć pozycji żeby zmienić ich kolejność bez modyfikacji `manualPostIds` array.
**Rekomendacja:** Dodać drag-and-drop reorder dla wybranych postów w manual mode.

#### UX-04 — Manual picker: brak wyszukiwarki
**Opis:** Przy dużej liczbie postów scrollowalna lista checkboxów (max-h-56) bez filtrowania jest trudna w użyciu. Brak pola wyszukiwania/filtrowania.
**Rekomendacja:** Dodać input search nad listą postów w manual pickerze.

#### UX-05 — Brak feedback o stanie resolvera
**Opis:** Nie ma żadnej informacji w edytorze o tym kiedy widget ostatnio "zaciągnął" dane z serwera (poza ukrytym `resolvedAt` w Runtime Snapshot). Użytkownik nie wie czy widzi aktualne posty czy stary cache.
**Rekomendacja:** Wyświetlić `resolvedAt` jako czytelny timestamp w edytorze (np. "Data last synced: 5 minutes ago").

#### UX-06 — Empty state nie jest widoczny w admin preview przy braku postów
**Opis:** Jeśli użytkownik skonfiguruje widget z trybem "featured" bez oznaczonych postów, podgląd admina nie pokazuje empty state — zamiast tego renderuje pusty blok bez informacji zwrotnej.
**Rekomendacja:** Wyświetlać empty state w podglądzie gdy `resolved.items` jest puste.

#### UX-07 — Brak potwierdzenia "czy na pewno wyczyścić" dla clearable fields
**Opis:** Przycisk "Clear" przy polach kolorów usuwa wartość natychmiast bez żadnego potwierdzenia. Brak undo.
**Rekomendacja:** Spójne z innymi raportami — co najmniej toast "Wartość wyczyszczona" z Undo przez 5s.

#### UX-08 — Kolumny bez relacji z wariantem
**Opis:** Kontrolka "Columns" (1/2/3) jest aktywna niezależnie od wybranego wariantu. W trybie `compact` lub `list` wielokolumnowy układ może wyglądać niepoprawnie lub nie być obsługiwany przez ContentList.
**Rekomendacja:** Warunkowe pokazywanie/ukrywanie kontrolki Columns zależnie od wybranego wariantu, lub tooltip wyjaśniający zachowanie.

### 4.3 Braki funkcjonalne

#### BF-01 — Brak pola "Show image" / thumbnail card
**Opis:** Brak możliwości wyświetlenia miniaturki posta na karcie. Resolver nie mapuje imageSrc. Fundamentalny brak dla typowego bloga.

#### BF-02 — Brak paginacji / "Load more"
**Opis:** Widget pokazuje max 24 postów (limit). Brak opcji paginacji ani przycisku "Load more". Dla większych blogów jest to ograniczenie.

#### BF-03 — Brak "View all" / link do strony listingu
**Opis:** Brak opcji dodania przycisku "View all posts" na dole widgetu. Standardowy element dla feed widgetów na stronach głównych.

#### BF-04 — Brak filtrowania po autorze
**Opis:** Resolver obsługuje `latest`, `featured`, `category`, `manual` — brak trybu `author` do wyświetlania postów konkretnego autora.

#### BF-05 — Brak filtrowania po zakresie dat
**Opis:** Brak możliwości pokazania postów z konkretnego okresu (np. ostatnie 30 dni, określony rok/miesiąc).

#### BF-06 — Brak obsługi tagu "featured" przy sortowaniu w trybie "latest"
**Opis:** W trybie "latest" posty featured nie są wyróżnione w żaden sposób (pinning). Brak opcji "featured first" w sortowaniu.

#### BF-07 — Brak opcji pokazania tagów na kartach
**Opis:** Resolver mapuje `tags: []` (pusta tablica — hardkodowana w `mapPostToRuntimeItem`). Tagi postów nigdy nie są wyświetlane, mimo że posty je posiadają.
**Lokalizacja:** `postsFeedResolver.ts:175` — `tags: []`

#### BF-08 — Brak własnego tytułu sekcji / headera widgetu
**Opis:** Widget nie ma opcji dodania nagłówka sekcji (np. "Latest articles", "Featured posts"). Wymaga dodania oddzielnego widgetu Stack lub Rich Text.

#### BF-09 — Brak kontroli image aspect ratio dla kart
**Opis:** Nawet po implementacji showImage (BF-01), brak opcji ustawienia proporcji miniatury (16:9, 4:3, 1:1).

#### BF-10 — Brak opcji animacji wejścia kart
**Opis:** Brak transition/stagger animations dla kart podczas scroll into view.

#### BF-11 — Brak eksportu danych feedu (RSS/JSON)
**Opis:** Widget wyświetla feed, ale brak opcji generowania RSS lub JSON feed URL dla automatycznych subskrybentów.

#### BF-12 — Brak search query filter w source setup
**Opis:** ContentList posiada `filters.searchQuery` w swoim typie, ale PostsFeed nie eksponuje tego przez UI. Przydatne dla filtrowania po tytule/treści.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | `tags: []` hardkodowane — brak tagów jako nawigacyjnych linków | WCAG 2.4.4 | Wysoki |
| A2 | Brak `imageSrc`/`imageAlt` mapping — obrazy bez alt | WCAG 1.1.1 | Wysoki |
| A3 | Manual picker checkboxes bez aria-label per checkbox | WCAG 4.1.2 | Średni |
| A4 | Brak `aria-live` na stanie ładowania postów w manual pickerze | WCAG 4.1.3 | Średni |
| A5 | Linki CTA "Read more" bez kontekstu — nieprzydatne dla screen readers | WCAG 2.4.6 | Średni |
| A6 | Brak keyboard navigation w manual checklist (focus management) | WCAG 2.1.1 | Niski |

---

## 6. Porównanie: Admin Preview vs Frontend

> *Sekcja uzupełniana po testach Playwright*

| Aspekt | Admin Preview | Frontend (localhost:3000) | Zgodność |
|--------|--------------|--------------------------|----------|
| Renderowanie kart | - | - | - |
| Dane postów | - | - | - |
| Warianty | - | - | - |
| Empty state | - | - | - |
| Kolory/style | - | - | - |
| Responsywność | - | - | - |

---

## 7. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-04 | showImage hardkodowane false — brak kart z obrazkiem | Mapowanie danych |
| BUG-05 | imageSrc/imageAlt nie są mapowane przez resolver | Resolver |
| BUG-02 | textColor nie eksponowany w UI | Edytor |
| BUG-03 | Category placeholder sugeruje multi-tag, kod tego nie obsługuje | UX/Dokumentacja |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Preview wariantów w selekcji |
| UX-02 | Multi-step Wizard flow |
| UX-03 | Drag-and-drop reorder w manual mode |
| UX-04 | Wyszukiwarka w manual pickerze |
| UX-05 | Feedback o stanie/czasie ostatniej synchronizacji |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Show image / thumbnail cards |
| BF-03 | Wysoki | "View all" link do pełnego listingu |
| BF-08 | Wysoki | Nagłówek sekcji widgetu |
| BF-02 | Średni | Paginacja / Load more |
| BF-04 | Średni | Filtrowanie po autorze |
| BF-07 | Średni | Wyświetlanie tagów na kartach |
| BF-05 | Niski | Filtrowanie po zakresie dat |
| BF-12 | Niski | Search query filter |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 12 |
| Problemy dostępności | 6 |
| **Łącznie** | **31** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

> *Uzupełniane podczas testów Playwright*

| Plik | Opis |
|------|------|
| - | - |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
