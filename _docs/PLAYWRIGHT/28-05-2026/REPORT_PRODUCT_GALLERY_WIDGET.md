# RAPORT: Product Gallery Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade wcześniejszego raportu z 2026-05-28)
> **Sesja Playwright:** `claude-29-05-product-gallery-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/1edd10a5-7626-4630-aa47-87c6604fcc62` (strona „Contract Test - product-gallery", status Draft)
> **Fixture public:** http://localhost:3000/test-product-gallery-widget (HTTP `200`)
> **Viewport testowy:** 1280×800 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/productGallery.tsx` (renderer `ProductGalleryBlock` + typy + normalizacja + query input) · `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` (edytory Wizard/Visual/Advanced + hook podglądu `useProductGalleryPreview`) · `core/admin/services/productGalleryPreviewClient.ts` (klient preview, POST `/widgets/product-gallery/preview` z CSRF) · współdzielone: `CommerceWidgetEditorShared.tsx`, `SharedColorControl.tsx`, `ClearableFields.tsx`, `LinkDestinationField.tsx`

> **Uwaga metodologiczna (różnica względem poprzedniego raportu):** to przejście jest **celowo bardziej wyczerpujące** niż poprzednie. Tam, gdzie kontrolka ma skończoną liczbę dyskretnych opcji, **przeklikałem każdą opcję co najmniej raz**, a nie tylko reprezentatywny podzbiór:
> - **Sort field** — wszystkie **8** wartości (Title, Slug, Status, Price, Stock, Created, Updated, Published),
> - **Sort direction** — **obie** (Ascending, Descending),
> - **Status filter** — wszystkie **3** checkboxy (draft, published, archived),
> - **Collections** — **oba** checkboxy (Fixture Homes, Fixture Lofts),
> - **Variant** — **oba** radio-cardy (Cards, Compact),
> - **Card content** — wszystkie **4** toggle (każdy off→on),
> - **Link target** — **obie** wartości (same-tab, new-tab),
> - **CTA style** — wszystkie **3** (text, button, none),
> - **Product selection (curation)** — **oba** tryby (query, manual) + zaznaczenie wszystkich **3** produktów + reorder (Down) + Remove,
> - **More products action** — **oba** tryby (none, view-all) + picker stron + „Clear destination" + Link label,
> - **Surfaces** — wszystkie **4** kontrolki koloru (Card background/border, Empty background/border) + **każdy** przycisk „Clear",
> - **Columns** — wszystkie **3** (2/3/4),
> - **Card style** — **obie** (outlined, minimal).
>
> Każde stwierdzenie „działa / nie działa" zweryfikowano realną interakcją w UI **oraz** inspekcją DOM (`eval`): atrybuty `data-product-gallery-*`, `data-product-id`, klasy grid/gap/karty Tailwind, inline `style`, `aria-labelledby`, `id` nagłówka, hrefy/targety linków, stan checkboxów/switchy/selectów, wartości swatchy `input[type=color]`, stany `disabled` przycisków „Clear". Dla części pól źródła potwierdziłem **realne zastosowanie** filtra przez „Refresh products" w Advanced i odczyt rzeczywistego `resolved` (nie tylko etykiety podsumowania).

> **Uwaga o screenshotach:** weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`) — **nie** zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/` (ignorowanym przez Git); nie są wymaganym evidence w repo.

> **Uwaga o środowisku testowym:** na początku sesji współdzielona VM była **rate-limitowana** — pierwsze żądania zwracały `429 Too Many Requests` na `/admin/api/auth/csrf` i w konsekwencji `403 Forbidden` / „Invalid CSRF token" na `/admin/api/widgets/product-gallery/preview` (Advanced pokazywał „Preview warning"). Po krótkiej chwili i kliknięciu „Refresh products" preview zaczął działać i resolwował 3 produkty. To **efekt obciążenia VM (równolegle pracuje kilka sesji agentów), nie bug widgetu** — ścieżka preview i CSRF działa, gdy limit się zresetuje.

---

## 1. Przegląd widgetu

**Typ:** `product-gallery` · **Tytuł:** „Product Gallery" · **Kategoria:** `content` · **Opis:** „Product cards with runtime query source and stock/price metadata."

**Warianty (zweryfikowane na żywo, oba):**

| Wariant | Klasa grid | Klasa karty | Media (aspect) |
|---------|-----------|-------------|----------------|
| `cards` (domyślny) | `gap-4` | `space-y-3 rounded-xl p-4` | `aspect-[4/3]` |
| `compact` | `gap-3` | `space-y-2 rounded-lg p-3`, `h3 text-sm` | `aspect-[5/4]` |

**Charakter źródła danych:** widget **commerce** — pobiera produkty z runtime'u commerce przez query (limit, search, kolekcje, status, sort, zakres cen) albo z ręcznie wybranej listy (curation manual). Renderuje karty z metadanymi: tytuł, slug, excerpt, cena (+ przekreślona `compareAt`), badge stocku, opcjonalny badge statusu. Współdzieli normalizację źródła z innymi widgetami commerce (`normalizeCommerceWidgetSource`, `buildCommerceWidgetQueryInput`).

**Model danych (`ProductGalleryData`):** sekcje `source` (limit 1–48, search, collectionIds[] max 30, status[] max 3, sortField z 8 wartości, sortDir, minPriceMinor, maxPriceMinor), `link` (basePath — **poza** edytorem, target, ctaLabel, ctaStyle), `header` (title, description), `pagination` (mode none/view-all, viewAllHref, viewAllLabel), `curation` (mode query/manual, productIds[] max 48), `fields` (showExcerpt, showPrice, showStock, showStatus, **showMediaHint** — patrz N7), `emptyState` (title, description), `style` (columns 2/3/4, cardStyle outlined/minimal + 4 „clearable" kolory), `resolved` (read-only snapshot: items[], total, resolvedAt, error).

**Renderowanie:** `<section data-widget="product-gallery">` z atrybutami `data-product-gallery-count/total/curation/pagination`. Opcjonalny nagłówek (`<h2>` + `<p>`). Pasek statusu podglądu (loading/warning — tylko editor-preview). Dalej albo **empty-state** (`<div role="status" aria-live="polite">` w trybie edytora) albo **siatka kart**. Każda karta to `<article data-product-id aria-labelledby={titleId}>`: opcjonalny obraz (`loading="lazy"`, tylko gdy `media.url`), `<h3 id>` + slug, opcjonalny excerpt, rząd badge'y (cena + przekreślony compare-at, status, stock), opcjonalne CTA. Gdy `link.basePath` istnieje, treść karty owinięta jest w `<a>`. Na końcu opcjonalny link „view all" oraz (tylko editor-preview) stopka „Last resolved: …".

**editorCapabilities:** `visualOwnsVariantSelection = true` (wybór wariantu należy do Visual), `supportsPreviewState = true`.

**Fixture commerce (zweryfikowany realnie w tej sesji):** 2 kolekcje **„Fixture Homes"** i **„Fixture Lofts"** oraz 3 opublikowane produkty (blockId admina `blk-1`, blockId frontu `6210b73f-…`):

| Produkt | Slug | Cena | Compare-at | Stock |
|---------|------|------|-----------|-------|
| Fixture Garden Suite | `/fixture-garden-suite` | $159.00 | $179.00 | In stock |
| Fixture Urban Loft | `/fixture-urban-loft` | $299.00 | $349.00 | Backorder |
| Fixture Starter Home | `/fixture-starter-home` | $199.00 | $249.00 | In stock |

Żaden produkt fixture **nie ma przypisanego media** (brak grafik). Stan zapisany (opublikowany) to konfiguracja domyślna: `cards`, query, limit 8, sort `Updated desc`, pola domyślne (`showExcerpt/Price/Stock` on, `showStatus` off), bez nagłówka, kolory domyślne, kolumny 3, card style `outlined`, pagination none.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*) i kończy przyciskiem **„Finish setup and open Visual"**. To ten sam wzorzec co `posts-feed`/`gallery-mosaic`/`feature-grid`/`tabs`. **Podczas Wizarda zakładki Visual/Advanced są ukryte** — żeby zajrzeć do Advanced trzeba najpierw „Finish setup".

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | 2 sekcje widgetowe: **Product source** (Limit, Search, Collections — checkboxy, Sort field — **Radix combobox**, Sort direction — **Radix combobox**, Status filter — checkboxy draft/published/archived) i **Price filters** (Minimum/Maximum price, ceny „shopper-facing", przeliczane do `*Minor`). Dodatkowo własny panel **„Live preview"**. |
| **Visual** | zakładka „Visual" | **9 sekcji widgetowych** + współdzielone **Block layout** i **Device visibility**. |
| **Advanced** | zakładka „Advanced" | **5 read-only sekcji widgetowych** + współdzielone **Block layout summary** i **Visibility summary**. Jedyna edytowalna kontrolka w całym widgetowym Advanced to przycisk **„Refresh products"** (potwierdzone tej sesji: **0 inputów / 0 selectów / 0 textarea / 0 switchy / 0 checkboxów** w panelu, jedyny przycisk = „Refresh products"). |

**9 sekcji Visual:** (1) **Variant and structure** — radio-cardy Cards/Compact; (2) **Section header** — Title, Description; (3) **Card content** — 4 toggle; (4) **Product links** — info o routingu poza edytorem + Link target (`<select>`), CTA label, CTA style (`<select>`); (5) **Curated products** — Product selection (`<select>` query/manual), w manual picker z checkboxami + Up/Down/Remove; (6) **More products link** — More products action (`<select>` none/view-all), w view-all Destination page (Radix picker stron) + Link label; (7) **Empty state** — Title, Description; (8) **Surfaces** — 4× `SharedColorControl` (swatch `input[type=color]` + „Clear", **bez** pola tekstowego i **bez** „Use transparent" — `showValueInput=false`, `allowTransparent` nieustawione); (9) **Presentation** — Columns (`<select>` 2/3/4), Card style (`<select>` outlined/minimal), „Columns preview".

**Kluczowy niuans architektoniczny — LAZY PREVIEW (patrz N2):** hook pobierający produkty (`useProductGalleryPreview`) jest wywoływany **wyłącznie wewnątrz `ProductGalleryAdvancedEditor`** (gdy `editorMode === "advanced"`). Wizard i Visual **nigdy nie inicjują fetchu**. Po wejściu na stronę (otwiera się w Visual) canvas korzysta z zapisanego, **pustego** snapshotu `resolved` → „No products found" + „Last resolved: Not resolved yet", mimo że w systemie są 3 produkty. **Doprecyzowanie względem poprzedniego raportu:** gdy już raz wejdzie się w Advanced (auto-fetch na mount) lub kliknie „Refresh products", `previewState` zostaje wypełniony i jest **współdzielony** — wtedy zarówno canvas Visual, jak i panel „Live preview" w Wizardzie **pokazują rozwiązane 3 produkty** (potwierdziłem realnie: po pierwszym refreshu panel „Live preview" Wizarda wyświetlił „Preview ready" i 3 karty). Czyli „Live preview" **nie** jest trwale pusty — odzwierciedla współdzielony stan podglądu; mylący jest tylko moment **pierwszego** ładowania (zanim ktokolwiek wejdzie w Advanced) oraz brak własnego fetchu po zmianie źródła (N3).

---

## 3. Pełny zakres przetestowanych interakcji (wyczerpujący)

Wszystkie interakcje wykonano w sesji `claude-29-05-product-gallery-exhaustive`.

### 3.1 Wizard — Product source + Price filters
- **Limit:** 8 → 2 (potem 8 i 1 w innych próbach). Realna weryfikacja: limit 2 obciął wynik do 2 z total 3.
- **Search:** wpisany realny term **„loft"** → resolved 1 karta („Fixture Urban Loft"); osobno **„zzzznomatch"** → 0 wyników (test empty-state); puste → „None".
- **Collections:** zaznaczone **oba** checkboxy (Fixture Homes + Fixture Lofts) → Advanced „2 collections selected"; odznaczone z powrotem.
- **Sort field (Radix combobox):** przeklikane **wszystkie 8** opcji — za każdym razem etykieta triggera zmieniała się poprawnie (Title → Slug → Status → Price → Stock → Created → Published → Updated).
- **Sort direction (Radix combobox):** **obie** — Ascending i Descending (trigger odzwierciedlał wybór).
- **Status filter:** zaznaczone **wszystkie 3** (draft, published, archived) → Advanced „3 status filters selected"; odznaczone z powrotem.
- **Minimum/Maximum price:** 150.00 / 400.00 (pola utrzymują wartości „shopper-facing"); wyczyszczone z powrotem.

### 3.2 Visual — kontrolki prezentacyjne i treści
- **Variant:** Cards → Compact → Cards (klasy grid/karty zmieniają się na żywo).
- **Section header:** Title „Nasze produkty", Description „Opis galerii testowej" → render `<h2>`+`<p>`.
- **Card content:** wszystkie 4 toggle off (excerpt/price/stock) + status on, następnie przywrócone (round-trip OK).
- **Product links:** Link target → new-tab i z powrotem same-tab; CTA label „Zobacz produkt"; CTA style → button → none → text (wszystkie 3 ustawiają `value`).
- **Curated products:** query → manual; w manual zaznaczone kolejno Starter, Garden (kolejność = kolejność zaznaczeń), dodany Urban; reorder „Down" na Starter (swap); „Remove" środkowego (Starter) → zostało {Garden, Urban}.
- **More products link:** none → view-all; Destination page = „HomePage" (Radix picker, lista wszystkich opublikowanych stron); Link label „Zobacz wszystkie produkty"; „Clear destination"; z powrotem none.
- **Empty state:** Title „Brak produktów (test)", Description „Zmień filtry zapytania (test opisu).".
- **Surfaces:** swatche ustawione kolejno Card background `#ff0000`, Card border `#00ff00`, Empty background `#0000ff`, Empty border `#ffff00`/`#00ff00`; następnie **każdy z 4** przycisków „Clear" kliknięty osobno (każdy przeszedł z aktywnego w `disabled`, inline-style znikał).
- **Presentation:** Columns 2 → 4 → 3 (grid + „Columns preview" zgodne); Card style minimal → outlined.

### 3.3 Advanced (read-only) + Refresh products
- Odczyt wszystkich 5 sekcji read-only; potwierdzenie zerowej edytowalności (0 pól, tylko „Refresh products").
- Wierność Source summary względem edycji Wizard (limit, search, collections, status, sort z mapowaniem etykiet).
- Mechanizm staleness: „Source changed. Refresh products to update preview." + „Preview needs refresh" + utrzymanie **starego** resolved aż do odświeżenia.
- „Refresh products" z filtrami (limit 2 + 2 kolekcje + 3 statusy + cena 150–400 + sort Title A-Z) → resolved **2 z total 3**, kolejność Title A-Z (Garden, Starter).
- „Refresh products" z search „loft" → resolved **1** (Urban Loft).
- „Refresh products" z curation **manual** {Garden, Urban} → resolved 2, `curation="manual"`, w **mojej** kolejności.
- „Refresh products" z view-all + limit 1 → canvas renderuje link „view all".
- Porównanie formatu „Last resolved" (Advanced ISO vs canvas en-US).

### 3.4 Frontend (`/test-product-gallery-widget`)
- HTTP 200, atrybuty sekcji, ARIA kart, treść kart (cena/compare-at/stock), brak linków/obrazów, brak nagłówka/empty-state/footera, konsola, responsywność 375 px, izolacja niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard (Product source + Price filters)
Wszystkie kontrolki **utrzymują stan w UI** i są **wiernie odzwierciedlane w Advanced → Source summary**. Zmiany źródła **nie** aktualizują canvasu/„Live preview" na żywo (lazy preview — N2/N3); efekt potwierdzałem po „Refresh products".

| Kontrolka | Test | Efekt (zweryfikowany) |
|-----------|------|------------------------|
| Limit (spinbutton 1–48) | 8 → 2 | Pole „2"; Advanced „Product limit: 2 products"; po refreshu wynik obcięty do 2 z total 3. ✓ |
| Search | „loft" / „zzzznomatch" / „" | Advanced „Configured" / „None"; po refreshu „loft" → 1 karta (Urban Loft), „zzzznomatch" → 0 (empty-state). ✓ |
| Sort field (Radix, 8 opcji) | każda z 8 | Trigger zmienia się dla wszystkich 8; „Title"+„Ascending" → Advanced „Sort: Title, A to Z". ✓ |
| Sort direction (Radix, 2) | Ascending / Descending | Trigger odzwierciedla wybór; mapowanie sortu w Advanced poprawne. ✓ |
| Collections (2 checkboxy) | oba zaznaczone | Advanced „2 collections selected"; po refreshu (union Homes∪Lofts) total 3. ✓ |
| Status filter (3 checkboxy) | wszystkie 3 | Advanced „3 status filters selected". ✓ |
| Minimum / Maximum price | 150.00 / 400.00 | Pola utrzymują wartości; po refreshu wszystkie 3 produkty w zakresie. ✓ |
| **Realne złożenie filtrów** | refresh | limit 2 + union kolekcji + 3 statusy + cena 150–400 + Title A-Z → **2 z total 3** w kolejności Title A-Z (Garden, Starter). Dowód, że limit, sort, cena, status i kolekcje są **realnie** stosowane w resolved query. ✓ |

Collections renderują się jako **checkboxy** (gdy dostępne); ręczne wpisywanie kluczy ukryte („support-owned"). „Finish setup and open Visual" wraca do Visual i przywraca komunikat „Setup complete". ✓

### 4.2 Visual — kontrolki i efekt w canvas
Kontrolki **prezentacyjne** (nie-źródłowe) aktualizują canvas **na żywo** (bez refetchu) — czysty rendering:

| Kontrolka | Test | Efekt w canvas (DOM) |
|-----------|------|----------------------|
| Variant Cards/Compact | oba | `gap-4`/`space-y-3 rounded-xl p-4` ↔ `gap-3`/`space-y-2 rounded-lg p-3`. ✓ |
| Section header Title/Description | custom | `<h2>` + `<p>` opisu. ✓ |
| Card content — Show excerpt | off→on | Excerpt znika/wraca. ✓ |
| Card content — Show price | off→on | Cena **i** compare-at znikają/wracają. ✓ |
| Card content — Show stock badge | off→on | Badge „Stock: …" znika/wraca. ✓ |
| Card content — Show status badge | on→off | Pojawia/znika badge „Status: Published". ✓ |
| Product links — Link target | new-tab / same-tab | `value` selectu zapisany. ✓ (zapis) — patrz N4 (brak widocznego efektu bez basePath) |
| Product links — CTA label | „Zobacz produkt" | Wartość zapisana. ✓ (zapis) |
| Product links — CTA style | text/button/none | Wszystkie 3 ustawiają `value`. ✓ (zapis) — brak renderu CTA (N4) |
| Curated products → Manual | select | Picker z 3 produktami (checkbox + slug + status). ✓ |
| Manual — zaznaczanie | Starter, Garden, Urban | „Selected order" z Up/Down/Remove; kolejność = kolejność zaznaczeń; `disabled` na skrajnych Up/Down. ✓ |
| Manual — reorder (Down) | Starter „Down" | Swap → {Garden, Starter}. ✓ |
| Manual — Remove | środkowy (Starter) | Usuwa pozycję → {Garden, Urban}; licznik „Selected products: 2". ✓ |
| Manual — realny render | refresh | resolved = {Garden, Urban} w **mojej** kolejności, `data-product-gallery-curation="manual"`, total 2. Manual nadpisuje query i zachowuje kolejność. ✓ |
| More products → view-all | select | Odsłania „Destination page" (Radix picker) + „Link label". ✓ |
| More products — Destination | „HomePage" | „Links to selected site page: HomePage." ✓ |
| More products — Link label | „Zobacz wszystkie produkty" | Wartość zapisana. ✓ |
| More products — realny render | limit 1 + refresh | `total 3 > items 1` → canvas renderuje `<a href="/homepage">Zobacz wszystkie produkty</a>` (same-tab, brak `target`). ✓ |
| More products — Clear destination | klik | Destination → „No page selected"; link „view all" **znika** (N5). ✓ |
| Empty state — Title/Description | custom | Po 0 wynikach canvas renderuje moje teksty; kontener `role="status"` + `aria-live="polite"` (editor-preview). ✓ |
| Surfaces — Card background | `#ff0000` | Inline `background-color: rgb(255,0,0)` na karcie; „Clear" aktywny. ✓ |
| Surfaces — Card border | `#00ff00` | Inline `border-color: rgb(0,255,0)` (przy outlined); „Clear" aktywny. ✓ |
| Surfaces — Empty background | `#0000ff` | Inline `background-color: rgb(0,0,255)` na empty-state (przy 0 wynikach). ✓ |
| Surfaces — Empty border | `#00ff00` | Inline `border-color: rgb(0,255,0)` na empty-state. ✓ |
| Surfaces — 4× „Clear" | każdy osobno | Każdy klik usuwa inline-style (karta wraca do `bg-[var(--color-bg)]` / `border-[var(--color-border)]`), przycisk wraca w `disabled`. Wszystkie 4 potwierdzone indywidualnie. ✓ |
| Columns 2/3/4 | wszystkie 3 | `md:grid-cols-2` / `md:grid-cols-3` / `md:grid-cols-2 xl:grid-cols-4`; „Columns preview" 2/3/4 komórki. ✓ |
| Card style outlined/minimal | obie | minimal usuwa `border` + `border-[var(--color-border)]`; outlined je przywraca. ✓ |

**Spójność „Clear" w kolorach:** wszystkie 4 pola koloru korzystają ze wspólnego `SharedColorControl`. Przycisk „Clear" jest poprawnie `disabled` przy braku wartości, aktywny po ustawieniu swatcha, a klik usuwa inline-style. Potwierdzone **na wszystkich 4** (a nie reprezentatywnie). Badge statusu pokazuje „Theme default" (brak) / „Selected swatch" (hex).

### 4.3 Advanced (read-only) — wierność i diagnostyka
- **Read-only:** 0 edytowalnych kontrolek w panelu widgetowym (0 input/select/textarea/switch/checkbox); jedyny przycisk „Refresh products". ✓
- **Product behavior:** „Source mode: Query results"/„Selected products", „Selected products: N products" (zaobserwowane 0 i 2), „Card route: Not configured", „More products link: Hidden"/„Shown". ✓
- **Source summary:** wiernie odzwierciedla edycje Wizard (limit, search Configured/None, collections, status, sort z mapowaniem — np. „Title, A to Z", „Recently updated first"). ✓
- **Preview status:** „Preview ready / Resolved items: N · Total: M / Last resolved: …" + „Refresh products". Przy błędzie środowiskowym: „Preview warning" + „Invalid CSRF token". Stany „Preview needs refresh" (stale) i „Preview empty" również wystąpiły. ✓
- **Mechanizm staleness:** po zmianie źródła Advanced pokazuje „**Source changed. Refresh products to update preview.**" i utrzymuje **stare** resolved (potwierdzone: utrzymał 3 z 07:35:21 dopóki nie kliknąłem refresh → wtedy 2). ✓
- **Surface summary:** „Card background/border", „Empty state colors: Background: …, border: …" z opisami „Theme default" / „Selected swatch" zgodnie ze stanem kolorów (po wyczyszczeniu card bg/border = „Theme default", po ustawieniu empty bg/border = „Selected swatch"). ✓
- **Contract summary:** poprawny podział własności Wizard / Visual / Advanced. ✓

> Advanced to **żywe lustro stanu roboczego w pamięci** (odzwierciedla niezapisane edycje) i zarazem **jedyne miejsce, które faktycznie inicjuje fetch produktów** (N2).

### 4.4 Frontend (public `/test-product-gallery-widget`)
HTTP **200**; renderuje **zapisaną (opublikowaną) konfigurację fixture** z produktami **rozwiązanymi server-side** (inaczej niż admin — N2):

- `data-product-gallery-count=3`, `total=3`, `curation=query`, `pagination=none`; grid `grid grid-cols-1 gap-4 md:grid-cols-3` (cards, 3 kolumny — domyślne). ✓
- **3 karty** w kolejności `Updated desc` (Garden Suite → Urban Loft → Starter Home), z ceną, **przekreśloną** compare-at i badge stocku („In stock" / **„Backorder"** / „In stock"). `showStatus=false` → brak badge statusu. ✓
- Brak nagłówka (`<h2>` = null). ✓
- Każda karta `<article>` ma `aria-labelledby` wskazujące `id` swojego `<h3>` — poprawna nazwa dostępna karty. ✓
- „Last resolved: …" **poprawnie ukryte** na froncie (tylko editor-preview). ✓
- **Brak obrazów** (`imgCount=0`, brak mediów) i **brak linków** (`linkCount=0`, brak `basePath` → karty nieklikalne, brak CTA, brak „view all" przy `pagination=none`).
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka zwija się do **jednej kolumny** (`grid-template-columns: 375px`). ✓
- **Izolacja:** moje **niezapisane** edycje (compact, columns 2/4, manual curation, view-all/HomePage, custom empty-state, kolory, limit 1, search „zzzznomatch", nagłówek) **NIE wyciekły** na front — front pokazuje wyłącznie stan zapisany. ✓

### 4.5 Device visibility (współdzielony wrapper)
Sekcja pokazuje 3 przełączniki (Desktop/Tablet/Mobile) z etykietą „Hidden", wszystkie `aria-checked=false`. Semantyka: **przełącznik OFF = NIE ukryty = widoczny** (toggle ON dopiero ukrywa). Spójne z publicznym renderem (widget widoczny) — **nie ma tu rozjazdu/bugu**. To shared infrastructure poza zakresem product-gallery; nie modyfikowałem.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI i dostępność)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Karty na froncie i w adminie nie są klikalne (brak linków, brak CTA)** | Renderer / routing | W całym widgetcie jest **0 elementów `<a>`** wokół kart. Tytuły/slug/CTA renderują się jako zwykły tekst. Powód: **`link.basePath` (trasa detalu produktu) nie jest skonfigurowany** — Advanced: „Card route: Not configured", a Product links pisze, że routing jest „managed outside the daily widget editor". CTA renderuje się tylko, gdy istnieje `href`. Galeria jest **nienawigowalna** w tym fixture (identycznie admin i front). Najważniejsze znalezisko z perspektywy realnego użytkownika. |
| **N2 — Lazy preview: fetch produktów inicjuje WYŁĄCZNIE Advanced** | Architektura preview | `useProductGalleryPreview` odpala się tylko w trybie Advanced. Po wejściu na stronę (Visual) canvas korzysta z zapisanego, **pustego** `resolved` → „No products found" + „Last resolved: Not resolved yet", choć są 3 produkty. **Doprecyzowanie:** gdy raz wejdzie się w Advanced (auto-fetch) lub kliknie „Refresh products", `previewState` jest współdzielony i **canvas Visual oraz „Live preview" Wizarda pokazują rozwiązane produkty** (potwierdzone realnie — to nie jest trwały pusty stan). Mylący jest **pierwszy** ekran (przed jakąkolwiek wizytą w Advanced) i to, że żaden tryb „dzienny" nie potrafi samodzielnie zainicjować fetchu. **Realny niuans UX.** |
| **N3 — Zmiany źródła nie aktualizują canvasu na żywo; wymagają „Refresh products"** | Wizard/Visual ↔ Advanced | Zmiana Limit/Search/Collections/Status/Price/Curation **nie** odświeża listy produktów od razu (preview staje się stale — Advanced sygnalizuje to wprost). Zmiany **prezentacyjne** (variant, columns, card style, toggle pól, nagłówek, kolory, empty-state) aktualizują canvas **natychmiast**. Rozdział „query vs presentation" nie jest jasno komunikowany w trybach dziennych. |
| **N4 — Sekcja „Product links" (CTA) bezczynna bez `basePath`** | Visual / Product links | Link target / CTA label / CTA style **zapisują wartości** (potwierdzone wszystkie warianty), ale przy braku `basePath` mają **zerowy widoczny efekt** (`cardHasLink=false`, `ctaRendered=false`). `basePath` **nie jest edytowalne** w Wizard ani Visual. Użytkownik konfiguruje opcje, których nie widać. |
| **N5 — Link „view all" znika cicho, gdy brak celu lub `total ≤ items`** | Visual / pagination | Link renderuje się **tylko** gdy `mode=view-all` **oraz** ustawiony `viewAllHref` **oraz** `total > items.length`. Potwierdzone realnie: przy limit 1 / total 3 + „HomePage" link się pojawia (`/homepage`); po „Clear destination" link **znika** mimo `pagination=view-all` i `total>items`, bez żadnego inline-ostrzeżenia. Przy curation manual 2/2 (`total == items`) również się nie pojawia. |
| **N6 — „Clear" koloru = brak inline koloru, nie token motywu** | Visual / kolory | „Clear" usuwa inline `background-color`/`border-color` całkowicie — karta wraca do klasy `bg-[var(--color-bg)]` / `border-[var(--color-border)]`, a empty-state do braku inline. Zgodne z semantyką „clearable" innych widgetów, ale subtelnie mylące (to powrót do tokenu/przezroczystości, nie jawny kolor). Brak też przycisku „Use transparent" (komponent ma go za flagą `allowTransparent`, tu nieużytą). |
| **N7 — `fields.showMediaHint` to martwe pole (orphan)** | Model danych / renderer / edytor | Pole istnieje w typie, schemacie i normalizacji (`showMediaHint: value.fields?.showMediaHint === true`), ale **nie ma żadnej kontrolki** (Card content ma tylko 4 toggle) i **nie jest używane w rendererze**. Niemożliwe do przetestowania z UI; kandydat do usunięcia lub dokończenia. |
| **N8 — Sekcja widgetu bez dostępnej nazwy (brak `aria-label`/`aria-labelledby`)** | Dostępność | `<section data-widget="product-gallery">` **nigdy** nie dostaje `aria-label`/`aria-labelledby` — **nawet przy ustawionym nagłówku** (potwierdzone: po wpisaniu Title `<h2>` nie ma `id`, sekcja nie ma `aria-labelledby`), a przy braku nagłówka **brak fallbacku** (np. „Product gallery"). Występuje **identycznie w adminie i na froncie**. Regres względem `posts-feed`/`content-list`. Pozytyw: karty `<article aria-labelledby>` → `<h3 id>` są poprawne (na froncie zweryfikowane, że `aria-labelledby` == `id` h3). |
| **N9 — Niespójne prymitywy kontrolek między trybami** | Edytor (UX) | Wizard używa **Radix custom comboboxów** dla Sort field/Sort direction; Visual używa **natywnych `<select>`** dla Columns/Card style/Link target/CTA style/Product selection/More products. Różny look & feel i obsługa (klik-otwórz vs natywny select). Drobne. |
| **N10 — Dwa formaty „Last resolved"** | Advanced / drobiazg | Advanced pokazuje **surowy ISO** (`2026-05-29T07:46:54.228Z` — `resolvedAt` bez formatowania), a stopka canvas editor-preview — **format en-US** (`5/29/2026, 7:46:54 AM`). Ta sama wartość, dwie prezentacje. Kosmetyczne. |
| **N11 — Render obrazów nie do zweryfikowania (brak mediów)** | Dane fixture | Produkty fixture nie mają mediów, więc karty nie renderują `<img>`. Ścieżka renderu obrazu (`item.media.url`, `aspect-[4/3]`/`[5/4]`, `loading=lazy`, `width/height`, `alt = media.alt || title`) **nie została wyzwolona** — wymaga produktu z grafiką. |

**Nie wykryto** żadnego twardego buga renderowania kontrolek, żadnego błędu konsoli (admin i front), ani rozjazdu renderu między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Po jednorazowym zresolvowaniu podglądu **wszystkie** przeklikane opcje Wizard i Visual działają i utrzymują stan; Advanced jest w pełni read-only i wiernie podsumowuje stan roboczy; frontend jest responsywny, bez błędów, poprawny semantycznie na poziomie kart (poza N8). **Najważniejszy realny problem UX to N2/N3** (podgląd nie ładuje się i nie odświeża poza Advanced), a najważniejszy „cichy" brak to N1/N4 (CTA i klikalność kart bez konfigurowalnej ścieżki produktu).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-product-gallery-widget`) | Zgodność |
|--------|----------------------|---------------------------------------------|----------|
| Renderer | żywy `ProductGalleryBlock`, atrybuty `data-product-gallery-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Rozwiązywanie produktów | **dopiero po wejściu w Advanced / Refresh** (3 szt.); współdzielone potem z Visual i „Live preview" | **server-side, od razu 3 szt.** | ⚠ rozjazd momentu (N2) |
| Liczba żywych instancji | w Wizard **2** (canvas + „Live preview"); w Visual/Advanced 1 (canvas) + panele | 1 | ✓ oczekiwane |
| Renderowany stan | moje **niezapisane** edycje (po refreshu) | **opublikowana** konfiguracja (cards, 3 kol., bez nagłówka, bez CTA) | ⚠ celowa izolacja (nie zapisywałem) |
| Treść kart (cena/compare-at/stock/excerpt) | te same reguły | $159/$179, $299/$349, $199/$249, „In stock"/„Backorder" | ✓ |
| blockId (prefix `id` tytułów) | `blk-1` | `6210b73f-…` (UUID bloku) | ✓ oczekiwane (różne konteksty) |
| Obrazy produktów | n/d (brak mediów) | brak (`imgCount=0`) | ✓ oba bez obrazów |
| `aria-label`/`aria-labelledby` na `<section>` | brak (nawet z nagłówkiem) | brak | ⚠ oba (N8) |
| `article[aria-labelledby]` → `h3[id]` | obecne | obecne (`labelledby == h3.id`) | ✓ |
| Linki kart / CTA | brak (brak basePath) | brak (`linkCount=0`) | ✓ oba (N1) |
| „Last resolved" pod galerią | widoczne (editor-preview), format en-US | **ukryte** (poprawnie) | ✓ oczekiwane |
| Empty-state a11y | `role=status` + `aria-live` (editor-preview) | n/d (3 karty, nie empty) | ✓ różnica celowa |
| Responsywność 375 px | n/d | single-column, brak overflow | ✓ |
| Niezapisane edycje | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i spójny; treść kart identyczna co do reguł. **Najważniejsza różnica admin↔front to moment rozwiązywania produktów** (admin: leniwie, inicjuje tylko Advanced; front: automatycznie server-side). Brak linków (N1) i brak nazwy sekcji (N8) występują **identycznie** w obu środowiskach — to nie rozjazd, lecz cechy renderer/konfiguracji.

---

## 7. Czego NIE udało się zweryfikować (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft"/„Publish", aby nie zmieniać współdzielonego fixture. Trwałości moich edycji po przeładowaniu ani propagacji na front **nie** weryfikowałem. Zweryfikowana została **spójność w obrębie sesji** (przełączanie Visual ↔ Wizard ↔ Advanced zachowuje edytowany stan) oraz **izolacja** (front = stan zapisany).
- **Render obrazów produktów (N11):** produkty fixture **nie mają mediów**, więc ścieżka `<img>` (`loading=lazy`, `width/height`, `object-cover`, `alt`) **nie została wyzwolona**. Blokada danych fixture, nie środowiska.
- **Klikalne karty / CTA z działającą trasą (N1/N4):** brak `link.basePath` (i brak możliwości jego ustawienia w edytorze) oznacza, że **nie** przetestowano realnego linka karty, stylów CTA (text/button) na żywej karcie, `target=new-tab` na `<a>` karty ani `rel`/`href`. Sprawdziłem jedynie, że bez basePath żaden link/CTA się nie renderuje, oraz że wartości selectów się zapisują. **Blokada konfiguracji fixture** (basePath jest „managed outside the editor").
- **`fields.showMediaHint` (N7):** brak jakiejkolwiek kontrolki UI w którymkolwiek trybie — **niemożliwe** do przetestowania z poziomu interfejsu.
- **Link „view all" na żywym froncie:** opublikowany fixture ma `pagination=none`, a mojej zmiany na view-all+„HomePage" **nie zapisywałem**, więc linku **nie zweryfikowano na froncie** — tylko jego render w canvasie admina (przy `total>items`).
- **Wariant `compact` na froncie:** fixture zapisany jako `cards`; compact testowałem tylko w canvasie admina (live).
- **Izolacja pojedynczej kolekcji:** testowałem **oba** checkboxy zaznaczone jednocześnie (union Homes∪Lofts → total 3); **nie** izolowałem zawartości każdej kolekcji z osobna w tej sesji (poprzedni raport wskazywał empirycznie Lofts = {Urban, Garden}, ale w tym przejściu tego nie powtarzałem, by nie mnożyć żądań preview pod rate-limit).
- **Pełna macierz sort × dir przez refresh:** przeklikałem **wszystkie 8** sort fields i **obie** dyrekcje w UI (trigger + Advanced summary), ale realnym „Refresh products" potwierdziłem porządek tylko dla „Title, A to Z" (i Updated desc jako stan domyślny). Nie robiłem osobnego refreshu pod każdą z 16 kombinacji (rate-limit).
- **Twarde limity:** nie dochodziłem do `limit=48`, `collectionIds=30`, `productIds=48`; testowałem wartości robocze (1, 2, 8).
- **Stany błędu/ostrzeżenia runtime (`resolved.error` → „Commerce runtime warning"):** nie wystąpiły (poza środowiskowym „Invalid CSRF token", który **nie** jest bugiem widgetu).
- **Wyszukiwanie/filtrowanie wewnątrz pickerów** (produktów, stron) oraz obsługa błędu ładowania ich list: otworzyłem oba i wybierałem elementy, ale nie testowałem wewnętrznego wyszukiwania ani ścieżek błędów.
- **Card border przy outlined vs minimal:** ustawiłem card border na outlined (inline obecny); renderer pomija border color przy `minimal` — tego pominięcia nie weryfikowałem jako osobnego przypadku z ustawionym kolorem + minimal.
- **Współdzielone sekcje wrappera** (Block layout / Device visibility i ich read-only odpowiedniki): poza zakresem audytu; nie modyfikowałem (semantykę Device visibility opisałem w 4.5).
- **Guard `beforeunload`:** front otwierałem w **nowej karcie** — nie opuszczałem karty admina, dialog ostrzegawczy nie był testowany.

---

## 8. Podsumowanie

- Widget **product-gallery jest w dobrym stanie funkcjonalnym** po stronie edytora i renderera. Fixture jest **populated** (3 realne produkty z cenami, compare-at i stanami magazynowymi).
- **Co działa (po przeklikaniu KAŻDEJ dostępnej opcji):** wszystkie kontrolki Wizard (limit, search z realnym filtrowaniem, oba checkboxy kolekcji, **8** sort fields, **obie** dyrekcje, **3** statusy, ceny min/max) zapisują się, są wiernie raportowane w Advanced i — potwierdzone przez „Refresh products" — **realnie filtrują** resolved query. Wszystkie kontrolki Visual (oba warianty, nagłówek, **4** toggle treści, oba link targety, **3** style CTA, oba tryby kuracji z reorderem i Remove, oba tryby more-products z pickerem stron i Clear destination, empty-state, **4** kolory z **4** indywidualnie sprawdzonymi „Clear", **3** kolumny, oba card style) aktualizują podgląd na żywo. Advanced jest poprawnie read-only (0 edytowalnych pól, tylko „Refresh products"), wiernie podsumowuje stan i sygnalizuje staleness. Frontend zwraca 200, renderuje 3 karty z poprawną treścią, jest responsywny (375 px bez overflow), bez błędów konsoli, poprawny na poziomie kart, z poprawną izolacją niezapisanych edycji.
- **Najważniejszy realny problem UX (N2/N3):** podgląd produktów **inicjuje się wyłącznie w Advanced**, a zmiany źródła nie odświeżają go na żywo. Po pierwszym resolve dane są współdzielone (Visual i „Live preview" Wizarda je pokazują), ale autor pracujący tylko w trybach „dziennych" nie zobaczy produktów / efektu zmian źródła bez wejścia w Advanced i „Refresh products".
- **Najważniejszy „cichy" brak (N1/N4):** karty są nieklikalne, a „Product links" (CTA) bezczynne bez `link.basePath`, którego **nie da się ustawić** w Wizard/Visual.
- **Pozostałe niuanse:** link „view all" znika cicho gdy brak celu lub `total ≤ items` (N5, potwierdzone realnie z „Clear destination"); „Clear" koloru = przezroczystość/token, nie jawny kolor (N6); **martwe pole `showMediaHint`** (N7); **brak `aria-label`/`aria-labelledby` na sekcji nawet z nagłówkiem** — regres dostępności (N8); Radix combobox vs natywny select między trybami (N9); dwa formaty „Last resolved" (N10); render obrazów nieweryfikowalny bez mediów (N11).
- **Sprawdzone i NIE będące bugiem:** „Device visibility" (OFF/„Hidden" = widoczny) spójne z publicznym renderem (4.5); rate-limit `429/403` to obciążenie VM, nie widget.
- **Plusy:** wspólny renderer admin↔front, data-driven źródło z realnym filtrowaniem (limit/sort/cena/status/kolekcje), manual picker zachowujący kolejność (z reorderem i Remove), pełna read-only diagnostyka z mechanizmem staleness, spójne „Clear" z disabled-state dla **wszystkich 4** kolorów, dostępne karty (`article[aria-labelledby]` → `h3[id]`), bezpieczne `href` (`normalizeWidgetSafeHref`), `loading=lazy` w ścieżce obrazu, `role=status`/`aria-live` na empty-state w editor-preview, compare-at z przekreśleniem i poprawne różne stany stock, działający „Refresh products".

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję DOM (`eval`) oraz snapshoty drzewa dostępności playwright-cli. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git); nie są wymaganym evidence i nie zostały dołączone do repo.
