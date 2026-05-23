# RAPORT: Posts Feed Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Posts Feed Widget)
> **Środowisko Admin:** http://localhost:5173/admin
> **Środowisko Frontend:** http://localhost:3000
> **Strona testowa:** Posts Feed Test Page (`/posts-feed-test-page`)
> **Page ID:** `a5555d60-0a32-4012-815f-12fea47cea94`

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

### 3.1 Source modes

| Test | Wynik |
|------|-------|
| Przełączanie między trybami Latest / Featured / Category / Manual | ✓ Działa |
| Category field pojawia się przy trybie "category" | ✓ Działa |
| Manual post picker pojawia się przy trybie "manual" | ✓ Sekcja widoczna |
| Limit (1–24) przyjmuje wartości | ✓ Działa |
| Sort options (6 opcji) dostępne | ✓ Dostępne |

### 3.2 Display Options

| Test | Wynik |
|------|-------|
| Show excerpt toggle | ✓ Działa |
| Show author toggle | ✓ Działa |
| Show publish date toggle | ✓ Działa |
| Show CTA link toggle | ✓ Działa |

### 3.3 Layout and Style

| Test | Wynik |
|------|-------|
| Wariant: Cards / List / Compact | ✓ Działa, canvas odzwierciedla zmianę (badge) |
| Columns: 1 / 2 / 3 | ✓ Dostępne |
| Gap: None / Compact / Default / Spacious | ✓ Dostępne |
| Card style: Outlined / Elevated / Minimal | ✓ Dostępne |
| CTA label — edycja tekstu | ✓ Działa |
| Card background — clearable (pokazuje `var(--color-bg)`) | ✓ Działa |
| Card border — clearable (pokazuje `var(--color-border)`) | ✓ Działa |

### 3.4 Empty State

| Test | Wynik |
|------|-------|
| Edycja tytułu empty state | ✓ Działa |
| Edycja opisu empty state | ✓ Działa |

### 3.5 Runtime snapshot (Advanced)

| Test | Wynik |
|------|-------|
| Runtime payload widoczny jako JSON (`items`, `total`, `sourceMode`) | ✓ Działa |
| `resolvedAt` puste w admin preview (resolver nie działa client-side) | ✓ Oczekiwane |

### 3.6 Frontend (http://localhost:3000)

| Test | Wynik |
|------|-------|
| Widget renderuje się na froncie | ✓ Działa |
| 3 karty postów widoczne w 3-kolumnowym układzie | ✓ Działa |
| Tytuł, autor, data, excerpt, CTA widoczne | ✓ Działa |
| Responsywność na mobile (1 kolumna) | ✓ Działa |
| Preview mode (`?preview=1`) zgodny z frontendem | ✓ Identyczny |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Sort ignorowany dla trybu "manual" — brak informacji w UI
**Priorytet:** Średni
**Opis:** W trybie "manual" opcja sort jest w UI ciągle widoczna i aktywna, mimo że resolver ją ignoruje (`mode === "manual" ? modeFiltered : sortPosts(...)`). Nie ma żadnej informacji w UI że sort nie działa dla manual mode.
**Lokalizacja:** `PostsFeedEditors.tsx:SourceSetup` → `postsFeedResolver.ts:210`
**Repro:** Wybierz tryb "Manual selection" — Sort dropdown pozostaje aktywny bez żadnej adnotacji
**Rekomendacja:** Ukryć/zdisablować pole "Sort" gdy mode = "manual", dodać hint "Order is determined by your selection."

#### BUG-02 — textColor nie jest eksponowany w UI edytora
**Priorytet:** Średni
**Opis:** Pola `backgroundColor` i `borderColor` w LayoutOptions używają `ClearableInputField` (z przyciskiem Clear), natomiast `textColor` **nie jest w ogóle eksponowany w UI edytora** mimo że istnieje w schemacie, defaults i normalizacji. Użytkownik nie może zmienić koloru tekstu kart przez UI.
**Lokalizacja:** `PostsFeedEditors.tsx:LayoutOptions` (brak pola po `Card border`)
**Repro:** Przejdź Visual → Layout and style → po "Card border" nie ma pola "Text color"
**Rekomendacja:** Dodać `ClearableInputField` dla `textColor` po polach backgroundColor/borderColor.

#### BUG-03 — Category filter: placeholder sugeruje multi-tag, kod nie obsługuje
**Priorytet:** Średni
**Opis:** Pole category przyjmuje jeden string i dopasowuje go do tagów przez `includes()`. Brak obsługi przecinkami oddzielonych tagów. Placeholder w UI sugeruje multi-value: `e.g. news, updates, automotive`, ale kod filtruje wyłącznie po jednym słowie kluczowym.
**Lokalizacja:** `postsFeedResolver.ts:filterByCategory`, `PostsFeedEditors.tsx:~247`
**Repro:** Wpisz "news, updates" jako category — widget nie znajdzie postów z tagiem "news" lub "updates" oddzielnie
**Rekomendacja:** Zmienić placeholder na "e.g. news" (jeden tag), albo zaimplementować multi-tag parsing po przecinku.

#### BUG-04 — showImage zawsze false — brak opcji obrazka karty
**Priorytet:** Wysoki
**Opis:** W `mapPostsFeedToContentListData()` pole `fields.showImage` jest hardkodowane jako `false`. Brak jakiegokolwiek UI toggle dla obrazka. Posty mogą mieć miniatury ale widget nigdy ich nie wyświetla — karty pozbawione obrazów na froncie.
**Lokalizacja:** `postsFeed.tsx:352` — `showImage: false`
**Repro:** Otwórz `http://localhost:3000/posts-feed-test-page` — karty bez obrazów
**Rekomendacja:** Dodać `showImage: boolean` do `fields`, toggle w Display Options, zmapować `imageSrc` w resolverze.

#### BUG-05 — imageSrc/imageAlt nie są mapowane przez resolver
**Priorytet:** Wysoki (powiązany z BUG-04)
**Opis:** Resolver `mapPostToRuntimeItem` nie mapuje `imageSrc` ani `imageAlt` — pola te są obecne w schemacie `resolved.items` ale resolver ich nie wypełnia. Nawet gdyby dodać `showImage: true`, obrazki by się nie wyświetliły bo dane są puste.
**Lokalizacja:** `postsFeedResolver.ts:166–178` — `mapPostToRuntimeItem` zwraca obiekt bez `imageSrc`/`imageAlt`
**Rekomendacja:** Zmapować `post.data.thumbnailSrc` / `post.data.featuredImage` → `imageSrc` i odpowiadające alt.

#### BUG-06 — Session/CSRF token wygasa podczas edycji — utrata danych
**Priorytet:** Krytyczny
**Opis:** Sesja użytkownika wygasa po kilku minutach pracy w edytorze. Kolejne wywołania API (`PATCH /api/pages`, `POST /api/publish`, `GET /api/posts`) zwracają 401 Unauthorized, mimo że użytkownik jest pozornie zalogowany. Prowadzi to do **utraty niezapisanych zmian** bez żadnego ostrzeżenia.
**Lokalizacja:** `http://localhost:5173/admin/api/auth/csrf` — token wygasa
**Repro:** Zaloguj się → edytuj stronę przez kilka minut → próbuj zapisać → 401 w konsoli, zmiany utracone
**Rekomendacja:** Automatycznie odświeżać CSRF token; wyświetlić komunikat "Sesja wygasła — zaloguj się ponownie."

#### BUG-07 — "Read more" linki prowadzą do 404 (Not Found)
**Priorytet:** Krytyczny
**Opis:** Resolver buduje URL postów używając domyślnego wzorca `/post/:slug`. Na froncie ta trasa nie istnieje — strona zwraca "Not Found". Route nie jest skonfigurowany w `ContentRouteSetting`.
**Lokalizacja:** `postsFeedResolver.ts:resolveDetailPathPattern` — fallback: `"/post/:slug"`
**Repro:** Otwórz `http://localhost:3000/posts-feed-test-page` → kliknij "Read more" → "Not Found"
**Rekomendacja:** Skonfigurować content route dla postów w ustawieniach lub zmienić fallback na właściwy wzorzec.

#### BUG-08 — Data wyświetlana w formacie ISO (YYYY-MM-DD), nie czytelnym
**Priorytet:** Średni
**Opis:** Data publikacji na kartach wyświetla się jako "2026-05-13", nie w formacie czytelnym ("May 13, 2026"). Brak formatowania lokalizacyjnego i brak semantycznego elementu `<time datetime="...">`.
**Lokalizacja:** `ContentListBlock` — renderowanie `publishedAt` z ISO string
**Repro:** Otwórz `http://localhost:3000/posts-feed-test-page` — data wyświetlona jako "2026-05-13 • Patryk"
**Rekomendacja:** Sformatować przez `Intl.DateTimeFormat` / `date-fns`. Owinąć w `<time datetime="...">`.

#### BUG-09 — Manual picker API 401 — lista postów niedostępna
**Priorytet:** Wysoki
**Opis:** W trybie "Manual selection" edytor wywołuje `GET /api/posts` który zwraca 401. Picker wyświetla "No posts available. Not authenticated." mimo zalogowanego użytkownika. Powiązane z BUG-06.
**Lokalizacja:** `PostsFeedEditors.tsx:usePostOptions` → `listPostsCached`
**Repro:** Wybierz "Manual selection" → "No posts available. Not authenticated."

### 4.2 Problemy UX edytora

#### UX-01 — Admin canvas zawsze pokazuje "No posts found" zamiast podglądu
**Opis:** W edytorze strony canvas pokazuje pusty stan nawet gdy istnieją opublikowane posty. Resolver SSR nie działa client-side, więc edytor nie może wyświetlić podglądu. Użytkownik nie wie jak widget wygląda z treścią przed opublikowaniem.
**Różnica Admin vs Frontend:** Admin zawsze "No posts found", frontend pokazuje posty poprawnie.
**Rekomendacja:** Zaciągnąć preview przez API (`listPosts`) i wyrenderować uproszczony podgląd kart w canvas.

#### UX-02 — Brak wizualnego preview wariantu w selekcji
**Opis:** Wybór wariantu (Cards / List / Compact) jest zwykłym dropdownem bez podglądu jak wygląda każdy wariant.
**Rekomendacja:** Dodać mini-ikonki lub miniatury układu przy każdym wariancie.

#### UX-03 — Wizard i Visual mają identyczną zawartość
**Opis:** Wizard renderuje te same sekcje co Visual (pomijając Layout i EmptyState). Brak progresywnego step-by-step flow.
**Rekomendacja:** Zaimplementować multi-step flow (krok 1: Source, krok 2: Display, krok 3: Layout).

#### UX-04 — Manual picker: brak wyszukiwarki
**Opis:** Scrollowalna lista checkboxów bez filtrowania trudna przy dużej liczbie postów.
**Rekomendacja:** Dodać input search nad listą postów.

#### UX-05 — Manual picker: brak drag-and-drop reorder
**Opis:** Użytkownik nie może zmienić kolejności wybranych postów przez przeciąganie.
**Rekomendacja:** Dodać DnD reorder dla wybranych pozycji.

#### UX-06 — Brak feedback o stanie/czasie resolvera
**Opis:** `resolvedAt` dostępne tylko w Advanced → Runtime payload jako surowy JSON, nie widoczne dla użytkownika.
**Rekomendacja:** Wyświetlić czytelny timestamp "Last synced: 5 min ago" w edytorze.

#### UX-07 — Kolumny aktywne niezależnie od wariantu
**Opis:** Kontrolka Columns (1/2/3) jest aktywna dla wariantów List i Compact, gdzie wielokolumnowy układ jest nieoczekiwany.
**Repro:** Variant=List → Columns=3 — niejasne zachowanie
**Rekomendacja:** Warunkowe pokazywanie Columns lub tooltip wyjaśniający zachowanie.

#### UX-08 — Brak potwierdzenia przy czyszczeniu wartości
**Opis:** Przycisk "Clear" przy polach kolorów usuwa wartość natychmiast bez undo.
**Rekomendacja:** Toast z opcją "Undo" przez 5s.

### 4.3 Braki funkcjonalne

#### BF-01 — Brak pola "Show image" / thumbnail card
**Opis:** Brak możliwości wyświetlenia miniaturki posta na karcie (hardkodowane `showImage: false`). Fundamentalny brak dla blogów gdzie obrazy są kluczowe.

#### BF-02 — Brak paginacji / "Load more"
**Opis:** Widget pokazuje max 24 postów. Brak paginacji ani przycisku "Load more".

#### BF-03 — Brak "View all" / link do strony listingu
**Opis:** Brak opcji dodania przycisku "View all posts" na dole widgetu.

#### BF-04 — Brak filtrowania po autorze
**Opis:** Brak trybu `author` do wyświetlania postów konkretnego autora.

#### BF-05 — Brak wyświetlania tagów na kartach
**Opis:** Resolver mapuje `tags: []` (hardkodowane). Tagi postów nigdy nie są wyświetlane.
**Lokalizacja:** `postsFeedResolver.ts:175` — `tags: []`

#### BF-06 — Brak własnego nagłówka sekcji widgetu
**Opis:** Widget nie ma opcji dodania nagłówka sekcji (np. "Latest articles").

#### BF-07 — Brak filtrowania po zakresie dat
**Opis:** Brak możliwości pokazania postów z konkretnego okresu.

#### BF-08 — Brak opcji "featured first" w trybie "latest"
**Opis:** W trybie "latest" brak opcji sortowania "featured first" łączonego z sortowaniem po dacie.

#### BF-09 — Brak image aspect ratio controls
**Opis:** Nawet po implementacji showImage, brak opcji ustawienia proporcji miniatury.

#### BF-10 — Brak kontroli animacji wejścia kart
**Opis:** Brak transition/stagger animations podczas scroll into view.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Data wyświetlana jako `<span>`, brak `<time datetime="...">` | WCAG 1.3.1 | Wysoki |
| A2 | `imageSrc`/`imageAlt` nie mapowane — brak alt text dla obrazów | WCAG 1.1.1 | Wysoki |
| A3 | "Read more" linki bez kontekstu tytułu dla screen readers | WCAG 2.4.6 | Wysoki |
| A4 | `tags: []` hardkodowane — brak tagów jako nawigacyjnych linków | WCAG 2.4.4 | Średni |
| A5 | Manual picker checkboxes bez aria-label powiązanego z tytułem posta | WCAG 4.1.2 | Średni |
| A6 | Brak `aria-live` na stanie ładowania postów w manual pickerze | WCAG 4.1.3 | Niski |

---

## 6. Porównanie: Admin Preview vs Frontend

| Aspekt | Admin Canvas (edytor) | Frontend (localhost:3000) | Zgodność |
|--------|----------------------|--------------------------|----------|
| Renderowanie kart | ✗ Zawsze "No posts found" | ✓ 3 karty widoczne | **Niezgodność — SSR limitation** |
| Dane postów | ✗ Puste | ✓ Poprawne | Niezgodność |
| Warianty (badge w canvas) | ✓ Odświeża się | ✓ Renderuje | Zgodność |
| Responsywność mobile | Nie testowano | ✓ 1 kolumna | N/A |
| Linki CTA | — | ✗ 404 Not Found | **Bug krytyczny (BUG-07)** |
| Format daty | — | ✗ ISO (2026-05-13) | Bug (BUG-08) |
| Obrazy kart | — | ✗ Brak | Bug (BUG-04) |

**Główna przyczyna rozbieżności Admin vs Frontend:**
Admin canvas nie uruchamia SSR resolvera — edytor renderuje widget z `resolved.items = []`. Frontend uruchamia resolver server-side. Jest to ograniczenie architektury (UX-01).

---

## 7. Podsumowanie — macierz priorytetów

### Błędy krytyczne — natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-06 | Session/CSRF token wygasa — utrata danych przy edycji | Auth |
| BUG-07 | "Read more" linki prowadzą do 404 Not Found | Resolver/Routes |

### Błędy wysoki priorytet

| ID | Opis | Obszar |
|----|------|--------|
| BUG-04 | showImage hardkodowane false — brak miniaturek kart | Edytor |
| BUG-05 | imageSrc/imageAlt nie mapowane przez resolver | Resolver |
| BUG-09 | Manual picker 401 — lista postów niedostępna | API/Auth |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Admin canvas zawsze "No posts found" — brak client-side preview |
| UX-03 | Wizard = Visual pod względem treści (brak step-by-step) |
| UX-04 | Wyszukiwarka w manual pickerze |
| UX-05 | Drag-and-drop reorder w manual mode |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Show image / thumbnail cards |
| BF-03 | Wysoki | "View all" link do pełnego listingu |
| BF-06 | Wysoki | Nagłówek sekcji widgetu |
| BF-05 | Średni | Wyświetlanie tagów na kartach |
| BF-02 | Średni | Paginacja / Load more |
| BF-04 | Niski | Filtrowanie po autorze |
| BF-07 | Niski | Filtrowanie po zakresie dat |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy krytyczne | 2 |
| Błędy funkcjonalne (pozostałe) | 7 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 10 |
| Problemy dostępności | 6 |
| **Łącznie** | **33** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `posts-feed-source-latest.png` | Visual editor — tryb Latest posts z zakładkami Wizard/Visual/Advanced |
| `posts-feed-source-category.png` | Source setup — tryb Category z polem filtra (placeholder multi-tag — BUG-03) |
| `posts-feed-source-manual.png` | Source setup — tryb Manual z błędem "Not authenticated" (BUG-09) i widocznym Sort (BUG-01) |
| `posts-feed-layout.png` | Layout and Style — Display toggles + Variant/Columns/Gap |
| `posts-feed-layout-bottom.png` | Layout — CTA label, card background/border + Empty state |
| `posts-feed-empty-state.png` | Empty state sekcja + Runtime payload JSON (Advanced) |
| `posts-feed-advanced-runtime.png` | Advanced — Runtime payload JSON |
| `posts-feed-advanced-top.png` | Advanced — pełny widok od góry |
| `posts-feed-variant-list.png` | Variant=List — historyczny capture sprzed TASK-302; current HEAD pokazuje komunikat zamiast aktywnego wyboru Columns |
| `posts-feed-published.png` | Status PUBLISHED w toolbar |
| `posts-feed-widget-added.png` | Widget w canvas z Wizard edytorem |
| `posts-feed-frontend.png` | Frontend — 3 karty postów (brak obrazów — BUG-04) |
| `posts-feed-preview.png` | Preview mode — identyczny jak frontend |
| `posts-feed-frontend-mobile.png` | Frontend mobile (390px) — 1 kolumna, responsywność ✓ |
| `posts-feed-post-detail.png` | Wynik kliknięcia "Read more" — "Not Found" (BUG-07) |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Posts Feed is classification only. Widget-owned
  follow-up scope continues through the `TASK-277` family.
- Shared truthfulness already fixed at current HEAD is no longer open widget
  scope: `UX-07` columns truthfulness landed through TASK-302 and the
  `posts-feed-variant-list.png` evidence is historical only.
- Shared `ContentListBlock` accessibility residuals are now closed under
  `TASK-320`: date semantics use `<time>` and CTA links expose contextual
  accessible naming.
- Shared editor clear-undo behavior is closed under `TASK-321`; Posts Feed does
  not fork that helper locally.
- Global auth/session expiry remains out of family scope and is now closed by
  the `TASK-322` family; TASK-277-03 still owns only the local picker retry/error UX
  around that platform failure.
- `BF-09` is no longer a missing shared renderer capability. The shared
  `ContentListBlock` already owns bounded image-aspect behavior, and the
  remaining Posts Feed gap is only the local bridge into that contract.
- `A4` should be read as missing Posts Feed tag data, not as a requirement to
  invent tag-link navigation beyond the current shared meta-line/badge contract.

---

## Status po TASK-277 (2026-05-19)

Sekcje 4-9 powyżej pozostają historycznym snapshotem z dnia `2026-05-16`.
Aktualny status każdego findings po implementacji i closure passie:

| Finding | Status @ current HEAD | Owner / evidence |
|---|---|---|
| BUG-01 | `fixed-task-277` | `TASK-277-01`; manual mode hides effective Sort and shows `Order is determined by your selection.` |
| BUG-02 | `fixed-task-277` | `TASK-277-06`; `textColor` is now exposed as a clearable style control. |
| BUG-03 | `fixed-task-277` | `TASK-277-01`; category placeholder now matches the single-keyword resolver contract (`e.g. news`). |
| BUG-04 | `fixed-task-277` | `TASK-277-02`; `fields.showImage` is schema/default/editor/runtime owned end-to-end. |
| BUG-05 | `fixed-task-277` | `TASK-277-02`; runtime items now resolve `imageSrc` / `imageAlt` through the shared media lookup seam. |
| BUG-06 | `fixed-task-322` | `TASK-322-02`; PageEditor now preserves dirty-state awareness and shows shared expired-session guidance instead of generic auth failure text. |
| BUG-07 | `fixed-task-277` | `TASK-277-01`; Posts Feed omits CTA hrefs when no enabled posts detail route exists instead of falling back to `/post/:slug`. |
| BUG-08 | `fixed-task-320` | `TASK-320`; shared `ContentListBlock` now renders readable date copy via semantic `<time dateTime="...">` output. |
| BUG-09 | `fixed-task-322` | `TASK-322-01` and `TASK-322-03`; shared admin client now classifies session expiry and Posts Feed picker/preview consumers render shared expired-session guidance instead of raw auth messaging. |
| UX-01 | `fixed-task-277` | `TASK-277-04`; admin preview now hydrates transient resolved posts through the existing preview-state/dataPatch channel. |
| UX-02 | `fixed-task-277` | `TASK-277-06`; variant choice uses visual cards instead of a bare dropdown. |
| UX-03 | `fixed-task-277` | `TASK-277-06`; Wizard is now progressive (`Source -> Display -> Layout`). |
| UX-04 | `fixed-task-277` | `TASK-277-03`; manual picker has local search over the fetched post catalog. |
| UX-05 | `fixed-task-277` | `TASK-277-03`; selected posts can be reordered with keyboard-accessible Up/Down controls. |
| UX-06 | `fixed-task-277` | `TASK-277-04`; editor shows a readable runtime/preview status card and sync timestamp. |
| UX-07 | `fixed-current-head` | Shared `Columns` truthfulness already landed through `TASK-302`; this report row is historical only. |
| UX-08 | `fixed-task-321` | `TASK-321`; shared clearable inputs now emit bounded undo feedback through the common clear helper instead of widget-local forks. |
| BF-01 | `fixed-task-277` | `TASK-277-02`; Posts Feed can render thumbnail cards from real post media. |
| BF-02 | `fixed-task-277` | `TASK-277-07`; Posts Feed now supports bounded `paged`, cumulative `load-more`, and stable `view-all` behavior. The analogous shared `content-list` legacy residual discovered during implementation is now closed by `TASK-323`. |
| BF-03 | `fixed-task-277` | `TASK-277-05`; optional View All action now resolves from explicit href or the posts list route fallback. |
| BF-04 | `fixed-task-277` | `TASK-277-07`; author filtering now uses existing post summary author ids. |
| BF-05 | `fixed-task-277` | `TASK-277-02`; bounded tag arrays are mapped into runtime cards. |
| BF-06 | `fixed-task-277` | `TASK-277-05`; optional section title/description are now widget-owned fields. |
| BF-07 | `fixed-task-277` | `TASK-277-07`; source date-range filters are normalized and applied before pagination. |
| BF-08 | `fixed-task-277` | `TASK-277-07`; `featuredFirst` is now a first-class source option for non-manual modes. |
| BF-09 | `fixed-task-277` | `TASK-277-06`; Posts Feed exposes the shared `imageAspect` contract. |
| BF-10 | `fixed-task-277` | `TASK-277-05`; bounded motion presets (`none`, `fade`, `slide-up`) are now available. |
| A1 | `fixed-task-320` | `TASK-320`; shared `ContentListBlock` now emits semantic `<time dateTime="...">` output for valid runtime dates. |
| A2 | `fixed-task-277` | `TASK-277-02`; media alt text now resolves into runtime cards. |
| A3 | `fixed-task-320` | `TASK-320`; shared CTA links now expose contextual accessible naming from the CTA label plus the post title. |
| A4 | `fixed-task-277` | `TASK-277-02`; tags are mapped and rendered through the existing shared metadata path; navigational tag-link behavior remains intentionally out of scope. |
| A5 | `fixed-task-277` | `TASK-277-03`; manual picker checkboxes now use post-title labels. |
| A6 | `fixed-task-277` | `TASK-277-03`; loading/error picker feedback is announced through `aria-live`. |

### Closure evidence

- Widget doc: `_docs/_WIDGETS/POSTS_FEED.md` now matches the shipped schema,
  editor, runtime, preview, and pagination contract.
- Preview proof:
  `tests/vitest/ui/page-editor-posts-feed-preview.test.tsx` covers the
  real `PageEditor` preview bridge (`editorContext.previewState` plus
  `previewStatesByBlockId`) and proves preview-only resolved data stays
  transient.
- Runtime/editor proof:
  `tests/unit/widgets/postsFeedWidget.test.tsx`,
  `tests/integration/runtime/posts-feed-runtime-pagination.test.ts`,
  `tests/unit/content/contentMediaResolver.test.ts`,
  `tests/unit/content/contentListResolver.test.ts`,
  and `tests/vitest/ui/posts-feed-editor-wave.test.tsx` cover the final
  widget-local resolver/editor contract.
