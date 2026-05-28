# RAPORT: Accordion Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-accordion` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/cabe29cc-1ad6-45b7-8773-731cc5b0c503` (strona „Contract Test - accordion", status `Draft`)
> **Fixture public:** http://localhost:3000/test-accordion-0516
> **Pliki źródłowe:** `core/widgets/core/accordion.tsx` (renderer + normalizacja + runtime script) · `core/admin/ui/widgets/editors/AccordionEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-coderso-accordion-*`, klasy Tailwind,
> ARIA, natywny stan `<details>`), a nie tylko zliczeniem widocznych sekcji.
> Sekcje 4–7 jasno oddzielają: co działa, co nie działa / jest mylące, co
> faktycznie przetestowano oraz czego NIE testowano.

> Uwaga o screenshotach: pliki PNG wspomniane w sekcji 9 są **wyłącznie lokalnymi
> etykietami** przechwyceń Playwright w katalogu `.playwright-cli/` (ignorowany
> przez Git). Nie są wymaganym evidence w repo i nie zostały dołączone do żadnego
> pliku źródłowego. Większość weryfikacji oparłem o inspekcję DOM, nie o zrzuty.

---

## 1. Przegląd widgetu

**Typ:** `accordion` · **Kategoria:** `layout` · **Opis:** „Expandable stacked content panels."

**Warianty:** `soft` (domyślny, roomy cards, duży radius), `bordered` (mocniejsze obramowania, mniejszy radius, mniejszy tekst), `compact` (gęsty, oszczędny layout, najmniejsze paddingi).

**Model danych (`AccordionData`):**

| Sekcja | Pola |
|--------|------|
| **items[]** | `id`, `title`, `description` (renderowana jako „Summary text"), `icon` (normalizowany do max 24 znaków) |
| **options** | `openMode` (single/multiple), `defaultOpenIds[]`, `collapsible` (bool), `initiallyOpenId` (legacy), `allowMultiple` (legacy, mapowany na openMode), `motion` (none/subtle/smooth) |
| **style** | `surfaceColor` (clearable), `borderColor`, `summaryTextColor`, `descriptionTextColor`, `summaryPadding`/`contentPadding` (sm/md/lg), `radius` (sm/md/lg/xl), `summaryFontSize` (sm/base/lg), `summaryFontWeight` (medium/semibold/bold) |
| **layout** | `maxWidth` (sm/md/lg/full) |

**Ograniczenia:** min 2 / max 8 itemów (`accordionItemMin=2`, `accordionItemMax=8`). Liczba renderowanych itemów jest sterowana **liczbą slotów typu `item`** (slot repeatable), a nie długością tablicy `items` — to ma kluczowe znaczenie (patrz N1).

**Renderowanie:** każdy item to natywny element `<details>` + `<summary>` (progressive enhancement bez JS), z `role="region"` na panelu treści i `aria-labelledby` wskazującym summary. Tryb single-open używa natywnego atrybutu `name` na `<details>` (wzajemnie wykluczająca się grupa). Wstrzykiwany skrypt runtime (`data-coderso-accordion='1'`) synchronizuje `aria-expanded` i wymusza „przynajmniej jeden otwarty" gdy `collapsible=false`.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej stronie ma **tylko dwie zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest równorzędną zakładką** — wchodzi się do niego przyciskiem **„Run setup again"** (po setupie panel pokazuje komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*). Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w widgecie `tabs`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Sekcja „Starter items": select „Number of items" (2–8) + select „Initially open item" (None / każdy item) + read-only podsumowanie tytułu i summary text każdego itemu (z info-buttonami i tekstem „Visual owns daily item title edits…") + własny panel „Live preview". |
| **Visual** | zakładka „Visual" | Sekcje widgetowe: **Variant** (karty), **Item content** (title/summary/icon per item), **Behavior and Style** (open mode, collapsible, motion, max width, paddingi, radius, title size/weight, 4 kolory). Dodatkowo współdzielone sekcje wrappera: Structure (sloty), Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 4 sekcje read-only: Behavior summary, Saved items summary, Saved display summary, Contract summary + współdzielone Block layout summary, Visibility summary. **Brak jakichkolwiek edytowalnych kontrolek.** |

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie poniższe interakcje zostały wykonane w sesji `claude-28-05-accordion` i zweryfikowane inspekcją DOM:

- **Wizard:** zmiana „Number of items" 2→4 i 4→2 (sprawdzenie listy itemów oraz realnej liczby renderowanych itemów w canvas i w „Live preview"); zmiana „Initially open item" Section 1 → Section 2 → powrót do Section 1 (z weryfikacją stanu w canvas); test wzajemnego oddziaływania canvas ↔ Live preview (patrz N2).
- **Visual / Variant:** kliknięcie wszystkich 3 kart (soft → bordered → compact → powrót do soft) z odczytem klas Tailwind.
- **Visual / Item content:** edycja „Item title" (→ „Pierwsza sekcja"), „Summary text" (→ „Opis pierwszej sekcji") i „Icon or emoji" (→ „★") dla Itemu 1.
- **Visual / Behavior and Style:** open mode single↔multiple (i otwarcie obu paneli w multiple), toggle „Allow all sections to close" (off i z powrotem on), motion → Smooth, max width → „Medium", summary padding → „Spacious".
- **Visual / Colors:** zmiana „Surface color" na `#ff0000`, pojawienie się przycisku „Clear", kliknięcie „Clear" i powrót do stanu domyślnego.
- **Advanced:** odczyt wszystkich 4 sekcji podsumowań i porównanie z edycjami z Visual.
- **Frontend (public):** render początkowy, przełączanie itemów myszą, natywna obsługa klawiaturą (Enter na summary), atrybuty ARIA, zachowanie single-open (wzajemne wykluczanie), zamknięcie wszystkich paneli (collapsible), brak wycieku placeholdera edytora, brak błędów konsoli, brak overflow na 375 px, obecność skryptu runtime.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Select „Number of items" (2–8)** — zmiana wartości natychmiast aktualizuje read-only podsumowanie listy itemów (po wyborze 4 pojawiają się „Item 3" / „Item 4" z tytułami „Section 3"/„Section 4" i „Summary text: Not set"). Wartość pozostaje w kontrolce. **Zastrzeżenie:** nie zmienia realnej liczby renderowanych itemów — patrz N1.
- **Select „Initially open item"** — opcje „None - start collapsed" (widoczna tylko gdy `collapsible=true`), „Section 1", „Section 2". Po wyborze „Section 2" **główny canvas poprawnie otwiera Section 2 i zamyka Section 1** (`data-coderso-accordion-item` 2 → `open=true`). Zapisuje `options.defaultOpenIds`.
- **Read-only podsumowania** tytułu i summary text każdego itemu (info-button „Item title info" + tekst „Visual owns daily item title edits after setup creates the item.") — odzwierciedlają bieżący stan.
- **„Finish setup and open Visual"** — wraca do zakładki Visual. ✓
- **Live preview** renderuje widget przez współdzielony renderer (z zastrzeżeniem N2).
- **Redukcja liczby itemów (4→2) NIE pokazuje dialogu potwierdzenia** — w przeciwieństwie do widgetu `tabs`, accordion nie ma `window.confirm` przy zmniejszaniu. Jest to akceptowalne, bo `setCount` w accordionie nie usuwa realnych slotów (tylko tablicę `items`), więc nie ma destrukcyjnej utraty zagnieżdżonej treści — ale stanowi niespójność UX między widgetami.

### 4.2 Visual

| Kontrolka | Test | Efekt w canvas (zweryfikowany w DOM) |
|-----------|------|--------------------------------------|
| Karty wariantu | soft / bordered / compact | `data-coderso-accordion-variant` + klasy fallbacku zmieniają się live: soft→`rounded-xl`, `px-4 py-3`, `text-base font-semibold`; bordered→`rounded-lg`, `text-sm font-semibold`; compact→`rounded-md`, `px-3 py-2`, `text-sm font-medium`, content `p-3`. ✓ |
| Item title | „Pierwsza sekcja" | Tekst summary w canvas aktualizuje się natychmiast. ✓ |
| Summary text | „Opis pierwszej sekcji" | `<p>` w panelu treści (`role=region`) aktualizuje się. ✓ |
| Icon or emoji | „★" | Ikona renderuje się przed tytułem jako `<span aria-hidden="true">`. ✓ |
| Open mode | single → multiple | `data-coderso-accordion-open-mode` zmienia się; atrybut `name` na `<details>` **znika** (z `accordion-blk-1-group` na `null`). ✓ |
| Open mode = multiple | otwarcie obu itemów | Po kliknięciu obu summary oba `<details>` mają `open=true` jednocześnie (brak wzajemnego wykluczania). ✓ |
| Allow all sections to close (collapsible) | off / on | `data-coderso-accordion-collapsible` przełącza się `false`/`true`. ✓ |
| „Default open setup" (read-only) | po edycji tytułu | Pokazuje aktualną etykietę domyślnie otwartego itemu („Pierwsza sekcja"). ✓ |
| Motion | Smooth | `data-coderso-accordion-motion=smooth` + summary dostaje `motion-safe:transition-all motion-safe:duration-200`, a chevron `motion-safe:transition-transform motion-safe:duration-200`. ✓ |
| Max width | „Medium" | root → `max-w-2xl` (z `max-w-none`). ✓ (uwaga do etykiet — N4) |
| Summary padding | „Spacious" | summary → `px-5 py-4`, **nadpisując** fallback wariantu soft (`px-4 py-3`). ✓ |
| Surface color | `#ff0000` | kontener `<details>` dostaje inline `background-color: rgb(255,0,0)`. ✓ |
| Badge koloru | po zmianie | etykieta zmienia się z „Theme default" na „Selected color". ✓ |
| Przycisk „Clear" | Surface color | pojawia się dopiero po ustawieniu własnego koloru; po kliknięciu usuwa inline `background-color`, badge wraca do „Theme default". ✓ |

**Spójność „Clear" w kolorach:** wszystkie **4 pola kolorów** (Surface, Border, Summary text, Body text) mają działający przycisk „Clear" (pojawia się, gdy wartość różni się od theme default). To **lepiej** niż w widgetach `tabs`/`contact`, gdzie część kolorów (np. border) nie miała „Clear".

### 4.3 Advanced (read-only)

Tryb Advanced jest w 100% read-only i **dokładnie** odzwierciedla stan z mojej sesji edycji w Visual:

- **Behavior summary:** „Visitor opening: One item opens at a time", „Starts with: Pierwsza sekcja", „All-closed behavior: All items may close", „Motion: Smooth". ✓
- **Saved items summary:** „Item 1: Pierwsza sekcja; summary text saved; icon saved" oraz „Item 2: Section 2; summary text saved; no icon" — pełna zgodność z edycjami. ✓
- **Saved display summary:** „Style preset: Soft", „Width: Medium", „Spacing: Heading Spacious; content Preset", „Title style: Preset size; Preset weight", „Color choices: Theme colors are inherited" (po wyczyszczeniu Surface licznik kolorów = 0). ✓
- **Contract summary:** „Visual owns variant, item content, behavior, layout, and style. Advanced only summarizes the saved state." ✓

Dodatkowo widoczne są współdzielone sekcje wrappera: „Block layout summary" i „Visibility summary".

### 4.4 Frontend (public)

Strona `/test-accordion-0516` zwraca `200` i renderuje **zapisany** stan fixture (NIE moje niezapisane edycje):

- variant `soft`, openMode `single`, collapsible `true`, motion `none`, `max-w-none`, 2 itemy („Section 1"/„Section 2"), w zapisanym stanie domyślnie otwarty jest **Section 2**.
- **Skrypt runtime zadziałał** — root ma `data-coderso-accordion-bound="true"`. ✓
- **Przełączanie myszą:** klik „Section 1" → Section 1 `open=true`, `aria-expanded="true"`, a Section 2 zostaje **automatycznie zamknięte** (`open=false`, `aria-expanded="false"`) dzięki natywnej grupie `name` (single-open). ✓
- **`aria-expanded` synchronizuje się** na froncie po każdym toggle (skrypt runtime), w przeciwieństwie do canvas w adminie (patrz N3). ✓
- **collapsible=true → można zamknąć wszystko:** po ponownym kliknięciu „Section 1" oba panele są zamknięte (`anyOpen=false`). ✓
- **Klawiatura:** `<summary>` jest natywnie fokusowalne; `Enter` otwiera panel (`open=true`, `aria-expanded="true"`). ✓
- **Dostępność:** root `role="group"` + `aria-label="Accordion"`; każde `<summary>` ma `id` i `aria-controls` wskazujący panel; każdy panel `role="region"` + `aria-labelledby` wskazujący summary; ikona `aria-hidden`. ✓
- **Treść:** oba opisy (`description`) renderują się w panelach; placeholder edytora („Add widgets to this accordion item.") **nie wycieka** na front. ✓
- **Konsola:** **0 błędów i 0 ostrzeżeń.** ✓
- **Responsywność:** na 375 px brak poziomego overflow (`scrollWidth == clientWidth == 375` dla `<html>` i dla roota accordeonu). ✓

### 4.5 Admin canvas (podgląd)

Canvas renderuje żywy `AccordionBlock` (te same atrybuty `data-coderso-accordion-*` co front). W trybie single domyślnie otwarty jest item zgodny z `defaultOpenIds`. Canvas pokazuje placeholder „Add widgets to this accordion item." w pustym panelu (poprawne — to tryb edytora).

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Rozjazd Wizard „Number of items" vs realny render** | Wizard / sloty | Zmiana „Number of items" z 2 na 4 zaktualizowała tablicę `items`, read-only podsumowanie itemów (pojawiły się „Item 3"/„Item 4") **oraz** podsumowanie w Advanced — **ale liczba realnie renderowanych itemów pozostała 2** zarówno w głównym canvas, jak i w „Live preview" Wizarda (`data-coderso-accordion-count="2"` w obu, tytuły wciąż tylko „Section 1"/„Section 2"). Faktyczną liczbę itemów tworzy system slotów `item` (sekcja „Structure" → „Add Item" lub akcja w canvas), a nie kontrolka Wizarda. Sekcja jest opisana jako „Set the initial item count… **before** daily visual editing", więc intencyjnie służy do startu — ale po setupie kontrolka pozostaje w pełni edytowalna i zmienia podsumowania, nie zmieniając renderu. To realna pułapka UX (dwa nieZSYNCHRONIZOWANE mechanizmy liczby itemów) — identyczna z N1 z raportu `tabs`. |
| **N2 — Współdzielona grupa `name` między canvas a Live preview (bug, admin-only)** | Wizard / renderer | W trybie Wizard jednocześnie w DOM są **dwa** rendery tego samego bloku accordeonu: główny canvas i „Live preview" w panelu. Oba używają **identycznego** atrybutu `name="accordion-blk-1-group"` (pochodzi z `blockId`, ten sam dla obu renderów). Ponieważ natywne grupowanie `<details name>` jest **globalne w obrębie dokumentu**, w trybie single-open oba rendery dzielą jedną wykluczającą się grupę. **Zademonstrowane:** kliknięcie „Section 1" w Live preview **zamknęło Section 2 w głównym canvas**. Dotyczy tylko admina (dwa rendery współistnieją) i tylko trybu single (w multiple nie ma `name`). Front jest bezpieczny (jeden render, `name` oparty na UUID bloku). Naprawa: nazwa grupy powinna być dodatkowo zróżnicowana per kontekst renderowania (canvas vs preview). |
| **N3 — `aria-expanded` nie synchronizuje się w canvas adminowym** | Renderer / a11y (admin-only) | Skrypt runtime jest wstrzykiwany przez `dangerouslySetInnerHTML`, którego **React nie wykonuje** w trybie edytora. Skutek: po **ręcznym** toggle itemu w canvas natywny `open` się zmienia, ale `aria-expanded` zostaje na wartości początkowej (z `shouldOpen`) — zaobserwowano `open=true` przy `aria-expanded="false"`. Stan początkowy jest poprawny; rozjazd pojawia się dopiero po interakcji w canvas. Na froncie problem nie występuje (skrypt działa, aria się synchronizuje). Niski priorytet (preview adminowy), ale warto odnotować. |
| **N4 — Mylące etykiety „Max width"** | Visual / layout | Tokeny szerokości są przemapowane na etykiety: `sm`→„Medium" (`max-w-2xl`), `md`→„Wide", `lg`→„Extra wide", `full`→„Full width". Najwęższa dostępna opcja nazywa się **„Medium"** — brak „Small"/„Narrow". Użytkownik może oczekiwać, że „Medium" to środek skali, podczas gdy to faktycznie najwęższe ustawienie. Czysto nazewnicze, ale mylące. |
| **N5 — Advanced pokazuje „Preset" zamiast wartości efektywnej** | Advanced | „Saved display summary" pokazuje „Spacing: Heading Spacious; **content Preset**" i „Title style: **Preset** size; **Preset** weight" dla tokenów stylu, których użytkownik nie ustawił jawnie (renderer dziedziczy je z fallbacku wariantu). Nie jest to błąd — ale słowo „Preset" jest mniej informacyjne niż realnie zastosowana wartość (np. dla soft content padding faktycznie = „Default"). Użytkownik nie dowie się z Advanced, jaki padding/rozmiar realnie obowiązuje, dopóki sam go nie nadpisze. |
| **N6 — Wizard nie jest równorzędnym trybem** | UX nawigacji | Tryb Wizard jest ukryty za przyciskiem „Run setup again"; w panelu trybów widoczne są tylko „Visual" i „Advanced". Dla osoby szukającej „kreatora" nie jest to oczywiste (spójne z `tabs`, ale wciąż warte odnotowania). |
| **N7 — „Clear" na Surface = brak tła, nie kolor motywu** | Visual / colors | Po „Clear" na „Surface color" kontener traci inline `background-color` całkowicie (transparent), a nie wraca do `var(--color-surface)`. Badge pokazuje „Theme default", ale wizualnie panel staje się przezroczysty (przepuszcza tło sekcji), co niekoniecznie jest tym samym co kolor powierzchni z motywu. Zgodne z semantyką clearable, ale subtelnie mylące. |

**Nie wykryto** żadnych błędów konsoli na froncie, żadnego twardego buga renderowania ani rozjazdu render między wspólnie testowanymi opcjami admin↔front. Wszystkie kontrolki Visual, które przetestowałem, działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje stan; frontend jest w pełni interaktywny i dostępny.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-accordion-0516`) | Zgodność |
|--------|--------------|-----------------------------------|----------|
| Atrybuty `data-coderso-accordion-*` | ✓ żywy `AccordionBlock` | ✓ identyczne atrybuty | ✓ |
| Otwieranie/zamykanie itemów | ✓ natywny `<details>` (bez skryptu) | ✓ natywny `<details>` + skrypt runtime | ✓ |
| Single-open (`name`) | ✓ działa natywnie | ✓ działa natywnie | ✓ |
| `aria-expanded` po ręcznym toggle | ✗ nie synchronizuje (N3) | ✓ synchronizuje (skrypt) | ⚠ tylko front poprawny |
| Grupa `name` przy 2 renderach | ✗ kolizja canvas↔preview (N2) | ✓ jeden render, brak kolizji | ⚠ tylko admin buggy |
| `collapsible=false` (wymuszenie otwartego) | brak skryptu → tylko atrybut | egzekwowane przez skrypt | ⚠ (nietestowane na froncie — fixture ma `true`) |
| Placeholder pustego panelu | „Add widgets to this accordion item." | brak (nie wyciekł) | ✓ poprawne rozróżnienie |
| Dostępność (role/aria-label/region) | obecna | obecna i kompletna | ✓ |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest wspólny; canvas i front zachowują się spójnie dla testowanych opcji. Różnice są celowe (placeholder pustego panelu) **lub** wynikają z braku wykonywania skryptu runtime w adminie (N3) i z kolizji `name` przy dwóch równoczesnych renderach w Wizardzie (N2) — oba są specyficzne dla admina, front jest czysty.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. W związku z tym:
  - moje edycje w Visual/Wizard (np. „Pierwsza sekcja", ikona „★", motion Smooth, Medium width, Spacious padding) **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front;
  - frontend pokazuje **wcześniej zapisany** stan (motion `none`, etykiety domyślne, domyślnie otwarty Section 2) — co potwierdza, że niezapisane edycje nie wyciekają;
  - zweryfikowana została natomiast **trwałość w obrębie sesji edytora** — edycje z Visual były obecne i poprawnie podsumowane po przełączeniu na Advanced.
- **`collapsible=false` na froncie:** zapisany fixture ma `collapsible=true`, więc wymuszanie „przynajmniej jeden otwarty" przez skrypt runtime (`ensureOpenItem`) sprawdziłem tylko jako atrybut w adminie (gdzie skrypt nie działa), **nie** na publicznej trasie.
- **Tryb `multiple` na froncie:** zapisany fixture jest `single`; wielokrotne otwieranie przetestowałem tylko w canvas adminowym.
- **Dodawanie/usuwanie realnych slotów itemów:** nie klikałem „Add Item" w sekcji Structure (aby nie modyfikować struktury slotów fixture). Liczba renderowanych itemów (2) była sterowana istniejącymi slotami — to wnioskuję, nie wymusiłem dodania 3. slotu.
- **Zagnieżdżone widgety w panelach:** sloty itemów są puste; nie dodawałem dzieci, więc renderowanie zagnieżdżonej treści na froncie nie zostało wykonane.
- **`prefers-reduced-motion`:** klasy `motion-safe:*` są obecne dla subtle/smooth, ale nie testowałem zachowania pod włączoną redukcją ruchu.
- **Limit długości ikony (24 znaki):** wpisałem krótką ikonę, nie testowałem ucinania długiego tekstu.
- **Pozostałe selecty stylu (content padding, corner radius, title size, title weight):** zweryfikowałem mechanizm nadpisywania fallbacku wariantu na przykładzie „Summary padding" → „Spacious" (zadziałał); pozostałe selecty mają identyczny wzorzec kodu i ten sam mechanizm, ale nie klikałem każdego z osobna.
- **Border/Summary text/Body text color (zmiana wartości):** zmianę wartości + „Clear" przetestowałem realnie tylko na „Surface color"; dla pozostałych potwierdziłem obecność i działanie wzorca „Clear" z kodu i z badge'a (wszystkie 4 pola dzielą ten sam komponent `ColorField`).

---

## 8. Podsumowanie

- Widget **accordion jest w dobrym stanie funkcjonalnym**. Wszystkie przetestowane kontrolki Visual (variant, treść itemów, open mode, collapsible, motion, max width, padding, kolory + Clear) działają i aktualizują podgląd na żywo; Advanced wiernie i poprawnie podsumowuje zapisany stan; frontend jest w pełni interaktywny i dostępny (natywne `<details>`, klawiatura, kompletne ARIA, synchronizacja `aria-expanded`), bez błędów konsoli i bez overflow na mobile.
- **Najważniejszy niuans (N1):** rozjazd między kontrolką Wizarda „Number of items" a realną liczbą renderowanych itemów — liczbą itemów steruje system slotów („Add Item"), nie Wizard. To samo zjawisko co w `tabs`.
- **Realny bug admin-only (N2):** w trybie Wizard główny canvas i „Live preview" dzielą tę samą grupę `name` natywnych `<details>`, więc w trybie single otwarcie itemu w jednym renderze zamyka itemy w drugim. Zademonstrowane. Front nieobjęty.
- **Drobne kwestie:** brak synchronizacji `aria-expanded` w canvas adminowym (N3, front OK), mylące etykiety „Max width" (N4), mało informacyjne „Preset" w Advanced (N5), Wizard ukryty za „Run setup again" (N6), „Clear" na Surface = transparent zamiast koloru motywu (N7).
- **Plus względem innych widgetów:** spójne przyciski „Clear" dla **wszystkich 4** kolorów oraz poprawne badge „Theme default" / „Selected color" (czytelniejsze niż „Saved custom color" z `tabs`).
- Nie znaleziono żadnego błędu renderowania ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji; wszystkie rozbieżności wynikają z celowych różnic (placeholder) lub z dwóch admin-only mechanizmów (N2, N3).

---

## 9. Screenshoty (lokalne etykiety)

> Poniższe nazwy to **wyłącznie lokalne etykiety** przechwyceń w `.playwright-cli/`
> (katalog ignorowany przez Git). Nie są wymaganym evidence i nie są dołączone do
> repo. Główna weryfikacja w tym raporcie opierała się o inspekcję DOM, nie o zrzuty.

| Plik (lokalny) | Opis |
|----------------|------|
| `accordion-01-public-route.png` | Publiczna trasa `/test-accordion-0516` — zapisany stan fixture (soft, single, motion none) |
| `accordion-02-admin-visual-editor.png` | Edytor w trybie Visual po edycjach sesyjnych (variant soft, „Pierwsza sekcja", ikona, kolory/clear) |
