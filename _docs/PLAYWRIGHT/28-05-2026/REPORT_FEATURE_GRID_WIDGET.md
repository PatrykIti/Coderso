# RAPORT: Feature Grid Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (poprzedni pass: 2026-05-28)
> **Sesja Playwright:** `claude-29-05-feature-grid-exhaustive` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/a06fb6e2-3b58-44c5-87e9-32125f572461` (strona „Contract Test - feature-grid", status `Draft`)
> **Fixture public:** http://localhost:3000/featuregridtest
> **Viewport testowy:** 1280×720 (desktop), 375×800 (mobile)
> **Pliki źródłowe:** `core/widgets/core/featureGrid.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Metodologia (różnica względem passa 28-05):** Ten pass jest celowo **wyczerpujący, nie reprezentatywny**.
> Dla każdej rodziny kontrolek dostępnej w tym fixture przeszedłem przez **wszystkie
> dyskretne opcje co najmniej raz**, gdy było to wykonalne:
> - karty wariantu / radio (3 opcje) — i w Wizardzie, i w Visual,
> - **każdy** select i każda jego opcja (gap, kolumny, liczba kart 1–8, border width,
>   radius, text align, card padding, media size, container width, header size,
>   card title size, hover effect, description mode, CTA target),
> - switch CTA (on/off),
> - **wszystkie 8** przycisków szybkich emoji,
> - add / remove (z dialogiem) / reorder (Move up/down + drag) / Cards count,
> - **wszystkie 3** kontrolki koloru z przyciskiem „Clear" (set + clear),
> - MediaPicker (otwarcie biblioteki + wybór realnego obrazu + Clear image),
> - picker destynacji CTA (wybór strony + Clear destination).
>
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją w UI
> **oraz** inspekcją DOM (atrybuty `data-feature-grid-*`, klasy Tailwind, inline `style`,
> `loading`, `rel`/`target`, ARIA). Sekcje 4–8 jasno oddzielają: co przetestowano,
> co działa, co nie działa, czego nie dało się przetestować oraz niuanse UX/UI.

> **Uwaga o screenshotach:** w tym passie wykonałem **jeden** zrzut frontendu
> (`feature-grid-frontend-published-2905.png`). Jest to **wyłącznie lokalna etykieta**
> przechwycenia Playwright w katalogu `.playwright-cli/` (ignorowanym przez Git).
> Nie jest wymaganym evidence i nie został dołączony do żadnego pliku źródłowego.
> Główna weryfikacja w całym raporcie opierała się o inspekcję DOM, nie o zrzuty.

> **Uwaga o zapisie:** świadomie **nie** klikałem „Save draft" ani „Publish". Wszystkie
> edycje pozostały w pamięci sesji edytora. Przeładowanie strony admina potwierdziło,
> że draft wraca do stanu domyślnego (patrz N5) — czyli moje zmiany nie zostały utrwalone.

---

## 1. Przegląd widgetu

**Typ:** `feature-grid` · **Kategoria:** `content` · **Opis:** „Card grid for value propositions and product highlights."

**Warianty:**

| Wariant | Domyślna liczba kart | Kolumny | Charakterystyka (zweryfikowane w DOM) |
|---------|----------------------|---------|----------------------------------------|
| `cards-3` (domyślny) | 3 | 3 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) | Trzy zrównoważone karty |
| `cards-4` | 4 | 4 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) | Cztery karty |
| `highlight-first` | 4 | **zablokowane na 3** (`grid-cols-1 md:grid-cols-3`) | Pierwsza karta wyróżniona (`md:col-span-2`, `data-feature-grid-highlighted="true"`, obraz `loading="eager"`) |

**Model danych (`FeatureGridData`):** `header` (`eyebrow`, `title`, `description`); `items[]` (`id`, `icon`, `image`, `imageAlt`, `title`, `description`, `descriptionMode` plain/rich, `ctaEnabled`, `ctaLabel`, `ctaHref`, `ctaTarget` same-tab/new-tab); `style` (`columns` 2/3/4, `gap` none/sm/md/lg, `surfaceColor`*, `sectionBackground`*, `borderColor`*, `borderWidth` 0/1/2/3, `radius` none/md/lg/xl, `textAlign` left/center/right, `cardPadding` compact/default/spacious, `mediaSize` sm/md/lg, `cardLayout` vertical/horizontal, `maxWidth` 5xl/6xl/7xl/full, `headerSize` sm/md/lg, `cardTitleSize` sm/md/lg, `hoverEffect` none/lift/border). *(* = clearable)*

**Ograniczenia:** min 1 / max 8 kart (`featureGridItemMin=1`, `featureGridItemMax=8`). Liczba renderowanych kart jest sterowana **długością tablicy `items`**, a nie liczbą slotów — dlatego „Cards count" realnie zmienia render (bez rozjazdu „slot vs render" znanego z accordion/tabs).

**Renderowanie:** `<section data-feature-grid-*>` (`mx-auto w-full px-4 py-8` + `max-w-*`) z opcjonalnym wyśrodkowanym `<header>` (eyebrow `<p>`, tytuł `<h3>`, opis `<p>`) i siatką `<article>`-kart. Medium karty: **obraz > ikona > pasek-placeholder** (obraz wygrywa z ikoną). Opis: `plain` → `<p>`, `rich` → sanitizowany HTML (`sanitizeRichTextHtml`) w `<div>`. CTA: `<a>` z bezpiecznym href (`resolveWidgetLinkAttrs`).

---

## 2. Architektura trybów edytora (niuans UX)

Panel edytora ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"**; po setupie panel pokazuje „Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics." Wizard kończy się przyciskiem **„Finish setup and open Visual"**.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | Sekcja „Starter setup": select „Feature grid style" + read-only „Cards count" + tekst informacyjny. Dodatkowo panel **„Live preview"** renderujący widget przez współdzielony renderer. |
| **Visual** | zakładka „Visual" | 6 sekcji widgetowych + współdzielone „Block layout" i „Device visibility". |
| **Advanced** | zakładka „Advanced" | 4 read-only sekcje podsumowań (Layout / Content / Presentation / Authoring boundaries) + „Block layout summary" i „Visibility summary". **Zero edytowalnych kontrolek** (potwierdzone inspekcją). |

**6 sekcji Visual:** (1) Variant and layout structure; (2) Header copy; (3) Feature cards and actions; (4) Card layout and density; (5) Colors and borders; (6) Section typography and container.

---

## 3. Co faktycznie przetestowano (pełny zakres interakcji)

Wszystkie interakcje w sesji `claude-29-05-feature-grid-exhaustive`, każda zweryfikowana inspekcją DOM:

- **Wizard:** select wariantu **Cards 3 → Cards 4 → Highlight First → Cards 3** (round-trip), z weryfikacją sync w głównym canvas **i** w „Live preview" oraz w read-only „Cards count"; „Finish setup and open Visual".
- **Visual / struktura:** karty wariantu (wszystkie 3, w tym blokada kolumn dla highlight-first); Columns **2 / 3 / 4**; Card gap **none / sm / md / lg**; Cards count **1, 2, 3, 4, 5, 6, 7, 8** (każda wartość, + granice min/max).
- **Visual / Header copy:** Eyebrow, Title, Description (wszystkie 3 pola).
- **Visual / karty:** Title; Description mode **Plain ↔ Rich** (montaż edytora + render canvas); Icon (pole tekstowe) + **wszystkie 8 emoji**; Feature image (otwarcie biblioteki, wybór `cos1.png`, alt, **Clear image**); precedencja **obraz > ikona**; CTA toggle **off/on**; CTA label; CTA destination (**wybór strony + Clear destination**); CTA target **Same tab / New tab**; Move up/down; **drag&drop**; Add card; Remove + **ConfirmActionDialog (Cancel + Remove)**.
- **Visual / Card layout and density:** Card layout **vertical/horizontal**; Text align **left/center/right**; Card padding **compact/default/spacious**; Media size **sm/md/lg**.
- **Visual / Colors and borders:** Card background **set + Clear**; Card border color **set + Clear**; Border width **0/1/2/3**; Corner radius **none/md/lg/xl**.
- **Visual / Section typography:** Section background **set + Clear**; Container width **5xl/6xl/7xl/full**; Header size **sm/md/lg**; Card title size **sm/md/lg**; Hover effect **none/lift/border**.
- **Advanced:** odczyt 4 sekcji + weryfikacja, że wiernie odzwierciedlają stan roboczy; potwierdzenie read-only; etykiety kolorów (N3, N4).
- **Frontend (public):** HTTP, render zapisanego stanu, atrybuty kart/linków (`rel`/`target`/`href`), semantyka/ARIA, konsola, responsywność 375 px, izolacja niezapisanych edycji.
- **Stan pristine:** przeładowanie admina i weryfikacja defaultów (N5) oraz etykiet pristine kolorów (N3).

---

## 4. Co DZIAŁA — szczegóły z weryfikacją DOM

### 4.1 Wizard

| Akcja | Efekt (canvas + Live preview, oba zweryfikowane) |
|-------|--------------------------------------------------|
| Cards 3 | `variant=cards-3`, `columns=3`, `count=3` · read-only „3 cards" |
| Cards 4 | `variant=cards-4`, `columns=4`, `count=4`, 4× `<article>` · „4 cards" |
| Highlight First | `variant=highlight-first`, `columns=3` (locked), `count=4`; karta 1 `data-feature-grid-highlighted="true"` + `md:col-span-2`; siatka `grid grid-cols-1 md:grid-cols-3` · „4 cards" |
| powrót Cards 3 | pełny round-trip do `cards-3`/`count=3` |
| Finish setup | wraca do Visual + „Setup complete" |

**Live preview** i główny canvas aktualizują się **jednocześnie** i pozostają w pełnej zgodzie (oba używają tego samego `FeatureGridBlock`).

### 4.2 Visual — struktura

| Kontrolka | Opcja | DOM |
|-----------|-------|-----|
| Karty wariantu (radio) | Cards 4 | `columns=4`, siatka `sm:grid-cols-2 lg:grid-cols-4` ✓ |
| | Highlight First | `columns=3`, select „Columns" **disabled** + tekst „Highlight First uses a fixed spotlight layout, so columns stay locked…"; karta 1 highlighted + `md:col-span-2` ✓ |
| | Cards 3 | powrót do `columns=3` ✓ |
| Columns | 2 | `data-...-columns=2`, `grid-cols-1 sm:grid-cols-2` ✓ |
| | 3 | `sm:grid-cols-2 lg:grid-cols-3` ✓ |
| | 4 | `sm:grid-cols-2 lg:grid-cols-4` ✓ |
| Card gap | none / sm / md / lg | `gap-0` / `gap-3` / `gap-5` / `gap-7` ✓ |
| Cards count | 1 → 8 (każda) | `data-...-count` == liczba `<article>` dla **każdej** wartości 1–8 ✓ |
| | = 8 | „Add card" staje się **disabled** (max) ✓ |
| | = 1 | „Remove" oraz „Move up"/„Move down" **disabled** (min) ✓ |
| | 4–8 | nowe karty z fallback-tytułami: „Content workflows", „Feature 5"…„Feature 8" ✓ |

### 4.3 Visual — Header copy i karty

| Kontrolka | Test | DOM |
|-----------|------|-----|
| Eyebrow / Title / Description | wpis tekstu | `header > p` / `header > h3` / `header > p` aktualizują się natychmiast ✓ |
| Card title | „Szybkie wdrożenie" | `article h4` ✓ |
| Description mode | Plain → Rich | montuje się `contenteditable` (znika `<textarea>`); canvas opis renderuje się jako `<div>` (sanitizowany HTML) ✓ |
| Description mode | Rich → Plain | wraca `<textarea>`; canvas opis wraca do `<p>` ✓ |
| Icon (pole tekstowe) | „🛠️" | `span[aria-hidden]` w karcie ✓ |
| **Emoji — wszystkie 8** (⚡🧩📈🔒🚀✨💬🎯) | klik handlera | **każdy** z 8 poprawnie ustawia ikonę w canvas ✓ (logika OK — ale klik **myszą** zablokowany, patrz N1) |
| Feature image — Browse media | otwarcie | modal „Media library" z realnymi assetami ✓ |
| Feature image — wybór `cos1.png` | wybór assetu | karta renderuje `<img>` (zamiast ikony), `src` = URL mediów, `alt` auto-uzupełniony („Placeholder hero image"), `loading="lazy"`; „Clear image" staje się **enabled** ✓ |
| **Precedencja obraz > ikona** | obraz + ikona ustawione | renderuje się obraz, ikona znika ✓ |
| Image alt | edycja | `img[alt]` aktualizuje się ✓ |
| Clear image | wyczyszczenie | `<img>` znika, karta wraca do ikony ✓ |
| **`loading="eager"`** | highlight-first + obraz na karcie 1 | wyróżniona karta dostaje `loading="eager"` (pozostałe `lazy`) ✓ |
| CTA toggle | off | link CTA znika z canvas; pola „CTA label"/„destination"/„target" **disabled**; tekst „CTA copy and URL stay stored while the action is disabled." ✓ |
| CTA toggle | on | CTA wraca (link „Explore setup") ✓ |
| CTA label | „Zobacz funkcje" | `article a` aktualizuje tekst ✓ |
| CTA destination (picker) | wybór „HomePage" | `href="/homepage"` (trasa względna) ✓ |
| CTA destination | „Clear destination" | combobox → „No destination"; link CTA znika (pusty href) ✓ |
| CTA target | New tab | `target="_blank"` + `rel="noopener noreferrer"` ✓ |
| CTA target | Same tab | `target=null`, `rel=null` (dla href `#`) ✓ |
| Move down / Move up | reorder | kolejność `<h4>` w canvas zmienia się i wraca ✓ |
| **Drag&drop (handler)** | syntetyczny `DragEvent` + `DataTransfer` | drop na sąsiedniej karcie przestawia karty (handler poprawny) ✓ *(uwaga: pointer-owy DnD — patrz „nie testowalne")* |
| Add card | dodanie | `count` 3→4, nowa karta „Feature 4" ✓ |
| Remove → Cancel | anulowanie | dialog „Remove feature card / Remove Feature 4? This cannot be undone."; **Cancel** zachowuje kartę (count=4) ✓ |
| Remove → Remove | potwierdzenie | **Remove** usuwa kartę (count 4→3) ✓ |

### 4.4 Visual — Card layout and density

| Kontrolka | Opcja | DOM (`<article>` / kontener treści / ikona) |
|-----------|-------|----------------------------------------------|
| Card layout | vertical / horizontal | `flex-col` / `flex-col sm:flex-row` ✓ |
| Text align | left / center / right | `items-start text-left` / `items-center text-center` / `items-end text-right` ✓ |
| Card padding | compact / default / spacious | `p-3` / `p-4` / `p-6` ✓ |
| Media size | sm / md / lg | ikona `h-8 w-8 text-base` / `h-10 w-10 text-lg` / `h-12 w-12 text-xl` ✓ |

### 4.5 Visual — Colors and borders + Section style

| Kontrolka | Opcja | DOM |
|-----------|-------|-----|
| Card background | set `#ff0000` | `article` inline `background-color: rgb(255,0,0)`; badge „Selected color" ✓ |
| Card background | Clear | inline bg usunięte; przycisk „Clear" → **disabled** ✓ |
| Card border color | set `#00ff00` | `article` inline `border-color: rgb(0,255,0)` ✓ *(poprzedni pass tego nie ustawiał — tylko sprawdzał „Clear")* |
| Card border color | Clear | wraca do `var(--color-border)`; „Clear" → disabled ✓ |
| Border width | 0 / 1 / 2 / 3 | inline `border-width: 0px / 1px / 2px / 3px` ✓ |
| Corner radius | none / md / lg / xl | brak klasy `rounded-*` / `rounded-md` / `rounded-lg` / `rounded-xl` ✓ |
| Section background | set `#123456` | `<section>` inline `background-color: rgb(18,52,86)`; **karty nieruszone** (celuje w sekcję) ✓ |
| Section background | Clear | inline bg usunięte; „Clear" → disabled ✓ |
| Container width | 5xl / 6xl / 7xl / full | `<section>` `max-w-5xl` / `max-w-6xl` / `max-w-7xl` / `max-w-none` ✓ |
| Header size | sm / md / lg | `header h3` `text-xl` / `text-2xl` / `text-3xl` ✓ |
| Card title size | sm / md / lg | `article h4` `text-base` / `text-lg` / `text-xl` ✓ |
| Hover effect | none | brak klas hover ✓ |
| Hover effect | lift | `transition-transform transition-shadow motion-reduce:transform-none hover:-translate-y-1 hover:shadow-md` ✓ |
| Hover effect | border | `transition-colors hover:border-[var(--color-primary)]` ✓ |

**Wszystkie trzy** pola koloru mają działające przyciski „Clear" (lepiej niż widget `contact`). „Clear" jest poprawnie `disabled`, gdy pole jest puste.

### 4.6 Advanced (read-only)

Tryb Advanced jest w 100% read-only (zero inputów/comboboxów w panelu — potwierdzone) i **wiernie** odzwierciedla bieżący (niezapisany) stan roboczy z Visual: Layout summary (Layout / Cards / Desktop rhythm / Card spacing), Content summary (Header / Media / Card actions), Presentation summary (Card layout / Density / Card background / Border / Section background), Authoring boundaries (statyczne). Obecne też współdzielone „Block layout summary" i „Visibility summary".

> Advanced to **żywe lustro stanu roboczego w pamięci**, nie stanu zapisanego. Co więcej, jego liczniki ujawniły skutek niszczącej redukcji „Cards count" — patrz N9 (po moich manipulacjach liczbą kart pokazał „1 cards use icon fallbacks" / „1 card actions enabled", bo karty 2–3 utraciły ikony/CTA).

### 4.7 Frontend (public `/featuregridtest`)

Trasa zwraca **HTTP 200** i renderuje **opublikowany** stan fixture (inny niż draft i niż default — patrz N5):

- `variant=cards-4`, `columns=2`, `gap=lg`, `count=3`, `max-w-6xl`, siatka `grid grid-cols-1 sm:grid-cols-2 gap-7`.
- Karty (zapisana kolejność): **„Composable widgets" (🚀, CTA „View widgets" → `http://example.com/feature1`)**, „Fast setup" (⚡, CTA „Explore setup" → `#`), „Conversion ready" (📈, CTA „See examples" → `#`).
- **Linki CTA:** zewnętrzny `http://example.com/feature1` dostaje `rel="noopener noreferrer"` (mimo same-tab) — dobre zabezpieczenie; linki `#` mają `rel=null`, `target=null`. ✓
- **Semantyka:** `<section>` → `<header>` → `<h3>` (1×) + `<h4>` (3×); ikony jako `<span aria-hidden="true">` (3×). ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka → **jedna kolumna** (`grid-template-columns: 343px`). ✓
- **Izolacja:** moje liczne niezapisane edycje z Visual/Wizard **nie wyciekły** na front. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja (zweryfikowana) |
|---|--------|----------------------------|
| **N1 — Szybkie przyciski emoji nieklikalne myszą (realny bug layoutu)** | Visual / karty | Przy viewport **1280 px** środek każdego z 8 przycisków emoji (pole „Icon") jest **zasłonięty** przez sąsiedni blok MediaPickera. `document.elementFromPoint` na środku każdego przycisku zwraca element `feature-grid.visual.items.0.image` (a nie przycisk), a realny `click` Playwright **przekroczył timeout** z komunikatem *„<p>…Pick an image from the Media Library…</p> … intercepts pointer events"*. Ikona pozostała niezmieniona. **Handler działa** (syntetyczny `.click()` poprawnie ustawia wszystkie 8 ikon), a **pole tekstowe „Icon" działa bez zarzutu** — to czysta usterka nakładania kolumn w gridzie `sm:grid-cols-2`, prawdopodobnie zależna od szerokości panelu. |
| **N2 — Redukcja „Cards count" bez potwierdzenia** | Visual / struktura | Zmniejszenie liczby kart selectem „Cards count" (np. 8 → 1) **po cichu** obcina tablicę `items`, podczas gdy „Remove" pojedynczej karty pokazuje `ConfirmActionDialog`. Niespójna ochrona tego samego destrukcyjnego efektu. |
| **N9 — Redukcja „Cards count" jest NISZCZĄCA i nieodwracalna (NOWE)** | Visual / struktura | Po sekwencji 3→8→1→7→6→5→4→2→3 karty 2 i 3 **utraciły swoje ikony, opisy i CTA**. Wracają jako **puste** karty z fallback-tytułami („Composable widgets", „Conversion ready"), które *przypadkowo* pokrywają się z domyślnymi (bo `fallbackTitles` zawiera te same stringi). Mechanizm: redukcja obcina tablicę, a ponowne zwiększenie dokleja **puste** obiekty (`source[index] ?? {}`). W połączeniu z brakiem potwierdzenia (N2) to **ciche ryzyko utraty treści** — potwierdzone w canvas (karty 2/3: `icon=null`, `desc=null`, brak `<a>`) oraz w licznikach Advanced („1 cards use icon fallbacks"). |
| **N3 — Domyślne kolory z motywu etykietowane jako „Saved custom color"** | Visual / kolory | Na **pristine** widgecie pola „Card background" (`var(--color-bg)`) i „Card border color" (`var(--color-border)`) pokazują badge **„Saved custom color"**, aktywny przycisk „Clear" oraz tekst **„A saved custom color is configured. Pick a swatch to replace it, or clear the field."** — mimo że użytkownik niczego nie ustawił. Pole bez defaultu („Section background") poprawnie pokazuje „Theme default" z „Clear" disabled. Mylące: sugeruje istnienie zapisanego niestandardowego koloru, którego nie ma. |
| **N4 — „Selected color" (Visual) vs „Selected swatch" (Advanced)** | Visual ↔ Advanced | Dla tej samej wartości hex (`#abcdef`): badge w Visual pokazuje **„Selected color"**, a podsumowanie Advanced **„Selected swatch"**. Dwie różne etykiety dla tego samego stanu (potwierdzone na żywo w tym passie). |
| **N5 — Rozjazd: draft (defaulty) vs opublikowany front (bogata konfiguracja)** | Dane / publish | Po **świeżym przeładowaniu** draft w canvas renderuje **defaulty** (cards-3, „Fast setup/Composable widgets/Conversion ready"), a publiczna trasa serwuje **inną** zapisaną konfigurację (cards-4, 2 kolumny, gap lg, przestawione karty, CTA karty 1 → `http://example.com/feature1`). Źródła nie rozstrzygałem (brak zapisu/publikacji). Pozytyw: niezapisane edycje nie wyciekają na front. |
| **N6 — `<section>` bez `aria-label`/`aria-labelledby`** | Renderer / a11y | Główny kontener `<section data-feature-grid-variant>` na froncie nie ma dostępnej nazwy (`aria-label=null`, `aria-labelledby=null`). Reszta semantyki poprawna (`<header>`, `<h3>`, `<h4>`, ikony `aria-hidden`). |
| **N7 — Wizard ukryty za „Run setup again"** | UX nawigacji | Tryb Wizard nie jest równorzędną zakładką — dla osoby szukającej „kreatora" nie jest to oczywiste (spójne z `tabs`/`accordion`). |
| **N8 — „Wiszący" otwarty Radix Select przykrywa edytor (obserwacja narzędziowa)** | Visual | Pozostawiony otwarty `Select` portal-overlay przykrywa panel i przechwytuje kliknięcia do zamknięcia (Escape). W normalnym przepływie (trigger → opcja) zamyka się poprawnie. |

**Nie wykryto** żadnych błędów konsoli na froncie, żadnego twardego buga renderowania ani rozjazdu render między wspólnie testowanymi opcjami admin↔front (poza celową izolacją niezapisanych zmian). Wszystkie kontrolki Visual aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan roboczy.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/featuregridtest`) | Zgodność |
|--------|----------------------|-------------------------------|----------|
| Renderer | żywy `FeatureGridBlock`, atrybuty `data-feature-grid-*` | identyczny renderer i atrybuty | ✓ wspólny |
| Aktualizacja na żywo | tak (canvas + Wizard Live preview) | n/d (statyczny zapis) | ✓ |
| Renderowany stan | przy wejściu/po reload: **defaulty**; potem: niezapisane edycje | **opublikowana** konfiguracja (cards-4/2/lg/przestawione) | ⚠ rozjazd (N5) |
| Linki CTA (safe href, rel) | te same reguły | `rel="noopener noreferrer"` dla zewnętrznego | ✓ |
| Semantyka (`header`/`h3`/`h4`, ikona aria-hidden) | obecna | obecna | ✓ |
| `aria-label` na `<section>` | brak | brak | ⚠ oba (N6) |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |
| Responsywność 375 px | n/d | single-column, brak overflow | ✓ |

**Wniosek:** renderer jest wspólny i spójny. Jedyny istotny rozjazd to N5 (draft=defaulty vs opublikowany front), którego źródła nie rozstrzygałem bez zapisu/publikacji.

---

## 7. Czego NIE dało się przetestować / czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie modyfikować współdzielonego fixture. W konsekwencji: trwałość moich edycji po przeładowaniu **nie** została potwierdzona (przeładowanie zresetowało draft do defaultów — patrz N5); nie rozstrzygnąłem, czy zapis draftu nadpisałby stan opublikowany.
- **Natywny drag&drop wskaźnikiem (mysz):** komenda Playwright `dragTo` (oparta na zdarzeniach myszy) **nie przestawiła** kart — to znane ograniczenie: HTML5 native DnD (`draggable` + `dataTransfer`) nie jest wyzwalany przez symulację myszy Playwright. **Logikę** dropu zweryfikowałem syntetycznym `DragEvent` z realnym `DataTransfer` (zadziałała), więc to **ograniczenie narzędzia, nie bug aplikacji**. Reorder przez „Move up/down" działa w pełni.
- **`descriptionMode=rich` na publicznej trasie:** przełączenie Plain↔Rich i render `<div>` z sanitizowanym HTML zweryfikowałem w canvas admina; opublikowany fixture używa opisów `plain`, więc sanitizowany rich-HTML na samej trasie publicznej nie został wyrenderowany.
- **Ścieżki „niebezpiecznego" href (feedback):** nie wpisywałem nieprawidłowych/niepublicznych URLi w „CTA destination" ani „Feature image", więc komunikaty ostrzegawcze (`…is not public-safe…`) nie zostały wywołane.
- **`prefers-reduced-motion`:** klasy `motion-reduce:transform-none` przy „Lift" są obecne, ale nie testowałem zachowania pod włączoną redukcją ruchu.
- **Realna nawigacja po kliknięciu CTA na froncie:** nie klikałem linku zewnętrznego (`example.com`), by nie opuszczać strony — sprawdziłem tylko atrybuty `href`/`rel`/`target`.
- **Per-karta dla kart 2–8:** kontrolki treści (title, opis, ikona, CTA, media) testowałem wyczerpująco na **karcie 1**; karty 2+ używają **identycznego** mechanizmu (`updateItem(index, …)`), zweryfikowanego dodatkowo przez reorder, add/remove i liczniki Advanced. Nie powtarzałem każdej opcji osobno na każdej karcie.

---

## 8. Podsumowanie

- Widget **feature-grid jest w bardzo dobrym stanie funkcjonalnym**. W tym passie przeszedłem przez **wszystkie dyskretne opcje wszystkich kontrolek** dostępnych w fixture: 3 warianty (Wizard + Visual), kolumny (2/3/4), gap (4), liczbę kart (1–8), copy nagłówka, treść kart (title, opis Plain/Rich, ikona + 8 emoji, MediaPicker z realnym obrazem + precedencja obraz>ikona + `loading=eager`, CTA toggle/label/destination-picker/target), reorder (Move + drag-handler), add/remove (z dialogiem), card layout/text align/padding/media size, kolory (3× set+clear), border width (4), radius (4), container width (4), header size (3), card title size (3), hover effect (3). **Wszystkie aktualizują podgląd na żywo i odwzorowują się w DOM zgodnie z mapą klas renderera.**
- **Najważniejszy realny bug (N1):** 8 szybkich przycisków emoji jest przy 1280 px **zasłoniętych przez sąsiedni blok MediaPickera** i nieklikalnych myszą (Playwright: „intercepts pointer events", timeout). Handler i pole tekstowe „Icon" działają — to usterka layoutu, nie logiki.
- **Najważniejsze ryzyko danych (N9, nowe):** redukcja „Cards count" jest **niszcząca i nieodwracalna** — ponowne zwiększenie nie przywraca treści usuniętych kart (wracają puste, z fallback-tytułami). W połączeniu z brakiem potwierdzenia (N2) to ciche ryzyko utraty pracy autora.
- **Niespójności UX:** domyślne kolory motywu jako „Saved custom color" (N3); „Selected color" vs „Selected swatch" (N4).
- **Do wyjaśnienia (N5):** draft (defaulty po reload) vs front (bogata opublikowana konfiguracja) — bez zapisu/publikacji nie rozstrzygałem.
- **A11y (N6):** brak `aria-label` na `<section>`; reszta semantyki poprawna.
- **Plusy:** spójne, działające „Clear" dla **wszystkich trzech** pól kolorów; bezpieczne linki CTA (`rel=noopener noreferrer` dla zewnętrznych); realne sterowanie liczbą kart z danych (brak rozjazdu „slot vs render"); poprawna precedencja obraz>ikona i `loading=eager` dla wyróżnionej karty; pełna izolacja niezapisanych zmian; front 200, responsywny, 0 błędów konsoli.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższa nazwa to **wyłącznie lokalna etykieta** przechwycenia w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie jest wymaganym evidence i nie jest dołączona do
> repo. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM, nie o zrzuty.

| Plik (lokalny) | Opis |
|----------------|------|
| `feature-grid-frontend-published-2905.png` | Publiczna trasa `/featuregridtest` (1280 px) — opublikowany stan fixture (cards-4, 2 kolumny, gap lg, przestawione karty) |
