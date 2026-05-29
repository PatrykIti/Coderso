# RAPORT: Appointment Form Widget — audyt stanu bieżącego (Admin UI + Front)

> **Status:** Zakończony
> **Data:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-appointment-form` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/f22436b5-24db-4536-9dda-07c0ae9cfcdb` ("Contract Test - appointment-form")
> **Fixture public:** http://localhost:3000/test-appointment-form-0516
> **Pliki źródłowe:**
> - `core/widgets/core/appointmentForm.tsx` — renderer, typy, normalizacja, schema
> - `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` — edytory Wizard / Visual / Advanced
>
> Uwaga: nazwy plików PNG w tym raporcie (np. `appointment-form-public-0529.png`) są
> wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki nie są wymaganym
> evidence w repo i nie są wersjonowane.

---

## 1. Przegląd widgetu

**Typ:** `appointment-form` · **Kategoria:** Forms
**Warianty:** `default`, `compact`, `inline`, `sidebar`, `card-summary`
**Przeznaczenie:** Formularz danych klienta powiązany z wybranym slotem z widgetu Booking Calendar. Przesył idzie POST-em na server-owned route `/api/booking/reservations`, a przycisk wysyłki jest aktywowany dopiero po wybraniu slotu (runtime script `getBookingRuntimeClientScript`).

**Model trybów edytora (potwierdzony w UI):**
- Panel prawy pokazuje **dwie zakładki**: `Visual` i `Advanced`.
- **Wizard** nie jest zakładką — to osobny ekran „setup" uruchamiany przyciskiem **„Run setup again"** (a po pierwszym dodaniu widgetu uruchamia się automatycznie). Powrót z Wizarda następuje przyciskiem **„Finish setup and open Visual"**.
- Nagłówek panelu w Wizard pokazuje label „Wizard", w trybie standardowym „Selected widget" + notkę „Setup complete. Daily edits live in Visual. Advanced is for technical diagnostics."

---

## 2. Co zostało faktycznie przetestowane

Wszystkie interakcje wykonane były na żywo w przeglądarce (Playwright), z weryfikacją DOM podglądu admina oraz frontu. Zmiany w edytorze **nie były zapisywane/publikowane** — testowano reaktywność podglądu i trwałość w sesji UI, bez modyfikacji zapisanego stanu fixture.

| Tryb | Zakres przetestowany |
|------|----------------------|
| Wizard | Sekcja Flow (Booking calendar select), komunikat pairing-feedback, przycisk „Finish setup and open Visual" |
| Visual | Title; Variant; Name mode (full/split); Show/Require email; Show/Require phone; Phone validation (3 presety); Show notes; Notes max length; Form language (locale); Custom field (dodanie + zmiana typu na Select + opcje); Consent (enable + require + Privacy page picker); Surface (Frame background + Clear); trwałość po przełączeniu zakładek |
| Advanced | Sekcje Runtime route i Submission security (read-only), liczba pól edytowalnych, info-buttony |
| Front | Kontrakt formularza (action/method/aria/nonce/pola), widoczność, slot summary, live licznik notatek, stan przycisku submit, overflow mobile 375px, konsola |

**Czego NIE przetestowano (i dlaczego):**
- **Pełnej ścieżki rezerwacji (wybór slotu → aktywny submit → POST)** — fixture nie zawiera widgetu Booking Calendar, więc slot nie może być wybrany, a przycisk submit pozostaje trwale `disabled`. To ograniczenie fixture, nie błąd widgetu.
- **Realnego POST na `/api/booking/reservations`** — z powodu jw. nie udało się wywołać wysyłki przez UI.
- **Wariantów `compact` / `inline` / `sidebar` na froncie** — na froncie zweryfikowano wariant zapisany (`default`); pozostałe warianty sprawdzono tylko w podglądzie admina (zmiana klasy root).
- **Captcha / runtime nonce error path** — na fixture brak skonfigurowanej captchy i błędów runtime (diagnostyka pokazuje „Not configured" / „No runtime warning").
- **Picker Terms page oraz After submit destination** — zweryfikowano analogiczny picker Privacy page; pozostałe dwa to ten sam komponent `LinkDestinationField` (nie testowane osobno).

---

## 3. Co działa (potwierdzone)

### 3.1 Wizard
- **Sekcja Flow** renderuje się poprawnie. Select „Booking calendar" zawiera jedyną opcję `Default booking flow` (brak Booking Calendar na tej powierzchni).
- **Pairing feedback** poprawnie raportuje stan `missing` z komunikatem: „No Booking Calendar is available on this surface yet. Add a calendar here, then choose it from the setup picker." — zgodne z logiką `FlowPairingNotice`.
- **„Finish setup and open Visual"** działa — przełącza panel z powrotem na zakładkę `Visual`.

### 3.2 Visual — wszystkie testowane kontrolki aktualizują podgląd na żywo
- **Title (Copy):** wpisanie „Umów wizytę testową" natychmiast zmieniło nagłówek `<h3>` w podglądzie.
- **Variant:** zmiana na `card-summary` zmienia klasę root sekcji (`rounded-xl border p-5` → `rounded-2xl border p-6 shadow-sm`); powrót na `default` przywraca klasę.
- **Name mode → split:** podgląd przełącza się z pojedynczego pola `customerName` na dwa pola `customerFirstName` + `customerLastName` (placeholdery „Jamie" / „Doe", `autocomplete` given-name/family-name).
- **Require email / Require phone:** ustawiają `required=true` na odpowiednich inputach podglądu.
- **Show notes (off):** pole notatek znika z podglądu; (on) — wraca.
- **Phone validation → „Digits and spaces":** podgląd otrzymuje `pattern="^[0-9\s]{7,20}$"`, select utrzymuje wybór. Powrót na „Default international" działa.
- **Form language → Polish:** ustawia `data-locale="pl-PL"` na formularzu.
- **Notes max length → 250:** aktualizuje `maxlength` textarea oraz tekst licznika („0 / 250 characters").
- **Custom fields:** „Add custom field" dodaje pole; zmiana typu na **Select** odsłania pole „Options"; wpisane opcje (Konsultacja/Zabieg/Kontrola) renderują się w podglądzie jako `<select name="customField:custom-field-1">` z poprawnym labelem i opcjami.
- **Consent:** włączenie „Show consent checkbox" odsłania Consent label, Require consent, Privacy/Terms page pickery; w podglądzie pojawia się `input[name=consentAccepted]`. „Require consent" ustawia `required=true`. Picker **Privacy page → HomePage** ustawia link „Privacy policy" z `href="/homepage"`.
- **Surface (kolory):** ustawienie „Frame background" na `#ff0000` zmienia `style.backgroundColor` sekcji podglądu na `rgb(255,0,0)` i **aktywuje** przycisk „Clear"; kliknięcie „Clear" przywraca theme default (pusty inline-style) i ponownie **dezaktywuje** „Clear". 6 kontrolek koloru ma spójne zachowanie (swatch + Clear, bez pola tekstowego — `showValueInput=false`).
- **Trwałość w sesji UI:** po przełączeniu Visual → Advanced → Visual zachowane zostały Title, custom field „Typ usługi" oraz checkbox consent.

### 3.3 Advanced — read-only zgodnie z kontraktem
- Sekcje **„Runtime route"** (Reservation submit route = „Default reservation route"; Booking flow = „Default booking flow") oraz **„Submission security"** (Submission nonce = „Not injected in editor"; Captcha = „Not configured"; Runtime error = „No runtime warning").
- Panel Advanced ma **0 pól edytowalnych** (zero input/select/textarea/contenteditable) — w pełni diagnostyczny, zgodny z `writablePaths: []` w kontrakcie.
- Help-texty pod każdą pozycją widoczne na stałe.

### 3.4 Front (localhost:3000/test-appointment-form-0516)
- Trasa zwraca **HTTP 200** (~0.57 s, curl). Formularz jest **widoczny** (`display: block`, `offsetHeight > 0`).
- Kontrakt formularza poprawny:
  - `action="/api/booking/reservations"`, `method="post"`, `aria-label="Appointment details"`.
  - `data-flow-id="booking-flow"`, `data-submission-endpoint`, `data-success-message`, `data-loading-message`.
  - Pola z atrybutami `name` ORAZ `autocomplete`: `customerName` (name), `customerEmail` (email), `customerPhone` (tel), `notes`.
  - Dwa ukryte pola nonce: `formNonce` i `__nl_booking_nonce` — **nonce server-injected, 78 znaków** (na froncie wstrzyknięty; w edytorze „Not injected" — różnica zgodna z projektem).
- **Slot summary:** „Select a slot in Booking Calendar first." (poprawny empty-state).
- **Live licznik notatek:** wpisanie 15 znaków → licznik „15 / 500 characters" (client runtime działa).
- **Przycisk submit:** `disabled` (poprawne — brak wybranego slotu na tej powierzchni).
- **Mobile 375px:** brak poziomego overflow (`scrollWidth == innerWidth`).
- **Konsola:** 0 błędów, 0 ostrzeżeń.

---

## 4. Co nie działa / błędy

### 4.1 BŁĄD — preset „No extra validation" (Phone validation) nie działa
- **Objaw:** wybór opcji „No extra validation" nie czyści walidacji telefonu. Select natychmiast wraca do „Default international", a podgląd zachowuje `pattern="^\+?[0-9()\-.\s]{7,20}$"`.
- **Przyczyna (analiza kodu):** preset `not-required` ustawia `phonePattern: ""` i `phonePatternMessage: ""`. W `normalizeAppointmentFormData` pole przechodzi przez helper `text(value, fallback)`, który dla pustego stringa **zwraca fallback** (domyślny pattern). W efekcie pusty pattern jest natychmiast nadpisywany wartością domyślną, a `resolvePhoneValidationPreset` ponownie mapuje to na „default".
- **Zakres:** dotyczy zarówno wzorca, jak i komunikatu — żadnego z nich nie da się wyczyścić do pustego. Pozostałe dwa presety (`default`, `digits-spaces`) z niepustym patternem działają poprawnie.
- **Skutek dla użytkownika:** opcja „No extra validation" jest **mylna** — sugeruje wyłączenie walidacji, którego nie da się osiągnąć z poziomu edytora.

### 4.2 Brak możliwości realnego ukończenia wysyłki na froncie (ograniczenie fixture, nie defekt)
- Na tej powierzchni nie ma Booking Calendar, więc slot nie zostaje wybrany i submit jest trwale `disabled`. Pełna ścieżka rezerwacji jest niemożliwa do przejścia tym fixture — to ograniczenie środowiska testowego, nie błąd widgetu.

---

## 5. Niuanse UX/UI (do rozważenia, nie błędy krytyczne)

- **U1 — „Require consent" gubi domyślny zamiar:** kod ma `consent.required: true` w defaultach, ale po włączeniu „Show consent checkbox" przełącznik „Require consent" pokazuje się **wyłączony**. Wynika to z normalizacji bramkującej `required = enabled && required` — gdy consent był wyłączony, `required` został znormalizowany do `false`, a ponowne włączenie nie przywraca `true`. Użytkownik musi ręcznie włączyć wymóg. Sam toggle działa poprawnie po kliknięciu.
- **U2 — info-buttony w Advanced są nadmiarowe:** przy każdej pozycji diagnostycznej jest przycisk „… info", ale help-text i tak jest wyświetlany na stałe pod wartością. Kliknięcie zaznacza przycisk jako `active`, lecz nie ujawnia dodatkowej treści — funkcja sprawia wrażenie zbędnej/mylącej.
- **U3 — Wizard jest bardzo ubogi:** jedyna kontrolka to wybór Booking Calendar. Na powierzchni bez kalendarza Wizard nie ma czego konfigurować (jedyna opcja w select to „Default booking flow"). Onboarding sprowadza się do komunikatu „dodaj kalendarz".
- **U4 — Sekcja Surface bez pola tekstowego wartości:** kolory ustawia się wyłącznie przez swatch (color picker), bez możliwości wpisania hexa/zmiennej CSS ręcznie (`showValueInput=false`). Swatch dla wartości domyślnych pokazuje fallback (#ffffff, #d4d4d8 itd.) z podpisem „Theme default" — co jest poprawne, ale może sugerować, że kolor jest już ustawiony.
- **U5 — Mylący sumaryczny „Visibility summary" w Advanced:** sekcja współdzielonego chrome bloku (nie część edytora widgetu) pokazała „Shown on: Hidden on all devices", podczas gdy przełączniki Device visibility w Visual były wyłączone (czyli blok jest widoczny), a formularz na froncie faktycznie **się renderuje**. To etykieta współdzielonego bloku, nie kontrolka widgetu — ale sformułowanie jest sprzeczne z realnym stanem widoczności na froncie. Warto zweryfikować w osobnym audycie chrome bloku.
- **U6 — Notka „Setup complete" / podział Wizard vs Visual:** komunikacja trybów jest jasna („Daily edits live in Visual. Advanced is for technical diagnostics."), ale fakt, że Wizard nie jest zakładką tylko przyciskiem „Run setup again", może być nieoczywisty dla nowego użytkownika.

---

## 6. Admin Preview vs Front — porównanie

| Aspekt | Admin Preview | Front | Zgodność |
|--------|---------------|-------|----------|
| Renderowanie wariantu `default` | ✓ | ✓ | OK |
| `action`/`method` formularza | `/api/booking/reservations` / POST | identyczne | OK |
| `name` + `autocomplete` na polach | ✓ | ✓ | OK |
| Slot summary empty-state | ✓ | ✓ | OK |
| Submission nonce | „Not injected in editor" | **wstrzyknięty (78 znaków)** | OK (różnica zgodna z projektem) |
| Live licznik notatek | ✓ | ✓ | OK |
| Submit `disabled` (brak slotu) | ✓ | ✓ | OK |
| Edycje Visual (Title, custom field, consent…) | aktualizują podgląd na żywo | **nie odzwierciedlone** — bo nie zapisano/opublikowano | oczekiwane |

**Wniosek:** Admin Preview i Front renderują identyczny kontrakt dla zapisanego (domyślnego) stanu. Front dodatkowo wstrzykuje realny nonce i uruchamia client runtime (licznik). Edycje testowe nie były publikowane, więc front pokazuje stan bazowy — zgodnie z oczekiwaniem.

---

## 7. Podsumowanie

- **Wizard:** działa, ale minimalny; na fixture bez Booking Calendar nie ma czego konfigurować (poprawny feedback „missing", działający powrót do Visual).
- **Visual:** w pełni funkcjonalny — **wszystkie przetestowane kontrolki aktualizują podgląd na żywo i utrzymują się w sesji UI**. Jedyny wyjątek to preset telefonu „No extra validation".
- **Advanced:** poprawnie read-only (0 pól edytowalnych), diagnostyka zgodna z kontraktem; info-buttony nadmiarowe.
- **Front:** poprawny kontrakt, server-injected nonce, działający runtime (licznik notatek), submit świadomie zablokowany do czasu wyboru slotu, brak overflow, czysta konsola.

**Jedyny funkcjonalny błąd:** preset „No extra validation" dla walidacji telefonu (sekcja 4.1) — pusty pattern jest nadpisywany domyślnym przez `text()` w normalizacji.

**Reszta przetestowanego zakresu działa zgodnie z oczekiwaniami.** Nie zaobserwowano błędów konsoli ani rozbieżności Admin/Front w zapisanym stanie.

---

## 8. Załączniki (lokalne etykiety)

| Plik (lokalny) | Opis |
|----------------|------|
| `appointment-form-public-0529.png` | Zrzut formularza na froncie (`/test-appointment-form-0516`) — wariant default, stan bazowy |

> Powyższy plik PNG jest wyłącznie lokalną etykietą przechwycenia Playwright; nie stanowi wymaganego evidence i nie jest wersjonowany w repo.
