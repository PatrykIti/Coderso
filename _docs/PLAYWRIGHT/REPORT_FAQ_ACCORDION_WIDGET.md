# RAPORT: FAQ Accordion Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #9 (FAQ Accordion Widget)  
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000  
> **Sesja przeglądarki:** `faq-accordion-audit` (oddzielna od innych agentów)

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

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 5. Testy na froncie (localhost:3000)

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 6. Porównanie Admin Preview vs Frontend

*(Sekcja uzupełniana po testach przeglądarkowych)*

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **`allowMultipleOpen=false` nie egzekwuje single-open** | Kluczowa opcja FAQ nie działa — zawsze można otworzyć wiele |
| 🔴 KRYTYCZNY | C2 | **Brak wskaźnika expand/collapse (chevron)** | Użytkownik nie wie że pytanie jest klikalne |
| 🟠 WYSOKI | A1–A5 | **Braki ARIA i dostępności** | Niedostępność dla screen readerów |
| 🟠 WYSOKI | W1 | **Brak animacji** | Skokowe otwieranie negatywnie wpływa na odbiór UI |
| 🟠 WYSOKI | W9 | **Brak SEO FAQ schema** | Utracona szansa SEO dla FAQ |
| 🟠 WYSOKI | W10 | **Plain text w odpowiedziach** | Brak linków, formatowania, list w Q/A |
| 🟡 ŚREDNI | U1 | **Brak potwierdzenia przy usunięciu** | Przypadkowe usunięcie Q/A bez możliwości cofnięcia |
| 🟡 ŚREDNI | U2 | **Brak Clear dla border/divider** | Niespójna UX edytora — surface można wyczyścić, reszty nie |
| 🟡 ŚREDNI | W2, W3, W4 | **Hardcoded maxWidth, wyrównanie nagłówka, padding sekcji** | Ograniczony wachlarz konfiguracyjny layoutu |
| 🟡 ŚREDNI | W5, W6, W7 | **Brak kontroli kolorów tekstu** | Niepełna personalizacja typografii |
| 🟡 ŚREDNI | U8 | **Select defaultOpenIndex nie pokazuje treści pytania** | Redaktor musi zapamiętać indeks zamiast widzieć pytanie |
| 🟢 NISKI | C3 | **Bug w `resolveFaqAccordionSpacing()` — brak `"md"` w guard** | Niski wpływ (fallback=md), ale logika niepoprawna |
| 🟢 NISKI | U10 | **Brak drag & drop reorder** | Move Up/Down działa, ale jest nieefektywne przy 10+ itemach |
| 🟢 NISKI | W11 | **Brak ikon per item** | Brak możliwości wizualnego wyróżnienia pytań |

---

*Raport w toku — sekcje 4–6 uzupełniane po testach Playwright.*
