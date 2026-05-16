# RAPORT: Hero Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #2 (Hero Widget)  
> **Środowisko:** http://localhost:5173/admin  
> **Strona testowa:** HomePage (`/admin/pages/7c075789-e294-4396-8fe1-db83f215c186`)

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Content  
**Warianty:** `centered`, `split` (alias: `media-right`), `media-left`  
**Slot:** `content` — dodatkowe bloki poniżej obszaru CTA

Hero widget jest centralnym elementem sekcji hero stron. Odpowiada za: nagłówek, podnagłówek, treść, badge, CTA (1–2 przyciski), media (obraz/wideo), tło (kolor, gradient, media), typografię, style oraz układ responsywny.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Treść** | `headline` (wymagane), `subhead`, `body` |
| **Badge** | `enabled`, `label`, `prefix`, `href`, `tone` (4 opcje), `placement` (2 opcje) |
| **CTA** | `primaryCta` (label + href), `secondaryCta` (label + href) |
| **Media** | `type` (none/image/video), `source` (library/external), `assetId`, `src`, `alt`, `ratio`, `overlay` |
| **Typografia** | `align` (L/C/R), `headlineSize` (5 opcji), `subheadSize` (5 opcji), `bodySize` (5 opcji) |
| **Kolory** | headline, subhead, body, border card, border media, primary/secondary button (bg, text, border) |
| **Tło** | `color`, `gradient`, `image`, media (type/source/overlay) |
| **Układ** | `align`, `maxWidth`, `contentWidth`, `paddingTop`, `paddingBottom` |
| **Responsywne** | `hideMediaOnMobile` |
| **Presety** | do 24 presetów per użytkownik |

### 2.2 Tryby edytora

- **Wizard** — krok po kroku: cel, wariant, treść, CTA, media
- **Visual** — główny inspektor: badge, nagłówki, CTA, media, typografia, kolory, tło
- **Advanced** — układ, padding, responsywność, techniczne opcje tła

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie Centered / Media Right / Media Left | ✓ Działa |
| Sekcja Media (type/source/URL) ukryta w Centered | ✓ Działa |
| Sekcja Media widoczna w split i media-left | ✓ Działa |
| Aktywny wariant wyraźnie oznaczony „Selected" | ✓ Działa |

### 3.2 Badge

| Test | Wynik |
|------|-------|
| Show badge toggle collapse/expand pól | ✓ Działa |
| Badge tone: 4 opcje (Neutral, Primary, Success, Warning) | ✓ Działa |
| Badge placement: Above headline / Inline headline | ✓ Działa |
| Badge prefix i URL | ✓ Dostępne |

### 3.3 CTA

| Test | Wynik |
|------|-------|
| Single/Dual CTA layout toggle | ✓ Działa |
| Secondary CTA fields collapse po wybraniu Single | ✓ Działa |
| Button size: sm / md / lg dla primary i secondary | ✓ Działa |

### 3.4 Media

| Test | Wynik |
|------|-------|
| Media type: None / Image / Video | ✓ Działa |
| Media source: External URL / Media library | ✓ Działa |
| Library filtruje po typie (image/*, video/*) | ✓ Działa |
| Media ratio: 16:9 / 4:3 / 1:1 / 3:4 | ✓ Dostępne |
| Media overlay clearable | ✓ Działa |

### 3.5 Typografia

| Test | Wynik |
|------|-------|
| Alignment: left / center / right | ✓ Działa |
| Headline size: None / 2xl / 3xl / 4xl / 5xl | ✓ Działa |
| Subhead i body size (5 poziomów każde) | ✓ Działa |

### 3.6 Presety

| Test | Wynik |
|------|-------|
| Tworzenie presetu — dialog z polem nazwy | ✓ Działa |
| Preset wyświetlany z Apply / Update / Delete | ✓ Działa |
| Apply presetu przywraca konfigurację | ✓ Działa |

### 3.7 Wizard

| Test | Wynik |
|------|-------|
| Pola: Goal, Layout, Headline, CTA, Media | ✓ Dostępne |
| Goal options: Lead generation / Sales / Information | ✓ Działa |
| Continue → przenosi do Visual tab | ✓ Działa |
| Informacja o Centered + Image = background | ✓ Widoczna |

### 3.8 Advanced

| Test | Wynik |
|------|-------|
| Layout: Alignment / Max width / Content width | ✓ Działa |
| Padding top / bottom (hero-specific) | ✓ Działa |
| Container / widget padding / margin | ✓ Dostępne |
| Visibility: Desktop / Tablet / Mobile switches | ✓ Działa |
| hideMediaOnMobile toggle | ✓ Działa |

---

## 4. Znalezione błędy i problemy UX

### 4.1 Błędy funkcjonalne (Bugs)

#### BUG-01 — Media border controls widoczne w Centered
**Priorytet:** Wysoki  
**Opis:** W wariancie "Centered" sekcja "Colors and Borders" nadal wyświetla pola: *Media frame border color*, *Media border width*, *Media radius*. W tym wariancie nie ma inline media, więc te kontrolki nie mają zastosowania i powinny być ukryte.  
**Lokalizacja:** Visual editor → Colors and Borders  

#### BUG-02 — Gradient nie jest aktywny mimo wypełnionych pól
**Priorytet:** Wysoki  
**Opis:** W sekcji Background gradient widoczne są pola Start color i End color z wartościami (`#0f172a`, `#475569`) oraz suwak Angle (135deg), ALE przycisk "Clear" jest wyłączony — gradient nie jest faktycznie zaaplikowany. Gradient staje się aktywny dopiero po ręcznej edycji jednego z pól + Tab. Użytkownik nie dostaje żadnej informacji zwrotnej że gradient jest "nieaktywny", mimo że widzi wypełnione pola.  
**Lokalizacja:** Visual editor → Background → Background gradient  
**Repro:** Otwórz edytor → Background → sprawdź czy Clear disabled przy wypełnionych polach → zmień kolor → Tab → Clear się aktywuje  

#### BUG-03 — History panel: "Not authenticated"
**Priorytet:** Wysoki  
**Opis:** Przycisk "History" otwiera panel który wyświetla komunikat *"Not authenticated"* mimo że użytkownik jest zalogowany. Funkcja Page history jest całkowicie niedostępna.  
**Lokalizacja:** Toolbar → History  

#### BUG-04 — Brak video poster dla wideo inline
**Priorytet:** Wysoki  
**Opis:** Po wyborze media type = Video w sekcji Media, nie pojawia się pole "Video poster image". Skutkuje to czarnym ekranem podczas ładowania wideo, co jest złym UX dla użytkownika końcowego.  
**Lokalizacja:** Visual editor → Media → Media type = Video  

#### BUG-05 — Dwa przyciski w toolbar bez etykiet/aria-label
**Priorytet:** Średni  
**Opis:** W głównym toolbarze edytora strony widoczne są 2 przyciski z samymi ikonami (brak title, aria-label, tekstu). Nie wiadomo co robią bez klikania. Naruszenie WCAG 2.1 SC 4.1.2.  
**Lokalizacja:** Toolbar → ikony obok "PUBLISHED / UNSAVED CHANGES"  

#### BUG-06 — Media alt text wymagany dla obrazów, ale nieobjęty walidacją
**Priorytet:** Średni  
**Opis:** Pole "Media alt text" jest opcjonalne i nie ma walidacji — użytkownik może opublikować stronę z obrazem bez alt tekstu, naruszając WCAG 1.1.1.  
**Lokalizacja:** Visual editor → Media → Media alt text  

#### BUG-07 — Alt text widoczny dla wideo (semantycznie niepoprawne)
**Priorytet:** Niski  
**Opis:** Po zmianie Media type na Video pole "Media alt text" nadal jest widoczne. Wideo nie używa atrybutu alt w ten sam sposób co obrazy. Powinno być zastąpione polem "Video title" lub "Video description".  
**Lokalizacja:** Visual editor → Media → Media type = Video  

---

### 4.2 Problemy UX edytora

#### UX-01 — Dual textbox dla kolorów — niejasna relacja między polami
**Opis:** Każde pole koloru ma dwa inputy: `<input type="color">` (picker hex) + zwykły tekst (CSS var/wartość). Relacja między nimi nie jest wyjaśniona użytkownikowi. Pytania które się pojawiają:
- Które pole "wygrywa"?  
- Co się dzieje gdy oba mają wartości?  
- Dlaczego są dwa pola na jeden kolor?  
**Rekomendacja:** Dodać tooltip lub labelkę "Visual" / "Custom value" wyjaśniającą cel każdego pola.

#### UX-02 — Disabled Clear button na polach z widocznymi wartościami
**Opis:** Kilka pól kolorów (np. Secondary button background, Card border color) pokazuje wartości hex (#111827) ale przycisk "Clear" jest wyłączony — co oznacza że wartość NIE jest faktycznie zapisana w danych (to tylko podgląd stanu swatcha). Użytkownik nie może odróżnić "wartości zapisanej" od "wartości domyślnej". Prowadzi to do błędnej interpretacji stanu.  
**Rekomendacja:** Wyraźnie oznaczaj pola z zapisaną wartością (np. outline/badge "overridden") vs. korzystające z domyślnych.

#### UX-03 — Brak potwierdzenia przy usuwaniu presetu
**Opis:** Przycisk "Delete" na presecie natychmiast usuwa go bez żadnego dialogu potwierdzenia. Brak opcji cofnięcia. Ryzyko przypadkowego usunięcia cennej konfiguracji.  
**Rekomendacja:** Dodać dialog confirm: "Usunąć preset 'Nazwa'? Nie można cofnąć."

#### UX-04 — Dwa zestawy kontrolek Padding w Advanced
**Opis:** W zakładce Advanced istnieją **dwa oddzielne zestawy padding**:
1. "Hero Layout" → Padding top / Padding bottom (hero-specific spacing wewnątrz widgetu)
2. "Layout" → Padding top / Padding bottom (widget container padding)

Różnica nie jest wyjaśniona. Użytkownik może nie wiedzieć, który padding zmieniać.  
**Rekomendacja:** Dodać opisy sekcji wyjaśniające różnicę (np. "Hero content spacing" vs "Widget container spacing").

#### UX-05 — Brak podglądu mobile/desktop w edytorze
**Opis:** Canvas zawsze pokazuje desktop layout. Nie ma przełącznika viewport (Mobile / Tablet / Desktop). Użytkownik nie wie jak hero wygląda na urządzeniach mobilnych mimo że istnieje opcja "hideMediaOnMobile".  
**Rekomendacja:** Dodać pasek przełączania viewport w toolbarze strony.

#### UX-06 — Brak "Discard Changes" w toolbarze
**Opis:** Gdy są niezapisane zmiany ("UNSAVED CHANGES" badge), brak wyraźnego przycisku "Discard" lub "Revert". Jedyną opcją jest ręczne cofnięcie zmian lub opuszczenie strony. Historia jest niedostępna (BUG-03).  
**Rekomendacja:** Dodać przycisk "Odrzuć zmiany" obok "Publish".

#### UX-07 — Gradient bez stanu "aktywny/nieaktywny"
**Opis:** Pola gradientu są zawsze widoczne ze swoimi wartościami domyślnymi niezależnie czy gradient jest włączony. Brak toggle/checkbox "Enable gradient". Użytkownik musi ręcznie edytować kolor żeby gradient się "aktywował" — niezrozumiały flow.  
**Rekomendacja:** Dodać toggle "Enable gradient" który kontroluje aktywność całej sekcji gradientu.

#### UX-08 — Placeholder CTA URL nie odzwierciedla stanu
**Opis:** Pole "Primary CTA URL" ma placeholder "/start" ale wyświetla wartość "/signup". W Wizard mode placeholder to też "/start" — mogą być nieaktualne przykłady, ale warto je ujednolicić.

---

### 4.3 Braki funkcjonalne

#### BF-01 — Brak pola video poster
**Opis:** Wideo hero bez poster image = czarny kadr podczas ładowania. Brakuje pola "Poster image" (thumbnail) dla video.

#### BF-02 — Brak kontrolek cieni (box-shadow)
**Opis:** Brak możliwości dodania cienia do karty hero, przycisków CTA lub ramki media. Cień jest kluczowym elementem designu i wielu projektantów go potrzebuje.

#### BF-03 — Brak opcji full-bleed / 100vh
**Opis:** Nie ma opcji "hero fullscreen" (100vh) ani "full-bleed" (treść wykracza poza kontener). Wymaga niestandardowego CSS.

#### BF-04 — Brak rich text dla headline/body
**Opis:** Pola headline, subhead i body przyjmują wyłącznie plain text. Brak możliwości użycia bold, italic, link wewnątrz tekstu, co ogranicza formatowanie.

#### BF-05 — Brak predefiniowanych palet kolorów
**Opis:** Użytkownik musi ręcznie ustawiać 10+ pól kolorów. Brak predefiniowanych schematów kolorystycznych (np. "jasny", "ciemny", "branded") jako punktu startowego.

#### BF-06 — Brak kontroli font-weight / font-family
**Opis:** Brak możliwości ustawienia grubości czcionki (thin, regular, bold, black) ani rodziny fontu per widget.

#### BF-07 — Brak srcset / responsive images
**Opis:** Jeden rozmiar obrazu dla wszystkich ekranów. Brak `srcset`, `sizes`, art direction przez `<picture>`. Wpływ na LCP i wydajność.

#### BF-08 — Brak walidatora kontrastu kolorów (WCAG)
**Opis:** Użytkownik może ustawić kombinację kolorów tekstu/tła która nie spełnia WCAG AA (4.5:1 dla tekstu normalnego). Brak wskaźnika kontrastu w pickerze.

#### BF-09 — Brak eksportu/importu presetów
**Opis:** Presety są per-user i per-browser. Nie można ich przenieść między użytkownikami ani środowiskami (dev/prod).

#### BF-10 — Brak wyszukiwania/organizacji presetów
**Opis:** Przy maksimum 24 presetach brak jakiegokolwiek filtrowania, sortowania ani grupowania.

#### BF-11 — Brak atrybutu `fetchpriority="high"` dla LCP image
**Opis:** Obraz hero jest zazwyczaj największym elementem "above the fold" (Largest Contentful Paint). Brak `fetchpriority="high"` opóźnia jego ładowanie przez przeglądarkę.

#### BF-12 — Brak kontroli animacji/scroll effects
**Opis:** Brak transition/entrance animation dla elementów hero (fade-in, slide-up itp.). Dostępne w wielu konkurencyjnych builderach.

#### BF-13 — Brak wariantu "media-center"
**Opis:** Brak wariantu z dużym obrazem/wideo w centrum (showcase produktu, pełnoekranowy produkt). Istniejące warianty: centered (media jako tło), split, media-left.

#### BF-14 — Brak social proof row
**Opis:** Brak sekcji ocen/gwiazdek/liczb/avatarów inline w hero (np. "⭐ 4.9/5 z 2000 recenzji"). Standardowy element konwersyjnych hero sections.

---

## 5. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Dwa przyciski toolbar bez aria-label | WCAG 4.1.2 | Wysoki |
| A2 | Brak walidatora kontrastu kolorów | WCAG 1.4.3 | Wysoki |
| A3 | Brak wymaganego alt text dla obrazów | WCAG 1.1.1 | Wysoki |
| A4 | Brak `rel="noopener noreferrer"` na zewnętrznych linkach CTA/badge | Bezpieczeństwo | Średni |
| A5 | Brak `loading="lazy"` na obrazach inline | Performance | Średni |
| A6 | Brak `fetchpriority="high"` na hero image LCP | Core Web Vitals | Średni |

---

## 6. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Obszar |
|----|------|--------|
| BUG-01 | Media border controls w Centered variant | Visual editor |
| BUG-02 | Gradient "nieaktywny" mimo wypełnionych pól | Background |
| BUG-03 | History panel: "Not authenticated" | Toolbar |
| BUG-04 | Brak video poster field | Media |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-03 | Confirm dialog przy usuwaniu presetu |
| UX-05 | Przełącznik viewport (mobile/tablet/desktop) |
| UX-06 | Przycisk "Discard Changes" w toolbarze |
| UX-07 | Toggle "Enable gradient" zamiast auto-aktywacji |
| UX-01 | Wyjaśnienie relacji dual textbox w color pickerze |

### Brakujące funkcjonalności

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Video poster image |
| BF-05 | Wysoki | Predefiniowane palety kolorów |
| BF-03 | Wysoki | Full-height (100vh) hero option |
| BF-08 | Wysoki | WCAG contrast validator |
| BF-02 | Średni | Box shadow controls |
| BF-04 | Średni | Rich text dla headline/body |
| BF-07 | Średni | Srcset / responsive images |
| BF-09 | Niski | Eksport/import presetów |
| BF-13 | Niski | Wariant media-center |
| BF-14 | Niski | Social proof row |

---

## 7. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 7 |
| Problemy UX edytora | 8 |
| Braki funkcjonalne | 14 |
| Problemy dostępności | 6 |
| **Łącznie** | **35** |

---

## 8. Screenshoty

| Plik | Opis |
|------|------|
| `hero-editor-visual.png` | Widok Visual editor (wariant Centered) |
| `hero-variant-centered.png` | Przełączenie na Centered |
| `hero-advanced-tab.png` | Zakładka Advanced |
| `hero-preset-dialog.png` | Dialog tworzenia presetu |
| `hero-preset-saved.png` | Preset zapisany z opcjami Apply/Update/Delete |
| `hero-color-picker.png` | Color picker (popup z RGB inputs) |
| `hero-colors-section.png` | Sekcja Colors and Borders |
| `hero-media-left.png` | Wariant Media Left |
| `hero-full-editor.png` | Pełny widok edytora |
| `hero-history.png` | History panel — "Not authenticated" bug |
| `hero-toolbar.png` | Toolbar z "UNSAVED CHANGES" |

---

*Raport wygenerowany na podstawie analizy kodu i testów Playwright — 2026-05-16.*
