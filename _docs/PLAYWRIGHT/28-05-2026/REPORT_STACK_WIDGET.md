# RAPORT: Stack Widget — audyt wyczerpujący (Wizard / Visual / Advanced + front + CSS probe)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (raport w katalogu 28-05-2026 — plik docelowy zgodnie z zadaniem)
> **Sesja przeglądarki:** `claude-29-05-stack-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `7b23083d-f7cd-481e-8417-fc2278e54466` (kontraktowy fixture „stack", stack **pusty** — 0 dzieci)
> **Trasa public:** `http://localhost:3000/test-stack-0516` (**inna** strona, opublikowana, stack **zapełniony** — 2 dzieci)
> **Pliki źródłowe:** `core/widgets/core/stack.tsx` (renderer + model + normalizacja + mapy klas Tailwind), `core/admin/ui/widgets/editors/StackEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Czym ten audyt różni się od poprzedniego (28-05).** Poprzednia wersja klikała
> „reprezentatywny zestaw" opcji (gap 8, align center, justify evenly, wrap ON, kilka
> kierunków) i resztę potwierdzała tylko jako „obecne na liście". Ten audyt jest świadomie
> **wyczerpujący**: przeszedłem **każdą dyskretną opcję każdej kontrolki Visual co najmniej
> raz** (3 karty wariantu, 6 opcji kierunku, 30 opcji odstępu, 15 opcji wyrównania, 18 opcji
> dystrybucji, 6 przełączeń wrap = **78 odrębnych interakcji**) i po każdej z nich
> programowo odczytywałem atrybut `data-stack-*` na żywym węźle canvas. Dodatkowo
> uruchomiłem **pełny probe CSS na 46 klasach** — i to **na obu buildach** (admin Vite oraz
> produkcyjny public), aby precyzyjnie zmapować, które responsywne klasy realnie istnieją w
> serwowanym arkuszu i gdzie admin rozjeżdża się z frontem.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej (`stack-admin-visual-29-05.png`,
> `stack-public-desktop-1280-29-05.png`, `stack-public-mobile-375-29-05.png`) to **wyłącznie
> lokalne etykiety** przechwyceń Playwright. Same pliki nie są wymaganym evidence i nie są
> commitowane do repo (są ignorowane przez Git).

---

## 1. Przegląd widgetu

**Typ:** `stack` · **Kategoria:** layout
**Opis (z definicji):** „Flow layout wrapper with responsive direction, spacing, and axis control." — responsywny wrapper flex z kontrolą kierunku, odstępów i osi.
**Sloty:** jeden **stały** slot `content` na widgety potomne (brak slotów repeatable).
**Warianty:** `vertical` (kolumna na każdym ekranie), `horizontal` (rząd na każdym ekranie), `responsive` (kolumna na mobile, rząd na tablet/desktop).

**Model danych (`StackData`) — wszystko per-breakpoint (desktop/tablet/mobile):**

| Pole | Wartości | Liczba opcji w UI |
|------|----------|-------------------|
| `direction` | `column` / `row` | 2 |
| `gap` | tokeny `none,0,1,2,3,4,5,6,8,10,12` (11) | **10** widocznych (`0` ukryte jako duplikat `none`) |
| `align` | `start/center/end/stretch/baseline` | 5 |
| `justify` | `start/center/end/between/around/evenly` | 6 |
| `wrap` | boolean | 2 (switch) |

**Wartości domyślne (`stackDefaults`):** direction `column/column/column`, gap `6/6/4` (desktop/tablet/mobile), align `stretch`, justify `start`, wrap `false`.

**Renderer (`StackBlock`):** zwraca jeden `<div class="flex w-full min-w-0 …">` z kompletem
atrybutów `data-stack-*` (variant + per-breakpoint direction/gap/align/justify/wrap +
`data-stack-items`). Klasy responsywne budowane są **dynamicznie** przez konkatenację prefiksu
i nazwy klasy (`prefixClassMap(map, "md:")` → `"md:flex-row"`, `"md:gap-6"` itd.). Kolejność
klas w className: baza (mobile) → `md:` (tablet) → `lg:` (desktop). Pusty slot → placeholder „Empty stack.".

**Tryby edytora wg kontraktu (`stackEditorContract`):**
- **Wizard** — 1 sekcja „Stack quick start", `role: setup`, `writablePaths: []` (read-only).
- **Visual** — 4 sekcje: „Variant and flow", „Responsive direction", „Responsive alignment and wrap", „Slot guidance".
- **Advanced** — 2 sekcje read-only: „Runtime summary" (w kontrakcie) renderowane jako „Runtime stack summary", oraz „Support summary".

---

## 2. CO BYŁO TESTOWANE (zakres realnych interakcji)

Wszystkie interakcje wykonano w żywej aplikacji. Selecty Radix obsłużyłem programowo
(`page.locator('[role=combobox]').nth(i).click()` → klik opcji po dokładnej etykiecie), a stan
po każdej zmianie odczytywałem przez `getAttribute('data-stack-*')` na realnie wyrenderowanym
węźle canvas (`[data-stack-variant]`).

### 2.1 Wizard
- Wejście przyciskiem **„Run setup again"**, odczyt całej zawartości read-only, programowe
  policzenie kontrolek edytowalnych w sekcji „Stack quick start", powrót przez **„Finish setup
  and open Visual"**.

### 2.2 Visual — pełny przegląd (78 interakcji, każda zweryfikowana atrybutem)
- **Warianty (3/3):** kliknięte kolejno Horizontal → Responsive → Vertical; po każdym odczyt
  pełnego stanu (kierunek + gap + align + justify + wrap) oraz badge „Selected"/„Pick".
- **Kierunek (6/6):** każdy z 3 selectów (Desktop/Tablet/Mobile flow) ustawiony na obie opcje
  („Stack vertically" → column, „Place side by side" → row).
- **Odstęp (30/30):** każdy z 3 selectów (Desktop/Tablet/Mobile spacing) przeszedł przez
  wszystkie 10 widocznych tokenów (`none,1,2,3,4,5,6,8,10,12`).
- **Wyrównanie (15/15):** każdy z 3 selectów (item alignment) przeszedł przez wszystkie 5
  opcji (`start,center,end,stretch,baseline`).
- **Dystrybucja (18/18):** każdy z 3 selectów (distribution) przeszedł przez wszystkie 6 opcji
  (`start,center,end,between,around,evenly`).
- **Wrap (6/6):** każdy z 3 switchy przełączony ON i OFF; weryfikacja atrybutu oraz tekstu
  etykiety („Items can wrap." / „Items stay on one line.").

### 2.3 Advanced
- Odczyt obu sekcji diagnostycznych przy konkretnym, nietrywialnym stanie danych; programowe
  policzenie kontrolek edytowalnych w regionach „Runtime stack summary" i „Support summary".

### 2.4 Persistencja
- „Save draft" → przechwycenie toasta → **czysty reload** (bez modala beforeunload) →
  ponowny odczyt stanu z bazy.

### 2.5 Front (`/test-stack-0516`)
- Inspekcja DOM stacka i dzieci, pomiar `flex-direction`/`columnGap`/`rowGap`/`flex-wrap`/
  `align-items`/`justify-content` oraz overflow przy **375 / 800 / 1280 px**, odczyt konsoli.

### 2.6 Probe CSS (admin **i** public)
- Injekcja 46 elementów z konkretnymi klasami (`gap-*`, `md:/lg:gap-*`, `flex-col/row`,
  `md:/lg:flex-*`, `items-*`, `md:/lg:items-*`, `justify-*`, `md:/lg:justify-*`, `flex-wrap/nowrap`,
  `md:/lg:flex-wrap/nowrap`) przy viewport 1280 px (gdzie media-query `md` i `lg` są aktywne
  jednocześnie) i odczyt `getComputedStyle` — na **obu** buildach.

---

## 3. CO DZIAŁA (potwierdzone w praktyce)

### 3.1 Wizard — read-only, zgodny z kontraktem
- Baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.".
- Sekcja **„Stack quick start"** = wyłącznie tekst statyczny: opis („Wizard is one-time starter
  setup…"), nota „Visual owns stack preset choice, breakpoint flow directions, spacing,
  alignment, distribution, and wrapping after setup." oraz karta slot-guidance „Add child
  widgets to the `content` slot from the insert dialog.".
- **Zero kontrolek edytowalnych** w sekcji — potwierdzone programowo (`controls_in_quickstart=0`),
  zgodne z `writablePaths: []`.
- **„Finish setup and open Visual"** poprawnie przełącza do Visual; obok działa panel **„Live preview"**.

### 3.2 Visual — WSZYSTKIE 78 opcji działają w warstwie DANYCH

Każda opcja ustawia poprawny atrybut na węźle canvas (oczekiwany token == odczytany token):

| Rodzina kontrolki | Zakres | Wynik |
|---|---|---|
| Karty wariantu | 3/3 (Horizontal, Responsive, Vertical) | ✅ 3/3 |
| Kierunek (flow) | 3 selecty × {column, row} | ✅ 6/6 |
| Odstęp (spacing) | 3 selecty × {none,1,2,3,4,5,6,8,10,12} | ✅ 30/30 |
| Wyrównanie (align) | 3 selecty × {start,center,end,stretch,baseline} | ✅ 15/15 |
| Dystrybucja (justify) | 3 selecty × {start,center,end,between,around,evenly} | ✅ 18/18 |
| Wrap (switch) | 3 switche × {ON, OFF} | ✅ 6/6 |

- Podgląd w canvas aktualizuje się **natychmiast** po każdej zmianie (atrybuty `data-stack-*`
  i className zmieniają się od razu).
- className budowany jest poprawnie, np. po ustawieniu skrajnych wartości:
  `flex w-full min-w-0 flex-row md:flex-row lg:flex-row gap-12 md:gap-12 lg:gap-12
  items-baseline md:items-baseline lg:items-baseline justify-evenly md:justify-evenly
  lg:justify-evenly flex-nowrap md:flex-nowrap lg:flex-wrap` — czyli mapy klas + prefiksy
  konkatenują się dokładnie tak, jak w kodzie.
- Switch wrap aktualizuje też tekst pomocniczy w obie strony („Items can wrap." ↔ „Items stay
  on one line.").

> ⚠️ „Działa" w tej sekcji oznacza: kontrolka poprawnie zapisuje stan i aktualizuje
> atrybuty/klasy. Czy dana klasa responsywna ma **realny efekt wizualny** na tablet/desktop —
> patrz sekcja 4 (duża część klas `md:`/`lg:` nie istnieje w serwowanym CSS).

### 3.3 Wariant jako „seed" — zachowanie potwierdzone 3×
Kliknięcie karty wariantu **nadpisuje wyłącznie `direction`** i **zachowuje** `gap/align/justify/wrap`.
Stan przed testem: `gap 12/12/12`, `align baseline×3`, `justify evenly×3`, `wrap true/false/false`.
- Horizontal → dir `row/row/row`, pozostałe nietknięte, badge „Horizontal: Selected". ✅
- Responsive → dir `row/row/column`, pozostałe nietknięte, badge „Responsive: Selected". ✅
- Vertical → dir `column/column/column`, pozostałe nietknięte, badge „Vertical: Selected". ✅

### 3.4 Persistencja (Save draft → reload)
Ustawiłem rozpoznawalny „fingerprint": `vertical`, dir `column/column/column`, gap `12/12/12`,
align `baseline×3`, justify `evenly×3`, wrap `true/false/false`. Po **„Save draft"** pojawił się
toast **„Draft saved."**. **Czysty reload** (bez monitu beforeunload — czyli strona nie była
„brudna", co samo w sobie dowodzi zapisu) zwrócił stan **identyczny** z bazy. ✅
Na koniec audytu przywróciłem fixture do wartości domyślnych (`vertical`, gap `6/6/4`, align
`stretch`, justify `start`, wrap `false`) i ponownie zapisałem draft, żeby zostawić go w czystym stanie.

_Zrzut (lokalny): `stack-admin-visual-29-05.png`_

### 3.5 Advanced — read-only, wiernie odzwierciedla DANE
- **Zero kontrolek edytowalnych** w obu regionach (`editable_controls_in_advanced_stack_regions=0`).
- **„Runtime stack summary"** przy stanie fingerprint pokazał dokładnie:
  - Desktop: „Stack vertically, Extra spacious spacing, Align text across items, Spread evenly, wraps to a new line when needed"
  - Tablet: „…, Extra spacious spacing, Align text across items, Spread evenly, stays on one line"
  - Mobile: „…, Extra spacious spacing, Align text across items, Spread evenly, stays on one line"
  (zgodne z gap=12, align=baseline, justify=evenly, wrap desktop=true).
- **„Support summary":** „Saved compatibility: Saved responsive values normalize for desktop,
  tablet, and mobile." oraz „Editing owner: Use Visual to adjust flow, spacing, alignment,
  distribution, and wrapping. Advanced is read-only.".

### 3.6 Front (`/test-stack-0516`)
- HTTP `200`, tytuł „TEST-STACK-0516", **0 błędów / 0 ostrzeżeń** w konsoli.
- Renderuje **1** stack, `data-stack-items="2"`, wariant `responsive`, dir `row/row/column`,
  gap `6/6/4`, align `stretch×3`, justify `start×3`, wrap `true×3`.
- Dwoje dzieci: „FixtureStack child A — Nested stack content proves row-flow rendering without
  forcing horizontal page overflow." oraz „FixtureStack child B — Second bounded child keeps the
  fixture realistic for responsive wrapping.".
- **Responsywny kierunek działa** (pomiar `flex-direction`): 375 px → `column` · 800 px → `row` · 1280 px → `row`.
- **Brak poziomego overflow** przy 375 / 800 / 1280 px (`scrollWidth == clientWidth` na każdym).
- **Wrap działa** (na żywym stacku `flex-wrap` na każdej szerokości — bo bazowe `flex-wrap` jest ustawione).

_Zrzuty (lokalne): `stack-public-desktop-1280-29-05.png`, `stack-public-mobile-375-29-05.png`_

---

## 4. CO NIE DZIAŁA / defekty (potwierdzone empirycznie probe CSS na obu buildach)

Wspólna przyczyna: **antywzorzec dynamicznego budowania klas Tailwind** (`${prefix}${className}`).
Skaner contentu Tailwind nie widzi literałów składanych w runtime, więc generuje wyłącznie te
warianty `md:`/`lg:`, które **przypadkiem** występują jako pełne literały gdzie indziej w kodzie.
Probe `getComputedStyle` przy 1280 px (gdzie `md` i `lg` są aktywne jednocześnie):

### B1 (KRYTYCZNY) — Odstęp (gap) na tablet/desktop nie renderuje się

| Klasa | Admin :5173 | Public :3000 |
|---|---|---|
| `gap-4/6/8/10/12` (bazowe) | ✅ 16/24/32/40/48px | ✅ 16/24/32/40/48px |
| `md:gap-6` (**domyślny tablet!**) | ❌ `normal` | ❌ `normal` |
| `md:gap-8` | ✅ 32px | ❌ `normal` |
| `lg:gap-6` (**domyślny desktop!**) | ❌ `normal` | ❌ `normal` |
| `lg:gap-8` / `lg:gap-10` / `lg:gap-12` | ❌ `normal` | ❌ `normal` |

**Skutek:** wszystkie `lg:gap-*` nie istnieją w żadnym buildzie, a `md:gap-6` (czyli **wartość
domyślna tabletu**) też nie. Stack zawsze używa **bazowego (mobilnego)** gapa na każdym
breakpoincie. Dowód na żywym elemencie: stack na froncie ma `gap-desktop=6` / `gap-tablet=6`
(oczekiwane 24px), a zmierzony `columnGap/rowGap` = **`16px` przy 375, 800 i 1280 px** (czyli
bazowe `gap-4`=mobile). **Dotyczy to także konfiguracji out-of-the-box** — desktop/tablet
powinny mieć 24px, mają 16px.

### B2 (WAŻNY) — Kierunek / wyrównanie / dystrybucja / wrap częściowo nie działają na tablet/desktop

| Rodzina | Działa na tablet/desktop (poza wartością bazową/domyślną) | NIE działa (klasa nieobecna) |
|---|---|---|
| **Kierunek** | `row` (`md:flex-row`, `lg:flex-row` ✅ w obu) | `column` na tablet (`md:flex-col` ❌ w obu); `column` na desktop (`lg:flex-col` ❌ na public) |
| **Align** | `center` (`md:items-center`, `lg:items-center` ✅) | `end`, `baseline` na tablet/desktop (`md:items-end` tylko admin; `lg:items-end`, `md:/lg:items-baseline` ❌) |
| **Justify** | `between` (`md:justify-between`, `lg:justify-between` ✅) | `center`, `evenly`, `around` na tablet/desktop (`md:/lg:justify-{center,evenly,around}` ❌ w obu) |
| **Wrap** | `wrap` na tablet (`md:flex-wrap` ✅); `nowrap` (`md:/lg:flex-nowrap` ✅) | `wrap` tylko-na-desktop (`lg:flex-wrap` ❌ w obu) |

Wnioski praktyczne dla autora strony:
- **Wariant `responsive` renderuje się poprawnie** (mobile `flex-col` baza + `md:flex-row` + `lg:flex-row` — wszystkie istnieją).
- Ustawienie kierunku `column` tylko na tablet/desktop **nie zadziała** na froncie.
- Z wyrównania na tablet/desktop pewne są jedynie `stretch` (domyślne) i `center`.
- Z dystrybucji na tablet/desktop pewne są jedynie `start` (domyślne) i `between`.
- Włączenie wrap **tylko na desktop** nie zadziała (`lg:flex-wrap` brak); wrap na froncie działa
  tylko dlatego, że fixture ma `wrap=true` na wszystkich breakpointach (działa bazowe `flex-wrap`).

### B3 (WAŻNY) — Rozjazd Admin ↔ Front dla identycznych danych

Probe na obu buildach wykazał **3 konkretne klasy obecne w adminie, a nieobecne na froncie**:

| Klasa | Admin :5173 (Vite) | Public :3000 (prod) | Konsekwencja |
|---|---|---|---|
| `md:gap-8` | ✅ 32px | ❌ `normal` | gap „Roomy" na tablecie wygląda w podglądzie, nie na froncie |
| `lg:flex-col` | ✅ column | ❌ row | kolumna na desktop wygląda w podglądzie, na froncie zostaje rzędem |
| `md:items-end` | ✅ flex-end | ❌ `normal` | „Align to end" na tablecie wygląda w podglądzie, nie na froncie |

**Skutek:** podgląd admina bywa **myląco optymistyczny** — pokazuje układy, których
produkcja nie odtworzy. (Gap `lg:gap-*` i `md:gap-6` są zepsute w **obu** buildach jednakowo.)

> Naprawą B1–B3 byłoby użycie **statycznych, pełnych literałów klas** w mapach (per breakpoint)
> albo **safelista** tych klas w konfiguracji Tailwind.

---

## 5. CZEGO NIE DAŁO SIĘ PRZETESTOWAĆ (jawne luki + przyczyny)

1. **Dodawanie / usuwanie / reorder dzieci slotu `content`** — **niemożliwe do pełnej
   weryfikacji w tym fixture**. Stack ma **jeden stały slot** `content` (brak slotów
   repeatable), a fixture admina jest **pusty (0 dzieci)**. Sekcja „Structure" pod edytorem
   pokazuje „Content slot · 0 items" z przyciskami **„Move up"/„Move down" wyszarzonymi
   (disabled)** — to kontrolki **page-buildera**, nie edytora Stack, i przy jednym pustym
   slocie nie ma czego przenosić. Bez wstawienia widgetów (poza zakresem audytu kontrolek
   widgetu) nie da się tego wykonać. Placeholder „Empty stack." potwierdzony.
2. **Przyciski „color clear / transparent"** — **nie istnieją** w widgecie Stack. Stack nie
   ma żadnych kontrolek koloru (to widget layoutu), więc ta rodzina kontrolek jest tu
   nieobecna z założenia.
3. **Publish / round-trip moich edycji na front** — **strukturalnie niemożliwe**: fixture
   admina (`7b23083d…`, pusty) i trasa public (`/test-stack-0516`, 2 dzieci) to **dwie różne
   strony**. Moje edycje w adminie nie mają jak pojawić się na tej trasie public niezależnie od
   publikacji. Wykonałem tylko „Save draft"; front zweryfikowałem pod kątem poprawności
   renderu opublikowanego stacka, nie round-tripu moich edycji.
4. **Ścieżka „legacy scalar axis"** (`align`/`justify` jako skalar, `wrap` jako boolean zamiast
   obiektu) — Advanced ma dla niej osobny komunikat, ale **UI zawsze zapisuje formę obiektową
   per-breakpoint**, więc nie da się jej wywołać z edytora; znana tylko z kodu.
5. **Probe CSS — pokrycie tokenów.** Sprawdziłem realnie istnienie klas dla: gap (5 bazowych +
   6 prefiksowanych), kierunek (komplet), align `center/end/baseline` (+ bazowe; `start` i
   `stretch` nie probe'owane osobno — `stretch` to domyślna wartość flex, więc działa zawsze),
   justify `center/between/evenly/around` (+ bazowe; `start` to domyślna, `end` prefiksowane
   nie probe'owane), wrap (komplet). Tokeny pominięte w probe (`md:/lg:items-start`,
   `md:/lg:justify-end`) najpewniej również brakują (ten sam mechanizm), ale tego **nie
   potwierdziłem empirycznie** — odnotowuję uczciwie.

---

## 6. NIUANSE UX/UI (nie defekty per se)

1. **Wybór wariantu po cichu nadpisuje ręczne kierunki.** Kliknięcie karty resetuje
   `direction` wszystkich breakpointów do domyślnych wariantu (gap/align/justify/wrap zostają).
   Brak ostrzeżenia/undo — autor, który dopracował kierunki per breakpoint, może je niechcący
   utracić jednym kliknięciem presetu.
2. **Badge „Selected" nie odzwierciedla ręcznych zmian kierunku.** Po ręcznej zmianie kierunku
   karta nadal pokazuje poprzednio wybrany wariant jako „Selected", choć dane już nie
   odpowiadają presetowi (wariant to tylko „seed"). Potencjalnie mylące.
3. **Wizard nie pokazuje bieżącej konfiguracji** — to wyłącznie tekst statyczny, bez
   podsumowania aktualnego wariantu/kierunków. „Live preview" obok kompensuje to częściowo.
4. **Niespójność tytułu Advanced: kontrakt vs UI.** `stackEditorContract` deklaruje sekcję
   „Runtime summary", a render pokazuje „Runtime stack summary". Kosmetyczny rozjazd metadanych.
5. **Advanced opisuje DANE, nie realny render.** „Runtime stack summary" raportuje np.
   „Extra spacious spacing" dla desktopu, mimo że wizualnie desktop i tak dostaje gap mobilny
   (B1). Podsumowanie jest więc „optymistyczne" — sugeruje efekt, którego front nie pokazuje.
6. **Token `0` ukryty w selekcie odstępu** (`gapOptions` filtruje `0` jako duplikat `none`) →
   w UI 10 z 11 tokenów; celowa deduplikacja.
7. **Switch wrap ma czytelny, dwustanowy opis** („Items stay on one line." / „Items can wrap.")
   + tekst pomocniczy — dobre UX (szkoda, że `lg:flex-wrap` bywa nierenderowane — B2).
8. **„Draft saved." toast** — jasny feedback po zapisie.
9. **Guard `beforeunload`.** Reload przy niezapisanych zmianach wywołuje natywny monit
   przeglądarki (zapobiega utracie danych) — dobre UX; w automatyzacji wymagało obsługi
   dialogu. Po „Save draft" reload jest już czysty (brak monitu), co potwierdza zapis.
10. **Sekcje „Structure", „Block layout", „Device visibility"** pod edytorem Stack to kontrolki
    **page-buildera** (slot/width/padding/margin/widoczność per urządzenie), nie część edytora
    Stack. Kontekst, poza zakresem audytu.
11. **Radix Select.** Natywna komenda `select` harnessu na nim nie działa; sterowanie przez
    klik triggera + klik opcji (po dokładnej etykiecie) działa niezawodnie. Niuans narzędzia,
    nie błąd widgetu.

---

## 7. Admin UI vs Front — pełna macierz probe CSS @1280px

| Klasa | Admin :5173 | Public :3000 | Zgodność |
|---|---|---|---|
| `gap-4/6/8/10/12` (bazowe) | ✅ | ✅ | ✅ |
| `md:gap-6` | ❌ | ❌ | ✅ (oba zepsute) |
| `md:gap-8` | ✅ | ❌ | ❌ **rozjazd** |
| `lg:gap-6/8/10/12` | ❌ | ❌ | ✅ (oba zepsute) |
| `flex-col` / `flex-row` | ✅ | ✅ | ✅ |
| `md:flex-row` / `lg:flex-row` | ✅ | ✅ | ✅ |
| `md:flex-col` | ❌ | ❌ | ✅ (oba) |
| `lg:flex-col` | ✅ | ❌ | ❌ **rozjazd** |
| `items-center/end/baseline` (bazowe) | ✅ | ✅ | ✅ |
| `md:items-center` / `lg:items-center` | ✅ | ✅ | ✅ |
| `md:items-end` | ✅ | ❌ | ❌ **rozjazd** |
| `md:items-baseline` / `lg:items-end` / `lg:items-baseline` | ❌ | ❌ | ✅ (oba) |
| `justify-center/between/evenly/around` (bazowe) | ✅ | ✅ | ✅ |
| `md:justify-between` / `lg:justify-between` | ✅ | ✅ | ✅ |
| `md:/lg:justify-center` / `-evenly` / `-around` | ❌ | ❌ | ✅ (oba) |
| `flex-wrap` / `flex-nowrap` (bazowe) | ✅ | ✅ | ✅ |
| `md:flex-wrap` / `md:flex-nowrap` / `lg:flex-nowrap` | ✅ | ✅ | ✅ |
| `lg:flex-wrap` | ❌ | ❌ | ✅ (oba zepsute) |
| Konsola | 0 błędów / 0 ostrzeżeń | 0 błędów / 0 ostrzeżeń | ✅ |

**Wniosek:** Edytor (warstwa danych) i renderer atrybutów są w pełni spójne admin↔front
(78/78 opcji). Rozjazd pojawia się **wyłącznie w warstwie CSS Tailwind** — część klas
responsywnych istnieje w buildzie admina (Vite JIT), a nie w produkcyjnym (`md:gap-8`,
`lg:flex-col`, `md:items-end`), a klasy gapów per-breakpoint (`lg:gap-*`, `md:gap-6`) nie
istnieją nigdzie. To czyni podgląd admina miejscami **niewiarygodnym** względem produkcji.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only setup + przejście do Visual | ✅ Działa zgodnie z projektem (0 pól edycji — celowo) |
| **Visual** | Główny edytor (4 sekcje) | ⚠️ **Wszystkie 78 opcji** działają w warstwie danych (zapis, atrybuty, podgląd, trwałość), ale duża część ustawień per-breakpoint **nie ma efektu wizualnego** na tablet/desktop (B1/B2) |
| **Advanced** | 2 sekcje diagnostyczne read-only | ✅ 0 kontrolek; podsumowania wiernie odzwierciedlają **dane** (ale nie realny render — B1) |
| **Front** | `/test-stack-0516` (opublikowany, 2 dzieci) | ✅ HTTP 200, 0 błędów konsoli, responsywny kierunek (col↔row) i brak overflow; ⚠️ gap zablokowany na 16px (mobile) na każdym breakpoincie (B1) |

**Werdykt końcowy:** Logika edytora i normalizacji Stacka jest **sprawna i w pełni spójna** —
warianty seedują kierunki (i tylko kierunki), **każda dyskretna opcja każdej kontrolki Visual
(78/78)** poprawnie zapisuje stan i natychmiast aktualizuje podgląd (atrybuty/klasy), zmiany
przeżywają „Save draft → reload", a Wizard i Advanced realizują deklarowany kontrakt
(setup-only / read-only). Front renderuje się bez błędów i bez poziomego overflow.
**Realny, powtarzalny defekt leży w warstwie CSS:** responsywne klasy Tailwind budowane
dynamicznie (`${prefix}${className}`) w większości nie trafiają do serwowanego arkusza.
Najdotkliwiej dotyka to **odstępu — żaden `lg:gap-*` ani domyślny `md:gap-6` nie działa
wizualnie (B1), włącznie z wartościami domyślnymi (16px zamiast 24px na desktop/tablet)** —
oraz w mniejszym stopniu kierunku/align/justify/wrap na nie-mobilnych breakpointach (B2),
z dodatkowym **rozjazdem admin↔front** na `md:gap-8`, `lg:flex-col`, `md:items-end` (B3).
Skutek dla użytkownika: kontrolki sugerują kontrolę, której realnie nie ma na tablet/desktop, a
podgląd admina bywa myląco optymistyczny. Obszary niezweryfikowane i ich przyczyny wymieniono
jawnie w sekcji 5.

---

## 9. Zrzuty (etykiety lokalne — pliki nie commitowane)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `stack-admin-visual-29-05.png` | Admin, tryb Visual (po audycie / przed resetem do defaults) |
| `stack-public-desktop-1280-29-05.png` | Front `/test-stack-0516`, 1280 px (responsive: row, 2 dzieci, brak overflow) |
| `stack-public-mobile-375-29-05.png` | Front `/test-stack-0516`, 375 px (mobile: column, brak overflow) |
