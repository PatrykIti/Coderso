# RAPORT: Stats KPI Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright (Stats KPI Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `stats-kpi-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Content
**Audience:** Beginner
**Warianty:** `cards`, `inline`, `split-highlight`
**Ograniczenia metryk:** min 1 / max 12

Stats KPI widget służy do prezentacji kluczowych wskaźników wydajności (KPI) — wartości liczbowych z etykietami, opisami i ikonami. Obsługuje trzy układy prezentacji oraz globalne sterowanie kolorem, wyrównaniem, spacingiem i separatorami.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `header.title`, `header.description` |
| **Metryki (items)** | `id`, `value` (wymagane), `label`, `description`, `icon` |
| **Styl** | `alignment` (start/center/end), `spacing` (none/sm/md/lg), `valueColor`, `labelColor`, `divider` (bool), `cardBackground` (clearable), `cardBorderColor` (clearable) |

### 2.2 Warianty renderera

| Wariant | Opis | Grid |
|---------|------|------|
| `cards` | Siatka kart KPI z równym akcentem | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (hardcoded) |
| `inline` | Kompaktowy rząd metryk z separatorami | `flex flex-wrap` + `justify-{alignment}` |
| `split-highlight` | Pierwsza metryka wyróżniona (lewa), reszta w siatce | `grid-cols-1 lg:grid-cols-3` — firstitem: col-span-1, rest: col-span-2 |

### 2.3 Tryby edytora

- **Wizard** — variant (Select), metric count (Select 1–12), tylko pola `value` dla każdej metryki
- **Visual** — pełny inspektor: variant cards, header, metryki (value/label/description/icon + move/remove/add), kolory, layout
- **Advanced** — duplikuje alignment/spacing/colors z Visual + Normalize/Reset + JSON snapshot

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **`divider` switch widoczny dla `cards` i `split-highlight` — nie ma żadnego efektu wizualnego**. Kod renderera: `border-l` z `divider` aplikuje się TYLKO w wariancie `inline`. W `cards`/`split-highlight` pole `divider` jest persystowane w danych, ale renderer je ignoruje — przełącznik w edytorze jest mylący i nie daje feedbacku | Edytor / Renderer |
| C2 | **`cards` grid zawsze `lg:grid-cols-4` niezależnie od liczby metryk** — 3 metryki → pusta 4. kolumna; 5 metryk → układ 4+1; 6 metryk → 4+2. Brak kontroli liczby kolumn z edytora | Renderer |
| C3 | **Wizard pokazuje tylko pola `value` — brak `label`, `description`, `icon` i `header`** — użytkownik Wizard mode nie może ustawić treści etykiet ani tytułu sekcji bez przejścia do Visual | Edytor Wizard |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak kontroli rozmiaru wartości (`valueSize`)** — hardcoded `text-3xl` (cards/inline), `text-4xl` tylko dla pierwszego split-highlight. Nie można zmienić z edytora | Typografia |
| W2 | **Brak `descriptionColor`** — opis metryki zawsze `var(--color-text)/70`, bez możliwości zmiany | Typografia |
| W3 | **Brak `prefix`/`suffix` per metryka** — wartości jak „$120K" lub „99.9%" muszą być wpisane ręcznie jako jeden string; brak semantycznego rozdzielenia | Treść |
| W4 | **Brak opcji tła dla całej sekcji** — `cardBackground` dotyczy tylko kart, brak `sectionBackground` (kolor/gradient dla `<section>`) | Layout |
| W5 | **Brak `maxWidth` per widget** — hardcoded `max-w-6xl` (1152px) bez możliwości konfiguracji | Layout |
| W6 | **Brak `padding` sekcji** — hardcoded `px-4 py-8` bez kontroli z edytora | Layout |
| W7 | **Brak ikony wewnątrz tła/ramki ikony per metrykę** — icon renderuje się w kwadracie `h-8 w-8` z `border-[var(--color-border)]/70`, bez możliwości zmiany koloru tła ikony, koloru obramowania lub rozmiaru | Styl ikonki |
| W8 | **Brak per-metrykowego koloru akcentu** — `valueColor` i `labelColor` są globalne; nie można wyróżnić jednej metryki innym kolorem | Kolory |
| W9 | **Brak CTA/linku per metryka** — nie można uczynić metryki klikalną, brak pola `href` per item | Interaktywność |
| W10 | **Brak wskaźnika trendu** — brak strzałki ↑/↓ lub etykiety zmiany (np. „+12% MoM") | Treść |
| W11 | **`split-highlight` — grid drugorzędnych metryk hardcoded `sm:grid-cols-2`** — przy 1, 3, 5 drugorzędnych metrykach layout jest niezbilansowany; brak kontroli liczby kolumn drugorzędnych | Renderer |
| W12 | **Brak animacji (count-up)** — wartości statyczne, brak opcji animacji scroll-triggered counter | Efekty |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Wizard używa `<Select>` dla wariantu zamiast visual cards** — Visual editor ma ładne karty z opisami; Wizard ma zwykły dropdown — brak spójności, gorszy onboarding | Edytor Wizard |
| U2 | **ColorField (valueColor, labelColor) — color picker akceptuje tylko hex (#rrggbb), CSS variables jak `var(--color-text)` powodują fallback do `#0f172a`** — użytkownik wpisuje CSS var, kolor pickera nie odzwierciedla rzeczywistej wartości; brak tooltipa o tym ograniczeniu | Edytor |
| U3 | **`divider` switch nie ma kontekstu wariantu** — przełącznik jest widoczny zawsze, ale działa tylko w `inline`. Opis mówi „Used mainly by inline variant" ale nie blokuje/ukrywa przełącznika w innych wariantach | Edytor |
| U4 | **Brak opcji wyczyszczenia pola `header`** — aby usunąć header, użytkownik musi ręcznie skasować oba pola title i description; brak przycisku „Clear header" | Edytor |
| U5 | **Pole `icon` bez podpowiedzi co wpisać** — placeholder „🚀" sugeruje emoji, ale brak info czy akceptowane są też inne formaty (np. SVG, klasa ikony). Brak walidacji. | Edytor |
| U6 | **Advanced editor duplikuje alignment/spacing z Visual** — sekcja „Technical spacing and alignment tokens" jest identyczna z „Layout display options" w Visual. Wartość dla użytkownika advanced editora jest znikoma | Edytor Advanced |
| U7 | **Brak drag & drop reorderingu metryk** — tylko Move up/Move down buttony; przy 12 metrykach przeniesienie pozycji 1 na 12 wymaga 11 kliknięć | Edytor |
| U8 | **ColorField i ClearableInputField w jednej sekcji „Typography and colors"** — cardBackground i cardBorderColor to style karty (layout), nie typografia; sekcja ma mieszane koncepcje | Edytor |
| U9 | **Brak tooltipów przy opcjach spacing** — "None", "Compact", "Default", "Spacious" bez informacji o wartościach gap (0, 0.5rem, 1rem, 1.5rem) | Edytor |

### 3.4 Problemy renderera (frontend/dostępność)

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **`<section>` bez `aria-label` ani `aria-labelledby`** — wrapper sekcji nie ma semantycznego opisu dla technologii asystujących | Dostępność |
| R2 | **`<article>` per metrykę bez `aria-label`** — każda metryka jest `<article>`, ale bez dostępnej nazwy | Dostępność |
| R3 | **Ikona emoji bez `aria-hidden="true"`** — screen reader odczyta emoji jako tekst (np. „Rocket" zamiast milczenia) | Dostępność |
| R4 | **`<h3>` dla tytułu nagłówka widgetu** — może zaburzać hierarchię nagłówków strony jeśli widget użyty bez h1/h2 w kontekście | Semantyka HTML |
| R5 | **`cards` — `grid-cols-4` na `lg` bez `auto-fit`** — niepełne rzędy (3 karty, 5 kart) powodują wizualne „dziury" | Renderer |
| R6 | **`split-highlight` — niezbilansowany układ przy nieparzystej liczbie drugorzędnych metryk** — np. 4 drugorzędne metryki w `sm:grid-cols-2` → 2×2 (ok); 3 metryki → 2+1 (ostatnia rozciągnięta na pełną szerokość) | Renderer |
| R7 | **Brak `min-height` sekcji** — przy 1 metryce z krótką treścią widget wygląda pusto | Layout |
| R8 | **`divider` opacity hardcoded `/70`** — `border-[var(--color-border)]/70` bez możliwości konfiguracji intensity separatora | Renderer |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=stats-kpi-audit`
> **Strona testowa:** *do uzupełnienia po teście*
> **Data testu:** 2026-05-16

*Sekcja uzupełniana po testach Playwright.*

---

## 5. Testy na froncie (localhost:3000)

> **URL:** *do uzupełnienia po teście*

*Sekcja uzupełniana po testach Playwright.*

---

## 6. Porównanie Admin Preview vs Frontend

*Sekcja uzupełniana po testach Playwright.*

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **`divider` switch bez efektu w `cards`/`split-highlight` — mylące UX** | Użytkownik włącza funkcję bez feedbacku o jej braku efektu |
| 🔴 KRYTYCZNY | C2 | **`cards` grid zawsze 4 kolumny — wizualne dziury** | Każda liczba metryk inna niż 4/8/12 daje niepełne rzędy |
| 🔴 KRYTYCZNY | C3 | **Wizard bez pól label/description/icon/header** | Użytkownicy onboardingu nie mogą ustawić pełnej treści |
| 🟠 WYSOKI | R1, R2, R3 | **Brak ARIA na section, article i emoji** | Niedostępność dla screen readerów |
| 🟠 WYSOKI | W1 | **Brak kontroli rozmiaru wartości** | Kluczowa typografia KPI niemodyfikowalna |
| 🟠 WYSOKI | W8 | **Brak per-metrykowego koloru akcentu** | Niemożność wizualnego wyróżnienia kluczowego KPI |
| 🟡 ŚREDNI | U2 | **ColorField + CSS variables — fallback kolor pickera** | Mylące UX przy CSS variables |
| 🟡 ŚREDNI | U3 | **divider switch bez kontekstu wariantu** | Dezorientacja użytkownika |
| 🟡 ŚREDNI | W4, W5, W6 | **Brak sectionBackground, maxWidth, padding** | Ograniczony layout |
| 🟡 ŚREDNI | W9 | **Brak CTA per metryka** | Brak możliwości linkowania metryk |
| 🟡 ŚREDNI | U7 | **Brak drag & drop** | Niekomfortowa reorganizacja przy wielu metrykach |
| 🟢 NISKI | W3, W10, W12 | prefix/suffix, trend, animacja | Rozszerzenie treści i efektów |

---

## 8. Sugerowane naprawy

### 8.1 Naprawa C1 (divider — brak efektu w cards/split-highlight)

**Opcja A** — Ukryj przełącznik divider gdy wariant ≠ inline:

**Plik:** `StatsKpiEditors.tsx` — sekcja „Layout display options"
```tsx
{resolveStatsKpiVariant(variant) === "inline" && (
  <div className="flex items-center justify-between rounded-md border px-3 py-2">
    {/* ... Switch divider ... */}
  </div>
)}
```

**Opcja B** — Zaimplementuj `divider` w `cards` jako border między kartami (Tailwind `divide-x`/`divide-y`).

### 8.2 Naprawa C2 (cards — dynamiczna liczba kolumn)

**Plik:** `statsKpi.tsx` — `containerClassName` dla wariantu `cards`

```tsx
// Zamiast hardcoded lg:grid-cols-4:
const colsClass = items.length <= 2 ? "lg:grid-cols-2"
  : items.length === 3 ? "lg:grid-cols-3"
  : items.length <= 6 ? "lg:grid-cols-3"
  : "lg:grid-cols-4";

const containerClassName = joinClasses("grid grid-cols-1 sm:grid-cols-2", colsClass, cardsGridClassMap[spacing]);
```

Lub dodać pole `columns: 2 | 3 | 4` do `StatsKpiData.style`.

### 8.3 Naprawa R1, R2, R3 (ARIA)

**Plik:** `statsKpi.tsx`

```tsx
// Section:
<section aria-label={normalized.header?.title || "Key metrics"} ...>

// Article per item:
<article aria-label={`${item.value} ${item.label}`} ...>

// Icon emoji:
<span aria-hidden="true" className="inline-flex h-8 w-8 ...">
  {item.icon}
</span>
```

### 8.4 Naprawa C3 (Wizard — brak label/icon)

**Plik:** `StatsKpiEditors.tsx` — `StatsKpiWizardEditor`

Dodać pola `label` i `icon` per metrykę w Wizard obok `value`, oraz skrócone pola `header.title`.

---

*Raport wstępny z analizy kodu — sekcje 4–6 uzupełniane po testach Playwright.*
