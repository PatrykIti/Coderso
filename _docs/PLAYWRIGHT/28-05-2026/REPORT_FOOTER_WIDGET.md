# RAPORT: Footer Widget — Audyt bieżącego stanu (UX/UI + weryfikacja działania)

> **Status:** Zakończony
> **Data:** 2026-05-29
> **Sesja Playwright:** `claude-29-05-footer-v2` (izolowana od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Strona admin (fixture):** `Contract Test - footer` (ID: `0aa97321-eeda-4455-ba63-4537cc7f2dee`)
> **Trasa publiczna:** http://localhost:3000/test-footer-widget-0516 (`TEST-FOOTER-WIDGET-0516`)

> **Uwaga o zrzutach:** ewentualne pliki PNG (`footer-public-desktop.png`,
> `footer-public-mobile-375.png`) to wyłącznie lokalne etykiety przechwyceń
> Playwright. Nie są commitowane do repo i nie stanowią wymaganego evidence.

> **Uwaga o zakresie:** raport opisuje **stan faktyczny zaobserwowany w UI** w dniu
> testu. W sekcjach jasno rozdzielono: (a) co realnie przetestowano i działa,
> (b) czego **nie** testowano, (c) niuanse UX/UI. Jeśli czegoś nie sprawdziłem,
> jest to wprost zaznaczone.

---

## 1. Przegląd widgetu

**Typ:** `footer`
**Kategoria:** `navigation`
**Tytuł / opis:** „Footer" / „Footer with brand, links, and company info."
**Warianty:** `columns-2` (2 kolumny), `columns-3` (3 kolumny), `minimal` (1 kolumna, kompaktowy rząd inline)
**Sloty (zagnieżdżone widgety):** `column-1`, `column-2`, `column-3`, `bottom` (Bottom Strip)

**Pliki źródłowe:**
- `core/widgets/core/footer.tsx` — renderer `FooterBlock`, typy, schema, normalizacja
- `core/admin/ui/widgets/editors/FooterEditors.tsx` — edytory Wizard / Visual / Advanced

Footer renderuje się jako semantyczny element `<footer>`. Gdy ustawiony jest tekst marki
(`brand.logoText`), `<footer>` otrzymuje `aria-labelledby` wskazujące na nazwę marki;
w przeciwnym razie ma `aria-label="Site footer"`. To dobry wzorzec dostępności.

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
- `columns-2` / `columns-3` — siatka kolumn (`md:grid-cols-2` / `-3`) + opcjonalny blok marki na górze + dolny pasek (legal / kontakt / social / back-to-top).
- `minimal` — pierwsza kolumna jako kompaktowy rząd linków inline; pozostałe kolumny są zachowywane (ukryte). Słoty `column-1` + `bottom` lądują w dolnym pasku.

---

## 3. Tryby edytora — co zawierają (stan faktyczny)

W prawym panelu widoczne są **tylko dwie zakładki: „Visual" i „Advanced"**. Tryb
**Wizard** to osobny przepływ „setup" uruchamiany przyciskiem **„Run setup again"**
(panel pokazuje status „Setup complete · Daily edits live in Visual. Advanced is for
technical diagnostics."). Wizard kończy się przyciskiem **„Finish setup and open Visual"**,
który przełącza na zakładkę Visual.

### 3.1 Wizard („Starter footer")
Z założenia jest to **ekran seedująco-przeglądowy, niemal w całości read-only**:
- **Footer variant** — `Select` (jedyna interaktywna kontrolka; `ownership=action`).
- **Columns quick setup** → wiersz read-only „Visible columns" (np. „Company, Resources").
- Warunkowy tekst dla `minimal`: „Minimal footer reuses the first column links…".
- Statyczna podpowiedź: „Use Visual to edit brand logo/text, tagline, copyright…".
- **Social basics** → wiersz read-only „Show social links" (Enabled/Disabled) + licznik zapisanych profili.
- **Live preview** — podgląd przez współdzielony renderer, reaguje na zmianę wariantu.

Edycja treści (tytuły kolumn, linki, marka, legal, social) **nie jest możliwa w Wizard** — to celowy projekt (`writablePaths: []` w sekcji wizard).

### 3.2 Visual (pełna edycja)
Sekcje: **Variant and structure**, **Columns and links**, **Brand and legal**,
**Utility strip** (kontakt + back-to-top), **Social links and icon style**,
**Colors and borders**, **Typography and link styling**, **Layout and spacing**,
**Slots overview** (read-only). To główne miejsce codziennej edycji.

### 3.3 Advanced (wyłącznie diagnostyka)
Cztery sekcje **w 100% read-only**: **Runtime summary**, **Layout diagnostics**,
**Style diagnostics**, **Support summary**. Brak jakichkolwiek edytowalnych pól
footera, brak edytora JSON, brak przycisku normalizacji. Wartości są na żywo
powiązane z danymi widgetu (odzwierciedlają zmiany z Visual). Pod sekcjami footera
pojawia się jeszcze współdzielona „Block layout summary" (Content width / Padding),
która należy do wspólnych kontrolek bloku, nie do footera.

---

## 4. Co realnie przetestowano i DZIAŁA (Admin UI)

Wszystkie poniższe interakcje wykonano w sesji `claude-29-05-footer-v2` i potwierdzono
zmianę w podglądzie (canvas) przez inspekcję DOM (`eval`). **Każda przetestowana
kontrolka zadziałała poprawnie i natychmiast aktualizowała podgląd.**

### 4.1 Wizard
| Akcja | Wynik | Dowód |
|------|-------|-------|
| Zmiana wariantu `columns-2` → `columns-3` | Podsumowanie „Visible columns" → „Company, Resources, Product"; podgląd pokazał 3 kolumny | OK |
| Zmiana wariantu → `minimal` | „Visible columns" → „Company"; pojawił się warunkowy hint o minimal; live preview przeszedł na kompaktowy rząd inline | OK |
| Powrót do `columns-2` + „Finish setup and open Visual" | Przełączenie na zakładkę Visual | OK |

### 4.2 Visual — treść
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| Tytuł Kolumny 1 „Company" → „Firma" | `<h3>` zmienił się na „Firma" |
| Etykieta linku „About" → „O nas" | link w podglądzie = „O nas" |
| Reorder kolumn (Move right na Kol. 1) | kolejność nagłówków zmieniła się z `[Firma, Resources]` na `[Resources, Firma]` |
| Wybór strony w „Link destination" (page-picker → „HomePage") | `href` linku zmienił się na `/homepage` |
| Brand name „Coderso Inc" + Tagline „Buduj pewnie" | blok marki pojawił się w podglądzie; `<footer>` zyskał `aria-labelledby`, a `aria-label` zniknął |

### 4.3 Visual — Utility strip / Legal
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| Copyright → „© 2026 Coderso Sp. z o.o." | tekst widoczny w dolnym pasku |
| Address → „ul. Testowa 1, Warszawa" | wyrenderowany `<address>` |
| Phone → „+48 22 555 0100" | link `tel:+48225550100` (spacje/znaki usunięte, same cyfry) |
| Email → „kontakt@coderso.dev" | link `mailto:kontakt@coderso.dev` |
| Toggle „Show back-to-top action" = ON | `<a href="#top" data-footer-back-to-top>` |
| Back-to-top label → „Wróć na górę" | tekst linku = „Wróć na górę" |

### 4.4 Visual — Social
| Akcja | Wynik (DOM podglądu) |
|------|----------------------|
| Toggle „Show social links" = OFF | lista `ul[aria-label="Footer social links"]` zniknęła |
| Ten sam toggle = ON | lista wróciła |
| Profile name (X) „coderso" → „coderso-test" | `href` = `https://x.com/coderso-test`, `target="_blank"`, `aria-label="X (opens in new tab)"` |
| Platforma X → GitHub | `href` przebudowany na `https://github.com/coderso-test`, etykieta „GitHub (opens in new tab)" — handle zachowany przy zmianie platformy |

### 4.5 Visual — Colors / Typography / Layout
| Akcja | Wynik (DOM/CSS podglądu) |
|------|---------------------------|
| Surface color (swatch) → `#fef9c3` | `footer.style.backgroundColor = rgb(254, 249, 195)` |
| Surface color → przycisk **Clear** | inline `backgroundColor` usunięty (powrót do motywu) |
| Top border width `1px` → `3px` | `footer.style.borderTopWidth = 3px` |
| Heading transform `Uppercase` → `Capitalize` | klasa `<h3>` = `... capitalize` |
| Columns alignment `Left` → `Center` | klasa kolumny = `space-y-3 text-center` |
| Max width `6xl` → `7xl` | klasa kontenera = `mx-auto w-full max-w-7xl` |
| Variant select w Visual → `columns-3` | 3 nagłówki `[Resources, Firma, Product]`, siatka `md:grid-cols-3` (zachowany wcześniejszy reorder kolumn) |

### 4.6 Advanced
- Wszystkie wiersze diagnostyczne **poprawnie odzwierciedliły** wprowadzone w Visual zmiany:
  Variant „Columns 3", „3 stored columns", „2 links", Legal „Visible", Back to top „Enabled",
  Columns alignment „Center", Max width „7xl", Top border width „3px", Heading transform „Capitalize",
  Surface color „Theme default" (po Clear). Brak edytowalnych pól — zgodnie z projektem.

**Konsola admina:** 0 błędów, 0 ostrzeżeń podczas całej sesji.

---

## 5. Czego NIE przetestowano (uczciwe zastrzeżenia)

Poniższe kontrolki są obecne w UI, ale **nie zostały kliknięte/zmienione** w tej sesji —
nie mogę więc potwierdzić ich działania empirycznie (choć w kodzie wyglądają poprawnie):

- **Brand → Logo image** (MediaPicker) — nie wybrano realnego medium; nie sprawdzono `logoAlt`.
- **Legal:** toggle „Show legal strip", pola Privacy/Terms **label**, **destination** (page-picker) oraz **link target** (`_self`/`_blank`).
- **Columns/links:** przyciski **Add link**, **Remove**, reorder linków **Move up/down** w obrębie kolumny, **Add social**/**Remove social**, „Clear destination", „Clear saved destination" (amber), oraz select **Link target** per link.
- **Typography:** Font size, Link font weight, Link letter spacing, Link underline (przetestowano tylko Heading transform); Link hover/active color (swatche).
- **Pozostałe kolory:** Border/Text/Heading/Link/Legal/Social color (przetestowano tylko Surface + jego Clear).
- **Layout:** Legal row alignment, Column gap, Horizontal padding, Column breakpoint, Section padding.
- **Sloty zagnieżdżone** (Column 1–3, Bottom Strip) — nie wstawiano widgetów do slotów; nie testowano przenoszenia payloadu slotu wraz z reorderem kolumn.
- **Front: wariant `minimal`** — na trasie publicznej opublikowany jest `columns-3`; minimal widziałem tylko w podglądzie admina (Wizard live preview), nie na froncie.
- **Persystencja po publikacji** — **nie publikowałem** strony (patrz §6). Zmiany draftowe nie zostały utrwalone na froncie.

---

## 6. Testy na froncie (trasa publiczna)

> **URL:** http://localhost:3000/test-footer-widget-0516 · **Data:** 2026-05-29

**Ważne:** trasa publiczna renderuje **opublikowaną** wersję strony, niezależną od moich
edycji draftowych w adminie (świadomie **nie** klikałem „Publish"). Przy próbie opuszczenia
admina pojawił się dialog `beforeunload` (potwierdza śledzenie „brudnego" draftu) — został
zaakceptowany, więc edycje draftowe zostały porzucone. Front pokazuje zatem **wcześniej
opublikowany fixture**, nie wynik moich zmian.

### 6.1 Wyrenderowany footer (opublikowany stan)
- Wariant: **`columns-3`** — nagłówki: `Company`, `Resources`, `Product`.
- Linki kolumn renderowane jako relatywne `<a href="/about">`, `/careers`, `/blog`, `/support`, `/features`, `/pricing` — bez `target`/`rel` (linki wewnętrzne).
- Legal: `Privacy` → `/privacy`, `Terms` → `/terms`.
- Social: `Twitter` → `https://twitter.com`, `LinkedIn` → `https://linkedin.com`, oba z **`target="_blank"` i `rel="noopener noreferrer"`** oraz `aria-label` „… (opens in new tab)" — 2 ikony SVG wyrenderowane.
- `<footer>` z `aria-label="Site footer"` (brak tekstu marki w opublikowanej wersji → brak `aria-labelledby`).
- Klasy: `border-t px-6 py-10 text-sm`, kontener `mx-auto w-full max-w-6xl`, siatka `grid w-full gap-6 md:grid-cols-3`, `borderTopWidth: 1px`, tło `var(--color-bg)`.
- **Brak** sekcji kontakt, brak back-to-top, brak bloku marki (zgodnie z opublikowanymi danymi).

### 6.2 Responsywność
- **1280px:** 3 kolumny obok siebie (`md:grid-cols-3`).
- **375px (mobile):** siatka redukuje się do jednej kolumny (`grid-template-columns` ≈ jedna kolumna o szer. ~327px); kolumny stackują się pionowo. Poprawne zachowanie — `md:grid-cols-3` aktywuje się dopiero od breakpointu `md`.

**Konsola frontu:** 0 błędów, 0 ostrzeżeń.

---

## 7. Admin Preview vs Frontend — zgodność

| Aspekt | Admin (podgląd) | Frontend (publish) | Uwaga |
|--------|-----------------|--------------------|-------|
| Element `<footer>` semantyczny | ✓ | ✓ | zgodne |
| `aria-label` / `aria-labelledby` zależne od marki | ✓ (po dodaniu marki → `aria-labelledby`) | ✓ (`aria-label="Site footer"`, brak marki) | zgodne z logiką renderera |
| Linki kolumn (relatywne, bez target) | ✓ | ✓ | zgodne |
| Social: `target=_blank` + `rel=noopener noreferrer` + a11y label | ✓ | ✓ | zgodne, poprawne bezpieczeństwo |
| `tel:` / `mailto:` z kontaktu | ✓ (przetestowane w adminie) | n/d (brak kontaktu w opublikowanym fixture) | nie do porównania na froncie |
| Siatka kolumn / responsywność | ✓ | ✓ | zgodne |

**Wniosek:** renderer jest wspólny dla admina i frontu — to, co potwierdziłem w podglądzie
admina (linki, social `target/rel`, `tel:`/`mailto:`, siatka), jest spójne z zachowaniem
frontu. Różnice w treści (np. brak kontaktu/marki na froncie) wynikają wyłącznie z innych
**opublikowanych** danych, nie z rozbieżności rendererów.

---

## 8. Niuanse UX/UI (obserwacje)

1. **Wizard jest praktycznie read-only** — poza selectem wariantu wszystko to wiersze
   podsumowań kierujące do Visual. Komunikaty są jasne („Edit … in Visual"), więc jest to
   raczej świadoma decyzja niż błąd, ale użytkownik szukający szybkiej edycji treści
   w „kreatorze" niczego tam nie zmieni.

2. **„Link destination" to PAGE-PICKER, nie pole tekstowe URL.** Zaseedowane ścieżki
   (`/about`, `/blog`…) są pokazywane jako **„Saved custom destination"** z trwałym
   ostrzeżeniem: „A custom destination is already configured. Choose a site page to replace
   it or clear the destination.". Lista oferuje istniejące strony serwisu + „No destination".
   Konsekwencja: **autorowanie dowolnych zewnętrznych URL-i dla linków kolumn standardową
   kontrolką jest nieoczywiste** — można wybrać stronę wewnętrzną albo wyczyścić. Zapisana
   wartość „custom" jest jednak zachowywana i renderowana (np. `/about` działa na froncie),
   a przycisk „Clear destination" pozwala ją usunąć.

3. **Tekst marki pełni rolę dostępnej nazwy footera** — `aria-labelledby` gdy obecny,
   inaczej `aria-label="Site footer"`. Dobry, spójny wzorzec.

4. **Pola social są „platform-aware":** wpisuje się tylko handle/nazwę profilu, a edytor
   buduje bezpieczny, kanoniczny URL. Zmiana platformy zachowuje handle i przebudowuje URL.
   Typ `custom` przełącza się na page-picker + osobne pole „Accessible label". Gdy zapisany
   jest niestandardowy `href`, którego nie da się sparsować na handle, pojawia się amber
   z przyciskiem „Clear saved destination".

5. **Kontrolki koloru używają swatchy z przyciskiem „Clear"**, który jest **disabled** gdy
   brak wartości (etykieta „Theme default"), a aktywny gdy ustawiono kolor (etykieta
   „Selected color"). Semantyka czyszczenia jest spójna we **wszystkich** polach koloru —
   w przeciwieństwie do starszego widgetu Contact, gdzie `borderColor` nie miał Clear.

6. **Advanced jest „chudy, ale uczciwy"** — wyłącznie diagnostyka odzwierciedlająca stan
   na żywo, bez edytora JSON i bez przycisku normalizacji. Dla power-usera brak tu narzędzi
   edycji surowych danych; z drugiej strony nie ma mylących duplikatów kontrolek.

7. **Reorder kolumn jest „live-only"** (przez `onBlockPatch`), aby payloady slotów
   przesuwały się razem z widocznymi kolumnami — sekcja zawiera o tym wyraźną notkę. Przyciski
   Move left/right są aktywne tylko gdy widocznych kolumn > 1.

8. **Wariant `minimal`** reużywa linków pierwszej kolumny jako rzędu inline, a pozostałe
   kolumny zachowuje (ukryte) — komunikowane zarówno w Wizard (hint), jak i w Visual (notka).

9. **Guard `beforeunload`** uruchamia się przy wyjściu z niezapisanym draftem — potwierdza
   istnienie śledzenia zmian; trzeba świadomie potwierdzić opuszczenie strony.

---

## 9. Co NIE działa / błędy

W zakresie tego, co **faktycznie przetestowałem**, **nie znalazłem żadnej zepsutej ani
mylącej kontrolki** — każda interakcja z §4 działała i natychmiast aktualizowała podgląd,
a tryb Advanced wiernie odzwierciedlał stan. Brak błędów i ostrzeżeń w konsoli (admin i front).

Nie zgłaszam żadnego błędu funkcjonalnego. Jedyne zastrzeżenia mają charakter **UX**
(§8), w szczególności: page-picker zamiast pola URL dla linków kolumn (pkt 2) oraz
de facto read-only charakter Wizarda (pkt 1). Lista nieprzetestowanych kontrolek — §5.

---

## 10. Podsumowanie

| Kategoria | Obserwacja |
|-----------|------------|
| Tryby edytora | Wizard (setup/przegląd, edytowalny tylko wariant), Visual (pełna edycja), Advanced (tylko diagnostyka) |
| Przetestowane kontrolki | 20+ interakcji w Wizard i Visual — **wszystkie działają** |
| Błędy funkcjonalne | **0** (w zakresie przetestowanym) |
| Błędy/ostrzeżenia konsoli | **0** (admin i front) |
| Dostępność | dobra: semantyczny `<footer>`, `aria-labelledby`/`aria-label`, `rel=noopener` na linkach zewn., a11y labels social, `<address>` dla kontaktu |
| Główne niuanse UX | page-picker zamiast URL dla linków; Wizard niemal read-only; Advanced bez edycji surowych danych |
| Front vs Admin | spójne (wspólny renderer); różnice treści wynikają z innych opublikowanych danych |
| Nieprzetestowane | media logo, część selectów typografii/layoutu/legalu, sloty, minimal na froncie, persystencja po publikacji (nie publikowano) |
