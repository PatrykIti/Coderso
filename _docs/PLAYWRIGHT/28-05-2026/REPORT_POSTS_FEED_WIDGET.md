# RAPORT: Posts Feed Widget — domknięcie luk audytu (featured / media / motion / pagination / route / kolory)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-posts-feed-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Pliki źródłowe:** `core/widgets/core/postsFeed.tsx` (typy + normalizacja + mapowanie na Content List + wrapper animacji) · `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (edytory Wizard/Visual/Advanced + preview bridge) · renderer delegowany do `core/widgets/core/contentList.tsx` (`ContentListBlock`)

---

## 0. WAŻNE: rozjazd przydzielonego fixture (blokada środowiskowa)

Zadanie wskazywało dla widgetu **posts-feed** następujące namiary, które **nie odpowiadają temu widgetowi**:

| Przydzielono w zadaniu | Co faktycznie jest pod tym adresem | Dowód |
|------------------------|-----------------------------------|-------|
| Admin page id `f9435704-9702-45f5-92b1-22711c7fb0ad` | Strona **`/ctr-listing-filters-2305`**, tytuł **„Contract Test - listing-filters"**, status `draft`. Na kanwie jeden blok `blk-1` typu **Listing Filters** (selected widget = „Listing Filters"). **Brak jakiegokolwiek bloku posts-feed.** | API `/admin/api/pages` (id→slug→title), breadcrumb, inspekcja kanwy (`data-block-id="blk-1"`, 0 elementów `data-content-list-*`). |
| Public route `http://localhost:3000/test-posts-feed-0516` | **HTTP `404` / „Not Found"** — **strona o tym slugu nie istnieje** wśród 88 stron katalogu. Istnieje cała rodzina `test-*-0516` (stack, content-list, tabs, accordion, …), ale **pozycji `test-posts-feed-0516` w niej brak**. | `curl` → `404`; nawigacja w przeglądarce → „Not Found"; pełne zapytanie `/admin/api/pages` (filtr po `0516` i `posts`). |

**Decyzja audytowa:** ponieważ przydzielony fixture dotyczy innego widgetu, a podany route publiczny nie istnieje, audyt posts-feed wykonano na **realnie istniejących** fixture'ach posts-feed:

- **Admin + interakcje:** opublikowana strona **`/posts-feed-test-page`** — `a5555d60-0a32-4012-815f-12fea47cea94`, status `published`, na kanwie blok posts-feed `id=3cc94e9a-5873-4373-a038-5286173eda8b`, wariant `cards`. To ten sam fixture, na którym opierał się poprzedni audyt z 28-05, więc „re-audyt od zera" jest z nim spójny.
- **Frontend:** publiczny route **`/posts-feed-test-page`** (HTTP `200`).
- Istnieje też kontraktowy **`/ctr-posts-feed-2305`** (`160c954b-…`), ale jest w stanie `draft` → front zwraca `404`, więc nie nadaje się do weryfikacji frontu.

> Wniosek poboczny (środowiskowy, nie bug widgetu): rodzina audytowa `*-0516` **nie zawiera** strony dla posts-feed — odpowiednik `test-posts-feed-0516` najprawdopodobniej nigdy nie powstał.

> **Status TASK-343-19 (2026-05-30):** aktualny
> `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` wskazuje Posts Feed na
> `/posts-feed-test-page` jako admin/public fixture. Nie było potrzeby
> naprawiać fixture'a; dodano test regresyjny, który blokuje powrót do
> historycznego `ctr-listing-filters-2305` albo nieistniejącego
> `/test-posts-feed-0516`.

---

## 1. Metodyka i uczciwe zastrzeżenia

- Weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`): atrybuty `data-content-list-*`, `data-posts-feed-motion`, klasy grid/gap, inline `style` kart, `<a href>` paginacji i kart, ARIA sekcji, wstrzykiwany `<style>` animacji oraz read-only tekst panelu Advanced. **Nie zapisywałem zrzutów PNG** (patrz sekcja 9).
- **Nie klikałem „Save draft" ani „Publish"** — żeby nie modyfikować współdzielonego, opublikowanego fixture. Wszystkie zmiany były niezapisanymi edycjami sesji. W zamian zweryfikowałem **izolację** (front pokazuje stan zapisany, nie moje edycje) oraz **spójność w obrębie sesji** (Visual ↔ Advanced ↔ Wizard).
- Audyt celowo skupiony na **rodzinach luk** zleconych w zadaniu: **featured, media, motion, pagination/view-all, route/link, kolory/clear**. Rodziny już domknięte we wcześniejszym audycie (category, author, manual picker, sort, limit, nagłówek sekcji, warianty) nie były ponownie przeklikiwane.

**Stan katalogu (kontekst, który determinuje testowalność):**

| Element | Stan |
|--------|------|
| Posty opublikowane | **3** (autor: Patryk): „QA Deep Test 2026-04-30" (brak tagów, brak mediów), „Deep Post Test 2026-04-26" (tagi `qa-tag`, `deep-test`, `2026`; excerpt z polskimi znakami; brak mediów), „Test Post 2026-04-25" (brak tagów, brak mediów). |
| Posty **featured** | **0** (żaden post nie ma flagi/tagu featured). |
| Media przypięte do postów | **0** (biblioteka mediów ma **5 plików PNG**, ale **żaden post nie referuje obrazu**). |
| Trasa listy postów (site content route) | **brak** — Advanced trwale raportuje „No list route resolved". |

---

## 2. Zakres faktycznie przeklikany (rodziny luk)

Wszystko w sesji `claude-29-05-posts-feed-gap-close`, blok `3cc94e9a-…` na `/posts-feed-test-page`:

- **Featured:** `source.mode=featured` (canvas + Advanced + Runtime status); `featuredFirst` toggle (on w trybie latest); weryfikacja ukrycia toggla w trybie featured.
- **Media:** `fields.showImage` on/off; `style.imageAspect` Standard→Wide; zliczanie `<img>` na kartach.
- **Motion:** `none` / `fade` / `slide-up` + guard `prefers-reduced-motion`.
- **Pagination/view-all:** wszystkie 4 tryby (`none`/`paged`/`load-more`/`view-all`); `pageSize=2`; etykieta load-more; etykieta view-all; picker celu (LinkDestinationField) + „Clear destination".
- **Route/link:** klikalność tytułów i CTA na kanwie i froncie; „Route capability" w Advanced.
- **Kolory/clear:** wszystkie 3 pola (`backgroundColor`/`borderColor`/`textColor`) — ustawienie hex + „Clear".
- **Advanced:** read-only fidelity + brak edytowalnych kontrolek.
- **Frontend:** render zapisanego stanu, ARIA, konsola, responsywność 375 px, izolacja.

---

## 3. CO DZIAŁA — szczegóły z dowodem DOM

### 3.1 Motion (w pełni zweryfikowane — najczystsza domknięta luka)

| Wybór | Efekt w DOM |
|-------|-------------|
| `none` | **0** wrapperów `data-posts-feed-motion`; **0** wstrzykniętych `<style>` z `posts-feed-fade-in`. ✓ |
| `fade` | Wrapper `data-posts-feed-motion="fade"` + `<style>` z keyframes `posts-feed-fade-in`. ✓ |
| `slide-up` | Wrapper `data-posts-feed-motion="slide-up"` + `<style>` z keyframes `posts-feed-slide-up`. ✓ |
| guard | W obu animowanych trybach wstrzyknięty `<style>` zawiera regułę `@media (prefers-reduced-motion: reduce)` celującą w `posts-feed`. ✓ |

Przełączanie z powrotem na `none` poprawnie **usuwa** wrapper i wstrzyknięty `<style>`.

### 3.2 Pagination / view-all (w pełni zweryfikowane)

| Tryb / kontrolka | Test | Efekt w DOM |
|------------------|------|-------------|
| `paged` + `pageSize=2` | wybór | `data-content-list-items=2`; nav **„Previous · Page 1 of 2 · Next"**; link „Next" → `?cl.3cc94e9a-….page=2` (na stronie 1 tylko „Next" jest `<a>`, „Previous" nieaktywne). ✓ |
| `load-more` + etykieta | „Pokaż więcej" | link **„Pokaż więcej"** → `?cl.3cc94e9a-….page=2`; etykieta aktualizowana live. ✓ |
| `view-all` — label pola | — | etykieta liczby zmienia się z **„Page size" → „Initial items"** (warunkowe nazewnictwo). ✓ |
| `view-all` — „View all label" | „Zobacz wszystkie wpisy" | tekst linku aktualizowany live. ✓ |
| `view-all` — destination picker | „HomePage" | renderuje link **„Zobacz wszystkie wpisy" → `/homepage`**. ✓ |
| `view-all` — „Clear destination" | klik | usuwa cel → link **znika** (powrót do „Use posts list route"). ✓ |

### 3.3 Featured — kontrolka i diagnostyka działają (filtr nie do potwierdzenia, patrz 5)

| Kontrolka | Test | Efekt w DOM |
|-----------|------|-------------|
| `source.mode → Featured posts` | wybór | Canvas i live preview przechodzą w `data-content-list-items=0`, `state=empty`, renderują empty state („No posts found …"). Advanced „Source mode: Featured posts"; Runtime status **„Preview sync resolved 0 items from featured."** ✓ (kontrolka + rozwiązanie zapytania działają) |
| `featuredFirst` (tryb latest) | toggle on | `aria-checked=true`; Advanced „Source filters: **Featured first**". ✓ |
| ukrycie `featuredFirst` w trybie featured | — | W trybie `featured` switch **„Featured posts first" znika** (zgodnie z kodem `showFeaturedFirst = latest || category`). ✓ |

### 3.4 Kolory (ustawianie — w pełni działa)

| Pole | Test | Inline `style` karty |
|------|------|----------------------|
| Card background | swatch `#ff0000` | `background-color: rgb(255, 0, 0)` ✓ |
| Card border | swatch `#00ff00` | `border-color: rgb(0, 255, 0)` ✓ |
| Text color | swatch `#0000ff` | `color: rgb(0, 0, 255)` ✓ |

(Wszystkie trzy nakładają się jednocześnie na tej samej karcie — potwierdzone łącznym odczytem `style`.)

### 3.5 Media (poziom konfiguracji działa)

| Kontrolka | Test | Efekt |
|-----------|------|-------|
| Show image | toggle on | `aria-checked=true` (stan zapisany w danych). ✓ konfiguracyjnie |
| Image aspect | Standard → **Wide** | combobox aktualizuje się na „Wide". ✓ konfiguracyjnie |

> Efekt **wizualny** mediów — patrz sekcja 5 (nie do zweryfikowania bez postów z grafiką).

### 3.6 Advanced (read-only, wierne odbicie)

- **0** kontrolek edytowalnych w panelu Advanced (`input`/`textarea`/`[role=switch]`/`[role=combobox]` = 0). ✓
- W stanie `latest`: „Source mode: Latest posts", „Sort: published-desc", „Source filters: No filters", „Manual posts: None", „Pagination mode: none", „Runtime pagination: page 1 of 1, page size 6", **„Route capability: No list route resolved"**, „Resolved items: 3"; Runtime status „**Preview sync resolved 3 items from latest.**" + żywy timestamp „Last synced: May 29, 2026, 05:30 PM". ✓ wiernie

---

## 4. CO NIE DZIAŁA / BŁĘDY

- **Twardych bugów renderowania nie wykryto.** Żadna z testowanych kontrolek nie wywołała crashu, błędu konsoli ani martwego stanu. Front: **0 błędów / 0 ostrzeżeń** konsoli.
- Najpoważniejsze **realne ograniczenie funkcjonalne** (zależne od konfiguracji witryny, nie błąd renderera) to **brak klikalności kart** — patrz sekcja 6 (route/link).
- Pozostałe rozbieżności mają charakter **niuansów UX/diagnostyki** (sekcja 7), nie awarii.

---

## 5. CZEGO NIE DA SIĘ W PEŁNI ZWERYFIKOWAĆ — z nazwą kontrolki i powodem

| Kontrolka | Powód blokady |
|-----------|---------------|
| **`source.mode = Featured posts` (rzeczywiste filtrowanie featured)** | Katalog ma **0 postów featured**. Tryb wykonuje się i zwraca **0 wyników → empty state**; nie da się potwierdzić, że zwróciłby *wyłącznie* posty featured, bo nie ma na czym. |
| **`source.featuredFirst` (efekt sortowania)** | Brak postów featured → toggle nie ma czego wynieść na górę; potwierdzono jedynie `aria-checked` i odbicie w Advanced, **nie zmianę kolejności**. |
| **`fields.showImage` (render `<img>`)** | 3 posty **nie mają przypiętych mediów** (biblioteka ma 5 PNG, ale żaden post ich nie referuje). Po włączeniu — **0 `<img>`** na kartach. |
| **`style.imageAspect` (klasy proporcji obrazu)** | j.w. — bez wyrenderowanego `<img>` nie ma na czym sprawdzić proporcji; potwierdzono tylko zmianę wartości w combobox. |
| **Nawigacja paginacji „na froncie" (faktyczne wczytanie strony 2)** | Zapisany fixture frontu ma `pagination.mode=none`, więc na froncie **nie renderuje się pager**. Weryfikacja realnego skoku na `?cl.<blockId>.page=2` wymagałaby **zapisu** konfiguracji `paged`/`load-more`, czego świadomie nie robiłem. W adminie potwierdzono jedynie **strukturę hrefów**. |
| **Walidacja nieprawidłowej daty (`resolveInvalidDateNotice`)** | Pola dat to natywne `type=date` — UI nie pozwala wpisać błędnej wartości; ścieżka ostrzeżenia dotyczy danych spoza edytora. |
| **Twarde limity** (`limit=24`, `pageSize=24`, `manualPostIds=64`) | Nie dochodziłem do granic — testy w zakresie roboczym (2, 6). |
| **Persistencja (Save/Publish)** | Świadomie pominięta, by nie mutować współdzielonego fixture (zweryfikowano izolację zamiast trwałości). |

---

## 6. Route / link — najważniejsze realne znalezisko

- **Kanwa (admin):** przed TASK-343-19 w widgetcie było **0 elementów `<a>`** bez jasnej noty; tytuły renderowały się jako `<h3>` (zwykły tekst), a CTA „Read more" jako `<span>` (nie w `<a>`).
- **Front (`/posts-feed-test-page`):** identycznie — **0 `<a>`** w widgetcie.
- **Przyczyna:** Advanced „**Route capability: No list route resolved**" — dla tej witryny nie rozwiązuje się trasa listy/detali postów, więc elementy nie dostają `href`, a CTA renderuje się jako link tylko gdy `href` istnieje.
- **Skutek przed TASK-343-19:** feed był **nienawigowalny** w tym fixture (zarówno w adminie, jak i na froncie — to **nie** rozjazd admin↔front, lecz wspólny skutek braku trasy), ale użytkownik nie dostawał wystarczającego wyjaśnienia w miejscu renderu.
- **Status po TASK-343-19:** brak trasy pozostaje prawdziwym stanem konfiguracji, ale nie jest już niemy. Karty bez `href` renderują `data-content-list-link-unavailable` i tekst „Links unavailable until a detail route is configured.", disabled CTA ma `data-content-list-cta-disabled="missing-route"`, Visual pokazuje `data-posts-feed-route-guidance="cards"`, a Advanced mówi wprost, że karty i CTA renderują się jako non-links bez post route.

---

## 7. Niuanse UX/UI (potwierdzone interakcją)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **U1 — „Clear" kolorów jest ASYMETRYCZNE** | Visual / kolory | Po ustawieniu 3 kolorów i kliknięciu „Clear" na każdym, inline `style` karty = **`color: var(--color-text);`** (bez `background-color` i bez `border-color`). Czyli: **Clear tła** → usuwa `background-color` całkowicie (karta przezroczysta); **Clear obramowania** → usuwa `border-color` całkowicie; **Clear tekstu** → **wraca do tokenu `var(--color-text)`**, a nie do „braku". Źródło w `mapPostsFeedToContentListData`: `textColor: normalized.style?.textColor ?? contentListDefaults.style?.textColor` (fallback tylko dla tekstu; `backgroundColor`/`borderColor` mapują się na `undefined` bez fallbacku). To **uściśla/koryguje** wcześniejszą notkę N3 (która twierdziła, że wszystkie 3 „Clear" dają jednakową przezroczystość). |
| **U2 — Status po TASK-343-19: Link „View all" nie znika już cicho bez celu** | Visual / pagination | Przy domyślnym „Use posts list route" i braku rozwiązanej trasy renderer pokazuje disabled state `data-content-list-view-all-unavailable`, a Visual pokazuje `data-posts-feed-route-guidance="view-all"`. Po wskazaniu strony link nadal renderuje się poprawnie. Jeśli wszystkie posty mieszczą się w `Initial items`, Visual wyjaśnia, że akcja może być redundantna. |
| **U3 — `featuredFirst` „pamiętany", ale bez widocznej kontrolki w trybie featured** | Wizard / Advanced | Toggle „Featured posts first" jest ukryty w trybie `featured` (kontrolka tylko dla latest/category), lecz wartość `featuredFirst=true` zostaje w danych i **Advanced dalej raportuje „Source filters: Featured first"** — ustawienie wpływa na diagnostykę, choć nie ma go czym zmienić w bieżącym trybie. |
| **U4 — „View all destination" to picker stron, bez pola dowolnego URL** | Visual / pagination | `LinkDestinationField` oferuje **combobox opublikowanych stron + „Clear destination"** — **brak** pola na ręczny, dowolny URL (np. zewnętrzny). To domyka wcześniejsze „nie testowane: własny URL": w tym widgetcie taka ścieżka po prostu **nie istnieje w UI**. |
| **U5 — Dwa liczniki: „Initial item count" (Wizard, `source.limit`) vs „Page size"/„Initial items" (Visual, `pagination.pageSize`)** | Wizard + Visual | Dwa odrębne pola 1–24 bez wyjaśniającego powiązania w UI; etykieta tego drugiego zmienia się na „Initial items" tylko w trybie view-all. Potencjalne zamieszanie, które rządzi początkowym renderem. |

---

## 8. Frontend (`/posts-feed-test-page`, HTTP `200`)

Render **zapisanego** stanu fixture:

- Wariant `cards`, `data-content-list-items=3`, `state=ready`; wrapper `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` (columns=3, gap=md). ✓
- 3 posty w kolejności `published-desc` (QA Deep Test → Deep Post Test → Test Post). ✓
- Brak nagłówka → sekcja ma fallback **`aria-label="Content list"`** (`aria-labelledby=null`). ✓
- `showImage=false` + brak mediów → **0** `<img>`; `motion=none` → **0** wrapperów animacji; `pagination=none` → brak nav. ✓
- Karty **bez `<a>`** przy braku trasy — spójne z sekcją 6; po TASK-343-19
  ten stan ma widoczne `data-content-list-link-unavailable`/disabled CTA
  wyjaśnienie. ✓
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka zwija się do **jednej** kolumny (`grid-template-columns: 343px`). ✓
- **Izolacja:** moje niezapisane edycje w adminie (kolory, motion fade/slide-up, paged/load-more/view-all, image aspect) **NIE wyciekły** na front — front pokazuje wyłącznie stan zapisany. ✓

---

## 9. Podsumowanie

- **Rodziny luk domknięte:** **motion** (none/fade/slide-up + guard reduced-motion) i **pagination/view-all** (paged + hrefy, load-more + etykieta, view-all + label + picker celu + Clear destination) działają w pełni i są zweryfikowane w DOM. **Kolory** ustawiają się poprawnie (3/3); ich **„Clear" jest asymetryczne** (U1) — to nowe, kodowo potwierdzone uściślenie. **Featured** i **media** działają na poziomie konfiguracji i rozwiązania zapytania, ale ich **efekt merytoryczny jest nieweryfikowalny** z powodu stanu katalogu (0 postów featured, 0 mediów przy postach) — sekcja 5 nazywa dokładne kontrolki i powody. **Route/link**: karty są **nienawigowalne** (brak rozwiązanej trasy postów) — sekcja 6, identycznie w adminie i na froncie.
- **Brak twardych bugów:** żadnego błędu konsoli (front 0/0), żadnego crashu kontrolek, żadnego rozjazdu admin↔front w zakresie wspólnie testowanych opcji. Advanced jest w 100% read-only i wiernie odbija stan (łącznie z żywym timestampem i runtime paginacji).
- **Blokada środowiskowa (sekcja 0):** przydzielony `f9435704-…` był stroną **listing-filters**, a route `/test-posts-feed-0516` **nie istnieje (404)**. TASK-343-19 potwierdził, że bieżący smoke inventory wskazuje już `/posts-feed-test-page`, oraz dodał regresję blokującą powrót starego przydziału.
- **Route/link po TASK-343-19:** brak trasy listy/detali nadal oznacza brak linków, ale karty, CTA, View all, Visual i Advanced pokazują jawne wyjaśnienie zamiast cichego znikania akcji.

---

## 10. Screenshoty (etykiety wyłącznie lokalne)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami**
> przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym
> evidence i nie zostały dołączone do repo.
