# RAPORT: Product Compare Widget — wyczerpujący audyt (29-05-2026)

> **Status:** Zakończony — wyczerpujący audyt Wizard / Visual / Advanced + frontend SSR
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-product-compare-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** „Contract Test - product-compare" (`3beb58fc-0d9a-4bd9-ae92-c1d2f83de65e`)
> **Trasa publiczna:** `/test-product-compare-0516` (tytuł strony: `TEST-PRODUCT-COMPARE-0516`)
> **Poprzednia wersja raportu:** zastąpiona — ten przebieg jest bardziej szczegółowy i nie korzysta ze skrótów „reprezentatywnych", gdy opcję faktycznie dało się kliknąć.

---

## 0. Metoda, zakres i różnice względem poprzedniego audytu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przez `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI
edytora oraz na asercjach DOM (`eval`) na żywym podglądzie admin i na statycznym
renderze SSR trasy publicznej.

**Czym ten przebieg różni się od poprzedniego (kluczowe ulepszenia):**

- **Surfaces (5 kolorów) — DOTYCHCZAS niezweryfikowane, teraz POTWIERDZONE.** Poprzedni
  raport nie umiał wysterować natywnego `<input type="color">`. W tym przebiegu użyto
  poprawnego dla Reacta natywnego settera (`HTMLInputElement.prototype.value` +
  zdarzenie `input`), co **wywołało handler** i pozwoliło zweryfikować wszystkie 5 barw
  oraz wszystkie 5 przycisków „Clear" (sekcja 4.6).
- **Filtr kolekcji — DOTYCHCZAS nieprzełączany, teraz zweryfikowany z realnym efektem**
  (Fixture Homes → 2 produkty, +Fixture Lofts → 3) (sekcja 3.6).
- **Wszystkie 8 pól sortowania, oba kierunki, wszystkie 3 statusy** klikane pojedynczo
  (a nie reprezentatywnie) (sekcje 3.4–3.5).
- **Wszystkie 4 locale waluty, oba tryby ilości, wszystkie 4 opcje „Featured product",
  wszystkie 10 pól etykiet, wszystkie 6 przełączników wierszy** — przeklikane do końca.
- **Empty state z niestandardową treścią PL + kolorami** zweryfikowany przez wymuszenie
  pustego wyniku (sekcja 4.7).

**Czego ŚWIADOMIE nie robiono — patrz sekcja 7:**

- **Nie zapisywano** (`Save draft` / `Publish`). Powód: ochrona współdzielonej fixtury i
  trasy publicznej przed mutacją; zapis jest akcją trudną do cofnięcia i nie był zlecony.
  Wszystkie eksperymenty admin pozostały w pamięci edytora; frontend odzwierciedla
  wyłącznie wcześniej zapisaną konfigurację (potwierdzone w sekcji 5).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez asercje
DOM/`eval`. Ewentualne zrzuty Playwright byłyby **wyłącznie lokalnymi etykietami**
(ignorowane przez Git), nie stanowiłyby evidence w repo.

**Pliki źródłowe (przejrzane):**

- `core/widgets/core/productCompare.tsx` — renderer, model danych, normalizacja, schemat.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` — wspólne pola źródła/produktów.
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` + `ClearableFields.tsx` — kontrolki koloru.

**Stan fixtury (zapisany, niezmieniony):** 3 opublikowane produkty rozwiązywane przez
zapytanie (bez kuracji): „Fixture Garden Suite" (159,00 / 179,00, in stock, qty 1),
„Fixture Starter Home" (199,00 / 249,00, in stock, qty 3),
„Fixture Urban Loft" (299,00 / 349,00, backorder, qty 8). Wariant `matrix`,
4 widoczne wiersze (Price / Compare at / Stock / Quantity), caption sr-only.

---

## 1. Przegląd widgetu

**Typ:** `product-compare` (kategoria: content / commerce)
**Warianty:** `matrix` (domyślny), `compact`, `cards`
**Tryby edytora:** Wizard (setup źródła), Visual (codzienna edycja), Advanced (diagnostyka read-only)
**Maks. produktów:** 12 (`PRODUCT_COMPARE_MAX_PRODUCTS`)

Widget renderuje macierz porównania produktów ze źródła commerce (zapytanie filtrowe
albo ręczna kuracja `source.productIds` z zachowaniem kolejności kolumn). Atrybuty
(cena, compare-at, stan, ilość, slug, excerpt) renderowane są jako wiersze (matrix/compact)
albo pary `dt/dd` w kartach (cards).

---

## 2. Mapa kontrolek (z kodu) — co próbowano przeklikać

| Sekcja | Tryb | Kontrolki | Rodzina |
|--------|------|-----------|---------|
| Comparison source | Wizard | limit (spinbutton), search, 2× kolekcje (checkbox), sort field (combobox, 8 opcji), sort dir (combobox, 2), 3× status (checkbox) | number / text / select / checkbox |
| Limit guidance | Wizard | tekst reaktywny (read-only) | — |
| Variant and structure | Visual | 3× karta wariantu (radio-like button) | radio cards |
| Compared products | Visual | N× checkbox produktu + Up/Down/Remove na zaznaczonych | checkbox + reorder/remove |
| Section copy | Visual | title, description, caption (text) + „Hide caption" (toggle) | text / switch |
| Attribute rows | Visual | 6× toggle widoczności | switch |
| Labels | Visual | 10× text (attribute header + 6 atrybutów + in/out/backorder) | text |
| Product columns | Visual | „Show images", „Link titles" (toggle), „CTA mode" (combobox 2 opcje), „CTA label" (text, warunkowy) | switch / select / text |
| Formatting | Visual | money locale (combobox 4), quantity display (combobox 2), compact limit (number) | select / number |
| Layout | Visual | featured product (combobox: None + N produktów), „Sticky header" (toggle) | select / switch |
| Empty state | Visual | title, description (text) | text |
| Surfaces | Visual | 5× swatch koloru (`<input type=color>`) + 5× „Clear" | color picker + clear |
| Preview status / Source / Surface / Contract summary | Advanced | read-only + „Refresh preview" | diagnostyka |

Dodatkowo w fixturze widoczne są **kontrolki blokowe wspólne** (poza kontraktem widgetu):
„Block layout" (content width / paddings / margins — selecty) oraz „Device visibility"
(3× switch). Przetestowano je lekko (sekcja 4.9).

---

## 3. WIZARD — wyniki (każda opcja klikana pojedynczo)

### 3.1 Limit (spinbutton) + reaktywna wskazówka gęstości — DZIAŁA

| Wartość | Tekst „Limit guidance" |
|---------|------------------------|
| 5 | „Current limit: 5. A curated set of 2-5 products stays easiest…" (spokojny) |
| 6 | „Current compare density can be hard to read on mobile (6 products in play)…" (ostrzeżenie) |
| 8 | ostrzeżenie gęstości (8 products in play) |

Próg dokładnie zgodny z kodem (`dense = limit > 5`). **Clamp:** wpisanie `99` → spinbutton
ustawia `12`; wpisanie `0` → `1` (zakres 1–12 wymuszony przez edytor).

### 3.2 Search → filtrowanie zapytania — DZIAŁA

- „Garden" → resolved zawężone do **1** produktu (tylko Garden Suite).
- „zzzznomatch" → **0** produktów → empty state (`role="status"`, `aria-live="polite"`,
  tekst domyślny). Po wyczyszczeniu → ponownie 3.

### 3.3 — (numeracja scalona z 3.2)

### 3.4 Sort field — wszystkie 8 opcji klikane, realny efekt resolvera

| Sort field (asc) | Kolejność kolumn w podglądzie |
|------------------|-------------------------------|
| Title | Garden, Starter, Urban |
| Slug | Garden, Starter, Urban |
| Status | Starter, Urban, Garden |
| Price | Garden, Starter, Urban (159→199→299) |
| Stock | Urban, Starter, Garden (Urban = backorder) |
| Created | Starter, Urban, Garden |
| Updated | Starter, Urban, Garden |
| Published | Starter, Urban, Garden |

Różne uporządkowania potwierdzają, że sort faktycznie trafia do resolvera (nie jest tylko
zapisem do stanu).

### 3.5 Sort direction — oba kierunki, widoczny flip

Na polu „Price": **Descending** → Urban, Starter, Garden (299→199→159); **Ascending** →
Garden, Starter, Urban. ✓

### 3.6 Status filter — wszystkie 3 checkboxy, realny efekt

| Akcja | Count | Interpretacja |
|-------|-------|---------------|
| zaznacz „draft" | **0** | brak produktów draft w fixturze → filtr realnie zawęża |
| dołóż „published" | **3** | draft∨published → 3 published produkty |
| dołóż „archived" | **3** | brak archived → bez zmian |

Po odznaczeniu wszystkich → 3 (domyślny runtime). To dowodzi, że filtr statusu działa
(samo „draft" daje 0, a nie 3).

### 3.7 Collections — oba checkboxy, realny efekt (NOWE)

| Akcja | Count | Produkty |
|-------|-------|----------|
| „Fixture Homes" | **2** | Garden Suite, Starter Home |
| dołóż „Fixture Lofts" | **3** | + Urban Loft |

Po odznaczeniu → 3. Filtr kolekcji **faktycznie zawęża** wynik (Garden/Starter należą do
Homes, Urban do Lofts).

### 3.8 Przejścia trybów — DZIAŁA

„Run setup again" wchodzi do Wizard; „Finish setup and open Visual" wychodzi do Visual.
Stan in-memory zachowany przy przełączaniu (oba podglądy współdzielą payload).

---

## 4. VISUAL — wyniki (kontrolki przeklikane do końca)

### 4.1 Wariant i struktura — wszystkie 3 DZIAŁAJĄ

| Wariant | Render |
|---------|--------|
| Matrix | `<table class="min-w-full text-sm">` |
| Compact | `<table class="min-w-full text-xs">` (gęstszy) |
| Cards | brak tabeli; 3× `<article data-product-id>` |

**Uwaga techniczna (nie bug):** karty wyboru wariantu re-renderują się po kliknięciu i
**dostają nowe refy DOM**. Pojedyncza próba kliknięcia po starym refie nie zadziałała,
dopóki nie odświeżono refów. Z perspektywy użytkownika wybór działa natychmiast.

### 4.2 Compared products — select / reorder / remove — DZIAŁA

- Zaznaczenie Garden → count 1; dołożenie Urban → count 2, **kolejność = kolejność
  zaznaczania** [Garden, Urban] (nie kolejność zapytania).
- „Up" na Urban → [Urban, Garden]; „Down" na Urban → [Garden, Urban]. ✓
- Przyciski poprawnie wyłączane: „Up" na pierwszym, „Down" na ostatnim (`disabled`).
- „Remove" → usuwa z kuracji; usunięcie wszystkich → powrót do ścieżki zapytania (count 3).

### 4.3 Section copy — DZIAŁA

- Title „Porównanie produktów" → dodaje `<h2 id="blk-1-product-compare-heading">`,
  ustawia `aria-labelledby` na ten id i **usuwa** fallback `aria-label`. Poprawne wiązanie a11y.
- Description → renderuje `<p>` pod tytułem.
- Table caption → tekst zmienia się na żywo.
- „Hide caption visually": odznaczenie → `<caption>` z `sr-only` na widoczny
  (`px-3 py-2 text-left text-sm…`); ponowne zaznaczenie → z powrotem `sr-only`. Round-trip OK.

### 4.4 Attribute rows — wszystkie 6 przełączników, oba kierunki — DZIAŁA

- Włączenie „Show product URL path" + „Show excerpt" → wiersze **Slug** (wartości
  `fixture-garden-suite` itd.) i **Excerpt** (rzeczywista treść excerptu).
- Wyłączenie price/compareAt/stock/quantity → te wiersze znikają (zostają tylko Slug/Excerpt).
- Przywrócono domyślne (4 on, slug/excerpt off).

### 4.5 Labels — wszystkie 10 pól wpisane — DZIAŁA (z jednym wyjątkiem środowiskowym)

| Pole | Efekt w podglądzie |
|------|--------------------|
| Attribute column → „Cecha" | nagłówek kolumny atrybutu |
| Price → „Cena" | etykieta wiersza |
| Compare at → „Cena katalogowa" | etykieta wiersza |
| Stock → „Dostępność" | etykieta wiersza |
| Quantity → „Ilość" | etykieta wiersza |
| Slug → „Adres URL" | etykieta wiersza (po włączeniu wiersza) |
| Excerpt → „Opis" | etykieta wiersza (po włączeniu wiersza) |
| In-stock → „Dostępny" | komórki Stock dla in_stock |
| Backorder → „Na zamówienie" | komórka Stock dla Urban (backorder) |
| Out-of-stock → „Niedostępny" | **wpisane, ale niewidoczne** — patrz 6.N1 |

### 4.6 Surfaces — wszystkie 5 barw + wszystkie 5 „Clear" — DZIAŁA (NOWE)

Sterowanie przez natywny setter Reacta (poprzednio nieosiągalne):

| Kontrolka | Cel inline-style | Zweryfikowano |
|-----------|------------------|---------------|
| Table background | wrapper scrolla: `background-color: rgb(255,136,0)` | ✓ |
| Table border | wrapper scrolla: `border-color: rgb(17,34,51)` | ✓ |
| Header background | `<thead><tr>`: `background-color: rgb(68,85,102)` | ✓ |
| Empty background | div empty state: `background-color: rgb(34,34,68)` | ✓ (w empty state) |
| Empty border | div empty state: `border-color: rgb(136,136,255)` | ✓ (w empty state) |

Po ustawieniu każda kontrolka pokazuje stan „Selected color", a przycisk „Clear"
przechodzi z `disabled` na aktywny. **„Clear"**: kliknięcie zeruje barwę → stan „Theme
default", swatch wraca do `pickerFallback` (np. `#ffffff`), inline-style znika. Wszystkie 5
„Clear" przetestowane (po wyczyszczeniu wrappera `style=""`, wszystkie 5 stanów „Theme default").

**Brak przycisku „transparent"** dla tego widgetu — `SharedColorControl` używa domyślnego
`allowTransparent=false`, więc opcja przezroczystości nie jest renderowana (jest to zgodne z
kodem, nie brak). Dostępny jest tylko „Clear".

### 4.7 Empty state (copy) — DZIAŁA

Ustawiono niestandardowe PL: title „Brak produktów do porównania", description „Zmień
filtry źródła lub opublikuj produkty." Następnie wymuszono pusty wynik (search bez trafień).
Render empty state pokazał **dokładnie tę treść** oraz inline-kolory empty bg/border. Pełne
domknięcie ścieżki empty state + powierzchni.

### 4.8 Formatting — wszystkie opcje — DZIAŁA

| Money locale | Wiersz Price |
|--------------|--------------|
| English (US) | `$159.00 / $199.00 / $299.00` |
| Polish (PL) | `159,00 USD / 199,00 USD / 299,00 USD` |
| German (DE) | `159,00 $ / 199,00 $ / 299,00 $` |
| French (FR) | `159,00 $US / 199,00 $US / 299,00 $US` |

**Quantity display:** compact + limit 2 → `1 / 2+ / 2+`; compact + limit 99 → `1 / 3 / 8`;
exact → `1 / 3 / 8`. Próg działa zgodnie z `quantityCompactLimit`.

### 4.9 Layout — DZIAŁA

- **Featured product** (wszystkie 4 opcje): Garden → badge „Featured" + klasa `emerald`
  w kolumnie 1; Urban → kolumna 3; Starter → kolumna 2; „No featured product" → brak
  badge i brak `emerald`. Wyróżnienie trafia we właściwą kolumnę.
- **Sticky table header:** ON → pierwszy `<th>` dostaje `sticky left-0 top-0 z-20`;
  OFF → klasy znikają.

### 4.10 Kontrolki blokowe wspólne (poza kontraktem widgetu) — DZIAŁA

- „Content width" (select: default / narrow / full) — zmiana na „narrow" i powrót do „default".
- „Device visibility" switch (Desktop) — `aria-checked` false→true→false.

Pozostałe selecty (paddings/margins) to identyczne komponenty Radix; przetestowano
reprezentatywnie jeden, bo nie należą do kontraktu product-compare (oznaczone wprost).

---

## 5. ADVANCED (read-only) — wyniki

| Funkcja | Wynik |
|---------|-------|
| Notka read-only | „Advanced mode is read-only. Use Wizard or Visual…" ✓ |
| Preview status | „Resolved rows: 3 of 3", „Selected products: None · Limit: 3", „Resolved at <ts>" ✓ |
| **Refresh preview** | timestamp 07:16:35.332Z → 07:16:55.436Z — realny re-resolve backendu ✓ |
| Source summary (zapytanie) | mode „Query results", limit „3 products", Search „None", Collections „No collection filter", Status „Public-ready default", Sort „Title, A to Z" ✓ |
| Source summary (kuracja) | mode „1 selected product in manual order", limit „1 product", Sort „Ignored while selected products are used" ✓ |
| Surface summary | „Theme default" / „Selected swatch" zależnie od stanu (empty kolory → „Selected swatch") ✓ |
| Contract summary | poprawny podział Wizard / Visual / Advanced ✓ |
| Pola zapisywalne | brak — panel czysto diagnostyczny ✓ |

---

## 6. FRONTEND (trasa publiczna, SSR)

| Aspekt | Wynik |
|--------|-------|
| Render | 1 instancja, wariant matrix (`text-sm`), **count = 3** (ścieżka zapytania z zapisanej konfiguracji) |
| Zgodność z zapisem | **domyślne etykiety EN** (Price/Compare at/Stock/Quantity), **locale en-US** (`$159.00`), **brak tytułu** → `aria-label="Product comparison"`, caption `sr-only`. → **Moje edycje in-memory NIE wyciekły** (brak Save/Publish). |
| Semantyka tabeli | wszystkie `<th scope="col">` (4 nagłówki), `<caption>` (sr-only) „Product comparison" |
| Region przewijania | `tabindex="0"`, `aria-label="Product comparison"`, `aria-describedby` → id podpowiedzi scrolla, `data-overflow-intentional="true"` |
| Konsola | **0 błędów, 0 ostrzeżeń** |
| Mobile 375px | brak overflow strony (`bodyScrollW == windowW == 375`, `hasHScroll=false`) |
| Scroll regionu tabeli @375px | `scrollWidth == clientWidth == 373` → **realnie NIE przepełnia**, ale podpowiedź „Scroll horizontally…" **i tak jest widoczna** (patrz U3) |

---

## 7. Co NIE działa / wymaga uwagi (klasyfikacja uczciwa)

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| N1 | **Etykieta „Out of stock" niemożliwa do zobaczenia** — w fixturze nie ma produktu o stanie `out_of_stock` (są tylko in_stock i backorder). Pole etykiety przyjmuje wpis, ale efekt wizualny nieosiągalny w tym zbiorze danych. | Niewidoczne w tej fixturze (nie defekt) |
| N2 | **Images / Link titles / CTA bez widocznego efektu** — resolved rows mają `imageUrl=null` i `productHref=null` (brak skonfigurowanej trasy detalu produktu w Site Settings). Render celowo degraduje do tekstu (tytuł = `<span>`, 0× `<img>`, 0× `<a>`, brak CTA). Konfiguracja zapisuje się w stanie. Edytor ostrzega tekstem, ale sam podgląd nie sygnalizuje „dlaczego nic się nie dzieje". | Działa warunkowo / luka feedbacku |
| N3 | **Warianty inne niż matrix, niestandardowe etykiety/locale/kolory niewidoczne na froncie** — wymaga zapisu, którego świadomie nie wykonano (sekcja 0). | Nietestowalne bez zapisu |

> Nie stwierdzono żadnego twardego buga renderera ani błędu konsoli. Każda kontrolka,
> która miała dane do działania, aktualizowała podgląd. Pozycje N1–N3 to ograniczenia
> środowiska/decyzji, nie potwierdzone defekty.

---

## 8. Czego NIE dało się przetestować i DLACZEGO (precyzyjnie)

- **Zapis / publikacja (Save draft / Publish):** świadomie pominięte, by nie mutować
  współdzielonej fixtury ani trasy publicznej (akcja trudna do cofnięcia, niezlecona).
  Konsekwencja: front pokazuje wyłącznie wcześniej zapisany stan.
- **Wizualny efekt etykiety „Out of stock":** brak produktu `out_of_stock` w fixturze (N1).
- **Wizualny efekt obrazów / linków tytułów / CTA:** brak trasy detalu produktu →
  `imageUrl`/`productHref` = `null` (N2). Renderer poprawnie degraduje do tekstu.
- **Picker barwy przez natywny dialog OS:** niesterowalny przez automat; obejście przez
  natywny setter Reacta **zadziałało** i pozwoliło zweryfikować logikę onChange/Clear
  (sekcja 4.6). Realnego klikania w systemowy color-picker nie da się zautomatyzować — to
  ograniczenie narzędziowe, nie produktu.

---

## 9. UX / UI — nuty

- **U1 — Asynchroniczny refresh podglądu (~1 s).** Zmiana źródła/kuracji odpytuje backend;
  świeży odczyt DOM tuż po kliknięciu bywa o jedną klatkę spóźniony. Nie błąd, ale ważne
  przy szybkich testach.
- **U2 — Karty wariantu re-renderują się i zmieniają refy DOM** po wyborze. Dla człowieka
  bez znaczenia; dla automatyzacji wymaga ponownego pobrania refów.
- **U3 — Podpowiedź „Scroll horizontally…" zawsze widoczna**, nawet gdy tabela realnie się
  mieści (potwierdzone @375px: region nie przepełnia, a podpowiedź wciąż jest). Nie jest
  warunkowana faktycznym overflow.
- **U4 — Dwuznaczność słowa „Limit".** Visual „Compared products" pokazuje „Limit: 12"
  (maks. liczba zaznaczalnych produktów), a Advanced „Preview status" „Limit: 3"
  (`source.limit` zapytania). To samo słowo, dwa znaczenia.
- **U5 — Featured highlight zahardkodowany na `emerald`** (klasy `bg-emerald-…`), nie podąża
  za motywem powierzchni.
- **U6 — Puste pola etykiet vs wypełniony podgląd.** Pola atrybutów w UI są puste
  (placeholder), a podgląd pokazuje wartości domyślne — poprawne (pusty input = fallback),
  ale wizualnie bywa mylące.
- **U7 — Brak feedbacku przy bezczynnych obrazach/CTA** (N2): edytor ostrzega tekstem, ale
  podgląd nie pokazuje, że opcja jest nieaktywna z powodu braku trasy detalu.

---

## 10. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie z asercją DOM (każda dostępna opcja klikana, nie reprezentatywnie):**
logowanie, otwarcie fixtury; Wizard (limit + clamp + reaktywna gęstość, search→1/→0,
**wszystkie 8 sortów**, **oba kierunki**, **wszystkie 3 statusy**, **oba filtry kolekcji**,
przejścia trybów); Visual (**3 warianty**, kuracja select/Up/Down/Remove, section copy +
a11y, **6 przełączników wierszy**, **10 pól etykiet**, product columns + warunkowe pole CTA,
**4 locale**, tryby ilości + próg, **4 opcje featured** + sticky, empty state copy,
**5 barw + 5× Clear**, kontrolki blokowe); Advanced (diagnostyka, **refresh = realny
re-resolve**, source summary w trybie zapytania i kuracji, surface/contract summary);
Frontend (SSR, a11y `th scope`/caption/region, konsola czysta, 375px).

**Nie przetestowano (świadomie / środowiskowo):** zapis/publikacja (ochrona fixtury);
widoczny efekt etykiety out-of-stock (brak takiego produktu); widoczny efekt
obrazów/CTA/linków (brak trasy detalu → null metadata); warianty/etykiety/locale/kolory na
froncie (wymaga zapisu).

---

## 11. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Rodziny kontrolek widgetu przeklikane do końca | wszystkie obecne w tej fixturze |
| Funkcje zweryfikowane jako działające | ~55 dyskretnych asercji |
| Pozycje niewidoczne/nietestowalne w tym środowisku | 3 (N1 out-of-stock, N2 obrazy/CTA, N3 brak zapisu) |
| Nuty UX | 7 (U1–U7) |
| Twarde bugi renderera | 0 |
| Błędy/ostrzeżenia konsoli (frontend) | 0 |
