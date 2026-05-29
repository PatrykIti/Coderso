# RAPORT: Navigation Widget — audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — pełny audyt trybów Wizard / Visual / Advanced + frontend
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-navigation-v3` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixtura):** „Contract Test - navigation" (`2789358f-ed6c-446e-954e-d5b2b0835ce5`, slug `/ctr-navigation-2305`)
> **Trasa publiczna weryfikowana:** http://localhost:3000/homepage (tytuł `HomePage`)
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` oraz `28-05-2026/REPORT_FORM_EMBED_WIDGET.md`

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Weryfikacja opierała się na rzeczywistych interakcjach z UI edytora
oraz na inspekcji DOM (`eval`) na żywym podglądzie admin i na statycznym renderze SSR
trasy publicznej. Kolory natywnego pickera sterowano programowo (natywny setter +
zdarzenia `input`/`change`) — i takie zdarzenia **realnie** trafiały do handlera React.

**Najważniejsza uwaga metodologiczna (kluczowa dla całego raportu):**

> Fixtura admin (`/ctr-navigation-2305`) ma **puste `data: {}`** (czysty bare widget,
> `editor.mode = "visual"`, `wizardCompleted: true`). Renderer stosuje więc same defaulty:
> wariant `simple`, logo tekstowe „Coderso", linki Home/About/Contact, brak CTA (bo
> `simple`), `linksSource: manual`, layout `right`/`6xl`/`py-4`/`gap-4`.
>
> **Trasa publiczna `/homepage` to ZUPEŁNIE INNA strona** — z własną, realnie skonfigurowaną
> instancją widgetu (logo „NOVA DOMY", 5 linków, wariant z CTA „Get a Quote", sticky,
> `mobileMode: minimal`, `activeLinkMode: pathname`). Nie jest to ta sama instancja co
> fixtura admin. Dlatego rozdział 4 (Admin↔Frontend) porównuje **renderer**, a nie ten sam
> rekord danych. Moje edycje w admin były wyłącznie **w pamięci edytora** — fixtury nie
> zapisywałem (ochrona współdzielonego rekordu, patrz §3.5).

**Co faktycznie przetestowano (z asercjami DOM):**

- Logowanie do admina, otwarcie fixtury, odnalezienie widgetu na kanwie i w podglądzie.
- Tryb **Wizard** (wejście przez „Run setup again"): read-only podsumowanie + przejścia
  Wizard↔Visual.
- Tryb **Visual**: warianty (Simple/With CTA/Split), `linksSource` (Manual/Existing menu/
  Pages index), logo (typ/tekst/destynacja), aktywny stan linku, edycja/dodawanie/usuwanie/
  reorder linków i sub-linków, CTA (label/href), tryb mobilny, kolory (swatch + Clear),
  border width, font size, alignment, max width, transparent, sticky.
- Tryb **Advanced**: trzy read-only sekcje diagnostyczne + reaktywność na edycje z Visual.
- **Frontend** `/homepage`: render SSR realnej konfiguracji, a11y, runtime JS (flaga globalna),
  aktywne linki, responsywność 375px (tryb minimal), konsola.
- Weryfikacja **braku autozapisu** (fixtura nietknięta po moich edycjach in-memory).

**Czego NIE przetestowano (świadomie lub z powodu środowiska):**

- **Synchronizacji menu** (`linksSource: menu`) — endpoint `/admin/api/menus` zwraca `200 []`,
  środowisko **nie ma ani jednego zapisanego menu**. Selektor pokazuje tylko „No menu selected".
- **Runtime'owej rozdzielczości źródła „Pages index"** — to feature runtime'owy
  (`navigationRuntimeResolver`); podgląd admin pokazuje wyłącznie linki fallback (manual).
- **Pozytywnego potwierdzenia podświetlenia aktywnego linku** na froncie — wszystkie linki
  `/homepage` mają `href="#"` (a logo „/"), więc w trybie `pathname` runtime poprawnie **nie**
  oznacza żadnego linku (brak fałszywych trafień). Pozytywne dopasowanie do bieżącej ścieżki
  było nieweryfikowalne na tej konkretnej stronie.
- **Otwierania/zamykania szuflady (drawer) i sub-menu w runtime** na żywym froncie —
  `/homepage` używa trybu `minimal` (brak drawer toggle) i nie ma sub-linków. W podglądzie
  admin runtime nie działa (React nie wykonuje skryptów wstrzykiwanych przez
  `dangerouslySetInnerHTML`), więc te interakcje nie były pozytywnie odpalone (patrz N6).
- **Zapisu / publikacji** — celowo nie zapisywano, aby nie zmutować współdzielonej fixtury.
- Każdej wartości każdego comboboxa — testowano wartości reprezentatywne.

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja przez asercje DOM/`eval`.
Ewentualne nazwy zrzutów Playwright byłyby wyłącznie lokalnymi etykietami, ignorowanymi
przez Git i nie stanowiłyby wymaganego evidence w repo.

**Pliki źródłowe:**

- `core/widgets/core/navigation.tsx` — renderer, model danych, normalizacja, schemat,
  kontrakt edytora, wstrzykiwany runtime client script.
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/services/navigation/navigationRuntimeResolver.ts`, `navigationMenuMapping.ts` —
  runtime'owa rozdzielczość źródeł menu/pages (nieuruchamiana w admin preview).

---

## 1. Przegląd widgetu

**Typ:** `navigation` (kategoria: navigation)
**Warianty:** `simple` (logo + linki, bez CTA), `with-cta` (logo + linki + CTA po prawej),
`split` (linki wycentrowane + akcje/CTA po prawej). CTA jest aktywne tylko w `with-cta`/`split`.
**Sloty:** jeden slot `right` („Right Actions") na widgety dodatkowe (login, language switcher).
**Tryby edytora:** Wizard (jednorazowy review setupu), Visual (codzienna edycja), Advanced
(read-only diagnostyka). Wariant wybiera **Visual** (`visualOwnsVariantSelection: true`).
**Źródła linków:** `manual` (ręczne), `menu` (istniejące menu z modułu Menus), `pages`
(indeks opublikowanych stron z „Show in navigation", manual jako fallback).

Widget renderuje semantyczny `<nav aria-label="Primary navigation">` z logo (tekst lub obraz
z Media Library), listą linków top-level (z opcjonalnym jednym poziomem sub-linków, ikoną,
opisem i badge), opcjonalnym CTA oraz szufladą mobilną. Runtime client script (wstrzykiwany
warunkowo) obsługuje: drawer mobilny (focus trap, Escape), toggle sub-menu, collapse-on-scroll
i podświetlanie aktywnego linku z `aria-current="page"`.

**Stan fixtury admin w chwili testu:** bare widget `data: {}` (same defaulty, wariant `simple`).

---

## 2. Model danych i kontrakt edytora (z kodu)

| Sekcja | Pola | Tryb (writable) |
|--------|------|-----------------|
| **(variant)** | `simple` / `with-cta` / `split` | Visual |
| **logo** | `type` (text/image), `value`, `href`, `alt`, `source` (external/library), `assetId` | Visual |
| **items[]** | `label`, `href`, `target` (self/blank), `meta` (visibility/badge/description/icon), `children[]` (1 poziom) | Visual |
| **cta** | `label`, `href` (tylko `with-cta`/`split`) | Visual |
| **linksSource / menuKey** | `manual` / `menu` / `pages`, klucz menu | Visual |
| **behavior** | `mobileMode` (expanded/drawer/minimal), `hideCtaOnMobile`, `activeLinkMode` (none/pathname/exact), `transparent`, `sticky`, `collapseOnScroll` | Visual |
| **layout** | `alignment`, `maxWidth` (none/5xl/6xl/7xl), `paddingY` (none/2/3/4/5), `itemGap` (none/2/3/4/6) | Visual |
| **style** | surface/border/text/logo/link/linkHover/linkActive/ctaBg/ctaText/ctaBorder kolory + borderWidth, fontSize, fontWeight, textTransform, letterSpacing, linkUnderline, shadow, backdropBlur, dropdownDirection, motion, logoHeight, ctaBorderRadius, ctaSeparator | Visual |

**Podział własności (kontrakt, `version: 2`):**
- **Wizard** (`writablePaths: []`) — wyłącznie read-only review: `variant`, `logo.type`,
  `logo.value`, `linksSource`, `menuKey`.
- **Visual** — 7 sekcji: Variant and Structure, Brand and Logo, Navigation Links, CTA and
  Right Actions, Mobile Behavior, Colors/Borders/Typography, Surface and Runtime Behavior.
  Posiada **wszystkie** ścieżki zapisywalne.
- **Advanced** (`writablePaths: []`) — 3 sekcje read-only diagnostyczne (runtime/layout/behavior).

Limity edytora (z kodu): max **8** linków top-level, max **6** sub-linków na rodzica,
**minimum 2** linki (Remove zablokowany przy `items.length <= 2`).

---

## 3. Co DZIAŁA (zweryfikowane na żywo)

### 3.1 Wizard (read-only review)

| Funkcja | Wynik testu |
|---------|-------------|
| **Wejście w Wizard** | „Run setup again" przełącza panel na tryb Wizard z nagłówkiem „Wizard / Navigation". ✓ |
| **Sekcja „Starter menu"** | Pokazuje read-only: Current layout = „Simple", Current links source = „Manual links", podgląd „Starter links preview" (Home / About / Contact), Logo type = „Text logo", Logo text = „Coderso", podpowiedź o ukryciu CTA w `simple`. ✓ |
| **Brak kontrolek edycyjnych** | Asercja DOM: region „Starter menu" ma **0 inputów i 0 buttonów** — w pełni read-only, zgodnie z kontraktem (`writablePaths: []`). ✓ |
| **Live preview** | Panel „Live preview" odzwierciedla renderer (logo + linki). ✓ |
| **Przejście Wizard → Visual** | „Finish setup and open Visual" przełącza zakładkę na Visual (`aria-selected=true`). ✓ |

### 3.2 Visual — kontrolki z obserwowalnym efektem w podglądzie (asercje DOM)

| Funkcja | Wynik testu (asercja DOM) |
|---------|---------------------------|
| **Wariant „With CTA"** | Po wyborze: w podglądzie pojawia się CTA „Get started" (`href=/start`). ✓ |
| **Wariant „Split"** | Linki wymuszone na `justify-center` + CTA renderowane. ✓ |
| **Logo text** | „Coderso" → „MyBrand": tekst logo i `aria-label` („MyBrand home") aktualizują się natychmiast. ✓ |
| **CTA label** | „Get started" → „Launch now": tekst CTA w podglądzie zmienia się natychmiast. ✓ |
| **Link label** | Link 1 „Home" → „Start": etykieta w podglądzie zmienia się natychmiast. ✓ |
| **Dodanie sub-linku** | „Add sub-link" na Link 1 → w podglądzie pojawia się `data-navigation-submenu-toggle` + panel `data-navigation-submenu-panel`. ✓ |
| **Reorder linku** | „Move down" na Link 1 → kolejność w podglądzie: About → Start → Contact. ✓ |
| **Add link item** | Dodaje „Item 4" (4. link) do podglądu. ✓ |
| **Alignment** | „right" → „center": kontener linków `justify-end` → `justify-center`. ✓ |
| **Max width** | „6xl" → „7xl": kontener wewnętrzny `max-w-6xl` → `max-w-7xl`. ✓ |
| **Border width** | „1" → „3": computed `border-bottom-width` = `3px` (inline `3px`). ✓ |
| **Font size** | „sm" → „lg": lista linków zyskuje klasę `text-lg`. ✓ |
| **Surface color** | Ustawienie `#ff0000` przez swatch → tło `rgb(255,0,0)`; etykieta → „Saved custom color". ✓ |
| **Clear (surface)** | Klik „Clear" → tło wraca do `var(--color-bg)` (w admin: `rgba(0,0,0,0)`), etykieta → „Theme default". ✓ |
| **Transparent surface** | Toggle → `background` i `border-bottom-color` = `transparent`. ✓ |
| **Sticky navigation** | Toggle → klasa `sticky`, computed `position: sticky`. ✓ |
| **Mobile mode „drawer"** | `data-mobile-mode="drawer"` + render `data-navigation-mobile-toggle`, `data-navigation-mobile-panel` oraz wstrzyknięcie `<script>` runtime. ✓ |
| **Active link state** | „No active state" → „Match current path": `data-navigation-active-mode="pathname"`. ✓ |

### 3.3 Visual — kontrolki działające w UI, których cel jest runtime'owy/środowiskowy

| Funkcja | Obserwacja |
|---------|------------|
| **Links source → Existing menu** | Pojawia się selektor „Choose existing menu", ale lista to wyłącznie „No menu selected" (brak menu w środowisku — patrz I1). Synchronizacja niemożliwa do przetestowania. |
| **Links source → Pages index** | Pokazuje read-only „Current fallback links" (manual jako fallback) + opis; faktyczna rozdzielczość stron jest runtime'owa. Podgląd admin renderuje fallback (`data-link-source="pages"`). |
| **Link metadata (icon/description/badge/target)** | Pola istnieją i przyjmują wartości w UI; ich efekt wizualny (ikona/badge/opis) jest renderowany, ale nie testowałem każdego z osobna — pozostałem przy reprezentatywnych zmianach struktury. |

### 3.4 Advanced (read-only, reaktywny)

| Sekcja | Wynik testu |
|--------|-------------|
| **Runtime summary** | Links source = „manual", Menu key = „Not configured", Manual links = **„4"** (odzwierciedla dodany „Item 4"!), CTA = **„Configured"** (odzwierciedla „Launch now"). ✓ Reaktywne. |
| **Layout token summary** | Alignment = **„center"**, Max width = **„7xl"** (oba odzwierciedlają moje zmiany!), Vertical padding = „4", Links gap = „4". ✓ Reaktywne. |
| **Runtime behavior summary** | Sticky navigation = **„Enabled"** (odzwierciedla mój toggle!), Collapse on scroll = „Disabled". ✓ Reaktywne. |
| **Block layout / Visibility summary** | Generyczne panele bloku (Content width default, Padding MD/MD, Margin None). Read-only. |
| **Jawnie read-only** | Asercja DOM: tabpanel Advanced ma **0 kontrolek zapisywalnych** (inputy/combo/switch/button). ✓ Zgodne z kontraktem. |

### 3.5 Brak autozapisu

Po wszystkich moich edycjach in-memory ponowny `GET /admin/api/pages/2789358f-…`
zwrócił niezmienione: `data: {}`, `editor.mode: "visual"`, `wizardCompleted: true`,
`updatedAt: 2026-05-23T20:50:20.359Z`. **Fixtura nie została zmutowana.** ✓

### 3.6 Frontend (`/homepage`, SSR realnej konfiguracji)

| Aspekt | Wynik |
|--------|-------|
| Render | 1 instancja `nav[data-navigation-widget="1"]`, `aria-label="Primary navigation"`. ✓ |
| Logo | „NOVA DOMY" → `href=/`, `aria-label="NOVA DOMY home"`. ✓ |
| Linki | Projects / Individual Designs / Realizations / Technology / Contact (wszystkie `href="#"`). ✓ |
| CTA | „Get a Quote" → `/start` (wariant z CTA: with-cta lub split). ✓ |
| Surface/border | `data-link-source="manual"`, tło `rgb(255,255,255)`, `border-bottom-width: 1px`, sticky aktywny. ✓ |
| Runtime JS | `<script>` obecny **i wykonany** — `window.__nextlessNavigationBound === true`. ✓ |
| Aktywne linki | `activeLinkMode="pathname"`, ale 0 aktywnych linków (wszystkie `href="#"` — runtime poprawnie pomija, brak fałszywych `aria-current`). ✓ (poprawne zachowanie negatywne) |
| Tryb mobilny | `mobileMode="minimal"` → brak `data-navigation-mobile-toggle`. ✓ |
| Konsola | 0 błędów, 0 ostrzeżeń. ✓ |
| Mobile 375px | Lista linków `display:none` (`hidden md:flex`), CTA pozostaje widoczne, brak drawer toggle, **brak poziomego scrolla** (`bodyScrollW == winW == 375`). ✓ Zgodne z trybem `minimal`. |

---

## 4. Spójność Admin ↔ Frontend

> Uwaga: admin fixtura i `/homepage` to **różne strony / różne dane**. Poniżej oceniam
> spójność **rendererą** (ten sam komponent `NavigationBlock`), nie tego samego rekordu.

| Funkcjonalność | Admin Preview (bare fixtura) | Frontend `/homepage` (realna konfiguracja) | Zgodność |
|----------------|------------------------------|---------------------------------------------|----------|
| Struktura `<nav>` + `aria-label` | ✓ „Primary navigation" | ✓ „Primary navigation" | ✓ |
| Logo (tekst, `aria-label`, href) | ✓ | ✓ | ✓ |
| Lista linków + CTA | ✓ (po wyborze With CTA) | ✓ (z CTA „Get a Quote") | ✓ |
| `data-*` atrybuty (link-source, mobile-mode, active-mode) | ✓ ustawiane | ✓ ustawiane | ✓ |
| **Runtime JS (drawer/submenu/active/collapse)** | wstrzyknięty, ale **NIE wykonywany** (React nie odpala `dangerouslySetInnerHTML` script) | **wykonywany** (`__nextlessNavigationBound=true`) | ✗ rozbieżność środowiska (N6) |
| `var(--color-bg)` surface | computed `rgba(0,0,0,0)` (admin) | `rgb(255,255,255)` (front) | ✗ różna rozdzielczość zmiennej (N5) |
| Moje edycje in-memory (logo/CTA/kolory/layout) | widoczne w podglądzie | **NIE wyciekły** (inna strona + brak zapisu) | ✓ |

**Wniosek:** renderer statyczny jest spójny admin↔front. Różnice dotyczą **warstwy runtime**
(JS nie odpala się w podglądzie admin — N6) oraz **rozdzielczości zmiennych CSS** (N5).

---

## 5. Co NIE działa / wymaga uwagi

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| I1 | **Brak jakiegokolwiek zapisanego menu** w środowisku (`/admin/api/menus` → `[]`). Źródło „Existing menu" pokazuje tylko „No menu selected"; synchronizacji menu **nie da się skonfigurować ani przetestować**. | Ograniczenie środowiska (blokujące dla źródła menu) |
| N1 | **Domyślne kolory CSS-variable mylnie etykietowane „Saved custom color".** Dla `surfaceColor` (`var(--color-bg)`), `ctaBackgroundColor` (`var(--color-primary)`), `ctaTextColor` (`var(--color-bg)`) Style pokazuje „Saved custom color" + aktywny „Clear" + hint, mimo że to defaulty z `navigationDefaults.style` (użytkownik niczego nie nadpisał). Kolory niezdefiniowane (border/text/logo/link/hover/active) poprawnie pokazują „Theme default", a `ctaBorderColor: transparent` — „Transparent". Analogiczne do form-embed I3. | Mylące UI |
| N2 | **Natywny picker koloru bez pola hex.** Wszystkie kontrolki koloru mają `showValueInput={false}` → jedyną drogą jest wizualny `<input type="color">` (picker OS); nie da się wpisać/wkleić hex z klawiatury. (Wartości udało się ustawić **programowo** — handler React działa — ale realny użytkownik ma tylko picker.) Analogiczne do form-embed I7. | Nuta UX/dostępność |
| N3 | **Advanced „Runtime behavior summary" pokazuje tylko 2 z 6 deklarowanych ścieżek.** Kontrakt sekcji deklaruje `readOnlyPaths` dla `sticky`, `transparent`, `collapseOnScroll`, `mobileMode`, `hideCtaOnMobile`, `activeLinkMode`, ale UI renderuje wyłącznie „Sticky navigation" i „Collapse on scroll". `transparent`, `mobileMode`, `hideCtaOnMobile`, `activeLinkMode` nie są w ogóle pokazane w Advanced. | Luka diagnostyki / rozjazd kontrakt↔UI |
| N4 | **„Visibility summary: Hidden on all devices"** dla `visibility.devices: []`, choć widget renderuje się i w podglądzie, i na froncie. To generyczny panel bloku (nie specyficzny dla navigation), mylna etykieta pustej tablicy urządzeń. Analogiczne do form-embed I9. | Drobna nuta (panel generyczny) |
| N5 | **`var(--color-bg)` resolve'uje się różnie** w podglądzie admin (`rgba(0,0,0,0)` — efektywnie przezroczyste) vs na froncie (`rgb(255,255,255)`). W praktyce domyślne tło nawigacji **nie renderuje zamierzonego koloru w podglądzie admin**. (Trudne do pełnego przypisania — admin fixtura i front to różne strony/konteksty motywu.) | Niespójność podglądu admin |
| N6 | **Runtime navigation nie działa w podglądzie admin.** Skrypt runtime jest wstrzykiwany przez `dangerouslySetInnerHTML`, którego React **nie wykonuje**. Skutek: drawer mobilny, toggle sub-menu, collapse-on-scroll i podświetlanie aktywnego linku **nie są interaktywne w podglądzie admin** — autor nie może podejrzeć tych zachowań przed publikacją. Na froncie runtime działa (potwierdzone flagą globalną). | Ograniczenie podglądu (brak realnego runtime) |
| N7 | **Tytuł sekcji „Navigation Links" sugeruje edycję także dla źródeł menu/pages.** Opis „Edit labels, URLs, and first-level dropdown links" pozostaje, gdy `linksSource` = menu/pages, mimo że linki stają się wtedy read-only podglądem (poprawne zachowanie, ale nagłówek wprowadza w błąd). | Drobna nuta UX |

> Uwaga: **nie stwierdzono żadnego twardego buga renderera** ani błędu konsoli (admin i
> frontend = 0 błędów). Wszystkie kontrolki Visual, które miały obserwowalny cel, aktualizowały
> podgląd na żywo. I1 to ograniczenie środowiska, a N5/N6 to ograniczenia kontekstu podglądu —
> nie defekty renderera. N1/N3/N4/N7 to realne niuanse UI/UX.

---

## 6. UX / UI — nuty dodatkowe i pozytywy

**Pozytywy:**

- **Wizard uczciwie read-only** (0 kontrolek) — czysty „review setup", spójny z kontraktem.
- **Visual: każda przetestowana kontrolka aktualizuje podgląd na żywo** (logo, CTA, linki,
  reorder, sub-linki, kolory, border, font, alignment, width, transparent, sticky, mobile mode).
- **Advanced uczciwie read-only i reaktywny** — wszystkie 3 summary odzwierciedlają edycje
  z Visual (links count, CTA, alignment, max width, sticky).
- **Warianty jako karty wizualne** (z opisem i znacznikiem „Selected"/„Pick") — lepszy
  onboarding niż goły dropdown (kontrast np. do dawnego Contact U3).
- **Ochrona integralności:** minimum 2 linki (Remove zablokowany przy `<= 2`), max 8 linków
  top-level, max 6 sub-linków/rodzic — z czytelnymi komunikatami i wyłączanymi przyciskami.
- **Reorder** (Move up/down) z poprawnym wyłączaniem skrajnych przycisków.
- **Bezpieczeństwo linków:** `LinkDestinationField` waliduje „public-safe" href i pokazuje
  destrukcyjny komunikat dla niebezpiecznych wartości; logo image z Media Library odrzuca
  niebezpieczne URL.
- **Dostępność (frontend):** `<nav aria-label="Primary navigation">`, logo `aria-label`,
  toggle sub-menu z `aria-expanded`/`aria-controls`/`aria-label`, drawer toggle z dynamicznym
  `aria-label` Open/Close, panel mobilny z `aria-hidden`/`inert`, focus trap i obsługa Escape
  (w kodzie runtime — potwierdzone jako wstrzyknięte i wykonane, lecz interakcje nie odpalane
  na tej stronie, patrz §0).
- **Brak autozapisu** — edycje pozostają w pamięci do czasu Save/Publish.

**Nuty:**

- **Mobile mode „drawer" w podglądzie admin** renderuje toggle + panel, ale są niefunkcjonalne
  (N6). Autor nie zobaczy realnego otwierania szuflady bez publikacji.
- **Sekcja kolorów jest długa** (10 kolorów + 12 selectów typografii/efektów w jednej sekcji)
  bez collapse — sporo scrollowania (analogicznie do Contact U10).
- **Selecty tokenów pokazują surowe wartości** (np. „6xl", „7xl", „py" jako „4") zamiast
  ludzko-czytelnych opisów z jednostkami — język techniczny.

---

## 7. Pokrycie testu — podsumowanie

**Przetestowano interaktywnie z asercją DOM:** logowanie, otwarcie fixtury, 3 tryby edytora,
przejścia Wizard↔Visual, wybór wariantów (Simple/With CTA/Split), `linksSource` (manual/menu/
pages), logo text + clear destynacji, aktywny stan linku, edycja/reorder/dodawanie linków,
dodawanie sub-linku, CTA label, mobile mode drawer, kolory (set + Clear), border width, font
size, alignment, max width, transparent, sticky, reaktywność Advanced, brak autozapisu, render
SSR frontu, runtime JS (flaga), aktywne linki (negatywnie), responsywność 375px (minimal),
konsola (admin + front).

**Nie przetestowano (świadomie / z powodu środowiska):** synchronizacja menu (brak menu w env),
runtime'owa rozdzielczość źródła „Pages index", pozytywne podświetlenie aktywnego linku
(wszystkie linki `/homepage` to `#`), otwieranie/zamykanie drawer i sub-menu w żywym runtime
(front = minimal bez sub-linków; admin preview nie odpala runtime), pełna macierz wartości
każdego comboboxa, zapis/publikacja (ochrona współdzielonej fixtury), realne wpisanie hex
w pickerze (natywny picker OS).

**Werdykt szczerości:** wszystko, co w tym stanie fixtury **miało obserwowalny cel**, działało
poprawnie i aktualizowało podgląd na żywo. Advanced jest uczciwie read-only i reaktywny, Wizard
jest uczciwie read-only. Na froncie realna konfiguracja `/homepage` renderuje się poprawnie,
runtime JS jest wykonywany, brak błędów konsoli, brak overflow na mobile. **Nie znaleziono
twardych bugów renderera ani błędów konsoli.** Główne zastrzeżenia to **mylące/luki UI**
(N1 etykietowanie kolorów, N3 niepełne Advanced behavior summary, N4 visibility, N7 nagłówek),
**ograniczenia podglądu admin** (N5 zmienne CSS, N6 brak runtime) oraz **ograniczenie środowiska**
(I1 brak menu).

---

## 8. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Funkcje Visual zweryfikowane jako działające (obserwowalny cel) | ~17 |
| Tryby edytora zweryfikowane (Wizard/Visual/Advanced) | 3 |
| Aspekty frontendu zweryfikowane (render/a11y/runtime/mobile/konsola) | ~9 |
| Ograniczenia środowiska (I) | 1 (I1) |
| Niuanse mylącego/luki UI (N1, N3, N4, N7) | 4 |
| Ograniczenia podglądu admin (N5, N6) | 2 |
| Nuty UX dodatkowe (kolory bez collapse, surowe tokeny, drawer w preview) | 3 |
| Twarde bugi renderera | 0 |
| Błędy/ostrzeżenia konsoli (admin + frontend) | 0 |
