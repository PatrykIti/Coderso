# RAPORT: Content List Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-content-list` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/e07ab9e8-57f8-477b-86c3-86b2ccec4b61` ("Contract Test - content-list", status `Draft`, blok `blk-1`)
> **Route public:** http://localhost:3000/test-content-list-0516 (UWAGA: to **inna**, opublikowana strona — patrz 5.0)
> **Pliki źródłowe:** `core/widgets/core/contentList.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/ContentListEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/services/content/contentListResolver.ts` (rozwiązywanie danych runtime)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-content-list-*`, klasy Tailwind grid/gap,
> wartości kontrolek Select/Switch, ARIA, struktura `<article>`/`<time>`/`<a>`,
> read-only podsumowania Advanced), a nie tylko zliczeniem widocznych sekcji.
> Sekcje 4–8 jasno oddzielają: co działa, co nie działa / jest mylące, co faktycznie
> przetestowano i czego NIE testowano.

> Uwaga o screenshotach: w tym audycie weryfikację oparłem **wyłącznie o inspekcję
> DOM** (`eval`) — nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy
> byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/`
> (ignorowanym przez Git), nie są wymaganym evidence w repo. Tymczasowe pliki snapshotów
> `.yml` utworzone w trakcie audytu zostały po zakończeniu usunięte (repo czyste).

---

## 1. Przegląd widgetu

**Typ:** `content-list` · **Kategoria:** `content` · **Opis:** „Dynamic list of entries from selected content type."

**Warianty:** `cards` (domyślny, siatka kart z mediami i metadanymi), `list` (jednokolumnowy strumień artykułów), `compact` (gęsty układ do sidebarów / krótkich kolekcji).

**Kluczowa charakterystyka: to widget data-driven (runtime).** W przeciwieństwie do widgetów o danych „w treści" (np. `faq-accordion`, `accordion`), Content List **nie przechowuje** itemów w payloadzie bloku. Lista jest **rozwiązywana w runtime** z wybranego źródła (typ treści *albo* zapytanie Listings) przez `contentListResolver`. Payload bloku przechowuje jedynie konfigurację (źródło, filtry, prezentację, style) oraz **snapshot** `resolved.*` z ostatniego rozwiązania.

**Model danych (`ContentListData`):**

| Sekcja | Pola |
|--------|------|
| **source** | `mode` (`legacy`=wg typu treści / `listing`=wg zapytania), `contentTypeId`, `listingQueryId`, `listingTemplateId`, `statusScope` (published/all/draft/scheduled/archived), `limit` (1–24), `sort` (6 opcji) |
| **filters** | `taxonomy`, `featuredOnly` (bool), `searchQuery`, `authorId` |
| **title**, **description** | nagłówek sekcji (opcjonalny) |
| **pagination** | `mode` (none/paged/load-more/view-all), `pageSize` (1–24), `viewAllHref`, `viewAllLabel`, `loadMoreLabel` |
| **fields** | `showImage`, `showExcerpt`, `showMeta`, `showCta` (4× bool) |
| **emptyState** | `title`, `description` |
| **style** | `columns` (1/2/3), `gap` (none/sm/md/lg), `cardStyle` (outlined/elevated/minimal), `imageAspect` (compact/standard/wide/square), `tagMode` (meta-line/badges/hidden), `tagLimit` (1–4), `ctaLabel`, `backgroundColor`/`borderColor`/`textColor` (3× clearable) |
| **resolved** (read-only, runtime) | `items[]`, `total`, `sourceTypeId/Slug`, `listPath`, `listingQueryId/TemplateId`, `resolvedAt`, `runtime` (page/pageSize/totalPages/prev/next/rejectedTokens/searchQuery), `error` |

**Ograniczenia:** `limit`/`pageSize` 1–24 (`contentListLimitMax=24`), `tagLimit` 1–4.

**Stany renderera (`data-content-list-state`):**
- `missing-source` — brak związanego źródła → placeholder „Choose a content type/listing query in widget settings…".
- `empty` — źródło związane, ale `resolved.items` puste → blok „Empty state" (title + description).
- `ready` — są itemy → siatka `<article>` + opcjonalna nawigacja paginacji.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie widać komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `faq-accordion`, `accordion`, `tabs`.

**Podział własności (potwierdzony przez `editorContract` i UI):**
- **Wizard owns source** — wybór źródła (tryb, typ treści / zapytanie + szablon), oraz „source rules" (status scope, sort, limit).
- **Visual owns daily edits** — wariant (`editorCapabilities.visualOwnsVariantSelection=true`), filtry editorialne, kontekst sekcji, paginacja, pola prezentacji, kolory, empty state. Sekcja „Daily filters" pokazuje źródło z Wizarda jako **read-only** i pozwala edytować tylko filtry.
- **Advanced is read-only** — trzy sekcje podsumowań (Source / Style / Runtime), zero edytowalnych kontrolek.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | 2 sekcje: **Source setup** (Source mode select + zależnie: ContentType select z wyszukiwarką *albo* Listing query + Listing template selecty) i **Source rules** (legacy: Status scope + Sort; listing: tekst-hint; zawsze: Item limit). |
| **Visual** | zakładka „Visual" | 8 sekcji widgetu: **Variant and layout**, **Daily filters**, **Section context**, **Pagination and actions**, **Presentation fields**, **Surface colors**, **Empty state** + współdzielone **Block layout** i **Device visibility**. |
| **Advanced** | zakładka „Advanced" | 3 sekcje read-only widgetu: **Source summary**, **Style summary**, **Runtime summary** + współdzielone **Block layout summary** i **Visibility summary**. |

---

## 3. NAJWAŻNIEJSZY niuans: podgląd w adminie NIE rozwiązuje danych na żywo

To kluczowe dla zrozumienia całego audytu i jest jawnie zakomunikowane w UI (tekst pod „Section context"): **„Builder canvas shows saved resolved data. Save or open Preview to refresh live results."**

Co to oznacza w praktyce (zweryfikowane w DOM):
- Canvas adminowy renderuje `ContentListBlock` z **zapisanym** snapshotem `resolved.items` — **nie** odpala resolvera przy każdej edycji.
- Fixture adminowy (`blk-1`) **nie ma związanego źródła** → canvas pokazuje stan `missing-source` (placeholder), `data-content-list-items="0"`.
- Nawet po **związaniu** typu treści w edytorze canvas przechodzi do stanu `empty` (nie `ready`) — bo snapshot `resolved.items` jest pusty aż do zapisu/Preview. Potwierdzenie w Advanced: przy związanym „House Projects Catalog QA" pole **„Resolved source: Not configured"** i **„Last refresh: Not refreshed yet"**, podczas gdy **„Source binding: House Projects Catalog QA"**.

**Konsekwencja dla audytu:** większości kontrolek prezentacji (columns, gap, card style, pola, kolory, tag mode, image aspect, paginacja) **nie da się zweryfikować wizualnie w canvasie adminowym bez zapisu** i związanego źródła z itemami. Dlatego ich poprawność potwierdziłem przez (a) zmianę stanu kontrolki w UI, (b) propagację do read-only podsumowania Advanced, oraz (c) realny render itemu na froncie (sekcja 5). Kontrolki, które **realnie aktualizują canvas na żywo**, to: **Section title/description**, **Empty state title/description** (gdy stan = `empty`) oraz atrybuty `data-content-list-variant/state/source*`.

---

## 4. Co DZIAŁA — szczegóły (zweryfikowane interakcją + DOM)

### 4.1 Wizard

| Kontrolka | Test | Wynik |
|-----------|------|-------|
| **Source mode** (legacy ↔ listing) | przełączenie obu kierunków | Działa. Przełączenie **czyści** wiązania drugiego trybu: legacy→listing wyczyściło `contentTypeId` (`data-content-list-source=""`), listing→legacy wyczyściło `listingQueryId`. ✓ |
| Placeholder źródła | po przełączeniu trybu | Tekst poprawnie się zmienia: „Choose a content type…" (legacy) ↔ „Choose a listing query…" (listing). ✓ |
| **Content type select** | otwarcie + wybór | Ładuje listę typów treści z przyjaznymi etykietami (np. „News (news-855f2ed1…)", „House Projects Catalog QA") + osobne pole „Search content types" filtrujące. Wybór wiąże źródło → canvas `missing-source`→`empty`, `data-content-list-source` = ID typu. ✓ |
| **Listing query / template selecty** | otwarcie + wybór query | Ładują zapytania Listings (3× „House Projects Catalog Query …") i szablony. Wybór query → `data-listing-query-id` ustawione, stan `empty`, opis pustego stanu przełącza się na listingowy „Adjust the listing query or publish matching entries." ✓ |
| **Source rules** (zależne od trybu) | legacy vs listing | Legacy: widoczne Status scope + Sort (selecty). Listing: zastąpione hintem „Listing mode uses filters and sorting from the selected Listings query." ✓ |
| **Item limit** (1–24) | ustawienie 15 | Spinbutton przyjmuje wartość; **wartość przetrwała przełączenie trybu** legacy→listing (15). ✓ |

### 4.2 Visual — kontrolki i efekt (zweryfikowane w DOM)

| Kontrolka | Test | Efekt |
|-----------|------|-------|
| **Variant cards** (Cards/List/Compact) | wszystkie 3 | `data-content-list-variant` aktualizuje się (`cards`/`list`/`compact`). ✓ |
| **Columns** — warunkowa widoczność | List/Compact | Dla wariantów innych niż `cards` kontrolka Columns zamienia się w read-only hint **„Columns only affect the cards variant."**; dla `cards` wraca jako Select. ✓ (poprawna logika — `supportsColumns = variant==='cards'`) |
| Columns Select (1/2/3) | ustawienie „2 columns" | Wartość zapamiętana; potwierdzona w Advanced („3 columns"→po zmianie). ✓ |
| Gap Select (none/sm/md/lg) | „Spacious spacing" | Wartość zapamiętana. ✓ |
| **Card style cards** (Outlined/Elevated/Minimal) | „Elevated" | Zaznaczenie przenosi się (badge „Selected" na Elevated). ✓ |
| **Daily filters — źródło read-only** | — | Source mode / Content type / Status scope / Sort wyświetlane jako read-only (własność Wizarda), z instrukcją „Change the binding in Wizard". ✓ |
| Taxonomy filter (input + datalist) | wpis „nowoczesne" | Input przyjmuje wartość. Datalist podpowiedzi renderuje się **tylko** gdy typ treści ma terminy taksonomii; „House Projects Catalog QA" nie miał → brak datalisty (zgodne z kodem; pokazywany jest komunikat „No taxonomy suggestions available for this content type."). ✓ |
| Author search + Author filter select | otwarcie | Ładuje użytkowników admina (Access User, Assistant Action DB Actor, …) + filtr „Search authors". Wybór wiąże `filters.authorId`. ✓ |
| Search query input | wpis „dom parterowy" | Przyjmuje wartość. ✓ |
| Featured only switch | toggle | `aria-checked=true`. ✓ |
| **Section title** | wpis „Najnowsze wpisy" | **Live** w canvasie: `<h2>` + `aria-labelledby="blk-1-title"`. ✓ |
| **Section description** | wpis | **Live** w canvasie: `<p>` + `aria-describedby="blk-1-description"`. ✓ |
| **Pagination — Navigation mode** | none/paged/load-more/view-all | Pola warunkowe pojawiają się poprawnie: **Page size** (dla każdego trybu ≠ none, z tooltipem „info"), **Load more label** (tylko load-more), **View all destination** (picker strony) + **View all label** (tylko view-all). ✓ |
| **Presentation — Show image** | toggle OFF | Select „Image ratio" **znika**, zastąpiony hintem „Enable Show image to configure image ratio." ✓ |
| Show excerpt / Show meta / Show CTA | obecne, domyślnie ON | Switche działają. ✓ |
| **Tag display** (meta-line/badges/hidden) | „Hidden" | Pole „Tag limit" **znika** dla `hidden`. ✓ |
| Tag limit (1–4) | obecne dla ≠ hidden | Spinbutton. ✓ |
| **CTA label** | wpis „Zobacz projekt" | Input przyjmuje wartość. ✓ |
| **Surface colors — Clear** | Clear na „Card background" | Badge przechodzi „Saved custom color"→**„Theme default"**; usuwa wartość. ✓ |
| Surface colors — swatch | ustawienie „Card border" = `#ff0000` | Swatch przyjmuje custom hex; potwierdzone w Advanced jako „Selected color". ✓ |
| **Empty state — Title/Description** | wpis „Brak projektów" / „Zmień filtry…" | **Live** w canvasie (gdy stan = `empty`): tekst empty-state aktualizuje się natychmiast. ✓ |

### 4.3 Advanced (read-only)

Tryb Advanced jest **w 100% read-only** (brak edytowalnych kontrolek widgetu) i **wiernie** odzwierciedlał stan moich niezapisanych edycji w Wizard/Visual:

- **Source summary:** „Source mode: By content type", „Source binding: Content type: House Projects Catalog QA", „Source rules: Limit 6 · Published only · Newest published first", „Daily filters: Taxonomy: No taxonomy filter · Search: No search text · Featured: All entries · Author: No author filter". ✓
- **Style summary:** „Layout: 3 columns · Balanced spacing · Outlined cards"; „Card and text colors: **Background: Theme default · Border: Selected color · Text: Theme token selected**" — dokładnie odzwierciedla: wyczyszczone tło, custom `#ff0000` na borderze, niezmieniony token na tekście. ✓
- **Runtime summary** (jawnie „sanitized … without item titles or draft/private content"): „Runtime result: 0 items rendered · 0 items available", „Resolved source: Not configured", „Runtime pagination: Pagination runtime not available", „Runtime navigation: Previous page not available · Next page not available", „Runtime health: 0 filtered tokens suppressed · No runtime errors", „Last refresh: Not refreshed yet", „Support owner: Wizard owns source setup. Visual owns filters and presentation. Advanced is read-only." ✓

Plus współdzielone „Block layout summary" (Content width: default) i „Visibility summary".

---

## 5. Testy na froncie (public)

### 5.0 WAŻNE: route public to INNA strona niż fixture adminowy

Route `/test-content-list-0516` to **osobna, opublikowana** strona — **nie** ten sam dokument co fixture adminowy `e07ab9e8` (`blk-1`). Dowody z DOM:
- `data-listing-block-id="e26838bd-4647-441d-a39a-dbdab577548a"` (admin: `blk-1`),
- ma **związane źródło** `data-content-list-source="c99bd4cf-…"` (typ treści „House Projects Catalog QA"),
- `data-content-list-state="ready"`, `data-content-list-items="1"`.

To korzystne dla audytu: fixture adminowy demonstruje **stan nie-związany** (`missing-source`, edytor), a route public demonstruje **rzeczywisty render runtime** związanego źródła z itemem.

### 5.1 Render itemu (state = ready) — działa end-to-end

Strona zwraca `200` i renderuje **1 realny `<article>`** rozwiązany z typu treści:

```json
{
  "tag": "ARTICLE",
  "data-content-list-item": "1",
  "data-content-list-status": "published",
  "h3": "Dom Aurora 148",
  "titleLink": "/house-projects-catalog-qa-20260430/dom-aurora-148-qa-20260430",
  "img": null,
  "meta": "May 3, 2026 • Patryk",
  "time": "2026-05-03T19:00:12.453Z",
  "excerpt": "Nowoczesny dom rodzinny z otwartą strefą dzienną.",
  "cta": "Read more",
  "ctaAria": "Read more: Dom Aurora 148",
  "ctaHref": "/house-projects-catalog-qa-20260430/dom-aurora-148-qa-20260430"
}
```

- **Tytuł jako link** do strony szczegółu wpisu. ✓
- **Meta** „May 3, 2026 • Patryk" z poprawnym `<time datetime="2026-05-03T19:00:12.453Z">` (data sformatowana, separator `•`, autor). ✓
- **Excerpt** renderowany. ✓
- **CTA** „Read more" z **dostępną etykietą** `aria-label="Read more: Dom Aurora 148"` (zawiera tytuł — dobry wzorzec a11y) i `href` do szczegółu. ✓
- **Brak obrazka** — ten item nie ma `imageSrc`, więc `<img>` poprawnie **nie jest renderowany** (logika `showImage = fields.showImage && Boolean(item.imageSrc)`), brak „pustej ramki". ✓
- Wrapper listy: `grid grid-cols-1 gap-5` (ta strona ma `columns=1`, `gap=md`, wariant `cards`). ✓

### 5.2 Dostępność i semantyka sekcji

- Brak skonfigurowanego tytułu na tej stronie → sekcja używa fallbacku **`aria-label="Content list"`** (gdy jest tytuł — `aria-labelledby` na `<h2>`). ✓
- 1× `<article>` (`articleCount=1`). ✓
- `max-width: 1152px` (`max-w-6xl`). ✓

### 5.3 Konsola i responsywność

- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- **Brak nawigacji paginacji** (`nav[aria-label*=pagination]` nieobecny) — zgodne z `pagination.mode="none"` na tej stronie i pojedynczym itemem. ✓

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas (`blk-1`, fixture) | Frontend (`test-content-list-0516`) | Uwagi |
|--------|--------------------------------|-------------------------------------|-------|
| Źródło | brak (niezwiązane) → `missing-source` | związane (typ treści) → `ready` | różne strony |
| Rozwiązywanie itemów | **snapshot zapisany** (stale, 0 itemów) | **live w runtime** (1 item) | patrz sekcja 3 |
| Atrybuty `data-content-list-*` | obecne, spójny wzorzec | obecne, spójny wzorzec | ✓ wspólny renderer |
| Render `<article>` | brak (placeholder/empty) | pełny (tytuł-link, meta+`<time>`, excerpt, CTA z aria) | ✓ kontrakt spójny |
| Fallback `aria-label` sekcji | „Content list" (gdy brak title) | „Content list" (gdy brak title) | ✓ |
| Konsola | n/d (edytor) | 0 błędów / 0 ostrzeżeń | ✓ |

**Wniosek:** renderer jest wspólny (`ContentListBlock`), a kontrakt DOM identyczny. Nie udało się przeprowadzić porównania **tych samych danych** admin↔front, bo fixture adminowy i route public to różne strony (fixture nie ma źródła, route ma). Niemniej oba środowiska są wewnętrznie spójne, a najistotniejsza różnica wynika z architektury: admin pokazuje **zapisany** snapshot danych, front rozwiązuje dane **na żywo**.

---

## 7. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Canvas adminowy nie jest live (architektura, nie bug)** | Renderer / edytor | Podgląd w adminie renderuje **zapisany** snapshot `resolved.items`, nie odpala resolvera przy edycji. Skutek: po związaniu źródła canvas pokazuje `empty` (nie itemy), a większości kontrolek prezentacji nie widać w podglądzie aż do Save/Preview. Jest to **jawnie zakomunikowane** tekstem pomocniczym, więc traktuję jako świadomą decyzję projektową, ale to istotne ograniczenie ergonomii edycji (autor nie widzi efektu większości stylów bez zapisu). |
| **N2 — Niespójne etykietowanie koloru: Visual vs Advanced** | Visual / Advanced (kolory) | Ta sama wartość tokenu motywu `var(--color-text)` jest w **Visual** opisana jako **„Saved custom color"** (badge + „A saved custom color is configured."), a w **Advanced** poprawnie jako **„Theme token selected"**. Dwa różne komunikaty dla identycznej wartości — mylące. |
| **N3 — Domyślne kolory wyglądają jak „custom" w Visual** | Visual (Surface colors) | Fixture/`defaults` mają `backgroundColor/borderColor/textColor` ustawione na tokeny `var(--color-*)`. Skutek: **od razu po dodaniu widgetu** wszystkie 3 kontrolki pokazują „Saved custom color" i swatch z **fallback-hexem** (`#ffffff` / `#d4d4d8` / `#0f172a`), który **nie odzwierciedla** rzeczywistego koloru tokenu. Użytkownik może błędnie sądzić, że ma ustawiony własny kolor (a faktycznie to token motywu). Dopiero „Clear" daje stan „Theme default". |
| **N4 — Swatch koloru nie pokazuje rzeczywistej wartości tokenu** | Visual (Surface colors) | Powiązane z N2/N3: gdy wartość to `var(--color-*)`, picker (`<input type=color>`) nie potrafi jej wyświetlić i pokazuje `pickerFallback` (sztywny hex). Wizualnie sugeruje konkretny kolor, który może nie odpowiadać aktualnemu motywowi. |
| **N5 — Brak datalisty taksonomii dla typu bez terminów** | Visual (Daily filters) | Dla „House Projects Catalog QA" brak terminów taksonomii → brak podpowiedzi (`datalist` nieobecny), pokazywany hint „No taxonomy suggestions available for this content type." To **poprawne** zachowanie, ale w praktyce input taksonomii bywa „ślepy" (free-text bez podpowiedzi) — odnotowane jako niuans, nie bug. |

**Nie wykryto:** żadnego błędu konsoli (front: 0/0), żadnego twardego buga renderowania, żadnej rozbieżności w zachowaniu wspólnie testowanych kontrolek. Cała logika warunkowa edytora (Columns dla cards, Image ratio przy Show image, Tag limit przy Tag display, pola paginacji per tryb, Source rules per tryb, czyszczenie wiązań przy zmianie source mode) **działa poprawnie**. Advanced jest wiernym, sanityzowanym read-only podsumowaniem. Frontend renderuje realny item end-to-end z poprawną semantyką i a11y.

---

## 8. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture adminowego. W związku z tym **nie** zweryfikowałem trwałości moich edycji po przeładowaniu ani ich propagacji na front. Zweryfikowałem natomiast **spójność w obrębie sesji** (Visual/Wizard → Advanced wiernie podsumowuje) oraz **izolację** (fixture pozostał `cards`/`missing-source`).
- **Awaria sesji przeglądarki:** w trakcie testów Visual sesja Playwright raz padła; zalogowałem się ponownie i **potwierdziłem, że fixture nie został zmieniony** (po reloginie wrócił do `cards`/`missing-source` — moje niezapisane edycje przepadły, co dowodzi czystości fixture). Część kontrolek Visual przetestowałem ponownie po reloginie.
- **Wizualny efekt kontrolek prezentacji w adminie:** ponieważ canvas nie ma itemów (N1), **nie** zweryfikowałem wizualnie w adminie układu kolumn/gap/card style/kolorów/tagów na realnych kartach — potwierdziłem je przez stan kontrolki + propagację do Advanced + render itemu na froncie.
- **Render obrazka i `imageAspect`:** jedyny item na froncie nie miał `imageSrc`, więc nie zaobserwowałem renderu `<img>` ani klas proporcji (compact/standard/wide/square) na realnym obrazku.
- **Układy wielokolumnowe i `gap` na realnych danych:** strona public ma 1 item i `columns=1`, więc nie zaobserwowałem `md:grid-cols-2 lg:grid-cols-3` ani różnych odstępów na realnej siatce.
- **Runtime paginacji na danych:** strona public ma `mode=none` i 1 item — nie zaobserwowałem realnych linków Previous/Next, „Load more" ani „View all" generowanych przez resolver.
- **Tagi (`meta-line` / `badges`):** item na froncie nie ujawnił tagów w meta (tylko data + autor), więc renderu tagów nie potwierdziłem na realnych danych.
- **Tryb `listing` na froncie:** strona public używa trybu `legacy` (typ treści); renderu listingowego na froncie nie obserwowałem (tylko edytor + canvas w adminie).
- **Filtrowanie efektywne** (taxonomy/search/featured/author wpływające na zbiór wyników) i **normalizacja limitów** (clamp 1–24, `tagLimit` 1–4) — to logika data-driven wymagająca zapisu + rozwiązania; nie testowana.
- **Sekcje współdzielone wrappera (Block layout, Device visibility):** poza zakresem audytu Content List (odnotowana tylko ich obecność).

---

## 9. Podsumowanie

- Widget **content-list jest w dobrym, spójnym stanie funkcjonalnym**. Wszystkie przetestowane kontrolki Wizard (source mode + czyszczenie wiązań, content type/listing selecty z wyszukiwarką, status/sort/limit, hint dla trybu listing) i Visual (warianty, warunkowa widoczność Columns/Image ratio/Tag limit, filtry editorialne, section title/description live, paginacja z polami warunkowymi per tryb, pola prezentacji, kolory z Clear + swatch, empty state live) **działają i zachowują się zgodnie z logiką kontraktu edytora**. Advanced jest w 100% read-only i wiernie, sanityzowanie podsumowuje stan. Frontend renderuje realny wpis end-to-end (tytuł-link, meta+`<time>`, excerpt, CTA z aria), bez błędów konsoli i bez overflow na 375 px.
- **Najważniejszy niuans (N1):** podgląd w adminie pokazuje **zapisany** snapshot danych i nie rozwiązuje itemów na żywo — to świadoma, ale istotna dla ergonomii decyzja (większości stylów nie widać bez Save/Preview). Jawnie zakomunikowana w UI.
- **Drugie znalezisko (N2–N4):** niespójne i mylące etykietowanie kolorów — tokeny motywu `var(--color-*)` pokazują się w Visual jako „Saved custom color" z fallback-hexem (a w Advanced poprawnie jako „Theme token selected"). Domyślny stan widgetu wygląda więc jak „custom color", co może wprowadzać w błąd.
- **Drobne (N5):** input taksonomii bez podpowiedzi dla typu bez terminów (poprawne, lecz „ślepe").
- Nie znaleziono żadnego twardego buga renderowania, błędu konsoli ani rozbieżności w zachowaniu wspólnie testowanych kontrolek. Główna „różnica" admin↔front (zapisany snapshot vs live resolve) wynika z architektury data-driven, nie z błędu.
- **Ograniczenie audytu:** fixture adminowy (niezwiązany, `missing-source`) i route public (związany, `ready`, 1 item) to **różne strony**, więc bezpośrednie porównanie tych samych danych nie było możliwe; potwierdziłem natomiast spójność kontraktu DOM i renderera między oboma środowiskami. Nie zapisywałem zmian, by nie modyfikować współdzielonego fixture.

---

## 10. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o
> inspekcję DOM (`eval`) i snapshoty drzewa dostępności. Ewentualne pliki PNG byłyby
> **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/` (katalog
> ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do repo.
