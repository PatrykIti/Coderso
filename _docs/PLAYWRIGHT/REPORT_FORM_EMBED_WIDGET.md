# RAPORT: Form Embed Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright #N (Form Embed Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `form-embed-audit` (oddzielna od innych agentów)
> **Strona testowa:** `/test-form-embed-0516` (do utworzenia podczas testów)

---

## 1. Przegląd widgetu

**Typ:** Form (standalone, bez slotów)
**Kategoria:** `forms`
**Warianty:** `standard` (jedyny — `card` i `inline` wzmiankowane w docs, ale nie zaimplementowane)
**Złożoność:** `composite` / runtime form resolution
**Plik renderera:** `core/widgets/core/formEmbed.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
**Plik runtime:** `core/widgets/core/formRuntimeScript.ts`

Form Embed to widget do osadzania formularzy CMS na stronach publicznych. Rozwiązuje formularz z bazy przez `formId` w czasie runtime — pola, nonce, tryb multi-step, logika warunkowa. Zawiera własny runtime client script (IIFE) obsługujący submit, logikę pól i progres wielostronicowych formularzy. Edytor łączy wybór formularza, konfigurację treści, layout i style surface.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

```ts
FormEmbedData {
  formId?: string;              // ID formularza z CMS
  title?: string;               // nadpisanie tytułu (fallback: formName z resolved)
  description?: string;         // nadpisanie opisu
  submitLabel?: string;         // etykieta przycisku (default: "Send message")
  successMessage?: string;      // wiadomość po wysłaniu
  layout?: FormEmbedLayout;
  style?: FormEmbedStyle;
  fields?: FormEmbedFields;
  resolved?: FormEmbedResolvedData;  // dane runtime z CMS
}

FormEmbedLayout {
  alignment?: "start" | "center" | "end";
  width?: "none" | "sm" | "md" | "lg" | "xl";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  buttonAlignment?: "start" | "center" | "end";
}

FormEmbedStyle {
  background?: string;          // clearable — tło sekcji
  surface?: string;             // clearable — tło karty formularza
  borderColor?: string;
  borderWidth?: "0" | "1" | "2";
  radius?: "none" | "sm" | "md" | "lg";
  inputSize?: "none" | "sm" | "md" | "lg";
}

FormEmbedFields {
  showLabels?: boolean;
  showRequiredIndicator?: boolean;
}

FormEmbedResolvedData {
  formName?: string;
  description?: string | null;
  status?: string;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  submissionNonce?: string | null;
  settings?: {
    layoutMode?: "single" | "multi_step";
    saveProgress?: boolean;
    stepTitles?: string[];
  };
  fields?: ResolvedFormField[];
  error?: string;
}
```

### 2.2 Warianty i typy pól

| Wariant | Opis |
|---------|------|
| `standard` | Jedyny zaimplementowany wariant |
| `card` | Wzmiankowany w `FORM_EMBED.md`, **niezaimplementowany** |
| `inline` | Wzmiankowany w `FORM_EMBED.md`, **niezaimplementowany** |

| Typ pola | Renderowany element |
|----------|-------------------|
| `text` | `<input type="text">` |
| `email` | `<input type="email">` |
| `phone` | `<input type="tel">` |
| `date` | `<input type="date">` |
| `textarea` | `<textarea>` |
| `checkbox` | `<input type="checkbox">` |
| `select` | `<select>` |
| `radio` | **Brak obsługi** — `resolveFieldControl` nie posiada branchy dla `radio` |
| `number` | **Brak obsługi** — trafia do gałęzi `type="text"` |
| `file` | **Brak obsługi** |
| `range` | **Brak obsługi** |
| `rating` | **Brak obsługi** |
| `time` | **Brak obsługi** — trafia do gałęzi `type="text"` |
| `hidden` | **Brak obsługi** — nie renderuje `<input type="hidden">` |

### 2.3 Layout — mapowania klas

| Spacing | Gap + Padding pionowy |
|---------|-----------------------|
| `none` | `gap-0 py-0` |
| `sm` | `gap-4 py-6` |
| `md` | `gap-6 py-8` |
| `lg` | `gap-8 py-10` |
| `xl` | `gap-10 py-12` |

| Width | Max-width |
|-------|-----------|
| `none` | *(brak)* |
| `sm` | `max-w-md` |
| `md` | `max-w-lg` |
| `lg` | `max-w-xl` |
| `xl` | `max-w-2xl` |

| Alignment | Klasy |
|-----------|-------|
| `start` | `items-start text-left` |
| `center` | `items-center text-center` |
| `end` | `items-end text-right` |

### 2.4 Tryby edytora

| Tryb | Zaimplementowane sekcje |
|------|------------------------|
| **Wizard** | Form selection, Content, Layout, Field labels, Style |
| **Visual** | Identyczne jak Wizard — ten sam komponent `FormEmbedEditor` |
| **Advanced** | Identyczne jak Wizard — ten sam komponent `FormEmbedEditor` |

> **Uwaga krytyczna:** Wszystkie trzy tryby edytora (`Wizard`, `Visual`, `Advanced`) używają **dokładnie tego samego** komponentu `FormEmbedEditor`. Brak specjalizacji trybów — Advanced nie ma JSON snapshot, Visual nie ma VariantCards, Wizard nie jest uproszczony dla nowych użytkowników.

### 2.5 Runtime script — obsługiwane funkcjonalności

- **Logika warunkowa pól** (`data-logic-operator`, `data-logic-field`, `data-logic-value`): `always`, `exists`, `not_exists`, `equals`, `not_equals`, `contains`, `not_contains`
- **Multi-step**: `refreshStepUi`, walidacja per step, przyciski Back/Next
- **Zapis postępu** (save progress): `localStorage` — klucz `nextless:form-progress:{formId}:{pathname}`
- **Hydratacja postępu**: przywracanie wartości pól i numeru kroku z localStorage
- **Submit**: `fetch` JSON POST → obsługa sukcesu (successMessage / redirect) i błędu
- **Field disabling**: ukryte pola logiki conditional są `disabled` (nie są wysyłane)

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują podstawowe działanie)

| # | Problem | Obszar | Plik |
|---|---------|--------|------|
| C1 | **Warianty `card` i `inline` niezaimplementowane** — `FORM_EMBED.md` dokumentuje trzy warianty (`standard`, `card`, `inline`), ale renderer ma tylko `standard`. Warunek `variant === "standard" ? "standard" : "standard"` (linia 485) zawsze zwraca `standard`. Wybór innego wariantu w edytorze nie ma efektu | Renderer | `formEmbed.tsx:485` |
| C2 | **Brak obsługi `radio` input** — `renderFieldControl` obsługuje `text`, `email`, `phone`, `date`, `textarea`, `checkbox`, `select`, ale **nie ma `radio`**. Pola typu `radio` z CMS są renderowane jako `<input type="text">` — użytkownik nie widzi opcji do wyboru | Renderer | `formEmbed.tsx:450-481` |
| C3 | **Wszystkie tryby edytora identyczne** — `FormEmbedWizardEditor`, `FormEmbedVisualEditor`, `FormEmbedAdvancedEditor` są aliasami tego samego `<FormEmbedEditor>`. Wizard powinien być uproszczony (tylko form select), Visual bogaty, Advanced powinien mieć JSON snapshot i tokeny. W obecnej formie podział na tryby jest bezużyteczny | Edytor | `FormEmbedEditors.tsx:615-625` |
| C4 | **Brak podglądu błędu formularza w Admin preview** — gdy formularz ma `resolved.error`, renderer wyświetla "Form unavailable (error)". Ale edytor nie informuje wyraźnie redaktora o przyczynie błędu — brak `Alert` lub `Badge` przy wyborze formularza w formularzu z błędem | Edytor | `FormEmbedEditors.tsx:228-290` |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak obsługi `number`, `time`, `hidden`, `file`, `range`, `rating`** — typy pól CMS, które istnieją w systemie formularzy, nie są renderowane poprawnie. `number`/`time` trafiają jako `text`, `file`/`range`/`rating` — brak obsługi w ogóle | Renderer |
| W2 | **Brak success state — formularz znika po submicie** — runtime JS wywołuje `form.reset()` i pokazuje `data-form-embed-success`, ale cały formularz nadal jest widoczny (nie jest ukrywany). Użytkownik widzi success message + pusty formularz jednocześnie | Runtime |
| W3 | **Brak loading state podczas submitu** — `form.dataset.submitting = "1"` jest ustawiane, ale brak UI feedback (spinner, disabled button, komunikat). Przycisk Submit wygląda identycznie w trakcie wysyłania | Runtime |
| W4 | **Brak kontroli `maxWidth` sekcji** — sekcja `<section>` ma `mx-auto w-full`, a maksymalna szerokość wewnętrzna kontrolowana jest przez `layout.width`. Brak niezależnej kontroli paddingu sekcji — `px-4` hardcoded | Layout |
| W5 | **Brak padding sekcji (`py-*`) jako osobna kontrola** — spacing łączy pionowy padding sekcji i gap elementów wewnętrznych. Nie można zmienić gęstości elementów bez zmiany paddingu sekcji | Layout |
| W6 | **Brak `borderColor` opcji dla inputów** — `style.borderColor` z edytora trafia jako inline `borderColor` na `<textarea>`, `<input>`, `<select>`, ale nie zmienia klasy `border` na `border-[color-*]`. Może powodować konflikty z Tailwind border utility | Renderer |
| W7 | **Brak kontroli koloru tekstu label** — `text-[var(--color-text)]/70` hardcoded w `<label>`. Brak pola `labelColor` | Styl |
| W8 | **Brak kontroli koloru tekstu helper** — `text-[var(--color-text)]/60` hardcoded w `<p>` helper. Brak pola | Styl |
| W9 | **Brak kontroli kolorów Submit button** — przycisk Submit używa `bg-[var(--color-primary)]` i `text-[var(--color-bg)]` hardcoded. Nie można zmienić koloru przycisku przez widget — wymaga zmiany tokenu theme | Styl |
| W10 | **Brak kontroli typografii title** — `text-xl font-semibold` hardcoded w `<h3>`. Brak opcji `fontSize`, `fontWeight`, `textColor` dla tytułu | Typografia |
| W11 | **Brak honeypot/CAPTCHA** — runtime script wysyła `fetch POST` bez mechanizmu antyspamowego po stronie klienta. Widget nie ma opcji `enableCaptcha` ani honeypot field | Bezpieczeństwo |
| W12 | **Brak licznika pól w edytorze** — gdy formularz ma wiele pól, edytor nie informuje o liczbie ani strukturze pól (tylko "Form fields load in runtime preview") | Edytor UX |
| W13 | **Brak kontroli tekstu etykiet przyciski nav (Back/Next)** — "Back" i "Next" hardcoded w rendererze. Brak opcji `backLabel`, `nextLabel` w data model | Multi-step |
| W14 | **Brak wskaźnika postępu multi-step** — renderer nie renderuje progress bar / step indicator. Użytkownik nie wie na którym kroku jest ani ile jest łącznie | Multi-step |
| W15 | **Brak obsługi `successRedirectUrl`** — `FormEmbedResolvedData` zawiera `successRedirectUrl`, ale runtime JS korzysta tylko z `runtime.redirectUrl`. Brak spójności nazw — pole w CMS vs pole w runtime response | Runtime |
| W16 | **Brak wygaśnięcia zapisanego postępu** — `persistProgress` zapisuje `savedAt` w localStorage, ale nigdy nie sprawdza age. Stary progres (np. tydzień temu) jest hydratowany zawsze | Runtime |
| W17 | **Brak obsługi inline label position dla `checkbox`** — `renderFieldControl` dla `checkbox` nie obsługuje `resolvedFieldStyle.labelPosition === "inline"`, w odróżnieniu od innych typów | Renderer |

### 3.3 Problemy UX edytora

| # | Problem | Tryb edytora |
|---|---------|--------------|
| U1 | **Wizard = Visual = Advanced — brak specjalizacji trybów** — wszystkie trzy tryby pokazują identyczny zestaw opcji. Nowy użytkownik widzi wszystko naraz (brak "easy start"). Advanced nie ma JSON snapshot, raw tokens ani Normalize/Reset. Narusza model edytora widgetów w Coderso | Wszystkie |
| U2 | **Brak podglądu pól formularza** — sekcja "Form selection" pokazuje tylko nazwę i badge statusu. Po wybraniu formularza brak listy pól / ich typów / multi-step info. Użytkownik musi wyjść z edytora aby zobaczyć co wybrał | Wszystkie |
| U3 | **Color picker dla CSS var nie działa** — `resolvePickerColor` akceptuje tylko `#rrggbb`/`#rgb`. Wartości `var(--color-bg)`, `var(--color-border)` nie są konwertowane na hex → picker wraca do `pickerFallback: "#ffffff"`. Nieobsługiwane dla `surface` i `background` | Visual |
| U4 | **Brak `Clear` dla `borderColor`** — `background` i `surface` mają `ClearableFieldHeader` z `onClear`. Pole `borderColor` nie ma możliwości wyczyszczenia do `undefined` | Visual |
| U5 | **Brak informacji o dostępności formularza w czasie rzeczywistym** — wybierając formularz o statusie `draft` lub `archived` edytor nie ostrzega. Ostrzeżenie jest tylko dla `submissionAccess === "internal"` | Wizard/Visual |
| U6 | **Brak wskazania multi-step w edytorze** — gdy wybrany formularz ma `layoutMode: "multi_step"`, edytor nie wyróżnia tej informacji. Redaktor nie wie że formularz jest wielostronicowy | Wizard |
| U7 | **`submitLabel` zawsze widoczne, nawet dla multi-step** — pole `Submit label` jest widoczne w edytorze niezależnie od trybu formularza. Dla multi-step przycisk Submit jest ukryty do ostatniego kroku — pole jest mylące | Wizard/Visual |
| U8 | **Brak pole `backLabel` i `nextLabel`** — dla formularzy multi-step przycisk "Back" i "Next" mają hardcoded etykiety. Edytor nie oferuje możliwości ich zmiany | Wizard/Visual |
| U9 | **Brak podglądu stanu "brak formularza"** — gdy `formId` jest pusty, widget pokazuje placeholder "No fields configured yet." W edytorze brak wyraźnego call-to-action "Please select a form" jako primary action | Wizard |
| U10 | **Success message i submit label mogą być pustymi stringami** — model normalizacji traktuje pusty string inaczej (`resolveString` vs `resolveNonEmptyString`). `submitLabel` ma fallback, ale `successMessage` może być `""` bez ostrzeżenia w edytorze | Edytor |

### 3.4 Dostępność (ARIA)

| # | Problem | Priorytet WCAG |
|---|---------|----------------|
| A1 | **`<section>` bez `aria-label` / `aria-labelledby`** — wrapper sekcji formularza nie ma semantycznej etykiety dla screen readerów | AA |
| A2 | **`<h3>` jako tytuł formularza — poziom może być błędny** — widget używa `<h3>` bez uwzględnienia hierarchii nagłówków strony. Może powodować nielogiczną strukturę nagłówków | AA |
| A3 | **`<label>` bez `for`/`htmlFor`** — renderowane `<label>` nie mają atrybutu `htmlFor` powiązanego z `id` inputu. Powiązanie label/input jest tylko wizualne (parent-child), nie semantyczne | AA |
| A4 | **`<input>` bez `id`** — inputy nie mają `id`, co uniemożliwia programowe powiązanie przez `htmlFor` i ogranicza możliwości technologii asystujących | AA |
| A5 | **`<select>` bez `aria-label`** — gdy `showLabels=false`, select nie ma żadnej dostępnej etykiety | AA |
| A6 | **Brak `aria-required` na wymaganych polach** — pola mają atrybut `required` (HTML5), ale brak `aria-required="true"` dla kompatybilności ze starszymi AT | A |
| A7 | **Brak `aria-describedby` dla helper text** — element `<p>` z helper text nie jest powiązany z inputem przez `aria-describedby` | AA |
| A8 | **Brak `role="alert"` dla error/success messages** — `data-form-embed-success` i `data-form-embed-error` są pokazywane/ukrywane przez JS, ale bez `role="alert"` screen reader nie anonsuje tych zmian | AA |
| A9 | **Przycisk Submit bez `aria-busy` podczas submit** — runtime JS nie ustawia `aria-busy="true"` na przycisku Submit podczas wysyłania | AA |
| A10 | **Brak `fieldset`/`legend` dla grupy pól checkbox w multi-step** — grupowe pola logicznie powiązane nie są owinięte `<fieldset>` | AA |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=form-embed-audit`
> **Data testu:** 2026-05-16
> **Strona:** `/test-form-embed-0516` — nowa strona stworzona na potrzeby testów

*(Sekcja uzupełniana po testach Playwright)*

### 4.1 Edytor Wizard

| # | Test | Wynik |
|---|------|-------|

### 4.2 Edytor Visual

| # | Test | Wynik |
|---|------|-------|

### 4.3 Edytor Advanced

| # | Test | Wynik |
|---|------|-------|

### 4.4 Zachowanie formularza w Preview (Admin)

| # | Test | Wynik |
|---|------|-------|

### Screenshoty Admin Preview

*(Do uzupełnienia po testach)*

---

## 5. Testy na froncie (localhost:3000)

> **URL:** `http://localhost:3000/test-form-embed-0516`
> **Status strony:** do opublikowania podczas testów

### 5.1 Rendering widgetu

| # | Test | Wynik |
|---|------|-------|

### 5.2 Interaktywność

| # | Test | Wynik |
|---|------|-------|

### 5.3 ARIA / Dostępność

| # | Test | Wynik |
|---|------|-------|

### 5.4 Submit / Runtime

| # | Test | Wynik |
|---|------|-------|

### Screenshoty Frontend

*(Do uzupełnienia po testach)*

---

## 6. Porównanie Admin Preview vs Frontend

| Zachowanie | Admin Preview | Frontend | Różnica? |
|------------|---------------|----------|----------|
| *(do uzupełnienia)* | | | |

---

## 7. Podsumowanie priorytetów

| Priorytet | ID | Problem | Status testu | Wpływ |
|-----------|---|---------|--------------|-------|
| 🔴 KRYTYCZNY | C1 | **Warianty `card` i `inline` niezaimplementowane** | Analiza kodu | Dokumentowane warianty nie istnieją w rendererze |
| 🔴 KRYTYCZNY | C2 | **Brak obsługi `radio` input** | Analiza kodu | Pola radio z CMS renderują się jako text input |
| 🔴 KRYTYCZNY | C3 | **Wszystkie tryby edytora identyczne** | Analiza kodu | Wizard = Visual = Advanced — podział bez funkcji |
| 🟠 WYSOKI | W2 | **Brak ukrywania formularza po submicie** | Do testu | Success state + pusty formularz jednocześnie |
| 🟠 WYSOKI | W3 | **Brak loading state podczas submit** | Do testu | Brak feedback dla użytkownika |
| 🟠 WYSOKI | W9 | **Brak kontroli koloru Submit button** | Analiza kodu | Button style zależny wyłącznie od theme |
| 🟠 WYSOKI | A3/A4 | **`<label>` bez `htmlFor`, `<input>` bez `id`** | Do testu | Semantyczne powiązanie label/input brak |
| 🟠 WYSOKI | A8 | **Brak `role="alert"` dla success/error** | Do testu | Screen reader nie anonsuje zmian stanu |
| 🟡 ŚREDNI | U1 | **Brak specjalizacji trybów edytora** | Analiza kodu | Wszystkie tryby identyczne |
| 🟡 ŚREDNI | U2 | **Brak podglądu pól po wybraniu formularza** | Do testu | Redaktor nie widzi struktury wybranego formularza |
| 🟡 ŚREDNI | U3 | **Color picker nie działa dla CSS var** | Do testu | Picker wraca do #ffffff dla var(--color-*) |
| 🟡 ŚREDNI | U4 | **Brak Clear dla `borderColor`** | Do testu | Niespójność — background/surface clearable, border nie |
| 🟡 ŚREDNI | W14 | **Brak wskaźnika postępu multi-step** | Do testu | Użytkownik nie wie na którym kroku jest |
| 🟡 ŚREDNI | W11 | **Brak honeypot/CAPTCHA** | Analiza kodu | Widget otwarty na spam boty |
| 🟢 NISKI | W16 | **Brak wygaśnięcia zapisanego postępu** | Analiza kodu | Stary progres z localStorage hydratowany zawsze |
| 🟢 NISKI | W1 | **Brak obsługi `number`, `time`, `hidden`, etc.** | Do testu | Rzadziej używane typy pól bez prawidłowego renderingu |

---

## 8. Kluczowe wnioski techniczne

*(Do uzupełnienia po testach)*

---

*Raport w toku — 2026-05-16, sesja `form-embed-audit`.*

---

## Status po TASK-256 (2026-05-17)

- Report remains in progress under the `TASK-269` family. TASK-256 must not
  mark Form Embed rows fixed without refreshed runtime evidence.
- Current TASK-256 role is still classification-only for shared rows that match
  existing TASK-256 mechanisms. Final TASK-256 closure therefore records Form
  Embed rows as `needs-refresh` / future widget scope rather than fixed shared
  implementation.
