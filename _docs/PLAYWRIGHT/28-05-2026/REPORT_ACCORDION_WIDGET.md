# RAPORT: Accordion Widget — pełny audyt domknięcia luk (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony (gap-close — domknięcie luk z poprzedniej iteracji)
> **Data audytu:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-accordion-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/cabe29cc-1ad6-45b7-8773-731cc5b0c503` (strona „Contract Test - accordion", status `Draft`)
> **Fixture public:** http://localhost:3000/test-accordion-0516
> **Pliki źródłowe:** `core/widgets/core/accordion.tsx` (renderer + normalizacja + runtime script) · `core/admin/ui/widgets/editors/AccordionEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` + `ClearableFields.tsx` (kontrolki kolorów)

> **Domknięte luki z poprzedniej iteracji (28-05):**
> 1. „Nie każdy select stylu kliknięty" → **w tej iteracji kliknięto każdą opcję każdego selectu stylu** (motion, max width, summary padding, content padding, corner radius, title size, title weight) i zweryfikowano efekt w DOM canvas.
> 2. „Add item nie wykonany" → **wykonano realne `Add Item` (2→8), `Remove` (8→2) oraz `Move up/down` (reorder)** w sekcji Structure, z weryfikacją liczby renderowanych itemów i ograniczeń min/max.
> Dodatkowo domknięto: ustawienie + `Clear` na **wszystkich 4** kolorach, tryb `multiple` z realnym dwu-otwarciem, edycja treści itemów + **ucięcie ikony do 24 znaków**, oraz select „Initially open item" (Section 2 / None).

> **Metodologia:** każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną
> interakcją w UI oraz inspekcją DOM (atrybuty `data-coderso-accordion-*`, klasy
> Tailwind, ARIA, natywny `open`, inline `style`), a nie zliczeniem widocznych sekcji.

> **Screenshoty:** w tej sesji **nie przechwycono żadnych plików PNG**. Cała weryfikacja
> opiera się o inspekcję DOM / drzewa dostępności (pliki `.yml` w `.playwright-cli/`,
> katalog ignorowany przez Git — są to migawki accessibility tree, nie zrzuty obrazu).

---

## 1. Przegląd widgetu

**Typ:** `accordion` · **Kategoria:** `layout` · **Opis:** „Expandable stacked content panels."

**Warianty:** `soft` (domyślny, roomy cards, duży radius), `bordered` (mocniejsze obramowania, mniejszy radius, mniejszy tekst), `compact` (gęsty layout, najmniejsze paddingi).

**Model danych (`AccordionData`):** `items[]` (`id`, `title`, `description`→„Summary text", `icon` normalizowane do max 24 znaków) · `options` (`openMode` single/multiple, `defaultOpenIds[]`, `collapsible`, `initiallyOpenId` legacy, `allowMultiple` legacy→openMode, `motion` none/subtle/smooth) · `style` (4 kolory clearable + `summaryPadding`/`contentPadding` sm/md/lg, `radius` sm/md/lg/xl, `summaryFontSize` sm/base/lg, `summaryFontWeight` medium/semibold/bold) · `layout` (`maxWidth` sm/md/lg/full).

**Ograniczenia:** min 2 / max 8 itemów (`accordionItemMin=2`, `accordionItemMax=8`). **Liczbę renderowanych itemów steruje liczba slotów typu `item`** (slot repeatable), a NIE długość tablicy `items` — patrz N1.

**Renderowanie:** każdy item to natywny `<details>`+`<summary>` (progressive enhancement bez JS), z `role="region"` na panelu i `aria-labelledby`. Tryb single używa natywnego atrybutu `name` na `<details>` (wzajemnie wykluczająca się grupa). Skrypt runtime (`data-coderso-accordion='1'`) synchronizuje `aria-expanded` i wymusza „≥1 otwarty" gdy `collapsible=false`.

---

## 2. Architektura trybów edytora

Panel edytora ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard NIE jest równorzędną zakładką** — wchodzi się weń przyciskiem **„Run setup again"** (po setupie komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*), kończy „Finish setup and open Visual". Identyczny wzorzec jak w `tabs`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | „Starter items": select „Number of items" (2–8) + select „Initially open item" + read-only podsumowania tytułu/summary per item + własny „Live preview". |
| **Visual** | zakładka „Visual" | **Variant** (3 karty), **Item content** (title/summary/icon per item), **Behavior and Style** (open mode, collapsible, motion, max width, 2× padding, radius, title size/weight, 4 kolory). Współdzielone: **Structure** (Add Item / Remove / Move), Block layout, Device visibility. |
| **Advanced** | zakładka „Advanced" | 4 sekcje read-only (Behavior / Saved items / Saved display / Contract) + Block layout summary, Visibility summary. **Zero edytowalnych kontrolek** (zweryfikowane: 0 inputów/selectów/switchy w panelu). |

---

## 3. Zakres przetestowanych interakcji (co faktycznie kliknięto)

Wszystko w sesji `claude-29-05-accordion-gap-close`, weryfikowane inspekcją DOM:

- **Frontend:** render początkowy, toggle myszą, wzajemne wykluczanie (single), zamknięcie wszystkich (collapsible), klawiatura (Enter), pełne ARIA, brak błędów konsoli, brak overflow @375 px, brak wycieku placeholdera.
- **Style selecty (KAŻDA opcja):** Motion ×3, Max width ×4, Summary padding ×3, Content padding ×3, Corner radius ×4, Title size ×3, Title weight ×3.
- **Variant:** wszystkie 3 karty (atrybut + klasy fallbacku na czystym stanie) oraz interakcja z jawnymi tokenami stylu (override).
- **Open mode:** single→multiple→single + realne dwu-otwarcie w multiple.
- **Collapsible:** off→on.
- **Kolory (KAŻDE z 4 pól):** ustawienie wartości + przycisk **Clear** (Surface, Border, Summary text, Body text) z odczytem inline `style` i badge.
- **Item controls:** Add Item (2→8, blokada na 8), Remove (8→2, znika na min), Move up/down (reorder ids), edycja title/summary/icon, **ucięcie ikony 30→24 znaki**.
- **Wizard:** „Number of items" (2→4, test N1) + „Initially open item" (Section 2 / None).
- **Advanced:** odczyt wszystkich sekcji read-only + potwierdzenie braku kontrolek edycyjnych.
- **Admin-only bugi:** N2 (kolizja `name` canvas↔Live preview — demonstracja behawioralna) i N3 (brak synchronizacji `aria-expanded` w canvas).

---

## 4. CO PRZETESTOWANO i DZIAŁA (szczegóły z DOM)

### 4.1 Style selecty — każda opcja zweryfikowana

| Select | Opcja → klasa/atrybut w canvas |
|--------|--------------------------------|
| **Motion** | `None`→brak klas; `Subtle`→`motion-safe:transition-colors duration-150` (summary) + chevron `transition-transform duration-150` + `data-…-motion=subtle`; `Smooth`→`transition-all duration-200` + chevron `transition-transform duration-200` + `=smooth` |
| **Max width** | `Medium`→`max-w-2xl`; `Wide`→`max-w-3xl`; `Extra wide`→`max-w-4xl`; `Full width`→`max-w-none` |
| **Summary padding** | `Compact`→`px-3 py-2`; `Default`→`px-4 py-3`; `Spacious`→`px-5 py-4` |
| **Content padding** | `Compact`→`p-3`; `Default`→`p-4`; `Spacious`→`p-5` |
| **Corner radius** | `Small`→`rounded-md`; `Medium`→`rounded-lg`; `Large`→`rounded-xl`; `Extra large`→`rounded-2xl` |
| **Title size** | `Small`→`text-sm`; `Default`→`text-base`; `Large`→`text-lg` |
| **Title weight** | `Medium`→`font-medium`; `Semibold`→`font-semibold`; `Bold`→`font-bold` |

Wszystkie selecty to komponenty Radix (`role=combobox` + popover `role=option`); każda opcja zaktualizowała podgląd canvas natychmiast.

### 4.2 Variant (3 karty) — na czystym stanie

| Variant | radius | summary padding | font size | font weight | content padding | atrybut |
|---------|--------|-----------------|-----------|-------------|-----------------|---------|
| **soft** | `rounded-xl` | `px-4 py-3` | `text-base` | `font-semibold` | `p-4` | `=soft` |
| **bordered** | `rounded-lg` | `px-4 py-3` | `text-sm` | `font-semibold` | `p-4` | `=bordered` |
| **compact** | `rounded-md` | `px-3 py-2` | `text-sm` | `font-medium` | `p-3` | `=compact` |

`data-coderso-accordion-variant` zmienia się dla wszystkich 3; klasy fallbacku zgodne z `accordionVariantFallbackClassMap`. **Niuans (patrz N8):** klasy fallbacku wariantu działają tylko dla tokenów stylu, które NIE są jawnie ustawione.

### 4.3 Open mode + collapsible + dwu-otwarcie

- **single ↔ multiple:** w single oba `<details>` mają `name="accordion-blk-1-group"`; w multiple atrybut `name` **znika** (puste) → `data-coderso-accordion-open-mode` przełącza się. ✓
- **Dwu-otwarcie (multiple):** po otwarciu obu itemów oba `<details>` mają `open=true` jednocześnie → odczyt `[true,true]`. ✓
- **Collapsible:** switch przełącza `data-coderso-accordion-collapsible` `true`↔`false`. ✓

### 4.4 Kolory — wszystkie 4 pola: ustawienie + Clear

| Pole | Ustawienie (inline `style`) | Po `Clear` | Badge |
|------|-----------------------------|-----------|-------|
| **Surface** | `background-color: rgb(255,0,0)` na `<details>` | **pusty (transparent)** — NIE wraca do koloru motywu (N7) | `Selected color` → `Theme default` |
| **Border** | `border-color: rgb(0,255,0)` na details/summary/content | **`var(--color-border)`** (kolor motywu) | `Selected color` → `Theme default` |
| **Summary text** | `color: rgb(0,0,255)` na summary | **`var(--color-text)`** (kolor motywu) | `Selected color` → `Theme default` |
| **Body text** | `color: rgb(18,52,86)` na `<p>` opisu | **pusty** (brak inline; `descriptionTextColor` nie ma domyślnej wartości motywu) | `Selected color` → `Theme default` |

Przycisk **Clear** pojawia się tylko, gdy wartość różni się od theme default; działa dla wszystkich 4 pól. Toast „… cleared." z opcją Undo (z `ClearableFieldHeader`). Niespójność semantyki Clear między polami opisana w N7.

### 4.5 Item controls (Structure) — Add / Remove / Reorder

- **Add Item:** klik kolejno zwiększa liczbę **realnie renderowanych** itemów: 2→3→4→5→6→7→8; każdorazowo w canvas pojawia się nowy `<details>` z domyślnym tytułem „Section N". Na **8** przycisk „Add Item" staje się **`disabled`** (limit `accordionItemMax=8` egzekwowany). ✓
- **Remove:** przyciski „Remove" per slot **pojawiają się dopiero gdy liczba > min (2)**; po usunięciu liczba spada (3→2), a id-y renderowanych itemów aktualizują się (`[2,1,3]`→`[2,1]`). Na **2** przyciski „Remove" **znikają** (egzekwowany `accordionItemMin=2`). ✓
- **Reorder (Move up/down):** kolejność slotów zmienia kolejność renderu — `data-coderso-accordion-item` z `[1,2,3]` → `[2,1,3]` po „Move down" na slocie Item 1. Skrajne przyciski są `disabled` (góra dla pierwszego, dół dla ostatniego). ✓

### 4.6 Item content (edycja treści) + ucięcie ikony

- **Item title** → tekst summary w canvas aktualizuje się live („Pierwsza sekcja"). ✓
- **Summary text** → `<p role=region>` aktualizuje się („Opis pierwszej sekcji"). ✓
- **Icon or emoji** → renderuje się jako `<span aria-hidden="true">` przed tytułem („★", długość 1). ✓
- **Ucięcie ikony do 24 znaków:** wpisanie 30 znaków (`123456789012345678901234567890`) → w canvas renderuje się dokładnie **24 znaki** (`123456789012345678901234`). Potwierdza `normalizeShortPlainText(..., 24)`. ✓ *(luka z poprzedniego raportu zamknięta)*

### 4.7 Wizard — selecty

- **„Initially open item":** opcje to „None - start collapsed" (tylko gdy `collapsible=true`), tytuły itemów (np. „Pierwsza sekcja", „Section 2"). Wybór **„Section 2"** → canvas: item 1 `open=false`, item 2 `open=true`. Wybór **„None - start collapsed"** → oba `open=false`. ✓
- **„Number of items":** patrz N1 — zmienia tablicę i podsumowania, ale NIE liczbę renderowanych itemów.

### 4.8 Advanced (read-only)

- Panel zawiera **0 kontrolek edycyjnych** (zweryfikowane: brak `input`/`select`/`switch`). ✓
- Sekcje: Behavior summary (Visitor opening, Starts with, All-closed behavior, Motion), Saved items summary (per item: tytuł + „summary text saved/no summary text" + „icon saved/no icon"), Saved display summary (Style preset, Width, Spacing, Title style, Color choices), Contract summary + współdzielone Block layout / Visibility summary.
- **Odzwierciedla bieżący (także niezapisany) stan edytora** — po dodaniu 8 itemów w Visual sekcja „Saved items summary" pokazała Item 1–8 (mimo braku zapisu). Patrz N6. ✓
- Dla nieustawionych tokenów stylu pokazuje słowo „Preset" (N5).

### 4.9 Frontend (public `/test-accordion-0516`)

Strona zwraca `200` i renderuje **zapisany** stan fixture (NIE moje niezapisane edycje):

- variant `soft`, openMode `single`, collapsible `true`, motion `none`, `max-w-none`, 2 itemy; domyślnie otwarty **Section 2**.
- **Skrypt runtime zadziałał** — root ma `data-coderso-accordion-bound="true"`. ✓
- **Single-open:** klik „Section 1" → item 1 `open=true`/`aria-expanded=true`, item 2 automatycznie `open=false`/`aria-expanded=false` (natywna grupa `name`, oparta o UUID bloku `accordion-b25f9093-…-group`). ✓
- **`aria-expanded` synchronizuje się** na froncie po każdym toggle (skrypt runtime), w przeciwieństwie do admina (N3). ✓
- **collapsible=true:** drugi klik „Section 1" → wszystko zamknięte (`anyOpen=false`). ✓
- **Klawiatura:** focus summary + `Enter` → `open=true`/`aria-expanded=true`. ✓
- **ARIA:** root `role=group`+`aria-label="Accordion"`; każde summary ma `id`+`aria-controls`; panel `role=region`+`aria-labelledby`; ikona `aria-hidden`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność @375 px:** brak poziomego overflow (`scrollWidth==clientWidth==375` dla `<html>` i roota). ✓
- **Placeholder edytora** („Add widgets to this accordion item.") **nie wycieka** na front. ✓

---

## 5. CO NIE DZIAŁA / JEST MYLĄCE (bugi i niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Wizard „Number of items" ≠ realny render** | Wizard / sloty | Zmiana „Number of items" 2→4 zaktualizowała tablicę `items` i read-only podsumowania (pojawiły się „Item 3"/„Item 4") **oraz** podsumowanie w Advanced, ale **liczba realnie renderowanych itemów pozostała 2** w canvas i w „Live preview" (`data-coderso-accordion-count="2"` w obu). Faktyczną liczbę tworzy slot system (`Add Item` w sekcji Structure), nie kontrolka Wizarda. **Potwierdzone w tej iteracji od dwóch stron:** (a) Wizard count→4 nie zmienia renderu; (b) `Add Item` realnie zwiększa render 2→3…→8. To realna pułapka UX (dwa nieZSYNCHRONIZOWANE mechanizmy). Identyczne z N1 z `tabs`. |
| **N2 — Wspólna grupa `name` canvas ↔ Live preview (bug, admin-only)** | Wizard / renderer | W trybie Wizard w DOM są **dwa** rendery tego samego bloku (canvas + „Live preview"); oba używają **identycznego** `name="accordion-blk-1-group"` (z `blockId`). Ponieważ natywne grupowanie `<details name>` jest globalne w dokumencie, w single oba rendery dzielą jedną wykluczającą grupę. **Zademonstrowane behawioralnie:** otwarcie itemu 1 w Live preview **zamknęło item 1 w canvas** (canvas `open=true` → `false` po kliknięciu w preview). Dotyczy tylko admina i tylko single (w multiple `name` znika). Front bezpieczny (jeden render, `name` oparty na UUID). Naprawa: różnicować nazwę grupy per kontekst renderowania. |
| **N3 — `aria-expanded` nie synchronizuje się w canvas admina** | Renderer / a11y (admin-only) | Skrypt runtime wstrzykiwany przez `dangerouslySetInnerHTML` **nie jest wykonywany przez React** w edytorze (`data-coderso-accordion-bound` = undefined w canvas). **Zademonstrowane:** item 2 (domyślnie zamknięty) po ręcznym toggle ma `open=true`, ale `aria-expanded` zostaje `"false"`. Stan początkowy jest poprawny; rozjazd pojawia się po interakcji. Na froncie problem NIE występuje (skrypt działa, `bound=true`, aria się synchronizuje). Niski priorytet (preview admina). |
| **N4 — Mylące etykiety „Max width"** | Visual / layout | Tokeny przemapowane: `sm`→„Medium" (`max-w-2xl`), `md`→„Wide", `lg`→„Extra wide", `full`→„Full width". Najwęższa opcja nazywa się **„Medium"** — brak „Small"/„Narrow". Użytkownik może oczekiwać, że „Medium" to środek skali. Czysto nazewnicze. |
| **N5 — Advanced pokazuje „Preset" zamiast wartości efektywnej** | Advanced | „Spacing: Heading **Preset**; content **Preset**" i „Title style: **Preset** size; **Preset** weight" dla tokenów nieustawionych jawnie (renderer dziedziczy z fallbacku wariantu). Nie błąd, ale „Preset" jest mniej informacyjne niż realnie zastosowana wartość. |
| **N6 — „Saved …summary" pokazuje stan NIEzapisany** | Advanced | Sekcje „Saved items summary" / „Saved display summary" odzwierciedlają **bieżący stan edytora**, a nie stan zapisany w bazie. Po dodaniu 8 itemów (bez zapisu) Advanced pokazał Item 1–8. Słowo „Saved" jest więc mylące — to live mirror sesji Visual, nie persisted state. |
| **N7 — Niespójna semantyka „Clear" w kolorach** | Visual / colors | Po „Clear": **Surface** → tło staje się **transparent** (znika inline `background-color`); **Border** i **Summary text** → wracają do **koloru motywu** (`var(--color-border)`/`var(--color-text)`); **Body text** → brak inline (nie ma domyślnej wartości motywu). Cztery pola, trzy różne zachowania po „Clear". Badge zawsze pokazuje „Theme default", co dla Surface jest subtelnie mylące (transparent ≠ kolor powierzchni z motywu). |
| **N8 — Style select bez „reset do presetu" → pierwszy klik odcina od wariantu** | Visual / style | Selecty stylu (padding/radius/size/weight) **nie mają opcji „wróć do presetu wariantu"** — mają zawsze konkretną wartość (start = fallback wariantu). Po jakimkolwiek wyborze (nawet „Default") token staje się **jawnym overrideem**, który od tej pory **ignoruje preset wariantu**. **Zademonstrowane:** po ustawieniu radius=Extra large + padding/size/weight, przełączanie wariantu soft/bordered/compact zmieniało już tylko `data-…-variant`, ale klasy stylu pozostawały na wartościach jawnych (`rounded-2xl`, `px-4 py-3`, `text-base`, `p-4`). Jedyny sposób „odpięcia" to przeładowanie/odrzucenie edycji — brak per-kontrolkowego resetu. |
| **N9 — Brak dialogu potwierdzenia przy redukcji liczby itemów** | Wizard / Structure | Zmniejszenie „Number of items" w Wizardzie ani „Remove" w Structure **nie pokazują `window.confirm`** (w przeciwieństwie do `tabs`). Akceptowalne, bo sloty są puste (brak destrukcyjnej utraty zagnieżdżonej treści w tym fixture), ale to niespójność UX między widgetami. |

**Nie wykryto** żadnych błędów konsoli (admin i front: 0/0), żadnego twardego buga renderowania ani rozjazdu render między wspólnie testowanymi opcjami admin↔front. Wszystkie kontrolki Visual/Wizard, które kliknięto, działają i aktualizują podgląd na żywo.

---

## 6. Porównanie Admin (canvas/preview) vs Frontend

| Aspekt | Admin canvas | Frontend (`/test-accordion-0516`) | Zgodność |
|--------|--------------|-----------------------------------|----------|
| Atrybuty `data-coderso-accordion-*` | ✓ żywy `AccordionBlock` | ✓ identyczne | ✓ |
| Otwieranie/zamykanie | ✓ natywny `<details>` (bez skryptu) | ✓ natywny `<details>` + skrypt | ✓ |
| Single-open (`name`) | ✓ działa (`accordion-blk-1-group`) | ✓ działa (`accordion-<UUID>-group`) | ✓ |
| `aria-expanded` po ręcznym toggle | ✗ stałe (N3) | ✓ synchronizuje (skrypt) | ⚠ tylko front |
| Grupa `name` przy 2 renderach (Wizard) | ✗ kolizja canvas↔preview (N2) | ✓ jeden render | ⚠ tylko admin |
| `collapsible=false` (wymuszenie ≥1 otwarty) | brak skryptu → tylko atrybut | egzekwowane przez skrypt | ⚠ na froncie NIEtestowane (fixture ma `true`) |
| Liczba itemów: slot (`Add Item`) vs Wizard count | slot=render, Wizard count=tylko dane (N1) | render zgodny z zapisanymi slotami | ✓ mechanizm spójny |
| Placeholder pustego panelu | „Add widgets to this accordion item." | brak (nie wyciekł) | ✓ poprawne |
| Niezapisane edycje z Visual | widoczne (także w Advanced, N6) | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

---

## 7. CZEGO NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ (z dokładną przyczyną)

Każda pozycja podaje **dokładną kontrolkę** i **powód** blokady:

1. **Trwałość zapisu — przyciski „Save draft" i „Publish".** Świadomie ich NIE klikałem, aby nie modyfikować współdzielonego fixture `Draft`. Skutek: trwałość moich edycji (variant, kolory, liczba itemów 8, motion itd.) po przeładowaniu i propagacja na front **nie zostały zweryfikowane**. Potwierdzona została natomiast **izolacja** (front pokazuje stan zapisany; po `reload` admina edytor wraca do 2 itemów — co potwierdza brak zapisu).
2. **Wymuszanie „≥1 otwarty" na froncie — runtime `ensureOpenItem` dla `collapsible=false`.** Zapisany fixture ma `collapsible=true`; bez zapisu nie mogę zmienić stanu publicznego. Blokada: **fixture + zasada „nie zapisuj"**. W canvas nie da się tego zweryfikować, bo skrypt runtime tam nie działa (N3).
3. **Tryb `multiple` na froncie.** Zapisany fixture jest `single`; weryfikacja dwu-otwarcia na publicznej trasie wymagałaby zapisu. Tryb `multiple` zweryfikowano **tylko w canvas** (`[true,true]`). Blokada: **fixture + brak zapisu**.
4. **Renderowanie zagnieżdżonych widgetów w panelach na froncie — przyciski „Add widget to Item N" (canvas) / sloty itemów.** Sloty są puste; nie dodawałem dzieci (wymagałoby wyboru widgetu i modyfikacji struktury slotów). Skutek: render zagnieżdżonej treści w panelu na froncie **nie wykonany**. Blokada: **celowe pominięcie modyfikacji struktury** (i tak nieutrwalanej bez zapisu).
5. **`prefers-reduced-motion`.** Klasy `motion-safe:*` są obecne dla subtle/smooth (zweryfikowane w DOM), ale realne zachowanie pod włączoną redukcją ruchu **nie testowane** — wymaga ustawienia na poziomie OS/przeglądarki. Blokada: **środowisko**.
6. **Block-level controls — „Duplicate Accordion", „Delete Accordion", „Move Accordion up/down".** Obecne w karcie bloku w canvas, ale **NIE klikane**: „Delete" jest destrukcyjny dla sesji edytora, „Duplicate" tworzyłby drugi blok, a „Move up/down" są `disabled` (jedyny blok na stronie). To kontrolki bloku, nie itemów — poza zakresem zadania. Blokada: **ryzyko/zakres**.

---

## 8. Podsumowanie

- Widget **accordion jest w bardzo dobrym stanie funkcjonalnym**. W tej iteracji **kliknięto każdą opcję każdego selectu stylu** (motion, max width, oba paddingi, radius, title size/weight) i **każda** poprawnie zmienia klasę w DOM canvas; wszystkie 3 karty wariantu, open mode (z realnym dwu-otwarciem), collapsible oraz **wszystkie 4 kolory (ustawienie + Clear)** działają.
- **Item controls w pełni wykonane:** `Add Item` realnie zwiększa render (2→8, blokada na 8), `Remove` zmniejsza (8→2, znika na min 2), `Move up/down` reorderuje sloty; edycja treści itemów aktualizuje canvas, a **ikona ucina się do 24 znaków** (luka zamknięta).
- **Frontend** w pełni interaktywny i dostępny (natywne `<details>`, klawiatura, kompletne ARIA, synchronizacja `aria-expanded`, single-open, collapse-all), bez błędów konsoli i bez overflow @375 px.
- **Kluczowy niuans (N1):** rozjazd „Number of items" (Wizard) vs realny render — render steruje slot system (`Add Item`). Potwierdzone obustronnie.
- **Realne bugi admin-only:** N2 (kolizja `name` canvas↔Live preview, zademonstrowana behawioralnie) i N3 (brak sync `aria-expanded` w canvas). Front nieobjęty oboma.
- **Nowe niuanse tej iteracji:** N6 („Saved …summary" pokazuje stan niezapisany), N8 (style select bez resetu do presetu → pierwszy klik odcina od wariantu), N9 (brak confirm przy redukcji liczby itemów). Plus dotychczasowe N4 (etykiety max width), N5 („Preset" w Advanced), N7 (niespójny „Clear" kolorów).
- **Plus względem innych widgetów:** spójne przyciski „Clear" dla wszystkich 4 kolorów + czytelne badge „Theme default" / „Selected color".
- **Nie znaleziono** błędu renderowania ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji. Wszystkie rozbieżności są celowe (placeholder, izolacja niezapisanych edycji) lub admin-only (N2, N3).
- **Niezweryfikowane** pozostają wyłącznie rzeczy wymagające zapisu fixture (trwałość, `collapsible=false`/`multiple` na froncie, zagnieżdżone widgety) oraz `prefers-reduced-motion` — z dokładnym wskazaniem kontrolek i przyczyn w sekcji 7.
