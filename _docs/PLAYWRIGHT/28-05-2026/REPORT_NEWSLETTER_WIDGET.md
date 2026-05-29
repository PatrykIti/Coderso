# RAPORT: Newsletter Widget — wyczerpujący audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony (upgrade gap-close)
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-newsletter-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/f0ad3daf-aedf-47d8-9ff4-41587dff8e07` (breadcrumb „Contract Test - newsletter", status w nagłówku: **Draft**)
> **Fixture public:** http://localhost:3000/test-newsletter-widget-0516 (tytuł strony „TEST-NEWSLETTER-WIDGET-0516")
> **Pliki źródłowe:** `core/widgets/core/newsletter.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/NewsletterEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` + `ClearableFields.tsx` (kontrolki kolorów, advisory kontrastu, Clear/Undo)

> **Co zmieniono w tym upgrade (zamknięcie luk z poprzedniej wersji):**
> Poprzedni raport sam przyznawał (sekcja „Czego nie testowano"), że część rodzin kontrolek
> była wykonana tylko częściowo. W tej wersji **domknięto je wyczerpująco**:
> 1. **Spacing / Alignment / Width** — przetestowano **wszystkie** wartości enuma (5 + 3 + 4), nie po jednej.
> 2. **Kolory** — przetestowano **wszystkie 4 swatche** (Background / Text / Button bg / Button text), a nie tylko jeden, oraz **żywe advisory kontrastu** (3 stany: unknown / warning / ok), których poprzednia wersja w ogóle nie odnotowała.
> 3. **Pola tekstowe** — domknięto Loading / Error message oraz **propagację tekstu etykiet** (Email label, Consent label, First name label/placeholder) do DOM canvas.
> 4. **Gałęzie „niepołączone"** — udowodniono z pełnym evidence wszystkie osiągalne z UI gałęzie (static-empty, forms-runtime-bez-formularza, legacy webhook na froncie) oraz uczciwie wskazano gałęzie nieosiągalne z edytora.
> 5. **Skorygowano dwa twierdzenia** poprzedniej wersji (patrz **C1**, **C2** w sekcji 6) na podstawie mocniejszego dowodu.

> **Uwaga metodologiczna:** każde „działa / nie działa" zweryfikowano realną interakcją w UI
> (klik karty/optionu Radix-Select, klik switcha, `fill` inputów/textarea, sterowanie natywnym
> `input[type=color]`) **oraz** inspekcją DOM (`eval`): atrybuty `data-newsletter-*`, klasy
> Tailwind, inline `style`, `name`/`action`/`method`/`required` formularza, stan
> `disabled`/`checked`/`aria-*`. Nie poprzestawano na zliczaniu widocznych sekcji.

> **Uwaga o screenshotach:** weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`) oraz
> snapshoty struktury accessibility — **nie** zapisywałem zrzutów PNG. Gdyby jakiekolwiek
> powstały, ich nazwy byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu
> `.playwright-cli/` (ignorowanym przez Git); nie są wymaganym evidence i nie zostały
> dołączone do repo.

> **Uwaga o trwałości:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie
> nadpisać współdzielonego fixture. Wszystkie edycje w adminie były niezapisane (in-memory),
> więc fixture po reloadzie pozostaje nietknięty. W konsekwencji trwałość moich edycji po
> reloadzie i ich propagacja na front **nie** były weryfikowane (patrz sekcja 9). Front
> otwierałem w **osobnej karcie**, więc stan edytora w karcie admina pozostał nietknięty.

---

## 1. Przegląd widgetu

**Typ:** `newsletter` · **Kategoria:** `forms` · **Opis:** „Email signup form." · **Warianty:** trzy — `inline`, `stacked`, `minimal`.

### 1.1 Model danych (`NewsletterData`)

| Sekcja | Pola |
|--------|------|
| **root** | `title`, `description`, `placeholder` |
| **form** | `emailFieldName`, `emailLabel`, `showEmailLabel`, `consentFieldName`, `firstName{ enabled, label, placeholder, fieldName, required }` |
| **consent** | `enabled`, `label`, `required` |
| **submit** | `label`, `successMessage` |
| **stateCopy** | `loadingMessage`, `successMessage`, `errorMessage` |
| **integration** | `mode` (`action-url`/`webhook`), `method` (`post`/`get`), `actionUrl`, `webhookId` |
| **submission** | `mode` (`static`/`forms-runtime`), `formId`, `analyticsEvent`, `successBehavior` |
| **optIn** | `mode` (`single`/`double`), `confirmationCopy`, `enforcement` (`provider-owned`) |
| **style** | `spacing`, `alignment`, `width`, `background`, `textColor`, `buttonBackground`, `buttonTextColor` |
| **resolved** | tylko-do-odczytu kontrakt runtime z powiązanego Formularza (formId, fields, nonce, botProtection, …) |

### 1.2 Warianty renderera (zweryfikowane interakcją — sekcja 5.1)

| Wariant | Klasa kontenera pola+przycisk | `description`? |
|---------|-------------------------------|----------------|
| `inline` | `flex w-full flex-col gap-3 sm:flex-row sm:items-end` | renderowany |
| `stacked` | `flex w-full flex-col gap-3` (bez `sm:flex-row`) | renderowany |
| `minimal` | `flex w-full flex-col gap-2 sm:flex-row sm:items-end` | **ukrywany** (`showDescription=false`) |

### 1.3 Logika „połączenia" (kluczowy niuans architektury)

Renderer renderuje formularz **zawsze**, ale jego interaktywność zależy od dwóch ścieżek:

- **Forms runtime** (`submission.mode = forms-runtime`): wymaga wybranego, **opublikowanego, publicznego** Formularza Coderso, którego pola są kompatybilne z mapowaniem newslettera (Email + opcjonalnie First name + Consent). Wtedy `action = /forms/{id}/submissions`, `method = post`, wstrzykiwany jest `formRuntimeClientScript`, nonce i (opcjonalnie) captcha.
- **Native action-url** (`submission.mode = static` + `integration.mode = action-url` + poprawny `actionUrl`): natywny submit na bezpieczny zewnętrzny URL (tylko `https://`, bez prywatnych/loopback hostów; ścieżki `/forms/.../submissions` celowo wymagają trybu forms-runtime).

Gdy **żadna** ścieżka nie jest gotowa → `data-newsletter-submit-ready="false"`, przycisk `disabled`, typ `button` (nie `submit`), a pod formularzem komunikat diagnostyczny (`[data-newsletter-diagnostics="missing-target"]`). Treść komunikatu **zależy od trybu renderowania** (edytor vs public) — pełna macierz w sekcji 8.

---

## 2. Architektura trybów edytora (zweryfikowane liczbowo)

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest
równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (nagłówek
panelu: *„Setup complete — Daily edits live in Visual. Advanced is for technical
diagnostics."*), a wychodzi przyciskiem **„Finish setup and open Visual"**.

| Tryb | Jak otworzyć | Edytowalne kontrolki (zliczone `eval` w regionach) | Edytowalne? |
|------|--------------|-----------------------------------------------------|-------------|
| **Wizard** | „Run setup again" | Region „Starter summary": **0 inputów / 0 selectów / 0 switchy / 0 textarea** (1 przycisk info). | **NIE** |
| **Visual** | zakładka „Visual" | 8 sekcji newslettera (sekcja 5) + wspólne „Block layout" i „Device visibility". | **TAK** |
| **Advanced** | zakładka „Advanced" | „Signup readiness": 0 edytowalnych (1 przycisk info). „Authoring boundaries": **0 jakichkolwiek przycisków/kontrolek**. | **NIE** |

**Wniosek:** zliczenie kontrolek per region potwierdza, że Wizard i Advanced są w 100%
read-only. Cała codzienna edycja jest w Visual; Advanced to wyłącznie diagnostyka wsparcia.

---

## 3. Zakres interakcji w tej sesji (co realnie kliknięto)

Wszystkie poniższe wykonano w sesji `claude-29-05-newsletter-gap-close`, każde z weryfikacją DOM:

- **Warianty:** `stacked → minimal → inline` (klasy kontenera + render/ukrycie opisu + notice w edytorze).
- **Form semantics:** Email label (tekst→DOM+aria), Show visible email label (sr-only on/off + zanik aria-label), First name field ON (+ label „Imie", placeholder „Twoje imie", autocomplete), First name required ON, Consent required ON, Consent checkbox OFF (zanik checkboxa i sub-kontrolek), Opt-in single↔double + Confirmation copy.
- **Submission runtime:** Submission mode static↔forms-runtime, Bound form (lista pusta), RuntimeBindingSummary, Loading message, Error message (→ DOM), Preview state Form↔Success.
- **Kolory:** wszystkie 4 swatche (sterowane natywnym setterem + `input` event), 2 advisory kontrastu w stanach unknown/warning/ok, wszystkie 4 przyciski Clear + toast „… cleared." + Undo (przywrócenie wartości).
- **Spacing/Alignment/Width:** **każda** z 5/3/4 wartości z weryfikacją klas i `data-newsletter-*`.
- **Wizard/Advanced:** wejście/wyjście Wizard, zliczenie kontrolek read-only.
- **Gałęzie niepołączone:** static-empty (edytor), forms-runtime-bez-formularza (edytor + Advanced), legacy webhook (front).
- **Front:** inspekcja zapisanego stanu, submit przez Enter (N2), responsywność 375 px, konsola.

---

## 4. Stan domyślny w canvas admina (przed edycjami)

Inspekcja `section[data-newsletter-variant]` zaraz po otwarciu (wariant `inline`):

```json
{
  "data-newsletter-variant": "inline",
  "data-newsletter-alignment": "start",
  "data-newsletter-spacing": "md",
  "data-newsletter-width": "default",
  "data-newsletter-integration-mode": "action-url",
  "data-newsletter-consent-required": "false",
  "data-newsletter-action-status": "empty",
  "data-newsletter-submit-ready": "false",
  "data-newsletter-submit-interactive": "false",
  "data-newsletter-submission-mode": "static",
  "data-newsletter-opt-in": "single",
  "data-newsletter-first-name-enabled": "false",
  "form":   { "action": null, "method": null, "runtime": null },
  "email":  { "name": "email", "autocomplete": "email", "required": true, "placeholder": "you@example.com" },
  "button": { "type": "button", "disabled": true, "text": "Subscribe", "bg": "var(--color-primary)", "color": "var(--color-bg)" },
  "consent":{ "name": "consent", "required": false },
  "diagnostics": "Connect a Forms runtime binding or a safe external action URL to enable submissions."
}
```

**Wnioski:** dostępność zaadresowana porządnie (`aria-labelledby`→`<h3>`, `id`, `autocomplete`, `required`, label przez `htmlFor`). Domyślnie widget jest **niepołączony** (static + action-url + pusty URL) → przycisk `disabled`/`type=button`, jawny komunikat diagnostyczny. Przycisk dziedziczy kolory motywu jako tokeny CSS (`var(--color-primary)` / `var(--color-bg)`), co potwierdza, że kolory są opcjonalnymi nadpisaniami.

---

## 5. TESTED → WORKS: Visual, wyczerpująco (interakcja + DOM)

### 5.1 „Variant and form structure" — 3/3 warianty
| Wariant | `data-newsletter-variant` | Klasa kontenera (fragmenty) | Opis renderowany | Notice w edytorze |
|---------|---------------------------|-----------------------------|------------------|-------------------|
| Stacked | `stacked` | `flex-col gap-3` (bez `sm:flex-row`) | TAK | — |
| Minimal | `minimal` | `flex-col gap-2 sm:flex-row` | **NIE** | **„Description stays saved, but the Minimal variant does not render it."** |
| Inline  | `inline`  | `flex-col gap-3 sm:flex-row` | TAK | — |

Opis pozostaje zapisany niezależnie od wariantu (tylko ukrywany wizualnie w minimal). **Brak utraty danych.**

### 5.2 „Content and copy" — 3/3
**Title**, **Description**, **Email placeholder** — edycja propaguje się live do canvas (`h3`, `p`, `input[type=email].placeholder`).

### 5.3 „Form semantics and consent" — wyczerpane
- **Email label** (input) → tekst propaguje do `<label>` przy emailu, a w stanie sr-only również do `aria-label` inputa email. Test: wpisanie „Subscriber email" → `label.textContent = "Subscriber email"`, `email.aria-label = "Subscriber email"`.
- **Show visible email label** (switch) → ON usuwa klasę `sr-only` z `<label>` **oraz** zeruje `aria-label` inputa (`null`). To poprawne: gdy etykieta jest widoczna, redundantny `aria-label` znika (brak podwójnego nazewnictwa dla AT).
- **Email Form field** — w `static` to **read-only** „Default mapping" („Static forms use safe default field mapping."). W `forms-runtime` zamienia się w `Select`; przy braku załadowanego formularza pokazuje **jedną zablokowaną opcję „Custom mapping configured"** (UX niuans → sekcja 6, U3).
- **First name field** (switch) → ON dodaje do canvas `input[name="first_name"]`, `type=text`, `autocomplete="given-name"`, a w edytorze ujawnia: First name label / placeholder / mapping (read-only w static) / First name required.
  - **First name label** → „Imie" propaguje do `<label>` (label **widoczny**, nie sr-only, gdy first name włączone).
  - **First name placeholder** → „Twoje imie" propaguje do `input.placeholder`.
  - **First name required** (switch) → `input[name=first_name].required = true`.
- **Consent checkbox** (switch, domyślnie ON):
  - **OFF** → checkbox **znika** z canvas, a w edytorze znikają Consent label / Consent Form field / Consent required (gating przez `consent.enabled`).
  - **Consent label** → „Zgadzam sie na newsletter" propaguje do `<span>` przy checkboxie.
  - **Consent required** (switch) → `data-newsletter-consent-required="true"` **oraz** `checkbox.required = true`.
- **Opt-in mode** (select single/double) — **round-trip**:
  - Double → `data-newsletter-opt-in="double"`, renderuje `[data-newsletter-double-opt-in]` z treścią „Sprawdz skrzynke, aby potwierdzic.", ujawnia textarea „Confirmation copy" + notice o tym, że właściwego maila wysyła zewnętrzny serwis.
  - Single → `data-newsletter-opt-in="single"`, akapit `[data-newsletter-double-opt-in]` **znika**.

### 5.4 „Submission runtime" — wyczerpane
- **Submission mode** (select) — `Not connected yet` (static) ↔ `Use a Coderso Form` (forms-runtime); przebudowuje sekcję i `data-newsletter-submission-mode`.
- **Bound form** (select, tryb forms-runtime) — w tym środowisku **„No forms found"** (N1).
- **RuntimeBindingSummary** (forms-runtime) — „Newsletter needs these fields from the selected Form: **Email, First name, Consent**." (lista odzwierciedla aktualnie włączone pola) + „Coderso automatically handles submit, success, errors, and spam protection."
- **Button label** (input) → tekst przycisku w canvas.
- **Success message** (input) — **dual-write**: jeden input zapisuje równocześnie `stateCopy.successMessage` i `submit.successMessage`; renderuje się do ukrytego `[data-newsletter-success]` (domyślnie „Thanks for joining!").
- **Error message** (input) → propaguje do ukrytego `[data-newsletter-error]` (test: „Nie udalo sie zapisac. Sprobuj ponownie.").
- **Loading message** (input) — input **przyjmuje** wartość („Wysylanie zgloszenia..."), ale w stanie niepołączonym **nie ma odzwierciedlenia w canvas**: atrybut `data-form-loading-label` jest `null`, bo pojawia się dopiero gdy `canUseFormsRuntime` (patrz sekcja 9 — not-fully-testable tutaj).
- **Preview state** (Form / Success) — edytorski podgląd w `SuccessPreviewCard`: „Success state" pokazuje aktualny success message, „Form state" pokazuje copy „Preview keeps the live form visible by default…". Nie zmienia danych.

### 5.5 „Connection status" (read-only w Visual)
Dynamiczne wiersze „Signup destination" / „Signup tracking" odzwierciedlają stan (np. „Choose a Coderso Form" w forms-runtime bez formularza, „No custom tracking").

### 5.6 „Colors and emphasis" — wszystkie 4 swatche + advisory + Clear/Undo
Cztery kontrolki to natywne `input[type=color]` (`SharedColorControl`, `showValueInput=false` → swatch + etykieta stanu, bez pola tekstowego). Sterowano je przez **native value setter + dispatch `input`** (działa, patrz **C1**). Mapowanie zweryfikowane 1:1:

| Swatch | Ustawiono | Efekt w canvas |
|--------|-----------|----------------|
| Background color | `#112233` | `section.style.backgroundColor = rgb(17,34,51)` |
| Text color | `#00ff00` | `h3`, `p`, `input[email]` `style.color = rgb(0,255,0)` (przez `fieldStyle`) |
| Button background | `#ff0000` | `button.style.backgroundColor = rgb(255,0,0)` |
| Button text | `#ff8080` / `#000000` | `button.style.color = rgb(255,128,128)` / `rgb(0,0,0)` |

**Żywe advisory kontrastu** (`resolveColorContrastAdvisory`, dwa osobne: tekstowe i przyciskowe) — udowodniono **wszystkie 3 stany**:
| Stan | Warunek (przykład) | Komunikat |
|------|--------------------|-----------|
| unknown | wartości puste / token / transparent | „Contrast depends on inherited theme or transparent colors." |
| warning | `#ff8080` na `#ff0000` (ratio < 4.5) | „Configured colors may be hard to read together." |
| ok | zieleń na ciemnym tle / `#000` na `#ff0000` (ratio ≥ 4.5) | „Configured colors look readable." |

**Clear / Undo:**
- Każdy „Clear" jest aktywny **tylko gdy** pole ma zapisaną wartość; po wyczyszczeniu staje się `disabled` (patrz korekta **C2**).
- Wyczyszczenie przywraca tokeny motywu: Text → `var(--color-text)`, Button bg → `var(--color-primary)`, Button text → `var(--color-bg)`, Background → brak inline `backgroundColor`; oba advisory wracają do „unknown".
- Klik „Clear" emituje toast **„<Pole> cleared."** z akcją **„Undo"**; Undo **przywraca** poprzednią wartość (zweryfikowane: `h3.color` wrócił do `rgb(51,102,204)` po Undo).

### 5.7 „Spacing and alignment" — 5 + 3 + 4 = wszystkie wartości
| Spacing | klasa | | Alignment | klasy sekcji + wiersza | | Width | klasa |
|---------|-------|--|-----------|------------------------|--|-------|-------|
| none | `gap-0` | | start | `items-start text-left` + `justify-start` | | narrow | `max-w-md` |
| sm | `gap-2` | | center | `items-center text-center` + `justify-center` | | default | `max-w-xl` |
| md | `gap-4` | | end | `items-end text-right` + `justify-end` | | wide | `max-w-3xl` |
| lg | `gap-6` | | | | | full | `max-w-none` |
| xl | `gap-8` | | | | | | |

Wszystkie mapowania zgodne ze `spacingClassMap` / `sectionAlignClassMap` + `formAlignClassMap` / `widthClassMap`. (Niuans metodologiczny → C3.)

### 5.8 Sekcje współdzielone (nie-newsletterowe)
„Block layout" (Content width, Top/Bottom padding, Top/Bottom margin) i „Device visibility" (Desktop/Tablet/Mobile) to wspólne kontrolki cross-widget. Nie są częścią kontraktu newslettera — nie były głównym przedmiotem audytu. Odnotowano przy nich N5 (poniżej).

---

## 6. BROKEN / OGRANICZONE / MYLĄCE + KOREKTY poprzedniej wersji

### 6.1 Realne usterki / ryzyka
| # | Obserwacja | Waga | Gdzie |
|---|-----------|------|-------|
| N2 | **Front: natywny submit GET mimo „not connected".** Na publicznym fixture (jedno pole tekstowe = tylko email, przycisk nieaktywny) **Enter w polu email wywołuje implicit native submission**: URL zmienia się na `…/test-newsletter-widget-0516?email=leak-test%40example.com`, strona przeładowuje się, **email wycieka do query stringa**, bez feedbacku. `disabled` na przycisku blokuje submit myszką, ale **nie** Enter. Zweryfikowane ponownie w tej sesji (`textInputs=1`, `enabledSubmit=0`, `form.action=null`). | **WYSOKI** (UX/prywatność) | Renderer (front) |
| N3 | **Mylący stan przycisku przy „niepołączeniu".** Przycisk `disabled` + `type=button` wygląda na celowo nieaktywny, ale formularz wciąż jest realnym `<form>` bez `onSubmit`/`preventDefault` → patrz N2. | ŚREDNI | Renderer |
| N4 | **Publiczny fixture niesie legacy `integration.mode=webhook`**, którego bieżące UI edytora **nie potrafi wytworzyć** (Submission mode oferuje tylko „Not connected yet" / „Use a Coderso Form"). Widget traktuje to jako „niepołączone" — wygląda na gotowy, ale **nie przyjmie zapisu**. | ŚREDNI | Dane fixture / Renderer |
| N5 | **Wspólna „Device visibility" pokazuje Desktop/Tablet/Mobile = Hidden** dla tego bloku, mimo że renderuje się normalnie w canvas i na froncie. Quirk wspólnej infrastruktury device-visibility (lub realny zapis widoczności fixture), nie logika newslettera. Do weryfikacji po stronie właściciela tego komponentu. | NISKI (shared) | shared |

### 6.2 Ograniczenia środowiska (nie kod)
| # | Obserwacja | Waga |
|---|-----------|------|
| N1 | **Brak Formularzy do powiązania.** Po wybraniu „Use a Coderso Form" select „Bound form" pokazuje wyłącznie disabled **„No forms found"** → nie da się dokończyć powiązania forms-runtime na tym fixture (przycisk pozostaje disabled, diagnostyka „Select a published Form…"). Pełnej, połączonej ścieżki forms-runtime **nie da się przetestować end-to-end** (ograniczenie środowiska). | WYSOKI (blokuje test) |

### 6.3 Niuanse UX (działa zgodnie z kodem, ale warto wiedzieć)
| # | Obserwacja |
|---|-----------|
| U3 | W trybie **forms-runtime bez wybranego/załadowanego formularza** mapowania pól (Email/First name/Consent Form field) pokazują pojedynczą **zablokowaną** opcję „Custom mapping configured" — także dla **domyślnych** nazw pól (`email`/`first_name`/`consent`), bo brak runtime fields do dopasowania. Może sugerować „custom", choć to wartości domyślne. |
| U4 | **Loading message** nie ma żadnego odzwierciedlenia wizualnego w stanie niepołączonym (atrybut runtime pojawia się dopiero po połączeniu). Autor może nie wiedzieć, gdzie zobaczyć efekt. |

### 6.4 Korekty względem poprzedniej wersji raportu (mocniejszy dowód)
| # | Poprzednie twierdzenie | Ustalenie teraz |
|---|------------------------|------------------|
| **C1** | „Natywny `input[type=color]` nie reaguje na zdarzenia syntetyczne; tylko bezpośrednie wywołanie React `onChange` działało" (dawne N6). | **Skorygowane.** Swatch **da się** wysterować z testu: `nativeInputValueSetter.call(el, '#hex')` + `dispatchEvent(new Event('input', {bubbles:true}))` aktualizuje stan React i canvas (potwierdzone na wszystkich 4 swatchach). Niuans: React **pomija** ponowne ustawienie **tej samej** wartości co aktualnie wyświetlana (tracker wartości) — np. ustawienie `#ffffff` gdy swatch już pokazuje `#ffffff` nie odpala `onChange`. To nie bug, to mechanika kontrolowanego inputa. |
| **C2** | „Przycisk Clear przy Background jest aktywny od startu, bo `transparent` liczy się jako zapisana wartość." | **Doprecyzowane.** Tak jest **tylko** dopóki zapisany jest `style.background="transparent"`. Po kliknięciu Clear (usunięcie klucza) Background **nie ma** wartości i jego Clear staje się `disabled` — jak pozostałe trzy. Reguła ogólna: **Clear aktywny ⇔ pole ma zapisaną wartość**. |
| **C3** | (brak) | Niuans testowy: locator `getByRole('combobox', { name: 'Width' })` jest **niejednoznaczny** — pasuje też do wspólnego „Content width". Wymagane `exact: true`, inaczej klik cicho nie zadziała (fałszywe „brak zmiany"). |

---

## 7. Testy na froncie (localhost:3000)

> **URL:** http://localhost:3000/test-newsletter-widget-0516

### 7.1 Zapisany stan publiczny (inspekcja DOM)
```json
{
  "heading": "Join our newsletter",
  "data-newsletter-variant": "stacked",
  "data-newsletter-alignment": "center",
  "data-newsletter-spacing": "xl",
  "data-newsletter-width": "default",
  "data-newsletter-integration-mode": "webhook",
  "data-newsletter-submission-mode": "static",
  "data-newsletter-action-status": "empty",
  "data-newsletter-submit-ready": "false",
  "data-newsletter-opt-in": "single",
  "data-newsletter-first-name-enabled": "false",
  "form":   { "action": null, "method": null, "runtime": null },
  "email":  { "name": "email", "autocomplete": "email", "required": true },
  "consent":{ "name": "consent", "required": false },
  "button": { "type": "button", "disabled": true, "text": "Subscribe" },
  "diagnostics": "This signup form is not connected yet.",
  "runtimeScripts": 0, "textInputs": 1, "enabledSubmit": 0
}
```
- Wariant `stacked`, center, spacing `xl` — opis widoczny. Render zgodny z danymi.
- **Niepołączony** (legacy `webhook`): `submit-ready=false`, przycisk `disabled`, **brak** `formRuntimeClientScript`. Dostępność OK.
- **Inny komunikat niż w edytorze** — public „This signup form is not connected yet." vs edytor „Connect a Forms runtime binding…". Celowe rozróżnienie per `renderContext.mode`.

### 7.2 Próba submitu (Enter) — N2 (reprodukcja)
`leak-test@example.com` + Enter → nawigacja na `?email=leak-test%40example.com`, reload, brak feedbacku. Realny odwiedzający **nie zapisze się**, a jego email **trafia do URL**.

### 7.3 Responsywność (375 px)
Brak poziomego scrolla (`overflowX=false`), przycisk pełnej szerokości (343 px), układ stacked pionowy (`flex-direction: column`). **OK.**

### 7.4 Konsola
Front: **0 errors / 0 warnings**.

---

## 8. Macierz gałęzi „niepołączonych" (deeper proof)

| Gałąź | Osiągalna z UI? | Dowód | `data-*` / diagnostyka |
|-------|------------------|-------|------------------------|
| **static + actionUrl pusty** (edytor) | TAK | sekcja 4 | `action-status=empty`, `submit-ready=false`, btn `disabled/button`; diag „Connect a Forms runtime binding or a safe external action URL…" |
| **forms-runtime + brak formularza** (edytor) | TAK | przełączono Submission mode | `submission-mode=forms-runtime`, `action-status=empty`, `submit-ready=false`; diag **„Select a published Form to preview the Forms runtime contract."** (ścieżka `previewRuntimeError`); Bound form „No forms found" |
| **legacy webhook** (public) | TAK (z fixture) | sekcja 7.1 | `integration-mode=webhook`, `submission-mode=static`, `submit-ready=false`; diag „This signup form is not connected yet." |
| **action-status = invalid** | **NIE z UI** | — | Pole `integration.actionUrl` jest read-only/legacy (support-owned); UI nie pozwala zapisać niepoprawnego URL. Gałąź (Advanced „Saved external connection needs review" / „needs review") wymaga zaseedowanych danych. |
| **actionUrl = trasa `/forms/.../submissions`** w action-url (`actionRequiresFormsRuntime`) | **NIE z UI** | — | j.w. — diag „Switch Newsletter submission mode to Forms runtime…" (edytor) / „This signup form needs a Forms runtime binding…" (public) tylko z zaseedowanych danych. |
| **previewRuntimeLoading** | tylko przejściowo | — | diag „Loading bound Form preview..." — moment ładowania `detail`; nieosiągalny stabilnie bez formularza. |

### 8.1 Diagnostyka Advanced per gałąź (read-only „Signup readiness")
| Wiersz | static-empty | forms-runtime bez formularza |
|--------|--------------|------------------------------|
| Signup destination | „Not connected yet" | „Choose a Coderso Form in Visual" |
| Visitor submit path | „Visitors cannot sign up until a destination is selected." | „Visitors cannot sign up until a public Form is selected." |
| Saved external connection | „Not configured" | „Not used while a Coderso Form is selected" |
| Signup tracking | „No custom tracking" | „No custom tracking" |

---

## 9. NOT-TESTABLE / NIE testowano (uczciwie)

- **Pełna, połączona ścieżka forms-runtime** (submit → loading → success/error, nonce, captcha, redirect, double opt-in delivery) — **niemożliwe**: brak opublikowanego, publicznego Formularza („No forms found", N1).
- **Native action-url submit** na poprawny zewnętrzny `https://` — edytor **nie udostępnia** edytowalnego `actionUrl`/`webhookId` (read-only/legacy, „support-owned").
- **Gałęzie `invalid` i `actionRequiresFormsRuntime`** — nieosiągalne z UI (sekcja 8); zweryfikowane jedynie na poziomie kodu, nie interakcją.
- **Loading message w canvas** — brak odzwierciedlenia w stanie niepołączonym (`data-form-loading-label=null`); wymaga połączonego formularza.
- **Zapis / publikacja** — świadomie pominięte (by nie nadpisać fixture); trwałość po reloadzie i propagacja na front **niezweryfikowane**.
- **`analyticsEvent` / tracking** — brak edytowalnego pola w bieżącym UI (tylko read-only podsumowanie).
- **Kolor przez realny OS color picker** — nieautomatyzowalny; logikę zweryfikowano przez native setter + event (sekcja 5.6, C1).
- **Tooltipy „info"** przy polach — nieklikane.

---

## 10. Podsumowanie

**WORKS (potwierdzone interakcją + DOM, wyczerpująco):**
- Warianty 3/3 (z ukrywaniem opisu w minimal). Cała sekcja copy.
- Form semantics komplet: Email label (+aria), Show-label (+zanik aria), First name (label/placeholder/required), Consent (label/required/wyłączenie), Opt-in single↔double + confirmation copy.
- Submission runtime: tryb static↔forms-runtime, Button label, Success message (dual-write), Error message (→DOM), Preview state.
- **Kolory: wszystkie 4 swatche** + **advisory kontrastu w 3 stanach** + **Clear/Undo z toastem**.
- **Spacing/Alignment/Width: wszystkie 5/3/4 wartości** z dokładnym mapowaniem klas.
- Wizard i Advanced potwierdzone jako **read-only** (zliczenie kontrolek).
- Dostępność renderera (aria-labelledby, label htmlFor, autocomplete, required, aria-busy) — solidna.
- Front: poprawny render, czytelny „not connected", responsywność 375 px, 0 błędów konsoli.

**BROKEN / UWAGA:**
- **N2/N3** — Enter na froncie wywołuje natywny GET i **wycieka email do URL** mimo „niepołączenia" i zablokowanego przycisku (najpoważniejsze ryzyko).
- **N4** — publiczny fixture niesie legacy `webhook`, którego UI nie produkuje; widget wygląda na gotowy, ale nie przyjmie zapisu.
- **N5** — wspólna „Device visibility" raportuje „Hidden" na wszystkich urządzeniach (shared infra).

**NOT-TESTABLE:** pełna ścieżka forms-runtime (N1), native action-url, gałęzie invalid/forms-route (nieedytowalne z UI), loading message w canvas (wymaga połączenia).

**KOREKTY:** C1 (swatch JEST sterowalny z testu), C2 (Clear aktywny ⇔ zapisana wartość), C3 (niejednoznaczność locatora „Width").

**Stan ogólny:** edytor newslettera jest dojrzały i spójny; **wszystkie osiągalne z UI rodziny
kontrolek Visual zostały teraz wyczerpane** i propagują się do podglądu, a Wizard/Advanced są
udowodnione jako read-only. Realne ryzyko to natywny submit na froncie przy niepołączonym
widgecie (N2). Pełnej ścieżki wysyłki nie zweryfikowano z powodu braku skonfigurowanego celu
w tym środowisku (N1).

---

## 11. Mapowanie obserwacji na pliki źródłowe

| Obserwacja | Plik / miejsce |
|-----------|----------------|
| N2/N3 (native submit, disabled vs `<form>`) | `core/widgets/core/newsletter.tsx` — `<form>` bez `onSubmit`; `action/method` tylko gdy `connectionReady`; `<button disabled type={submitReady?'submit':'button'}>` |
| Macierz diagnostyki per `renderContext.mode` | `newsletter.tsx` — `connectionMessage` (sekcja 8) |
| N1 (lista form) | `NewsletterEditors.tsx` — `useForms`, select „Bound form", `NO_FORM_VALUE`, „No forms found" |
| N4 (legacy webhook) | `newsletter.tsx` — `resolveNewsletterIntegrationMode`, `resolveNewsletterTransport`; UI: `submissionModeOptions` (brak opcji webhook) |
| U3 (mapping „Custom mapping configured") | `NewsletterEditors.tsx` — `getFormFieldOptions` (unshift disabled, gdy `currentValue` bez dopasowania) |
| C1/C2 (swatch, Clear/Undo) | `SharedColorControl.tsx` (`input[type=color]`, `onChange`) + `ClearableFields.tsx` (`ClearableFieldHeader`, `hasClearableFieldValue`, toast+Undo) |
| Advisory kontrastu (3 stany) | `ClearableFields.tsx` — `resolveColorContrastAdvisory` (próg 4.5) |
| Spacing/Alignment/Width klasy | `newsletter.tsx` — `spacingClassMap`, `sectionAlignClassMap`+`formAlignClassMap`, `widthClassMap` |
