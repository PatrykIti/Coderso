# RAPORT: Tabs Widget — wyczerpujący audyt current-state (Visual / Wizard / Advanced + frontend)

> **Status:** Zakończony (pogłębiona iteracja „gap-close")
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-tabs-gap-close-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/0be2cb49-8113-4a88-8d17-0ed70d5c5fdd` (strona „Contract Test - tabs")
> **Fixture public:** http://localhost:3000/test-tabs-0516
> **Pliki źródłowe:** `core/widgets/core/tabs.tsx` (renderer + normalizacja + runtime script) · `core/admin/ui/widgets/editors/TabsEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolka kolorów)

> **Cel tej iteracji:** zamknięcie luk z poprzedniego audytu. Wcześniej NIE było w pełni
> przećwiczone: (a) rodziny stylów/kolorów, (b) gałęzie liczby zakładek / slotów
> (add/remove/reorder), (c) gałęzie orientacji / wariantu / motion. W tym przebiegu
> KAŻDA wartość każdego enuma została kliknięta, a efekt zweryfikowany inspekcją DOM
> (atrybuty `data-coderso-tabs-*`, klasy Tailwind triggera/tablisty/panelu, inline `style`,
> ARIA). Tam, gdzie kontrolka jest nietestowalna w tym fixture, podana jest dokładna
> nazwa kontrolki i powód.

> **Uwaga o screenshotach:** ten przebieg opierał się na inspekcji DOM/atrybutów, a **nie**
> na zrzutach PNG. Nie przechwycono żadnych plików screenshotów — pliki `.yml` w katalogu
> `.playwright-cli/` to wewnętrzne snapshoty narzędzia (katalog ignorowany przez Git) i nie
> są evidence dołączanym do repo. Sekcja 10 zawiera jedynie lokalne etykiety potencjalnych
> przechwyceń (brak rzeczywistych artefaktów w tym przebiegu).

---

## 1. Przegląd widgetu

**Typ:** `tabs` · **Kategoria:** `layout` · **Opis:** „Switch between grouped content panels."

**Warianty:** `pills` (domyślny), `underline`, `minimal`.

**Model danych (`TabsData`):**

| Sekcja | Pola |
|--------|------|
| **items[]** | `id`, `label`, `description` (legacy→`panelIntro`), `panelIntro`, `triggerDescription` (podtytuł), `icon` (max 16 znaków), `disabled` |
| **options** | `defaultItemId`, `activeId`, `alignment` (start/center/end), `orientation` (horizontal/vertical), `triggerOverflow` (wrap/scroll — patrz B1), `containerPadding`/`triggerGap`/`panelGap` (sm/md/lg), `triggerTextSize` (xs/sm/base), `triggerFontWeight` (normal/medium/semibold), `motion` (none/fade/slide) |
| **style** | `surfaceColor`, `borderColor`, `activeBackgroundColor`, `activeTextColor`, `inactiveTextColor`, `panelBackgroundColor` |

**Ograniczenia:** min 2 / max 6 zakładek (`tabsItemMin=2`, `tabsItemMax=6`). **Kluczowy niuans:** liczbę realnie renderowanych zakładek wyznacza **liczba slotów typu `panel`** (repeatable slot), a nie długość tablicy `items` (patrz N1 i sekcja 6).

**Tryby edytora:** panel po prawej ma dwie zakładki **Visual** i **Advanced**. **Wizard** nie jest równorzędną zakładką — wchodzi się do niego przyciskiem **„Run setup again"**, a kończy **„Finish setup and open Visual"**. Po setupie panel pokazuje „Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."

---

## 2. Zakres faktycznie przećwiczonych interakcji (current-state)

Wszystkie poniższe wykonane w sesji `claude-29-05-tabs-gap-close-v2`, każda zweryfikowana inspekcją DOM.

**Variant (3/3):** pills → underline → minimal → powrót do pills.

**Layout — orientacja (2/2):** horizontal, vertical.

**Layout — alignment (3/3 × 2 orientacje):** start / center / end, sprawdzone i w poziomie, i w pionie.

**Layout — spacing (3/3 każda):** container padding sm/md/lg, tab gap sm/md/lg, content gap sm/md/lg.

**Tab label style:** text size (3/3: xs/sm/base), font weight (3/3: normal/medium/semibold), motion (3/3: none/fade/slide — w tym **fade**, którego brakowało wcześniej).

**Colors (6/6 swatchy):** zmiana wszystkich 6 swatchy + weryfikacja inline `style` w canvas; przyciski „Clear" (3/3 obecne) + brak „Clear" (3/3); **oba** ostrzeżenia kontrastu (active + inactive); licznik kolorów w Advanced.

**Count / sloty:** Wizard „Number of tabs" 2→4 (z weryfikacją rozjazdu N1) i dialog redukcji 4→2 (ścieżka *anuluj* i *zaakceptuj*); Structure „Add Panel" 2→6 (limit max); Structure „Remove" 6→2 (limit min); „Move up/down" (reorder).

**Tab content:** edycja etykiet/intro (zgodnie z poprzednim audytem) + ponownie zweryfikowany branch „Show as unavailable" (Tab 2) i jego wpływ na canvas oraz dropdown „Default tab".

**Frontend (public):** render początkowy, klik myszą, klawiatura (ArrowUp/ArrowDown/Home/End), ARIA, runtime script, brak wycieku placeholdera, brak błędów konsoli, brak overflow na 375 px.

---

## 3. CO DZIAŁA — zweryfikowane w DOM

### 3.1 Variant (Visual → Variant)

| Wariant | `data-coderso-tabs-variant` | Klasy triggera |
|---------|------------------------------|----------------|
| pills | `pills` | `rounded-full border px-3 py-1.5 data-[state=active]:border-transparent` ✓ |
| underline | `underline` | `rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-current` ✓ |
| minimal | `minimal` | `rounded-md px-2 py-1.5 data-[state=active]:underline` ✓ |

Karty wariantu aktualizują canvas live; „Choose"/„Current style" badge przełącza się poprawnie.

### 3.2 Layout — orientacja i alignment

- **Orientacja:** `horizontal` → tablist `flex flex-wrap items-center`, `aria-orientation=horizontal`; `vertical` → tablist `flex flex-col`, `aria-orientation=vertical`. Atrybut `data-coderso-tabs-orientation` zgodny. ✓
- **Alignment** (zweryfikowany w obu orientacjach):

| Wartość | Poziomo (klasa tablisty) | Pionowo (klasa tablisty) |
|---------|--------------------------|--------------------------|
| start | `justify-start` | `items-start` |
| center | `justify-center` | `items-center` |
| end | `justify-end` | `items-end` |

Wszystkie 6 kombinacji potwierdzone w DOM. ✓

### 3.3 Layout — spacing (po sm i lg, baza md)

| Kontrolka | sm | md (baza) | lg |
|-----------|----|-----------|----|
| Container padding (kontener) | `p-3` | `p-4` | `p-6` ✓ |
| Tab gap (tablist) | `gap-1.5` | `gap-2` | `gap-3` ✓ |
| Content gap (kontener) | `space-y-3` | `space-y-4` | `space-y-6` ✓ |

### 3.4 Tab label style

| Kontrolka | Wartości i klasy triggera |
|-----------|---------------------------|
| Tab label size | xs→`text-xs`, sm→`text-sm`, base→`text-base` ✓ |
| Tab label weight | normal→`font-normal`, medium→`font-medium`, semibold→`font-semibold` ✓ |
| Content motion | none→brak klas motion; fade→`data-[state=active]:motion-safe:animate-in … fade-in-0 … duration-200 … motion-reduce:animate-none`; slide→jw. + `slide-in-from-bottom-2`. `data-coderso-tabs-motion` = none/fade/slide zgodny. ✓ |

Gałąź **fade** (wcześniej nieprzećwiczona) potwierdzona: klasa `fade-in-0` bez `slide-in-from-bottom-2`, a slide dokłada slide.

### 3.5 Colors (Visual → Colors) — wszystkie 6 swatchy

Zapisany fixture trzyma wartości jako **zmienne motywu** (`var(--color-surface)`, `var(--color-border)`, `var(--color-text)`, `var(--color-background)`). Po zmianie swatcha canvas dostaje konkretny `rgb(...)`:

| Swatch | Cel w canvas (inline `style`) | „Clear"? |
|--------|-------------------------------|----------|
| Surface color | kontener `background-color` | **Tak** — „Clear" usuwa `background-color` ✓ |
| Border color | kontener + panel `border-color` | **Nie** |
| Active background | aktywny trigger `background-color` **oraz** `border-color` | **Tak** — „Clear" usuwa oba (patrz N5) ✓ |
| Active text color | aktywny trigger `color` | **Nie** (patrz B-fill) |
| Inactive text color | nieaktywny trigger `color` | **Nie** |
| Content background | panel `background-color` | **Tak** — „Clear" usuwa `background-color` ✓ |

- **Zmiana swatcha:** 5 z 6 zweryfikowano przez `fill` (Surface=red, Border=green, Active bg=blue, Inactive text, Content bg=cyan) — każdy natychmiast aktualizuje odpowiedni inline `style` w canvas. ✓
- **Active text color:** zaktualizowany i potwierdzony (aktywny trigger `color: rgb(255,255,0)`) — szczegóły metody w B-fill (sekcja 5). Sam mechanizm produktowy działa.
- **„Clear" (3/3):** Surface, Active background, Content background — usuwają zapisany kolor; inline `style` znika z odpowiedniego elementu. ✓
- **Brak „Clear" (3/3):** Border, Active text, Inactive text — nie da się ich zresetować przyciskiem (zgodne z kodem; niespójność UX — N4).
- **Ostrzeżenia kontrastu (oba branche):** ustawienie active text = active background (#ffffff/#ffffff) → *„Active tab: Configured colors may be hard to read together."*; ustawienie inactive text ≈ surface → *„Inactive tab: Configured colors may be hard to read together."* Oba renderują się jako `text-amber-700`. ✓

### 3.6 Count / sloty — pełne gałęzie

- **Structure „Add Panel":** dodaje **realny** slot `panel`; render rośnie 2→3→…→6 (`data-coderso-tabs-panels` i liczba triggerów rosną, pojawiają się etykiety „Tab 3"…„Tab 6"). Przy **6** „Add Panel" jest **disabled** (limit max wymuszony). ✓
- **Structure „Remove":** redukuje render natychmiast 6→5→…→2, „Add Panel" wraca do enabled. Przy **2** przyciski „Remove" **w ogóle nie są renderowane** (limit min wymuszony przez ukrycie „Remove", nie przez disabled). ✓
- **Structure reorder „Move up/Move down":** Panel 1 ma „Move up" disabled, Panel N (ostatni) ma „Move down" disabled — granice działają. Sama zmiana kolejności — patrz NT2 (nietestowalna w tym fixture).
- **Wizard „Number of tabs" (2–6):** zmiana wartości aktualizuje tablicę `items` i read-only podsumowanie (po wybraniu 4 w podsumowaniu pojawiają się „Tab 3"/„Tab 4"), ale **liczba renderowanych zakładek się nie zmienia** (patrz N1).
- **Dialog redukcji (`window.confirm`):** przy zmniejszaniu liczby pojawia się natywny dialog: *„Reduce tabs to 2? This removes these tab content areas: Tab 3, Tab 4. This cannot be undone."*
  - **Anuluj (dismiss):** liczba pozostaje 4 (podsumowanie nadal pokazuje Tab 3/Tab 4). ✓
  - **OK (accept):** tablica `items` wraca do 2 (Tab 3/Tab 4 znikają z podsumowania). ✓
  - Treść imiennie wymienia, które obszary znikną — dobry mechanizm ochrony. ✓

### 3.7 Tab content — „Show as unavailable"

- Zaznaczenie „Show as unavailable" dla Tab 2 → trigger w canvas dostaje `aria-disabled=true`, atrybut `disabled`, klasę `opacity-50`; aktywna zakładka pozostaje na Tab 1 (pierwszej dostępnej). ✓
- W dropdownie **„Default tab"** opcja „Tab 2" jest `aria-disabled=true` (nie da się wybrać niedostępnej zakładki jako domyślnej). ✓

### 3.8 Advanced (read-only) — odzwierciedlenie stanu sesji

Po edycjach w Visual sekcja Advanced wiernie podsumowała stan:

- **Behavior summary:** „Opens on: Tab 1 (tab 1)", „Default tab: Tab 1 (tab 1)", „Unavailable tabs: 0 of 2", „Line behavior: Tabs wrap onto extra lines when space is tight." (statyczne — patrz B1).
- **Saved display summary:** „Horizontal; Start aligned", „Container Large; tabs Large; content Large", „Base; Semibold; None motion".
- **Color choices:** licznik reaguje — po wyczyszczeniu jednego pola pokazał **„5 saved color choices"**, a przy aktywnym ostrzeżeniu kontrastu komunikat przełączył się na **„Review color readability in Visual before publishing."** (bez ostrzeżeń: „No saved color readability warnings are visible."). ✓
- **Contract summary:** „Visual owns variant, tab content, layout, tab label style, and colors. Advanced only summarizes the saved state."

### 3.9 Frontend (public `/test-tabs-0516`)

Strona zwraca `200`. Render: variant `pills`, orientation **`vertical`**, 2 zakładki, Tab 1 aktywna, motion `none`, overflow `wrap`.

- **Klik myszą** „Tab 2" → `data-coderso-tabs-active-id=2`, panel 1 `hidden`, panel 2 widoczny. ✓
- **Klawiatura (orientacja pionowa):** z fokusem na Tab 2 — `ArrowUp` → aktywna 1 (poprzednia), `ArrowDown` → 2 (następna), `End` → 2 (ostatnia), `Home` → 1 (pierwsza). Wzorzec „automatic activation" (focus = aktywacja). ✓
- **ARIA:** tablist `aria-label="Content tabs"` + `aria-orientation="vertical"`; każdy `role=tab` ma `aria-selected`, `tabindex` (aktywny 0 / nieaktywny -1), `aria-controls`; każdy `role=tabpanel` ma `aria-labelledby`, `tabindex=0` i `hidden` na nieaktywnym. ✓
- **Runtime script:** obecny (1 inline script), root ma `data-coderso-tabs-bound=true` (skrypt zainicjalizowany). ✓
- **Placeholder edytora** („Add widgets to this tab panel.") **nie wycieka** na front. ✓
- **Responsywność:** na 375 px brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- **Konsola:** 0 błędów, 0 ostrzeżeń. ✓

---

## 4. CO NIE DZIAŁA / jest martwe (twarde ustalenia)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **B1 — martwa opcja `triggerOverflow=scroll`** | Renderer / schema | Schema dopuszcza `triggerOverflow: wrap \| scroll`, ale `resolveTriggerOverflow()` **zawsze** zwraca `"wrap"`, nie istnieje żadna kontrolka UI do ustawienia `scroll`, a `data-coderso-tabs-overflow` jest zawsze `wrap` (potwierdzone w canvas i na froncie). Advanced pokazuje stały tekst „Tabs wrap onto extra lines…". Opcja jest faktycznie legacy/martwa. |

> Poza B1 **nie wykryto twardych bugów renderowania**: wszystkie przetestowane enumy Visual aktualizują canvas, Advanced wiernie podsumowuje, frontend jest interaktywny i dostępny, bez błędów konsoli.

---

## 5. CZEGO NIE DA SIĘ W PEŁNI ZWERYFIKOWAĆ (nazwane kontrolki + powód)

| # | Kontrolka | Powód nietestowalności |
|---|-----------|------------------------|
| **NT1 — `triggerOverflow=scroll`** | (brak kontrolki) | Nie istnieje kontrolka UI; wartość `scroll` jest nieosiągalna (patrz B1). Zachowanie „scroll" niemożliwe do wywołania. |
| **NT2 — Structure → „Move up" / „Move down" (reorder slotów)** | Visual → Structure | Przy **pustych** slotach reorder nie daje żadnego obserwowalnego efektu: kolejność na liście Structure, etykiety triggerów („Tab 1/2/3"), `selectionId` paneli (`1,2,3`) i DOM-owe `id` (`…-panel-1/2/3`) pozostają identyczne po kliknięciu „Move down" na pierwszym slocie. Powód: etykiety/intro są wiązane **pozycyjnie** z tablicą `items` (`items[index]`), a etykiety slotów są pozycyjne („Panel N slot"). Żeby zaobserwować efekt reorderu, panele musiałyby zawierać zagnieżdżone widgety (czego świadomie nie dodawałem, by nie modyfikować fixture). |
| **NT3 — „Active text color" przez programowy `fill`** | Visual → Colors | Patrz B-fill poniżej — kontrolka działa dla realnego użytkownika (event `change`), ale nie udało się jej wysterować samym `fill` (event `input`). Zweryfikowana ścieżką `change`, nie `fill`. |
| **NT4 — trwałość / publikacja** | całość | Świadomie **nie** klikałem „Save draft" ani „Publish" (fixture współdzielony). Trwałość po zapisie i propagacja na front nie były testowane (patrz jednak sekcja 6 — rozjazd draft↔public). |
| **NT5 — „unavailable" na froncie** | frontend | Opublikowany fixture nie ma wyłączonych zakładek (0 z 2), więc stan `disabled` zweryfikowano tylko w admin canvas, nie na publicznej trasie. |
| **NT6 — `prefers-reduced-motion`** | frontend | Klasy `motion-reduce:animate-none` są obecne w markupie dla fade/slide, ale nie wymuszałem redukcji ruchu w przeglądarce. |
| **NT7 — realne zawijanie wielu zakładek (poziom, wąski viewport)** | frontend | Opublikowany fixture ma 2 zakładki i orientację pionową, więc realnego zawijania `flex-wrap` nie sprawdzono na żywo. |

**B-fill (dokładny opis NT3):** programowy `fill` poprawnie wysterował 5 z 6 swatchy (Surface, Border, Active background, Inactive text, Content background) — każdy zaktualizował i swatch, i inline `style` w canvas. **Wyjątkiem był wyłącznie swatch „Active text color":** powtórzony `fill` zostawiał wartość swatcha i `color` aktywnego triggera bez zmian, podczas gdy strukturalnie identyczny „Inactive text color" reagował na `fill` w tej samej chwili. Wysłanie na ten sam `<input type="color">` natywnego eventu `change` **zaktualizowało** kontrolkę (aktywny trigger `color: rgb(255,255,0)`). Najbardziej prawdopodobna przyczyna: zmiana „Active text color" przełącza warunkowo renderowane ostrzeżenie kontrastu (`activeContrast`), a wynikający re-render „gubi" event `input` z `fill`. **Wniosek:** to artefakt programowego sterowania, **nie** potwierdzony bug produktowy — realny wybór z systemowego color-pickera (event `change`) działa. Oznaczam jako „niezweryfikowalne przez `fill`", zweryfikowane przez `change`.

---

## 6. Rozjazd draft ↔ public oraz brak autosave (istotny niuans)

- **Admin draft vs public:** edytor (draft) ładuje orientację **`horizontal`**, a publiczna trasa `/test-tabs-0516` renderuje **`vertical`**. To rozbieżność między bieżącym draftem a opublikowaną wersją — oczekiwana przy separacji draft/publish, ale konkretna i warta odnotowania (zmiany draftu nie są widoczne na froncie do publikacji).
- **Brak autosave + strażnik wyjścia:** po przeładowaniu strony **bez zapisu** wszystkie moje edycje sesyjne (kolory, sloty, orientacja) zniknęły — fixture wrócił do stanu wyjściowego (2 panele, pills, horizontal, none, kolory = zmienne motywu). Przy próbie przeładowania pojawił się natywny dialog „unsaved changes" (beforeunload guard). Potwierdza to, że (a) nie ma cichego autosave, (b) niezapisane zmiany są chronione przed utratą.

---

## 7. NIUANSE UX/UI (świadome decyzje, nie błędy)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Wizard „Number of tabs" vs realny render** | Wizard / sloty | Zmiana „Number of tabs" 2→4 zaktualizowała tablicę `items` i podsumowanie, **ale liczba renderowanych zakładek pozostała 2** — zarówno w głównym canvas, jak i w „Live preview" Wizarda (oba roots `data-coderso-tabs-panels=2`). Faktyczną liczbę zakładek tworzą **sloty `panel`** (Structure → „Add Panel"), nie kontrolka Wizarda. Renderer normalizuje `items` do liczby slotów (`normalizeTabsData(data, slotTargets.length)`), więc nadmiarowe `items` są „martwe". To realna pułapka UX: dwa nieZSYNCHRONIZOWANE mechanizmy liczby zakładek. |
| **N2 — niespójna potwierdzalność redukcji** | Wizard vs Structure | Redukcja przez Wizard („Number of tabs" w dół) pokazuje destrukcyjny `window.confirm` z imienną listą zakładek. Natomiast **Structure → „Remove" usuwa slot natychmiast, BEZ żadnego potwierdzenia.** Dwie różne ścieżki zmniejszania liczby paneli mają różny poziom ochrony przed przypadkową utratą. |
| **N3 — „Saved custom color" dla wartości z motywu** | Colors (Visual) | Wszystkie 6 pól pokazuje „Saved custom color", mimo że domyślne wartości to zmienne CSS (`var(--color-surface)` itd.). Swatch wyświetla **kolor fallbacku** (np. `#f8fafc`, `#cbd5e1`, `#0f172a`, `#ffffff`), a nie wartość zmiennej. Użytkownik nie odróżni „dziedziczy z motywu" od „ręcznie ustawiony". (Komponent ma stany „Theme default / Selected color / Saved custom color", ale dla tabs `treatAsThemeDefaultValues` jest puste, więc `var(...)` trafia w „Saved custom color".) |
| **N4 — niespójna dostępność „Clear"** | Colors (Visual) | „Clear" mają tylko 3 z 6 kolorów: Surface, Active background, Content background. Border, Active text, Inactive text **nie mają „Clear"** — nie da się ich zresetować do zmiennej motywu bez ręcznej wartości. Zgodne z kodem, niespójne dla użytkownika. |
| **N5 — skutek „Clear" na aktywnym tle** | Colors (Visual) | „Clear" na „Active background" usuwa z aktywnego triggera **zarówno** `background-color`, **jak i** `border-color` (renderer wiąże oba z `activeBackgroundColor`). W wariancie `pills` aktywna zakładka może stać się wizualnie nieodróżnialna od nieaktywnej. Brak ostrzeżenia o utracie wyróżnienia. |
| **N6 — Wizard nie jest równorzędnym trybem** | UX nawigacji | Wizard ukryty za „Run setup again"; w panelu trybów widoczne tylko „Visual"/„Advanced". |
| **N7 — automatyczna aktywacja klawiaturą** | Frontend a11y | Strzałki/Home/End jednocześnie przenoszą focus i aktywują zakładkę (brak „manual activation"). Dopuszczalny wzorzec WAI-ARIA; przy zakładkach z ciężką zawartością może być kosztowny — świadoma decyzja, nie błąd. |

---

## 8. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas / preview | Frontend (`/test-tabs-0516`) | Zgodność |
|--------|------------------------|------------------------------|----------|
| Renderer i atrybuty `data-coderso-tabs-*` | żywy `TabsBlock` | identyczny zestaw atrybutów | ✓ (wspólny renderer) |
| Interaktywność | stan Reacta (`previewActiveId`) | wstrzykiwany runtime script (`data-coderso-tabs-bound`) | ✓ (celowa różnica warstwy) |
| Klawiatura (Arrow/Home/End) | handlery React | runtime script | ✓ |
| Placeholder pustego panelu | „Add widgets to this tab panel." (tryb edytora) | brak (nie wyciekł) | ✓ poprawne rozróżnienie |
| Bieżąca **orientacja** | `horizontal` (draft) | `vertical` (opublikowane) | ✗ rozjazd draft↔public (sekcja 6) |
| ARIA (role/aria) | obecna | obecna i kompletna | ✓ |

**Wniosek:** renderer jest wspólny i spójny dla wspólnie testowanych opcji. Jedyna rozbieżność stanu to draft (horizontal) vs opublikowana wersja (vertical) — efekt niepublikowanych zmian, nie bug renderera.

---

## 9. Podsumowanie

- **Widget tabs jest w dobrym stanie funkcjonalnym.** W tej iteracji domknięto wszystkie wskazane luki: **wszystkie wartości** wariantu, orientacji, alignmentu (× obie orientacje), spacingu (×3 kontrolki), rozmiaru/wagi etykiety, motion (w tym **fade**) oraz **wszystkie 6 swatchy** kolorów zostały kliknięte i zweryfikowane w DOM. Gałęzie liczby/slotów (Wizard count, dialog redukcji ↑↓, Add/Remove/limity min-max) potwierdzone.
- **Twardy problem:** tylko **B1** — martwa opcja `triggerOverflow=scroll` (brak kontrolki, wartość nieosiągalna, zawsze `wrap`).
- **Najważniejszy niuans:** **N1** — rozjazd Wizard „Number of tabs" ↔ realny render (render sterują sloty, nie Wizard); pokrewne **N2** — Structure „Remove" bez potwierdzenia, w przeciwieństwie do Wizarda.
- **Niuanse kolorów:** N3 (mylące „Saved custom color" dla `var(...)`), N4 (niespójna dostępność „Clear"), N5 (utrata wyróżnienia aktywnej zakładki po „Clear" na aktywnym tle).
- **Nietestowalne w tym fixture (nazwane):** reorder pustych slotów (NT2), `scroll` (NT1/B1), „Active text color" przez `fill` (NT3/B-fill — działa przez `change`), oraz świadomie pominięte: publikacja (NT4), disabled na froncie (NT5), reduced-motion (NT6), realne zawijanie (NT7).
- **Higiena fixture:** żadnych „Save"/„Publish"; brak cichego autosave (reload przywraca stan), obecny beforeunload guard.

---

## 10. Screenshoty (lokalne etykiety)

> W tym przebiegu **nie** przechwycono żadnych zrzutów PNG — weryfikacja opierała się na
> inspekcji DOM/atrybutów (`eval`) i snapshotach `.yml` narzędzia. Poniższe nazwy to
> jedynie potencjalne **lokalne etykiety** (gdyby zrzuty były robione); nie istnieją jako
> artefakty w repo, a katalog `.playwright-cli/` jest ignorowany przez Git.

| Etykieta (lokalna, niewygenerowana) | Opis |
|-------------------------------------|------|
| `tabs-29-admin-colors-contrast.png` | Sekcja Colors z aktywnymi ostrzeżeniami kontrastu (active + inactive) |
| `tabs-29-admin-structure-6panels.png` | Structure z 6 panelami i wyłączonym „Add Panel" (limit max) |
| `tabs-29-public-vertical.png` | Publiczna trasa `/test-tabs-0516` — orientacja vertical, Tab 2 aktywna po kliknięciu |
