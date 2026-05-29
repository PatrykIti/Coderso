# RAPORT: Contact Widget — audyt bieżącego stanu (Admin UI + Front)

> **Status:** Zakończony
> **Data:** 2026-05-29
> **Sesje weryfikacyjne:** izolowane sesje Playwright dla admina i frontu
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixture):** `Contract Test - contact` (`969501e7-887f-458a-887a-1c2725e815d8`, slug `/ctr-contact-2305`)
> **Trasa publiczna:** http://localhost:3000/contact-audit-0516 (`CONTACT-AUDIT-0516`)
>
> **Uwaga o zrzutach:** ewentualne nazwy PNG są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Nie są commitowane do repo i nie stanowią wymaganego evidence.

---

## 1. Przegląd widgetu

**Typ:** `contact`  
**Kategoria:** `forms`  
**Tryby edytora:** osobny `Wizard` uruchamiany przez `Run setup again`, zakładki `Visual` i `Advanced`

**Pliki źródłowe:**
- `core/widgets/core/contact.tsx`
- `core/admin/ui/widgets/editors/ContactEditors.tsx`

Widget łączy dwa obszary: formularz kontaktowy oraz panel danych firmy. W zależności
od wariantu może renderować formę po lewej lub prawej stronie albo przejść w układ
`minimal`, gdzie runtime pokazuje same dane kontaktowe z opcjonalną mapą.

---

## 2. Testy wykonane

### Admin UI
- Logowanie do admina i otwarcie fixture page.
- `Wizard`: wejście przez `Run setup again`, potwierdzenie sekcji `Contact layout`
  i `Contact form`, sprawdzenie przycisku `Finish setup and open Visual`.
- `Visual`:
  - zmiana wariantu na `minimal`,
  - edycja `Section title`,
  - włączenie `Show map`,
  - użycie palety `Dark`,
  - powrót do `form-left`,
  - włączenie pola `Phone` w sekcji `Visible fields`.
- `Advanced`: sprawdzenie sekcji diagnostycznych i read-only summary.

### Front
- Otwarcie publicznej trasy (`200`, tytuł `CONTACT-AUDIT-0516`).
- Snapshot DOM / a11y.
- Sprawdzenie konsoli.
- Klik przycisku `Send message`.
- Overflow i układ na desktopie oraz mobile `375px`.

**Celowo nie testowano:**
- `Save draft` / `Publish` na współdzielonej fixturze.
- Realnej wysyłki formularza do backendu.
- Realnego map embed z poprawną lokalizacją.
- Cross-browser.

---

## 3. Co działa

### Wizard
- `Run setup again` otwiera osobny ekran `Wizard`.
- Wizard pokazuje sekcje `Contact layout` i `Contact form`.
- `Finish setup and open Visual` wraca do codziennego trybu edycji.

### Visual
- Przełączenie wariantu na `minimal` aktualizuje preview:
  - root przechodzi na `data-contact-variant="minimal"`,
  - panel pokazuje notę, że `Form-field controls are hidden` dla tego wariantu.
- `Section title` przyjmuje nową wartość i jest zachowywany w bieżącej sesji UI.
- `Show map` działa jako progresywne rozwinięcie:
  - po włączeniu pojawiają się pola `Map title`, `Map description`,
    `Map location`, `Map height`, `Map fallback copy`.
- Paleta `Dark` zapisuje jawne kolory w kontrolkach:
  - `Section background` przechodzi na `#0f172a`,
  - `Card surface color` na `#111827`,
  - pozostałe pola kolorów dostają stan `Selected color`.
- Po powrocie do `form-left` sekcja `Visible fields` wraca poprawnie.
- Włączenie `Phone` w `Visible fields` aktualizuje preview:
  - w regionie `Contact form` pojawia się pole `Phone`.

### Advanced
- Zakładka `Advanced` otwiera się poprawnie.
- Widoczne są sekcje:
  - `Map source and runtime metadata`
  - `Normalization and fallback controls`
  - `Runtime diagnostics summary`
- Diagnostyka jest read-only i pokazuje sensowny stan bieżący:
  - `Map source: Not configured`
  - `Contact details: 4 visible`
  - dodatkowe sekcje wspólnego chrome (`Block layout`, `Device visibility`) są tylko do odczytu.

### Front
- Formularz renderuje pola `Name`, `Email`, `Message`, każde z powiązaną etykietą.
- Blok danych kontaktowych renderuje:
  - telefon jako `tel:+1555123456`
  - email jako `mailto:hello@example.com`
  - address
  - hours
- Ikony są dekoracyjne (`aria-hidden="true"`), tekst pozostaje czytelny w drzewie a11y.
- Stan bez mapy jest obsłużony komunikatem `Map is unavailable.` z `role="status"`.
- Stan rozłączonego formularza jest komunikowany przez `This contact form is not connected yet.`
- Brak poziomego overflow na desktopie i mobile `375px`.
- Na mobile layout stackuje się pionowo.
- Konsola frontu jest czysta (`0` błędów, `0` ostrzeżeń).

---

## 4. Co nie działa

- Publiczny formularz jest obecnie **niefunkcjonalny runtime-owo**:
  - przycisk `Send message` jest `type="button"`,
  - klik nie wywołuje żadnej akcji,
  - status pozostaje `This contact form is not connected yet.`
- Mapa nie renderuje się na publicznej fixturze, jest tylko stan fallback.

To wygląda na aktualny stan konfiguracji fixture (`static` / `not connected`), a nie
na crash renderera.

---

## 5. Niuanse UX/UI

- Edytowalny `Section title` nie daje widocznego nagłówka w preview/frontcie.
  Po zmianie wartości stan jest przechowywany w UI, ale sam widget nie pokazuje
  czytelnego `h1`–`h6` ani jawnego wizualnego tytułu sekcji. To pokrywa się z tym,
  że publiczny widget nie wnosi na stronie widocznych nagłówków, tylko ARIA labels.
- Wariant `minimal` komunikuje swoje ograniczenia poprawnie:
  form-field controls są ukrywane z jawną notą, że nie wpływają na runtime tego wariantu.
- Front ma `required` na części pól, ale ponieważ nie ma aktywnego formularza/submisji,
  natywna walidacja HTML5 nie daje użytkownikowi realnej ścieżki zakończenia akcji.
- `role="status"` jest używany zarówno dla informacji o braku mapy, jak i o rozłączonym
  formularzu; semantycznie to poprawne, ale oba komunikaty są statyczne i nie pracują
  jako realny live-update flow.

---

## 6. Czego nie testowano

- Pozytywnego runtime binding do istniejącego formularza.
- Rzeczywistej wysyłki danych i ścieżki success/error.
- Rzeczywistego map embed z poprawnym adresem.
- Publikacji zmian z admina na front.
- Nawigacji pełną klawiaturą i czytnikiem ekranu beyond DOM-level inspection.

---

## 7. Podsumowanie

`Contact` działa stabilnie jako widget layoutowo-konfiguracyjny:
- tryby `Wizard`, `Visual` i `Advanced` są obecne,
- reprezentatywne kontrolki w `Visual` realnie zmieniają preview,
- `Advanced` daje spójny, read-only diagnostics snapshot,
- front renderuje poprawnie dane kontaktowe i stan rozłączonego formularza bez błędów JS.

Najważniejszy obecny limit nie jest crashem widgetu, tylko stanem fixture:
formularz publiczny nie jest podłączony, a mapa nie jest skonfigurowana.  
Najważniejszy niuans UX: `Section title` nie materializuje się jako wyraźny nagłówek
na preview/frontcie, mimo że pole jest edytowalne.
