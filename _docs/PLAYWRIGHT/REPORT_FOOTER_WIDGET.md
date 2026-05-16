# Footer Widget — Raport UX/UI

> **Status:** Zakończony (analiza kodu + testy w przeglądarce)
> **Data:** 2026-05-16
> **Zakres:** Widget `footer` — analiza statyczna kodu + testy manualne w panelu admina i na froncie

---

## 1. Podsumowanie

Widget `footer` jest widgetem kompozytowym odpowiedzialnym za wyświetlanie stopki na stronach serwisu. Posiada trzy tryby edycji (Wizard / Visual / Advanced) oraz trzy warianty layoutu (Columns 2 / Columns 3 / Minimal). Analiza obejmuje plik główny komponentu (`footer.tsx`, ~477 linii) oraz edytory (`FooterEditors.tsx`, ~841 linii).

---

## 2. Aktualny stan — co widget oferuje

### 2.1 Warianty
| Wariant | Opis | Liczba kolumn |
|---------|------|---------------|
| `columns-2` | Dwie kolumny z linkami | 2 |
| `columns-3` | Trzy kolumny z linkami | 3 |
| `minimal` | Jedna kolumna z linkami | 1 |

### 2.2 Kolumny
- Konfigurowalny tytuł każdej kolumny
- Dowolna liczba linków (label + href)
- Sloty `column-1`, `column-2`, `column-3` na dodatkowe widgety wewnątrz kolumn

### 2.3 Legal strip
- Pole `copyright` (plain text)
- Linki `privacy` i `terms` z hardkodowanymi labelami "Privacy" / "Terms"
- Slot `bottom` na dodatkowe widgety w pasku legal
- Niezależne ustawienie wyrównania (`legalAlign`)

### 2.4 Social links
- 6 predefiniowanych typów: `linkedin`, `twitter`, `github`, `youtube`, `facebook`, `instagram`
- Pole `href` dla każdego
- Osobny kolor dla social (`socialColor`)
- **Renderowane jako plain text** (np. "twitter") — brak ikon SVG

### 2.5 Layout
- `align`: wyrównanie zawartości kolumn (left / center / right)
- `legalAlign`: wyrównanie paska legal (left / center / right)
- `maxWidth`: none / 5xl / 6xl / 7xl
- `columnGap`: none / 4 / 6 / 8
- `sectionPaddingY`: none / 8 / 10 / 12

### 2.6 Stylowanie
- `surfaceColor`, `borderColor`, `borderTopWidth` (0–3px)
- `textColor`, `headingColor`, `linkColor`, `legalTextColor`, `socialColor`
- `fontSize`: none / xs / sm / base
- `headingTransform`: none / uppercase / capitalize

### 2.7 Edytory
| Tryb | Zakres |
|------|--------|
| Wizard | Variant, quick column setup (tylko pierwszy link), legal basics, social basics (max 8) |
| Visual | Pełna edycja kolumn i linków, legal, social, kolory, typografia, sloty |
| Advanced | Layout tokens (align, legalAlign, maxWidth, columnGap, sectionPaddingY) |

---

## 3. Brakujące funkcjonalności — luki konfiguracyjne

### 3.1 KRYTYCZNE — błędy funkcjonalne widgetu

#### A. Social links renderowane jako plain text — brak ikon SVG
- `footer.tsx:439`: `{socialEntry.type}` renderuje literalnie "twitter", "linkedin" itp. jako tekst
- Brak jakichkolwiek ikon SVG dla platform social media
- Każdy production footer wymaga ikon, nie tekstowych etykiet
- **Wpływ:** Stopka ze słowem "twitter" zamiast ikony Twittera jest niestandardowa i nieprofesjonalna

#### B. Etykiety "Privacy" i "Terms" są hardkodowane — nie konfigurowalne
- `footer.tsx:425`: `<a href={legal.privacy}>Privacy</a>` — label "Privacy" jest hardkodowany
- `footer.tsx:430`: `<a href={legal.terms}>Terms</a>` — label "Terms" jest hardkodowany
- Brak możliwości przetłumaczenia (np. "Polityka Prywatności", "Warunki Użytkowania")
- Brak możliwości zmiany etykiet dla innych krajów/języków
- **Wpływ:** Widget nie nadaje się do użycia w projektach wielojęzycznych bez modyfikacji kodu

#### C. Brak sekcji logo/brand w stopce
- Widget nie ma pola na logo ani nazwę marki/tagline
- Kolumna 1 jest zwykłą kolumną z linkami — nie ma dedykowanej sekcji brandu
- Branżowy standard: logo + opis w kolumnie 1, linki w pozostałych
- **Wpływ:** Footer nie odzwierciedla typowego wzorca stopki — marka nieobecna

#### D. Tytuły kolumn renderowane jako `<p>`, nie jako heading
- `footer.tsx:375`: `<p className="text-xs font-semibold ...">` dla tytułów kolumn
- Semantycznie powinno być `<h3>` lub `<h4>` — wpływ na dostępność i SEO
- **Wpływ:** Złe znaczniki semantyczne, problemy z accessibility (screen readers)

#### E. Brak `rel="noopener noreferrer"` dla linków zewnętrznych
- Social links (`https://...`) renderowane bez `rel` i `target`
- `footer.tsx:437`: `<a key={...} href={socialEntry.href} style={socialStyle}>`
- Otwierają się w tej samej karcie, brak zabezpieczenia przed reverse tabnabbing
- **Wpływ:** Problem bezpieczeństwa + UX (użytkownik opuszcza serwis)

### 3.2 WAŻNE — braki konfiguracyjne

#### F. Brak możliwości ustawienia niestandardowego typu social media
- `socialTypeOptions` jest hardkodowaną tablicą 6 wartości
- Brak opcji "custom" z polem tekstowym
- Nie ma: TikTok, Pinterest, Discord, Twitch, Snapchat, X (nowy Twitter), Mastodon
- **Wpływ:** Widget nie obsługuje nowoczesnych platform social media

#### G. Brak konfiguracji hover state dla linków
- Można ustawić `linkColor`, ale brak:
  - `linkHoverColor`
  - `linkActiveColor`
  - `linkUnderline` (text-decoration)
- **Wpływ:** Brak interaktywnego feedbacku dla linków footera

#### H. Duplikacja `sectionPaddingY` w Visual i Advanced
- `FooterEditors.tsx:693`: `sectionPaddingY` jest w sekcji "Typography and spacing" w Visual
- `FooterEditors.tsx:818`: `sectionPaddingY` jest też w sekcji "Layout tokens" w Advanced
- Zmiana w jednym miejscu wpływa na obydwa
- **Wpływ:** Dezorientacja użytkownika — gdzie jest "prawdziwe" ustawienie?

#### I. Pola kolorów bez `ClearableFieldHeader` (brak przycisku reset)
- `surfaceColor` i `borderColor` mają `ClearableFieldHeader` (z przyciskiem "clear")
- Pozostałe kolory (`textColor`, `headingColor`, `linkColor`, `legalTextColor`) go nie mają
- Nie można zresetować tych pól do wartości domyślnej z UI
- **Wpływ:** Niespójna obsługa resetowania stylów w panelu

#### J. Pola kolorów bez color picker — tylko text input
- Wszystkie kolory wpisywane ręcznie jako string (np. `#0f172a` lub `var(--color-text)`)
- Brak wizualnego color pickera (`<input type="color">`)
- **Wpływ:** Trudność w doborze koloru bez znajomości wartości hex

#### K. Wizard editor pokazuje tylko pierwszy link każdej kolumny
- `ColumnsQuickSetup` pobiera `firstLink = column.links[0]` — tylko pierwszy link
- Pełna edycja linków dostępna tylko w Visual — ale brak wyraźnej informacji dla nowych użytkowników
- **Wpływ:** Użytkownik w Wizard nie może ustawić więcej niż jednego linku per kolumna

#### L. Brak reorderingu kolumn i linków
- Nie ma drag & drop dla linków w kolumnach ani dla samych kolumn
- Jedyna zmiana kolejności = remove + re-add
- **Wpływ:** Złe UX przy zarządzaniu wieloma linkami

#### M. Brak konfiguracji `padding-x` (padding poziomy stopki)
- Footer ma hardkodowane `px-6` (`footer.tsx:352`)
- Brak opcji konfiguracji paddingu poziomego
- **Wpływ:** Brak dostosowania do różnych szerokości kontenerów nadrzędnych

#### N. Brak responsywnego układu grid dla wariantu `columns-2` / `columns-3`
- `footer.tsx:306-309`: gridClass = `md:grid-cols-3` / `md:grid-cols-2` / `md:grid-cols-1`
- Breakpoint `md` jest hardkodowany — brak konfiguracji breakpointu
- Nie ma wariantu `sm:grid-cols-2 lg:grid-cols-4`
- **Wpływ:** Ograniczona responsywność

#### O. Brak konfiguracji letter-spacing i font-weight dla linków
- Dostępne: fontSize, headingTransform
- Brakuje: letterSpacing, fontWeight dla linków (nie tylko headingów)
- **Wpływ:** Ograniczone możliwości typograficzne

#### P. Brak opcji wyłączenia sekcji legal strip
- Jeżeli użytkownik nie chce paska z copyright/privacy/terms, nie może go wyłączyć
- Brak flagi `legalEnabled: boolean` — pasek zawsze się renderuje
- `footer.tsx:419`: `<span style={legalStyle}>{legal?.copyright}</span>` — zawsze widoczny

#### Q. Brak opcji wyłączenia social links sekcji
- Jeżeli `social` jest pusta tablicą, sekcja social jest po prostu pusta — nie ma fallbacku
- Brak flagi `socialEnabled: boolean`
- Sekcja legal renderuje się zawsze, nawet gdy brak copyright i linków

---

## 4. Problemy UX z perspektywy użytkownika (UI/UX Audit)

### 4.1 Edytor — problemy w panelu admina

| # | Problem | Tryb edytora | Priorytet |
|---|---------|--------------|-----------|
| 1 | Social linki renderowane jako tekst — brak ikon platform | Render | KRYTYCZNY |
| 2 | Etykiety Privacy/Terms hardkodowane — brak tłumaczenia | Render + Visual | KRYTYCZNY |
| 3 | Brak logo/brand w stopce | Render + Wizard/Visual | WYSOKI |
| 4 | `textColor`, `headingColor`, `linkColor` bez ClearableFieldHeader | Visual | WYSOKI |
| 5 | `sectionPaddingY` duplikowane w Visual i Advanced | Visual + Advanced | WYSOKI |
| 6 | Brak color picker — tylko text input dla kolorów | Visual | ŚREDNI |
| 7 | Wizard pokazuje tylko pierwszy link per kolumna — brak info | Wizard | ŚREDNI |
| 8 | Brak reorderingu linków (drag & drop) | Visual | ŚREDNI |
| 9 | Social linki: brak nowoczesnych platform (TikTok, Discord, X) | Visual | ŚREDNI |
| 10 | Alignment controls (`align`, `legalAlign`) ukryte w Advanced | Advanced | ŚREDNI |
| 11 | Tytuły kolumn jako `<p>` zamiast `<h3>` — zły semantics | Render | ŚREDNI |
| 12 | Brak opcji wyłączenia legal strip | Visual | NISKI |
| 13 | `padding-x` hardkodowany na `px-6` | Render | NISKI |

### 4.2 Render — problemy na stronie końcowej

| # | Problem | Priorytet |
|---|---------|-----------|
| 1 | Social icons = plain text ("twitter", "linkedin") | KRYTYCZNY |
| 2 | Privacy/Terms labele hardkodowane w HTML | KRYTYCZNY |
| 3 | Social linki otwierają się w tej samej karcie, brak `rel` | WYSOKI |
| 4 | Brak `aria-label` na `<footer>` | WYSOKI |
| 5 | Tytuły kolumn `<p>` zamiast `<h3>` | ŚREDNI |
| 6 | Brak hover feedback na linkach | ŚREDNI |
| 7 | Legal strip zawsze renderowana (nawet pusta) | NISKI |

---

## 5. Dostępność (Accessibility) — braki

| Problem | Standard | Priorytet |
|---------|----------|-----------|
| `<footer>` bez `aria-label` | WCAG 4.1.2 | WYSOKI |
| Tytuły kolumn `<p>` zamiast `<h3>`/`<h4>` | WCAG 1.3.1 | WYSOKI |
| Social linki bez `aria-label` (tekst = "twitter") | WCAG 2.4.6 | ŚREDNI |
| Linki zewnętrzne bez `target="_blank"` info dla screen readera | WCAG 2.4.4 | NISKI |
| Kontrast kolorów niesprawdzony (zależy od konfiguracji) | WCAG 1.4.3 | - |

---

## 6. Porównanie z rynkowymi standardami

| Funkcjonalność | Widget | Standard rynkowy |
|----------------|--------|------------------|
| Ikony social media | ❌ Plain text | ✅ SVG icons |
| Logo/brand w stopce | ❌ Brak | ✅ Wymagane |
| Konfigurowalne etykiety Privacy/Terms | ❌ Hardkodowane | ✅ Konfigurowalne |
| Open in new tab dla social | ❌ Brak | ✅ Standard |
| rel="noopener" dla zewnętrznych | ❌ Brak | ✅ Wymagane |
| Hover states dla linków | ❌ Brak | ✅ CSS :hover |
| Color picker | ❌ Tylko text | ✅ UI color picker |
| Reorder linków | ❌ Brak | ✅ Drag & drop |
| Newsletter signup | ❌ Brak | ✅ Popularne |
| Adres/kontakt blok | ❌ Brak | ✅ Popularne |
| TikTok, Discord, X | ❌ Brak | ✅ Aktualne platformy |
| Legal strip on/off | ❌ Zawsze | ✅ Konfigurowalne |
| Letter spacing config | ❌ Brak | ✅ Design systems |
| Back to top button | ❌ Brak | ✅ Popularne |

---

## 7. Testy w przeglądarce (Playwright)

> **Status:** Zakończone — 2026-05-16
> **Środowisko:** http://localhost:5173/admin — strona "TEST-FOOTER-WIDGET-0516" (nowo utworzona, slug: `/test-footer-widget-0516`)

### 7.1 Checklista testów

| Test | Status | Wynik |
|------|--------|-------|
| Logowanie do panelu admina | ✅ | OK (rate limit 429 przy pierwszej próbie — inne agenty logują się równolegle) |
| Utworzenie strony testowej z widgetem footer | ✅ | Strona "TEST-FOOTER-WIDGET-0516" utworzona |
| Test trybu Wizard | ✅ | Patrz §7.2 |
| Test trybu Visual | ✅ | Patrz §7.2 |
| Test trybu Advanced | ✅ | Patrz §7.2 |
| Wariant columns-2 | ✅ | Domyślny — 2 kolumny OK |
| Wariant columns-3 | ✅ | 3 kolumny (Company, Resources, Product) — OK |
| Wariant minimal | ✅ | 1 kolumna — **UX BUG** (patrz §7.3) |
| Social links render | ✅ | **KRYTYCZNY BUG** — plain text, nie ikony |
| Legal strip render | ✅ | Działa, ale labele hardkodowane |
| Responsywność (mobile/desktop) | ✅ | Kolumny stackują się poprawnie na mobile |
| Test na froncie (localhost:3000) | ✅ | Patrz §7.4 |
| Porównanie admin preview vs frontend | ✅ | Identyczne — patrz §7.5 |

### 7.2 Szczegółowe wyniki — edytory

#### Wizard
- Pola widoczne: Footer variant, Columns quick setup (tylko tytuł + pierwszy link per kolumna), Legal basics (copyright URL, privacy URL, terms URL), Social basics (platform dropdown + URL)
- **BUG #1:** Wizard pokazuje tylko **pierwszy link** każdej kolumny. Brak info o pozostałych linkach.
- **OBS #1:** Przycisk "Continue to layout and styling" przekierowuje do Visual — po przejściu widoczne są taby Wizard/Visual/Advanced
- **OBS #2:** Przed kliknięciem "Continue", taby Wizard/Visual/Advanced **nie są widoczne** — tryb jest wskazany przez etykietę "Wizard" w nagłówku edytora. Po kliknięciu "Continue" taby pojawiają się.
- Social limit w Wizard: 8 (prawidłowo zablokowane po przekroczeniu)

#### Visual
- Sekcje: Variant and structure, Columns and links, Legal strip, Social links and icon style, Colors and borders, Typography and spacing, Slots overview
- **BUG #2:** `surfaceColor` i `borderColor` mają "Clear" button — `textColor`, `linkColor`, `headingColor`, `legalTextColor` nie mają (brak `ClearableFieldHeader`)
- **BUG #3:** Pola `textColor` i `linkColor` mają tylko placeholder, bez widocznej etykiety tekstowej nad polem (w przeciwieństwie do Surface/Border color)
- **OBS #3:** `sectionPaddingY` jest w "Typography and spacing" jako 3. combobox (wartość "Default") — ten sam kontroler jest też w Advanced
- **OBS #4:** Social platform dropdown zawiera tylko: linkedin, twitter, github, youtube, facebook, instagram — brak TikTok, X, Discord, Pinterest

#### Advanced
- Sekcje: Layout tokens (5 comboboxów), info o global Advanced, Layout (Container/Padding/Margin — generyczne), Visibility
- **BUG #4:** Wszystkie 5 comboboxów w "Layout tokens" **nie mają etykiet** — wyświetlają tylko aktualną wartość (Left, Right, 6xl, Default, Default). Użytkownik musi zgadywać, które pole to co.
- **BUG #5 (duplikacja):** `sectionPaddingY` jest ZARÓWNO w Visual ("Typography and spacing") jak i w Advanced ("Layout tokens") — zmiana w jednym miejscu wpływa na obydwa. Dezorientacja użytkownika.
- Widoczność Desktop/Tablet/Mobile: działa poprawnie (switch toggle)

### 7.3 Szczegółowe wyniki — warianty

#### columns-2 (domyślny)
```
Company                Resources
- About                - Blog
- Careers              - Support

© 2026 Coderso   Privacy  Terms  twitter  linkedin
```
- 2 kolumny w gridzie, legal strip na dole — OK

#### columns-3
```
Company          Resources          Product
- About          - Blog             - Features
- Careers        - Support          - Pricing

© 2026 Coderso   Privacy  Terms  twitter  linkedin
```
- 3 kolumny, third column "Product" — OK

#### minimal
- **Wynik:** Wyświetla 1 kolumnę "Company" z linkami + legal strip
- **UX BUG:** Wariant "Minimal" to po prostu stopka z 1 kolumną — nie ma dedykowanego "minimalnego" wyglądu stopki (np. jedna linia z copyright + linki). To jest mylące dla użytkownika.
- **Oczekiwanie rynkowe:** "Minimal footer" = copyright + kilka linków na jednej linii poziomej
- **Aktualny efekt:** Identyczny layout jak columns-2, tylko z 1 kolumną zamiast 2

### 7.4 Szczegółowe wyniki — render (przeglądarka)

#### Desktop (frontend localhost:3000)
```
Company          Resources          Product
ABOUT            BLOG               FEATURES
CAREERS          SUPPORT            PRICING

© 2026 Coderso   Privacy  Terms  twitter  linkedin
```
- Tytuły kolumn: **`<p>` element**, nie `<h3>` — potwierdzono via `document.querySelectorAll('footer [class*=font-semibold]')`
- Social links: **plain text** "twitter" i "linkedin" — brak SVG ikon
- Privacy/Terms: **hardkodowane etykiety** "Privacy" i "Terms" w HTML
- `<footer>` element: **bez `aria-label`** (null)
- Wszystkie linki (wewnętrzne + zewnętrzne): `rel="no-rel"`, `target="no-target"` — social links bez `rel="noopener noreferrer"` i bez `target="_blank"`

#### Mobile (390px viewport)
- Kolumny stackują się pionowo (grid CSS z `md:grid-cols-3` → 1 kolumna na mobile) — **zachowanie OK**
- Social linki i legal strip: identyczne jak desktop

### 7.5 Nowe odkrycia z testów w przeglądarce (niewykryte z samego kodu)

| # | Odkrycie | Miejsce | Priorytet |
|---|----------|---------|-----------|
| 1 | Taby Wizard/Visual/Advanced nie są widoczne przy pierwszym otwarciu edytora — dopiero po kliknięciu "Continue" | Wizard editor | ŚREDNI |
| 2 | Advanced comboboxes bez etykiet — użytkownik nie wie co zmienia | Advanced editor | WYSOKI |
| 3 | `sectionPaddingY` zduplikowane w Visual i Advanced — zmiana w jednym zmienia drugie | Visual + Advanced | WYSOKI |
| 4 | "Minimal" wariant = stopka z 1 kolumną — nie "prawdziwy minimal footer" | Render | ŚREDNI |
| 5 | Brak rate limitingu przy loginowaniu — przy wielu równoległych agentach błąd 429 | Infrastruktura | INFO |

---

## 8. Screenshoty z testów

> Uwaga: pliki PNG są lokalne i ignorowane przez Git.

| Plik | Opis |
|------|------|
| `footer_wizard_editor.png` | Wizard editor — widok domyślny (przed kliknięciem Continue) |
| `footer_wizard_editor_v2.png` | Wizard editor — widok po przejściu przez Visual (taby widoczne, columns-3) |
| `footer_visual_editor.png` | Visual editor — pełny widok z sekcjami |
| `footer_advanced_editor.png` | Advanced editor — layout tokens bez etykiet |
| `footer_advanced_layout_tokens.png` | Advanced — 5 comboboxów bez nazw (Left/Right/6xl/Default/Default) |
| `footer_canvas_preview.png` | Canvas preview — social "twitter"/"linkedin" jako plain text |
| `footer_columns3_preview.png` | columns-3 wariant — Company/Resources/Product |
| `footer_minimal_preview.png` | minimal wariant — 1 kolumna |
| `footer_admin_preview.png` | Admin preview iframe — desktop |
| `footer_mobile_preview.png` | Admin preview iframe — mobile |
| `footer_frontend_desktop.png` | Frontend localhost:3000 — desktop |
| `footer_frontend_mobile.png` | Frontend localhost:3000 — mobile (390px) |
| `footer_social_options.png` | Social platform dropdown — 6 opcji (bez TikTok/X/Discord) |

---

## 7.6 Porównanie: Admin Preview vs Frontend (localhost:3000)

> **Wniosek: Admin Preview jest wiernym odbiciem frontendu.** Wszystkie zachowania i rendering są identyczne.

| Element | Admin Preview | Frontend (localhost:3000) | Zgodność |
|---------|---------------|--------------------------|----------|
| Kolumny (columns-3) | Company / Resources / Product | Company / Resources / Product | ✅ Identyczne |
| Tytuły kolumn | `<p>` element | `<p>` element | ✅ Identyczne |
| Social links | "twitter" "linkedin" (tekst) | "twitter" "linkedin" (tekst) | ✅ Identyczne |
| Legal strip | © 2026 Coderso \| Privacy \| Terms | © 2026 Coderso \| Privacy \| Terms | ✅ Identyczne |
| Responsywność mobile | Kolumny stackują się | Kolumny stackują się | ✅ Identyczne |
| `footer aria-label` | null | null | ✅ Identyczne |
| `rel` na linkach | brak | brak | ✅ Identyczne |

---

## 9. Rekomendacje priorytetyzowane

### P0 — Błędy krytyczne (natychmiastowa naprawa)

| # | Problem | Lokalizacja w kodzie | Fix |
|---|---------|---------------------|-----|
| 1 | **Social jako plain text, nie ikony** | `footer.tsx:439` | Zastąpić `{socialEntry.type}` komponentem SVG ikony (per typ) |
| 2 | **Privacy/Terms labele hardkodowane** | `footer.tsx:425, 430` | Dodać pola `legal.privacyLabel` i `legal.termsLabel` do schema + edytora |
| 3 | **Tytuły kolumn jako `<p>` nie `<h3>`** | `footer.tsx:375` | Zmienić na `<h3 className="...">` |
| 4 | **Brak `rel="noopener noreferrer"` na social linkach** | `footer.tsx:437` | Dodać `target="_blank" rel="noopener noreferrer"` |

### P1 — Brakujące kluczowe funkcje

| # | Problem | Fix |
|---|---------|-----|
| 5 | **Brak logo/brand w stopce** | Dodać pole `brand?: { logoUrl?, logoText?, tagline? }` do FooterData |
| 6 | **Konfigurowalne etykiety legal** | Dodać `privacyLabel`, `termsLabel` do `FooterLegal` type + edytora |
| 7 | **Brak `aria-label` na `<footer>`** | `<footer aria-label="Site footer" ...>` |
| 8 | **ClearableFieldHeader dla wszystkich kolorów** | Wrapper `clearFooterStyle` dla `textColor`, `headingColor`, `linkColor` |

### P2 — Ulepszenia UX edytora

| # | Problem | Fix |
|---|---------|-----|
| 9 | **Duplikacja sectionPaddingY** | Usunąć z Visual, zostawić tylko w Advanced (lub odwrotnie — wybrać jedno miejsce) |
| 10 | **Brak color picker** | Dodać `<input type="color">` obok text input dla pól kolorów |
| 11 | **Brak nowoczesnych platform social** | Dodać do `socialTypeOptions`: tiktok, x, discord, pinterest, mastodon |
| 12 | **Open in new tab dla linków** | Dodać `target?: "_blank" | "_self"` do `FooterLink` + UI toggle |

### P3 — Rozszerzona konfiguracja (backlog)

| # | Funkcja | Opis |
|---|---------|------|
| 13 | **Hover/active link colors** | `linkHoverColor`, `linkActiveColor` — CSS custom properties |
| 14 | **Legal strip on/off** | Flaga `legalEnabled: boolean` — ukrywa cały pasek |
| 15 | **Reorder linków** | Drag & drop (`@dnd-kit/sortable`) dla linków i kolumn |
| 16 | **Newsletter slot** | Dedykowany slot na formularz zapisu do newslettera |
| 17 | **Letter spacing** | `letterSpacing` dla treści footer |
| 18 | **Back to top** | Opcja `showBackToTop: boolean` — przycisk w rogu |
| 19 | **Configurable padding-x** | `paddingX: "none" | "4" | "6" | "8"` zamiast hardkodowanego `px-6` |
| 20 | **Breakpoint config** | Opcja zmiany breakpointu kolumn (sm/md/lg) |

---

## 10. Podsumowanie końcowe

### Najważniejsze krytyczne braki (4 błędy funkcjonalne)

Spośród **20+ wykrytych problemów**, 4 to błędy bezpośrednio widoczne dla użytkownika końcowego:

1. **Social icons = plain text** — footer wyświetla "twitter" i "linkedin" jako tekst zamiast ikon SVG. To dyskwalifikujący błąd dla każdego professional footer. `footer.tsx:439`: `{socialEntry.type}` zamiast komponentu SVG.

2. **Etykiety Privacy/Terms hardkodowane** — nie można przetłumaczyć ani zmienić nazw linków w legal strip. Bloker dla projektów wielojęzycznych.

3. **Tytuły kolumn `<p>` zamiast `<h3>`** — semantycznie niepoprawne, wpływ na dostępność i SEO. `footer.tsx:375`.

4. **Brak `aria-label` na `<footer>`** i brak `rel="noopener noreferrer"` + `target="_blank"` dla social linków zewnętrznych — problemy z accessibility i bezpieczeństwem.

### Problemy UX edytora (3 kluczowe)

5. **Advanced comboboxes bez etykiet** — 5 pól w "Layout tokens" wyświetla tylko wartość (Left/Right/6xl/Default/Default) bez nazwy — użytkownik nie wie co zmienia.

6. **`sectionPaddingY` zduplikowany** w Visual i Advanced — ta sama właściwość edytowalna z dwóch miejsc bez jasnej informacji.

7. **Taby Wizard/Visual/Advanced niewidoczne przy pierwszym otwarciu** — użytkownik musi kliknąć "Continue to layout and styling" by odkryć pełny interfejs.

### Braki architekturalne (backlog)

- Brak sekcji logo/brand w stopce
- Brak nowoczesnych platform social (TikTok, X, Discord)  
- Brak konfiguracji hover states dla linków
- `ClearableFieldHeader` tylko dla 2 z 6 pól kolorów (niespójność)

### Ogólna ocena

Widget jest **solidnym fundamentem** z dobrą architekturą (3 tryby edytora, schema validation, 3 warianty, 4 sloty), ale **kilka krytycznych elementów nie działa zgodnie ze standardami rynkowymi**. Największy priorytet to ikony social media (P0) — bez nich żaden professional footer nie jest możliwy. Prace backlogowe (logo/brand, hover states, TikTok) mogą poczekać.

---

*Ostatnia aktualizacja: 2026-05-16 (analiza statyczna kodu + testy Playwright)*
