# RAPORT: Product Gallery Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-product-gallery` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/1edd10a5-7626-4630-aa47-87c6604fcc62` (strona „Contract Test - product-gallery", status Draft)
> **Fixture public:** http://localhost:3000/test-product-gallery-widget (HTTP `200`)
> **Viewport testowy:** 1280×800 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/productGallery.tsx` (renderer `ProductGalleryBlock` + typy + normalizacja + query input) · `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` (edytory Wizard/Visual/Advanced + hook podglądu) · `core/admin/services/productGalleryPreviewClient.ts` (klient preview, POST `/widgets/product-gallery/preview` z CSRF) · współdzielone: `CommerceWidgetEditorShared.tsx`, `SharedColorControl.tsx`, `LinkDestinationField.tsx`

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-product-gallery-*`, `data-product-id`,
> klasy grid/gap/karty Tailwind, inline `style`, ARIA sekcji i kart, `aria-labelledby`,
> hrefy linków, stan checkboxów/switchy/pól), a nie tylko zliczeniem widocznych sekcji.
> Część stwierdzeń o produktach wymagała jednorazowego odświeżenia preview w trybie
> Advanced (patrz niżej, niuans lazy-preview). Sekcje 4–8 jasno oddzielają: co działa,
> co nie działa / jest mylące, co faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`) —
> nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy byłyby **wyłącznie
> lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/` (ignorowany przez
> Git), nie są wymaganym evidence w repo.

> Uwaga o środowisku testowym: współdzielona VM była w trakcie sesji **rate-limitowana**.
> Pierwsze żądania preview zwracały `429 Too Many Requests` na `/admin/api/auth/csrf`
> oraz w konsekwencji `403 Invalid CSRF token` na `/widgets/product-gallery/preview`.
> Po krótkiej chwili i ponownym kliknięciu „Refresh products" preview działał poprawnie.
> To **efekt obciążenia VM (równolegle pracowało kilka sesji agentów), nie bug widgetu** —
> sama ścieżka preview i CSRF działa, gdy limit się zresetuje.

---

## 1. Przegląd widgetu

**Typ:** `product-gallery` · **Tytuł:** „Product Gallery" · **Kategoria:** `content` · **Opis:** „Product cards with runtime query source and stock/price metadata."

**Warianty:**

| Wariant | Charakterystyka | Klasy (zweryfikowane w DOM) |
|---------|-----------------|------------------------------|
| `cards` (domyślny) | Siatka kart dla wyróżnionych produktów | siatka `gap-4`, karta `space-y-3 rounded-xl p-4`, media `aspect-[4/3]` |
| `compact` | Gęsta siatka z minimalnym spacingiem | siatka `gap-3`, karta `space-y-2 rounded-lg p-3`, media `aspect-[5/4]`, mniejszy `h3 text-sm` |

**Charakter źródła danych:** to widget **commerce** — pobiera produkty z runtime'u commerce przez query (limit, search, kolekcje, status, sort, zakres cen) albo z ręcznie wybranej listy (curation manual). Renderuje karty z metadanymi: tytuł, slug, excerpt, cena (+ przekreślona cena `compareAt`), badge stocku, opcjonalnie badge statusu. Współdzieli normalizację źródła z innymi widgetami commerce (`normalizeCommerceWidgetSource`, `buildCommerceWidgetQueryInput`).

**Model danych (`ProductGalleryData`):**

| Sekcja | Pola |
|--------|------|
| **source** | `limit` (1–48), `search`, `collectionIds[]` (max 30), `status[]` (draft/published/archived, max 3), `sortField` (title/slug/status/pricing.amount/stock.state/createdAt/updatedAt/publishedAt), `sortDir` (asc/desc), `minPriceMinor`, `maxPriceMinor` |
| **link** | `basePath` (zarządzany **poza** edytorem widgetu), `target` (same-tab/new-tab), `ctaLabel`, `ctaStyle` (text/button/none) |
| **header** | `title`, `description` |
| **pagination** | `mode` (none/view-all), `viewAllHref`, `viewAllLabel` |
| **curation** | `mode` (query/manual), `productIds[]` (max 48) |
| **fields** | `showExcerpt`, `showPrice`, `showStock`, `showStatus`, `showMediaHint` |
| **emptyState** | `title`, `description` |
| **style** | `columns` (2/3/4), `cardStyle` (outlined/minimal), `cardBackground`, `cardBorderColor`, `emptyBackground`, `emptyBorderColor` (wszystkie 4 kolory „clearable") |
| **resolved** | read-only snapshot runtime: `items[]`, `total`, `resolvedAt`, `error` |

**Renderowanie:** `<section data-widget="product-gallery">` z atrybutami `data-product-gallery-count/total/curation/pagination`. Opcjonalny nagłówek (`<h2>` + opis `<p>`). Następnie pasek statusu podglądu (loading/warning — tylko w editor-preview), a dalej albo **empty-state** (`<div role="status" aria-live="polite">` w trybie edytora) albo **siatka kart**. Każda karta to `<article data-product-id aria-labelledby={titleId}>`: opcjonalny obraz (`loading="lazy"`, tylko gdy `media.url`), `<h3 id>` + slug, opcjonalny excerpt, rząd badge'y (cena + przekreślona compare-at, status, stock), opcjonalne CTA. Gdy `link.basePath` istnieje, treść karty owinięta jest w `<a>`. Na końcu opcjonalny link „view all" oraz (w editor-preview) stopka „Last resolved: …".

**editorCapabilities:** `visualOwnsVariantSelection = true` (wybór wariantu należy do Visual, nie do Wizarda), `supportsPreviewState = true`.

**Fixture commerce (zweryfikowane realnie):** strona ma realne kolekcje **„Fixture Homes"** i **„Fixture Lofts"** oraz 3 opublikowane produkty:

| Produkt | Slug | Cena | Compare-at | Stock |
|---------|------|------|-----------|-------|
| Fixture Garden Suite | `/fixture-garden-suite` | $159.00 | $179.00 | In stock |
| Fixture Urban Loft | `/fixture-urban-loft` | $299.00 | $349.00 | Backorder |
| Fixture Starter Home | `/fixture-starter-home` | $199.00 | $249.00 | In stock |

Empirycznie ustaliłem (przez filtr kolekcji + refresh w Advanced), że **kolekcja „Fixture Lofts" zawiera {Urban Loft, Garden Suite}**. Żaden produkt fixture **nie ma przypisanego media** (brak grafik). Zapisany (opublikowany) stan widgetu to konfiguracja domyślna: `cards`, query, limit 8, sort `Updated desc`, pola domyślne (`showExcerpt/Price/Stock` on, `showStatus` off), bez nagłówka, kolory domyślne, kolumny 3, card style `outlined`.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*) i kończy przyciskiem **„Finish setup and open Visual"**. To ten sam wzorzec co w `posts-feed`/`gallery-mosaic`/`feature-grid`/`tabs`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | 2 sekcje: **Product source** (Limit, Search, Collections — checkboxy, Sort field, Sort direction, Status filter — checkboxy draft/published/archived) i **Price filters** (Minimum/Maximum price, ceny „shopper-facing", przeliczane do `*Minor`). Dodatkowo własny panel **„Live preview"** („Reflects the current Wizard state through the shared widget renderer."). |
| **Visual** | zakładka „Visual" | **9 sekcji widgetowych** (niżej) + współdzielone **Block layout** i **Device visibility** = **11 widocznych sekcji**. |
| **Advanced** | zakładka „Advanced" | **5 read-only sekcji widgetowych** + współdzielone **Block layout summary** i **Visibility summary**. Jedyna kontrolka edytowalna w całym Advanced to przycisk **„Refresh products"** (potwierdzone: 0 inputów / 0 selectów / 0 textarea / 0 switchy / 0 comboboxów). |

**9 sekcji Visual:** (1) **Variant and structure** — karty Cards/Compact; (2) **Section header** — Title, Description; (3) **Card content** — 4 toggle: Show excerpt / Show price / Show stock badge / Show status badge; (4) **Product links** — info o routingu poza edytorem + Link target (`<select>`), CTA label, CTA style (`<select>`); (5) **Curated products** — Product selection (`<select>` query/manual), w trybie manual picker produktów z Up/Down/Remove; (6) **More products link** — More products action (`<select>` none/view-all), w trybie view-all Destination page (picker stron) + Link label; (7) **Empty state** — Title, Description; (8) **Surfaces** — 4× `SharedColorControl` (Card background/border, Empty background/border) z `<input type=color>`, Clear i badge; (9) **Presentation** — Columns (`<select>` 2/3/4), Card style (`<select>` outlined/minimal), „Columns preview".

**Kluczowy niuans architektoniczny — LAZY PREVIEW (patrz N2):** hook pobierający produkty (`useProductGalleryPreview`) jest wywoływany **wyłącznie wewnątrz `ProductGalleryAdvancedEditor`**. Wizard i Visual **nie odpalają fetchu**. W praktyce po wejściu na stronę (otwiera się w Visual) canvas korzysta z zapisanego, **pustego** snapshotu `resolved` → widoczny „No products found" i „Last resolved: Not resolved yet", mimo że w systemie są 3 produkty. Dopiero przejście na **Advanced** automatycznie próbuje pobrać preview (a przycisk „Refresh products" wymusza ponowny fetch). W trybie Wizard renderowane są **dwie** instancje `ProductGalleryBlock` (główny canvas + panel „Live preview"), obie współdzielą ten sam `previewState` i obie pokazują empty-state.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonano w sesji `claude-28-05-product-gallery` i zweryfikowano inspekcją DOM:

- **Wizard:** zmiana Limit (8→2 i →1), wybór Sort field (Radix combobox → Title), zaznaczenie kolekcji „Fixture Lofts", zaznaczenie statusu „published", Minimum/Maximum price (150.00/400.00), Search (no-match), obserwacja braku live-update canvasu po zmianach źródła oraz panelu „Live preview".
- **Visual:** Section header (title→`<h2>`, description→`<p>`), 4 toggle Card content (każdy włącz/wyłącz), Variant (Cards→Compact), Columns (→4 + „Columns preview"), Card style (→minimal), Surfaces (Card background `#ff0000` + „Clear", Empty background `#0000ff`, Empty border `#00ff00`), Product links (CTA label, CTA style→button, target→new-tab), Curated products (query→manual, picker, zaznaczenie 2 produktów, reorder ↓), More products link (none→view-all, destination→HomePage, label), Empty state (custom title/description + wymuszony render przy 0 wynikach).
- **Advanced:** odczyt wszystkich 5 sekcji read-only, potwierdzenie zerowej edytowalności, weryfikacja wierności Source summary względem edycji Wizard, mechanizm staleness („Source changed…"), działanie „Refresh products" (z filtrami i z curation manual), porównanie formatu „Last resolved" (Advanced vs canvas).
- **Frontend:** render zapisanego (opublikowanego) stanu, status HTTP, ARIA sekcji i kart, metadane kart, brak linków/obrazów, brak błędów konsoli, responsywność 375 px, izolacja niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard (Product source + Price filters)

Wszystkie kontrolki **utrzymują stan w UI** i są **wiernie odzwierciedlane w Advanced → Source summary**. **Uwaga:** zmiany źródła **nie** aktualizują canvasu ani panelu „Live preview" na żywo (lazy preview — N2/N3); efekt na liście produktów potwierdziłem dopiero po „Refresh products" w Advanced.

| Kontrolka | Test | Efekt (zweryfikowany) |
|-----------|------|------------------------|
| Limit (spinbutton 1–48) | 8 → 2 | Pole utrzymuje „2"; Advanced Source summary: „Product limit: 2 products". ✓ |
| Sort field (**Radix combobox**) | → Title | Lista 8 opcji (Title/Slug/Status/Price/Stock/Created/Updated/Published); etykieta przycisku → „Title"; Advanced: „Sort: Title, Z to A" (przy domyślnym dir desc). ✓ |
| Collections | check „Fixture Lofts" | Checkbox `checked`; Advanced: „Collections: 1 collection selected". ✓ |
| Status filter | check „published" | Checkbox `checked`; Advanced: „Status filters: 1 status filter selected". ✓ |
| Minimum / Maximum price | 150.00 / 400.00 | Pola utrzymują wartości („shopper-facing", przeliczane do groszowych). ✓ |
| **Realne zastosowanie filtrów** | po „Refresh products" | Wynik: 2 karty — „Fixture Urban Loft" ($299) i „Fixture Garden Suite" ($159), w kolejności Title Z-A. Potwierdza, że kolekcja Fixture Lofts = {Urban Loft, Garden Suite}, filtr ceny 150–400, status i limit 2 zostały **realnie zastosowane** w resolved query. ✓ |

Collections renderują się jako **checkboxy** (gdy kolekcje są dostępne); ręczne wpisywanie kluczy kolekcji celowo ukryte („support-owned"). Sekcja „Product source" ma czytelne teksty pomocnicze (zachowanie kolekcji legacy, znaczenie pustego statusu: „public pages show published, preview can show all"). „Finish setup and open Visual" wraca do Visual i przywraca komunikat „Setup complete". ✓

### 4.2 Visual — kontrolki i efekt w canvas

Kontrolki **prezentacyjne** (nie-źródłowe) aktualizują canvas **na żywo** (bez refetchu), bo to czysty rendering:

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|---------------------------------------|
| Section header — Title | „Nasze produkty" | Renderuje `<h2>` z tekstem. ✓ |
| Section header — Description | „Opis galerii testowej" | Renderuje `<p>` opisu pod tytułem. ✓ |
| Card content — Show price | off | Cena (i compare-at) znika z karty. ✓ |
| Card content — Show stock badge | off | Badge „Stock: …" znika. ✓ |
| Card content — Show status badge | on | Pojawia się badge „Status: Published". ✓ |
| Card content — Show excerpt | off → on | Excerpt („City-forward loft listing…") znika/wraca. ✓ |
| Variant → Compact | karta „Compact" | Grid `gap-4`→`gap-3`; karta `space-y-3 rounded-xl p-4`→`space-y-2 rounded-lg p-3`. ✓ |
| Columns → 4 | select | Grid `md:grid-cols-2 xl:grid-cols-4`; „Columns preview" renderuje 4 komórki. ✓ |
| Card style → Minimal | select | Karta traci klasę `border border-[var(--color-border)]`. ✓ |
| Surfaces — Card background | swatch `#ff0000` | Inline `background-color: rgb(255, 0, 0)` na każdej karcie. ✓ |
| Surfaces — Card background „Clear" | po ustawieniu koloru | Przycisk „Clear" przechodzi z `disabled` w aktywny; klik usuwa inline `background-color` (karta wraca do `bg-[var(--color-bg)]`). ✓ |
| Surfaces — Empty background / Empty border | `#0000ff` / `#00ff00` | Inline `background-color: rgb(0,0,255)` i `border-color: rgb(0,255,0)` na kontenerze empty-state. ✓ |
| Curated products → Manual | select | Pojawia się picker z 3 produktami (checkbox + slug + status `published`). ✓ |
| Manual — zaznaczanie + reorder | Starter→Garden, potem „Down" na Starter | Lista „Selected order" z Up/Down/Remove; po reorderze kolejność: Garden Suite, Starter Home. ✓ |
| Manual — realny render | po „Refresh products" | Resolved: dokładnie 2 wybrane produkty **w mojej kolejności** (Garden Suite, Starter Home), `data-product-gallery-curation="manual"`, Total: 2 — manual nadpisuje query i zachowuje kolejność. ✓ |
| More products link → view-all | select + destination „HomePage" + label | Odsłania picker „Destination page" + pole „Link label"; po ustawieniu limit=1 (total 2 > items 1) canvas renderuje link **„Zobacz wszystkie produkty" → `/homepage`**. ✓ |
| Empty state — Title / Description | „Brak produktów (test)" / „Zmień filtry zapytania (test opisu)." | Po wymuszeniu 0 wyników (search no-match) canvas renderuje **moje** teksty; kontener ma `role="status"` + `aria-live="polite"` (w editor-preview). ✓ |
| Product links — CTA style / Link target | → button / new-tab | Wartości natywnych `<select>` zapisane; **brak widocznego CTA** (patrz N4). ✓ (zapis), ✗ (efekt) |

**Spójność „Clear" w kolorach:** wszystkie 4 pola koloru (Card background / Card border / Empty background / Empty border) korzystają ze wspólnego `SharedColorControl` — swatch `type=color` + przycisk „Clear" (poprawnie `disabled` gdy kolor pusty, aktywny gdy ustawiony). Potwierdzone na 3 z 4 (card bg, empty bg, empty border); card border dzieli ten sam komponent.

### 4.3 Advanced (read-only) — wierność i diagnostyka

- **Read-only:** 0 edytowalnych kontrolek; jedyny przycisk to „Refresh products". ✓
- **Product behavior:** „Source mode: Query results"/„Selected products", „Selected products: N products", „Card route: Not configured", „More products link: Hidden/Shown". ✓
- **Source summary:** wiernie odzwierciedla edycje Wizard (Product limit, Search, Collections, Status filters, Sort — np. „Title, Z to A"). ✓
- **Preview status:** „Preview ready / Resolved items: N · Total: M / Last resolved: …" + „Refresh products". Przy błędzie: „Preview warning" + komunikat (np. „Invalid CSRF token"). ✓
- **Mechanizm staleness:** po zmianie źródła Advanced pokazuje „**Source changed. Refresh products to update preview.**" oraz „Preview needs refresh" i utrzymuje **stare** resolved aż do odświeżenia. ✓
- **Contract summary:** poprawny podział własności Wizard / Visual / Advanced. ✓

> Advanced to **żywe lustro stanu roboczego w pamięci** (odzwierciedla niezapisane edycje), a zarazem **jedyne miejsce, w którym faktycznie uruchamiany jest fetch produktów** (N2).

### 4.4 Frontend (public `/test-product-gallery-widget`)

Strona zwraca **HTTP `200`** i renderuje **zapisaną (opublikowaną) konfigurację fixture** — z produktami **rozwiązanymi po stronie serwera** (inaczej niż admin — patrz sekcja 6):

- `data-product-gallery-count=3`, `total=3`, `curation=query`, `pagination=none`; grid `grid grid-cols-1 gap-4 md:grid-cols-3` (cards, kolumny 3 — wartości domyślne; moje niezapisane Compact/4-kolumny się **nie wyciekły**). ✓
- **3 karty** w kolejności `Updated desc` (Garden Suite → Urban Loft → Starter Home), z ceną, **przekreśloną** ceną `compareAt` (`.line-through` obecne) i badge stocku („In stock" / **„Backorder"** / „In stock" — różne stany renderują się poprawnie). `showStatus=false` (domyślnie) → brak badge statusu. ✓
- Brak nagłówka (`<h2>` = null). ✓
- Każda karta `<article>` ma `aria-labelledby` wskazujące `id` swojego `<h3>` — poprawna dostępna nazwa karty. ✓
- „Last resolved: …" **poprawnie ukryte** na froncie (renderuje się tylko w editor-preview). ✓
- **Brak obrazów** (`imgCount=0`, produkty bez mediów) i **brak linków** (`linkCount=0`, brak `basePath` → karty nieklikalne, brak CTA, brak „view all" przy `pagination=none`).
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka zwija się do **jednej kolumny** (`grid-template-columns: 375px`). ✓
- **Izolacja:** moje **niezapisane** edycje w adminie (compact, columns 4, manual curation, view-all/HomePage, custom empty-state, kolory, limit 1, search no-match) **NIE wyciekły** na front — front pokazuje wyłącznie stan zapisany. ✓

### 4.5 Device visibility (współdzielony wrapper)

Sekcja „Device visibility" pokazuje 3 przełączniki (Desktop/Tablet/Mobile) z etykietą „Hidden", wszystkie `aria-checked=false`. Semantyka: **przełącznik OFF = NIE ukryty = widoczny** (toggle ON dopiero ukrywa). Jest to **spójne** z publicznym renderem (widget widoczny na froncie) — **nie ma tu rozjazdu/bugu**. Sekcja to shared infrastructure, poza zakresem product-gallery; nie modyfikowałem jej.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI i dostępność)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Karty na froncie i w adminie nie są klikalne (brak linków, brak CTA)** | Renderer / routing | W całym widgetcie jest **0 elementów `<a>`** wokół kart (poza ewentualnym „view all"). Tytuły, slug i CTA renderują się jako zwykły tekst. Powód: **`link.basePath` (trasa detalu produktu) nie jest skonfigurowany** — Advanced: „Card route: Not configured", a sekcja Product links pisze, że routing jest „managed outside the daily widget editor". CTA renderuje się tylko, gdy istnieje `href`. Skutek: galeria jest **nienawigowalna** w tym fixture (identycznie admin i front). Zależne od konfiguracji tras commerce, ale dla realnego użytkownika to **najważniejsze znalezisko**. |
| **N2 — Lazy preview: w Visual/Wizard canvas pokazuje „No products found", choć produkty istnieją** | Architektura preview | Fetch produktów (`useProductGalleryPreview`) odpala się **tylko w trybie Advanced**. Po wejściu na stronę (otwiera się w Visual) canvas i panel „Live preview" Wizarda korzystają z zapisanego, **pustego** snapshotu `resolved` → „No products found" + „Last resolved: Not resolved yet". Edytor treści pracujący w Visual/Wizard może uznać galerię za pustą/zepsutą, podczas gdy front renderuje 3 produkty bez problemu. Produkty „pojawiają się" w adminie dopiero po przejściu na Advanced (auto-fetch na mount) lub kliknięciu „Refresh products". Panel „Live preview" Wizarda jest tu szczególnie mylący — deklaruje „Reflects the current Wizard state through the shared widget renderer", a w praktyce nie pobiera danych. **Realny, mylący niuans UX.** |
| **N3 — Zmiany źródła nie aktualizują canvasu na żywo; wymagają „Refresh products"** | Wizard/Visual ↔ Advanced | Zmiana Limit/Search/Collections/Status/Price/Curation **nie** odświeża listy produktów w canvasie od razu (preview staje się stale). Trzeba przejść do Advanced i kliknąć „Refresh products". Natomiast zmiany **prezentacyjne** (variant, columns, card style, toggle pól, nagłówek, kolory, empty-state) aktualizują canvas **natychmiast**. Rozdział „query vs presentation" nie jest jasno komunikowany w UI. |
| **N4 — Sekcja „Product links" (CTA) w dużej mierze bezczynna bez `basePath`** | Visual / Product links | Kontrolki Link target / CTA label / CTA style **zapisują wartości**, ale przy braku `basePath` mają **zerowy widoczny efekt** (potwierdzone: `cardHasLink=false`, `ctaRendered=false`). `basePath` **nie jest edytowalne** w Wizard ani Visual. Użytkownik konfiguruje opcje, których nie widać. |
| **N5 — Link „view all" znika cicho, gdy `total ≤ items` lub brak celu** | Visual / pagination | Link „more products" renderuje się **tylko** gdy `mode=view-all` **oraz** ustawiony cel (`viewAllHref`) **oraz** `total > items.length`. Gdy wszystkie pasujące produkty mieszczą się w limicie (np. manual 2/2), link **nie pojawia się** mimo poprawnej konfiguracji — bez żadnego inline-ostrzeżenia. Po ustawieniu limitu mniejszego niż total link renderuje się poprawnie (`/homepage`). |
| **N6 — „Clear" koloru = brak inline koloru, nie token motywu** | Visual / kolory | „Clear" usuwa inline `background-color`/`border-color` całkowicie (karta/empty-state wraca do `var(--color-bg)`/braku obramowania), zamiast wracać do jawnego tokenu. Zgodne z semantyką „clearable" innych widgetów, ale subtelnie mylące. |
| **N7 — `fields.showMediaHint` to martwe pole (orphan)** | Model danych / renderer / edytor | Pole `showMediaHint` istnieje w typie, schemacie i normalizacji (`showMediaHint: value.fields?.showMediaHint === true`), ale **nie ma żadnej kontrolki w edytorze** (Card content ma tylko 4 toggle) i **nie jest używane w rendererze**. Można je zapisać, lecz nie ma żadnego efektu — kandydat do usunięcia lub dokończenia. |
| **N8 — Sekcja widgetu bez dostępnej nazwy (brak `aria-label`/`aria-labelledby`)** | Dostępność | `<section data-widget="product-gallery">` **nigdy** nie dostaje `aria-label` ani `aria-labelledby` — nawet przy ustawionym nagłówku (`<h2>` nie ma `id`, brak `aria-labelledby`), a przy braku nagłówka **brak fallbacku** (np. „Product gallery"). Regres względem `posts-feed`/`content-list`, które mają fallback `aria-label` i wiążą `aria-labelledby` z nagłówkiem. Pozytyw: karty `<article>` **są** poprawnie opisane przez `aria-labelledby` → `<h3>`. |
| **N9 — Niespójne prymitywy kontrolek między trybami** | Edytor (UX) | Wizard używa **Radix custom comboboxów** (przyciski) dla Sort field/direction (z `CommerceSourceFields`), a Visual używa **natywnych `<select>`** dla Columns/Card style/Link target/CTA style/Product selection/More products. Różny look & feel i obsługa (klik-otwórz vs natywny select). Drobne. |
| **N10 — Dwa formaty „Last resolved"** | Advanced / drobiazg | Panel Advanced pokazuje **surowy ISO** (`2026-05-28T19:41:06.851Z` — `previewResolved.resolvedAt` bez formatowania), a stopka canvas editor-preview — **format lokalny** (`5/28/2026, 7:41:06 PM`). Ta sama wartość, dwie prezentacje. Kosmetyczne. |
| **N11 — Brak obrazów nie do zweryfikowania wizualnie** | Dane fixture | Produkty fixture nie mają mediów, więc karty nie renderują `<img>`. Ścieżka renderu obrazu (`item.media.url`, `aspect-[4/3]`/`[5/4]`, `loading=lazy`, alt = `media.alt`/tytuł) **nie została potwierdzona** — wymaga produktu z grafiką. |

**Nie wykryto** żadnego twardego buga renderowania kontrolek, żadnego błędu konsoli (admin i front), ani rozjazdu render między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Po jednokrotnym zresolvowaniu podglądu wszystkie testowane kontrolki Wizard i Visual działają i utrzymują stan; Advanced jest w pełni read-only i wiernie podsumowuje stan roboczy; frontend jest responsywny, bez błędów i poprawny semantycznie (poza N8). **Najważniejszy realny problem UX to N2** (podgląd produktów nie ładuje się poza Advanced), a najważniejszy „cichy" brak to N1/N4 (CTA i klikalność kart bez konfigurowalnej ścieżki produktu).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-product-gallery-widget`) | Zgodność |
|--------|----------------------|---------------------------------------------|----------|
| Renderer | żywy `ProductGalleryBlock`, atrybuty `data-product-gallery-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Rozwiązywanie produktów | **dopiero po wejściu w Advanced** (3 szt.); w Visual/Wizard początkowo empty-state | **server-side, od razu 3 szt.** | ⚠ rozjazd (N2) |
| Liczba żywych instancji | w Wizard **2** (canvas + „Live preview"); w Visual/Advanced 1 (canvas) + panele | 1 | ✓ oczekiwane |
| Renderowany stan | moje **niezapisane** edycje (po refreshu) | **opublikowana** konfiguracja (cards, 3 kol., bez nagłówka, bez CTA) | ⚠ celowa izolacja (nie zapisywałem) |
| Treść kart (cena/compare-at/stock/excerpt) | te same reguły | $159/$179, $299/$349, $199/$249, „In stock"/„Backorder" | ✓ |
| Obrazy produktów | n/d (brak mediów) | brak (`imgCount=0`) | ✓ oba bez obrazów |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N8) |
| `article[aria-labelledby]` → `h3[id]` | obecne | obecne | ✓ |
| Linki kart / CTA | brak (brak basePath) | brak (`linkCount=0`) | ✓ oba (N1) |
| „Last resolved" pod galerią | widoczne (editor-preview), format lokalny | **ukryte** (poprawnie) | ✓ oczekiwane |
| Empty-state a11y | `role=status` + `aria-live` (editor-preview) | zwykły `<div>` (poza editor-preview) | ✓ różnica celowa |
| Responsywność 375 px | n/d | single-column, brak overflow | ✓ |
| Niezapisane edycje | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i spójny dla wspólnie testowanych opcji; treść kart identyczna co do reguł. **Najważniejsza różnica admin↔front to moment rozwiązywania produktów** (admin: leniwie, tylko w Advanced; front: automatycznie server-side). Brak linków (N1) i brak nazwy sekcji (N8) występują **identycznie** w obu środowiskach — to nie rozjazd, lecz cechy renderer/konfiguracji.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. Moje edycje **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front. Zweryfikowana została **spójność w obrębie sesji** (przełączanie Visual ↔ Wizard ↔ Advanced zachowuje edytowany stan; Advanced wiernie go podsumowuje) oraz **izolacja** (front = stan zapisany).
- **Render obrazów produktów:** produkty fixture **nie mają mediów** (N11), więc ścieżka renderowania `<img>` (z `loading=lazy`, `width/height`, `object-cover`, alt) **nie została wyzwolona ani sprawdzona**.
- **Klikalne karty i CTA z działającą trasą:** brak `link.basePath` (i brak możliwości jego ustawienia w edytorze — N1/N4) oznacza, że **nie** przetestowano realnego linka karty, stylów CTA (text/button) na żywej karcie, `target=new-tab` ani `rel`/`href` na froncie. Sprawdziłem jedynie, że bez basePath żaden link/CTA się nie renderuje.
- **Link „view all" na froncie:** opublikowany fixture ma `pagination=none`, a mojej zmiany na `view-all`+„HomePage" **nie zapisywałem**, więc linku **nie zweryfikowano na żywym froncie** (tylko jego render w canvasie admina przy `total>items`).
- **Twarde limity:** nie dochodziłem do `limit=48`, `collectionIds=30`, `productIds=48`; testowałem wartości robocze (1, 2).
- **Wariant `compact` na froncie:** fixture zapisany jako `cards`; compact testowałem tylko w canvasie admina (live).
- **Pełna macierz enumów źródła:** przetestowałem reprezentatywnie (published, Title Z-A, kolekcja Lofts, zakres ceny) i potwierdziłem realne zastosowanie po refreshu; nie przechodziłem przez wszystkie 8 sort fields × 2 kierunki, wszystkie kombinacje statusów ani osobny test `search` jako filtra zwracającego podzbiór (poza wymuszeniem 0 wyników dla empty-state).
- **Card border color przy `cardStyle=outlined`:** kontrolka dzieli `SharedColorControl` z pozostałymi (potwierdzonymi) kolorami; nie ustawiałem jej osobno na karcie outlined (renderer pomija border color przy `minimal`).
- **Stany błędu/ostrzeżenia runtime:** ścieżka `resolved.error` → „Commerce runtime warning" nie wystąpiła (poza środowiskowym `Invalid CSRF token`, który nie jest bugiem widgetu).
- **Picker produktów / picker stron — wyszukiwanie:** otworzyłem oba i wybrałem elementy; nie testowałem wyszukiwania/filtrowania wewnątrz pickerów ani obsługi błędów ładowania listy.
- **`fields.showMediaHint`:** brak kontrolki UI w jakimkolwiek trybie (N7) — nie dało się przetestować z poziomu interfejsu.
- **Współdzielone sekcje wrappera** (Block layout, Device visibility / ich read-only odpowiedniki): poza zakresem audytu; nie modyfikowałem ich (semantykę Device visibility opisałem w 4.5).
- **Guard `beforeunload`:** front otwarłem w **nowej karcie**, więc nie opuszczałem karty admina; dialog ostrzegawczy nie był testowany.

---

## 8. Podsumowanie

- Widget **product-gallery jest w dobrym stanie funkcjonalnym** po stronie edytora i renderera. Fixture jest **populated** (3 realne produkty z cenami, compare-at i stanami magazynowymi) — istotny postęp względem smoke z 27-05 (sam empty-state).
- **Co działa:** wszystkie kontrolki Wizard (limit, search, kolekcje, sort field/dir przez Radix combobox, status filter, ceny min/max) zapisują się, są wiernie raportowane w Advanced i — co potwierdziłem przez „Refresh products" — **realnie filtrują** resolved query (kolekcja + cena + status + limit + sort). Wszystkie testowane kontrolki Visual (variant, kolumny, card style, toggle treści karty, 4 kolory powierzchni z Clear, nagłówek, empty-state, kuracja manualna z realnymi produktami i zachowaniem kolejności, more-products + picker stron) aktualizują podgląd na żywo. Advanced jest poprawnie read-only, wiernie podsumowuje stan roboczy i poprawnie sygnalizuje staleness; „Refresh products" działa. Frontend zwraca 200, renderuje 3 karty z poprawną treścią (cena, przekreślona compare-at, różne stany stock), jest responsywny (375 px bez overflow), bez błędów konsoli, semantycznie poprawny na poziomie kart, z poprawną izolacją niezapisanych edycji.
- **Najważniejszy realny problem UX (N2):** podgląd produktów **resolvuje się wyłącznie po wejściu w zakładkę Advanced** — w Wizard i Visual canvas (oraz „Live preview" Wizarda) pokazuje empty-state mimo istniejących produktów. Autor pracujący tylko w trybach „dziennych" nie zobaczy swoich produktów bez przypadkowego otwarcia Advanced.
- **Najważniejszy „cichy" brak (N1/N4):** karty są nieklikalne, a sekcja „Product links" (CTA) bezczynna bez `link.basePath`, którego **nie da się ustawić** w Wizard/Visual — CTA i klikalność pozostają niewidoczne mimo dostępnych kontrolek.
- **Pozostałe niuanse:** zmiany źródła nie live-update'ują canvasu (N3); link „view all" znika cicho gdy `total ≤ items` (N5); „Clear" koloru = przezroczystość, nie token (N6); **martwe pole `showMediaHint`** (N7); **brak `aria-label`/`aria-labelledby` na sekcji** — regres dostępności (N8); Radix combobox vs natywny select między trybami (N9); różny format „Last resolved" (N10); render obrazów nieweryfikowalny bez mediów (N11).
- **Sprawdzone i NIE będące bugiem:** „Device visibility" z przełącznikami OFF/„Hidden" jest spójne z publicznym renderem (OFF = widoczny), więc nie ma tu rozjazdu (4.5).
- **Plusy:** wspólny renderer admin↔front, data-driven źródło z realnym filtrowaniem, manual picker zachowujący kolejność, pełna read-only diagnostyka z mechanizmem staleness, spójne „Clear" z disabled-state dla 4 kolorów (`SharedColorControl`), dostępne karty (`article[aria-labelledby]` → `h3[id]`), bezpieczne `href` (`normalizeWidgetSafeHref`), `loading=lazy` w ścieżce obrazu, `role=status`/`aria-live` na empty-state w editor-preview, compare-at z przekreśleniem i poprawne różne stany stock („In stock"/„Backorder"), oraz działający przycisk „Refresh products".
- Nie znaleziono żadnego błędu konsoli na froncie ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji (poza oczekiwaną różnicą momentu rozwiązywania produktów — N2).

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami**
> przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym
> evidence i nie zostały dołączone do repo.
