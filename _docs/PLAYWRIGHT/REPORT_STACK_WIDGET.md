# REPORT: Stack Widget — UX/UI Audit

**Widget:** `stack`  
**Data:** 2026-05-16  
**Status:** Zakończony  
**Pliki:** `core/widgets/core/stack.tsx`, `core/admin/ui/widgets/editors/StackEditors.tsx`  
**Strona testowa:** `http://localhost:5173/admin/pages/589ad789-284c-4610-a304-d6f158bcfd57`  
**Frontend URL:** `http://localhost:3000/test-stack-0516`

---

## 1. Przegląd widgetu

Stack to primitive layoutu oparty na flexbox, służący do układania dzieci w kolumnie lub wierszu z konfigurowalnymi odstępami i wyrównaniem. Oferuje trzy warianty (vertical, horizontal, responsive) oraz trzy tryby edytora (Wizard, Visual, Advanced). Posiada jeden slot: `content` (repeatable).

### Obsługiwane opcje

| Opcja | Wartości | Domyślna | Responsive? |
|---|---|---|---|
| `variant` | `vertical`, `horizontal`, `responsive` | `vertical` | N/A |
| `direction.desktop` | `row`, `column` | `column` | ✅ per breakpoint |
| `direction.tablet` | `row`, `column` | `column` | ✅ per breakpoint |
| `direction.mobile` | `row`, `column` | `column` | ✅ per breakpoint |
| `gap.desktop` | `none`, `0`–`12` (11 tokenów) | `6` | ✅ per breakpoint |
| `gap.tablet` | `none`, `0`–`12` | `6` | ✅ per breakpoint |
| `gap.mobile` | `none`, `0`–`12` | `4` | ✅ per breakpoint |
| `align` | `start`, `center`, `end`, `stretch` | `stretch` | ❌ globalny |
| `justify` | `start`, `center`, `end`, `between` | `start` | ❌ globalny |
| `wrap` | `boolean` | `false` | ❌ globalny |

---

## 2. Wyniki testów — Admin UI (http://localhost:5173/admin)

### 2.1 Wizard

| Test | Wynik | Uwagi |
|---|---|---|
| Otwieranie Wizard edytora | ✅ OK | Otwiera się automatycznie po dodaniu widgetu |
| Dropdown "Stack style" (variant selection) | ⚠️ BŁĄD | Zmienia `block.variant`, ale NIE `data.direction.*` — patrz BUG-01 |
| Dropdown "Mobile direction" po zmianie variant | ⚠️ POZORNE | Po zmianie na Horizontal — Mobile direction nadal pokazuje "Column" |
| Dropdown "Base gap" (ustawia wszystkie breakpointy) | ✅ OK | Zmiana aplikuje ten sam gap na wszystkie 3 breakpointy |
| Brak align/justify w Wizard | ⚠️ ISSUE | Wizard nie ujawnia align/justify — użytkownik musi przejść do Visual |
| Przycisk "Continue to layout and styling" | ✅ OK | Prawidłowo przełącza do zakładki Visual |

### 2.2 Visual

| Test | Wynik | Uwagi |
|---|---|---|
| Karty wariantów — kliknięcie i zmiana "Selected" badge | ⚠️ BŁĄD | Badge zmienia się poprawnie, ale `data.direction.*` nie jest aktualizowane — patrz BUG-01 |
| Karta Vertical — kliknięcie | ✅ Częściowy | `block.variant = "vertical"`, `data.direction` = {desktop:"column", tablet:"column", mobile:"column"} — zgadza się z defaultem vertical |
| Karta Horizontal — kliknięcie | ❌ BŁĄD | `block.variant = "horizontal"`, ale `data.direction = {desktop:"column", tablet:"column", mobile:"column"}` — rendering PIONOWY mimo wybranego horizontal |
| Karta Responsive — kliknięcie | ❌ BŁĄD | `block.variant = "responsive"`, ale `data.direction = {desktop:"column", tablet:"column", mobile:"column"}` — brak row na desktop/tablet |
| Desktop direction dropdown — zmiana manualna | ✅ OK | `data-stack-direction-desktop` i klasa `lg:flex-row/col` poprawnie aktualizowane |
| Tablet direction dropdown — zmiana manualna | ✅ OK | `data-stack-direction-tablet` i klasa `md:flex-row/col` poprawnie aktualizowane |
| Mobile direction dropdown — zmiana manualna | ✅ OK | `data-stack-direction-mobile` i klasa `flex-row/col` poprawnie aktualizowane |
| Desktop gap dropdown | ✅ OK | `lg:gap-X` poprawnie aktualizowane |
| Tablet gap dropdown | ✅ OK | `md:gap-X` poprawnie aktualizowane |
| Mobile gap dropdown | ✅ OK | `gap-X` poprawnie aktualizowane |
| Gap — duplikat "None" i "Gap 0" | ⚠️ BŁĄD | Obie opcje mapują na `gap-0` — identyczne CSS — patrz BUG-02 |
| Align dropdown | ✅ OK | `data-stack-align` i klasa `items-*` poprawnie aktualizowane |
| Justify dropdown | ✅ OK | `data-stack-justify` i klasa `justify-*` poprawnie aktualizowane |
| Toggle "Wrap items" | ✅ OK | `data-stack-wrap` i klasa `flex-wrap/flex-nowrap` poprawnie przełączane |
| Sekcja "Wrapping and slot behavior" — info o slocie | ✅ OK | Statyczny tekst: "Stack uses a single fixed slot: `content`." |
| Sekcja "Structure" | ✅ OK | Pokazuje slot content, status pustego slotu |

### 2.3 Advanced

| Test | Wynik | Uwagi |
|---|---|---|
| JSON snapshot widoczny i aktualny | ✅ OK | Snapshot aktualizuje się po każdej zmianie, dane poprawne |
| Kontrolki direction/gap/align/justify/wrap | ✅ OK | Identyczne funkcjonalnie jak w Visual |
| Brak karty wariantów w Advanced | ⚠️ ISSUE | W Advanced nie ma możliwości zmiany variant — tylko Visual to oferuje |
| Sekcja "Layout" (Container, Padding, Margin) | ✅ OK | Dodatkowa sekcja wspólna dla wszystkich widgetów |
| Sekcja "Visibility" (Desktop/Tablet/Mobile) | ✅ OK | Toggles dla widoczności per breakpoint |

### 2.4 Preview dialog (Desktop/Tablet/Mobile)

| Test | Wynik | Uwagi |
|---|---|---|
| Preview dialog otwiera się | ✅ OK | Dialog otwiera się po kliknięciu "Preview" |
| Przełącznik Desktop/Tablet/Mobile | ✅ OK | Przyciski reagują na kliknięcie |
| Zawartość preview | ⚠️ INFO | Pokazuje "Not authenticated" — iframe wymaga osobnego auth (to samo co inne widgety) |

---

## 3. Wyniki testów — Frontend (http://localhost:3000/test-stack-0516)

Konfiguracja testowa: variant=responsive, dirDesktop=row, dirTablet=row, dirMobile=column, gapDesktop=6, gapTablet=6, gapMobile=4, align=stretch, justify=start, wrap=false.

| Test | Admin | Frontend | Zgodne? |
|---|---|---|---|
| `data-stack-variant` | `responsive` | `responsive` | ✅ |
| `data-stack-direction-desktop` | `row` | `row` | ✅ |
| `data-stack-direction-tablet` | `row` | `row` | ✅ |
| `data-stack-direction-mobile` | `column` | `column` | ✅ |
| `data-stack-gap-desktop` | `6` | `6` | ✅ |
| `data-stack-gap-tablet` | `6` | `6` | ✅ |
| `data-stack-gap-mobile` | `4` | `4` | ✅ |
| `data-stack-align` | `stretch` | `stretch` | ✅ |
| `data-stack-justify` | `start` | `start` | ✅ |
| `data-stack-wrap` | `false` | `false` | ✅ |
| CSS klasy kontenera | `flex w-full min-w-0 flex-col md:flex-row lg:flex-row gap-4 md:gap-6 lg:gap-6 items-stretch justify-start flex-nowrap` | identyczne | ✅ |

**Wniosek:** Frontend i admin preview renderują identycznie. Nie ma żadnych rozbieżności między podglądem admina a stroną frontendową.

---

## 4. Znalezione błędy i problemy UX

### BUG-01 — KRYTYCZNY: Wybór wariantu nie synchronizuje data.direction

**Opis:** Zarówno Wizard dropdown "Stack style", jak i karty wariantów w Visual editor zmieniają tylko `block.variant`, ale NIE aktualizują `data.direction.desktop/tablet/mobile`. Normalizer `normalizeStackData()` używa direction z `data` jako wartości dominującej — fallback z variant-defaults działa jedynie gdy `data.direction.*` jest `undefined` lub nieprawidłowe. Ponieważ widget inicializuje się z `stackDefaults` (direction: all "column"), po zmianie variant na "horizontal" lub "responsive" kierunki pozostają "column".

**Reprodukcja:**
1. Dodaj Stack widget (domyślny wariant: vertical, direction: column/column/column)
2. W Visual editor kliknij kartę "Horizontal"
3. Sprawdź: badge karty pokazuje "Selected" — wygląda poprawnie
4. Sprawdź direction dropdowns: Desktop="Column", Tablet="Column", Mobile="Column" — wszystkie wciąż column!
5. Sprawdź `data-stack-direction-*` → wartości `"column"` na wszystkich breakpointach
6. CSS: `flex-col md:flex-col lg:flex-col` — stack renderuje się pionowo!

**Dane z testów:**
```
block.variant = "horizontal"
data-stack-variant = "horizontal"       ← z block.variant
data-stack-direction-desktop = "column" ← z data.direction.desktop (nie zaktualizowane!)
data-stack-direction-tablet  = "column" ← z data.direction.tablet  (nie zaktualizowane!)
data-stack-direction-mobile  = "column" ← z data.direction.mobile  (nie zaktualizowane!)
CSS: flex-col md:flex-col lg:flex-col   ← PIONOWY rendering mimo wariantu "horizontal"
```

**Przyczyna kodu:** `stack.tsx:148–149` — `resolveDirection(value, fallback)` zwraca `value` gdy jest prawidłowym tokenem (`"row"` lub `"column"`). Gdy `data.direction.desktop = "column"` (ustawione przez default), zmiana variant na "horizontal" nie powoduje fallbacku do `directionDefaults.desktop = "row"`, bo `"column"` jest prawidłową wartością.

**Dotyczy też:** Wizard dropdown "Stack style" — ten sam mechanizm.

**Wpływ:** Użytkownik wybiera "Horizontal" lub "Responsive", ale stack renderuje się pionowo. Jedyna droga do poprawnego działania to ręczne ustawienie każdego dropdownu direction.

---

### BUG-02 — WYSOKI: Duplikat tokenów gap "None" i "Gap 0"

**Opis:** W każdym dropdownie gap (desktop, tablet, mobile) widoczne są dwie osobne opcje: "None" i "Gap 0". Obie mapują się na identyczną klasę CSS `gap-0` — zachowanie jest nierozróżnialne.

**Dane z testów:**
```
Wybierając "None":  lg:gap-0
Wybierając "Gap 0": lg:gap-0
```

**Przyczyna kodu:** `stack.tsx:6` — `stackGapTokens` zawiera zarówno `"none"` jak i `"0"`. `gapClassMap` (`stack.tsx:92–104`) mapuje oba na `"gap-0"`.

**Wpływ:** Dezorientacja użytkownika — dwie opcje o różnych nazwach ale identycznym efekcie wizualnym.

---

### ISSUE-01 — WYSOKI: Wizard nie aktualizuje pola "Mobile direction" po zmianie wariantu

**Opis:** Po wyborze "Horizontal" w dropdownie "Stack style" Wizarda, pole "Mobile direction" nadal pokazuje "Column" (zamiast "Row"). Użytkownik dostaje wizualną niespójność — styl mówi "Horizontal" ale kontrolka kierunku wskazuje "Column". Bez przejścia do Visual i ręcznej zmiany wszystkich dropdownów — widget jest nieużywalny.

---

### ISSUE-02 — WYSOKI: Advanced editor nie ma kontrolki wariantu

**Opis:** Zakładka Advanced nie posiada sekcji wyboru wariantu (brak kart ani dropdown). Jedyną drogą do zmiany wariantu jest zakładka Visual lub Wizard. Użytkownik pracujący w Advanced nie może zmienić wariantu bez przełączenia zakładki.

---

### ISSUE-03 — ŚREDNI: `align` i `justify` nie są responsive

**Opis:** `align` (cross-axis) i `justify` (main-axis) są ustawiane globalnie — ta sama wartość na wszystkich breakpointach. Dla layoutu flexbox z responsywną zmianą direction (column na mobile ↔ row na desktop) te osie się zamieniają. Globalny `align=center` ma inny efekt wizualny przy `flex-col` niż przy `flex-row`. Brak możliwości ustawienia `align-center` tylko na desktopie a `align-stretch` na mobile.

---

### ISSUE-04 — ŚREDNI: `wrap` nie jest responsive

**Opis:** Toggle "Wrap items" jest globalny. W typowym use-case chcemy zawijania elementów na desktopie (row) ale nie na mobile (column). Brak per-breakpoint kontroli.

---

### ISSUE-05 — ŚREDNI: Wizard ujawnia tylko podzbiór opcji

**Opis:** Wizard pokazuje tylko: variant, mobile direction, base gap. Nie ma align/justify. Użytkownik nie może skonfigurować dystrybucji elementów z najprostszego edytora — musi przejść do Visual. "Base gap" etykieta nie sugeruje że ustawia WSZYSTKIE breakpointy jednocześnie.

---

### ISSUE-06 — ŚREDNI: Brak `justify-around` i `justify-evenly`

**Opis:** Opcje justify to: start, center, end, between. Brakuje `space-around` i `space-evenly`, które są standardowymi opcjami flexbox i często używanymi w UI. Widoczne w liście opcji tylko 4 z 6 dostępnych CSS flex justify-content values.

---

### ISSUE-07 — NISKI: Brak `align-items: baseline`

**Opis:** Opcje align to: start, center, end, stretch. Brakuje `baseline` — użyteczne przy wyrównaniu elementów z tekstem do wspólnej linii bazowej.

---

### ISSUE-08 — NISKI: Etykiety gap bez kontekstu px/rem

**Opis:** Opcje "Gap 1"–"Gap 12" nie komunikują ile pikseli/rem reprezentują. Użytkownik nie może ocenić wartości wizualnej bez kontekstu projektowego.

---

### ISSUE-09 — NISKI: Placeholder pustego stacka bez akcji CTA

**Opis:** Pusty stack wyświetla komunikat "Empty stack." — tekst statyczny, bez przycisku ani wskazówki jak dodać treść. Spójne z innymi widgetami (np. "Empty left pane."), ale nadal suboptymalne.

---

### ISSUE-10 — NISKI: Brak wizualnych ikon na kartach wariantów

**Opis:** Karty wariantów (Vertical/Horizontal/Responsive) pokazują tylko tekst i opis słowny. Brak graficznych miniaturek/ikon ilustrujących wizualnie jak układ będzie wyglądał (np. strzałka w dół / w bok / strzałka adaptacyjna).

---

## 5. Podsumowanie priorytetów

### Krytyczne — do naprawy przed releasem
- [ ] **BUG-01**: Wybór wariantu (Wizard + Visual cards) nie synchronizuje `data.direction.*` — rendering jest pionowy mimo wybranego "horizontal"/"responsive"

### Wysokie — do naprawy w najbliższym sprincie
- [ ] **BUG-02**: Usunąć duplikat `"none"` / `"0"` z `stackGapTokens` — jeden token wystarczy
- [ ] **ISSUE-01**: Wizard "Mobile direction" musi odzwierciedlać kierunek z wybranego wariantu
- [ ] **ISSUE-02**: Advanced editor powinien mieć możliwość zmiany wariantu

### Średnie — do uwzględnienia w backlogu
- [ ] **ISSUE-03**: Rozważyć per-breakpoint `align` i `justify` (przynajmniej osobne dla mobile/desktop)
- [ ] **ISSUE-04**: Rozważyć per-breakpoint `wrap`
- [ ] **ISSUE-05**: Rozbudować Wizard o align/justify lub dodać jasną etykietę że "Base gap" zmienia wszystkie breakpointy
- [ ] **ISSUE-06**: Dodać `space-around` i `space-evenly` do opcji justify

### Niskie — nice-to-have
- [ ] **ISSUE-07**: Dodać `baseline` do opcji align
- [ ] **ISSUE-08**: Dodać px/rem w etykietach gap (tooltip lub opis)
- [ ] **ISSUE-09**: Zamienić "Empty stack." na sugestię akcji z CTA
- [ ] **ISSUE-10**: Dodać graficzne ikony na kartach wariantów

---

## 6. Admin vs Frontend: Porównanie

**Wynik: Frontend i Admin preview są w 100% spójne.**

Wszystkie `data-stack-*` atrybuty i klasy CSS są identyczne między podglądem admin a stroną frontendową. Żaden z wykrytych błędów nie jest rozbieżnością admin/frontend — wszystkie wykryte problemy dotyczą wyłącznie edytora admin lub braku funkcjonalności w konfiguratorze.
