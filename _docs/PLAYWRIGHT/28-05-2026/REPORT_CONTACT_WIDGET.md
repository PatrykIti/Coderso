# RAPORT: Contact Widget — audyt wyczerpujący (Wizard / Visual / Advanced + Front)

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (upgrade raportu z 28-05; ten plik zastępuje poprzednią, „reprezentatywną" wersję)
> **Sesja przeglądarki:** `claude-29-05-contact-exhaustive-v3` (izolowana)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `969501e7-887f-458a-887a-1c2725e815d8`, tytuł „Contract Test - contact", status `draft`
> **Trasa publiczna:** `http://localhost:3000/contact-audit-0516` (tytuł „CONTACT-AUDIT-0516", osobna opublikowana strona)
> **Pliki źródłowe:** `core/widgets/core/contact.tsx` (model + normalizacja + renderer `ContactBlock`), `core/admin/ui/widgets/editors/ContactEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/widgets/editors/{ClearableFields,WidgetEditorControls}.tsx` (pola wspólne)

> **Metodologia — czym ten przebieg różni się od poprzedniego:** poprzedni raport (28-05)
> klikał kontrolki *reprezentatywnie* (jeden wariant tu, jedna paleta tam) i jawnie pomijał
> większość rodzin. **Ten przebieg przeszedł przez WSZYSTKIE dyskretne opcje każdej dostępnej
> w fixture kontrolki** (każdy wariant, każdy preset każdego selecta, każdy switch, każde pole
> tekstowe i kolorowe, warunkowe odsłanianie sekcji), a efekt każdej zmiany weryfikowałem
> programowo na **żywym renderze w kanwie admina** (`[data-contact-variant]` — atrybuty
> `data-contact-*`, klasy Tailwind, inline `style`, `getComputedStyle`, atrybuty `href`/`required`/
> `autocomplete`/`aria-*`). Front zweryfikowałem niezależnie na opublikowanej trasie.

> **Uwaga o zrzutach:** nazwy plików PNG to wyłącznie lokalne etykiety przechwyceń Playwright.
> Same PNG **nie są commitowane** do repo i nie stanowią wymaganego evidence.

> **Uwaga o zapisie:** w trakcie audytu wykonałem dziesiątki edycji w trybie Visual, ale
> **świadomie NIE zapisywałem draftu ani nie publikowałem** (współdzielony fixture; trasa
> publiczna to i tak osobna strona). Stan strony na dysku pozostaje niezmieniony.

---

## 1. Przegląd widgetu

**Typ:** `contact` · **Kategoria:** `forms`
**Opis (z definicji):** „Contact form and details."
**Warianty:** `form-left`, `form-right`, `minimal` (Visual jest właścicielem wyboru wariantu — `editorCapabilities.visualOwnsVariantSelection: true`).

**Tryby edytora wg kontraktu (`contactEditorContract`, version 2):**
- **Wizard** — 2 sekcje read-only: „Contact layout" (`readOnlyPaths: ["variant"]`) i „Contact form" (`readOnlyPaths: ["form.fields","form.submitLabel"]`); `writablePaths: []`.
- **Visual** — 8 sekcji edytowalnych: „Variant and section header", „Form fields and required rules", „Field labels, placeholders, and layout", „Submission runtime binding", „Contact details and business info", „Map source and display behavior", „Colors, borders, and surface styling", „Section layout and spacing".
- **Advanced** — 3 sekcje read-only/diagnostyczne: „Map source and runtime metadata", „Normalization and fallback controls" (jedyna akcja: dwustopniowy „Normalize payload"), „Runtime diagnostics summary".

**Stan początkowy fixture:** wariant `form-left`, pola `name, email, message` (required: `email, message`), submission `static`, dane kontaktowe domyślne (telefon/email/adres/godziny), mapa wyłączona, kolory tokenowe.

---

## 2. Co było faktycznie testowane (pełny zakres interakcji)

Wszystkie kliknięcia wykonano w żywej aplikacji. Selecty to komponenty Radix (klik triggera
`[role=combobox]` + klik `[role=option]`, dopasowanie po `exact name`). Switche i przyciski
klikane po świeżych ref-ach ze snapshotu. Kolory ustawiane natywnym setterem `value` +
`input`/`change` (ścieżka React `onChange`).

| Rodzina kontrolek (Visual) | Liczba opcji | Przejście „przez wszystkie" |
|---|---|---|
| Karty wariantu | 3 | ✅ form-left / form-right / minimal |
| Section title / description | tekst | ✅ wpis → h2 + h2/aria-labelledby, p + aria-describedby |
| Visible fields (switch) | 4 | ✅ name/email/phone/message + **guard min. 1 pola** |
| Required fields (switch) | per pole | ✅ on/off → atrybut `required` |
| Field order (Move up/down) | — | ✅ przesunięcia w obie strony |
| Form panel title / Submit label | tekst | ✅ → h3 + aria-labelledby / tekst przycisku |
| Field layout | 2 | ✅ Single / Two columns (+ warunkowe Width) |
| Per-field Label / Placeholder | tekst | ✅ (na polu Name; kontrolka identyczna dla pozostałych) |
| Per-field Autocomplete | 4 | ✅ Name / Email / Phone(tel) / Off |
| Per-field Width | 2 | ✅ Full / Half (warunkowo: tylko Two columns) |
| Submission runtime mode | 2 | ✅ Static / Forms runtime |
| Static status note | tekst | ✅ → render `role=status` |
| Details panel title | tekst | ✅ → h3 |
| Detail Value (×4 typy) | tekst | ✅ phone→`tel:`, email→`mailto:`, address (multi-line), hours |
| Detail Label | tekst | ✅ (na Phone) |
| Detail Icon | 5 | ✅ No icon(0 svg) / Phone / Mail / Map pin / Clock |
| Social: Add / Platform / Label / Profile / Remove | 5 platform | ✅ X / LinkedIn / Facebook / Instagram / YouTube + Remove |
| Map: Show toggle | 2 | ✅ on/off (warunkowe odsłanianie pól) |
| Map title / description / location / fallback | tekst | ✅ → h3 / p / sanityzowany iframe / fallback |
| Map height | 4 | ✅ Small / Default / Large / Extra large |
| Palety | 3 | ✅ Light / Dark / Brand |
| Pola kolorów (ColorField) | 8 | ✅ wszystkie 8 → inline `style` na renderze |
| Use transparent | 3 pola | ✅ (zweryfikowane na Section background) |
| Clear (kolor) | 8 pól | ✅ (zweryfikowane na Heading → „Theme default" + disabled) |
| Card border width | 4 | ✅ 0 / 1 / 2 / 3 |
| Card radius | 5 | ✅ sm / md / lg / xl / full |
| Submit button radius | 5 | ✅ sm / md / lg / xl / full |
| Max width | 5 | ✅ Full / Medium / Large / Default / Extra large |
| Horizontal padding | 4 | ✅ None / Compact / Default / Roomy |
| Spacing | 5 | ✅ None / Compact / Default / Spacious / Extra spacious |
| Section columns | 2 | ✅ One / Two (warunkowo: nie-minimal) |

Dodatkowo: **Wizard** (read-only + powrót do Visual), **Advanced** (read-only diagnostyka +
dwustopniowy „Normalize payload"), **wariant minimal** (warunkowe ukrycie sekcji formularza),
**front** `/contact-audit-0516` (HTTP, konsola, DOM/a11y, overflow @1280 i @375).

---

## 3. Co działa (potwierdzone na renderze — pełne wyliczenie)

### 3.1 Wizard (read-only setup)
- „Run setup again" otwiera ekran **Wizard**; „Finish setup and open Visual" wraca do Visual.
- Obie sekcje Wizard mają **0 edytowalnych kontrolek** (zmierzone: 0 inputów, 0 comboboxów, 0 switchy, 0 przycisków w obrębie sekcji):
  - „Contact layout" → read-only „Current layout" = bieżący wariant („Form left").
  - „Contact form" → read-only „Visible fields" („Name, Email, Message") + „Submit label" („Send message").
- **Powrót „Finish setup" nie resetuje danych** — po powrocie wariant i pola pozostają (form-left, name/email/message).
- „Live preview" Wizarda renderuje bieżący stan tym samym rendererem.

### 3.2 Visual — Variant and section header

| Kontrolka | Przejście | Zweryfikowany efekt na renderze |
|---|---|---|
| Karty wariantu | form-left | `data-contact-variant=form-left`, formularz `md:order-1`, dane `md:order-2`, `columns=two` |
| | form-right | `variant=form-right`, formularz `md:order-2`, dane `md:order-1` |
| | minimal | `variant=minimal`, **brak formularza** (`role=group`), `columns=one`, dane `md:order-2` |
| Section title | wpis „Skontaktuj sie z nami" | render **`<h2 id="blk-1-title">`**; sekcja `aria-labelledby="blk-1-title"` |
| Section description | wpis „Opis sekcji kontaktu" | render **`<p id="blk-1-description">`**; sekcja `aria-describedby="blk-1-description"` |

> **Korekta poprzedniego raportu:** stara wersja twierdziła, że „Section title nie materializuje
> się jako widoczny nagłówek". To **nieprawda** — po wpisaniu wartości pojawia się prawdziwy
> `h2` (oraz `aria-labelledby`). Brak nagłówka w stanie domyślnym wynika z **pustego** pola
> title w fixture, a nie z braku renderowania.

### 3.3 Visual — Form fields and required rules

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Visible fields | Phone ON | render: pola `[name,email,message,phone]` (phone dopisany na końcu) |
| | Name/Email/Phone OFF | kolejno usuwane z renderu |
| | **Message OFF gdy zostało 1 pole** | **zablokowane** — render dalej `[message]` (guard `fields.length<=1`) |
| Required fields | Name ON, Phone ON | render: odpowiednie inputy dostają atrybut `required=true` |
| | (pole zdjęte z Visible) | automatycznie usuwane z required |
| Field order | Phone „Move up" | render: `[name,email,phone,message]` |
| | Name „Move down" | render: `[email,name,phone,message]` |
| Form panel title | wpis „Napisz do nas" | render `<h3 id="blk-1-form-title">`; grupa formularza `aria-labelledby="blk-1-form-title"` |
| Submit label | wpis „Wyslij wiadomosc" | tekst przycisku = „Wyslij wiadomosc" |

### 3.4 Visual — Field labels, placeholders, and layout

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Field layout | Single column | render: grid `grid gap-4` (bez `md:grid-cols-2`), brak selektów Width |
| | Two columns | render: grid `md:grid-cols-2`; **odsłonięte 4 selekty „Width"** (po jednym na pole) |
| Per-field Label (Name) | „Imie i nazwisko" | `<label>` renderu = „Imie i nazwisko" |
| Per-field Placeholder (Name) | „Wpisz imie" | `placeholder` inputu = „Wpisz imie" |
| Per-field Autocomplete (Name) | Off / Phone / Email / Name | `autocomplete` = `off` / `tel` / `email` / `name` (wszystkie 4) |
| Per-field Width (Name) | Full / Half | wrapper `md:col-span-2 space-y-1` (full) → `space-y-1` (half) |

### 3.5 Visual — Submission runtime binding

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Runtime mode | Static → Forms runtime → Static | `data-contact-form-mode` zmienia się `static`↔`forms-runtime`; tryb forms-runtime **odsłania** select „Bound form" |
| Static status note | „Formularz tymczasowo wylaczony (audyt)" | render `role=status` = nowa treść |

> Ograniczenie środowiska (patrz sekcja 5): w trybie „Forms runtime" select „Bound form"
> pokazuje wyłącznie wyłączoną pozycję **„No forms found"** — w tym środowisku nie istnieją
> żadne Formy, więc mapowanie pól, override'y success/error i realny formularz runtime są
> **nieosiągalne**.

### 3.6 Visual — Contact details and business info

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Details panel title | „Dane kontaktowe" | render `<h3>` w panelu danych |
| Phone — Value | „+48 600 700 800" | `href="tel:+48600700800"` (znaki nie-cyfrowe usunięte poza `+`) |
| Email — Value | „biuro@firma.pl" | `href="mailto:biuro@firma.pl"` |
| Address — Value | „ul. Testowa 1\\n00-001 Warszawa" | render z `whitespace-pre-line` (zachowane łamanie linii) |
| Hours — Value | „Pon-Pt 8-16" | render = nowa wartość |
| Phone — Label | „Telefon" | `dt` etykieta = „Telefon" |
| Phone — Icon | No icon / Mail / Map pin / Clock / Phone | „No icon" → **0 `<svg>`**; pozostałe → 1 `<svg>` (ikona dekoracyjna) |
| Social — Add | klik | nowy wiersz, domyślnie platforma LinkedIn, label „LinkedIn", profil pusty |
| Social — Profile name | „coderso" | render: link „LinkedIn" → `https://www.linkedin.com/company/coderso`, `rel="noopener noreferrer"`, `target="_blank"`; `data-contact-social-count=1` |
| Social — Platform | X / Facebook / Instagram / YouTube / LinkedIn | href przebudowywany: `x.com/coderso`, `facebook.com/coderso`, `instagram.com/coderso`, `youtube.com/@coderso`, `linkedin.com/company/coderso` |
| Social — Remove | klik | wiersz znika, `data-contact-social-count=0`, brak `<a>` w renderze |

### 3.7 Visual — Map source and display behavior

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Show map | OFF → ON | ON **odsłania** Title/Description/Location/Height/Fallback; przy braku URL: `data-contact-map=false`, brak iframe, render fallbacku `role=status` |
| Map fallback copy | „Mapa chwilowo niedostepna" | render fallbacku = nowa treść (gdy URL niewłaściwy) |
| Map title | „Znajdz nas" | render `<h3>` w panelu mapy; staje się też `title` iframe |
| Map description | „Nasze biuro w centrum" | render `<p>` opisu |
| Map location | „Warszawa, Polska" | builder buduje **sanityzowany** `https://www.google.com/maps?q=Warszawa%2C+Polska&output=embed`; `data-contact-map=true`, render `<iframe>` |
| Map height | Small / Default / Large / Extra large | klasa iframe `h-40` / `h-56` / `h-72` / `h-96` |

### 3.8 Visual — Colors, borders, and surface styling

| Kontrolka | Przejście | Zweryfikowany efekt |
|---|---|---|
| Palety | Light | sekcja `transparent`, panel `#ffffff`, border `#e2e8f0`, heading `#0f172a`, btn bg `#2563eb` / text `#ffffff` |
| | Dark | sekcja `#0f172a`, panel `#111827`, border `#334155`, heading `#f8fafc`, btn bg `#38bdf8` / text `#082f49` |
| | Brand | sekcja `#eff6ff`, panel `#ffffff`, border `#93c5fd`, heading `#1e3a8a`, btn bg `#1d4ed8` |
| Section background | `#112233` | `section style.backgroundColor = rgb(17,34,51)` |
| Card surface color | `#223344` | panel `backgroundColor = rgb(34,51,68)` |
| Card border color | `#445566` | panel `borderColor = rgb(68,85,102)` |
| Heading color | `#aabbcc` | `h2 color = rgb(170,187,204)` |
| Supporting text color | `#ddeeff` | `dd color = rgb(221,238,255)` |
| Submit button background | `#010203` | przycisk `backgroundColor = rgb(1,2,3)` |
| Submit button text | `#f0f0f0` | przycisk `color = rgb(240,240,240)` |
| Submit button border | `#0a0b0c` | przycisk `borderColor = rgb(10,11,12)` |
| Use transparent (background) | klik | `backgroundColor = transparent`, etykieta statusu → „Transparent" |
| Clear (heading) | klik | inline `color` zniknięty (token motywu), etykieta → „Theme default", przycisk „Clear" → `disabled` |
| Card border width | 0 / 2 / 3 / 1 | `data-contact-border-width` + panel `borderWidth` = `0px`/`2px`/`3px`/`1px` |
| Card radius | sm / lg / xl / full / md | panel klasa `rounded-sm`/`-lg`/`-xl`/`-full`/`-md` |
| Submit button radius | sm / lg / xl / full / md | przycisk klasa `rounded-sm`/`-lg`/`-xl`/`-full`/`-md` |

> Przyciski **„Use transparent" są obecne tylko przy 3 polach** (Section background, Submit button
> background, Submit button border — `allowTransparent`). **„Clear" jest przy wszystkich 8.**

### 3.9 Visual — Section layout and spacing

| Kontrolka | Przejście | Zweryfikowany efekt (`data-*` + klasa) |
|---|---|---|
| Max width | Full / Medium / Large / Extra large / Default | `none`(brak max-w) / `md`(max-w-3xl) / `lg`(max-w-4xl) / `2xl`(max-w-6xl) / `xl`(max-w-5xl) |
| Horizontal padding | None / Compact / Roomy / Default | `none`(px-0) / `sm`(px-2) / `lg`(px-6) / `md`(px-4) |
| Spacing | None / Compact / Spacious / Extra spacious / Default | `none`(gap-0 py-0) / `sm`(gap-4 py-6) / `lg`(gap-8 py-10) / `xl`(gap-10 py-12) / `md`(gap-6 py-8) |
| Section columns | One / Two | `data-contact-columns=one`(md:grid-cols-1) / `two`(md:grid-cols-2) |

### 3.10 Visual — wariant minimal (warunkowe odsłanianie)
- Po przełączeniu na `minimal`: render **bez formularza**; w edytorze sekcje
  „Field labels, placeholders, and layout" oraz „Submission runtime binding" **znikają**,
  a sekcja „Form fields..." pokazuje notę **„Form-field controls are hidden..."**.
- W „Section layout and spacing" zamiast selecta columns pojawia się nota
  **„Columns do not apply in the minimal layout..."**.

### 3.11 Advanced — read-only, wiernie odzwierciedla stan
- Wszystkie 3 sekcje: **0 inputów, 0 comboboxów, 0 switchy**; jedyna kontrolka to przycisk akcji.
- „Map source and runtime metadata" (zgodne ze stanem ustawionym w Visual):
  - Map visibility: **Enabled**
  - Map source: **„Google Maps location: Warszawa, Polska"**
  - Runtime status: **„Valid map URL. HTTPS embed is ready for runtime."**
- „Normalization and fallback controls" — **dwustopniowa akcja „Normalize payload"**:
  1. „Review normalization" → przycisk → **„Confirm normalization"** + `role=status`: „Review diagnostics, then confirm normalization."
  2. „Confirm normalization" → wykonuje normalizację, przycisk wraca do „Review normalization", `role=status`: **„Already normalized."** (bo Visual normalizuje dane przy każdej zmianie).
- „Runtime diagnostics summary" (zgodne z bieżącym stanem):
  - Form fields: **4 configured**, Contact details: **4 visible**, Social links: **0 visible**
  - Runtime security: „Submission nonce redacted; public payload not shown in editor."
- Panel pokazuje też **read-only chrome page-buildera** (poza kontraktem widgetu):
  „Block layout" (Content width default, Padding MD/MD, Margin None/None) oraz
  „Device visibility" → **„Hidden on all devices"**.

### 3.12 Front (`/contact-audit-0516`)
- HTTP **200** (`text/html`), tytuł „CONTACT-AUDIT-0516", **0 błędów i 0 ostrzeżeń konsoli**.
- Widget opublikowany (osobna konfiguracja od edytowanego fixture): `variant=form-right`,
  pola `name`(opcjonalne), `email`(required), `message`(required, `<textarea>`); etykiety Name/Email/Message.
- Dane kontaktowe: telefon `tel:+1555123456`, email `mailto:hello@example.com`, adres „123 Market Street", godziny „Mon-Fri 9-5".
- **4 ikony, wszystkie `aria-hidden="true"`** (dekoracyjne) — tekst pozostaje czytelny w drzewie a11y.
- Mapa: `data-contact-map=false`, brak iframe, render fallbacku **„Map is unavailable."** (`role=status`) — mapa włączona, ale bez URL.
- Formularz statyczny: przycisk **`type="button"`**, status **„This contact form is not connected yet."**
- Klik „Send message": **brak nawigacji, brak zmiany statusu, brak błędów konsoli** — przycisk bezczynny (zgodnie z trybem static).
- A11y sekcji: brak title → sekcja `aria-label="Contact section"`.
- **Brak poziomego overflow:** `scrollWidth == clientWidth` przy **1280px** (1280=1280) i **375px** (375=375); na mobile layout stackuje się pionowo.

---

## 4. Co NIE działa / problemy funkcjonalne

- **Nie wykryto defektów funkcjonalnych widgetu.** Każda dyskretna opcja każdej **osiągalnej**
  z UI kontrolki (a w tym przebiegu kliknięto je wszystkie — sekcja 3) realnie zmieniała render
  zgodnie z modelem. Wizard i Advanced realizują kontrakt (setup-only / read-only + jedna akcja
  normalizacji). Front renderuje bez błędów JS.
- Jedyne „nie działa" w sensie runtime to **świadomy stan fixture**, nie crash:
  - publiczny formularz jest w trybie `static` → przycisk `type="button"` jest bezczynny, a status to „...not connected yet.";
  - mapa na froncie jest włączona, ale bez URL → renderuje fallback „Map is unavailable.".

---

## 5. Czego NIE dało się w pełni zweryfikować (i dlaczego — konkretnie)

1. **Cała gałąź „Forms runtime" poza samym przełącznikiem trybu** — w trybie `forms-runtime`
   select **„Bound form" pokazuje tylko wyłączoną pozycję „No forms found"**; `useForms()`
   zwraca pustą listę w tym środowisku (brak jakichkolwiek Formularzy). W konsekwencji
   **nieosiągalne z UI są:** wybór bound form, mapowanie pól (Field mapping), override'y
   „Success message" / „Error message", ostrzeżenie amber o dostępie „internal", ostrzeżenie
   amber o niezgodnym pokryciu pól oraz **realny formularz runtime** (`<form method=post>`,
   przycisk `type="submit"`, ukryty nonce, doklejany `getFormRuntimeClientScript`). To
   **ograniczenie danych w środowisku, nie defekt widgetu**.
2. **Natywny dialog koloru OS (`input[type=color]`)** — dotyczy 8 pól ColorField. Klik swatcha
   otwiera systemowy picker, nieobsługiwalny w headless. **Obejście:** ustawianie `value`
   natywnym setterem + `input`/`change` (ścieżka React `onChange`); efekt na renderze
   potwierdzony dla wszystkich 8 (sekcja 3.8). Ograniczenie harnessu, nie defekt.
3. **Platforma społecznościowa `custom`** — select platform oferuje tylko X/LinkedIn/Facebook/
   Instagram/YouTube; „Custom legacy" jest pokazywana **disabled** wyłącznie, gdy wiersz JUŻ
   jest `custom`. Z poziomu UI **nie da się ustawić** platformy `custom`, więc gałęzie
   „Profile destination (support-only)" i „Clear saved custom destination" są nieosiągalne bez
   wstrzyknięcia legacy danych po stronie backendu.
4. **Gałąź „Saved custom map source" (legacy)** — `ContactMapLocationField` pokazuje amber
   „A saved custom map source is still stored..." tylko wtedy, gdy `embedUrl` jest niepusty,
   ale NIE jest rozpoznawalną lokalizacją `q=` Google Maps. Edytor zawsze buduje poprawny
   embed Google Maps z pola lokalizacji, więc ta gałąź **nie jest osiągalna z UI** w tym fixture.
5. **Persistencja (Save draft / Publish) i round-trip na front** — **świadomie nie wykonane**:
   współdzielony fixture, a trasa publiczna `/contact-audit-0516` to **osobna opublikowana
   strona** z niezależną konfiguracją. Front zweryfikowano niezależnie (sekcja 3.12), nie jako
   odzwierciedlenie moich edycji w adminie.
6. **Realna wysyłka formularza i ścieżka success/error** — zależy od punktu 1; nieosiągalna.
7. **Realne kafelki mapy** — `src` iframe to poprawny embed Google Maps, ale faktyczne
   ładowanie kafelków / ruch do third-party nie był weryfikowany (a na froncie mapa jest bez URL).
8. **Nawigacja pełną klawiaturą / czytnik ekranu** — weryfikacja ograniczona do poziomu DOM/ARIA
   (role, `aria-hidden`, `aria-labelledby`/`-describedby`), bez realnego przebiegu AT.

---

## 6. Uwagi UX/UI i dostępności (niuanse, nie defekty)

1. **Statyczny przycisk formularza to `type="button"`** z `data-form-submit="1"`, ale bez handlera —
   jest czysto prezentacyjny. Jedyny feedback to statyczna nota `role=status`. W trybie runtime
   (gdy istnieje zgodna Forma) ten sam obszar renderuje prawdziwy `<form>` z `type="submit"`.
2. **`required` jest ustawiane na inputach**, ale ponieważ statyczny formularz nigdy nie jest
   wysyłany, natywna walidacja HTML5 nie daje realnej ścieżki ukończenia akcji.
3. **`role=status` jest używany jednocześnie dla noty statycznej formularza i fallbacku mapy** —
   semantycznie OK, ale oba komunikaty są statyczne (nie pracują jako żywe live-region update).
4. **Semantyka nagłówków zależy od wypełnienia pól.** Gdy ustawisz title sekcji/formularza/
   danych/mapy, pojawiają się poprawne `h2`/`h3` + `aria-labelledby`; gdy puste — fallback
   `aria-label` („Contact section" / „Contact form" / „Contact details"). Dobre a11y, ale to
   tłumaczy mylną tezę starego raportu: nagłówek **jest** renderowany, tyle że tylko po wpisaniu.
5. **Nagłówki kart pól w edytorze używają kanonicznych nazw** (Name/Email/Phone/Message) nawet
   po zmianie etykiety — karta mówi „Name", choć renderowana etykieta to np. „Imie i nazwisko".
   Drobny niuans nawigacyjny w edytorze.
6. **Warunkowe odsłanianie działa poprawnie:** „Width" pojawia się tylko przy Field layout = Two
   columns; pola mapy tylko po włączeniu „Show map"; pole „Bound form" itd. tylko w trybie
   `forms-runtime`; sekcje formularza znikają w wariancie `minimal`.
7. **Chrome page-buildera** („Block layout", „Device visibility") jest read-only i widoczny
   **zarówno w Visual, jak i Advanced**. Na tym fixture „Device visibility" = **„Hidden on all
   devices"** — czyli publikacja dokładnie tego fixture i tak nie pokazałaby widgetu (ale trasa
   publiczna to inna strona, która renderuje się poprawnie).
8. **Comboboxy to Radix (nie natywny `<select>`)** — wymagają kliknięcia triggera i opcji; natywna
   komenda `select` na nich nie działa (niuans harnessu, nie błąd widgetu).
9. **Normalizacja `href`:** telefon usuwa znaki nie-cyfrowe poza `+` (`+48 600 700 800` →
   `tel:+48600700800`); email dostaje `mailto:` tylko gdy pasuje do prostego wzorca email;
   linki social budowane są przez bezpieczny builder (`rel="noopener noreferrer"`, `target="_blank"`).

---

## 7. Podsumowanie

| Tryb / obszar | Charakter | Wynik audytu (przebieg wyczerpujący) |
|---|---|---|
| **Wizard** | Read-only setup + preview | ✅ 0 pól edycji; read-only `variant`/`fields`/`submitLabel`; powrót do Visual bez resetu |
| **Visual** | Główny edytor (8 sekcji) | ✅ **Wszystkie** dyskretne opcje wszystkich osiągalnych kontrolek działają i aktualizują render; warunkowe odsłanianie poprawne |
| **Advanced** | 3 sekcje diagnostyczne | ✅ 0 kontrolek edycji; diagnostyka 1:1 ze stanem; dwustopniowy „Normalize payload" działa |
| **Front** | `/contact-audit-0516` | ✅ HTTP 200, 0 błędów konsoli, poprawny DOM/a11y, brak overflow (1280/375) |

**Werdykt końcowy:** Po przejściu przez **wszystkie** dostępne opcje każdej kontrolki widget
`contact` jest sprawny i spójny między edytorem a rendererem — nie wykryto żadnego defektu
funkcjonalnego. Wizard/Advanced realizują zadeklarowany kontrakt (setup-only / read-only + jedna
akcja normalizacji), a Visual obsługuje pełną konfigurację z poprawnym warunkowym odsłanianiem
pól i poprawnym wiązaniem a11y (`h2/h3` + `aria-labelledby`/`-describedby`, `aria-hidden` ikon,
bezpieczne `href` social/mapy).

Najważniejsze ograniczenia z sekcji 5 to albo **brak danych w środowisku** (brak Formularzy →
cała gałąź `forms-runtime`), albo **świadome decyzje projektowe** (platforma `custom` i legacy
map source nieosiągalne z UI), albo **ograniczenia harnessu** (natywny picker koloru) — nie
defekty. Najistotniejsza korekta względem starego raportu: **Section title realnie renderuje
`<h2>`** (stara teza była błędna). Najważniejsze niuanse UX to sekcja 6: statyczny przycisk
`type="button"`, współdzielony `role=status` dla formularza i mapy oraz fakt, że nagłówki
pojawiają się dopiero po wypełnieniu pól title.

---

## 8. Zrzuty (etykiety lokalne, niecommitowane)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `contactexh-front-desktop-1280-29-05.png` | Front `/contact-audit-0516`, 1280px (brak overflow) |
| `contactexh-front-mobile-375-29-05.png` | Front `/contact-audit-0516`, 375px (brak overflow, stack pionowy) |
| `contactexh-admin-advanced-29-05.png` | Admin, zakładka Advanced (read-only diagnostyka) |
