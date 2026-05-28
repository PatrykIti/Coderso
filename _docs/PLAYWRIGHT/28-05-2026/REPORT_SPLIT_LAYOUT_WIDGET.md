# RAPORT: Split Layout Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-split-layout` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `c3fa7a67-99fc-42ec-a4e4-131c1dc75a58`
> **Fixture public:** `http://localhost:3000/test-split-layout-0516`
> **Pliki źródłowe:** `core/widgets/core/splitLayout.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Raport jest świadomie bogatszy niż smoke-reporty z
> 27-05-2026. Realnie klikałem w kontrolki i weryfikowałem każdą zmianę przez
> inspekcję atrybutów `data-split-*` oraz klas Tailwind na faktycznie
> wyrenderowanym elemencie w canvas, a następnie trwałość po `Save draft` + reload
> i render na publicznej trasie. Tam gdzie czegoś nie sprawdziłem, jest to jawnie
> wymienione w sekcji 7.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo.

---

## 1. Przegląd widgetu

**Typ:** `split-layout` · **Kategoria:** layout
**Opis (z definicji):** „Two-pane layout wrapper with ratio and mobile behavior controls."
**Sloty (stałe):** `left`, `right` — układ zawsze dwupanelowy (brak dodawania/usuwania paneli).
**Warianty (base preset):** `50-50`, `40-60`, `60-40`.

**Model danych (`SplitLayoutData`):**

| Pole | Wartości | Default |
|------|----------|---------|
| `ratio.desktop` | `50-50` / `40-60` / `60-40` | `50-50` |
| `ratio.tablet` | `50-50` / `40-60` / `60-40` | `50-50` |
| `ratio.mobile` | `50-50` / `40-60` / `60-40` | dziedziczy z `tablet` |
| `collapseMobile` | `stack` / `keep` | `stack` |
| `reverseOnMobile` | bool | `false` |
| `gap` | `none`/`0`/`1`/`2`/`3`/`4`/`5`/`6`/`8`/`10`/`12` | `6` |
| `verticalAlign` | `start` / `center` / `end` / `stretch` | `stretch` |

> Token `gap: "0"` jest legacy: kontrolka w Visual wystawia „No gap" zmapowane na token
> `none` (nie `0`). Wartość `0` pojawia się tylko jako read-only w Advanced z dopiskiem
> „Older saved zero-gap layouts are shown here." (logika z kodu, nie zweryfikowana na żywym
> rekordzie — patrz sekcja 7).

**Mapowanie ratio → kolumny gridu (grid-cols-12):**
`50-50` → 6/6, `40-60` → 5/7, `60-40` → 7/5. Render używa osobnych klas per breakpoint:
`col-span-*` (mobile, tylko w trybie `keep`), `md:col-span-*` (tablet), `lg:col-span-*` (desktop).

**Tryby edytora wg kontraktu (`splitLayoutEditorContract`, version 2):**
- **Wizard** — 1 sekcja „Choose a starter split"; jedyne writable pole: `variant`.
- **Visual** — 4 sekcje widgetu: „Pane layout", „Phone behavior", „Spacing and alignment", „Pane content" (ostatnia to read-only summary, `role: summary`).
- **Advanced** — 2 sekcje read-only diagnostyczne: „How this layout renders", „Saved layout summary"; zero pól edytowalnych.

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie interakcje wykonano w żywej aplikacji. Stan weryfikowany przez odczyt
atrybutów `data-split-*` i `className` na realnie wyrenderowanym węźle w canvas
(`[data-split-layout-variant]`) oraz osobno na froncie.

- Logowanie do admina + otwarcie fixture page.
- **Wizard:** wejście przez „Run setup again", zmiana „Starter layout" `50/50 → 40/60`, powrót przez „Finish setup and open Visual".
- **Visual:** Base layout card `60/40`; override „Desktop layout" `50/50` (przy wariancie `60-40`); override „Tablet layout" `40/60`; „Phone layout" `stack → keep`; „Phone split" `40/60`; switch „Show right pane first on phones" (ON); „Space between panes" `Maximum (12)` i `No gap`; „Content height alignment" `Middle`.
- **Persistencja:** „Save draft" → pełny reload strony → ponowny odczyt wszystkich 8 pól.
- **Advanced:** odczyt obu sekcji diagnostycznych + programowe policzenie kontrolek edytowalnych w panelu.
- **Front:** `/test-split-layout-0516`, inspekcja DOM, klasy responsywne per breakpoint, geometria paneli, overflow @1280 i @375, konsola.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Stan domyślny (baseline)
Świeży widget renderuje dokładnie defaulty:
`variant=50-50`, wszystkie ratio `50-50`, `collapse=stack`, `reverse=false`, `gap=6`,
`align=stretch`, klasa: `grid w-full min-w-0 grid-cols-1 md:grid-cols-12 gap-6 items-stretch`. ✅

### 3.2 Tryb Wizard
- Wejście przyciskiem **„Run setup again"** (w stanie domyślnym widoczny baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.").
- Jedna sekcja **„Choose a starter split"** z polem **„Starter layout"** (Radix Select) oraz dwoma blokami-podpowiedziami („After choosing the starter layout, use Visual…", „Add widgets to the left and right panes from Structure…").
- Zmiana `50/50 → 40/60` **natychmiast** ustawia `variant=40-60` ORAZ synchronizuje wszystkie trzy ratio (`desktop/tablet/mobile = 40-60`) — zgodnie z `buildVariantSyncedSplitLayoutData`. ✅
- **„Finish setup and open Visual"** przełącza do trybu Visual i zachowuje wariant (karta `40/60` oznaczona jako „Base preset"). ✅
- **Werdykt:** Wizard działa zgodnie z kontraktem — to wyłącznie jednorazowy starter dla `variant`; codzienna edycja należy do Visual.

_Zrzut (lokalny): brak osobnego — stan Wizarda potwierdzony w snapshotach DOM._

### 3.3 Tryb Visual — wszystkie testowane kontrolki działają i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w canvas | Wynik |
|---|---|---|---|
| Base layout (karty 50/50, 40/60, 60/40) | Klik „60 / 40" | `variant=60-40` + wszystkie ratio zresetowane do `60-40` | ✅ |
| Desktop layout (Select) | `50/50` przy wariancie `60-40` | `data-split-ratio-desktop=50-50`, **wariant bez zmian** (`60-40`); lewy panel `lg:col-span-6`, prawy `lg:col-span-6` | ✅ (override niezależny) |
| Tablet layout (Select) | `40/60` | `data-split-ratio-tablet=40-60`; lewy `md:col-span-5`, prawy `md:col-span-7` | ✅ |
| „Current layout on devices" (disclosure) | po overridzie | badge `Custom device layout`, tekst „Desktop 50 / 50, tablet 60 / 40, mobile 60 / 40." live-update, `data-split-ratio-override=true` | ✅ |
| Phone layout (Select) | `Stack → Keep` | klasa kontenera `grid-cols-1 → grid-cols-12`; **odsłania** kontrolkę „Phone split" (`data-split-mobile-ratio-control=visible`), chowa notkę stack | ✅ (warunkowe UI) |
| Phone split (Select, tylko w `keep`) | `40/60` | `data-split-ratio-mobile=40-60`; lewy `col-span-5` (mobile) | ✅ |
| Show right pane first on phones (Switch) | ON | `data-split-reverse-mobile=true`; lewy `order-2 md:order-1`, prawy `order-1 md:order-2` | ✅ |
| Space between panes (Select) | `Maximum` | `data-split-gap=12`, klasa `gap-12` | ✅ |
| Space between panes (Select) | `No gap` | `data-split-gap=none`, klasa `gap-0` | ✅ |
| Content height alignment (Select) | `Middle` | `data-split-vertical-align=center`, klasa `items-center` | ✅ |

- Klasy `col-span` są **niezależne per breakpoint** i poprawnie odzwierciedlają ratio każdego urządzenia (np. po overridach: lewy `col-span-1 md:col-span-7 lg:col-span-6`). ✅
- Wszystkie zmiany odzwierciedlają się w canvas natychmiast (bez zapisu).

_Zrzut (lokalny): `split-admin-visual-28-05.png`_

### 3.4 Persistencja (Save draft → reload)
Po „Save draft" i pełnym przeładowaniu strony **wszystkie 8 pól** wróciło z bazy bez zmian:
`variant=60-40`, `desktop=50-50`, `tablet=40-60`, `mobile=40-60`, `collapse=keep`,
`reverse=true`, `gap=none`, `verticalAlign=center` (klasa `grid-cols-12 md:grid-cols-12 gap-0 items-center`). ✅

### 3.5 Tryb Advanced — read-only, wiernie odzwierciedla stan
- **Zero kontrolek edytowalnych** w panelu Advanced (programowo: 0 inputów, 0 buttonów, 0 comboboxów, 0 switchy; ~891 znaków treści read-only). ✅
- Sekcja **„How this layout renders"** (6 wierszy) dla zapisanego stanu:
  - Starter layout → „60 / 40 starter layout has device-specific changes."
  - Desktop → „50 / 50: left and right panes share the row evenly."
  - Tablet → „40 / 60: the right pane is wider than the left pane."
  - Phone → „40 / 60 split on phones with right pane first."
  - Space between panes → „No gap. No space between the left and right panes."
  - Content height alignment → „Middle"
- Sekcja **„Saved layout summary"** (2 wiersze):
  - Device layouts → „Desktop 50 / 50, tablet 40 / 60, phone 40 / 60."
  - Phone order → „Right pane is shown first on phones."
- Wszystkie podsumowania **zgadzały się** ze stanem ustawionym w Visual. ✅

_Zrzut (lokalny): brak osobnego — treść Advanced potwierdzona w snapshocie `sl-advanced.yml`._

### 3.6 Front (`/test-split-layout-0516`)
- HTTP `200`, tytuł `TEST-SPLIT-LAYOUT-0516`, **0 błędów i 0 ostrzeżeń** w konsoli.
- Renderuje **1** widget split-layout, oba panele mają **realną treść** (`data-split-items-left=1`, `...-right=1`): lewy „Fixture · Split left pane · …", prawy „Fixture · Split right pane · …".
- **0 placeholderów pustego panelu** na froncie; tekst „… pane is empty" nieobecny — zgodnie z `renderEditorPlaceholder` (placeholder tylko w admin preview, `null` w public runtime). ✅
- Klasy responsywne poprawne dla opublikowanego stanu (`variant=60-40, desktop=60-40, tablet=50-50, mobile=50-50, collapse=keep, reverse=true, gap=6, align=center`):
  - lewy `col-span-6 md:col-span-6 lg:col-span-7 order-2 md:order-1`,
  - prawy `col-span-6 md:col-span-6 lg:col-span-5 order-1 md:order-2`. ✅
- **Brak poziomego overflow**: @1280 `scrollWidth==clientWidth==1280` (computed grid: 12 równych kolumn), @375 `scrollWidth==clientWidth==375`. ✅
- @375 w trybie `keep` oba panele stoją obok siebie (~176px każdy, ten sam `top`) — czyli dwie kolumny utrzymane na telefonie. ✅

_Zrzuty (lokalne): `split-public-desktop-1280-28-05.png`, `split-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / problemy

- **Nie znaleziono błędów funkcjonalnych** w przetestowanym zakresie. Każda kliknięta kontrolka w Visual realnie zmieniała render i przetrwała zapis; Wizard i Advanced zachowują się dokładnie tak, jak deklaruje kontrakt (odpowiednio: jednorazowy starter `variant` oraz tylko-do-odczytu).
- Renderer poprawnie i niezależnie składa klasy `col-span`/`order`/`gap`/`items-*` per breakpoint — nie wykryto rozbieżności admin ↔ front (poza celową różnicą placeholderów, sekcja 6).

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu z sekcji 2.
> Obszary z sekcji 7 nie były klikane i nie mogę ich potwierdzić ani zaprzeczyć na
> podstawie tej sesji.

---

## 5. Uwagi UX/UI (niuanse, nie błędy)

1. **Wizard jest faktycznie jednym polem.** Poza Selectem „Starter layout" i przyciskiem przejścia do Visual nie ma tu nic do skonfigurowania. To celowe („Use this once to seed the pane layout"), ale użytkownik wchodzący w „setup" znajdzie pojedynczy wybór.
2. **Sprzeczny komunikat disclosure po Wizardzie.** Gdy Wizard zasieje wariant, `ratio.mobile` staje się jawnie zapisane (`hasExplicitMobile=true`), więc tekst pokazuje „Phone layout has its own saved split.", podczas gdy badge obok mówi „Matches starter layout", a wszystkie ratio są równe. Lekko mylące — sugeruje istnienie osobnego splitu telefonu, którego efektywnie nie ma.
3. **Karta Base layout resetuje overrides urządzeń.** Klik w kartę (`buildVariantSyncedSplitLayoutData`) nadpisuje `desktop/tablet/mobile` wartością wariantu. Wcześniejsze per-device overrides przepadają bez ostrzeżenia/potwierdzenia przed kliknięciem.
4. **`variant` i `ratio.desktop` są rozdzielone.** Standalone Selecty „Desktop/Tablet/Phone" celowo nie ruszają `variant` (`editorCapabilities.visualOwnsVariantSelection`). Efekt: karta „Base preset" może wskazywać `60/40`, gdy desktop to faktycznie `50/50`. Podświetlenie „Base preset" idzie za wariantem, nie za realnym ratio desktopu — wymaga od użytkownika zrozumienia, że to dwa różne pojęcia.
5. **„Keep two columns on phones" bywa ciasne.** Na 375px panele schodzą do ~176px. Edytor o tym uczciwie ostrzega copy („This can feel tight on small screens"), więc to świadomy tradeoff, nie defekt.
6. **Token `gap: "0"` to legacy.** UI nie pozwala go ustawić (kontrolka oferuje „No gap" → `none`); `0` ma jedynie read-only ścieżkę w Advanced z notką o starych zapisach. Spójne z intencją, ale to ukryta druga reprezentacja zera.
7. **Radix Select wymaga interakcji myszą.** Comboboxy (Desktop/Tablet/Phone/gap/align) to Radix — natywna komenda `select` na nich nie działa, trzeba klikać trigger + opcję. To niuans harnessu testowego, **nie** błąd widgetu.
8. **Sekcje block-level w panelu.** Pod edytorem widgetu są jeszcze „Structure", „Block layout" i „Device visibility" — należą do page-buildera/bloku, nie do edytora split-layout. Odnotowuję jako kontekst; nie weryfikowałem ich wpływu na froncie.

---

## 6. Admin UI vs Front — porównanie zachowania

| Funkcjonalność | Admin Preview | Front | Zgodność |
|---|---|---|---|
| Render wariantu/ratio (klasy col-span) | ✅ poprawne per breakpoint | ✅ identyczna logika | ✅ |
| `collapse=keep` → grid-cols-12 na mobile | ✅ | ✅ | ✅ |
| `reverse` → order-2/order-1 | ✅ | ✅ | ✅ |
| `gap` / `verticalAlign` | ✅ | ✅ | ✅ |
| Placeholder pustego panelu | ✅ 2 (`data-split-empty-pane`) | ✗ 0 (treść realna) | ✅ celowa różnica (admin-only) |
| Liczba zagnieżdżonych widgetów | fixture: 0/0 | published: 1/1 | n/d (różne stany) |

**Wniosek:** Renderer zachowuje się spójnie między admin a frontem. Jedyna różnica
(placeholdery pustych paneli widoczne tylko w adminie) jest celowa i wynika z
`renderEditorPlaceholder`.

---

## 7. Czego NIE testowałem (świadome luki tej sesji)

- **Dodawanie/usuwanie/reorder realnych widgetów-dzieci** do paneli z poziomu Structure/canvas — w adminie panele były puste (sprawdziłem tylko placeholdery), na froncie były wstępnie wypełnione fixturą.
- **Publikacja (Publish).** Wykonałem tylko „Save draft", więc moje konkretne edycje **nie** trafiły na publiczną trasę. Front zweryfikowałem względem **wcześniej opublikowanego** stanu fixture (który różni się od mojego draftu: published `desktop=60-40, tablet=50-50, mobile=50-50, gap=6` vs mój draft `desktop=50-50, tablet=40-60, mobile=40-60, gap=none`). To potwierdza, że draft nie publikuje — ale nie jest to round-trip moich wartości do public runtime.
- **Legacy `gap: "0"`** — brak UI do ustawienia; ścieżka read-only w Advanced nie była wywołana na realnym rekordzie z `0`.
- **`verticalAlign = Top/Bottom/Equal height`** pojedynczo — przetestowałem `stretch` (default) i `Middle (center)`; mapy `items-start`/`items-end`/`items-stretch` są trywialne, ale nie klikałem każdej.
- **Wszystkie kombinacje ratio na standalone Selectach** — pokryłem kartę `60/40` oraz overrides `50/50` i `40/60`; symetryczne pozostałe kombinacje nie były klikane indywidualnie.
- **Realny breakpoint tablet (~768px) wizualnie** — klasy `md:` zweryfikowane statycznie w DOM; geometrię sprawdziłem przy `lg` (1280) i bazowym (375), nie przy jawnej szerokości tabletu.
- **„Device visibility" / „Block layout"** (kontrolki page-buildera, nie edytora widgetu) — nie wykonywane.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Jednorazowy starter `variant` + przejście do Visual | ✅ Działa zgodnie z projektem; zmiana wariantu synchronizuje wszystkie ratio |
| **Visual** | Główny edytor (Pane layout, Phone behavior, Spacing/alignment, Pane content) | ✅ Wszystkie testowane kontrolki działają, aktualizują podgląd i są trwałe po zapisie; warunkowe odsłanianie „Phone split" działa |
| **Advanced** | 2 sekcje diagnostyczne read-only | ✅ Zero kontrolek edytowalnych; podsumowania wiernie odzwierciedlają stan |
| **Front** | `/test-split-layout-0516` (treść opublikowana) | ✅ HTTP 200, 0 błędów konsoli, klasy responsywne poprawne, brak overflow (1280/375), placeholdery tylko w adminie |

**Werdykt końcowy:** W przetestowanym zakresie widget `split-layout` jest sprawny i
spójny między edytorem a rendererem. Nie wykryto błędów funkcjonalnych. Wizard i
Advanced realizują zadeklarowany kontrakt (starter-only / read-only), a Visual
poprawnie obsługuje pełną konfigurację responsywną z trwałym zapisem do draftu.
Uwagi z sekcji 5 to niuanse UX (najistotniejsze: sprzeczny komunikat disclosure po
Wizardzie oraz rozdzielenie `variant` ↔ `ratio.desktop`), nie defekty. Obszary
niezweryfikowane wymieniono jawnie w sekcji 7.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `split-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem) |
| `split-public-desktop-1280-28-05.png` | Front `/test-split-layout-0516`, 1280px (brak overflow) |
| `split-public-mobile-375-28-05.png` | Front `/test-split-layout-0516`, 375px, tryb `keep` (dwie kolumny ~176px) |
