# RAPORT: Product Compare Widget — audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-product-compare` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** „Contract Test - product-compare" (`3beb58fc-0d9a-4bd9-ae92-c1d2f83de65e`)
> **Trasa publiczna:** `/test-product-compare-0516` (tytuł strony: `TEST-PRODUCT-COMPARE-0516`)
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Raporty pokrewne:** `REPORT_PRODUCT_TABLE_WIDGET.md`, `REPORT_PRODUCT_GALLERY_WIDGET.md` (rodzina commerce)

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI
edytora oraz inspekcji DOM (`eval`) na żywym podglądzie admin i na statycznym
renderze SSR trasy publicznej.

**Co faktycznie przetestowano (z asercjami DOM):**

- Logowanie do admina, otwarcie fixtury.
- Tryb **Wizard**: limit + reaktywność wskazówki gęstości, pole search (filtrowanie
  zapytania), sort field/direction, status filter, sekcje „Comparison source"
  i „Limit guidance", przejścia „Finish setup" / „Run setup again", wymuszenie
  empty state przez search bez wyników.
- Tryb **Visual**: wszystkie 3 warianty, kuracja produktów (zaznaczanie + reorder
  Up/Down + Remove), section copy (title/description/caption + hide caption),
  toggles wierszy atrybutów (slug/excerpt), nadpisywanie etykiet, kolumny produktów
  (images / link titles / CTA mode), formatowanie (locale / quantity display /
  compact limit), layout (featured product / sticky header), empty state, surfaces.
- Tryb **Advanced**: diagnostyka read-only, „Refresh preview", source/surface/contract
  summary.
- **Frontend**: statyczny render SSR, semantyka tabeli i a11y, responsywność 375px,
  konsola przeglądarki.

**Czego NIE testowano (świadomie) — patrz też sekcja 7:**

- **Nie zapisywano** zmian (`Save draft` / `Publish`) — aby nie zmutować współdzielonej
  fixtury dla innych agentów. Wszystkie eksperymenty w admin pozostały w pamięci
  edytora; trasa publiczna odzwierciedla wyłącznie wcześniej zapisaną konfigurację.
- **Realnego zastosowania koloru ze swatcha (Surfaces)** — kontrolka to natywny
  `<input type="color">` (picker OS) bez pola tekstowego hex; nie udało się jej
  wysterować programowo (szczegóły w 5.10 i 6).
- **Widocznego efektu** obrazów / linków tytułów / CTA — w tym środowisku resolved
  rows mają `imageUrl` i `productHref` = `null` (brak skonfigurowanej trasy detalu
  produktu w Site Settings), więc te opcje są bezczynne (szczegóły w 5.7 i 6).
- Realnego efektu filtra kolekcji (checkboxy obecne, nie przełączano).
- Każdej pojedynczej opcji każdego comboboxa — testowano wartości reprezentatywne.
- Wariantów innych niż `matrix` na froncie (zapisana konfiguracja to `matrix`;
  nie da się zmienić bez zapisu).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez asercje
DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi etykietami,
ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**

- `core/widgets/core/productCompare.tsx` — renderer, model danych, normalizacja, schemat.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/services/productComparePreviewClient.ts` + `core/server/routes/productComparePreviewRoutes.ts` — preview po stronie backendu.

---

## 1. Przegląd widgetu

**Typ:** `product-compare` (kategoria: content / commerce)
**Warianty:** `matrix` (domyślny), `compact`, `cards`
**Tryby edytora:** Wizard (jednorazowy setup źródła), Visual (codzienna edycja), Advanced (diagnostyka read-only)
**Maks. produktów:** 12 (`PRODUCT_COMPARE_MAX_PRODUCTS`)

Widget renderuje macierz porównania produktów z runtime'owego źródła commerce.
Produkty mogą pochodzić z **zapytania** (search / kolekcje / status / sort / limit)
albo z **ręcznej kuracji** (`source.productIds`, z zachowaniem kolejności kolumn).
Atrybuty (cena, compare-at, stan, ilość, slug, excerpt) renderowane są jako wiersze
(matrix/compact) lub jako pary `dt/dd` w kartach (cards). Obsługuje konfigurowalne
etykiety, formatowanie waluty (locale) i ilości (compact threshold), wyróżnienie
produktu (featured), sticky header, kolory powierzchni oraz empty state.

**Stan fixtury w chwili testu:** 3 opublikowane produkty rozwiązywane przez zapytanie
(bez kuracji): „Fixture Garden Suite" (159,00 / 179,00, in stock, qty 1),
„Fixture Starter Home" (199,00 / 249,00, in stock, qty 3),
„Fixture Urban Loft" (299,00 / 349,00, backorder, qty 8). Wariant `matrix`,
4 widoczne wiersze (Price / Compare at / Stock / Quantity), caption ukryty wizualnie.

---

## 2. Model danych i kontrakt edytora (z kodu)

| Sekcja | Pola | Tryb (writable) |
|--------|------|-----------------|
| **source** | `limit` (1–12), `search`, `collectionIds[]`, `productIds[]` (maks. 12), `status[]`, `sortField`, `sortDir` | Wizard (filtry), Visual (`productIds`) |
| **variant** | `matrix` / `compact` / `cards` | Visual (`visualOwnsVariantSelection`) |
| **rows / fields** | widoczność: price, compareAt, stock, quantity, slug, excerpt | Visual |
| **labels** | attributeHeader + 6 etykiet atrybutów + inStock/outOfStock/backorder | Visual |
| **format** | `moneyLocale` (en-US/pl-PL/de-DE/fr-FR), `quantityDisplay` (exact/compact), `quantityCompactLimit` (1–999) | Visual |
| **header** | `showImages`, `linkTitles`, `ctaMode` (none/view_product), `ctaLabel` | Visual |
| **section** | `title`, `description`, `caption`, `hideCaption` | Visual |
| **layout** | `featuredProductId`, `stickyHeader` | Visual |
| **emptyState** | `title`, `description` | Visual |
| **style** | `tableBackground`, `tableBorderColor`, `headerBackground`, `emptyBackground`, `emptyBorderColor` | Visual |
| **resolved** | rows[], total, resolvedAt, error | Advanced (read-only) |

Podział własności (zgodny z „Contract summary" w Advanced):
**Wizard** — setup źródła + wskazówka gęstości. **Visual** — wariant, kuracja, copy,
wiersze, etykiety, kolumny, formatowanie, layout, empty state, surfaces.
**Advanced** — read-only podgląd statusu, podsumowania źródła/powierzchni, kontrakt.

---

## 3. Co DZIAŁA (zweryfikowane na żywo)

### 3.1 Wizard

| Funkcja | Wynik testu |
|---------|-------------|
| **Limit** (spinbutton) | Zmiana 3 → 8 przyjęta. |
| **Reaktywność „Limit guidance"** | Przy limicie ≤5: „Current limit: N. A curated set of 2-5 products…". Po ustawieniu 8: przełącza się na ostrzeżenie gęstości „Current compare density can be hard to read on mobile (8 products in play)…". ✓ Reaguje na żywo. |
| **Search → filtrowanie zapytania** | Wpisanie „Garden" zawęziło resolved do **1 produktu** (Garden Suite). Wpisanie „zzzznomatch" → **0 produktów** (empty state). ✓ Realnie filtruje przez resolver. |
| **Sort field** (combobox) | Opcje: Title/Slug/Status/Price/Stock/Created/Updated/Published. Wybór „Price" + asc → kolejność produktów w zapytaniu = 159 → 199 → 299. ✓ Wpływa na kolejność. |
| **Sort direction** (combobox) | Obecny (Ascending/Descending). |
| **Status filter** (checkboxy draft/published/archived) | „published" zaznaczany poprawnie. |
| **Collections** (checkboxy) | Obecne: „Fixture Homes", „Fixture Lofts" (zapisane kolekcje). |
| **Przejścia trybu** | „Finish setup and open Visual" oraz „Run setup again" działają i zachowują stan. |

### 3.2 Visual

| Funkcja | Wynik testu |
|---------|-------------|
| **Wariant Matrix** | Tabela `min-w-full text-sm`. ✓ |
| **Wariant Compact** | Tabela przełącza się na `text-xs` (gęstsza). ✓ |
| **Wariant Cards** | Brak tabeli; 3× `<article data-product-id>` z listą `dl` (dt/dd). ✓ |
| **Kuracja produktów** | Zaznaczenie produktu → `productIds`, podgląd przeładowuje się asynchronicznie do wybranego zbioru (count 3 → 1 po zaznaczeniu Urban Loft). ✓ |
| **Reorder Up/Down** | Dodanie 2. produktu + „Up" na drugim → kolejność kolumn w podglądzie zamienia się ([urban, garden] → [garden, urban]). ✓ |
| **Remove** | Usuwa produkt z kuracji; po usunięciu wszystkich wraca ścieżka zapytania (count → 3). ✓ |
| **Section Title** | Wpisanie tytułu dodaje `<h2 id="…-product-compare-heading">`, ustawia `aria-labelledby` na ten id i usuwa fallback `aria-label`. ✓ Poprawne wiązanie a11y. |
| **Section Description** | Renderuje `<p>` pod tytułem. ✓ |
| **Table caption + Hide caption** | Odznaczenie „Hide caption visually" zmienia `<caption>` z `sr-only` na widoczny, ostylowany element; zaznaczenie wraca do `sr-only`. ✓ |
| **Wiersze atrybutów (slug/excerpt)** | Włączenie „Show product URL path" i „Show excerpt" dodaje wiersze Slug/Excerpt (matrix) lub dt/dd (cards) z rozwiązanymi wartościami (`fixture-garden-suite`, treść excerptu). ✓ |
| **Nadpisanie etykiety (Price)** | „Price" → „Cena": etykieta wiersza zmienia się natychmiast. ✓ |
| **Etykieta In-stock** | „In stock" → „Dostępny": komórki Stock dla produktów in_stock zmieniają tekst; backorder pozostaje „Backorder". ✓ |
| **Money locale** | en-US → pl-PL: „$159.00" → „159,00 USD" (separator i pozycja waluty wg locale). ✓ |
| **Quantity display = compact + limit 2** | Ilości 1/3/8 → „1" / „2+" / „2+". ✓ Próg działa. |
| **Featured product** | Wybór „Garden Suite": w jego kolumnie pojawia się badge „Featured" + klasa `emerald` na właściwym `<th>`. ✓ |
| **Sticky table header** | Włączenie → pierwszy `<th>` otrzymuje klasy `sticky left-0 top-0 z-20`. ✓ |

### 3.3 Advanced (read-only)

| Funkcja | Wynik testu |
|---------|-------------|
| **Preview status** | Pokazuje „Resolved rows: X of Y", „Selected products: N · Limit: M", „Resolved at <timestamp>". ✓ |
| **Refresh preview** | Kliknięcie aktualizuje znacznik czasu „Resolved at" (05:10:57 → 05:11:18) — realnie odpytuje resolver. ✓ |
| **Source summary** | Odzwierciedla stan: „2 selected products in manual order" / „Query results", limit, search, kolekcje, status; przy kuracji Sort = „Ignored while selected products are used". ✓ Trafne. |
| **Surface summary** | Stany kolorów: „Theme default" / „Selected swatch" / „Saved custom color". ✓ |
| **Contract summary** | Poprawny podział własności Wizard/Visual/Advanced. ✓ |
| **Brak pól zapisywalnych** | Panel jawnie informuje „Advanced mode is read-only." ✓ Zgodne z kontacktem. |

### 3.4 Empty state

- Wymuszony przez search bez wyników: `data-product-compare-count="0"`, brak tabeli,
  kontener `role="status"` + `aria-live="polite"`, tekst domyślny
  „No products to compare" / „Update source filters or publish products.". ✓

### 3.5 Frontend (trasa publiczna, SSR)

| Aspekt | Wynik |
|--------|-------|
| Render | 1 instancja widgetu, wariant matrix, **count = 3** (ścieżka zapytania z zapisanej konfiguracji). ✓ |
| Zgodność z zapisaną konfiguracją | Identyczny z bazową migawką admin przed moimi edycjami: domyślne etykiety, locale en-US (`$159.00`), brak tytułu (→ `aria-label="Product comparison"`), 4 wiersze. ✓ **Moje edycje in-memory NIE wyciekły** na publikację. |
| Semantyka tabeli | `<th scope="col">` na wszystkich nagłówkach, `<caption>` (sr-only), nazwa tabeli przez caption. ✓ |
| Region przewijania | `tabindex="0"`, `aria-label="Product comparison"`, `aria-describedby` → id podpowiedzi scrollowania, `data-overflow-intentional="true"`, `overflow-x-auto`. ✓ |
| Konsola | 0 błędów, 0 ostrzeżeń. ✓ |
| Mobile 375px | Brak overflow strony (`bodyScrollW == windowW == 375`); tabela mieści się (treść się zawija), brak wymuszonego poziomego scrolla. ✓ |

---

## 4. Spójność Admin ↔ Frontend

| Funkcjonalność | Admin Preview | Frontend | Zgodność |
|----------------|---------------|----------|----------|
| Wariant matrix | ✓ tabela `text-sm` | ✓ identycznie | ✓ |
| Liczba produktów (zapytanie) | 3 | 3 | ✓ |
| Etykiety / locale (zapisane) | domyślne / en-US | domyślne / en-US | ✓ |
| Semantyka a11y (th scope, caption, region) | ✓ | ✓ | ✓ |
| Empty state (`role=status`, `aria-live`) | ✓ (wymuszony) | ✓ (ten sam kod) | ✓ |

**Wniosek:** renderer jest współdzielony — podgląd admin i SSR frontu dają identyczny
wynik dla tej samej konfiguracji. Wszystkie edycje testowe w admin były w pamięci i
nie wpłynęły na publikację (brak `Save`/`Publish`).

---

## 5. Szczegółowe obserwacje per sekcja

### 5.1 Wariant i struktura (Visual)
Ładne karty wyboru z opisem i statusem „Selected"/„Pick". Wybór wariantu jest
wyłącznie po stronie Visual (Wizard nie ma kontrolki wariantu — celowo,
`visualOwnsVariantSelection: true`).

### 5.2 Kuracja produktów (Visual)
Checkboxy listują produkty (`tytuł` + `slug · status`). Po zaznaczeniu pojawiają się
kontrolki Up/Down/Remove. Kuracja **nadpisuje** ścieżkę zapytania (sort/limit/search),
co Advanced jawnie sygnalizuje („Sort … Ignored while selected products are used").

### 5.3 Section copy
Title/Description/Table caption + toggle „Hide caption visually". Pola tekstowe puste
(Title/Description) renderują brak nagłówka; po wpisaniu — pełne wiązanie a11y (h2 + aria-labelledby).

### 5.4 Wiersze atrybutów
6 toggli. Domyślnie price/compareAt/stock/quantity = on, slug/excerpt = off.
Brak kontrolki kolejności wierszy w UI — kolejność wierszy jest stała wg `productCompareRowDefaults`
(model `rows[]` przechowuje kolejność, ale edytor eksponuje tylko widoczność, nie reorder).

### 5.5 Etykiety
Pola etykiet atrybutów są **puste** w UI (placeholder), a podgląd pokazuje wartości
domyślne (Price/Compare at/…). To poprawne (pusty input = fallback do domyślnej),
ale wizualnie „pusty input obok wypełnionego podglądu" bywa mylący.

### 5.6 Formatowanie
Locale, quantity display i compact limit działają poprawnie i odświeżają podgląd na żywo.

### 5.7 Kolumny produktów — DZIAŁA WARUNKOWO
„Show product images", „Link product titles", „CTA mode = View product" zapisują się
w stanie, ale **nie dają widocznego efektu** w tym środowisku: resolved rows mają
`imageUrl = null` i `productHref = null` (brak skonfigurowanej trasy detalu produktu
w Site Settings). Renderer celowo degraduje do tekstu (tytuł jako `<span>`, brak `<a>`,
brak `<img>`, brak CTA). Edytor **uprzedza** o tym podpowiedzią: „Product links and CTAs
use the enabled products detail route from Site Settings. When no route is available,
runtime keeps the header text-only." Pole „CTA label" pojawia się warunkowo dopiero po
wybraniu `view_product`. Patrz uwaga UX U2.

### 5.8 Layout
Featured product (badge + zielone tło kolumny) oraz sticky header działają. Wyróżnienie
featured używa zahardkodowanego koloru `emerald` (nie z motywu) — drobna nuta.
Sticky header jest pomijany dla wariantu `cards` (zgodnie z kodem).

### 5.9 Empty state
Pola Title/Description obecne; render empty state zweryfikowany (sekcja 3.4).

### 5.10 Surfaces — NIE udało się wysterować
5 kontrolek koloru (`SharedColorControl`, wszystkie z `showValueInput={false}`):
table background, table border, header background, empty background, empty border.
Każda to **natywny `<input type="color">` (picker OS) bez pola tekstowego hex**.
Przyciski „Clear" są domyślnie `disabled` (stan „Theme default"), co jest poprawne.
Próby ustawienia wartości programowo (natywny setter + zdarzenia input/change) oraz
przez `playwright fill` **nie wywołały** handlera React (atrybut `value` w DOM się
zmieniał na `#ff0000`, ale „Clear" pozostawał disabled, podgląd bez zmian, a „Surface
summary" w Advanced nadal „Theme default"). To głównie ograniczenie narzędziowe (picker
OS jest nieautomatyzowalny), ale jest też nutą UX: bez pola hex nie da się wkleić/wpisać
koloru z klawiatury — jedyną drogą jest wizualny picker. **Nie potwierdzono ani nie
zaprzeczono** poprawności realnego zastosowania koloru — pozostaje niezweryfikowane.

---

## 6. Co NIE działa / wymaga uwagi

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| I1 | **Surfaces — swatch nie do wysterowania bez pickera OS** (brak pola hex, `showValueInput={false}`). Nie udało się ustawić koloru ani przez API, ani przez `fill`. Nie wiadomo czy realny wybór koloru działa — niezweryfikowane. | Ograniczenie narzędziowe + nuta UX |
| I2 | **Images / Link titles / CTA bez widocznego efektu** w tym środowisku (resolved `imageUrl`/`productHref` = null, brak trasy detalu produktu). Konfiguracja się zapisuje, ale jest bezczynna. Edytor ostrzega tekstem, lecz brak sygnału w samym podglądzie „dlaczego nic się nie dzieje". | Działa warunkowo / luka feedbacku |
| I3 | **Podpowiedź „Scroll horizontally…" zawsze widoczna** — także gdy tabela mieści się bez overflow (np. 375px z 3 krótkimi produktami). Nie jest warunkowana realnym przepełnieniem. | Drobna nuta UX |
| I4 | **Niejednoznaczność słowa „Limit"** — Visual „Compared products" pokazuje „Limit: 12" (maks. liczba zaznaczalnych produktów), a Advanced „Preview status" „Limit: 3" (`source.limit` zapytania). To samo słowo, dwa znaczenia. | Drobna nuta UX |

> Uwaga: nie stwierdzono żadnego twardego buga renderera ani błędu konsoli.
> Wszystkie przetestowane kontrolki edytora, które miały dane do działania,
> aktualizowały podgląd. Pozycje I1/I2 to brak możliwości weryfikacji w tym
> środowisku, a nie potwierdzone defekty.

---

## 7. UX / UI — nuty

- **Asynchroniczny refresh podglądu.** Zmiana źródła/kuracji wywołuje odpytanie backendu;
  podgląd reaguje z ~1 s opóźnieniem (zaobserwowano przejściowy count=3 → 1). To nie błąd,
  ale warto wiedzieć przy szybkich testach (świeży odczyt DOM tuż po kliknięciu może pokazać
  poprzedni stan).
- **Spójność stanu między trybami.** Edycje z Visual są widoczne w podglądzie Wizard i
  odwrotnie (ten sam payload w pamięci). Dobre dla onboardingu.
- **Advanced uczciwie read-only** — jasno oznaczone, z dobrym podsumowaniem kontraktu.
- **Wizard świadomie ogranicza się do źródła filtrowego** — kuracja per-produkt jest tylko
  w Visual (komunikat o tym jest w Wizard).
- **Featured highlight zahardkodowany na emerald** — nie podąża za motywem powierzchni.
- **Puste pola etykiet vs wypełniony podgląd** — patrz 5.5.

---

## 8. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie z asercją DOM:** logowanie, otwarcie fixtury, 3 tryby
edytora, kluczowe kontrolki każdej sekcji, ścieżka zapytania (search/sort), ścieżka
kuracji (select/reorder/remove), empty state, render SSR frontu, a11y, responsywność 375px.

**Nie przetestowano (świadomie):** zapis/publikacja (ochrona współdzielonej fixtury),
realne zastosowanie koloru (picker OS), widoczny efekt obrazów/CTA/linków (brak trasy
detalu + null metadata), realny efekt filtra kolekcji, wszystkie opcje każdego comboboxa,
warianty inne niż matrix na froncie, skrajna gęstość (12 produktów) na froncie.

**Jeśli chodzi o to, co faktycznie udało się przetestować — wszystko, co miało dane do
działania, działało poprawnie i odświeżało podgląd.** Jedyne pozycje „nie-OK" (I1, I2)
to brak możliwości weryfikacji w tym środowisku, a nie potwierdzone defekty. Drobne nuty
UX (I3, I4) nie wpływają na funkcjonalność.

---

## 9. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Funkcje zweryfikowane jako działające | ~30 |
| Pozycje niezweryfikowane (ograniczenie środowiska/narzędzia) | 2 (I1, I2) |
| Drobne nuty UX | 2 (I3, I4) |
| Twarde bugi renderera | 0 |
| Błędy/ostrzeżenia konsoli (frontend) | 0 |
