# RAPORT: Form Embed Widget — audyt bieżącego stanu (29-05-2026, v2)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend, z asercjami DOM na żywo
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-form-embed-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin:** „Contract Test - form-embed" (`fed7fa7d-b498-439c-858d-72ac0a89926f`)
> **Trasa publiczna:** `/ctr-form-embed-2305` (tytuł strony: `Contract Test - form-embed`)
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja `claude-29-05-form-embed-v2`). Weryfikacja opierała się na rzeczywistych
interakcjach z UI edytora (kliknięcia comboboxów, wypełnianie pól, przełączanie switchy,
zmiana kolorów) oraz na inspekcji DOM (`eval`) zarówno na żywym podglądzie w admin, jak i
na statycznym renderze SSR trasy publicznej. Stany comboboxów (Radix Select) zmieniano przez
klikanie triggera i wybór opcji z portalu. Natywne pickery kolorów sterowano programowo
(natywny setter `value` + zdarzenia `input`/`change`) — i takie zdarzenia **realnie**
trafiały do handlera React (potwierdzone zmianą tła karty w podglądzie).

**Najważniejsze ograniczenie środowiska (kluczowe dla całego raportu):**

> W tym środowisku **nie istnieje ani jeden zapisany formularz** — endpoint
> `/admin/api/forms` (przez `useForms` → `listForms()` → `GET /forms`) zwraca `200 []`
> (zweryfikowane na żywo fetchem z zalogowanej sesji). Selektor formularza w Wizardzie
> pokazuje wyłącznie wyłączoną pozycję „No forms found". Fixtura widgetu ma w bazie
> `data: {}` (czysty default, **bez `formId`**, `editor.wizardCompleted: true`,
> `visibility.devices: []`) — potwierdzone fetchem `/admin/api/pages/…`.
>
> W praktyce oznacza to, że **rdzenna funkcja widgetu — osadzenie konkretnego zapisanego
> formularza — nie może być zweryfikowana**: nie ma jak wybrać formularza, więc widget
> zawsze renderuje stan pusty. Niemożliwe do przetestowania pozostają: renderowanie pól,
> submisja, tryb wieloetapowy (multi-step), pasek postępu, nonce, captcha oraz komunikaty
> sukcesu/błędu runtime.

**Co faktycznie przetestowano (z asercjami DOM):**

- Logowanie do admina, otwarcie fixtury, odnalezienie widgetu na kanwie.
- Tryb **Wizard**: selektor formularza (pusta lista, jedyna pozycja „No forms found"
  disabled), sekcja „Setup diagnostics" (read-only), przejścia „Finish setup and open
  Visual" / „Run setup again".
- Tryb **Visual**: wariant (jedyny „Standard"), sekcje Content / Layout / Field labels /
  Style / Multi-step navigation / Submit behavior — kontrolki z obserwowalnym celem
  zweryfikowane przez asercję DOM podglądu; reszta zweryfikowana jako aktualizacja stanu UI.
- Tryb **Advanced**: Runtime diagnostics, Submission security, Authoring summary
  (reaktywne), Contract summary — wszystko read-only.
- **Frontend**: statyczny render SSR, stan pusty, semantyka a11y, konsola, responsywność 375px.
- Weryfikacja **braku autozapisu** (fixtura nietknięta po moich edycjach in-memory).
- Konsola admin i frontend: **0 błędów, 0 ostrzeżeń**.

**Czego NIE przetestowano (świadomie lub z powodu środowiska):**

- **Realnego wyboru formularza** — brak jakiegokolwiek zapisanego formularza (patrz wyżej).
- **Renderowania pól, submisji, multi-step, paska postępu, nonce, captcha, komunikatów
  sukcesu/błędu** — wymaga wybranego formularza, którego nie ma.
- **Zapisu / publikacji** — celowo nie zapisywano (`Save`/`Publish`), aby nie zmutować
  współdzielonej fixtury. Wszystkie edycje pozostały w pamięci edytora.
- **Realnego wpisania hex z klawiatury** w pickerze kolorów (kontrolki mają
  `showValueInput={false}`; wartości ustawiano programowo).
- Warunkowego ukrywania sekcji multi-step na froncie (brak formularza multi-step).
- Wszystkich wartości każdego comboboxa — testowano wartości reprezentatywne.

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja przez asercje DOM/`eval`.
Ewentualne nazwy zrzutów Playwright byłyby wyłącznie **lokalnymi etykietami** przechwyceń,
ignorowanymi przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**

- `core/widgets/core/formEmbed.tsx` — renderer, model danych, normalizacja, schemat, kontrakt edytora.
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` — współdzielona kontrolka koloru (źródło niuansu I3/I7).
- `core/admin/services/formsClient.ts` — klient listy formularzy (`GET /forms`).

---

## 1. Przegląd widgetu

**Typ:** `form-embed` (kategoria: forms)
**Warianty:** wyłącznie `standard` (jeden wariant; w Visual karta „Standard" + nieaktywny biznesowo przycisk „Add variant preset")
**Tryby edytora:** Wizard (jednorazowy setup — wybór formularza), Visual (codzienna edycja prezentacji), Advanced (diagnostyka read-only)

Widget służy do osadzenia **zapisanego formularza** (z modułu Forms) wraz z kontrolą
prezentacji: tytuł / opis / etykieta submit / komunikat sukcesu, layout (szerokość,
wyrównanie, paddingi, gap pól), styl (tła, obramowania, zaokrąglenie, rozmiar inputów,
kolory tytułu / etykiet / helpera / przycisku), widoczność etykiet i wskaźnika
wymagalności, nawigacja multi-step oraz zachowanie po submisji. Renderer w runtime łączy
się z formularzem przez `POST /forms/:id/submissions` i wstrzykuje runtime JS **tylko gdy
formularz ma pola** (`fields.length > 0`).

**Stan fixtury w chwili testu:** bare widget — `data: {}`. Brak `formId`, brak nadpisań.
Renderer stosuje defaulty (tytuł „Form", submit „Send message", width `md`, spacing `md`,
border `1`, radius `md`). Bez wybranego formularza widget pokazuje stan pusty.

---

## 2. Model danych i kontrakt edytora (z kodu)

| Sekcja | Pola | Tryb (writable) |
|--------|------|-----------------|
| **formId** | id zapisanego formularza | Wizard |
| **content** | `title`, `description`, `submitLabel`, `successMessage` | Visual |
| **layout** | `alignment`, `width` (none–xl), `spacing` (none–xl), `buttonAlignment`, `sectionPaddingX` (sm/md/lg), `sectionPaddingY` (none–xl), `fieldGap` (sm/md/lg), `headingLevel` (2/3/4) | Visual |
| **fields** | `showLabels`, `showRequiredIndicator` | Visual |
| **style** | `background`, `surface`, `borderColor`, `borderWidth` (0/1/2), `radius`, `inputSize`, `titleColor`, `titleSize`, `titleWeight`, `labelColor`, `helperColor`, `submitBackground`, `submitTextColor` | Visual |
| **navigation** | `backLabel`, `nextLabel`, `showProgress`, `savedProgressTtlDays` (1–30) | Visual |
| **submitBehavior** | `loadingLabel`, `successBehavior` (hide/reset/keep) | Visual |
| **resolved** | `formName`, `status`, `fields[]`, `settings.layoutMode`, `saveProgress`, `submissionAccess`, `submissionNonce`, `botProtection`, `error` | Advanced / Wizard (read-only) |

Podział własności (zgodny z „Contract summary" w Advanced): **Wizard** — wybór formularza +
diagnostyka pierwszego setupu. **Visual** — copy, layout, widoczność etykiet, styl,
nawigacja, zachowanie submit. **Advanced** — wyłącznie read-only podsumowania (runtime,
security, authoring, kontrakt).

---

## 3. Co DZIAŁA (zweryfikowane na żywo asercją DOM)

### 3.1 Wizard

| Funkcja | Wynik testu |
|---------|-------------|
| **Selektor formularza** | Combobox „Saved form" otwiera się; jedyna pozycja to **„No forms found" [disabled]**. ✓ Poprawny stan dla pustego środowiska. |
| **Setup diagnostics (read-only)** | „Please select a form to preview field coverage, runtime status, and submit behavior." przy braku formularza. ✓ |
| **Przejście Wizard → Visual** | „Finish setup and open Visual" przełącza na widok „Setup complete" z zakładką Visual zaznaczoną. ✓ |
| **Przejście Visual → Wizard** | „Run setup again" wraca do Wizarda z selektorem formularza. ✓ |
| **Live preview w Wizard** | Region „Live preview" odzwierciedla shared renderer (stan pusty). ✓ |

### 3.2 Visual — kontrolki z obserwowalnym efektem w podglądzie

| Funkcja | Akcja → Wynik (asercja DOM) |
|---------|------------------------------|
| **Title** | „Kontakt — audyt v2" → zmienia treść `<hN>` natychmiast; `aria-labelledby` nadal wskazuje id nagłówka. ✓ |
| **Description** | tekst → renderuje `<p>` pod tytułem. ✓ |
| **Width** | „Extra large" → `data-form-embed-width="xl"` + klasa `max-w-2xl`. ✓ |
| **Alignment** | „Center" → `items-center text-center` na kontenerze. ✓ |
| **Heading level** | „H4" → znacznik `<h2>` → `<h4>`, `aria-labelledby` zachowane (id == labelledby). ✓ |
| **Title size** | „Large" → `text-2xl` na nagłówku. ✓ |
| **Title weight** | „Bold" → `font-bold` na nagłówku (łącznie `text-2xl font-bold`). ✓ |
| **Border width** | „None" → `border-0`, computed `border-top-width: 0px`. ✓ (mimo nadmiarowej klasy `border` — patrz I5) |
| **Radius** | „Large" → `data-form-embed-radius="lg"`, klasa `rounded-xl`. ✓ |
| **Surface (kolor)** | Ustawienie `#00ff00` przez swatch → tło karty `rgb(0,255,0)`. ✓ (handler React reaguje) |
| **Clear (Surface)** | Klik „Clear" → tło karty wraca do `rgba(0,0,0,0)` (theme default), etykieta zmienia się na **„Theme default"**, a przycisk „Clear" staje się **[disabled]**. ✓ Reset działa. |
| **TTL (savedProgressTtlDays)** | Wpisanie `99` → przycięte do `30` (max). ✓ Clamp działa (min 1 / max 30). |
| **Show labels (toggle)** | Przełącznik flipuje `aria-checked`/`data-state` z `checked` → `unchecked`. ✓ (stan UI aktualizowany) |

### 3.3 Visual — kontrolki działające w UI, ale BEZ celu w podglądzie (brak formularza)

Te kontrolki poprawnie aktualizują stan edytora (i są widoczne w Advanced „Authoring
summary"), ale **nie mają obserwowalnego efektu w podglądzie**, bo bez wybranego formularza
nie renderuje się ani formularz, ani pola, ani przycisk submit:

| Funkcja | Obserwacja |
|---------|------------|
| **Submit label** | Tekst zapisywany; przycisk submit renderuje się tylko gdy `fields.length > 0`. |
| **Success message** | Zapisywany; `<p data-form-embed-success>` ukryty dopóki nie ma submisji. |
| **Button alignment / Field gap** | Dotyczą kontenera przycisku / grida pól — brak pól = brak celu. |
| **Side padding / Vertical padding** | Sterują `px-*`/`py-*` sekcji — działają na poziomie sekcji (te DZIAŁAJĄ, ale nie zmieniałem ich w tej sesji; default `px-4 py-8`). |
| **Input size** | Dotyczy inputów — brak inputów = brak celu. |
| **Label color / Helper color** | Dotyczą etykiet / helperów pól — brak pól = brak celu. |
| **Submit background / Submit text color** | Dotyczą przycisku submit — nie renderuje się. |
| **Required indicator (toggle)** | Switch przełącza się w UI, ale brak pól = brak gwiazdki do pokazania. |
| **Multi-step: Back/Next label, Show progress** | Dotyczą trybu multi-step — brak formularza = brak celu. |
| **Submit behavior: Success behavior** | Combobox zmienia wartość; efekt wyłącznie w runtime po submisji. |

### 3.4 Advanced (read-only, reaktywny)

Wszystkie sekcje są **read-only** i **reaktywne** wobec moich edycji in-memory:

| Sekcja | Wynik testu |
|--------|-------------|
| **Runtime diagnostics** | „Selected form: None", „Field count: No fields yet", „Field types: None", „Layout mode: Single page", „Save progress: Disabled", „Runtime warning: None". ✓ Trafne dla stanu „brak formularza". |
| **Submission security** | „Submission routing: Not configured", „Submission access: Not available", „Nonce policy: Waiting for runtime projection", „Bot protection: Not configured", „Success behavior: Hide form". ✓ |
| **Authoring summary** | **Reaktywne**: „Copy: Custom title · custom description · success message configured", „Layout: Extra large width · Center alignment · **Extra spacious spacing**", „Field display: Labels hidden · Required marks visible", „Style: **7 saved color overrides** · Large corners · Medium inputs", „Multi-step: Progress visible · saved for **30** days", „After submit: Hide form". ✓ (uwagi do „spacing" i „overrides" — patrz I2/I4) |
| **Contract summary** | Poprawny podział własności Wizard / Visual / Advanced. ✓ |
| **Jawnie read-only** | Brak pól zapisywalnych w całym Advanced. ✓ Zgodne z kontraktem. |

### 3.5 Frontend (trasa publiczna, SSR)

| Aspekt | Wynik |
|--------|-------|
| Render | 1 instancja widgetu, wariant `standard`, zgodny z zapisaną fixturą `{}` (defaulty: width `md`, spacing `md`, radius `md`, border `1`, sekcja `px-4 py-8`). ✓ |
| Nagłówek | `<h2 id="…-title">Form</h2>` (domyślny tytuł, brak `formId`/`formName`). ✓ |
| A11y | `aria-labelledby` sekcji wskazuje id nagłówka (gdy tytuł niepusty); `aria-label` = null wtedy. ✓ |
| Stan pusty | „**Form unavailable (form_missing).**" (różny od admina — patrz I6). |
| Brak formularza | Brak `<form>`, 0 inputów, **0 skryptów** (runtime JS wstrzykiwany tylko przy `fields.length > 0`). ✓ Spójne z kodem. |
| Konsola | 0 błędów, 0 ostrzeżeń. ✓ |
| Mobile 375px | Brak poziomego scrolla (`bodyScrollW == windowW == 375`); karta `343px` (= 375 − 2×`px-4`). ✓ |

---

## 4. Spójność Admin ↔ Frontend

| Funkcjonalność | Admin Preview | Frontend (SSR) | Zgodność |
|----------------|---------------|----------------|----------|
| Struktura sekcji / karty / nagłówka | ✓ ten sam renderer `FormEmbedBlock` | ✓ identycznie | ✓ |
| Domyślny tytuł „Form" + `aria-labelledby` | ✓ | ✓ | ✓ |
| Defaulty layout / style (zapisane `{}`) | ✓ (`px-4 py-8`, width md, radius md) | ✓ identycznie | ✓ |
| Nadmiarowa klasa `border` na karcie | ✓ obecna | ✓ obecna | ✓ (obie buggy — I5) |
| **Komunikat stanu pustego** | „No fields configured yet." | „Form unavailable (**form_missing**)." | ✗ **rozbieżność copy** (I6) |
| Moje edycje in-memory (title, kolory, layout) | widoczne w podglądzie | **NIE wyciekły** | ✓ (brak zapisu) |

**Wniosek:** renderer jest współdzielony — dla tej samej konfiguracji admin i SSR dają
identyczny wynik strukturalny. Jedyna różnica to **komunikat stanu pustego**: na froncie
runtime projektuje `resolved.error = "form_missing"` (i renderer pokazuje surowy kod błędu),
podczas gdy w admin podglądzie `resolved` jest `undefined`, więc renderer pada na ścieżkę
„No fields configured yet.". Moje edycje testowe były wyłącznie w pamięci i **nie wpłynęły na
publikację** (potwierdzone: `data` widgetu nadal `{}`, `updatedAt` = `2026-05-24T10:52:02Z`,
niezmienione).

---

## 5. Co NIE działa / wymaga uwagi

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| I1 | **Brak jakiegokolwiek zapisanego formularza** w środowisku (`GET /forms` → `[]`). Selektor w Wizardzie ma tylko wyłączoną pozycję „No forms found". Rdzennej funkcji widgetu (osadzenie formularza) **nie da się skonfigurować ani przetestować**. | Ograniczenie środowiska (blokujące) |
| I2 | **Kontrolka „Spacing" jest de facto martwa/dekoracyjna.** Zmiana „Spacing" na „Extra spacious" zmienia wyłącznie atrybut `data-form-embed-spacing="xl"`; klasa sekcji pozostaje `px-4 py-8` (zweryfikowane: brak zmiany `py-*`). Realny padding (`py-*`) i gap pól pochodzą z osobnych pól `sectionPaddingY`/`fieldGap`, które po normalizacji **zawsze** mają jawne wartości i nadpisują wartość pochodną od `spacing`. Jednocześnie Advanced „Authoring summary" opisuje tę wartość jako „… spacing" („Extra spacious spacing"), co **myli** — sugeruje efekt, którego nie ma. | Mylący/martwy kontroler + mylące summary |
| I3 | **Domyślne kolory CSS-variable są błędnie etykietowane jako „Saved custom color" już przy załadowaniu (bez żadnej edycji).** Na świeżo otwartym widgecie `data: {}` Style pokazuje „Saved custom color" + aktywny „Clear" + hint „A saved custom color is configured" dla: `surface`, `borderColor`, `titleColor`, `labelColor`, `helperColor`, `submitBackground`, `submitTextColor` (7 kontrolek), mimo że użytkownik **niczego nie nadpisał**. Tylko `background` (`transparent`) jest etykietowany poprawnie („Transparent"). Po kliknięciu „Clear" etykieta zmienia się na poprawne **„Theme default"** (zweryfikowane na `surface`). Przyczyna: edytor hydratuje wartością z defaultów widgetu, a `SharedColorControl` (z `form-embed` bez `treatAsThemeDefaultValues`) traktuje każdą wartość nie-hex/nie-`transparent` jako custom. | Mylące UI |
| I4 | **Zawyżony licznik „saved color overrides".** Advanced „Style" summary pokazał „**7 saved color overrides**" — i to po tym, jak wyczyściłem tylko `surface` (przed edycją liczyłby 8). Licznik zlicza również domyślne kolory CSS-variable jako nadpisania. Ta sama przyczyna co I3 (`describeFormStyleOverrides` liczy każdą niepustą wartość). | Mylące UI |
| I5 | **Nadmiarowa klasa obramowania.** Karta ma na stałe `border p-6` plus dynamiczną klasę `border-0`/`border`/`border-2`. Dla „None" w DOM współistnieją `border` i `border-0` (`...border p-6 border-0 rounded-…`), ale computed `border-top-width` = `0px` (`border-0` wygrywa). Dla domyślnego „Thin" w DOM widać `border` dwukrotnie. **Funkcjonalnie działa**, pozostaje code smell. | Code smell (bez wpływu na użytkownika) |
| I6 | **Rozbieżność komunikatu stanu pustego Admin ↔ Frontend i ekspozycja surowego kodu błędu.** Front pokazuje **publicznemu** odbiorcy „Form unavailable (**form_missing**)." (surowy kod runtime), admin — „No fields configured yet.". Surowy kod `form_missing` nie jest przyjazną komunikacją dla końcowego użytkownika. | Niespójność UX + polish (publiczna ekspozycja kodu) |
| I7 | **Natywny picker koloru bez pola hex.** Wszystkie kontrolki koloru mają `showValueInput={false}` → jedyną drogą jest wizualny `<input type="color">` (picker OS); nie da się wpisać/wkleić hex z klawiatury. (Wartości udało się ustawić **programowo** setterem + zdarzeniami — handler React działa — ale realny użytkownik ma tylko picker.) | Nuta UX / dostępność |
| I8 | **Sekcja „Multi-step navigation" zawsze widoczna w Visual**, mimo że jej własny opis brzmi „Controls shown only when the selected form resolves as multi-step." Bez wybranego formularza nie sposób potwierdzić, czy faktycznie warunkowo renderuje się tylko dla multi-step. Analogia do `U1` z Contact. | Nuta UX edytora (niezweryfikowane warunkowanie) |
| I9 | **„Device visibility: Hidden" na wszystkich urządzeniach** dla `visibility.devices: []`, choć widget renderuje się i w podglądzie, i na froncie. To **generyczny panel bloku** (Block layout / Device visibility), nie specyficzny dla form-embed — prawdopodobnie mylna etykieta pustej tablicy urządzeń (puste = „wszystkie widoczne", a UI pokazuje przełączniki jako „Hidden"). | Drobna nuta (panel generyczny) |

> Uwaga: nie stwierdzono **żadnego twardego buga renderera** ani błędu konsoli (admin i
> frontend = 0 błędów / 0 ostrzeżeń). Wszystkie kontrolki edytora, które miały obserwowalny
> cel w tym stanie fixtury, aktualizowały podgląd na żywo. Pozycja I1 oraz większość z 3.3 to
> brak możliwości weryfikacji w tym środowisku (brak formularza), a nie potwierdzone defekty.
> I2/I3/I4/I6 to realne niuanse mylącego UI/UX.

---

## 6. UX / UI — nuty dodatkowe

- **Brak autozapisu** — potwierdzone: po wszystkich moich edycjach in-memory (title,
  description, width, alignment, spacing, heading, title size/weight, border, radius,
  surface color + clear, TTL, show-labels) `data` widgetu pozostał `{}`, a `updatedAt`
  bez zmian (`2026-05-24T10:52:02Z`). Wyjście z edytora z niezapisanymi zmianami wywołuje
  natywny dialog „leave site" — frontend otwarto w **osobnej karcie**, aby uniknąć utraty
  stanu admina.
- **Normalizacja wstrzykuje defaulty stylu.** Edytor hydratuje wartością z defaultów widgetu,
  więc obiekt `style` w edytorze jest pełny (kolory CSS-variable). To źródło I3/I4. Gdyby
  zapisać widget po jakiejkolwiek edycji, payload przestałby być `{}` i zawierałby pełny
  `style` z defaultami (zamiana „theme default" na jawnie zapisane wartości + bloat payloadu).
  **Nie potwierdzone zapisem** (celowo nie zapisywałem) — wniosek z analizy `normalize` i
  obserwacji etykiet w UI.
- **Wizard świadomie minimalny** — jedyną zapisywalną kontrolką jest selektor formularza;
  reszta to read-only diagnostyka. Spójne z kontraktem.
- **Advanced uczciwie read-only** i reaktywny — dobre podsumowanie kontraktu i stanu, ale
  dziedziczy mylące teksty I2 („spacing") i I4 („overrides").
- **Pozytywy a11y (w stanie pustym):** `aria-labelledby` sekcji jest poprawnie wiązany z id
  nagłówka, gdy tytuł niepusty, i pozostaje spójny przy zmianie poziomu nagłówka (H2→H4).
  Atrybuty pól (`aria-required`, `aria-label`/`aria-labelledby`, `aria-describedby`, `name`,
  `id`) są obecne w kodzie renderera, ale **niezweryfikowane na żywo** (brak pól do wyrenderowania).
- **„Add variant preset"** w Visual — przycisk obecny przy jedynym wariancie „Standard";
  jego biznesowy skutek nie był testowany (poza zakresem — pojedynczy wariant).

---

## 7. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie z asercją DOM:** logowanie, otwarcie fixtury, 3 tryby edytora,
przejścia trybów (Wizard↔Visual), selektor formularza (pusty), Content (title/description),
Layout (width/alignment/spacing), Style (heading level/title size/title weight/border
width/radius/surface color/clear), Field labels (show-labels toggle), Multi-step navigation
(clamp TTL), reaktywność wszystkich sekcji Advanced, render SSR frontu, a11y nagłówka,
konsola (admin + front = 0 błędów), responsywność 375px, brak autozapisu.

**Nie przetestowano (świadomie / z powodu środowiska):** wybór formularza (brak formularzy),
renderowanie pól, submisja, multi-step, pasek postępu, nonce, captcha, komunikaty sukcesu/
błędu runtime, zapis/publikacja (ochrona współdzielonej fixtury), realne wpisanie hex w
pickerze (natywny picker OS), warunkowe ukrywanie sekcji multi-step na froncie.

**Werdykt szczerości:** wszystko, co w tym stanie fixtury **miało obserwowalny cel**, działało
poprawnie i aktualizowało podgląd na żywo (tytuł, opis, szerokość, wyrównanie, poziom/rozmiar/
grubość nagłówka, kolory karty, grubość/zaokrąglenie obramowania, clamp TTL, przełączniki,
Clear). Nie znaleziono twardych bugów renderera ani błędów konsoli. Główne zastrzeżenia to
**mylące UI** wokół etykietowania kolorów (I3/I4), **martwa kontrolka Spacing** (I2),
**rozbieżność komunikatu stanu pustego admin↔front z ekspozycją surowego kodu błędu** (I6)
oraz **blokujące ograniczenie środowiska** — brak jakiegokolwiek formularza (I1), przez co
rdzennej funkcji widgetu nie dało się zweryfikować.

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Funkcje zweryfikowane jako działające (obserwowalny cel, asercja DOM) | ~14 |
| Kontrolki działające w UI bez celu w podglądzie (brak formularza) | ~10 |
| Pozycje niezweryfikowane (ograniczenie środowiska — brak formularza) | rdzeń: pola / submisja / multi-step / nonce / captcha |
| Mylące UI / UX (I2, I3, I4, I6) | 4 |
| Drobne nuty / code smell (I5, I7, I8, I9) | 4 |
| Twarde bugi renderera | 0 |
| Błędy / ostrzeżenia konsoli (admin + frontend) | 0 |
