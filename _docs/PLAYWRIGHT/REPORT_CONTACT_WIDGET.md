# RAPORT: Contact Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Contact Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `contact-audit` (oddzielna od innych agentów)

---

## 1. Przegląd widgetu

**Typ:** Form / Contact
**Moduł:** Forms
**Warianty:** `form-left`, `form-right`, `minimal`
**Ograniczenia pól formularza:** min 1 / max 4 (name, email, phone, message)

Contact widget służy do prezentacji formularza kontaktowego wraz z danymi kontaktowymi firmy (telefon, e-mail, adres, godziny pracy) oraz opcjonalną mapą embed. Obsługuje trzy układy prezentacji i szerokie możliwości konfiguracji stylu.

**Pliki źródłowe:**
- `core/widgets/core/contact.tsx` — renderer + typy + logika normalizacji
- `core/admin/ui/widgets/editors/ContactEditors.tsx` — edytory Wizard / Visual / Advanced

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **form** | `fields[]` (name/email/phone/message), `required[]`, `submitLabel` |
| **contact** | `phone`, `email`, `address`, `hours` |
| **map** | `enabled` (bool), `embedUrl` |
| **style** | `spacing` (none/sm/md/lg/xl), `background` (clearable), `columns` (one/two), `surfaceColor` (clearable), `borderColor`, `borderWidth` (0/1/2/3) |

### 2.2 Warianty renderera

| Wariant | Opis | Grid |
|---------|------|------|
| `form-left` | Formularz po lewej, dane kontaktowe po prawej | `md:grid-cols-2` (gdy `columns=two`) |
| `form-right` | Dane kontaktowe po lewej, formularz po prawej | `md:grid-cols-2` (gdy `columns=two`) |
| `minimal` | Tylko dane kontaktowe + opcjonalna mapa, brak formularza | `grid-cols-1` (zawsze) |

### 2.3 Tryby edytora

- **Wizard** — Select wariantu, toggle pól formularza, submit label, telefon/e-mail/adres (brak `hours`!)
- **Visual** — Karty wariantów, toggles pól + wymagalność + kolejność, dane kontaktowe (wszystkie), mapa, kolory, marginesy, kolumny
- **Advanced** — tylko ustawienia mapy, normalizacja, snapshot JSON

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (bezpośrednio wpływają na usability)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Brak sekcji tytułu / nagłówka widgetu** — brak pól `title` i `description` w `ContactData`. Widget nie może mieć nagłówka sekcji (np. „Skontaktuj się z nami") bez dodania osobnego widgetu tekstowego | Renderer / Model danych |
| C2 | **Telefon i e-mail renderowane jako zwykły tekst — brak klikalnych linków** — `contact.phone` i `contact.email` renderowane są jako `<p>`, nie jako `<a href="tel:...">` i `<a href="mailto:...">`. Na mobile szczególnie krytyczny brak | Renderer |
| C3 | **Formularz bez atrybutów `name` na polach** — żaden `<input>` ani `<textarea>` nie ma atrybutu `name`. Natywna obsługa formularza (np. `FormData`) nie zadziała; standardowe submission zwróci pusty obiekt | Renderer |
| C4 | **Brak `action` / handlera submit formularza** — form nie ma `action`, `method` ani `onSubmit`. Kliknięcie „Send message" powoduje native DOM submission do aktualnego URL (GET). Brak konfigurowalnego endpointu wysyłki | Renderer / Model danych |
| C5 | **Pole `hours` brakuje w edytorze Wizard** — `ContactWizardEditor` udostępnia tylko `phone`, `email`, `address` z sekcji contact; pole `hours` (godziny otwarcia) pominięte bez widocznego powodu | Edytor Wizard |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak tytułu dla panelu formularza i panelu danych kontaktowych** — nie można dodać nagłówka (`<h3>`) wewnątrz każdego panelu; brak pól `form.title` i `contact.title` | Model danych |
| W2 | **Brak custom etykiet pól formularza** — etykiety `name/email/phone/message` są hardcoded w `contactFieldLabelMap`. Nie można np. zmienić „Name" → „Imię i nazwisko" | Renderer |
| W3 | **Brak custom placeholder per pole** — placeholdery hardcoded w `contactFieldPlaceholderMap`. Użytkownik nie może ich zmieniać | Renderer |
| W4 | **Brak ikon przy danych kontaktowych** — pola phone/email/address/hours renderowane jako `<p>` bez ikon (telefon, koperta itp.). Brak opcji ikony w `ContactData.contact` | Renderer |
| W5 | **Brak ikonografii / etykiet customowych dla kontaktu** — każde pole poprzedza hardcoded prefix tekstu: „Phone:", „Email:", „Address:", „Hours:". Nie można zmienić etykiet. | Renderer |
| W6 | **Brak kontroli `maxWidth` sekcji** — hardcoded `max-w-5xl` (1024px). Nie można skonfigurować szerokości widgetu | Renderer |
| W7 | **Brak `padding` sekcji** — hardcoded `px-4`. Nie można zmienić z edytora | Renderer |
| W8 | **Brak drag & drop reorderingu pól formularza** — tylko Move up/Move down; przy 4 polach akceptowalne, ale UI byłby bardziej przyjazny z drag | Edytor |
| W9 | **Brak opcji tytułu/opisu dla sekcji mapy** — mapa renderowana bez nagłówka „Nasza lokalizacja" | Renderer |
| W10 | **Brak `allowFullScreen` na iframe mapy** — brak atrybutu `allowFullScreen` w `<iframe>` — mapa Google Maps wymaga tego do pełnoekranowego widoku | Renderer |
| W11 | **Brak customizacji tekstu przycisku submit w edytorze Wizard** — uwaga: Wizard MA pole `submitLabel`, ale wizualnie umieszczone poza kontekstem innych pól formularza (po liście pól, bez sekcji) — nieczytelne grupowanie | Edytor Wizard |
| W12 | **Brak opcji multi-kolumnowego layoutu pól formularza** — np. `name` + `email` side by side w jednym rzędzie | Renderer |
| W13 | **Brak social media links** — brak sekcji `contact.social[]` (Twitter/X, LinkedIn itp.) | Model danych |
| W14 | **Brak wskazówki o wymaganiu URL dla mapy** — pole URL mapy widoczne dopiero po włączeniu przełącznika; brak walidacji inline, brak tooltipa że akceptowane są tylko `https://` | Edytor |
| W15 | **Brak opcji konfiguracji wysokości mapy** — hardcoded `h-56` (224px) | Renderer |

### 3.3 Problemy UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Sekcja „Form fields and required rules" widoczna nawet dla wariantu `minimal`** — gdy wybrany jest `minimal` (brak formularza), Visual editor nadal pokazuje FieldToggleList i RequiredFieldList. Tylko `submitLabel` i `columns` są ukryte. Mylące dla użytkownika | Edytor Visual |
| U2 | **ColorField dla `borderColor` nie ma przycisku `onClear`** — pola `background` i `surfaceColor` mają `onClear`, ale `borderColor` nie ma — niespójność. Użytkownik nie może zresetować `borderColor` do wartości domyślnej bez ręcznego wpisania `var(--color-border)` | Edytor Visual |
| U3 | **Wizard używa Select dla wariantu zamiast visual cards** — Visual editor ma ładne karty z opisami; Wizard ma zwykły dropdown — brak spójności, gorszy onboarding | Edytor Wizard |
| U4 | **Advanced editor ma bardzo mało zawartości** — zawiera tylko: Map settings (duplikat z Visual), Normalization button, JSON snapshot. Brak zaawansowanych opcji jak reset per sekcję, raw field editor, prefill values. Sekcja Advanced jest de facto uboga | Edytor Advanced |
| U5 | **Brak pomocniczego tekstu (hint) przy polach kontaktowych** — formularz w edytorze Wizard i Visual ma pola bez podpowiedzi co to jest (np. przy „Address" brak informacji że obsługuje wieloliniowy tekst) | Edytor |
| U6 | **RequiredFieldList pokazuje wszystkie aktywne pola z MoveUp/MoveDown** — nie jest oczywiste że ten widok służy ZARÓWNO do zmiany kolejności jak i oznaczania jako required. Dwa różne zadania w jednym komponencie bez sekcji rozdzielającej | Edytor Visual |
| U7 | **Brak feedback (toast/inline) po kliknięciu „Apply normalization now"** — przycisk normalizacji w Advanced nie daje żadnej wizualnej informacji czy normalizacja cokolwiek zmieniła | Edytor Advanced |
| U8 | **Sekcja „Spacing and columns" — `columns` ukryta dla `minimal` ale wyjaśnienie jest statycznym tekstem** — zamiast ukryć pole, pokazany jest tekst `Columns apply only to form-left and form-right variants.` — zawiera backtick-sformatowane warianty (kod inline), co jest technicznym językiem deweloperskim, nie przyjaznym UX | Edytor Visual |
| U9 | **Brak tooltipów / podpisów dla opcji spacing** — „None/Compact/Default/Spacious/Extra spacious" bez informacji o wartościach odstępów (px/rem) | Edytor |
| U10 | **Brak możliwości zamknięcia/zwinięcia sekcji edytora** — długi Visual editor (6 sekcji) nie ma collapse/expand. Użytkownik musi scrollować całość przy każdej edycji | Edytor Visual |

### 3.4 Problemy renderera i dostępności

| # | Problem | Obszar |
|---|---------|--------|
| R1 | **`<section>` bez `aria-label` ani `aria-labelledby`** — główny kontener widgetu nie ma semantycznego opisu dla screen readerów | Dostępność |
| R2 | **`<form>` bez `aria-label`** — formularz nie ma dostępnej nazwy | Dostępność |
| R3 | **`<input>` i `<textarea>` bez atrybutu `id` i `name`** — pola bez `id` uniemożliwiają poprawne `<label htmlFor="...">`. Używana jest implicitna asocjacja przez wrapper `<label>` — działa, ale nie jest wzorcem (szczególnie w React) | Dostępność / HTML |
| R4 | **Brak `autocomplete` na polach formularza** — `name` powinno mieć `autocomplete="name"`, `email` → `autocomplete="email"`, `tel` → `autocomplete="tel"` | Dostępność / UX |
| R5 | **Dane kontaktowe bez semantycznych znaczników** — telefon/email renderowany jako `<p>Phone: ...</p>` zamiast `<address>` lub `<dl>/<dt>/<dd>`. Brak semantyki HTML dla danych kontaktowych | Semantyka HTML |
| R6 | **Brak `<dl>/<dt>/<dd>` dla par etykieta-wartość** — dane kontaktowe to lista definicji (etykieta + wartość), powinna używać description list | Semantyka HTML |
| R7 | **Kontener contact details bez `aria-label`** — `<div>` z danymi kontaktowymi nie ma żadnego opisowego atrybutu | Dostępność |
| R8 | **`<iframe>` mapy bez `allowFullScreen`** — brak atrybutu, Google Maps pokazuje przycisk pełnego ekranu który nie działa | HTML |
| R9 | **Brak `<noscript>` fallback lub alternatywnego tekstu dla mapy** — gdy JS jest wyłączony lub embed URL jest invalid/zablokowany, widoczny jest pusty prostokąt bez komunikatu | UX / Dostępność |
| R10 | **Button „Send message" bez `data-submit` ani `aria-busy`** — brak stanu ładowania/wysyłki | Dostępność |
| R11 | **`resolveContactSpacing` nie sprawdza explicite wartości "md"** — `if (value === "none" || value === "sm" || value === "lg" || value === "xl") return value; return "md";` — każda nieprawidłowa wartość (np. "invalid") powróci jako "md". Minimalny bug normalizacji | Logika |
| R12 | **`resolveContactBorderWidth` nie sprawdza explicite "1"** — analogicznie do spacing: wartość "1" obsługiwana tylko przez fallback, nie przez explicit check. Każda nieprawidłowa wartość zwróci "1" | Logika |

---

## 4. Testy w Admin UI Preview

> **Sesja:** `playwright-cli -s=contact-audit`
> **Strona testowa:** CONTACT-AUDIT-0516 (ID: `0f03d23f-57cc-47c8-8700-f6d783b8640b`)
> **Data testu:** 2026-05-16

> Uwaga: nazwy plików PNG w tym raporcie są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

### 4.1 Wizard editor — potwierdzenia

**Wizard editor zawiera:**
- Select dropdown dla wariantu (nie visual cards jak w Visual) — **U3 potwierdzony**
- Toggle lista pól formularza (Name/Email/Phone/Message)
- Pole Submit label (umieszczone poza kontekstem sekcji pól — **W11 potwierdzony**)
- Sekcja Contact details: Phone, Email, Address — **brak `hours`** — **C5 potwierdzony**
- Brak sekcji „Required fields" — użytkownik nie może ustawić wymagalności w Wizard

_Zrzut: `contact-02-wizard-editor.png`_

### 4.2 Visual editor — wariant `form-left` (domyślny)

- Karty wyboru wariantu: Form left / Form right / Minimal — **U3 różnica potwierdzona**
- Sekcja „Form fields and required rules": FieldToggleList + RequiredFieldList + MoveUp/MoveDown + submitLabel
- Sekcja „Contact details": Phone / Email / Address / **Hours** (wszystkie 4 pola) — pełna względem Wizard
- Sekcja mapy z przełącznikiem: po włączeniu pojawia się pole URL
- Kolory: `Section background` i `Card surface color` z przyciskiem Clear; `Card border color` **BEZ Clear** — **U2 potwierdzony**
- Color picker dla CSS variables (np. `var(--color-bg)`) wyświetla fallback `#ffffff` zamiast rzeczywistego koloru

_Zrzut: `contact-03-visual-editor.png`_

### 4.3 Visual editor — wariant `minimal`

Po przełączeniu na `Minimal`:
- Sekcja **„Form fields and required rules" nadal widoczna** (FieldToggleList i RequiredFieldList) — **U1 potwierdzony**
- `submitLabel` poprawnie ukryty
- `columns` poprawnie ukryty (zastąpiony statycznym tekstem z backtick-formatted wariantami) — **U8 potwierdzony**
- Podgląd formularza poprawnie: tylko dane kontaktowe, bez formularza

_Zrzut: `contact-04-minimal-variant-form-fields-visible.png`_

### 4.4 Test mapy — walidacja URL

- Wpisanie nieprawidłowego URL (`not-a-valid-url`) nie pokazuje żadnego błędu inline — **W14 potwierdzony**
- Mapa nie renderuje się (co jest poprawne — `resolveMapEmbedUrl` odrzuca nieprawidłowe URL)
- Brak feedbacku „URL jest nieprawidłowy" w edytorze
- JSON snapshot (Advanced) przechowuje `"embedUrl": "not-a-valid-url"` — dane składowane, mapa nie renderuje

_Zrzut: `contact-05-map-invalid-url-no-validation.png`_

### 4.5 Advanced editor

Zawartość:
- Map settings (duplikat sekcji z Visual) — **U4 potwierdzony** (uboga zawartość)
- „Apply normalization now" — brak jakiegokolwiek feedbacku po kliknięciu — **U7 potwierdzony**
- JSON diagnostics snapshot (read-only)

_Zrzut: `contact-06-advanced-editor.png`_

### 4.6 DOM inspekcja formularza (admin preview)

Wynik inspekcji `document.querySelectorAll('[data-contact-field]')`:

```json
[
  {"tag":"INPUT",  "field":"name",    "name":null, "id":"", "autocomplete":null, "required":false},
  {"tag":"INPUT",  "field":"email",   "name":null, "id":"", "autocomplete":null, "required":true},
  {"tag":"TEXTAREA","field":"message","name":null, "id":"", "autocomplete":null, "required":true}
]
```

- `name: null` na wszystkich polach — **C3 potwierdzony**
- `autocomplete: null` — **R4 potwierdzony**
- `id: ""` (puste) — implicitna asocjacja label/input przez wrapper — działa ale niepełny wzorzec

Formularz element:
- `action`: aktualny URL strony, `method: "get"` — **C4 potwierdzony**
- `aria-label: null` — **R2 potwierdzony**
- `section[data-contact-variant]` → `aria-label: null` — **R1 potwierdzony**

Dane kontaktowe:
- `emailLink` (a[href^="mailto"]): `false` — **C2 potwierdzony**
- `phoneLink` (a[href^="tel"]): `false` — **C2 potwierdzony**
- `contact-details div aria-label: null` — **R7 potwierdzony**

### 4.7 Test minimum pól

- Próba wyłączenia ostatniego aktywnego pola formularza (gdy tylko `Message` aktywne): switch pozostaje zaznaczony — **ochrona działa poprawnie**
- Kod: `if (!enabled && fields.length <= 1) return current;` — guard działa

### 4.8 Test reorderingu pól

- Move up/Move down w RequiredFieldList działa poprawnie
- Kolejność pól w podglądzie zmienia się natychmiast po kliknięciu
- Wynik testu: Name → Email → Message → Move down Email → kolejność: Name → Message → Email ✓

_Zrzut: `contact-14-field-reorder.png`_

---

## 5. Testy na froncie (localhost:3000)

> **URL testowy:** http://localhost:3000/contact-audit-0516
> **Data testu:** 2026-05-16

### 5.1 Wariant `form-right` — frontend

Wynik DOM inspekcji na froncie:

```json
{
  "formAction": "http://localhost:3000/contact-audit-0516",
  "formMethod": "get",
  "phoneLink": false,
  "emailLink": false,
  "sectionAriaLabel": null,
  "inputNames": [null, null, null]
}
```

Wszystkie błędy C2, C3, C4, R1, R2, R4 potwierdzone na froncie — identyczne z admin preview.

Układ `form-right`:
- `form order-2`, `details order-1` — kolejność CSS grid poprawna (details po lewej, form po prawej) ✓
- Na mobile (375px): form i details stackują się pionowo, form pojawia się pierwsza w DOM kolejności ✓

_Zrzut: `contact-08-frontend-form-left.png`, `contact-11-frontend-form-right.png`_

### 5.2 Submisja formularza na froncie

- Wypełnienie pól Name/Email/Message i kliknięcie „Send message"
- Wynik: URL zmienia się na `http://localhost:3000/contact-audit-0516?` (GET z pustymi params)
- Strona przeładowuje się, formularz jest czyszczony
- Brak potwierdzenia, brak komunikatu błędu/sukcesu — **C4 potwierdzony**

_Zrzut: `contact-09-form-submit-redirect.png`_

### 5.3 Responsywność — mobile 375px

- Przy `md:grid-cols-2`: na mobile layout jest single-column (poprawnie stacking) ✓
- Brak overflow/ukrytych elementów ✓
- Brak klikalnych linków tel/mailto — szczególnie dotkliwe na mobile — **C2 potwierdzony (mobile kontekst)**

_Zrzut: `contact-13-mobile-375px.png`_

---

## 6. Admin UI vs Frontend — porównanie zachowania

| Funkcjonalność | Admin Preview | Frontend | Zgodność |
|---------------|---------------|----------|----------|
| Renderowanie wariantu `form-left` | ✓ Form po lewej, details po prawej | ✓ Identyczne | ✓ OK |
| Renderowanie wariantu `form-right` | ✓ Details po lewej, form po prawej | ✓ Identyczne | ✓ OK |
| Renderowanie wariantu `minimal` | ✓ Tylko contact details | ✓ Identyczne | ✓ OK |
| Dane kontaktowe (Phone/Email/Address/Hours) | ✓ Renderowane jako `<p>` | ✓ Identyczne | ✓ OK (ale oba błędne — C2) |
| Linki tel:/mailto: | ✗ Brak | ✗ Brak | ✓ Zgodne (oba buggy) |
| Formularz — atrybuty `name` | ✗ Brak | ✗ Brak | ✓ Zgodne (oba buggy) |
| Formularz — submission | GET do aktualnego URL | GET do aktualnego URL | ✓ Zgodne (oba buggy) |
| `autocomplete` atrybuty | ✗ Brak | ✗ Brak | ✓ Zgodne (oba buggy) |
| `aria-label` na section | ✗ Brak | ✗ Brak | ✓ Zgodne (oba buggy) |
| Reordering pól | Działa poprawnie w edytorze | Odzwierciedlone na froncie | ✓ OK |
| Układ jednokolumnowy vs dwukolumnowy | Widoczne w edytorze | Odzwierciedlone na froncie | ✓ OK |
| Mobile layout (375px) | Stacking pionowy | Stacking pionowy | ✓ OK |

**Wniosek:** Admin preview i frontend zachowują się identycznie. Wszystkie bugi dotyczą obu środowisk — są to błędy na poziomie renderer komponentu `ContactBlock`, a nie rozbieżności admin vs frontend.

---

## 7. Podsumowanie i matryca priorytetów

### 7.1 Błędy do naprawy w pierwszej kolejności

| # | Problem | Priorytet |
|---|---------|-----------|
| C2 | Brak klikalnych linków tel:/mailto: w danych kontaktowych | KRYTYCZNY |
| C3 | Brak atrybutu `name` na polach formularza | KRYTYCZNY |
| C4 | Brak `action`/handlera submit | KRYTYCZNY |
| C5 | Brak `hours` w Wizard edytorze | WYSOKI |
| U2 | Brak `onClear` dla borderColor | WYSOKI |
| U1 | Form fields visible w wariancie minimal | WYSOKI |
| R4 | Brak `autocomplete` | ŚREDNI |
| W10 | Brak `allowFullScreen` na iframe | ŚREDNI |

### 7.2 Ulepszenia UX

| # | Problem | Priorytet |
|---|---------|-----------|
| C1 | Brak sekcji title/description widgetu | WYSOKI |
| W2 | Brak custom etykiet pól | SREDNI |
| W3 | Brak custom placeholder per pole | ŚREDNI |
| W4 | Brak ikon przy danych kontaktowych | NISKI |
| U10 | Brak collapse sekcji edytora | NISKI |

### 7.3 Braki funkcjonalne

| # | Problem | Priorytet |
|---|---------|-----------|
| C1 | Brak widget title/description | WYSOKI |
| W13 | Brak social media links | NISKI |
| W15 | Hardcoded wysokość mapy | NISKI |
| W12 | Brak multi-kolumnowego layoutu pól | NISKI |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy krytyczne | 5 |
| Problemy ważne (W) | 15 |
| Problemy UX edytora (U) | 10 |
| Problemy renderera/dostępności (R) | 12 |
| **Łącznie** | **42** |

---

## 9. Screenshoty

| Plik | Opis |
|------|------|
| `contact-01-added.png` | Widget Contact dodany do strony testowej w admin |
| `contact-02-wizard-editor.png` | Wizard editor — brak `hours`, Select zamiast visual cards |
| `contact-03-visual-editor.png` | Visual editor — pełna konfiguracja, widoczne `Clear` buttons |
| `contact-04-minimal-variant-form-fields-visible.png` | Wariant `minimal` — form fields section nadal widoczna (U1) |
| `contact-05-map-invalid-url-no-validation.png` | Brak walidacji dla nieprawidłowego URL mapy (W14) |
| `contact-06-advanced-editor.png` | Advanced editor — uboga zawartość, brak feedbacku normalizacji |
| `contact-07-form-left-preview.png` | Podgląd admin `form-left` z domyślnymi danymi |
| `contact-08-frontend-form-left.png` | Frontend `form-left` — widoczne `<p>` zamiast linków |
| `contact-09-form-submit-redirect.png` | Formularz po submission — GET redirect, puste params |
| `contact-10-form-right-admin-preview.png` | Admin preview `form-right` — poprawna kolejność kolumn |
| `contact-11-frontend-form-right.png` | Frontend `form-right` — identyczny z admin |
| `contact-12-one-column-layout.png` | Układ jednokolumnowy — form i details w jednej kolumnie |
| `contact-13-mobile-375px.png` | Mobile 375px — poprawny stacking pionowy |
| `contact-14-field-reorder.png` | Reordering pól — kolejność Name → Message → Email po Move down |
