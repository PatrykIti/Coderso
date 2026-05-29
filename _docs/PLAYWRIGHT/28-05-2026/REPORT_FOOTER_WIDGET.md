# RAPORT: Footer Widget — Audyt bieżącego stanu (UX/UI + weryfikacja działania)

> **Status:** Zakończony (audyt domykający luki)
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-footer-gap-close` (izolowana od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixture):** `Contract Test - footer` (ID: `0aa97321-eeda-4455-ba63-4537cc7f2dee`)
> **Trasa publiczna:** http://localhost:3000/test-footer-widget-0516 (`TEST-FOOTER-WIDGET-0516`)

> **Uwaga o zrzutach:** w tej sesji **nie commitowano** żadnych plików PNG. Jeżeli
> mowa o przechwyceniu, to wyłącznie lokalna etykieta Playwright (np.
> `footer-public-mobile-375` jako stan przeglądarki) — nie jest to wymagane evidence
> ani plik w repo.

> **Uwaga o zakresie:** raport opisuje **stan faktyczny zaobserwowany w UI** w dniu
> testu. Każdą interakcję potwierdzono inspekcją DOM/CSS podglądu (`eval`). Sekcje
> rozdzielają: (4) co przetestowano i DZIAŁA, (5) czego NIE da się w pełni
> zweryfikować w tym fixture/środowisku (z dokładną przyczyną), (8) niuanse UX/UI,
> (9) błędy. Tam, gdzie czegoś nie sprawdzono, jest to wprost zaznaczone.

> **Domknięte luki z poprzedniej wersji raportu:** media picker logo, destynacje
> i targety legal, add/remove/reorder dla linków i social, pozostałe selecty
> typografii/kolorów/layoutu oraz **gałęzie slotów** zostały w tej sesji
> przetestowane empirycznie. Szczegóły poniżej.

---

## 1. Przegląd widgetu

**Typ:** `footer`
**Kategoria:** `navigation`
**Tytuł / opis:** „Footer" / „Footer with brand, links, and company info."
**Warianty:** `columns-2` (2 kolumny), `columns-3` (3 kolumny), `minimal` (1 kolumna, kompaktowy rząd inline)
**Sloty (zagnieżdżone widgety):** `column-1`, `column-2`, `column-3`, `bottom` (Bottom Strip)

**Pliki źródłowe:**
- `core/widgets/core/footer.tsx` — renderer `FooterBlock`, typy, schema, normalizacja, `reorderFooterColumnsAndSlots`
- `core/admin/ui/widgets/editors/FooterEditors.tsx` — edytory Wizard / Visual / Advanced
- `core/admin/ui/widgets/editors/LinkDestinationField.tsx` — wspólny page-picker linków
- `core/admin/ui/media/MediaPicker.tsx` — wspólny dialog biblioteki mediów (logo)

Footer renderuje się jako semantyczny `<footer>`. Gdy ustawiony jest tekst marki
(`brand.logoText`), `<footer>` ma `aria-labelledby` wskazujące na nazwę marki; w
przeciwnym razie `aria-label="Site footer"`. Dobry wzorzec dostępności.

---

## 2. Model danych (struktura konfiguracji)

| Sekcja | Pola |
|--------|------|
| **columns[]** | `title`, `links[]` (`label`, `href`, `target` `_self`/`_blank`) — min. 1 kolumna w schema |
| **brand** | `logoUrl`, `logoAlt`, `logoText`, `tagline` |
| **legal** | `enabled`, `copyright`, `privacy`, `privacyLabel`, `privacyTarget`, `terms`, `termsLabel`, `termsTarget` |
| **contact** | `address`, `phone`, `email` (normalizowane do `<address>` + linki `tel:` / `mailto:`) |
| **backToTop** | `enabled`, `label` (kotwica `#top`) |
| **social[]** | `type` (14 platform + `custom`), `href`, `label`; przełącznik `socialEnabled` |
| **layout** | `align`, `legalAlign`, `maxWidth` (none/5xl/6xl/7xl), `columnGap`, `columnBreakpoint` (sm/md/lg), `sectionPaddingY`, `paddingX` |
| **style** | `surfaceColor`, `borderColor`, `borderTopWidth`, `textColor`, `headingColor`, `linkColor`, `legalTextColor`, `socialColor`, `fontSize`, `headingTransform`, `linkHoverColor`, `linkActiveColor`, `linkUnderline`, `linkFontWeight`, `linkLetterSpacing` |

**Warianty renderera:**
- `columns-2` / `columns-3` — siatka kolumn (`md:grid-cols-2` / `-3`) + opcjonalny blok marki na górze + dolny pasek (legal / kontakt / social / back-to-top). Slot `column-N` renderuje się **wewnątrz** widocznej kolumny (wrapper `.pt-1`), slot `bottom` — w dolnym pasku.
- `minimal` — pierwsza kolumna jako kompaktowy rząd linków inline; pozostałe kolumny zachowywane (ukryte). Slot `column-1` + `bottom` lądują pod kompaktowym rzędem (wrapper `.border-t.pt-4`).

---

## 3. Tryby edytora — co zawierają (stan faktyczny)

W prawym panelu są **dwie zakładki: „Visual" i „Advanced"**. Tryb **Wizard** to
osobny przepływ „setup" uruchamiany przyciskiem **„Run setup again"** (status:
„Daily edits live in Visual. Advanced is for technical diagnostics.").

### 3.1 Wizard („Starter footer")
Ekran seedująco-przeglądowy, niemal w całości read-only (`writablePaths: []`):
- **Footer variant** — `Select` (jedyna interaktywna kontrolka; `ownership=action`).
- Wiersze read-only: „Visible columns", „Show social links" + licznik profili.
- Statyczne podpowiedzi kierujące do Visual; live preview reaguje na zmianę wariantu.

### 3.2 Visual (pełna edycja)
Sekcje: **Variant and structure**, **Columns and links**, **Brand and legal**,
**Utility strip**, **Social links and icon style**, **Colors and borders**,
**Typography and link styling**, **Layout and spacing**, **Slots overview** (read-only).
Pod sekcjami footera są jeszcze **wspólne** panele bloku: **Structure** (zarządzanie
slotami), **Block layout**, **Device visibility** — należą do bloku, nie do footera.

### 3.3 Advanced (wyłącznie diagnostyka)
Cztery sekcje **w 100% read-only**: Runtime summary, Layout diagnostics, Style
diagnostics, Support summary. Brak edytora JSON i przycisku normalizacji. Wartości
na żywo odzwierciedlają stan z Visual.

---

## 4. Co realnie PRZETESTOWANO i DZIAŁA (Admin UI)

Wszystkie interakcje wykonano w sesji `claude-29-05-footer-gap-close` i potwierdzono
inspekcją DOM/CSS podglądu (canvas). **Każda kontrolka zadziałała poprawnie i
natychmiast aktualizowała podgląd.** Stan startowy draftu: wariant `columns-2`
(kolumny „Company", „Resources"; trzecia „Product" ukryta), legal i social włączone.

### 4.1 Brand → Logo image (MediaPicker) — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| „Browse media" | Dialog „Media library" otwarty, lista assetów (m.in. `cos1.png`, `image.png`) |
| Wybór `cos1.png` | `brand.logoUrl` ustawiony; w `<footer>` pojawił się `<img src="http://localhost:3000/media/2026/02/…png">`, `alt="Footer logo"` (fallback); dialog zamknięty automatycznie |
| Komunikat pod podglądem assetu | „Using the selected Media Library image." (potwierdza ścieżkę `selectedMediaId`) |
| Logo alt text → „Logo Coderso testowe" | `img alt` zmienił się na „Logo Coderso testowe" |
| „Clear logo" | `<img>` usunięty; ponieważ ustawiony był tylko `logoAlt`, blok marki zniknął, a `<footer>` wrócił do `aria-label="Site footer"` |

### 4.2 Brand / Legal — destynacje i targety — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| Privacy destination (page-picker) → „HomePage" | link „Privacy" → `href="/homepage"` |
| Privacy link target → „Open in new tab" | „Privacy" zyskał `target="_blank"` + `rel="noopener noreferrer"` (mimo relatywnego href!) |
| Terms destination (page-picker) → „HomePage" | link „Terms" → `href="/homepage"` |
| Terms link target → „Open in new tab" | „Terms" → `target="_blank"` + `rel="noopener noreferrer"` |
| „Clear destination" (Privacy) | link „Privacy" **całkowicie zniknął** z dolnego paska |
| Toggle „Show legal strip" = OFF | zniknęły copyright + Privacy + Terms (social pozostał) |
| Ten sam toggle = ON | copyright + Terms wróciły (Privacy nadal pusty — bo destynacja wyczyszczona wcześniej) |

### 4.3 Columns and links — add / remove / reorder / target — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| Link target (Kol.1 / Link 1 „About") → „Open in new tab" | „About" → `target="_blank"` + `rel="noopener noreferrer"` |
| „Add link" (Kol. 1) | dodano „Link 3" (panel + render) |
| „Move up" na „Link 3" | kolejność linków: `[About, Link 3, Careers]` |
| „Remove" na „Link 3" | powrót do `[About, Careers]` |
| „Clear destination" (Kol.1 / „About") | `href` linku „About" → `#` — link **nadal się renderuje** (patrz §8 pkt 3) |

### 4.4 Social — add / remove / reorder / typ custom — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| „Add social" | dodano „Social link 3" (domyślnie LinkedIn, pusty href — nie renderuje się) |
| Platform „Social link 3" → „Custom" | pole „Profile name" zamienione na **page-picker „Custom destination"** + pojawiło się pole **„Accessible label"** |
| Accessible label → „Społeczność" + Custom destination → „HomePage" | w `<footer>` pojawiła się 3. ikona social: `aria-label="Społeczność"`, `href="/homepage"`, **bez** `target="_blank"` (link wewnętrzny) i bez „(opens in new tab)" |
| „Move down" na „Social link 1" (X) | kolejność: `[LinkedIn, X, Społeczność]` |
| „Remove" na „Social link 3" | powrót do 2 ikon `[LinkedIn, X]` |

### 4.5 Typography and link styling — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM/CSS podglądu) |
|------|---------------------------|
| Font size → „Base" | klasa `<footer>` = `… text-base` (z `text-sm`) |
| Link font weight → „Semibold" | klasa linku = `… font-semibold` |
| Link letter spacing → „Wide" | klasa linku = `… tracking-wide` |
| Link underline → „Always underlined" | klasa linku = `… underline underline-offset-4` (z `no-underline … hover:underline`) |
| Link hover color → `#ff0000` | inline `--footer-link-hover-color: #ff0000` + klasa `hover:text-[var(--footer-link-hover-color)]` |
| Link active color → `#0000ff` | inline `--footer-link-active-color: #0000ff` + klasa `active:text-[var(--footer-link-active-color)]` |

### 4.6 Colors and borders — LUKA DOMKNIĘTA
| Akcja | Wynik (CSS podglądu) |
|------|----------------------|
| Border color → `#ff8800` | `footer.style.borderColor = rgb(255,136,0)` |
| Text color → `#222222` | `footer.style.color = rgb(34,34,34)` |
| Heading color → `#aa0000` | `h3.style.color = rgb(170,0,0)` |
| Link color → `#008800` | `a.style.color = rgb(0,136,0)` |
| Legal text color → `#888888` | span legal `color = rgb(136,136,136)` |
| Social icon color → `#0088cc` | link social `color = rgb(0,136,204)` |
| „Clear" (po ustawieniu) | przyciski „Clear" zmieniły stan z `disabled`/„Theme default" na aktywne/„Selected color"; Clear (Border) → powrót do `var(--color-border)` |

### 4.7 Layout and spacing — LUKA DOMKNIĘTA
| Akcja | Wynik (klasa podglądu) |
|------|------------------------|
| Legal row alignment → „Left" | dolny pasek = `… justify-start` (z `justify-end`) |
| Column gap → „Spacious" | siatka = `… gap-8` |
| Horizontal padding → „Spacious" | `<footer>` = `… px-8` |
| Column breakpoint → „Large screens" | siatka = `… lg:grid-cols-2` (z `md:grid-cols-2`) |
| Section padding → „Spacious" | `<footer>` = `… py-12` |

### 4.8 Sloty (zagnieżdżone widgety) — LUKA DOMKNIĘTA
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| „Add widget to Column 1" → wstaw „Divider" | Divider wyrenderowany **wewnątrz** kolumny „Company", w wrapperze `.pt-1` (`[data-divider]`) |
| „Move right" na kolumnie „Company" | **payload slotu podążył za kolumną**: po reorderze Divider renderuje się pod „Company" (teraz prawa kolumna), a lewa „Resources" nie ma slotu — potwierdza `reorderFooterColumnsAndSlots` |
| „Add widget to Bottom Strip" → wstaw „Divider" | Divider wyrenderowany w dolnym pasku (`.mt-8` → `[data-divider]`) |
| Zmiana wariantu na „Minimal" | sloty wtórne (`column-1` + `bottom`) renderują się **pod** kompaktowym rzędem (`.border-t.pt-4`); rząd inline reużywa pierwszej kolumny (`<nav aria-label="… links">`) |

**Konsola admina:** 0 błędów, 1 ostrzeżenie (a11y dialogu media — patrz §8 pkt 1).

> Kontrolki potwierdzone już wcześniej (i niezmienione): wybór wariantu w Wizard i
> Visual, tytuł kolumny, etykieta linku, page-picker linków kolumn, brand name +
> tagline (→ `aria-labelledby`), copyright, address (`<address>`), phone (`tel:`),
> email (`mailto:`), back-to-top toggle + label (`#top` + `data-footer-back-to-top`),
> social toggle, social profile name, zmiana platformy z zachowaniem handla,
> Surface color + Clear, Top border width, Heading transform, Columns alignment,
> Max width. **W tej sesji potwierdzono je ponownie pośrednio** (stan startowy i
> reakcje podglądu były zgodne).

---

## 5. Czego NIE DA SIĘ w pełni zweryfikować (z dokładną przyczyną)

- **Social → amber „Clear saved destination"** (`footer.social.{i}.clearSavedDestination`).
  **Kontrolka:** żółty box z przyciskiem „Clear saved destination" w karcie social.
  **Warunek pojawienia się:** typ inny niż `custom` **oraz** zapisany `href` o
  niezerowej długości, którego `readFooterSocialProfile()` **nie potrafi** sparsować
  na handle dla danej platformy.
  **Dlaczego nieosiągalne w tym fixture/UI:** pole „Profile name" zawsze przebudowuje
  kanoniczny, parsowalny URL przez `buildFooterSocialHref()` (albo zwraca pusty
  string), a zmiana platformy (`updateSocialType`) najpierw wyciąga handle ze starego
  URL-a i odbudowuje nowy — round-trip jest zawsze parsowalny. Aby wywołać amber,
  trzeba **wprost zaseedować** wpis social z niespójnym href (np. `type: "twitter"`,
  `href: "https://example.com/foo"`), czego standardowy edytor nie wytworzy, a tego
  fixture nie zawiera. **To nie jest błąd** — to defensywny guard dla danych z
  importu/legacy. Logika została zweryfikowana wyłącznie przez analizę kodu.

- **Persystencja po publikacji.** Świadomie **nie klikałem „Publish"** — przy wyjściu
  z admina pojawił się guard `beforeunload` (potwierdza śledzenie brudnego draftu),
  który zaakceptowałem, więc edycje draftowe zostały porzucone. Trwałości moich zmian
  na froncie **nie weryfikowałem** (front pokazuje wcześniej opublikowany fixture).

- **Wariant `minimal` na froncie.** Na trasie publicznej opublikowany jest
  `columns-3`; `minimal` (w tym jego gałąź slotów wtórnych) widziałem wyłącznie w
  podglądzie admina, nie na froncie.

- **Pozostałe 13 platform social poza X / LinkedIn / Custom** — nie przeklikiwałem
  każdej z osobna (logika `buildFooterSocialHref`/`readFooterSocialProfile` wspólna;
  potwierdzono X, LinkedIn, GitHub w poprzednich sesjach + Custom w tej).

---

## 6. Testy na froncie (trasa publiczna)

> **URL:** http://localhost:3000/test-footer-widget-0516 · **Data:** 2026-05-29

Front renderuje **opublikowaną** wersję (niezależną od moich edycji draftowych).
Po zaakceptowaniu `beforeunload` draft został porzucony — front pokazuje fixture
sprzed sesji.

### 6.1 Wyrenderowany footer (opublikowany stan)
- Wariant: **`columns-3`** — nagłówki: `Company`, `Resources`, `Product`; linki:
  `About`/`Careers`, `Blog`/`Support`, `Features`/`Pricing` (relatywne, bez target).
- Legal: `Privacy` → `/privacy`, `Terms` → `/terms` (bez target).
- Social: `Twitter` → `https://twitter.com`, `LinkedIn` → `https://linkedin.com`,
  oba z **`target="_blank"` + `rel="noopener noreferrer"`** i `aria-label` „… (opens in new tab)".
- `<footer aria-label="Site footer">` (brak marki → brak `aria-labelledby`).
- Klasy: `border-t px-6 py-10 text-sm`, kontener `max-w-6xl`, siatka
  `grid w-full gap-6 md:grid-cols-3`.

### 6.2 Responsywność
- **1280px:** 3 kolumny obok siebie — `grid-template-columns` ≈ `309px 309px 309px`.
- **375px (mobile):** jedna kolumna — `grid-template-columns` ≈ `327px`; `md:grid-cols-3`
  aktywuje się dopiero od `md`. Poprawne zachowanie.

**Konsola frontu:** 0 błędów, 0 ostrzeżeń.

---

## 7. Admin Preview vs Frontend — zgodność

| Aspekt | Admin (podgląd) | Frontend (publish) | Uwaga |
|--------|-----------------|--------------------|-------|
| `<footer>` semantyczny | ✓ | ✓ | zgodne |
| `aria-label` / `aria-labelledby` zależne od marki | ✓ | ✓ (`aria-label`, brak marki) | zgodne z logiką renderera |
| Linki kolumn (relatywne, bez target) | ✓ | ✓ | zgodne |
| Link target `_blank` → `rel=noopener noreferrer` | ✓ (legal/link/social) | ✓ (social) | zgodne, poprawne bezpieczeństwo |
| Sloty (column / bottom) | ✓ (Divider, reorder remap) | n/d (brak slotów w opublikowanym fixture) | nieporównywalne na froncie |
| Siatka / responsywność | ✓ | ✓ | zgodne |

**Wniosek:** renderer jest wspólny dla admina i frontu. Różnice w treści (np. brak
marki/kontaktu/slotów na froncie) wynikają z innych **opublikowanych** danych, nie z
rozbieżności rendererów.

---

## 8. Niuanse UX/UI (obserwacje)

1. **A11y dialogu media (NOWE).** Otwarcie page-pickerem mediów logo wywołuje w
   konsoli ostrzeżenie React: „Missing `Description` or `aria-describedby={undefined}`
   for {DialogContent}". Pochodzi ze wspólnego komponentu `Dialog`, ale ujawnia się
   m.in. przez `MediaPicker` footera. Drobna luka dostępności (brak opisu dialogu).

2. **„Add link" tworzy destynację `#`, nie pustą (NOWE).** Świeżo dodany link ma w
   edytorze `href: ""`, ale po round-tripie normalizacji bloku zapisuje się jako `#`,
   przez co page-picker pokazuje **„Saved custom destination"** zamiast neutralnego
   „No destination". Użytkownik widzi „zapisaną niestandardową destynację" tuż po
   dodaniu pustego linku — mylące.

3. **Niespójna semantyka „pustej" destynacji: link kolumny vs legal (NOWE).**
   Wyczyszczenie destynacji **linku kolumny** ustawia `href` na `#` i link **dalej się
   renderuje** (jako `#`). Wyczyszczenie destynacji **legal** (Privacy/Terms) usuwa
   link **całkowicie**. Dwa różne zachowania dla tej samej operacji „Clear destination".

4. **Link target `_blank` dokleja `rel=noopener noreferrer` także do linków
   wewnętrznych/relatywnych.** Bezpieczne, ale oznacza, że link np. do `/homepage`
   może otwierać się w nowej karcie z `rel`. Warto mieć świadomość przy targetowaniu
   stron wewnętrznych.

5. **„Link/Privacy/Terms/Custom destination" to PAGE-PICKER, nie pole URL.** Zaseedowane
   ścieżki (`/about`, `/privacy`…) pokazywane jako „Saved custom destination" z
   ostrzeżeniem „A custom destination is already configured…". Autorowanie dowolnego
   zewnętrznego URL standardową kontrolką jest nieoczywiste — można wybrać stronę
   wewnętrzną albo wyczyścić. Zapisana wartość „custom" jest zachowywana i renderowana.

6. **Pola social są „platform-aware":** wpisuje się tylko handle/nazwę, edytor buduje
   bezpieczny, kanoniczny URL; zmiana platformy zachowuje handle. Typ `custom`
   przełącza się na page-picker + osobne pole „Accessible label"; link wewnętrzny
   custom **nie** dostaje `target=_blank` (zgodnie z logiką dla href relatywnego).

7. **Kontrolki koloru: swatch + „Clear".** „Clear" jest `disabled` przy „Theme default"
   i aktywny przy „Selected color" — spójnie we **wszystkich** polach koloru
   (Surface/Border/Text/Heading/Link/Legal/Social + hover/active).

8. **Reorder kolumn jest „live-only" (przez `onBlockPatch`) i przenosi sloty.**
   Potwierdzone empirycznie: przeniesienie kolumny przenosi jej payload slotu
   (`reorderFooterColumnsAndSlots`). Przyciski Move left/right aktywne tylko gdy
   widocznych kolumn > 1.

9. **Wstawienie widgetu do slotu zmienia zaznaczenie na ten widget.** Po „Add widget
   to Column/Bottom" prawy panel przełącza się na edytor wstawionego widgetu (np.
   Divider) — aby wrócić do edytora footera, trzeba ponownie zaznaczyć footer.
   Zachowanie wspólne dla bloków ze slotami, nie błąd, ale wymaga dodatkowego kliknięcia.

10. **Wizard jest praktycznie read-only** (poza selectem wariantu) — świadoma decyzja
    projektowa (`writablePaths: []`), komunikaty jasno kierują do Visual.

11. **Guard `beforeunload`** uruchamia się przy wyjściu z niezapisanym draftem —
    potwierdza śledzenie zmian; trzeba świadomie potwierdzić opuszczenie strony.

---

## 9. Co NIE DZIAŁA / błędy

**Błędy funkcjonalne: 0.** Każda z ~40 przetestowanych w tej sesji interakcji
(media picker, legal destinations/targets, add/remove/reorder linków i social,
typ custom social, wszystkie selecty typografii/kolorów/layoutu, wstawianie i
reorder slotów, wariant minimal) zadziałała i natychmiast aktualizowała podgląd.
Tryb Advanced wiernie odzwierciedlał stan.

**Konsola:** front 0/0. Admin: 0 błędów, **1 ostrzeżenie** — a11y `DialogContent`
(brak `Description`/`aria-describedby`) wyzwalane przez dialog biblioteki mediów
(§8 pkt 1). To wspólny komponent, nie logika footera, ale ujawnia się przez footer.

Zastrzeżenia mają charakter **UX/a11y** (§8): a11y dialogu media (1), `#` jako
destynacja świeżego linku (2), niespójna semantyka „Clear destination" między
linkami kolumn a legal (3), `rel` na linkach wewnętrznych z `_blank` (4),
page-picker zamiast URL (5). Niezweryfikowane/odcięte kontrolki i przyczyny — §5.

---

## 10. Podsumowanie

| Kategoria | Obserwacja |
|-----------|------------|
| Tryby edytora | Wizard (setup/przegląd, edytowalny tylko wariant), Visual (pełna edycja), Advanced (tylko diagnostyka) |
| Przetestowane kontrolki | ~40 interakcji w tej sesji + wcześniej potwierdzone — **wszystkie działają** |
| Domknięte luki | media picker logo, legal destinations/targets, add/remove/reorder linków i social, typ custom social, pełna typografia/kolory/layout, **sloty (insert + reorder remap + bottom + minimal)** |
| Błędy funkcjonalne | **0** |
| Błędy / ostrzeżenia konsoli | front 0/0; admin 0 błędów, 1 ostrzeżenie a11y (dialog media) |
| Dostępność | dobra: semantyczny `<footer>`, `aria-labelledby`/`aria-label`, `rel=noopener` na linkach zewn. i `_blank`, a11y labels social, `<address>` dla kontaktu; **minus:** brak `Description` w dialogu media |
| Główne niuanse UX | a11y dialogu media; `#` dla świeżego linku; niespójna semantyka „Clear destination" (kolumna vs legal); page-picker zamiast URL; `rel` na linkach wewnętrznych |
| Nietestowalne (z przyczyną) | amber „Clear saved destination" (nieosiągalny w UI/fixture — wymaga niespójnych danych seed); persystencja po publikacji (nie publikowano); minimal na froncie |
| Front vs Admin | spójne (wspólny renderer); różnice treści wynikają z innych opublikowanych danych |
