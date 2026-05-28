# RAPORT: Stats KPI Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-stats-kpi` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/3d15559a-c923-49e8-8902-93854a55c734` (status `Draft`, tytuł „Contract Test - stats-kpi")
> **Fixture public:** http://localhost:3000/stats-kpi-audit-0516
> **Pliki źródłowe:** `core/widgets/core/statsKpi.tsx` (renderer + typy + normalizacja + safe-link) · `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026
> (`27-05-2026/REPORT_STATS_KPI_WIDGET.md`), który był tylko clean-smoke rerunem
> (liczba widocznych sekcji, status `passed`, brak overflow). Tutaj każde
> stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją w UI
> oraz inspekcją DOM (atrybuty `data-stats-kpi-*`, klasy Tailwind, inline `style`,
> ARIA, atrybuty linków `href`/`target`/`rel`, natywne dialogi `confirm`), a nie
> samym zliczeniem sekcji. Sekcje 4–8 jasno oddzielają: co działa, co nie działa /
> jest mylące, co faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: w tym audycie weryfikację oparłem **wyłącznie o inspekcję
> DOM** (`eval`) — nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy
> byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/`
> (ignorowany przez Git), nie są wymaganym evidence w repo.

---

## 1. Przegląd widgetu

**Typ:** `stats-kpi` · **Kategoria:** `content` · **Opis:** „Metrics section with values and supporting labels."

**Warianty (3):**
- `cards` (domyślny) — siatka kart KPI z równym naciskiem. Grid responsywny: `grid-cols-1 sm:grid-cols-2` + kolumny `lg` zależne od liczby metryk (≤2 → `lg:grid-cols-2`, 3 → `lg:grid-cols-3`, 4–6 → `lg:grid-cols-3`, 7+ → `lg:grid-cols-4`).
- `inline` — kompaktowy rząd metryk (`flex flex-wrap`), z opcjonalnymi lewymi dzielnikami między elementami.
- `split-highlight` — jedna wyróżniona metryka wiodąca + siatka metryk pobocznych (`grid-cols-1 lg:grid-cols-3`, wiodąca `lg:col-span-1`, pozostałe `lg:col-span-2`). Pierwsza karta dostaje większą typografię (`text-4xl` zamiast `text-3xl` dla rozmiaru `md`) i większy padding (`p-5` vs `p-4`).

**Model danych (`StatsKpiData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `title`, `description` |
| **items[]** | `id`, `value`, `prefix`, `suffix`, `label`, `description`, `icon`, `accentColor`, `trend{ label, direction:up/down/neutral }`, `link{ href, label, openInNewTab }` |
| **style** | `alignment` (start/center/end), `spacing` (none/sm/md/lg), `valueColor`, `labelColor`, `descriptionColor` (clearable), `valueSize` (sm/md/lg/xl), `divider` (bool), `dividerIntensity` (soft/default/strong), `sectionBackground`, `cardBackground`, `cardBorderColor`, `iconSurface`, `iconBorderColor` (5 clearable), `maxWidth` (sm/md/lg/xl/full), `padding` (none/sm/md/lg), `minHeight` (none/compact/default), `iconSize` (sm/md/lg) |

**Ograniczenia:** min 1 / max 12 metryk (`statsKpiItemMin=1`, `statsKpiItemMax=12`). **Liczba metryk jest sterowana danymi** (tablica `items` + kontrolka „Metrics count"), a nie systemem slotów — zmiana licznika realnie dodaje/ucina elementy tablicy (potwierdzone, patrz 4.2). Przy rozbudowie nowe metryki dostają wartości i etykiety fallback („Support availability", „Retention lift" itd.).

**Renderowanie i bezpieczeństwo:**
- Widget jest **w pełni statyczny** — brak skryptu runtime, brak interaktywności JS. Polityka animacji (Advanced): „Static metrics only; count-up animation remains deferred for accessibility and performance."
- Sekcja to `<section>` z `aria-label` = tytuł nagłówka lub fallback „Key performance metrics".
- Każda metryka renderuje się jako `<article aria-label="...">` (gdy bez linku) lub `<a aria-label="...">` (gdy ma poprawny link). `aria-label` budowany z `value + label + linkLabel`.
- Linki przechodzą przez współdzielony `resolveWidgetLinkAttrs`/`normalizeWidgetSafeHref` (dozwolone: relative, hash, http/https). Niebezpieczne `href` (np. `javascript:`) są **odrzucane** — metryka renderuje się wtedy jako `<article>`, bez linku. `target="_blank"` dostaje `rel="noopener noreferrer"`.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie widoczny komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To ten sam wzorzec co w `accordion`, `tabs`, `faq-accordion`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | **W 100% read-only.** Dwie sekcje summary: **Layout overview** (Current layout = wariant, Metric count) i **Spacing guidance** (Active spacing + dynamiczny tekst pomocniczy). Dwa bloki tekstu wyjaśniające podział ról (Visual = codzienna edycja, Wizard = read-only po setupie). **Dodatkowo osobny panel „Live preview"** renderujący aktualny stan przez współdzielony renderer. **Brak jakichkolwiek edytowalnych kontrolek.** |
| **Visual** | zakładka „Visual" | 6 sekcji edytowalnych: **Variant and structure** (karty wariantu + select „Metrics count" 1–12), **Section header** (title/description + „Clear header"), **Metrics content and links** (per-metryka: Drag/Move up/Move down/Remove, value, label, prefix, suffix, description, icon, accent color, trend label, trend direction, link URL, link label, open-in-new-tab; „Add metric"), **Typography** (value size + 3 kolory), **Card and icon surfaces** (card bg/border, icon size, icon surface/border), **Section layout and spacing** (section bg, max width, padding, min height, alignment, spacing, divider + divider intensity). Dodatkowo współdzielone sekcje wrappera (Block layout, Device visibility). |
| **Advanced** | zakładka „Advanced" | 3 sekcje diagnostyczne **read-only**: Runtime diagnostics, Style diagnostics, Runtime summary — plus współdzielone Block layout summary i Visibility summary. Jedyne interaktywne elementy to dwa przyciski repair: **„Normalize now"** i **„Reset to defaults"** (oba z dialogiem `confirm`). **Brak edytora raw JSON** (jawnie: „raw JSON is not shown in the editor"). |

**Istotne:** w trybie Wizard występuje (inaczej niż w `faq-accordion`) **osobny panel Live preview** obok summary. To plus dla onboardingu — użytkownik widzi efekt zanim przejdzie do Visual, mimo że sam Wizard niczego nie pozwala edytować.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-28-05-stats-kpi`, zweryfikowane inspekcją DOM:

- **Wizard:** odczyt obu sekcji summary (variant „Cards", count „4 metrics", „Active spacing: Default. 1rem gap…"), obecność Live preview, działanie przycisków „Run setup again" i „Finish setup and open Visual".
- **Visual / Variant:** wszystkie 3 karty (cards → inline → split-highlight) z odczytem klas kontenera, gridu, wyróżnienia (`data-stats-kpi-highlighted`, `text-4xl`, `p-5`).
- **Visual / Metrics count:** 4→6 (rozbudowa + fallbacki), 6→2 (truncation), grid kolumn zmienny zależnie od liczby; min-1 guard.
- **Visual / Section header:** edycja title (live + synchronizacja `aria-label` sekcji), „Clear header" (oba pola puste → `<header>` znika, `aria-label` → fallback „Key performance metrics").
- **Visual / Metrics content:** value, prefix (`$` zniekształcony przez powłokę — powtórzony z „PLN"), suffix, label (PL znaki), icon (emoji 🎯), trend label, trend direction (Up→Down, symbol ↓), link URL (niebezpieczny `javascript:` → odrzucony; poprawny `/work` i `https://`), open-in-new-tab (target/rel), link label, accent color (+ override value/icon + Clear), Add metric, Remove (dialog `confirm`), Move down (reorder).
- **Visual / Typography:** value size (Hero → `text-5xl`), value/label/description color (pickery hex).
- **Visual / Card and icon surfaces:** card bg, card border, icon size (Large → `h-10 w-10 text-lg`), icon surface, icon border — w wariancie `cards`.
- **Visual / Section layout:** section bg (+ Clear), max width (Compact → `max-w-3xl`), padding (None → `px-0 py-0`), min height (Default → `min-h-[16rem]`), alignment (Start → `items-start text-left` + `justify-start`), spacing (Spacious → `gap-6` + dynamiczny help), divider (off→on, lock w cards/split, enable w inline), divider intensity (Strong → pełny border).
- **Advanced:** odczyt wszystkich sekcji read-only (zgodność z bieżącym stanem sesji), „Normalize now" (accept), „Reset to defaults" (dialog → accept → powrót do defaultów).
- **Public (frontend):** HTTP 200, render zapisanego stanu (`split-highlight`, 4 metryki, brak linków), struktura split-highlight, nagłówek, ikony, ARIA (`<section>`/`<article>` + aria-label), brak overflow na 375 px, konsola.
- **Admin↔front:** guard `beforeunload` przy opuszczaniu admina z niezapisanymi zmianami; izolacja (front pokazuje stan zapisany, nie moje edycje).

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Sekcje summary** wiernie odzwierciedlają stan: „Current layout: Cards", „Metric count: 4 metrics", „Active spacing: Default. 1rem gap for the current default rhythm." ✓
- **Live preview** renderuje aktualny widget przez ten sam renderer co canvas. ✓
- **„Finish setup and open Visual"** przełącza poprawnie na zakładkę Visual (`aria-selected=true`). ✓
- **„Run setup again"** z poziomu Visual wraca do Wizarda. ✓
- Wizard jest read-only zgodnie z kontraktem (`role: summary`, `writablePaths: []`) — to celowe, nie błąd.

### 4.2 Visual — kontrolki i efekt w canvas (zweryfikowane w DOM)

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Karty wariantu | cards / inline / split-highlight | `data-stats-kpi-variant` + kontener: inline→`flex flex-wrap gap-4 justify-center`; split→pierwsza karta `data-stats-kpi-highlighted=true`, `text-4xl`, `p-5`. ✓ |
| Metrics count | 4→6 | data-driven: 6 itemów, nowe z fallbackami („Support availability", „Retention lift"); grid `lg:grid-cols-3`. ✓ |
| Metrics count | 6→2 | truncation do 2; grid `lg:grid-cols-2`. ✓ |
| Header title | „Nasze wyniki w liczbach" | `<h3>` live + **`aria-label` sekcji = tytuł**. ✓ |
| Header — Clear header | oba pola puste | `<header>` znika, `aria-label` sekcji → „Key performance metrics". ✓ |
| Value | „250" | wartość live. ✓ |
| Prefix | „PLN" | `<span data-stats-kpi-prefix>` przed wartością. ✓ |
| Suffix | „K" | `<span data-stats-kpi-suffix>` po wartości. ✓ |
| Label | „Wskaźnik testowy" | etykieta live (obsługa PL znaków). ✓ |
| Icon | „🎯" | `<span aria-hidden="true">` przed wartością. ✓ |
| Trend label / direction | „+99% testowy" / Up→Down | `data-stats-kpi-trend-direction` + symbol (↑ / ↓ / →). ✓ |
| Metric link URL — **niebezpieczny** | `javascript:alert(1)` | metryka renderuje się jako `<article>` (nie link), `data-stats-kpi-link=false`, brak `href`; tekst pomocniczy zmienia się na „Only relative paths, hash anchors, and http(s) URLs render as clickable metrics." ✓ **(bezpieczeństwo OK)** |
| Metric link URL — poprawny | `/work`, `https://example.com/metrics` | metryka jako `<a>`, help „Accepts relative paths, hash anchors, and http(s) URLs." ✓ |
| Open in new tab | on (przy poprawnym URL) | `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| Metric accent color | `#ff00ff` | nadpisuje JEDNOCZEŚNIE kolor wartości i ikony danej metryki (`accentColor ?? valueColor`); Clear → powrót do `var(--color-text)`, przycisk Clear disable. ✓ |
| Add metric | +1 | nowa metryka „Metric N". ✓ |
| Remove | dialog „Remove metric N? This action cannot be undone from the editor history." | po accept item znika; **min-1 guard** (Remove disabled przy 1 metryce). ✓ |
| Move down / Move up | reorder | kolejność zmienia się w canvas natychmiast. ✓ |
| Value size | Hero | `<p>` wartości → `text-5xl`. ✓ |
| Value/Label/Description color | hex | inline `color` na odpowiednich `<p>`. ✓ |
| Card background / border | hex (wariant cards) | inline `background-color`/`border-color` na każdej karcie. ✓ |
| Icon size | Large | ikona → `h-10 w-10 text-lg`. ✓ |
| Icon surface / border | hex | inline style na `<span>` ikony. ✓ |
| Section background | `#112233` + Clear | inline `background-color` na `<section>`; Clear usuwa inline style (powrót do theme default). ✓ |
| Max width | Compact | `max-w-3xl` (z `max-w-6xl`). ✓ |
| Padding | None | `px-0 py-0` (z `px-4 py-8`). ✓ |
| Min height | Default | `min-h-[16rem]`. ✓ |
| Alignment | Start | `items-start text-left`; w inline także `justify-start`. ✓ |
| Spacing | Spacious | `gap-6` + dynamiczny help „Active spacing: Spacious. 1.5rem gap for roomier KPI sections." ✓ |
| Show dividers | inline: on/off | inline: item index>0 dostaje `border-l`; off → klasa znika, kontrolka intensywności znika. ✓ |
| Divider intensity | Strong | `border-[var(--color-border)]` (default = `/70`, soft = `/40`). ✓ |

**Spójność „Clear" w kolorach:** wszystkie clearable kolory (section/card bg, card border, icon surface/border, value/label/description color, per-metryka accent) mają działający przycisk „Clear" — poprawnie disabled przy wartości == theme default, aktywny po ustawieniu własnego koloru.

### 4.3 Advanced (read-only)

Tryb Advanced jest read-only i **wiernie** odzwierciedlał bieżący stan sesji (count, tokeny, safe-link, divider policy):

- **Runtime diagnostics:** „Resolved variant: Cards", „Metric count: 3", „Split-highlight secondary grid: Inactive unless Split Highlight is selected.", polityka animacji (static only). ✓
- **Style diagnostics:** Layout tokens (`alignment/spacing/maxWidth/padding/minHeight`), Typography tokens (`valueSize` + 3 kolory), Surface tokens (`section/card/cardBorder/iconSurface/iconBorder/iconSize`), Divider policy: „Enabled; rendered by inline variant only". ✓
- **Runtime summary:** „Safe link status: No metric links configured." (spójne po wcześniejszym ucięciu metryki z linkiem), „3 KPI items normalized; raw JSON is not shown in the editor.", Contract summary (podział Wizard/Visual/Advanced). ✓
- **Repair actions** (oba z `confirm`):
  - „Normalize now" → dialog „Normalize this Stats KPI payload now?" → accept: payload znormalizowany, brak crasha (count bez zmian, bo dane już czyste). ✓
  - „Reset to defaults" → dialog „Reset this Stats KPI widget to defaults?" → accept: powrót do defaultów (count 4, header „Proof in numbers", etykiety domyślne). ✓
- Dodatkowo widoczne współdzielone „Block layout summary" i „Visibility summary".

### 4.4 Frontend (public)

Strona `/stats-kpi-audit-0516` zwraca **HTTP 200** (title „STATS-KPI-AUDIT-0516") i renderuje **zapisany** stan fixture: wariant **`split-highlight`**, 4 metryki, **brak linków**, pozostałe style domyślne (`max-w-6xl`, spacing md, align center, value size md, icon size md). Uwaga: to inny zapisany stan niż domyślny fixture kontraktowy w adminie (`cards`) — bo to dwie różne strony.

- **Struktura split-highlight:** outer `grid grid-cols-1 lg:grid-cols-3 gap-4`; karta wiodąca `rounded-xl border p-5` z wartością `text-4xl`; kontener poboczny `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2 gap-4` (3 metryki poboczne, nieparzysta liczba → 3 kolumny). ✓
- **Nagłówek:** `<h3>` „Proof in numbers" + opis; 4 ikony (`<span aria-hidden>`). ✓
- **Dostępność:** sekcja to `<section aria-label="Proof in numbers">`; każda metryka to `<article>` z `aria-label` budowanym z wartości+etykiety (np. „120+ Projects launched", „99.9% Platform uptime", „3x Faster iteration", „45% Higher engagement"). ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); split-highlight zwija się do **jednej** kolumny poniżej `lg`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓

### 4.5 Izolacja i bezpieczeństwo edycji

- **Guard `beforeunload`** — próba przejścia z admina (z niezapisanymi zmianami) na front wywołała natywny dialog „unsaved changes"; dopiero po accept nastąpiła nawigacja. ✓ Dobry mechanizm ochronny.
- **Niezapisane edycje NIE wyciekają na front** — świadomie nie zapisywałem; front pokazuje stan zapisany (split-highlight), niezależny od moich edycji w adminie. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Card surfaces ciche w wariancie `inline`** | Visual / renderer | Sekcja „Card and icon surfaces" oferuje `Card background` i `Card border`, ale renderer przekazuje `cardStyle` tylko dla wariantów innych niż inline (`style: variant === "inline" ? undefined : cardStyle`). W `inline` te dwa pola **nie mają żadnego efektu**, mimo że pozostają w pełni edytowalne i bez ostrzeżenia. Co więcej, `iconSurface`/`iconBorderColor` z TEJ SAMEJ sekcji **działają** w inline (ikona dostaje inline style) — czyli część sekcji działa, część nie, bez żadnego sygnału w UI. Mylące. |
| **N2 — `data-stats-kpi-divider="true"` i toggle „on" w wariantach bez dzielników** | Visual / renderer | Atrybut `data-stats-kpi-divider` jest emitowany na sekcji zawsze (także dla `cards` i `split-highlight`, gdzie dzielniki nigdy się nie renderują). Przy domyślnym `divider:true` przełącznik „Show dividers" w tych wariantach pokazuje się jako **zaznaczony, ale wyłączony (locked)** — wygląda na „włączony", a nic nie robi. Tekst pomocniczy łagodzi to („Inline-only. Other variants ignore divider output, so this toggle stays locked."), ale wizualny stan „checked + disabled" pozostaje lekko mylący. |
| **N3 — Drag & drop reorderingu nie udało się potwierdzić** | Visual / edytor | Kontrolki `draggable` + `onDragStart/onDragOver/onDrop` są obecne (uchwyt „Drag metric N"), ale **syntetyczny `drag` z Playwright nie zmienił kolejności** (programowy dispatch nie wyzwala handlerów React DnD). To najpewniej ograniczenie symulacji, nie bug — **ta sama funkcja `moveItem`** uruchamiana przyciskami Move up/Move down działa poprawnie. Realny drag użytkownika prawdopodobnie zadziała, ale **tego nie mogę potwierdzić** w tym audycie. (Identyczne zjawisko jak w raporcie `faq-accordion`.) |
| **N4 — „Normalize now" bez widocznego feedbacku** | Advanced | Po akceptacji „Normalize this Stats KPI payload now?" nie pojawia się żaden toast ani inline-komunikat informujący, czy payload się zmienił. Akcja działa (re-normalizacja), ale brak potwierdzenia wizualnego — analogicznie do U7 z raportu Contact. „Reset to defaults" daje wyraźny efekt (powrót do defaultów), więc tam brak feedbacku jest mniej dotkliwy. |
| **N5 — Wizard bez jakiejkolwiek edycji** | Wizard | Wizard jest w 100% read-only (tylko summary + Live preview). To zgodne z kontraktem i intencją „seed → Visual", ale oznacza, że polecenie „interakcji z opcjami konfiguracji w trybie Wizard" jest niewykonalne — w Wizardzie nie ma żadnych opcji do zmiany. Warto to jawnie odnotować, bo różni się od widgetów, gdzie Wizard miał realne kontrolki. |

**Nie wykryto** żadnego twardego buga renderowania, żadnego błędu konsoli (admin i front: 0/0), ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji. Wszystkie kontrolki Visual, które przetestowałem (poza nieweryfikowalnym automatycznie drag&drop — N3), **działają i aktualizują podgląd na żywo**; Advanced wiernie podsumowuje stan; frontend jest w pełni dostępny i wolny od overflow.

> **Uwaga o „120++" na froncie (NIE jest to bug renderera):** karta wiodąca pokazuje „120++", bo zapisane dane fixture mają jednocześnie `value="120+"` ORAZ `suffix="+"`. Renderer poprawnie wypisuje dwa osobne spany (`<span>120+</span><span data-stats-kpi-suffix>+</span>`), a `aria-label` używa samej wartości („120+ Projects launched"). To redundancja w danych fixture, nie błąd widgetu — ale warto poprawić seed, bo wizualnie wygląda na literówkę.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/stats-kpi-audit-0516`) | Zgodność |
|--------|--------------|-------------------------------------|----------|
| Renderer | żywy `StatsKpiBlock` | ten sam `StatsKpiBlock` | ✓ wspólny |
| Wariant w fixture | `cards` (fixture kontraktowy) | `split-highlight` (inny zapisany stan) | ✓ różnica wynika z 2 różnych stron, nie z rozjazdu |
| Atrybuty `data-stats-kpi-*` | obecne i poprawne | identyczny zestaw | ✓ |
| Linki (safe-href, target/rel) | działają (przetestowane w Visual) | brak linków w tym fixture | ✓ logika spójna |
| Dostępność (`<section>`/`<article>` + aria-label) | obecna | obecna i kompletna | ✓ |
| Statyczność (brak JS runtime) | brak skryptu | brak skryptu | ✓ |
| Responsywność 375 px | (nie mierzona w canvas) | brak overflow, 1 kolumna | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny; canvas i front zachowują się spójnie. Różnica wariantu (cards vs split-highlight) wynika wyłącznie z tego, że to dwie różne strony z różnym zapisanym stanem — nie z rozjazdu admin↔front. Brak elementów interaktywnych JS (widget statyczny) oznacza brak klasy problemów typu „skrypt runtime nie wykonuje się w adminie" znanej z `accordion`/`faq-accordion`.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture (próba nawigacji wywołała guard `beforeunload`). W związku z tym:
  - moje edycje w Visual **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front;
  - zweryfikowana została natomiast **spójność w obrębie sesji** (Visual → Advanced wiernie podsumowuje) oraz **izolacja** (front = stan zapisany).
- **Drag & drop reordering:** patrz N3 — nie potwierdzone metodą automatyczną; przyciski Move up/down działają.
- **Limity i walidacja długości:** nie testowałem twardych limitów (np. ucinania pól, max 12 metryk dochodząc do samej granicy — sprawdziłem do 6 i guard min-1).
- **Pełny zestaw wartości selectów:** nie przeszedłem każdej opcji każdego selecta — testowałem reprezentatywnie (np. divider intensity: default + strong, ale nie „soft"; value size: tylko Hero; max width: tylko Compact).
- **Stabilność sesji:** w trakcie audytu sesja przeglądarki dwukrotnie się zamknęła/zresetowała (prawdopodobnie presja pamięci na maszynie z wieloma równoległymi sesjami Playwright innych agentów). Po re-loginie kontynuowałem testy na świeżym stanie fixture; to ograniczenie środowiska testowego, nie widgetu. Zaznaczam, bo część wczesnych edycji Visual (zmiany typografii/surfaces zrobione przed pierwszym resetem) nie była ponownie odtwarzana — ale każda z tych kontrolek została potwierdzona indywidualnie po re-loginie.
- **`prefers-reduced-motion`:** nieistotne — widget jest statyczny (brak animacji; count-up celowo odroczony).
- **Współdzielone sekcje wrappera (Block layout, Device visibility):** poza zakresem audytu stats-kpi. Odnotowuję jedynie, że „Visibility summary" dla tego fixture pokazywał „Shown on: Hidden on all devices" — to ustawienie widoczności wrappera (nie pole stats-kpi); nie zmieniałem go.

---

## 8. Podsumowanie

- Widget **stats-kpi jest w bardzo dobrym stanie funkcjonalnym.** Wszystkie przetestowane kontrolki Visual (3 warianty, data-driven licznik 1–12 z fallbackami i truncation, nagłówek + synchronizacja `aria-label`, pełna edycja metryk: value/prefix/suffix/label/description/icon/trend/akcent, bezpieczne linki z `target/rel`, add/remove z dialogiem i guardem min-1, reorder przyciskami, typografia + 3 kolory, powierzchnie kart/ikon, layout sekcji: max width/padding/min height/alignment/spacing z dynamicznym helpem, divider + intensywność) **działają i aktualizują podgląd na żywo**. Advanced wiernie podsumowuje stan i daje dwie akcje repair z potwierdzeniem; frontend jest statyczny, dostępny (`<section>`/`<article>` + aria-label), bez błędów konsoli i bez overflow na mobile.
- **Najważniejsze realne niuanse:**
  - **N1** — `Card background`/`Card border` są ciche w wariancie `inline` (podczas gdy ikona z tej samej sekcji działa), bez sygnału w UI.
  - **N2** — `data-stats-kpi-divider` i przełącznik „Show dividers" pokazują stan „on" także w wariantach, które dzielników nie renderują (locked, checked).
  - **N4** — „Normalize now" bez widocznego feedbacku.
  - **N5** — Wizard jest w 100% read-only (brak opcji do interakcji — z definicji).
  - **N3** — drag&drop nieweryfikowalny automatycznie (Move up/down działa).
- **Plusy względem innych widgetów:** licznik metryk jest **data-driven** (realnie zmienia tablicę, brak rozjazdu „licznik vs render"); widget jest **statyczny** (brak skryptu runtime → brak desyncu admin↔front znanego z `accordion`/`faq-accordion`); **bezpieczne linki** (odrzucenie `javascript:`, `rel="noopener noreferrer"` przy `target=_blank`); spójny mechanizm „Clear" dla wszystkich pól koloru; Wizard ma osobny **Live preview** (lepszy onboarding niż `faq-accordion`).
- **Drobiazg w danych fixture (nie bug):** publiczny fixture pokazuje „120++" przez redundantny `value="120+"` + `suffix="+"`; warto poprawić seed.
- Nie znaleziono żadnego błędu renderowania, błędu konsoli ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o
> inspekcję DOM (`eval`) oraz odczyt snapshotów drzewa dostępności. Ewentualne
> pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń w
> `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence i
> nie zostały dołączone do repo.
