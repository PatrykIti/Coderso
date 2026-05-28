# RAPORT: Stack Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja przeglądarki:** `claude-28-05-stack` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `7b23083d-f7cd-481e-8417-fc2278e54466` (kontraktowy fixture „stack", stack **pusty** — 0 dzieci)
> **Fixture public:** `http://localhost:3000/test-stack-0516` (**inna** strona, opublikowana, stack **zapełniony** — 2 dzieci)
> **Pliki źródłowe:** `core/widgets/core/stack.tsx` (renderer + model + normalizacja + mapy klas Tailwind), `core/admin/ui/widgets/editors/StackEditors.tsx` (edytory Wizard/Visual/Advanced)

> **Uwaga metodologiczna:** Ten raport jest świadomie bogatszy niż smoke-report z
> 27-05-2026 (`../27-05-2026/REPORT_STACK_WIDGET.md`, status „Passed", weryfikował tylko
> liczbę sekcji i HTTP 200). Tutaj realnie klikałem w każdą kontrolkę Visual i
> weryfikowałem skutek na żywym elemencie: inspekcja atrybutów `data-stack-*` i klas
> Tailwind na faktycznie wyrenderowanym węźle w canvas admina i na froncie, trwałość po
> zapisie (Save draft → reload), responsywność na froncie przez resize viewportu oraz —
> co okazało się kluczowe — **empiryczne sondowanie, które klasy responsywne Tailwind w
> ogóle istnieją w serwowanym CSS** (probe injektujący elementy z konkretnymi klasami i
> odczyt `getComputedStyle`).

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są commitowane
> do repo (są ignorowane przez Git).

---

## 1. Przegląd widgetu

**Typ:** `stack` · **Kategoria:** layout
**Opis (z definicji):** „Flow layout wrapper with responsive direction, spacing, and axis control." — responsywny wrapper flex z kontrolą kierunku, odstępów i osi.
**Sloty:** jeden stały slot `content` na widgety potomne.
**Warianty:** `vertical` (kolumna na każdym ekranie), `horizontal` (rząd na każdym ekranie), `responsive` (kolumna na mobile, rząd na tablet/desktop).

**Model danych (`StackData`) — wszystko per-breakpoint (desktop/tablet/mobile):**

| Pole | Typ | Uwagi |
|------|-----|-------|
| `direction` | `row` / `column` per breakpoint | seedowany przez wybór wariantu |
| `gap` | token odstępu per breakpoint | tokeny: `none,0,1,2,3,4,5,6,8,10,12` (11), w UI widocznych **10** (`0` ukryte jako duplikat `none`) |
| `align` | `start/center/end/stretch/baseline` | w modelu „responsive" (skalar lub obiekt), edytor zapisuje obiekt per breakpoint |
| `justify` | `start/center/end/between/around/evenly` | jw. |
| `wrap` | boolean per breakpoint | jw. |

**Wartości domyślne (`stackDefaults`):** direction `column/column/column`, gap `6/6/4` (desktop/tablet/mobile), align `stretch`, justify `start`, wrap `false`.

**Renderer (`StackBlock`):** zwraca jeden `<div class="flex w-full min-w-0 …">` z kompletem
atrybutów `data-stack-*` (variant + per-breakpoint direction/gap/align/justify/wrap +
`data-stack-items`). Klasy responsywne budowane są **dynamicznie** przez konkatenację
prefiksu i nazwy klasy (`prefixClassMap(map, "md:")` → `"md:flex-row"`, `"md:gap-6"` itd.).
Gdy slot `content` jest pusty, renderuje placeholder „Empty stack.".

**Tryby edytora wg kontraktu (`stackEditorContract`):**
- **Wizard** — 1 sekcja „Stack quick start", `role: setup`, `writablePaths: []` (read-only).
- **Visual** — 4 sekcje: „Variant and flow", „Responsive direction", „Responsive alignment and wrap", „Slot guidance".
- **Advanced** — 2 sekcje read-only: „Runtime summary" (w kontrakcie) / renderowane jako „Runtime stack summary", oraz „Support summary".

---

## 2. Co było faktycznie testowane (zakres realnych interakcji)

Wszystkie interakcje wykonano w żywej aplikacji; stan weryfikowałem przez inspekcję
atrybutów `data-stack-*` i klas Tailwind na realnie wyrenderowanym węźle.

- Logowanie do admina + otwarcie fixture page (stack był już dodany, pusty, wariant `vertical`).
- **Wizard:** wejście przez „Run setup again", odczyt zawartości read-only, powrót przez „Finish setup and open Visual".
- **Visual (klikane realnie):**
  - karta wariantu **Horizontal** (przypadkowo, ale potwierdzona) → dir `row/row/row`,
  - karta wariantu **Responsive** → dir `row/row/column`,
  - **Desktop flow** (Radix select) → „Stack vertically" (column) przy zachowaniu tablet=row, mobile=column,
  - **Desktop spacing** → „Roomy spacing" (token 8),
  - **Desktop item alignment** → „Center items",
  - **Desktop distribution** → „Spread evenly",
  - **Desktop wrapping** (switch) → ON,
  - rozwinięcie i odczyt pełnych list opcji dla flow / spacing / align / justify,
  - powrót na wariant **Vertical** w celu sprawdzenia, co wybór wariantu nadpisuje.
- **Persistencja:** „Save draft" (toast „Draft saved.") → pełny reload → ponowna weryfikacja stanu z canvas.
- **Advanced:** odczyt obu sekcji diagnostycznych i potwierdzenie braku kontrolek edytowalnych.
- **Front:** otwarcie `/test-stack-0516`, inspekcja DOM stacka i dzieci, pomiar `flex-direction`/`gap`/overflow przy 375 / 800 / 1280 px, odczyt konsoli.
- **Probe CSS (admin i public):** injekcja elementów z klasami `gap-*`, `md:gap-*`, `lg:gap-*`, `md:flex-row`, `lg:flex-col`, `md:justify-evenly`, `md:items-*`, `lg:flex-wrap` i odczyt `getComputedStyle`, aby ustalić, które klasy responsywne faktycznie istnieją w serwowanym CSS.

---

## 3. Co działa (potwierdzone w praktyce)

### 3.1 Tryb Wizard — read-only, zgodny z kontraktem
- Wejście przyciskiem **„Run setup again"** (stan domyślny: baner „Setup complete · Daily edits live in Visual. Advanced is for technical diagnostics.").
- Jedna sekcja **„Stack quick start"** zawiera wyłącznie tekst statyczny: opis („Wizard is one-time starter setup…"), notę „Visual owns stack preset choice, breakpoint flow directions, spacing, alignment, distribution, and wrapping after setup." oraz kartę slot-guidance „Add child widgets to the `content` slot from the insert dialog.".
- Przycisk **„Finish setup and open Visual"** poprawnie przełącza do Visual.
- Panel **„Live preview"** obok renderuje aktualny stan przez współdzielony renderer.
- **Zero kontrolek edytowalnych** (brak comboboxów / switchy / inputów w sekcji) — zgodne z `writablePaths: []`. Potwierdzone na snapshocie i programowo.

### 3.2 Tryb Visual — wszystkie testowane kontrolki działają w warstwie DANYCH i aktualizują podgląd

| Kontrolka | Akcja testowa | Efekt w canvas (`data-stack-*` + klasa) | Wynik |
|---|---|---|---|
| Karta wariantu **Horizontal** | klik | `variant=horizontal`, dir `row/row/row`, klasy `flex-row md:flex-row lg:flex-row` | ✅ seed |
| Karta wariantu **Responsive** | klik | `variant=responsive`, dir `row/row/column` | ✅ seed |
| **Desktop flow** → „Stack vertically" | Radix select | `direction-desktop=column` (tablet=row, mobile=column zachowane), `flex-col md:flex-row lg:flex-col` | ✅ edycja per-breakpoint |
| **Desktop spacing** → „Roomy spacing" | Radix select | `gap-desktop=8` (tablet=6, mobile=4 zachowane), klasa `lg:gap-8` | ✅ (w danych) |
| **Desktop item alignment** → „Center items" | Radix select | `align-desktop=center`, klasa `lg:items-center` | ✅ |
| **Desktop distribution** → „Spread evenly" | Radix select | `justify-desktop=evenly`, klasa `lg:justify-evenly` | ✅ (w danych) |
| **Desktop wrapping** → ON | switch | `wrap-desktop=true`, etykieta zmienia się na „Items can wrap.", klasa `lg:flex-wrap` | ✅ (w danych) |

- **Karty wariantów** mają czytelne stany „Selected"/„Pick", miniatury (pionowe paski / poziome paski / układ mieszany) i opisy. Zmiana natychmiast widoczna w canvas.
- **Listy opcji** zgodne z modelem: flow = 2 („Stack vertically" / „Place side by side"), spacing = **10** (od „No spacing" do „Extra spacious spacing" — token `0` ukryty), align = 5, justify = 6.
- Podgląd w canvas aktualizuje się **natychmiast** po każdej zmianie (atrybuty `data-stack-*` i className zmieniają się od razu).

> ⚠️ Uwaga: „działa" w tej tabeli oznacza, że kontrolka poprawnie zapisuje stan i
> aktualizuje atrybuty/klasy. Czy ta zmiana ma realny **efekt wizualny na tablet/desktop**
> to osobna sprawa — patrz sekcja 4 (część klas responsywnych nie istnieje w CSS).

### 3.3 Wariant jako „seed" — zachowanie potwierdzone
Wybór karty wariantu wywołuje `buildVariantSyncedStackData`, które **nadpisuje wyłącznie
`direction`** (na domyślne kierunki danego wariantu) i **zachowuje** `gap/align/justify/wrap`.
Zweryfikowane realnie: stan przed kliknięciem `Vertical` = dir `column/row/column`, gap
`8/6/4`, align-desktop `center`, justify-desktop `evenly`, wrap-desktop `true`. Po kliknięciu
`Vertical`: dir → `column/column/column` (nadpisane), a `gap 8/6/4`, `align center`,
`justify evenly`, `wrap true` **pozostały nietknięte**. ✅ Zgodne z kodem.

### 3.4 Persistencja (Save draft → reload)
Stan kontrolny: `vertical`, dir `column/column/column`, gap `8/6/4`, align-desktop `center`,
justify-desktop `evenly`, wrap-desktop `true`. Po „Save draft" (toast **„Draft saved."**) i
pełnym reloadzie canvas wrócił z bazy **identyczny** — wszystkie wartości (w tym
niestandardowe gap/align/justify/wrap) przetrwały round-trip. ✅

_Zrzut (lokalny): `stack-admin-visual-28-05.png`_

### 3.5 Tryb Advanced — read-only, wiernie odzwierciedla stan danych
- **Zero kontrolek edytowalnych** (tylko wiersze podsumowań).
- **„Runtime stack summary":** trzy wiersze (Desktop/Tablet/Mobile) z czytelnym opisem runtime, np. Desktop = „Stack vertically, Roomy spacing, Center items, Spread evenly, wraps to a new line when needed"; Tablet = „…, Balanced desktop spacing, Stretch items to fill, Pack at the start, stays on one line"; Mobile = „…, Balanced mobile spacing, …". Wartości odpowiadały moim edycjom. ✅ (uwaga: opis odzwierciedla **dane**, nie realny render — patrz sekcja 4).
- **„Support summary":** „Saved compatibility: Saved responsive values normalize for desktop, tablet, and mobile." oraz „Editing owner: Use Visual to adjust flow, spacing, alignment, distribution, and wrapping. Advanced is read-only.".

### 3.6 Front (`/test-stack-0516`)
- HTTP `200`, tytuł „TEST-STACK-0516", **0 błędów / 0 ostrzeżeń** w konsoli.
- Renderuje **1** stack, **zapełniony** — `data-stack-items="2"`, wariant `responsive`,
  dir `row/row/column`, gap `6/6/4`, align `stretch`, justify `start`, wrap `true` (wszystkie breakpointy).
- Dwoje dzieci: „FixtureStack child A — Nested stack content proves row-flow rendering without forcing horizontal page overflow." oraz „FixtureStack child B — Second bounded child keeps the fixture realistic for responsive wrapping." (treść celowo „bounded", realistyczna).
- **Responsywny kierunek działa** (pomiar `flex-direction`):
  - 375 px → `column` (mobile, klasa bazowa `flex-col`),
  - 800 px → `row` (tablet, `md:flex-row`),
  - 1280 px → `row` (desktop, `lg:flex-row`).
- **Brak poziomego overflow** przy 375 / 800 / 1280 px (`documentElement.scrollWidth == clientWidth`). Przy 1280 px dwoje szerokich dzieci w trybie `row` + `flex-wrap` zawija się do dwóch wierszy zamiast wypychać stronę w poziomie — dokładnie tak, jak zapowiada treść fixture'u. ✅

_Zrzuty (lokalne): `stack-public-desktop-28-05.png`, `stack-public-mobile-375-28-05.png`_

---

## 4. Co NIE działa / defekty (potwierdzone empirycznie)

### B1 (KRYTYCZNY) — Odstęp (gap) na tablet/desktop nie działa wizualnie: brak klas `md:gap-*` / `lg:gap-*` w CSS

Renderer buduje klasy gapów dynamicznie (`md:gap-6`, `lg:gap-8` itd. przez konkatenację
stringów). Skaner zawartości Tailwind **nie widzi** tak budowanych literałów, więc **nie
generuje** dla nich reguł CSS. Skutek: stack zawsze używa **bazowego (mobilnego)** gapa na
każdym breakpoincie, a ustawienia „Tablet spacing" i „Desktop spacing" nie zmieniają
realnego wyglądu.

Dowód empiryczny (probe `getComputedStyle().columnGap` przy 1280 px, **identyczny na
public i admin**):

| Klasa | Wynik | Ocena |
|---|---|---|
| `gap-4` (bazowa) | `16px` | ✅ istnieje |
| `gap-6` (bazowa) | `24px` | ✅ istnieje |
| `gap-8` (bazowa) | `32px` | ✅ istnieje |
| `md:gap-6` | `normal` | ❌ brak reguły |
| `lg:gap-6` | `normal` | ❌ brak reguły |
| `md:gap-8` | `normal` | ❌ brak reguły |
| `lg:gap-10` | `normal` | ❌ brak reguły |

Dowód na żywym elemencie: realny stack na froncie ma `gap-desktop=6` (oczekiwane `24px`),
a zmierzony `rowGap`/`columnGap` = **`16px` przy 1280, 800 i 375 px** (czyli bazowe
`gap-4`=mobile). Desktop/tablet gap są ignorowane wizualnie. **Dotyczy to także wartości
domyślnych** (`6/6/4`): out-of-the-box desktop powinien mieć 24 px, a ma 16 px.

### B2 (WAŻNY) — Niespójna generacja pozostałych klas responsywnych (kierunek/justify/align/wrap)

Ta sama przyczyna (dynamiczna konkatenacja) sprawia, że Tailwind wygenerował tylko te
warianty responsywne, które **przypadkiem** pojawiają się jako literały gdzie indziej w
kodzie. Probe przy 1280 px (public):

| Klasa | Wynik | Ocena |
|---|---|---|
| `flex-col` / `md:flex-row` / `lg:flex-row` | column / row / row | ✅ generowane |
| `md:flex-col` | row | ❌ brak (nie nadpisuje na column) |
| `lg:flex-col` (public) | row | ❌ brak |
| `items-center` / `md:items-center` / `lg:items-center` | center | ✅ generowane |
| `md:items-end` / `md:items-baseline` | normal | ❌ brak |
| `justify-evenly`/`-center`/`-between` (bazowe) | działają | ✅ generowane |
| `md:justify-between` | space-between | ✅ generowane |
| `md:justify-evenly` / `lg:justify-evenly` / `md:justify-center` | normal | ❌ brak |
| `flex-wrap` / `md:flex-wrap` | wrap | ✅ generowane |
| `lg:flex-wrap` | nowrap | ❌ brak |

Wnioski praktyczne:
- **Kierunek:** wariant `responsive` (mobile column → tablet/desktop row) renderuje się
  poprawnie, bo opiera się o bazowe `flex-col` + `md:flex-row`/`lg:flex-row` (wszystkie
  istnieją). Ale ustawienie kierunku `column` tylko na tablet/desktop (np. desktop=column
  przy mobile=row) **nie zadziała** na publicu, bo `lg:flex-col`/`md:flex-col` nie istnieją.
- **Justify:** na tablet/desktop pewne jest tylko `between` (i wartości bazowe). `center`,
  `evenly` itp. na tablet/desktop **nie renderują się**.
- **Align:** na tablet/desktop pewne jest `center`; `end`, `baseline` (prefiksowane) **nie**.
- **Wrap:** `flex-wrap` i `md:flex-wrap` działają; `lg:flex-wrap` **nie** (na publicu).

### B3 (WAŻNY) — Rozjazd Admin ↔ Front dla tych samych danych

Zestawy wygenerowanych klas **różnią się** między buildem admina (Vite/dev, :5173) a
buildem publicznym (:3000). Potwierdzony przykład: `lg:flex-col` → **admin = `column`
(działa)**, **public = `row` (nie działa)**. Oznacza to, że **podgląd w adminie może
pokazać układ, którego front nie odtworzy** (np. desktop=column wygląda dobrze w podglądzie,
a na produkcji zostaje rzędem). Gap (`md:/lg:gap-*`) jest zepsuty w obu buildach jednakowo.

> Wspólny mianownik B1–B3: **antywzorzec dynamicznego budowania klas Tailwind**
> (`${prefix}${className}`). Naprawą byłoby użycie statycznych, pełnych literałów klas w
> mapach (per breakpoint) albo safelista tych klas w konfiguracji Tailwind.

---

## 5. Uwagi UX/UI (niuanse, nie defekty per se)

1. **Wybór wariantu po cichu nadpisuje ręczne kierunki.** Kliknięcie karty wariantu resetuje
   `direction` wszystkich breakpointów do domyślnych wariantu (gap/align/justify/wrap
   zostają). Brak ostrzeżenia/undo — autor, który dopracował kierunki per breakpoint, może
   je niechcący utracić jednym kliknięciem presetu.
2. **Etykieta wariantu nie odzwierciedla ręcznych zmian kierunku.** Po ręcznej zmianie
   kierunku karta nadal pokazuje poprzednio wybrany wariant jako „Selected", choć dane już
   nie odpowiadają temu presetowi (wariant to tylko „seed"). Potencjalnie mylące.
3. **Wizard nie pokazuje aktualnej konfiguracji.** W przeciwieństwie do np. Spacera (który w
   Wizardzie streszcza wartości), Stack Wizard to wyłącznie tekst statyczny — żadnego
   podsumowania bieżącego wariantu/kierunków. Live preview obok rekompensuje to częściowo.
4. **Niespójność tytułu Advanced: kontrakt vs UI.** `stackEditorContract` deklaruje tytuł
   sekcji „Runtime summary", a render pokazuje „Runtime stack summary". Kosmetyczny rozjazd
   metadanych, bez wpływu na użytkownika.
5. **Advanced opisuje DANE, nie realny render.** „Runtime stack summary" pokazuje np.
   „Roomy spacing" dla desktopu, mimo że wizualnie desktop i tak dostaje gap mobilny (B1).
   Podsumowanie jest więc „optymistyczne" — sugeruje efekt, którego front nie pokazuje.
6. **Token `0` ukryty w selekcie odstępu.** `gapOptions` filtruje `0` (duplikat `none`), więc
   w UI jest 10 z 11 tokenów — celowa deduplikacja.
7. **Switch wrap ma czytelny, dwustanowy opis** („Items stay on one line." / „Items can
   wrap.") + tekst pomocniczy. Dobre UX (szkoda, że wynik na desktopie bywa nierenderowany — B2).
8. **„Draft saved." toast działa** — jest jasny feedback po zapisie (lepiej niż w audycie
   Spacera, gdzie toast był nieuchwytny).
9. **Sekcje „Structure", „Block layout", „Device visibility"** pod edytorem widgetu to
   kontrolki **page-buildera** (slot/width/padding/margin/widoczność per urządzenie), nie
   część edytora Stack. Odnotowuję jako kontekst; poza zakresem tego audytu.
10. **Radix Select wymaga kliknięcia trigger + opcja** — natywna komenda `select` harnessu na
    nim nie działa; klikanie myszą działa. Niuans narzędzia, nie błąd widgetu.

---

## 6. Czego NIE testowałem (świadome luki tej sesji)

- **Publikacja (Publish).** Wykonałem tylko „Save draft". Co istotne: **fixture admina
  (`7b23083d…`, stack pusty) i trasa publiczna (`/test-stack-0516`, stack z 2 dziećmi) to
  DWIE RÓŻNE strony.** Moje edycje w adminie nie mają jak pojawić się na tej trasie
  publicznej niezależnie od publikacji. Front zweryfikowałem więc pod kątem **poprawności
  renderu opublikowanego stacka**, a nie round-tripu moich edycji.
- **Dodawanie/usuwanie/reorder dzieci w slocie `content`** — nie testowane (fixture admina
  był pusty; nie wstawiałem widgetów). Placeholder „Empty stack." potwierdzony.
- **Ścieżka „legacy scalar axis"** (`align`/`justify` jako skalar zamiast obiektu) — Advanced
  ma dla niej osobny komunikat, ale UI zawsze zapisuje formę obiektową, więc nie da się jej
  wywołać z edytora; znam ją tylko z kodu.
- **Każdy token gap / każda opcja align/justify osobno** — kliknąłem reprezentatywny zestaw
  (gap 8, align center, justify evenly, wrap ON, kierunki); pozostałe potwierdzone tylko jako
  obecne na listach + przez probe CSS.
- **Tablet/Mobile jako pojedyncze edycje w Visual** — zmieniałem głównie Desktop; tablet/mobile
  weryfikowane pośrednio (przez wariant i zachowanie wartości).
- **Pełny audyt `md:`/`lg:` dla wrap=false→true na różnych breakpointach** — przetestowałem
  reprezentatywne klasy; nie zmapowałem wszystkich kombinacji `flex-nowrap` prefiksowanych.

---

## 7. Admin UI vs Front — porównanie

| Aspekt | Admin (:5173) | Front (:3000) | Zgodność |
|---|---|---|---|
| Render wariantu / atrybuty `data-stack-*` | ✅ poprawne | ✅ poprawne | ✅ |
| Edytor zapisuje stan + aktualizuje podgląd | ✅ | n/d | ✅ |
| Klasy bazowe gap (`gap-4/6/8`) | ✅ istnieją | ✅ istnieją | ✅ |
| `md:gap-*` / `lg:gap-*` | ❌ brak | ❌ brak | ✅ (oba zepsute) |
| `md:flex-row` / `lg:flex-row` | ✅ | ✅ | ✅ |
| `lg:flex-col` | ✅ działa | ❌ brak | ❌ **rozjazd** |
| `md:items-center` / `lg:items-center` | ✅ | ✅ | ✅ |
| `md:justify-evenly` / `lg:justify-*` | ❌ brak | ❌ brak | ✅ (oba) |
| `lg:flex-wrap` | (nieweryfikowane wprost) | ❌ brak | — |
| Konsola | 0 błędów / 0 ostrzeżeń | 0 błędów / 0 ostrzeżeń | ✅ |

**Wniosek:** Edytor (warstwa danych) i renderer atrybutów są spójne admin↔front. Rozjazd
pojawia się w **warstwie CSS Tailwind** — część klas responsywnych istnieje w jednym buildzie,
a nie w drugim (`lg:flex-col`), a klasy gapów per-breakpoint nie istnieją nigdzie. To czyni
podgląd admina miejscami **niewiarygodnym** względem produkcji.

---

## 8. Podsumowanie

| Tryb | Charakter | Wynik audytu |
|---|---|---|
| **Wizard** | Read-only setup + przejście do Visual | ✅ Działa zgodnie z projektem (brak pól edycji — celowo) |
| **Visual** | Główny edytor (4 sekcje) | ⚠️ Wszystkie kontrolki działają w **warstwie danych** (zapis, podgląd atrybutów, trwałość), ale część ustawień per-breakpoint **nie ma efektu wizualnego** na tablet/desktop (B1/B2) |
| **Advanced** | 2 sekcje diagnostyczne read-only | ✅ Zero kontrolek; podsumowania wiernie odzwierciedlają **dane** (ale nie realny render — patrz B1) |
| **Front** | `/test-stack-0516` (opublikowany, 2 dzieci) | ✅ HTTP 200, 0 błędów konsoli, responsywny kierunek (col↔row) i brak overflow; ⚠️ gap zablokowany na wartości mobilnej (16 px) na każdym breakpoincie (B1) |

**Werdykt końcowy:** Logika edytora i normalizacji Stacka jest **sprawna i spójna** —
warianty seedują kierunki, każda kontrolka Visual zapisuje stan i natychmiast aktualizuje
podgląd (atrybuty/klasy), zmiany przeżywają „Save draft → reload", Wizard i Advanced
realizują deklarowany kontrakt (setup-only / read-only), a front renderuje się bez błędów i
bez poziomego overflow. **Realny, powtarzalny defekt leży w warstwie CSS:** responsywne klasy
Tailwind budowane dynamicznie (`${prefix}${className}`) w większości nie trafiają do
serwowanego arkusza. Najdotkliwiej dotyka to **odstępu (`gap`) — żadna wartość tablet/desktop
nie działa wizualnie (B1), w tym wartości domyślne** — oraz w mniejszym stopniu
justify/align/wrap/kierunek na nie-mobilnych breakpointach (B2), z dodatkowym **rozjazdem
admin↔front** (`lg:flex-col`, B3). Skutek dla użytkownika: kontrolki sugerują kontrolę, której
realnie nie ma na tablet/desktop, a podgląd admina bywa myląco optymistyczny. Obszary
niezweryfikowane wymieniono jawnie w sekcji 6.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `stack-admin-visual-28-05.png` | Admin, tryb Visual po edycjach (stan zapisany draftem: vertical, gap 8/6/4, align center, justify evenly, wrap ON desktop) |
| `stack-public-desktop-28-05.png` | Front `/test-stack-0516`, 1280 px (responsive: row, 2 dzieci zawijają się do 2 wierszy, brak overflow) |
| `stack-public-mobile-375-28-05.png` | Front `/test-stack-0516`, 375 px (mobile: column, brak overflow) |
