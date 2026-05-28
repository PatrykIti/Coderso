# RAPORT: Product Table Widget — audyt bieżącego stanu (28-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-product-table` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - product-table (`f317c971-cc3f-4003-9a38-66ff40c8d036`)
> **Trasa publiczna:** `/producttabletestproducttabletest`
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Poprzedni raport:** `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRODUCT_TABLE_WIDGET.md` (wówczas `fixture-gap` — pusta fixtura)

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI
edytora oraz inspekcji DOM (`eval`) na żywym podglądzie admin i na trasie publicznej.

**Co faktycznie przetestowano:** logowanie, otwarcie fixtury, tryb Wizard (źródło
danych, filtry), tryb Visual (układ, nagłówek, kolumny, etykiety, kontrolki
publiczne, eksport/waluta, linki, surfaces), tryb Advanced (diagnostyka read-only),
oraz statyczny render SSR trasy publicznej z kontrolą responsywności i a11y.

**Czego NIE testowano (świadomie):**
- **Nie zapisywano** zmian (`Save draft` / `Publish`) — aby nie zmutować współdzielonej
  fixtury dla innych agentów. Wszystkie eksperymenty w admin były w pamięci edytora.
- **Runtime'owych kontrolek publicznych** (search / sort / pagination / CSV export
  na froncie) — opublikowana konfiguracja ma je wyłączone, a celowo nie publikowałem
  eksperymentalnego włączenia. Statyczny render zweryfikowano.
- Pełnego wyboru kolorów ze swatcha (testowano tylko `Clear`).
- Każdej pojedynczej opcji w każdym combobox — testowano reprezentatywne wartości.

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja odbyła się przez asercje
DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi etykietami,
ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**
- `core/widgets/core/productTable.tsx` — renderer, model danych, normalizacja, runtime/SSR
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx` — edytory Wizard / Visual / Advanced

---

## 1. Przegląd widgetu

**Typ:** `product-table` (commerce / content)
**Warianty:** `default`, `compact` (wariant to preset osi stylu)
**Tryby edytora:** Wizard (setup), Visual (codzienna edycja), Advanced (diagnostyka read-only)

Widget renderuje tabelaryczną listę produktów z runtime'owego źródła commerce.
Obsługuje konfigurowalne kolumny, etykiety, formatowanie waluty, eksport CSV (SSR),
kontrolki publiczne (search/filtry/sortowanie/paginacja), linkowanie do strony
produktu oraz bogaty zestaw opcji stylu (gęstość, paski, hover, sticky header,
szerokość, wyrównanie, typografia, kolory powierzchni).

**Zmiana względem 27-05:** fixtura jest teraz **wypełniona danymi** (3 produkty),
co umożliwiło test populated runtime — w przeciwieństwie do raportu 27-05, który
trafił na pustą fixturę (status `fixture-gap`). Zgodnie z notą TASK-342 końcowy
rerun potwierdził `fixtureGaps=0`.

**Dane fixtury (3 produkty):**
- Fixture Garden Suite — `/fixture-garden-suite` — $159.00 (compare-at $179.00) — Published — In stock — 2 kolekcje
- Fixture Urban Loft — `/fixture-urban-loft` — $299.00 (compare-at $349.00) — Published — Backorder — 1 kolekcja
- Fixture Starter Home — `/fixture-starter-home` — $199.00 (compare-at $249.00) — Published — In stock — 1 kolekcja
- Dostępne kolekcje źródłowe: **Fixture Homes**, **Fixture Lofts**

---

## 2. Struktura trybów edytora — istotny niuans IA

Lista zakładek trybu eksponuje **tylko dwie** zakładki: **Visual** (zaznaczona
domyślnie) oraz **Advanced**. **Tryb Wizard NIE jest równorzędną zakładką** —
jest jednorazowym przepływem konfiguracji uruchamianym przyciskiem **„Run setup
again"**. Panel boczny pokazuje status „Setup complete" z opisem:
_„Daily edits live in Visual. Advanced is for technical diagnostics."_

To świadoma decyzja IA (Wizard = onboarding/setup, a nie codzienny tryb), ale
zadanie „przetestuj tryb Wizard" wymaga najpierw kliknięcia „Run setup again".
Z Wizarda wychodzi się przyciskiem **„Finish setup and open Visual"**, który
poprawnie przełącza na zakładkę Visual.

---

## 3. Tryb Wizard — wynik: DZIAŁA w całości

Sekcje: **Table source** + **Preview summary** (read-only) + żywy panel „Preview
ready" renderujący tabelę przez współdzielony renderer.

**Pola Table source:** Limit, Search, Collections (checkboxy: Fixture Homes /
Fixture Lofts), Sort field, Sort direction, Status filter (draft/published/archived).
Teksty pomocnicze: kolekcje — _„Use collection checkboxes when collections are
available. Manual collection keys are support-owned and hidden from setup."_;
status — _„Empty means runtime default: public pages show published, preview can
show all."_

| Test | Akcja | Wynik | Status |
|------|-------|-------|--------|
| Limit | 12 → 2 | Podgląd przeliczył: „Resolved items: 2 · Total: 3", 2 wiersze | ✅ działa |
| Search | wpis „Garden" | „Resolved items: 1 · Total: 1" (zawężenie) | ✅ działa |
| Collection | zaznacz „Fixture Homes" | „Resolved items: 2 · Total: 2", checkbox utrzymany | ✅ działa |
| Status | zaznacz „draft" | „Resolved items: 0 · Total: 0" + empty state (wszystkie fixtury published) | ✅ działa |
| Przywrócenie | odznaczenie filtrów | powrót do „Resolved items: 3 · Total: 3" | ✅ działa |
| Przejście | „Finish setup and open Visual" | przełączenie na zakładkę Visual | ✅ działa |

**Wniosek:** wszystkie testowane kontrolki Wizarda działają, aktualizują podgląd
na żywo (backendowe przeliczenie źródła) i utrzymują stan w UI.

---

## 4. Tryb Visual — wynik: DZIAŁA (z dwoma uwarunkowanymi niuansami)

Visual deklaruje 12 sekcji (zgodnie z kontraktem edytora). Przetestowano
reprezentatywny przekrój kontrolek z każdej grupy.

### 4.1 Co przetestowano i działa

| Sekcja | Kontrolka | Test | Wynik | Status |
|--------|-----------|------|-------|--------|
| Section header | Section title | „Katalog testowy PT" | render jako `<h2>` ORAZ `aria-label` sekcji | ✅ |
| Column labels | Product | „Produkt" | nagłówek kolumny zmieniony na „Produkt" | ✅ |
| Columns | Show image | włącz | dodana kolumna „Image" (obraz / „No image") | ✅ |
| Columns | Show compare-at | włącz | dodana kolumna „Compare at" | ✅ |
| Layout/style | Row treatment | Striped rows | `data-product-table-row-treatment="striped"` | ✅ |
| Layout/style | Row density | Compact | `data-product-table-density="compact"` | ✅ |
| Public controls | Sorting UI | Interactive headers | 5 klikalnych nagłówków sort + „Visitor sorting: Interactive headers" | ✅ |
| Public controls | Pagination mode | Previous and next | pojawia się warunkowe pole „Page size"; przy page size=2 → 2 wiersze + `nav` paginacji w podglądzie | ✅ |
| Export/currency | Show CSV export | włącz | kotwica eksportu z `href="data:text/csv..."`, `download="katalog-testowy-pt.csv"` (nazwa z tytułu sekcji) | ✅ |
| Export/currency | Money locale | Polish (PL) | ceny przeformatowane „$159.00" → „159,00 USD" | ✅ |
| Columns (guard) | odznacz Slug, potem Product | Product automatycznie pozostaje `[checked]` (guard tożsamości) | ✅ |
| Surfaces | Table background → Clear | pole wyczyszczone, przycisk „Clear" przeszedł w `[disabled]` | ✅ |

**Pola warunkowe (conditional rendering) — wszystkie działają poprawnie:**
- „Page size" widoczne tylko gdy Pagination ≠ „No pagination"
- „Export label" tylko gdy „Show CSV export" włączone
- „Action label" tylko gdy „Show action column" włączone
- „Open product links in new tab" tylko gdy linked column ≠ none lub action włączone
- „Show stock quantity" tylko gdy „Show stock" włączone

**Guard pricing** (analogiczny do identity): co najmniej jedna kolumna cenowa
pozostaje widoczna — Price wraca po ukryciu Compare at. Kontrolki opatrzone czytelnymi
opisami: _„At least one identity/pricing column stays visible..."_.

### 4.2 Niuanse uwarunkowane środowiskiem (NIE są to bugi widgetu)

| # | Obserwacja | Wyjaśnienie |
|---|-----------|-------------|
| N1 | **Linked column** = „Product column" — **brak widocznych linków** w komórkach | `productHref` jest `null`, bo w Site Settings nie skonfigurowano trasy szczegółów produktu. Edytor jawnie ostrzega: _„When no route is available, runtime keeps the table text-only."_ Kontrolka zapisuje stan, ale efekt jest niewidoczny w tej fixturze. |
| N2 | **Show action column** — nagłówek „Action" pojawia się, ale komórki pokazują „-" | Ta sama przyczyna co N1 (`productHref` null → brak linku akcji, fallback „-"). |

Oba zachowania są **zgodne z kodem i intencją** — to bounded, defensywne renderowanie,
a nie defekt. Warto je odnotować, bo testując same kontrolki można błędnie uznać,
że „linkowanie nie działa".

---

## 5. Tryb Advanced — wynik: DZIAŁA (read-only zgodnie z kontraktem)

Advanced zawiera wyłącznie diagnostykę read-only (kontrakt: `writablePaths: []`).
Sekcje:
- **Runtime status** (read-only): Resolved items/Total, Products shown, Visitor
  sorting/Pagination, znacznik „Resolved at", przycisk **„Refresh preview"**.
- **Query summary** (read-only): Product limit, Search scope, Collection scope,
  Status scope, Sort order, Visitor controls, Page size.
- (dodatkowo współdzielona sekcja „Block layout summary").

| Test | Wynik | Status |
|------|-------|--------|
| Odzwierciedlenie stanu edytora | Pokazał moje niezapisane zmiany z Visual: „Visitor controls: Sorting headers, Pagination", „Page size: 2 products per page" | ✅ |
| „Refresh preview" | znacznik „Resolved at" zaktualizował się (7:44:29 → 7:47:09 PM) | ✅ |
| Brak edytowalnych pól | potwierdzony — tylko podsumowania i przycisk odświeżania | ✅ |

**Niuans:** Query summary rozróżnia **„Product limit"** (12 — limit zapytania
źródłowego) od **„Page size"** (2 — wielkość strony przy włączonej paginacji).
To poprawne, ale dla mniej technicznego autora może być subtelne, że to dwie różne
wartości.

---

## 6. Trasa publiczna (frontend) — wynik: DZIAŁA (statyczny render SSR)

URL: `http://localhost:3000/producttabletestproducttabletest` → **HTTP 200**.
Render jest **server-side** — surowy HTML z serwera zawiera tabelę
(`data-product-table-count="3"`, nazwy produktów, etykietę „Produkt").

### 6.1 Render opublikowanej konfiguracji

- **3 produkty, 7 kolumn:** Produkt, Slug, Price, Compare at, Status, Stock, Collections
- Ceny: $159.00 / $299.00 / $199.00; compare-at: $179.00 / $349.00 / $249.00
- Liczniki kolekcji: 2 / 1 / 1; statusy: Published; stany magazynowe: In stock / Backorder / In stock
- Atrybuty: `count=3`, `variant=default`, `density=comfortable`, `row-treatment=plain`, `page=1`, `aria-label="Product table"` (brak opublikowanego custom tytułu sekcji → fallback)
- **Brak kontrolek publicznych** (search / sort links / pagination nav / export button) — w opublikowanej konfiguracji są wyłączone

### 6.2 Dostępność (a11y) — pozytywnie

- Region przewijania tabeli jest fokusowalny klawiaturą (`tabindex="0"`)
- Obecna podpowiedź przewijania (`data-overflow-affordance`, `data-overflow-intentional="true"`)
- `<table aria-labelledby>` powiązane z `<caption class="sr-only">`
- Badge statusu z `aria-label="Status: Published"`

### 6.3 Responsywność (mobile 375px) — pozytywnie

- Szeroka tabela (`min-w-[44rem]`) przewija się **wewnątrz kontenera**
  (scrollWidth 704 > clientWidth 373)
- **Brak poziomego przepełnienia całej strony** (`pageHorizontalOverflow: false`) —
  overflow jest świadomie ograniczony do regionu tabeli, layout strony nie pęka

### 6.4 Konsola — czysto

Brak błędów i ostrzeżeń w konsoli na trasie publicznej.

---

## 7. Admin (draft) vs Frontend (published) — zaobserwowana rozbieżność

| Aspekt | Admin canvas (draft, stan początkowy) | Public (published) |
|--------|---------------------------------------|--------------------|
| Liczba kolumn | 5 (Product, Slug, Price, Status, Stock) | 7 (Produkt, Slug, Price, Compare at, Status, Stock, Collections) |
| Etykieta kolumny produktu | „Product" (domyślna) | „Produkt" (custom) |
| Kolumna Compare at | brak | obecna |
| Kolumna Collections | brak | obecna |

**Interpretacja:** zapisany **draft** strony i wersja **opublikowana** są
rozbieżne. To stan zastany (NIE wynik tej sesji — nie zapisywałem żadnych zmian;
początkowy snapshot przed jakąkolwiek edycją pokazywał 5 kolumn + „Product").
Rozbieżność draft/published jest normalnie możliwa w CMS, ale tu jest wyraźna —
warto, by autor wiedział, że publiczny render NIE odzwierciedla aktualnego draftu
do czasu ponownej publikacji.

---

## 8. Dodatkowe niuanse UX/UI

| # | Niuans | Obszar |
|---|--------|--------|
| U1 | Wizard to przepływ „setup" (przycisk „Run setup again"), a nie równorzędna zakładka — tylko Visual i Advanced są zakładkami | IA edytora |
| U2 | Opuszczenie strony admin z niezapisanymi zmianami wywołuje dialog `beforeunload` (potwierdzenie) — blokował nawigację Playwright do czasu zaakceptowania | Edytor strony (nie sam widget) |
| U3 | Linked column / Action column nie dają widocznego efektu bez skonfigurowanej trasy szczegółów produktu — edytor o tym ostrzega tekstem, ale autor może nie zauważyć, dlaczego „linki nie działają" | Visual / runtime |
| U4 | Advanced rozróżnia „Product limit" vs „Page size" — subtelne dla nietechnicznego autora | Advanced |
| U5 | Nazwa pliku eksportu CSV jest wyprowadzana z tytułu sekcji (np. „Katalog testowy PT" → `katalog-testowy-pt.csv`); brak tytułu → `product-table.csv` | Export |
| U6 | Surfaces: po wyczyszczeniu (Clear) przycisk staje się `[disabled]` i znika etykieta „Saved custom color" — spójny, czytelny stan | Visual / Surfaces |

---

## 9. Podsumowanie

**Ocena ogólna:** widget `product-table` jest w **dobrym, dojrzałym stanie**.
Wszystkie faktycznie przetestowane kontrolki w trybach Wizard, Visual i Advanced
**działają** — aktualizują podgląd na żywo, utrzymują stan w UI i poprawnie
renderują na froncie (SSR).

**Co działa (potwierdzone testem):**
- Wizard: limit, search, kolekcje, filtr statusu, przeliczanie podglądu, przejście do Visual
- Visual: tytuł sekcji (h2 + aria-label), custom etykiety, toggling kolumn, guard tożsamości/cen, density, row treatment, sorting interactive, pagination + page size, CSV export, money locale, Surfaces Clear, pola warunkowe
- Advanced: live read-only diagnostyka, Refresh preview
- Frontend: populated SSR (3 produkty, 7 kolumn), a11y (focusowalny scroll, aria-labelledby, aria-label statusu), responsywność (overflow ograniczony do tabeli)

**Co NIE działa / wymaga świadomości:**
- Brak jednoznacznych defektów funkcjonalnych w przetestowanym zakresie.
- Linked/Action column bez efektu w tej fixturze (brak trasy produktu — zachowanie zgodne z kodem, nie bug).
- Draft i published rozbieżne (stan zastany — nie defekt renderera).

**Czego nie zdołano przetestować (uczciwie):** runtime'owych kontrolek publicznych
(search/sort/pagination/CSV export na żywym froncie), bo opublikowana konfiguracja
ma je wyłączone, a nie publikowałem eksperymentalnych zmian, by nie mutować
współdzielonej fixtury. Render statyczny i diagnostyka tych funkcji w podglądzie
admin zostały zweryfikowane pozytywnie.

---

## 10. Statystyki testu

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) |
| Kontrolki potwierdzone jako działające | 12+ (reprezentatywny przekrój) |
| Defekty funkcjonalne | 0 (w przetestowanym zakresie) |
| Niuanse uwarunkowane środowiskiem | 2 (N1 linked, N2 action — brak trasy produktu) |
| Niuanse UX/UI | 6 (U1–U6) |
| Trasa publiczna | HTTP 200, SSR, 3 produkty, 0 błędów konsoli |
| Zrzuty PNG | 0 (weryfikacja przez DOM/eval; nazwy zrzutów byłyby lokalnymi etykietami) |
