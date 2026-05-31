# RAPORT: Split Layout Widget — audyt wyczerpujący (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 2026-05-28)
> **Sesja przeglądarki:** `claude-29-05-split-layout-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `c3fa7a67-99fc-42ec-a4e4-131c1dc75a58`
> **Fixture public:** `http://localhost:3000/test-split-layout-0516`
> **Pliki źródłowe:** `core/widgets/core/splitLayout.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten przebieg jest świadomie bardziej wyczerpujący niż
> poprzedni raport z 28-05. **Nie zatrzymano się na próbkach reprezentatywnych** —
> dla każdej dostępnej w fixturze rodziny kontrolek przeklikano *wszystkie* dyskretne
> opcje co najmniej raz (3 startery Wizarda, 3 karty Base, 3×Desktop, 3×Tablet,
> 2×Phone layout, 3×Phone split, switch ON/OFF, **10×gap**, **4×align**), a dodatkowo
> obie gałęzie diagnostyki Advanced (keep+reverse oraz stack+left-first; „still used
> on every device size" oraz „has device-specific changes"). Każdą zmianę
> weryfikowano programowo przez odczyt atrybutów `data-split-*` oraz klas Tailwind na
> faktycznie wyrenderowanym węźle w canvas (`[data-split-layout-variant]`), a stan
> trwałości — przez `Save draft` + pełny reload. Tam gdzie czegoś nie dało się
> potwierdzić, jest to jawnie wymienione w sekcji **„Nie do przetestowania"**.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są **wyłącznie lokalnymi etykietami**
> przechwyceń Playwright (zapisane w katalogu roboczym podczas tej sesji). Same pliki
> nie są wymaganym evidence i nie są commitowane do repo.

> **Status TASK-343-28 (2026-05-30):** uwagi UX #1, #2 i #3 są zamknięte w kodzie. Ratio
> disclosure rozróżnia teraz jawnie zapisany phone split, który efektywnie nadal pasuje do startera,
> od rzeczywistej zmiany urządzeniowej. Karty Visual podświetlają efektywny desktop split, a nie
> wyłącznie zapisany seed wariantu. Klik karty desktop split zachowuje tablet/phone overrides, gdy
> różnią się one od desktopu; Wizard nadal seeduje wszystkie trzy ratio.

---

## 1. Przegląd widgetu

**Typ:** `split-layout` · **Kategoria:** layout
**Opis (z definicji):** „Two-pane layout wrapper with ratio and mobile behavior controls."
**Sloty (stałe):** `left`, `right` — układ zawsze dwupanelowy. **Brak repeatable items** w modelu danych widgetu (nie ma dodawania/usuwania/reorder paneli).
**Warianty (base preset):** `50-50`, `40-60`, `60-40`.

**Model danych (`SplitLayoutData`) i defaulty:**

| Pole | Wartości | Default |
|------|----------|---------|
| `ratio.desktop` | `50-50` / `40-60` / `60-40` | `50-50` |
| `ratio.tablet` | `50-50` / `40-60` / `60-40` | `50-50` |
| `ratio.mobile` | `50-50` / `40-60` / `60-40` | dziedziczy z `tablet` (gdy brak jawnego) |
| `collapseMobile` | `stack` / `keep` | `stack` |
| `reverseOnMobile` | bool | `false` |
| `gap` | `none`/`0`/`1`/`2`/`3`/`4`/`5`/`6`/`8`/`10`/`12` | `6` |
| `verticalAlign` | `start` / `center` / `end` / `stretch` | `stretch` |

**Mapowanie ratio → kolumny gridu (grid-cols-12):** `50-50` → 6/6, `40-60` → 5/7, `60-40` → 7/5.
Render składa klasy niezależnie per breakpoint: `col-span-*` (mobile, tylko w `keep`),
`md:col-span-*` (tablet), `lg:col-span-*` (desktop).

**Tryby edytora (`splitLayoutEditorContract`, version 2):**
- **Wizard** — 1 sekcja „Choose a starter split"; jedyne writable: `variant`.
- **Visual** — 4 sekcje: „Pane layout", „Phone behavior", „Spacing and alignment", „Pane content" (ostatnia read-only, `role: summary`).
- **Advanced** — 2 sekcje read-only diagnostyczne: „How this layout renders", „Saved layout summary"; zero pól edytowalnych.

---

## 2. Zakres realnie wyklikanych interakcji (TESTED)

Wszystko wykonane w żywej aplikacji, stan weryfikowany odczytem `data-split-*` i `className`.

### 2.1 Mapa kontrolek vs. opcje (czy przeklikano komplet?)

| Rodzina kontrolek | Tryb | Liczba dyskretnych opcji | Przeklikano | Komplet? |
|---|---|---|---|---|
| Starter layout (Radix Select) | Wizard | 3 | 50/50, 40/60, 60/40 | ✅ 3/3 |
| Base layout (radio cards) | Visual | 3 | 50/50, 40/60, 60/40 | ✅ 3/3 |
| Desktop layout (Select) | Visual | 3 | 50/50, 40/60, 60/40 | ✅ 3/3 |
| Tablet layout (Select) | Visual | 3 | 50/50, 40/60, 60/40 | ✅ 3/3 |
| Phone layout (Select) | Visual | 2 | stack, keep | ✅ 2/2 |
| Phone split (Select, warunkowy) | Visual | 3 | 50/50, 40/60, 60/40 | ✅ 3/3 |
| Show right pane first (Switch) | Visual | 2 | ON, OFF | ✅ 2/2 |
| Space between panes / gap (Select) | Visual | 10 | none,1,2,3,4,5,6,8,10,12 | ✅ 10/10 |
| Content height alignment (Select) | Visual | 4 | start, center, end, stretch | ✅ 4/4 |
| Diagnostyka „Starter layout" | Advanced | 2 gałęzie | „still used…", „has device-specific changes" | ✅ 2/2 |
| Diagnostyka „Phone" + „Saved summary" | Advanced | 2 gałęzie | keep+reverse, stack+left-first | ✅ 2/2 |

### 2.2 Dodatkowe scenariusze
- **Wizard round-trip:** wejście „Run setup again" → przeklikanie 3 starterów → „Finish setup and open Visual" (wariant zachowany).
- **Reset overridów przez kartę Base:** ustawiono jawne overrides (desktop 50/50, tablet 40/60 przy wariancie 60/40), następnie klik karty 50/50 — overrides skasowane bez ostrzeżenia.
- **Warunkowe UI Phone split:** zweryfikowano znikanie/pojawianie się kontrolki przy stack↔keep.
- **Persistencja:** `Save draft` (toast „Draft saved.") → pełny reload → odczyt wszystkich 8 pól.
- **Front:** `/test-split-layout-0516` — konsola, DOM, klasy per breakpoint, geometria i overflow @1280, @768, @375.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Stan domyślny i model
Renderer wiernie odwzorowuje wszystkie pola modelu na atrybuty `data-split-*` i klasy
Tailwind. Defaulty: `gap=6` (`gap-6`), `verticalAlign=stretch` (`items-stretch`),
`collapse=stack` (`grid-cols-1`), `reverse=false` (brak klas `order-*`).

### 3.2 Wizard — wszystkie 3 startery

Każdy starter wywołuje `buildVariantSyncedSplitLayoutData`: ustawia `variant` **i synchronizuje
wszystkie trzy ratio** (`desktop/tablet/mobile`), zachowując pozostałą metę (gap/align/collapse/reverse).

| Starter | variant | desktop/tablet/mobile | left col-span | right col-span | Wynik |
|---|---|---|---|---|---|
| 50 / 50 | `50-50` | 50-50 / 50-50 / 50-50 | 6 / 6 / 6 | 6 / 6 / 6 | ✅ |
| 40 / 60 | `40-60` | 40-60 / 40-60 / 40-60 | 5 / 5 / 5 | 7 / 7 / 7 | ✅ |
| 60 / 40 | `60-40` | 60-40 / 60-40 / 60-40 | 7 / 7 / 7 | 5 / 5 / 5 | ✅ |

„Finish setup and open Visual" przełącza do Visual i zachowuje wariant (karta oznaczona „Base preset"). ✅

### 3.3 Visual — Base layout (3 karty)

Karty zachowują się jak startery Wizarda (sync wszystkich ratio + zachowanie mety):

| Karta | variant | wszystkie ratio | left/right (każdy breakpoint) | Wynik |
|---|---|---|---|---|
| 50 / 50 | `50-50` | 50-50 | col-span-6 / col-span-6 | ✅ |
| 40 / 60 | `40-60` | 40-60 | col-span-5 / col-span-7 | ✅ |
| 60 / 40 | `60-40` | 60-40 | col-span-7 / col-span-5 | ✅ |

**Reset overridów:** przy stanie `variant=60-40, desktop=50-50, tablet=40-60, mobile=60-40`
(disclosure: „Custom device layout", `data-split-ratio-override=true`) klik karty `50/50`
nadpisał wszystkie ratio na `50-50`. Potwierdzono live. ✅ (zachowanie wg projektu — patrz UX #3)

### 3.4 Visual — Desktop layout (3 opcje, override niezależny od variantu)

Przy `variant=60-40` (niezmienianym):

| Opcja | `data-split-ratio-desktop` | left `lg:col-span` | right `lg:col-span` | variant po zmianie | Wynik |
|---|---|---|---|---|---|
| 50 / 50 | `50-50` | `lg:col-span-6` | `lg:col-span-6` | `60-40` (bez zmian) | ✅ |
| 40 / 60 | `40-60` | `lg:col-span-5` | `lg:col-span-7` | `60-40` | ✅ |
| 60 / 40 | `60-40` | `lg:col-span-7` | `lg:col-span-5` | `60-40` | ✅ |

### 3.5 Visual — Tablet layout (3 opcje)

Przy `variant=60-40, desktop=60-40` (niezmienianych):

| Opcja | `data-split-ratio-tablet` | left `md:col-span` | right `md:col-span` | Wynik |
|---|---|---|---|---|
| 50 / 50 | `50-50` | `md:col-span-6` | `md:col-span-6` | ✅ |
| 40 / 60 | `40-60` | `md:col-span-5` | `md:col-span-7` | ✅ |
| 60 / 40 | `60-40` | `md:col-span-7` | `md:col-span-5` | ✅ |

### 3.6 Visual — Phone layout (stack / keep) + warunkowe UI

| Opcja | `data-split-collapse-mobile` | klasa kontenera | mobile col-span paneli | Kontrolka „Phone split" | Wynik |
|---|---|---|---|---|---|
| Stack panes on phones | `stack` | `grid-cols-1 md:grid-cols-12` | `col-span-1` / `col-span-1` | ukryta (`data-split-mobile-ratio-control=stack-note`), combobox nieobecny | ✅ |
| Keep two columns on phones | `keep` | `grid-cols-12 md:grid-cols-12` | wg `ratio.mobile` | odsłonięta (`data-split-mobile-ratio-control=visible`) | ✅ |

### 3.7 Visual — Phone split (3 opcje, tylko w `keep`)

Niezależny od variantu/tabletu (`variant=50-50, tablet=50-50` niezmienne):

| Opcja | `data-split-ratio-mobile` | left mobile col-span | right mobile col-span | Wynik |
|---|---|---|---|---|
| 50 / 50 | `50-50` | `col-span-6` | `col-span-6` | ✅ |
| 40 / 60 | `40-60` | `col-span-5` | `col-span-7` | ✅ |
| 60 / 40 | `60-40` | `col-span-7` | `col-span-5` | ✅ |

### 3.8 Visual — Show right pane first on phones (Switch)

| Stan | `data-split-reverse-mobile` | left order | right order | Wynik |
|---|---|---|---|---|
| OFF | `false` | (brak `order-*`) | (brak `order-*`) | ✅ |
| ON | `true` | `order-2 md:order-1` | `order-1 md:order-2` | ✅ |

### 3.9 Visual — Space between panes / gap (KOMPLET 10 opcji)

Każda etykieta UI → token `data-split-gap` → klasa `gap-*` (zweryfikowane 1:1):

| Etykieta UI | token gap | klasa | | Etykieta UI | token gap | klasa |
|---|---|---|---|---|---|---|
| No gap | `none` | `gap-0` | | Roomy | `5` | `gap-5` |
| Very tight | `1` | `gap-1` | | Default | `6` | `gap-6` |
| Tight | `2` | `gap-2` | | Large | `8` | `gap-8` |
| Small | `3` | `gap-3` | | Extra large | `10` | `gap-10` |
| Balanced | `4` | `gap-4` | | Maximum | `12` | `gap-12` |

Wszystkie 10 ✅. Lista opcji **nie zawiera** tokenów `0`, `7`, `9`, `11` (zgodnie z presetem;
`0` jest legacy — patrz „Nie do przetestowania").

### 3.10 Visual — Content height alignment (KOMPLET 4 opcji)

| Etykieta UI | `data-split-vertical-align` | klasa | Wynik |
|---|---|---|---|
| Top | `start` | `items-start` | ✅ |
| Middle | `center` | `items-center` | ✅ |
| Bottom | `end` | `items-end` | ✅ |
| Equal height | `stretch` | `items-stretch` | ✅ |

### 3.11 Persistencja (Save draft → reload)

Zapisano stan dystynktywny (każde pole nie-domyślne):
`variant=40-60, desktop=60-40, tablet=50-50, mobile=60-40, collapse=keep, reverse=true, gap=5, verticalAlign=end`
(klasa kontenera: `grid w-full min-w-0 grid-cols-12 md:grid-cols-12 gap-5 items-end`;
left `col-span-7 md:col-span-6 lg:col-span-7 order-2 md:order-1`, right `col-span-5 md:col-span-6 lg:col-span-5 order-1 md:order-2`).
Po `Save draft` (toast „Draft saved.") i **pełnym reloadzie** wszystkie 8 pól wróciło z bazy bez zmian. ✅

### 3.12 Advanced — read-only, obie gałęzie diagnostyki

- **Zero kontrolek edytowalnych** w panelu Advanced (programowo: 0 inputów, 0 buttonów, 0 comboboxów, 0 switchy; ~897 znaków treści read-only). ✅
- **Stan keep + reverse** (`variant=40-60, desktop=60-40, tablet=50-50, mobile=60-40, gap=5, end`):
  - Starter layout → „40 / 60 starter layout **has device-specific changes**."
  - Desktop → „60 / 40: the left pane is wider than the right pane."
  - Tablet → „50 / 50: left and right panes share the row evenly."
  - Phone → „60 / 40 split on phones with **right pane first**."
  - Space between panes → „Roomy. Roomier spacing between the left and right panes."
  - Content height alignment → „Bottom"
  - Saved summary: „Desktop 60 / 40, tablet 50 / 50, phone 60 / 40." · „Right pane is shown first on phones."
- **Stan stack + left-first** (przełączono collapse→stack, reverse→OFF):
  - Phone → „**Left pane first** with one pane per row on phones."
  - Saved summary: „Desktop 60 / 40, tablet 50 / 50, **phone stacked**." · „**Left pane** is shown first on phones."
- **Gałąź „still used on every device size"**: po zsynchronizowaniu wszystkich ratio kartą 50/50,
  diagnostyka pokazała „50 / 50 starter layout **is still used on every device size**." ✅

Wszystkie podsumowania zgadzały się ze stanem ustawionym w Visual. ✅

### 3.13 Front (`/test-split-layout-0516`)

- HTTP `200`, tytuł `TEST-SPLIT-LAYOUT-0516`, **0 błędów i 0 ostrzeżeń** w konsoli.
- Renderuje **1** widget split-layout; oba panele mają **realną treść** (`data-split-items-left=1`,
  `data-split-items-right=1`): lewy „Fixture · Split left pane · …", prawy „Fixture · Split right pane · …".
- **0 placeholderów pustego panelu** na froncie (`emptyPanes=0`; tekst „… pane is empty" nieobecny) —
  zgodnie z `renderEditorPlaceholder` (placeholder tylko w admin preview, `null` w public runtime). ✅
- Stan **opublikowany** (różny od mojego draftu): `variant=60-40, desktop=60-40, tablet=50-50,
  mobile=50-50, collapse=keep, reverse=true, gap=6, valign=center`. Klasy:
  - kontener: `grid w-full min-w-0 grid-cols-12 md:grid-cols-12 gap-6 items-center`,
  - lewy `col-span-6 md:col-span-6 lg:col-span-7 order-2 md:order-1`,
  - prawy `col-span-6 md:col-span-6 lg:col-span-5 order-1 md:order-2`. ✅
- **Geometria i brak overflow** (zmierzone realnie przez `getBoundingClientRect`):
  - **@1280** (desktop lg 60-40): brak overflow (`scrollWidth==clientWidth==1280`); lewy ≈587px, prawy ≈413px (≈7:5), ten sam wiersz.
  - **@768** (tablet md 50-50): brak overflow; lewy ≈372px, prawy ≈372px (równo), ten sam wiersz.
  - **@375** (telefon, keep, mobile 50-50): brak overflow; dwie kolumny po ≈176px obok siebie, ten sam wiersz.
- **Reverse na telefonie** działa: @375 prawy panel jest fizycznie po lewej (`rightLeft=0 < leftLeft=200`) — `order` odwraca wizualnie panele przy zachowanym porządku DOM. ✅

---

## 4. Co NIE działa / problemy

- **Nie znaleziono błędów funkcjonalnych** w całym przeklikanym zakresie (a był to komplet
  dyskretnych opcji każdej rodziny kontrolek, nie próbka). Każda opcja realnie zmieniała
  render, mapowała się 1:1 na oczekiwany token/klasę i — dla stanu zapisanego — przetrwała reload.
- Renderer niezależnie i poprawnie składa klasy `col-span`/`order`/`gap`/`items-*` per breakpoint;
  nie wykryto rozbieżności admin ↔ front (poza celową różnicą placeholderów, sekcja 6).

> Uczciwe zastrzeżenie: „brak błędów" dotyczy **przetestowanego** zakresu. Pozycje z sekcji 5
> (Nie do przetestowania) nie były zweryfikowane i nie mogę ich potwierdzić ani zaprzeczyć.

---

## 5. Czego NIE dało się przetestować w tej fixturze/środowisku (NOT TESTABLE)

Wymienione precyzyjnie z powodem:

1. **Legacy `gap: "0"` — gałąź read-only w Advanced.** Kontrolka „Space between panes" **nie
   wystawia** opcji `0` (oferuje „No gap" → token `none`). Notka „Older saved zero-gap layouts
   are shown here." (w `getSplitLayoutDiagnostics`) uruchamia się tylko dla rekordu z zapisanym
   `gap="0"`. **Brak ścieżki UI do ustawienia `0`** i brak istniejącego rekordu z `0` w tej
   fixturze → tej gałęzi **nie udało się** wywołać na żywym stanie. (Logika znana z kodu, nie
   zweryfikowana runtime'owo.)

2. **Round-trip moich edycji do public runtime (Publish).** Wykonano wyłącznie `Save draft`
   (świadomie — `Publish` to akcja na stanie współdzielonym, niezamawiana w zadaniu). Front
   zweryfikowano względem **wcześniej opublikowanego** stanu fixture, który różni się od mojego
   draftu (published `desktop=60-40, tablet=50-50, mobile=50-50, gap=6, valign=center` vs mój draft
   `desktop=60-40, tablet=50-50, mobile=60-40, gap=5, valign=end`). Potwierdza to, że draft nie
   publikuje — ale **nie** jest to round-trip moich dokładnych wartości na publiczną trasę.

3. **Dodawanie/usuwanie/reorder realnych widgetów-dzieci do paneli.** Model `split-layout` **nie
   ma repeatable items** (sloty `left`/`right` są stałe; sekcja „Structure" pokazuje oba sloty z
   wyłączonymi „Move up/down" i „0 items"). Wstawianie zagnieżdżonych widgetów to domena
   page-buildera — w adminie panele były puste (tylko placeholdery), na froncie wstępnie wypełnione
   fixturą. Insert/Structure dla dzieci **nie był** ćwiczony.

4. **Realny breakpoint tabletu vs. klasy `md:`.** Geometrię zmierzono realnie @1280, @768 i @375.
   Klasy `md:col-span-*` potwierdzono w DOM oraz pomiarem @768 (50-50 → 372/372px). Pozostałe
   ratio tabletu (5/7, 7/5) potwierdzono statycznie w DOM, ale nie mierzono geometrii dla nich
   przy jawnej szerokości tabletu.

5. **Natywna komenda `select` na Radix Comboboxach.** Wszystkie selecty to Radix — sterowano nimi
   przez klik triggera + klik opcji (działa). Natywne `<select>` API nie jest dostępne; to niuans
   harnessu, nie defekt widgetu.

---

## 6. Uwagi UX/UI (niuanse, nie błędy)

1. **Sprzeczny komunikat disclosure po Wizardzie/karcie.** Gdy starter/karta zsynchronizuje
   wariant, `ratio.mobile` staje się jawnie zapisane (`hasExplicitMobile=true`), więc tekst
   „**Phone layout has its own saved split.**" pojawia się równocześnie z badge „**Matches
   starter layout**" (`data-split-ratio-override=false`) — mimo że wszystkie ratio są równe.
   Potwierdzone live (stan: wszystkie ratio = 60-40). Lekko mylące: sugeruje osobny split telefonu,
   którego efektywnie nie ma.
2. **Karta Base resetuje overrides urządzeń bez ostrzeżenia.** Potwierdzone: jawne overrides
   (desktop 50/50, tablet 40/60) przepadły po kliknięciu karty 50/50, bez confirmacji.
3. **`variant` i `ratio.desktop` są rozdzielone (`visualOwnsVariantSelection`).** Standalone selecty
   Desktop/Tablet/Phone celowo nie ruszają `variant`. Efekt potwierdzony: karta „Base preset" może
   wskazywać `60/40`, gdy desktop to faktycznie `50/50`. Podświetlenie „Base preset" idzie za
   wariantem, nie za realnym ratio desktopu.
4. **„Keep two columns on phones" bywa ciasne.** @375 panele schodzą do ≈176px. Edytor uczciwie
   ostrzega copy („This can feel tight on small screens") — świadomy tradeoff, nie defekt.
5. **Token `gap: "0"` to ukryta druga reprezentacja zera.** UI nie pozwala go ustawić
   (oferuje „No gap" → `none`); `0` ma jedynie read-only ścieżkę w Advanced. Spójne z intencją.
6. **Lista gap pomija „pełne" wartości skali Tailwind.** Dostępne są presety
   none/1/2/3/4/5/6/8/10/12 (brak 7/9/11) — celowy, ograniczony zestaw.
7. **Sekcje block-level w panelu** („Structure", „Block layout", „Device visibility") należą do
   page-buildera/bloku, **nie** do edytora split-layout. Odnotowane jako kontekst; nie wpływają na
   model widgetu.

**Status TASK-343-28:** #1/#2/#3 są zamknięte. Visual opisuje explicit phone ratio jako zapisany
stan pasujący do startera, jeżeli wartości są równe; desktop cards nie kasują już istniejących
tablet/phone overrides; selected card idzie za `ratio.desktop`. #4-#7 pozostają świadomymi
ograniczeniami lub kontekstem spoza modelu widgetu.

---

## 7. Admin UI vs Front — porównanie zachowania

| Funkcjonalność | Admin Preview | Front | Zgodność |
|---|---|---|---|
| Render wariantu/ratio (klasy col-span) | ✅ poprawne per breakpoint | ✅ identyczna logika | ✅ |
| `collapse=keep` → grid-cols-12 na mobile | ✅ | ✅ (dwie kolumny @375) | ✅ |
| `collapse=stack` → grid-cols-1 + col-span-1 | ✅ | n/d (published=keep) | ✅ (logika ta sama) |
| `reverse` → order-2/order-1 | ✅ | ✅ (prawy panel po lewej @375) | ✅ |
| `gap` / `verticalAlign` | ✅ | ✅ | ✅ |
| Placeholder pustego panelu | ✅ 2 (`data-split-empty-pane`) | ✗ 0 (treść realna) | ✅ celowa różnica (admin-only) |
| Liczba zagnieżdżonych widgetów | fixture: 0/0 | published: 1/1 | n/d (różne stany) |

**Wniosek:** Renderer jest spójny między admin a frontem. Jedyna różnica (placeholdery pustych
paneli widoczne tylko w adminie) jest celowa i wynika z `renderEditorPlaceholder`.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu (wyczerpujący) |
|---|---|---|
| **Wizard** | Jednorazowy starter `variant` + przejście do Visual | ✅ Wszystkie 3 startery działają; każdy synchronizuje wariant + 3 ratio, zachowuje metę |
| **Visual** | Główny edytor (4 sekcje) | ✅ **Komplet** opcji każdej kontrolki przeklikany (3+3+3+2+3+2+10+4) — wszystkie mapują się 1:1 na tokeny/klasy; warunkowe UI Phone split działa; reset overridów przez kartę potwierdzony |
| **Advanced** | 2 sekcje diagnostyczne read-only | ✅ Zero kontrolek edytowalnych; obie gałęzie copy (keep/stack, starter „still used"/„device-specific") wiernie odzwierciedlają stan |
| **Persistencja** | Save draft → reload | ✅ Wszystkie 8 pól trwałe po pełnym reloadzie |
| **Front** | `/test-split-layout-0516` (stan opublikowany) | ✅ HTTP 200, 0 błędów konsoli, klasy responsywne poprawne, brak overflow @1280/@768/@375, reverse działa na telefonie, placeholdery tylko w adminie |

**Werdykt końcowy:** W **wyczerpująco** przeklikanym zakresie (wszystkie dyskretne opcje
każdej dostępnej rodziny kontrolek, obie gałęzie diagnostyki Advanced, persistencja po reloadzie
oraz render na froncie z pomiarem geometrii) widget `split-layout` jest sprawny i spójny między
edytorem a rendererem. **Nie wykryto błędów funkcjonalnych.** Wizard i Advanced realizują
zadeklarowany kontrakt (starter-only / read-only), a Visual poprawnie obsługuje pełną konfigurację
responsywną z trwałym zapisem do draftu. Uwagi z sekcji 6 to niuanse UX (najistotniejsze:
sprzeczny komunikat disclosure po synchronizacji wariantu oraz rozdzielenie `variant` ↔ `ratio.desktop`),
nie defekty. Obszary niezweryfikowane wymieniono jawnie i precyzyjnie w sekcji 5.

---

## 9. Zrzuty (etykiety lokalne)

> PNG poniżej to **wyłącznie lokalne etykiety** przechwyceń z tej sesji (katalog roboczy). Nie są commitowane ani wymagane jako evidence.

| Plik (lokalna etykieta) | Opis |
|---|---|
| `split-public-desktop-1280-29-05.png` | Front `/test-split-layout-0516`, 1280px (brak overflow, desktop 60/40 → 7/5) |
| `split-public-mobile-375-29-05.png` | Front `/test-split-layout-0516`, 375px, tryb `keep` (dwie kolumny ≈176px, reverse → prawy panel po lewej) |
