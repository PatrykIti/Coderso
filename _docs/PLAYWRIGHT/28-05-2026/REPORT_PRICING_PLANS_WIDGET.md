# RAPORT: Pricing Plans Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony (uzupełniony do pełnego pokrycia kontrolek)
> **Data bazowa:** 2026-05-28 · **Domknięcie luki pokrycia:** 2026-05-29
> **Sesja Playwright (domknięcie):** `claude-29-05-pricing-plans-gap-close` (izolowana, oddzielna od innych agentów; podpięta do już otwartej sesji, bez logowania od zera)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/21b6bd3d-6208-46a6-b9f0-e1fdbad76c7e` — strona „Contract Test - pricing-plans", slug **`/ctr-pricing-plans-2305`** (draft, publicznie `404`)
> **Fixture public:** http://localhost:3000/test-pricing-plans-0516 (**inna** strona — patrz N0)
> **Pliki źródłowe:** `core/widgets/core/pricingPlans.tsx` (renderer + normalizacja + schema) · `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/LinkDestinationField.tsx` (picker celu CTA) · `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` (kontrakt kontrolek)

> Uwaga metodologiczna: każde stwierdzenie „działa / nie działa" zostało zweryfikowane
> realną interakcją w UI (klik/setter) oraz inspekcją DOM — atrybuty `data-pricing-*`,
> `data-pricing-badge-tone`, `data-pricing-feature-status`, `data-pricing-plan-cta-style`,
> klasy Tailwind, inline `style`, klasy ikon lucide, ARIA, `data-widget-control-path` —
> a nie tylko zliczeniem widocznych sekcji. **W sesji domykającej (29-05) kliknięto
> KAŻDĄ realnie klikalną kontrolkę per-plan / per-feature / per-layout / per-style oraz
> przełączniki comparison; przebieg każdej opcji potwierdzono w DOM canvasu.** Lista
> rzeczy, których świadomie NIE wykonano (operacje destrukcyjne i zapis), jest w sekcji 7
> wraz z konkretną przyczyną.

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

## 3. Co faktycznie przetestowano (pełny zakres interakcji)

Interakcje pochodzą z dwóch przebiegów: bazowego 28-05 (`claude-28-05-pricing-plans`) oraz domykającego 29-05 (`claude-29-05-pricing-plans-gap-close`). Poniżej **wszystkie** kontrolki, które realnie kliknięto/ustawiono, z weryfikacją w DOM.

**Wizard:** wejście („Run setup again"), odczyt read-only podsumowania i `FixedPlanCountNotice`, weryfikacja braku kontrolek edytowalnych, weryfikacja „Live preview" (drugi render), wyjście („Finish setup and open Visual").

**Visual / Variant + struktura:** przełączenie wszystkich 4 wariantów (two → three → four → comparison) z odczytem `data-pricing-variant` / `data-pricing-count` / `data-pricing-hidden-count`; „Add plan" (utworzenie realnego 4. planu).

**Visual / Header:** edycja tytułu i opisu.

**Visual / Billing:** włączenie toggla, zmiana `defaultCycle` na Annual (transformacja ceny `$19`→`$190` i okresu `/month`→`/year`), wyłączenie.

**Visual / Plany — kontrolki per-plan (wszystkie kliknięte indywidualnie, 29-05):**

- **Badge tone** — wszystkie 3 opcje (`neutral`/`accent`/`highlight`) klikane na planach 1, 2 i 3; weryfikacja `data-pricing-badge-tone` + inline `style`:
  - `neutral` → `background-color: color-mix(in oklab, var(--color-text) 8%, transparent)`, `color: var(--color-text)`;
  - `accent` → `color-mix(in oklab, var(--color-primary) 14%, transparent)`, `color: var(--color-primary)`;
  - `highlight` → `var(--color-primary)`, `color: var(--color-bg)`.
- **CTA style** — wszystkie 3 opcje (`outline`/`filled`/`ghost`) na planie 1 zweryfikowane podwójnie: atrybut `data-pricing-plan-cta-style` na `<article>` **oraz** klasa realnego `<a>` (`outline` = `border border-[var(--color-border)]`, `filled` = `bg-[var(--color-text)]`, `ghost` = `underline-offset-4`); na planach 2 i 3 zweryfikowano atrybut artykułu.
- **CTA destination picker** (`LinkDestinationField`) — otwarto picker (lista opublikowanych stron), wybrano „HomePage" → `ctaHref` rozwiązał się do `/homepage`, w canvasie pojawił się `<a>` z `aria-label="Start now for Starter"`.
- **Price mode** — wszystkie 4 tryby: `legacy` (`$19` `/month`), `structured` (amount=49 + currency USD → **`$49`**, zmiana na EUR → **`€49`** — potwierdza `Intl.NumberFormat`), `free` (domyślne „Free" oraz custom label „Darmowy na zawsze"), `custom` (z 28-05). Po teście przywrócono `legacy`.
- **Plan surface** (`plans.0.surface`) — ustawienie `#00ff00` → `<article>` inline `background-color: rgb(0, 255, 0)`; „Clear" → powrót do `cardSurface` (`var(--color-bg)`).
- **Plan reorder** — „Move down" (Starter → poz. 2: `[Growth, Starter, Scale]`) oraz „Move up" (przywrócenie `[Starter, Growth, Scale]`).
- **Highlight plan** — wymuszenie pojedynczego (z 28-05).

**Visual / Features — kontrolki per-feature (wszystkie kliknięte indywidualnie, 29-05):**

- **Status** — wszystkie 3 (`included`/`premium`/`coming-soon`): `premium` → badge `data-pricing-feature-status="premium"` („Premium"), `coming-soon` → `data-pricing-feature-status="coming-soon"` („Coming soon"), `included` → brak badge (zgodne z `renderFeatureStatusBadge`).
- **Icon** — wszystkie 4 (`check`/`sparkle`/`lock`/`clock`) przy `featureMarker=status`; weryfikacja po klasie ikony lucide: `lucide-check`, `lucide-sparkles`, `lucide-lock-keyhole`, `lucide-clock3`.
- **Feature reorder** — „Move down" + „Move up" (zmiana i przywrócenie kolejności w planie 1).
- **Add feature / Remove feature** — dodanie (3→4) i usunięcie nowego wiersza (4→3, oryginalne featery zachowane). „Remove" feature **nie ma** natywnego `confirm` (usuwa od razu).

**Visual / Comparison behavior (wariant comparison-rows, 29-05) — wszystkie 3 przełączniki:**

- **Sticky header** — on/off → `data-pricing-comparison-sticky` = `true`/`false`.
- **Header badges** — off → 0 badge'ów w `thead`, on → 3 badge'e (po jednym na plan).
- **Header CTA** — off → 0 linków CTA w `thead`, on → 1 link (tylko plan z ustawionym `ctaHref`). **To kontrolka pominięta w przebiegu bazowym — domknięta 29-05.**

**Visual / Layout and notes — wszystkie opcje selectów (29-05):**

- **Max width** — `narrow`→`max-w-4xl`, `default`→`max-w-6xl`, `wide`→`max-w-7xl` (+ `data-pricing-max-width`).
- **Typography** — `compact`/`balanced`/`prominent` (+ `data-pricing-typography`).
- **Footer note** — tekst (z 28-05).

**Visual / Colors and emphasis — wszystkie opcje + kolory clearable (29-05):**

- **Spacing** — `none`→`gap-0`, `sm`(Compact)→`gap-3`, `md`(Default)→`gap-5`, `lg`(Spacious)→`gap-7` (+ `data-pricing-spacing`).
- **Radius** — `none`→brak klasy `rounded-*`, `md`→`rounded-md`, `lg`→`rounded-lg`, `xl`→`rounded-xl`.
- **Feature marker** — `bullet`→`•`, `check`→`✓`, `status`→ikona lucide (`<svg>`).
- **Card surface** (`style.cardSurface`) — `#ff0000` → `rgb(255, 0, 0)`; „Clear" → inline tło usunięte (`""`, przezroczyste — N4).
- **Card border** (`style.cardBorder`) — `#0000ff` → `<article>` `border-color: rgb(0, 0, 255)`; „Clear" → `""` (przezroczyste).
- **Highlight ring** (`style.highlightRing`) — `#ff00ff` → na wyróżnionym planie `box-shadow: rgb(255, 0, 255) 0px 0px 0px 2px` **oraz** baner highlight `background-color: rgb(255, 0, 255)`; „Clear" → powrót do `0 0 0 2px var(--color-primary)` (**motyw**, nie przezroczystość — patrz N8).

**Advanced:** odczyt wszystkich sekcji read-only (z porównaniem do edycji z Visual), otwarcie obu dialogów naprawczych (oba anulowane — patrz §7).

**Frontend (public):** render comparison-rows, dostępność (region/caption/scroll affordance/CTA aria), CTA href, komórki feature, billing bar (statyczność), `data-pricing-badge-tone`, konsola, overflow na 375 px.

**Kontrakt automatyzacji:** atrybuty `data-widget-control-path` obecne na realnych kontrolkach: `plans.0/1/2.surface`, `plans.ctaHref`, `style.cardSurface`, `style.cardBorder`, `style.highlightRing`, `style.spacing`, `style.radius`, `style.featureMarker` (+ współdzielone `layout.*`, `visibility.devices.*`).

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard („Starter offer")

- Tryb jest **w 100% read-only** — sekcja „Starter offer" ma **0 pól edytowalnych**, jedyny przycisk to „Finish setup and open Visual".
- Pokazuje read-only „Pricing layout: Two Plans", `FixedPlanCountNotice` oraz read-only listę widocznych planów (z adnotacją „Visual owns details").
- **„Live preview"** renderuje drugi, żywy instancję widgetu przez współdzielony renderer; obie instancje pokazywały spójnie ten sam wariant/`count`.
- „Finish setup and open Visual" poprawnie wraca do zakładki Visual i usuwa render live preview. ✓

### 4.2 Visual — kontrolki zweryfikowane na żywo w canvas (DOM)

| Kontrolka | Zakres testu | Efekt w canvas (zweryfikowany) |
|-----------|--------------|--------------------------------|
| Variant cards | two/three/four/comparison | `data-pricing-variant` + `data-pricing-count` live; karta „Selected"; `comparison-rows` → `[data-pricing-comparison]`. ✓ |
| Add plan | dodanie planu | tablica 3→4, `data-pricing-count=4`. ✓ |
| Header — Title / Description | tekst | `<h3>` / `<header><p>` aktualizują się. ✓ |
| Billing — Enable / cycle / Disable | on → Annual → off | `[data-pricing-billing-toggle="static"]`, cena `$19`→`$190`, okres `/month`→`/year`. ✓ |
| **Plan — Badge tone** | **neutral/accent/highlight × plany 1,2,3** | `data-pricing-badge-tone` + inline style zgodne z `resolvePlanBadgeStyle` (8% text / 14% primary / pełny primary). ✓ |
| **Plan — CTA style** | **outline/filled/ghost** | `data-pricing-plan-cta-style` na `<article>` + klasa `<a>` z `ctaStyleClassMap`. ✓ |
| **Plan — CTA destination** | **picker → wybór „HomePage"** | `ctaHref=/homepage`, `<a>` z `aria-label="Start now for Starter"`. ✓ |
| **Plan — Price mode** | **legacy/structured/free/custom** | structured → `Intl.NumberFormat` (`$49`/`€49`); free → „Free"/custom label; legacy → `$19 /month`. ✓ |
| **Plan — Surface + Clear** | `#00ff00` → Clear | inline `background-color: rgb(0,255,0)` → powrót do `var(--color-bg)`. ✓ |
| **Plan — Reorder** | Move up / Move down | kolejność `p[id]` w canvas zmienia się i wraca. ✓ |
| Highlight plan | przełączenie | `data-pricing-highlighted`, drugi plan auto `false`, baner „Most popular". ✓ |
| **Feature — Status** | **included/premium/coming-soon** | `data-pricing-feature-status` (badge dla premium/coming-soon, brak dla included). ✓ |
| **Feature — Icon** | **check/sparkle/lock/clock** | klasa ikony lucide: `lucide-check`/`lucide-sparkles`/`lucide-lock-keyhole`/`lucide-clock3`. ✓ |
| **Feature — Reorder** | Move up / Move down | kolejność `<li>` zmienia się i wraca. ✓ |
| **Feature — Add / Remove** | dodanie + usunięcie | 3→4→3, bez `confirm` dla Remove. ✓ |
| **Comparison — Sticky** | on/off | `data-pricing-comparison-sticky=true/false`. ✓ |
| **Comparison — Header badges** | on/off | badge'e w `thead`: 3 ↔ 0. ✓ |
| **Comparison — Header CTA** | on/off | linki CTA w `thead`: 1 ↔ 0. ✓ |
| **Max width** | narrow/default/wide | `max-w-4xl`/`max-w-6xl`/`max-w-7xl` + `data-pricing-max-width`. ✓ |
| **Typography** | compact/balanced/prominent | `data-pricing-typography`. ✓ |
| **Spacing** | none/sm/md/lg | `gap-0`/`gap-3`/`gap-5`/`gap-7` + `data-pricing-spacing`. ✓ |
| **Radius** | none/md/lg/xl | brak / `rounded-md` / `rounded-lg` / `rounded-xl`. ✓ |
| **Feature marker** | bullet/check/status | `•` / `✓` / `<svg>`. ✓ |
| **Card surface + Clear** | `#ff0000` → Clear | `rgb(255,0,0)` → tło usunięte (przezroczyste, N4). ✓ |
| **Card border + Clear** | `#0000ff` → Clear | `border-color: rgb(0,0,255)` → usunięte. ✓ |
| **Highlight ring + Clear** | `#ff00ff` → Clear | box-shadow + baner `rgb(255,0,255)` → powrót do `var(--color-primary)` (N8). ✓ |
| Plan — Remove (configured) | klik „Remove" | wyzwala natywny `window.confirm`; **anulowane** (patrz §7). ✓ (tylko pojawienie dialogu) |

### 4.3 Advanced (read-only diagnostyka)

Tryb Advanced ma **0 pól edytowalnych** i wiernie odzwierciedla stan z sesji w Visual:

- **Visual-owned tokens:** „Spacing token" / „Radius token" zgodne z edycjami z Visual. ✓
- **Runtime summary:** „Visible plans", „Configured plans", „Hidden preserved plans", „Billing toggle" — zgodne ze stanem sesji. ✓
- **Fix and reset** — 2 akcje naprawcze z **prawidłowymi dialogami potwierdzenia** (React `ConfirmActionDialog`, NIE natywny confirm):
  - „Review plan alignment" → „Align plans to current layout? …" (**anulowane**). ✓
  - „Review payload cleanup" → „Clean pricing payload? …" (**anulowane**). ✓
- Współdzielone „Block layout summary" i „Visibility summary" (read-only).

### 4.4 Frontend (public `/test-pricing-plans-0516`)

Strona zwraca `200` i renderuje **zapisany** stan fixture (wariant **`comparison-rows`**, 3 plany, billing włączony — patrz N0/N5). Stan ponownie potwierdzony 29-05:

- `section role="region"`, `aria-labelledby` **rozwiązuje się** do realnego `<h3>` „Choose the plan that fits your workflow". ✓
- **Tabela porównawcza:** `<caption class="sr-only">Pricing plan comparison`, kontener skrolu `tabindex=0` + `aria-label="Pricing plan comparison"` + `aria-describedby`→„Scroll horizontally to compare all plans.", `data-overflow-intentional="true"`. ✓
- **Plany / badge tone:** `data-pricing-badge-tone="neutral"` dla „For individuals" i „For teams"; badge planu wyróżnionego (Growth) **świadomie ukryty**, bo pokrywa się z highlight label („Most popular") — patrz N9. Kolumna wyróżniona: `data-pricing-comparison-highlighted` = `[false, true, false]`. ✓
- **CTA:** 6 linków (nagłówek + wiersz akcji), każdy z `aria-label` typu „Start now for Starter"; `href="#"` (placeholder fixture — N6). ✓
- **Komórki feature:** włączone → ikona + `aria-label="Included"`; brak → „-" + `aria-label="Not included"`. ✓
- **Billing bar:** `role="status"`, `aria-live="polite"`, `data-pricing-billing-toggle="static"`. ✓ (ale statyczny — N5)
- **Responsywność 375 px:** brak poziomego overflow strony (`scrollWidth == clientWidth == 375`). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń**. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N0 — Admin i public to RÓŻNE strony** | Fixture | Strona admin (`21b6bd3d` = slug **`/ctr-pricing-plans-2305`**, draft) i trasa public (**`/test-pricing-plans-0516`**) to **dwie odrębne strony** z różną zapisaną konfiguracją. `/ctr-pricing-plans-2305` zwraca publicznie **`404`** (draft). **Nie da się** zrobić ścisłego round-tripu „edycja w adminie → propagacja na ten sam front". Oba widgety używają tego samego renderera `PricingPlansBlock` i produkują spójny output — różnice wynikają wyłącznie z zapisanych danych. |
| **N1 — Wariant deklaruje więcej planów niż realnie renderuje** | Visual / Wizard | `FixedPlanCountNotice` dla „Four Plans" mówi **„shows 4 plans."**, ale canvas renderuje tyle kart, ile jest w tablicy planów (`min(visibleCount, długość_tablicy)`). Aby uzyskać realny 4. plan, trzeba kliknąć „Add plan". Notka opisuje nominalną pojemność wariantu, nie faktyczny render — realna pułapka UX. |
| **N2 — Wizard odsyła do kontrolki, której w Wizardzie nie ma** | Wizard | `FixedPlanCountNotice` instruuje „Use the variant switch…", ale **przełącznik wariantu jest w Visual, nie w Wizardzie**. Wizard pricing-plans jest czysto informacyjny (0 kontrolek). |
| **N3 — Niespójna mechanika potwierdzeń destrukcyjnych** | Visual vs Advanced | Usuwanie planu w Visual („Remove") używa **natywnego `window.confirm`**. Akcje naprawcze w Advanced używają stylizowanego React `ConfirmActionDialog`. Dodatkowo usuwanie feature („Remove" w wierszu cechy) **nie ma żadnego potwierdzenia** — usuwa natychmiast. Trzy różne wzorce destrukcji w jednym widgecie. |
| **N4 — „Clear" surface/border = przezroczystość, nie kolor motywu** | Visual / colors | Po „Clear" na „Card surface"/„Card border" inline kolor jest **całkowicie usuwany** (`""`/przezroczystość), a nie wraca do `var(--color-bg)`/`var(--color-border)`. Badge pokazuje „Theme default", lecz wizualnie element traci tło/obrys. Zgodne z semantyką clearable, ale subtelnie mylące. |
| **N5 — „Billing toggle" nie jest klikalnym togglem** | Renderer / frontend | Na froncie billing bar ma **0 interaktywnych kontrolek** — to statyczny `role="status"` pokazujący aktywny cykl (`defaultCycle`). Dwie pigułki „Monthly / Annual" wyglądają jak przełącznik, ale są nieklikalnymi `<span>`. Zmiana cyklu wymaga edytora (`defaultCycle`). Nazwa „toggle" jest myląca względem statycznego renderu. |
| **N6 — CTA fixture wskazują `#`** | Public / treść | Wszystkie 6 linków CTA na froncie ma `href="#"` (placeholder fixture). Linki są poprawne semantycznie i mają trafne `aria-label`, ale prowadzą donikąd — treść fixture, nie błąd renderera. |
| **N7 — Advanced bez surowego JSON** | Advanced | Advanced **świadomie nie pokazuje** surowego JSON („Human diagnostics only."). Celowy wybór produktowy, ale różni się od części innych widgetów. |
| **N8 — „Clear" highlight ring ≠ „Clear" surface/border** | Visual / colors | W przeciwieństwie do N4, „Clear" na „Highlight ring" **nie** daje przezroczystości — `highlightRing` jest normalizowany przez `resolveString` do domyślnego `var(--color-primary)`. Po „Clear" box-shadow wyróżnionego planu wraca do `0 0 0 2px var(--color-primary)`. Dwie różne semantyki „Clear" w obrębie jednej sekcji „Colors and emphasis" (surface/border → przezroczyste, ring → motyw). |
| **N9 — Badge planu wyróżnionego bywa ukrywany** | Renderer | `renderPlanBadge` zwraca `null`, gdy tekst badge'a == highlight label (`hideText`). Dla planu wyróżnionego, którego badge brzmi np. „Most popular", badge **nie** renderuje `data-pricing-badge-tone` (zamiast tego widać baner highlight). Kontrolka „Badge tone" nadal zapisuje stan, ale dla takiego planu jest niewidoczna w renderze. (W teście plan 2 miał badge „Best value" ≠ highlight label, więc tonację dało się zweryfikować.) |

**Nie wykryto** żadnego błędu konsoli (admin ani front), żadnego twardego buga renderowania, ani rozjazdu między klikniętą opcją a jej odzwierciedleniem w DOM. **Każda** kontrolka Visual (select, toggle, reorder, kolor, picker) działa i aktualizuje podgląd na żywo; Advanced wiernie podsumowuje stan; frontend jest dostępny i bez overflow.

---

## 6. Porównanie Admin (canvas) vs Frontend

> **Zastrzeżenie (N0):** to NIE jest porównanie tego samego zapisanego stanu — admin
> (`/ctr-pricing-plans-2305`) i public (`/test-pricing-plans-0516`, `comparison-rows`)
> to różne strony. Poniżej porównuję **zachowanie współdzielonego renderera** w obu
> kontekstach, nie round-trip danych.

| Aspekt | Admin canvas | Frontend (`comparison-rows`) | Zgodność renderera |
|--------|--------------|------------------------------|--------------------|
| Atrybuty `data-pricing-*` | ✓ obecne, żywe | ✓ obecne, identyczna konwencja | ✓ |
| `role="region"` + `aria-labelledby`/`aria-label` | ✓ | ✓ (rozwiązuje się do `<h3>`) | ✓ |
| Reakcja na zmiany Visual | ✓ live (zweryfikowane dla **wszystkich** kontrolek) | n/d (inna strona, brak zapisu) | — |
| `data-pricing-badge-tone` | ✓ (neutral/accent/highlight wymuszone) | ✓ (`neutral` z fixture) | ✓ |
| `data-pricing-plan-cta-style` | ✓ (outline/filled/ghost) | ✓ (klasy `ctaStyleClassMap`) | ✓ |
| Layout comparison + scroll affordance | ✓ (po przełączeniu w Visual) | ✓ pełny | ✓ |
| Billing bar statyczny | ✓ (`data-pricing-billing-toggle="static"`) | ✓ (`role=status`, 0 kontrolek) | ✓ |
| Konsola | 0 błędów | 0 błędów | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji; **nie zapisane** | nieobecne | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny i zachowuje się spójnie w obu kontekstach. Różnice między admin a front wynikają wyłącznie z **różnej zapisanej treści dwóch odrębnych stron** (N0), a nie z rozbieżności w logice renderowania.

---

## 7. Czego NIE wykonano (uczciwe ograniczenia — z konkretną przyczyną)

Po domknięciu 29-05 **wszystkie realnie klikalne kontrolki konfiguracyjne** (selecty per-plan/per-feature, picker celu CTA, kolory clearable, selecty layout/style, przełączniki comparison, reorder planów i cech) zostały przeklinane i zweryfikowane w DOM. Pozostają wyłącznie poniższe, świadomie pominięte pozycje:

- **Egzekucja destrukcyjnego „Remove" planu** — zweryfikowano tylko **pojawienie się** natywnego `window.confirm` z poprawną treścią; dialog **anulowano**. Realnego usunięcia planu nie wykonano, aby nie zmieniać stanu fixture. (Mechanika: `removePlan` egzekwuje min 2 plany i pyta o potwierdzenie tylko dla „configured" planu.)
- **Egzekucja akcji Advanced „Align plans" / „Clean payload"** — oba `ConfirmActionDialog` otwarto i **anulowano**; faktycznego przepisania payloadu nie uruchomiono (operacja przepisuje/normalizuje zapisaną tablicę planów).
- **Zapis i publikacja (`Save draft` / `Publish`)** — **świadomie nie klikane**, aby nie mutować współdzielonego fixture. W efekcie **trwałość i propagacja na front nie zostały zweryfikowane**; wszystkie edycje z tej sesji są niezapisane i zostaną odrzucone. Sesja miała status „Unsaved changes" — celowo go nie utrwalono.
- **Round-trip admin→front tego samego widgetu** — **niemożliwy** (N0: `/ctr-pricing-plans-2305` jest draft/`404`, a front to inna strona `/test-pricing-plans-0516`).
- **„Clear destination" w pickerze CTA oraz powrót do opcji „No destination"** — zweryfikowano **wybór** strony (ustawienie `ctaHref`); osobnego kliknięcia przycisku „Clear destination"/opcji pustej nie powtórzono (ta sama ścieżka `onChange("")`).
- **Proste pola tekstowe per-plan, których nie wpisywano w tej sesji indywidualnie:** `description`, `badge`, `highlightLabel`, `period`, `prices.monthly`, `prices.annual`, `ctaLabel`, oraz etykiety billing (`monthlyLabel`, `annualLabel`, `annualSavingsLabel`). Korzystają z **tej samej** ścieżki wiązania `updatePlan`/`updateBillingToggle`, co pola już zweryfikowane przez realne wpisanie (`name`, `header.title/description`, `footerNote`, `price`, structured `amount`, `currency`, `freeLabel`) — nie są to selecty/kontrolki z listy luki, lecz zwykłe `<input>`/`<textarea>`.
- **Klawiaturowe przewijanie tabeli comparison** — potwierdzono tylko fokusowalność (`tabindex=0`), nie samą interakcję strzałkami.
- **`prefers-reduced-motion`, tryb dark/motyw, inne breakpointy** poza 375 px i desktop.
- **Uwaga techniczna T1 (harness, nie bug widgetu):** wartości pól warunkowo montowanych (np. structured `amount`/`currency`, `freeLabel`, `surface`, kolory) ustawiano natywnym setterem `value` + zdarzeniami `input`/`change`, ponieważ pola te potrafią re-montować się przy re-normalizacji na keystroke. Efekt w canvasie był poprawny — **funkcje widgetu działają**, niuans dotyczył wyłącznie metody wpisywania w harnessie. Selecty (Radix) klikano normalnie (trigger → opcja).

---

## 8. Podsumowanie

- Widget **pricing-plans jest w dobrym stanie funkcjonalnym**. W przebiegu domykającym 29-05 **przeklinano każdą realnie klikalną kontrolkę konfiguracyjną**, z weryfikacją w DOM:
  - **per-plan:** badge tone (3 opcje ×3 plany), CTA style (3 opcje, atrybut + klasa `<a>`), picker celu CTA (wybór strony → `ctaHref`), price mode (legacy/structured/`Intl`/free/custom), surface + Clear, reorder (up/down), highlight;
  - **per-feature:** status (3), icon (4, po klasach lucide), reorder (up/down), add/remove;
  - **comparison:** sticky / header badges / **header CTA** (ta ostatnia była luką — domknięta);
  - **layout/style:** max width (3), typography (3), spacing (4), radius (4), feature marker (3);
  - **kolory clearable:** card surface, card border, highlight ring — każdy set + Clear.
- Advanced jest read-only i **wiernie** podsumowuje stan z Visual. Frontend (comparison-rows) jest **dostępny** (region/caption/scroll affordance/CTA aria/feature aria/badge tone) i **bez overflow** na 375 px, z **0 błędów konsoli**.
- **Najważniejsze niuanse:**
  - **N0** — admin i public to różne strony; brak ścisłego round-tripu.
  - **N1** — wariant deklaruje nominalną liczbę planów, ale renderuje tyle, ile jest w danych.
  - **N5** — „billing toggle" jest na froncie **statyczny i nieklikalny** mimo wyglądu przełącznika.
  - **N3** — trzy niespójne wzorce destrukcji (natywny `confirm` przy Remove planu vs `ConfirmActionDialog` w Advanced vs **brak** potwierdzenia przy Remove feature).
  - **N4 vs N8** — niespójna semantyka „Clear": surface/border → przezroczystość, highlight ring → kolor motywu.
  - Drobne: Wizard odsyła do kontrolki spoza Wizarda (N2), CTA fixture = `#` (N6), Advanced bez raw JSON (N7), badge planu wyróżnionego bywa ukrywany (N9).
- **Nie znaleziono** żadnego błędu renderowania ani rozbieżności w logice renderera między admin a front; wszystkie różnice wynikają z odrębnej treści dwóch fixture (N0) lub z celowych decyzji produktowych.
- **Pozostałe luki są wyłącznie świadomie pominięte i nazwane w §7:** egzekucja destrukcyjnych operacji (Remove planu, Align/Clean w Advanced), zapis/publikacja oraz round-trip admin→front (niemożliwy z powodu N0). Nie wynikają one z niemożności kliknięcia kontrolki, lecz z decyzji o nienaruszaniu współdzielonego fixture.

---

## 9. Screenshoty (lokalne etykiety)

W tym audycie **nie** korzystałem ze zrzutów ekranu jako evidence — weryfikacja oparta jest o inspekcję DOM (atrybuty `data-pricing-*`, `data-pricing-badge-tone`, `data-pricing-feature-status`, `data-pricing-plan-cta-style`, klasy Tailwind/lucide, ARIA, `data-widget-control-path`, wartości kontrolek). Pliki YAML/PNG generowane automatycznie w `.playwright-cli/` są **wyłącznie lokalnymi etykietami** (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do żadnego pliku źródłowego.
