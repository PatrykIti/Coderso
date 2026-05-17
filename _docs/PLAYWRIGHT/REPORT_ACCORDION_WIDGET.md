# RAPORT: Accordion Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #8 (Accordion Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona testowa:** TEST-ACCORDION-0516 (`/test-accordion-0516`)
> **Sesja przeglądarki:** `accordion-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetów

Projekt zawiera **dwa oddzielne widgety akordeonowe** z różnymi modelami danych i przeznaczeniami:

### 1.1 Accordion Widget (layout)

**Typ:** Layout / Composite (repeatable slots)
**Kategoria:** `layout`
**Warianty:** `soft`, `bordered`, `compact`
**Ograniczenia elementów:** min 2 / max 8
**Plik renderera:** `core/widgets/core/accordion.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/AccordionEditors.tsx`

Accordion to ogólny widget layoutowy z zagnieżdżonymi slotami — każdy item może zawierać dowolne inne widgety. Oparty na natywnych elementach HTML `<details>/<summary>`.

### 1.2 FAQ Accordion Widget (content)

**Typ:** Content (standalone, bez slotów)
**Kategoria:** `content`
**Warianty:** `single-column`, `two-column`, `compact`
**Ograniczenia elementów:** min 1 / max 12
**Plik renderera:** `core/widgets/core/faqAccordion.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`

FAQ Accordion to specjalistyczny widget do sekcji FAQ — pary pytanie/odpowiedź. Zawiera sekcję nagłówkową, opcjonalny układ dwukolumnowy oraz kontrolę spacingu.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych — Accordion

| Sekcja | Pola |
|--------|------|
| **Elementy** | `id`, `title`, `description` (na każdy item) |
| **Opcje** | `openMode` (single/multiple), `defaultOpenIds[]`, `collapsible`, `initiallyOpenId`, `allowMultiple` |
| **Styl** | `surfaceColor`, `borderColor`, `summaryTextColor` |

### 2.2 Model danych — FAQ Accordion

| Sekcja | Pola |
|--------|------|
| **Nagłówek** | `header.title`, `header.description` |
| **Elementy** | `id`, `question`, `answer` (na każdy item) |
| **Opcje** | `allowMultipleOpen`, `defaultOpenIndex` |
| **Styl** | `surface`, `border`, `divider`, `spacing` (none/sm/md/lg) |

### 2.3 Tryby edytora

#### Accordion
- **Wizard** — wariant + structure (count, initially-open, title/description per item) + przycisk "Continue to layout and styling"
- **Visual** — Wizard + BehaviorSection (openMode, collapsible, default open, kolory)
- **Advanced** — Visual + Diagnostics (JSON snapshot)

#### FAQ Accordion
- **Wizard** — wariant (select), section title, count, Q&A list
- **Visual** — VariantCards, count, header copy, Q&A z Move/Remove/Add, behavior, colors/spacing
- **Advanced** — Open-state controls, token inputs, Normalize/Reset buttons, JSON snapshot

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| C1 | **`shouldOpen && index === 0` blokuje dowolny default open item** — w `accordion.tsx` warunek `item.instanceId === defaultOpenIds[0] && index === 0` sprawia, że tylko item na pozycji 0 może być domyślnie otwarty. Wybór "Default open item = Section 2" powoduje, że ŻADEN item nie jest otwarty (item 2 ma `index=1`, więc `index===0` = false). Bug potwierdzony w rendererze: `shouldOpen = "2"==="2" && 1===0 = false` | Accordion | Renderer |
| C2 | **`allowMultipleOpen` nie działa w rendererze FAQ** — mimo włączenia opcji, renderer używa wyłącznie `defaultOpenIndex` (single index). Efekt: zawsze tylko jeden item otwarty przy załadowaniu, nawet gdy `allowMultipleOpen=true` | FAQ Accordion | Renderer |
| C3 | **`collapsible=false` nie jest egzekwowane** — natywny `<details>` nie obsługuje zakazu zwijania bez JS. Opcja zapisywana w danych, ale nie ma efektu w rendererze — potwierdzono: po wyłączeniu "Allow all closed" kliknięcie otwartego itemu nadal go zamyka | Accordion | Renderer |
| C4 | **Brak wskaźnika expand/collapse (chevron/arrow)** — `<summary>` renderuje sam tekst bez żadnej ikony toggle. Użytkownik nie ma wizualnej wskazówki, że panel jest klikalny — `summaryInnerHTML: "Section 1"` (potwierdzono na froncie) | Oba | Renderer |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| W1 | **Brak kontroli animacji/przejść** — natywny `<details>` nie animuje otwierania/zamykania. Brak opcji `transition-duration`, `animation` | Oba | Renderer |
| W2 | **Brak ikony/emoji per item** — nie można dodać ikony do tytułu elementu akordeonowego | Accordion | Dane/Renderer |
| W3 | **Brak koloru tekstu treści (body/description)** — `text-[var(--color-text)]/70` hardcoded, nieedytowalne | Accordion | Styl |
| W4 | **Brak koloru tekstu pytania w FAQ** — brakuje `questionTextColor`; tylko panel surface/border/divider | FAQ Accordion | Styl |
| W5 | **Brak kontroli padding panelu** — hardcoded per variant (`px-4 py-3.5` dla soft, `px-3 py-2` dla compact) | Accordion | Layout |
| W6 | **Brak kontroli border-radius** — radius hardcoded per variant (`rounded-xl`, `rounded-lg`, `rounded-md`) | Accordion | Styl |
| W7 | **Brak opcji `maxWidth`** — widget rozciąga się na pełną szerokość kontenera bez możliwości ograniczenia | Oba | Layout |
| W8 | **Brak kontroli wyrównania nagłówka FAQ** — `text-center` hardcoded, brak opcji left/right | FAQ Accordion | Layout |
| W9 | **Brak padding/margin sekcji FAQ** — `px-4 py-8` hardcoded w `FaqAccordionBlock` | FAQ Accordion | Layout |
| W10 | **Brak pola koloru tekstu nagłówka FAQ** (header title + description) | FAQ Accordion | Styl |
| W11 | **Brak opcji "none open by default" w Accordion** — `initiallyOpenId` zawsze wskazuje na jakiś item; brak możliwości uruchomienia z wszystkimi zamkniętymi przy `collapsible=true` | Accordion | Opcje |
| W12 | **Brak font-size/weight dla tytułu elementu** — rozmiar i pogrubienie `summary` hardcoded per variant | Oba | Typografia |
| W13 | **Brak opcji SEO schema (FAQPage JSON-LD)** — FAQ Accordion to idealne miejsce dla `FAQPage` structured data | FAQ Accordion | SEO |
| W14 | **Brak linkowania w treści Q&A** — pola `answer` to plain text, brak markdown/HTML | FAQ Accordion | Treść |

### 3.3 Problemy UX edytora

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| U1 | **Eksponowanie `slot id` w edytorze** — `"ITEM 1 (SLOT ID: 1)"` i `"ITEM 2 (SLOT ID: 2)"` widoczne dla redaktora; techniczna etykieta nie powinna być widoczna w UI — potwierdzono vizualnie | Accordion | Edytor |
| U2 | **Zduplikowane pola kontroli domyślnego itemu** — "Initially open item" w sekcji ITEMS (Wizard/Visual/Advanced) ORAZ "Default open item" w sekcji BEHAVIOR (Visual/Advanced) kontrolują to samo. Redaktor nie wie, które jest wiążące | Accordion | Edytor |
| U3 | **Switch "Allow all closed" ma niejasny opis** — `"Keep disclosure state collapsible after the default open state"` — zbyt techniczne dla redaktora treści; potwierdzono w UI | Accordion | Edytor |
| U4 | **Brak podglądu wizualnego wariantów** — tylko karty z tekstem; brak miniaturek reprezentacji wariantów (soft/bordered/compact) | Oba | Edytor |
| U5 | **Brak przycisku Move Up/Down w Accordion editor** — można zmienić liczbę items selektem, ale nie można przestawiać kolejności | Accordion | Edytor |
| U6 | **Brak przycisku "Add item" w Accordion** — zmiana liczby tylko przez dropdown select; nie ma UX-owego "dodaj jeszcze jeden" | Accordion | Edytor |
| U7 | **Brak ClearableFieldHeader dla `borderColor` i `summaryTextColor`** — tylko `surfaceColor` ma przycisk clear; potwierdzono wizualnie | Accordion | Edytor |
| U8 | **Brak color pickera w Accordion** — FAQ Accordion ma `<input type="color">` + text pole; Accordion tylko plain text field — niespójna UX między widgetami | Accordion | Edytor |
| U9 | **Brak potwierdzenia przy usunięciu itemu FAQ** — `removeItem` działa natychmiast bez confirmation | FAQ Accordion | Edytor |
| U10 | **Canvas preview nie aktualizuje się po zmianie `openMode`** — gdy user zmienia Single → Multiple (lub odwrotnie), `<details>` elementy nie są odmontowywane/montowane, więc kontrolowany `open` prop React nie nadpisuje stanu DOM po interakcji użytkownika | Accordion | Edytor |

### 3.4 Problemy renderera (frontend)

| # | Problem | Widget | Obszar |
|---|---------|--------|--------|
| R1 | **Brak `aria-label` / `aria-labelledby` na kontenera widgetu** — `<div data-nextless-accordion>` bez semantycznej roli; `accordionAriaLabel: null` — potwierdzono na froncie | Accordion | Dostępność |
| R2 | **Brak `aria-expanded` na `<summary>`** — natywny element obsługuje state, ale `aria-expanded` nie jest explicite dodawane; `firstSummaryAriaExpanded: null` — potwierdzono | Oba | Dostępność |
| R3 | **Brak `aria-controls` na `<summary>`** — `<summary>` nie wskazuje na ID zawartości panelu; `firstSummaryAriaControls: null` — potwierdzono | Oba | Dostępność |
| R4 | **Brak `role="region"` na treści `<details>`** — zawartość panelu powinna mieć `role="region"` z `aria-labelledby` wskazującym na `<summary>` | Oba | Dostępność |
| R5 | **`<section>` FAQ bez `aria-label`** — wrapper sekcji FAQ bez semantycznego opisu | FAQ Accordion | Dostępność |
| R6 | **Placeholder "Add widgets to this accordion item." widoczny na froncie** — gdy brak bloków w slocie, dev placeholder widoczny na produkcji; potwierdzono na `localhost:3000` | Accordion | Renderer |
| R7 | **`name` attribute w single mode** — `detailsGroupName = nextless-accordion-{firstItem.instanceId}` — przy zmianie ID pierwszego itemu grupowanie HTML `<details>` przestaje działać | Accordion | Logika |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=accordion-audit`
> **Strona testowa:** TEST-ACCORDION-0516 (ID: `5931e4c5-a135-41a9-ad08-707c61cd897b`)
> **Data testu:** 2026-05-16

### 4.1 KRYTYCZNY BUG: `shouldOpen && index === 0` — domyślne otwieranie nie działa dla itemów poza pozycją 0

**Lokalizacja:** `core/widgets/core/accordion.tsx` — funkcja `AccordionBlock`

**Kod (błędny fragment):**
```js
const shouldOpen =
  openMode === "multiple"
    ? defaultOpenIds.includes(item.instanceId)
    : item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId) &&
      index === 0;  // ← BUG: ten warunek blokuje dowolny item poza pierwszym
```

**Dowód:**
- W Visual editor zmieniono "Default open item" na "Section 2"
- Canvas: `{ item1: { openAttr: null, openProp: false }, item2: { openAttr: null, openProp: false } }`
- Logika: item 2 (index=1): `"2"==="2" && 1===0` → `true && false` → `false`
- Wynik: ŻADEN item nie jest otwarty po wybraniu "Default open item = Section 2"

**Naprawa:**
```js
// Zamiast:
: item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId) && index === 0;

// Powinno być:
: item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId);
```

### 4.2 KRYTYCZNY BUG: `collapsible=false` nie blokuje zamknięcia

**Dowód:**
- W Visual editor wyłączono "Allow all closed" (collapsible=false)
- Kliknięto otwarty item (Section 2, y=175 w canvas)
- Po kliknięciu: `{ item1open: false, item2open: false }` — item zamknął się mimo collapsible=false
- Natywny `<details>` nie obsługuje zapobiegania zamknięciu bez JavaScriptu

### 4.3 Potwierdzono: Slot ID widoczny w edytorze (U1)

Tekst z DOM: `"Item 1 (slot id: 1)"` i `"Item 2 (slot id: 2)"` — widoczne bezpośrednio w panelu edytora dla redaktora treści.

### 4.4 Potwierdzono: Zduplikowane pola open item (U2)

Edytor Visual pokazuje jednocześnie:
- **ITEMS sekcja**: "Initially open item" → Section 1 (dropdown)
- **BEHAVIOR sekcja**: "Default open item" → Section 1 (dropdown)

Oba dropdowny mają inne etykiety ale kontrolują to samo — `defaultOpenIds` + `initiallyOpenId` (legacy alias).

### 4.5 Potwierdzono: Brak color pickera w Accordion (U8)

Accordion Visual editor: pola "Surface color", "Border color", "Summary text color" to plain `<input type="text">`.
FAQ Accordion Visual editor: każde pole koloru ma `<input type="color" class="h-9 w-10 p-1">` + text field.
Niespójna UX między widgetami tego samego systemu.

### 4.6 Potwierdzono: Brak chevron (C4)

DOM canvas: `summaryInnerHTML: "Section 1"` — brak SVG, brak CSS triangle, brak ikony.
Użytkownik widzi tylko tekst bez żadnego wskazania, że panel jest interaktywny.

### 4.7 Potwierdzono: Brak wszystkich atrybutów ARIA (R1–R4)

```json
{
  "accordionAriaLabel": null,
  "accordionAriaLabelledby": null,
  "firstDetailsAriaLabel": null,
  "firstSummaryAriaExpanded": null,
  "firstSummaryAriaControls": null,
  "contentDivRole": null
}
```

---

## 5. Testy na froncie (localhost:3000)

**URL:** http://localhost:3000/test-accordion-0516
**Strona opublikowana:** Tak
**Data testu:** 2026-05-16

### 5.1 KRYTYCZNY BUG: `defaultOpenIds=["2"]` → oba items zamknięte

DOM frontendu (fresh SSR render):
```json
{
  "items": [
    { "id": "1", "openAttr": null, "openProp": false, "name": "nextless-accordion-1" },
    { "id": "2", "openAttr": null, "openProp": false, "name": "nextless-accordion-1" }
  ]
}
```

Renderer na froncie używa tej samej logiki `shouldOpen && index === 0`. Wynik identyczny jak w admin preview.

### 5.2 Potwierdzono: Brak chevron na froncie (C4)

```json
{ "hasSummaryChevron": false, "summaryInnerHTML": "Section 1" }
```

Elementy `<details>` bez żadnego wskaźnika toggle — użytkownik nie wie, że może kliknąć.

### 5.3 KRYTYCZNY: Placeholder "Add widgets" widoczny na produkcji (R6)

```json
{ "hasPlaceholderText": true }
```

Tekst `"Add widgets to this accordion item."` widoczny na `localhost:3000` po otwarciu sekcji przez użytkownika. Developerski komunikat na produkcji.

### 5.4 Potwierdzono: Pełny brak ARIA na froncie (R1–R5)

```json
{
  "accordionAriaLabel": null,
  "firstSummaryAriaExpanded": null,
  "firstSummaryAriaControls": null,
  "contentDivRole": null
}
```

### 5.5 Mobile (390×844)

Accordion poprawnie responsywny — `space-y-3` sprawia, że items stackują się pionowo. Brak specyficznych problemów mobilnych na poziomie layoutu.

---

## 6. Porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| `shouldOpen` bug (C1) | ✅ Potwierdzony | ✅ Potwierdzony | ✅ Zgodne (oba błędne) |
| `collapsible=false` bug (C3) | ✅ Potwierdzony | N/A (wymaga interakcji) | — |
| Brak chevron (C4) | ✅ Potwierdzony | ✅ Potwierdzony | ✅ Zgodne |
| Placeholder na produkcji (R6) | ✅ Widoczny | ✅ Widoczny | ✅ Zgodne (oba błędne) |
| ARIA attributes | Brak | Brak | ✅ Zgodne (oba błędne) |
| Single mode (name attr) | `name="nextless-accordion-1"` | `name="nextless-accordion-1"` | ✅ Zgodne |
| Mobile responsiveness | N/A (canvas) | OK | — |
| Slot ID w edytorze (U1) | ✅ Widoczny | N/A | — |

**Wnioski:** Admin preview i frontend renderują widget identycznie. Wszystkie bugi są w warstwie renderera (`accordion.tsx`) i edytora (`AccordionEditors.tsx`). Brak rozbieżności środowiskowych.

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **`shouldOpen && index === 0` — wybór default open item nie działa dla nie-pierwszego itemu** | Użytkownik nie może kontrolować który item jest domyślnie otwarty |
| 🔴 KRYTYCZNY | C4 | **Brak chevron/expand indicator** | Użytkownik nie wie, że panel jest klikalny — fundamentalny UX |
| 🔴 KRYTYCZNY | R6 | **Placeholder "Add widgets" widoczny na produkcji** | Dev tekst widoczny dla użytkowników końcowych |
| 🟠 WYSOKI | C2 | **`allowMultipleOpen` FAQ nie działa** | Kluczowa funkcja FAQ Accordion niedziałająca |
| 🟠 WYSOKI | C3 | **`collapsible=false` ignorowane przez renderer** | Opcja zachowuje się jak `true` zawsze |
| 🟠 WYSOKI | U1 | **Slot ID widoczny w edytorze** | Techniczna etykieta dezorientuje redaktorów treści |
| 🟠 WYSOKI | U2 | **Zduplikowane pola "Initially open item" + "Default open item"** | Dezorientacja redaktora — dwa miejsca na to samo ustawienie |
| 🟠 WYSOKI | R1–R4 | **Pełny brak ARIA** | Niedostępność dla screen readerów — `aria-expanded=null`, `aria-controls=null` |
| 🟡 ŚREDNI | U8 | **Brak color pickera w Accordion vs FAQ** | Niespójna UX w tym samym systemie |
| 🟡 ŚREDNI | U3 | **Niejasny label "Allow all closed"** | Confusing dla redaktorów |
| 🟡 ŚREDNI | U5, U6 | **Brak reorder / add/remove per item** | Ograniczona kontrola kolejności |
| 🟡 ŚREDNI | W3, W4 | **Brak koloru body text i pytania** | Niepełna kontrola typografii |
| 🟡 ŚREDNI | W8, W9 | **Wyrównanie i padding FAQ hardcoded** | Ograniczony wachlarz konfiguracyjny |
| 🟢 NISKI | W13 | **Brak SEO FAQ schema** | Utracona szansa SEO |
| 🟢 NISKI | W14 | **Plain text w Q&A** | Brak formatowania/linków w odpowiedziach |

---

## 8. Sugerowane naprawy

### 8.1 Naprawa C1 — shouldOpen (KRYTYCZNE)

**Plik:** `core/widgets/core/accordion.tsx`

```js
// Obecny błędny kod:
const shouldOpen =
  openMode === "multiple"
    ? defaultOpenIds.includes(item.instanceId)
    : item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId) &&
      index === 0;

// Naprawiony kod:
const shouldOpen =
  openMode === "multiple"
    ? defaultOpenIds.includes(item.instanceId)
    : item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId);
```

### 8.2 Naprawa C4 — Dodaj chevron do `<summary>` (KRYTYCZNE)

**Plik:** `core/widgets/core/accordion.tsx` — `AccordionBlock`

```jsx
// W <summary>:
<summary className={resolveSummaryClass(resolvedVariant)} style={summaryStyle}>
  <span className="flex-1">{item.title}</span>
  <svg
    className="h-4 w-4 shrink-0 transition-transform duration-200 [[open]_&]:rotate-180"
    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
</summary>
// Zmienić klasę summary na: flex items-center justify-between gap-2 ...
```

### 8.3 Naprawa R6 — Ukryj placeholder na froncie (KRYTYCZNE)

**Plik:** `core/widgets/core/accordion.tsx`

```jsx
// Obecny kod renderuje placeholder gdy brak bloków:
{item.blocks.length > 0 ? (
  item.blocks.map(...)
) : (
  <div className="rounded-md border border-dashed ...">
    Add widgets to this accordion item.
  </div>
)}

// Naprawa — nie renderuj placeholder gdy nie jesteśmy w admin context:
// Opcja 1: Przekazać props `isEditing` i warunkować placeholder
// Opcja 2: Sprawdzić environment/context
// Opcja 3: Nie renderować niczego gdy brak bloków (null zamiast placeholder):
{item.blocks.length > 0
  ? item.blocks.map((block) => <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />)
  : null
}
```

### 8.4 Naprawa R1–R4 — ARIA (WYSOKI)

**Plik:** `core/widgets/core/accordion.tsx`

```jsx
// Kontener:
<div
  className="space-y-3"
  data-nextless-accordion="1"
  role="region"           // ← dodać
  aria-label="Accordion"  // ← dodać
  ...
>

// Summary:
<summary
  className={resolveSummaryClass(resolvedVariant)}
  style={summaryStyle}
  id={`accordion-summary-${item.instanceId}`}  // ← dodać
>

// Content div:
<div
  className={...}
  role="region"                                                      // ← dodać
  aria-labelledby={`accordion-summary-${item.instanceId}`}          // ← dodać
>
```

### 8.5 Naprawa U1 — Ukryj slot ID w edytorze

**Plik:** `core/admin/ui/widgets/editors/AccordionEditors.tsx` — `StructureSection`

```jsx
// Zamiast:
<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  Item {index + 1} (slot id: {item.id})
</p>

// Powinno być:
<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  Item {index + 1}
</p>
```

### 8.6 Naprawa U2 — Usuń zduplikowane pole "Initially open item" z ITEMS sekcji

**Plik:** `core/admin/ui/widgets/editors/AccordionEditors.tsx` — `StructureSection`

Usunąć z StructureSection dropdown "Initially open item" — zostaje tylko "Default open item" w BehaviorSection.

### 8.7 Naprawa C3 — Egzekwuj collapsible=false przez JavaScript

**Plik:** `core/widgets/core/accordion.tsx`

```jsx
// Dodać event listener na toggle dla wyłączonego collapsible:
useEffect(() => {
  if (collapsible === false && openMode === "single") {
    const details = containerRef.current?.querySelectorAll("details");
    const handleToggle = (e) => {
      if (!e.target.open) e.target.open = true; // prevent closing
    };
    details?.forEach(d => d.addEventListener("toggle", handleToggle));
    return () => details?.forEach(d => d.removeEventListener("toggle", handleToggle));
  }
}, [collapsible, openMode]);
```

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-03` + `TASK-256-05-04`: public accordion placeholder copy is now
  gated by the shared render-context contract and no longer leaks to frontend
  runtime output.
- `TASK-256-04` + `TASK-256-05-04`: accordion summary/content relationships
  now use scoped runtime IDs instead of generic repeated DOM IDs.
- Follow-up shared-contract repairs after the first closure commit now honor any
  valid default-open item, keep one item open when `collapsible=false`, sync
  `aria-expanded` through the runtime helper, and expose the current disclosure
  affordance with a chevron while preserving the shared TASK-256 scope.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx
  tests/vitest/ui/accordion-editor-wave.test.tsx` passed on 2026-05-17.

---

*Raport zakończony. Wszystkie testy wykonane 2026-05-16.*
