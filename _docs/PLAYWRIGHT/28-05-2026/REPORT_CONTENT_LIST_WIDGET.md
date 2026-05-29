# RAPORT: Content List Widget — pogłębiony audyt domknięcia luk (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-29 (aktualizacja audytu z 2026-05-28 — domknięcie luk)
> **Sesja Playwright:** `claude-29-05-content-list-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/e07ab9e8-57f8-477b-86c3-86b2ccec4b61` ("Contract Test - content-list", status `Draft`, blok `blk-1`)
> **Route public:** http://localhost:3000/test-content-list-0516 (UWAGA: to **inna**, opublikowana strona — patrz 6.0)
> **Pliki źródłowe:** `core/widgets/core/contentList.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/ContentListEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/services/content/contentListResolver.ts` (rozwiązywanie danych runtime)

> **Cel tej iteracji (domknięcie luk z 28-05):** poprzednia luka brzmiała „live resolver/canvas
> limitations and some remaining filter branches". W tej rundzie **wyklikano wyczerpująco
> wszystkie pozostałe gałęzie kontrolek** (pełne listy opcji source/filter, style/layout,
> paginacja/widoki, empty-state, czyszczenie kolorów) oraz **zweryfikowano klampowanie
> wartości liczbowych na żywo**. Każde stwierdzenie „działa / nie działa" oparto o realną
> interakcję w UI + inspekcję DOM (atrybuty `data-content-list-*`, klasy Tailwind grid/gap,
> wartości kontrolek, ARIA, inline-style kolorów, read-only podsumowania Advanced).

> **Integralność współdzielonego fixture:** **nie zapisano ani nie opublikowano** żadnej
> zmiany. Wszystkie edycje były in-memory. Po przeładowaniu strony przeglądarka pokazała
> natywny prompt „unsaved changes" (beforeunload), a po jego zaakceptowaniu blok wrócił do
> stanu wyjściowego `missing-source`/`cards`/0 itemów — co dowodzi, że fixture **nie został
> zmodyfikowany**.

> **Screenshoty:** w tym audycie weryfikację oparto **wyłącznie o inspekcję DOM** (`eval`) i
> snapshoty drzewa dostępności — **nie zapisano** zrzutów PNG. Ewentualne pliki byłyby
> **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany
> przez Git, potwierdzone `git check-ignore`), nie są wymaganym evidence w repo. Repo po
> audycie czyste (jedyna zmiana to ten plik raportu).

---

## 1. Przegląd widgetu

**Typ:** `content-list` · **Kategoria:** `content` · **Opis:** „Dynamic list of entries from selected content type."

**Warianty:** `cards` (domyślny, siatka kart z mediami i metadanymi), `list` (jednokolumnowy strumień artykułów), `compact` (gęsty układ do sidebarów / krótkich kolekcji).

**Kluczowa charakterystyka: to widget data-driven (runtime).** W przeciwieństwie do widgetów o danych „w treści" (np. `faq-accordion`, `accordion`), Content List **nie przechowuje** itemów w payloadzie bloku. Lista jest **rozwiązywana w runtime** z wybranego źródła (typ treści *albo* zapytanie Listings) przez `contentListResolver`. Payload bloku przechowuje jedynie konfigurację (źródło, filtry, prezentacja, style) oraz **snapshot** `resolved.*` z ostatniego rozwiązania.

**Model danych (`ContentListData`):** source (`mode` legacy/listing, `contentTypeId`, `listingQueryId/TemplateId`, `statusScope` ×5, `limit` 1–24, `sort` ×6) · filters (`taxonomy`, `featuredOnly`, `searchQuery`, `authorId`) · `title`/`description` · pagination (`mode` none/paged/load-more/view-all, `pageSize` 1–24, `viewAllHref/Label`, `loadMoreLabel`) · fields (`showImage/Excerpt/Meta/Cta`) · emptyState (`title`, `description`) · style (`columns` 1/2/3, `gap` none/sm/md/lg, `cardStyle` outlined/elevated/minimal, `imageAspect` compact/standard/wide/square, `tagMode` meta-line/badges/hidden, `tagLimit` 1–4, `ctaLabel`, 3× clearable kolor) · `resolved` (read-only runtime).

**Stany renderera (`data-content-list-state`):** `missing-source` (brak związanego źródła → placeholder) · `empty` (źródło związane, `resolved.items` puste → blok empty-state) · `ready` (są itemy → siatka `<article>` + opcjonalna paginacja).

---

## 2. Architektura trybów edytora (niuans UX)

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*), a kończy przyciskiem **„Finish setup and open Visual"**. Wzorzec identyczny jak w `faq-accordion`, `accordion`, `tabs`.

**Podział własności (potwierdzony w UI):**
- **Wizard owns source** — source mode + wiązanie (typ treści / zapytanie + szablon) + „source rules" (status scope, sort, limit).
- **Visual owns daily edits** — wariant, filtry editorialne, kontekst sekcji, paginacja, pola prezentacji, kolory, empty state. W trybie listing sekcja „Daily filters" pokazuje źródło read-only i ukrywa filtry editorialne.
- **Advanced is read-only** — trzy sekcje podsumowań (Source / Style / Runtime), zero edytowalnych kontrolek.

**Wizard ma własny „Live preview"** (oddzielny od canvasu adminowego), opisany jako *„Reflects the current Wizard state through the shared widget renderer."* — renderuje ten sam komponent co canvas, więc również pokazuje `missing-source`/`empty` (nie itemy) zgodnie z architekturą snapshotu.

---

## 3. NAJWAŻNIEJSZY niuans: podgląd w adminie NIE rozwiązuje danych na żywo

Jawnie zakomunikowane w UI (tekst pod „Section context"): **„Builder canvas shows saved resolved data. Save or open Preview to refresh live results."**

Potwierdzone w tej rundzie w DOM:
- Fixture `blk-1` **bez związanego źródła** → canvas `missing-source`, `data-content-list-items="0"`.
- Po **związaniu** typu treści „House Projects Catalog QA" (`c99bd4cf-…`) canvas przeszedł do stanu **`empty`** (nie `ready`) — bo snapshot `resolved.items` pozostaje pusty aż do zapisu/Preview.
- **Twardy dowód braku live-resolve:** w Advanced przy związanym źródle: **„Resolved source: Not configured"** i **„Last refresh: Not refreshed yet"**, mimo że **„Source binding: Content type: House Projects Catalog QA"**. Analogicznie po ustawieniu paginacji `view-all` + page size 24: **„Runtime pagination: Pagination runtime not available"** — runtime liczony jest dopiero przy realnym rozwiązaniu (save/Preview/front), nie z niezapisanej konfiguracji.

**Konsekwencja dla audytu:** wizualnego efektu większości kontrolek prezentacji (kolumny, gap, card style, kolory, image aspect, tagi, paginacja, render itemów) **nie da się zobaczyć w canvasie adminowym**. Potwierdzono je przez (a) zmianę stanu kontrolki, (b) propagację do read-only Advanced, (c) render na froncie (sekcja 6). Kontrolki **realnie aktualizujące canvas na żywo**: **Section title/description**, **Empty state title/description** (gdy stan = `empty`), oraz atrybuty `data-content-list-*`.

---

## 4. CO PRZETESTOWANO — wyczerpująca lista wyklikanych gałęzi

> Legenda: ✓ = wyklikane i zweryfikowane w tej rundzie (29-05). Wszystkie listy opcji
> rozwinięto i policzono w DOM; wybory potwierdzono odczytem wartości kontrolki lub atrybutu.

### 4.1 Wizard — source / rules
| Kontrolka | Zakres przetestowany | Wynik |
|-----------|----------------------|-------|
| **Source mode** | legacy ↔ listing (oba kierunki) | ✓ Przełączenie **czyści** wiązanie drugiego trybu (legacy→listing wyzerował `contentTypeId`, canvas `missing-source`; listing→legacy analogicznie). W listing dodatkowo czyści filtry editorialne (author/search/featured). |
| **Content type select + search** | rozwinięcie listy, wybór „House Projects Catalog QA" | ✓ Lista typów z przyjaznymi etykietami + osobne „Search content types". Wybór → canvas `missing-source`→`empty`, `data-content-list-source=c99bd4cf-…`. |
| **Listing query select** | rozwinięcie, wybór „House Projects Catalog Query 517544d2" | ✓ 3 zapytania na liście. Wybór → `data-listing-query-id=74019e35-…`, stan `empty`, sourceMode `listing`. |
| **Listing template select** | rozwinięcie | ✓ Lista szablonów + „No template selected (optional)". |
| **Status scope** | **wszystkie 5**: Published only / All statuses / Draft only / Scheduled only / Archived only | ✓ Pełna lista obecna; wybrano „Draft only", wartość utrzymana i odzwierciedlona w Advanced. |
| **Sort** | **wszystkie 6**: Newest/Oldest published, Recently/Oldest updated, Title A-Z / Z-A | ✓ Pełna lista obecna; wybrano „Title Z-A", odzwierciedlone w Advanced. |
| **Item limit** — klamp 1–24 | wpisano 30 oraz 0 | ✓ **Klampowanie na żywo**: 30→**24**, 0→**1** (natychmiast po zmianie, bez zapisu). |
| **Source rules per-mode** | legacy vs listing | ✓ Legacy: Status scope + Sort + Item limit. Listing: hint „Listing mode uses filters and sorting from the selected Listings query." + Item limit. |

### 4.2 Visual — wariant / layout
| Kontrolka | Zakres | Wynik |
|-----------|--------|-------|
| **Variant** | **wszystkie 3**: Cards / List / Compact | ✓ `data-content-list-variant` = `cards`/`list`/`compact`. |
| **Columns — widoczność warunkowa** | List i Compact | ✓ Dla ≠ cards kontrolka zamienia się w read-only hint **„Columns only affect the cards variant."**; dla cards wraca jako Select. |
| **Columns** | **wszystkie 3**: 1 / 2 / 3 columns | ✓ Pełna lista; wybrano „1 column". |
| **Gap** | **wszystkie 4**: No / Compact / Balanced / Spacious | ✓ Pełna lista; wybrano „No spacing". |
| **Card style** | **wszystkie 3**: Outlined / Elevated / Minimal | ✓ Badge „Selected" przenosi się; wybrano „Minimal". |

### 4.3 Visual — Daily filters
| Kontrolka | Zakres | Wynik |
|-----------|--------|-------|
| **Read-only źródło (legacy)** | Source mode / Content type / Status scope / Sort | ✓ Wyświetlone read-only, wiernie odzwierciedlają Wizard (po edycji: „House Projects Catalog QA" · „Draft only" · „Title Z-A"). |
| **Taxonomy input** | wpis + sprawdzenie datalisty | ✓ Input przyjmuje wartość; dla typu bez terminów hint **„No taxonomy suggestions available for this content type."** (brak `datalist`). |
| **Author search + select** | rozwinięcie | ✓ Ładuje użytkowników admina + filtr „Search authors". |
| **Search query** | wpis | ✓ Przyjmuje wartość. |
| **Featured only** | toggle | ✓ Switch działa. |
| **Daily filters — gałąź listing** | po przełączeniu na listing | ✓ Sekcja pokazuje read-only: Source mode „By listing query" · Listing query „…517544d2" · Listing template „Inherits default" + hint „Listing query filtering is owned by the selected Listings query. Change the binding in Wizard." **Filtry editorialne (taxonomy/author/search/featured) zniknęły** — zgodnie z czyszczeniem przy zmianie source mode. |

### 4.4 Visual — Section context (LIVE)
| Kontrolka | Wynik |
|-----------|-------|
| **Section title** | ✓ **Live**: `<h2 id="blk-1-title">` + sekcja `aria-labelledby="blk-1-title"`. |
| **Section description** | ✓ **Live**: `<p id="blk-1-description">` + sekcja `aria-describedby="blk-1-description"`. |

### 4.5 Visual — Pagination and actions
| Kontrolka | Zakres | Wynik |
|-----------|--------|-------|
| **Navigation mode** | **wszystkie 4**: No navigation / Previous-next / Load more / View all | ✓ Pełna lista; pola warunkowe poprawne (poniżej). |
| Pola warunkowe — `none` | — | ✓ Hint „No navigation keeps the current item-limit behavior from the source setup." (brak Page size). |
| Pola warunkowe — `paged` | — | ✓ Pojawia się **Page size** (z przyciskiem „Page size info"). |
| Pola warunkowe — `load-more` | — | ✓ **Page size** + **Load more label** (wpisano „Pokaż więcej"). |
| Pola warunkowe — `view-all` | — | ✓ **Page size** + **View all destination** (picker stron) + **View all label** (wpisano „Zobacz wszystkie projekty"). |
| **Page size** — klamp 1–24 | wpisano 99 | ✓ **Klamp na żywo**: 99→**24**. |
| **View all destination picker** | rozwinięcie | ✓ Lista opublikowanych stron (HomePage, TEST-CONTENT-LIST-0516, …) + opcja „Use resolved list page" + hint „Pick a published site page. Leave empty to use the resolved list page when available." Wybrano „HomePage". |

### 4.6 Visual — Presentation fields
| Kontrolka | Zakres | Wynik |
|-----------|--------|-------|
| **Show image / excerpt / meta / CTA** | switche | ✓ Wszystkie 4 działają (domyślnie ON). |
| **Show image OFF → hint** | toggle | ✓ Select „Image ratio" znika, zastąpiony „Enable \"Show image\" to configure image ratio."; po ON wraca. |
| **Image ratio** | **wszystkie 4**: Standard / Wide 16:9 / Square / Compact height | ✓ Pełna lista; wybrano „Wide 16:9". |
| **Tag display** | **wszystkie 3**: Meta line / Badges / Hidden | ✓ Pełna lista. |
| **Tag limit — widoczność warunkowa** | Badges vs Hidden | ✓ Dla „Hidden" pole **„Tag limit" znika**; dla „Meta line/Badges" obecne. |
| **Tag limit** — klamp 1–4 | wpisano 9 oraz 0 | ✓ **Klamp na żywo**: 9→**4**, 0→**1**. |
| **CTA label** | wpis | ✓ Przyjmuje wartość. |

### 4.7 Visual — Surface colors (clearable)
| Kontrolka | Zakres | Wynik |
|-----------|--------|-------|
| **Clear — Card background** | klik Clear | ✓ Badge „Saved custom color"→**„Theme default"**. |
| **Clear — Card border** | klik Clear | ✓ Badge →**„Theme default"** (pozostałe kolory bez zmian — operacja izolowana). |
| **Swatch — custom hex** | ustawienie `#00ff00` na Card border | ✓ Badge →**„Selected color"**, swatch przyjmuje hex. |
| **Text color** | pozostawiony jako token `var(--color-text)` | ✓ W Visual „Saved custom color"; w Advanced „Theme token selected" (patrz N2). |

### 4.8 Visual — Empty state (LIVE w stanie `empty`)
| Kontrolka | Wynik |
|-----------|-------|
| **Title** | ✓ **Live**: wpis „Brak projektów w tej kolekcji" → tekst empty-state aktualizuje się natychmiast w canvasie. |
| **Description** | ✓ **Live**: wpis „Zmień filtry lub opublikuj wpisy QA." → aktualizacja natychmiastowa. |
| **Swap opisu dla trybu listing** | ✓ **Nowo zweryfikowane:** w trybie listing, gdy opis = domyślny legacy („Adjust filters or publish entries for this content type."), renderer **automatycznie podmienia** go na listingowy default **„Adjust the listing query or publish matching entries."** (logika `resolveContentListEmptyDescription`). Custom opis pozostaje nienaruszony. |

### 4.9 Advanced (read-only) — wierność podsumowania
Tryb Advanced jest **w 100% read-only** i **wiernie** odzwierciedlił **wszystkie** moje niezapisane edycje:
- **Source summary:** „Source mode: By content type" · „Source binding: Content type: House Projects Catalog QA" · **„Source rules: Limit 6 · Draft only · Title Z-A"** · „Daily filters: Taxonomy: No taxonomy filter · Search: No search text · Featured: All entries · Author: No author filter".
- **Style summary:** **„Layout: 1 column · No spacing · Minimal cards"** · **„Card and text colors: Background: Theme default · Border: Selected color · Text: Theme token selected"** — dokładnie: wyczyszczone tło, custom hex na borderze, token na tekście.
- **Runtime summary** (jawnie „sanitized … without item titles or draft/private content"): „Runtime result: 0 items rendered · 0 items available" · **„Resolved source: Content type: Not configured"** · **„Runtime pagination: Pagination runtime not available"** · „Runtime navigation: Previous/Next not available" · „Runtime health: 0 filtered tokens suppressed · No runtime errors" · **„Last refresh: Not refreshed yet"** · „Support owner: Wizard owns source setup. Visual owns filters and presentation. Advanced is read-only."

---

## 5. CO DZIAŁA (synteza)

- **Cała logika gałęzi kontrolek edytora działa poprawnie** — wszystkie listy opcji (status scope ×5, sort ×6, columns ×3, gap ×4, card style ×3, image ratio ×4, tag mode ×3, pagination ×4) kompletne, wybory utrwalają się w stanie i propagują do Advanced.
- **Logika warunkowa** bezbłędna: Columns tylko dla `cards`, Image ratio tylko przy Show image, Tag limit tylko przy tag mode ≠ hidden, pola paginacji per tryb, Source rules per source mode, czyszczenie wiązań i filtrów przy zmianie source mode.
- **Klampowanie liczbowe na żywo** (nowość względem 28-05): Item limit, Tag limit i Page size są przycinane do zakresu natychmiast po zmianie (30→24, 99→24, 9→4, 0→1) — nie dopiero przy zapisie.
- **Kontrolki live w canvasie**: Section title/description (z poprawnym ARIA), Empty state title/description, w tym **automatyczny swap opisu empty-state dla trybu listing**.
- **Advanced** jest wiernym, sanityzowanym read-only podsumowaniem stanu niezapisanego.
- **Frontend** renderuje realny wpis end-to-end (patrz sekcja 6): tytuł-link, meta+`<time>`, excerpt, CTA z dostępnym `aria-label`, kolory jako inline CSS-vars, bez błędów konsoli, bez overflow na 375 px.
- **Konsola admina: 0 błędów / 0 ostrzeżeń** przez całą sesję klikania (jedyny komunikat: info o React DevTools).
- **Bezpieczeństwo edycji:** natywny prompt „unsaved changes" (beforeunload) chroni przed utratą niezapisanych zmian przy nawigacji/przeładowaniu.

---

## 6. Testy na froncie (public route)

### 6.0 WAŻNE: route public to INNA strona niż fixture adminowy
`/test-content-list-0516` to **osobna, opublikowana** strona — **nie** ten sam dokument co fixture adminowy. Dowody DOM:
- `data-listing-block-id="e26838bd-4647-441d-a39a-dbdab577548a"` (admin: `blk-1`),
- **związane źródło** `data-content-list-source="c99bd4cf-…"` (typ treści „House Projects Catalog QA", ten sam typ co testowo wiązany w adminie),
- `data-content-list-state="ready"`, `data-content-list-items="1"`, sourceMode `legacy`, statusScope `published`.

### 6.1 Render itemu (state = ready) — działa end-to-end
Strona zwraca `200` i renderuje **1 realny `<article>`**:
- **Wariant/layout:** `data-content-list-variant="cards"`, wrapper listy `grid grid-cols-1 gap-5` (ta strona: `columns=1`, `gap=md`).
- **Card style = minimal:** klasa karty `rounded-xl border p-4 border-transparent bg-transparent` (modyfikator `minimal`). *(Doprecyzowanie względem 28-05 — ta strona nie używa `outlined`.)*
- **Kolory zastosowane jako inline CSS-vars:** `style="background-color:var(--color-bg);border-color:var(--color-border);color:var(--color-text)"` — clearable-kolory renderują się jako tokeny motywu.
- **Tytuł jako link:** „Dom Aurora 148" → `/house-projects-catalog-qa-20260430/dom-aurora-148-qa-20260430`.
- **Meta:** `<time datetime="2026-05-03T19:00:12.453Z">May 3, 2026</time>` + autor „Patryk"; separator `•` jako **`<span aria-hidden="true"> • </span>`** (poprawny wzorzec a11y).
- **Excerpt:** „Nowoczesny dom rodzinny z otwartą strefą dzienną." renderowany.
- **CTA:** „Read more" z `aria-label="Read more: Dom Aurora 148"` (zawiera tytuł) i `href` do szczegółu.
- **Brak `<img>`** — item nie ma `imageSrc`, więc `<img>` poprawnie **nie jest renderowany** (`showImage = fields.showImage && Boolean(item.imageSrc)`), brak pustej ramki.
- **Brak badge'y tagów** — item bez tagów / tagMode meta-line.

### 6.2 Semantyka, a11y, konsola, responsywność
- Brak skonfigurowanego tytułu → sekcja używa fallbacku **`aria-label="Content list"`** (gdy jest tytuł → `aria-labelledby` na `<h2>`).
- 1× `<article>`; `max-width: 1152px` (`max-w-6xl`).
- **Brak nawigacji paginacji** (`nav[aria-label*=pagination]` nieobecny) — zgodne z `pagination.mode="none"` i 1 itemem.
- **Konsola: 0 błędów / 0 ostrzeżeń.**
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`).

---

## 7. CO NIE DZIAŁA / jest mylące (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Canvas adminowy nie jest live (architektura, nie bug)** | Renderer / edytor | Podgląd renderuje **zapisany** snapshot `resolved.items`. Po związaniu źródła canvas pokazuje `empty` (nie itemy); większości stylów nie widać do Save/Preview. **Twardy dowód:** Advanced „Resolved source: Not configured" + „Last refresh: Not refreshed yet" mimo „Source binding: …", oraz „Pagination runtime not available" mimo ustawionego trybu view-all. Jawnie zakomunikowane w UI — świadoma decyzja, ale istotne ograniczenie ergonomii. |
| **N2 — Niespójne etykietowanie koloru: Visual vs Advanced** | Kolory | Ta sama wartość tokenu `var(--color-text)` jest w **Visual** opisana jako **„Saved custom color"**, a w **Advanced** jako **„Theme token selected"**. Potwierdzone w tej rundzie bezpośrednio (tekst). Dwa różne komunikaty dla identycznej wartości — mylące. |
| **N3 — Domyślne kolory wyglądają jak „custom" w Visual** | Visual (Surface colors) | Defaulty to tokeny `var(--color-*)`. Skutek: **od razu** wszystkie 3 kontrolki pokazują „Saved custom color" + swatch z fallback-hexem (`#ffffff` / `#d4d4d8` / `#0f172a`), który **nie odzwierciedla** rzeczywistego koloru tokenu. Dopiero „Clear" daje „Theme default". |
| **N4 — Swatch nie pokazuje rzeczywistej wartości tokenu ani stanu „cleared"** | Visual (Surface colors) | `<input type=color>` nie potrafi wyświetlić `var(--color-*)` ani stanu pustego, więc po „Clear" badge mówi „Theme default", ale swatch **dalej pokazuje fallback-hex** (np. `#d4d4d8`). Wizualnie sugeruje konkretny kolor niezależnie od faktycznego stanu. |
| **N5 — Brak datalisty taksonomii dla typu bez terminów** | Visual (Daily filters) | „House Projects Catalog QA" nie ma terminów → brak `datalist`, hint „No taxonomy suggestions available for this content type." Zachowanie **poprawne**, ale input bywa „ślepy" (free-text bez podpowiedzi). Gałęzi z wypełnioną datalistą nie udało się wyzwolić tym typem treści (patrz 8, NT7). |

**Nie wykryto** żadnego twardego buga renderowania, błędu konsoli (front i admin: 0/0) ani rozbieżności w zachowaniu kontrolek. Cała logika warunkowa i klampowanie działają poprawnie.

---

## 8. CZEGO NIE DA SIĘ W PEŁNI ZWERYFIKOWAĆ (dokładny powód blokady)

> To są kontrolki, których **konfiguracja** działa (ustawiono je w edytorze i potwierdzono w
> Advanced), ale których **wizualnego efektu na realnych danych** nie dało się zaobserwować
> w tym środowisku. Powód jest wspólny i architektoniczny (N1) + ubogi zbiór danych na
> jedynej opublikowanej instancji. Nie zapisano/nie opublikowano fixture, by nie mutować
> współdzielonego stanu.

- **NT1 — Siatki wielokolumnowe (`Columns` 2/3 → `md:grid-cols-2` / `lg:grid-cols-3`) oraz warianty `Gap` (sm/lg) i `Card style` (outlined/elevated `shadow-sm`) na realnych kartach.** Powód: canvas adminowy nie jest live (N1); jedyna opublikowana strona ma `columns=1`, `gap=md`, `cardStyle=minimal` i **1 item** — brak wielu kart do zaobserwowania klas siatki/odstępu/stylu. Wymagałoby Save+Publish fixture (poza zakresem) lub bogatszej opublikowanej strony.
- **NT2 — Render `<img>` i klasy `imageAspect` (`h-32`/`h-40`/`aspect-[16/9]`/`aspect-square`).** Powód: jedyny żywy item **nie ma `imageSrc`** — renderer poprawnie pomija `<img>`. Brak opublikowanego itemu z obrazem.
- **NT3 — Render tagów (meta-line tags / `badges`).** Powód: jedyny żywy item **nie ma tagów** — efektu `tagMode`/`tagLimit` na realnych tagach nie widać.
- **NT4 — Runtime paginacji (linki Previous/Next, „Load more", „View all", „Page N of M").** Powód: front ma `mode=none` i 1 item; Advanced pokazuje „Pagination runtime not available", bo resolver nie liczy runtime z niezapisanej konfiguracji. **Konfiguracja** view-all (destination=HomePage, label) i page size jest ustawiona poprawnie, ale wygenerowanego `<a>` nie da się zaobserwować bez opublikowanej strony z trybem paged/load-more/view-all i wystarczającą liczbą itemów.
- **NT5 — Render trybu `listing` na froncie (mapowanie wierszy listingu, szablon).** Powód: jedyna opublikowana instancja używa trybu `legacy`; brak opublikowanego content-list w trybie listing.
- **NT6 — Efektywne filtrowanie (taxonomy/search/author/featured zawężające wynik) oraz wpływ `statusScope`/`sort` na zbiór wyników.** Powód: to logika data-driven wymagająca rozwiązania na zapisanej konfiguracji; canvas nie jest live, a zapisane filtry strony public są stałe.
- **NT7 — Gałąź wypełnionej `datalist` taksonomii.** Powód: testowy typ treści („House Projects Catalog QA") nie ma terminów taksonomii, więc gałąź z renderowanymi podpowiedziami `datalist` nie została wyzwolona (zweryfikowano tylko gałąź pustą — hint). Wymagałoby typu treści z kategoriami/tagami.

---

## 9. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas (`blk-1`, fixture) | Frontend (`test-content-list-0516`) | Uwagi |
|--------|--------------------------------|-------------------------------------|-------|
| Źródło | brak → `missing-source`; po teście binding → `empty` | związane (typ treści) → `ready` | różne strony |
| Rozwiązywanie itemów | **snapshot zapisany** (stale, 0 itemów) | **live w runtime** (1 item) | patrz sekcja 3 |
| Atrybuty `data-content-list-*` | obecne, spójny wzorzec | obecne, spójny wzorzec | wspólny renderer |
| Render `<article>` | brak (placeholder/empty) | pełny (tytuł-link, meta+`<time>`, excerpt, CTA z aria, inline-vars kolorów) | kontrakt spójny |
| Konsola | 0/0 (edytor) | 0/0 | ✓ |

**Wniosek:** renderer jest wspólny (`ContentListBlock`), kontrakt DOM identyczny. Bezpośrednie porównanie **tych samych danych** admin↔front niemożliwe (fixture nie ma zapisanego źródła, route ma inne). Najistotniejsza różnica wynika z architektury data-driven: admin pokazuje **zapisany** snapshot, front rozwiązuje **na żywo**.

---

## 10. Podsumowanie

- **Content List jest w dobrym, spójnym stanie funkcjonalnym.** W tej rundzie **wyczerpująco wyklikano wszystkie pozostałe gałęzie** kontrolek edytora (pełne listy: status scope ×5, sort ×6, columns ×3, gap ×4, card style ×3, image ratio ×4, tag mode ×3, pagination ×4 wraz z polami warunkowymi, picker „View all destination", czyszczenie i custom-hex 3 kolorów, empty-state + swap listingowy). Wszystko działa zgodnie z logiką kontraktu edytora.
- **Nowe potwierdzenia (poza zakresem 28-05):** (1) **klampowanie na żywo** wartości liczbowych — Item limit 30→24/0→1, Tag limit 9→4/0→1, Page size 99→24; (2) **swap opisu empty-state** dla trybu listing (default legacy → default listing) renderowany live; (3) **gałąź listing w Visual Daily filters** (read-only summary + ukrycie filtrów editorialnych); (4) prompt **beforeunload „unsaved changes"** jako zabezpieczenie edycji.
- **Najważniejszy niuans (N1):** podgląd w adminie pokazuje **zapisany** snapshot i nie rozwiązuje itemów na żywo — potwierdzone twardo w Advanced („Resolved source: Not configured", „Last refresh: Not refreshed yet", „Pagination runtime not available" mimo ustawionej konfiguracji).
- **Etykietowanie kolorów (N2–N4):** tokeny `var(--color-*)` pokazują się w Visual jako „Saved custom color" (a w Advanced jako „Theme token selected"); swatch nie odzwierciedla tokenu ani stanu „cleared". Domyślny stan wygląda jak „custom".
- **Frontend:** realny wpis renderuje się end-to-end (tytuł-link, meta+`<time>` z aria-hidden separatorem, excerpt, CTA z aria-label, kolory jako inline CSS-vars, card style `minimal`), 0 błędów konsoli, brak overflow na 375 px.
- **Granice audytu (sekcja 8):** efekt wizualny wielokolumnowych siatek, image aspect, tagów, runtime paginacji, trybu listing na froncie i efektywnego filtrowania **pozostaje nie-w-pełni-weryfikowalny** — z powodu nie-live canvasu (N1) i ubogiego zbioru danych (1 item, 0 obrazów, 0 tagów, mode=none, legacy) na jedynej opublikowanej instancji. Nie zapisano fixture, by nie mutować współdzielonego stanu.
- Nie znaleziono żadnego twardego buga renderowania ani błędu konsoli.

---

## 11. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywano zrzutów PNG — całą weryfikację oparto o inspekcję DOM
> (`eval`) i snapshoty drzewa dostępności. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są
> wymaganym evidence i nie zostały dołączone do repo. Tymczasowe snapshoty `.yml`/logi konsoli
> z sesji pozostają w `.playwright-cli/` (gitignored); repo poza tym raportem jest czyste.
