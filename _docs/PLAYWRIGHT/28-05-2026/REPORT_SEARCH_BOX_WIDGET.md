# RAPORT: Search Box Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-search-box` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin (UŻYTY, poprawny):** `/admin/pages/b4734a85-b68d-470f-b65d-54ea42f92eaa` (breadcrumb „Contract Test - search-box", status `Published`)
> **Fixture admin (PODANY w zadaniu, NIEDZIAŁAJĄCY):** `/admin/pages/11c2d2c1-8b06-4317-86a8-dd239b6ff74b` — zwraca HTTP 500 / `page_not_found` (patrz sekcja 0)
> **Fixture public:** http://localhost:3000/ctr-search-box-2305
> **Pliki źródłowe:** `core/widgets/core/searchBox.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/widgets/core/listingRuntimeScript.ts` (wstrzykiwany skrypt runtime listing + global search)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-*`, klasy Tailwind, inline `style`,
> `name`/`action`/`method` formularzy, stan `checked`/`defaultChecked`), a nie tylko
> zliczeniem widocznych sekcji. Sekcje 4–8 jasno oddzielają: co działa, co nie
> działa / jest mylące, co faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: w tym audycie weryfikację oparłem **wyłącznie o inspekcję
> DOM** (`eval`) oraz snapshoty struktury — nie zapisywałem zrzutów PNG. Gdyby jakieś
> powstały, ich nazwy byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu
> `.playwright-cli/` (ignorowany przez Git), nie są wymaganym evidence i nie zostały
> dołączone do repo.

> Uwaga o trwałości: świadomie **nie** klikałem „Save draft" ani „Publish", aby nie
> nadpisać współdzielonego fixture. Przy nawigacji z edytora na front pojawił się
> natywny prompt „unsaved changes" — co potwierdza, że moje edycje były niezapisane;
> prompt odrzuciłem bez zapisu. W konsekwencji trwałość/propagacja moich edycji na
> front **nie** była weryfikowana (patrz sekcja 7).

---

## 0. Krytyczna obserwacja infrastrukturalna — niepoprawne ID fixture w zadaniu

Podane w zadaniu ID strony admina **`11c2d2c1-8b06-4317-86a8-dd239b6ff74b` nie istnieje**:

- Wejście na `/admin/pages/11c2d2c1-...` pokazuje breadcrumb **„Homepage"**, baner
  **„Page error — page_not_found"** i renderuje awaryjnie treść strony głównej
  (widgety Hero + Compare Timeline), **nie** search-box.
- Endpoint, z którego korzysta edytor, zwraca **HTTP 500**:
  `GET /admin/api/pages/11c2d2c1-...` → `{"error":{"code":"internal_error","message":"page_not_found"}}`,
  stack: `core/server/routes/pageRoutes.ts:108`. (Drobny niuans backendu:
  „nie znaleziono strony" jest mapowane na **500 internal_error**, a nie na 404 —
  semantycznie to powinien być 404/`not_found`.)

Prawidłowa strona „Contract Test - search-box" (slug `/ctr-search-box-2305`, status
**published**) ma ID **`b4734a85-b68d-470f-b65d-54ea42f92eaa`** — ustalone z listy
`GET /admin/api/pages`. **Cały audyt admina przeprowadziłem na poprawnym ID.**
Slug publiczny `/ctr-search-box-2305` działa niezależnie i był osiągalny.

---

## 1. Przegląd widgetu

**Typ:** `search-box` · **Kategoria:** `content` · **Opis:** „Scoped listing search or global public search widget." · **Warianty:** tylko jeden — `default` („Search input with optional source scoping.").

**Model danych (`SearchBoxData`):**

| Pole | Znaczenie |
|------|-----------|
| `mode` | `listing` \| `global` \| `route-submit` (domyślnie `listing`) |
| `displayMode` | `full` \| `compact` |
| `listingQueryId` | id listing-query (tylko dla `listing`) |
| `title`, `description`, `placeholder`, `submitLabel` | copy widoczne dla odwiedzającego |
| `autoApply` | bool — auto-submit przy wpisywaniu (efektywne tylko dla `listing`) |
| `endpoint` | domyślnie `/api/search` (support-owned, dla `global`) |
| `targetRoute`, `queryParam` | strona wyników + param (tylko `route-submit`; `q` domyślnie) |
| `sources.{pages,entries,posts}` | źródła global search (domyślnie pages+entries=on, posts=off) |
| `style.{frameBackground,frameBorderColor,actionBackground}` | 3 kolory (clearable) |
| `resolved.{query,rejectedTokens,error}` | tylko-do-odczytu stan runtime (diagnostyka) |

**Trzy gałęzie renderera (`SearchBoxBlock`) — kluczowy niuans architektury:**

| Tryb | Co renderuje | Skrypt runtime | Formularz |
|------|--------------|----------------|-----------|
| `listing` **bez** `listingQueryId` | kafel z `border-dashed` i tekstem „Select a listing query in widget settings…" | **brak** | brak |
| `listing` **z** `listingQueryId` | `form[data-listing-runtime-form]`, input `name="lq.{id}.__q"` (token `__q`), `data-listing-auto-apply`, hint auto-apply | **tak** (`getListingRuntimeClientScript`) | runtime (fetch + DOM replace, bez przeładowania) |
| `route-submit` | natywny `form method=get action={targetRoute}`, input `name={queryParam}` | **brak** | natywny GET (nawigacja do strony wyników) |
| `global` | `form[data-global-search-form] action=/api/search`, input `name="q"`, checkboxy `sources`, kontener wyników `[data-global-search-results]` | **tak** | debounce 220 ms, min 2 znaki, fetch `/api/search`, render listy wyników |

**Stan zapisany obu fixture (admin i public) jest identyczny:** `mode=listing`,
**bez** wybranego `listingQueryId`, `displayMode=full` → renderuje się **kafel
placeholder** (`border-dashed`). Tj. domyślnie publiczny fixture **nie pokazuje**
działającego pola wyszukiwania, tylko komunikat „wybierz listing query".

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb
**Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem
**„Run setup again"** (komunikat: *„Setup complete — Daily edits live in Visual.
Advanced is for technical diagnostics."*), a kończy przyciskiem **„Finish setup and
open Visual"**. To ten sam wzorzec co w `team`, `faq-accordion`, `tabs`, `stats-kpi`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | Jedna sekcja **„Search source"**: Select „Search mode" + kontrolki zależne od trybu. Dodatkowo własny blok **„Live preview"** renderujący stan przez wspólny renderer. |
| **Visual** | zakładka „Visual" | „Search Box Variants" (jeden kafel **Default** + „Add variant preset"), **„Search copy"**, **„Search interaction"**, **„Search surface"** + wspólne **Block layout**, **Device visibility**. |
| **Advanced** | zakładka „Advanced" | **W 100% read-only**: „Runtime diagnostics", „Runtime status", „Contract summary" + wspólne „Block layout summary", „Visibility summary". **0 edytowalnych kontrolek, 0 przycisków akcji** (potwierdzone inspekcją). |

**Niuans:** kontrolki w „Search source" (Wizard) są **zależne od wybranego trybu**:
- `listing` → Select **„Listing query"** (lista z `useListingQueries`),
- `global` → tekst informacyjny + 3 przełączniki **„Global search sources"** (Pages/Entries/Posts),
- `route-submit` → pole **„Search results page"** (`LinkDestinationField`) + tekst, że nazwa parametru jest „support-owned".

Analogicznie w Visual przełącznik **„Auto apply on input"** pojawia się **tylko**
gdy `mode=listing`; dla `global`/`route-submit` w tym miejscu jest tekst pomocniczy.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje w sesji `claude-28-05-search-box`, zweryfikowane inspekcją DOM:

- **Wizard / Search mode:** przełączenie wszystkich 3 trybów (listing → global → route-submit → listing) z weryfikacją gałęzi renderera w canvas + Live preview.
- **Wizard / listing:** wybór realnego listing-query („House Projects Catalog Query 517544d2", id `74019e35-…`) → render runtime-formularza.
- **Wizard / global:** odczyt domyślnych źródeł (pages+entries on, posts off), przełączenie **Posts** → on.
- **Wizard / route-submit:** picker **„Search results page"** → wybór „HomePage" (zmiana `targetRoute` + `action`).
- **Visual / copy:** edycja Title, Description, Placeholder, Submit label (live update canvas).
- **Visual / interaction:** Display mode `full`→`compact`; Auto apply `on`→`off`.
- **Visual / surface:** Frame background (swatch `#ff8800` + „Clear"), Action background (swatch `#10b981`).
- **Advanced:** odczyt wszystkich sekcji read-only i porównanie ze stanem mojej sesji; potwierdzenie braku edytowalnych kontrolek.
- **Public (`/ctr-search-box-2305`):** render zapisanego stanu (placeholder), konsola, responsywność 375 px, brak skryptu runtime w gałęzi placeholder.
- **Runtime API (auxiliary):** bezpośrednie `GET /api/search?q=…` (charakterystyka backendu global search).

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard — „Search source"

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Search mode → **Listing runtime search** | wybór | gałąź `listing`; po wybraniu query renderuje runtime-form. ✓ |
| Listing query → realny query | wybór `74019e35-…` | canvas i Live preview przestają być placeholderem: `form[data-listing-runtime-form]`, `data-listing-query-id="74019e35-…"`, input `name="lq.74019e35-….__q"`, `data-listing-token="__q"`, `data-listing-auto-apply="1"`, hint „Search updates automatically as you type." ✓ |
| Search mode → **Global public search** | wybór | gałąź `global`: tekst „Global search uses the built-in public search service…", przełączniki Pages(on)/Entries(on)/Posts(off); canvas renderuje `form[data-global-search-form] action="/api/search"`, input `name="q"`, checkboxy `sources`, kontener wyników z tekstem „Type at least two characters to search across selected sources." ✓ |
| Global sources → **Posts** | toggle on | przełącznik edytora przechodzi w stan `checked` (dane = `posts:true`), a renderer emituje `<input … checked>` (`defaultChecked=true`, atrybut `checked` obecny w markup). ✓ (z niuansem N4 dot. żywego podglądu) |
| Search mode → **Route submit search** | wybór | gałąź `route-submit`: pole „Search results page" + „Clear destination", tekst „…the technical parameter name stays support-owned."; canvas: `data-search-box-mode="route-submit"`, `data-search-target-route="/search"`, `data-search-query-param="q"`, `form method="get" action="/search"`, input `name="q"`, **brak** skryptu runtime (natywny GET). ✓ |
| Search results page (picker) → **HomePage** | wybór | `data-search-target-route="/homepage"` i `form action="/homepage"`. ✓ |

Wizard ma też własny blok **„Live preview"** („Reflects the current Wizard state
through the shared widget renderer.") — odzwierciedla stan na żywo, identycznie jak
canvas (wspólny renderer; w DOM istnieją dwie instancje sekcji `search-box`).

### 4.2 Visual — kontrolki i efekt w canvas

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Title | „Szukaj projektów" | `<p class="font-semibold uppercase">` w formularzu → „Szukaj projektów". ✓ live |
| Description | „Przeszukaj katalog na żywo." | drugi `<p>` zaktualizowany. ✓ live |
| Placeholder | „Wpisz nazwę projektu..." | `input@placeholder`. ✓ live |
| Submit label | „Znajdź" | tekst `button[type=submit]`. ✓ live |
| Display mode | `full`→`compact` | `data-search-box-display-mode="compact"` + wiersz input/przycisk z `flex-nowrap` (zamiast `flex-wrap`). **Patrz N3** — w trybie `listing` to praktycznie cały widoczny efekt. ✓ (z zastrzeżeniem) |
| Auto apply on input | `on`→`off` | `data-listing-auto-apply` `1`→`0`; hint „Search updates automatically as you type." **znika**. ✓ live |
| Frame background (swatch) | `#ff8800` | inline `style` ramki → `background-color: rgb(255,136,0)`; `border-color` pozostaje `var(--color-border)`. ✓ live |
| Frame background → **Clear** | clear | `background-color` **usunięte całkowicie** z inline-style (zostaje tylko `border-color`). ✓ (semantyka „clearable" = transparentność, patrz N6) |
| Action background (swatch) | `#10b981` | `button[type=submit]` inline `style` → `background-color: rgb(16,185,129)`. ✓ live |

„Search Box Variants" zawiera **jeden** kafel **Default** (zaznaczony) + przycisk
„Add variant preset" (wspólny mechanizm presetów — nietestowany, patrz sekcja 7).

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only (**0 inputów/combo/switchy, 0 przycisków akcji**
w panelu — potwierdzone) i **wiernie** odzwierciedlał stan mojej sesji:

- **Runtime diagnostics:** Mode „listing", Listing query „74019e35-4a8f-4a7d-b8eb-f39882157b4d" (**surowe UUID** — support-owned), Search provider „Built-in public search service" (endpoint = default), Results page „Default search results page", Search term routing „Standard search term routing". ✓
- **Runtime status:** Last visitor query „No query captured", Ignored filters „No ignored tokens", Runtime health „No runtime errors reported" (stan nominalny — `resolved.*` puste). ✓
- **Contract summary:** „Built-in endpoints, query keys, and runtime state are support-owned implementation details." ✓
- W przeciwieństwie do edytora Contact, Advanced search-box **nie** ma przycisku „Apply normalization" ani snapshotu JSON — to czyste podsumowania.

**Spójność stanu:** po ustawieniu w Wizard `route-submit` + „/homepage", a następnie
powrocie na `listing`, Advanced pokazał „Results page: **Default** search results
page" — co potwierdza, że normalizacja **odrzuca** `targetRoute`/`queryParam` poza
trybem `route-submit` (są częścią payloadu tylko gdy `mode==="route-submit"`). To
poprawne zachowanie kontraktu, ale warto je znać (patrz N7).

### 4.4 Frontend (public `/ctr-search-box-2305`)

Strona zwraca tytuł „Contract Test - search-box" i renderuje **zapisany** stan:
`mode=listing`, **bez** query → **kafel placeholder** (`border-dashed`,
„Select a listing query in widget settings to enable scoped listing search.").

- `data-search-box-display-mode="full"`, `data-listing-block-id="blk-1"`, `data-listing-query-id=""`. ✓
- **Brak formularza** i **brak wstrzykniętego skryptu runtime** w gałęzi placeholder (poprawnie — skrypt jest tylko w gałęzi z query / global). ✓
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓

### 4.5 Runtime global search — endpoint (auxiliary)

Bezpośredni `GET /api/search` (to endpoint, który wołałby skrypt klienta w trybie `global`):
- `?q=ab` → **200 JSON**, `items[]` z pól pages+entries (gdy brak param `sources`, backend domyślnie używa wszystkich trzech źródeł). ✓
- `?q=house&sources=pages,entries` → **200 JSON**, `sources:["pages","entries"]`, `items:[]` (brak dopasowania). ✓

Backend global search jest sprawny i respektuje parametr `sources`. (To charakterystyka
endpointu — nie jest to test żywego skryptu widgetu, patrz sekcja 7.)

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Niepoprawne ID fixture w zadaniu** | infrastruktura | Podane ID `11c2d2c1-…` zwraca **HTTP 500 / page_not_found** (`pageRoutes.ts:108`), a edytor pokazuje awaryjnie Homepage z banerem błędu. Poprawne ID to `b4734a85-…`. Dodatkowo „page not found" jest serwowane jako **500 internal_error**, a powinno być **404** (drobny defekt semantyki HTTP). |
| **N2 — Publiczny fixture NIGDY nie pokazuje działającego wyszukiwania** | dane fixture / front | Zapisany stan to `listing` **bez** query → na `/ctr-search-box-2305` widać wyłącznie kafel „wybierz listing query". Realne pole wyszukiwania, skrypt runtime i wyniki **nie są demonstrowane publicznie** dla tego fixture. Działanie formularzy zweryfikowałem strukturalnie w canvas admina (po wybraniu query/trybu), ale **end-to-end na froncie nie było wykonalne** bez zapisu zmian. |
| **N3 — `displayMode: compact` jest niemal bezczynne w trybie `listing`** | renderer | W gałęzi `listing` renderer **na sztywno** używa `max-w-4xl` (linia ~331) i `grid gap-3` — `compact` zmienia jedynie `flex-wrap`→`flex-nowrap` w wierszu input+przycisk oraz atrybut `data-*`. Dokumentowane „zwężenie" (`max-w-3xl`) i ciaśniejszy `space-y-2` (`shellGapClass`) **stosują się tylko** do gałęzi `global`/`route-submit` (potwierdzone z kodu). Efekt: autor domyślnego (listing) widgetu wybierając „compact" widzi prawie żadną zmianę — **mylące**. |
| **N4 — Podgląd checkboxów `sources` nie odświeża „ptaszka" do reloadu** | canvas/preview | Toggle **Posts** poprawnie aktualizuje dane (przełącznik edytora = `checked`) i **emitowany markup** (`defaultChecked=true`, atrybut `checked` obecny → świeży render byłby zaznaczony). Jednak **żywa właściwość `.checked`** już zamontowanego checkboxa w canvas/preview pozostaje `false` do przeładowania (input niekontrolowany — React nie nadpisuje `defaultChecked` na istniejącym węźle). Dane i HTML są poprawne; jedynie żywy podgląd „pozostaje w tyle". Niski priorytet. |
| **N5 — Brak dostępnej nazwy sekcji i etykiety pola wyszukiwania (a11y)** | renderer / dostępność (front i admin) | We **wszystkich** gałęziach `<section>` widgetu nie ma `aria-label`/`aria-labelledby` (potwierdzone na froncie: `aria-label = null`). Tytuł renderuje się jako stylizowany `<p class="uppercase">`, **nie** jako nagłówek (`<h2/h3>`). Pole `<input>` ma tylko `placeholder` — **brak** `<label>`, `aria-label`, `id`. Dla czytników ekranu: brak nazwanego landmarku i brak dostępnej nazwy pola wyszukiwania. |
| **N6 — „Clear" koloru = transparentność, nie kolor motywu** | Visual / colors | „Clear" na Frame background usuwa inline `background-color` całkowicie (ramka staje się przezroczysta), zamiast wracać do wartości domyślnej `color-mix(... var(--color-bg) …)`. Zgodne z semantyką „clearable", lecz subtelnie mylące (to samo zachowanie co w team/contact/faq). |
| **N7 — Domyślne kolory pokazywane jako „Saved custom color"** | Visual / surface | Trzy swatch'e startowo pokazują fallbacki `#ffffff` / `#d4d4d8` / `#2563eb` i badge **„Saved custom color"**, mimo że to wartości domyślne (realne defaulty to `color-mix(...)`, `var(--color-border)`, `var(--color-primary)` — których natywny `input[type=color]` nie potrafi sparsować). Komunikat „custom" sugeruje edycję, której nie było. Drobne, ale mylące. |
| **N8 — `targetRoute`/`queryParam` znikają poza `route-submit`** | normalizacja | Ustawienie strony wyników w `route-submit`, a potem zmiana trybu na `listing`/`global` **kasuje** tę wartość z payloadu (Advanced wraca do „Default search results page"). Poprawne wg kontraktu, ale autor może być zaskoczony utratą konfiguracji po zmianie trybu. |

**Nie wykryto** żadnych błędów konsoli (admin i front: 0/0 poza infem React DevTools),
żadnego twardego buga renderowania ani rozjazdu między rendererem admin↔front. Wszystkie
przetestowane kontrolki Wizard i Visual **działają i aktualizują podgląd na żywo**
(z zastrzeżeniem N3/N4); Advanced jest w pełni read-only i wiernie podsumowuje stan;
front jest wolny od overflow i błędów.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas (moja sesja) | Frontend (`/ctr-search-box-2305`) | Zgodność |
|--------|---------------------------|-----------------------------------|----------|
| Wspólny renderer `SearchBoxBlock` | ✓ żywy, live wg edycji | ✓ ten sam, wg stanu zapisanego | ✓ |
| Stan zapisany | (wyjściowo) `listing` bez query | `listing` bez query | ✓ identyczny |
| Render placeholder (`border-dashed`) | ✓ (stan wyjściowy) | ✓ | ✓ |
| Runtime-form `listing` (po wybraniu query) | ✓ (moja niezapisana edycja) | ✗ brak (fixture bez query) | ⚠ różnica wynika z danych, nie z kodu |
| Skrypt runtime w gałęzi placeholder | brak | brak | ✓ |
| `aria-label` na `<section>` | brak | brak (`null`) | ✓ (oba bez nazwy — N5) |
| Konsola | 0/0 | 0/0 | ✓ |
| Moje niezapisane edycje (mode/query/copy/kolory) | widoczne w sesji | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i spójny. Jedyna różnica admin↔front to **dane**:
w canvas widziałem swoje niezapisane edycje (m.in. wybrane query → działający
formularz), a front pokazuje swój zapisany stan (placeholder bez query). Brak
rozbieżności na poziomie kodu.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** zapisywałem (odrzuciłem prompt „unsaved
  changes" przy wyjściu z edytora). Trwałość moich edycji i ich propagacja na front
  **nie** zostały zweryfikowane. Zweryfikowana została spójność w obrębie sesji
  (Visual/Wizard → Advanced wiernie podsumowuje) oraz izolacja (front = własny stan zapisany).
- **End-to-end runtime na froncie:** fixture publiczny nie ma query, więc **nie**
  wpisywałem zapytań do żywego formularza listing/global na froncie i **nie**
  uruchomiłem debounced skryptu klienta renderującego wyniki w DOM. Zweryfikowałem
  jedynie sam endpoint `GET /api/search` (zwraca 200 + wyniki) oraz **strukturę**
  formularzy w canvas admina (atrybuty, `name`, `action`, skrypt obecny/nieobecny).
- **Listing runtime live (fetch + DOM replace):** mechanika podmiany bloków bez
  przeładowania (`replaceListingBlocksFromHtml`, auto-apply przy `change`) — opisana
  z kodu, **nie** uruchomiona na żywo (brak query w fixture, brak zapisu).
- **`route-submit`/`global` + `compact`:** różnica `max-w-3xl` / `shellGapClass` /
  ukrywanie opisu przy `compact` w tych gałęziach — **z kodu**, nie re-testowana na
  żywo (na żywo testowałem `compact` tylko w `listing`).
- **Frame border color (swatch):** potwierdziłem obecność kontrolki + „Clear";
  samej wartości nie zmieniałem pickerem (ten sam `SharedColorControl`, co
  przetestowane Frame background i Action background).
- **„Add variant preset":** zapis/zastosowanie presetu nie testowane (jeden wariant
  Default; mechanizm presetów współdzielony).
- **Stany błędu/odrzuconych tokenów runtime** (`resolved.error`, `resolved.rejectedTokens`):
  widziałem tylko stan nominalny w Advanced; nie wstrzykiwałem stanu runtime.
- **Wspólne sekcje wrappera (Block layout, Device visibility):** poza zakresem audytu
  search-box; nie modyfikowałem.

---

## 8. Podsumowanie

- **Search Box jest w dobrym stanie funkcjonalnym w warstwie edytora.** Wszystkie
  przetestowane kontrolki Wizard (3 tryby: listing/global/route-submit, wybór
  listing-query, przełączniki źródeł global, picker strony wyników) oraz Visual
  (title/description/placeholder/submit, display mode, auto-apply, 2 z 3 kolorów +
  „Clear") **działają i aktualizują podgląd na żywo**. Advanced jest w 100% read-only
  i wiernie podsumowuje stan. Renderer ma trzy poprawnie rozdzielone gałęzie
  (placeholder / listing-runtime / route-submit / global) i wstrzykuje skrypt runtime
  tylko tam, gdzie jest potrzebny.
- **Najważniejsze realne znaleziska:**
  - **N1** — podane w zadaniu ID fixture jest błędne (HTTP 500/`page_not_found`);
    audyt wykonano na poprawnym ID `b4734a85-…`. Dodatkowo „not found" jest zwracane
    jako 500 zamiast 404.
  - **N2** — publiczny fixture (listing bez query) pokazuje wyłącznie placeholder;
    realne wyszukiwanie nie jest demonstrowane na froncie.
  - **N3** — `displayMode: compact` jest niemal bezczynne w domyślnym trybie `listing`
    (tylko `flex-nowrap` + atrybut), co jest mylące względem nazwy opcji.
- **Drobniejsze niuanse:** podgląd checkboxów `sources` nie odświeża „ptaszka" do
  reloadu (N4, dane/markup poprawne); brak `aria-label` sekcji i etykiety pola
  wyszukiwania, tytuł jako `<p>` zamiast nagłówka (N5, a11y); „Clear" koloru = transparentność
  (N6); domyślne kolory oznaczone jako „Saved custom color" (N7); `targetRoute`/`queryParam`
  znikają po zmianie trybu (N8, zgodne z kontraktem).
- **Plus względem innych widgetów:** czysta konsola (0/0 admin i front), brak overflow
  na 375 px, spójny renderer admin↔front, sprawny endpoint global search `/api/search`,
  bezpieczne `targetRoute`/`queryParam` (walidacja w `resolveTargetRoute`/`resolveQueryParam`
  — odrzuca ścieżki `/api/…` i niepoprawne nazwy paramów do bezpiecznych domyślnych).
- Nie znaleziono żadnego twardego buga renderowania ani rozbieżności admin↔front na
  poziomie kodu — jedyna różnica wynika z **danych** (front = zapisany placeholder bez
  query; canvas = moje niezapisane edycje z wybranym query).

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`) oraz snapshoty struktury (YAML w `.playwright-cli/`, katalog ignorowany
> przez Git). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń,
> nie są wymaganym evidence i nie zostały dołączone do repo.
