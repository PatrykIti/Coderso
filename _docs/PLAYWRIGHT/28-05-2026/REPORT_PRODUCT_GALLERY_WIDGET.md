# RAPORT: Product Gallery Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-product-gallery` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/1edd10a5-7626-4630-aa47-87c6604fcc62` (strona „Contract Test - product-gallery", status `Draft`)
> **Fixture public:** http://localhost:3000/test-product-gallery-widget
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/productGallery.tsx` (renderer + typy + normalizacja + query input) · `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` (edytory Wizard/Visual/Advanced + hook podglądu) · `core/admin/services/productGalleryPreviewClient.ts` (klient runtime preview)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026
> (który dla tego widgetu zatrzymał się na statusie `fixture-gap` i widział tylko
> empty-state). Każde stwierdzenie „działa / nie działa" zostało zweryfikowane
> realną interakcją w UI oraz inspekcją DOM (atrybuty `data-product-gallery-*`,
> `data-product-id`, klasy Tailwind siatki/kart, inline `style`, ARIA,
> `aria-labelledby`), a nie tylko zliczeniem widocznych sekcji. Sekcje 4–7 jasno
> oddzielają: co działa, co nie działa / jest mylące, co faktycznie przetestowano
> oraz czego NIE testowano.

> Uwaga o screenshotach: ewentualne pliki PNG (sekcja 9) są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowanym
> przez Git). Nie są wymaganym evidence i nie zostały dołączone do żadnego pliku
> źródłowego. Główna weryfikacja opierała się o inspekcję DOM, nie o zrzuty.

---

## 1. Przegląd widgetu

**Typ:** `product-gallery` · **Kategoria:** `content` · **Opis:** „Product cards with runtime query source and stock/price metadata."

**Warianty:**

| Wariant | Charakterystyka | Klasy (zweryfikowane w DOM) |
|---------|-----------------|------------------------------|
| `cards` (domyślny) | Siatka kart dla wyróżnionych produktów | siatka `gap-4`, karta `space-y-3 rounded-xl p-4`, media `aspect-[4/3]` |
| `compact` | Gęsta siatka kart z minimalnym spacingiem | siatka `gap-3`, karta `space-y-2 rounded-lg p-3`, media `aspect-[5/4]` |

**Model danych (`ProductGalleryData`):**

| Sekcja | Pola |
|--------|------|
| **source** | `limit` (1–48), `search`, `collectionIds[]`, `status[]` (draft/published/archived), `sortField`, `sortDir`, `minPriceMinor`, `maxPriceMinor` |
| **link** | `basePath` (zarządzane poza edytorem), `target` (same-tab/new-tab), `ctaLabel`, `ctaStyle` (text/button/none) |
| **header** | `title`, `description` |
| **pagination** | `mode` (none/view-all), `viewAllHref`, `viewAllLabel` |
| **curation** | `mode` (query/manual), `productIds[]` (max 48) |
| **fields** | `showExcerpt`, `showPrice`, `showStock`, `showStatus`, `showMediaHint` |
| **emptyState** | `title`, `description` |
| **style** | `columns` (2/3/4), `cardStyle` (outlined/minimal), `cardBackground`, `cardBorderColor`, `emptyBackground`, `emptyBorderColor` (4 kolory „clearable") |
| **resolved** | `items[]`, `total`, `resolvedAt`, `error` — runtime, tylko do odczytu |

**Renderowanie:** `<section data-widget="product-gallery">` z atrybutami `data-product-gallery-count/total/curation/pagination`. Opcjonalny nagłówek (`<h2>` + opis `<p>`). Następnie: pasek statusu podglądu (loading/warning — tylko w editor-preview), a dalej albo **empty-state** (`<div role="status" aria-live="polite">` w trybie edytora) albo **siatka kart**. Każda karta to `<article data-product-id aria-labelledby={titleId}>`: opcjonalny obraz (`loading="lazy"`, tylko gdy `media.url`), `<h3 id>` + slug, opcjonalny excerpt, rząd badge'y (cena + compare-at z przekreśleniem, status, stock), opcjonalne CTA. Gdy `link.basePath` istnieje, treść karty jest owinięta w `<a>` (CTA zależne od `ctaStyle`). Na końcu opcjonalny link „view all" oraz (w editor-preview) stopka „Last resolved: …".

**Fixture commerce (zweryfikowane realnie):** strona ma realne kolekcje **„Fixture Homes"** i **„Fixture Lofts"** oraz 3 opublikowane produkty:

| Produkt | Slug | Cena | Compare-at | Stock |
|---------|------|------|-----------|-------|
| Fixture Garden Suite | `/fixture-garden-suite` | $159.00 | $179.00 | In stock |
| Fixture Urban Loft | `/fixture-urban-loft` | $299.00 | $349.00 | Backorder |
| Fixture Starter Home | `/fixture-starter-home` | $199.00 | $249.00 | In stock |

To istotna zmiana względem 27-05: fixture jest teraz **populated** (TASK-342), więc audyt obejmował realne karty produktowe, a nie tylko renderer empty-state.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `gallery-mosaic`, `feature-grid`, `tabs`, `accordion`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | 2 sekcje: „Product source" (limit, search, collections, sort field/dir, status filter) + „Price filters" (min/max). Dodatkowo własny panel **„Live preview"** renderujący widget przez współdzielony renderer. |
| **Visual** | zakładka „Visual" | **9 sekcji widgetowych** (patrz niżej) + współdzielone sekcje wrappera („Block layout", „Device visibility") = **11 widocznych sekcji** (zgodne z deklaracją kontraktu). |
| **Advanced** | zakładka „Advanced" | **5 read-only sekcji widgetowych** + współdzielone podsumowania wrappera („Block layout summary", „Visibility summary"). Jedyna kontrolka edytowalna w całym Advanced to przycisk **„Refresh products"**. |

**9 sekcji Visual:** (1) „Variant and structure" — karty Cards/Compact; (2) „Section header" — Title, Description; (3) „Card content" — toggle Show excerpt / Show price / Show stock badge / Show status badge; (4) „Product links" — info o routingu poza edytorem + Link target (`<select>`), CTA label, CTA style (`<select>`); (5) „Curated products" — Product selection (`<select>` query/manual), w trybie manual: picker produktów z Up/Down/Remove; (6) „More products link" — More products action (`<select>` none/view-all), w trybie view-all: Destination page (picker stron) + Link label; (7) „Empty state" — Title, Description; (8) „Surfaces" — 4× `SharedColorControl` (Card background/border, Empty background/border) z `<input type=color>`, Clear i badge; (9) „Presentation" — Columns (`<select>` 2/3/4), Card style (`<select>` outlined/minimal), „Columns preview".

**5 sekcji Advanced (read-only):** „Product behavior", „Source summary", „Preview status" (+ przycisk „Refresh products"), „Surface summary", „Contract summary".

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonano w sesji `claude-28-05-product-gallery` i zweryfikowano inspekcją DOM:

- **Wizard:** Limit `8 → 4 → 12`; Search `→ "loft" → wyczyszczony`; kolekcja „Fixture Homes" zaznaczona i odznaczona; Status filter „published" zaznaczony i odznaczony; Sort field (Radix combobox) `Updated → Price`; Sort direction (Radix combobox) `Descending → Ascending`; Minimum price `→ 199.00 → wyczyszczona`. Obserwacja panelu „Live preview" po zmianach.
- **Visual / Section header:** Title `→ "Nasze produkty"`, Description `→ "Wybrane realizacje i produkty premium."` (weryfikacja `<h2>`/`<p>` na canvas).
- **Visual / Empty state:** Title `→ "Brak produktów do wyświetlenia"`, Description `→ "Zmień filtry zapytania."` (weryfikacja `[role=status]` na canvas, gdy brak produktów).
- **Visual / Surfaces:** Empty background `→ #ffeecc` (inline `background-color` na empty-state, badge „Selected color", Clear staje się aktywny) → **Clear** (reset stylu i swatcha do `#ffffff`, badge „Theme default"). Card background `→ #e6f7ff` (inline `background-color` na karcie, usunięcie klasy `bg-[var(--color-bg)]`).
- **Visual / Curated products:** mode `query → manual` (pojawia się picker z realnymi produktami) → zaznaczenie „Fixture Garden Suite" (`Selected products: 1`, pojawiają się Up/Down/Remove) → mode `manual → query`.
- **Visual / More products link:** mode `none → view-all` (pojawia się Destination page picker + Link label) → wybór strony „HomePage" → Link label `→ "Zobacz wszystkie produkty"`.
- **Visual / Variant + Presentation:** Variant `Cards → Compact` (klasy siatki/karty); Columns `3 → 4`; Card style `outlined → minimal` (utrata `border`).
- **Visual / Card content:** Show price `on → off` (znika cena); Show status badge `off → on` (pojawia się „Status: Published").
- **Visual / Product links:** CTA style `text → button`; Link target `same-tab → new-tab` (weryfikacja zapisu wartości + braku widocznego CTA).
- **Advanced:** odczyt wszystkich 5 sekcji read-only i porównanie z moimi edycjami z Wizard/Visual; potwierdzenie braku edytowalnych inputów; kliknięcie **„Refresh products"** (re-resolve 3 produktów, aktualizacja `Last resolved`).
- **Frontend (public):** status HTTP, render zapisanego (opublikowanego) stanu, treść 3 kart (cena/compare-at/stock/excerpt), semantyka/ARIA (`section`, `article[aria-labelledby]`, `h3[id]`), liczba obrazów/linków, konsola, responsywność 375 px, izolacja niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Wszystkie kontrolki „Product source" zapisują się do stanu** (write-through potwierdzony następnie w Advanced → „Source summary"):
  - Limit (spinbutton) — `12` ✓; Search — czyszczenie/ustawianie ✓; kolekcje (checkboxy realnych kolekcji „Fixture Homes"/„Fixture Lofts") — toggle ✓; Status filter (natywne checkboxy draft/published/archived) — toggle ✓.
  - **Sort field** i **Sort direction** to **Radix comboboxy (przyciski, nie natywne `<select>`)** — otwierają listbox po kliknięciu; wybór „Price" oraz „Ascending" zadziałał i odświeżył etykietę przycisku. ✓
  - Minimum/Maximum price — pola dziesiętne; `199.00` przelicza się na `minPriceMinor` (groszowy) — wartość przyjęta i wyświetlana z powrotem jako `199.00`. ✓
- **„Finish setup and open Visual"** wraca do zakładki Visual i przywraca komunikat „Setup complete". ✓
- Sekcja „Product source" zawiera czytelne teksty pomocnicze (zachowanie kolekcji legacy, znaczenie pustego statusu „public pages show published, preview can show all"). Pozytyw dla onboardingu.

### 4.2 Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Section header — Title | → „Nasze produkty" | `section > div.space-y-1 > h2` aktualizuje się natychmiast. ✓ |
| Section header — Description | → „Wybrane realizacje…" | `<p>` pod tytułem aktualizuje się. ✓ |
| Empty state — Title/Description | → teksty PL | `[role=status]` (empty-state) aktualizuje się, gdy brak produktów. ✓ |
| Surfaces — Empty background | → `#ffeecc` | empty-state dostaje inline `background-color: rgb(255, 238, 204)`; badge „Selected color"; przycisk **Clear** danego pola staje się aktywny (pozostałe pozostają `disabled`). ✓ |
| Surfaces — Clear (Empty background) | wyczyszczenie | usuwa inline `style`; swatch wraca do fallbacku `#ffffff`; badge „Theme default". ✓ |
| Surfaces — Card background | → `#e6f7ff` | karta dostaje inline `background-color: rgb(230, 247, 255)` i traci klasę `bg-[var(--color-bg)]`. ✓ |
| Curated products | query → **manual** | pojawia się picker z realnymi produktami („Fixture Garden Suite", „Fixture Urban Loft", „Fixture Starter Home" — wszystkie `published`). ✓ |
| Curated products — wybór | zaznaczenie 1 produktu | `Selected products: 1 · Limit: 48`; pojawiają się kontrolki Up/Down (disabled przy 1) i Remove. ✓ |
| More products link | none → **view-all** | pojawiają się: Destination page (picker realnych stron) + Link label (domyślnie „View all products"). ✓ |
| More products — Destination | → „HomePage" | wybór z listy realnych stron zapisany (etykieta przycisku zmienia się na „HomePage"). ✓ |
| More products — Link label | → „Zobacz wszystkie produkty" | wartość zapisana. ✓ |
| Variant | Cards → **Compact** | siatka `gap-4 → gap-3`; karta `space-y-3 rounded-xl p-4 → space-y-2 rounded-lg p-3`. ✓ |
| Columns | 3 → **4** | siatka `md:grid-cols-3 → md:grid-cols-2 xl:grid-cols-4`. ✓ |
| Card style | outlined → **minimal** | karta traci `border border-[var(--color-border)]`. ✓ |
| Card content — Show price | on → **off** | znikają span'y ceny i compare-at; pozostają tylko status/stock. ✓ |
| Card content — Show status badge | off → **on** | pojawia się badge „Status: Published". ✓ |
| Product links — CTA style / Link target | → button / new-tab | wartości natywnych `<select>` zapisane (`button`, `new-tab`). ✓ (uwaga: brak widocznego CTA — patrz N2) |

**Kluczowy pozytyw:** po jednorazowym zresolvowaniu podglądu (przez Advanced — patrz N1) **wszystkie** kontrolki Visual operujące na poziomie karty (variant, kolumny, card style, toggle treści, kolory kart) aktualizują **żywe karty produktowe** na canvas natychmiast i poprawnie.

**Surfaces — spójność „Clear":** przyciski „Clear" są poprawnie `disabled` gdy kolor pusty i aktywne gdy ustawiony; po wyczyszczeniu badge wraca do „Theme default", a swatch do wartości fallback. Działa prawidłowo (lepiej niż w Contact, gdzie część pól nie miała Clear).

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only (0 edytowalnych inputów; jedyna kontrolka to przycisk „Refresh products") i **wiernie** odzwierciedlił mój bieżący (niezapisany) stan roboczy:

- **Product behavior:** „Source mode: Query results", „Selected products: 1 product" (patrz N4), „Card route: Not configured", „More products link: Shown" (po mojej zmianie na view-all). ✓
- **Source summary:** „Product limit: 12 products", „Search: None", „Collections: No collection filter", „Status filters: Public-ready default", „Sort: Price, low to high" — **dokładnie** odzwierciedla moje edycje w Wizard. ✓
- **Preview status:** „Preview ready", „Resolved items: 3 · Total: 3", „Last resolved: 2026-05-28T19:33:00.065Z"; przycisk **„Refresh products"** ponownie resolvuje (3 produkty, nowy timestamp). ✓
- **Surface summary:** „Card background: Theme default", „Card border: Theme default", „Empty state colors: Background: Theme default, border: Theme default" (po wyczyszczeniu empty-bg). ✓
- **Contract summary:** jasny podział własności — Wizard („One-time product source setup and shopper-facing price filters."), Visual („Section header, card content, links, curation, more-products link, empty state, surfaces, and presentation."), Advanced („Read-only product behavior, source summaries, preview status, surface diagnostics, and contract ownership."). ✓

> Advanced to **żywe lustro stanu roboczego w pamięci**, nie stanu zapisanego — odzwierciedlił wszystkie moje niezapisane edycje. Dodatkowo to **jedyne miejsce, w którym faktycznie uruchamiany jest fetch produktów** (patrz N1).

### 4.4 Frontend (public)

Trasa `/test-product-gallery-widget` zwraca **HTTP 200** i renderuje **zapisaną (opublikowaną) konfigurację fixture** — populated, **inną** niż mój niezapisany draft (patrz sekcja 6):

- `data-product-gallery-count=3`, `total=3`, `curation=query`, `pagination=none`.
- **Brak nagłówka** (opublikowany fixture nie ma `header.title`); siatka `grid grid-cols-1 gap-4 md:grid-cols-3` (wariant `cards`, kolumny `3` — wartości domyślne, **moje niezapisane Compact/4-kolumny się nie wyciekły**).
- **3 karty produktowe** z pełną treścią: tytuł, slug (`/fixture-…`), excerpt, **cena + compare-at** (np. $159.00 z przekreślonym $179.00), badge stock („In stock" / **„Backorder"** — różne stany renderują się poprawnie). `showStatus` jest wyłączone w opublikowanym fixture (brak badge „Status:"). ✓
- **Semantyka / ARIA:** `<section>` → 3× `<article data-product-id aria-labelledby>` z `<h3 id>`; `aria-labelledby` karty **dokładnie pasuje** do `id` jej `<h3>` (`labelMatch=true`) — każda karta ma poprawną dostępną nazwę. ✓
- **Brak obrazów** (`imgCount=0`) — produkty w fixture nie mają mediów, więc blok `<img>` jest poprawnie pomijany (brak pustego kontenera).
- **Brak linków** (`linkCount=0`) — brak `link.basePath` → karty nie są klikalne i nie ma CTA; brak linku „view all" (pagination `none`).
- **Konsola:** **0 błędów i 0 ostrzeżeń.** ✓
- **Responsywność (375 px):** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka schodzi do **jednej kolumny** (`grid-template-columns: 375px`). ✓
- **Izolacja:** moje niezapisane edycje z Wizard/Visual (header, Compact, 4 kolumny, kolory, view-all/HomePage, manual selection, sort price) **nie wyciekły** na front. ✓

### 4.5 Admin canvas (podgląd)

Główny canvas renderuje żywy `ProductGalleryBlock` z tymi samymi atrybutami `data-product-gallery-*`, co front, i aktualizuje się na żywo po edycjach Visual/Wizard. Stopka „Last resolved: …" pojawia się tylko w trybie editor-preview. Empty-state w trybie edytora dostaje `role="status"` + `aria-live="polite"` (dobra a11y dla statusu ładowania) — na froncie to zwykły `<div>`.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Podgląd produktów resolvuje się WYŁĄCZNIE po wejściu w Advanced** | Edytor / preview runtime | Hook `useProductGalleryPreview` jest wywoływany **tylko w `ProductGalleryAdvancedEditor`** (warunek aktywności: `editorMode === "advanced"` lub `undefined`). Skutek zaobserwowany realnie: po wejściu na stronę w trybie Visual **canvas pokazuje empty-state** („No products found") i „Last resolved: Not resolved yet", mimo że fixture ma 3 produkty. **Panel „Live preview" w Wizard również pozostaje pusty.** Dopiero przełączenie na zakładkę **Advanced** uruchamia fetch i resolvuje 3 produkty; po powrocie do Visual karty pozostają (stan podglądu trzyma się w kontekście). **To istotny problem onboardingu:** autor pracujący tylko w Wizard/Visual nigdy nie zobaczy swoich realnych produktów w podglądzie — musi „przypadkiem" otworzyć Advanced. Panel „Live preview" Wizarda jest tu szczególnie mylący, bo deklaruje „Reflects the current Wizard state through the shared widget renderer", a w praktyce nie pobiera danych. |
| **N2 — Kontrolki „Product links" (CTA) są bezczynne bez `basePath`** | Renderer / edytor | Karty stają się klikalne i renderują CTA **tylko gdy `link.basePath` jest ustawione**, a sekcja sama deklaruje: „Product detail routing is managed outside the daily widget editor." `basePath` **nie jest edytowalne** w Wizard ani Visual. W tym fixture `basePath` jest „Not configured", więc mimo ustawienia CTA style `button` i Link target `new-tab` na karcie **nie pojawia się żaden link ani CTA** (potwierdzone: `cardHasLink=false`, `cardHasCta=false`). Kontrolki zapisują się do stanu, ale dla typowego autora są wizualnie „martwe". |
| **N3 — `<section>` bez `aria-label`/`aria-labelledby`** | Renderer / a11y | Główny kontener `<section data-widget="product-gallery">` nie ma dostępnej nazwy (`aria-label=null`). Brak semantycznego opisu sekcji dla czytników (analogiczne do gallery-mosaic N4 / contact R1). Pozytyw: poziom kart jest dobry — każdy `<article>` ma `aria-labelledby` wskazujący na `id` swojego `<h3>`. |
| **N4 — Wybór manualny produktów utrzymuje się po powrocie do trybu „query"** | Stan / dane | Po zaznaczeniu 1 produktu w trybie manual i przełączeniu Product selection z powrotem na „query", Advanced nadal raportuje „Selected products: **1 product**" przy „Source mode: **Query results**". Selekcja jest zachowana w `curation.productIds`, lecz nieużywana (renderer trzyma się query). Niegroźne, ale potencjalnie mylące w diagnostyce. |
| **N5 — Niespójne nazewnictwo statusu koloru: „Selected color" vs „Selected swatch"** | Edytor (copy) | Badge w Visual (`SharedColorControl`) dla wartości hex pokazuje **„Selected color"**, natomiast Advanced „Surface summary" (`describeCommerceColor`) dla tej samej wartości użyłby **„Selected swatch"**. Dwie różne etykiety dla tego samego stanu. Kosmetyczne. |
| **N6 — Dwa formaty „Last resolved"** | Edytor (copy) | Advanced „Preview status" pokazuje **surowy ISO** (`2026-05-28T19:33:00.065Z`), a stopka canvas editor-preview — **format lokalny** (`5/28/2026, 7:33:00 PM`). Ta sama wartość, dwie prezentacje. Kosmetyczne. |
| **N7 — Niespójne prymitywy kontrolek między trybami** | Edytor (UX) | Wizard używa **Radix custom comboboxów** (przyciski) dla Sort field/direction (z `CommerceSourceFields`), podczas gdy Visual używa **natywnych `<select>`** dla Columns/Card style/Link target/CTA style/Product selection/More products. Różny look & feel i różna obsługa (klik-otwórz vs natywny select). Drobne, ale warte odnotowania. |
| **N8 — Draft „Hidden on all devices" przy działającym renderze publicznym** | Wrapper / device visibility | Współdzielona sekcja „Device visibility" w draftcie pokazuje wszystkie 3 przełączniki (Desktop/Tablet/Mobile) jako **`aria-checked=false` / „Hidden"**, mimo to **opublikowana strona renderuje widget** (HTTP 200, 3 karty widoczne). To rozjazd na poziomie **wrappera bloku** (shared infrastructure, nie product-gallery), prawdopodobnie różnica stan-draft vs stan-opublikowany. Analogiczne do gallery-mosaic N7. Nie blokuje renderu galerii. |

**Nie wykryto** żadnych błędów konsoli (ani w adminie, ani na froncie), żadnego twardego buga renderowania kart, ani rozjazdu render między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Po jednokrotnym zresolvowaniu podglądu wszystkie testowane kontrolki Visual aktualizują canvas na żywo; Advanced wiernie podsumowuje stan roboczy; frontend jest responsywny, bez błędów i poprawny semantycznie (poza N3). **Najważniejszy realny problem UX to N1** (podgląd produktów nie ładuje się poza Advanced), a najważniejszy „cichy" brak to N2 (CTA bez konfigurowalnej ścieżki produktu).

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-product-gallery-widget`) | Zgodność |
|--------|----------------------|---------------------------------------------|----------|
| Renderer | żywy `ProductGalleryBlock`, atrybuty `data-product-gallery-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Resolved produktów | **dopiero po wejściu w Advanced** (3 szt.); w Visual/Wizard początkowo empty-state | **server-side, od razu 3 szt.** | ⚠ rozjazd (N1) |
| Renderowany stan | przy wejściu: empty (N1), potem moje **niezapisane** edycje | **opublikowana** konfiguracja (cards, 3 kol., bez nagłówka, bez CTA) | ⚠ celowa izolacja (nie zapisywałem) |
| Treść kart (cena/compare-at/stock/excerpt) | te same reguły renderowania | $159/$179, $299/$349, $199/$249, „In stock"/„Backorder" | ✓ |
| Obrazy produktów | n/d (brak mediów) | brak (`imgCount=0`, produkty bez mediów) | ✓ oba bez obrazów |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N3) |
| `article[aria-labelledby]` → `h3[id]` | obecne | obecne (`labelMatch=true`) | ✓ |
| Linki kart / CTA | brak (brak basePath) | brak (`linkCount=0`) | ✓ oba (N2) |
| Empty-state a11y | `role=status` + `aria-live` (editor-preview) | zwykły `<div>` (brak — bo są produkty) | ✓ (różnica celowa) |
| Responsywność 375 px | n/d (testowane na froncie) | single-column, brak overflow | ✓ |
| Niezapisane edycje z Visual/Wizard | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i spójny; treść kart identyczna co do reguł. Istotne rozjazdy to **N1** (admin resolvuje produkty tylko w Advanced, podczas gdy front renderuje je od razu server-side) oraz celowa izolacja niezapisanego draftu. Pozostałe różnice są celowe (a11y empty-state w edytorze) lub dotyczą obu środowisk (N2, N3).

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie modyfikować współdzielonego fixture. W związku z tym:
  - trwałość moich edycji po przeładowaniu **nie** została zweryfikowana (potwierdziłem trwałość tylko w obrębie sesji edytora — Advanced wiernie podsumował edycje z Wizard/Visual);
  - nie rozstrzygnąłem N8 (czy publikacja zmieniłaby „Hidden on all devices").
- **Realne filtrowanie wyników przez source:** zweryfikowałem, że kontrolki źródła **zapisują się** (Advanced „Source summary"), ale **nie** potwierdziłem, że zmiana `search`, `min/maxPrice`, `collectionIds` czy `status` faktycznie **zmienia liczbę/zestaw** zresolvowanych produktów (resolvowałem na permisywnym zapytaniu, które zwróciło wszystkie 3). Funkcjonalna poprawność filtrów runtime nie była więc przedmiotem tego audytu.
- **Renderowanie obrazów produktów:** produkty w fixture **nie mają mediów**, więc ścieżka renderowania `<img>` (z `loading=lazy`, `width/height`, `object-cover`, alt = `media.alt` lub tytuł) **nie została wyzwolona ani sprawdzona**.
- **Klikalne karty i CTA:** brak `link.basePath` (i brak możliwości jego ustawienia w edytorze) oznacza, że **nie** przetestowano realnego linka karty, stylów CTA (text/button), `target=new-tab` ani `rel`/`href` na froncie. Sprawdziłem jedynie, że bez basePath żaden link/CTA się nie renderuje.
- **Link „view all" na froncie:** opublikowany fixture ma `pagination=none`, a mojej zmiany na `view-all`+„HomePage" **nie zapisywałem**, więc linku „view all" **nie zweryfikowano na żywym froncie** (tylko jego pojawienie się w edytorze).
- **Manualna kuracja z wieloma produktami:** zaznaczyłem tylko 1 produkt; **nie** testowałem reorderingu Up/Down z ≥2 produktami ani limitu 48, ani wpływu kolejności manualnej na render.
- **Stany błędu/ostrzeżenia podglądu:** `Preview warning`, `Commerce runtime warning` (`resolved.error`) oraz `Source changed. Refresh products to update preview.` — **nie** wyzwolone (nie wystąpił żaden błąd runtime; nie zmieniałem źródła po resolvie w Advanced w sposób wymuszający stan „stale").
- **Pojedyncze pozostałe wartości enumów:** przetestowałem reprezentatywne wartości; **nie** klikałem każdej osobno dla: Columns `2`, Card style powrót do `outlined`, sort field inny niż `Price`, Link target powrót `same-tab`, każdej kombinacji statusów, `showMediaHint` (brak kontrolki UI dla tego pola w żadnym trybie). Wszystkie używają tego samego mechanizmu `update*`, zweryfikowanego na wielu innych polach.
- **Picker produktów / picker stron — pełna interakcja wyszukiwania:** otworzyłem oba i wybrałem po jednym elemencie; **nie** testowałem wyszukiwania/filtrowania wewnątrz pickerów ani obsługi błędów ładowania listy.
- **Trwałość przełącznika „Run setup again" / ponowny setup:** wszedłem w Wizard i wróciłem przez „Finish setup and open Visual"; nie testowałem wielokrotnego cyklu setupu.

---

## 8. Podsumowanie

- Widget **product-gallery jest w dobrym stanie funkcjonalnym po stronie edytora i renderera SSR**, a fixture jest teraz **populated** (3 realne produkty z cenami, compare-at i stanami magazynowymi) — istotny postęp względem smoke z 27-05 (`fixture-gap`, sam empty-state).
- **Co działa:** wszystkie kontrolki Wizard (limit, search, kolekcje, sort field/dir przez Radix combobox, status filter, ceny min/max) zapisują się i są wiernie raportowane w Advanced; wszystkie testowane kontrolki Visual (variant, kolumny, card style, toggle treści karty, kolory powierzchni z Clear, nagłówek, empty-state, kuracja manualna z realnymi produktami, more-products + picker stron) aktualizują podgląd na żywo; Advanced jest poprawnie read-only i wiernie podsumowuje stan roboczy, a „Refresh products" działa. Frontend zwraca 200, renderuje 3 karty z poprawną treścią, jest responsywny (375 px bez overflow), bez błędów konsoli, semantycznie poprawny (karty z `aria-labelledby`), z poprawną izolacją niezapisanych edycji.
- **Najważniejszy realny problem UX (N1):** podgląd produktów **resolvuje się wyłącznie po wejściu w zakładkę Advanced** — w Wizard i Visual canvas (oraz „Live preview" Wizarda) pokazuje empty-state mimo istniejących produktów. Autor pracujący tylko w trybach „dziennych" nie zobaczy swoich produktów bez przypadkowego otwarcia Advanced.
- **Najważniejszy „cichy" brak (N2):** sekcja „Product links" (CTA) jest bezczynna bez `link.basePath`, którego **nie da się ustawić** w Wizard/Visual — CTA i klikalność kart pozostają niewidoczne mimo dostępnych kontrolek.
- **Niespójności / kosmetyka:** brak `aria-label` na `<section>` (N3), utrzymanie selekcji manualnej po powrocie do query (N4), „Selected color" vs „Selected swatch" (N5), dwa formaty timestamp (N6), Radix combobox vs natywny select między trybami (N7).
- **Do wyjaśnienia (bez zapisu):** „Hidden on all devices" w draftcie mimo publicznego renderu (N8 — shared wrapper).
- **Plusy:** poprawne Clear z disabled-state dla wszystkich 4 kolorów powierzchni, realne kolekcje i produkty w fixture, picker produktów i picker stron z realnymi danymi, dostępne karty (`article[aria-labelledby]` → `h3[id]`), `loading=lazy` w ścieżce obrazu, `role=status`/`aria-live` na empty-state w edytorze, compare-at z przekreśleniem, różne stany stock („In stock"/„Backorder") renderowane poprawnie, oraz przycisk „Refresh products" działający na żądanie.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM, nie o zrzuty.

| Plik (lokalny) | Opis |
|----------------|------|
| `product-gallery-frontend-published.png` | Publiczna trasa `/test-product-gallery-widget` (1280 px) — opublikowany stan fixture (3 karty: Garden Suite / Urban Loft / Starter Home, wariant cards, 3 kolumny, bez nagłówka, bez CTA) |
| `product-gallery-frontend-mobile-375.png` | Ta sama trasa przy 375 px — siatka schodzi do jednej kolumny, brak poziomego overflow |
