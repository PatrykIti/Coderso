# RAPORT: FAQ Accordion Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #9 (FAQ Accordion Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `faq-accordion-audit` (oddzielna od innych agentów)
> **Strona testowa:** `/test-faq-accordion-0516` (UUID: `59dd9d58-eb80-4691-9749-9d8e2589e822`)

---

## 1. Przegląd widgetu

**Typ:** Content (standalone, bez slotów)
**Kategoria:** `content` / moduł `engagement`
**Warianty:** `single-column`, `two-column`, `compact`
**Ograniczenia elementów:** min 1 / max 12
**Złożoność:** `composite` / audience `beginner`
**Plik renderera:** `core/widgets/core/faqAccordion.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
**Presets sekcji:** `engagement:faq-proof`
**Presets strony:** `engagement:trust-loop`

FAQ Accordion to specjalistyczny widget content do sekcji FAQ — pary pytanie/odpowiedź. Zawiera opcjonalny nagłówek sekcji, trzy warianty układu (single-column, two-column, compact), kontrolę spacingu oraz personalizację kolorów. Oparty na natywnych elementach HTML `<details>/<summary>`.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

```ts
FaqAccordionData {
  header?: {
    title?: string;
    description?: string;
  };
  items: FaqAccordionItem[];    // min 1, max 12
  options?: {
    allowMultipleOpen?: boolean;
    defaultOpenIndex?: number;   // -1 = all collapsed
  };
  style?: {
    surface?: string;            // background color panelu
    border?: string;             // kolor obramowania
    divider?: string;            // kolor separatora Q/A
    spacing?: "none" | "sm" | "md" | "lg";
  };
}

FaqAccordionItem {
  id?: string;
  question?: string;
  answer?: string;
}
```

### 2.2 Warianty i spacing

| Wariant | Opis | Layout |
|---------|------|--------|
| `single-column` | Pionowa lista — domyślny | `grid-cols-1` |
| `two-column` | Dwukolumnowy układ FAQ | `grid-cols-1 lg:grid-cols-2` |
| `compact` | Zmniejszona gęstość, mniejsza czcionka | `grid-cols-1`, `text-sm`/`text-xs` |

| Spacing | Gap klasa | Padding panelu |
|---------|-----------|----------------|
| `none` | `gap-0` | `px-0 py-0` |
| `sm` | `gap-2` | `px-4 py-3` |
| `md` | `gap-3` | `px-5 py-4` |
| `lg` | `gap-4` | `px-6 py-5` |

### 2.3 Tryby edytora

| Tryb | Dostępne sekcje |
|------|-----------------|
| **Wizard** | Wariant (select), tytuł sekcji, liczba Q/A, lista Q/A |
| **Visual** | VariantCards, liczba Q/A, header copy (title + description), Q/A z Move Up/Down/Remove/Add, Display Behavior (allowMultipleOpen + defaultOpenIndex select), Colors & Spacing |
| **Advanced** | Open-state controls, Technical style tokens (raw inputs), Normalize/Reset buttons, JSON snapshot |

### 2.4 Normalizacja danych

- `normalizeFaqAccordionData()` — pełna normalizacja z fallbackami
- `normalizeFaqAccordionItems()` — uzupełnia brakujące Q/A fallback tekstami
- `resolveFaqAccordionVariant()` — waliduje wariant, fallback → `"single-column"`
- `resolveFaqAccordionSpacing()` — fallback → `"md"` (brak obsługi `"md"` w switch → patrz C3)
- `resolveDefaultOpenIndex()` — clampuje do zakresu itemów, fallback → `0`

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują podstawowe działanie)

| # | Problem | Obszar | Plik |
|---|---------|--------|------|
| C1 | **`allowMultipleOpen` nie działa w rendererze** — opcja `allowMultipleOpen: true` jest zapisywana i przekazywana przez `data-faq-multiple-open`, ale renderer nie ma żadnego JS, który by to honorował. Natywny `<details>` nie obsługuje grupowania — każdy panel otwiera się/zamyka niezależnie. `allowMultipleOpen=false` (single-open) **nie jest egzekwowane**. Faktycznie zawsze działa tryb multiple-open | Renderer | `faqAccordion.tsx:289` |
| C2 | **Brak wskaźnika expand/collapse** — `<summary>` renderuje sam tekst pytania bez żadnej ikony (chevron, +/-, strzałka). Użytkownik nie ma wizualnej wskazówki, że element jest klikalny/rozwijany. Domyślny marker przeglądarki (`▶`) jest jedyną wskazówką, i to o ile nie jest usunięty przez `list-none` | Renderer | `faqAccordion.tsx:358` |
| C3 | **Bug w `resolveFaqAccordionSpacing()`** — funkcja sprawdza `"none" || "sm" || "lg"`, ale **pomija `"md"`**. Wartość `"md"` trafia do gałęzi `return "md"` jako domyślny fallback, więc nie powoduje błędu — ale logika jest semantycznie niepoprawna | Renderer | `faqAccordion.tsx:143` |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak animacji otwierania/zamykania** — natywny `<details>` nie animuje. Brak opcji `transition`, `animation`, ani CSS `@starting-style` | Renderer |
| W2 | **Brak kontroli `maxWidth`** — sekcja ma hardcoded `max-w-6xl`. Brak opcji `sm`/`md`/`lg`/`full` | Layout |
| W3 | **Brak kontroli wyrównania nagłówka** — `text-center` hardcoded w `<header>`. Brak opcji left/center/right | Layout |
| W4 | **Brak padding/margin sekcji** — `px-4 py-8` hardcoded w `<section>`. Nie można usunąć pionowego paddingu | Layout |
| W5 | **Brak koloru tekstu pytania** — `<summary>` dziedziczy kolor z motywu, brak pola `questionTextColor` | Styl |
| W6 | **Brak koloru tekstu odpowiedzi** — `text-[var(--color-text)]/80` hardcoded, nieedytowalne | Styl |
| W7 | **Brak koloru tekstu nagłówka sekcji** — title i description w `<header>` bez pól kolorów | Styl |
| W8 | **Brak border-radius panelu** — `rounded-xl` hardcoded, brak opcji | Styl |
| W9 | **Brak opcji SEO FAQ schema (JSON-LD)** — brak `FAQPage` structured data, utracona szansa SEO | SEO |
| W10 | **Brak obsługi Markdown/HTML w `answer`** — pole `answer` renderuje plain text; brak możliwości linków, pogrubień, list | Treść |
| W11 | **Brak ikony per item** — nie można przypisać emoji lub ikony do pytania | Treść |
| W12 | **Brak kontroli font-size nagłówka sekcji** — `text-2xl`/`text-xl` hardcoded per wariant | Typografia |
| W13 | **Brak grupowania dla `openMode=single`** — `allowMultipleOpen=false` nie egzekwuje single-open bez JS | Logika |
| W14 | **Brak kontroli `border-width`** — `borderWidth: "1px"` hardcoded w `panelStyle` | Styl |
| W15 | **Brak fallback gdy `spacing="none"` i border** — przy `gap-0` panele dotykają się i granice między nimi się dublują wizualnie | Renderer |

### 3.3 Problemy UX edytora

| # | Problem | Tryb edytora |
|---|---------|--------------|
| U1 | **Brak potwierdzenia przy usunięciu itemu** — `removeItem()` działa natychmiast, bez confirmation dialog / undo | Visual |
| U2 | **Brak ClearableFieldHeader dla `border` i `divider`** — tylko `surface` ma przycisk Clear; `border` i `divider` nie można wyczyścić do wartości `undefined` | Visual |
| U3 | **Color picker tylko dla hex** — `resolvePickerColor()` akceptuje tylko `#rrggbb`/`#rgb`. Wartości CSS var (`var(--color-bg)`) nie działają z pickerem → picker wraca do `pickerFallback` | Visual |
| U4 | **Wizard nie ma pola opisu sekcji** — `FaqAccordionWizardEditor` ma `section title` ale brak pola `description` nagłówka | Wizard |
| U5 | **Brak etykiet akcji w Q/A move** — przyciski "Move up"/"Move down" bez ikon; małe ekrany mogą obcinać etykiety | Visual |
| U6 | **Brak licznika item w Q/A** — edycja 12 itemów bez widocznego postępu "8/12 items" | Visual |
| U7 | **Brak podglądu wyboru wariantu** — `VariantCards` to karty z opisem tekstowym; brak miniaturek lub svg-preview | Visual/Wizard |
| U8 | **`defaultOpenIndex` w Visual to Select z `"Item N"`** — nie wyświetla treści pytania, tylko "Item 1", "Item 2", co wymusza zapamiętanie indeksu | Visual |
| U9 | **Advanced: input `number` dla `defaultOpenIndex` bez opisowych kroków** — jest `min=-1`, `max=n-1`, ale brak informacji że `-1` = "all collapsed" w samym polu (tylko pod inputem jako hint) | Advanced |
| U10 | **Brak drag & drop reorder** — Move Up/Down działa tylko o jeden krok; brak przeciągania itemów | Visual |
| U11 | **Brak bulk actions** — nie można zaznaczyć i usunąć wielu Q/A naraz | Visual |

### 3.4 Dostępność (ARIA)

| # | Problem | Priorytet WCAG |
|---|---------|----------------|
| A1 | **`<section>` bez `aria-label` / `aria-labelledby`** — wrapper sekcji FAQ nie ma semantycznej etykiety dla screen readerów | AA |
| A2 | **`<summary>` z `list-none` usuwa domyślny marker przeglądarki** — klasa `list-none` ukrywa natywny wskaźnik `<details>` bez zastąpienia go inną wskazówką | AA |
| A3 | **Brak `aria-expanded` na `<summary>`** — choć natywny element to obsługuje, brak jawnego atrybutu może dezorientować niektóre technologie asystujące | AA |
| A4 | **`<article>` per FAQ item** — semantycznie `<article>` oznacza niezależny fragment; dla FAQ lepszy byłby `<div>` lub `<section>` z odpowiednią rolą | A |
| A5 | **Brak `id` na `<summary>` do `aria-labelledby`** — treść odpowiedzi (`<div>` po `<summary>`) powinna być labelowana pytaniem | AA |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=faq-accordion-audit`
> **Data testu:** 2026-05-16
> **Strona:** `/test-faq-accordion-0516` — nowa strona stworzona na potrzeby testów

### 4.1 Edytor Wizard

**Testowane:** wariant (select), tytuł, liczba Q/A, lista Q/A

| # | Test | Wynik |
|---|------|-------|
| ✅ | Domyślne 3 pytania załadowane poprawnie | OK |
| ✅ | Zmiana liczby pytań przez select | OK — zakres 1–12 |
| ✅ | Edycja Q/A przez Input + Textarea | OK |
| ✅ | Zmiana wariantu przez select | OK — wszystkie 3 opcje dostępne |
| ⚠️ | Brak pola "Description" nagłówka w Wizard | `header.description` edytowalne tylko w Visual |

### 4.2 Edytor Visual

**Testowane:** warianty, Q/A zarządzanie, behavior, kolory

| # | Test | Wynik |
|---|------|-------|
| ✅ | `Single Column` — VariantCard z `Selected` badge | OK |
| ✅ | `Two Column` — klikalne, badge zmienia się na `Selected` | OK |
| ✅ | `Compact` — klikalne, badge zmienia się na `Selected` | OK |
| ✅ | Move Up/Down przyciski działają | OK — Move Up disabled na pozycji 1, Move Down disabled na ostatniej |
| ✅ | Remove item — item usunięty natychmiast | **Bug U1 potwierdzony** — brak confirmation dialog |
| ✅ | Add item — nowy item z pustymi polami | OK, ale fallback "Question N"/"Answer N" od razu nie widać (pole puste) |
| ✅ | Switch `Allow multiple items open` | OK — toggle zmienia `data-faq-multiple-open` |
| ✅ | Select `Default open item` — opcje "None", "Item 1", "Item 2"... | **Bug U8 potwierdzony** — nie pokazuje treści pytania |
| ✅ | Wybór `None (all collapsed)` → `data-faq-default-open="-1"` | OK — wszystkie items zamknięte |
| ✅ | `Panel surface` ma przycisk Clear | OK |
| ❌ | `Panel border` — brak przycisku Clear | **Bug U2 potwierdzony** |
| ❌ | `Divider color` — brak przycisku Clear | **Bug U2 potwierdzony** |
| ❌ | Color picker pokazuje `#ffffff` zamiast `var(--color-bg)` | **Bug U3 potwierdzony** — picker fallback na hex |
| ✅ | Select Spacing (None/Compact/Default/Spacious) | OK — wszystkie opcje widoczne |

### 4.3 Edytor Advanced

| # | Test | Wynik |
|---|------|-------|
| ✅ | Switch `Allow multiple items open` | OK |
| ✅ | Spinbutton `Default open index` (`min=-1`, `max=n-1`) | OK — wartość `-1` działa |
| ⚠️ | Hint `Use -1 to collapse all items` tylko pod polem | **Bug U9** — brak wskazówki w samym polu |
| ✅ | Raw token inputs (surface/border/divider/spacing) | OK — działają |
| ✅ | Button `Normalize now` | OK — normalizuje dane |
| ✅ | Button `Reset to defaults` | OK — resetuje do defaults |
| ✅ | JSON snapshot `Raw payload snapshot` | OK — aktualny payload widoczny |
| ✅ | Layout section (Padding top/bottom, Margin top/bottom) | OK — globalne kontrole layoutu |
| ✅ | Visibility (Desktop/Tablet/Mobile switches) | OK — wszystkie domyślnie `true` |

### 4.4 Zachowanie Accordionu w Preview (Admin)

Tryb Preview (`dialog "Page Preview"` z iframe):

| # | Test | Wynik |
|---|------|-------|
| ✅ | Item 1 domyślnie otwarty (`defaultOpenIndex=0`) | OK |
| ❌ | `allowMultipleOpen=false` — kliknięcie item 2 pozostawia item 1 otwarty | **Bug C1 potwierdzony** — brak single-open enforcement |
| ❌ | Brak ikony chevron przy pytaniu | **Bug C2 potwierdzony** — `list-none` usuwa marker, brak zastępnika |
| ✅ | Klikanie pytania otwiera/zamyka odpowiedź | OK (native `<details>`) |
| ✅ | `defaultOpenIndex=-1` → wszystkie items zamknięte | OK |

### Screenshoty Admin Preview

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

- `faq-accordion-wizard-editor.png` — edytor Wizard z 3 pytaniami
- `faq-accordion-visual-editor.png` — edytor Visual (Single Column)
- `faq-accordion-two-column-preview.png` — wariant Two Column
- `faq-accordion-compact-preview.png` — wariant Compact
- `faq-accordion-advanced-editor.png` — edytor Advanced z JSON snapshot
- `faq-accordion-preview-dialog.png` — dialog Runtime Preview
- `faq-accordion-multiple-open-bug.png` — bug C1 (wszystkie items otwarte)
- `faq-accordion-colors-section.png` — sekcja Colors (brak Clear dla border/divider)
- `faq-accordion-spacing-none-admin.png` — spacing=none w Admin

---

## 5. Testy na froncie (localhost:3000)

> **URL:** `http://localhost:3000/test-faq-accordion-0516`
> **Status strony:** Opublikowana (Published)

### 5.1 Rendering widgetu

| # | Test | Wynik |
|---|------|-------|
| ✅ | Widget renderuje się poprawnie na froncie | OK |
| ✅ | `data-faq-variant`, `data-faq-spacing`, `data-faq-multiple-open`, `data-faq-default-open` obecne | OK — wszystkie atrybuty w HTML |
| ✅ | Wariant `two-column` renderuje `grid grid-cols-1 lg:grid-cols-2 gap-3` | OK — responsive grid |
| ✅ | Nagłówek sekcji (title + description) wyświetla się | OK |
| ✅ | `defaultOpenIndex=0` → item 1 otwarty na start | OK |
| ✅ | `defaultOpenIndex=-1` → wszystkie items zamknięte na start | OK |

### 5.2 Interaktywność

| # | Test | Wynik |
|---|------|-------|
| ❌ | `allowMultipleOpen=false` — kliknięcie otwiera item, inne nie zamykają się | **Bug C1 potwierdzony na froncie** |
| ❌ | Brak chevron/strzałki wskazującej na klikalność | **Bug C2 potwierdzony** — `list-style-type: none`, brak zastępnika |
| ✅ | Kliknięcie pytania otwiera odpowiedź (native `<details>`) | OK |
| ✅ | Kliknięcie otwartego pytania zamyka je | OK |

### 5.3 ARIA / Dostępność

| # | Test | Wynik |
|---|------|-------|
| ❌ | `<section aria-label>` — brak | **Bug A1 potwierdzony** — `ariaLabel: null` |
| ❌ | `<section aria-labelledby>` — brak | **Bug A1 potwierdzony** |
| ❌ | `<summary aria-expanded>` — brak | **Bug A3 potwierdzony** — `summaryAriaExpanded: null` |
| ❌ | `<summary id>` — brak | **Bug A5 potwierdzony** — `summaryId: ""` |

### 5.4 Spacing=none — podwójne granice

Przy `spacing="none"` (gap=0), każdy `<article>` ma:
- `borderTop: 1px`, `borderBottom: 1px`, `marginBottom: 0px`

Efekt: między itemami pojawia się wizualnie podwójne obramowanie (2px zamiast 1px). **Bug W15 potwierdzony.**

### Screenshoty Frontend

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

- `faq-accordion-frontend-initial.png` — frontend z defaultOpenIndex=0
- `faq-accordion-frontend-multiple-open-bug.png` — bug C1 na froncie (item 1 + item 2 otwarte)
- `faq-accordion-two-column-frontend.png` — wariant two-column na froncie
- `faq-accordion-spacing-none-frontend.png` — spacing=none z podwójnymi granicami

---

## 6. Porównanie Admin Preview vs Frontend

| Zachowanie | Admin Preview | Frontend | Różnica? |
|------------|---------------|----------|----------|
| `allowMultipleOpen=false` — single-open enforcement | Nie działa | Nie działa | **Brak różnicy — oboje broken** |
| Wskaźnik expand/collapse (chevron) | Brak | Brak | **Brak różnicy — oboje brak** |
| `defaultOpenIndex=-1` (all collapsed) | Działa | Działa | Brak różnicy |
| `defaultOpenIndex=0` (first open) | Działa | Działa | Brak różnicy |
| Two-column variant `lg:grid-cols-2` | Działa (canvas resize) | Działa (responsive) | Brak różnicy |
| Spacing=none + podwójne granice | Widoczne | Widoczne | Brak różnicy |
| ARIA atrybuty | Brak | Brak | Brak różnicy |
| Natywna interaktywność `<details>` | Działa | Działa | Brak różnicy |

**Wniosek:** Admin preview (iframe z runtime theme) i frontend zachowują się identycznie. Wszystkie bugi renderera reprodukują się w obu środowiskach. Nie ma rozbieżności wynikających z różnicy środowisk.

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Status testu | Wpływ |
|-----------|---|---------|--------------|-------|
| 🔴 KRYTYCZNY | C1 | **`allowMultipleOpen=false` nie egzekwuje single-open** | ✅ Potwierdzony (Admin + Frontend) | Kluczowa opcja FAQ nie działa — zawsze można otworzyć wiele |
| 🔴 KRYTYCZNY | C2 | **Brak wskaźnika expand/collapse (chevron)** | ✅ Potwierdzony (Admin + Frontend) | Użytkownik nie wie że pytanie jest klikalne |
| 🟠 WYSOKI | A1–A5 | **Braki ARIA i dostępności** | ✅ Potwierdzony (Frontend) | Niedostępność dla screen readerów |
| 🟠 WYSOKI | W1 | **Brak animacji** | ✅ Potwierdzony (oboje) | Skokowe otwieranie negatywnie wpływa na odbiór UI |
| 🟠 WYSOKI | W9 | **Brak SEO FAQ schema** | Analiza kodu | Utracona szansa SEO dla FAQ |
| 🟠 WYSOKI | W10 | **Plain text w odpowiedziach** | Analiza kodu | Brak linków, formatowania, list w Q/A |
| 🟡 ŚREDNI | U1 | **Brak potwierdzenia przy usunięciu** | ✅ Potwierdzony (Admin) | Przypadkowe usunięcie Q/A bez możliwości cofnięcia |
| 🟡 ŚREDNI | U2 | **Brak Clear dla border/divider** | ✅ Potwierdzony (Admin) | Niespójna UX edytora — surface można wyczyścić, reszty nie |
| 🟡 ŚREDNI | U3 | **Color picker fallback na `#ffffff` dla CSS var** | ✅ Potwierdzony (Admin) | Picker bezużyteczny przy wartościach `var(--color-*)` |
| 🟡 ŚREDNI | W2, W3, W4 | **Hardcoded maxWidth, wyrównanie nagłówka, padding sekcji** | Analiza kodu | Ograniczony wachlarz konfiguracyjny layoutu |
| 🟡 ŚREDNI | W5, W6, W7 | **Brak kontroli kolorów tekstu** | Analiza kodu | Niepełna personalizacja typografii |
| 🟡 ŚREDNI | W15 | **spacing=none → podwójne granice między itemami** | ✅ Potwierdzony (Admin + Frontend) | Wizualny defekt przy spacing=none |
| 🟡 ŚREDNI | U8 | **Select defaultOpenIndex nie pokazuje treści pytania** | ✅ Potwierdzony (Admin) | Redaktor musi zapamiętać indeks zamiast widzieć pytanie |
| 🟢 NISKI | C3 | **Bug w `resolveFaqAccordionSpacing()` — brak `"md"` w guard** | Analiza kodu | Niski wpływ (fallback=md), ale logika niepoprawna |
| 🟢 NISKI | U10 | **Brak drag & drop reorder** | Analiza kodu | Move Up/Down działa, ale jest nieefektywne przy 10+ itemach |
| 🟢 NISKI | W11 | **Brak ikon per item** | Analiza kodu | Brak możliwości wizualnego wyróżnienia pytań |

---

## 8. Kluczowe wnioski techniczne

### Przyczyna bug C1 (`allowMultipleOpen=false` nie działa)

Natywny element HTML `<details>` obsługuje wyłącznie zachowanie **multiple-open** — każdy panel działa niezależnie. Aby wymusić **single-open**, konieczne jest użycie JavaScriptu (event listener na `toggle`). Opcja `allowMultipleOpen=false` jest zapisywana w danych i przekazywana przez `data-faq-multiple-open`, ale renderer nie zawiera żadnej logiki JS egzekwującej to zachowanie.

**Naprawa:** Dodać event listener `details.addEventListener('toggle', ...)` który zamyka inne panele gdy jeden się otwiera, pod warunkiem `data-faq-multiple-open === "false"`.

### Przyczyna bug C2 (brak chevron)

Klasa Tailwind `list-none` na `<summary>` usuwa domyślny marker przeglądarki (trójkąt `▶`). Brak czegokolwiek go zastępuje. Użytkownik widzi tylko tekst pytania.

**Naprawa:** Dodać ikonę chevron (`▼`/`▶`) przez pseudo-element CSS `::before`/`::after` lub inline SVG jako dziecko `<summary>`, obrócone przy `details[open]`.

### Przyczyna bug W15 (podwójne granice)

Każdy `<article>` ma `borderWidth: 1px` ze wszystkich stron. Przy `gap=0` (spacing=none) bordery sąsiadujących itemów nakładają się wizualnie: `borderBottom=1px` + `borderTop=1px` = 2px między itemami.

**Naprawa:** Przy `spacing="none"` użyć `border-collapse`-like techniki — np. negatywne marginesy (`-mt-px`) lub `divide-y` Tailwind zamiast border na każdym item.

---

## Final status po TASK-293 i TASK-266 (2026-05-17)

| Row | Status | Owner | Evidence |
|---|---|---|---|
| C1, W13 | task-256-owned / live | TASK-256 shared runtime contract | FAQ items still use scoped summary/content IDs and grouped single-open runtime semantics already introduced before this family; TASK-266 did not duplicate that contract. |
| C2, C3, W15, U2, U3, A1-A5 | fixed | TASK-293 | `core/widgets/core/faqAccordion.tsx`, `FaqAccordionEditors.tsx`, `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`, `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`, `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` |
| W1, W2, W3, W4, W5, W6, W7, W8, W12, W14 | fixed | TASK-266-01 | Bounded layout, typography, color, radius, border-width, and motion controls now live in schema, renderer, editor, and focused tests. |
| W10, W11 | fixed | TASK-266-02 | FAQ answers now support a bounded markdown subset with safe widget href handling, plus per-item icons and plain-text extraction. |
| W9 | fixed | TASK-266-03 | FAQ now exposes an opt-in Visual toggle for safe `FAQPage` JSON-LD serialization. |
| U4, U6, U8, U9 | fixed | TASK-266-04 | Wizard now edits description, Visual shows `current/total` progress, and open-state controls use question-aware labels plus raw-index fallback. |
| U1, U5, U7, U10, U11 | fixed | TASK-266-05 | FAQ item management now includes confirm-before-remove, compact icon-forward actions, variant miniatures, native drag/drop reorder, and bounded bulk delete. |

### Refreshed validation evidence

- Passed:
  - `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun run lint`
  - `bun run gates:coderso`
- Environment blocker:
  - `bun run scan:security:strict` is not green in this worktree for unrelated
    local-environment reasons: Semgrep fails with `ca-certs: empty trust
    anchors` and `bun audit` returns `ConnectionRefused`.

*Raport odświeżony po implementacji TASK-293 i TASK-266 — 2026-05-17.*
