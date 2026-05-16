# RAPORT: Rich Text Section Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie
> **Data:** 2026-05-16
> **Sesja:** Playwright #24 (Rich Text Section Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** RichTextSectionTest (`/richtextsectiontest`) — UUID: `(do uzupełnienia po teście)`

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
| `article` | Narracyjna prezentacja edytorska | `mx-auto max-w-3xl space-y-6` |

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
| `blocks` | Renderuje zawsze z `blocks[]` — Wizard ustawia to automatycznie |

---

## 3. Zidentyfikowane problemy UX z analizy kodu (przed testami)

### KOD-01: Brak wizualnego WYRÓŻNIENIA różnicy outputMode w edytorze Visual

**Opis:** W Visual Editor HTML body textarea i structured blocks są oba widoczne niezależnie od `outputMode`. Użytkownik nie ma żadnego wskazania wizualnego, który z nich faktycznie będzie renderowany. Sekcja HTML body i bloki są równorzędne bez żadnego info, że dla `outputMode: "blocks-fallback"` HTML ma priorytet.

**Priorytet:** Wysoki (UX)

---

### KOD-02: Wizard wymusza outputMode na "blocks" — cichy reset

**Opis:** Funkcja `updateWizardBlock` zawsze ustawia `outputMode: "blocks"` przy każdej edycji w Wizard. Jeśli użytkownik wcześniej ustawił `html` lub `blocks-fallback` w Advanced/Visual, przełączenie na Wizard i edycja dowolnego bloku resetuje outputMode. Brak ostrzeżenia.

**Priorytet:** Wysoki (UX + Bug potencjalny)

---

### KOD-03: Brak "Add block" w Visual Editor — tylko "Blocks count" dropdown

**Opis:** W Visual Editor sekcja "Structured fallback blocks" posiada przycisk "Add fallback block" ORAZ dropdown "Blocks count". Przy wyborze 0 w dropdownie i istnieniu bloków — wszystkie bloki znikają bez potwierdzenia. Brak undo w edytorze.

**Priorytet:** Średni (UX risk — destruktywna akcja)

---

### KOD-04: Brak pola "remove block" potwierdzenia

**Opis:** Przycisk "Remove" w edytorze bloków usuwa blok natychmiastowo bez dialog confirm. Dla długich bloków z treścią — ryzyko utraty danych.

**Priorytet:** Średni (UX)

---

### KOD-05: Dropcap ma twardy fallback tylko do pierwszego `<p>` — brak preview w edytorze

**Opis:** Dropcap CSS (`[&>p:first-of-type:first-letter]`) działa na pierwszym akapicie. Jeśli treść zaczyna się od `<h2>` lub innego tagu, dropcap nie pojawi się w ogóle. Edytor nie pokazuje żadnego wskazania co do aktualnego stanu dropcap w preview.

**Priorytet:** Niski (UX informacyjny)

---

### KOD-06: TOC działa tylko przy outputMode != "blocks" z HTML

**Opis:** TOC generowany jest przez `injectHeadingAnchors(sanitizedHtml)`. Gdy `outputMode: "blocks"` — bloki renderowane są przez `renderBlocksAsHtml()` który produkuje `<h3>` tagi. TOC powinien być generowany z nich też — jednak bloki nie mają IDs per se w tym trybie, tylko tekst heading'a. Sprawdzić czy TOC działa dla bloku-only mode.

**Priorytet:** Średni (potencjalny bug)

---

### KOD-07: Brak pola "variant" w Advanced Editor

**Opis:** Advanced Editor nie wyświetla wariantu ani opcji jego zmiany. Zmiana wariantu jest możliwa tylko przez Visual Editor (VariantCards). Użytkownicy zaawansowani mogą oczekiwać kontroli wariantu w Advanced.

**Priorytet:** Niski (UX)

---

### KOD-08: maxWidth nie ma efektu w wariancie "article"

**Opis:** Wariant `article` hardkoduje `max-w-3xl` niezależnie od ustawienia `options.maxWidth`. Wybór `xl` lub `full` w edytorze nie zmienia szerokości artykułu. Brak informacji dla użytkownika.

**Priorytet:** Wysoki (Bug / myląca konfiguracja)

---

### KOD-09: Brak pola "title" (h1) — tylko eyebrow + title jako h3

**Opis:** `titleBlock.title` renderowany jest jako `<h3>` (nie h1/h2). Dla strony artykułu gdzie ten widget jest główną treścią — semantyka SEO niepoprawna. Brak możliwości wyboru poziomu nagłówka sekcji tytułowej.

**Priorytet:** Średni (SEO/Accessibility)

---

### KOD-10: ColorField dla textColor — brak clear button

**Opis:** `ColorField` dla `textColor` nie posiada `onClear` — w odróżnieniu od background który ma. Nie można zresetować textColor do wartości domyślnej `var(--color-text)` bez ręcznego wpisania tego stringu lub użycia "Normalize now" w Advanced.

**Priorytet:** Średni (UX niespójność)

---

### KOD-11: Brak wsparcia dla `<img>` w HTML — brak komunikatu

**Opis:** Tag `<img>` jest poza allowlistem sanitizera — zostanie usunięty z HTML bez ostrzeżenia. Użytkownik wklejający HTML ze zdjęciami nie dostanie żadnego feedback'u o usunięciu obrazów.

**Priorytet:** Średni (UX informacyjny)

---

### KOD-12: Brak `<h1>` w allowlisted HTML tags

**Opis:** Allowlista HTML zawiera h2/h3/h4, ale nie h1. Treść z h1 zostanie usunięta. To poprawne z perspektywy hierarchii (h1 = strona), ale brak komunikatu dla użytkownika.

**Priorytet:** Niski (informacyjny)

---

### KOD-13: Brak image upload / media picker dla body content

**Opis:** Widget oferuje tylko czysty HTML bez żadnego wsparcia dla wstawiania obrazów, attachmentów czy embedów (video, iframes). Dla długich treści edytorskich — brak inline media jest istotnym ograniczeniem.

**Priorytet:** Wysoki (brak funkcjonalności)

---

### KOD-14: Brak rich text editor (WYSIWYG) dla HTML body

**Opis:** HTML body to zwykła `<Textarea>` — użytkownik musi wpisywać surowy HTML ręcznie. Brak WYSIWYG editor (np. Tiptap, Slate, Quill). Znacząco obniża UX dla użytkownika "beginner" który jest target audience tego widgetu (audience: "beginner").

**Priorytet:** Krytyczny (brak kluczowej funkcjonalności)

---

### KOD-15: Block.content to plain text bez formatowania

**Opis:** Pole `block.content` w structured blocks to zwykły textarea z plain textem. `renderBlocksAsHtml` konwertuje `\n` na `<br />` ale nie obsługuje formatowania (bold, italic, listy). Bloki są więc znacznie uboższe funkcjonalnie od HTML body.

**Priorytet:** Wysoki (brak funkcjonalności)

---

### KOD-16: Brak paginacji / podelementy przy 20 blokach w Visual Editor

**Opis:** Przy maksymalnej liczbie 20 bloków Visual Editor wyświetla je wszystkie w jednej długiej liście bez grupowania, paginacji ani collapse. Interfejs staje się bardzo nieprzejrzysty.

**Priorytet:** Średni (UX skalowalność)

---

## 4. Wyniki testów Playwright — Admin UI (localhost:5173)

> *(Uzupełnione po testach Playwright)*

### 4.1 Warianty

| Test | Wynik |
|------|-------|
| Dodanie widgetu Rich Text Section do strony | - |
| Przełączenie wariantu single-column / two-column / article | - |
| VariantCards — Badge Selected/Pick | - |
| maxWidth zmiana MD/LG/XL/FULL | - |
| maxWidth w wariancie "article" (KOD-08) | - |

### 4.2 Editor Wizard

| Test | Wynik |
|------|-------|
| Eyebrow + Title edycja | - |
| Block 1 heading + content | - |
| Block 2 heading + content | - |
| outputMode po edycji w Wizard = "blocks" | - |

### 4.3 Editor Visual

| Test | Wynik |
|------|-------|
| HTML body textarea edycja | - |
| Blocks count dropdown zmiana | - |
| Add fallback block | - |
| Remove block | - |
| Move up / Move down | - |
| Dropcap switch | - |
| TOC switch | - |
| Font scale dropdown | - |
| Line height dropdown | - |
| Spacing dropdown | - |
| Text color picker + input | - |
| Background color picker + input + clear | - |

### 4.4 Editor Advanced

| Test | Wynik |
|------|-------|
| Output mode selector | - |
| Font scale token | - |
| Line height token | - |
| Spacing token | - |
| Normalize now button | - |
| Reset to defaults button | - |
| Raw JSON snapshot | - |

### 4.5 Funkcje specjalne

| Test | Wynik |
|------|-------|
| TOC generowany z H2/H3/H4 | - |
| TOC anchors działające (scroll) | - |
| Dropcap widoczny na pierwszym `<p>` | - |
| Dropcap brak przy H2 na starcie | - |
| HTML sanitizacja (script tag usuwany) | - |
| Link `<a>` z target=_blank + rel noopener | - |

---

## 5. Wyniki testów Playwright — Frontend (localhost:3000)

> *(Uzupełnione po testach frontend)*

### 5.1 Tabela porównawcza Admin ↔ Frontend

| Funkcja | Admin Preview | Frontend | Zgodność |
|---------|--------------|----------|----------|
| Wariant single-column | - | - | - |
| Wariant two-column | - | - | - |
| Wariant article | - | - | - |
| TOC | - | - | - |
| Dropcap | - | - | - |
| maxWidth | - | - | - |
| Typography tokens | - | - | - |
| Colors | - | - | - |

### 5.2 Obserwacje z testów frontend

> *(Uzupełnione po testach)*

---

## 6. Problemy dostępności (Accessibility)

| Problem | Kategoria WCAG | Priorytet |
|---------|----------------|-----------|
| `titleBlock.title` renderowany jako `<h3>` zamiast semantycznego nagłówka | 1.3.1 Info and Relationships | Średni |
| Brak `aria-label` lub `aria-labelledby` na `<section>` głównym | 1.3.1 | Niski |
| TOC `<nav>` ma `aria-label="Table of contents"` — OK | — | OK |
| Dropcap `::first-letter` — nie wpływa na screen-readery | — | OK |
| `<a>` z `target="_blank"` — auto `rel="noopener noreferrer"` — OK | 3.2.5 | OK |
| Brak focus-visible styles na linkach TOC (tylko hover) | 2.4.7 Focus Visible | Niski |

---

## 7. Podsumowanie — macierz priorytetów

### Krytyczne — naprawić natychmiast

| ID | Problem | Typ |
|----|---------|-----|
| KOD-14 | Brak WYSIWYG editora dla HTML body — textarea dla beginnerów | Brak funkcjonalności |

### Wysokie — pilne ulepszenia

| ID | Problem | Typ |
|----|---------|-----|
| KOD-01 | Brak wskazania które pole (HTML/blocks) jest aktywne przy danym outputMode | UX |
| KOD-02 | Wizard resetuje outputMode do "blocks" bez ostrzeżenia | Bug UX |
| KOD-08 | maxWidth ignorowane w wariancie "article" | Bug |
| KOD-13 | Brak media/image support w body content | Brak funkcjonalności |
| KOD-15 | block.content to plain text — brak formatowania | Brak funkcjonalności |

### Średnie — planowe ulepszenia

| ID | Problem | Typ |
|----|---------|-----|
| KOD-03 | Blocks count=0 usuwa wszystkie bloki bez confirm | UX risk |
| KOD-04 | Remove block bez confirm dialog | UX |
| KOD-06 | TOC przy outputMode=blocks — weryfikacja | Potencjalny bug |
| KOD-09 | title renderowany jako h3 — semantyka SEO | SEO/a11y |
| KOD-10 | Brak clear button dla textColor (niespójność z background) | UX niespójność |
| KOD-11 | Brak komunikatu o usunięciu `<img>` przez sanitizer | UX informacyjny |
| KOD-16 | Brak paginacji przy 20 blokach w Visual Editor | UX skalowalność |

### Niskie — do rozważenia

| ID | Problem | Typ |
|----|---------|-----|
| KOD-05 | Dropcap brak preview w edytorze | UX informacyjny |
| KOD-07 | Brak wariantu w Advanced Editor | UX |
| KOD-12 | Brak `<h1>` w HTML allowlista — brak info | Informacyjny |

---

## 8. Statystyki (wstępne z analizy kodu)

| Kategoria | Liczba |
|-----------|--------|
| Bugs zidentyfikowane z kodu | 3 (KOD-02, KOD-06, KOD-08) |
| Problemy UX | 7 |
| Brakujące funkcjonalności | 3 (KOD-13, KOD-14, KOD-15) |
| Problemy a11y | 2 |
| **ŁĄCZNIE** | **15** |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| *(do uzupełnienia po testach Playwright)* | |

---

*Raport wstępny wygenerowany z analizy kodu — 2026-05-16. Sekcje 4–5 zostaną uzupełnione po testach Playwright.*
