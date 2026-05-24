# RAPORT: Wspólny kontrakt widgetów — analiza drift i propozycja unifikacji

> **Status:** Draft (in progress)
> **Data:** 2026-05-23 22:18 → 2026-05-24
> **Sesja:** Playwright `contract-admin-pc` (świeża, izolowana — równolegle do drugiego agenta)
> **Środowisko:** http://localhost:5173/admin | http://localhost:3000
> **Zakres:** 38 widgetów × 3 zakładki edytora (Wizard / Visual / Advanced)

---

## 1. Cel raportu

Ujednolicić kontrakt edytora widgetów. Po zamknięciu fal funkcjonalnych TASK-256 ↔ TASK-335 same widgety działają, ale **nazewnictwo sekcji i podział treści między zakładkami Wizard / Visual / Advanced rozjechał się** — te same koncepty (np. nagłówek sekcji, kolory, „normalizacja") pojawiają się pod różnymi tytułami w różnych widgetach, a niektóre widgety w ogóle wypadają z konwencji `<WidgetEditorSection>`.

Skutki:
- redaktor nie potrafi przewidzieć, gdzie znaleźć daną sekcję (Wizard? Visual? Advanced?),
- onboarding nowych widgetów wymaga reverse-engineeringu sąsiadów,
- niemożliwe jest spójne dokumentowanie i testowanie kontraktu,
- duplikaty sekcji (Hero: `Background` w Visual + Advanced; Divider: `Preview` w obu; Tabs/Accordion: `Variant` we WSZYSTKICH trzech zakładkach) powodują, że ta sama wartość ma dwa fizyczne miejsca konfiguracji.

---

## 2. Metoda

1. Stworzono **świeże, izolowane sesje Playwright** (`contract-admin-pc`, `contract-front-pc`) niezależne od działającego równolegle agenta.
2. Zalogowano się jako `patryk.ciechanski@patrykiti.pl` (CSRF + session pobrane z `state-save`).
3. Wygenerowano **38 świeżych stron testowych** w `/admin/pages/` przez API (`POST /admin/api/pages`) — slug `/ctr-<widget>-2305`, każda zawiera dokładnie jeden block tego typu z `editor.wizardCompleted: true` i `editor.mode: "visual"`.
4. Dla każdej strony Playwright przechodzi po trzech zakładkach (Visual → Advanced → Wizard) i:
   - zrzuca DOM-owy spis `[data-widget-editor-section]` przez `eval()` (id, title, liczba kontrolek),
   - zlicza karty „spoza kontraktu" (`.rounded-xl.border` / `.rounded-lg.border` bez sekcji w środku),
   - robi screenshot zakładki (`screenshots/<widget>-<mode>.png`).
5. Równolegle parser kodu wyciąga `title="…"` z `WidgetEditorSection` z każdego pliku `*Editors.tsx` (top-level funkcje editorów + helpery).
6. Dane łączymy i porównujemy. Pełne źródło — `_raw/<widget>.txt` (DOM) i `/tmp/widget_contracts_code.json` (kod).

---

## 3. Stan obecny — surowa statystyka

### 3.1 Frekwencja tytułów sekcji w całej bibliotece (top 25)

| # | Tytuł | Wystąpienia |
|---|-------|-------------|
| 1 | `Raw payload snapshot` | 15 |
| 2 | `Variant` (samo, bez sufiksu) | 10 |
| 3 | `Normalization and safeguards` | 8 |
| 4 | `Header copy` | 8 |
| 5 | `Variant and layout structure` | 7 |
| 6 | `Diagnostics` | 4 |
| 7 | `Empty state` | 4 |
| 8 | `Colors and emphasis` | 3 |
| 9 | `Section header` | 3 |
| 10 | `Variant and structure` | 2 |
| 11 | `Technical layout tokens` | 2 |
| 12 | `Preview` | 2 |
| 13 | `Background` | 2 |
| 14 | `Section copy` | 2 |
| 15 | `Normalization and fallback` | 2 |
| 16 | `Technical style tokens` | 2 |
| 17 | `Section layout and spacing` | 2 |
| 18 | `Layout` | 2 |
| 19 | `Query preview` | 2 |
| 20 | `Runtime payload` | 2 |
| 21 | `Contract` | 2 |
| 22 | `Layout tokens` | 2 |
| 23 | `Data normalization` | 2 |
| 24 | `Flow` | 2 |
| 25 | `Resolved runtime payload` | 2 |

Dalej w tabeli >100 tytułów występujących **tylko raz** — czyli per widget autor wymyślił własną nazwę, mimo że koncept był wspólny.

### 3.2 „Variant" — 18 wariantów nazewnictwa tego samego konceptu

| Wariant | Wystąpienia |
|---------|-------------|
| `Variant` (samo) | 10 |
| `Variant and layout structure` | 7 |
| `Variant and structure` | 2 |
| `Variant and Presets` (Hero, kapitalik!) | 1 |
| `Variant and Structure` (Navigation, kapitalik!) | 1 |
| `Variant and compare structure` | 1 |
| `Variant and flow` | 1 |
| `Variant and form structure` | 1 |
| `Variant and label` | 1 |
| `Variant and layout` | 1 |
| `Variant and media structure` | 1 |
| `Variant and member structure` | 1 |
| `Variant and metric structure` | 1 |
| `Variant and pane ratio` | 1 |
| `Variant and plan structure` | 1 |
| `Variant and responsive behavior` | 1 |
| `Variant and section header` | 1 |
| `Variant and timeline structure` | 1 |

Wniosek: 5 z 38 widgetów używa samego `Variant` (bardzo niedoinformowujące), 30+ widgetów stosuje schemat `Variant and <X>` z wymyślaną na potrzeby widgetu końcówką, a 2 widgety używają niezgodnej kapitalizacji (`Presets`, `Structure`).

### 3.3 „Header copy" vs „Section copy" vs „Section header" vs „Copy"

| Wariant | Wystąpienia | Widgety |
|---------|-------------|---------|
| `Header copy` | 8 | feature-grid, faq-accordion, logo-cloud, gallery-mosaic, pricing-plans, stats-kpi, team, testimonials |
| `Section header` | 3 | product-gallery, product-table, content-list (wewnętrzny) |
| `Section copy` | 2 | testimonials (wewnętrzny), product-compare |
| `Copy` | 1 | appointment-form |

Dokładnie ten sam koncept (eyebrow + title + description sekcji) ma **4 różne nazwy** zamiast jednej kanonicznej.

### 3.4 „Colors" — 9 wariantów nazewnictwa palety

| Wariant | Widget |
|---------|--------|
| `Colors and emphasis` (3×) | newsletter, pricing-plans, testimonials |
| `Colors and Borders` (kapitalik!) | hero |
| `Colors and borders` | feature-grid |
| `Colors and background` | timeline |
| `Colors and button styles` | cta-banner |
| `Colors and panel style` | faq-accordion |
| `Colors and typography` | compare-timeline |
| `Colors, Borders, Typography` (kapitalik, oxford-comma w niewłaściwej formie) | navigation |
| `Colors, borders, and surface styling` | contact |

### 3.5 „Background"

| Wariant | Widget |
|---------|--------|
| `Background` | hero (Visual) **+ hero (Advanced) — DUPLIKAT** |
| `Background media and layers` | section |
| `Background and motion` | cta-banner |
| `Colors and background` | timeline |

`Hero` ma sekcję `Background` **w dwóch zakładkach jednocześnie** (Visual i Advanced) — czyli ten sam koncept ma dwa miejsca konfiguracji.

### 3.6 „Normalization" — 4 warianty

| Wariant | Wystąpienia |
|---------|-------------|
| `Normalization and safeguards` | 8 (kanon de facto) |
| `Normalization and fallback` | 2 |
| `Normalization and fallback controls` | 1 |
| `Data normalization` | 2 |

### 3.7 „Diagnostics" — 7 wariantów

| Wariant | Wystąpienia |
|---------|-------------|
| `Diagnostics` | 4 |
| `Display diagnostics` | 1 |
| `Layout diagnostics` | 1 |
| `Responsive diagnostics` | 1 |
| `Runtime diagnostics snapshot` | 1 |
| `Technical layout diagnostics` | 1 |
| `Transport diagnostics` | 1 |

### 3.8 „Runtime payload" — 7 wariantów

| Wariant | Wystąpienia |
|---------|-------------|
| `Runtime payload` | 2 |
| `Runtime payload snapshot` | 1 |
| `Resolved runtime payload` | 2 |
| `Runtime endpoint` | 1 |
| `Runtime endpoints` | 1 |
| `Slots and runtime behavior` | 1 |
| `Surface and Runtime Behavior` (kapitalik) | 1 |

### 3.9 „Technical * tokens" — 7 wariantów

| Wariant | Wystąpienia |
|---------|-------------|
| `Technical layout tokens` | 2 |
| `Technical style tokens` | 2 |
| `Technical divider tokens` | 1 |
| `Technical flow tokens` | 1 |
| `Technical height tokens` | 1 |
| `Technical ratio and layout tokens` | 1 |
| `Technical spacing and alignment tokens` | 1 |

### 3.10 „Raw payload snapshot" — 15/38 stosuje, reszta nie ma odpowiednika lub używa innej nazwy

- 15 widgetów: `Raw payload snapshot` (kanon)
- product-compare/product-table: `Runtime payload` (jednocześnie pełni rolę raw + endpoint)
- listing-filters/search-box: `Contract` (jedyna sekcja w całym edytorze!)
- form-embed: `Normalized payload snapshot` (jedyne wystąpienie z dopiskiem "Normalized")
- footer/posts-feed (top-level functions): **brak** sekcji w ogóle (wszystko w divach)

---

## 4. Zidentyfikowane kolizje (duplikaty tytułów w obrębie jednego widgetu)

Pełna lista z parsera **rekursywnego** (obejmuje sekcje renderowane także przez helpery, nie tylko top-level funkcje):

### 4.1 Krytyczne — sekcja powiela się w **wszystkich trzech** zakładkach (Wizard + Visual + Advanced)

| Widget | Sekcje | Skutek |
|--------|--------|--------|
| `posts-feed` | `Runtime status`, `Section header`, `Layout and style`, `Display`, `Source setup`, `Empty state` (6 sekcji × 3 zakładki) | Edytor jest praktycznie tożsamy w trzech zakładkach — Wizard/Visual/Advanced wyglądają tak samo. Tabs są dekoracyjne, nie funkcjonalne. |
| `tabs` | `Variant`, `Layout`, `Tabs Structure` (3 sekcje × 3 zakładki) + dodatkowo `Trigger style`, `Colors` w Visual+Advanced | jw. |
| `accordion` | `Variant`, `Items` (2 sekcje × 3 zakładki) + `Behavior and Style` w Visual+Advanced | jw. |
| `listing-filters` | `Listing query`, `Diagnostics`, `Facet controls`, `Surface`, `Runtime behavior` | Wizard/Visual praktycznie identyczne; jedyna unikalność to `Variant and layout` w Visual + `Contract`/`Runtime payload` w Advanced. |
| `search-box` | `Mode`, `Surface`, `Copy and behavior` × 3 zakładki | Wizard i Visual mają **dokładnie** te same 3 sekcje. |
| `form-embed` | `Form selection`, `Layout`, `Field labels` × wiele zakładek | Wizard ma 4 sekcje, Visual ma te same + dodatkowe; Advanced re-renderuje `Form selection`. |
| `template-section` | `Preview and metadata`, `Runtime behavior` w 3 zakładkach + meta-labele `Wizard`/`Visual`/`Advanced` jako tytuły sekcji | Sekcje `Wizard`/`Visual`/`Advanced` to literalnie meta-labele trybu, nie prawdziwe sekcje. |

### 4.2 Kolizje w dwóch zakładkach

| Widget | Tytuł | Występuje w |
|--------|-------|--------------|
| `hero` | `Background` | Visual + Advanced |
| `divider` | `Preview` | Visual + Advanced |
| `stats-kpi` | `Header copy`, `Title` | Wizard + Visual |
| `booking-calendar` | `Surface`, `Copy` | Wizard + Visual |
| `appointment-form` | `Surface` | Wizard + Visual |
| `product-table` | `Surfaces` | Wizard + Visual |

### 4.3 Wnioski z §4

Trzy klasy problemów:

1. **„Shared helpers"** (posts-feed, tabs, accordion, listing-filters, search-box, form-embed) — autor wpisał pojedynczy komponent renderujący wszystkie sekcje, a Wizard/Visual/Advanced wszystkie ten komponent renderują. Skutek: rozróżnienie trybów jest fikcyjne, redaktor klikając Wizard/Visual/Advanced widzi to samo. To podważa cały sens tabs i wymaga decyzji projektowej (TASK-339).
2. **„Cross-tab duplicate"** (hero, divider, stats-kpi, booking-calendar, appointment-form, product-table) — ta sama sekcja zdefiniowana świadomie w dwóch trybach. To jest do scalenia.
3. **„Meta-label"** (template-section) — sekcja nazwana literalnie jak tryb. To jest do usunięcia.

---

## 5. Widgety wypadające z kontraktu (`WidgetEditorSection`)

Z parsera top-level funkcji (puste = nie ma `title=` w głównym body; sekcje mogą siedzieć w helperach):

| Widget | Puste zakładki | Komentarz |
|--------|-----------------|-----------|
| `footer` | wizard, visual, advanced | Nie używa `<WidgetEditorSection>` ani razu. Cały edytor zbudowany na surowych `<div className="space-y-3 rounded-xl border p-4">`. **Najgrubsze naruszenie kontraktu**. |
| `posts-feed` | wizard, visual, advanced (top-level) | Sekcje istnieją, ale w helperach (`title="Source setup"`, `Display`, `Section header`, `Layout and style`, `Empty state`, `Runtime payload`) — kontrakt zachowany, ale przyjmuje inną drogę. |
| `form-embed` | wizard, visual, advanced (top-level) | Jak wyżej (helpery: `Form selection`, `Content`, `Layout`, `Field labels`, `Style`, `Multi-step navigation`, `Submit behavior`, `Diagnostics`, `Normalized payload snapshot`). |
| `rich-text-section` | wizard, advanced | Wizard pusty (powinien mieć choć quick presets/variant); Advanced top-level też pusty — ma sekcje w helperach. |
| `listing-filters` | wizard, visual (jedyna sekcja `Contract` w Advanced) | Edytor nie używa konwencji — sekcje siedzą w helperach (`Listing query`, `Facet controls`, `Runtime behavior`, `Variant and layout`, `Surface`, `Diagnostics`, `Runtime payload`). |
| `search-box` | wizard, visual (jedyna sekcja `Contract` w Advanced) | jw. (`Mode`, `Copy and behavior`, `Runtime payload`, `Surface`). |
| `navigation` | advanced | Advanced renderuje tylko opisową kartę bez sekcji. |
| `grid-columns`, `split-layout`, `spacer`, `divider`, `stack`, `hero`, `feature-grid`, `pricing-plans`, `faq-accordion`, `cta-banner`, `gallery-mosaic`, `team`, `timeline`, `newsletter` | wizard pusty | 14 widgetów ma **pustą zakładkę Wizard** — pokazują tylko nagłówek widgetu i przycisk „Continue to layout and styling", co podważa sens trybu Wizard. |
| `toggle-block` | wizard używa `Step 1: Variant`, `Step 2: Labels`, `Step 3: Starting pane` | Jedyny widget z numeracją kroków — własna konwencja Wizardowa. |

**Konkluzja:** wiele Wizardów to atrapy — 14 z 38 (≈37%) wyświetla się jako pojedynczy ekran bez sekcji. Trzeba decyzji: albo Wizard jest realnym, prowadzącym krok-po-kroku doświadczeniem (jak `toggle-block` i `compare-timeline`), albo trybu Wizard nie powinno być.

---

## 6. Propozycja kanonicznego kontraktu

### 6.1 Zasady globalne

| Zasada | Treść |
|--------|-------|
| K1 | **Każdy edytor (Wizard/Visual/Advanced) renderuje wyłącznie `<WidgetEditorSection>`**. Surowe `<div className="rounded-xl border">` traktujemy jako naruszenie. |
| K2 | **Title sekcji to fraza w sentence case** (`Header copy`, nie `Header Copy`, nie `Colors, Borders, Typography`). |
| K3 | **`id` sekcji w formacie `<widget>.<scope>`** (np. `hero.background`, `section.surface-borders`). Już dziś wszędzie stosowane, trzeba tylko egzekwować. |
| K4 | **Tytuł sekcji nie może powtórzyć się w wielu zakładkach tego samego widgetu** (lista naruszeń w §4). |
| K5 | **Każda zakładka Wizard musi mieć ≥1 sekcję** lub być zupełnie usunięta dla danego widgetu (decyzja per widget). |
| K6 | Każdy widget z payloadem zewnętrznym (runtime/query) ma w Advanced sekcję `Runtime payload` (kanon), opcjonalnie też `Runtime endpoint(s)`. |
| K7 | Każdy widget atomic ma w Advanced sekcję `Raw payload snapshot`. |
| K8 | Każdy widget z fallbackami/walidacją ma w Advanced sekcję `Normalization and safeguards`. |

### 6.2 Kanoniczne nazwy sekcji (per moduł semantyczny)

| Bucket | Kanoniczny tytuł | Typowa zakładka | Aliasy do usunięcia |
|--------|-------------------|------------------|----------------------|
| Wariant + struktura | **`Variant and structure`** | Visual (każdy widget) | `Variant`, `Variant and layout structure`, `Variant and X structure`, `Variant and pane ratio`, `Variant and plan structure`, …  (18 wariantów → 1) |
| Nagłówek sekcji (eyebrow+title+description) | **`Section header`** | Visual | `Header copy`, `Section copy`, `Copy` |
| Lista pozycji (cards/plans/items/members/logos/…) | **`Items and order`** | Visual | `Members content and order`, `Steps content and order`, `Plans, features, and actions`, `Feature cards and actions`, `Logos list and links`, `Media items and links`, `Cards`, `Testimonials content and ratings` |
| Akcje CTA | **`Actions`** | Visual | `CTA`, `CTA and conversion follow-up`, `Section CTA`, `Links and actions` |
| Media | **`Media`** | Visual | `Media items and links` (gdy chodzi o pojedyncze media) |
| Tło dekoracyjne | **`Background`** | Visual | `Background media and layers`, `Background and motion` (motion ma trafić do `Motion`) |
| Kolory | **`Colors`** | Visual | `Colors and emphasis`, `Colors and borders`, `Colors and button styles`, `Colors and background`, `Colors and panel style`, `Colors, Borders, Typography`, `Colors, borders, and surface styling`, `Colors and Borders` (9 → 1) |
| Typografia | **`Typography`** | Visual | `Typography and colors` (rozdzielić), `Typography and spacing` (rozdzielić) |
| Border + radius + shadow | **`Surface (border, radius, shadow)`** | Visual | `Surface and borders`, `Border and spacing` (spacing wydzielić) |
| Rozmiar/wyrównanie | **`Layout (width, padding, alignment)`** | Visual | `Width and spacing`, `Section layout and spacing`, `Layout and notes`, `Layout`, `Spacing and alignment`, `Spacing and vertical alignment`, `Spacing around divider` |
| Responsywne nadpisania | **`Responsive overrides`** | Visual | `Mobile collapse behavior`, `Responsive heights`, `Responsive direction`, `Responsive alignment and wrap` |
| Behavior / interakcja | **`Behavior`** | Visual | `Display behavior`, `Interaction`, `Reader options`, `Multi-step navigation`, `Submit behavior` |
| Semantyka / SEO | **`Semantics and SEO`** | Visual | `Semantics and anchor`, `SEO and structured data` |
| Empty state | **`Empty state`** | Visual | OK — utrzymać |
| Diagnostyka / dane runtime | **`Runtime payload`** | Advanced | `Diagnostics`, `Display diagnostics`, `Layout diagnostics`, `Responsive diagnostics`, `Runtime diagnostics snapshot`, `Technical layout diagnostics`, `Transport diagnostics`, `Resolved runtime payload`, `Slots and runtime behavior`, `Surface and Runtime Behavior`, `Query preview`, `Preview status`, `Contract` |
| Tokeny techniczne | **`Technical tokens`** | Advanced | `Technical layout tokens`, `Technical style tokens`, `Technical divider tokens`, `Technical flow tokens`, `Technical height tokens`, `Technical ratio and layout tokens`, `Technical spacing and alignment tokens`, `Layout tokens`, `Visual-owned tokens`, `Style tokens` |
| Normalizacja / fail-closed | **`Normalization and safeguards`** | Advanced | `Normalization and fallback`, `Normalization and fallback controls`, `Data normalization` |
| Raw JSON | **`Raw payload snapshot`** | Advanced | `Runtime payload snapshot`, `Normalized payload snapshot` |
| Wizard step containers | **`Step <n>: <name>`** | Wizard | Akceptowalne tylko gdy Wizard jest wieloetapowy (toggle-block, compare-timeline, contact, hero, …) — w przeciwnym razie zniknij Wizard. |

### 6.3 Stała kolejność sekcji w Visual (proponowana)

```
1. Variant and structure
2. Section header           (jeśli widget ma label/title/description)
3. Items and order          (jeśli widget jest repeater'em)
4. Actions                  (jeśli widget ma CTA)
5. Media                    (jeśli widget ma media root)
6. Layout (width, padding, alignment)
7. Surface (border, radius, shadow)
8. Background
9. Colors
10. Typography
11. Behavior
12. Responsive overrides
13. Semantics and SEO
14. Empty state             (tylko dla widgetów query-driven)
```

### 6.4 Stała kolejność sekcji w Advanced (proponowana)

```
1. Runtime payload          (każdy widget runtime-aware)
2. Technical tokens
3. Normalization and safeguards
4. Raw payload snapshot
```

### 6.5 Stała kolejność sekcji w Wizard (proponowana)

Albo Wizard ma 2–5 sekcji typu `Step 1: …` z prawdziwą progresją, albo zostaje wycofany. Nie ma sensu zakładka Wizard z jedną kartą „Wybierz preset, kliknij Dalej".

---

## 7. Lista naruszeń kontraktu — do zaplanowania jako tasks

Każdy z poniższych punktów to przyszły TASK-336+ (jedno-zdaniowy nagłówek + lista widgetów dotkniętych):

1. **CONTRACT-01:** Zunifikować `Variant*` → `Variant and structure` (18 wariantów). Dotyczy 34 widgetów.
2. **CONTRACT-02:** Zunifikować `Header copy/Section copy/Section header/Copy` → `Section header`. Dotyczy 14 widgetów.
3. **CONTRACT-03:** Zunifikować `Colors *` → `Colors` + osobna `Surface` jeśli border tam siedzi. Dotyczy 11 widgetów.
4. **CONTRACT-04:** Zunifikować `Normalization*` → `Normalization and safeguards`. Dotyczy 5 widgetów.
5. **CONTRACT-05:** Zunifikować `*Diagnostics*`, `Runtime payload*`, `Query preview`, `Contract`, `Preview status`, `Resolved runtime payload`, `Slots and runtime behavior` → `Runtime payload` (Advanced). Dotyczy 15+ widgetów.
6. **CONTRACT-06:** Zunifikować `Technical * tokens` → `Technical tokens`. Dotyczy 9 widgetów.
7. **CONTRACT-07:** Rozbić Hero `Background` z Advanced — wszystko trafia do Visual. Usunąć duplikat.
8. **CONTRACT-08:** Rozbić Divider `Preview` z Advanced — preview tylko w Visual.
9. **CONTRACT-09:** Tabs/Accordion `Variant` w 3 zakładkach — zostawić tylko w Visual, w Advanced przemianować na `Behavior` lub `Runtime payload`, w Wizardzie zostawić jako pierwszy step.
10. **CONTRACT-10:** StatsKpi `Header copy` powtarza się w Wizard i Visual — Wizard musi być stepem (`Step 1: Stats layout`, `Step 2: Header copy`, `Step 3: Primary metric`), nie kopią pierwszej sekcji Visual.
11. **CONTRACT-11:** Footer — przepisać 8 surowych `<div rounded-xl border>` na `<WidgetEditorSection>` (Variant/Brand and logo/Columns/Legal/Layout/Style/Diagnostics/Raw payload).
12. **CONTRACT-12:** ListingFilters / SearchBox — sekcje są w helperach, ale top-level Visual jest pusty. Wstawić sekcje top-level (`Variant and structure`, `Behavior`, `Surface`) i usunąć ostatnią pojedynczą `Contract` z Advanced.
13. **CONTRACT-13:** RichTextSection / PostsFeed / FormEmbed — sekcje siedzą w helperach. Przenieść je na poziom głównej funkcji editora lub udokumentować helpery jako część kontraktu.
14. **CONTRACT-14:** Navigation Advanced — dodać minimum `Runtime payload` + `Raw payload snapshot`; obecnie tylko opis.
15. **CONTRACT-15:** Decyzja per widget — albo Wizard ma realne stepy, albo go wycofujemy. Lista 14 widgetów z pustym top-level Wizard.
16. **CONTRACT-16:** Standaryzacja capitalization — `Hero` → `Variant and Presets` → `Variant and presets`; Navigation `Colors, Borders, Typography` → `Colors`; itd.
17. **CONTRACT-17:** Zaprzestać dodawania sekcji o nazwie tekstu z UI (FAQ: `Move up`, `Move down`, `Remove`, `Remove FAQ item?`, `Delete selected FAQ items?` przeciekły jako tytuły sekcji w eval — to są tytuły przycisków/dialogów, a nie sekcji; selektor `[data-widget-editor-section]` łapie też je przez nieprawidłowe użycie atrybutu).
18. **CONTRACT-18:** `Empty state` jako sekcja jest OK; ale **musi być warunkowo widoczna** tylko dla widgetów query-driven (Posts feed, Content list, Product gallery, Product table, Product compare). Dodać do kanonu.

---

## 8. Per-widget — szybki indeks

Pełne raporty per widget znajdują się obok tego pliku jako `REPORT_<WIDGET>.md`. Każdy zawiera:
- wyciąg sekcji per zakładka (z Playwright DOM + kodu),
- mapowanie sekcji → kanoniczna nazwa,
- listę naruszeń kontraktu specyficznych dla widgetu,
- listę kolizji,
- proponowane TASK-336+ specyficzne dla tego widgetu.

| # | Widget | Status raportu | Wizard | Visual | Advanced |
|---|--------|----------------|--------|--------|----------|
| 1 | section | ✔ | 1 | 6 | 2 |
| 2 | template-section | ✔ | 1 | 1 | 2 |
| 3 | grid-columns | ✔ | 0 | 5 | 3 |
| 4 | split-layout | ✔ | 0 | 4 | 2 |
| 5 | tabs | ✔ | 1 | 1 | 2 (kolizja `Variant`) |
| 6 | accordion | ✔ | 1 | 1 | 2 (kolizja `Variant`) |
| 7 | toggle-block | ✔ | 3 (`Step n:`) | 1 | 1 |
| 8 | spacer | ✔ | 0 | 3 | 2 |
| 9 | divider | ✔ | 0 | 4 | 4 (kolizja `Preview`) |
| 10 | stack | ✔ | 0 | 4 | 2 |
| 11 | hero | ✔ | 0 | 9 | 2 (kolizja `Background`) |
| 12 | feature-grid | ✔ | 0 | 7 | 3 |
| 13 | testimonials | ✔ | 2 | 7 | 4 |
| 14 | pricing-plans | ✔ | 0 | 7 | 3 |
| 15 | faq-accordion | ✔ | 0 | 12 | 4 |
| 16 | cta-banner | ✔ | 0 | 9 | 3 |
| 17 | logo-cloud | ✔ | 1 | 5 | 3 |
| 18 | gallery-mosaic | ✔ | 0 | 8 | 4 |
| 19 | stats-kpi | ✔ | 4 | 6 | 3 (kolizja `Header copy`) |
| 20 | team | ✔ | 0 | 4 | 3 |
| 21 | rich-text-section | ⚠ | 0 (helpery) | 8 | 0 (helpery) |
| 22 | content-list | ✔ | 2 | 6 | 3 |
| 23 | posts-feed | ⚠ | 0 (helpery) | 0 (helpery) | 0 (helpery) |
| 24 | entry-teaser | ✔ | 2 | 3 | 1 |
| 25 | product-gallery | ✔ | 3 | 4 | 4 |
| 26 | product-compare | ✔ | 2 | 7 | 1 |
| 27 | product-table | ✔ | 1 | 6 | 2 |
| 28 | listing-filters | ⚠ | 0 | 0 (helpery) | 1 (`Contract`) |
| 29 | search-box | ⚠ | 0 | 0 (helpery) | 1 (`Contract`) |
| 30 | timeline | ✔ | 0 | 6 | 2 |
| 31 | compare-timeline | ✔ | 5 | 6 | 3 |
| 32 | newsletter | ✔ | 0 | 7 | 3 |
| 33 | booking-calendar | ✔ | 3 | 4 | 3 |
| 34 | appointment-form | ✔ | 2 | 4 | 3 |
| 35 | form-embed | ⚠ | 0 (helpery) | 0 (helpery) | 0 (helpery) |
| 36 | contact | ✔ | 1 | 5 | 4 |
| 37 | navigation | ✔ | 0 | 5 | 0 |
| 38 | footer | ❌ | 0 | 0 | 0 (brak `WidgetEditorSection`) |

Legenda:
- ✔ — edytor używa kontraktu `WidgetEditorSection`, drift głównie nazewniczy
- ⚠ — kontrakt zachowany przez helpery, ale top-level zakładka jest pusta lub niespójna
- ❌ — kontrakt złamany u podstaw

---

## 9. Najbliższe kroki (rekomendacja)

1. **Zatwierdzić kanon** z §6 — głównie nazwy sekcji + kolejność.
2. **TASK-336 (CONTRACT-01..07):** seria PR-ów per widget — przemianowanie tytułów `WidgetEditorSection` zgodnie z kanonem; bez zmian funkcjonalnych. Trywialny diff, łatwy review.
3. **TASK-337 (CONTRACT-08..10):** zlikwidować duplikaty tytułów (Hero/Background, Divider/Preview, Tabs/Accordion/Variant, StatsKpi/Header copy).
4. **TASK-338 (CONTRACT-11..14):** przepisać widgety wypadające z kontraktu (footer, listing-filters, search-box, posts-feed, form-embed, rich-text-section, navigation Advanced).
5. **TASK-339 (CONTRACT-15):** decyzja per widget — Wizard z prawdziwymi stepami albo wycofanie zakładki Wizard.
6. **TASK-340:** dodać runtime warning w `<WidgetEditorSection>` w trybie dev, gdy tytuł sekcji odbiega od kanonu (lista whitelist w `WidgetEditorControls.tsx`) — twardo wymusi konwencję na nowych widgetach.
7. **TASK-341:** dodać test integracyjny scanujący wszystkie 38 widgetów i porównujący tytuły sekcji vs kanonem (testing/widgets/contractDriftTest.ts).

---

## 10. Załączniki

- `_raw/<widget>.txt` — surowe wyciągi DOM z Playwright (Visual/Advanced/Wizard)
- `screenshots/<widget>-<mode>.png` — screenshoty per widget/zakładka (114 plików)
- `/tmp/widget_contracts_code.json` — wyciąg sekcji z kodu (top-level funkcje)
- `/tmp/widget_titles_by_mode.txt` — surowy listing tytułów per widget/mode z grep'a
- `/tmp/analyze_contract.py` — skrypt analityczny używany do §3-4

---

> Raport zamknięty po stronie analitycznej. Kolejny krok należy do autora kontraktu — zaakceptować kanon i otworzyć serię TASK-336+. Per-widget pliki `REPORT_<WIDGET>.md` zawierają mniejsze, ostrzejsze diff'y per komponent.
