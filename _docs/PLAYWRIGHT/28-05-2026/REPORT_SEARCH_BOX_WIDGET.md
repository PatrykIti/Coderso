# RAPORT: Search Box Widget — audyt bieżącego stanu (UX/UI + weryfikacja działania)

> **Status:** Zakończony (re-audyt domykający luki po pierwszej fali)
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-search-box-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixture):** `Contract Test - search-box` (ID: `b4734a85-b68d-470f-b65d-54ea42f92eaa`, status `Published`)
> **Trasa publiczna:** http://localhost:3000/ctr-search-box-2305
> **Pliki źródłowe:** `core/widgets/core/searchBox.tsx` (renderer `SearchBoxBlock` + typy + normalizacja) · `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolka koloru) · `core/admin/ui/widgets/editors/LinkDestinationField.tsx` (page-picker) · `core/widgets/core/listingRuntimeScript.ts` (wstrzykiwany skrypt runtime)

> **Uwaga o zrzutach:** w tej sesji **nie zapisywano ani nie commitowano** żadnych
> plików PNG. Całą weryfikację oparłem o inspekcję DOM/CSS podglądu (`eval`) oraz
> snapshoty struktury (YAML w `.playwright-cli/`, katalog ignorowany przez Git).
> Gdyby powstały jakieś przechwycenia, ich nazwy (np. `search-box-public-mobile-375`)
> byłyby **wyłącznie lokalnymi etykietami** stanu przeglądarki — nie są wymaganym
> evidence ani plikiem w repo.

> **Uwaga o zakresie:** raport opisuje **stan faktyczny zaobserwowany w UI** w dniu
> testu. Każdą interakcję potwierdzono inspekcją DOM (atrybuty `data-*`, klasy
> Tailwind, inline `style`, `name`/`action`/`method` formularzy, stan
> `defaultChecked`/`checked`), a nie tylko zliczeniem widocznych sekcji. Sekcje
> rozdzielają: (4) co przetestowano i DZIAŁA, (5) czego NIE da się w pełni
> zweryfikować w tym fixture/środowisku (z dokładną przyczyną), (6) front, (8)
> niuanse UX/UI, (9) błędy.

> **Domknięte luki z poprzedniej wersji raportu (27/28-05):** w tej sesji
> przetestowano **empirycznie, na żywo**: (a) **Frame border color** zmieniony
> pickerem (poprzednio tylko obecność kontrolki), (b) **`displayMode: compact` w
> trybie `route-submit`** (poprzednio „z kodu") — potwierdzono realne zwężenie
> `max-w-3xl`, ciaśniejszy `space-y-2` i ukrycie opisu, (c) **wszystkie trzy
> przełączniki źródeł global** (pages/entries/posts w obie strony), (d) **„Clear"
> na wszystkich trzech swatchach koloru**, (e) **picker „Search results page" +
> „Clear destination"**. Ustalono też **przyczynę** etykiety „Saved custom color"
> na świeżym widgecie (sekcja 8 pkt 2). Szczegóły niżej.

---

## 1. Przegląd widgetu

**Typ:** `search-box` · **Kategoria:** `content`
**Tytuł / opis:** „Search Box" / „Scoped listing search or global public search widget."
**Warianty:** jeden — `default` („Search input with optional source scoping.").

Renderer (`SearchBoxBlock`) ma **cztery rozłączne gałęzie** zależne od `mode` i
obecności `listingQueryId` — to kluczowy niuans architektury:

| Tryb | Co renderuje | Skrypt runtime | Formularz |
|------|--------------|----------------|-----------|
| `listing` **bez** `listingQueryId` | kafel `border-dashed` + tekst „Select a listing query in widget settings…" | **brak** | brak |
| `listing` **z** `listingQueryId` | `form[data-listing-runtime-form]`, input `name="lq.{id}.__q"` (token `__q`), `data-listing-auto-apply`, opcjonalny hint | **tak** (`getListingRuntimeClientScript`) | runtime (fetch + DOM replace, bez przeładowania) |
| `route-submit` | natywny `form method=get action={targetRoute}`, input `name={queryParam}` | **brak** | natywny GET (nawigacja do strony wyników) |
| `global` | `form[data-global-search-form] action=/api/search`, input `name="q"`, 3 checkboxy `sources`, kontener `[data-global-search-results]` | **tak** | debounce + min 2 znaki, fetch `/api/search`, render listy wyników |

**Stan zapisany fixture (admin i public, zweryfikowany przez `/admin/api/pages`):**
blok search-box ma **pusty `data: {}`** w `currentData` **i** `publishedData`. Po
normalizacji daje to `mode=listing`, **bez** `listingQueryId` → renderuje się
**kafel placeholder**. Tj. publiczny fixture **nie pokazuje** działającego pola
wyszukiwania, tylko komunikat „wybierz listing query" (patrz N1 w sekcji 8 i
ograniczenia w sekcji 5).

---

## 2. Model danych (`SearchBoxData`)

| Pole | Znaczenie |
|------|-----------|
| `mode` | `listing` \| `global` \| `route-submit` (domyślnie `listing`) |
| `displayMode` | `full` \| `compact` |
| `listingQueryId` | id listing-query (efektywne tylko dla `listing`) |
| `title`, `description`, `placeholder`, `submitLabel` | copy widoczne dla odwiedzającego |
| `autoApply` | bool — auto-submit przy wpisywaniu (efektywne tylko dla `listing`) |
| `endpoint` | domyślnie `/api/search` (support-owned, dla `global`) |
| `targetRoute`, `queryParam` | strona wyników + nazwa parametru (**tylko** `route-submit`; `q` domyślnie) |
| `sources.{pages,entries,posts}` | źródła global search (domyślnie pages+entries=on, posts=off) |
| `style.{frameBackground,frameBorderColor,actionBackground}` | 3 kolory (clearable) |
| `resolved.{query,rejectedTokens,error}` | tylko-do-odczytu stan runtime (diagnostyka) |

**Niuanse normalizacji potwierdzone w kodzie i działaniu:**
- `targetRoute`/`queryParam` są w payloadzie **tylko** gdy `mode === "route-submit"`
  — poza tym trybem są usuwane (potwierdzone w Advanced — patrz §4.3 i N5/N8).
- `resolveTargetRoute` odrzuca ścieżki niezaczynające się od `/` oraz `/api/…`
  (fallback do `/search`); `resolveQueryParam` wymusza wzorzec
  `^[A-Za-z][A-Za-z0-9_-]{0,31}$` (fallback do `q`) — bezpieczne domyślne.

---

## 3. Tryby edytora — co zawierają (stan faktyczny)

W prawym panelu są **dwie zakładki: „Visual" i „Advanced"**. Tryb **Wizard** to
osobny przepływ „setup" uruchamiany przyciskiem **„Run setup again"** (status:
„Setup complete — Daily edits live in Visual. Advanced is for technical
diagnostics."), kończony przyciskiem **„Finish setup and open Visual"**.

### 3.1 Wizard — „Search source"
Jedna sekcja z `Select` **„Search mode"** + kontrolki **zależne od trybu**:
- `listing` → `Select` **„Listing query"** (lista z `useListingQueries`),
- `global` → blok informacyjny + 3 przełączniki **„Global search sources"** (Pages/Entries/Posts),
- `route-submit` → **„Search results page"** (`LinkDestinationField` + „Clear destination") + tekst, że nazwa parametru jest „support-owned".

Dodatkowo własny blok **„Live preview"** („Reflects the current Wizard state
through the shared widget renderer.") renderujący stan przez wspólny renderer.

### 3.2 Visual (pełna edycja)
„Search Box Variants" (kafel **Default** + „Add variant preset"), **„Search copy"**,
**„Search interaction"**, **„Search surface"**. Pod nimi wspólne panele bloku:
**Block layout**, **Device visibility** (należą do bloku, nie do widgetu).
Przełącznik **„Auto apply on input"** pojawia się **tylko** dla `mode=listing`;
dla `global`/`route-submit` jest w tym miejscu tekst pomocniczy.

### 3.3 Advanced (wyłącznie diagnostyka)
Trzy sekcje **w 100% read-only**: **Runtime diagnostics**, **Runtime status**,
**Contract summary**. Brak edytora JSON i przycisku normalizacji. Potwierdzone
liczbowo: **0 edytowalnych kontrolek** (`input/textarea/select/button/switch/
combobox`) w całym tabpanelu Advanced (łącznie z podsumowaniami Block layout /
Device visibility, które też są read-only).

---

## 4. Co realnie PRZETESTOWANO i DZIAŁA (Admin UI)

Wszystkie interakcje wykonano w sesji `claude-29-05-search-box-gap-close` i
potwierdzono inspekcją DOM podglądu (canvas + Live preview). **Każda kontrolka
zadziałała poprawnie i natychmiast aktualizowała podgląd.**

### 4.1 Wizard — „Search source" (3 tryby)

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Search mode → **Listing runtime search** | wybór | gałąź `listing`; placeholder do czasu wyboru query |
| Listing query → realny query | wybór „House Projects Catalog Query 517544d2" (`74019e35-…`) | canvas **i** Live preview: `form[data-listing-runtime-form]`, `data-listing-query-id="74019e35-…"`, input `name="lq.74019e35-….__q"`, `data-listing-token="__q"`, `data-listing-auto-apply="1"`, hint „Search updates automatically as you type.", skrypt runtime obecny ✓ |
| Search mode → **Global public search** | wybór | gałąź `global`: `form[data-global-search-form] action="/api/search"`, input `name="q"`, 3 checkboxy `sources` (pages=on, entries=on, posts=off), kontener `[data-global-search-results]` z tekstem „Type at least two characters…", skrypt obecny ✓ |
| Global sources → **Posts** | toggle on | emitowany markup checkboxa: `defaultChecked=true`, atrybut `checked` obecny ✓ (z niuansem N3 dot. żywej właściwości `.checked`) |
| Global sources → **Pages** / **Entries** | toggle off | emitowany markup: `defaultChecked=false` dla obu ✓ |
| Search mode → **Route submit search** | wybór | gałąź `route-submit`: `data-search-box-mode="route-submit"`, `form method="get" action="/search"`, input `name="q"`, `data-search-target-route="/search"`, `data-search-query-param="q"`, **brak** skryptu runtime (natywny GET) ✓ |
| Search results page (picker) → **HomePage** — **LUKA DOMKNIĘTA** | wybór | `data-search-target-route="/homepage"` i `form action="/homepage"` ✓ |
| **Clear destination** — **LUKA DOMKNIĘTA** | klik | `targetRoute` wraca do domyślnego `/search`, `form action="/search"` ✓ |

**Persystencja wyboru przy zmianie trybu (zweryfikowane):** po przejściu z
`route-submit` z powrotem na `listing` wybrany wcześniej `listingQueryId`
(`74019e35-…`) **został zachowany** (runtime-form pojawił się od razu). Natomiast
`targetRoute` ustawiony w `route-submit` **znika** z payloadu poza tym trybem
(patrz N5/N8) — oba zachowania są poprawne wg normalizatora.

### 4.2 Visual — kontrolki i efekt w canvas

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Title | „Szukaj projektów" | `<p class="… uppercase">` → „Szukaj projektów" ✓ live |
| Description | „Przeszukaj katalog na żywo." | drugi `<p>` zaktualizowany ✓ live |
| Placeholder | „Wpisz nazwę projektu..." | `input@placeholder` ✓ live |
| Submit label | „Znajdź" | tekst `button[type=submit]` ✓ live |
| Display mode `full`→`compact` (**route-submit**) — **LUKA DOMKNIĘTA** | wybór | `max-w-5xl`→**`max-w-3xl`**, form `space-y-4`→**`space-y-2`**, wiersz `flex-wrap`→**`flex-nowrap`**, **opis ukryty** (`!compact && description`) ✓ live |
| Display mode `full`→`compact` (**listing**) | wybór | **tylko** `flex-wrap`→`flex-nowrap` + atrybut; sekcja **zostaje** `max-w-4xl`, form `grid gap-3` bez zmian (N4) ✓ |
| Auto apply on input (listing) `on`→`off` | toggle | `data-listing-auto-apply` `1`→`0`; hint „Search updates automatically…" **znika** ✓ live |
| Auto apply — w `route-submit` | — | przełącznik **nie istnieje**; zamiast niego tekst „Route-submit mode forwards the visitor query…" ✓ (zgodne z kontraktem) |
| Frame background (swatch) | `#ff8800` | inline `style` ramki → `background-color: rgb(255,136,0)` ✓ live |
| Frame background → **Clear** | clear | `background-color` **usunięte całkowicie** z inline-style (ramka transparentna) ✓ (semantyka N6) |
| Frame **border** (swatch) — **LUKA DOMKNIĘTA** | `#22aa55` | inline `style` → `border-color: rgb(34,170,85)` ✓ live |
| Frame border → **Clear** — **LUKA DOMKNIĘTA** | clear | `border-color` usunięte z inline-style ✓ |
| Action background (swatch) | `#10b981` | `button[type=submit]` inline `style` → `background-color: rgb(16,185,129)` ✓ live |
| Action background → **Clear** — **LUKA DOMKNIĘTA** | clear | inline `style` przycisku usunięte całkowicie ✓ |
| „Search Box Variants" — kafel **Default** | — | zaznaczony (jedyny wariant) ✓ |
| „Add variant preset" | klik | **brak widocznego efektu**: nie dochodzi nowy kafel wariantu (nadal 1), nie otwiera się dialog, brak błędu w konsoli (patrz §5) |

> **Niuans metodologiczny (nie błąd widgetu):** swatch koloru to natywny
> `input[type="color"]`. Wymuszenie jego `onChange` przez `eval` wymagało
> zresetowania wewnętrznego `_valueTracker` Reacta — zwykły `fill`/`dispatchEvent`
> nie był wystarczający. Po prawidłowym wyzwoleniu zdarzenia wszystkie trzy swatche
> zaktualizowały podgląd natychmiast. To ograniczenie sterowania kontrolką z
> automatu, a nie wada widgetu.

### 4.3 Advanced (read-only) — wierność stanu

Po ustawieniu w sesji `mode=listing` + query `74019e35-…` Advanced pokazał:
- **Runtime diagnostics:** Mode „listing", Listing query „74019e35-4a8f-4a7d-b8eb-f39882157b4d" (**surowe UUID** — support-owned), Search provider „Built-in public search service" (endpoint domyślny), **Results page „Default search results page"**, Search term routing „Standard search term routing". ✓
- **Runtime status:** Last visitor query „No query captured", Ignored filters „No ignored tokens", Runtime health „No runtime errors reported" (stan nominalny — `resolved.*` puste). ✓
- **Contract summary:** „Built-in endpoints, query keys, and runtime state are support-owned implementation details." ✓

**Spójność stanu (potwierdzenie N5/N8):** mimo że wcześniej w sesji ustawiłem
`route-submit` + „/homepage", po powrocie na `listing` Advanced pokazał „Results
page: **Default** search results page" — co potwierdza, że normalizacja **odrzuca**
`targetRoute`/`queryParam` poza trybem `route-submit`. Poprawne zachowanie kontraktu.

---

## 5. Czego NIE DA SIĘ w pełni zweryfikować (z dokładną przyczyną)

- **End-to-end runtime na froncie (listing + global) — kontrolka: cały żywy skrypt
  `getListingRuntimeClientScript`.** Opublikowany stan fixture to `listing` **bez**
  `listingQueryId` → gałąź **placeholder** → na froncie **nie ma** ani formularza,
  ani wstrzykniętego skryptu. Aby uruchomić na żywo: (listing) debounced fetch +
  podmianę bloków bez przeładowania (`replaceListingBlocksFromHtml`, auto-apply na
  `change`), albo (global) debounce + min 2 znaki + render wyników w
  `[data-global-search-results]`, fixture musiałby mieć **opublikowany** query lub
  tryb `global`. Świadomie **nie publikowałem** współdzielonego fixture. Zamiast
  tego zweryfikowałem: **strukturę** formularzy/skryptu w canvas admina oraz
  **endpoint** `/api/search` bezpośrednio (§6.3).

- **Persystencja i publikacja.** Świadomie **nie** klikałem „Save draft" ani
  „Publish". W trakcie edycji pojawił się badge **„Unsaved changes"** (potwierdza
  śledzenie brudnego draftu); po sesji `GET /admin/api/pages/b4734a85-…` nadal
  zwracał `data: {}` w `currentData` **i** `publishedData` — **moje edycje nie
  zostały zapisane**. W konsekwencji trwałość i propagacja zmian na front **nie**
  były weryfikowane.

- **`queryParam` (nazwa parametru) — brak kontrolki w edytorze.** Tryb `route-submit`
  pokazuje wprost, że nazwa parametru jest „support-owned"; nie ma pola edycji.
  Walidację `resolveQueryParam` (regex) potwierdziłem wyłącznie z kodu — wymaga
  zaseedowania niestandardowej wartości, czego edytor nie wytwarza.

- **Stany błędu/odrzuconych tokenów runtime** (`resolved.error`,
  `resolved.rejectedTokens`). Advanced pokazywał wyłącznie stan nominalny („No
  runtime errors", „No ignored tokens"). Edytor nie pozwala wstrzyknąć stanu
  runtime, więc gałęzie „błąd"/„ignored tokens" w rendererze widziałem tylko w
  kodzie.

- **„Add variant preset".** Przycisk jest obecny i klikalny, ale w tym fixture
  **nie wywołał** widocznej akcji (brak nowego kafla wariantu, brak dialogu, brak
  błędu w konsoli). Przepływ zapisu/zastosowania presetu (mechanizm współdzielony,
  jeden wariant `default`) **nie był** dalej wymuszany.

- **`displayMode: compact` + `global` na żywo.** Zweryfikowałem `compact` na żywo w
  `listing` (N4) **oraz** w `route-submit` (luka domknięta). Gałąź `global` używa
  tych samych klas co `route-submit` (`maxWidthClass`/`shellGapClass`), ale jej
  `compact` re-testowałem tylko strukturalnie/przez kod, nie osobnym przełączeniem.

---

## 6. Testy na froncie (trasa publiczna)

> **URL:** http://localhost:3000/ctr-search-box-2305 · **Data:** 2026-05-29
> (otwarte w **osobnej karcie**, by nie porzucić brudnego draftu w adminie).

### 6.1 Wyrenderowany widget (opublikowany stan)
Front renderuje **zapisany** stan: `mode=listing`, **bez** query → **kafel
placeholder** (`border-dashed`, „Select a listing query in widget settings to
enable scoped listing search.").
- `data-search-box-display-mode="full"`, `data-listing-block-id="blk-1"`, `data-listing-query-id=""`. ✓
- **Brak formularza** i **brak skryptu runtime** w gałęzi placeholder (poprawnie). ✓
- `aria-label` na `<section>` = **`null`** (N2 — a11y). Tytuł renderowany jako `<p>`, nie nagłówek.
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓

### 6.2 Responsywność
- **375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- Powrót do 1280 px bez artefaktów.

### 6.3 Runtime global search — endpoint `/api/search` (auxiliary)
Bezpośrednie wywołania `fetch` z kontekstu frontu (to endpoint, który wołałby
skrypt klienta w trybie `global`):

| Zapytanie | Wynik |
|-----------|-------|
| `?q=a` (1 znak) | **200**, `sources:[pages,entries,posts]`, `items: 0` |
| `?q=ab` (2 znaki) | **200**, `sources:[pages,entries,posts]`, `items: 3` |
| `?q=house&sources=pages,entries` | **200**, `sources:[pages,entries]`, `items: 0` |
| `?q=test&sources=posts` | **200**, `sources:[posts]`, `items: 3` |
| **brak `q`** | **400** (body z polem `error`) |

Backend jest sprawny: **respektuje parametr `sources`**, a przy jego braku domyślnie
używa wszystkich trzech źródeł; brak `q` jest poprawnie walidowany (400). To
charakterystyka endpointu — **nie** jest to test żywego skryptu widgetu (patrz §5).

---

## 7. Admin Preview vs Frontend — zgodność

| Aspekt | Admin (podgląd, moja sesja) | Frontend (publish) | Uwaga |
|--------|------------------------------|--------------------|-------|
| Wspólny renderer `SearchBoxBlock` | ✓ żywy, live wg edycji | ✓ ten sam, wg stanu zapisanego | zgodne |
| Stan zapisany | (wyjściowo) `listing` bez query (`data:{}`) | `listing` bez query | ✓ identyczny |
| Render placeholder (`border-dashed`) | ✓ (stan wyjściowy) | ✓ | zgodne |
| Runtime-form `listing` (po wyborze query) | ✓ (moja niezapisana edycja) | ✗ brak (fixture bez query) | ⚠ różnica z **danych**, nie z kodu |
| Skrypt runtime w gałęzi placeholder | brak | brak | zgodne |
| `aria-label` na `<section>` | brak | brak (`null`) | zgodne (oba bez nazwy — N2) |
| Konsola | 0 błędów / 0 ostrzeżeń | 0 / 0 | zgodne |
| Moje niezapisane edycje (mode/query/copy/kolory) | widoczne w sesji | **nieobecne** | ✓ poprawna izolacja (front = stan opublikowany) |

**Wniosek:** renderer jest wspólny i spójny. Jedyna różnica admin↔front wynika z
**danych** (front = zapisany placeholder bez query; canvas = moje niezapisane
edycje z wybranym query/trybem). Brak rozbieżności na poziomie kodu.

---

## 8. Niuanse UX/UI (obserwacje)

1. **N1 — Publiczny fixture NIGDY nie pokazuje działającego wyszukiwania.** Zapisany
   stan to `listing` bez query → na `/ctr-search-box-2305` widać wyłącznie kafel
   „wybierz listing query". Realne pole, skrypt runtime i wyniki **nie są
   demonstrowane publicznie** dla tego fixture. Działanie zweryfikowano strukturalnie
   w canvas admina + przez endpoint, ale end-to-end na froncie nie było wykonalne bez
   publikacji.

2. **N2 — Domyślne kolory pokazywane jako „Saved custom color" (ustalona przyczyna).**
   Mimo że zapisany `data` jest **pusty** (`{}`), wszystkie trzy swatche startowo
   pokazują fallbacki `#ffffff` / `#d4d4d8` / `#2563eb` i badge **„Saved custom
   color"** oraz komunikat „A saved custom color is configured…". Przyczyna: edytor
   seeduje pełne **domyślne** `style` (`color-mix(in srgb, var(--color-bg) 80%,
   transparent)`, `var(--color-border)`, `var(--color-primary)`), których natywny
   `input[type=color]` nie potrafi sparsować (`isPickerRepresentableColorValue=false`)
   → `SharedColorControl` klasyfikuje je jako „custom". **`SearchBoxEditors` nie
   przekazuje propa `treatAsThemeDefaultValues`**, więc te wartości nie są rozpoznane
   jako „Theme default". Komunikat „custom" sugeruje edycję, której nie było —
   mylące. (To samo zachowanie co w team/contact/faq.)

3. **N3 — Podgląd checkboxów `sources` nie odświeża „ptaszka" do reloadu.** Toggle
   **Posts** poprawnie aktualizuje dane i **emitowany markup** (`defaultChecked=true`,
   atrybut `checked` obecny → świeży render byłby zaznaczony). Jednak **żywa
   właściwość `.checked`** już zamontowanego checkboxa pozostaje `false` do
   przeładowania (input niekontrolowany — React nie nadpisuje `defaultChecked` na
   istniejącym węźle; potwierdzone: `liveChecked=false`, `defaultChecked=true`). Dane
   i HTML są poprawne; jedynie żywy podgląd „pozostaje w tyle". Niski priorytet.

4. **N4 — `displayMode: compact` jest niemal bezczynne w trybie `listing`.**
   Potwierdzone na żywo bezpośrednim porównaniem klas: w gałęzi `listing` `compact`
   zmienia **wyłącznie** `flex-wrap`→`flex-nowrap` w wierszu input+przycisk oraz
   atrybut `data-*`; sekcja zostaje na sztywno `max-w-4xl`, a form `grid gap-3`. Dla
   kontrastu w `route-submit` (i analogicznie `global`) `compact` realnie zwęża
   shell do `max-w-3xl`, zacieśnia `space-y-2` i **ukrywa opis**. Efekt: autor
   domyślnego (listing) widgetu wybierając „compact" widzi prawie żadną zmianę —
   mylące względem nazwy opcji.

5. **N5 — `targetRoute`/`queryParam` znikają poza `route-submit`.** Ustawienie strony
   wyników w `route-submit`, a potem zmiana trybu na `listing`/`global` **kasuje** tę
   wartość z payloadu (Advanced wraca do „Default search results page"). Poprawne wg
   kontraktu, ale autor może być zaskoczony utratą konfiguracji po zmianie trybu.
   Dla kontrastu `listingQueryId` **jest** zachowywany przy zmianach trybu.

6. **N6 — „Clear" koloru = transparentność, nie kolor motywu.** „Clear" na Frame
   background usuwa inline `background-color` całkowicie (ramka staje się
   przezroczysta), zamiast wracać do domyślnego `color-mix(... var(--color-bg) …)`.
   Zgodne z semantyką „clearable", lecz subtelnie mylące (to samo w team/contact/faq).

7. **N7 — „Search results page" to PAGE-PICKER, nie pole URL.** Domyślny `/search`
   pokazywany jest jako **„Saved custom destination"** z ostrzeżeniem „A custom
   destination is already configured…", bo nie jest znaną stroną serwisu. Autor może
   wybrać stronę wewnętrzną albo wyczyścić (powrót do `/search`); wpisanie dowolnego
   zewnętrznego URL tą kontrolką jest nieoczywiste.

8. **N8 — Brak dostępnej nazwy sekcji i etykiety pola (a11y).** We **wszystkich**
   gałęziach `<section>` nie ma `aria-label`/`aria-labelledby` (na froncie:
   `aria-label = null`). Tytuł renderuje się jako stylizowany `<p class="uppercase">`,
   **nie** jako nagłówek (`<h2/h3>`). `<input>` ma tylko `placeholder` — **brak**
   `<label>`/`aria-label`/`id`. Dla czytników ekranu: brak nazwanego landmarku i brak
   dostępnej nazwy pola wyszukiwania.

9. **Badge „Unsaved changes" + brak Save/Publish.** Edycje uruchomiły wskaźnik
   „Unsaved changes" (potwierdza śledzenie zmian); świadomie nie zapisywałem, by nie
   nadpisać współdzielonego fixture.

---

## 9. Co NIE DZIAŁA / błędy

**Błędy funkcjonalne: 0.** Każda z przetestowanych w tej sesji interakcji
(3 tryby Wizard, listing-query picker, 3 przełączniki źródeł, route-submit page
picker + Clear destination, 4 pola copy, display mode w `listing` i `route-submit`,
auto-apply, **wszystkie trzy** swatche koloru + „Clear" każdego) **zadziałała i
natychmiast aktualizowała podgląd**. Advanced jest w 100% read-only i wiernie
odzwierciedlał stan.

**Konsola:** admin **0 błędów / 0 ostrzeżeń** (poza infem React DevTools); front
**0 / 0**. Brak twardego buga renderowania i brak rozjazdu renderera admin↔front.

Jedyny element bez widocznego efektu to **„Add variant preset"** (brak nowego
kafla / dialogu / błędu — patrz §4.2 i §5) — nie zakwalifikowałem go jako bug, bo
to współdzielony mechanizm, a fixture ma jeden wariant `default`.

Zastrzeżenia mają charakter **UX/a11y** (§8): publiczny fixture bez query (N1),
mylące „Saved custom color" na domyślnych kolorach (N2), żywy podgląd checkboxów
(N3), niemal bezczynne `compact` w `listing` (N4), znikanie `targetRoute` poza
trybem (N5), „Clear" = transparentność (N6), page-picker zamiast URL (N7), brak
`aria-label`/etykiety pola (N8). Niezweryfikowane/odcięte ścieżki i przyczyny — §5.

---

## 10. Podsumowanie

| Kategoria | Obserwacja |
|-----------|------------|
| Tryby edytora | Wizard (setup źródła: 3 tryby), Visual (pełna edycja copy/interakcji/koloru), Advanced (tylko diagnostyka, 0 kontrolek) |
| Przetestowane kontrolki | Wizard ×3 tryby + listing-query + 3 źródła + page-picker + clear; Visual: 4×copy, display ×2 tryby, auto-apply, 3×swatch + 3×Clear, variant tile — **wszystkie działają** |
| Domknięte luki tej sesji | Frame **border** picker, `compact` w `route-submit` (live), wszystkie 3 toggle źródeł, „Clear" na 3 swatchach, page-picker + „Clear destination", ustalona przyczyna „Saved custom color" |
| Błędy funkcjonalne | **0** |
| Błędy / ostrzeżenia konsoli | admin 0/0, front 0/0 |
| Renderer | 4 poprawnie rozdzielone gałęzie (placeholder / listing-runtime / route-submit / global); skrypt runtime wstrzykiwany tylko tam, gdzie potrzebny; bezpieczne `targetRoute`/`queryParam` |
| Dostępność | **minus:** brak `aria-label`/`aria-labelledby` na `<section>`, tytuł jako `<p>` zamiast nagłówka, `<input>` bez etykiety (N8) |
| Główne niuanse UX | publiczny fixture bez query (N1); „Saved custom color" na domyślnych kolorach (N2); `compact` niemal bezczynne w `listing` (N4); znikanie `targetRoute` po zmianie trybu (N5) |
| Nietestowalne (z przyczyną) | live runtime listing/global na froncie (fixture w placeholderze); persystencja/publish (nie zapisywano); `queryParam` (brak kontrolki); stany `resolved.error`/`rejectedTokens` (brak wstrzyknięcia); „Add variant preset" (brak efektu w fixture) |
| API global search `/api/search` | sprawny: respektuje `sources`, domyślnie wszystkie 3 źródła, 400 przy braku `q` |
| Front vs Admin | spójne (wspólny renderer); różnice treści wynikają z innych **opublikowanych** danych, nie z rozbieżności rendererów |

---

## 11. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywano zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`) oraz snapshoty struktury (YAML w `.playwright-cli/`, katalog
> ignorowany przez Git). Ewentualne przechwycenia (np. `search-box-public-mobile-375`)
> byłyby **wyłącznie lokalnymi etykietami** stanu przeglądarki, nie są wymaganym
> evidence i nie zostały dołączone do repo.
