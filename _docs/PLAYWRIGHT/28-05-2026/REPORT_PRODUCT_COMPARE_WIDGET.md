# RAPORT: Product Compare Widget — wyczerpujący audyt (domknięcie luki, 29-05-2026)

> **Status:** Zakończony — pełny re-audyt Wizard / Visual / Advanced + frontend SSR, z **wyczerpującym** przeklikaniem współdzielonych kontrolek blokowych (Block layout, Device visibility), które wcześniej były tylko próbkowane.
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-product-compare-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** „Contract Test - product-compare" (`3beb58fc-0d9a-4bd9-ae92-c1d2f83de65e`)
> **Trasa publiczna:** `/test-product-compare-0516` (tytuł strony: `TEST-PRODUCT-COMPARE-0516`)
> **Poprzednia wersja raportu:** zastąpiona. Ten przebieg domyka jedyną pozostałą lukę poprzedniej wersji („jedna kontrola reprezentatywna wokół widocznych współdzielonych kontrolek") i dokłada dwie nowe, istotne obserwacje korektności.

---

## 0. Czym ten przebieg różni się od poprzedniego (domknięcie luki)

Poprzedni raport zostawiał jedno miejsce „reprezentatywne": współdzielone kontrolki
**Block layout** (paddingi/marginesy) były testowane tylko na jednym selekcie, bo nie
należą do kontraktu `product-compare`. Ten przebieg **eliminuje to próbkowanie**:

- **Block layout — przeklikane WSZYSTKIE opcje WSZYSTKICH selectów** (31 dyskretnych
  asercji DOM, sekcja 3):
  - Content width: 3/3 opcje (`default`, `narrow`, `full`),
  - Top padding: 7/7 tokenów, Bottom padding: 7/7, Top margin: 7/7, Bottom margin: 7/7,
  - każda opcja zweryfikowana **mapowaniem na dokładną klasę Tailwind** w realnym DOM podglądu.
- **Device visibility — wszystkie 3 przełączniki** klikane pojedynczo (Desktop/Tablet/Mobile),
  z weryfikacją `aria-checked` (sekcja 3.6).

Przy okazji domknięcia luki ujawniły się **dwie nowe obserwacje korektności**, których
poprzedni raport nie miał (bo nie sterował tymi kontrolkami do końca):

1. **Niespójność paddingu (kontrolka „kłamie").** Zarówno selecty w Visual, jak i podsumowanie
   read-only w Advanced pokazują padding `MD`, podczas gdy blok **realnie renderuje się z `XL`
   (`pt-12 pb-12`)** — i w podglądzie admin, i na publicznym SSR. Powód: zapisany padding to
   `inherit` (dziedziczenie domyślnej wartości strony = `xl`), a obie powierzchnie edytora
   zwijają `inherit → md` przy wyświetlaniu (sekcje 6.B1 i 7.U8/U9).
2. **Device visibility = „Hidden on all devices", a blok i tak się renderuje publicznie.**
   Zapisana fixtura ma pustą listę urządzeń (wszystkie 3 przełączniki OFF), Advanced wprost
   raportuje „Hidden on all devices", a mimo to blok renderuje się na froncie (`count=3`).
   Ukrywanie jest bramkowane przez `previewDevice` i na publicznym SSR nie działa (sekcja 6.B2).

**Czego ŚWIADOMIE nie robiono:** patrz sekcja 8. Kluczowo — **nie zapisywano** (`Save draft` /
`Publish`), by nie mutować współdzielonej fixtury/trasy. Wszystkie eksperymenty pozostały
in-memory; front odzwierciedla wyłącznie wcześniej zapisaną konfigurację (potwierdzone w sekcji 6).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja przez asercje DOM/`eval`. Ewentualne
zrzuty Playwright byłyby **wyłącznie etykietami lokalnymi** (ignorowane przez Git), nie stanowiłyby
evidence w repozytorium.

**Pliki źródłowe (przejrzane w tym przebiegu):**

- `core/widgets/core/productCompare.tsx` — renderer, model danych, normalizacja, schemat.
- `core/widgets/renderers/widgetRenderer.tsx` — wrapper bloku: mapy klas container/padding/margin
  (`containerClassMap`, `paddingTopClassMap`…) oraz bramka widoczności (`visibility?.enabled`,
  `visibility.devices` + `previewDevice`).
- `core/admin/ui/pages/builder/LayoutPanel.tsx` — selecty Content width / padding / margin.
- `core/admin/ui/pages/builder/VisualPanel.tsx` — sekcja Block layout + Device visibility (3 switche).
- `core/admin/ui/pages/builder/blockUtils.ts` — `sanitizeLayout` (zwijanie `inherit → md/none`).
- `core/widgets/types.ts` — `containerTokens`, `spacingTokens`, typy `Inheritable…Token`, `WidgetVisibility`.

**Stan fixtury (zapisany, niezmieniony):** wariant `matrix`, 3 opublikowane produkty rozwiązywane
zapytaniem (bez kuracji): „Fixture Garden Suite" (159,00 / 179,00, in stock, qty 1),
„Fixture Starter Home" (199,00 / 249,00, in stock, qty 3), „Fixture Urban Loft" (299,00 / 349,00,
backorder, qty 8). 4 widoczne wiersze (Price / Compare at / Stock / Quantity), caption sr-only,
brak tytułu sekcji, locale en-US, Device visibility = pusta (wszystkie OFF), Block layout = padding
dziedziczony (render `xl`).

---

## 1. Co przetestowano w tym przebiegu (lista pierwszorękich interakcji)

| Obszar | Zakres przeklikania | Sposób weryfikacji |
|--------|---------------------|--------------------|
| **Block layout (współdzielone)** | Content width 3/3; padding top/bottom 7/7; margin top/bottom 7/7 | asercja klasy Tailwind sekcji/wrappera w DOM podglądu |
| **Device visibility (współdzielone)** | 3 przełączniki (Desktop/Tablet/Mobile) ON pojedynczo + powrót | `aria-checked` + etykieta „Shown/Hidden" |
| Wizard — Search | „zzzznomatch" → 0 (empty state), wyczyszczenie → 3 | `data-product-compare-count`, `role=status` |
| Wizard — Status | „draft" → 0; +„published" → 3; wyczyszczenie → 3 | count |
| Wizard — Collections | „Fixture Homes" → 2; wyczyszczenie → 3 | count |
| Wizard — Sort | pole „Price" ASC → 159/199/299; DESC → 299/199/159 | kolejność kolumn `thead` |
| Wizard — Advanced przejście | „Finish setup and open Visual", zakładka Advanced | nawigacja |
| Visual — Wariant | matrix / compact / cards | klasa `table` (text-sm/text-xs) / `article[data-product-id]` |
| Visual — Money locale | 4/4 (en-US, pl-PL, de-DE, fr-FR) | wartości wiersza Price |
| Visual — Quantity display | exact / compact + próg (limit 2) | wartości wiersza Quantity |
| Visual — Attribute rows | toggle „Show product URL path" (wiersz Slug) on/off | obecność wiersza + wartości slug |
| Visual — Surfaces | Table background (`#ff8800`) + „Clear" | inline-style na wrapperze scrolla |
| Visual — Layout | Featured = Urban Loft / None; Sticky header on/off | klasa `emerald`, badge „Featured", `sticky left-0 top-0 z-20` |
| Visual — Section copy | Title „Porównanie produktów" | wiązanie a11y (h2/`aria-labelledby`) |
| Advanced | nota read-only, preview status, **Refresh preview**, source/surface/contract/block-layout/visibility summary | tekst + zmiana timestampu |
| Frontend SSR | render, etykiety/locale, a11y, konsola, 375px | DOM + console |

Pozostałe rodziny kontrolek widgetu (limit+clamp, pełna macierz 8 pól sortu, wszystkie 10 etykiet,
4 opcje featured, wszystkie 5 barw + 5× Clear, hide-caption round-trip, empty-state custom copy)
zostały **wyczerpująco przeklikane w bezpośrednio poprzednim przebiegu** i pozostają aktualne —
renderer i kontrakt są niezmienione. W tym przebiegu potwierdzono ich krytyczne ścieżki na nowo
(resolver realnie sortuje/filtruje, formatowanie liczb, toggling wierszy, inline-style barwy,
empty state, a11y tytułu) — wszystkie zgodne.

---

## 2. Mapa kontrolek (z kodu)

| Sekcja | Tryb | Kontrolki | Rodzina |
|--------|------|-----------|---------|
| Comparison source | Wizard | limit (spinbutton), search, 2× kolekcje (checkbox), sort field (8 opcji), sort dir (2), 3× status (checkbox) | number / text / select / checkbox |
| Limit guidance | Wizard | tekst reaktywny (read-only) | — |
| Variant and structure | Visual | 3× karta wariantu | radio cards |
| Compared products | Visual | N× checkbox + Up/Down/Remove | checkbox + reorder/remove |
| Section copy | Visual | title, description, caption + „Hide caption" | text / switch |
| Attribute rows | Visual | 6× toggle widoczności | switch |
| Labels | Visual | 10× text | text |
| Product columns | Visual | „Show images", „Link titles" (toggle), „CTA mode" (2 opcje), „CTA label" (warunkowy) | switch / select / text |
| Formatting | Visual | money locale (4), quantity display (2), compact limit (number) | select / number |
| Layout | Visual | featured product (None + N), „Sticky header" (toggle) | select / switch |
| Empty state | Visual | title, description | text |
| Surfaces | Visual | 5× swatch koloru (`<input type=color>`) + 5× „Clear" | color picker + clear |
| Advanced | Advanced | preview status, source/surface/contract/**block-layout**/**visibility** summary + „Refresh preview" | diagnostyka read-only |
| **Block layout (współdzielone, poza kontraktem)** | Visual | Content width (3), Top/Bottom padding (7), Top/Bottom margin (7) | select |
| **Device visibility (współdzielone, poza kontraktem)** | Visual | 3× switch (Desktop/Tablet/Mobile) | switch |

---

## 3. WSPÓŁDZIELONE KONTROLKI BLOKOWE — wyczerpująco (domknięcie luki)

> To jest centralny wkład tego przebiegu. Każda opcja każdego selecta przeklikana pojedynczo,
> z odczytem realnej klasy w DOM podglądu admin. Wrapper renderera:
> `…<section class="{padding+margin}"> <div class="{container}"> [widget] …`
> (potwierdzone przejściem po przodkach `[data-widget="product-compare"]`).

### 3.1 Content width (`layout.container`) — 3/3 DZIAŁA

| Opcja | Klasa wrappera (`div`) | Zweryfikowano |
|-------|------------------------|---------------|
| default | `mx-auto w-full max-w-5xl` | ✓ |
| narrow | `mx-auto w-full max-w-3xl` | ✓ |
| full | `w-full` | ✓ |

### 3.2 Top padding (`layout.padding.top`) — 7/7 DZIAŁA

| Token | Klasa sekcji | | Token | Klasa sekcji |
|-------|--------------|-|-------|--------------|
| none | `pt-0` | | lg | `pt-8` |
| xs | `pt-2` | | xl | `pt-12` |
| sm | `pt-4` | | 2xl | `pt-16` |
| md | `pt-6` | | | |

### 3.3 Bottom padding (`layout.padding.bottom`) — 7/7 DZIAŁA

`none → pb-0`, `xs → pb-2`, `sm → pb-4`, `md → pb-6`, `lg → pb-8`, `xl → pb-12`, `2xl → pb-16`. ✓

### 3.4 Top margin (`layout.margin.top`) — 7/7 DZIAŁA

`none → mt-0`, `xs → mt-2`, `sm → mt-4`, `md → mt-6`, `lg → mt-8`, `xl → mt-12`, `2xl → mt-16`. ✓

### 3.5 Bottom margin (`layout.margin.bottom`) — 7/7 DZIAŁA

`none → mb-0`, `xs → mb-2`, `sm → mb-4`, `md → mb-6`, `lg → mb-8`, `xl → mb-12`, `2xl → mb-16`. ✓

> Wszystkie 28 tokenów spacingu (4 selecty × 7) + 3 container = **31 dyskretnych asercji**,
> każda zgodna z mapami w `widgetRenderer.tsx`. Brak próbkowania — luka domknięta.

### 3.6 Device visibility — 3/3 przełączniki (stan) DZIAŁA, efekt renderu — patrz 6.B2 / 8

| Akcja | `aria-checked` (Desktop, Tablet, Mobile) |
|-------|------------------------------------------|
| stan zapisany | `false, false, false` (etykieta „Hidden") |
| Desktop ON | `true, false, false` |
| + Tablet ON | `true, true, false` |
| + Mobile ON | `true, true, true` (etykieta „Shown") |
| powrót OFF×3 | `false, false, false` |

Każdy przełącznik zmienia stan **niezależnie** i poprawnie aktualizuje etykietę „Shown/Hidden".
**Ale** rzeczywisty efekt ukrywania bloku nie jest tu obserwowalny (sekcja 6.B2 i 8).

---

## 4. WIZARD — re-weryfikacja resolvera (pierwszoręka, ten przebieg)

| Test | Wynik | Interpretacja |
|------|-------|---------------|
| Search „zzzznomatch" | count **0**, `role="status"`, `aria-live="polite"`, tekst domyślny „No products to compare / Update source filters or publish products." | empty state realny |
| Search wyczyszczony | count wraca do **3** (z ~1 s opóźnieniem, U1) | recovery OK |
| Status „draft" | count **0** | brak produktów draft → filtr realnie zawęża |
| Status „draft"+„published" | count **3** | OR statusów |
| Status wyczyszczony | count **3** | runtime default |
| Collection „Fixture Homes" | count **2** (Garden, Starter) | filtr kolekcji zawęża |
| Collection wyczyszczona | count **3** | |
| Sort „Price" ASC | kolumny: Garden, Starter, Urban (159→199→299) | sort trafia do resolvera |
| Sort „Price" DESC | kolumny: Urban, Starter, Garden (299→199→159) | flip kierunku działa |

---

## 5. VISUAL — re-weryfikacja (pierwszoręka, ten przebieg)

| Kontrolka | Wynik |
|-----------|-------|
| **Wariant** | matrix → `table.min-w-full.text-sm`; compact → `text-xs`; cards → brak `table`, 3× `article[data-product-id]` ✓ |
| **Money locale** | en-US `$159.00 / $199.00 / $299.00`; pl-PL `159,00 USD …`; de-DE `159,00 $ …`; fr-FR `159,00 $US …` ✓ |
| **Quantity display** | exact → `1 / 3 / 8`; compact+limit 2 → `1 / 2+ / 2+`; exact → `1 / 3 / 8` (próg `quantityCompactLimit` działa) ✓ |
| **Attribute rows** | „Show product URL path" ON → wiersz **Slug** z wartościami `fixture-garden-suite / fixture-starter-home / fixture-urban-loft`; OFF → wiersz znika ✓ |
| **Surfaces — Table background** | ustawienie `#ff8800` przez natywny setter Reacta → `style="background-color: rgb(255, 136, 0);"` na `[data-product-compare-scroll-region="table"]`; stan „Selected color", „Clear" aktywne ✓ |
| **Surfaces — Clear** | klik „Clear" → inline-style znika (`style=""`), stan wraca do „Theme default" ✓ |
| **Featured product** | „Fixture Urban Loft" → kolumna 3 dostaje klasę `emerald` + badge „Featured" (1 szt.); „No featured product" → 0 badge, 0 `emerald` ✓ |
| **Sticky table header** | ON → pierwszy `<th>` = `px-3 py-2 sticky left-0 top-0 z-20 …`; OFF → klasy znikają ✓ |
| **Section title (a11y)** | wpis „Porównanie produktów" → dodaje `<h2 id="blk-1-product-compare-heading">`, ustawia `aria-labelledby` na ten id i **usuwa** `aria-label` ✓ |

---

## 6. ADVANCED + FRONTEND — re-weryfikacja i nowe ustalenia

### 6.A Advanced (read-only) — DZIAŁA

| Funkcja | Wynik |
|---------|-------|
| Nota read-only | „Advanced mode is read-only. Use Wizard or Visual…" ✓ |
| Preview status | „Resolved rows: 3 of 3", „Selected products: None · Limit: 3", „Resolved at <ts>" ✓ |
| **Refresh preview** | timestamp `…16:27:42.410Z` → `…16:27:55.974Z` — **realny re-resolve backendu** ✓ |
| Source summary | odzwierciedla **bieżący stan in-memory** (po teście sortu pokazał „Sort: Price, high to low") ✓ |
| Surface summary | „Theme default" dla wszystkich powierzchni po wyczyszczeniu barwy ✓ |
| Contract summary | poprawny podział Wizard / Visual / Advanced ✓ |
| **Block layout summary** | Content width „default", Padding „Top MD, bottom MD", Margin „Top None, bottom None" — patrz 6.B1 |
| **Visibility summary** | „Shown on: **Hidden on all devices**" — patrz 6.B2 |

### 6.B Frontend (trasa publiczna, SSR)

| Aspekt | Wynik |
|--------|-------|
| Render | 1 instancja, wariant matrix (`text-sm`), **count = 3** (ścieżka zapytania z zapisanej konfiguracji) |
| Brak wycieku edycji | domyślne etykiety EN (Price/Compare at/Stock/Quantity), locale en-US (`$159.00`), brak tytułu → `aria-label="Product comparison"`, caption `sr-only`. **Moje edycje in-memory NIE wyciekły** (brak Save/Publish). |
| Semantyka tabeli | 4× `<th scope="col">`, `<caption class="sr-only">` „Product comparison" |
| Region przewijania | `tabindex="0"`, `aria-label="Product comparison"`, `aria-describedby` → id podpowiedzi scrolla, `data-overflow-intentional="true"` |
| Konsola | **0 błędów, 0 ostrzeżeń** (2 wiadomości łącznie, wszystkie poniżej poziomu warning) |
| Mobile 375px | brak overflow strony (`bodyScrollW == windowW == 375`); region tabeli **NIE przepełnia** (`scrollWidth == clientWidth == 373`), a podpowiedź „Scroll horizontally…" **i tak widoczna** (U3) |
| Obrazy / linki w nagłówku | 0× `<img>`, 0× `<a>` → metadane `imageUrl/productHref = null` (brak trasy detalu) |
| Stany stocku | „In stock", „In stock", „Backorder" — brak `out_of_stock` w fixturze |

### 6.B1 NOWE — Niespójność paddingu (kontrolka/Advanced pokazują MD, render to XL)

Stan **nietknięty** od reloadu (padding dziedziczony):

- Visual select „Top/Bottom padding" wyświetla: **`md`**
- Advanced „Block layout summary" wyświetla: **„Top MD, bottom MD"**
- Realny render (admin podgląd **i** publiczny SSR): **`pt-12 pb-12` = `xl`**

Mechanizm (potwierdzony w kodzie): zapisany `layout.padding.*` to `inherit`. Renderer
(`resolveSpacingToken`) zamienia `inherit` na **domyślną wartość strony** (tu `xl` → `pt-12`),
natomiast edytorowe `sanitizeLayout` zwija `inherit → md` (bo `"inherit"` nie jest w
`spacingTokens`). W efekcie **obie powierzchnie edytora błędnie raportują efektywny padding**.
Dodatkowo (U8): dotknięcie dowolnej kontrolki layoutu zapisuje zsanityzowaną wartość `md`,
**po cichu zmniejszając** padding renderu z `xl` na `md`.

### 6.B2 NOWE — „Hidden on all devices", a blok renderuje się publicznie

Zapisana fixtura: Device visibility = pusta lista (wszystkie 3 OFF), Advenced raportuje wprost
„Shown on: **Hidden on all devices**". Mimo to blok **renderuje się** w podglądzie admin i na
publicznym SSR (`count=3`). Powód (kod `widgetRenderer.tsx`): blok jest ukrywany **tylko** gdy
ustawiono `previewDevice` i lista `devices` jest pusta lub nie zawiera tego urządzenia. Publiczny
SSR nie przekazuje `previewDevice`, więc gałąź ukrywania nigdy się nie wykonuje. Praktycznie:
**ustawienie „Hidden on all devices" nie ukrywa bloku na żywej stronie** — komunikat jest mylący.

---

## 7. Klasyfikacja: DZIAŁA / WĄTPLIWE-BROKEN / UWAGI

### 7.1 DZIAŁA (potwierdzone bez zastrzeżeń)

Wszystkie kontrolki widgetu z danymi do działania (sekcje 3–6): Block layout (31/31 opcji),
Device visibility (stan przełączników), resolver (sort/status/collection/search), warianty,
formatowanie liczb (4 locale + tryby ilości + próg), toggling wierszy, surfaces (barwa + Clear),
featured + sticky, a11y tytułu, Advanced (w tym realny Refresh), frontend SSR (a11y, konsola czysta, 375px).
**Zero twardych bugów renderera, zero błędów/ostrzeżeń konsoli.**

### 7.2 WĄTPLIWE / na granicy defektu (do decyzji produktowej)

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| B1 | **Padding: edytor „kłamie".** Visual select i Advance summary pokazują `MD`, a blok renderuje `XL` (dziedziczone). Edycja jakiejkolwiek kontrolki layoutu cicho zmniejsza padding `xl→md`. | Niespójność stanu UI vs render — realny problem korektności (nie crash) |
| B2 | **Device visibility nie ukrywa na publicznym SSR.** „Hidden on all devices" nie ma efektu na żywej stronie; ukrywanie działa wyłącznie przy aktywnym `previewDevice`. | Mylący komunikat / funkcja efektywnie nieaktywna publicznie (możliwe „by design", ale UI sugeruje inaczej) |

> Uwaga: B1 i B2 dotyczą **współdzielonych kontrolek blokowych**, nie samego kontraktu
> `product-compare`. Zgłaszam je, bo to widoczne kontrolki na tej fixturze i wpływają na to,
> co użytkownik realnie zobaczy.

---

## 8. Czego NIE dało się w pełni zweryfikować i DLACZEGO (precyzyjnie, z nazwą kontrolki)

- **Kontrolka „Device visibility" — rzeczywisty efekt ukrywania/pokazywania renderu.** Bramkowany
  przez `previewDevice` (`widgetRenderer.tsx`, gałąź `visibility.devices`). Ten edytor strony **nie
  udostępnia przełącznika podglądu urządzenia** (pasek narzędzi ma tylko motyw / powiadomienia /
  pomoc), a publiczny SSR nie przekazuje `previewDevice`. Zweryfikowano **stan** przełączników
  (sekcja 3.6), ale **nie da się tu zaobserwować realnego ukrycia bloku** — brak afordancji.
- **Zapis / publikacja (Save draft / Publish).** Świadomie pominięte — ochrona współdzielonej
  fixtury i trasy (akcja trudna do cofnięcia, niezlecona). Konsekwencja: front pokazuje wyłącznie
  wcześniej zapisany stan; wpływ wariantów/etykiet/locale/kolorów na publiczny render — nietestowalny bez zapisu.
- **Etykieta „Out of stock" (wizualnie).** W fixturze nie ma produktu `out_of_stock` (są tylko
  `in_stock` i `backorder`). Pole etykiety przyjmuje wpis, lecz nie ma komórki, która by ją pokazała.
- **„Show images" / „Link titles" / „CTA mode" (wizualnie).** Resolved rows mają `imageUrl=null`
  i `productHref=null` (brak skonfigurowanej trasy detalu produktu). Render degraduje do tekstu
  (0× `<img>`, 0× `<a>`). Konfiguracja zapisuje się w stanie, ale brak widocznego efektu.
- **Natywny dialog systemowy color-pickera.** Nieautomatyzowalny; obejście natywnym setterem Reacta
  **zadziałało** i pozwoliło zweryfikować logikę onChange/Clear (sekcja 5). To ograniczenie narzędzia, nie produktu.

---

## 9. UX / UI — nuty

- **U1 — Asynchroniczny refresh podglądu (~1 s).** Po zmianie źródła/kuracji `count` bywa o klatkę
  spóźniony (po wyczyszczeniu search chwilowo `0`, po ~1 s wraca `3`). Nie błąd, ale ważne przy szybkich testach.
- **U2 — Karty wariantu re-renderują się i zmieniają refy DOM** po wyborze. Dla człowieka bez znaczenia.
- **U3 — Podpowiedź „Scroll horizontally…" zawsze widoczna**, nawet gdy tabela się mieści
  (potwierdzone @375px: region nie przepełnia, podpowiedź wciąż jest). Nie warunkowana faktycznym overflow.
- **U4 — Dwuznaczność słowa „Limit".** Visual „Compared products" → „Limit: 12" (maks. zaznaczalnych),
  Advanced „Preview status" → „Limit: 3" (`source.limit`). To samo słowo, dwa znaczenia.
- **U5 — Featured highlight zahardkodowany na `emerald`** (`bg-emerald-…`), nie podąża za motywem powierzchni.
- **U6 — Puste pola etykiet vs wypełniony podgląd.** Pola atrybutów w UI są puste (placeholder), a podgląd
  pokazuje wartości domyślne (pusty input = fallback) — poprawne, ale wizualnie bywa mylące.
- **U7 — Brak feedbacku przy bezczynnych obrazach/CTA** (sekcja 8): edytor ostrzega tekstem, ale podgląd
  nie sygnalizuje, że opcja jest nieaktywna z powodu braku trasy detalu.
- **U8 — NOWE: dotknięcie kontrolki layoutu zwija `inherit → md`.** Zmiana np. marginesu po cichu
  zmienia też padding renderu (`xl → md`), bo `sanitizeLayout` zapisuje cały zsanityzowany obiekt.
- **U9 — NOWE: edytor nie pokazuje efektywnego (dziedziczonego) paddingu.** Visual select i Advanced
  „Block layout summary" raportują `md`, podczas gdy realny render to `xl` (sekcja 6.B1).

---

## 10. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie z asercją DOM w tym przebiegu (każda dostępna opcja klikana, nie
reprezentatywnie):** **Block layout — 31/31 opcji** (Content width 3, paddingi 14, marginesy 14)
z mapowaniem na dokładne klasy Tailwind; **Device visibility — 3/3 przełączniki**; Wizard
(search→0/→3, status draft/+published, collection Homes, sort Price ASC/DESC); Visual (3 warianty,
4 locale, tryby ilości + próg, toggle wiersza Slug, surfaces barwa + Clear, featured + None, sticky
on/off, a11y tytułu); Advanced (read-only, **Refresh = realny re-resolve**, wszystkie 6 podsumowań,
w tym block-layout i visibility summary); Frontend (SSR, a11y `th scope`/caption/region, konsola
czysta, 375px). Rodziny widgetu wyczerpane już wcześniej (clamp limitu, pełna macierz 8 sortów,
10 etykiet, 5 barw + 5 Clear, hide-caption, empty-state custom copy) — niezmienione i potwierdzone na ścieżkach krytycznych.

**Nie przetestowano (świadomie / środowiskowo) — z dokładną przyczyną w sekcji 8:** realny efekt
ukrycia przez Device visibility (brak afordancji `previewDevice`); zapis/publikacja (ochrona
fixtury); widoczna etykieta out-of-stock (brak takiego produktu); widoczny efekt obrazów/linków/CTA
(metadane null); natywny dialog OS color-pickera (obejście setterem zadziałało).

---

## 11. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Współdzielone kontrolki blokowe przeklikane do końca (Block layout) | **31/31 opcji** (3 + 14 + 14) |
| Device visibility — przełączniki zweryfikowane (stan) | 3/3 |
| Rodziny kontrolek widgetu zweryfikowane w tym przebiegu | warianty, locale, ilość, wiersze, surfaces, featured, sticky, a11y, wizard-resolver, advanced |
| Nowe obserwacje korektności | 2 (B1 padding, B2 visibility) |
| Pozycje nietestowalne (z przyczyną) | 5 (visibility-render, save, out-of-stock, obrazy/CTA, dialog OS) |
| Nuty UX | 9 (U1–U9) |
| Twarde bugi renderera | 0 |
| Błędy/ostrzeżenia konsoli (frontend) | 0 |
| Screenshoty w repo | 0 (ewentualne — wyłącznie etykiety lokalne, ignorowane przez Git) |
