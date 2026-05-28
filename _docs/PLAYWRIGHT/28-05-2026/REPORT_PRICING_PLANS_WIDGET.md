# RAPORT: Pricing Plans Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-pricing-plans` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/21b6bd3d-6208-46a6-b9f0-e1fdbad76c7e` — strona „Contract Test - pricing-plans", slug **`/ctr-pricing-plans-2305`** (draft, publicznie `404`)
> **Fixture public:** http://localhost:3000/test-pricing-plans-0516 (**inna** strona — patrz N0)
> **Pliki źródłowe:** `core/widgets/core/pricingPlans.tsx` (renderer + normalizacja + schema) · `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-pricing-*`, klasy Tailwind, ARIA, wartości
> kontrolek, `data-widget-control-path`), a nie tylko zliczeniem widocznych sekcji.
> Sekcje 4–8 jasno oddzielają: co działa, co nie działa / jest mylące, co
> faktycznie przetestowano oraz czego NIE testowano.

> Uwaga o screenshotach: w tym audycie **nie** opierałem się na zrzutach ekranu —
> weryfikacja jest oparta o inspekcję DOM. Ewentualne pliki PNG/YAML w katalogu
> `.playwright-cli/` są **wyłącznie lokalnymi etykietami** przechwyceń (katalog
> ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do repo.

---

## 1. Przegląd widgetu

**Typ:** `pricing-plans` · **Kategoria:** `content` · **Opis:** „Plan cards and comparison layout for offers."

**Warianty (4):**

| Wariant | Etykieta | Liczba widocznych planów | Layout renderera |
|---------|----------|--------------------------|------------------|
| `two-plans` | Two Plans | 2 | grid `lg:grid-cols-2` |
| `three-plans` | Three Plans (domyślny w kodzie) | 3 | grid `sm:grid-cols-2 lg:grid-cols-3` |
| `four-plans` | Four Plans | 4 | grid `sm:grid-cols-2 xl:grid-cols-4` |
| `comparison-rows` | Comparison Rows | 3 | tabela feature-by-feature |

**Ograniczenia:** min 2 / max 6 planów (`pricingPlanMin=2`, `pricingPlanMax=6`).

**Model danych (`PricingPlansData`):**

| Sekcja | Pola |
|--------|------|
| **header** | `title`, `description` |
| **plans[]** | `id`, `name`, `description`, `price`, `period`, `badge`, `badgeTone` (neutral/accent/highlight), `surface` (clearable), `ctaStyle` (outline/filled/ghost), `highlightLabel`, `prices` (`monthly`/`annual`), `features[]` (string lub `{text,status,icon}`), `priceDisplay` (`mode` legacy/structured/free/custom + `amount`/`annualAmount`/`currency`/`freeLabel`/`customLabel`/`annualSavingsLabel`), `ctaLabel`, `ctaHref`, `highlighted` |
| **billingToggle** | `enabled`, `monthlyLabel`, `annualLabel`, `defaultCycle` (monthly/annual) |
| **comparison** | `stickyHeader`, `showHeaderCta`, `showHeaderBadges` |
| **layout** | `maxWidth` (narrow/default/wide), `typography` (compact/balanced/prominent), `footerNote` |
| **style** | `cardSurface` (clearable), `cardBorder` (clearable), `highlightRing`, `spacing` (none/sm/md/lg), `radius` (none/md/lg/xl), `featureMarker` (bullet/check/status) |

**Renderowanie:** główny `<section role="region">` z `aria-labelledby` (gdy jest tytuł) lub `aria-label="Pricing plans"`. Warianty kartowe renderują `<article data-pricing-plan>`; `comparison-rows` renderuje skrolowalną tabelę z `<caption class="sr-only">`. „Billing toggle" jest renderowany jako **statyczny** wskaźnik (`data-pricing-billing-toggle="static"`, `role="status"`) — patrz N5.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (panel pokazuje status **„SETUP COMPLETE"**). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w widgetach `accordion` i `tabs`.

| Tryb | Jak otworzyć | Zawartość | Edytowalne? |
|------|--------------|-----------|-------------|
| **Wizard** („Starter offer") | przycisk „Run setup again" | read-only podsumowanie wariantu, `FixedPlanCountNotice`, lista planów, „Live preview" | **NIE** (0 kontrolek) |
| **Visual** | zakładka „Visual" | Variant cards, Header copy, Billing toggle, Plans/features/actions, (Comparison behavior), Layout and notes, Colors and emphasis + współdzielone Block layout / Device visibility | **TAK** |
| **Advanced** | zakładka „Advanced" | Visual-owned tokens (read-only), Fix and reset (2 akcje naprawcze), Runtime summary + współdzielone Block layout / Visibility summary | tylko 2 akcje naprawcze; **brak edycji pól** |

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie poniższe interakcje wykonano w sesji `claude-28-05-pricing-plans`:

- **Wizard:** wejście („Run setup again"), odczyt read-only podsumowania i `FixedPlanCountNotice`, weryfikacja braku kontrolek edytowalnych, weryfikacja „Live preview" (drugi render), wyjście („Finish setup and open Visual").
- **Visual / Variant:** przełączenie wszystkich 4 wariantów (two → three → four → comparison) z odczytem `data-pricing-variant` / `data-pricing-count` / `data-pricing-hidden-count`; test „Add plan" (utworzenie realnego 4. planu).
- **Visual / Header:** edycja tytułu i opisu.
- **Visual / Billing:** włączenie toggla, zmiana `defaultCycle` na Annual (z weryfikacją transformacji ceny i okresu), wyłączenie.
- **Visual / Plans:** highlight (wymuszenie jednego), edycja nazwy planu, `priceDisplay.mode` = Custom (z labelem), „Add feature".
- **Visual / Plan remove:** wywołanie destrukcyjnego usuwania planu (potwierdzenie natywnym `window.confirm`, anulowane).
- **Visual / Comparison behavior:** sticky header (on), header badges (off).
- **Visual / Layout:** max width = Wide, typography = Prominent, footer note.
- **Visual / Colors:** card surface (`#ff0000` + Clear), spacing = Spacious, radius = None, feature marker = Check.
- **Visual / kontrakt:** weryfikacja obecności `data-widget-control-path` na realnych kontrolkach.
- **Advanced:** odczyt wszystkich sekcji read-only (z porównaniem do edycji z Visual), otwarcie obu dialogów naprawczych (oba anulowane).
- **Frontend (public):** render comparison-rows, dostępność (region/caption/scroll affordance/CTA aria), CTA href, komórki feature, billing bar (statyczność), konsola, overflow na 375 px.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard („Starter offer")

- Tryb jest **w 100% read-only** — sekcja „Starter offer" ma **0 pól edytowalnych**, jedyny przycisk to „Finish setup and open Visual".
- Pokazuje read-only „Pricing layout: Two Plans", `FixedPlanCountNotice` („Two Plans shows 2 plans." + „1 preserved plan is hidden in this layout and will reappear when you switch to a wider variant…") oraz read-only listę widocznych planów (Starter / Growth, z adnotacją „Visual owns details").
- **„Live preview"** renderuje drugi, żywy instancję widgetu przez współdzielony renderer; w trakcie testu obie instancje pokazywały spójnie `two-plans/2`.
- „Finish setup and open Visual" poprawnie wraca do zakładki Visual i usuwa render live preview (z 2 instancji → 1). ✓

### 4.2 Visual — wszystkie poniższe zweryfikowane na żywo w canvas (DOM)

| Kontrolka | Test | Efekt w canvas (zweryfikowany) |
|-----------|------|--------------------------------|
| Variant cards | two/three/four/comparison | `data-pricing-variant` + `data-pricing-count` aktualizują się live; karta „Selected"; `comparison-rows` renderuje `[data-pricing-comparison]`. ✓ |
| Add plan | dodanie planu przy four-plans | tablica planów 3→4, canvas renderuje **4** karty, `data-pricing-count=4`, 4. karta „Plan 4". ✓ |
| Header — Title | „Wybierz plan dla swojego zespołu" | `<h3>` w canvas aktualizuje się natychmiast. ✓ |
| Header — Description | tekst PL | `<header><p>` aktualizuje się. ✓ |
| Billing — Enable | włączenie | pojawia się `[data-pricing-billing-toggle="static"]`, `data-pricing-cycle="monthly"`, etykiety „Monthly[active] / Annual[inactive]". ✓ |
| Billing — Default cycle = Annual | zmiana selecta | etykiety → „Monthly[inactive] / Annual[active]", cena Starter `$19`→**`$190`**, okres `/month`→**`/year`** (transformacja `resolveBillingPeriodLabel`). ✓ |
| Billing — Disable | wyłączenie | `[data-pricing-billing-toggle]` znika. ✓ |
| Highlight plan | przełączenie planu 1 | plan 1 `data-pricing-highlighted=true`, **plan 2 automatycznie `false`** (wymuszenie pojedynczego), baner „Most popular". ✓ |
| Plan — Name | „Pakiet Start" | nazwa w canvas aktualizuje się. ✓ |
| Price mode = Custom | + label „Wycena indywidualna" | cena renderuje custom label zamiast `$19` (patrz uwaga T1 — fill vs setter). ✓ |
| Add feature | plan 1 | nowy wiersz „New feature"; w comparison tabela 9→10 wierszy feature. ✓ |
| Card surface | `#ff0000` | karta dostaje inline `background-color: rgb(255,0,0)`, badge „Selected color". ✓ |
| Card surface — Clear | po ustawieniu | inline tło usunięte (`rgba(0,0,0,0)` — przezroczyste), badge „Theme default". ✓ (uwaga N4) |
| Spacing = Spacious | select | `data-pricing-spacing="lg"`, grid `gap-7`. ✓ |
| Radius = None | select | karta traci klasę `rounded-*`. ✓ |
| Feature marker = Check | select | marker `•` → `✓`. ✓ |
| Max width = Wide | select | `data-pricing-max-width="wide"`, klasa `max-w-7xl`. ✓ |
| Typography = Prominent | select | `data-pricing-typography="prominent"`. ✓ |
| Footer note | tekst PL | renderuje `[data-pricing-footer-note]`. ✓ |
| Comparison — Sticky header | on | `data-pricing-comparison-sticky="true"`. ✓ |
| Comparison — Header badges | off | liczba badge'ów w `thead` 3→0. ✓ |
| Plan — Remove (configured) | klik „Remove" | wyzwala natywny `window.confirm` („Remove plan N? This action cannot be undone."); anulowane — plan zachowany. ✓ |

**Kontrakt automatyzacji (TASK-342):** atrybuty `data-widget-control-path` są obecne na realnych kontrolkach: `plans.0/1/2.surface`, `plans.ctaHref`, `style.cardSurface`, `style.cardBorder`, `style.highlightRing`, `style.spacing`, `style.radius`, `style.featureMarker` (+ współdzielone `layout.*`, `visibility.devices.*`). **Luka „metadata-gap" zgłoszona w raporcie z 27-05 jest naprawiona** — przy obecnym fixture kontrolki Visual mają ownership ścieżki kontroli.

### 4.3 Advanced (read-only diagnostyka)

Tryb Advanced ma **0 pól edytowalnych** i wiernie odzwierciedla stan z mojej sesji w Visual:

- **Visual-owned tokens:** „Spacing token: **lg**", „Radius token: **none**" — zgodne z edycjami z Visual. ✓
- **Runtime summary:** „Visible plans in this layout: **3**" (comparison-rows), „Configured plans: **4 of 4**", „Hidden preserved plans: **1**", „Billing toggle: **Disabled**". Wszystko zgodne ze stanem sesji. ✓
- **Fix and reset** — 2 akcje naprawcze z **prawidłowymi dialogami potwierdzenia** (komponent React `ConfirmActionDialog`, NIE natywny confirm):
  - „Review plan alignment" → „Align plans to current layout? This rewrites the saved plan list to 3 plans for the current layout. Preserved hidden plans may be removed." (anulowane). ✓
  - „Review payload cleanup" → „Clean pricing payload? This reapplies schema-owned defaults and removes unsupported pricing values without exposing raw JSON." (anulowane). ✓
- Dodatkowo współdzielone „Block layout summary" i „Visibility summary" (read-only).

### 4.4 Frontend (public `/test-pricing-plans-0516`)

Strona zwraca `200` i renderuje **zapisany** stan fixture (wariant **`comparison-rows`**, 3 plany, billing włączony — patrz N0/N5):

- `section role="region"`, `aria-labelledby` **rozwiązuje się** do realnego `<h3>` „Choose the plan that fits your workflow"; opis sekcji obecny. ✓
- **Tabela porównawcza:** `<caption class="sr-only">Pricing plan comparison`, kontener skrolu `tabindex=0` + `aria-label="Pricing plan comparison"` + `aria-describedby`→hint „Scroll horizontally to compare all plans.", `data-overflow-intentional="true"`. ✓
- **Plany:** Starter `$19/month` (badge „For individuals"), Growth `$49/month` („Most popular", `highlighted=true`), Scale `$99/month` (badge „For teams"). ✓
- **CTA:** 6 linków (nagłówek + wiersz akcji), każdy z `aria-label` typu „Start now for Starter"; `href="#"` (placeholder fixture — patrz N6). ✓
- **Komórki feature:** włączone → ikona + `aria-label="Included"`; brak → „-" + `aria-label="Not included"`. ✓
- **Billing bar:** `role="status"`, `aria-live="polite"`, `aria-label="Billing cycle: Monthly pricing shown"`, etykiety „Monthly[active]/Annual[inactive]". ✓ (ale statyczny — N5)
- **Responsywność 375 px:** brak poziomego overflow strony (`html.scrollWidth == clientWidth == 375`); przewijanie tabeli jest **zamknięte w intencjonalnym afordansie** (kontener skroluje wewnętrznie, strona nie). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń**. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N0 — Admin i public to RÓŻNE strony** | Fixture | Strona admin podana w zadaniu (`21b6bd3d` = slug **`/ctr-pricing-plans-2305`**, draft) i trasa public (**`/test-pricing-plans-0516`**) to **dwie odrębne strony** z różną zapisaną konfiguracją: admin = `two-plans` z domyślną treścią bez `ctaHref`; public = `comparison-rows` z 3 planami i CTA. `/ctr-pricing-plans-2305` zwraca publicznie **`404`** (draft, nieopublikowany). W praktyce **nie da się** zrobić ścisłego round-tripu „edycja w adminie → propagacja na ten sam front". Oba widgety używają tego samego renderera `PricingPlansBlock` i produkują spójny, poprawny output — różnice wynikają wyłącznie z zapisanych danych, nie z zachowania renderera. |
| **N1 — Wariant deklaruje więcej planów niż realnie renderuje** | Visual / Wizard | `FixedPlanCountNotice` dla „Four Plans" pokazuje **„Four Plans shows 4 plans."**, ale canvas renderuje tylko **3** karty (`data-pricing-count=3`), bo zapisana tablica ma 3 plany. Liczba kart = `min(visibleCount_wariantu, długość_tablicy_planów)`. Aby uzyskać realny 4. plan, trzeba kliknąć „Add plan". Notka mówi o nominalnej pojemności wariantu, nie o faktycznym renderze — to realna pułapka UX (analogiczna do N1 z raportów `accordion`/`tabs`). |
| **N2 — Wizard odsyła do kontrolki, której w Wizardzie nie ma** | Wizard | `FixedPlanCountNotice` (widoczny też w Wizardzie) instruuje: „Use the variant switch to change how many plans appear in preview." — ale **przełącznik wariantu jest w Visual, nie w Wizardzie**. Wizard pricing-plans jest czysto informacyjny (0 kontrolek) — uboższy niż Wizard `accordion`/`tabs`, które miały realne selecty (count / initially open). |
| **N3 — Niespójna mechanika potwierdzeń destrukcyjnych** | Visual vs Advanced | Usuwanie planu w Visual („Remove") używa **natywnego `window.confirm`** (surowy dialog przeglądarki). Akcje naprawcze w Advanced używają stylizowanego React `ConfirmActionDialog`. Dwa różne wzorce potwierdzenia dla destrukcyjnych operacji w obrębie jednego widgetu. |
| **N4 — „Clear" koloru = przezroczystość, nie kolor motywu** | Visual / colors | Po „Clear" na „Card surface" karta traci inline `background-color` całkowicie (`rgba(0,0,0,0)`), a nie wraca do `var(--color-bg)`. Badge pokazuje „Theme default", lecz wizualnie karta staje się przezroczysta. Zgodne z semantyką clearable, ale subtelnie mylące (identyczne jak N7 z raportu `accordion`). |
| **N5 — „Billing toggle" nie jest klikalnym togglem** | Renderer / frontend | Na froncie billing bar ma **0 interaktywnych kontrolek** (`interactiveButtons=0`) — to statyczny `role="status"` pokazujący, który cykl jest aktywny (`defaultCycle`). Dwie pigułki „Monthly / Annual" wyglądają jak przełącznik, ale są nieklikalne `<span>`. Odwiedzający prawdopodobnie spróbuje kliknąć i nic się nie stanie; zmiana cyklu cen wymaga edytora (`defaultCycle`). Nazwa „toggle" w edytorze jest myląca względem statycznego renderu. |
| **N6 — CTA fixture wskazują `#`** | Public / treść | Wszystkie 6 linków CTA na froncie ma `href="#"` (placeholder). Linki są poprawne semantycznie i mają trafne `aria-label`, ale prowadzą donikąd — to treść fixture, nie błąd renderera. |
| **N7 — Advanced bez surowego JSON** | Advanced | Advanced **świadomie nie pokazuje** surowego JSON („Advanced does not show raw pricing JSON. Human diagnostics only."). To celowy wybór produktowy, ale różni się od części innych widgetów (np. `contact`/`accordion` historycznie miały JSON snapshot). Dla zaawansowanego debugowania brak wglądu w surowy payload. |

**Nie wykryto** żadnego błędu konsoli (ani w adminie, ani na froncie), żadnego twardego buga renderowania, ani rozjazdu między testowanymi opcjami w canvas a ich odzwierciedleniem w atrybutach DOM. Każda kontrolka Visual, którą kliknąłem, działa i aktualizuje podgląd na żywo; Advanced wiernie podsumowuje stan; frontend jest dostępny i bez overflow.

---

## 6. Porównanie Admin (canvas) vs Frontend

> **Zastrzeżenie (N0):** to NIE jest porównanie tego samego zapisanego stanu — admin
> (`/ctr-pricing-plans-2305`, `two-plans`) i public (`/test-pricing-plans-0516`,
> `comparison-rows`) to różne strony. Poniżej porównuję **zachowanie współdzielonego
> renderera** w obu kontekstach, nie round-trip danych.

| Aspekt | Admin canvas (`two-plans`) | Frontend (`comparison-rows`) | Zgodność renderera |
|--------|----------------------------|------------------------------|--------------------|
| Atrybuty `data-pricing-*` | ✓ obecne, żywe | ✓ obecne, identyczna konwencja | ✓ |
| `role="region"` + `aria-labelledby`/`aria-label` | ✓ | ✓ (`aria-labelledby` rozwiązuje się do `<h3>`) | ✓ |
| Reakcja na zmiany Visual | ✓ live (zweryfikowane dla ~15 kontrolek) | n/d (inna strona, brak zapisu) | — |
| Layout kartowy | ✓ `[data-pricing-plan]` | n/d (front to tabela) | ✓ (oba ścieżki renderera obecne) |
| Layout comparison + scroll affordance | ✓ (po przełączeniu w Visual) | ✓ pełny (caption sr-only, hint, tabindex) | ✓ |
| Billing bar statyczny | ✓ (`data-pricing-billing-toggle="static"`) | ✓ (`role=status`, 0 kontrolek) | ✓ |
| CTA z `aria-label` | n/d (fixture admin bez `ctaHref`) | ✓ „<label> for <plan>" | ✓ |
| Konsola | 0 błędów | 0 błędów | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji; **po reload draft wrócił do `two-plans`** | nieobecne | ✓ poprawna izolacja (nic nie zapisano) |

**Wniosek:** renderer jest wspólny i zachowuje się spójnie w obu kontekstach. Różnice między admin a front wynikają wyłącznie z **różnej zapisanej treści dwóch odrębnych stron** (N0), a nie z rozbieżności w logice renderowania.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. Niezapisane edycje z Visual zostały odrzucone (reload przywrócił `two-plans`) — to potwierdza izolację, ale oznacza, że **trwałość i propagacja na front nie zostały zweryfikowane**.
- **Round-trip tego samego widgetu admin→front:** niemożliwy (N0 — `/ctr-pricing-plans-2305` jest draft/`404`, a front to inna strona).
- **Per-plan surface color** (`plans.N.surface`) indywidualnie — testowałem tylko współdzielony `style.cardSurface`.
- **CTA destination picker** (`LinkDestinationField` — wybór strony) — nie otwierałem pickera.
- **Price mode = Structured** (formatowanie `Intl.NumberFormat` z `amount`/`currency`) oraz **Free** — nie przetestowane (sprawdziłem tylko Custom).
- **Selecty per-plan:** Badge tone, CTA style, oraz Status/Icon dla feature — obecne, dzielą ten sam wzorzec kodu, ale nie klikałem każdego z osobna.
- **Reordering:** Move up/down planów oraz Move up/down feature — nie wykonane.
- **Realna egzekucja destrukcyjnych akcji:** usunięcie planu, „Align plans", „Clean payload" — wszystkie dialogi **anulowane** (zweryfikowałem tylko, że dialog się pojawia z poprawną treścią).
- **Klawiaturowe przewijanie** tabeli comparison — potwierdziłem tylko fokusowalność (`tabindex=0`), nie samą interakcję strzałkami.
- **`prefers-reduced-motion`, tryb dark/motyw, inne breakpointy** poza 375 px i desktop.
- **Uwaga techniczna T1 (harness, nie bug widgetu):** `playwright-cli fill` nie utrwalił wartości w warunkowo renderowanym polu „Custom label" (pole montowane/odmontowywane przy re-normalizacji na keystroke). Ustawienie wartości przez natywny setter + zdarzenie `input` zadziałało poprawnie i cena pokazała custom label — czyli **funkcja widgetu działa**, problem dotyczył tylko metody wpisywania w harnessie. To samo pole na innych prostych inputach (name/header/footer) `fill` działał bez zarzutu.

---

## 8. Podsumowanie

- Widget **pricing-plans jest w dobrym stanie funkcjonalnym**. Wszystkie ~15 przetestowanych kontrolek Visual (4 warianty, add plan, header, billing + cykl annual, highlight z wymuszeniem pojedynczego, nazwa planu, custom price mode, add feature, card surface + Clear, spacing, radius, feature marker, max width, typography, footer note, 2 przełączniki comparison) **działają i aktualizują podgląd na żywo**. Advanced jest read-only i **wiernie** podsumowuje stan z Visual. Frontend (comparison-rows) jest **dostępny** (region/caption/scroll affordance/CTA aria/feature aria) i **bez overflow** na 375 px, z **0 błędów konsoli**.
- **Kontrakt automatyzacji naprawiony:** `data-widget-control-path` jest obecny na realnych kontrolkach Visual — luka „metadata-gap" z raportu 27-05 nie występuje przy obecnym fixture.
- **Najważniejsze niuanse:**
  - **N0** — admin (`ctr-pricing-plans-2305`, draft, `two-plans`) i public (`test-pricing-plans-0516`, `comparison-rows`) to różne strony; brak ścisłego round-tripu.
  - **N1** — wariant deklaruje nominalną liczbę planów (notka „shows 4 plans"), ale renderuje tyle, ile jest w danych (3) — rozjazd notki vs realny render.
  - **N5** — „billing toggle" jest na froncie **statyczny i nieklikalny** mimo wyglądu przełącznika.
  - **N3** — niespójne potwierdzenia destrukcyjne (natywny `confirm` w Visual vs `ConfirmActionDialog` w Advanced).
  - Drobne: „Clear" koloru = przezroczystość (N4), Wizard odsyła do kontrolki spoza Wizarda (N2), CTA fixture = `#` (N6), Advanced bez raw JSON (N7).
- **Nie znaleziono** żadnego błędu renderowania ani rozbieżności w logice renderera między admin a front; wszystkie różnice wynikają z odrębnej treści dwóch fixture (N0) lub z celowych decyzji produktowych.

---

## 9. Screenshoty (lokalne etykiety)

W tym audycie **nie** korzystałem ze zrzutów ekranu jako evidence — weryfikacja oparta jest o inspekcję DOM (atrybuty `data-pricing-*`, klasy Tailwind, ARIA, `data-widget-control-path`, wartości kontrolek). Pliki YAML/PNG generowane automatycznie w `.playwright-cli/` są **wyłącznie lokalnymi etykietami** (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do żadnego pliku źródłowego.
