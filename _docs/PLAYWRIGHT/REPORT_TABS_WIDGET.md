# RAPORT: Tabs Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
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
| C3 | **Admin preview activation / runtime transport mismatch** — w admin preview inline runtime skrypt Tabs nie wykonuje się po wstrzyknięciu przez React, więc widget pozostaje statyczny. Potencjalny konflikt `hidden` pozostaje wtórnym ryzykiem implementacyjnym dopiero po naprawie ścieżki aktywacji preview. | Renderer/Admin | `tabs.tsx:488`, skrypt `L293-304` |

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
> **Strona testowa:** TEST-TABS-0516 (ID: `1a545dbc-a218-4bd5-929e-fc469203ef72`, slug: `/test-tabs-0516`)
> **Data testu:** 2026-05-16

### 4.1 Potwierdzony bug C1: Brak pola `inactiveTextColor` w Visual Editor

Skan Visual editor wykazał następujące pola w sekcji "Layout":
- Surface color (clearable)
- Border color
- Active background (clearable)
- Active text color
- Panel background (clearable)

**Brak `Inactive text color`** — mimo że pole `inactiveTextColor` istnieje w modelu danych (potwierdzone w Advanced Diagnostics JSON: `"inactiveTextColor": "var(--color-text)"`), nie ma go w formularzu Visual Editor. Użytkownik nie może zmienić koloru nieaktywnych zakładek bez edycji przez inny kanał.

**Diagnostics JSON snapshot (Advanced mode):**
```json
{
  "items": [...],
  "options": { "defaultItemId": "1", "activeId": "1", "alignment": "center", "orientation": "vertical" },
  "style": {
    "surfaceColor": "var(--color-surface)",
    "borderColor": "var(--color-border)",
    "activeBackgroundColor": "var(--color-text)",
    "activeTextColor": "var(--color-background)",
    "inactiveTextColor": "var(--color-text)",   ← pole w danych, brak w edytorze
    "panelBackgroundColor": "var(--color-surface)"
  }
}
```

### 4.2 Potwierdzony bug C3: Runtime script NIE jest wykonywany w admin preview

```js
// Admin preview:
window.__nextlessTabsBound === undefined  // script NIE wykonany
```

Widget Tabs w admin preview nie jest interaktywny — kliknięcie Tab 2 nie przełącza panelu. Przyczyną jest zachowanie React/`dangerouslySetInnerHTML`: skrypt wstrzyknięty przez React do DOM nie jest automatycznie re-wykonywany przez przeglądarkę (jest to standardowe zachowanie `innerHTML` — skrypty wstrzyknięte tym sposobem nie są uruchamiane).

**Skutek:** Admin preview pokazuje zawsze tylko Panel 1 (default), bez możliwości podglądu innych paneli. Użytkownik nie może sprawdzić jak wyglądają Panel 2, 3... bez publikowania strony.

**Dodatkowe odkrycie:** Nawet po ręcznym wykonaniu skryptu (`eval(script.textContent)`), event `click` na triggerze nie propaguje do `document` w React admin app. React 17+ deleguje eventy do root container, nie do `document`.

### 4.3 Potwierdzony bug W3/R1: `justify-*` zamiast `items-*` dla Vertical orientation

```js
// Vertical, alignment=center:
{ classes: "flex flex-col gap-2 justify-center",
  computedJustifyContent: "center",   ← przesuwa wzdłuż osi Y
  computedAlignItems: "normal" }      ← brak centrowania poziomego
```

`justify-center` na `flex-col` przesuwa triggery do środka kontenera **w pionie**, a nie centruje je **poziomo**. Dla wyrównania poziomego triggerów w trybie vertical powinno być `items-center`.

### 4.4 Potwierdzony bug W4/R2, R3: Brak ARIA na tablist i panelach

```json
{ "tablistAriaLabel": null,
  "panelTabIndices": [null, null],
  "rootAriaLabel": null }
```

- `role="tablist"` bez `aria-label` — niezidentyfikowana lista zakładek dla screen readerów
- `role="tabpanel"` bez `tabIndex="0"` — panel niedostępny z klawiatury

### 4.5 Potwierdzony bug U2: Alignment labels lowercase

Dropdown "Tab alignment" zawiera opcje: `start`, `center`, `end` zamiast `Start`, `Center`, `End`. Niespójne z resztą formularzy edytora.

### 4.6 Potwierdzony bug W7: `description` renderowany w panelu, nie pod triggerem

```html
<!-- Faktyczny render w panelu: -->
<p class="mb-3 text-sm text-[var(--color-text)]/70">Primary details.</p>
<div class="... border-dashed ...">Add widgets to this tab panel.</div>
```

Opis zakładki ("Primary details.") pojawia się jako pierwsza linia contentu panelu, nie pod triggerem. Użytkownik konfigurujący pole "Optional tab description" może oczekiwać subtytuł przy triggerze lub tooltip.

### 4.7 Wizard — poprawnie pokazuje wszystkie zakładki

W przeciwieństwie do Timeline widget (bug C1), Tabs Wizard poprawnie pokazuje wszystkie zakładki (2–6) bez przycinania. Przy 6 zakładkach widoczne są pola Tab 1–Tab 6.

### 4.8 Warianty — wszystkie renderują się poprawnie

| Wariant | CSS triggera | Zachowanie active |
|---------|-------------|-------------------|
| `pills` | `rounded-full border px-3 py-1.5` | border-transparent + active bg/color |
| `underline` | `rounded-none border-b-2 border-transparent pb-2` | `data-[state=active]:border-current` |
| `minimal` | `rounded-md px-2 py-1.5` | `data-[state=active]:underline` |

---

## 5. Testy na froncie (localhost:3000)

**URL:** http://localhost:3000/test-tabs-0516
**Widget:** Tabs — pills, vertical, 2 panele
**Opublikowany:** Tak

### 5.1 Runtime script działa na froncie

```js
{ scriptBound: true }  // __nextlessTabsBound = true
```

Na froncie skrypt jest wykonywany poprawnie (SSR + hydration). Tab switching przez kliknięcie działa:
```js
// Click Tab 2 → activeId: "2", panel1Hidden: true, panel2Hidden: false ✅
```

### 5.2 Keyboard navigation działa na froncie

Nawigacja klawiaturą potwierdzona:
- ArrowDown (vertical) → przejście Tab 1 → Tab 2 ✅
- `aria-orientation="vertical"` ustawione na tablist ✅

### 5.3 ARIA na froncie (identyczne jak w admin preview)

```json
{ "tablistAriaLabel": null,         ← brak aria-label na tablist
  "panelTabIndices": [null, null],  ← brak tabIndex na panelach
  "rootAriaLabel": null }           ← brak aria-label na root
```

Wszystkie braki ARIA są w rendererze (`tabs.tsx`) — identyczne w admin preview i na froncie.

### 5.4 Vertical alignment — ten sam bug co w adminie

```js
// Frontend, orientation=vertical:
{ flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "normal",           ← brak items-* klasy
  tablistClass: "flex flex-col gap-2 justify-start" }
```

### 5.5 ID format

IDs na stronie: `tabs-trigger-1`, `tabs-trigger-2`, `tabs-panel-1`, `tabs-panel-2` — brak kolizji przy jednej instancji. Kolizja wystąpi przy dodaniu drugiego Tabs widgetu na tej samej stronie.

### 5.6 Mobile (390×844)

Vertical tabs na mobile — tablist `nowrap`, 2 triggery jeden pod drugim. Layout działa poprawnie — flex-col nie wymaga responsywnego breakpointu.

---

## 6. Porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Widget rendering | Tak | Tak | ✅ Zgodne |
| Runtime script | ❌ Nie wykonany | ✅ Wykonany | ❌ Rozbieżność |
| Tab switching interaktywność | ❌ Nie działa | ✅ Działa | ❌ Rozbieżność |
| Keyboard navigation | ❌ Nie działa | ✅ Działa | ❌ Rozbieżność |
| ARIA attributes | Brak | Brak | ✅ Zgodne (oba błędne) |
| Vertical alignment justify-* | `justify-center` (błędne) | `justify-start` (testowane) | ✅ Zgodne (oba błędne) |
| inactiveTextColor brak w edytorze | — | — | Błąd w edytorze |

**Kluczowa rozbieżność:** Admin preview jest statyczny (runtime JS NIE uruchamia się), frontend jest interaktywny (runtime JS uruchamia się podczas ładowania strony). Użytkownik pracujący w admin **nie może przetestować** działania przełączania zakładek bez publikowania strony.

**Prawdopodobna przyczyna:** `dangerouslySetInnerHTML` dla tagu `<script>` nie powoduje wykonania skryptu przez przeglądarkę gdy element jest wstrzykiwany przez React (standard HTML — skrypty dodane przez innerHTML nie są wykonywane). Na froncie skrypt jest częścią SSR response i przeglądarka go wykonuje podczas parsowania HTML.

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Wpływ |
|-----------|---|---------|-------|
| 🔴 KRYTYCZNY | C1 | **Brak pola `inactiveTextColor` w edytorze Visual** | Użytkownik NIE MOŻE zmienić koloru nieaktywnych zakładek z Visual editora |
| 🔴 KRYTYCZNY | C2 | **Kolizja ID przy wielu instancjach Tabs na stronie** | Złamane ARIA `aria-controls`/`aria-labelledby`, undefined zachowanie DOM |
| 🔴 KRYTYCZNY | C3 | **Admin preview activation / runtime transport mismatch** | Admin preview pozostaje statyczny i nie pozwala przetestować przełączania zakładek bez publikacji |
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

> Uwaga (2026-05-22): poniższe snippet-y to historyczne notatki z audytu. Na
> aktualnym branchu nie należy ich wykonywać literalnie tam, gdzie kolidują ze
> wspólnym kontraktem `TASK-256`, routingiem `TASK-288`, albo nowym shared
> follow-upem `TASK-328`. W szczególności legacy `nextless` naming i lokalne
> generowanie ID przez `Math.random()` / `crypto.randomUUID()` nie są już
> obowiązującym guidance dla tej rodziny tasków.


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

## Status po TASK-256 (2026-05-17)

- `TASK-256-03` + `TASK-256-05-04`: public empty-panel placeholder copy is now
  gated by the shared render-context contract and no longer leaks to frontend
  runtime output.
- `TASK-256-04` + `TASK-256-05-04`: tabs now use instance-safe `coderso`
  runtime IDs/selectors instead of page-global `nextless` IDs for
  `aria-controls` / `aria-labelledby`.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx
  tests/vitest/ui/tabs-editor-wave.test.tsx` passed on 2026-05-17.

---

## Status po audycie TASK-288 (2026-05-22)

- `C2` + `R4` są historycznym shared evidence: instance-safe `coderso` IDs już
  wylądowały przez `TASK-256-04` + `TASK-256-05-04`, więc nie wolno ich
  ponownie implementować lokalnie w `TASK-288`.
- `W4`, `W5`, `R2`, `R3`, i `R6` pozostają shared accessibility residuals, ale
  po zamknięciu `TASK-256` są teraz śledzone przez `TASK-328`, nie przez rodzinę
  produktową `TASK-288`.
- `C3` należy czytać jako bug ścieżki aktywacji admin preview / runtime
  transportu; samodzielny konflikt `hidden` nie jest jeszcze odizolowanym
  potwierdzonym repro na branchu.

---

*Raport zakończony. Sekcje 4-6 zostały uzupełnione po testach przeglądarki.*
