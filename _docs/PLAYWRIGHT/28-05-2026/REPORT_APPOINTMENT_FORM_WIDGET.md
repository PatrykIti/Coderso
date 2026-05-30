# RAPORT: Appointment Form Widget — audyt stanu bieżącego (Admin UI + Front)

> **Status:** Zakończony (audyt domykający luki pokrycia)
> **Data:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-appointment-form-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/f22436b5-24db-4536-9dda-07c0ae9cfcdb` ("Contract Test - appointment-form")
> **Fixture public:** http://localhost:3000/test-appointment-form-0516
> **Pliki źródłowe:**
> - `core/widgets/core/appointmentForm.tsx` — renderer, typy, normalizacja, schema, kontrakt edytora
> - `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` — edytory Wizard / Visual / Advanced
> - `core/admin/ui/widgets/editors/LinkDestinationField.tsx` — picker stron (After submit / Privacy / Terms)
> - `core/admin/ui/widgets/editors/SharedColorControl.tsx` — kontrolki kolorów Surface
> - `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` + `core/admin/ui/shared/InfoTip.tsx` — wiersze read-only i info-tipy w Advanced
>
> Uwaga: nazwy plików PNG w tym raporcie (np. `appointment-form-public-0529-gap.png`) są
> wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki nie są wymaganym
> evidence w repo i nie są wersjonowane.

> **Co zmienił ten audyt względem poprzedniej wersji raportu:**
> 1. **Domknięto pokrycie** — w poprzedniej wersji wiele rodzin kontrolek było tylko częściowo
>    przećwiczonych (cała sekcja Slot summary, większość etykiet/placeholderów pól, 5 z 6
>    kolorów Surface, 5 z 6 typów pól niestandardowych, After-submit destination, Terms page,
>    Description, Submit/Loading/Success copy). Tym razem **każda dyskretna kontrolka** została
>    klikniięta i zweryfikowana na żywo w DOM podglądu.
> 2. **Korekta merytoryczna (Advanced)** — poprzedni raport twierdził, że help-texty w Advanced
>    są „widoczne na stałe", a info-buttony są „nadmiarowe". To jest **nieprawda**: help-text jest
>    renderowany jako element `sr-only` (tylko dla czytników ekranu) + tooltip InfoTip
>    (hover/focus). Info-button jest jedyną wizualną drogą do tej treści. Sekcja 4.2 i U2 zostały
>    poprawione.
>
> **Aktualizacja TASK-343-02 (2026-05-30):** jedyny funkcjonalny błąd z tego
> raportu, preset Phone validation „No extra validation", został zamknięty.
> Jawne `phonePattern: ""` i `phonePatternMessage: ""` przeżywają
> normalizację, edytor utrzymuje preset `not-required`, a runtime pomija
> `pattern`, `title` i help text dla telefonu.

---

## 1. Przegląd widgetu

**Typ:** `appointment-form` · **Kategoria:** Forms
**Warianty:** `default`, `compact`, `inline`, `sidebar`, `card-summary`
**Przeznaczenie:** Formularz danych klienta powiązany z wybranym slotem z widgetu Booking Calendar. Przesył idzie POST-em na server-owned route `/api/booking/reservations`, a przycisk wysyłki jest aktywowany dopiero po wybraniu slotu (runtime script `getBookingRuntimeClientScript`).

**Model trybów edytora (potwierdzony w UI):**
- Panel prawy pokazuje **dwie zakładki**: `Visual` i `Advanced`.
- **Wizard** nie jest zakładką — to osobny ekran „setup" uruchamiany przyciskiem **„Run setup again"** (a po pierwszym dodaniu widgetu uruchamia się automatycznie). Powrót z Wizarda następuje przyciskiem **„Finish setup and open Visual"**.
- Nagłówek panelu w Wizard pokazuje label „Wizard", w trybie standardowym „Selected widget" + notkę „Setup complete. Daily edits live in Visual. Advanced is for technical diagnostics."

**Metoda audytu:** wszystkie interakcje wykonano na żywo w przeglądarce (Playwright). Każdą zmianę weryfikowano przez bezpośredni odczyt DOM podglądu admina (`form[data-nextless-appointment-form]`) oraz analogicznie na froncie. **Żadna zmiana nie była zapisywana ani publikowana** — testowano wyłącznie reaktywność podglądu i spójność kontraktu. Front pokazuje stan zapisany (`default`).

---

## 2. Pełna macierz kontrolek (co przećwiczono)

Pełna lista dyskretnych kontrolek edytora Visual (zgodna z `appointmentFormEditorContract`), z wynikiem. **Wszystkie poniższe zostały kliknięte/wypełnione i zweryfikowane w DOM podglądu.**

### Sekcja „Variant and flow behavior"
| Kontrolka | Akcja testowa | Efekt w podglądzie | Wynik |
|-----------|---------------|--------------------|-------|
| Variant | przełączono **wszystkie 5**: default/compact/inline/sidebar/card-summary | klasa root `<section>` zmienia się zgodnie z `resolveVariantClasses` | ✓ |
| Booking flow | (read-only summary) | „Default booking flow" | ✓ (informacyjne) |
| Form language | Polish + German (`de-DE`) | `data-locale="de-DE"` | ✓ |
| After submit destination | picker → „HomePage", potem „Clear destination" | `data-success-redirect="/homepage"` → po Clear `""` | ✓ |

### Sekcja „Copy"
| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| Title | `<h3>` w podglądzie | ✓ |
| Description | `<p>` pod nagłówkiem | ✓ |
| Submit button | tekst przycisku + `data-idle-label` | ✓ |
| Loading message | `data-loading-message` na `<form>` | ✓ |
| Success message | `data-success-message` na `<form>` | ✓ |

### Sekcja „Slot summary" (cała sekcja — wcześniej nieprzetestowana)
| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| Summary label | nagłówek bloku slotu | ✓ |
| Empty summary message | tekst empty-state + atrybut `data-empty` | ✓ |
| No selection error | `data-no-selection` na ukrytym `[data-booking-form-error]` | ✓ |
| Include service in summary (toggle) | `data-show-service-in-summary` → `false` | ✓ |
| Include resource in summary (toggle) | `data-show-resource-in-summary` → `false` | ✓ |

### Sekcja „Fields"
| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| Name mode → split | dwa pola `customerFirstName` + `customerLastName`, pole `customerName` znika | ✓ |
| First/Last name label + placeholder (split) | etykiety + placeholdery; `autocomplete` = given-name / family-name | ✓ |
| Name label + placeholder (full) | etykieta + placeholder pola `customerName` | ✓ |
| Show email field (toggle) | off → pole `customerEmail` znika; on → wraca | ✓ |
| Require email field | `required=true` na `customerEmail` | ✓ |
| Email label + placeholder | aktualizują pole email | ✓ |
| Show phone field (toggle) | off → `customerPhone` znika; on → wraca | ✓ |
| Require phone field | `required=true` na `customerPhone` | ✓ |
| Phone label + placeholder | aktualizują pole telefonu | ✓ |
| Phone validation → „Digits and spaces" | `pattern="^[0-9\s]{7,20}$"`, `title`/help = „Use 7-20 digits and spaces." | ✓ |
| Phone validation → „No extra validation" | czyści pattern/title/help, a select pozostaje na `not-required` | ✓ po TASK-343-02 |
| Phone help text | aktualizuje `title` inputu telefonu **oraz** help `<p>` pod nim | ✓ |
| Show notes field (toggle) | off → `notes` znika; on → wraca | ✓ |
| Notes label + placeholder | aktualizują textarea | ✓ |
| Notes max length | 300 → `maxlength=300` + licznik „0 / 300 characters"; **clamp**: 5000→2000, 10→50 | ✓ |

### Sekcja „Custom fields"
| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| Add custom field | dodaje pole (domyślnie typ `text`) | ✓ |
| Field label | etykieta + `data-appointment-custom-field-label` | ✓ |
| Field type → **text** | `<input type=text name="customField:custom-field-1">` | ✓ |
| Field type → **email** | `<input type=email autocomplete=email>` | ✓ |
| Field type → **phone** | `<input type=tel autocomplete=tel>` | ✓ |
| Field type → **textarea** | `<textarea>` | ✓ |
| Field type → **checkbox** | `<input type=checkbox>`; w edytorze **pole Placeholder znika**; w podglądzie span „Select if applicable" | ✓ |
| Field type → **select** | `<select>`; pojawia się pole „Options"; placeholder = pierwsza opcja disabled (prompt) | ✓ |
| Required field (toggle) | `required=true` na renderowanym polu | ✓ |
| Placeholder | placeholder pola (dla select → tekst prompt-opcji) | ✓ |
| Options (textarea) | linie → `<option>` w podglądzie | ✓ |
| Remove | usuwa pole z podglądu; edytor wraca do „No custom fields configured yet." | ✓ |

### Sekcja „Consent and protection"
| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| Show consent checkbox | odsłania consent + `input[name=consentAccepted]` w podglądzie | ✓ |
| Consent label | tekst etykiety + `data-booking-consent-label` | ✓ |
| Require consent (toggle) | `required=true` na consent checkbox (zob. U1 o stanie domyślnym) | ✓ |
| Privacy page (picker) | link „Privacy policy" `href="/homepage"` | ✓ |
| Terms page (picker) | link „Terms" `href="/homepage"`, `target=_blank`, `rel=noreferrer` | ✓ |
| Privacy + Terms równocześnie | **oba linki renderują się obok siebie** | ✓ |

### Sekcja „Surface" (wszystkie 6 kolorów — wcześniej tylko Frame background)
| Kontrolka | Wartość testowa | Efekt | Wynik |
|-----------|-----------------|-------|-------|
| Frame background | `#ff0000` (poprz.) | `section.style.backgroundColor` | ✓ |
| Frame border | `#112233` | `section.style.borderColor` = rgb(17,34,51) | ✓ |
| Summary background | `#445566` | summary `backgroundColor` = rgb(68,85,102) | ✓ |
| Summary border | `#778899` | summary `borderColor` = rgb(119,136,153) | ✓ |
| Submit background | `#aabb00` | przycisk `backgroundColor` = rgb(170,187,0) | ✓ |
| Submit text color | `#0c0c0c` | przycisk `color` = rgb(12,12,12) | ✓ |
| Etykieta stanu | po ustawieniu | „Selected color" + **aktywny** „Clear"; nieruszone → „Theme default" + **disabled** „Clear" | ✓ |
| Clear (Summary background) | kliknięto | inline-style czyszczony do pustego (theme default) | ✓ |

**Wniosek z macierzy:** **wszystkie dyskretne kontrolki edytora Visual zostały przećwiczone.** Po TASK-343-02 nie zostaje trwała usterka funkcjonalna w tej macierzy; kontrolki aktualizują podgląd na żywo i utrzymują stan w sesji UI.

---

## 3. Co działa (potwierdzone)

### 3.1 Wizard
- **Sekcja Flow** renderuje się poprawnie. Select „Booking calendar" zawiera **jedyną opcję** `Default booking flow` (brak Booking Calendar na tej powierzchni).
- **Pairing feedback** raportuje stan `data-appointment-flow-feedback="missing"` z komunikatem: „No Booking Calendar is available on this surface yet. Add a calendar here, then choose it from the setup picker." — zgodne z `FlowPairingNotice`.
- **„Finish setup and open Visual"** działa — przełącza panel z powrotem na zakładkę `Visual` (po kliknięciu zakładka Visual = selected).

### 3.2 Visual
- Wszystkie kontrolki z macierzy sekcji 2 aktualizują podgląd na żywo (DOM zweryfikowany po każdej akcji).
- **Reaktywność dwukierunkowa** potwierdzona dla toggli Show email / Show phone / Show notes (off → pole znika, on → wraca).
- **Trwałość w sesji UI**: edycje utrzymują się po przełączaniu Visual ↔ Advanced ↔ Wizard (testowano m.in. Title, custom field, consent).

### 3.3 Advanced — read-only zgodnie z kontraktem
- Dwie sekcje diagnostyczne: **„Runtime route"** (Reservation submit route = „Default reservation route"; Booking flow = „Default booking flow") oraz **„Submission security"** (Submission nonce = „Not injected in editor"; Captcha = „Not configured"; Runtime error = „No runtime warning").
- W zakresie sekcji Advanced: **0 kontrolek edytowalnych** (zero input/select/textarea/contenteditable) — w pełni diagnostyczny, zgodny z `writablePaths: []`.
- **Mechanizm help-text (poprawione względem poprzedniej wersji):** każdy z 4 wierszy z pomocą ma help renderowany w **dwóch** miejscach: (a) jako element `sr-only` (tylko dla czytników ekranu, podpięty przez `aria-describedby`), (b) jako tooltip komponentu `InfoTip` (przycisk „… info", Radix Tooltip otwierany na hover/focus). **Help NIE jest widoczny statycznie** — info-button jest jedyną wizualną drogą do tej treści. Liczba info-buttonów = 4 (Reservation submit route / Submission nonce / Captcha / Runtime error; wiersz „Booking flow" nie ma helpa).

### 3.4 Front (localhost:3000/test-appointment-form-0516)
- Trasa zwraca **HTTP 200** (~1.2 s, curl; rozmiar ~42 kB). Formularz **widoczny** (`offsetHeight > 0`, `display != none`).
- Kontrakt formularza poprawny:
  - `action="/api/booking/reservations"`, `method="post"`, `aria-label="Appointment details"`.
  - `data-flow-id="booking-flow"`, `data-submission-endpoint="/api/booking/reservations"`, `data-success-message`, `data-loading-message`.
  - Pola: `customerName` (autocomplete=name), `customerEmail` (type=email, autocomplete=email), `customerPhone` (type=tel, autocomplete=tel), `notes` (textarea).
  - Dwa ukryte pola nonce: `formNonce` i `__nl_booking_nonce` — **oba 78 znaków i identyczne** (server-injected; w edytorze „Not injected" — różnica zgodna z projektem).
- **Slot summary:** „Select a slot in Booking Calendar first." (poprawny empty-state).
- **Live licznik notatek:** wpisanie 19 znaków → „19 / 500 characters" (client runtime działa).
- **Przycisk submit:** `disabled` (poprawne — brak wybranego slotu na tej powierzchni).
- **Mobile 375px:** brak poziomego overflow (`scrollWidth == innerWidth == 375`).
- **Konsola:** 0 błędów, 0 ostrzeżeń.

---

## 4. Znaleziska i status po remediacji

### 4.1 ZAMKNIĘTE — preset „No extra validation" (Phone validation)
- **Stan historyczny:** wybór opcji „No extra validation" nie czyścił walidacji telefonu. Select natychmiast wracał do „Default international", a podgląd zachowywał `pattern="^\+?[0-9()\-.\s]{7,20}$"`.
- **Przyczyna:** preset `not-required` ustawiał `phonePattern: ""` i `phonePatternMessage: ""`, ale `normalizeAppointmentFormData` przepuszczał je przez `text(value, fallback)`, który dla pustego stringa zwracał fallback.
- **Remediacja TASK-343-02:** jawny pusty pattern/message przeżywa normalizację. Edytor utrzymuje preset `not-required`, a runtime dla telefonu nie renderuje `pattern`, pustego `title` ani validation help textu.
- **Regresje:** pokryte w `tests/vitest/widgets/appointmentForm.test.tsx` i `tests/vitest/ui/appointment-form-editor-wave.test.tsx`; strict smoke `task-343-02-appointment-form-final` przeszedł z `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, `metadataGaps=0`.

### 4.2 (Skreślone — była to błędna obserwacja w poprzedniej wersji)
- Poprzedni raport zgłaszał, że info-buttony w Advanced są nadmiarowe, bo help-text jest „widoczny na stałe". **To było nieprawdą** — help jest `sr-only` + tooltip InfoTip (zob. 3.3). Nie ma tu defektu funkcjonalnego; jest co najwyżej niuans UX (zob. U2).

### 4.3 Brak możliwości realnego ukończenia wysyłki na froncie (ograniczenie fixture, nie defekt)
- Na tej powierzchni nie ma Booking Calendar, więc slot nie zostaje wybrany i submit jest trwale `disabled`. Pełna ścieżka rezerwacji jest niemożliwa do przejścia tym fixture — to ograniczenie środowiska testowego, nie błąd widgetu.

---

## 5. Czego NIE udało się przetestować (i dlaczego)

- **Pełnej ścieżki rezerwacji (wybór slotu → aktywny submit → POST `/api/booking/reservations`)** — fixture nie zawiera widgetu Booking Calendar, więc slot nie może być wybrany, a submit pozostaje trwale `disabled`. Ograniczenie fixture, nie błąd widgetu.
- **Wariantów `compact` / `inline` / `sidebar` / `card-summary` na FRONCIE** — front renderuje zapisany wariant (`default`). **Wszystkie 5 wariantów zweryfikowano jednak w podglądzie admina** (zmiana klasy root) — patrz sekcja 2.
- **Captcha / runtime nonce error path** — na fixture brak skonfigurowanej captchy i błędów runtime (diagnostyka pokazuje „Not configured" / „No runtime warning"). Ścieżka błędu runtime (`resolved.error` → żółty baner ostrzegawczy) nie jest osiągalna bez danych z backendu.
- **Preset Phone validation „Saved custom validation"** — opcja „custom" pojawia się tylko, gdy zapisany `phonePattern` jest niestandardowy. Fixture ma pattern domyślny, więc tej opcji nie da się wywołać z UI.
- **Live tooltip InfoTip (Advanced)** — reveal treści po hover/focus to Radix Tooltip; nie udało się go wyzwolić programatycznie przez harness automatyzacji (timing hover/focus). Mechanizm potwierdzono jednak przez kod + DOM (element `sr-only` z treścią + `TooltipTrigger`).

---

## 6. Niuanse UX/UI (do rozważenia, nie błędy krytyczne)

- **U1 — „Require consent" gubi domyślny zamiar:** kod ma `consent.required: true` w defaultach, ale po włączeniu „Show consent checkbox" przełącznik „Require consent" pokazuje się **wyłączony** (potwierdzono: `aria-checked="false"`, a consent checkbox w podglądzie `required=false`). Wynika to z normalizacji bramkującej `required = enabled && required` — gdy consent był wyłączony, `required` znormalizowano do `false`, a ponowne włączenie nie przywraca `true`. Po ręcznym kliknięciu toggle działa poprawnie (`required=true`).
- **U2 — info-buttony w Advanced jako jedyne źródło helpa:** treść pomocy każdej pozycji diagnostycznej jest dostępna **wyłącznie** przez tooltip InfoTip (hover/focus) oraz w `sr-only` dla czytników ekranu. Dla użytkownika widzącego oznacza to, że bez najechania na „i" nie widzi opisu pola. To świadomy wybór (czysty, diagnostyczny panel), ale warto rozważyć, czy w trybie diagnostycznym help nie powinien być bardziej odkrywalny.
- **U3 — Wizard jest bardzo ubogi:** jedyna kontrolka to wybór Booking Calendar. Na powierzchni bez kalendarza Wizard nie ma czego konfigurować (jedyna opcja w select to „Default booking flow"). Onboarding sprowadza się do komunikatu „dodaj kalendarz".
- **U4 — Sekcja Surface bez pola tekstowego wartości:** kolory ustawia się wyłącznie przez swatch (color picker), bez możliwości wpisania hexa/zmiennej CSS ręcznie (`showValueInput=false`). Swatch dla wartości domyślnych pokazuje fallback (#ffffff, #d4d4d8 itd.) z podpisem „Theme default"; po ustawieniu pojawia się „Selected color" i aktywny „Clear" — zachowanie spójne dla wszystkich 6 kontrolek.
- **U5 — Zmiana presetu Phone validation nadpisuje ręczny help text:** wpisany ręcznie „Phone help text" jest zastępowany komunikatem presetu przy zmianie „Phone validation" (preset ustawia `phonePatternMessage`). Edytując oba, należy najpierw wybrać preset, potem dopisać help.
- **U6 — Mylący „Visibility summary" w chrome bloku:** współdzielony blok chrome (nie część edytora widgetu) potrafi pokazać „Hidden on all devices", podczas gdy przełączniki Device visibility są wyłączone (blok widoczny), a formularz na froncie **się renderuje**. To etykieta współdzielonego bloku, nie kontrolka widgetu — warto zweryfikować w osobnym audycie chrome bloku.
- **U7 — Wizard vs Visual jako tryb, nie zakładka:** komunikacja trybów jest jasna („Daily edits live in Visual. Advanced is for technical diagnostics."), ale fakt, że Wizard to przycisk „Run setup again", a nie zakładka, może być nieoczywisty dla nowego użytkownika.

---

## 7. Admin Preview vs Front — porównanie

| Aspekt | Admin Preview | Front | Zgodność |
|--------|---------------|-------|----------|
| Renderowanie wariantu `default` | ✓ | ✓ | OK |
| Wszystkie 5 wariantów (klasa root) | ✓ (zweryfikowane) | tylko `default` (stan zapisany) | OK (oczekiwane) |
| `action`/`method` formularza | `/api/booking/reservations` / POST | identyczne | OK |
| `name` + `autocomplete` na polach | ✓ | ✓ | OK |
| Slot summary empty-state | ✓ | ✓ | OK |
| Submission nonce | „Not injected in editor" | **wstrzyknięty, 78 znaków, oba pola identyczne** | OK (różnica zgodna z projektem) |
| Live licznik notatek | ✓ | ✓ | OK |
| Submit `disabled` (brak slotu) | ✓ | ✓ | OK |
| Edycje Visual (Copy, Slot summary, Fields, Custom fields, Consent, Surface) | aktualizują podgląd na żywo | **nie odzwierciedlone** — bo nie zapisano/opublikowano | oczekiwane |

**Wniosek:** Admin Preview i Front renderują identyczny kontrakt dla zapisanego (domyślnego) stanu. Front dodatkowo wstrzykuje realny nonce (2× 78 znaków) i uruchamia client runtime (licznik). Edycje testowe nie były publikowane, więc front pokazuje stan bazowy — zgodnie z oczekiwaniem.

---

## 8. Podsumowanie

- **Wizard:** działa, ale minimalny; na fixture bez Booking Calendar nie ma czego konfigurować (poprawny feedback „missing", działający powrót do Visual).
- **Visual:** w pełni funkcjonalny — **każda dyskretna kontrolka (macierz w sekcji 2) aktualizuje podgląd na żywo i utrzymuje się w sesji UI.** Preset telefonu „No extra validation" jest zamknięty w TASK-343-02.
- **Advanced:** poprawnie read-only (0 pól edytowalnych), diagnostyka zgodna z kontraktem; help dostarczany przez `sr-only` + tooltip InfoTip (nie statycznie — korekta wobec poprzedniej wersji).
- **Front:** poprawny kontrakt, server-injected nonce (2× 78 znaków, identyczne), działający runtime (licznik notatek), submit świadomie zablokowany do czasu wyboru slotu, brak overflow na 375px, czysta konsola, HTTP 200.

**Dawny jedyny funkcjonalny błąd:** preset „No extra validation" dla walidacji telefonu (sekcja 4.1) — zamknięty w TASK-343-02 przez zachowanie jawnego pustego patternu i pominięcie walidacyjnych atrybutów runtime.

**Reszta przećwiczonego zakresu (a przećwiczono pełną macierz kontrolek) działa zgodnie z oczekiwaniami.** Nie zaobserwowano błędów konsoli ani rozbieżności Admin/Front w zapisanym stanie.

---

## 9. Załączniki (lokalne etykiety)

| Plik (lokalny) | Opis |
|----------------|------|
| `appointment-form-public-0529-gap.png` | Zrzut formularza na froncie (`/test-appointment-form-0516`) — wariant default, stan bazowy |

> Powyższy plik PNG jest wyłącznie lokalną etykietą przechwycenia Playwright; nie stanowi wymaganego evidence i nie jest wersjonowany w repo.
