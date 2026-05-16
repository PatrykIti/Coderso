# RAPORT: Tabs Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #8 (Tabs Widget)  
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000  
> **Sesja przeglądarki:** `tabs-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Atomic / Layout  
**Moduł:** Engagement  
**Audience:** Intermediate  
**Warianty:** `pills`, `underline`, `minimal`  
**Ograniczenia zakładek:** min 2 / max 6  
**Slot:** `panel` (repeatable: `panel:1`, `panel:2`, ...)  

Widget Tabs służy do przełączania między grupowanymi panelami treści. Obsługuje orientację poziomą i pionową, wyrównanie triggerów (start/center/end), niestandardowe kolory surface/border/active/inactive/panel, oraz keyboard navigation (Arrow keys, Home, End). Panele są repeatable slots z pełną obsługą zagnieżdżonych widgetów.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **items** | `id`, `label`, `description` (renderowany w treści panelu, nie pod triggerem) |
| **options** | `defaultItemId`, `activeId`, `alignment` (start/center/end), `orientation` (horizontal/vertical) |
| **style** | `surfaceColor`, `borderColor`, `activeBackgroundColor`, `activeTextColor`, `inactiveTextColor`, `panelBackgroundColor` |

### 2.2 Warianty renderera

| Wariant | Opis | CSS triggera |
|---------|------|-------------|
| `pills` | Rounded segmented triggers | `rounded-full border px-3 py-1.5` |
| `underline` | Link-style tabs z active underline | `rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-current` |
| `minimal` | Compact label tabs | `rounded-md px-2 py-1.5 data-[state=active]:underline` |

### 2.3 Tryby edytora

- **Wizard** — wariant + struktura zakładek (liczba, labele, opisy, default tab)
- **Visual** — wszystko z Wizard + sekcja Layout (alignment, orientation, kolory z wyjątkiem `inactiveTextColor`)
- **Advanced** — wszystko z Visual + diagnostics JSON snapshot

### 2.4 Runtime script

Skrypt client-side obsługuje:
- Click na trigger → `syncState(root, activeId)` 
- Keyboard: Arrow (L/R dla horizontal, U/D dla vertical), Home, End
- Guard `window.__nextlessTabsBound = true` zapobiega wielokrotnemu bindowaniu event listenerów

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływające na usability)

| # | Problem | Obszar | Plik/Linia |
|---|---------|--------|------------|
| C1 | **Brak pola `inactiveTextColor` w edytorze Visual** — pole `inactiveTextColor` istnieje w modelu danych (`TabsData.style.inactiveTextColor`) i ma domyślną wartość `var(--color-text)`. Jednak w `TabsBehaviorSection` (sekcja Layout) brak tego pola — użytkownik NIE MOŻE zmienić koloru nieaktywnych zakładek z edytora Visual, tylko przez Advanced JSON | Edytor Visual | `TabsEditors.tsx:368–444` |
| C2 | **Kolizja `id` dla wielu instancji Tabs na stronie** — `triggerId = "tabs-trigger-${panel.instanceId}"` i `panelId = "tabs-panel-${panel.instanceId}"`. Gdy na stronie są dwa widgety Tabs oba z instanceId="1", generują duplikaty `id` w DOM (np. `tabs-trigger-1` pojawi się dwa razy), łamiąc ARIA `aria-controls` i `aria-labelledby` | Renderer | `tabs.tsx:452,453` |
| C3 | **`hidden` attribute conflict między React a runtime JS** — React renderuje `hidden={!isActive}` jako prop, runtime skrypt zarządza `hidden` przez `panel.removeAttribute("hidden")` / `panel.setAttribute("hidden", "")`. W admin preview (React hydration) te dwa mechanizmy mogą wchodzić w konflikt — React może przywrócić `hidden` po JS update | Renderer/Admin | `tabs.tsx:488`, skrypt `L293-304` |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak ikony/emoji per tab trigger** — `TabsItem` nie ma pola `icon` ani `emoji`. Zakładki mogą mieć tylko `label` (tekst) i `description`. Nie można dodać ikony obok labela triggera, co jest bardzo popularnym wzorcem UX | Model danych |
| W2 | **Wizard nie ma sekcji Layout** — `TabsWizardEditor` renderuje tylko "Variant" + "Tabs Structure". Opcje `orientation` i `alignment` są dostępne wyłącznie w Visual/Advanced | Edytor Wizard |
| W3 | **`justify-*` działa nieprawidłowo dla Vertical orientation** — `alignmentClassMap = { start: "justify-start", center: "justify-center", end: "justify-end" }` aplikowane na `flex-col`. W flex-column `justify-*` kontroluje osi Y (main axis = pionowa), nie centruje triggerów poziomo. Powinno być `items-start/center/end` dla wyrównania poziomego triggerów w pionie | Renderer |
| W4 | **Brak `tabIndex="0"` na `role="tabpanel"`** — WCAG 2.1 wymaga `tabIndex="0"` na `role="tabpanel"` gdy panel nie zawiera interaktywnych elementów fokusowanych, aby panel był osiągalny klawiaturą | Dostępność |
| W5 | **Brak `aria-label` na `role="tablist"`** — `<div role="tablist">` nie ma `aria-label` opisującego co reprezentuje lista zakładek | Dostępność |
| W6 | **`<script>` wstawiany wielokrotnie** — przy wielu widgetach Tabs na stronie element `<script>` z runtime code jest wstawiany wielokrotnie do DOM, choć guard `__nextlessTabsBound` zapobiega wielokrotnemu bindowaniu. Nadmiarowe `<script>` tagi zwiększają rozmiar HTML | Renderer |
| W7 | **`description` pojawia się w panelu, nie pod triggerem** — pole "Optional tab description" sugeruje opis zakładki, ale renderuje się jako `<p>` na początku panelu, nie pod/obok triggera. Użytkownik może być zdezorientowany — spodziewać się tooltipa lub subtytułu zakładki | UX/Model |
| W8 | **Brak kontroli typografii triggerów** — font-size (`text-sm`) i font-weight (`font-medium`) są hardcoded. Brak możliwości dostosowania rozmiaru/wagi czcionki zakładek z edytora | Edytor |
| W9 | **Brak kontroli padding/gap kontenera** — `space-y-4` między tablist a panelami, `p-4` na kontenerze, `gap-2` między triggerami — wszystko hardcoded | Layout |
| W10 | **Brak opcji `disabled` dla zakładki** — nie można oznaczyć zakładki jako niedostępna (`aria-disabled`), co jest przydatne w trybie krok-po-kroku | Funkcjonalność |
| W11 | **Brak animacji przejść między panelami** — panel pojawia się/znika natychmiast przez `hidden` attribute. Brak żadnego fade/slide transition przy zmianie zakładki | Efekty |
| W12 | **Brak maxWidth kontenera** — kontener zajmuje 100% szerokości rodzica bez opcji ograniczenia szerokości, np. `max-w-3xl` | Layout |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Brak wizualnego preview wariantów** — VariantCards pokazuje tylko text + opis, brak żadnej wizualizacji jak wyglądają Pills/Underline/Minimal. Użytkownik musi zgadywać lub przełączać się by zobaczyć efekt | Edytor |
| U2 | **Alignment labels lowercase** — opcje w dropdownie to "start", "center", "end" zamiast "Start", "Center", "End" | Edytor |
| U3 | **Pole `description` per tab ma mylący placeholder** — "Optional tab description" sugeruje że opis pojawi się *przy* zakładce, a renderuje się wewnątrz panelu | Edytor |
| U4 | **Brak informacji o slocie w edytorze** — użytkownik nie widzi że każdy tab ma oddzielny panel-slot do zarządzania z poziomu buildera (poza "slot id" pokazanym małym tekstem) | Edytor |
| U5 | **Brak podglądu domyślnej zakładki w edytorze** — "Default tab" Select pokazuje label zakładki ale nie wizualizuje który panel będzie otwarty na stronie | Edytor |
| U6 | **`flex-wrap` na tablist** — przy 6 zakładkach z długimi labelami, taby zawijają się do drugiego wiersza. Brak opcji sterowania zawijaniem (np. `scrollable` overflow-x vs wrap) | Renderer/UX |
| U7 | **Brak walidacji kontrastu kolorów** — użytkownik może ustawić activeTextColor identyczny z activeBackgroundColor bez żadnego ostrzeżenia | Dostępność |
| U8 | **Sekcja "Layout" w Visual ma niespójną nazwę** — sekcja `id="tabs.layout"` ma tytuł "Layout" ale zawiera mieszankę layout options (alignment, orientation) i style options (kolory). Powinna być rozdzielona na "Layout" i "Colors" | Edytor |
| U9 | **Brak opcji zarządzania panelami z edytora** — zmiana liczby zakładek przez Select w edytorze dodaje/usuwa zakładki i sloty, ale użytkownik nie widzi który konkretnie slot zostanie usunięty | UX edytora |

### 3.4 Problemy renderera (frontend)

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **`justify-*` na `flex-col` dla Vertical orientation** — alignment działa tylko poprawnie dla horizontal (justify na flex-row). Dla vertical `justify-start/center/end` przesuwa triggery wzdłuż osi Y, nie centruje ich poziomo | Renderer |
| R2 | **Brak `tabIndex` na panelach** — `role="tabpanel"` wymaga `tabIndex="0"` per WCAG 2.1 §4.1.2 dla dostępności klawiatury | Dostępność |
| R3 | **Brak `aria-label` na tablist** — `<div role="tablist" aria-orientation="...">` bez `aria-label` | Dostępność |
| R4 | **Duplikaty ID przy wielu instancjach** — `id="tabs-trigger-1"` i `id="tabs-panel-1"` kolizja przy wielu widgetach Tabs na tej samej stronie | DOM |
| R5 | **`<script>` bez `type` attribute** — brakuje `type="text/javascript"` lub innego explicitnie | Renderer |
| R6 | **Brak `tabIndex` na `role="tabpanel"` bez fokusowalne children** — gdy panel zawiera tylko tekst (bez przycisków/linków), panel jest niedostępny z klawiatury | Dostępność |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=tabs-audit`  
> **Strona testowa:** (do uzupełnienia po teście)  
> **Data testu:** 2026-05-16

*(sekcja zostanie uzupełniona po testach w przeglądarce)*

---

## 5. Testy na froncie (localhost:3000)

*(sekcja zostanie uzupełniona po testach w przeglądarce)*

---

## 6. Porównanie Admin Preview vs Frontend

*(sekcja zostanie uzupełniona po testach w przeglądarce)*

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **Brak pola `inactiveTextColor` w edytorze Visual** | Użytkownik NIE MOŻE zmienić koloru nieaktywnych zakładek z Visual editora |
| 🔴 KRYTYCZNY | C2 | **Kolizja ID przy wielu instancjach Tabs na stronie** | Złamane ARIA `aria-controls`/`aria-labelledby`, undefined zachowanie DOM |
| 🔴 KRYTYCZNY | C3 | **Konflikt `hidden` attribute między React a runtime JS** | Możliwy błąd hydration w admin preview |
| 🟠 WYSOKI | W1 | **Brak ikony per tab trigger** | Poważne ograniczenie możliwości wizualnych |
| 🟠 WYSOKI | W3, R1 | **`justify-*` nie działa dla Vertical orientation** | Alignment nie działa poprawnie dla trybu pionowego |
| 🟠 WYSOKI | W4, R2, R3 | **Brak ARIA** | Niedostępność dla screen readerów |
| 🟡 ŚREDNI | W2 | **Wizard bez opcji Layout** | User musi przejść do Visual aby ustawić orientację |
| 🟡 ŚREDNI | W6 | **Duplikacja `<script>` przy wielu instancjach** | Zwiększony rozmiar HTML |
| 🟡 ŚREDNI | W7 | **`description` w panelu, nie pod triggerem** | Mylące UX per UX wzorzec subtytuł zakładki |
| 🟡 ŚREDNI | W11 | **Brak animacji przejść** | Natychmiastowa zmiana panelu bez efektu |
| 🟢 NISKI | U1 | **Brak wizualnego preview wariantów** | Komfort wyboru wariantu |
| 🟢 NISKI | U2 | **Alignment labels lowercase** | Estetyka edytora |
| 🟢 NISKI | U8 | **Niespójna sekcja "Layout"** | Czytelność edytora |

---

## 8. Sugerowane naprawy

### 8.1 Naprawa C1 (inactiveTextColor brak w edytorze)

**Plik:** `TabsEditors.tsx` — `TabsBehaviorSection` — po polu `activeTextColor`:

```jsx
<div className="space-y-2">
  <p className="text-sm font-medium">Inactive text color</p>
  <Input
    value={normalized.style?.inactiveTextColor ?? tabsDefaults.style?.inactiveTextColor ?? ""}
    onChange={(event) =>
      updateStyle(value, onChange, { inactiveTextColor: event.target.value })
    }
    placeholder="var(--color-text)"
  />
</div>
```

### 8.2 Naprawa C2 (kolizja ID)

**Plik:** `tabs.tsx` — renderer `TabsBlock`

Rozwiązanie: dodać unikalny prefix per widget instancję (np. przez `crypto.randomUUID()` lub prop `instanceKey`):

```tsx
// Opcja 1: prefix przez data-nextless-tabs unique ID
const widgetInstanceId = useId?.() ?? Math.random().toString(36).slice(2);
const triggerId = `tabs-trigger-${widgetInstanceId}-${panel.instanceId}`;
const panelId = `tabs-panel-${widgetInstanceId}-${panel.instanceId}`;
```

Lub lepiej: zmienić root `data-nextless-tabs="1"` na `data-nextless-tabs="<uniqueId>"` i używać go jako prefix.

### 8.3 Naprawa W3/R1 (alignment dla Vertical)

**Plik:** `tabs.tsx` — `alignmentClassMap` i renderowanie tablist:

```tsx
const alignmentClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

// Dla vertical orientation, zamiast justify-* użyć items-*:
const verticalAlignmentClassMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

// W JSX:
className={joinClasses(
  orientation === "vertical" ? "flex flex-col gap-2" : "flex flex-wrap gap-2",
  orientation === "vertical"
    ? verticalAlignmentClassMap[normalized.options?.alignment ?? "start"]
    : alignmentClassMap[normalized.options?.alignment ?? "start"]
)}
```

### 8.4 Naprawa W4/R2 (tabIndex na panelach)

**Plik:** `tabs.tsx` — `TabsBlock` render paneli:

```jsx
<div
  role="tabpanel"
  tabIndex={0}  // ← dodać
  ...
>
```

### 8.5 Naprawa R3 (aria-label na tablist)

**Plik:** `tabs.tsx`:

```jsx
<div
  role="tablist"
  aria-label="Content tabs"
  aria-orientation={orientation}
  ...
>
```

---

*Raport w trakcie. Sekcje 4-6 zostaną uzupełnione po testach przeglądarki.*
