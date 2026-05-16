# RAPORT: Rich Text Section Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #24 (Rich Text Section Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** RichTextSectionTest (`/richtextsectiontest`) — UUID: `959ee78b-c8b0-4339-ac45-a7766edf95d0`

---

## 1. Przegląd widgetu

**Typ:** Composite  
**Moduł:** Content  
**Audience:** Beginner  
**Warianty:** `single-column`, `two-column`, `article`  
**Maks. bloków:** 20  
**Min. bloków:** 0

Rich Text Section to widget do prezentacji długich treści edytorskich (long-form copy) z bezpiecznym renderowaniem HTML i kontrolą typografii. Obsługuje trzy tryby output (`html`, `blocks-fallback`, `blocks`), opcjonalny spis treści (TOC) generowany automatycznie z nagłówków H2/H3/H4, dropcap dla pierwszego akapitu, oraz rozbudowane opcje stylistyczne.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola | Typ |
|--------|------|-----|
| **titleBlock** | `eyebrow`, `title` | `string` |
| **body** | `html` | `string` (sanitized HTML) |
| **body** | `blocks[]` | `{ id, heading, content }` — max 20 |
| **options** | `dropcap` | `boolean` |
| **options** | `toc` | `boolean` |
| **options** | `maxWidth` | `"md" \| "lg" \| "xl" \| "full"` |
| **options** | `outputMode` | `"html" \| "blocks-fallback" \| "blocks"` |
| **style** | `fontScale` | `"none" \| "sm" \| "md" \| "lg"` |
| **style** | `lineHeight` | `"none" \| "tight" \| "normal" \| "relaxed"` |
| **style** | `textColor` | `string` (CSS var lub hex) |
| **style** | `background` | `string` (clearable) |
| **style** | `spacing` | `"none" \| "sm" \| "md" \| "lg"` |

### 2.2 Warianty

| Wariant | Opis | CSS Layout |
|---------|------|------------|
| `single-column` | Domyślna kolumna | `space-y-6` (TOC + content) |
| `two-column` | Podział 1/3 TOC + 2/3 treść | `grid-cols-1 gap-6 lg:grid-cols-3` |
| `article` | Narracyjna prezentacja edytorska | `mx-auto max-w-3xl space-y-6` (hardkodowane!) |

### 2.3 Mapy CSS klas

| Token | Wartości | Klasy Tailwind |
|-------|---------|----------------|
| **fontScale** | none / sm / md / lg | `` / `text-sm` / `text-base` / `text-lg` |
| **lineHeight** | none / tight / normal / relaxed | `` / `leading-6` / `leading-7` / `leading-8` |
| **spacing** | none / sm / md / lg | `space-y-0` / `space-y-4` / `space-y-6` / `space-y-8` |
| **maxWidth** | md / lg / xl / full | `max-w-3xl` / `max-w-4xl` / `max-w-5xl` / `max-w-none` |

### 2.4 Dozwolone tagi HTML (allowlist)

`p`, `br`, `strong`, `em`, `u`, `s`, `a`, `ul`, `ol`, `li`, `blockquote`, `code`, `pre`, `h2`, `h3`, `h4`, `hr`, `span`

**Uwaga:** Tag `<h1>` oraz `<img>` są poza allowlistem — brak wsparcia obrazów inline i głównych nagłówków.

### 2.5 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Variant dropdown, eyebrow, title, 2 bloki (heading + textarea) — zawsze ustawia `outputMode: "blocks"` |
| **Visual** | VariantCards, maxWidth, eyebrow+title, HTML body textarea, structured blocks (count select + add/remove/move), dropcap switch, TOC switch, typografia (fontScale/lineHeight/spacing/textColor/background) |
| **Advanced** | Output mode selector, font scale token, line height token, spacing token, Normalize now, Reset to defaults, Raw JSON snapshot |

### 2.6 Logika outputMode

| Mode | Zachowanie |
|------|-----------|
| `html` | Renderuje zawsze `body.html` |
| `blocks-fallback` | Renderuje `body.html` jeśli niepuste, wpp. `blocks` (default) |
| `blocks` | Renderuje zawsze z `blocks[]` — Wizard ustawia to automatychmicznie |

---

## 3. Zidentyfikowane problemy UX z analizy kodu (przed testami)

### KOD-01: Brak wizualnego wyróżnienia aktywnego outputMode w Visual Editor

**Opis:** W Visual Editor HTML body textarea i structured blocks są oba widoczne niezależnie od `outputMode`. Użytkownik nie ma żadnego wskazania wizualnego, który z nich faktycznie będzie renderowany. Sekcja HTML body i bloki są równorzędne bez żadnego info, że dla `outputMode: "blocks-fallback"` HTML ma priorytet.

**Priorytet:** Wysoki (UX)

---

### KOD-02: Wizard wymusza outputMode na "blocks" — cichy reset ✗ POTWIERDZONY

**Opis:** Funkcja `updateWizardBlock` zawsze ustawia `outputMode: "blocks"` przy każdej edycji w Wizard. Jeśli użytkownik wcześniej ustawił `html` lub `blocks-fallback` w Advanced/Visual, przełączenie na Wizard i edycja dowolnego bloku resetuje outputMode. Brak ostrzeżenia.

**Potwierdzenie w testach:** Po edycji dwóch bloków w Wizard editor, Advanced tab pokazał `outputMode: "Blocks only"` zamiast domyślnego `"HTML with blocks fallback"`.

**Priorytet:** Wysoki (UX + Bug potencjalny)

---

### KOD-03: Blocks count=0 usuwa wszystkie bloki bez potwierdzenia ✗ POTWIERDZONY

**Opis:** W Visual Editor dropdown "Blocks count" zmiana na "0" natychmiastowo usuwa wszystkie bloki bez żadnego dialogu confirm. Brak undo w edytorze.

**Potwierdzenie w testach:** Wybranie "0" w dropdownie natychmiast usunęło oba istniejące bloki — żaden dialog confirm nie pojawił się.

**Priorytet:** Średni (UX risk — destruktywna akcja bez odwołania)

---

### KOD-04: Remove block bez dialog potwierdzenia ✗ POTWIERDZONY

**Opis:** Przycisk "Remove" w edytorze bloków usuwa blok natychmiastowo bez dialog confirm. Dla długich bloków z treścią — ryzyko utraty danych.

**Potwierdzenie w testach:** Kliknięcie "Remove" na bloku z treścią ("Blok testowy - długi heading z ważną treścią") — blok zniknął natychmiast bez pytania o potwierdzenie.

**Priorytet:** Średni (UX)

---

### KOD-05: Dropcap — precyzacja zachowania ✓ DZIAŁA, ale nieintuicyjne

**Opis:** Dropcap CSS (`[&>p:first-of-type:first-letter]`) działa na pierwszym bezpośrednim dziecku `<p>` w body div. Nawet gdy treść zaczyna się od `<h2>`, dropcap poprawnie aplikuje się do pierwszego `<p>`. Jednak:
- Edytor nie pokazuje podglądu dropcap w panelu
- Brak opisu co się stanie gdy HTML nie ma żadnego `<p>` (dropcap nie pojawi się w ogóle — zero feedbacku)

**Potwierdzenie w testach:** Dropcap działa poprawnie gdy HTML zaczyna się od H2 (CSS `> p:first-of-type` nadal trafia pierwszego `<p>`). Klasy dropcap widoczne w body div na froncie.

**Priorytet:** Niski (UX informacyjny)

---

### KOD-06: TOC przy outputMode=blocks — DZIAŁA POPRAWNIE ✓ NIE BUG

**Opis:** TOC generowany jest przez `injectHeadingAnchors(sanitizedHtml)`. Gdy `outputMode: "blocks"` — bloki renderowane są przez `renderBlocksAsHtml()` który produkuje `<h3>` tagi z headingów bloków. Następnie `injectHeadingAnchors` przetwarza te `<h3>` i tworzy TOC entries.

**Potwierdzenie w testach:** Przy domyślnym `outputMode: "blocks-fallback"` z niepustym HTML — TOC generuje linki do H2 i H3 z HTML body (`#clear-structure-for-readable-content`, `#what-works-best`). TOC anchor links działają (scroll do nagłówka). Brak buga.

**Uwaga UX:** Wszystkie bloki renderują wyłącznie jako `<h3>` w TOC (brak hierarchii h2/h3/h4 w structured blocks).

**Priorytet:** Niski (UX informacyjny — ograniczenie, nie bug)

---

### KOD-07: Brak wariantu w Advanced Editor

**Opis:** Advanced Editor nie wyświetla wariantu ani opcji jego zmiany. Zmiana wariantu jest możliwa tylko przez Visual Editor (VariantCards). Użytkownicy zaawansowani mogą oczekiwać kontroli wariantu w Advanced.

**Priorytet:** Niski (UX)

---

### KOD-08: maxWidth ignorowane w wariancie "article" ✗ POTWIERDZONY BUG

**Opis:** Wariant `article` hardkoduje `max-w-3xl` na wewnętrznym elemencie `<article>` niezależnie od ustawienia `options.maxWidth`. Zewnętrzny kontener (`div`) RESPEKTUJE maxWidth (np. `max-w-none` dla "full"), ale `<article>` wewnątrz zawsze ma `mx-auto w-full max-w-3xl space-y-6`.

**Potwierdzenie w testach:**
- `data-rich-text-max-width="full"` ustawiony w DOM → zewnętrzny div: `mx-auto w-full max-w-none` ✓
- Wewnętrzny `<article>`: `mx-auto w-full max-w-3xl space-y-6` ✗ (hardkodowane)
- Zmiana maxWidth na XL/Full w edytorze nie zmienia wizualnie szerokości artykułu

**Priorytet:** Wysoki (Bug — myląca konfiguracja, ustawienie max-width jest nieefektywne)

---

### KOD-09: titleBlock.title renderowany jako `<h3>` ✗ POTWIERDZONY

**Opis:** `titleBlock.title` renderowany jest jako `<h3>` (nie h1/h2). Dla strony artykułu gdzie ten widget jest główną treścią — semantyka SEO niepoprawna. Brak możliwości wyboru poziomu nagłówka sekcji tytułowej.

**Potwierdzenie w testach (frontend):** `document.querySelector('[data-rich-text-variant] header')` zwrócił:
```html
<p class="...">Editorial</p>
<h3 class="text-3xl font-semibold text-[var(--color-text)]">Long-form content section</h3>
```
Title = `<h3>` zamiast `<h1>` lub `<h2>`.

**Priorytet:** Średni (SEO/Accessibility)

---

### KOD-10: textColor — brak clear button (niespójność z background) ✗ POTWIERDZONY

**Opis:** `ColorField` dla `textColor` nie posiada `onClear` — w odróżnieniu od `background` który ma. Nie można zresetować textColor do wartości domyślnej `var(--color-text)` bez ręcznego wpisania lub "Normalize now" w Advanced.

**Potwierdzenie w testach:** Visual Editor pokazuje:
- Text color: color picker + text input → **brak "Clear" button**
- Background color: color picker + text input + **"Clear" button** ✓

**Priorytet:** Średni (UX niespójność)

---

### KOD-11: Brak wsparcia dla `<img>` w HTML — brak komunikatu

**Opis:** Tag `<img>` jest poza allowlistem sanitizera — zostanie usunięty z HTML bez ostrzeżenia. Użytkownik wklejający HTML ze zdjęciami nie dostanie żadnego feedback'u o usunięciu obrazów.

**Priorytet:** Średni (UX informacyjny)

---

### KOD-12: Brak `<h1>` w allowliście HTML

**Opis:** Allowlista HTML zawiera h2/h3/h4, ale nie h1. Treść z h1 zostanie usunięta. To poprawne z perspektywy hierarchii (h1 = strona), ale brak komunikatu dla użytkownika.

**Priorytet:** Niski (informacyjny)

---

### KOD-13: Brak image upload / media picker dla body content

**Opis:** Widget oferuje tylko czysty HTML bez żadnego wsparcia dla wstawiania obrazów, attachmentów czy embedów (video, iframes). Dla długich treści edytorskich — brak inline media jest istotnym ograniczeniem.

**Priorytet:** Wysoki (brak funkcjonalności)

---

### KOD-14: Brak rich text editor (WYSIWYG) dla HTML body

**Opis:** HTML body to zwykła `<Textarea>` — użytkownik musi wpisywać surowy HTML ręcznie. Brak WYSIWYG editor (np. Tiptap, Slate, Quill). Znacząco obniża UX dla użytkownika "beginner" który jest target audience tego widgetu (`audience: "beginner"`).

**Priorytet:** Krytyczny (brak kluczowej funkcjonalności dla target audience)

---

### KOD-15: block.content to plain text bez formatowania

**Opis:** Pole `block.content` w structured blocks to zwykły textarea z plain textem. `renderBlocksAsHtml` konwertuje `\n` na `<br />` ale nie obsługuje formatowania (bold, italic, listy). Bloki są więc znacznie uboższe funkcjonalnie od HTML body.

**Priorytet:** Wysoki (brak funkcjonalności)

---

### KOD-16: Brak paginacji / collapse przy 20 blokach w Visual Editor

**Opis:** Przy maksymalnej liczbie 20 bloków Visual Editor wyświetla je wszystkie w jednej długiej liście bez grupowania, paginacji ani collapse. Interfejs staje się bardzo nieprzejrzysty.

**Priorytet:** Średni (UX skalowalność)

---

## 4. Wyniki testów Playwright — Admin UI (localhost:5173)

### 4.1 Warianty

| Test | Wynik |
|------|-------|
| Dodanie widgetu Rich Text Section do strony | ✓ Działa — widget dostępny w panelu pod "Rich Text" w wyszukiwarce |
| Przełączenie wariantu single-column → two-column → article | ✓ Działa — VariantCards przełączają wariant, badge "Selected"/"Pick" aktualizuje się |
| maxWidth zmiana MD→LG→XL→FULL | ✓ Działa — zewnętrzny kontener aplikuje poprawną klasę maxWidth |
| maxWidth w wariancie "article" (KOD-08) | ✗ BUG — zewnętrzny div aktualizuje maxWidth, ale wewnętrzny `<article>` ma hardkodowane `max-w-3xl` |

### 4.2 Editor Wizard

| Test | Wynik |
|------|-------|
| Variant dropdown (Single/Two/Article) | ✓ Działa |
| Eyebrow edycja | ✓ Działa — live update widoczny w preview |
| Title edycja | ✓ Działa — live update widoczny w preview |
| Block 1 heading + content | ✓ Działa |
| Block 2 heading + content | ✓ Działa |
| outputMode po edycji w Wizard = "blocks" (KOD-02) | ✗ POTWIERDZONE — Advanced pokazuje "Blocks only" po edycji w Wizard |
| "Continue to layout and styling" przycisk | ✓ Działa — przenosi do Visual editora i dodaje zakładki Wizard/Visual/Advanced |

### 4.3 Editor Visual

| Test | Wynik |
|------|-------|
| VariantCards — Single/Two/Article ze wskaźnikiem Selected/Pick | ✓ Działa |
| HTML body textarea widoczna niezależnie od outputMode | ✓ Widoczna — brak wskazania które źródło jest aktywne (KOD-01) |
| Blocks count dropdown 0→2 | ✓ Działa — ale zmiana na 0 bez confirm (KOD-03) |
| Add fallback block | ✓ Działa — dodaje blok z domyślnym "Heading N" + "Paragraph content." |
| Remove block | ✓ Działa — **bez dialog confirm (KOD-04)** |
| Move up / Move down | ✓ Działa — disabled na krańcowych pozycjach |
| Dropcap switch | ✓ Działa — CSS klasy dropcap aplikowane na body div |
| TOC switch | ✓ Działa — TOC `<nav>` pojawia się w preview z linkami do H2/H3 z HTML body |
| Font scale dropdown | ✓ Działa |
| Line height dropdown | ✓ Działa |
| Spacing density dropdown | ✓ Działa |
| Text color picker + input | ✓ Działa — ale **brak clear button (KOD-10)** |
| Background color picker + input + clear | ✓ Działa — clear button usuwa background |

### 4.4 Editor Advanced

| Test | Wynik |
|------|-------|
| Output mode selector (html/blocks-fallback/blocks) | ✓ Działa — zmiany widoczne w raw JSON |
| Font scale token | ✓ Działa (duplikuje Visual) |
| Line height token | ✓ Działa (duplikuje Visual) |
| Spacing token | ✓ Działa (duplikuje Visual) |
| "Current structured fallback block count:" | ✓ Działa — aktualizuje się na bieżąco |
| Normalize now button | ✓ Działa — normalizuje dane do wartości domyślnych |
| Reset to defaults button | ✓ Działa — reset do pełnych defaults |
| Raw payload snapshot | ✓ Działa — JSON formatowany, czytelny |
| Brak wariantu w Advanced (KOD-07) | ✗ POTWIERDZONY — variant nie jest dostępny w Advanced |

### 4.5 Funkcje specjalne

| Test | Wynik |
|------|-------|
| TOC generowany z H2/H3/H4 w HTML body | ✓ Działa — TOC Items z anchors `#slugified-heading` |
| TOC w wariancie two-column — lewa kolumna 1/3 | ✓ Działa — TOC renderuje w col-span-1, treść w col-span-2 |
| TOC przy outputMode=blocks (bloki → H3 → TOC) | ✓ Działa — bloki renderują H3 które trafiają do TOC (KOD-06 nie jest bugiem) |
| TOC brak items przy braku H2/H3/H4 | ✓ Działa — TOC hidden gdy tocItems.length=0 |
| Dropcap przy treści zaczynającej się od H2 | ✓ Działa — dropcap CSS trafia do pierwszego `<p>` (nie pierwszego elementu) |
| HTML sanitizacja widoczna w textarea | ✓ Widoczna w JSON snapshot — sanitized HTML zachowany |

---

## 5. Wyniki testów Playwright — Frontend (localhost:3000)

### 5.1 Tabela porównawcza Admin ↔ Frontend

| Funkcja | Admin Preview | Frontend | Zgodność |
|---------|--------------|----------|----------|
| Wariant single-column | ✓ | ✓ | ✓ Pełna zgodność |
| Wariant two-column (1/3 + 2/3) | ✓ | ✓ | ✓ Pełna zgodność |
| Wariant article (`max-w-3xl`) | ✓ | ✓ | ✓ Zgodność (bug maxWidth równy w obu) |
| TOC `<nav>` z linkami | ✓ | ✓ | ✓ Pełna zgodność |
| TOC anchor links (scroll) | ✓ | ✓ | ✓ Działa — URL zmienia się na `#id` |
| Dropcap CSS klasy | ✓ | ✓ | ✓ Pełna zgodność |
| maxWidth token | ✓ | ✓ | ✓ Zgodność (oba mają bug dla article) |
| fontScale / lineHeight / spacing | ✓ | ✓ | ✓ Pełna zgodność |
| textColor inline style | ✓ | ✓ | ✓ Pełna zgodność |
| titleBlock.title jako `<h3>` | ✓ | ✓ | ✓ Zgodność (błąd semantyczny w obu) |
| HTML body sanitized rendering | ✓ | ✓ | ✓ Pełna zgodność |
| `data-rich-text-*` atrybuty | ✓ | ✓ | ✓ Pełna zgodność |

### 5.2 Obserwacje z testów frontend

**Frontend URL:** http://localhost:3000/richtextsectiontest

**Wyniki weryfikacji atrybutów DOM (frontend):**
```json
{
  "variant": "two-column",
  "maxWidth": "lg",
  "fontScale": "md",
  "lineHeight": "normal",
  "spacing": "md",
  "dropcap": "false",
  "toc": "true",
  "tocCount": "2",
  "outputMode": "blocks-fallback"
}
```

**HTML body rendered (frontend):** outputMode=blocks-fallback + niepusty HTML → renderuje HTML z injected anchors:
- `<h2 id="clear-structure-for-readable-content">` ✓
- `<h3 id="what-works-best">` ✓
- Paragraphs, lists poprawnie renderowane ✓

**TOC frontend:**
- TOC `<nav>` z `aria-label="Table of contents"` ✓
- Linki: `href="#clear-structure-for-readable-content"`, `href="#what-works-best"` ✓
- Kliknięcie linka → URL zmienia się na `#heading`, scroll do nagłówka ✓

**Responsywność mobile (375px):**
- Single-column: treść bez grid ✓
- Two-column: przy mobile (< lg) layout jest `grid-cols-1` → TOC i treść w jednej kolumnie ✓

**Braki na froncie:**
- Brak `focus-visible` styles na linkach TOC — kliknięcie Tab i focus nie pokazuje widocznego outline'u (WCAG 2.4.7)

---

## 6. Problemy dostępności (Accessibility)

| Problem | Kategoria WCAG | Status | Priorytet |
|---------|----------------|--------|-----------|
| `titleBlock.title` renderowany jako `<h3>` zamiast h1/h2 | 1.3.1 Info and Relationships | ✗ Potwierdzony | Średni |
| Brak `aria-label` lub `aria-labelledby` na `<section>` głównym | 1.3.1 | ✗ Potwierdzony | Niski |
| Brak `focus-visible` styles na linkach TOC | 2.4.7 Focus Visible | ✗ Potwierdzony na froncie | Średni |
| TOC `<nav>` ma `aria-label="Table of contents"` | — | ✓ OK | — |
| Dropcap `::first-letter` — nie wpływa na screen-readery | — | ✓ OK | — |
| `<a>` z `target="_blank"` — auto `rel="noopener noreferrer"` | 3.2.5 | ✓ OK | — |

---

## 7. Testy Playwright — Szczegółowe obserwacje Admin UI

### 7.1 Wizard Editor — UX flow

Wizard pokazuje uproszczony widok: variant dropdown (combobox), eyebrow/title inputs, 2 bloki (heading + textarea). Przycisk "Continue to layout and styling" otwiera pełny edytor z zakładkami Wizard/Visual/Advanced.

**Problem UX:** Wizard ma combobox dla wariantu zamiast VariantCards — inne doświadczenie niż Visual. Użytkownik który przechodzi Wizard→Visual widzi inne UI dla tej samej opcji.

### 7.2 Visual Editor — sekcja "Structured fallback blocks"

Dropdown "Blocks count" (0–20) + "Add fallback block" button działają jednocześnie. Są dwoma sposobami na dodawanie/usuwanie bloków co może być mylące:
- Dropdown natychmiastowo truncuje/dodaje bloki (destruktywnie przy zmniejszaniu)
- Button "Add fallback block" — bezpieczna, incremental akcja

### 7.3 Advanced Editor — duplikacja typografii

Sekcja "Technical typography tokens" w Advanced duplikuje dokładnie te same opcje (font scale, line height, spacing) co Visual. Nie ma żadnej różnicy w funkcjonalności — tylko etykiety są nieco inne ("Font scale" vs "Font scale token"). Wprowadza to dezorientację: użytkownik nie wie dlaczego te same opcje są w obu miejscach.

---

## 8. Testy Playwright — Frontend

### 8.1 Porównanie admin preview vs frontend

Admin preview i frontend renderują widget identycznie. Nie znaleziono rozbieżności między admin preview a frontem — wszystkie atrybuty `data-rich-text-*` i CSS klasy są zgodne.

### 8.2 outputMode "blocks-fallback" — priorytet HTML

Przy `outputMode: "blocks-fallback"`:
- Jeśli `body.html` nie jest pusty → renderuje HTML body (potwierdzone)
- Bloki są fallback gdy HTML jest pusty — mechanizm działa poprawnie

### 8.3 TOC anchor scroll na froncie

TOC linki używają `href="#slug"` gdzie slug jest generowany przez `slugifyHeading()` ze slugów nagłówków. Kliknięcie linku → URL zmienia się → scroll do nagłówka z `id`. Działa poprawnie i przewidywalnie.

---

## 9. Podsumowanie — macierz priorytetów

### Krytyczne — naprawić natychmiast

| ID | Problem | Typ |
|----|---------|-----|
| KOD-14 | Brak WYSIWYG editora dla HTML body — textarea dla beginnerów jest nie do przyjęcia | Brak funkcjonalności |

### Wysokie — pilne ulepszenia

| ID | Problem | Typ | Status testu |
|----|---------|-----|-------------|
| KOD-01 | Brak wskazania które pole (HTML/blocks) jest aktywne przy danym outputMode | UX | Potwierdzony |
| KOD-02 | Wizard resetuje outputMode do "blocks" bez ostrzeżenia | Bug UX | ✗ Potwierdzony |
| KOD-08 | maxWidth ignorowane w wewnętrznym `<article>` w wariancie "article" | Bug | ✗ Potwierdzony |
| KOD-13 | Brak media/image support w body content | Brak funkcjonalności | Kod |
| KOD-15 | block.content to plain text — brak formatowania rich text | Brak funkcjonalności | Kod |

### Średnie — planowe ulepszenia

| ID | Problem | Typ | Status testu |
|----|---------|-----|-------------|
| KOD-03 | Blocks count=0 usuwa wszystkie bloki bez confirm | UX risk | ✗ Potwierdzony |
| KOD-04 | Remove block bez confirm dialog | UX | ✗ Potwierdzony |
| KOD-09 | title renderowany jako h3 — semantyka SEO | SEO/a11y | ✗ Potwierdzony |
| KOD-10 | Brak clear button dla textColor (niespójność z background) | UX niespójność | ✗ Potwierdzony |
| KOD-11 | Brak komunikatu o usunięciu `<img>` przez sanitizer | UX informacyjny | Kod |
| KOD-16 | Brak collapse/pagination przy 20 blokach w Visual Editor | UX skalowalność | Kod |
| A11Y-01 | Brak focus-visible na linkach TOC (WCAG 2.4.7) | Accessibility | ✗ Potwierdzony |

### Niskie — do rozważenia

| ID | Problem | Typ | Status testu |
|----|---------|-----|-------------|
| KOD-05 | Dropcap działa, ale brak preview/info w edytorze co się dzieje | UX informacyjny | ✓ Wyjaśniony |
| KOD-06 | TOC z outputMode=blocks — NOT A BUG, działa przez h3 z bloków | — | ✓ Nie-bug |
| KOD-07 | Brak wariantu w Advanced Editor | UX | Potwierdzony |
| KOD-12 | Brak `<h1>` w HTML allowlista — brak info | Informacyjny | Kod |
| KOD-WIZ | Wizard ma combobox zamiast VariantCards — niespójność z Visual | UX niespójność | Obserwacja |
| KOD-DUP | Typography tokeny zduplikowane w Visual i Advanced bez różnicy | UX | Obserwacja |

---

## 10. Statystyki końcowe

| Kategoria | Liczba |
|-----------|--------|
| Bugi potwierdzone testami | 3 (KOD-02, KOD-03/04*, KOD-08) |
| Problemy UX potwierdzone | 6 (KOD-01, KOD-03, KOD-04, KOD-07, KOD-10, KOD-WIZ) |
| Brakujące funkcjonalności | 3 (KOD-13, KOD-14, KOD-15) |
| Problemy a11y potwierdzone | 3 (KOD-09, A11Y-01, brak aria na section) |
| Fałszywe alarmy (nie-bugi) | 1 (KOD-06) |
| Obserwacje UX (niskie) | 3 (KOD-05, KOD-DUP, KOD-WIZ) |
| **ŁĄCZNIE problemów** | **15** |

*\* KOD-03 i KOD-04 to pokrewne problemy z brakiem confirm przy destruktywnych akcjach*

---

## 11. Screenshoty

| Plik | Opis |
|------|------|
| `rts-01-widget-added.png` | Widget dodany do strony — stan domyślny Wizard Editor |
| `rts-02-wizard-editor.png` | Wizard Editor po wypełnieniu pól (eyebrow, title, bloki) |
| `rts-03-advanced-outputmode-blocks.png` | Advanced Editor po edycji w Wizard — outputMode="Blocks only" (KOD-02) |
| `rts-04-visual-two-column.png` | Visual Editor — wariant Two Column |
| `rts-05-article-maxwidth-bug.png` | Article wariant z maxWidth="Full" — bug KOD-08 widoczny |
| `rts-06-toc-enabled.png` | TOC włączony — preview w edytorze |
| `rts-07-visual-editor.png` | Visual Editor — pełny widok po ponownym zalogowaniu |
| `rts-08-visual-editor-full.png` | Visual Editor — sekcja Typography i Colors z brakiem clear na textColor (KOD-10) |
| `rts-09-advanced-editor.png` | Advanced Editor — output mode, tokeny, normalize, raw JSON |
| `rts-10-frontend.png` | Frontend — widok strony po publikacji |
| `rts-11-frontend-mobile.png` | Frontend — responsywność mobilna (375px) |
| `rts-12-two-column-toc.png` | Admin preview — two-column z TOC włączonym |
| `rts-13-frontend-two-column-toc.png` | Frontend — two-column z TOC, linki anchor działające |
| `rts-14-frontend-dropcap.png` | Frontend — dropcap aktywny przy treści zaczynającej się od H2 |

---

*Raport zakończony — 2026-05-16. Testy przeprowadzone przez Playwright CLI w osobnej sesji przeglądarki `rts`. Admin i frontend renderują widget identycznie. Znaleziono 1 krytyczny problem, 5 wysokich, 7 średnich, 4 niskie.*
