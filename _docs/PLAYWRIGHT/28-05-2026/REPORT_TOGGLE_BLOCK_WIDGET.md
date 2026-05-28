# RAPORT: Toggle Block Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-toggle-block` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/12d1d6fb-2aeb-46db-8775-088e87d8b70b` (strona „Contract Test - toggle-block", status `Draft`)
> **Fixture public:** http://localhost:3000/test-toggle-block-0516
> **Pliki źródłowe:** `core/widgets/core/toggleBlock.tsx` (renderer + normalizacja + runtime script) · `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-coderso-toggle-*`, klasy Tailwind,
> `getComputedStyle`, ARIA), a nie tylko zliczeniem widocznych sekcji. Sekcje 4–7
> jasno oddzielają: co działa, co nie działa, co faktycznie przetestowano oraz
> czego NIE testowano.

> Uwaga o screenshotach: pliki PNG wspomniane w sekcji 10 są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowanym
> przez Git). Nie są wymaganym evidence w repo i nie zostały dołączone do żadnego
> pliku źródłowego.

---

## 1. Przegląd widgetu

**Typ:** `toggle-block` · **Kategoria:** `layout` · **Opis:** „Switch between two alternate content panes."

**Warianty:** `switch` (domyślny — kompaktowy segmentowy przełącznik, pigułki `rounded-full`), `cards` (większe karty selektora `rounded-xl` z mocniejszą oprawą paneli i siatką `sm:grid-cols-2`).

**Model danych (`ToggleBlockData`):**

| Sekcja | Pola |
|--------|------|
| **labels** | `primary`, `secondary`, `helper` (clearable), `ariaLabel`, `selectedSuffix` |
| **options** | `defaultState` (primary/secondary), `motion` (none/fade/slide) |
| **style** | `surfaceColor`, `borderColor`, `accentColor`, `accentContrastColor` (wszystkie clearable) + `panes.{primary,secondary}` z polami `surface` (default/soft/contrast), `padding` (compact/comfortable/spacious), `radius` (sm/md/lg), `borderEmphasis` (subtle/strong) |

**Sloty:** dwa **stałe** sloty — `primary` („Primary Pane") i `secondary` („Secondary Pane"). To widget z założenia ograniczony do dwóch paneli (sam edytor o tym informuje: „Use Tabs or a future task for 3+ views"). Sloty NIE są repeatable (inaczej niż w Tabs).

**Renderowanie:** kontener `[data-coderso-toggle-block='1']`, wewnątrz `role=radiogroup` z dwoma `role=radio`, ukryty `aria-live=polite` status (sr-only), opcjonalny tekst helper i dwa panele `role=region`. Interaktywność na froncie zapewnia wstrzykiwany skrypt runtime (obsługa myszy + klawiatury). **W trybie admin (canvas/preview) skrypt runtime NIE jest wstrzykiwany** (patrz 6 i 8).

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej stronie ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — dostaje się do niego przyciskiem **„Run setup again"** (po zakończeniu setupu panel pokazuje komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. Jest to ten sam wzorzec co w widgecie Tabs.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | **Wyłącznie read-only.** Jedna sekcja „Step 1: Variant" z pojedynczym wierszem podsumowania „Toggle surface" (Switch/Cards) + statyczna notka „Wizard is one-time starter setup…" + własny panel „Live preview". **Brak jakichkolwiek edytowalnych kontrolek.** |
| **Visual** | zakładka „Visual" | 7 sekcji widgetowych: Variant, Labels, Experience, Accessibility, Theme, Pane cards, Pane authoring. Dodatkowo współdzielone sekcje wrappera: Structure (sloty), Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 3 sekcje read-only widgetu: Runtime summary, Style diagnostics, Support summary + współdzielone Block layout summary, Visibility summary. Brak edytowalnych kontrolek. |

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie poniższe interakcje wykonano w sesji `claude-28-05-toggle-block` i zweryfikowano inspekcją DOM:

- **Wizard:** otwarcie przez „Run setup again", odczyt podsumowania wariantu i notki, test interaktywności panelu „Live preview" (klik „View B"), powrót przez „Finish setup and open Visual".
- **Visual / Variant:** przełączenie `switch → cards → switch` (inspekcja klas kontenera, grupy triggerów, panelu).
- **Visual / Labels:** edycja Primary („Miesięcznie"), Secondary („Rocznie"), Helper („Wybierz okres rozliczeniowy."), przycisk „Clear" przy Helper.
- **Visual / Experience:** zmiana Default state na „Secondary pane", zmiana Motion na „Slide".
- **Visual / Accessibility:** edycja „Toggle group label" („Przełącznik cennika") i „Selected announcement" („aktywne").
- **Visual / Theme:** ustawienie Surface (#fef9c3), Border (#2563eb), Accent (#ff0000), Accent contrast (#00ff00 oraz #ffffff); obserwacja stanu przycisków „Clear".
- **Visual / Pane cards:** dla panelu Secondary — Border emphasis „Strong", Padding „Spacious", Surface „Contrast surface", Radius „Large".
- **Visual / Pane authoring:** weryfikacja, że podsumowanie odzwierciedla edytowane etykiety.
- **Advanced:** odczyt wszystkich sekcji podsumowań i porównanie z edycjami z Visual.
- **Admin canvas:** test interaktywności podglądu (próba kliknięcia/`.click()` triggera, sprawdzenie `data-coderso-toggle-bound`).
- **Frontend (public):** render początkowy, liczba instancji, przełączanie myszą, nawigacja klawiaturą (ArrowRight/Left/Down/Up/Home/End), atrybuty ARIA, niezależność dwóch instancji, kontrast aktywnego triggera (`getComputedStyle`), brak wycieku placeholdera, brak błędów konsoli, brak overflow na 375 px.

---

## 4. Co DZIAŁA

### 4.1 Wizard

- **Otwarcie/zamknięcie trybu** przez „Run setup again" / „Finish setup and open Visual" działa.
- **Read-only podsumowanie wariantu** („Toggle surface: Switch") jest poprawne.
- **Live preview** renderuje widget przez współdzielony renderer i odzwierciedla zapisany stan.

### 4.2 Visual — wszystkie przetestowane kontrolki działają i aktualizują podgląd na żywo

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Karty wariantu | switch ↔ cards | `data-coderso-toggle-variant` + klasy: cards→`rounded-2xl p-5 shadow-sm`, grupa triggerów→`grid grid-cols-1 gap-3 sm:grid-cols-2`, trigger→styl kart; switch→`rounded-xl p-4`, grupa→`flex flex-wrap`. ✓ |
| Primary / Secondary label | „Miesięcznie" / „Rocznie" | Etykiety triggerów i `data-coderso-toggle-status-label` aktualizują się natychmiast. ✓ |
| Helper text | „Wybierz okres rozliczeniowy." | `<p>` helper aktualizuje się; pusta wartość ukrywa `<p>` (po „Clear" element znika z DOM). ✓ |
| Default state | Secondary | `data-coderso-toggle-state=secondary`, aktywny trigger „Rocznie" (`aria-checked=true`, `tabindex=0`), panel primary `hidden`, panel secondary widoczny, status „Rocznie selected", notka „Secondary pane opens first… Rocznie." ✓ |
| Motion | Slide | `data-coderso-toggle-motion=slide` na kontenerze i panelu; aktywny panel z klasami `motion-safe:animate-in … slide-in-from-bottom-2 … motion-reduce:animate-none`. ✓ |
| Toggle group label | „Przełącznik cennika" | `radiogroup[aria-label]` aktualizuje się. ✓ |
| Selected announcement | „aktywne" | `data-coderso-toggle-selected-suffix` + tekst sr-only statusu → „Rocznie aktywne". ✓ |
| Surface color | #fef9c3 | `background-color` kontenera = rgb(254,249,195). ✓ |
| Border color | #2563eb | `border-color` kontenera ORAZ paneli = rgb(37,99,235). ✓ |
| Accent color | #ff0000 | `--nextless-toggle-accent` = #ff0000; tło aktywnego triggera = rgb(255,0,0). ✓ (ale patrz 5 — efekt uboczny na tekst) |
| Accent contrast color | #00ff00 | `--nextless-toggle-accent-contrast` = #00ff00; przycisk „Clear" przechodzi w stan aktywny. Kontrolka **wpina się** poprawnie do stanu. ✓ (ale nie ma wpływu na render aktywnego triggera — patrz 5) |
| Pane card — Border emphasis | Secondary = Strong | panel → `shadow-sm`, `border-width: 2px` (subtle=1px). ✓ |
| Pane card — Padding | Secondary = Spacious | panel → `p-6` (comfortable=`p-4`). ✓ |
| Pane card — Surface | Secondary = Contrast surface | panel → `bg-[var(--color-surface)] shadow-sm`. ✓ |
| Pane card — Radius | Secondary = Large | panel → `rounded-xl` (medium=`rounded-lg`). ✓ |
| Pane authoring (podsumowanie) | po edycji etykiet | „Add widgets to the **Miesięcznie** and **Rocznie** panes…" — aktualizuje się na żywo. ✓ |

**Spójność przycisków „Clear" w kolorach (pozytyw):** wszystkie cztery pola (Surface, Border, Accent, Accent contrast) mają „Clear", który jest **wyłączony** gdy wartość = motyw domyślny i **włącza się** po ustawieniu własnego koloru. Jest to bardziej spójne niż w Contact/Tabs (gdzie część kolorów nie miała „Clear").

**Sekcja „Structure" (współdzielony wrapper):** poprawnie pokazuje dwa **stałe** sloty „Primary Pane slot" / „Secondary Pane slot", każdy „0 items", przyciski „Move up/Move down" wyłączone. Potwierdza, że Toggle Block to widget o stałych dwóch panelach (brak „Add panel").

### 4.3 Advanced — w 100% read-only i wiernie odzwierciedla stan z Visual

Po moich edycjach w Visual sekcje pokazały m.in.:

- **Runtime summary:** Variant „Switch", Opening pane „Rocznie (secondary)", Motion „Slide", Pane labels „Miesięcznie / Rocznie", Helper copy „Hidden" (poprawnie po wyczyszczeniu helpera), Accessibility announcement „Przełącznik cennika · suffix: aktywne".
- **Style diagnostics:** Surface „#fef9c3", Border „#2563eb", Accent „#ff0000", Accent contrast „#00ff00", Primary pane card „Surface: Inherited · Padding: Comfortable · Radius: Medium · Border: Subtle", Secondary pane card „Surface: Contrast surface · Padding: Spacious · Radius: Large · Border: Strong". Pełna zgodność z edycjami.
- **Support summary:** „Fixed two-pane widget: primary and secondary slots" oraz opis kontraktu „Wizard seeds setup, Visual owns daily editing, Advanced is read-only." (statyczne).

### 4.4 Frontend (public) — interaktywność i dostępność

Strona `/test-toggle-block-0516` zwraca treść i renderuje **dwie niezależne instancje** Toggle Block:

- **Instancja #0** — wariant `cards`, etykiety „Primary Tab" / „Secondary Tab", zapisany accent = niebieski.
- **Instancja #1** — wariant `switch`, etykiety „View A" / „View B".

Potwierdzone zachowania:

- **Runtime bound** (`data-coderso-toggle-bound=true`) dla obu instancji; jeden współdzielony skrypt runtime w DOM.
- **Przełączanie myszą:** klik triggera → zmiana `data-coderso-toggle-state`, `data-state`, `aria-checked`, `tabindex` (aktywny `0`, nieaktywny `-1`), `hidden` na panelach, aktualizacja statusu sr-only. ✓
- **Nawigacja klawiaturą:** `ArrowRight`/`ArrowDown` = następny, `ArrowLeft`/`ArrowUp` = poprzedni, `Home` = pierwszy, `End` = ostatni — wszystkie działają i jednocześnie przenoszą focus oraz aktywują (wzorzec „automatic activation"). ✓
- **Niezależność instancji:** przełączenie instancji #1 na secondary nie zmienia stanu instancji #0. ✓
- **Dostępność:** `role=radiogroup` + `aria-label`; każdy `role=radio` ma `aria-checked`, roving `tabindex`, `aria-controls` wskazujący panel; każdy panel `role=region` ma `aria-labelledby` wskazujący trigger; status `aria-live=polite` aktualizuje się. ✓
- **Brak wycieku placeholdera:** panele są puste; tekst „Use the page builder to add widgets…" **nie** pojawia się na froncie (renderowany tylko w trybie edytora). ✓
- **Konsola:** 0 błędów, 0 ostrzeżeń.
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); wariant cards stackuje się do jednej kolumny poniżej breakpointu `sm`. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Etykieta aktywnego triggera jest niewidoczna przy własnym Accent color (BŁĄD renderera, widoczny na żywym froncie)** | Renderer / Theme | Renderer nakłada inline `style={{ color: style.accentColor }}` na **każdy** trigger. Aktywny trigger ma jednocześnie tło `var(--nextless-toggle-accent)` (= accentColor) i — z klasy Tailwind — tekst `var(--nextless-toggle-accent-contrast)`. Ponieważ **inline `color` ma wyższą specyficzność niż klasa**, tekst aktywnego triggera przyjmuje kolor accentu, czyli **identyczny jak jego tło**. Zweryfikowane `getComputedStyle` na żywym froncie: instancja cards → tekst i tło `rgb(0,0,255)` (niebieski na niebieskim), instancja switch → `rgb(15,23,42)` (ciemny na ciemnym). **Etykieta aktywnej zakładki jest faktycznie nieczytelna.** Dotyczy to realnie zapisanego fixture (obie instancje), nie tylko skonstruowanego scenariusza. |
| **N2 — Kontrolka „Accent contrast color" nie ma wpływu na render aktywnego triggera** | Theme | Pole „Accent contrast color" istnieje właśnie po to, by zapewnić czytelny tekst na aktywnym triggerze, i **poprawnie aktualizuje** zmienną `--nextless-toggle-accent-contrast` oraz stan „Clear". Jednak z powodu N1 (inline `color` wygrywa) ustawienie accent contrast **nie zmienia** faktycznego koloru tekstu aktywnego triggera. Test: accent=#ff0000, contrast=#00ff00 → zmienna = zielona, ale realny `color` aktywnego triggera = czerwony. Kontrolka jest więc de facto „martwa" w scenariuszu, w którym ma największe znaczenie. |
| **N3 — Doradca kontrastu opisuje intencję, nie realny render** | Theme | „Active trigger contrast advisory" liczy kontrast między `accentContrastColor` (fg) a `accentColor` (bg). Skoro realny tekst aktywnego triggera to `accentColor` (przez N1), advisory **nie odzwierciedla** faktycznie wyrenderowanego kontrastu (który zawsze = brak kontrastu: ten sam kolor na sobie). |
| **N4 — Admin canvas/preview jest NIEINTERAKTYWNY** | UX podglądu | W trybie admin skrypt runtime nie jest wstrzykiwany (`previewMode` → `runtimeScript = null`), a renderer nie ma reactowego stanu podglądu przełączania (brak odpowiednika `previewActiveId` z Tabs). `data-coderso-toggle-bound` = brak; kliknięcie triggera w canvas **nic nie przełącza** — pokazywany jest wyłącznie panel `defaultState`. To realna pułapka: autor nie może w podglądzie kliknąć i zobaczyć zawartości drugiego panelu — musi zmienić „Default state" w Visual, by go obejrzeć. (Różnica względem Tabs, gdzie podgląd w canvas był interaktywny.) |
| **N5 — Wizard nie jest równorzędnym trybem i nic nie konfiguruje** | UX nawigacji | Wizard jest ukryty za „Run setup again", a jego cała zawartość to read-only podsumowanie wariantu + notka. **Brak jakichkolwiek edytowalnych kontrolek** (mniej niż w Tabs, gdzie Wizard miał choć select liczby zakładek). Dla osoby szukającej „kreatora startowego" jest to mylące — to raczej ekran informacyjny niż wizard. |
| **N6 — „Live preview" w Wizardzie jest statyczny** | Wizard | Klik „View B" w panelu „Live preview" jedynie ustawia focus (`[active]`), ale **nie przełącza** widoku — „View A" pozostaje `checked`, status dalej „View A selected". Spójne z N4 (brak runtime/stanu w podglądzie), ale nazwa „Live preview" sugeruje interaktywność, której nie ma. |
| **N7 — Zduplikowana klasa `shadow-sm` na panelu** | Renderer (kosmetyka) | Przy kombinacji Pane surface „Contrast surface" + Border emphasis „Strong" panel dostaje klasę `shadow-sm` dwukrotnie (`paneSurfaceClassMap.contrast` i `paneBorderClassMap.strong`). Bez wpływu wizualnego, ale to drobny zapach w generowaniu klas. |
| **N8 — „Visibility summary" mówi „Hidden on all devices", choć widget się renderuje (współdzielony wrapper, nie Toggle Block)** | Współdzielony wrapper | W Advanced sekcja „Visibility summary" pokazuje „Shown on: Hidden on all devices", podczas gdy wszystkie trzy przełączniki Device visibility są **odznaczone** (`aria-checked=false`), a widget **renderuje się** na froncie (desktop 1280 px). Sformułowanie wygląda na odwrócone/mylące. To kontrolka **współdzielonego wrappera** (obecna we wszystkich widgetach), nie element Toggle Block — odnotowuję jako obserwację, nie audytowałem jej głębiej. |

**Nie wykryto** żadnych błędów konsoli, błędów renderowania paneli ani rozjazdu render między admin canvas a frontem dla wspólnie testowanych opcji (poza celową różnicą interaktywności — N4). Wszystkie kontrolki Visual, które przetestowałem, działają i aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas/preview | Frontend (`/test-toggle-block-0516`) | Zgodność |
|--------|----------------------|--------------------------------------|----------|
| Markup i atrybuty `data-coderso-toggle-*` | ✓ ten sam renderer | ✓ identyczne | ✓ |
| Przełączanie zakładek | ✗ brak (brak runtime, brak stanu podglądu) | ✓ przez skrypt runtime (mysz + klawiatura) | ✗ różnica celowa (N4) |
| Skrypt runtime | nie wstrzykiwany (`previewMode`) | wstrzyknięty i powiązany (`bound=true`) | ✗ różnica celowa |
| Placeholder pustego panelu | „Use the page builder to add widgets…" (tryb edytora) | brak (nie wyciekł) | ✓ poprawne rozróżnienie |
| Dostępność (role/aria) | obecna w markupie | obecna i działająca (roving tabindex, aria-live) | ✓ |
| Błąd N1/N2 (niewidoczna etykieta aktywnego triggera) | ✓ reprodukuje się (czerwony na czerwonym po ustawieniu accentu) | ✓ reprodukuje się na żywym fixture (niebieski/ciemny) | ✓ (oba błędne — to defekt renderera) |

**Wniosek:** renderer jest wspólny; markup admin↔front jest spójny. Jedyne celowe różnice to warstwa interaktywności (front ma runtime, admin nie ma — N4) oraz placeholder pustego panelu. Defekt N1/N2 jest na poziomie renderera, więc dotyczy obu środowisk.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. W konsekwencji moje edycje w Visual (etykiety, kolory, układ paneli) **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front. Front pokazuje **wcześniej zapisany** stan fixture (dwie instancje), co potwierdza, że niezapisane edycje nie wyciekają. Zweryfikowana została natomiast **trwałość w obrębie sesji edytora** (edycje z Visual były widoczne po przełączeniu na Advanced i z powrotem).
- **Zawartość paneli:** oba panele są puste; nie dodawałem zagnieżdżonych widgetów, więc renderowanie dzieci paneli na froncie nie zostało wykonane.
- **Motion „fade":** zweryfikowano obecność klas dla „slide" w DOM; nie testowałem wizualnie animacji „fade" ani zachowania pod `prefers-reduced-motion` (klasy `motion-reduce:animate-none` są obecne w markupie, ale nie wymuszałem redukcji ruchu).
- **Doradca kontrastu (progi):** nie wymuszałem specyficznych kombinacji niskokontrastowych, by sprawdzić dokładne treści ostrzeżeń poza domyślnym „Contrast depends on inherited theme or transparent colors."
- **Współdzielony wrapper (Block layout / Device visibility):** poza odnotowaniem anomalii N8 nie audytowałem głębiej tych sekcji — nie należą do Toggle Block.
- **Surface token „Soft surface":** przetestowałem „Contrast surface" i „Inherited"; wariantu „Soft" (`bg-[var(--color-bg)]`) nie ustawiałem explicite (ten sam mechanizm mapowania klas).

---

## 8. Podsumowanie

- Widget **Toggle Block jest w dobrym stanie funkcjonalnym po stronie konfiguracji i frontendu**. Wszystkie przetestowane kontrolki Visual (wariant, etykiety, experience, dostępność, kolory, karty paneli) działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje stan; frontend jest w pełni interaktywny i dostępny (mysz + klawiatura + ARIA + `aria-live`), obsługuje wiele niezależnych instancji, bez błędów konsoli i bez overflow na mobile.
- **Najważniejszy realny defekt (N1/N2):** etykieta **aktywnego** triggera renderuje się w kolorze accentu identycznym z jego tłem (tekst na tle o tym samym kolorze → niewidoczna etykieta), a kontrolka „Accent contrast color" — przeznaczona dokładnie do naprawy tego kontrastu — jest nadpisywana przez inline `color: accentColor` i **nie ma efektu**. Błąd jest widoczny na żywym, zapisanym fixture (obie instancje), nie tylko w scenariuszu testowym.
- **Najważniejszy niuans UX (N4/N6):** podgląd w admin (canvas i „Live preview" Wizarda) jest **nieinteraktywny** — przełączanie paneli działa wyłącznie na froncie. Autor nie może w podglądzie kliknąć drugiego panelu; musi zmienić „Default state".
- **Wizard (N5):** to ekran wyłącznie informacyjny (read-only), bez żadnych edytowalnych kontrolek.
- **Drobne kwestie:** zduplikowana klasa `shadow-sm` (N7), mylące „Visibility summary: Hidden on all devices" we współdzielonym wrapperze (N8, poza zakresem Toggle Block), advisory kontrastu nieodzwierciedlające realnego renderu (N3).
- **Pozytywy spójności:** wszystkie cztery pola kolorów mają spójne „Clear", podsumowania Advanced są dokładne, ARIA na froncie jest kompletna, a placeholder edytora nie wycieka na front.

---

## 9. Matryca priorytetów (sugestia)

| # | Problem | Priorytet | Obszar |
|---|---------|-----------|--------|
| N1 | Tekst aktywnego triggera = kolor tła (niewidoczna etykieta) przy ustawionym accencie | KRYTYCZNY | Renderer |
| N2 | „Accent contrast color" bez efektu na aktywny trigger (nadpisany inline) | KRYTYCZNY (sprzężony z N1) | Renderer |
| N4 | Brak interaktywności podglądu w admin (nie da się obejrzeć drugiego panelu bez zmiany defaultState) | WYSOKI | Edytor / preview |
| N6 | „Live preview" w Wizardzie sugeruje interaktywność, której nie ma | ŚREDNI | Wizard |
| N5 | Wizard bez edytowalnych kontrolek (ekran informacyjny) | ŚREDNI/NISKI | Wizard / UX |
| N3 | Advisory kontrastu nie odzwierciedla realnego renderu | NISKI | Edytor |
| N7 | Zduplikowana klasa `shadow-sm` | NISKI (kosmetyka) | Renderer |
| N8 | „Visibility summary: Hidden on all devices" mylące (współdzielony wrapper) | NISKI / poza Toggle Block | Wrapper |

---

## 10. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo.

| Plik (lokalny) | Opis |
|----------------|------|
| `toggle-block-01-public-route.png` | Publiczna trasa `/test-toggle-block-0516` — zapisany stan fixture (dwie instancje: cards + switch) |
| `toggle-block-02-admin-visual-editor.png` | Edytor Visual po edycjach (cards/labels/kolory/karty paneli) |
