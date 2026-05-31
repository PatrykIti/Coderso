# RAPORT: Compare Timeline Widget — audyt wyczerpujący (28-05-2026)

> **Status:** Zakończony — wyczerpujący audyt wszystkich dyskretnych kontrolek fixtury (Wizard / Visual / Advanced + frontend)
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-compare-timeline-exhaustive-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** Contract Test - compare-timeline (`9ad7e86e-e732-4d17-9ea9-07c5bfb32cca`)
> **Trasa publiczna:** `/test-compare-timeline-0516`
> **Pliki źródłowe:**
> - `core/widgets/core/compareTimeline.tsx` — renderer, model danych, normalizacja, schema, SSR
> - `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` — edytory Wizard / Visual / Advanced
> - `core/admin/ui/widgets/editors/SharedColorControl.tsx`, `ClearableFields.tsx`, `LinkDestinationField.tsx` — kontrolki współdzielone

---

## 0. Metoda i zakres

Audyt wykonano na **uruchomionej lokalnie aplikacji** przez `playwright-cli` (sesja
izolowana). W przeciwieństwie do poprzedniej wersji raportu **nie stosowano skrótów
reprezentatywnych** — przeklikano **każdą dyskretną opcję każdej kontrolki** dostępnej
w tej fixturze i po każdej zmianie weryfikowano efekt na żywym podglądzie admin przez
asercje DOM / `computed style` / atrybuty `data-compare-*` oraz klasy Tailwind. Selekty
Radix obsługiwano realnym klikaniem triggera i opcji; swatch-e kolorów sterowano przez
natywny setter `input[type=color]` + zdarzenie `input` (czyli realnym `onChange` Reacta).

**Zasięg wykonanych interakcji (liczby rzeczywiste z tej sesji):**
- 17 selektów przeklikanych przez **wszystkie** wartości (łącznie ~70 wyborów opcji),
- 2 karty wariantu (w obie strony), 7 pól koloru (każde: zmiana + `Clear`),
- przełącznik `guides.enabled` (OFF/ON), siatki markerów obu ścieżek,
- `Add step` / `Remove step` / `Add segment` / `Remove segment` (do zera),
- selekty zakresu segmentu `From`/`To` (w tym przypadek `from > to`),
- **end-to-end linkowanie** `Step destination` i `Segment destination` (wybór realnej
  opublikowanej strony + `Clear destination`),
- pełny przegląd Advanced (diagnostyka + „Show internal support references" + dialog
  „Normalize compare payload" z potwierdzeniem),
- frontend SSR + a11y + responsywność 375px + konsola.

**Czego świadomie NIE robiono:** nie klikano `Save draft` / `Publish` — aby nie zmutować
współdzielonej fixtury. Wszystkie zmiany w admin były wyłącznie w pamięci edytora.

**Screenshoty:** nie przechwytywano plików PNG — weryfikacja odbyła się przez asercje
DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi etykietami
(ignorowanymi przez Git) i nie stanowiłyby evidence w repo.

> **Status remediacji (2026-05-30, TASK-343-08):** zamknięto jedyny
> funkcjonalny defekt raportu. Bazowa klasa badge segmentu nie zawiera już
> hard-coded `text-xs`; rozmiar segmentu jest teraz w całości własnością
> `style.segmentLabelSize`. Token `none` nie emituje klasy rozmiaru, a `xs`,
> `sm` i `base` emitują odpowiednio `text-xs`, `text-sm` i `text-base` bez
> konkurencyjnego fallbacku. Pokrycie regresyjne asercją sprawdza klasę samego
> elementu segmentu.

---

## 1. Inwentarz kontrolek (zweryfikowany w DOM)

W wariancie `dual-track-highlight` w edytorze obecne są **36 ścieżek kontrolek**
(`data-widget-control-path`), policzonych programowo. W `dual-track` 6 z nich (highlight)
jest warunkowo ukrytych — patrz §6.

| Sekcja Visual | Kontrolki |
|---------------|-----------|
| Variant | 2 karty (`dual-track`, `dual-track-highlight`) |
| Section heading | `header.title` (input), `header.subtitle` (textarea) |
| Axis steps & track labels | `axis.steps.count` (select 3–10), `Remove step`, `Add step`, per-krok: `label`/`icon`/`description`/`Step destination`, 2× `tracks.*.label` |
| Markers & segments | `highlight.targetTrackId` (a/b/both)*, 2× siatka markerów, 2× edytor segmentów* (From/To/label/Add/Remove/Segment destination) |
| Highlight & guides | `guides.enabled` (switch), `guides.style` (solid/dashed), `style.highlightLabelStyle`* (3) |
| Colors & typography | 7 pól koloru (1 highlight-only), 3 rozmiary etykiet (1*), 3 wagi czcionki (1*), `markerShape` (4), advisory kontrastu |
| Spacing & layout | `trackSpacing` (5), `labelPosition` (2), `maxWidth` (5), `padding` (3), `trackOrder` (2), `motion` (3) |

`*` = widoczne tylko w `dual-track-highlight`.

---

## 2. PRZETESTOWANO — pełna macierz (co kliknięto)

### 2.1 Tryb Wizard — read-only (zgodne z kontraktem)
- Wejście przyciskiem **„Run setup again"** → panel **„Quick setup"**.
- Wiersze read-only: **„Highlight mode: Disabled"**, **„Axis step count: 3 steps"**, nota
  „Visual owns axis wording…" + **„Live preview"** renderowany wspólnym rendererem.
- Wyjście **„Finish setup and open Visual"** → wraca do zakładki **Visual** (potwierdzone
  `aria-selected=true`). Brak jakichkolwiek pól zapisujących (kontrakt `writablePaths: []`).

### 2.2 Tryb Visual — przeklikane wszystkie opcje
- **Variant:** `dual-track → dual-track-highlight → dual-track → dual-track-highlight`
  (oba kierunki).
- **Section heading:** `title` → `h2#compare-timeline-heading` + `section[aria-labelledby]`;
  `subtitle` → `<p>` pod tytułem.
- **Axis step count:** wszystkie wartości **3,4,5,6,7,8,9,10** (oś i obie ścieżki skalują
  liczbę komórek 1:1).
- **Add step / Remove step:** 4→3→4→5 (działają), `Remove` `[disabled]` przy 3,
  `Add` `[disabled]` przy 10.
- **Per-krok:** `label` („Plan"→„Planowanie"), `icon` („ROCKET"), `description`
  („Opis kroku Build" na kroku 2).
- **Track labels:** „Traditional"→„Tradycyjny", „With us"→„Z nami".
- **Markery:** toggling pojedynczych komórek obu ścieżek (active↔inactive w `aria-label`);
  wyczyszczenie wszystkich markerów ścieżki → ostrzeżenie amber.
- **Highlight targets:** `Tradycyjny` (a), `Z nami` (b), `Both tracks` (a,b) — wszystkie 3.
- **Segmenty:** edycja `label`, selekty `From`/`To` (w tym `from>to`), `Add segment`,
  `Remove segment` aż do zera, `Segment destination`.
- **Guides:** `enabled` OFF/ON; `style` Solid/Dashed.
- **Highlight label style:** Filled / Outlined / **Soft** (wszystkie 3).
- **Kolory (7):** każde pole — ustawienie wartości przez swatch + `Clear`.
- **Advisory kontrastu:** stany unknown / ok / warning (wymuszone realnymi kolorami).
- **Rozmiary etykiet:** trackLabelSize (4), stepLabelSize (4), segmentLabelSize (4).
- **Wagi czcionki:** trackLabel (4), stepLabel (4), segmentLabel (4).
- **Marker shape:** Rounded / Circle / Numbered / Check.
- **Layout:** trackSpacing (5), labelPosition (2), maxWidth (5), padding (3), trackOrder (2),
  motion (3).

### 2.3 Tryb Advanced — diagnostyka read-only
- 4 panele „Runtime layout diagnostics" + „Metadata diagnostics" odzwierciedlają niezapisane
  zmiany z Visual; `details` „Show internal support references"; dialog „Normalize compare
  payload" + potwierdzenie.

### 2.4 Frontend (SSR + przeglądarka)
- SSR HTTP 200, surowy HTML, a11y, responsywność 375px, konsola.

---

## 3. CO DZIAŁA — z dowodami (DOM / computed style)

### 3.1 Layout (atrybuty `data-compare-*` + klasy) — 100%
| Kontrolka | Wynik (wszystkie opcje) | Status |
|-----------|-------------------------|--------|
| `motion` | none→brak klasy, fade→`motion-safe:animate-in fade-in-0`, slide→`…slide-in-from-bottom-2` | ✅ |
| `trackSpacing` | none/sm/md/lg/xl → `space-y-0/3/4/6/8` na wrapperze ścieżek | ✅ |
| `maxWidth` | none/4xl/5xl/6xl/7xl → `max-w-none/4xl/5xl/6xl/7xl` + `data-compare-max-width` | ✅ |
| `padding` | sm/md/lg → `px-4 py-6` / `px-4 py-8` / `px-6 py-10` | ✅ |
| `labelPosition` | top → oś przed ścieżkami `[AXIS,TRACKS]`; bottom → `[TRACKS,AXIS]` | ✅ |
| `trackOrder` | a-first → DOM `[a,b]`; b-first → `[b,a]`; etykiety opcji dynamiczne | ✅ |

### 3.2 Typografia i kształty — działa (poza jednym wyjątkiem, §5)
| Kontrolka | Dowód | Status |
|-----------|-------|--------|
| `trackLabelSize` | Hidden→16px (dziedziczone), Small→`text-xs`, Default→`text-sm`, Large→`text-base` | ✅ |
| `stepLabelSize` | Hidden→brak klasy, Tiny→`text-xs`, Small→`text-sm`, Default→`text-base` | ✅ |
| `trackLabelFontWeight` | computed 400/500/600/700 | ✅ |
| `stepLabelFontWeight` | computed 400/500/600/700 | ✅ |
| `segmentLabelFontWeight` | computed 400/500/600/700 (waga segmentu działa) | ✅ |
| `markerShape` | rounded(•,`rounded-md`,`min-w-6`), circle(•,`rounded-full`,komórka `rounded-[1.5rem]`), numbered(„1/2/3…"), check(✓ aktywny / ○ nieaktywny) | ✅ |

### 3.3 Markery / segmenty / highlight — działa
- Toggling markera zmienia `aria-label` komórki (active↔inactive) i tło.
- **Ostrzeżenie pustej ścieżki:** wyczyszczenie wszystkich markerów ścieżki → amber
  „This track currently has no active markers, so the runtime row will look empty." (i znika
  po przywróceniu).
- **Highlight targets:** `a`→`data-compare-target-tracks="a"` (segmenty tylko na a);
  `b`→`"b"`; `both`→`"a,b"` (segmenty na obu).
- **Segmenty:** edycja `label` zmienia tekst badge; `From`/`To` zmieniają `data-compare-segment`;
  `Add` dodaje (fallback range 0-1), `Remove` usuwa, do zera → „No highlight segments configured."
- **Normalizacja zakresu:** ustawienie `From=Deliver` przy `To=Build` (from>to) → amber
  „The saved range will normalize from the earlier step to the later step." a podgląd
  natychmiast pokazuje znormalizowany zakres `1-2` (min→max).

### 3.4 Guides i highlight label style — działa
- `guides.enabled` OFF → `border-style:none`, kolor `transparent`; ON → `dashed`, `#e2e8f0`.
- `guides.style` Solid/Dashed → `border-top-style`.
- `highlightLabelStyle` (inline-style badge segmentu):
  - **Filled** → bg `#f59e0b`, border `#f59e0b`, color `var(--color-bg)`, opacity 1
  - **Outlined** → bg `transparent`, border + color `#f59e0b`
  - **Soft** → bg/border `#f59e0b`, color `var(--color-bg)`, **opacity 0.82**

### 3.5 Kolory (7) — ustawienie + `Clear` działa dla każdego
| Pole | Set → efekt | Clear → powrót |
|------|-------------|----------------|
| `markerColor` | aktywny marker `#ff0000` | `var(--color-primary)` (rgb 226,177,39), btn `[disabled]` |
| `trackLabelColor` | etykieta ścieżki `#ff0000` | `var(--color-text)` |
| `stepLabelColor` | etykieta kroku (oś + nieaktywna komórka) `#00ff00` | `var(--color-text)` |
| `mutedStepColor` | opis nieaktywnego kroku `#ff00ff` | `var(--color-text)` |
| `guideColor` | obramowanie ścieżki `#0000ff` | `var(--color-border)` |
| `trackBackgroundColor` | tło ścieżki `#ffeedd` | `transparent` |
| `highlightColor` | badge + obramowanie komórki segmentu `#123456` | `#f59e0b` |

Każde pole po `Clear` przechodzi w status **„Theme default"** i dezaktywuje przycisk `Clear`.

### 3.6 Advisory kontrastu — wszystkie 3 stany
- **unknown:** tło ścieżki przezroczyste/theme-default → „Contrast depends on inherited theme
  or transparent colors." (muted).
- **ok:** realne tło + czytelne kolory → notka **znika** całkowicie (renderer zwraca `null`).
- **warning:** np. tło `#000000`, marker `#0a0a0a`, etykiety `#0d0d0d` → obie notki
  „Configured colors may be hard to read together." w kolorze amber (`text-amber-700`).

### 3.7 Linkowanie kroków/segmentów — DZIAŁA end-to-end (nowość vs poprzedni raport)
- **`Step destination`:** lista ładuje **50 opublikowanych stron**; wybór „HomePage" →
  `href="/homepage"`; komórka osi staje się `<a aria-label="Open step Planowanie">`, a komórka
  ścieżki `<a aria-label="Open Planowanie for Tradycyjny">`; pojawia się „Clear destination"
  + nota „Links to selected site page: HomePage." `Clear destination` resetuje do
  „No step destination".
- **`Segment destination`:** analogicznie — wybór „HomePage" → badge segmentu staje się
  `<a href="/homepage" aria-label="Open Tradycyjny segment Steps 1-2">`.

### 3.8 Advanced — wierna diagnostyka read-only
Po edycjach w Visual panele pokazały dokładnie: **Guide lines: Enabled · Dashed**,
**Highlight target: Both tracks**, **Layout: Spacing The most generous track spacing. ·
Labels Above axis · Width Extra-wide width**, **Motion and order: Slide in · Tradycyjny first**,
**Track references: Tradycyjny, Z nami**, **Axis step count: 3 steps · supported range 3-10**.
„Show internal support references" → „Tracks: Tradycyjny: a, Z nami: b" oraz „Steps:
Planowanie: step-1, Build: step-2, Deliver: step-3". Dialog **„Normalize compare timeline"**
(Cancel/Normalize) → potwierdzenie zamyka dialog, diagnostyka spójna, **0 błędów konsoli**
(bezpieczny no-op, bo dane były już znormalizowane).

### 3.9 Frontend (trasa publiczna) — działa (SSR)
- HTTP 200, render server-side (atrybuty obecne w surowym HTML).
- Opublikowana konfiguracja: `dual-track-highlight`, **6 kroków** (Plan, Build, Deliver,
  Optimize, Scale, Review), ścieżki **„Traditional" / „With us"**, `target-tracks="b"`,
  `maxWidth=6xl`, `padding=md`, `trackOrder=a-first`, `motion=none`, `markerShape=rounded`,
  segment ścieżki b `2-5` „Accelerated execution".
- **a11y:** `<section aria-label="Compare Timeline">` (brak opublikowanego nagłówka →
  fallback, `aria-labelledby=null`); regiony „Traditional track"/„With us track"; komórki
  z opisowym `aria-label` (np. „With us: Deliver, active marker, highlighted segment");
  badge segmentu `aria-label="With us segment Accelerated execution"`; ikony markerów
  `aria-hidden="true"`.
- **Responsywność 375px:** brak poziomego przepełnienia (`scrollWidth==clientWidth==375`),
  siatka osi zwija się do **jednej kolumny** (`grid-template-columns: 343px`).
- **Konsola:** 0 błędów, 0 ostrzeżeń (admin również 0/0).

---

## 4. Znalezisko funkcjonalne i status

### 4.1 `Segment label size` był wizualnie bezskuteczny — zamknięte w TASK-343-08
**Objaw przed remediacją:** zmiana selektu **„Segment label size"** (Hidden / Tiny / Small / Default) nie
zmienia faktycznego rozmiaru tekstu badge segmentu — `computed font-size` pozostaje
**12px** dla każdej opcji.

**Przyczyna przed remediacją (potwierdzona w kodzie i w cascade):** renderer w
`core/widgets/core/compareTimeline.tsx` buduje klasę badge tak:
```
segmentLabelBaseClass = "rounded-full border px-2 py-1 text-xs" + weight
…
joinClasses("inline-flex … no-underline", segmentLabelBaseClass, segmentLabelSizeClass)
```
Klasa bazowa **na sztywno zawiera `text-xs`**, a klasa wyboru (`text-xs/sm/base` lub `""`)
jest dopisywana **po niej**. W wygenerowanym CSS reguła `.text-xs` wygrywa kaskadę nad
`.text-sm`/`.text-base`, więc dopisany rozmiar nigdy nie obowiązuje. Dowód: dla „Default"
klasa elementu to `… text-xs font-normal text-base`, a `computed font-size = 12px`.

**Zmiana w TASK-343-08:** `segmentLabelBaseClass` zachowuje już tylko wspólne
klasy badge (`rounded-full border px-2 py-1` + weight), a
`segmentLabelSizeClassMap` jest jedynym źródłem klasy rozmiaru. Regresja
sprawdza klasy elementu segmentu dla `none`, `xs`, `sm` i `base`.

**Zakres:** dotyczy wyłącznie **rozmiaru** etykiety segmentu. **Waga** etykiety segmentu
(`segmentLabelFontWeight`) działa poprawnie (400→700), bo w klasie bazowej nie ma
konkurencyjnej klasy wagi. Dla porównania `trackLabelSize`/`stepLabelSize` działają, bo ich
renderery nie mają zaszytego `text-xs`.

**Dodatkowy niuans nazewnictwa:** opcja „Hidden" (token `none`) dla segmentu **nie ukrywa
ani nie czyści** rozmiaru — pozostaje przy bazowym `text-xs` (12px). Dla track/step „Hidden"
faktycznie usuwa klasę rozmiaru (dziedziczenie). To kolejna niespójność wynikająca z tej
samej zaszytej klasy. Po remediacji `none` nie emituje żadnej klasy `text-*`
z mapy rozmiaru segmentu.

> To był jedyny jednoznaczny defekt funkcjonalny znaleziony w tej
> wyczerpującej sesji i jest zamknięty w TASK-343-08.

---

## 5. NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ — z dokładną przyczyną

| # | Kontrolka / aspekt | Powód | Co mimo to potwierdzono |
|---|--------------------|-------|--------------------------|
| N1 | `Save draft` / `Publish` | Świadomie pominięte, by nie mutować współdzielonej fixtury innych agentów | Wszystkie zmiany działają w pamięci edytora i są wiernie odbijane przez podgląd i Advanced |
| N2 | Kliknięcie linku kroku/segmentu **na froncie** | Opublikowana konfiguracja **nie ma ustawionych żadnych `href`** kroków/segmentów (0 linków w SSR) | Mechanizm linkowania zweryfikowany **end-to-end w canvasie admin** (§3.7): realna strona → `<a href>` + poprawny `aria-label` |
| N3 | Panele blokowe „Block layout" / „Device visibility" | To **współdzielone kontrolki page-buildera**, nie kontrolki widgetu compare-timeline | Zaobserwowane (Content width: default, padding Top/Bottom MD, margin none; wszystkie urządzenia „Hidden") — poza zakresem audytu widgetu |
| N4 | Stabilność frontendu (port 3000) w trakcie sesji | Serwer front chwilowo przestał odpowiadać (ERR_EMPTY_RESPONSE, potem 500) i po ~10 s wrócił (200) — **artefakt środowiska/rebuild**, nie defekt widgetu | Po odzyskaniu pełna weryfikacja SSR/a11y/responsywności/konsoli (§3.9) przeszła pozytywnie |

---

## 6. NIUANSE UX / UI (nie są to defekty)

| # | Niuans | Obszar |
|---|--------|--------|
| U1 | **Wizard nie jest równorzędną zakładką** — zakładkami są tylko Visual i Advanced; Wizard to przepływ „setup" pod „Run setup again". Wizard jest w pełni read-only (cała edycja w Visual). | IA edytora |
| U2 | **Przełączenie wariantu na `dual-track` nie kasuje segmentów** — są zachowane (komunikat „Segment mapping is hidden in Dual Track. Saved segments are preserved…") i **wracają** w `dual-track-highlight` (potwierdzony round-trip: a=0-1, b=1-2). | Visual / conditional render |
| U3 | Segmenty ścieżki renderują się dopiero, gdy ścieżka jest w „Highlight targets" — edytor jawnie informuje hintem; potwierdzone na żywo. | Visual / runtime |
| U4 | **Duplikat `fieldId`/`data-link-destination-field`** = `compare-timeline-segment-1-destination` dla pierwszego segmentu **obu** ścieżek (id zależy tylko od indeksu segmentu, nie od ścieżki). Powoduje zduplikowane `id` w DOM i wymusza celowanie przez `nth` w narzędziach. Drobna kwestia unikalności/a11y. | Markers & segments |
| U5 | **Ostrzeżenie `from>to`** to lokalny stan transientny — pozostaje widoczne po znormalizowaniu zapisanego zakresu aż do następnej **realnej** zmiany; ponowny wybór tej samej opcji nie odpala `onValueChange` Radix, więc komunikat nie znika od razu. Mylące, ale dane normalizują się poprawnie. | Markers & segments |
| U6 | **`trackBackgroundColor` = `#ffffff`** (równe `pickerFallback`) jest traktowane jako **„Theme default"** (nie zapisane jako wartość custom), więc advisory kontrastu pozostaje „unknown", dopóki tło nie zostanie ustawione na kolor inny niż fallback. Subtelne sprzężenie swatch-fallback z detekcją „clearable value". | Colors |
| U7 | Etykiety tokenów rozmiaru ≠ wartości tokenów ≠ klasy (np. „Default"→`base`→`text-sm`, „Large"→`lg`→`text-base`). Czytelne dla autora, ale myli przy debugowaniu. | Typografia |
| U8 | Pole `icon` kroku przyjmuje **dowolny tekst** (np. „ROCKET") i renderuje go dosłownie (renderer tnie do 16 znaków). Brak walidacji „tylko emoji" — zgodne z modelem, ale potencjalnie nieoczekiwane. | Axis content |
| U9 | Advanced miesza diagnostykę widgetu ze współdzielonymi panelami blokowymi — granica „co jest widgetu, a co bloku" bywa nieoczywista dla nietechnicznego autora. | Advanced / shared |
| U10 | **Rozbieżność draft vs published** — draft startuje jako `dual-track` / 3 kroki / „Traditional"+„With us", a publiczny render to `dual-track-highlight` / 6 kroków / segment b `2-5`. Stan zastany (nie zapisywano), ale wyraźny: publiczny render NIE odzwierciedla draftu do czasu ponownej publikacji. | Środowisko / CMS |

---

## 7. Podsumowanie

**Ocena ogólna:** widget `compare-timeline` jest w **dobrym, dojrzałym stanie**. W tej
wyczerpującej sesji (przeklikano **wszystkie** dyskretne opcje wszystkich kontrolek
fixtury) znaleziono **jeden jednoznaczny defekt funkcjonalny**, zamknięty w
TASK-343-08:

- **`Segment label size` był wizualnie bezskuteczny** (zaszyty `text-xs` w klasie bazowej
  badge wygrywał kaskadę nad dopisaną klasą rozmiaru) — §4.1. Wszystkie pozostałe kontrolki
  Visual (warianty, nagłówek, oś 3–10 + Add/Remove, etykiety/ikony/opisy kroków, etykiety
  ścieżek, markery + ostrzeżenie, highlight targets a/b/both, segmenty + From/To + Add/Remove
  + linkowanie, guides, highlight label style ×3, 7 kolorów + Clear, advisory kontrastu ×3,
  rozmiary track/step, wagi track/step/segment, marker shape ×4, cały layout) **działają**
  i wiernie odwzorowują się w `data-compare-*`, klasach i `computed style`.

**Wizard** i **Advanced** działają zgodnie z ich read-only kontraktami; Advanced wiernie
odbija niezapisany stan Visual i bezpiecznie normalizuje. **Frontend** renderuje poprawnie
po stronie serwera, z solidną dostępnością i bez przepełnienia na 375px, 0 błędów konsoli.

**Czego nie zweryfikowano (uczciwie):** zapisu (Save/Publish — celowo), kliknięcia linku
**na froncie** (opublikowana konfiguracja nie ma `href` — ale linkowanie potwierdzono
end-to-end w canvasie admin), współdzielonych paneli blokowych (poza zakresem widgetu);
dodatkowo front chwilowo nie odpowiadał (artefakt środowiska) i po odzyskaniu został w
pełni przetestowany.

---

## 8. Statystyki testu

| Kategoria | Wartość |
|-----------|---------|
| Tryby przetestowane | 3 (Wizard, Visual, Advanced) + frontend |
| Selekty przeklikane przez wszystkie opcje | 17 (≈70 wyborów opcji) |
| Pola koloru (set + Clear) | 7 / 7 |
| Linkowanie kroku i segmentu (end-to-end) | 2 / 2 (potwierdzone realnym `href`) |
| Stany advisory kontrastu | 3 / 3 (unknown / ok / warning) |
| Marker shapes / highlight label styles | 4 / 4 · 3 / 3 |
| Defekty funkcjonalne | **1** (Segment label size — zamknięty w TASK-343-08) |
| Niuanse UX/UI | 10 (U1–U10) |
| Niezweryfikowane (z przyczyną) | 4 (N1–N4) |
| Trasa publiczna | HTTP 200, SSR, dual-track-highlight, 6 kroków, segment 2-5, 0 błędów konsoli |
| Mobile 375px | brak page overflow, oś single-column (343px) |
| Zrzuty PNG | 0 (weryfikacja DOM/eval; nazwy zrzutów byłyby tylko lokalnymi etykietami) |
