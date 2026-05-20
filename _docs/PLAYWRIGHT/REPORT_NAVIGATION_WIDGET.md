# Navigation Widget — Raport UX/UI

> **Status:** Zakończony (analiza kodu + testy w przeglądarce)
> **Data:** 2026-05-16
> **Zakres:** Widget `navigation` — analiza statyczna kodu + testy manualne w panelu admina

---

## 1. Podsumowanie

Widget `navigation` jest widgetem kompozytowym odpowiedzialnym za wyświetlanie paska nawigacyjnego na stronach serwisu. Posiada trzy tryby edycji (Wizard / Visual / Advanced) oraz trzy warianty layoutu (Simple / With CTA / Split). Analiza obejmuje plik główny komponentu (`navigation.tsx`, 21 KB) oraz edytory (`NavigationEditors.tsx`, 45 KB).

---

## 2. Aktualny stan — co widget oferuje

### 2.1 Warianty
| Wariant | Opis |
|---------|------|
| `simple` | Logo + linki, brak CTA |
| `with-cta` | Logo + linki + przycisk CTA po prawej |
| `split` | Logo po lewej, linki wycentrowane, CTA po prawej |

### 2.2 Źródła linków
- **Manual** — ręcznie wpisane linki w edytorze
- **Menu** — synchronizacja z istniejącym menu (z modułu Menus)
- **Pages** — automatyczne pobieranie opublikowanych stron z flagą „Show in navigation"

### 2.3 Logo
- Typ: tekst lub obraz
- Źródło obrazu: zewnętrzny URL lub biblioteka mediów

### 2.4 Zachowanie mobilne
- Tryby: `expanded` / `drawer` / `minimal`
- Opcja ukrycia CTA na mobilnych

### 2.5 Linki wielopoziomowe
- Jeden poziom sub-linków (dropdown)
- Dropdown wywoływany przez CSS hover/focus (`group-hover:block`)

### 2.6 Meta linków
- Widoczność: `all` / `logged_in` / `logged_out`
- Badge z tonem
- Opis i ikona (zdefiniowane w typach, ale **nieużywane w renderze**)

### 2.7 Stylowanie
- Kolory: surface, border, text, logo, link, CTA (bg/text/border)
- Typografia: fontSize, fontWeight, textTransform
- Layout: alignment (left/center/right), maxWidth, paddingY, itemGap
- Border width: 0–3px

### 2.8 Zachowanie runtime
- Sticky navigation
- Transparent surface
- Collapse on scroll (flaga w data-atrybucie, brak implementacji JS)

---

## 3. Brakujące funkcjonalności — luki konfiguracyjne

### 3.1 KRYTYCZNE — braki funkcjonalne widgetu

#### A. Ikony przy linkach — zdefiniowane, ale nieużywane w renderze
- Typ `NavigationItemMeta` zawiera pole `icon: string | null`
- Komponent `NavigationBlock` **nie renderuje ikon** przy linkach ani w menu głównym, ani w podmenu
- Brakuje pola `icon` w edytorze (nie można wpisać ikony w UI)
- **Wpływ:** konfigurator może ustawić ikonę przez API/JSON, ale nigdy nie będzie widoczna

#### B. Opis linków — zdefiniowany, ale nieużywany
- `NavigationItemMeta.description` istnieje w schemacie
- Brak renderowania opisu w dropdown (np. jako tekst pod labelem)
- Typowe dla mega-menu / rich dropdown — całkowicie pominięte

#### C. Collapse on scroll — flaga bez implementacji
- `behavior.collapseOnScroll` zapisuje `data-collapse-on-scroll="true"` na `<nav>`
- Brak JS obsługującego faktyczne zwinięcie przy scrollu
- Dla `sticky` działa poprawnie (klasa CSS), dla collapse — tylko pusta flaga
- **Wpływ:** użytkownik włącza opcję, nic się nie dzieje w runtime

#### D. Tryb `minimal` w mobile — nie zaimplementowany
- `mobileModeOptions` zawiera `minimal` z opisem "Minimal header on mobile"
- Kod sprawdza tylko `linksVisibleOnMobile = mobileMode === "expanded"` i `showMobileToggle = mobileMode !== "expanded"`
- `drawer` i `minimal` traktowane identycznie — oba pokazują przycisk "Menu"
- Brakuje osobnej logiki renderowania dla `minimal` (np. tylko logo, bez linków/toggle)

#### E. Brak reorderingu linków (drag & drop)
- Linki edytuje się poprzez indeksowane pola w edytorze
- Nie ma możliwości przeciągania / zmiany kolejności
- Jedyna zmiana kolejności = ręczne wpisanie w innym miejscu lub remove+re-add
- Przy 8 linkach (max) to poważna przeszkoda UX

#### F. Limit 8 linków jest nieuzasadniony i bez feedbacku
- `addItem` blokuje powyżej 8, ale przycisk jest tylko `disabled` — brak komunikatu
- Nie ma opcji rozszerzenia limitu ani wyjaśnienia dlaczego limit istnieje
- Sub-linki nie mają limitu (niespójność)

#### G. Brak hover state i active state dla linków w edytorze
- Można ustawić `linkColor`, ale brak konfiguracji:
  - Link hover color
  - Link active/current color
  - Link underline (text-decoration)
- Użytkownik nie może dostosować interaktywnego stanu linków

#### H. CTA — tylko jeden przycisk
- Brak możliwości dodania drugiego CTA (np. "Login" + "Get started")
- Slot `right` pozwala na dodanie widgetów, ale nie daje spójnej konfiguracji CTA

#### I. Brak konfiguracji border-radius dla CTA
- CTA ma hardkodowany `rounded-md`
- Brak opcji: pill / square / custom radius

#### J. Brak konfiguracji logo size
- Logo image ma hardkodowane `h-6 w-auto`
- Brak opcji: small / medium / large / custom height
- Nie można powiększyć logo bez modyfikacji kodu

#### K. Logo nie jest owinięte w `<a href>`
- `NavigationBlock` renderuje logo (tekst lub obraz) bez wrappera `<a>`
- `logo.href` jest zdefiniowane w danych, ale **nie jest używane w renderze**
- Kliknięcie w logo nie przenosi na stronę główną — to błąd funkcjonalny

#### L. Brak padding/margin po lewej stronie CTA (separator wizualny)
- Gdy CTA sąsiaduje z linkami, nie ma opcji dodania separatora (np. linii pionowej)

### 3.2 WAŻNE — braki konfiguracyjne

#### M. Brak opcji `letterSpacing` w typografii
- Dostępne: fontSize, fontWeight, textTransform
- Brakuje: letterSpacing (istotne dla wariantu `uppercase`)

#### N. Brak opcji shadow dla nawigacji
- Brak opcji box-shadow (np. shadow-sm / shadow-md) — popularne dla sticky nav

#### O. Brak opcji backdrop-blur / glass effect
- Modne w 2024–2026: poluprzezroczyste navbar z `backdrop-filter: blur()`
- Nie ma opcji `blurIntensity` ani `opacity` dla transparent mode

#### P. Brak konfiguracji animacji dropdown
- Dropdown pojawia się natychmiastowo (CSS `hidden/block`)
- Brak opcji płynnego pojawiania się (fade/slide)

#### Q. Dropdown działa tylko na hover — brak `aria-expanded` na toggle
- Podmenu otwiera się przez `group-hover:block group-focus-within:block`
- Brak klikalnego togglea z `aria-expanded` — problemy z dostępnością
- Na dotykowych (touch) hover nie działa

#### R. Brak opcji kierunku otwierania dropdown
- Dropdown otwiera się zawsze pod linkiem (`top-full`)
- Brakuje: "Dropdown direction" → top/bottom/auto

#### S. Brak `target="_blank"` i `rel` dla linków zewnętrznych
- Linki renderowane bez `target` ani `rel`
- Brak opcji w edytorze: "Open in new tab"

#### T. Brak opcji linku aktywnego (current page highlighting)
- Brak mechanizmu oznaczenia aktywnego linku (np. przez `aria-current="page"`)
- Porównanie ścieżki jest możliwe runtime-side, ale brak integracji

#### U. Mobile panel nie ma animacji
- Panel mobilny pojawia się i znika natychmiastowo (`hidden` attr toggle)
- Brak slide-down / fade

#### V. Mobilny przycisk menu jest tekstem "Menu" — brak ikony hamburger
- Przycisk to `<button>Menu</button>` z minimalnym stylem
- Brakuje ikony hamburgera (SVG) i ikony zamknięcia (X) po otwarciu

#### W. Brak `aria-label` na przycisku mobilnym
- Przycisk mobilny ma `aria-expanded` i `aria-controls`, ale brak `aria-label`
- Screen reader czyta "Menu" — OK, ale nie ma komunikatu o akcji

---

## 4. Problemy UX z perspektywy użytkownika (UI/UX Audit)

### 4.1 Edytor — problemy w panelu admina

| # | Problem | Tryb edytora | Priorytet |
|---|---------|--------------|-----------|
| 1 | Logo link (`logo.href`) niewidoczny w edytorze Wizard | Wizard | WYSOKI |
| 2 | Logo link widoczny w Visual jako gołe `<Input>` bez etykiety | Visual | ŚREDNI |
| 3 | Brak podglądu live w edytorze (zmiany bez preview) | Wszystkie | WYSOKI |
| 4 | Linki w Wizard pokazują tylko pierwsze 3 — brak info o pozostałych | Wizard | ŚREDNI |
| 5 | CTA w Wizard zawsze widoczne (2 inputy) nawet gdy `ctaEnabled=false` — nie, jest ukryte, ale tekst informacyjny jest mylący | Wizard | NISKI |
| 6 | Brak wizualnego rozróżnienia między linkami a sub-linkami w edytorze | Visual | ŚREDNI |
| 7 | Kolor hex można wpisać ręcznie — brak walidacji w locie (tylko regex pattern) | Visual | NISKI |
| 8 | Pole "Logo link" w Visual Editor jest bez etykiety — samo `<Input placeholder="Logo link (e.g. /)">` | Visual | WYSOKI |
| 9 | Sekcja "Surface and Runtime Behavior" ma note o sticky/collapse w Advanced — nieintuicyjny podział | Visual | ŚREDNI |
| 10 | Advanced Editor — opcje wyglądają jak "secondary settings" bez kontekstu wizualnego | Advanced | NISKI |

### 4.2 Render — problemy na stronie końcowej

| # | Problem | Priorytet |
|---|---------|-----------|
| 1 | Logo nie jest klikalnym linkiem (brak `<a>` wrapperze) | KRYTYCZNY |
| 2 | Dropdown nie działa na touch (hover-only) | WYSOKI |
| 3 | `minimal` mobile mode = identyczny z `drawer` — opcja niedostępna faktycznie | WYSOKI |
| 4 | `collapse on scroll` nie działa | WYSOKI |
| 5 | Ikony linków nie są wyświetlane mimo konfiguracji w schemacie | WYSOKI |
| 6 | Mobilny przycisk "Menu" bez ikony hamburgera | ŚREDNI |
| 7 | Brak animacji otwierania/zamykania menu mobilnego | NISKI |
| 8 | Brak visual feedback aktywnego linku | ŚREDNI |

---

## 5. Dostępność (Accessibility) — braki

| Problem | Standard | Priorytet |
|---------|----------|-----------|
| Dropdown sub-menu niedostępne klawiaturowo (hover-only) | WCAG 2.1 2.1.1 | WYSOKI |
| Brak `role="navigation"` (jest `<nav>`, ale bez `aria-label`) | WCAG 4.1.2 | ŚREDNI |
| Logo bez `<a>` — nie jest nawigowalne klawiaturowo | WCAG 2.1.1 | KRYTYCZNY |
| Mobile toggle brak `aria-label` | WCAG 4.1.2 | ŚREDNI |
| Podmenu bez `role="menu"` / `role="menuitem"` | WCAG 4.1.2 | NISKI |
| Brak focus trap w mobile menu (drawer mode) | WCAG 2.1.2 | WYSOKI |
| Kontrast kolorów niesprawdzony (zależy od konfiguracji) | WCAG 1.4.3 | - |

---

## 6. Porównanie z rynkowymi standardami

| Funkcjonalność | Widget | Standard rynkowy |
|----------------|--------|------------------|
| Logo jako link | ❌ Brak | ✅ Wymagane |
| Hamburger ikona | ❌ Tylko tekst | ✅ SVG icon |
| Dropdown na touch | ❌ Brak | ✅ Click-based |
| Animacja dropdown | ❌ Natychmiastowa | ✅ Fade/slide |
| Active link state | ❌ Brak | ✅ Highlight |
| Multi-level menu | ❌ Max 2 poziomy | ✅ Często 3+ |
| Mega menu | ❌ Brak | ✅ Dla dużych serwisów |
| Search w nav | ❌ Brak | ✅ Popularne |
| Sticky z auto-hide | ❌ Tylko sticky bez hide | ✅ Smart sticky |
| Dark/light mode switch | ❌ Brak | ✅ Popularne |
| Mobile slide-in | ❌ Dropdown pod nav | ✅ Full-screen / slide |
| Letter spacing config | ❌ Brak | ✅ Design systems |
| Backdrop blur | ❌ Brak | ✅ Modny trend |

---

## 7. Testy w przeglądarce (Playwright)

> **Status:** Zakończone — 2026-05-16
> **Środowisko:** http://localhost:5173/admin — strona "HomePage" z widgetem Navigation (wariant with-cta, źródło: main menu)

### 7.1 Checklista testów

| Test | Status | Wynik |
|------|--------|-------|
| Logowanie do panelu admina | ✅ | OK |
| Otworzenie widgetu navigation w edytorze | ✅ | OK — strona HomePage |
| Test trybu Wizard | ✅ | Patrz §7.2 |
| Test trybu Visual | ✅ | Patrz §7.2 |
| Test trybu Advanced | ✅ | Patrz §7.2 |
| Wariant Simple | ✅ | Brak CTA — OK |
| Wariant With CTA | ✅ | CTA widoczne — OK |
| Wariant Split | ✅ | Linki wycentrowane — OK |
| Mobile mode: drawer | ✅ | Patrz §7.3 |
| Mobile mode: minimal | ✅ | **BUG** — identyczny z drawer |
| Mobile mode: expanded | ✅ | Linki zawsze widoczne — OK |
| Sticky nav | ✅ | Działa (klasa CSS sticky) |
| Transparent nav | ✅ | Działa (background transparent) |
| Weryfikacja linka logo | ✅ | **KRYTYCZNY BUG** — logo bez `<a>` |
| Dropdown sub-linków (hover) | ✅ | Działa na desktop |
| Dropdown sub-linków (touch) | ✅ | **BUG** — hover-only, nie działa na mobile |
| Źródło: manual | ✅ | Działa |
| Źródło: menu | ✅ | Synchro z main menu — OK |
| Walidacja URL `#` | ✅ | **BUG** — fałszywy błąd dla `#` |
| Limit 8 linków | ✅ | **BUG** — brak komunikatu o przyczynie |

### 7.2 Szczegółowe wyniki — edytory

#### Wizard
- Widoczne pola: Navigation style, Links source, Choose existing menu, Logo type, Logo text, Logo link (bez etykiety!), CTA enabled, Primary CTA
- **BUG #1:** Pole logo link (`/`) nie ma etykiety — widoczny tylko placeholder
- **BUG #2:** Przy źródle `menu` linki "Quick links" są niewidoczne (OK), ale brakuje podglądu jakie linki będą wyświetlane
- Przycisk "Continue to layout and styling" dostępny — przekierowuje do Visual

#### Visual
- Sekcje: Variant and Structure, Brand and Logo, Navigation Links, CTA and Right Actions, Mobile Behavior, Colors/Borders/Typography, Surface and Runtime Behavior
- **BUG #3:** Pole "Logo link" bez etykiety — only placeholder `Logo link (e.g. /)`
- **BUG #4:** Przy `links source = menu` sekcja Navigation Links pokazuje tylko info "Links are synced from selected menu" — nie ma podglądu aktualnych linków z menu
- **BUG #5:** Walidacja `isValidHref` odrzuca `#` jako niepoprawny URL (pokazuje `text-destructive`), mimo że render akceptuje `#` (`allowHash: true`). Przy menu-based linki mają `href="#"` → 5 fałszywych błędów walidacji
- Kolory: działają, są color pickery + pola tekstowe hex
- Typografia: fontSize, fontWeight, textTransform — OK

#### Advanced
- Sekcje: Layout Tokens (alignment, max-width, vertical padding, links gap), Runtime Behavior (sticky, collapse on scroll)
- Zawiera też sekcje Container/Visibility — generyczne dla wszystkich widgetów
- **OBS #1:** Sticky navigation miała toggle włączony (`checked`) dla strony HomePage — widoczne w UI
- **OBS #2:** "Collapse on scroll" toggle dostępny ale brak implementacji JS

### 7.3 Szczegółowe wyniki — render (przeglądarka)

#### Desktop (tablet)
```
[NOVA DOMY]   Projects | Individual Designs | Realizations | Technology | Contact   [Get a Quote]
```
- Logo: tekst `NOVA DOMY` jako `<span>`, **NIE jest linkiem** — potwierdzony w snapshot: `generic [ref=f1e12]: NOVA DOMY` (brak `link` wrappera)
- Linki z menu: wszystkie prowadzą do `/fsdsfsdf` (zachowanie menu gdy strony mają ten sam slug)
- CTA "Get a Quote" → `/start` — prawidłowo jako `<a>`

#### Mobile (drawer mode)
```
[NOVA DOMY]   [Menu]   [Get a Quote]
```
- Przycisk `Menu` to text-only button bez ikony hamburger ani X
- Po kliknięciu pojawia się panel z linkami i **ponownie CTA** — duplikacja CTA!
- Tekst "Menu" nie zmienia się na "Close" / "×" po otwarciu
- Brak animacji otwierania/zamykania panelu

#### Mobile (minimal mode) — IDENTYCZNY z drawer
```
[NOVA DOMY]   [Menu]   [Get a Quote]
```
- **POTWIERDZONE:** minimal mode renderuje się identycznie jak drawer
- Kod: `showMobileToggle = mobileMode !== "expanded"` — minimal i drawer traktowane tak samo

#### Dropdown (desktop hover)
- Hover nad "Projects" → pojawia się panel z "Sub-link"
- Pojawia się bez animacji (natychmiastowo)
- Styl: biały panel z obramowaniem, cień shadow-sm
- **NIE działa na kliknięcie** — tylko hover/focus-within

### 7.4 Nowe odkrycia z testów w przeglądarce (niewykryte z kodu)

| # | Odkrycie | Miejsce | Priorytet |
|---|----------|---------|-----------|
| 1 | CTA duplikuje się na mobile: raz w headerze, raz w otwartym panelu | Render mobile | ŚREDNI |
| 2 | Przycisk "Menu" nie zmienia stanu wizualnego po otwarciu | Render mobile | WYSOKI |
| 3 | Linki z menu mają `href="#"` → fałszywy błąd walidacji w edytorze | Visual editor | ŚREDNI |
| 4 | "Add link item" disabled bez żadnego komunikatu o limicie | Visual editor | ŚREDNI |
| 5 | Pole Logo link w Wizard nie ma osobnej sekcji/etykiety | Wizard | NISKI |
| 6 | W menu-source mode nie widać podglądu aktualnych linków | Visual editor | WYSOKI |
| 7 | Przy 8 linkach maks — przycisk szary, zero tooltip/komunikatu | Visual editor | ŚREDNI |

---

## 8. Screenshoty z testów

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `nav_visual_editor.png` | Visual editor — wariant With CTA, menu source |
| `nav_wizard_editor.png` | Wizard editor — widok domyślny |
| `nav_advanced_editor.png` | Advanced editor — sticky enabled |
| `nav_preview.png` | Preview desktop — NOVA DOMY nav |
| `nav_mobile_preview.png` | Preview mobile — hamburger "Menu" tekst |
| `nav_mobile_menu_open.png` | Mobile menu otwarte — duplikacja CTA widoczna |
| `nav_tablet_preview.png` | Preview tablet — pełna nawigacja |
| `nav_simple_variant.png` | Wariant Simple — brak CTA |
| `nav_split_variant.png` | Wariant Split — centrowiane linki |
| `nav_minimal_mode.png` | Minimal mobile mode — identyczny z drawer |
| `nav_sublink_added.png` | Sub-link dodany w edytorze |
| `nav_dropdown_hover.png` | Dropdown otwarte na hover w canvas |
| `nav_max_links.png` | 8 linków max — disabled button bez komunikatu |
| `nav_transparent.png` | Transparent surface włączony |
| `front_desktop.png` | Frontend localhost:3000 — desktop |
| `front_dropdown.png` | Frontend — hover nad linkiem (brak sub-linków w menu) |
| `front_scrolled.png` | Frontend — sticky nav NIE działa po scrollu |
| `front_mobile_top.png` | Frontend mobile — hamburger "Menu" tekst |
| `front_mobile_menu.png` | Frontend mobile — otwarty panel, duplikacja CTA |
| `front_mobile_scroll.png` | Frontend mobile — nav znika po scrollu (sticky nie działa) |

---

## 7.5 Porównanie: Admin Preview vs Frontend (localhost:3000)

> **Wniosek: Admin Preview jest wiernym odbiciem frontendu.** Wszystkie zachowania są identyczne.

| Element | Admin Preview | Frontend (localhost:3000) | Zgodność |
|---------|---------------|--------------------------|----------|
| Logo jako link | ❌ `<span>` | ❌ `<span>NOVA DOMY</span>` | ✅ Identyczne |
| Linki nawigacji | 5 linków → `/fsdsfsdf` | 5 linków → `/fsdsfsdf` | ✅ Identyczne |
| CTA "Get a Quote" | ✅ `<a href="/start">` | ✅ `<a href="/start">` | ✅ Identyczne |
| Hamburger button | ❌ Tekst "Menu" | ❌ Tekst "Menu" | ✅ Identyczne |
| Mobile panel | Linki + duplikacja CTA | Linki + duplikacja CTA | ✅ Identyczne |
| Przycisk Menu po otwarciu | Nadal "Menu" | Nadal "Menu" | ✅ Identyczne |
| Sticky nav | ✅ W admin editorze visible | ❌ **NIE działa na froncie** | ⚠️ Rozbieżność! |

### Odkrycie: Sticky nav działa w edytorze, ale NIE na froncie

**Przyczyna:** Wrapper komponent `<Section>` renderuje div z klasą `relative overflow-hidden pt-0 pb-0`. Właściwość `overflow: hidden` na elemencie nadrzędnym **blokuje `position: sticky`** — to jest znane ograniczenie CSS.

```
Nav (position: sticky top-0)
  └─ div [static]
      └─ SECTION [static]
          └─ MAIN [static]
              └─ DIV [static]
                  └─ DIV.relative.overflow-hidden  ← PROBLEM! overflow:hidden kills sticky
```

**Fix:** Widget `Section` (lub layout wrapper) nie powinien używać `overflow: hidden` gdy dziecko ma sticky nav, lub nav powinien być renderowany poza tym wrapperem (np. na poziomie `<body>` / layout).

---

## 9. Rekomendacje priorytetyzowane

### P0 — Błędy funkcjonalne (natychmiastowa naprawa)

| # | Problem | Lokalizacja w kodzie | Fix |
|---|---------|---------------------|-----|
| 1 | **Logo nie jest linkiem** | `navigation.tsx:506-516` | Owinąć `<span>`/`<img>` logo w `<a href={normalized.logo.href ?? "/"}>`  |
| 2 | **`minimal` = `drawer`** | `navigation.tsx:440-441` | Dodać osobną gałąź dla `mobileMode === "minimal"` — tylko logo, brak toggle i linków |
| 3 | **Sticky nav nie działa na froncie** | `Section` widget / layout wrapper | Usunąć `overflow:hidden` z `div.relative.overflow-hidden` otaczającego nav, lub przenieść nav poza ten wrapper |
| 4 | **Collapse on scroll bez JS** | `navigationRuntimeClientScript` | Dodać listener `scroll` event → dodać/usunąć CSS klasę na `<nav>` |
| 4 | **Fałszywa walidacja URL `#`** | `NavigationEditors.tsx:86` | `isValidHref` powinno akceptować `#`: dodać `|| value.startsWith("#")` |
| 5 | **Menu nie zmienia stanu po otwarciu** | `navigationRuntimeClientScript` | Zmienić tekst/ikonę przycisku po toggle (open → X/Close) |

### P1 — Brakujące kluczowe funkcje

| # | Problem | Fix |
|---|---------|-----|
| 6 | **Brak ikony hamburgera** | Zastąpić `<button>Menu</button>` komponentem z SVG ikoną hamburgera + X |
| 7 | **Dropdown nie działa na touch** | Dodać click-based trigger, lub `@media (hover: none)` CSS dla urządzeń touch |
| 8 | **Duplikacja CTA w mobile** | Nie renderować CTA w mobile headerze gdy `hideCtaOnMobile=false` i jest panel mobilny |
| 9 | **Ikony przy linkach** | `navigation.tsx:536` — renderować `item.meta?.icon` przed `<a>` labelem |
| 10 | **Podgląd linków menu w edytorze** | Przy `linksSource="menu"` pokazać read-only listę aktualnych linków z menu |

### P2 — Ulepszenia UX edytora

| # | Problem | Fix |
|---|---------|-----|
| 11 | **Brak etykiety pola Logo link** | `NavigationEditors.tsx:837` — dodać `<p className="text-sm font-medium">Logo link</p>` |
| 12 | **Brak komunikatu przy limicie** | Gdy `items.length >= 8` dodać `<p>Osiągnięto maksymalną liczbę 8 linków.</p>` |
| 13 | **Drag & drop reorder** | Zaimplementować reorder przez `@dnd-kit/sortable` lub natywne HTML5 drag |
| 14 | **Niespójność limitów** | Dodać limit sub-linków (np. 6) lub usunąć limit głównych linków |

### P3 — Rozszerzona konfiguracja (backlog)

| # | Funkcja | Opis |
|---|---------|------|
| 15 | **Hover/active link colors** | Nowe pola CSS: `linkHoverColor`, `linkActiveColor` |
| 16 | **Border radius CTA** | Nowe pole: `ctaBorderRadius` — `sm / md / full` |
| 17 | **Logo size** | Nowe pole: `logoHeight` — `h-4 / h-6 / h-8 / h-10` |
| 18 | **Letter spacing** | Dodać `letterSpacing` do opcji typografii |
| 19 | **Box shadow** | Dodać `shadow` opcję — `none / sm / md / lg` |
| 20 | **Backdrop blur** | Dodać `backdropBlur` dla transparent mode |
| 21 | **Open in new tab** | Dodać `target` / `rel` per link w meta |
| 22 | **Animacja dropdown** | Zastąpić `hidden/block` na Tailwind transition |
| 23 | **Animacja mobile panel** | Dodać slide-down transition dla `data-navigation-mobile-panel` |
| 24 | **Active link highlighting** | Mechanizm `aria-current="page"` bazujący na current URL |

---

## 10. Podsumowanie końcowe

### Najważniejsze krytyczne braki (5 błędów funkcjonalnych)

Z **27 wykrytych problemów**, 5 to błędy, które bezpośrednio psują UX końcowego użytkownika:

1. **Logo nie jest linkiem** — kliknięcie logo nie prowadzi nigdzie. Potwierdzony w kodzie i przeglądarce: `<span>NOVA DOMY</span>` zamiast `<a href="/">NOVA DOMY</a>`.
2. **`minimal` = `drawer`** — opcja "Minimal header on mobile" zachowuje się identycznie jak "Compact menu button" — użytkownik jest wprowadzany w błąd.
3. **Collapse on scroll bez implementacji** — toggle w panelu Advanced nie ma żadnego efektu w runtime.
4. **Przycisk "Menu" bez zmiany stanu** — po otwarciu menu mobilnego nadal wyświetla "Menu" zamiast "Close" / "×".
5. **Duplikacja CTA na mobile** — CTA "Get a Quote" pojawia się dwa razy: w headerze i w otwartym panelu.

### Ogólna ocena

Widget jest **solidnym fundamentem** z dobrą architekturą (3 tryby edytora, schema validation, runtime resolver, 3 warianty), ale **kilka kluczowych funkcji zdefiniowanych w schemacie nie jest zaimplementowanych** (`icon`, `description`, `collapseOnScroll`, `minimal` mode). Największy priorytet to P0 bugfixy — szczególnie logo jako link, który jest absolutnym standardem każdej nawigacji webowej.

---

*Ostatnia aktualizacja: 2026-05-16 (analiza statyczna kodu + testy Playwright)*

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Navigation is classification only. Widget-owned
  follow-up scope continues through the `TASK-275` family.
- Shared rows that match existing TASK-256 link/runtime mechanisms remain
  referenced by `TASK-256-07` and shared follow-up owners such as `TASK-299`.

---

## Status po TASK-275 (2026-05-19)

### Final classification

| Finding | Final status | Owner / landed scope | Evidence |
|---|---|---|---|
| Logo renders without a link and editor hash validation drifts from runtime | fixed | `TASK-275-01` | logo now renders as a safe anchor, Wizard/Visual logo-link fields are labelled, and editor validation uses the same shared safe-href contract as runtime |
| `minimal` mobile mode behaves like `drawer` | fixed | `TASK-275-02` | `minimal` now renders a reduced mobile header without the drawer toggle/panel, while `drawer` owns the compact panel contract |
| Mobile CTA duplicates between header and open drawer | fixed | `TASK-275-02` | drawer mode now renders one mobile CTA path inside the panel and keeps the header CTA hidden on mobile |
| Mobile toggle is text-only, has no explicit action state, and no focus-safe drawer behavior | fixed | `TASK-275-02` | drawer toggle now exposes hamburger/close icons, `aria-label`, open/closed label state, focus handoff, focus loop, Escape close, and return-to-trigger behavior |
| Dropdown works only on hover / touch is broken / no disclosure state | fixed | `TASK-275-03` | submenu buttons now expose `aria-expanded`, `aria-controls`, runtime-managed `aria-hidden`, sibling-close behavior, outside-click close, and root-scoped disclosure state |
| Root nav lacks explicit accessible label | fixed | `TASK-275-03` | runtime output now renders `aria-label=\"Primary navigation\"` on the root `<nav>` |
| `icon`, `badge`, and `description` metadata exist but are not editable or rendered | fixed | `TASK-275-03` | manual links and sub-links now expose metadata fields in Visual, and runtime renders those values as plain text without widening to rich menu content |
| Main links cannot be reordered / limit state has no explanation / menu source has no preview / Wizard hides overflow state | fixed | `TASK-275-04` | move buttons, limit helper text, child grouping, Wizard overflow summary, and read-only synced menu preview are now part of the Navigation editor contract, including page-backed menu items that resolve to stored page slugs instead of degrading to `#` in the editor snapshot |
| `collapseOnScroll` is only a data attribute | fixed | `TASK-275-05-01` | Navigation runtime now toggles root-scoped collapsed state and classes while scrolling; no-JS fallback stays expanded instead of claiming hidden behavior |
| Surface and Runtime Behavior note is confusing because sticky/collapse controls live in Advanced | fixed | `TASK-275-05-01` | Navigation-local helper copy now explains the sticky/collapse boundary in Visual while the broader shared editor-mode IA remains routed separately |
| Active link highlighting and safe target/rel controls are missing | fixed | `TASK-275-05-02` | manual links now support bounded `self` / `blank` targets with safe `rel`, while client runtime applies `none` / `pathname` / `exact` active-link modes and keeps `aria-current=\"page\"` bounded to one semantic current link per root |
| Hover/active colors, underline, letter spacing, shadow, blur, dropdown direction, motion, and local color feedback are missing | fixed | `TASK-275-05-03` | Navigation now owns bounded visual tokens for these fields, runtime output emits deterministic CSS variables/classes/data markers for hover/active colors, underline, letter spacing, direction, and motion, and Visual shows deterministic live feedback for Navigation color inputs |
| CTA radius/separator, logo size, and truthful CTA guidance are missing | fixed | `TASK-275-05-04` | logo size, CTA radius, CTA separator, and explicit Right Actions copy are now schema-backed, normalized, rendered, and documented |
| Missing live preview inside the widget editors | routed | `TASK-317` | this remains a shared builder/editor preview-surface task and is not closed by widget-local Navigation work |
| Sticky works in local editor contexts but frontend sticky can be blocked by `Section` / page-shell overflow | routed | `TASK-318` | shared Section/layout containment still owns the frontend sticky blocker; Navigation only implements its local sticky/collapse contract |
| Global Visual/Advanced editor-mode ownership and lack of shared visual context | routed | `TASK-256-01` | Navigation updated only local copy; the broader editor-mode IA remains shared owner scope |
| Generic contrast validation for configurable colors | routed | `TASK-299` | shared cross-widget contrast validation is intentionally owned outside TASK-275 by the reusable contrast-guidance task |
| Mega menu, search, dark-mode switch, and broader platform expansion requests | deferred | future product task | these remain outside the current Navigation v1 surface and are intentionally not claimed as fixed here |

### Representative DOM excerpts

```html
<nav data-navigation-widget="1" aria-label="Primary navigation" data-navigation-active-mode="pathname">
  <a href="/" aria-label="Coderso home">Coderso</a>
  <button data-navigation-mobile-toggle aria-expanded="false" aria-label="Open navigation menu">
    <span data-navigation-mobile-label>Menu</span>
  </button>
</nav>
```

```html
<button
  data-navigation-submenu-toggle="1"
  aria-expanded="false"
  aria-controls="tokens-desktop-submenu-0"
  aria-label="Toggle Docs submenu"
></button>
<ul
  id="tokens-desktop-submenu-0"
  data-navigation-submenu-panel="1"
  data-navigation-direction="top"
  data-navigation-position="top"
></ul>
```

### Validation snapshot

Validated locally on the TASK-275 worktree after the final implementation and
doc sync:

- `bun run lint` — OK
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx` — OK
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts tests/unit/widgets/validator.test.ts` — OK
- `bun run lint` included `bun --cwd core lint`, `bun --cwd core lint:types`,
  repo ESLint, and repo `tsc --noEmit` — OK
- `bun run gates:coderso` — OK (`functional`, `ux`, `performance`,
  `security`, and `reliability` all passed)
- `bun run precommit` — OK

Representative targeted proof after the final drift fixes:

- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/unit/navigation/navigationRuntimeResolver.test.ts`
- `tests/unit/widgets/validator.test.ts`

Broad repo-wide commands were sampled because this task originally asked for
them, but the resulting reds were outside Navigation ownership:

- `bun run test:bun` — failed outside Navigation scope across shared lanes such
  as:
  - `tests/unit/commerce/commerceService.test.ts`
  - `tests/unit/forms/formsService.test.ts`
  - `tests/unit/forms/submissionService.test.ts`
  - `tests/unit/kits/installService.test.ts`
  - `tests/unit/content/listingQueriesService.test.ts`
  - `tests/unit/content/listingTemplatesService.test.ts`
  - `tests/integration/runtime/detail-page-composer-runtime.test.tsx`
  - `tests/integration/runtime/detail-page-preview-cache.test.ts`
  - the run was stopped after repeated unrelated failures once the user
    approved a Navigation-only closeout on this worktree
- `bun run test:vitest` — failed outside Navigation scope with one existing red:
  - `tests/vitest/ui/feature-grid-editor-wave.test.tsx` timeout in
    `FeatureGrid editors cover variant changes, card editing, style tokens, and advanced normalization`
- `bun run scan:security:strict` — Semgrep scan was started in `strict` mode,
  but the repo-wide scan was intentionally stopped after the user accepted a
  scope-local TASK-275 closeout instead of waiting on broad shared-lane noise

The unrelated failures above do not touch the Navigation owner files changed by
TASK-275. Final closure for this family therefore relies on the green
Navigation-owned suites plus the green full-repo lint lane.
