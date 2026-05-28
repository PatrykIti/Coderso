# RAPORT: Tabs Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-tabs` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/0be2cb49-8113-4a88-8d17-0ed70d5c5fdd` (strona „Contract Test - tabs", status `Draft`)
> **Fixture public:** http://localhost:3000/test-tabs-0516
> **Pliki źródłowe:** `core/widgets/core/tabs.tsx` (renderer + normalizacja + runtime script) · `core/admin/ui/widgets/editors/TabsEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane interakcją w UI
> i inspekcją DOM (atrybuty `data-coderso-tabs-*`, klasy Tailwind, ARIA), a nie
> tylko zliczeniem widocznych sekcji. Sekcje 4–5 jasno oddzielają: co działa, co
> nie działa, co faktycznie przetestowano oraz czego NIE testowano.

> Uwaga o screenshotach: pliki PNG wspomniane w sekcji 9 są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowany przez
> Git). Nie są wymaganym evidence w repo i nie zostały dołączone do żadnego pliku
> źródłowego.

---

## 1. Przegląd widgetu

**Typ:** `tabs` · **Kategoria:** `layout` · **Tytuł:** „Switch between grouped content panels."

**Warianty:** `pills` (domyślny, zaokrąglone segmenty z obramowaniem), `underline` (styl linkowy z aktywnym podkreśleniem), `minimal` (lekka nawigacja z `underline` na aktywnym).

**Model danych (`TabsData`):**

| Sekcja | Pola |
|--------|------|
| **items[]** | `id`, `label`, `description` (legacy→panelIntro), `panelIntro`, `triggerDescription` (podtytuł), `icon` (max 16 znaków), `disabled` |
| **options** | `defaultItemId`, `activeId`, `alignment` (start/center/end), `orientation` (horizontal/vertical), `triggerOverflow` (wrap/scroll — patrz 4.2), `containerPadding`/`triggerGap`/`panelGap` (sm/md/lg), `triggerTextSize` (xs/sm/base), `triggerFontWeight` (normal/medium/semibold), `motion` (none/fade/slide) |
| **style** | `surfaceColor`, `borderColor`, `activeBackgroundColor`, `activeTextColor`, `inactiveTextColor`, `panelBackgroundColor` |

**Ograniczenia:** min 2 / max 6 zakładek (`tabsItemMin=2`, `tabsItemMax=6`). Liczba renderowanych zakładek jest sterowana **liczbą slotów typu `panel`** (repeatable slot), a nie długością tablicy `items` — to ma kluczowe znaczenie (patrz 4.1).

**Renderowanie:** zakładki na froncie są w pełni dostępne (`role=tablist/tab/tabpanel`), a interaktywność zapewnia wstrzykiwany skrypt runtime (`data-coderso-tabs='1'`). W trybie podglądu (admin) interaktywność realizuje stan Reacta (`previewActiveId`).

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej stronie ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — dostaje się do niego przyciskiem **„Run setup again"** (po zakończeniu setupu panel pokazuje komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Sekcja „Starter tabs": select „Number of tabs" (2–6) + read-only podsumowanie etykiet/intro każdej zakładki + własny panel „Live preview". |
| **Visual** | zakładka „Visual" | 5 sekcji widgetowych: Variant, Tab content, Layout, Tab label style, Colors. Dodatkowo współdzielone sekcje wrappera: Structure (sloty), Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 4 sekcje read-only: Behavior summary, Saved tabs summary, Saved display summary, Contract summary + współdzielone Block layout summary, Visibility summary. Brak jakichkolwiek edytowalnych kontrolek. |

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie poniższe interakcje zostały wykonane w sesji `claude-28-05-tabs` i zweryfikowane inspekcją DOM:

- **Wizard:** zmiana liczby zakładek 2→4 i 4→2 (z dialogiem potwierdzenia), porównanie liczby renderowanych zakładek w canvas i w „Live preview".
- **Structure (wrapper):** „Add Panel" (dodanie realnego slotu) i „Remove" (przywrócenie stanu).
- **Visual / Variant:** kliknięcie wszystkich 3 kart (pills → underline → minimal → powrót do pills).
- **Visual / Tab content:** edycja label, content intro, subtitle, icon dla Tab 1; zmiana „Default tab"; włączenie/wyłączenie „Show as unavailable" dla Tab 2.
- **Visual / Layout:** orientation (vertical i horizontal), alignment (center), container padding (Large), tab gap (Small), content gap (Large).
- **Visual / Tab label style:** text size (Base), font weight (Semibold), motion (Slide).
- **Visual / Colors:** zmiana swatcha „Active background" i „Border color"; przycisk „Clear" dla „Active background".
- **Advanced:** odczyt wszystkich sekcji podsumowań i porównanie z edycjami z Visual.
- **Frontend (public):** render początkowy, przełączanie zakładek myszą, nawigacja klawiaturą (ArrowUp/ArrowDown/Home/End), atrybuty ARIA, brak wycieku placeholdera edytora, brak błędów konsoli, brak overflow na 375 px.
- **Admin canvas:** interaktywność podglądu (kliknięcie zakładki w canvas).

---

## 4. Wyniki szczegółowe

### 4.1 Co DZIAŁA — Wizard

- **Select „Number of tabs" (2–6)** — zmiana wartości natychmiast aktualizuje read-only podsumowanie listy zakładek (np. po wyborze 4 pojawiają się „Tab 3" i „Tab 4" w podsumowaniu) oraz pozostaje wartość w kontrolce.
- **Dialog potwierdzenia redukcji** — przy zmniejszaniu liczby zakładek pojawia się natywny `window.confirm` z konkretną treścią:
  *„Reduce tabs to 2? This removes these tab content areas: Tab 3, Tab 4. This cannot be undone."*
  Po zaakceptowaniu liczba elementów wraca do 2. Mechanizm chroni przed przypadkową utratą zawartości i nazewnie wskazuje, które zakładki znikną. ✓
- **Read-only podsumowanie** etykiet i intro każdej zakładki (z badge „Default" przy domyślnej) — odzwierciedla bieżący stan.
- **Live preview** w panelu Wizard renderuje widget przez współdzielony renderer.

### 4.2 Co DZIAŁA — Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Karty wariantu | pills/underline/minimal | `data-coderso-tabs-variant` oraz klasy triggera zmieniają się live: pills→`rounded-full border`, underline→`rounded-none border-b-2 ... border-current`, minimal→`rounded-md ... underline`. ✓ |
| Tab label | „Przegląd" | Etykieta triggera aktualizuje się natychmiast. ✓ |
| Content intro text | „Wprowadzenie do panelu pierwszego" | `<p>` w aktywnym panelu aktualizuje się. ✓ |
| Tab subtitle | „Sekcja główna" | Podtytuł renderuje się pod etykietą (mniejszy, `opacity-75`). ✓ |
| Icon or emoji | „⭐" | Ikona renderuje się przed etykietą jako `aria-hidden`. ✓ |
| Default tab | wybór „Tab 2" | `data-coderso-tabs-active-id` → `2`, aktywny panel pokazuje „Secondary details." ✓ |
| Show as unavailable | Tab 2 = unavailable | Trigger dostaje `aria-disabled=true`, `disabled`, klasę `opacity-50`; aktywna zakładka prawidłowo „spada" na pierwszą dostępną (Tab 1). ✓ |
| Default tab + disabled | Tab 2 unavailable | W dropdownie „Default tab" opcja „Tab 2" jest wyłączona (`disabled`). ✓ |
| Orientation | vertical / horizontal | `data-coderso-tabs-orientation` + `aria-orientation` + klasa tablisty (`flex flex-col` vs `flex flex-wrap`). ✓ |
| Tab alignment | center | klasa tablisty → `justify-center` (horizontal). ✓ |
| Container padding | Large | kontener → `p-6` (z `p-4` dla md). ✓ |
| Tab gap | Small | tablista → `gap-1.5` (z `gap-2`). ✓ |
| Content gap | Large | kontener → `space-y-6` (z `space-y-4`). ✓ |
| Tab label size | Base | trigger → `text-base`. ✓ |
| Tab label weight | Semibold | trigger → `font-semibold`. ✓ |
| Content motion | Slide | `data-coderso-tabs-motion=slide` + panel z klasami `slide-in-from-bottom-2 ... motion-reduce:animate-none`. ✓ |
| Swatch koloru | Active background → czerwony | inline `background-color: rgb(255,0,0)` na aktywnym triggerze. ✓ |
| Swatch koloru | Border color → zielony | inline `border-color: rgb(0,255,0)` na kontenerze i panelu. ✓ |
| Przycisk „Clear" | Active background | usuwa zapisany kolor — aktywny trigger traci inline `background-color`, swatch wraca do fallbacku `#0f172a`. ✓ |

**Structure (sekcja współdzielona wrappera):** „Add Panel" dodaje **realny** slot i renderuje się 3. zakładka („Tab 3"); „Remove" przywraca 2 zakładki. To potwierdza, że to **sloty `panel`** (nie Wizard) sterują faktyczną liczbą renderowanych zakładek. ✓

### 4.3 Co DZIAŁA — Advanced (read-only)

Tryb Advanced jest w 100% read-only i **dokładnie** odzwierciedla stan zapisany w sesji edytora. Po moich edycjach w Visual pokazał m.in.:

- **Behavior summary:** „Opens on: Przegląd (tab 1)", „Default tab: Przegląd (tab 1)", „Unavailable tabs: 0 of 2".
- **Saved tabs summary:** „Przegląd; intro text saved; subtitle saved; icon saved; available" oraz „Tab 2; intro text saved; no subtitle; no icon; available" — pełna zgodność z edycjami.
- **Saved display summary:** „Horizontal; Center aligned", „Container Large; tabs Small; content Large", „Base; Semibold; Slide motion", **„5 saved color choices"** (liczba spadła z 6 do 5 po wyczyszczeniu „Active background" — licznik jest poprawny).
- **Contract summary:** komunikat o tym, że Visual jest właścicielem konfiguracji, a Advanced tylko podsumowuje.

### 4.4 Co DZIAŁA — Frontend (public)

Strona `/test-tabs-0516` zwraca `200` i renderuje **zapisany** stan fixture:

- variant `pills`, orientation `vertical`, 2 zakładki (etykiety domyślne „Tab 1"/„Tab 2"), Tab 1 aktywna.
- **Przełączanie myszą:** klik „Tab 2" → `data-coderso-tabs-active-id=2`, prawidłowe przełączenie `data-state`, `aria-selected`, `tabindex` (aktywny `0`, nieaktywny `-1`) oraz `hidden` na panelach. ✓
- **Nawigacja klawiaturą** (orientacja pionowa): `ArrowDown` = następna, `ArrowUp` = poprzednia, `Home` = pierwsza, `End` = ostatnia. Wszystkie działają i jednocześnie aktywują zakładkę (wzorzec „automatic activation": focus = aktywacja). ✓
- **Dostępność:** `role=tablist` + `aria-label="Content tabs"` + `aria-orientation="vertical"`; każdy `role=tab` ma `aria-controls` wskazujący panel; każdy `role=tabpanel` ma `aria-labelledby` wskazujący trigger oraz `tabindex=0`. ✓
- **Intro panelu** („Primary details.") renderuje się; placeholder edytora („Add widgets to this tab panel.") **nie wycieka** na front (renderowany tylko w trybie edytora). ✓
- **Runtime script** obecny w DOM; **0 błędów i 0 ostrzeżeń** w konsoli.
- **Responsywność:** na 375 px brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓

### 4.5 Admin canvas (podgląd)

Canvas w edytorze renderuje żywy `TabsBlock` (te same atrybuty `data-coderso-tabs-*` co front) i jest interaktywny w trybie podglądu — kliknięcie „Tab 2" przełącza aktywny panel na „Secondary details." ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Rozjazd Wizard „Number of tabs" vs render** | Wizard / sloty | Zmiana „Number of tabs" z 2 na 4 zaktualizowała tablicę `items` i read-only podsumowanie, **ale liczba realnie renderowanych zakładek pozostała 2** — zarówno w głównym canvas, jak i w „Live preview" Wizarda (zweryfikowane: obie tablisty `Content tabs` miały `tabCount=2`). Faktyczną liczbę zakładek tworzą sloty `panel` (sekcja „Structure" → „Add Panel"), a nie kontrolka Wizarda. Sekcja jest opisana jako „Starter tabs / Set the initial tab count **before** daily visual editing", więc intencyjnie służy tylko do startu — ale po setupie kontrolka pozostaje w pełni edytowalna, pokazuje destrukcyjny dialog i zmienia podsumowanie, nie zmieniając przy tym renderu. To realna pułapka UX (dwa nieZSYNCHRONIZOWANE mechanizmy liczby zakładek). |
| **N2 — Martwa opcja `triggerOverflow=scroll`** | Renderer / schema | Schema dopuszcza `triggerOverflow: wrap | scroll`, a Advanced pokazuje stałą etykietę „Line behavior: Tabs wrap onto extra lines when space is tight." Jednak `resolveTriggerOverflow()` **zawsze** zwraca `"wrap"` i **nie istnieje żadna kontrolka UI** do ustawienia `scroll`. Opcja jest faktycznie legacy/martwa; `data-coderso-tabs-overflow` zawsze = `wrap`. |
| **N3 — „Saved custom color" dla wartości domyślnych** | Colors (Visual) | Wszystkie 6 pól kolorów pokazuje etykietę „Saved custom color" i tekst „A saved custom color is configured…", mimo że domyślne wartości to zmienne CSS (`var(--color-surface)` itd.). Swatch wyświetla **kolor fallbacku** (np. `#f8fafc`, `#cbd5e1`, `#0f172a`), a nie rzeczywistą wartość zmiennej. Użytkownik nie odróżni „dziedziczy z motywu" od „ręcznie ustawiony kolor". |
| **N4 — Niespójna dostępność „Clear"** | Colors (Visual) | Przycisk „Clear" mają tylko 3 z 6 kolorów: Surface, Active background, Content background (czyli te, które przechodzą przez `resolveClearableStyleValue`). Border color, Active text color, Inactive text color **nie mają „Clear"** — nie da się ich zresetować do domyślnej zmiennej CSS bez ręcznego wpisania wartości. Zgodne z kodem, ale niespójne dla użytkownika. |
| **N5 — Skutek „Clear" na aktywnym tle** | Colors (Visual) | Po „Clear" na „Active background" aktywny trigger w wariancie `pills` traci inline `background-color` (i `border-color` aktywne), więc aktywny stan może stać się wizualnie nieodróżnialny od nieaktywnego. Funkcjonalnie „Clear" działa, ale brak ostrzeżenia o utracie wyróżnienia aktywnej zakładki. |
| **N6 — Wizard nie jest równorzędnym trybem** | UX nawigacji | Tryb Wizard jest ukryty za przyciskiem „Run setup again"; w panelu trybów widoczne są tylko „Visual" i „Advanced". Dla osoby szukającej „kreatora" nie jest to oczywiste. |
| **N7 — Automatyczna aktywacja klawiaturą** | Frontend a11y | Strzałki/Home/End **jednocześnie** przenoszą focus i aktywują zakładkę (brak trybu „manual activation", gdzie aktywacja następuje dopiero po Enter/Space). To dopuszczalny wzorzec WAI-ARIA, ale przy zakładkach z ciężką zawartością może być kosztowne; warto odnotować jako świadomą decyzję, nie błąd. |

**Nie wykryto** żadnych błędów konsoli, błędów renderowania ani rozjazdu render między admin canvas a frontem dla wspólnie testowanych opcji. Wszystkie kontrolki Visual, które przetestowałem, działają i aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-tabs-0516`) | Zgodność |
|--------|--------------|------------------------------|----------|
| Renderowanie wariantu/atrybutów `data-coderso-tabs-*` | ✓ żywy `TabsBlock` | ✓ identyczne atrybuty | ✓ |
| Przełączanie zakładek | ✓ przez stan Reacta (`previewActiveId`) | ✓ przez skrypt runtime | ✓ |
| Nawigacja klawiaturą | obsługiwana w preview (handlery React) | ✓ ArrowUp/Down/Home/End | ✓ (testowane głównie na froncie) |
| Placeholder pustego panelu | „Add widgets to this tab panel." (tryb edytora) | brak (nie wyciekły) | ✓ poprawne rozróżnienie |
| Dostępność (role/aria) | obecna | obecna i kompletna | ✓ |

**Wniosek:** renderer jest wspólny; admin canvas i front zachowują się spójnie. Różnica jest celowa tylko w warstwie interaktywności (React w preview vs wstrzykiwany skrypt na froncie) i w placeholderze pustego panelu.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. W związku z tym:
  - moje edycje w Visual (np. etykieta „Przegląd", kolory, układ) **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu strony ani propagacji na front;
  - frontend pokazuje **wcześniej zapisany** stan (orientacja `vertical`, etykiety domyślne) — co potwierdza, że niezapisane edycje nie wyciekają.
  - Zweryfikowana została natomiast **trwałość w obrębie sesji edytora** — edycje z Visual były obecne po przełączeniu na Advanced (i z powrotem widoczne w canvas).
- **Zachowanie zakładki „unavailable" na froncie:** zapisany fixture nie ma wyłączonych zakładek (0 z 2), więc stan `disabled` przetestowano tylko w admin canvas, nie na publicznej trasie.
- **Realna zawartość paneli:** panele są puste; nie dodawałem zagnieżdżonych widgetów, więc renderowanie dzieci paneli na froncie nie zostało wykonane.
- **Ostrzeżenia o kontraście kolorów:** advisory pokazywało „No saved color readability warnings"; nie wymusiłem celowo kombinacji niskokontrastowej, by sprawdzić treść ostrzeżenia.
- **`prefers-reduced-motion`:** klasy `motion-reduce:animate-none` są obecne w markupie dla fade/slide, ale nie testowałem zachowania pod włączoną redukcją ruchu.
- **`triggerOverflow=scroll`:** nietestowalne — brak kontrolki UI (patrz N2).
- **Zawijanie wielu zakładek w orientacji poziomej przy wąskim viewport:** fixture ma tylko 2 zakładki, więc realnego zawijania nie sprawdzono.

---

## 8. Podsumowanie

- Widget **tabs jest w dobrym stanie funkcjonalnym**. Wszystkie przetestowane kontrolki Visual (variant, treść zakładek, układ, styl etykiet, kolory) działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje stan; frontend jest w pełni interaktywny i dostępny (klawiatura + ARIA), bez błędów konsoli i bez overflow na mobile.
- **Najważniejszy niuans:** rozjazd między kontrolką Wizarda „Number of tabs" a realną liczbą renderowanych zakładek (N1) — liczbą zakładek steruje system slotów („Add Panel"), nie Wizard.
- **Drobne, ale realne kwestie UX/spójności:** martwa opcja `scroll` (N2), mylące „Saved custom color" dla wartości z motywu (N3), niespójna dostępność „Clear" w kolorach (N4), potencjalna utrata wyróżnienia aktywnej zakładki po „Clear" (N5).
- Nie znaleziono żadnego twardego buga renderowania ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 9. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo.

| Plik (lokalny) | Opis |
|----------------|------|
| `tabs-01-admin-visual-editor.png` | Edytor Visual po edycjach (variant pills, „Przegląd", kolory, układ) |
| `tabs-02-public-route.png` | Publiczna trasa `/test-tabs-0516` — zapisany stan fixture (orientacja vertical) |
