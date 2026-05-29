# RAPORT: Listing Filters Widget — audyt stanu bieżącego (UI admina + front)

> **Status:** Zakończony
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-listing-filters` (izolowana od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admina (fixture):** „Contract Test - listing-filters" — ID `f9435704-9702-45f5-92b1-22711c7fb0ad`
> **Route publiczny:** http://localhost:3000/test-listing-filters-0516

> Uwaga metodologiczna: w trakcie audytu **nie** robiłem zrzutów PNG. Korzystałem
> z accessibility-snapshotów Playwright oraz inspekcji DOM/JS (`eval`). Gdyby
> jakiekolwiek pliki snapshotów/PNG powstały, są to wyłącznie lokalne etykiety
> przechwyceń (ignorowane przez Git i niewymagane jako evidence w repo).

> Uwaga o zakresie: strona admina (fixture `f9435704…`) oraz route publiczny
> (`test-listing-filters-0516`, query `22f2ad81…`) to **odrębne strony**.
> Moje edycje w edytorze admina to zmiany w wersji roboczej (draft) i **nie były
> publikowane** — nie wpłynęły na route publiczny. Zachowanie runtime na froncie
> testowałem na wcześniej opublikowanej konfiguracji tej strony.

---

## 1. Przegląd widgetu

**Typ:** `listing-filters` — „Listing Filters"
**Opis:** Faceted runtime filters for listing query widgets.
**Kategoria:** content · **Moduł:** `listings` (wymaga `listings`) · **Złożoność:** composite · **Audience:** intermediate
**Warianty (4):** `default`, `horizontal`, `sidebar`, `drawer`
**Limity schematu:** facets max 24 · options/facet max 120 · sortOptions/facet max 20

Widget renderuje panel filtrów (facetów) powiązany z **jednym** źródłem listing query.
Filtry synchronizują się z adresem URL (parametry GET o nazwach `lq.<queryId>.<token>`),
a wyniki rozwiązuje SSR przy renderze publicznym. Sam widget nie wyświetla listy
wyników — steruje osobnym widgetem listingu przez stan w URL.

**Pliki źródłowe:**
- `core/widgets/core/listingFilters.tsx` — renderer (`ListingFiltersBlock`, `ListingFacetControl`), typy, normalizacja, schema, kontrakt edytora, defaults
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` — edytory Wizard / Visual / Advanced (2592 linie)
- `core/services/search/filterContract.ts` — typy facetów, operatory, normalizacja facetów, tokenizacja
- `core/widgets/core/listingRuntimeScript.ts` — klientowy skrypt runtime (auto-apply, sync URL)

### 1.1 Model danych (skrót)

| Sekcja | Pola |
|--------|------|
| **źródło** | `listingQueryId` |
| **copy/behavior** | `title`, `description`, `searchLabel`, `searchPlaceholder`, `applyLabel`, `showSearch`, `autoApply` |
| **facets[]** | `id`, `kind` (taxonomy/checkbox/radio/range/date-range/sort), `label`, `field`, `op`, `options[]`, `sortOptions[]`, `presentation{}` |
| **layout** | `maxWidth` (narrow/content/wide/full), `stickySidebar`, `collapsibleFacets`, `defaultCollapsed` |
| **style** | `frameBackground`, `frameBorderColor`, `actionBackground` (wszystkie clearable) |
| **resolved** (read-only, SSR) | `listingQueryId`, `metrics[]`, `searchQuery`, `rejectedTokens[]`, `error` |

### 1.2 Podział odpowiedzialności trybów (model „ownership")

- **Wizard** = setup: wybór źródła (listing query) + tworzenie facetów (kind, field, operator, opcje sortowania). Klucze techniczne (`id`/value) są „support-owned" (read-only, generowane automatycznie).
- **Visual** = codzienna edycja: wariant, layout, copy/labels, kolory, prezentacja facetów (etykiety, kolejność, tryb opcji). Pola kind/field/operator są tu read-only.
- **Advanced** = wyłącznie diagnostyka read-only dla supportu.

---

## 2. Co faktycznie przetestowano

Sesja `claude-29-05-listing-filters`. Logowanie do admina: ✓ (konto `patryk.ciechanski@patrykiti.pl`).

| Obszar | Zakres testu |
|--------|--------------|
| Wizard | wybór listing query, dodanie facetu, zmiana kind, wybór pola, wybór operatora, sekcja opcji checkbox, opcje sortowania, walidacja |
| Visual | 4 warianty, max width, collapsible facets, default collapsed, sticky sidebar, title/copy, show search, auto-apply, kolory + Clear, etykieta facetu, reorder, tryb opcji (inline/searchable) |
| Advanced | wszystkie 4 sekcje read-only |
| Front | struktura runtime DOM, sort auto-apply→URL→SSR, search auto-apply→URL, panel aktywnych filtrów, „Clear all", odrzucanie nieprawidłowych tokenów URL, dostępność, mobile 375px, konsola |

Metoda weryfikacji: każdą zmianę w edytorze konfrontowałem z podglądem na kanwie
admina (`data-listing-widget`, klasy, atrybuty inline-style) oraz — na froncie —
z realnym DOM, URL i odpowiedzią SSR po nawigacji.

---

## 3. Co DZIAŁA (potwierdzone)

### 3.1 Wizard (setup)

- **Wybór listing query** — działa. Dostępne 3 zapytania (np. „House Projects Catalog Query 517544d2"). Po wyborze:
  - kanwa przechodzi ze stanu pustego („Select a listing query…") na pełny render filtra,
  - lista pól (field candidates) zostaje wypełniona realnymi polami query: `id, title, slug, status, updatedAt, data.summary, data.heroImage, data.areaM2, data.rooms, data.bathrooms, data.floors, data.priceFrom, data.location, data.projectStatus` (i dalsze).
- **Dodanie facetu** („Add facet") — działa, nowy facet domyślnie `checkbox`, z walidacją „Choose a listing field for this facet." dopóki pole nie zostanie ustawione.
- **Zmiana kind** (checkbox→range→checkbox) — działa, automatycznie:
  - resetuje operator do domyślnego dla danego kind (np. range→„Between"),
  - przebudowuje podgląd (range pokazuje Min/Max + slidery; checkbox pokazuje listę opcji).
- **Wybór pola (Listing field)** — działa, lista z query, po wyborze znika błąd walidacji, a kanwa dodaje facet do renderu.
- **Operator** — listy zależne od kind (checkbox: Contains any / Contains none / Equals / Not equals — zgodne z kontraktem `listingFilterOperatorsByKind`).
- **Facet Sort** — pełna obsługa w setup: „Add sort option", wybór pola (`Sort by`) z kandydatów query, wybór kierunku (Ascending/Descending), „Remove sort". Generated key liczony z field+dir („Generated from field and direction").
- **Walidacja** — komunikaty pojawiają się i znikają poprawnie (brak pola, itp.).
- **„Finish setup and open Visual"** — wraca do trybu Visual ze statusem „Setup complete".

### 3.2 Visual

- **4 warianty** (karty Default/Horizontal/Sidebar/Drawer) — przełączanie działa i odzwierciedla się na kanwie:
  - `drawer` → render jako `<details>` z `<summary>` „Filters panel",
  - warunkowe toggsle layoutu pojawiają się/znikają zależnie od wariantu: **Sticky sidebar** tylko dla `sidebar`, **Default collapsed** tylko dla `drawer` lub gdy włączone Collapsible facets.
- **Max width** — działa, klasa kontenera zmienia się: narrow=`max-w-3xl`, content=`max-w-5xl`, wide=`max-w-6xl`, full=`max-w-none`.
- **Collapsible facets** — działa; każdy facet zostaje opakowany w `<details>/<summary>` (potwierdzone: 2× `<details>` na kanwie po włączeniu, 0 po wyłączeniu). Po włączeniu pojawia się **Default collapsed**.
- **Title / Description / Search label / Search placeholder / Apply label** — edycja tekstu aktualizuje kanwę na żywo (np. Title „Filter results"→„Filtruj projekty" natychmiast widoczny w renderze).
- **Show search field** (switch) — działa.
- **Auto apply changes** (switch) — działa: ON → tekst „Updates automatically when values change." (brak przycisku submit); OFF → pojawia się przycisk submit „Apply filters".
- **Kolory powierzchni (Frame background / Frame border / Action background)** — każdy z przyciskiem **Clear**:
  - „Clear" działa: usuwa wartość z inline-style na kanwie (np. zniknięcie `background-color` z ramki), przełącza etykietę „Saved custom color"→„Theme default" i **dezaktywuje** sam przycisk Clear. Spójne dla wszystkich trzech pól (w odróżnieniu od widgetu Contact, gdzie `borderColor` nie miał Clear).
- **Facet presentation:**
  - **Edycja etykiety facetu** — działa, legenda na kanwie aktualizuje się (np. „Facet 2"→„Status projektu").
  - **Reorder (Up/Down)** — działa, kolejność na kanwie zmienia się (potwierdzone: po „Up" siatka facetów = `["Status projektu","Sort"]`).
  - **Option mode (Inline list / Searchable list)** — działa; tryb „Searchable" dodaje na kanwie `fieldset[data-listing-searchable-options]` + input wyszukiwania `data-listing-option-search`.
  - **Edycja etykiet opcji sortowania** — dostępna (Newest first / Oldest first jako edytowalne pola).

### 3.3 Advanced (read-only)

Wszystkie 4 sekcje renderują się poprawnie i odzwierciedlają stan konfiguracji:
- **Source and facets summary** — nazwa query, „Facet count: 2", karty per-facet (etykieta, „Support key: Configured", „Kind: checkbox/sort", „Binding: Listing field configured" / „2 sort rows configured").
- **Runtime diagnostics** — „Runtime query: Connected to selected listing query", „Ignored URL filters: No ignored filters", nota o pustym `resolved` poza SSR.
- **Runtime status** — „No resolved facet metrics yet", „No active filters captured" (poprawnie — brak SSR w podglądzie admina).
- **Contract summary** — opis modelu ownership + referencja do `_docs/_WIDGETS/LISTING_FILTERS.md`.

Brak jakichkolwiek edytowalnych kontrolek w Advanced — zgodnie z założeniem. (Brak też przycisku „Apply normalization", który był w widgecie Contact — tu go nie ma i nie jest potrzebny.)

### 3.4 Front (runtime, route publiczny)

Opublikowana konfiguracja route'a: wariant `default`, query `22f2ad81…`, tylko facet **Sort** + pole **Search**, `autoApply=1`.

- **Struktura runtime DOM** — poprawna: `form method="get" action=""`, `data-listing-runtime-form`, `data-listing-auto-apply="1"`, skrypt runtime obecny, region statusu `data-listing-runtime-status` obecny.
- **Nazewnictwo parametrów** — `lq.<queryId>.__q` (search), `lq.<queryId>.__sort` (sort). Sort select **ma** atrybut `name`.
- **Sort (auto-apply)** — wybór „Newest first" natychmiast aktualizuje URL: `?lq.22f2ad81….__sort=updatedAt%3Adesc`. Po przeładowaniu SSR wartość selecta **utrzymuje się** (`updatedAt:desc`) — pełny round-trip URL↔SSR.
- **Search (auto-apply)** — wpisanie „willa" + Enter dodaje `…__q=willa` do URL i **współistnieje** z parametrem sortu. SSR re-renderuje pole z zachowaną wartością.
- **Panel aktywnych filtrów** — pojawia się gdy są aktywne filtry: „1 active filter", chip „Search: willa", przycisk **„Clear all"**. (Sort celowo nie liczy się jako aktywny filtr — zgodne z `buildActiveFilterItems`.)
- **„Clear all"** — działa: czyści wszystkie parametry i resetuje URL do `…/test-listing-filters-0516`.
- **Odrzucanie nieprawidłowych tokenów URL** — działa: po wejściu z `…nonexistentfacet=foo&…__sort=bogusvalue`:
  - bogus sort zostaje odrzucony, select wraca do „Default order" (value=`""`),
  - pojawia się **widoczny** komunikat „Ignored invalid filter parameters.",
  - ukryty `<p data-listing-runtime-error>` pozostaje `hidden` (poprawnie — to nie błąd runtime).
- **Konsola** — 0 errorów, 0 warningów.
- **Mobile 375px** — brak poziomego overflow, widget wypełnia viewport.

---

## 4. Czego NIE udało się jednoznacznie potwierdzić / ograniczenia

### 4.1 Ograniczenia funkcjonalne (rzeczywiste luki użyteczności)

| # | Problem | Obszar |
|---|---------|--------|
| L1 | **Brak możliwości dodania opcji dla facetów checkbox/radio/taxonomy z poziomu UI.** Sekcja „Options" pokazuje komunikat „Option values are support-owned until runtime metrics can suggest safe values." i **nie ma przycisku „Add option"**. W setupie da się jedynie *usunąć* istniejącą opcję, ale nie da się jej *dodać*. W efekcie facet checkbox utworzony w kreatorze ma 0 opcji i w podglądzie admina renderuje pusty `<fieldset>` (sama legenda, bez checkboxów). Opcje mogą pojawić się dopiero z runtime-metrics SSR — autor nie ma kontroli nad nimi w UI. | Wizard / renderer |
| L2 | **Pusty facet na kanwie admina jest mylący** — checkbox „Status projektu" (na `data.projectStatus`) pokazuje na kanwie tylko nagłówek bez żadnych opcji; brak komunikatu „opcje pojawią się w runtime", więc wygląda jak błąd konfiguracji. | Renderer (admin preview) |
| L3 | **Sort select nie ma czytelnej wartości dla pustego wyboru poza „Default order".** Drobne — działa, ale brak wskazania że „Default order" to brak sortu. | Renderer |

### 4.2 Niezweryfikowane (ograniczenia narzędzia/zakresu — NIE oznaczają błędu)

| # | Co | Dlaczego nie potwierdzono |
|---|----|--------------------------|
| N1 | **Color picker (swatch) — faktyczny zapis wybranego koloru.** Po programowym ustawieniu wartości `<input type="color">` (#ff0000) DOM-owa wartość swatcha się zmieniła, ale stan widgetu **nie** (etykieta dalej „Theme default", Clear dalej disabled, kanwa bez `background-color`). | Natywny color-picker OS-a nie jest wiarygodnie sterowalny przez syntetyczne eventy. Traktuję to jako ograniczenie automatyzacji, **nie** jako potwierdzony bug. Przycisk **Clear** został potwierdzony jako działający. |
| N2 | **Front: facety inne niż Sort + search.** Opublikowana konfiguracja route'a ma tylko facet Sort, więc **nie** zweryfikowałem na froncie renderu checkbox/radio/taxonomy/range/date-range z realnymi metrykami runtime ani wariantów `horizontal`/`sidebar`/`drawer` (publiczny wariant to `default`). Te elementy testowałem wyłącznie w podglądzie admina. |
| N3 | **Trwałość zmian admina po przeładowaniu/zapisie.** Nie klikałem „Save"/Publish. Potwierdziłem trwałość *w sesji* (reaktywność kanwy + zachowanie stanu przy przełączaniu Wizard↔Visual↔Advanced), ale **nie** weryfikowałem zapisu do bazy ani persystencji po reloadzie strony admina. |

---

## 5. Niuanse UX/UI

- **U1 — Wejście do Wizarda jest nieoczywiste.** Edytor otwiera się w trybie Visual z 2 zakładkami (Visual / Advanced). Tryb Wizard nie jest zakładką — uruchamia się przyciskiem **„Run setup again"** przy statusie „Setup complete". Dla osoby pierwszy raz widzącej widget może to być nieczytelne, gdzie jest pełny setup.
- **U2 — Swatch koloru pokazuje fallback, nie realną wartość.** Pola kolorów przechowują wartości CSS (`color-mix(in srgb, var(--color-bg) 80%, transparent)`, `var(--color-border)`, `var(--color-primary)`), ale natywny `<input type=color>` nie potrafi ich pokazać i wyświetla fallbacki (#ffffff / #d4d4d8 / #2563eb). Etykieta „Saved custom color" + tekst pomocniczy łagodzą to, ale wizualnie swatch wprowadza w błąd co do faktycznego koloru.
- **U3 — Komunikaty „support-owned" są techniczne.** Teksty typu „Option values are support-owned until runtime metrics can suggest safe values." oraz „A custom field binding is already configured by support…" są deweloperskie/operacyjne, mało przyjazne dla zwykłego autora treści.
- **U4 — Pole „Sort by" przy braku query pokazuje „Custom field configured by support" (disabled).** Gdy nie wybrano listing query, istniejący `updatedAt` jest traktowany jako custom (brak kandydatów) i blokowany komunikatem o wsparciu — po wyborze query wartość poprawnie wraca do `updatedAt`.
- **U5 — Reorder tylko Up/Down.** Brak drag&drop dla facetów i opcji (akceptowalne przy małej liczbie, ale mniej wygodne).
- **U6 — Pusty facet bez wyjaśnienia (patrz L2).** W podglądzie autor nie wie, że opcje wypełni runtime.
- **U7 — Brak collapse sekcji edytora Visual** — Visual ma 4 rozbudowane sekcje (Variant&layout, Copy&behavior, Surface, Facet presentation) bez zwijania; przy wielu facetach panel robi się długi.
- **U8 — Czytelny podział ownership (pozytyw).** Rozdzielenie „Wizard=setup / Visual=codzienne / Advanced=diagnostyka" jest konsekwentne i dobrze opisane (sekcja Contract summary). Read-only summary rows jasno komunikują, co należy do supportu.

---

## 6. Dostępność (front)

| # | Obserwacja |
|---|-----------|
| A1 | `<section data-listing-widget>` **bez** `aria-label`/`aria-labelledby` — kontener filtra nie ma dostępnej nazwy. |
| A2 | `<form data-listing-runtime-form>` **bez** `aria-label`. |
| A3 | Input search **bez** `id` i **bez** `autocomplete`. Etykietowanie działa przez wrapper `<label><span>Search</span><input></label>` (asocjacja implicytna), więc pole nie jest „nienazwane", ale brak jawnego `id`/`for`. |
| A4 | Sort `<select>` **ma** `name` (poprawnie — wymagane do GET). |
| A5 | Drawer/Collapsible używają natywnych `<details>/<summary>` — dobra, dostępna baza (działają bez JS). |

Charakter zbliżony do luk z widgetu Contact (R1/R2/R3/R4), ale tu pola są przynajmniej etykietowane wrapperem.

---

## 7. Admin (podgląd) vs Front (runtime) — porównanie

| Aspekt | Admin preview | Front (SSR + runtime) | Zgodność |
|--------|---------------|------------------------|----------|
| Render wariantu `default` | ✓ | ✓ | ✓ |
| Title/description/labels | ✓ reaktywne | ✓ (opublikowane) | ✓ |
| Auto-apply (tekst vs przycisk) | ✓ | ✓ (auto-apply=1) | ✓ |
| Sort select | ✓ podgląd (disabled w setup) | ✓ działa, sync URL | ✓ |
| Search | ✓ podgląd | ✓ działa, sync URL | ✓ |
| Panel aktywnych filtrów + Clear all | n/d (brak SSR) | ✓ | — |
| Odrzucanie tokenów URL | n/d (brak SSR) | ✓ | — |
| `resolved.metrics` (opcje checkbox z danych) | ✗ puste | (niezweryfikowane na tym route — N2) | — |
| Facet checkbox z opcjami | ✗ pusty (L1/L2) | niezweryfikowane (N2) | — |

**Wniosek:** zachowania wspólne (warianty/copy/auto-apply) są zgodne między admin a frontem. Część runtime (aktywne filtry, sync URL, odrzucanie tokenów) jest weryfikowalna tylko na froncie i tam **działa poprawnie**. Render facetów z realnymi opcjami zależy od metryk SSR, których nie udało się sprawdzić na opublikowanej konfiguracji (tylko Sort).

---

## 8. Podsumowanie

**Stan ogólny: widget działa solidnie w zakresie, który udało się przetestować.**
Edytory Wizard/Visual/Advanced są spójne i reaktywne, a runtime na froncie
(sort, search, sync URL↔SSR, panel aktywnych filtrów, „Clear all", odrzucanie
nieprawidłowych tokenów) działa bezbłędnie i bez błędów w konsoli.

**Wszystko, co przetestowałem w trybach Wizard, Visual i Advanced oraz na froncie
w zakresie facetu Sort + search — działa**, z trzema wyjątkami/zastrzeżeniami:

1. **L1 (istotne):** nie da się dodać opcji facetów checkbox/radio/taxonomy z UI — facet pozostaje pusty do czasu metryk runtime; w podglądzie admina wygląda to jak błąd (L2).
2. **N1:** zapisu koloru przez natywny swatch nie potwierdziłem (ograniczenie automatyzacji); przycisk **Clear** działa.
3. **N2/N3:** na froncie nie zweryfikowałem facetów innych niż Sort, wariantów innych niż `default`, ani persystencji edycji admina po zapisie/reloadzie (poza sesją).

Dodatkowo: drobne luki dostępności (brak `aria-label` na section/form, brak `id`/`autocomplete` na search) oraz techniczny język komunikatów „support-owned".

### Macierz priorytetów (na podstawie tego audytu)

| # | Pozycja | Priorytet |
|---|---------|-----------|
| L1 | Brak dodawania opcji checkbox/radio/taxonomy w UI | WYSOKI |
| L2 | Pusty facet bez wyjaśnienia w podglądzie | ŚREDNI |
| A1–A3 | aria-label section/form, id/autocomplete search | ŚREDNI |
| U2 | Swatch koloru pokazuje fallback zamiast realnej wartości | NISKI |
| U1 | Nieoczywiste wejście do Wizarda („Run setup again") | NISKI |
| U3 | Techniczny język komunikatów „support-owned" | NISKI |
| U7 | Brak collapse sekcji Visual | NISKI |

---

## 9. Statystyki audytu

| Kategoria | Liczba |
|-----------|--------|
| Potwierdzone działające funkcje (Wizard) | 8 |
| Potwierdzone działające funkcje (Visual) | 11 |
| Potwierdzone działające funkcje (Advanced) | 4 sekcje read-only |
| Potwierdzone działające funkcje (Front/runtime) | 8 |
| Ograniczenia funkcjonalne (L) | 3 |
| Niezweryfikowane (N) | 3 |
| Niuanse UX (U) | 8 |
| Luki dostępności (A) | 5 |
