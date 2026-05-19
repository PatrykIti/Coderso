# RAPORT: Appointment Form Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Audit snapshot closed, implementation status synchronized
> **Data:** 2026-05-16
> **Sesja:** Playwright (Appointment Form Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** TEST-APPOINTMENT-FORM-0516 (`/test-appointment-form-0516`)

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Booking  
**Wymaga modułu:** `booking`  
**Warianty:** `default` (jedyny)  
**Kategoria:** forms  
**Złożoność:** intermediate

Widget formularza umówienia wizyty — zbiera dane klienta i wysyła rezerwację do API po uprzednim wybraniu slotu w powiązanym Booking Calendar. Komunikacja między widgetami odbywa się przez wspólny `flowId` i mechanizm `CustomEvent` (`nextless:booking-slot-selected`), z globalnym stanem `window.__nextlessBookingRuntimeState`.

> Uwaga: sekcje 1-9 dokumentują stan audytu Playwright z 2026-05-16. Aktualny
> status implementacji/future-task routing jest zapisany w sekcji
> `Status po TASK-258`.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Integracja** | `flowId` — klucz synchronizacji z Booking Calendar |
| **Nagłówek** | `title`, `description` |
| **Slot summary** | `slotSummaryLabel`, `slotSummaryEmptyMessage` |
| **Pola klienta** | `customerNameLabel/Placeholder`, `customerEmailLabel/Placeholder`, `customerPhoneLabel/Placeholder`, `notesLabel/Placeholder` |
| **Widoczność pól** | `showPhone`, `showNotes` |
| **Przyciski/komunikaty** | `submitLabel`, `successMessage`, `noSelectionMessage` |
| **Endpoint** | `submissionEndpoint` |
| **Style** | `frameBackground`, `frameBorderColor`, `summaryBackground`, `summaryBorderColor`, `submitBackground` |
| **Resolved (runtime)** | `submissionNonce`, `error` |

### 2.2 Pola formularza (renderowane HTML)

| Pole | Typ HTML | Required | Widoczność |
|------|----------|----------|------------|
| customerName | `input[text]` | ✅ required | zawsze |
| customerEmail | `input[email]` | ❌ opcjonalny | zawsze |
| customerPhone | `input[tel]` | ❌ opcjonalny | `showPhone` |
| notes | `textarea` | ❌ opcjonalny | `showNotes` |
| formNonce | `input[hidden]` | — | jeśli nonce |

### 2.3 Tryby edytora

- **Wizard** — Flow key, copy (title, description, submit label, success message), surface style
- **Visual** — Slot summary copy, pola klienta (labels + placeholders), toggles, surface style
- **Advanced** — Endpoint override, "no selection" error, resolved runtime payload (nonce, runtime error), layout, visibility

---

## 3. Wyniki testów Playwright — Admin UI

### 3.1 Konfiguracja Wizard ✓

| Test | Wynik | Uwagi |
|------|-------|-------|
| Flow key field | ✓ Działa | Domyślna wartość `booking-flow`, edytowalna |
| Title / Description edit | ✓ Działa | Textarea dla description, Input dla title |
| Submit label | ✓ Działa | Domyślnie "Book appointment" |
| Success message | ✓ Działa | Domyślnie "Appointment booked successfully." |
| Surface style fields | ✓ Działa | Clearable fields z wartościami CSS var |
| Continue to layout and styling | ✓ Działa | Przechodzi do Visual tab |

### 3.2 Konfiguracja Visual

| Test | Wynik | Uwagi |
|------|-------|-------|
| Slot summary labels | ✓ Działa | Summary label i no-selection message edytowalne |
| Field labels i placeholders | ✓ Działa | Wszystkie pola edytowalne |
| showPhone toggle OFF → phone field hidden w canvas | ✓ Działa | Canvas poprawnie ukrywa pole |
| showPhone toggle OFF → Phone label/placeholder w edytorze | ⚠️ Nadal widoczne | **UX-01 — Potwierdzone** |
| showNotes toggle OFF → notes field hidden w canvas | ✓ Działa | Canvas poprawnie ukrywa pole |
| showNotes toggle OFF → Notes label/placeholder w edytorze | ⚠️ Nadal widoczne | **UX-01 — Potwierdzone** |
| Surface style → natychmiastowy podgląd | ✓ Działa | Zmiana submitBackground (np. `#e53e3e`) odzwierciedlona natychmiast |
| Clear buttons na style fields | ✓ Działa | Reset do placeholdera |

### 3.3 Konfiguracja Advanced

| Test | Wynik | Uwagi |
|------|-------|-------|
| Submission endpoint override | ✓ Dostępne | Sekcja "Runtime endpoint" |
| No selection error message | ✓ Dostępne | Sekcja "Errors" — **UX-03 potwierdzony**: należy do Visual, nie Advanced |
| Resolved nonce editable | ✓ Dostępne | Brak ostrzeżenia że runtime-only — **BF-16 potwierdzony** |
| Runtime error field | ✓ Dostępne | Brak opisu kiedy używać — **UX-06 potwierdzony** |
| Layout (Container/Padding/Margin) | ✓ Działa | Standardowy layout panel |
| Visibility (Desktop/Tablet/Mobile) | ✓ Działa | Trzy przełączniki widoczności |

### 3.4 Podgląd widgetu w Admin Canvas

| Test | Wynik | Uwagi |
|------|-------|-------|
| Widget renderuje się poprawnie | ✓ Działa | Sekcja z nagłówkiem, slot summary, polami, przyciskiem |
| Slot summary empty state | ✓ Działa | Wyświetla `slotSummaryEmptyMessage` |
| Pola widoczne zgodnie z konfiguracją | ✓ Działa | Toggle off → pole znika w canvas |
| Submit button | ✓ Widoczny | Styl zgodny z konfiguracją |
| **Submit button DISABLED bez slotu** | ❌ NIE jest disabled | **BUG-01 — Krytyczny**: runtime skrypt nie działa w admin canvas |
| Style overrides → natychmiastowy podgląd | ✓ Działa | Inline CSS odzwierciedla się natychmiast |
| Kolor tekstu przycisku submit | ⚠️ Hardcoded | `text-[var(--color-bg)]` bez możliwości customizacji — **BF-03 potwierdzony** |

---

## 4. Wyniki testów Playwright — Frontend (localhost:3000)

### 4.1 Renderowanie

| Test | Wynik | Uwagi |
|------|-------|-------|
| Widget renderuje się na froncie | ✓ Działa | Kompletna sekcja formularza |
| Slot summary empty state | ✓ Działa | "Select a slot in Booking Calendar first." |
| **Submit DISABLED bez slotu** | ✓ Poprawnie disabled | Runtime skrypt działa na froncie |
| Submit enabled po symulacji slotu | ✓ Działa | Dispatch CustomEvent aktywuje przycisk |
| Slot summary aktualizuje się po wyborze | ✓ Działa | Format: `20 maj 2026 • 12:00 - 12:30` (polska lokalizacja) |

### 4.2 Walidacja formularza

| Test | Wynik | Uwagi |
|------|-------|-------|
| Brak imienia (required) → blokuje submisję | ✓ Działa | HTML5 `required` sprawdzone |
| Brak e-maila → submisja przechodzi | ✓ Zgodne z kodem | Email niewymagany — **BF-02 potwierdzony** |
| Nieprawidłowy format email → blokuje | ✓ Działa | HTML5 `type="email"` walidacja działa |
| Brak slotu → button disabled | ✓ Działa | Runtime skrypt poprawnie wyłącza przycisk |
| Telefon bez `pattern` → brak formatu | ✓ Potwierdzone | `pattern: ""` — **BF-10 potwierdzony** |
| Textarea bez `maxlength` | ✓ Potwierdzone | `maxLength: -1` — **BF-11 potwierdzony** |

### 4.3 Zachowanie po submisji (API 400)

| Test | Wynik | Uwagi |
|------|-------|-------|
| Error message wyświetla się | ✓ Działa | `bg-rose-50 border-rose-300` styling poprawny |
| Error text z API | ✓ Działa | "Invalid payload" (z odpowiedzi API) |
| Przycisk re-enable po błędzie | ✓ Działa | Dostępny ponownie |
| **Stary error pozostaje po re-edycji** | ⚠️ Nie jest czyszczony | **UX-07 — Nowy**: error z poprzedniej submisji widoczny gdy użytkownik edytuje pola |

### 4.4 Atrybuty dostępności

| Atrybut | Wartość | Ocena |
|---------|---------|-------|
| Form `autocomplete` | `null` (brak) | ❌ Brak autocomplete hints |
| Form `aria-label` | `null` (brak) | ❌ Brak opisu formularza dla screen readerów |
| Tel `pattern` | `""` (brak) | ❌ Brak walidacji formatu |
| Textarea `maxlength` | -1 (brak) | ❌ Nieograniczona długość |

### 4.5 Admin vs. Frontend — porównanie

| Aspekt | Admin preview | Frontend | Zgodność |
|--------|--------------|----------|----------|
| Renderowanie widgetu | ✓ | ✓ | ✅ Zgodne |
| Style | ✓ | ✓ | ✅ Zgodne |
| Slot summary empty state | ✓ | ✓ | ✅ Zgodne |
| **Submit disabled bez slotu** | ❌ NIE disabled | ✅ Poprawnie disabled | ❌ **RÓŻNICA — BUG-01** |
| Runtime script execution | ❌ Nie działa | ✅ Działa | Celowe (admin canvas = SSR preview) |
| Field visibility per toggle | ✓ | ✓ | ✅ Zgodne |

---

## 5. Znalezione błędy i problemy

### 5.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Submit button NIE jest disabled w admin canvas bez slotu
**Priorytet:** Wysoki  
**Opis:** W admin canvas preview przycisk "Book appointment" jest zawsze aktywny (clickable), niezależnie od braku wybranego slotu. Na froncie jest poprawnie disabled. Dzieje się tak dlatego, że runtime skrypt (`bookingRuntimeScript.ts`) nie jest wykonywany w kontekście React-renderowanego canvas admina.  
**Skutek:** Admin widzi inny stan przycisku niż użytkownik końcowy — dezorientacja podczas testowania konfiguracji.  
**Lokalizacja:** Admin canvas preview widgetu

#### BUG-02 — Stary error nie jest czyszczony przy ponownej edycji formularza
**Priorytet:** Średni  
**Opis:** Gdy submisja zwróci błąd API (np. "Invalid payload"), komunikat błędu pozostaje widoczny `p[data-booking-form-error]`. Po tym jak użytkownik zaczyna edytować pola formularza (np. zmienia imię), stary błąd nadal jest wyświetlony. Błąd znika dopiero przy kolejnej submisji.  
**Lokalizacja:** Frontend — `bookingRuntimeScript.ts`, `bindAppointmentForm`  
**Repro:** Submit z błędem API → edytuj dowolne pole → stary error nadal widoczny

---

### 5.2 Problemy UX edytora

#### UX-01 — Labels/placeholders pól phone/notes widoczne mimo toggle OFF
**Priorytet:** Wysoki — Potwierdzone Playwright  
**Opis:** W Visual Editor pola "Phone label", "Phone placeholder" pozostają widoczne i edytowalne gdy przełącznik `showPhone` jest OFF. Identycznie dla `showNotes`. Canvas poprawnie ukrywa pola w podglądzie, ale edytor nadal pokazuje te pola jako aktywne do edycji — wprowadza w błąd administratora.  
**Rekomendacja:** Ukryj lub wyszarz sekcje label/placeholder pola które ma toggle = OFF.

#### UX-02 — Flow key bez weryfikacji powiązania z Booking Calendar
**Priorytet:** Wysoki  
**Opis:** Pole "Flow key" w Wizard to czysty tekst bez wskazówki czy na stronie jest odpowiadający Booking Calendar widget z tym samym kluczem. Brak walidacji live, brak podpowiedzi z istniejących widgetów na stronie, brak ostrzeżenia gdy formularz jest samotny (bez kalendarza). Użytkownik może wpisać zły klucz i formularz nigdy nie otrzyma slotu.

#### UX-03 — "No selection message" w zakładce Advanced zamiast Visual
**Priorytet:** Średni — Potwierdzone Playwright  
**Opis:** Komunikat błędu `noSelectionMessage` (pokazywany gdy użytkownik próbuje złożyć formularz bez wybranego slotu) jest ukryty w zakładce Advanced → sekcja "Errors". To bezpośredni komunikat użytkownika końcowego i powinien być w Visual obok `slotSummaryEmptyMessage`.

#### UX-04 — Dwie warstwy stylizacji bez wskaźnika (legacy vs. inline CSS)
**Priorytet:** Średni  
**Opis:** Widget stosuje podwójną logikę stylowania:
- Gdy `style === undefined` → Tailwind legacy klasy (np. `bg-[var(--color-bg)]/95`)
- Gdy `style !== undefined` → inline CSS z clearable values

Admin nie widzi w edytorze czy aktualnie używa stylu "z motywu" (Tailwind fallback) czy "nadpisanego" (inline). Pole "Frame border" ma placeholder `var(--color-border)`, ale faktyczna wartość to też `var(--color-border)` — czy jest zapisana czy to tylko default? Brak wskaźnika.

#### UX-05 — Brak opisu sekcji "Resolved runtime payload" w Advanced
**Priorytet:** Niski — Potwierdzone Playwright  
**Opis:** Sekcja "Injected by server runtime resolver" jest opisana jednozdaniowo. Pole "Submission nonce" jest edytowalne bez ostrzeżenia, że jest runtime-only. Admin może manualnie wpisać lub skasować nonce, psując zabezpieczenie CSRF.

#### UX-06 — Brak kontekstu dla "Runtime error" w Advanced
**Priorytet:** Niski  
**Opis:** Pole "Runtime error" w sekcji "Resolved runtime payload" z placeholder `e.g. booking_nonce_unavailable` nie wyjaśnia kiedy jest potrzebne, kto je ustawia i jakie wartości są dopuszczalne.

#### UX-07 — Stary error message pozostaje po re-edycji formularza
**Priorytet:** Średni — Nowy, odkryty w testach  
**Opis:** Po błędzie API komunikat error jest widoczny. Gdy użytkownik zaczyna re-edytować formularz (np. zmienia imię), stary error z poprzedniej próby nie jest czyszczony. Sugeruje że problem nadal istnieje mimo naprawy przez użytkownika.  
**Rekomendacja:** Dodać event listener na `input` w polach formularza który czyści komunikat błędu przy pierwszej interakcji użytkownika.

---

### 5.3 Braki funkcjonalne

#### BF-01 — Tylko jeden wariant ("default")
**Priorytet:** Średni  
Widget ma wyłącznie wariant `default`. Brak wariantów: compact, multi-step, inline (bez ramki), sidebar, card-with-summary. Inne widgety systemu oferują 2–4 warianty.

#### BF-02 — Brak konfiguracji wymagalności pól — email zawsze opcjonalny
**Priorytet:** Wysoki — Potwierdzone Playwright  
`customerEmail` nie jest `required`. Użytkownik może złożyć rezerwację bez e-maila, co uniemożliwia wysłanie potwierdzenia. Brak opcji admina `requiredEmail`, `requiredPhone` do ustawienia wymagalności pól.

#### BF-03 — Hardcoded kolor tekstu przycisku submit
**Priorytet:** Wysoki — Potwierdzone Playwright  
Klasa przycisku to `text-[var(--color-bg)]` — zawsze kolor tła motywu. Wartość rzeczywista: `rgb(240, 232, 213)`. Brak `submitTextColor` w konfiguracji `style`. Przy ciemnym tle przycisku `submitBackground` tekst może być nieczytelny.

#### BF-04 — Brak pola "first name / last name" (podział nazwy)
**Priorytet:** Średni  
Jedno pole "Full name" bez opcji rozdzielenia na imię i nazwisko — wymagane w wielu systemach CRM i integracji z kalendarzami.

#### BF-05 — Brak pól niestandardowych (custom fields)
**Priorytet:** Średni  
Brak możliwości dodania pól własnych (firma, typ usługi po stronie klienta). Zestaw jest stały: name, email, phone, notes.

#### BF-06 — Brak nazwy usługi/zasobu w slot summary
**Priorytet:** Wysoki  
Slot summary pokazuje tylko czas (`20 maj 2026 • 12:00 - 12:30`), bez nazwy usługi ani zasobu. Klient nie wie "co" zarezerwował — widzi tylko "kiedy".

#### BF-07 — Brak checkbox zgody RODO / Terms & Conditions
**Priorytet:** Wysoki  
Brak możliwości dodania wymaganego checkboxa zgody (RODO, T&C, polityka prywatności). Wymóg prawny w UE dla formularzy zbierających dane osobowe.

#### BF-08 — Brak integracji CAPTCHA w UI
**Priorytet:** Wysoki  
`captchaToken` jest obsługiwany w kodzie submisji (`bookingRuntimeScript.ts`) i walidacji API (`bookingSchemas.ts`), ale nie ma żadnego elementu UI do integracji reCAPTCHA/hCaptcha/Turnstile. Formularz jest narażony na spam boty.

#### BF-09 — Brak komunikatu "loading" podczas submisji
**Priorytet:** Wysoki  
Po kliknięciu "Book appointment" przycisk jest wyłączany (`disabled`), ale nie zmienia tekstu ani nie pokazuje spinnera. Użytkownik nie wie czy formularz jest przetwarzany.

#### BF-10 — Brak walidacji formatu telefonu
**Priorytet:** Średni — Potwierdzone Playwright  
Pole tel `pattern=""` (brak walidacji). Placeholder `+1 000 000 000` sugeruje format US. Brak walidacji formatu (krajowy, międzynarodowy, z prefiksem).

#### BF-11 — Brak limitu znaków dla textarea "Notes"
**Priorytet:** Średni — Potwierdzone Playwright  
`maxLength: -1` (nieograniczone). Brak licznika znaków. Użytkownik może wpisać dowolną ilość tekstu.

#### BF-12 — Brak redirect URL po udanej submisji
**Priorytet:** Średni  
Po pomyślnej rezerwacji formularz jest resetowany, ale użytkownik pozostaje na tej samej stronie. Brak konfigurowalnego redirect URL po sukcesie.

#### BF-13 — Brak czyszczenia slotu po udanej submisji
**Priorytet:** Wysoki  
Po pomyślnej submisji (`form.reset()` wywołane w `bookingRuntimeScript.ts`) slot pozostaje wybrany w `window.__nextlessBookingRuntimeState`. Slot summary nadal pokazuje "zarezerwowany" czas, a użytkownik może przypadkowo złożyć drugą identyczną rezerwację.

#### BF-14 — Brak opcji showEmail
**Priorytet:** Niski  
`showPhone` i `showNotes` istnieją, ale nie ma `showEmail`. Email zawsze widoczny — dla systemów opartych wyłącznie na telefonie e-mail jest zbędnym polem.

#### BF-15 — Brak lokalizacji / locale config
**Priorytet:** Niski  
Domyślne teksty wyłącznie po angielsku. Brak pola `locale`. Wyświetlana data slotu używa `toLocaleDateString` — format zależy od systemu przeglądarki (wynik w testach: "20 maj 2026" — polska lokalizacja). Placeholder telefonu `+1 000 000 000` sugeruje US.

#### BF-16 — Edytowalne pole "Submission nonce" bez ostrzeżenia
**Priorytet:** Niski — Potwierdzone Playwright  
Pole "Submission nonce" w Advanced tab jest edytowalne. Jest to runtime-only wartość injektowana przez serwer. Brak ostrzeżenia o tym fakcie w UI.

#### BF-17 — Brak `autocomplete` hints na polach formularza
**Priorytet:** Niski — Potwierdzone Playwright  
Żadne pole nie ma atrybutu `autocomplete` (sprawdzone: `null`). Przeglądarka nie może zaproponować wypełnienia pól (np. `autocomplete="name"`, `autocomplete="email"`, `autocomplete="tel"`). Pogarsza UX na urządzeniach mobilnych.

#### BF-18 — Brak `aria-label` / `role` na formularzu
**Priorytet:** Niski — Potwierdzone Playwright  
Form element nie ma `aria-label` ani `aria-describedby`. Screen readery nie identyfikują formularza jako "Appointment booking form" lub podobnie.

---

## 6. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Brak `autocomplete` hints na polach | WCAG 1.3.5 | Wysoki |
| A2 | Brak `aria-label` na `<form>` | WCAG 4.1.2 | Średni |
| A3 | Brak konfiguracji required email — formularz można złożyć bez kontaktu | UX/Business | Wysoki |
| A4 | Tel bez `pattern` — brak walidacji formatu | UX | Średni |
| A5 | Textarea bez `maxlength` / licznika | UX | Niski |
| A6 | Hardcoded kolor tekstu przycisku — ryzyko niskiego kontrastu | WCAG 1.4.3 | Wysoki |

---

## 7. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | Submit NIE disabled w admin canvas (runtime skrypt nie działa) | Admin preview |
| BUG-02 | Stary error nie czyszczony przy re-edycji | Frontend runtime |
| BF-13 | Slot nie jest czyszczony po udanej submisji | Frontend runtime |

### Pilne braki funkcjonalne

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-07 | Wysoki | Brak checkbox RODO/T&C |
| BF-08 | Wysoki | Brak integracji CAPTCHA w UI |
| BF-02 | Wysoki | Email zawsze opcjonalny — brak konfiguracji required |
| BF-03 | Wysoki | Hardcoded kolor tekstu przycisku submit |
| BF-09 | Wysoki | Brak loading state podczas submisji |
| BF-06 | Wysoki | Brak nazwy usługi/zasobu w slot summary |

### Pilne ulepszenia UX

| ID | Priorytet | Opis |
|----|-----------|------|
| UX-01 | Wysoki | Labels toggle-zależnych pól widoczne mimo OFF |
| UX-02 | Wysoki | Brak walidacji/feedback dla flow key |
| UX-07 | Średni | Error message nie czyszczony przy interakcji |
| UX-03 | Średni | noSelectionMessage w Advanced zamiast Visual |
| UX-04 | Średni | Niejasna relacja stylu domyślnego vs nadpisanego |

### Braki funkcjonalne (niższy priorytet)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Średni | Tylko jeden wariant widgetu |
| BF-04 | Średni | Brak split first/last name |
| BF-05 | Średni | Brak custom fields |
| BF-10 | Średni | Brak walidacji formatu tel |
| BF-11 | Średni | Brak maxlength / licznika dla notes |
| BF-12 | Średni | Brak redirect URL po submisji |
| BF-17 | Niski | Brak autocomplete hints |
| BF-18 | Niski | Brak aria-label na formularzu |
| BF-14 | Niski | Brak togglea showEmail |
| BF-15 | Niski | Brak locale config |
| BF-16 | Niski | Brak ostrzeżenia przy resolved nonce |

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 2 |
| Problemy UX edytora | 7 |
| Braki funkcjonalne | 18 |
| Problemy dostępności | 6 |
| **Łącznie** | **33** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git.

| Plik | Opis |
|------|------|
| `appt-form-wizard-initial.png` | Wizard tab — stan początkowy po dodaniu widgetu |
| `appt-form-visual-toggles-on.png` | Visual tab — oba toggles ON (phone + notes widoczne) |
| `appt-form-phone-toggle-off.png` | Visual tab — showPhone OFF, Phone label/placeholder nadal widoczne w edytorze (UX-01) |
| `appt-form-notes-toggle-off.png` | Visual tab — showNotes OFF, Notes label/placeholder nadal widoczne w edytorze (UX-01) |
| `appt-form-advanced-tab.png` | Advanced tab — runtime endpoint, errors, resolved payload |
| `appt-form-wizard-tab.png` | Wizard tab — Flow + Copy + Surface sections |
| `appt-form-style-change.png` | Submit button ze zmienionym tłem (#e53e3e) |
| `appt-form-frontend-initial.png` | Frontend — empty state bez wybranego slotu, przycisk disabled |
| `appt-form-frontend-slot-selected.png` | Frontend — slot wybrany, summary zaktualizowany, przycisk enabled |
| `appt-form-frontend-error.png` | Frontend — error "Invalid payload" po nieudanej submisji |
| `appt-form-frontend-final.png` | Frontend — stan końcowy po testach |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*

---

## Status po TASK-258, TASK-294, TASK-295, i TASK-301 (2026-05-19)

### Closure matrix

| ID | Status | Owner | Evidence |
|---|---|---|---|
| BUG-01 | Fixed | `TASK-258-01` | SSR/admin markup now starts disabled and runtime keeps the same no-slot contract; covered by `tests/vitest/widgets/appointmentForm.test.tsx` and `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`. |
| BUG-02 | Fixed | `TASK-258-01` | Runtime clears stale API errors on first input/change; covered by `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`. |
| UX-01 | Fixed | `TASK-258-02` | Phone/notes controls are gated by their visibility toggles in the Visual editor; covered by `tests/vitest/ui/appointment-form-editor-wave.test.tsx`. |
| UX-02 | Fixed | `TASK-294` | Appointment Form now receives same-surface Booking Calendar flow summaries through shared `WidgetEditorContext.bookingFlows` and shows truthful pairing feedback in the editor. |
| UX-03 | Fixed | `TASK-258-02` | `noSelectionMessage` moved into Visual/slot-summary ownership; covered by `tests/vitest/ui/appointment-form-editor-wave.test.tsx`. |
| UX-04 | Deferred | `TASK-256-02` | Shared configured-vs-default style state remains owned by the clearable control contract, not a widget-local workaround. |
| UX-05 | Fixed | `TASK-258-05` | Resolved nonce is now read-only diagnostic copy in Advanced; covered by `tests/vitest/ui/appointment-form-editor-wave.test.tsx`. |
| UX-06 | Fixed | `TASK-258-05` | Runtime error is now read-only diagnostic copy with context in Advanced; covered by `tests/vitest/ui/appointment-form-editor-wave.test.tsx`. |
| UX-07 | Fixed | `TASK-258-01` | Runtime clears error state on first user interaction after failure; covered by `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`. |
| BF-01 | Fixed | `TASK-258-05` | Appointment Form now exposes `default`, `compact`, `inline`, `sidebar`, and `card-summary` variants; render/registry covered by `tests/vitest/widgets/appointmentForm.test.tsx`. |
| BF-02 | Fixed | `TASK-258-02` | Email required behavior is now configurable instead of hard-coded optional; covered by widget/editor tests. |
| BF-03 | Fixed | `TASK-258-05` | `style.submitTextColor` is schema-owned and clearable; covered by widget/editor tests. |
| BF-04 | Fixed | `TASK-258-02` | Split-name mode is now part of the widget contract and runtime payload composition; covered by widget/runtime/editor tests. |
| BF-05 | Fixed | `TASK-295` | Appointment Form now owns bounded custom-field authoring, runtime rendering, and `metadata.customFields` serialization on top of the existing booking boundary. |
| BF-06 | Fixed | `TASK-258-03` | Slot summary can include service/resource context; covered by runtime and editor tests. |
| BF-07 | Fixed | `TASK-258-04` | Consent checkbox with required flag and privacy/terms links is landed; covered by widget/editor/runtime tests. |
| BF-08 | Fixed | `TASK-258-04` | Backend-owned CAPTCHA bridge is hydrated and executed from public site key/action only; covered by runtime hydration, route-boundary, and runtime DOM tests. |
| BF-09 | Fixed | `TASK-258-01` | Loading copy is configurable and rendered during submission; covered by runtime DOM tests. |
| BF-10 | Fixed | `TASK-258-02` | Phone pattern/help text are schema-owned and rendered; covered by widget/editor tests. |
| BF-11 | Fixed | `TASK-258-02` | Notes `maxLength` and visible counter are landed; covered by widget/runtime/editor tests. |
| BF-12 | Fixed | `TASK-258-03` | Safe same-origin/relative redirect is implemented; covered by runtime DOM tests. |
| BF-13 | Fixed | `TASK-258-01` | Successful submission clears shared booking selection state; covered by runtime DOM tests. |
| BF-14 | Fixed | `TASK-258-02` | `showEmail` is part of the widget contract and editor gating; covered by widget/editor tests. |
| BF-15 | Fixed | `TASK-258-03` | Locale override is part of the widget contract and runtime formatting path; covered by runtime/editor tests. |
| BF-16 | Fixed | `TASK-258-05` | Submission nonce is no longer author-editable; covered by editor tests. |
| BF-17 | Fixed | `TASK-258-02` | Form fields now render browser autocomplete hints; covered by widget tests. |
| BF-18 | Fixed | `TASK-258-02` | Form now renders accessible name/description metadata; covered by widget tests. |
| A1 | Fixed | `TASK-258-02` | Autocomplete hints are now rendered on form fields. |
| A2 | Fixed | `TASK-258-02` | Form has accessible name/description metadata. |
| A3 | Fixed | `TASK-258-02` | Required email/phone behavior is now configurable and normalized safely. |
| A4 | Fixed | `TASK-258-02` | Tel input now uses schema-owned format validation. |
| A5 | Fixed | `TASK-258-02` | Notes input now has bounded length and a visible counter. |
| A6 | Fixed | `TASK-258-05` | Submit text color is no longer hardcoded. |

### Validation used for closure

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd store lint`
- `./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/validation/bookingSchemas.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/runtime/appointment-form-runtime-hydration.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/server/publicBookingApi.test.ts`
  DB-backed reservation cases remain skipped by the suite connectivity probe.
- `bun run gates:coderso`
- `bun run scan:security:strict`
  Trivy and both Gitleaks scans passed; strict still reports environment blockers
  in this worktree for `semgrep` trust anchors and `bun audit` connectivity.

### Shared-task routing confirmed

- `UX-04` -> `TASK-256-02`
- shared public runtime nonce-cache freshness -> `TASK-301` (landed)
