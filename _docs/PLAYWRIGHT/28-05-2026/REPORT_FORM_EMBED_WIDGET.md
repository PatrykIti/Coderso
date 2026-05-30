# RAPORT: Form Embed Widget — audyt wyczerpujący (29-05-2026, v3 exhaustive)

> **Status:** Zakończony — pełny, wyczerpujący przegląd wszystkich dyskretnych kontrolek
> trybów Wizard / Visual / Advanced + frontend, z asercjami DOM na żywo.
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-form-embed-exhaustive-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** „Contract Test - form-embed" (`fed7fa7d-b498-439c-858d-72ac0a89926f`)
> **Trasa publiczna:** `/ctr-form-embed-2305` (tytuł strony: `Contract Test - form-embed`)

---

## 0. Metoda i zakres testu

Audyt wykonano od zera na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI edytora
(klikanie comboboxów Radix przez trigger + wybór opcji z portalu, wypełnianie pól tekstowych,
przełączanie switchy, sterowanie natywnymi pickerami kolorów) oraz na inspekcji DOM (`eval`/
`run-code`) na żywym podglądzie w admin i na statycznym renderze SSR trasy publicznej.

Ten przebieg był **wyczerpujący — bez skrótów reprezentatywnych**:

- **Każdy** combobox przeklikano przez **wszystkie** jego wartości (i z powrotem do wartości
  domyślnej), odczytując DOM podglądu po każdej zmianie.
- **Każdy** switch przełączono w obie strony (on→off→on) z odczytem `aria-checked`/`data-state`.
- **Każdą** z 8 kontrolek koloru ustawiono swatch'em (natywny setter + zdarzenia `input`/
  `change` — handler React reaguje) i następnie wyczyszczono przyciskiem „Clear", z odczytem
  zarówno renderu, jak i etykiety/stanu przycisku.
- Pole liczbowe TTL przetestowano na granicach (clamp).
- Pola tekstowe wypełniono i zweryfikowano efekt w podglądzie (gdy istnieje cel).
- Sprawdzono warianty, przycisk „Add variant preset", oba przejścia trybów oraz generyczne
  panele bloku (Block layout / Device visibility).

**Najważniejsze ograniczenie środowiska (kluczowe dla całego raportu):**

> W tym środowisku **nie istnieje ani jeden zapisany formularz**. Endpoint
> `/admin/api/forms` (przez `useForms` → `GET /forms`) zwraca `200 []` (zweryfikowane na
> żywo fetchem z zalogowanej sesji). Selektor formularza w Wizardzie ma wyłącznie wyłączoną
> pozycję „No forms found". Fixtura ma `data: {}` (czysty default, **bez `formId`**,
> `updatedAt: 2026-05-24T10:52:02.234Z`, jeden blok `form-embed`).
>
> W praktyce **rdzenna funkcja widgetu — osadzenie konkretnego zapisanego formularza — nie
> może być zweryfikowana**: nie ma jak wybrać formularza, więc widget zawsze renderuje stan
> pusty. Niemożliwe do przetestowania pozostają: renderowanie pól (13 typów), submisja,
> tryb wieloetapowy, pasek postępu, przyciski Back/Next, nonce, captcha oraz runtime'owe
> komunikaty sukcesu/błędu.

**Screenshoty:** nie przechwytywano żadnych plików PNG. Cała weryfikacja oparta jest na
asercjach DOM/`eval`. Ewentualne nazwy zrzutów Playwright byłyby wyłącznie **lokalnymi
etykietami** przechwyceń, ignorowanymi przez Git i nie stanowiłyby evidence w repo.

**Pliki źródłowe (analizowane dla kontekstu, niezmieniane):**

- `core/widgets/core/formEmbed.tsx` — renderer, model danych, normalizacja, schemat, kontrakt.
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` — współdzielona kontrolka koloru (źródło I3/I7 oraz „Clear nie wraca do domyślnego").
- `core/admin/services/formsClient.ts` — klient listy formularzy.

---

## 1. Przegląd widgetu

**Typ:** `form-embed` (kategoria: forms)
**Warianty:** wyłącznie `standard` (jeden wariant; w Visual karta „Standard" [Selected] + przycisk „Add variant preset")
**Tryby edytora:** Wizard (jednorazowy setup — wybór formularza), Visual (codzienna edycja prezentacji), Advanced (diagnostyka read-only)

Widget służy do osadzenia **zapisanego formularza** (z modułu Forms) wraz z kontrolą prezentacji:
copy (tytuł/opis/etykieta submit/komunikat sukcesu), layout (alignment, width, paddingi, gap pól,
poziom nagłówka), styl (tła, obramowanie, zaokrąglenie, rozmiar inputów, kolory tytułu/etykiet/
helpera/przycisku), widoczność etykiet, nawigacja multi-step oraz zachowanie po submisji. Renderer
w runtime łączy się z formularzem przez `POST /forms/:id/submissions` i wstrzykuje runtime JS
**tylko gdy formularz ma pola** (`fields.length > 0`).

**Stan fixtury w chwili testu:** bare widget — `data: {}`. Renderer stosuje defaulty (tytuł „Form",
width `md`, spacing `md`, border `1`/Thin, radius `md`, sekcja `px-4 py-8`). Bez wybranego
formularza widget pokazuje stan pusty.

---

## 2. Inwentaryzacja dyskretnych kontrolek (kompletna)

| Sekcja / tryb | Kontrolka | Typ | Wartości |
|---|---|---|---|
| Wizard | Saved form | select | tylko „No forms found" [disabled] |
| Visual / Variants | Standard | karta | 1 (Selected); „Add variant preset" (przycisk) |
| Visual / Content | Title | input | tekst |
| Visual / Content | Description | textarea | tekst |
| Visual / Content | Submit label | input | tekst |
| Visual / Content | Success message | textarea | tekst |
| Visual / Layout | Alignment | select | Start / Center / End |
| Visual / Layout | Width | select | None / Small / Medium / Large / Extra large |
| Visual / Layout | Spacing | select | None / Compact / Default / Spacious / Extra spacious |
| Visual / Layout | Button alignment | select | Start / Center / End |
| Visual / Layout | Side padding | select | Compact / Default / Wide |
| Visual / Layout | Vertical padding | select | None / Compact / Default / Spacious / Extra spacious |
| Visual / Layout | Field gap | select | Compact / Default / Spacious |
| Visual / Field labels | Show labels | switch | on/off |
| Visual / Field labels | Required indicator | switch | on/off |
| Visual / Style | Background | color + Clear | swatch (picker) |
| Visual / Style | Surface | color + Clear | swatch |
| Visual / Style | Border color | color + Clear | swatch |
| Visual / Style | Border width | select | None / Thin / Thick |
| Visual / Style | Radius | select | None / Small / Medium / Large |
| Visual / Style | Input size | select | None / Small / Medium / Large |
| Visual / Style | Title color | color + Clear | swatch |
| Visual / Style | Title size | select | Small / Medium / Large |
| Visual / Style | Title weight | select | Medium / Semibold / Bold |
| Visual / Style | Label color | color + Clear | swatch |
| Visual / Style | Helper color | color + Clear | swatch |
| Visual / Style | Submit background | color + Clear | swatch |
| Visual / Style | Submit text color | color + Clear | swatch |
| Visual / Style | Heading level | select | H2 / H3 / H4 |
| Visual / Multi-step | Back label | input | tekst |
| Visual / Multi-step | Next label | input | tekst |
| Visual / Multi-step | Show progress | switch | on/off |
| Visual / Multi-step | Saved progress TTL (days) | number | 1–30 (clamp) |
| Visual / Submit behavior | Loading label | input | tekst |
| Visual / Submit behavior | Success behavior | select | Hide / Reset / Keep form |
| Advanced (wszystkie) | Runtime / Security / Authoring / Contract | read-only | — |
| Generyczne (każdy blok) | Block layout (4 selecty), Device visibility (3 switche) | — | poza kontraktem form-embed |

---

## 3. Co PRZETESTOWANO i DZIAŁA (asercja DOM na żywo)

### 3.1 Wizard

| Funkcja | Wynik testu |
|---|---|
| Selektor „Saved form" | Otwiera się; **jedyna** pozycja „No forms found" [disabled]. ✓ Poprawny stan dla pustego środowiska. |
| Setup diagnostics (read-only) | „Please select a form to preview field coverage, runtime status, and submit behavior." ✓ |
| Wizard → Visual | „Finish setup and open Visual" przełącza na zakładkę „Visual" (selected) + status „Setup complete". ✓ |
| Visual → Wizard | „Run setup again" wraca do Wizarda z selektorem formularza. ✓ |
| Live preview w Wizard | Region „Live preview" odzwierciedla shared renderer (stan pusty). ✓ |

### 3.2 Visual — kontrolki z OBSERWOWALNYM celem w podglądzie (zweryfikowane wszystkie wartości)

| Kontrolka | Pełen przebieg → wynik (asercja DOM) |
|---|---|
| **Title** | „Kontakt — audyt v3" → treść `<hN>` natychmiast; `aria-labelledby` nadal == id nagłówka. ✓ |
| **Description** | tekst → renderuje `<p class="text-sm">` pod tytułem. ✓ |
| **Alignment** | Start → `items-start text-left`; Center → `items-center text-center`; End → `items-end text-right`. ✓ (3/3) |
| **Width** | None → brak `max-w`; Small → `max-w-md`; Medium → `max-w-lg`; Large → `max-w-xl`; Extra large → `max-w-2xl`. ✓ (5/5) |
| **Side padding** | Compact → `px-4`; Default → `px-6`; Wide → `px-8`. ✓ (3/3) |
| **Vertical padding** | None → `py-0`; Compact → `py-6`; Default → `py-8`; Spacious → `py-10`; Extra spacious → `py-12`. ✓ (5/5) — **to jest realna kontrolka pionowego odstępu** |
| **Border width** | None → `border-0` (computed `0px`); Thin → `border` (`1px`); Thick → `border-2` (`2px`). ✓ (3/3) |
| **Radius** | None → brak klasy; Small → `rounded-md`; Medium → `rounded-lg`; Large → `rounded-xl`; atrybut `data-form-embed-radius` zgodny. ✓ (4/4) |
| **Input size** | None/Small/Medium/Large → `data-form-embed-input-size` = none/sm/md/lg. ✓ (4/4, atrybut; bez realnych inputów) |
| **Title size** | Small → `text-lg`; Medium → `text-xl`; Large → `text-2xl`. ✓ (3/3) |
| **Title weight** | Medium → `font-medium`; Semibold → `font-semibold`; Bold → `font-bold`. ✓ (3/3) |
| **Heading level** | H2/H3/H4 → znacznik `<h2>`/`<h3>`/`<h4>`; `id` nagłówka i `aria-labelledby` sekcji **zachowane i spójne** przy każdym poziomie. ✓ (3/3, a11y intact) |
| **Background (kolor)** | `#ff0000` → `section` `background-color: rgb(255,0,0)`. ✓ Handler React reaguje. |
| **Surface (kolor)** | `#00ff00` → karta `background-color: rgb(0,255,0)`. ✓ |
| **Border color** | `#0000ff` → karta `border-top-color: rgb(0,0,255)`. ✓ |
| **Title color** | `#112233` → nagłówek `color: rgb(17,34,51)`. ✓ |
| **Helper color** | `#abcdef` → opis `<p>` `color: rgb(171,205,239)`. ✓ (cel istnieje, bo ustawiono Description) |
| **Clear: Background** | tło → `rgba(0,0,0,0)`, etykieta → **„Theme default"**, przycisk Clear → **[disabled]**. ✓ Reset pełny. |
| **Clear: Surface** | tło karty → `rgba(0,0,0,0)`, etykieta → **„Theme default"**, Clear → **[disabled]**. ✓ Reset pełny. |

### 3.3 Visual — kontrolki działające w UI (stan aktualizowany), ale BEZ celu w podglądzie (brak formularza)

Poprawnie aktualizują stan edytora (potwierdzone w UI i reaktywnie w Advanced „Authoring summary"),
lecz **nie mają obserwowalnego efektu w podglądzie**, bo bez wybranego formularza nie ma pól,
przycisku submit ani gridu:

| Kontrolka | Obserwacja |
|---|---|
| **Submit label** | „Wyślij teraz" zapisane w stanie; przycisk submit renderuje się tylko przy `fields.length > 0`. |
| **Success message** | „Dziękujemy za audyt." zapisane; brak węzła `[data-form-embed-success]` bez formularza. |
| **Spacing** | Przeklikane wszystkie 5 wartości — patrz **I2** (zmienia tylko atrybut, brak realnego efektu). |
| **Button alignment** | Start/Center/End — stan aktualizowany; brak przycisku = brak celu. (3/3 w UI) |
| **Field gap** | Compact/Default/Spacious — stan aktualizowany; brak gridu pól = brak celu. (3/3 w UI) |
| **Label color** | Ustawiono `#777777`; brak etykiet pól = brak celu (stan/etykieta aktualizowane). |
| **Submit background** | Ustawiono `#884400`; brak przycisku submit = brak celu. |
| **Submit text color** | Ustawiono `#222222`; brak przycisku submit = brak celu. |
| **Show labels (switch)** | true→false→true (`aria-checked`). ✓ stan; brak pól = brak gwiazdki/etykiety do pokazania. |
| **Required indicator (switch)** | true→false→true. ✓ stan; brak pól = brak gwiazdki. |
| **Back label / Next label** | „Wstecz"/„Dalej" zapisane; przyciski nawigacji multi-step renderują się tylko dla formularza multi-step. |
| **Show progress (switch)** | true→false→true. ✓ stan; pasek postępu tylko przy multi-step. |
| **Loading label** | „Wysyłanie…" zapisane; widoczne wyłącznie w runtime po submisji. |
| **Success behavior** | Hide → Reset → Keep → Hide — combobox poprawnie cykluje; efekt wyłącznie runtime. (3/3 w UI) |

### 3.4 Saved progress TTL (clamp number) — przetestowane granice

| Wpisano | Wynik (po normalizacji) | Komentarz |
|---|---|---|
| `99` | `30` | ✓ clamp max 30 |
| `45` | `30` | ✓ clamp max 30 |
| `15` | `15` | ✓ wartość prawidłowa |
| `-5` | `1` | ✓ clamp min 1 |
| `0` | `7` | ⚠ **nie** clamp do 1, lecz fallback do 7 (`parseInt("0") || 7`) — patrz N2 |
| `7` | `7` | ✓ |

### 3.5 Advanced (read-only, reaktywny)

Wszystkie sekcje **read-only** i **reaktywne** wobec edycji in-memory. Zweryfikowano stan
pristine (po reloadzie) oraz po edycjach:

| Sekcja | Wynik testu |
|---|---|
| **Runtime diagnostics** | „Selected form: None", „Form detail status: Not selected", „Field count: No fields yet", „Field types: None", „Layout mode: Single page", „Save progress: Disabled", „Runtime warning: None". ✓ Trafne dla „brak formularza". |
| **Submission security** | „Submission routing: Not configured", „Submission access: Not available", „Nonce policy: Waiting for runtime projection", „Bot protection: Not configured", „Success behavior: Hide form" (reaktywne). ✓ |
| **Authoring summary** | **Reaktywne**: po edycjach „Copy: Custom title · custom description · success message configured", „Layout: Medium width · Start alignment · Default spacing", „Field display: Labels visible · Required marks visible", „Multi-step behavior: Progress visible · saved for 7 days", „After submit: Hide form". ✓ (uwagi do „spacing"/„overrides" — I2/I4). |
| **Contract summary** | Poprawny podział własności Wizard / Visual / Advanced. ✓ |
| **Block layout summary / Visibility summary** | Generyczne panele bloku, read-only („Content width default", „Padding Top MD bottom MD", „Margin None/None", „Shown on: Hidden on all devices"). ✓ (Visibility — patrz I9). |

### 3.6 Frontend (trasa publiczna, SSR)

| Aspekt | Wynik |
|---|---|
| Render | 1 instancja widgetu, wariant `standard`, defaulty zgodne z fixturą `{}` (width md → `max-w-lg`, `px-4 py-8`, border 1px, radius `rounded-lg`, input-size md). ✓ |
| Nagłówek | `<h2 id="…-title">Form</h2>` (domyślny tytuł, brak `formId`/`formName`). ✓ |
| A11y | `aria-labelledby` sekcji == id nagłówka (gdy tytuł niepusty); `aria-label` = null wtedy. ✓ |
| Stan pusty | „**Form unavailable (form_missing).**" (różny od admina — patrz I6). |
| Brak formularza | Brak `<form>`, **0 inputów, 0 skryptów** (runtime JS wstrzykiwany tylko przy `fields.length > 0`). ✓ Zgodne z kodem. |
| Konsola | **0 błędów, 0 ostrzeżeń**. ✓ |
| Mobile 375px | Brak poziomego scrolla (`bodyScrollW == windowW == 375`); karta `343px` (= 375 − 2×`px-4`). ✓ |

---

## 4. Spójność Admin ↔ Frontend

| Funkcjonalność | Admin Preview | Frontend (SSR) | Zgodność |
|---|---|---|---|
| Struktura sekcji / karty / nagłówka | ✓ ten sam renderer `FormEmbedBlock` | ✓ identycznie | ✓ |
| Domyślny tytuł „Form" + `aria-labelledby` | ✓ | ✓ | ✓ |
| Defaulty layout / style (`{}`) | ✓ (`px-4 py-8`, width md, radius md, border 1px) | ✓ identycznie | ✓ |
| Podwójna klasa `border` na karcie | ✓ obecna (`…border p-6 border rounded-lg`) | ✓ obecna | ✓ (obie — I5) |
| **Komunikat stanu pustego** | „No fields configured yet." | „Form unavailable (**form_missing**)." | ✗ **rozbieżność copy** (I6) |
| Moje edycje in-memory | widoczne w podglądzie | **NIE wyciekły** | ✓ (brak zapisu) |

**Wniosek historyczny:** renderer jest współdzielony — dla tej samej konfiguracji admin i SSR dają
identyczny wynik strukturalny. Przed TASK-343-14 różnica dotyczyła **komunikatu stanu pustego**:
front projektował `resolved.error = "form_missing"` i renderer pokazywał surowy kod, a admin
podgląd bez `resolved` pokazywał „No fields configured yet.". TASK-343-14 mapuje znane kody na
bezpieczne, user-facing public copy.

---

## 5. Co NIE DZIAŁA / wymaga uwagi (potwierdzone defekty UI/UX)

| # | Obserwacja | Klasyfikacja |
|---|---|---|
| **I2** | **Kontrolka „Spacing" jest de facto martwa w przepływie edytora.** Przeklikanie wszystkich 5 wartości (None…Extra spacious) zmienia **wyłącznie** atrybut `data-form-embed-spacing`; klasa sekcji pozostaje `px-4 py-8` (brak zmiany `py-*`). Realny pionowy odstęp pochodzi z osobnego pola **„Vertical padding" (`sectionPaddingY`)**, które po normalizacji **zawsze** ma jawną wartość i maskuje wartość pochodną od `spacing`. Advanced „Authoring summary" opisuje to jako „… spacing", co **myli**. | Martwy/mylący kontroler |
| **I3** | **Domyślne kolory CSS-variable są błędnie etykietowane jako „Saved custom color" już na świeżo załadowanym, nietkniętym widgecie (`data: {}`).** Po reloadzie 7 z 8 kontrolek (`Surface`, `Border color`, `Title color`, `Label color`, `Helper color`, `Submit background`, `Submit text color`) pokazuje „Saved custom color" + aktywny „Clear" + hint „A saved custom color is configured", mimo że użytkownik **niczego nie nadpisał**. Poprawnie etykietowany jest tylko `Background` („Transparent"). Przyczyna: host edytora hydratuje wartość defaultami widgetu, a `SharedColorControl` (bez `treatAsThemeDefaultValues`) traktuje każdą wartość nie-hex/nie-`transparent` (np. `var(--color-text)`) jako custom. | Mylące UI |
| **I4** | **Zawyżony licznik „saved color overrides".** Na **nietkniętym** widgecie Advanced „Authoring summary" pokazuje **„8 saved color overrides"** (zweryfikowane po reloadzie), choć użytkownik nie nadpisał żadnego koloru. `describeFormStyleOverrides` zlicza każdą niepustą wartość (w tym domyślne CSS-vary i `transparent`). Po wyczyszczeniu wszystkich 8 kolorów licznik nadal pokazuje **„6 saved color overrides"** (patrz N1 — Clear nie usuwa 6 z 8). | Mylące UI |
| **N1** | **„Clear" nie przywraca stanu „Theme default" dla 6 z 8 kolorów.** Dla `Border color`, `Title color`, `Label color`, `Helper color`, `Submit background`, `Submit text color` kliknięcie „Clear" **wizualnie** resetuje render do koloru motywu (np. border wraca do `rgb(29,23,15)`, tytuł do koloru tekstu), **ale** etykieta kontrolki pozostaje „Saved custom color", a przycisk „Clear" **dalej jest aktywny** — normalizacja (`resolveNonEmptyString`/`resolveOptionalString` w `normalizeFormEmbedData`) natychmiast re-hydratuje domyślny CSS-var jako jawną wartość. Tylko `Background` i `Surface` (ścieżka `resolveClearableStyleValue`) czyszczą się poprawnie (etykieta „Theme default", Clear [disabled]). Niespójność między 2 a 6 kontrolkami koloru. | Bug UI (Clear nieskuteczny w warstwie etykiety/stanu) |
| **I5** | **Nadmiarowa klasa obramowania.** Karta ma na stałe `border p-6` plus dynamiczną klasę `border-0`/`border`/`border-2`. Dla „Thin" w DOM `border` występuje **dwukrotnie** (`…border p-6 border rounded-lg`); dla „None" współistnieją `border` i `border-0` (computed `0px` — `border-0` wygrywa). **Funkcjonalnie poprawne**, code smell. | Code smell (bez wpływu na użytkownika) |
| **I6** | **Rozbieżność komunikatu stanu pustego Admin ↔ Frontend + ekspozycja surowego kodu błędu.** Front pokazuje **publicznemu** odbiorcy „Form unavailable (**form_missing**)." (surowy kod runtime), admin — „No fields configured yet.". Surowy `form_missing` nie jest przyjazną komunikacją dla użytkownika końcowego. | Niespójność UX + ekspozycja kodu |
| **I7** | **Pickery koloru bez pola hex.** Wszystkie 8 kontrolek ma `showValueInput={false}` → jedyną drogą jest wizualny `<input type="color">` (picker OS). Nie da się wpisać/wkleić hex z klawiatury. (W teście wartości ustawiano **programowo** setterem + zdarzeniami — handler React działa — ale realny użytkownik ma tylko picker.) | Nuta UX / dostępność |
| **N2** | **TTL = 0 nie jest clampowane do minimum (1), lecz cicho zamieniane na 7.** Wpisanie `0` daje wartość `7` (`Number.parseInt("0") || 7`), podczas gdy `-5` poprawnie → `1`, a `99`/`45` → `30`. Drobna niekonsekwencja walidacji granicy dolnej. | Drobny bug walidacji |
| **N3** | **„success message configured" mylące na pristine.** „Authoring summary → Copy" na nietkniętym widgecie pokazuje „… success message configured", bo domyślny `successMessage` („Thanks for your submission.") jest niepusty — sugeruje skonfigurowanie czegoś przez użytkownika, choć to default. (Tytuł/opis poprawnie raportują „Form title · form description".) | Drobna mylna etykieta |
| **I8** | **Sekcja „Multi-step navigation" zawsze widoczna w Visual**, mimo opisu „Controls shown only when the selected form resolves as multi-step." Bez formularza multi-step nie sposób potwierdzić warunkowego renderowania. | Nuta UX (niezweryfikowane warunkowanie) |
| **I9** | **„Device visibility / Visibility summary: Hidden on all devices"** dla pustej tablicy `visibility.devices`, choć widget renderuje się i w podglądzie, i na froncie. To **generyczny panel bloku**, nie specyficzny dla form-embed (puste = „wszystkie widoczne", a UI pokazuje „Hidden"). Przełączniki działają (Desktop on→off zweryfikowane). | Drobna nuta (panel generyczny) |
| **N4** | **„Add variant preset" jest bezczynne w tej fixturze** — kliknięcie nie otwiera dialogu, nie pokazuje toasta i nie dodaje karty wariantu (pozostaje 1 karta „Standard" [Selected]). Brak obserwowalnego efektu biznesowego dla pojedynczego wariantu. | Drobna nuta UX |

> **Status TASK-343-14 (2026-05-30):** I2/I3/I4/N1/I5/I6/N2/N3
> zamknięte w kodzie. `Spacing` aktualizuje teraz `sectionPaddingY`, domyślne
> tokeny kolorów są traktowane jako `Theme default`, `Clear` usuwa zapisane
> klucze kolorów, Advanced liczy tylko realne override'y, TTL `0` clampuje do
> `1`, publiczny render nie pokazuje surowego `form_missing`, a karta nie
> duplikuje klasy `border`. I8 ma poprawioną kopię sekcji multi-step:
> kontrolki są widoczne jako zapisane etykiety, które działają po wybraniu
> multi-step form. I7 pozostaje w `TASK-343-30`, I9 w `TASK-343-21`, a N4 jest
> świadomie odroczone jako produktowy brak dodatkowych presetów dla jedynego
> wariantu.

> **Status TASK-343-30 (2026-05-30):** I7 jest zamknięte w zakresie
> truthfulness: swatch-only pola nadal nie pokazują surowych pól hex, ale tokeny
> i fallbacki są opisane jako token/default/preview, a `Background` ma jawne
> `Transparent`/`returns to transparent background` copy zamiast generycznego
> resetu do motywu.

> Uwaga: **nie stwierdzono żadnego twardego buga renderera** ani błędu konsoli (admin i
> frontend = 0 błędów / 0 ostrzeżeń). Wszystkie kontrolki, które miały obserwowalny cel w tym
> stanie fixtury, aktualizowały podgląd na żywo. I1 oraz większość pozycji z 3.3 to brak
> możliwości weryfikacji w tym środowisku (brak formularza), a nie potwierdzone defekty.
> Historyczne I2/I3/I4/N1/I6 zostały domknięte w TASK-343-14.

---

## 6. Czego NIE DAŁO SIĘ przetestować (z dokładną przyczyną)

| Obszar | Dokładna kontrolka / funkcja | Przyczyna |
|---|---|---|
| **I1 — rdzeń** | Wybór zapisanego formularza (selektor „Saved form") | **Brak jakiegokolwiek formularza** — `GET /forms` → `200 []`; jedyna pozycja „No forms found" [disabled]. |
| Renderowanie pól | 13 typów (text, email, phone, date, time, number, range, rating, hidden, textarea, checkbox, select, radio) | Wymaga formularza z polami; `resolved.fields` puste. |
| Submisja | `POST /forms/:id/submissions`, nonce `__nl_form_nonce`, captcha `captchaToken`, komunikaty `[data-form-embed-success]`/`[data-form-embed-error]` | Brak formularza i runtime JS (wstrzykiwany tylko przy `fields.length > 0`). |
| Multi-step | grupowanie kroków, pasek postępu (`Show progress`), przyciski **Back/Next**, `stepTitles` | Wymaga formularza `layoutMode: multi_step`; niedostępny. |
| Style przycisku/pól | **Submit background**, **Submit text color**, **Input size** (realne inputy), **Field gap**, **Button alignment**, **Label color**, **Show labels**, **Required indicator** (gwiazdka) | Brak przycisku submit / pól / gridu w stanie pustym (zweryfikowano tylko aktualizację stanu/atrybutów). |
| Warunkowanie sekcji | Warunkowe ukrycie „Multi-step navigation" w Visual (I8) | Brak formularza multi-step do potwierdzenia warunku. |
| Hex z klawiatury | Wpisanie/wklejenie hex w którejkolwiek z 8 kontrolek koloru (I7) | `showValueInput={false}` — tylko picker OS (wartości ustawiano programowo). |
| Zapis / publikacja | `Save`/`Publish` | **Celowo niewykonane**, aby nie zmutować współdzielonej fixtury (`data` pozostało `{}`). |

---

## 7. UX / UI — nuty dodatkowe

- **Brak autozapisu** — potwierdzone dwukrotnie: po wszystkich edycjach in-memory `data` widgetu
  pozostał `{}`, a `updatedAt` bez zmian (`2026-05-24T10:52:02.234Z`). Wyjście/reload edytora z
  niezapisanymi zmianami wywołuje natywny dialog „leave site"; frontend audytowano w **osobnej
  karcie**, aby nie utracić stanu admina.
- **Normalizacja stylu po TASK-343-14** — Form Embed rozpoznaje własne domyślne tokeny kolorów
  jako `Theme default`, a wyczyszczone kolory pozostają bez zapisanych kluczy. Shared, pełna
  terminologia fallbacków i pickerów pozostaje w `TASK-343-30`.
- **Wizard świadomie minimalny** — jedyną zapisywalną kontrolką jest selektor formularza; reszta
  to read-only diagnostyka. Spójne z kontraktem.
- **Advanced uczciwie read-only** i reaktywny — dobre podsumowanie kontraktu i stanu, ale
  po TASK-343-14 nie dziedziczy historycznych tekstów I2 („spacing"), I4 („overrides") ani N3
  („success message configured" dla domyślnej wiadomości).
- **Pozytywy a11y (stan pusty):** `aria-labelledby` sekcji jest poprawnie wiązany z id nagłówka
  i pozostaje spójny przy zmianie poziomu nagłówka (H2→H3→H4). Atrybuty pól (`aria-required`,
  `aria-label`/`aria-labelledby`, `aria-describedby`, `name`, `id`) są w kodzie renderera, ale
  **niezweryfikowane na żywo** (brak pól).
- **Skala stylu**: poprawnie działają trzy „rodziny odstępów" (Side padding, Vertical padding),
  pięć szerokości, trzy/cztery skale (radius, border, title size/weight) — wszystkie deterministyczne
  i zgodne z mapami klas w `formEmbed.tsx`.

---

## 8. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie (wyczerpująco, asercja DOM):** logowanie, otwarcie fixtury, 3 tryby
edytora, oba przejścia (Wizard↔Visual), selektor formularza (pusty), warianty + „Add variant preset",
Content (4 pola), Layout (Alignment 3/3, Width 5/5, Spacing 5/5, Button alignment 3/3, Side padding
3/3, Vertical padding 5/5, Field gap 3/3), Field labels (2 switche on/off/on), Style (8 kolorów set+
Clear, Border width 3/3, Radius 4/4, Input size 4/4, Title size 3/3, Title weight 3/3, Heading level
3/3), Multi-step (Back/Next/Loading inputs, Show progress switch, TTL clamp 6 przypadków granicznych),
Submit behavior (Loading label, Success behavior 3/3), reaktywność wszystkich sekcji Advanced, render
SSR frontu, a11y nagłówka, konsola (admin + front = 0 błędów), responsywność 375px, brak autozapisu,
generyczne panele bloku (Block layout, Device visibility — toggle zweryfikowany).

**Nie przetestowano (świadomie / z powodu środowiska):** wybór formularza (brak formularzy),
renderowanie pól (13 typów), submisja, multi-step, pasek postępu, Back/Next, nonce, captcha,
runtime'owe komunikaty sukcesu/błędu, realny efekt submit-bg/submit-text/input-size/field-gap/
button-alignment/label-color/show-labels/required-indicator (brak pól/przycisku), warunkowe ukrycie
sekcji multi-step, wpisanie hex z klawiatury (picker OS), zapis/publikacja (ochrona współdzielonej
fixtury).

**Werdykt po TASK-343-14:** wszystko, co w tym stanie fixtury **miało obserwowalny cel**, działało
poprawnie i aktualizowało podgląd na żywo, a lokalne drift points I2/I3/I4/N1/I5/I6/N2/N3 zostały
zamknięte testami Vitest. Pozostałe ograniczenie środowiska to brak jakiegokolwiek formularza (I1),
przez co pełnej funkcji wyboru formularza, renderowania pól, submisji i multi-step runtime nadal nie
dało się zweryfikować w tej fixturze.

---

## 9. Statystyki

| Kategoria | Liczba |
|---|---|
| Kontrolki przeklikane przez wszystkie wartości (selecty) | 14 (~52 wartości) |
| Switche przetestowane on/off/on | 5 (3 form-embed + 2 device check) |
| Kontrolki koloru: set + Clear | 8 |
| Pola tekstowe / number | 7 + 1 (TTL: 6 przypadków granicznych) |
| Funkcje zweryfikowane jako działające z obserwowalnym celem (asercja DOM) | ~24 |
| Kontrolki działające w UI bez celu w podglądzie (brak formularza) | ~14 |
| Potwierdzone niuanse mylącego UI/UX zamknięte przez TASK-343-14 (I2, I3, I4, N1, I6, N2, N3) | 7 |
| Drobne nuty / code smell (I5 zamknięte; I7/I9 shared; I8 copy; N4 odroczone) | 5 |
| Twarde bugi renderera | 0 |
| Błędy / ostrzeżenia konsoli (admin + frontend) | 0 |
| Pozycje niezweryfikowane (brak formularza) | rdzeń: pola (13 typów) / submisja / multi-step / nonce / captcha |
