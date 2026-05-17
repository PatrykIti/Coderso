# RAPORT: Newsletter Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #Newsletter-01
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** TEST-NEWSLETTER-WIDGET-0516 (`/admin/pages/17b15dfd-e367-4bba-b371-76bd66465e50`)

---

## 1. Przegląd widgetu

**Typ:** Composite
**Moduł:** Forms
**Złożoność:** Composite (z oznaczeniem `beginner` audience)
**Warianty:** `inline`, `stacked`, `minimal`
**Slot:** brak slotów child-widget

Newsletter widget to formularz zapisu do newslettera z konfigurowalnymi polami tekstowymi, opcją zgody marketingowej (consent), integracją via action URL lub webhook oraz opcjami stylizacji (spacing, alignment, background color).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Pole | Typ | Domyślna wartość | Opis |
|------|-----|-----------------|------|
| `title` | `string` | `"Join our newsletter"` | Nagłówek sekcji |
| `description` | `string` | `"Get the latest updates straight to your inbox."` | Opis poniżej tytułu (ukryty w `minimal`) |
| `placeholder` | `string` | `"you@example.com"` | Placeholder pola email |
| `consent.enabled` | `boolean` | `true` | Czy wyświetlać checkbox zgody |
| `consent.label` | `string` | `"I agree to receive updates."` | Treść checkboxa |
| `consent.required` | `boolean` | `false` | Czy zgoda wymagana do wysłania |
| `submit.label` | `string` | `"Subscribe"` | Etykieta przycisku submit |
| `submit.successMessage` | `string` | `"Thanks for joining!"` | Wiadomość po zapisaniu |
| `integration.mode` | `"action-url" \| "webhook"` | `"action-url"` | Tryb integracji formularza |
| `integration.actionUrl` | `string` | `""` | URL do POST (action-url mode) |
| `integration.webhookId` | `string` | `""` | ID webhooka (webhook mode) |
| `style.spacing` | `"none" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Odstępy między elementami |
| `style.alignment` | `"start" \| "center" \| "end"` | `"start"` | Wyrównanie sekcji i formularza |
| `style.background` | `string` | `"transparent"` | Kolor tła sekcji (clearable) |

### 2.2 Warianty

| Wariant | Opis | Różnice wizualne |
|---------|------|-----------------|
| `inline` | Input i button obok siebie (sm+) | `sm:flex-row sm:items-center`, nagłówek `text-xl` |
| `stacked` | Input nad przyciskiem | `flex-col`, pełna szerokość, nagłówek `text-xl` |
| `minimal` | Kompaktowy, bez opisu | `sm:flex-row sm:items-center`, nagłówek `text-lg`, **`description` ukryta** |

### 2.3 Tryby edytora

| Tryb | Zakres | Zawartość |
|------|--------|-----------|
| **Wizard** | Podstawowy | Variant selector (Select), title, description, button label, consent toggle + label |
| **Visual** | Pełny | Variant cards, content (title/desc/placeholder), consent+required, integration mode+url/webhook, background color, spacing+alignment |
| **Advanced** | Techniczny | Layout tokens (spacing/alignment), raw integration metadata (oba pola widoczne jednocześnie), normalization button |

**Uwaga:** `editorCapabilities.visualOwnsVariantSelection: true` — Visual editor powinien być właścicielem wyboru wariantu, ale Wizard **też** ma własny variant selector.

### 2.4 Ograniczenia renderera (zidentyfikowane z kodu)

| Ograniczenie | Szczegóły |
|-------------|-----------|
| Metoda formularza | Zawsze `POST`, brak opcji `GET` |
| Brak atrybutu `name` na email input | `<input type="email" required>` bez `name` — email **nie jest przesyłany** w POST body |
| Consent checkbox poza `<form>` | `<label>` z checkboxem renderowany poza tagiem `<form>` — `required` nie blokuje submit |
| Success message zawsze widoczna | `data-newsletter-success` renderowany statycznie, nie jest warunkowany przez stan JS |
| `max-w-xl` hardkodowany | Szerokość sekcji ograniczona, nie konfigurowalna |
| Kolor tekstu niemodyfikowalny | Tekst tytułu, opisu, consent zawsze `var(--color-text)` |
| Kolor przycisku niemodyfikowalny | Przycisk zawsze `var(--color-primary)` z `var(--color-bg)` jako kolor tekstu |
| Brak walidacji URL | `actionUrl` przyjmuje dowolny ciąg bez sprawdzenia formatu |
| `resolveNewsletterSpacing` nie obsługuje `"md"` jawnie | Literał `"md"` trafia do `return "md"` przez brak w warunkach — działa ale niespójny kod |

---

## 3. Wyniki testów Playwright

### 3.1 Admin UI — panel edycji

#### Wizard Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant Select (Inline/Stacked/Minimal) widoczny i działa | ✓ Działa | Select dropdown poprawnie zmienia wariant |
| Zmiana title / description / button label | ✓ Działa | Pola aktualizują preview w czasie rzeczywistym |
| Consent toggle OFF → pole "Consent label" znika | ✓ Działa | Field ukrywa się gdy consent wyłączony |
| Consent toggle ON → pole "Consent label" wraca | ✓ Działa | Poprawna reaktywność |
| "Continue to layout and styling" przechodzi do Visual | ✓ Działa | Tab Visual staje się aktywny |

#### Visual Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Variant cards (Inline / Stacked / Minimal) | ✓ Działa | Karty z badge "Selected" / "Pick" poprawnie reagują |
| Wariant Minimal → description ukryta w PREVIEW | ✓ Działa | `showDescription` = false dla minimal — weryfikacja eval HTML |
| Wariant Minimal → description NADAL edytowalna w edytorze | ⚠ UX Issue | Brak informacji że opis nie będzie wyświetlony (UX-02) |
| Content section: zmiana title, desc, placeholder | ✓ Działa | Preview aktualizuje się na żywo |
| Consent toggle + required switch | ✓ Działa | Obydwa switche działają |
| Integration mode: Action URL → Webhook | ✓ Działa | Pole zmienia się z "Form action URL" na "Webhook ID" |
| Integration mode: Webhook → pole Action URL znika | ✓ Działa | Tylko jedno pole widoczne zależnie od trybu |
| Background color picker: kolor / clear | ✓ Działa | Picker działa, Clear aktywny nawet przy transparent |
| Color picker fallback = `#ffffff` przy wartości `transparent` | ⚠ UX Issue | Picker otwiera się na białym mimo transparent — UX-01 |
| Spacing select (None/Compact/Default/Spacious/Extra spacious) | ✓ Działa | `data-newsletter-spacing="xl"` aktualizuje się w DOM |
| Alignment select (Start/Center/End) | ✓ Działa | `data-newsletter-alignment="center"` poprawnie ustawiany |

#### Advanced Editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Layout tokens (Spacing/Alignment) | ✓ Działa | Duplikat Visual, działa poprawnie |
| RAW: oba pola integration widoczne jednocześnie | ⚠ UX Issue | Action URL + Webhook ID zawsze widoczne — UX-03 |
| Normalization metadata: tekst z resolved state | ✓ Działa | Poprawnie pokazuje wariant, tryb, consent required |
| Przycisk "Normalize newsletter payload" | ✓ Działa | Normalizuje payload bez błędów |

#### Krytyczne obserwacje w podglądzie (Admin Preview)

| Test | Wynik | Uwagi |
|------|-------|-------|
| Email input: atrybut `name` | ✗ BRAK | `input[type=email]` nie ma `name` — BUG-01 potwierdzony |
| Consent checkbox poza `<form>` | ✗ BUG | Checkbox renderowany DOPO `</form>`, nie jest częścią formularza — BUG-02 |
| Consent `required` nie blokuje submit | ✗ BUG | Checkbox poza form → browser validation nie działa — BUG-02 |
| Success message zawsze widoczna | ✗ BUG | `display: block` stale, bez warunku JS — BUG-03 |
| Form `action` w admin preview | ✓ OK | `null` (brak atrybutu) gdy no actionUrl — poprawne zachowanie |
| Wizard + Visual: oba mają variant selector | ⚠ UX Issue | Wizard ma Select, Visual ma karty — dwa miejsca kontroli — BUG-04 |

---

### 3.2 Frontend — widok publiczny (http://localhost:3000)

| Test | Wynik | Uwagi |
|------|-------|-------|
| Widget renderuje się na froncie | ✓ Działa | Strona dostępna po opublikowaniu |
| Wariant Stacked renderuje się poprawnie | ✓ Działa | `data-newsletter-variant="stacked"` w DOM |
| Wyrównanie center zastosowane | ✓ Działa | `items-center text-center` w klasach |
| Spacing xl zastosowany | ✓ Działa | `gap-8` w klasach sekcji |
| Consent checkbox widoczny | ✓ Działa | Checkbox renderuje się |
| Email input bez atrybutu `name` | ✗ BUG | Potwierdzone: `name = ""` — email nie jest wysyłany w POST |
| Consent checkbox poza `<form>` | ✗ BUG | `form.contains(checkbox) = false` — potwierdzone |
| Success message zawsze widoczna | ✗ BUG | `display: block` bez warunkowania — potwierdzone |
| Form action domyślnie = bieżący URL | ⚠ Problem | Brak actionUrl → `action="http://localhost:3000/test-..."` — submit do tej samej strony |
| Responsywność: stacked column na mobile (375px) | ✓ Działa | `flex-direction: column` na 375px |
| Email input bez `aria-label` / `id` / `for` | ✗ BUG | Brak powiązanej etykiety — A3 potwierdzone |
| Email input bez `autocomplete="email"` | ✗ Brak | `getAttribute('autocomplete') = null` — A6 potwierdzone |
| Success message bez `aria-live` | ✗ Brak | `getAttribute('aria-live') = null` — A4 potwierdzone |

---

### 3.3 Porównanie Admin Preview vs Frontend

| Aspekt | Admin Preview | Frontend | Spójność |
|--------|--------------|---------|---------|
| Wariant | `stacked` | `stacked` | ✓ Spójne |
| Alignment | `center` | `center` | ✓ Spójne |
| Spacing | `xl` (gap-8) | `xl` (gap-8) | ✓ Spójne |
| HTML email input | brak `name` | brak `name` | ✓ Spójne (oba błędne) |
| Consent poza form | TAK | TAK | ✓ Spójne (oba błędne) |
| Success message widoczna | TAK | TAK | ✓ Spójne (oba błędne) |
| Form `action` attr | `null` (brak) | `current URL` | ⚠ Różnica (browser normalizacja) |
| Styl background | `style="background-color: transparent;"` | `style="background-color:transparent"` | ⚠ Format różny (oba transparentne) |

**Wniosek:** Widget zachowuje się spójnie między admin preview i frontem. Wszystkie znalezione błędy są obecne w **obu** środowiskach. Różnica w `form action` to standardowa normalizacja przeglądarki (brak atrybutu → bieżący URL), nie błąd CMS.

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Email input nie posiada atrybutu `name`
**Priorytet:** Krytyczny
**Opis:** `<input type="email" required>` (newsletter.tsx:284) nie ma atrybutu `name`. Przeglądarka nie dołącza pól bez `name` do danych POST. Użytkownik klika "Subscribe", przeglądarka wysyła pusty POST — adres email **nigdy nie dociera** do serwera.
**Lokalizacja:** `core/widgets/core/newsletter.tsx:284`
**Repro:** Otwórz dowolną stronę z newsletter widget, otwórz DevTools → Network, wpisz email i kliknij Subscribe. Payload POST będzie pusty (lub zawierać tylko webhookId).

#### BUG-02 — Consent checkbox poza elementem `<form>`
**Priorytet:** Wysoki
**Opis:** Tag `<label>` z checkboxem zgody renderowany jest poza `<form>` (newsletter.tsx:301–305). Skutki: (1) Atrybut `required` na checkboxie nie blokuje wysłania formularza — zgoda "wymagana" nie jest faktycznie egzekwowana przez przeglądarkę. (2) Wartość checkboxa nie jest dołączana do POST body. (3) Semantycznie checkbox nie jest częścią formularza.
**Lokalizacja:** `core/widgets/core/newsletter.tsx:279–313`

#### BUG-03 — Success message zawsze widoczna (brak warunkowania)
**Priorytet:** Wysoki
**Opis:** Element `<p data-newsletter-success="true">` renderowany jest zawsze (jeśli `successMessage` jest niepuste), nie tylko po pomyślnym zapisie. Użytkownik widzi "Thanks for joining!" jeszcze zanim cokolwiek wyśle. Oznacza to że albo widget oczekuje na zewnętrzny JS do ukrycia tego elementu (brak takiego kodu), albo jest to błąd.
**Lokalizacja:** `core/widgets/core/newsletter.tsx:307–311`

#### BUG-04 — Wizard editor ma własny variant selector mimo `visualOwnsVariantSelection: true`
**Priorytet:** Średni
**Opis:** Edytor Wizard (NewsletterWizardEditor:258–273) zawiera Select do wyboru wariantu. Jednocześnie `editorCapabilities.visualOwnsVariantSelection: true` wskazuje że Visual editor jest właścicielem wariantu. Dwa miejsca zmiany tego samego stanu mogą prowadzić do niespójności lub dezorientacji użytkownika.
**Lokalizacja:** `NewsletterEditors.tsx:258–273` + `newsletter.tsx:346`

#### BUG-05 — `resolveNewsletterSpacing` nie obsługuje jawnie wartości `"md"`
**Priorytet:** Niski
**Opis:** Funkcja (newsletter.tsx:137–140) sprawdza `"none" | "sm" | "lg" | "xl"`, ale nie `"md"`. Wartość `"md"` trafia do `return "md"` przez domyślny fallback. Funkcja działa poprawnie, ale kod jest niespójny z resztą resolverów i może wprowadzić błąd przy refaktoryzacji.
**Lokalizacja:** `core/widgets/core/newsletter.tsx:137–140`

---

### 4.2 Problemy UX edytora

#### UX-01 — Color picker: `transparent` w placeholder vs `#ffffff` w pickerze
**Opis:** Pole "Background color" ma placeholder `"transparent"` w polu tekstowym, ale `pickerFallback="#ffffff"` w konfiguracji (NewsletterEditors.tsx:535). Gdy użytkownik klika na color picker bez wcześniej ustawionej wartości, picker otwiera się na białym `#ffffff` — niezgodnym z rzeczywistym domyślnym stanem (`transparent`). Może skutkować przypadkowym ustawieniem białego tła.
**Rekomendacja:** Ujednolicić `pickerFallback` z domyślnym stanem: dla `transparent` fallback powinien być `#ffffff` z informacją "aktualna wartość: transparent".

#### UX-02 — Brak feedbacku że `minimal` wariant ukrywa opis
**Opis:** W edytorze Wizard i Visual pole "Description" jest zawsze widoczne i edytowalne, niezależnie od wybranego wariantu. Jednak wariant `minimal` nie renderuje opisu (newsletter.tsx:239–241). Użytkownik może wypełnić opis i nie zdawać sobie sprawy że jest ukryty.
**Rekomendacja:** Przy wybranym wariancie `minimal` wyświetlać w edytorze informację: "Opis nie jest wyświetlany w wariancie Minimal."

#### UX-03 — Advanced editor pokazuje oba pola integration jednocześnie
**Opis:** W zakładce Advanced sekcja "Raw integration metadata" pokazuje jednocześnie pola "Action URL (raw)" i "Webhook ID (raw)" obok siebie (NewsletterEditors.tsx:692–718). W Visual edytorze jedno z nich jest ukryte zależnie od trybu. W Advanced traci się ta kontekstowość — użytkownik nie wie które pole "wygrywa".
**Rekomendacja:** Dodać notatkę wyjaśniającą priorytety: "W trybie action-url, URL jest używany. W trybie webhook, webhookId jest używany."

#### UX-04 — Integration section: brak walidacji URL i feedback
**Opis:** Pole "Form action URL" przyjmuje dowolny tekst — brak walidacji formatu (https://, relative path, etc.). Użytkownik może wpisać `example.com` bez protokołu i formularz cicho nie zadziała.
**Rekomendacja:** Dodać inline walidację URL przy wyborze action-url mode.

#### UX-05 — Consent pole "required" nie jest wyjaśnione w kontekście semantycznym
**Opis:** Switch "Consent required" (NewsletterEditors.tsx:459–464) nie ma opisu wyjaśniającego co faktycznie oznacza "required": czy blokuje submit bez checkboxa (tak jest intencja), czy tylko stylizuje pole. Brak help text.
**Rekomendacja:** Dodać opis: "Użytkownicy nie będą mogli wysłać formularza bez zaznaczenia zgody."

#### UX-06 — Brak podglądu stanu "wysłanego" formularza w edytorze
**Opis:** Edytor nie ma żadnej opcji podglądu stanu po wysłaniu (sukces). Success message jest zawsze widoczna w podglądzie, co sprawia że user nie wie jak będzie wyglądał rzeczywisty flow.
**Rekomendacja:** Dodać toggle "Preview success state" w edytorze który symuluje stan po wysłaniu.

#### UX-07 — Brak wizualnego wskaźnika wariantu "inline" vs "stacked" na mobile
**Opis:** Opisy wariantów w VariantCards (NewsletterEditors.tsx:30–48) informują o układzie na desktop (`sm:`), ale nie komunikują zachowania na mobile (oba `inline` i `minimal` zwijają się do column layout). Użytkownik może wybrać "Inline" i być zaskoczony column layoutem na mobile.
**Rekomendacja:** Dodać do opisu karty wariantu: "Na mobile: layout zawsze pionowy."

---

### 4.3 Braki funkcjonalne

#### BF-01 — Brak atrybutu `name` na polu email (krytyczny dla funkcjonowania)
**Opis:** Patrz BUG-01. To jest zarówno bug jak i brak funkcjonalny — widget nie spełnia swojej podstawowej roli (zbierania adresów email).

#### BF-02 — Brak kontroli koloru tekstu
**Opis:** Tytuł, opis, consent label i placeholder używają `var(--color-text)`. Nie ma możliwości konfiguracji koloru tekstu per widget. Widget na kolorowym tle może mieć nieczytelny tekst bez możliwości korekty.

#### BF-03 — Brak kontroli koloru przycisku
**Opis:** Przycisk używa `var(--color-primary)` na tekście `var(--color-bg)`. Żaden z tych tokenów nie jest konfigurowalny per widget. Niemożliwe jest stworzenie widgetu z odmiennym kolorem CTA niż reszta strony.

#### BF-04 — Brak konfiguracji atrybutu `name` pola email
**Opis:** Nawet po naprawieniu BUG-01 (dodaniu `name`), nazwa pola powinna być konfigurowalna — różne backendy mogą oczekiwać różnych nazw (`email`, `Email`, `subscriber_email`, `EMAIL_ADDRESS`).

#### BF-05 — Brak obsługi wielu pól formularza
**Opis:** Widget obsługuje wyłącznie email. Wiele formularzy newsletterów zbiera imię (`first_name`), co znacząco poprawia personalizację. Brak możliwości dodania dodatkowych pól.

#### BF-06 — Brak konfiguracji szerokości sekcji
**Opis:** Sekcja ma hardkodowane `max-w-xl`. Nie ma możliwości stworzenia fullwidth, szerszego lub węższego widgetu newsletter.

#### BF-07 — Brak redirect po pomyślnym zapisie
**Opis:** Nie ma opcji redirect do thank-you page po udanym submit. Wymagałoby to JavaScript, ale nawet jako link do strony podziękowania brak tej opcji.

#### BF-08 — Brak ochrony przed spamem
**Opis:** Brak honeypot field, CSRF token, rate limit indication. Widget jest podatny na masowy spam automatycznymi botami.

#### BF-09 — Brak double opt-in konfiguracji
**Opis:** Brak możliwości konfiguracji potwierdzenia email (double opt-in). Wszystkie zapisy są single opt-in, co w niektórych jurysdykcjach (DSGVO, RODO) może być niewystarczające.

#### BF-10 — Brak konfiguracji metody HTTP formularza
**Opis:** Formularz zawsze używa `POST`. Część serwisów third-party wymaga `GET` (np. Mailchimp embed forms).

#### BF-11 — Brak loading state przycisku
**Opis:** Po kliknięciu Subscribe przycisk nie wskazuje że trwa przesyłanie. Użytkownik może kliknąć wielokrotnie, nie wiedząc czy formularz się wysyła.

#### BF-12 — Brak error state formularza
**Opis:** Brak możliwości wyświetlenia błędu (np. "Adres email już istnieje", "Błąd serwera"). Widget nie ma pola `errorMessage` ani żadnego mechanizmu obsługi błędów API.

#### BF-13 — Brak kontroli `rel` dla zewnętrznych zasobów formularza
**Opis:** Brak możliwości konfiguracji zachowania bezpieczeństwa dla action URL (np. `noopener`, CORS considerations).

#### BF-14 — Brak analytics/tracking integration
**Opis:** Brak możliwości dodania `data-analytics-*` atrybutów lub konfiguracji event tracking przy submit. Brak integracji z Google Analytics / GTM dla śledzenia konwersji.

#### BF-15 — Brak konfiguracji wariantów per breakpoint
**Opis:** Nie ma możliwości wybrania innego wariantu dla mobile niż desktop (np. stacked na mobile, inline na desktop).

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Email input bez atrybutu `name` — formularz nie funkcjonuje | WCAG 4.1.3 (Status Messages) | Krytyczny |
| A2 | Consent checkbox poza `<form>` — nie jest semantycznie częścią formularza | WCAG 1.3.1, 4.1.2 | Wysoki |
| A3 | Brak `<label for="...">` powiązanego z email input — brak dostępnej etykiety pola | WCAG 1.3.1, 4.1.2 | Wysoki |
| A4 | Success message bez `role="status"` lub `aria-live` — czytnik ekranu nie ogłosi sukcesu | WCAG 4.1.3 | Wysoki |
| A5 | Brak walidatora kontrastu — możliwe zestawienia koloru tła i tekstu naruszające WCAG AA | WCAG 1.4.3 | Średni |
| A6 | Brak `autocomplete="email"` na polu email | WCAG 1.3.5 | Niski |

---

## 6. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | Email input bez atrybutu `name` — email nie jest przesyłany | Renderer |
| BUG-02 | Consent checkbox poza `<form>` — `required` nieskuteczny | Renderer |
| BUG-03 | Success message zawsze widoczna przed wysłaniem | Renderer |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-02 | Informacja w edytorze że `minimal` ukrywa opis |
| UX-04 | Walidacja URL w polu action URL |
| UX-06 | Toggle "Preview success state" w edytorze |
| UX-07 | Opis zachowania mobile w kartach wariantów |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-02 | Wysoki | Kontrola koloru tekstu per widget |
| BF-03 | Wysoki | Kontrola koloru przycisku per widget |
| BF-05 | Wysoki | Dodatkowe pola formularza (np. imię) |
| BF-08 | Wysoki | Ochrona przed spamem (honeypot/CSRF) |
| BF-11 | Wysoki | Loading state przycisku Submit |
| BF-12 | Wysoki | Error state formularza |
| BF-06 | Średni | Konfiguracja szerokości sekcji (max-width) |
| BF-04 | Średni | Konfigurowalna nazwa atrybutu `name` pola email |
| BF-07 | Średni | Redirect po udanym zapisie |
| BF-09 | Średni | Double opt-in konfiguracja |
| BF-14 | Średni | Analytics/tracking integration |
| BF-10 | Niski | Konfiguracja metody HTTP (GET/POST) |
| BF-15 | Niski | Warianty per breakpoint |

---

## 7. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 |
| Problemy UX edytora | 7 |
| Braki funkcjonalne | 15 |
| Problemy dostępności | 6 |
| **Łącznie** | **33** |

---

## 8. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `newsletter-wizard-editor.png` | Widok Wizard editor z domyślnymi wartościami |
| `newsletter-visual-editor.png` | Widok Visual editor — pełna lista sekcji |
| `newsletter-advanced-editor.png` | Zakładka Advanced — oba pola integration widoczne (UX-03) |
| `newsletter-inline-preview.png` | Wariant Inline w podglądzie admin |
| `newsletter-stacked-preview.png` | Wariant Stacked w podglądzie admin |
| `newsletter-minimal-preview.png` | Wariant Minimal w podglądzie admin (description ukryta) |
| `newsletter-consent-outside-form.png` | Consent checkbox poza `<form>` — BUG-02 |
| `newsletter-success-always-visible.png` | Success message widoczna przed submit — BUG-03 |
| `newsletter-integration-section.png` | Sekcja Integration target (tryb Webhook) |
| `newsletter-frontend-stacked.png` | Frontend: wariant stacked na desktopie |
| `newsletter-frontend-mobile.png` | Frontend: responsywność — column layout na 375px |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Newsletter is classification only. Widget-owned
  semantics, submit flow, and transport behavior continue through the
  `TASK-276` family.
- Shared rows that match existing TASK-256 mechanisms still route through
  `TASK-256-01`, `TASK-256-02`, or `TASK-256-04`, but TASK-256 lands no
  Newsletter-specific code in this report. Final widget execution therefore
  remains deferred to `TASK-276`.
