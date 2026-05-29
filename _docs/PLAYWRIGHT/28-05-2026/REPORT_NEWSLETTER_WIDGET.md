# RAPORT: Newsletter Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-newsletter` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/f0ad3daf-aedf-47d8-9ff4-41587dff8e07` (breadcrumb „Contract Test - newsletter", status w nagłówku: **Draft**)
> **Fixture public:** http://localhost:3000/test-newsletter-widget-0516 (tytuł strony „TEST-NEWSLETTER-WIDGET-0516")
> **Pliki źródłowe:** `core/widgets/core/newsletter.tsx` (renderer + typy + normalizacja) · `core/admin/ui/widgets/editors/NewsletterEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolki kolorów)

> **Uwaga metodologiczna:** ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI **oraz** inspekcją DOM (atrybuty `data-newsletter-*`, klasy Tailwind, inline
> `style`, `name`/`action`/`method`/`required` formularzy, stan `disabled`/`checked`),
> a nie tylko zliczeniem widocznych sekcji.

> **Uwaga o screenshotach:** weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`)
> oraz snapshoty struktury accessibility — nie zapisywałem zrzutów PNG. Gdyby jakieś
> powstały, ich nazwy byłyby **wyłącznie lokalnymi etykietami** przechwyceń w katalogu
> `.playwright-cli/` (ignorowanym przez Git); nie są wymaganym evidence i nie zostały
> dołączone do repo.

> **Uwaga o trwałości:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie
> nadpisać współdzielonego fixture. Wszystkie edycje w adminie były niezapisane
> (in-memory). W konsekwencji trwałość moich edycji po reloadzie oraz ich propagacja na
> front **nie** były weryfikowane (patrz sekcja 8). Edytowałem w nowej karcie front, więc
> stan edytora w pierwszej karcie pozostał nietknięty.

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

### 1.2 Warianty renderera

| Wariant | Układ pola + przycisk | Opis | Klasa formularza |
|---------|------------------------|------|------------------|
| `inline` | input + przycisk w jednym rzędzie (gdy się mieszczą) | mobile i tak stackuje | `flex flex-col gap-3 sm:flex-row sm:items-end` |
| `stacked` | input nad przyciskiem na każdym viewporcie | przycisk pełnej szerokości | `flex flex-col gap-3` |
| `minimal` | jak inline, mniejszy gap | **ukrywa `description`** | `flex flex-col gap-2 sm:flex-row sm:items-end` |

### 1.3 Logika „połączenia" (kluczowy niuans architektury)

Renderer renderuje formularz **zawsze**, ale jego interaktywność zależy od dwóch ścieżek:

- **Forms runtime** (`submission.mode = forms-runtime`): wymaga wybranego, **opublikowanego, publicznego** Formularza Coderso, którego pola są kompatybilne z mapowaniem newslettera (Email + opcjonalnie First name + Consent). Wtedy `action = /forms/{id}/submissions`, `method = post`, wstrzykiwany jest `formRuntimeClientScript`, nonce i (opcjonalnie) captcha.
- **Native action-url** (`submission.mode = static` + `integration.mode = action-url` + poprawny `actionUrl`): natywny submit na bezpieczny zewnętrzny URL (tylko `https://`, bez prywatnych/loopback hostów; ścieżki `/forms/.../submissions` celowo wymagają trybu forms-runtime).

Gdy **żadna** ścieżka nie jest gotowa → `data-newsletter-submit-ready="false"`, przycisk `disabled`, typ `button` (nie `submit`), a pod formularzem pokazuje się komunikat diagnostyczny (`[data-newsletter-diagnostics="missing-target"]`). Treść komunikatu **zależy od trybu renderowania** (edytor vs public) — patrz sekcja 8.

---

## 2. Architektura trybów edytora

Panel edytora po prawej ma **dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest
równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (nagłówek
panelu: *„Setup complete — Daily edits live in Visual. Advanced is for technical
diagnostics."*), a wychodzi przyciskiem **„Finish setup and open Visual"**. To ten sam
wzorzec co w `team`, `faq-accordion`, `tabs`, `stats-kpi`, `search-box`.

| Tryb | Jak otworzyć | Zawartość | Edytowalne? |
|------|--------------|-----------|-------------|
| **Wizard** | „Run setup again" | Jedna sekcja **„Starter summary"** (read-only: Layout, Title, Description, Button label, Consent) + własny blok **„Live preview"** renderujący stan przez wspólny renderer. | **NIE** (0 inputów / 0 switchy / 0 selectów — potwierdzone inspekcją) |
| **Visual** | zakładka „Visual" | 8 sekcji newslettera (patrz sekcja 5) + wspólne „Block layout" i „Device visibility". | **TAK** |
| **Advanced** | zakładka „Advanced" | **W 100% read-only**: „Signup readiness", „Authoring boundaries" + wspólne „Block layout summary", „Visibility summary". 0 inputów / 0 switchy / 0 selectów / 0 przycisków akcji (1 przycisk „info"). | **NIE** |

**Niuans:** Wizard to świadomie jednorazowy ekran orientacyjny — nie da się tu nic zmienić,
nawet wariantu. Cała codzienna edycja przeniesiona jest do Visual; Advanced to wyłącznie
diagnostyka wsparcia.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje w sesji `claude-29-05-newsletter`, zweryfikowane inspekcją DOM:

- **Wizard:** otwarcie przez „Run setup again", odczyt 5 wierszy read-only, potwierdzenie braku kontrolek edytowalnych, powrót przez „Finish setup and open Visual".
- **Visual / warianty:** przełączenie `inline → minimal → stacked → inline` z weryfikacją `data-newsletter-variant`, klas formularza i ukrywania opisu w `minimal` + powiązanego notice w edytorze.
- **Visual / copy:** edycja Title, Description, Email placeholder — live update canvas.
- **Visual / form semantics:** „Show visible email label" (sr-only → widoczna), „First name field" (pojawienie się inputa `autocomplete=given-name`), „First name required", „Consent required", „Opt-in mode → Double" (render confirmation copy + `data-newsletter-opt-in`).
- **Visual / submission runtime:** edycja Button label + Success message (z weryfikacją dual-write do ukrytego `[data-newsletter-success]`), przełącznik „Preview state" (Form/Success), przełączenie „Submission mode → Use a Coderso Form" i próba wyboru Formularza (lista pusta — patrz sekcja 6).
- **Visual / colors:** próba ustawienia „Button background" (natywny `input[type=color]` + bezpośrednie wywołanie React `onChange` → canvas zmienił kolor na czerwony), przycisk „Clear" (powrót do `var(--color-primary)`).
- **Visual / spacing:** Alignment → Center, Spacing → Extra spacious, Width → Wide — z weryfikacją klas (`items-center text-center`, `gap-8`, `max-w-3xl`).
- **Advanced:** odczyt wszystkich wierszy diagnostycznych + potwierdzenie braku kontrolek edytowalnych.
- **Front:** inspekcja DOM zapisanego stanu, próba submitu (Enter), test responsywności 375 px, odczyt konsoli.

---

## 4. Stan domyślny w canvas admina (przed edycjami)

Inspekcja `section[data-newsletter-variant]` zaraz po otwarciu (wariant `inline`):

```json
{
  "section": {
    "aria-labelledby": "newsletter-blk-1-title",
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
    "data-newsletter-first-name-enabled": "false"
  },
  "form":   { "action": null, "method": null, "ariaLabel": null, "runtime": null },
  "email":  { "name": "email", "id": "newsletter-blk-1-email", "autocomplete": "email", "required": true, "placeholder": "you@example.com" },
  "button": { "type": "button", "disabled": true, "ariaBusy": "false", "text": "Subscribe" },
  "consent":{ "name": "consent", "required": false, "value": "on" },
  "diagnostics": "Connect a Forms runtime binding or a safe external action URL to enable submissions."
}
```

**Wnioski ze stanu domyślnego:**
- Dostępność jest zaadresowana porządnie: `section` ma `aria-labelledby` wskazujące na `<h3>` tytułu, `email` ma `id`, `autocomplete="email"`, `required`, label powiązany przez `htmlFor`.
- Domyślnie widget jest **niepołączony** (`static` + `action-url` + pusty URL) → przycisk `disabled`, typ `button`, `aria-busy="false"`, plus jawny komunikat diagnostyczny. To poprawne i czytelne zachowanie „pustego" widgetu.

---

## 5. Visual — co DZIAŁA (zweryfikowane interakcją + DOM)

### 5.1 „Variant and form structure"
- Trzy karty wariantów (Inline / Stacked / Minimal) z opisami i badge „Selected/Pick". Klik **natychmiast** zmienia `data-newsletter-variant` i klasę kontenera formularza:
  - `minimal` → klasa `gap-2`, **opis znika** (`showDescription=false`), a w edytorze pojawia się notice **„Description stays saved, but the Minimal variant does not render it."** ✓
  - `stacked` → klasa `flex-col gap-3`, opis wraca ✓
  - `inline` → `sm:flex-row` ✓
- Opis pozostaje zapisany niezależnie od wariantu (tylko ukrywany wizualnie w minimal). **Brak utraty danych.**

### 5.2 „Content and copy"
- **Title**, **Description**, **Email placeholder** — każda edycja propaguje się live do canvas (`h3`, `p`, `input[type=email].placeholder`). ✓

### 5.3 „Form semantics and consent"
- **Email label** (input tekstowy) — edytowalny. ✓
- **Show visible email label** (switch) — toggle ON usuwa klasę `sr-only` z `<label>` przy emailu (label staje się widoczny). ✓
- **Email Form field** — w trybie `static` to **read-only** wiersz „Default mapping" („Static forms use safe default field mapping."); edytowalny select pojawia się dopiero w trybie forms-runtime. Zgodne z intencją (autor nie wpisuje technicznych nazw pól).
- **First name field** (switch) — toggle ON dodaje do formularza input `name="first_name"`, `autocomplete="given-name"`, oraz ujawnia w edytorze pola: First name label / placeholder / (mapping read-only) / **First name required** (switch). Toggle „required" ustawia `required=true` na inpucie. ✓
- **Consent checkbox** (switch, domyślnie ON) — ujawnia Consent label + Consent Form field (read-only) + **Consent required** (switch). Toggle „Consent required" ustawia `required=true` na checkboxie ORAZ `data-newsletter-consent-required="true"`. ✓
- **Opt-in mode** (select single/double) — wybór **Double** ustawia `data-newsletter-opt-in="double"`, renderuje akapit `[data-newsletter-double-opt-in]` z confirmation copy, i ujawnia w edytorze textarea „Confirmation copy" + notice o tym, że właściwego maila potwierdzającego wysyła zewnętrzny serwis. ✓

### 5.4 „Submission runtime"
- **Submission mode** (select) — `Not connected yet` (static) ↔ `Use a Coderso Form` (forms-runtime). Przełączenie zmienia `data-newsletter-submission-mode` i przebudowuje sekcję. ✓
- **Button label** — edycja propaguje się do tekstu przycisku w canvas. ✓
- **Success message** — edycja propaguje się do ukrytego akapitu `[data-newsletter-success]` w canvas; potwierdziłem także **dual-write**: pole zapisuje równocześnie `stateCopy.successMessage` i `submit.successMessage` (jeden input steruje dwoma ścieżkami). ✓
- **Loading message / Error message** — standardowe inputy tekstowe (analogiczne do zweryfikowanych; patrz sekcja 9 — nie testowane indywidualnie).
- **Preview state** (Form / Success) — przełącznik podglądu stanu w karcie `SuccessPreviewCard`; klik „Success state" pokazuje aktualny success message. To podgląd edytorski, nie zmienia danych. ✓

### 5.5 „Connection status" (read-only w Visual)
- Dynamiczne wiersze „Signup destination" i „Signup tracking" odzwierciedlają bieżący stan (np. „Choose a Coderso Form" przy trybie forms-runtime bez wybranego formularza, „No custom tracking"). ✓

### 5.6 „Colors and emphasis"
- Cztery kontrolki kolorów (Background / Text / Button background / Button text) jako natywne `input[type=color]` (`SharedColorControl`, `showValueInput=false` → brak pola tekstowego, tylko swatch + etykieta stanu).
- **Ścieżka onChange działa**: bezpośrednie wywołanie handlera React `onChange('#ff0000')` dla „Button background" natychmiast zmieniło `style.backgroundColor` przycisku w canvas na `rgb(255,0,0)`. Normalizacja akceptuje hex/rgb/`var(--color-*)`/`transparent`. ✓
- **Clear** działa: po ustawieniu koloru przycisk „Clear" stał się aktywny, a klik przywrócił `var(--color-primary)` (theme default). ✓
- **Niuans stanu „Clear":** przyciski „Clear" przy Text/Button bg/Button text są **disabled**, dopóki nie zapisano własnej wartości (brak wartości = nic do wyczyszczenia). „Background" ma Clear aktywny od startu, bo domyślny `style.background="transparent"` liczy się jako zapisana wartość; etykieta pokazuje „Transparent".

### 5.7 „Spacing and alignment"
- **Spacing** (None/Compact/Default/Spacious/Extra spacious) → mapuje na `gap-0…gap-8` (`xl` = `gap-8`). ✓
- **Alignment** (Start/Center/End) → `items-center text-center` itd. + `data-newsletter-alignment`. ✓
- **Width** (Narrow/Default/Wide/Full) → `max-w-md…max-w-none` (`wide` = `max-w-3xl`). ✓

### 5.8 Sekcje współdzielone (nie-newsletterowe)
- „Block layout" i „Device visibility" to wspólne kontrolki cross-widget (Content width, Padding, Margin, widoczność per device). Nie są częścią kontraktu newslettera; nie były głównym przedmiotem audytu.

---

## 6. Co NIE działa / jest ograniczone / mylące

| # | Obserwacja | Waga | Gdzie |
|---|-----------|------|-------|
| N1 | **Brak Formularzy do powiązania w tym środowisku.** Po wybraniu „Use a Coderso Form" select „Bound form" pokazuje wyłącznie disabled „No forms found". W efekcie **nie da się dokończyć powiązania forms-runtime** na tym fixture — przycisk pozostaje `disabled`, a diagnostyka w canvas zmienia się na „Select a published Form to preview the Forms runtime contract." Pełnej, połączonej ścieżki forms-runtime **nie dało się przetestować end-to-end** (ograniczenie środowiska, nie kod). | WYSOKI (blokuje test) | Visual / Submission runtime |
| N2 | **Front: natywny submit GET mimo „not connected".** Na publicznym fixture (jedno pole tekstowe = tylko email, brak aktywnego przycisku submit) **wciśnięcie Enter w polu email wywołuje implicit native form submission**: URL zmienił się na `…/test-newsletter-widget-0516?email=test%40example.com`, strona przeładowała się, **email wyciekł do query stringa**, bez żadnego feedbacku. `disabled` na przycisku blokuje submit myszką, ale **nie** blokuje Enter. Zweryfikowane: `textInputCount=1`, `enabledSubmitButtons=0`, `form.action=null`. | WYSOKI (UX/prywatność) | Renderer (front) |
| N3 | **Mylący stan przycisku przy „niepołączeniu".** Przycisk jest `disabled` + `type=button`, więc wygląda na celowo nieaktywny, ale formularz wciąż jest realnym `<form>` bez `onSubmit`/`preventDefault` → patrz N2. Brak spójności między „przycisk zablokowany" a „formularz nadal submitowalny z klawiatury". | ŚREDNI | Renderer |
| N4 | **Publiczny fixture niesie legacy `integration.mode=webhook`**, którego bieżące UI edytora **nie potrafi wytworzyć** (Submission mode oferuje tylko „Not connected yet" / „Use a Coderso Form"). Widget traktuje to jako „niepołączone". To zaszłość zgodna z konceptem „Saved external connection" z Advanced, ale w praktyce oznacza, że publiczny widget wygląda na gotowy (ładny formularz), a w rzeczywistości **nie przyjmie zapisu**. | ŚREDNI | Dane fixture / Renderer |
| N5 | **„Visibility summary" w Advanced pokazuje „Shown on: Hidden on all devices".** Wspólna sekcja widoczności raportuje, że blok jest ukryty na wszystkich urządzeniach — mimo że renderuje się normalnie w canvas i na froncie. Wygląda na quirk wspólnej infrastruktury device-visibility (lub realny zapis widoczności fixture), nie na logikę newslettera. Wymaga osobnej weryfikacji właściciela tego wspólnego komponentu. | NISKI (shared) | Advanced / shared |
| N6 | **Natywny `input[type=color]` nie reaguje na zdarzenia syntetyczne.** Ustawienie `el.value` + dispatch `input/change` (nawet z native setterem) **nie** zaktualizowało stanu React (canvas się nie zmienił). Dopiero bezpośrednie wywołanie handlera `onChange` zadziałało. To **ograniczenie testowalności** (natywny OS color picker jest nieautomatyzowalny), nie potwierdzony bug — sama logika koloru działa (sekcja 5.6). | NISKI (test harness) | Visual / Colors |

---

## 7. Testy na froncie (localhost:3000)

> **URL:** http://localhost:3000/test-newsletter-widget-0516

### 7.1 Zapisany stan publiczny (inspekcja DOM)

```json
{
  "heading": "Join our newsletter",
  "section": {
    "aria-labelledby": "newsletter-f0690a24-…-title",
    "data-newsletter-variant": "stacked",
    "data-newsletter-alignment": "center",
    "data-newsletter-spacing": "xl",
    "data-newsletter-width": "default",
    "data-newsletter-integration-mode": "webhook",
    "data-newsletter-submission-mode": "static",
    "data-newsletter-action-status": "empty",
    "data-newsletter-submit-ready": "false",
    "data-newsletter-opt-in": "single",
    "data-newsletter-first-name-enabled": "false"
  },
  "form":   { "action": null, "method": null, "ariaLabel": null, "runtime": null },
  "email":  { "name": "email", "autocomplete": "email", "required": true },
  "consent":{ "name": "consent", "required": false, "value": "on" },
  "button": { "type": "button", "disabled": true, "ariaBusy": "false", "text": "Subscribe" },
  "diagnostics": "This signup form is not connected yet.",
  "hasRuntimeScript": false
}
```

- Wariant `stacked`, wyrównanie `center`, spacing `xl` — opis widoczny (stacked nie ukrywa opisu). Render zgodny z zapisanymi danymi. ✓
- **Niepołączony**: `submit-ready=false`, przycisk `disabled`, brak `formRuntimeClientScript`. Dostępność OK (aria-labelledby, autocomplete, required, id).
- **Inny komunikat diagnostyczny niż w edytorze** — public pokazuje przyjazne **„This signup form is not connected yet."**, podczas gdy edytor pokazuje techniczne „Connect a Forms runtime binding or a safe external action URL…". To celowe rozróżnienie copy per `renderContext.mode`. ✓

### 7.2 Próba submitu (Enter) — patrz N2
Wpisanie `test@example.com` + Enter → nawigacja na `?email=test%40example.com`, reload, brak feedbacku. Realny odwiedzający **nie zapisze się** (brak backendu), a jego email **trafia do URL**.

### 7.3 Responsywność (375 px)
- Brak poziomego scrolla (`overflowX=false`), przycisk pełnej szerokości (343 px), układ stacked pionowy. **Responsywność OK.** ✓

### 7.4 Konsola
- Brak błędów i ostrzeżeń (0 errors / 0 warnings) na froncie. ✓

---

## 8. Admin Preview vs Frontend — porównanie

| Funkcjonalność | Admin Preview | Frontend (public) | Zgodność |
|----------------|---------------|-------------------|----------|
| Renderer | wspólny `NewsletterBlock` | wspólny `NewsletterBlock` | ✓ ten sam kod |
| Stan domyślny/zapisany | `inline`, static, action-url, niepołączony | `stacked`, static, **webhook**, niepołączony | różne dane fixture (oczekiwane) |
| Przycisk gdy niepołączony | `disabled`, `type=button` | `disabled`, `type=button` | ✓ identycznie |
| Komunikat diagnostyczny | „Connect a Forms runtime binding…" / w forms-runtime „Select a published Form…" | „This signup form is not connected yet." | ⚠️ inny copy per `renderContext.mode` (celowe) |
| `action`/`method` formularza | `null`/`null` (niepołączony) | `null`/`null` (niepołączony) | ✓ identycznie |
| Atrybuty pola email (`name`, `id`, `autocomplete`, `required`) | obecne | obecne | ✓ identycznie |
| Native GET on Enter | nie testowano w adminie (ta sama logika renderera) | **występuje** (N2) | dotyczy obu (renderer-level) |
| Forms-runtime script | tylko gdy `canUseFormsRuntime` (preview wymaga nonce) | tylko gdy połączony | ✓ |

**Wniosek:** Admin i front używają tego samego renderera; różnice to (a) inne dane zapisane w dwóch różnych fixture'ach oraz (b) **celowe** różnice copy diagnostyki zależne od `renderContext.mode`. Bugi N2/N3 są na poziomie renderera, więc dotyczą obu środowisk.

---

## 9. Czego NIE testowano (uczciwie)

- **Pełna, połączona ścieżka forms-runtime** (submit → loading → success/error, nonce, captcha, redirect, double opt-in delivery) — **niemożliwe**: brak opublikowanego, publicznego Formularza w środowisku („No forms found", N1).
- **Native action-url submit** na poprawny zewnętrzny `https://` — edytor **nie udostępnia** edytowalnego pola `actionUrl`/`webhookId` (są read-only/legacy, „support-owned"), więc nie dało się skonfigurować tej ścieżki z UI.
- **Zapis / publikacja** — świadomie pominięte, by nie nadpisać fixture. Trwałość edycji po reloadzie i ich propagacja na front **niezweryfikowane**.
- **Loading message / Error message** — nie edytowane indywidualnie (to standardowe inputy tekstowe identyczne z przetestowanymi Title/Description/Button label/Success message; wysokie zaufanie, że działają).
- **Propagacja zmiany TEKSTU etykiet** (Email label / Consent label / First name label) do canvas — zweryfikowałem mechanikę pokrewnych pól i toggla `showEmailLabel` (sr-only), ale nie porównałem renderu samego napisu etykiety po edycji.
- **Tooltipy „info"** przy polach — nie klikane/nie weryfikowane.
- **Kolor przez realny OS color picker** — nieautomatyzowalny (N6); logikę zweryfikowałem przez handler React.
- **`analyticsEvent` / tracking** — brak edytowalnego pola w bieżącym UI (tylko read-only podsumowanie).

---

## 10. Podsumowanie

**Co działa (potwierdzone interakcją + DOM):**
- Wizard jako read-only orientacja (Starter summary + Live preview), poprawnie bez kontrolek edycyjnych.
- Visual: warianty (inline/stacked/minimal z ukrywaniem opisu), cała sekcja copy, semantyka formularza (email label, show-label, first name + required, consent + required, opt-in single/double + confirmation copy), button label, success message (z dual-write), preview state toggle, kolory (onChange + Clear), spacing/alignment/width — **wszystko, co przetestowałem w Visual, aktualizuje podgląd live**.
- Advanced jako w 100% read-only diagnostyka.
- Dostępność renderera (aria-labelledby, label htmlFor, autocomplete, required, aria-busy) — solidna.
- Front: poprawny render zapisanego stanu, czytelny komunikat „not connected", responsywność 375 px, zero błędów konsoli.

**Co nie działa / wymaga uwagi:**
- **N1** — brak Formularzy w środowisku blokuje test pełnej ścieżki forms-runtime.
- **N2/N3** — na froncie Enter w polu email wywołuje natywny GET i **wycieka email do URL** mimo „niepołączenia" i zablokowanego przycisku (dotyczy formularza z jednym polem tekstowym).
- **N4** — publiczny fixture niesie legacy `webhook`, którego UI nie produkuje; widget wygląda na gotowy, ale nie przyjmie zapisu.
- **N5** — wspólna „Visibility summary" raportuje „Hidden on all devices" (do weryfikacji po stronie shared infra).

**Stan ogólny:** edytor newslettera jest dojrzały i spójny — Wizard/Visual/Advanced mają jasny podział ról, a wszystkie przetestowane kontrolki Visual działają i propagują się do podglądu. Najpoważniejsze realne ryzyko to zachowanie natywnego submitu na froncie przy niepołączonym widgecie (N2). Pełnej ścieżki wysyłki (forms-runtime / external) nie udało się zweryfikować z powodu braku skonfigurowanego celu w tym środowisku.

---

## 11. Mapowanie obserwacji na pliki źródłowe

| Obserwacja | Plik / miejsce |
|-----------|----------------|
| N2/N3 (native submit, disabled vs `<form>`) | `core/widgets/core/newsletter.tsx` — `<form>` bez `onSubmit`; `action/method` ustawiane tylko gdy `connectionReady`; `<button disabled type={submitReady?'submit':'button'}>` |
| Różnice copy diagnostyki | `newsletter.tsx` — `connectionMessage` zależne od `renderContext.mode` |
| N1 (lista form) | `NewsletterEditors.tsx` — `useForms`, select „Bound form", `NO_FORM_VALUE` |
| N4 (legacy webhook) | `newsletter.tsx` — `resolveNewsletterIntegrationMode`, `resolveNewsletterTransport`; UI: `submissionModeOptions` (brak opcji webhook) |
| N6 (color input) | `SharedColorControl.tsx` — `input[type=color]` + `onChange` |
