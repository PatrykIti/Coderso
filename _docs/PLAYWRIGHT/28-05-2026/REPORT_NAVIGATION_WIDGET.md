# RAPORT: Navigation Widget — wyczerpujący audyt bieżącego stanu (29-05-2026)

> **Status:** Zakończony — **wyczerpujący** przejazd przez KAŻDĄ dyskretną opcję każdej dostępnej
> rodziny kontrolek (Wizard / Visual / Advanced) + frontend.
> **Data testu:** 2026-05-29
> **Sesja przeglądarki:** `claude-29-05-navigation-exhaustive-v2` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixtura):** „Contract Test - navigation" (`2789358f-ed6c-446e-954e-d5b2b0835ce5`,
> slug `/ctr-navigation-2305`, status `draft`)
> **Trasa publiczna weryfikowana:** http://localhost:3000/homepage (tytuł `HomePage`)
> **Poprzednia wersja raportu:** ten plik został w całości zastąpiony. Poprzedni przejazd
> stosował kontrole „reprezentatywne"; ten przejazd **klika każdą dostępną opcję po kolei**.

---

## 0. Metoda i zakres testu

Audyt wykonano na **uruchomionej lokalnie aplikacji** przy użyciu `playwright-cli`
(izolowana sesja). Po każdej zmianie kontrolki odczytywano **żywy DOM podglądu** widgetu
(`nav[data-navigation-widget="1"]`) przez `page.evaluate` i porównywano z mapą klas/atrybutów
renderera (`core/widgets/core/navigation.tsx`). To NIE jest audyt reprezentatywny — dla każdego
selecta/karty/przełącznika przeszedłem **wszystkie** dyskretne opcje i zweryfikowałem efekt w DOM.

**Jak sterowano poszczególnymi typami kontrolek (żeby było uczciwie):**

- **Karty wariantu, przyciski Add/Remove/Move, zakładki, przyciski Clear/Browse media** — realne
  kliknięcia (`click`) w UI edytora.
- **Selecty (Radix `role=combobox`)** — realne otwarcie triggera + kliknięcie pozycji `role=option`
  (każda opcja klikana osobno). Listy opcji wybierano tak, by ostatnia pozycja przywracała default
  (czysty baseline po przejściu rodziny).
- **Przełączniki (`role=switch`)** — realne kliknięcia ON→odczyt→OFF→odczyt.
- **Natywny picker koloru (`<input type="color">`)** — wartość ustawiano programowo (natywny setter
  + `input`/`change`), bo kontrolka ma `showValueInput={false}` (brak pola hex) i **jedyną** realną
  drogą jest systemowy dialog OS, którego nie da się klikać przez automatyzację. Handler React
  faktycznie odbierał zdarzenia (potwierdzone zmianą DOM). To **ograniczenie kontrolki**, nie skrót —
  opisane w N2.
- **MediaPicker** — realne kliknięcie „Browse media", wybór realnego assetu z biblioteki.

**Najważniejsza uwaga metodologiczna (taka sama jak poprzednio, nadal kluczowa):**

> Fixtura admin (`/ctr-navigation-2305`) ma **puste `data: {}`** (czysty bare widget,
> `editor.mode = "visual"`, `wizardCompleted: true`, `visibility.devices: []`). Edytor dostaje
> jednak **znormalizowane** dane (z `navigationDefaults`), więc widzi defaulty: wariant `simple`,
> logo tekstowe „Coderso", linki Home/About/Contact, `linksSource: manual`, layout
> `right`/`6xl`/`py-4`/`gap-4`, kolory `surface=var(--color-bg)`, `cta=var(--color-primary)` itd.
>
> **Trasa publiczna `/homepage` to ZUPEŁNIE INNA strona** — z własną, realnie skonfigurowaną
> instancją widgetu (logo „NOVA DOMY", 5 linków, wariant z CTA „Get a Quote", sticky,
> `mobileMode: minimal`, `activeLinkMode: pathname`). To **nie ta sama instancja** co fixtura admin.
> Rozdział 6 porównuje **renderer**, nie ten sam rekord. Wszystkie moje edycje w admin były
> **wyłącznie w pamięci edytora** — fixtury nie zapisywałem (patrz §7, brak autozapisu).

**Screenshoty:** nie przechwytywano plików PNG; weryfikacja przez asercje DOM/`eval`. Ewentualne
nazwy zrzutów Playwright byłyby **wyłącznie lokalnymi etykietami**, ignorowanymi przez Git i nie
stanowiłyby evidence w repo.

**Pliki źródłowe analizowane:**

- `core/widgets/core/navigation.tsx` — renderer, model, schemat, normalizacja, runtime client script.
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/ui/widgets/editors/LinkDestinationField.tsx` — picker destynacji (logo/link/CTA).
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` / `ClearableFields` — kontrolka koloru.
- `core/services/navigation/navigationRuntimeResolver.ts`, `navigationMenuMapping.ts` — runtime'owa
  rozdzielczość menu/pages (nieuruchamiana w admin preview).

---

## 1. Inwentarz kontrolek (co realnie istnieje w tej fixturze)

| Rodzina | Kontrolka | Liczba dyskretnych opcji | Tryb |
|---------|-----------|--------------------------|------|
| Wariant | karty radio (Simple / With CTA / Split) | 3 | Visual |
| Źródło linków | select | 3 (manual / menu / pages) | Visual |
| Logo | select typu (text / image) | 2 | Visual |
| Logo | MediaPicker (Browse media) + „Clear image" + alt | — | Visual |
| Logo / linki / CTA | picker destynacji (`LinkDestinationField`) + „Clear destination" | lista stron + „No destination" | Visual |
| Stan aktywnego linku | select | 3 (none / pathname / exact) | Visual |
| Link (per item) | target | 2 (self / blank) | Visual |
| Link (per item) | badge tone | 5 (default/accent/success/warning/danger) | Visual |
| Link (per item) | inputy: icon, description, badge label | — | Visual |
| Tryb mobilny | select | 3 (expanded / drawer / minimal) | Visual |
| Mobile | przełącznik „Hide CTA on mobile" | 2 stany | Visual |
| Kolory | 10 swatchy (surface/border/text/logo/link/linkHover/linkActive/ctaBg/ctaText/ctaBorder) | — | Visual |
| Kolory | przyciski „Clear" | tylko 2 (surface, ctaBg) | Visual |
| Typografia/styl | 13 selectów (border width, font size, font weight, text transform, letter spacing, link underline, shadow, backdrop blur, dropdown direction, motion, logo size, cta radius, cta separator) | 3–5 każdy | Visual |
| Layout | 4 selecty (alignment, max width, vertical padding, links gap) | 3–5 każdy | Visual |
| Powierzchnia/runtime | 3 przełączniki (transparent, sticky, collapse on scroll) | 2 stany każdy | Visual |
| Linki top-level | Add / Remove / Move up / Move down | limit 8, min 2 | Visual |
| Sub-linki | Add / Remove / Move up / Move down (+ metadata per child) | limit 6 | Visual |

> **Brak po stronie kontrolek:** osobnego przycisku „Use transparent" dla pojedynczych kolorów
> (renderowany przez `SharedColorControl` tylko gdy `allowTransparent`, którego navigation **nie**
> przekazuje). Przezroczystość powierzchni dostępna jest wyłącznie przez przełącznik
> „Transparent surface".

---

## 2. PRZETESTOWANE — pełna macierz opcji (z efektem w DOM)

Wszystkie poniższe odczyty pochodzą z **żywego podglądu** po realnej interakcji.

### 2.1 Karty wariantu (3/3)

| Opcja | Efekt w podglądzie | Wynik |
|-------|--------------------|-------|
| **Simple** | brak CTA w DOM; linki `justify-end` (zgodnie z alignment) | ✓ |
| **With CTA** | CTA „Get started" (`/start`) renderowane; linki `justify-end`; `rounded-md` (default) | ✓ |
| **Split** | CTA renderowane; linki **wymuszone** `justify-center` (override alignment) | ✓ |

### 2.2 Źródło linków (3/3)

| Opcja | Efekt | Wynik |
|-------|-------|-------|
| **Manual links** | `data-link-source="manual"`, edytory linków aktywne | ✓ |
| **Existing menu** | `data-link-source="menu"`, pojawia się pole „Choose existing menu" | ✓ (UI), sync **nietestowalny** — patrz I1 |
| **Pages index** | `data-link-source="pages"`, sekcja „Current fallback links" (manual jako fallback) | ✓ (UI), rozdzielczość stron runtime'owa — patrz I2 |

### 2.3 Logo

| Kontrolka / opcja | Efekt | Wynik |
|-------------------|-------|-------|
| **Logo type → Text** | render `<span>` z tekstem | ✓ |
| **Logo type → Image** | render `<img>` (`h-6 w-auto` default) | ✓ |
| **MediaPicker → wybór realnego assetu** | `img src` = `http://localhost:3000/media/2026/02/…png`, `alt` auto „Placeholder hero image" | ✓ (realny wybór z biblioteki) |
| **Logo alt (input)** | `img alt` → „Brand Mark", `aria-label` logo → „Brand Mark home" | ✓ |
| **Clear image** | czyści zapisaną wartość | ⚠️ działa, ale render robi fallback `src="Coderso"` — patrz N9 |
| **Logo destination (picker) → wybór „HomePage"** | `logoHref` → `/homepage` | ✓ |
| **Logo destination → Clear destination** | `logoHref` → fallback `/` | ✓ |

### 2.4 Stan aktywnego linku (3/3)

| Opcja | `data-navigation-active-mode` | runtime `<script>` wstrzyknięty? | Wynik |
|-------|-------------------------------|----------------------------------|-------|
| **No active state** | `none` | **NIE** (gdy brak drawer/submenu/collapse) | ✓ |
| **Match current path** | `pathname` | TAK | ✓ |
| **Exact URL match** | `exact` | TAK | ✓ |

### 2.5 Link metadata — per item (komplet)

| Kontrolka | Efekt | Wynik |
|-----------|-------|-------|
| **Icon text** | render badge ikony (np. „NEW") przed labelem | ✓ |
| **Description** | render opisu pod labelem (`span.mt-0.5`) „Go home" | ✓ |
| **Badge label** | render pigułki badge (pusty label = brak badge) | ✓ |
| **Badge tone → Default** | `bg-muted text-foreground/80` | ✓ |
| **Badge tone → Accent** | `bg-primary/10 text-primary` | ✓ |
| **Badge tone → Success** | `bg-emerald-500/10 text-emerald-700` | ✓ |
| **Badge tone → Warning** | `bg-amber-500/10 text-amber-700` | ✓ |
| **Badge tone → Danger** | `bg-rose-500/10 text-rose-700` | ✓ |
| **Link target → New tab** | `target="_blank" rel="noopener noreferrer"` | ✓ |
| **Link target → Same tab** | brak `target`/`rel` | ✓ |

### 2.6 Tryb mobilny (3/3)

| Opcja | `data-mobile-mode` | toggle | panel | script | `<ul>` | Wynik |
|-------|--------------------|--------|-------|--------|--------|-------|
| **Expanded** | `expanded` | nie | nie | nie | `flex` (widoczne na mobile) | ✓ |
| **Drawer (compact)** | `drawer` | TAK | TAK | TAK | `hidden md:flex` | ✓ |
| **Minimal** | `minimal` | nie | nie | nie | `hidden md:flex` | ✓ |

### 2.7 Przełączniki (4/4, ON→OFF)

| Przełącznik | ON | OFF | Wynik |
|-------------|----|----|-------|
| **Hide CTA on mobile** | CTA zyskuje `hidden md:inline-flex` | klasa znika | ✓ |
| **Transparent surface** | `border-bottom-color` → transparentny (bg już transparentny w admin, N5) | border → nieprzezroczysty | ✓ (zmiana widoczna na borderze; przejście animowane przez `motion`) |
| **Sticky navigation** | klasa `sticky top-0 z-40`, `position: sticky` | `position: static` | ✓ |
| **Collapse on scroll** | `data-collapse-on-scroll="true"` + `<script>` wstrzyknięty | atrybut i skrypt znikają | ✓ |

### 2.8 Kolory (10/10) — wszystkie ustawione przez swatch

| Pole | Test hex | Zaobserwowano w DOM | Wynik |
|------|----------|---------------------|-------|
| **Surface color** | `#112233` | `background-color: rgb(17,34,51)` | ✓ |
| **Border color** | `#445566` | `border-bottom-color: rgb(68,85,102)` | ✓ |
| **Text color** | `#778899` | `color: rgb(119,136,153)` | ✓ |
| **Logo color** | `#aabbcc` | kolor `<span>` logo `rgb(170,187,204)` | ✓ |
| **Link color** | `#102030` | `--navigation-link-color: #102030` | ✓ |
| **Link hover color** | `#203040` | `--navigation-link-hover-color: #203040` | ✓ |
| **Link active color** | `#304050` | `--navigation-link-active-color: #304050` | ✓ |
| **CTA background** | `#405060` | tło CTA `rgb(64,80,96)` | ✓ |
| **CTA text color** | `#506070` | kolor CTA `rgb(80,96,112)` | ✓ |
| **CTA border color** | `#607080` | `border-color CTA rgb(96,112,128)`, `border-width: 1px` (włącza się gdy ≠ transparent) | ✓ |
| **Clear (surface)** | — | label → „Theme default", tło → `var(--color-bg)` (transparentne w admin) | ✓ |
| **Clear (CTA background)** | — | label → „Theme default", tło → motyw (`rgb(226,177,39)` w admin) | ✓ |

### 2.9 Selecty typografii / stylu (13/13 — każda opcja)

| Select | Opcje (wszystkie kliknięte) | Efekt | Wynik |
|--------|------------------------------|-------|-------|
| **Border width** | 0/1/2/3 | `border-bottom-width: 0/1/2/3px` | ✓ |
| **Font size** | none/xs/sm/base/lg | `none` → brak klasy `text-*`; pozostałe `text-xs/sm/base/lg` | ✓ |
| **Font weight** | none/normal/medium/semibold/bold | `none` → brak klasy; pozostałe `font-*` | ✓ |
| **Text transform** | none/uppercase/capitalize | `normal-case`/`uppercase`/`capitalize` | ✓ |
| **Letter spacing** | none/wide/wider | brak / `tracking-wide` / `tracking-wider` | ✓ |
| **Link underline** | none/hover/always | brak / `hover:underline + data-[active]:underline` / `underline` | ✓ |
| **Surface shadow** | none/sm/md/lg | brak / `shadow-sm/md/lg` (uwaga: `data-[collapsed]:shadow-md` jest stale w klasie) | ✓ |
| **Backdrop blur** | none/sm/md | brak / `backdrop-blur-sm/md` | ✓ |
| **Dropdown direction** | bottom/top/auto | panel `data-navigation-direction`; pozycja: top→top, bottom→bottom, **auto→bottom (SSR)** | ✓ (auto rozwiązywane runtime — patrz I4) |
| **Motion** | none/subtle/standard | `transition-none` / `transition-[…bez transform]` / `transition-[…z transform]` | ✓ |
| **Logo size** | sm/md/lg/xl | `h-5/h-6/h-8/h-10` (tylko logo image) | ✓ |
| **CTA radius** | sm/md/lg/full | `rounded-sm/md/lg/full` (4/8/12/∞px) | ✓ |
| **CTA separator** | none/line/spacing | brak / `border-l + pl-4` / `pl-4` | ✓ |

### 2.10 Selecty layoutu (4/4 — każda opcja)

| Select | Opcje | Efekt | Wynik |
|--------|-------|-------|-------|
| **Alignment** | left/center/right | `justify-start/center/end` (w Split nadpisane na center) | ✓ |
| **Max width** | none/5xl/6xl/7xl | `none` → brak klasy; pozostałe `max-w-5xl/6xl/7xl` | ✓ |
| **Vertical padding** | none/2/3/4/5 | `py-0/2/3/4/5` (computed: 0/7.5/11.7/16.3/19.5px) | ✓ |
| **Links gap** | none/2/3/4/6 | `gap-0/2/3/4/6` | ✓ |

### 2.11 Linki repeatable — Add / Remove / Reorder

| Operacja | Obserwacja | Wynik |
|----------|------------|-------|
| **Add link item (top-level)** | dodaje do **limitu 8**; przy 8 przycisk `disabled` + komunikat „Reached the current limit of 8 top-level links…" | ✓ |
| **Remove (top-level)** | usuwa; przy `items.length <= 2` przycisk **disabled** (ochrona min. 2) | ✓ |
| **Move up / Move down (top-level)** | realna zmiana kolejności w podglądzie (Home→About swap zweryfikowany) | ✓ |
| **Add sub-link** | dodaje submenu (toggle + panel + a11y `aria-controls`/`id`); do **limitu 6**; przy 6 `disabled` + komunikat | ✓ |
| **Move up / Move down (sub-link)** | realna zmiana kolejności child (Alpha↔Beta zweryfikowany) | ✓ |
| **Remove (sub-link)** | usuwa child (brak dolnego limitu) | ✓ |
| **Sub-link metadata** | każdy child ma własne: label, destination picker, icon/description/badge/tone/target | ✓ |

### 2.12 Pickery destynacji (logo / link / CTA)

Picker (`LinkDestinationField`) jest **tą samą kontrolką** w 3 miejscach; przetestowano realnie
każdą instancję (nie reprezentatywnie):

| Instancja | Akcja | Efekt | Wynik |
|-----------|-------|-------|-------|
| **Logo** | wybór strony „HomePage" | `logoHref` → `/homepage` | ✓ |
| **Logo** | Clear destination | `logoHref` → `/` | ✓ |
| **Link 1** | wybór strony „Retention" | href linku → `/retain-17b6bf7d-…` | ✓ |
| **Link 1** | Clear destination | href = `""` → **link znika z renderu** (zostaje w edytorze) — patrz N8 | ⚠️ |
| **CTA** | wybór strony „HomePage" | `cta.href` → `/homepage` | ✓ |

Lista pickera zawiera „No destination", wszystkie opublikowane strony (≈50 pozycji) oraz wyłączoną
pozycję „Saved custom destination", gdy bieżąca wartość nie pasuje do żadnej strony. ✓

---

## 3. Wizard (read-only review)

| Sprawdzenie | Wynik |
|-------------|-------|
| Wejście przez „Run setup again" → nagłówek „Wizard / Navigation / Starter menu" | ✓ |
| **0 kontrolek edycyjnych** w sekcji (asercja DOM: input/textarea/combobox/switch/button = 0) | ✓ |
| Read-only podsumowanie: Current layout = **Simple**, Current links source = **Manual links** | ✓ |
| Starter links preview: Home `/`, About `/about`, Contact `/contact` | ✓ |
| Logo type = **Text logo**, Logo text = **Coderso** | ✓ |
| Hint: „Simple variant hides CTA in runtime output…" + „Finish setup and open Visual" | ✓ |

Wizard jest **uczciwie read-only**, zgodny z kontraktem (`writablePaths: []`).

---

## 4. Advanced (read-only + reaktywny)

| Sekcja | Baseline (bare) | Po edycjach (4 linki, alignment=center, sticky ON, with-cta) | Reaktywny? |
|--------|------------------|--------------------------------------------------------------|-----------|
| **Runtime summary** | source=manual, Menu key=Not configured, Manual links=**3**, CTA=Configured | Manual links=**4**, CTA=Configured | ✓ |
| **Layout token summary** | Alignment=right, Max width=6xl, Padding=4, Gap=4 | Alignment=**center** | ✓ |
| **Runtime behavior summary** | Sticky=Disabled, Collapse=Disabled | Sticky=**Enabled**, Collapse=Disabled | ✓ |
| **Block layout summary** | Content width=default, Padding MD/MD, Margin None | (bez zmian — panel generyczny) | — |
| **Visibility summary** | „Shown on: Hidden on all devices" | (bez zmian) | — |
| **0 kontrolek edycyjnych** | ✓ | ✓ | — |

Advanced jest **uczciwie read-only i reaktywny**. Zob. jednak N3 (niepełne summary behavior), N4
(mylna etykieta visibility) i N6 (CTA „Configured" już w bare).

---

## 5. CO DZIAŁA — werdykt

**Wszystkie 100% dostępnych w tej fixturze dyskretnych opcji zostały przeklikane i zweryfikowane
w DOM jako działające:** 3 warianty, 3 źródła linków, 2 typy logo, MediaPicker (realny asset),
3 pickery destynacji (+ Clear), 3 tryby aktywnego linku, 5 tonów badge, 2 targety, 3 tryby mobilne,
4 przełączniki, 10 kolorów (+ 2 Clear), 13 selectów stylu (każda opcja), 4 selecty layoutu (każda
opcja), Add/Remove/Reorder linków (limit 8/min 2) i sub-linków (limit 6), metadata per item/child,
Wizard read-only, Advanced read-only + reaktywny.

**Brak twardych bugów renderera. Brak błędów konsoli (admin i frontend = 0/0).**

---

## 6. Spójność Admin ↔ Frontend (`/homepage`, SSR realnej konfiguracji)

> Admin fixtura i `/homepage` to **różne strony / różne dane**. Oceniam spójność **rendererą**
> (ten sam komponent `NavigationBlock`), nie tego samego rekordu.

| Aspekt | Admin Preview (bare fixtura) | Frontend `/homepage` (realna konfiguracja) | Zgodność |
|--------|------------------------------|---------------------------------------------|----------|
| `<nav aria-label="Primary navigation">` | ✓ | ✓ (1 instancja) | ✓ |
| Logo (tekst, `aria-label`, href) | ✓ „Coderso" | ✓ „NOVA DOMY" → `/`, aria „NOVA DOMY home" | ✓ |
| Linki | Home/About/Contact | Projects / Individual Designs / Realizations / Technology / Contact (wszystkie `href="#"`) | ✓ |
| CTA | po wyborze With CTA „Get started" | „Get a Quote" → `/start` | ✓ |
| `data-*` (source/mobile/active) | ustawiane | `manual` / `minimal` / `pathname` | ✓ |
| Surface | computed `rgba(0,0,0,0)` (`var(--color-bg)`) | `rgb(255,255,255)` (białe) | ✗ różna rozdzielczość CSS-var (N5) |
| Sticky | po toggle: `position: sticky` | `position: sticky` aktywne | ✓ |
| **Runtime JS** | wstrzyknięty, **NIE wykonywany** (N6) | **wykonywany** (`window.__nextlessNavigationBound === true`) | ✗ różnica środowiska (N6) |
| Aktywne linki | n/d (runtime off) | `activeLinkMode=pathname`, **0 aktywnych** (wszystkie `href="#"` → runtime poprawnie pomija; brak fałszywych `aria-current`) | ✓ (poprawne zachowanie negatywne) |
| Tryb mobilny 375px | n/d | `minimal`: `<ul>` `display:none`, CTA widoczne, brak drawer toggle, **brak poziomego scrolla** (`bodyScrollW == winW == 375`) | ✓ |
| Konsola | 0 błędów / 0 ostrzeżeń | 0 błędów / 0 ostrzeżeń | ✓ |

---

## 7. Brak autozapisu

Po **wszystkich** edycjach in-memory (warianty, kolory, MediaPicker, pickery destynacji, linki)
ponowny `GET /admin/api/pages/2789358f-…` zwracał niezmienione: `currentData.blocks[0].data = {}`,
`editor.mode = "visual"`, `wizardCompleted = true`, `updatedAt = 2026-05-23T20:50:20.359Z`.
**Fixtura nie została zmutowana.** ✓ (weryfikowane dwukrotnie — w trakcie i na końcu).

---

## 8. CO NIE DZIAŁA / wymaga uwagi (niuanse i luki — żaden twardy bug)

| # | Obserwacja | Klasyfikacja |
|---|------------|--------------|
| **N1** | **Domyślne kolory CSS-var mylnie etykietowane „Saved custom color".** Na nietkniętej fixturze: `surfaceColor` (`var(--color-bg)`) → „Saved custom color" + Clear; `ctaBackgroundColor` (`var(--color-primary)`) → „Saved custom color" + Clear; `ctaTextColor` (`var(--color-bg)`) → „Saved custom color" **bez** Clear. Pozostałe (border/text/logo/link/hover/active, wszystkie `undefined`) poprawnie „Theme default"; `ctaBorderColor` (`transparent`) poprawnie „Transparent". Przyczyna: edytor dostaje znormalizowane defaulty z tokenami `var(...)`, które nie są picker-representable → fałszywe „Saved custom color". | Mylące UI (potwierdzone na świeżej fixturze) |
| **N2** | **Natywny picker koloru bez pola hex.** Wszystkie 10 kolorów ma `showValueInput={false}` → jedyną drogą jest systemowy `<input type="color">`; nie da się wpisać/wkleić hex. Wartości udało się ustawić **programowo** (handler React działa), ale realny użytkownik ma tylko dialog OS. | Nuta UX/dostępność |
| **N3** | **Advanced „Runtime behavior summary" pokazuje 2 z 6 deklarowanych ścieżek.** Kontrakt sekcji deklaruje `readOnlyPaths` dla `sticky, transparent, collapseOnScroll, mobileMode, hideCtaOnMobile, activeLinkMode`, ale UI renderuje wyłącznie „Sticky navigation" i „Collapse on scroll". `transparent`, `mobileMode`, `hideCtaOnMobile`, `activeLinkMode` **nie są pokazane**. | Luka diagnostyki / rozjazd kontrakt↔UI |
| **N4** | **„Visibility summary: Hidden on all devices"** dla `visibility.devices: []`, choć widget renderuje się w podglądzie i na froncie. Generyczny panel bloku, mylna etykieta pustej tablicy urządzeń. | Drobna nuta (panel generyczny) |
| **N5** | **`var(--color-bg)` resolve'uje się różnie**: admin preview `rgba(0,0,0,0)` (efektywnie przezroczyste) vs front `rgb(255,255,255)`. Domyślne tło nawigacji **nie renderuje zamierzonego koloru w podglądzie admin**. | Niespójność podglądu admin (kontekst motywu) |
| **N6** | **Runtime navigation nie działa w podglądzie admin.** Skrypt wstrzykiwany przez `dangerouslySetInnerHTML`, którego React **nie wykonuje**. Drawer mobilny, toggle sub-menu, collapse-on-scroll i podświetlanie aktywnego linku **nie są interaktywne w podglądzie admin** — autor nie podejrzy tych zachowań przed publikacją. Na froncie runtime działa (flaga globalna). | Ograniczenie podglądu (brak realnego runtime) |
| **N7** | **Nagłówek „Navigation Links" sugeruje edycję także dla menu/pages.** Opis „Edit labels, URLs, and first-level dropdown links" pozostaje, gdy `linksSource = menu/pages`, mimo że linki stają się read-only podglądem. | Drobna nuta UX |
| **N8** (nowe) | **Wyczyszczenie destynacji linku usuwa go z renderu bez ostrzeżenia.** „Clear destination" ustawia `href=""`; `normalizeNavigationItems` **odrzuca** itemy bez href → link znika z podglądu/frontu, ale **blok pozostaje w edytorze**. Zweryfikowane: 4 bloki w edytorze → 3 wyrenderowane (Home z pustym href zniknął). Autor może być zdezorientowany („gdzie mój link?"). | Pułapka UX (cichy drop) |
| **N9** (nowe) | **„Clear image" przy logo type = image robi fallback `src="Coderso"`.** Czyszczenie obrazu ustawia `value=""`, ale normalizacja podstawia default `value="Coderso"` jako `src` `<img>` → uszkodzony obraz zamiast pustego/placeholdera (w tej fixturze bez realnego assetu). | Drobny quirk renderera |
| **N10** (nowe) | **8 z 10 kolorów nie ma żadnego „Clear"/resetu.** Tylko `surfaceColor` i `ctaBackgroundColor` mają przycisk Clear. Pozostałe (border/text/logo/link/hover/active/ctaText/ctaBorder) po ustawieniu można jedynie **ponownie wybrać** — nie ma powrotu do „Theme default" z poziomu UI. | Luka UX (brak resetu) |

> **Nie stwierdzono żadnego twardego buga renderera** ani błędu konsoli (admin i frontend = 0/0).

---

## 9. CZEGO NIE DAŁO SIĘ W PEŁNI ZWERYFIKOWAĆ — z dokładnym powodem

| Kontrolka / zachowanie | Powód blokady |
|------------------------|---------------|
| **Synchronizacja „Existing menu"** (I1) | Środowisko **nie ma ani jednego zapisanego menu** (`/admin/api/menus` → `200 []`). Select „Choose existing menu" pokazuje wyłącznie „No menu selected". Nie da się wybrać menu ani zsynchronizować linków. Kontrolka UI działa (pojawia się, otwiera), ale **efektu sync nie da się odpalić** w tym środowisku. |
| **Rozdzielczość źródła „Pages index"** (I2) | To feature runtime'owy (`navigationRuntimeResolver`). Podgląd admin renderuje wyłącznie linki fallback (manual). Realnego mapowania opublikowanych stron z „Show in navigation" nie da się zaobserwować w podglądzie admin. |
| **Pozytywne podświetlenie aktywnego linku** (`aria-current="page"`) | Na `/homepage` wszystkie linki mają `href="#"`, a logo `/`; w trybie `pathname`/`exact` runtime **poprawnie** nie oznacza żadnego (brak fałszywych trafień — zweryfikowane negatywnie). Pozytywnego dopasowania do bieżącej ścieżki nie da się wymusić na tej stronie (brak linku pasującego do `/homepage`), a fixtury admin nie zapisuję. |
| **Otwieranie/zamykanie drawer + toggle sub-menu w żywym runtime** | `/homepage` używa trybu `minimal` (brak drawer toggle) i nie ma sub-linków; podgląd admin nie wykonuje runtime (N6). Realnej interakcji drawer/submenu (focus trap, Escape, collapse-on-scroll) **nie dało się odpalić** w tym środowisku. Potwierdzono jedynie, że na froncie runtime **jest związany** (`__nextlessNavigationBound`) i poprawnie zainicjował `data-navigation-collapsed="false"` oraz 0 aktywnych linków. |
| **Realne wpisanie hex w pickerze koloru** (N2) | Brak pola tekstowego (`showValueInput=false`); natywny dialog OS niedostępny dla automatyzacji. Wartości ustawiano programowo (handler React potwierdzony). |
| **Zapis / publikacja** | Celowo nie zapisywano, aby nie zmutować współdzielonej fixtury (§7). |

---

## 10. UX / UI — pozytywy i dodatkowe nuty

**Pozytywy:**

- **Wizard uczciwie read-only** (0 kontrolek) — czysty „review setup".
- **Advanced uczciwie read-only i reaktywny** — summary odzwierciedlają edycje z Visual
  (links count, alignment, sticky).
- **Każda przeklikana opcja Visual aktualizuje podgląd na żywo** — pełna macierz w §2.
- **Warianty jako karty wizualne** (opis + znacznik „Selected"/„Pick") — dobry onboarding.
- **Ochrona integralności:** min. 2 linki (Remove disabled przy `<= 2`), max 8 linków top-level,
  max 6 sub-linków/rodzic — z czytelnymi komunikatami i wyłączanymi przyciskami.
- **Reorder** (Move up/down) z poprawnym wyłączaniem skrajnych przycisków, zarówno dla linków
  jak i sub-linków.
- **MediaPicker** realnie wybiera asset i auto-uzupełnia `alt` z metadanych.
- **Bezpieczeństwo linków:** `LinkDestinationField` + `normalizeWidgetSafeHref` walidują „public-safe"
  href; logo image z Media Library odrzuca niebezpieczne URL.
- **Dostępność (frontend):** `<nav aria-label>`, logo `aria-label`, submenu toggle z
  `aria-expanded`/`aria-controls`, drawer z dynamicznym `aria-label`, panel `aria-hidden`/`inert`,
  focus trap + Escape (w kodzie runtime — wykonywanym na froncie).
- **Brak autozapisu** — edycje pozostają w pamięci do Save/Publish.

**Nuty:**

- **Sekcja kolorów jest długa** (10 kolorów + 13 selectów typografii/efektów w jednej sekcji)
  bez collapse — sporo scrollowania.
- **Selecty tokenów pokazują surowe wartości** (np. „6xl", „py" jako „4", „MD") zamiast
  ludzko-czytelnych opisów z jednostkami.
- **Drawer w podglądzie admin** renderuje toggle + panel, ale są niefunkcjonalne (N6).
- **Indeksy kontrolek przesuwają się** przy włączeniu CTA / dodaniu child (każdy
  `LinkDestinationField` to dodatkowy combobox) — to detal implementacyjny, nie defekt.

---

## 11. Statystyki pokrycia

| Kategoria | Liczba |
|-----------|--------|
| Dyskretne opcje selectów/kart/targetów/tonów przeklikane indywidualnie | **64** (3+3+2+3+2+5+3+ [4+5+5+3+3+3+4+3+3+3+4+4+3] + [3+4+5+5]) |
| Przełączniki przetestowane ON/OFF | 4 |
| Kolory ustawione przez swatch + Clear | 10 (+2 Clear) |
| Pickery destynacji przetestowane (select + clear) | 3 instancje |
| Operacje repeatable (add/remove/reorder, limity) | linki (8/min 2) + sub-linki (6) |
| Tryby edytora zweryfikowane (Wizard/Visual/Advanced) | 3 |
| Aspekty frontendu (render/a11y/runtime/mobile/konsola) | 9 |
| Twarde bugi renderera | **0** |
| Błędy/ostrzeżenia konsoli (admin + frontend) | **0 / 0** |
| Niuanse/luki UI (N1–N10) | 10 |
| Pozycje nietestowalne ze wskazaną przyczyną (§9) | 6 |
| Mutacje fixtury (autozapis) | **0** |
