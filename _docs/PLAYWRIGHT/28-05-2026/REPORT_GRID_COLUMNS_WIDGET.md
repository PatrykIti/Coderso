# RAPORT: Grid Columns Widget — pełny audyt stanu bieżącego (UX/UI + zachowanie)

> **Status:** Zakończony (audyt domykający luki z 28-05)
> **Data:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-grid-columns-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** strona `ee3f7352-52f1-4b4a-a910-619d94dc4410` ("Contract Test - grid-columns")
> **Fixture public:** http://localhost:3000/test-grid-columns-0516 ("TEST-GRID-COLUMNS-0516")
> **Pliki źródłowe:**
> - `core/widgets/core/gridColumns.tsx` — renderer, typy, normalizacja, presety spanów
> - `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` — edytory Wizard / Visual / Advanced

> Uwaga: nazwy plików PNG w tym raporcie to **wyłącznie lokalne etykiety przechwyceń Playwright**.
> Same pliki PNG nie są evidence wymaganym w repo i nie są wersjonowane (po audycie usunięte z drzewa roboczego).

Ten raport domyka luki wskazane w wersji z 28-05 („some style families and slot-related branches not
fully exercised"). Tym razem **przeklikano per-column style selecty, gałęzie cardize / overflow /
min-height / vertical alignment, pozostałe tokeny layoutu oraz kontrolki Structure osiągalne z tego
fixtura**. Każdy efekt zweryfikowano odczytem realnego DOM-u (klasy Tailwind kolumn, inline-style,
atrybuty `data-grid-columns-*`, `getBoundingClientRect`), a nie tylko z wyglądu snapshotu.

---

## 1. Stan wyjściowy fixtura admin (po świeżym wczytaniu)

- **Wariant:** `equal`, **2 content areas:** „Primary content" (instance `1`), „Supporting content" (instance `2`).
- Obie kolumny: desktop `6/12`, tablet `6/12`, phone `12/12`.
- **Globalny cardize: ON** — kolumny mają `border p-4 rounded-xl`, tło `#f8fafc`, obramowanie `#e2e8f0`, `1px`.
- **Kolumna 1 ma włączony „Highlight this column"** (per-column surface override = on) z wartościami `Global`.
- Kolumna 2 — highlight off.
- Sloty Structure aktywne (2 puste sloty) → liczba kolumn sterowana w panelu **Structure**, nie w Visual.

> Architektura trybów bez zmian względem 28-05: panel ma zakładki **Visual** i **Advanced**; „Wizard"
> to flow startowy uruchamiany przyciskiem **„Run setup again"** (nie osobna zakładka). Komunikat
> „Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics." obecny.

---

## 2. Co zostało przetestowane w tym przebiegu (przeklikane, nie z kodu)

### 2.1 Per-column style selecty (sekcja „Per-column surfaces and behavior")
- Kol.1 (highlight ON): **Border width** override, **Corner radius** override, **Internal padding** override.
- Kol.1: **Background override** (swatch) + **Clear**.
- Kol.1 i Kol.2: **Clip overflowing content** (overflow).
- Kol.1: **Minimum height**, **Phone minimum height**; Kol.2: **Minimum height (None)**.
- Kol.1: **Vertical alignment (Center)**; Kol.2: **Vertical alignment (End / Stretch / Start)**.

### 2.2 Gałęzie cardize / overflow / min-height / alignment
- Globalny **Cardized columns** OFF→ON i precedencja override vs. global.
- Wariant **Masonry Lite** — wymuszony, zablokowany cardize.
- Pełne pokrycie 4 wartości `alignSelf` (start/center/end/stretch) oraz `items-*` (start/center/end/stretch).
- Responsywny min-height (base ≠ phone) → klasy `min-h-[…] md:min-h-[…]`.

### 2.3 Pozostałe tokeny layoutu
- **Horizontal gap** (No gap → `gap-x-0`), **Vertical gap** (Maximum → `gap-y-12`).
- **Wide screens (xl)** i **Very wide screens (2xl)** spany + reset „Match desktop".
- Indywidualny **Tablet width** i **Phone width** (Kol.2).
- **Reverse on phone** (klasy `order-*`).
- **Width presets** (67/33, 50/50).
- **Reapply asymmetric desktop widths**.
- Globalny **Column background** (swatch) + **Clear**, globalny **Column border color** Clear.

### 2.4 Kontrolki Structure osiągalne z tego fixtura
- **Add Column** (Structure) → 2→3 kolumny.
- **Remove** per-slot (Structure) → 3→2 kolumny.
- **Move up / Move down** — w siatce „Column sizing" oraz w panelu **Structure**.
- Gałęzie widoczności **Hide on tablet / + Hide on mobile / wszystkie trzy (guard)**.

### Czego NIE testowano (uczciwie) — patrz też sekcja 6 (not-testable)
- **Save draft / Publish** — świadomie pominięte (by nie nadpisać fixtura). Moje edycje są tylko w sesji.
- **Drag & drop** widgetów z biblioteki do slotów kolumn (mechanizm slot-add przez canvas/drag).
- **Wizard flow** („Run setup again") — pokryty raportem z 28-05; tu skupiono się na lukach.
- Block-level **Move up/down** (canvas) — patrz sekcja 6.

---

## 3. Co działa (potwierdzone w DOM)

### 3.1 Per-column style selecty (Kol.1 z włączonym Highlight)

| Kontrolka | Zmiana | Efekt w DOM | Wynik |
|-----------|--------|-------------|-------|
| Border width override | Global → Strong | inline `border-width: 3px` (z `1px`) | ✓ |
| Corner radius override | Global → None | usunięto `rounded-xl` z inner (`h-full min-h-[…] border p-4`) | ✓ |
| Internal padding override | Global → Extra roomy | `p-4` → `p-6` | ✓ |
| Clip overflowing content | Visible → Hidden | dodano `overflow-hidden` | ✓ |
| Minimum height | Default → Extra tall | `min-h-[6rem]` → `min-h-[10rem]` | ✓ |
| Phone minimum height | Match base → Small (przy base Extra tall) | `min-h-[4rem] md:min-h-[10rem]` (responsywnie) | ✓ |
| Vertical alignment | Inherit → Center | `self-center` na outer-div kolumny | ✓ |
| Background override (swatch) | → `#00ff00` | inline `background-color: rgb(0,255,0)`, zachowane `border-width:3px` | ✓ |
| Background override → **Clear** | usuń | znika `background-color`, **pozostaje** `border 3px` (osobny override) | ✓ |

### 3.2 Per-column behavior (Kol.2, Highlight OFF)

| Kontrolka | Zmiana | Efekt w DOM | Wynik |
|-----------|--------|-------------|-------|
| Minimum height | Default → None | `min-h-0` | ✓ |
| Vertical alignment | End / Stretch / Start | `self-end` / `self-stretch` / `self-start` | ✓ |
| Clip overflowing content | Visible → Hidden | `overflow-hidden` (kolumna nadal kartowana, bo global cardize ON) | ✓ |

> Wszystkie 4 wartości `alignSelf` i wszystkie 4 wartości `items-*` siatki zostały realnie odwzorowane.

### 3.3 Cardize i precedencja override vs. global (kluczowy test)

- **Global cardize OFF** przy Kol.1 = surface override ON, Kol.2 = tylko overflow/min-height/align:
  - **Kol.1 POZOSTAJE kartowana** z własnymi wartościami: `border p-6 overflow-hidden` + inline `border-width:3px` (override „przeżywa" wyłączenie globala). ✓
  - **Kol.2 TRACI kartę**: `h-full min-h-0 overflow-hidden` — bez `border`, `p-*`, `rounded-*`, bez inline-style. Czyli overflow / min-height / vertical-alignment **nie liczą się** jako surface-override (zgodnie z `hasGridColumnsColumnSurfaceOverrides`, które pomija `overflow`). ✓
- **Global cardize ON z powrotem** → Kol.2 wraca do `border p-4 rounded-xl overflow-hidden`. ✓
- **Masonry Lite**: przełącznik „Cardized columns" jest `checked + disabled`, helper „Masonry Lite always adds column cards, so this switch stays on."; obie kolumny kartowane, ale **per-column overrides nadal działają** (Kol.1: `border p-6` bez radiusa; Kol.2: domyślne `border p-4 rounded-xl`). ✓

### 3.4 Tokeny layoutu

| Kontrolka | Zmiana | Efekt w DOM | Wynik |
|-----------|--------|-------------|-------|
| Vertical alignment (grid) | End / Stretch | `items-end` / `items-stretch` + `data-grid-columns-align` | ✓ |
| Horizontal gap | No gap | `gap-x-0` + `data-grid-columns-gap-x="none"` | ✓ |
| Vertical gap | Maximum gap | `gap-y-12` + `data-grid-columns-gap-y="12"` | ✓ |
| Wide screens (xl) Kol.1 | 4/12 | dodano `xl:col-span-4` | ✓ |
| Very wide (2xl) Kol.1 | 3/12 → Match desktop | dodano `2xl:col-span-3`, reset usuwa klasę (gałąź „auto"→undefined) | ✓ |
| Tablet width Kol.2 | 4/12 | `md:col-span-4` | ✓ |
| Phone width Kol.2 | 6/12 | `col-span-6` (base) | ✓ |
| Reverse on phone | on | `order-2 md:order-none` / `order-1 md:order-none` + `data-grid-columns-reverse-mobile="true"` | ✓ |
| Column background (global swatch) | → `#ff0000` | kolumny BEZ override dostają `background-color: rgb(255,0,0)` | ✓ |
| Column background (global) → **Clear** | usuń | znika `background-color` z kolumn bez override; swatch wraca do fallbacku | ✓ |

### 3.5 Presety i asymmetric

- **Preset 67/33** → desktop `8/4` (`lg:col-span-8` / `lg:col-span-4`), tablet `6/6`, phone `12/12`.
  **Zachowuje** spany `xl/2xl` oraz per-column alignment/override (reset dotyczy tylko desktop/tablet/phone). ✓
- **Preset 50/50** → desktop `6/6`. ✓
- **Asymmetric + „Reapply asymmetric desktop widths"**: z `6/6` → `8/4` (`lg:col-span-8`/`lg:col-span-4`).
  Notice zmienia się z „This saved layout still uses matching desktop spans…" (tryb `equal`, przycisk Reapply) na
  „Asymmetric desktop widths are active…" (tryb `preset`). ✓
  - Niuans: po `67/33` (8/4) Asymmetric od razu jest w trybie `preset` (8/4 = preset asymetryczny dla 2 kolumn),
    więc przycisk Reapply się nie pojawia — ten sam układ osiągalny dwiema drogami.

### 3.6 Reorder i Structure (osiągalne z tego fixtura)

- **Move down / Move up** (siatka „Column sizing"): kolejność instancji `1,2` ↔ `2,1`.
  **Ustawienia per-column podróżują z instancją, nie z pozycją** (po przeniesieniu „Supporting content"
  zachowuje `self-start`/`col-span-6`, „Primary content" zachowuje `self-center`/`xl:col-span-4`). ✓
- **Move down / Move up w panelu Structure**: ten sam efekt reorderu (`1,2` ↔ `2,1`). ✓
- **Add Column (Structure)**: count `2`→`3`; nowa kolumna z domyślami `col-span-12 md:col-span-6 lg:col-span-6`;
  istniejące kolumny zachowują swoje ustawienia. ✓
- **Remove (Structure)**: przyciski **Remove pojawiają się dopiero, gdy count > min (2)**; usunięcie → `3`→`2`. ✓
- **Widoczność (gałęzie `resolveColumnVisibilityClasses`)**:
  - Hide on tablet → `md:hidden lg:block`. ✓
  - Hide on mobile + tablet → `hidden lg:block`. ✓
  - Wszystkie trzy włączone → **guard**: normalizacja resetuje wszystkie 3 przełączniki do `false` (kolumna znów widoczna). ✓
  - (Hide on desktop solo → `lg:hidden` — potwierdzone w 28-05.)

### 3.7 Advanced — żywe odzwierciedlenie stanu

Po wszystkich edycjach zakładka Advanced raportowała (read-only):
- Variant: **Equal**; Layout: „Vertical alignment Start, horizontal/vertical spacing Large gap, phone order normal."
- Width totals: „Desktop 12/12, tablet 12/12, phone 24/12 across 2 content areas."
- Cardized columns: **On**; Content area mismatch: „Saved column settings match the Structure order."
- Column overrides: **„1 of 2 content areas use per-column surface overrides"** (Kol.1). ✓
- Height and alignment overrides: **„2 of 2 content areas override height or alignment"**. ✓
- Content areas: „2 resolved content areas. Live Structure order is active."
- Shared surface: **„Background Custom color, border Custom color"** (bo zapisane jako hex `#f8fafc`/`#e2e8f0`, nie var()).

### 3.8 Front (public route `/test-grid-columns-0516`)

> To **inny fixture** niż admin: **3 wypełnione, kardyzowane kolumny** (admin: 2 puste). Zgodność admin↔front
> zweryfikowano na poziomie **kontraktu renderera**, nie przez wypchnięcie moich (niezapisanych) edycji.

- **SSR:** HTTP **200** (~1.07 s, 6660 B). Atrybuty: `variant="equal"`, `count="3"`, `align="start"`,
  `gap-x="6"`, `gap-y="6"`, `reverse-mobile="false"`.
- Każda kolumna `col-span-12 md:col-span-6 lg:col-span-6`, kardyzowana `h-full min-h-[6rem] border p-4 rounded-xl`,
  inline `background-color: var(--color-primary); border-color: var(--color-border); border-width:1px`.
- W każdej kolumnie zagnieżdżony **Rich Text Section** (eyebrow „Fixture" + `h3`); w żywym DOM `nestedH3 = 3`.
- **Brak wycieku etykiet** — `labelLeak = 0` zarówno w SSR, jak i w żywym DOM (etykiety renderują się tylko w editor/admin-preview).
- **Desktop (1280px):** kol.1 (x=128, y=48), kol.2 (x=652, y=48) w jednym rzędzie; **kol.3 zawija się do 2. rzędu** (x=128, y=346).
  `scrollWidth == clientWidth` → **brak poziomego overflow**.
- **Mobile (375px):** wszystkie 3 kolumny pełna szerokość (x=0, w=375), stack pionowy (y=48/374/700), **brak overflow**.
- **Konsola: 0 błędów / 0 ostrzeżeń.**

_Zrzuty (lokalne etykiety, niewersjonowane): `grid-columns-frontend-desktop-2905.png`, `grid-columns-frontend-mobile-2905.png`._

---

## 4. Co nie działa / błędy

**Nie wykryto żadnego błędu funkcjonalnego ani renderingu.** Każda przeklikana kontrolka dała poprawny,
natychmiastowy efekt w DOM; brak „martwych" przełączników, brak zawieszeń, **0 błędów konsoli** w adminie
(jedyny wpis to info React DevTools) i na froncie. Pozycje pozostające w obszarze „nie w pełni potwierdzone"
są ograniczeniami środowiska/fixtura, nie błędami — patrz sekcja 6.

---

## 5. Niuanse UX / UI warte odnotowania

1. **Nie da się ukryć kolumny na wszystkich 3 breakpointach.** Włączenie trzeciego „Hide on…" powoduje
   reset wszystkich trzech przełączników do off (guard `normalizeColumnVisibility`). Z perspektywy użytkownika
   trzeci toggle „nie działa" / „sam się wyłącza" — działanie poprawne, ale potencjalnie mylące.
2. **Liczba kolumn zablokowana w Visual przy aktywnych slotach Structure.** Select „Content area count" oraz
   „Add one column"/„Remove one column" są **disabled**; dodawanie/usuwanie tylko w **Structure**. Przyciski
   **Remove w Structure pojawiają się dopiero powyżej minimum (2 kolumny)** — przy 2 kolumnach nie ma jak usunąć.
3. **Presety resetują tylko desktop/tablet/phone**, ale **zachowują `xl`/`2xl` spany** oraz per-column
   alignment/override. Po zastosowaniu presetu „pozostały" span dla wide/very-wide może być nieoczywisty.
4. **Override surface „przeżywa" globalny cardize OFF, ale override zachowania (overflow/min-height/align) — nie.**
   Kolumna z samym overflow/min-height traci kartę po wyłączeniu globalnego cardize. Subtelne, ale spójne z kodem.
5. **Masonry Lite wymusza karty, ale nie ujednolica ich wyglądu** — per-column border/radius/padding nadal
   nadpisują pojedyncze karty (lock dotyczy samego włączenia, nie wartości).
6. **Globalne kolory zapisane jako hex** (`#f8fafc`/`#e2e8f0`) Advanced opisuje jako „Custom color"
   (nie „Theme surface/border color"); swatch przy wartości var() pokazuje hex-fallback. Czysto kosmetyczne.
7. **Asymmetric w Wizardzie wciąż bez „Reapply"** (z 28-05, nadal aktualne wg kodu `GridColumnsWizardEditor`):
   Wizard ma tylko karty wariantów; wybór Asymmetric nie zmienia widocznie układu, gdy kolumny mają jawne równe
   spany, a Wizard nie oferuje przycisku Reapply (jest tylko w Visual).
8. **Sumy spanów są celowo „nie-pilnowane"** (`gridColumnsOverflowDecision = "no-runtime-guard"`): >12 zawija
   do kolejnego rzędu, <12 zostawia puste miejsce; diagnostyka „Current row width totals" komunikuje to per breakpoint.
9. **Długi, przewijalny panel bez zwijania sekcji** — przy włączonym Highlight + cardize sekcja per-column robi się obszerna.

---

## 6. Czego NIE dało się w pełni zweryfikować (not-testable) — z dokładną przyczyną

- **Natywny color-picker (paleta systemowa).** Swatche to `<input type="color">`. Wartości ustawiałem
  programowo (`fill` → poprawnie propaguje do DOM), ale **systemowego popupu wyboru koloru Playwright nie
  steruje** (to chrome przeglądarki/OS). Weryfikowalny jest wynik (zmiana koloru), nie sam akt klikania w paletę.
- **Select „Content area count" w Visual** — **disabled** w tym fixturze (aktywne sloty Structure). Liczbę
  kolumn da się zmieniać wyłącznie przez „Add Column"/„Remove" w **Structure** (co przetestowano). Sam select
  pozostaje nieklikalny z założenia.
- **Przyciski „Add one column" / „Remove one column" w Visual** — **disabled** gdy istnieją sloty Structure.
- **Block-level „Move Grid Columns up/down"** (nagłówek bloku w canvas) — **disabled**, bo na stronie jest
  tylko jeden blok; nie da się wykonać realnego przeniesienia bloku.
- **Drag & drop** widgetu z biblioteki do slotu kolumny / drag-reorder slotów — nie wykonane (reorder
  testowano przyciskami Move up/down, które dają ten sam efekt danych).
- **Save draft / Publish** — świadomie pominięte, by nie nadpisać fixtura. W efekcie **moje edycje są tylko
  sesyjne**; front renderuje zapisany stan fixtura, a zgodność admin↔front potwierdzono na poziomie kontraktu
  renderera (te same atrybuty i logika klas), nie przez wypchnięcie konkretnych zmian.
- **Shared „Device visibility" bloku** w adminie pokazuje w Advanced „Shown on: Hidden on all devices" —
  to **współdzielona kontrolka bloku**, nie część widgetu grid-columns; poza zakresem audytu (podgląd admina
  i tak renderuje widget). Odnotowane jako obserwacja, nie błąd grid-columns.

---

## 7. Podsumowanie

- **Domknięto luki z 28-05:** przeklikano komplet per-column style selectów, wszystkie gałęzie
  cardize/overflow/min-height/vertical-alignment, pozostałe tokeny layoutu (gap, items-*, xl/2xl, tablet/phone,
  reverse, presety, reapply asymmetric, swatche + Clear) oraz kontrolki Structure (Add/Remove/Move) osiągalne z tego fixtura.
- **Wszystkie sprawdzone kontrolki działają**, podgląd aktualizuje się na żywo, stan trzyma się w UI, Advanced
  wiernie raportuje stan, a precedencja override↔global jest poprawna i przewidywalna.
- **Front renderuje się poprawnie**: SSR 200, 3 kardyzowane kolumny, poprawne zawijanie (desktop) i stackowanie
  (mobile), **brak poziomego overflow**, **0 błędów konsoli**, **brak wycieku etykiet**.
- **Brak błędów krytycznych i regresji.** Pozostałe obserwacje to świadome ograniczenia (sekcja 6) oraz
  niuanse UX (sekcja 5) — głównie guard widoczności, zarządzanie liczbą kolumn w Structure i zachowanie presetów.
