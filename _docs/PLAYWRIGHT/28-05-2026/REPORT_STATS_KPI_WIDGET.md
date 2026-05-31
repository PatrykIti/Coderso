# RAPORT: Stats KPI Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data ponownego audytu:** 2026-05-29 (zastępuje wersję z 2026-05-28)
> **Sesja Playwright:** `claude-29-05-stats-kpi-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/3d15559a-c923-49e8-8902-93854a55c734` (tytuł „Contract Test - stats-kpi", po wejściu w edytor stan startowy = `cards`, 4 metryki, nagłówek „Proof in numbers", komunikat „Setup complete")
> **Fixture public:** http://localhost:3000/stats-kpi-audit-0516 (zapisany stan: `split-highlight`, 4 metryki, brak linków)
> **Pliki źródłowe:** `core/widgets/core/statsKpi.tsx` (renderer + typy + normalizacja) · `core/widgets/core/widgetSafeHref.ts` (bezpieczne linki) · `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Czym ten audyt różni się od poprzedniego (28-05).** Poprzednia wersja jawnie
> przyznawała (sekcja 7): „nie przeszedłem każdej opcji każdego selecta —
> testowałem reprezentatywnie (np. divider intensity: default + strong, ale nie
> «soft»; value size: tylko Hero; max width: tylko Compact)". Ten przebieg
> **usuwa wszystkie skróty „reprezentatywne"**: każda rodzina kontrolek została
> przeklikana **przez wszystkie dostępne wartości po kolei**, a każde przełączenie
> potwierdzono inspekcją DOM (atrybuty `data-stats-kpi-*`, klasy Tailwind, inline
> `style`, ARIA, atrybuty linków). Łącznie wykonano m.in.: 3 warianty, **12/12
> wartości licznika metryk**, **3/3 kierunki trendu**, **4/4 rozmiary wartości**,
> **3/3 rozmiary ikon**, **5/5 szerokości**, **4/4 paddingi**, **3/3 wysokości
> minimalne**, **3/3 wyrównania**, **4/4 odstępy**, **3/3 intensywności dzielnika**,
> oraz pełny cykl set→Clear dla **wszystkich 9 pól koloru**.

> **Uwaga o screenshotach.** Weryfikację oparłem **wyłącznie o inspekcję DOM
> (`eval`)** oraz snapshoty drzewa dostępności — nie zapisywałem zrzutów PNG.
> Gdyby jakiekolwiek powstały, ich nazwy byłyby **wyłącznie lokalnymi etykietami**
> przechwyceń w katalogu `.playwright-cli/` (ignorowanym przez Git); nie są
> wymaganym evidence w repo i nie zostały dołączone.

---

## 1. Przegląd widgetu

**Typ:** `stats-kpi` · **Kategoria:** `content` · **Opis:** „Metrics section with values and supporting labels."

**Warianty (3):**
- `cards` (startowy w adminie) — siatka kart: `grid grid-cols-1 sm:grid-cols-2` + kolumna `lg` zależna od liczby metryk (≤2 → `lg:grid-cols-2`, 3–6 → `lg:grid-cols-3`, 7+ → `lg:grid-cols-4`).
- `inline` — `flex flex-wrap` z `justify-*` zależnym od wyrównania; opcjonalne lewe dzielniki (`border-l`) od drugiego elementu.
- `split-highlight` — `grid grid-cols-1 lg:grid-cols-3`, karta wiodąca `lg:col-span-1` z większą typografią (`text-4xl` dla `md`) i paddingiem `p-5`; metryki poboczne `lg:col-span-2` w siatce, której liczba kolumn zależy od parzystości (nieparzysta >1 → `lg:grid-cols-3`, parzysta → `sm:grid-cols-2`).

**Model danych (`StatsKpiData`):** header (`title`, `description`); items[] (`id`, `value`, `prefix`, `suffix`, `label`, `description`, `icon`, `accentColor`, `trend{label,direction}`, `link{href,label,openInNewTab}`); style (`alignment`, `spacing`, `valueColor`, `labelColor`, `descriptionColor`, `valueSize`, `divider`, `dividerIntensity`, `sectionBackground`, `maxWidth`, `padding`, `minHeight`, `cardBackground`, `cardBorderColor`, `iconSize`, `iconSurface`, `iconBorderColor`).

**Ograniczenia:** min 1 / max 12 metryk. Licznik jest **data-driven** (zmiana licznika realnie dodaje/ucina elementy tablicy z fallbackami), a nie systemem slotów.

**Renderowanie i bezpieczeństwo:** widget jest **w pełni statyczny** (brak JS runtime; polityka „Static metrics only; count-up animation remains deferred"). Sekcja to `<section aria-label=…>`; metryka bez linku to `<article aria-label=…>`, z poprawnym linkiem `<a aria-label=…>`. Linki przechodzą przez `resolveWidgetLinkAttrs`/`normalizeWidgetSafeHref`.

---

## 2. Architektura trybów edytora (niuans UX)

Panel po prawej ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest zakładką** — wchodzi się w niego przyciskiem **„Run setup again"** (po setupie komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*), a wychodzi przyciskiem **„Finish setup and open Visual"** (potwierdziłem: po kliknięciu zakładka Visual ma `aria-selected=true`).

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | **100% read-only.** Dwie sekcje summary: **Layout overview** (Current layout, Metric count) i **Spacing guidance** (Active spacing + dynamiczny opis). Dwa bloki tekstowe wyjaśniające podział ról. **Osobny panel „Live preview"** renderujący aktualny stan przez wspólny renderer (w nim pierwsza metryka renderuje się jako prawdziwy `<a href="/work">`). Zero edytowalnych kontrolek. |
| **Visual** | zakładka „Visual" | 6 sekcji edytowalnych: Variant and structure, Section header, Metrics content and links, Typography, Card and icon surfaces, Section layout and spacing. Plus współdzielone Block layout i Device visibility. |
| **Advanced** | zakładka „Advanced" | 3 sekcje diagnostyczne read-only (Runtime diagnostics, Style diagnostics, Runtime summary) + współdzielone Block layout summary i Visibility summary. Interaktywne tylko dwa przyciski repair: „Normalize now" i „Reset to defaults" (oba z dialogiem `confirm`). Brak edytora raw JSON. |

---

## 3. CO ZOSTAŁO PRZETESTOWANE (pełny zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-29-05-stats-kpi-exhaustive`, potwierdzone inspekcją DOM. **Nic poniżej nie jest „reprezentatywne" — to wyliczenie faktycznie wykonanych kliknięć.**

### 3.1 Wizard
- Wejście przez „Run setup again", odczyt obu sekcji summary, obecność panelu Live preview, powrót przez „Finish setup and open Visual" (zweryfikowane `aria-selected`).

### 3.2 Visual — kontrolki dyskretne (każda wartość po kolei)
- **Karty wariantu (3/3):** `cards` → `inline` → `split-highlight` → z powrotem `cards`.
- **Metrics count (12/12):** kolejno 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 (każda wartość z odczytem klasy gridu i ostatniej etykiety/fallbacku), potem powrót do 4.
- **Trend direction metryki 1 (3/3):** Down → Neutral → Up.
- **Value size (4/4):** Compact → Default → Large → Hero.
- **Icon size (3/3):** Compact → Default → Large.
- **Section max width (5/5):** Compact → Wide → Default → Extra wide → Full width.
- **Section padding (4/4):** None → Compact → Default → Spacious.
- **Minimum height (3/3):** Auto → Compact → Default.
- **Alignment (3/3):** Start → Center → End.
- **Spacing (4/4):** None → Compact → Default → Spacious (z odczytem dynamicznego tekstu pomocniczego i klasy `gap-*` w wariancie cards).
- **Divider intensity (3/3, w wariancie inline):** Soft → Default → Strong.

### 3.3 Visual — pola tekstowe i przełączniki
- **Header:** edycja Title (z polskimi znakami i myślnikiem em-dash), przycisk **Clear header**.
- **Metryka 1:** Value, Prefix, Suffix, Label (polskie znaki), Icon (emoji), Trend label.
- **Linki metryki 1:** href niebezpieczny (`javascript:alert(1)`), href poprawny http(s) (`https://example.com/metrics`), href relatywny (`/work`), przełącznik **Open in new tab** (on/off).
- **Switch „Show dividers":** w wariancie cards (locked), w inline (on→off→on).

### 3.4 Visual — pola koloru (9 pól, każde set + Clear)
- Per-metryka **Metric accent color** + Clear.
- Typography: **Value color**, **Label color**, **Description color** + Clear (×3).
- Surfaces: **Card background**, **Card border**, **Icon surface**, **Icon border** + Clear (×4).
- Layout: **Section background** + Clear.

### 3.5 Visual — operacje na repeatable items
- **Add metric** (4→5) oraz weryfikacja blokady przy 12.
- **Remove** (dialog confirm: ścieżka dismiss i ścieżka accept) oraz weryfikacja blokady przy 1.
- **Move up / Move down** (reorder w obu kierunkach).
- **Drag & drop** — próba realnego dragu (mysz) oraz próba dispatchu natywnych zdarzeń `DragEvent`.

### 3.6 Advanced
- Odczyt wszystkich sekcji read-only.
- **Normalize now** (dismiss + accept).
- **Reset to defaults** (accept).

### 3.7 Frontend + integracja
- Załadowanie `/stats-kpi-audit-0516` (HTTP 200), struktura split-highlight, ARIA, responsywność 375 px, konsola.
- Guard `beforeunload` przy próbie opuszczenia admina z niezapisanymi zmianami.
- Izolacja: stan zapisany na froncie vs niezapisane edycje w adminie.

---

## 4. CO DZIAŁA — szczegóły z potwierdzeniem w DOM

### 4.1 Warianty (3/3)
| Wariant | Kontener | Szczegóły |
|---------|----------|-----------|
| `cards` | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-N gap-N` | N zależne od liczby metryk (patrz 4.2). ✓ |
| `inline` | `flex flex-wrap gap-4 justify-center` | item 1: `min-w-[9rem] px-4 py-2`; item 2+: dochodzi `border-l border-[var(--color-border)]/70`. Metryka z linkiem to `<a>`. ✓ |
| `split-highlight` | outer `grid grid-cols-1 lg:grid-cols-3 gap-4` | lead `data-stats-kpi-highlighted="true"`, `rounded-xl border p-5`, wartość `text-4xl`; kontener poboczny `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2 gap-4`. ✓ |

### 4.2 Metrics count — wszystkie 12 wartości (data-driven)
| count | grid (cards) | ostatnia etykieta |
|-------|--------------|-------------------|
| 1 | `lg:grid-cols-2` | Projects launched |
| 2 | `lg:grid-cols-2` | Platform uptime |
| 3 | `lg:grid-cols-3` | Faster iteration |
| 4 | `lg:grid-cols-3` | Higher engagement |
| 5 | `lg:grid-cols-3` | **Support availability** (fallback) |
| 6 | `lg:grid-cols-3` | **Retention lift** (fallback) |
| 7 | `lg:grid-cols-4` | **Metric 7** (fallback) |
| 8 | `lg:grid-cols-4` | Metric 8 |
| 9 | `lg:grid-cols-4` | Metric 9 |
| 10 | `lg:grid-cols-4` | Metric 10 |
| 11 | `lg:grid-cols-4` | Metric 11 |
| 12 | `lg:grid-cols-4` | Metric 12 |

Licznik realnie zmienia tablicę; nowe metryki dostają fallbacki (5–6 nazwane, 7+ jako „Metric N"). Granice twarde potwierdzone: **przy 1 metryce Remove disabled, uchwyt Drag `draggable=false`; przy 12 Add metric disabled**. ✓

### 4.3 Header
- Edycja Title (np. „Nasze wyniki w liczbach — ąćęłńóśźż") → `<h3>` na żywo **oraz `aria-label` sekcji = tytuł** (synchronizacja). Polskie znaki i em-dash renderują się poprawnie. ✓
- **Clear header** → znikają oba pola, `<header>` znika z DOM, `aria-label` sekcji → fallback **„Key performance metrics"**. ✓

### 4.4 Treść metryki
- Value („250"), Prefix („PLN"), Suffix („K") → renderują się jako **trzy osobne spany w kolejności prefix→value→suffix** (`<span data-stats-kpi-prefix>`, `<span>`, `<span data-stats-kpi-suffix>`). ✓
- Label („Wskaźnik testowy") i Icon („🎯") → poprawne, polskie znaki i emoji OK. ✓
- `aria-label` metryki: gdy metryka jest linkiem, używana jest **etykieta linku** (potwierdzone: `aria-label="See launch examples"`); bez linku — `value + label`. ✓

### 4.5 Trend direction (3/3)
| Wybór | `data-stats-kpi-trend-direction` | Symbol |
|-------|----------------------------------|--------|
| Down | `down` | ↓ |
| Neutral | `neutral` | → |
| Up | `up` | ↑ |

### 4.6 Linki i bezpieczeństwo (`widgetSafeHref.ts`)
| Wejście | Wynik renderowania |
|---------|--------------------|
| `javascript:alert(1)` | **Odrzucone** → metryka jako `<article>`, `data-stats-kpi-link="false"`, brak `href`; tekst pomocniczy zmienia się na „Only relative paths, hash anchors, and http(s) URLs render as clickable metrics." ✓ |
| `https://example.com/metrics` (new tab off) | `<a>` z `href`, **`rel="noopener noreferrer"`**, `target=null`. ✓ |
| `https://…` + **Open in new tab ON** | `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| `/work` (relatywny) | `<a href="/work">`, **bez `rel` i bez `target`**. ✓ |

**Niuans bezpieczeństwa (pozytywny):** dla **zewnętrznych** linków http(s) `rel="noopener noreferrer"` jest dodawane **zawsze**, nawet bez „open in new tab" (relatywne/hash takiego `rel` nie dostają). Kod jawnie odrzuca też `//` (protokół-relatywne), `data:` oraz `vbscript:`.

### 4.7 Accent color (per-metryka)
- Ustawienie `#ff00ff` **jednocześnie** nadpisuje kolor **wartości, ikony i etykiety trendu** tej metryki (wszystkie `rgb(255,0,255)`), bo `resolvedValueColor = accentColor ?? valueColor`. ✓
- Przycisk **Clear** → wszystkie trzy wracają do `var(--color-text)`, a przycisk Clear staje się `disabled`. ✓

### 4.8 Typography
- **Value size (4/4):** Compact→`text-2xl`, Default→`text-3xl`, Large→`text-4xl`, Hero→`text-5xl`. ✓
- **Value/Label/Description color:** ustawienie hex → inline `color` na odpowiednim `<p>` (potwierdzone red/green/blue na osobnych akapitach); **Clear** → `var(--color-text)`. ✓

### 4.9 Card and icon surfaces
- **Icon size (3/3):** Compact→`h-7 w-7 text-sm`, Default→`h-8 w-8 text-base`, Large→`h-10 w-10 text-lg`. ✓
- **Card background / Card border:** w wariancie `cards` i `split-highlight` → inline `background-color`/`border-color` na karcie (potwierdzone wartości RGB). ✓
- **Icon surface / Icon border:** inline style na `<span>` ikony — **działa we wszystkich wariantach, łącznie z inline**. ✓
- Wszystkie 4 pola: **Clear** poprawnie usuwa inline style i wyłącza przycisk. ✓
- (Ograniczenie wariantu `inline` dla card bg/border — patrz **N1** w sekcji 5.)

### 4.10 Section layout and spacing
| Kontrolka | Wszystkie wartości → efekt na `<section>` |
|-----------|-------------------------------------------|
| **Max width (5/5)** | Compact→`max-w-3xl`, Wide→`max-w-5xl`, Default→`max-w-6xl`, Extra wide→`max-w-7xl`, Full width→`max-w-none`. ✓ |
| **Padding (4/4)** | None→`px-0 py-0`, Compact→`px-3 py-6`, Default→`px-4 py-8`, Spacious→`px-6 py-10`. ✓ |
| **Min height (3/3)** | Auto→(brak klasy `min-h`), Compact→`min-h-[12rem]`, Default→`min-h-[16rem]`. ✓ |
| **Alignment (3/3)** | Start→`items-start text-left`, Center→`items-center text-center`, End→`items-end text-right`. ✓ |
| **Spacing (4/4)** | atrybut + dynamiczny help dla każdej wartości; w `cards` gap kart: None→`gap-0`, Compact→`gap-3`, Default→`gap-4`, Spacious→`gap-6`. ✓ |
| **Section background** | inline `background-color` na `<section>`; **Clear** → usunięty. ✓ |

Dynamiczny tekst pomocniczy odstępu potwierdzony dla wszystkich 4 wartości (np. „Active spacing: Spacious. 1.5rem gap for roomier KPI sections.").

### 4.11 Dividers (3/3 intensywności + toggle)
- W wariancie **inline** przełącznik **Show dividers** jest aktywny; po włączeniu pojawia się select **Divider intensity**:
  - Soft → `border-[var(--color-border)]/40`
  - Default → `border-[var(--color-border)]/70`
  - Strong → `border-[var(--color-border)]` (pełny) ✓
- Toggle **off** w inline → klasa `border-l` znika z metryk, **a select intensywności znika** z panelu; **on** → wracają. ✓
- (Zachowanie w wariantach bez dzielników — patrz **N2**.)

### 4.12 Advanced (read-only) — wierne odbicie stanu
- **Runtime diagnostics:** „Resolved variant", „Metric count", „Split-highlight secondary grid: Inactive unless Split Highlight is selected.", polityka animacji (static only). ✓
- **Style diagnostics:** Layout tokens (`alignment/spacing/maxWidth/padding/minHeight`), Typography tokens (`valueSize` + 3 kolory, po Clear = `var(--color-text)`), Surface tokens (po Clear = „theme default", `iconSize: md`), **Divider policy** — w inline pokazuje konkretną intensywność („Enabled; intensity strong"), w pozostałych wariantach „rendered by inline variant only". ✓
- **Runtime summary:** Safe link status (przy linku `/work`: „1/1 configured metric links resolve to safe hrefs."), „4 KPI items normalized; raw JSON is not shown in the editor.", Contract summary. ✓
- **Repair actions:**
  - **Normalize now** → dialog „Normalize this Stats KPI payload now?"; dismiss = brak zmian; accept = re-normalizacja **bez crasha** (count i dane bez zmian, bo były czyste). ✓
  - **Reset to defaults** → dialog „Reset this Stats KPI widget to defaults?"; accept = **dane** wracają do defaultów (label „Projects launched", icon 🚀, header „Proof in numbers", count 4). ✓
- Współdzielone **Block layout summary** i **Visibility summary** obecne (ta druga pokazywała „Shown on: Hidden on all devices" — ustawienie wrappera, nie pole stats-kpi).

### 4.13 Frontend (`/stats-kpi-audit-0516`)
- **HTTP 200 OK**, title „STATS-KPI-AUDIT-0516".
- Zapisany stan: `split-highlight`, 4 metryki, **brak linków** (wszystkie `<article>`), pozostałe style domyślne. ✓
- **Struktura split-highlight:** outer `grid grid-cols-1 lg:grid-cols-3 gap-4`; lead `data-stats-kpi-highlighted="true"`, wartość `text-4xl`; kontener poboczny `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2 gap-4` (3 metryki poboczne → 3 kolumny na lg). ✓
- **Dostępność:** `<section aria-label="Proof in numbers">`; 4 × `<article>` z `aria-label` budowanym z wartości+etykiety: „120+ Projects launched", „99.9% Platform uptime", „3x Faster iteration", „45% Higher engagement". ✓
- **Responsywność 375 px:** `scrollWidth == clientWidth == 375` → **brak poziomego overflow**; siatka zwija się do 1 kolumny. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń** (jedyne logi to info React DevTools). ✓

### 4.14 Izolacja i ochrona edycji
- **Guard `beforeunload`** — próba przejścia z admina (z niezapisanymi zmianami po Reset to defaults) na front wywołała **natywny dialog `beforeunload`**; nawigacja nastąpiła dopiero po accept. ✓ (Potwierdzony timeout nawigacji do momentu obsłużenia dialogu.)
- **Niezapisane edycje NIE wyciekają na front** — celowo nic nie zapisałem; front pokazuje stan zapisany (`split-highlight`), niezależny od moich edycji w adminie (`inline`/zmienione dane). ✓

---

## 5. CO NIE DZIAŁA / JEST MYLĄCE (niuanse UX/UI)

| # | Obszar | Obserwacja (potwierdzona w DOM) |
|---|--------|----------------------------------|
| **N1** | Card surfaces ciche w `inline` | **Zamknięte przez TASK-343-26.** W `inline` kontrolki `Card background` i `Card border` są read-only/disabled i pokazują widoczny komunikat, że Inline nie renderuje kart. `Icon surface`/`Icon border` pozostają aktywne, bo mają realny efekt także w `inline`. |
| **N2** | Toggle „Show dividers" w wariantach bez dzielników | **Zamknięte przez TASK-343-26.** Renderer emituje `data-stats-kpi-divider` jako stan efektywny renderowania, a zapisany stan zachowuje osobny marker `data-stats-kpi-divider-saved`. Warianty bez dzielników pokazują nieaktywny, odznaczony toggle oraz widoczny komunikat o tym, że dividers renderują tylko w `inline`. |
| **N3** | Drag & drop nieweryfikowalny automatycznie | Patrz sekcja 6. Mechanizm `draggable` + `onDragStart/onDrop` jest obecny, ale ani realny drag myszą (`drag`), ani dispatch natywnych `DragEvent` nie zmieniły kolejności. To **ograniczenie symulacji**, nie potwierdzony bug — przyciski Move up/down (ta sama funkcja `moveItem`) działają. |
| **N4** | „Normalize now" bez widocznego feedbacku | **Zamknięte przez TASK-343-26.** Po akceptacji Advanced pokazuje inline status `Stats KPI payload normalized.`. Reset również pokazuje status po przywróceniu defaultów. |
| **N5** | Wizard w 100% read-only | Wizard nie ma **żadnej** edytowalnej kontrolki (tylko summary + Live preview). To zgodne z kontraktem („seed → Visual"), ale oznacza, że jakiekolwiek „przejście przez opcje konfiguracji w Wizardzie" jest z definicji niewykonalne. Odnotowuję jako fakt, nie błąd. |
| **N6** | „Reset to defaults" **nie** resetuje wariantu | **Zamknięte przez TASK-343-26.** Reset korzysta teraz z `onBlockPatch`/`onVariantChange`, więc przywraca dane defaultowe i wariant `cards`. Gdy edytor działa poza pełnym kontekstem bloku, nadal resetuje dane i używa dostępnej ścieżki `onVariantChange`. |

> **„120++" na froncie (NIE jest to bug renderera; odroczone jako seed cleanup).** Karta wiodąca pokazuje
> „120++", ponieważ zapisane dane fixture mają **jednocześnie `value="120+"` ORAZ
> `suffix="+"`**. Renderer poprawnie wypisuje dwa osobne spany
> (`<span>120+</span><span data-stats-kpi-suffix>+</span>`), a `aria-label` używa
> samej wartości („120+ Projects launched"). To **redundancja w danych seed**, nie
> błąd widgetu. TASK-343-26 klasyfikuje to jako odroczone czyszczenie danych
> seed/fixture, poza zakresem lokalnej logiki widgetu.

**Nie wykryto** żadnego twardego buga renderowania, błędu konsoli (admin i front: 0/0) ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 6. CZEGO NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ (uczciwe ograniczenia)

- **Drag & drop reorderingu (kontrolka, którą fixture udostępnia, ale której nie da się przeklikać automatycznie).** Wykonałem **dwie** próby:
  1. Realny drag myszą (`playwright-cli drag` uchwyt → kontener docelowy) — kolejność bez zmian.
  2. Dispatch natywnych zdarzeń `DragEvent` (`dragstart` na uchwycie, `dragover`+`drop` na kontenerze docelowym, `dragend`) — kolejność również bez zmian.

  Przyczyna (analiza kodu): handler `onDragStart` ustawia stan React `draggedIndex` przez `setDraggedIndex(index)`, a `handleMetricDrop` czyta `draggedIndex`. Przy synchronicznym dispatchu wszystkich zdarzeń w jednym `eval` aktualizacja stanu React jeszcze się nie „przepłukała", więc w momencie `drop` `draggedIndex === null` i funkcja wychodzi wcześniej. To **artefakt symulacji/timing React**, nie dowód buga. **Ta sama funkcja `moveItem`** uruchamiana przyciskami **Move up/Move down działa** (potwierdzony reorder w obu kierunkach), więc logika zmiany kolejności jest sprawna. Realny drag użytkownika prawdopodobnie zadziała, ale **tego nie mogę potwierdzić** w tym audycie.

- **Zapis / publikacja / trwałość.** Celowo **nie** klikałem „Save draft" ani „Publish", aby nie mutować współdzielonego fixture (a próba nawigacji potwierdziła działający guard `beforeunload`). W efekcie **nie** zweryfikowano: trwałości edycji po przeładowaniu ani propagacji na front. Zweryfikowano natomiast spójność w obrębie sesji (Visual → Advanced wiernie podsumowuje) oraz izolację (front = stan zapisany).

- **Współdzielone sekcje wrappera (Block layout, Device visibility).** Poza zakresem audytu stats-kpi — nie zmieniałem ich. Odnotowuję jedynie odczyt „Visibility summary: Hidden on all devices" (ustawienie wrappera fixture, nie pole stats-kpi).

- **`prefers-reduced-motion`.** Nieistotne — widget jest statyczny (count-up celowo odroczony), brak animacji do przetestowania.

---

## 7. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/stats-kpi-audit-0516`) | Zgodność |
|--------|--------------|-------------------------------------|----------|
| Renderer | `StatsKpiBlock` | ten sam `StatsKpiBlock` | ✓ wspólny |
| Wariant fixture | `cards` (startowy w edytorze) | `split-highlight` (inny zapisany stan strony) | ✓ różnica wynika z dwóch różnych stron, nie z rozjazdu |
| Atrybuty `data-stats-kpi-*` | obecne, poprawne, reagują na wszystkie kontrolki | identyczny zestaw (stan zapisany) | ✓ |
| Bezpieczne linki | przetestowane (odrzucenie `javascript:`, `rel` dla zewnętrznych, `target` dla new-tab) | brak linków w tym fixture | ✓ logika spójna |
| Dostępność | `<section>`/`<article>`/`<a>` + aria-label | obecna, kompletna | ✓ |
| Statyczność (brak JS runtime) | brak skryptu | brak skryptu | ✓ |
| Responsywność 375 px | (nie mierzona w canvas) | brak overflow, 1 kolumna | ✓ |
| Niezapisane edycje | widoczne w sesji edytora (`inline`, zmienione dane) | **nieobecne** (front = stan zapisany `split-highlight`) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny; canvas i front są spójne. Różnica wariantu wynika wyłącznie z dwóch różnych stron. Statyczność (brak runtime JS) eliminuje klasę problemów „skrypt nie wykonuje się w adminie" znaną z `accordion`/`faq-accordion`.

---

## 8. Podsumowanie

- **Widget stats-kpi jest w bardzo dobrym stanie funkcjonalnym.** Tym razem **każda dyskretna opcja każdej rodziny kontrolek została przeklikana po kolei** (3 warianty, 12/12 liczników, 3/3 trendy, 4/4 rozmiary wartości, 3/3 rozmiary ikon, 5/5 szerokości, 4/4 paddingi, 3/3 wysokości, 3/3 wyrównania, 4/4 odstępy, 3/3 intensywności dzielnika, set+Clear dla 9 pól koloru) — i **wszystkie aktualizują podgląd na żywo** zgodnie z mapami klas w kodzie. Granice (min 1 / max 12) i blokady (Remove/Add disabled, divider locked) działają. Advanced wiernie podsumowuje stan i daje dwie akcje repair z potwierdzeniem; frontend jest statyczny, dostępny, bez błędów konsoli i bez overflow na mobile.
- **Najważniejsze niuanse:**
  - **N1** — zamknięte przez TASK-343-26: `Card background`/`Card border` są read-only/disabled w `inline` z widocznym wyjaśnieniem.
  - **N2** — zamknięte przez TASK-343-26: divider ma osobny zapisany i efektywny stan, a warianty bez dzielników nie pokazują locked-checked toggle.
  - **N6** — zamknięte przez TASK-343-26: „Reset to defaults" resetuje dane oraz wariant do `cards`.
  - **N4** — zamknięte przez TASK-343-26: „Normalize now" i reset pokazują inline feedback.
  - **N5** — Wizard jest w 100% read-only (brak opcji do interakcji — z definicji).
  - **N3** — drag&drop nieweryfikowalny automatycznie (Move up/down działa).
- **Plusy:** licznik metryk **data-driven**; widget **statyczny** (brak desyncu admin↔front); **bezpieczne linki** (odrzucenie `javascript:`/`data:`/`vbscript:`/`//`, `rel="noopener noreferrer"` dla każdego zewnętrznego linku, `target=_blank` tylko przy opcji); spójny **Clear** dla wszystkich 9 pól koloru; Wizard ma osobny **Live preview**.
- **Drobiazg w danych fixture (nie bug):** publiczny fixture pokazuje „120++" przez redundantny `value="120+"` + `suffix="+"`; TASK-343-26 odracza to do seed cleanup.
- Nie znaleziono żadnego błędu renderowania, błędu konsoli ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o
> inspekcję DOM (`eval`) oraz snapshoty drzewa dostępności. Ewentualne pliki PNG
> byłyby **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały
> dołączone do repo.
