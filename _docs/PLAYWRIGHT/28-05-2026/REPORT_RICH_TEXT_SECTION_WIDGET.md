# RAPORT: Rich Text Section Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-rich-text-section` (izolowana przeglądarka, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/1e0f651b-d7c0-4c03-8e3b-07bff2c1d5ca` (status `Draft`, tytuł „Contract Test - rich-text-section")
> **Fixture public:** http://localhost:3000/richtextsectiontest
> **Pliki źródłowe:** `core/widgets/core/richTextSection.tsx` (renderer + normalizacja + sanitizer HTML + embed/media + kotwice nagłówków/TOC) · `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` (edytory Wizard/Visual/Advanced)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI (klik kart wariantu, otwieranie selectów Radix, wpisywanie do edytora WYSIWYG,
> przełączanie switchy, dialogi potwierdzenia, Undo) oraz inspekcją DOM przez `eval`
> (atrybuty `data-rich-text-*`, klasy Tailwind, inline `style`, ARIA, wstrzyknięte
> `id` kotwic nagłówków, normalizacja embed). Sekcje 4–8 jasno oddzielają: co działa,
> co nie działa / jest mylące, co faktycznie przetestowano i czego NIE testowano.

> Uwaga o screenshotach: weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`)
> oraz snapshoty accessibility tree — nie zapisywałem zrzutów PNG jako evidence.
> Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń
> w katalogu `.playwright-cli/` (ignorowanym przez Git), nie są wymaganym evidence
> w repo.

> Uwaga o środowisku współdzielonym (istotna dla wiarygodności): katalog
> `.playwright-cli/` jest **wspólny dla wszystkich równoległych sesji agentów**.
> Pliki snapshotów innych audytów (zaobserwowałem m.in. `stats-kpi`, `content-list`)
> trafiają do tego samego katalogu, przez co „najnowszy" plik snapshotu potrafił
> należeć do innego widgetu. Dlatego **wszystkie twierdzenia w tym raporcie oparłem
> o `eval` w mojej własnej, nazwanej sesji** (`claude-28-05-rich-text-section`) oraz
> o snapshoty zapisywane pod własnymi nazwami — odczyty `eval` były spójne i zawsze
> dotyczyły wyłącznie widgetu `rich-text-section` (canvas zawierał dokładnie jeden
> blok `blk-1`).

---

## 1. Przegląd widgetu

**Typ:** `rich-text-section` · **Kategoria:** `content` · **Opis:** „Long-form copy block with safe HTML rendering, rich fallback blocks, and editorial layout controls."

**Warianty:** `single-column` (domyślny, pojedyncza kolumna), `two-column` (`grid-cols-1 lg:grid-cols-3` — kolumna TOC + treść 2/3 dopiero od `lg`), `article` (renderuje semantyczny `<article>`).

**Model danych (`RichTextSectionData`):**

| Sekcja | Pola |
|--------|------|
| **titleBlock** | `eyebrow`, `title`, `headingLevel` (1/2/3) |
| **body** | `html` (sanitizowany HTML, max 24000 zn.), `blocks[]` |
| **body.blocks[]** | 4 rodzaje: `text` (heading, headingLevel 2/3/4, contentHtml/content), `image` (mediaId/src, alt, decorative, caption, href, width content/wide/full, align left/center/right), `attachment` (mediaId/src, label, description, mimeType, sizeLabel), `embed` (provider youtube/vimeo/external-link, url, title, aspectRatio 16:9/4:3/1:1, renderMode link-card) |
| **options** | `dropcap` (bool), `toc` (bool), `maxWidth` (md/lg/xl/full), `outputMode` (html/blocks-fallback/blocks) |
| **style** | `fontScale` (none/sm/md/lg), `lineHeight` (none/tight/normal/relaxed), `textColor` (clearable), `background` (clearable), `spacing` (none/sm/md/lg) |

**Ograniczenia bloków:** min 0 / max 20 (`richTextBlockMin=0`, `richTextBlockMax=20`). Liczba bloków jest **data-driven** — kontrolka „Blocks count" realnie dodaje/ucina tablicę `body.blocks` (potwierdzone, patrz 4.2).

**Kluczowy mechanizm — dwa źródła treści + tryb wyboru źródła:** widget ma DWA niezależne źródła: rich-text `body.html` (edytowany przez WYSIWYG) oraz strukturalne `body.blocks`. `options.outputMode` decyduje co się renderuje:
- `html` („Prefer rich text body") → zawsze renderuje `body.html`,
- `blocks` („Use structured blocks only") → zawsze renderuje strukturalne bloki,
- `blocks-fallback` (domyślny, „Use body, then blocks") → renderuje `body.html` jeśli niepusty, w przeciwnym razie bloki.

Atrybut `data-rich-text-rendered-source` (`html`/`blocks`) na sekcji deterministycznie raportuje, które źródło faktycznie się renderuje.

**Bezpieczeństwo renderowania:** `body.html` przechodzi przez allowlist (`p, br, strong, em, u, s, a, ul, ol, li, blockquote, code, pre, h2, h3, h4, hr, span`) — `img`, `iframe`, `script`, `style`, `h1` oraz atrybuty `on*` są usuwane, a niebezpieczne `href` przepisywane na `#`. Obrazy/embedy są obsługiwane wyłącznie przez strukturalne bloki (image przez MediaPicker, embed przez provider-validated link-card). Linki zewnętrzne dostają `target="_blank" rel="noopener noreferrer"`. Nagłówki H2–H4 w renderowanym body dostają wstrzyknięte, scope'owane do UUID bloku `id` (kotwice), z których budowany jest TOC.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Panel edytora po prawej ma **tylko dwie równorzędne zakładki: `Visual` i `Advanced`**. Tryb **Wizard nie jest zakładką** — wchodzi się do niego przyciskiem **„Run setup again"**. Po setupie widoczny jest komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*. Wizard kończy się przyciskiem **„Finish setup and open Visual"**. To dokładnie ten sam wzorzec, co w `faq-accordion`, `accordion`, `tabs`.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | przycisk „Run setup again" | Jedna sekcja **„Starter copy"**: select „Rich text layout" (wariant), read-only info-box o trybie wyjścia („Output mode stays untouched in Wizard. Current mode: …"), read-only notka „Use Visual to edit the eyebrow, title…", oraz read-only **podgląd pierwszych dwóch bloków tekstowych** (Heading 1/2 + Paragraph 1/2). **Jedyna interaktywna kontrolka to select wariantu.** |
| **Visual** | zakładka „Visual" (domyślna po setupie) | 6 sekcji widgetu: **Variant and layout structure** (karty wariantu + Content max width), **Title block copy** (eyebrow/title/heading level), **Body content** (Source preference + status źródła + edytor WYSIWYG + notka sanitizera), **Structured content blocks** (status źródła + Blocks count + Add text/image/attachment/embed + block navigator + edytor aktywnego bloku + Move/Remove + Undo), **Reader options** (dropcap + TOC), **Typography and colors** (font scale, line height, spacing density, text color + Clear, background + Clear/transparent). Dodatkowo współdzielone sekcje wrappera: **Block layout**, **Device visibility**. (Łącznie 8 widocznych sekcji — zgodne ze smoke 27-05.) |
| **Advanced** | zakładka „Advanced" | 4 sekcje widgetu **w pełni read-only**: **Output mode and source diagnostics**, **Sanitizer diagnostics** (długość zapisanego HTML, liczba diagnostyk, sanitized preview), **Saved content summary** (liczba bloków + rozbicie media/embed, długość HTML), **Contract summary** (podział własności Wizard/Visual/Advanced). Plus współdzielone **Block layout summary** i **Visibility summary**. (Łącznie 6 widocznych — zgodne ze smoke 27-05.) **Brak edytowalnych kontrolek widgetu.** |

**Istotne:** w canvas adminowym jest **tylko JEDEN** render widgetu (`[data-block-id="blk-1"]`), więc nie ma kolizji wielu renderów dzielących stan.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-28-05-rich-text-section`, zweryfikowane `eval`:

- **Wizard:** select „Rich text layout" (Single → Two Column, potwierdzona zmiana `data-rich-text-variant` w canvas), read-only info o trybie wyjścia, read-only podgląd quick-start (Heading/Paragraph), przycisk „Finish setup and open Visual" (powrót do zakładki Visual).
- **Visual / Variant:** wszystkie 3 karty (single ↔ two-column ↔ article) z odczytem atrybutu i obecności `<article>` / `lg:grid-cols-3`.
- **Visual / Content max width:** Full (`max-w-none`) i Medium (`max-w-3xl`) z odczytem klasy kontenera.
- **Visual / Title block copy:** edycja eyebrow, title (live), zmiana title heading level (H2 → H1, zmiana tagu nagłówka).
- **Visual / Body content:** Source preference — wszystkie 3 tryby (html / blocks-fallback / blocks) z odczytem `data-rich-text-rendered-source` oraz testem różnicowym (akapit „Keep paragraphs concise" obecny tylko przy renderze HTML, nieobecny przy blokach); badge statusu źródła; edytor WYSIWYG (wpisanie markera → natychmiastowa aktualizacja canvas).
- **Visual / Structured content blocks:** edycja heading aktywnego bloku (live), Blocks count 2→4 (dodanie „Heading 3", „Heading 4"), redukcja 4→2 (dialog potwierdzenia), **Undo** (przywrócenie), Add embed block + wpisanie URL YouTube (normalizacja do link-card z labelem „YouTube"), Move down (reorder), Remove (dialog + Undo notice).
- **Visual / Reader options:** dropcap (on → `data-rich-text-dropcap=true`), TOC (on → nav „Table of contents" z 4 linkami kotwic, `data-rich-text-toc-count`).
- **Visual / Typography and colors:** Font scale Large (`text-lg`), line height/spacing odczytane (`leading-7`, `space-y-6`), Text color `#00ff00` + Clear (powrót do `var(--color-text)`), Background color `#ff0000` + Clear (usunięcie inline tła).
- **Advanced:** odczyt wszystkich 4 sekcji read-only i porównanie z edycjami z Visual; weryfikacja braku edytowalnych kontrolek widgetu.
- **Public (frontend):** render początkowy, atrybuty `data-rich-text-*`, semantyka `<section aria-labelledby>`, wstrzyknięte `id` kotwic nagłówków, render dropcap (klasy first-letter), klasy typografii, konsola (0 błędów), brak overflow na 375 px, izolacja niezapisanych edycji admin↔front.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard

- **Select „Rich text layout"** — zmiana na „Two Column" natychmiast ustawiła `data-rich-text-variant="two-column"` w canvas i wyrenderowała grid `lg:grid-cols-3`. Ścieżka `variant` współdzielona z Visual (po „Finish" wariant pozostaje). ✓
- **Info-box trybu wyjścia** — read-only, poprawnie pokazuje „Current mode: blocks-fallback" i komunikuje, że Wizard nie zmienia źródła renderowania. ✓
- **Notka „Use Visual to edit…"** — read-only, jasno deleguje codzienną edycję do Visual. ✓
- **„Finish setup and open Visual"** — poprawnie przełącza na zakładkę Visual (`aria-selected=true`). ✓

### 4.2 Visual — kontrolki i efekt w canvas (zweryfikowane w DOM)

| Kontrolka | Test | Efekt w canvas |
|-----------|------|----------------|
| Karty wariantu | single / two-column / article | `data-rich-text-variant` + struktura: two-column→`lg:grid-cols-3`; article→semantyczny `<article>`. ✓ |
| Content max width | Full / Medium | kontener treści `max-w-none` / `max-w-3xl` (mapowanie `maxWidthClassMap`). ✓ |
| Eyebrow | „AUDYT-EYEBROW" | `<p>` eyebrow w `<header>` aktualizuje się live. ✓ |
| Title | „Audyt tytuł sekcji" | nagłówek tytułu aktualizuje się live; `id` tytułu = `aria-labelledby` sekcji. ✓ |
| Title heading level | H2 → H1 | tag nagłówka tytułu zmienia się na `<h1>`, `data-rich-text-title-level=1`. ✓ |
| Source preference | html / blocks-fallback / blocks | `data-rich-text-rendered-source` zmienia się deterministycznie; blocks-only usuwa akapit obecny tylko w HTML body (test różnicowy). ✓ |
| Badge statusu źródła | — | „Active / Rich text body" z opisem powodu („renders because it has content") spójny z trybem. ✓ |
| Edytor WYSIWYG body | wpisanie „MARKER_BODY_EDIT" | treść markera natychmiast pojawia się w renderze body w canvas. ✓ |
| Blocks count | 2 → 4 | data-driven: dochodzą bloki „Heading 3", „Heading 4" (`createTextBlock`). ✓ |
| Blocks count (redukcja) | 4 → 2 | dialog „Reduce structured block count" z opisem „Reduce blocks from 4 to 2?…", przyciski Cancel/Reduce. ✓ |
| Undo (po redukcji/usunięciu) | klik „Undo" | przywraca poprzedni stan tablicy bloków (4 bloki z „Blok-1 ZMIENIONY", „Heading 3", „Heading 4"). ✓ |
| Heading aktywnego bloku | „Blok-1 ZMIENIONY" | nagłówek bloku w renderze blocks aktualizuje się live. ✓ |
| Add embed block + URL YouTube | `youtube.com/watch?v=…` | blok embed renderuje się jako **link-card** z labelem providera „YouTube" i bezpiecznym `<a href>` do YouTube (normalizacja `normalizeAllowedRichTextEmbedUrl`). ✓ |
| Move down | blok 1 → pozycja 2 | kolejność w renderze blocks zmienia się natychmiast (`handleMoveBlock`). ✓ |
| Remove | dialog „Remove structured block" | „Remove Blok-1 ZMIENIONY? This action can be undone…", po potwierdzeniu blok znika, pojawia się Undo notice. ✓ |
| Dropcap | on | `data-rich-text-dropcap=true` + klasy first-letter (`[&>p:first-of-type:first-letter]:text-4xl …`) na kontenerze treści. ✓ |
| Table of contents | on | `data-rich-text-toc=true`, render `<nav aria-label="Table of contents">` z linkami kotwic; `data-rich-text-toc-count` zgodny z liczbą nagłówków body. ✓ |
| Font scale | Large | kontener body `text-lg` (`fontScaleClassMap.lg`). ✓ |
| Line height / Spacing | (odczyt md/normal) | `leading-7` + `space-y-6` na kontenerze body. ✓ |
| Text color | `#00ff00` → Clear | inline `color: rgb(0,255,0)` na body; po Clear powrót do `var(--color-text)`. ✓ |
| Background color | `#ff0000` → Clear | inline `background-color: rgb(255,0,0)` na `<section>`; po Clear usunięcie inline tła. ✓ |

**Spójność „Clear" w kolorach:** oba pola koloru (Text color, Background color) mają działający przycisk „Clear" oraz badge „Theme default" / „Transparent". Text color czyści do `var(--color-text)`, Background do braku inline tła. Spójne i przewidywalne.

### 4.3 Advanced (read-only) — wiernie odzwierciedla stan z Visual

Po moich edycjach w Visual (tryb `blocks`, 4 bloki w tym 1 embed, font `lg`, edycja body z markerem) Advanced raportował:

- **Output mode and source diagnostics:** „Output mode: blocks", „Rendered source: blocks", „Source status: Variant: single-column · Block count: 4", „Reason: blocks-only". ✓
- **Sanitizer diagnostics:** „Stored HTML length: 328 characters · Diagnostics: 0" + sekcja „Sanitized preview" (render bezpiecznego HTML). ✓ (HTML zawierał mój marker, 0 problemów sanitizera dla czystej treści.)
- **Saved content summary:** „Structured blocks: 4 total · 0 media/attachment · 1 embed", „HTML source: 328 sanitized characters". ✓ (Embed poprawnie zliczony osobno; rozbicie media/embed dokładne.)
- **Contract summary:** poprawny podział własności — „Wizard owns: One-time layout seed plus the first structured-block preview." / „Visual owns: Title copy, rendered-source preference, structured blocks, reader options, typography, spacing, and colors." / „Advanced owns: Read-only output/source diagnostics, sanitizer reporting, saved content summaries, and contract ownership." ✓

**Brak edytowalnych kontrolek widgetu** w Advanced — sekcje diagnostyczne zawierają wyłącznie paragrafy/podsumowania (zob. niuans N6 o pojedynczym bezetykietowym `<input>`).

### 4.4 Frontend (public)

Strona `/richtextsectiontest` zwraca `200` i renderuje **zapisany/opublikowany** stan fixture (NIE moje niezapisane edycje):

- Atrybuty: `single-column`, `font-scale=md`, `line-height=normal`, `spacing=md`, `max-width=lg`, `output-mode=blocks-fallback`, `rendered-source=html`, `title-level=2`, `dropcap=true`, `toc=false`. ✓
- **Semantyka i dostępność:** `<section aria-labelledby="rich-text-section-{uuid}-title">`, tytuł `<h2 id="…-title">`. ✓
- **Kotwice nagłówków:** body H2/H3 mają wstrzyknięte, scope'owane do UUID bloku `id` (np. `…-heading-clear-structure-for-readable-content`, `…-heading-what-works-best`) — slugify z `injectHeadingAnchors`. ✓
- **Dropcap renderuje się:** kontener treści ma klasy first-letter (`…:mr-2`, `…:float-left`, `…:text-4xl`, `…:leading-none`) + `text-base leading-7 space-y-6`. ✓
- **Konsola:** **0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- Brak linków w tej zawartości (fixture nie ma bloku embed/attachment — patrz 5/N2).

### 4.5 Izolacja niezapisanych edycji

- **Niezapisane edycje NIE wyciekają na front** — mimo że w Visual ustawiłem `outputMode=blocks`, font `lg`, dodałem embed itd., front nadal pokazuje stan zapisany (`output-mode=blocks-fallback`, `rendered-source=html`, `font-scale=md`, single-column). **Silny dowód poprawnej izolacji draft↔public.** ✓
- Świadomie **nie** klikałem „Save draft"/„Publish", aby nie mutować współdzielonego fixture.

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Wizard pokazuje „No paragraph text yet" dla bloków, które MAJĄ treść (mylący podgląd)** | Wizard / podgląd | Sekcja „Structured quick-start blocks" w Wizard wyświetla dla obu domyślnych bloków tekstowych „Paragraph 1/2: No paragraph text yet", mimo że bloki **mają** treść — tyle że w polu `contentHtml`, a nie w legacy `content`. Kod podglądu: `value={(block.contentHtml ? "" : block.content)?.trim() || "No paragraph text yet"}` — gdy istnieje `contentHtml`, podgląd celowo pokazuje pusty string → „No paragraph text yet". Skutek: każdy blok z treścią rich-text (czyli realnie każdy blok edytowany w Visual) w Wizard wygląda na pusty. **Mylące** — autor w Wizard może sądzić, że treści nie ma. (Heading wyświetla się poprawnie.) |
| **N2 — Rozbieżność dropcap: public=`true` vs wczytany draft adminowy=`false`** | Draft vs publish / shared state | Mój pierwszy odczyt baseline w adminie pokazał `data-rich-text-dropcap="false"`, a public route renderuje `dropcap="true"`. Ponieważ strona jest w statusie `Draft`, najprawdopodobniej public serwuje **wcześniej opublikowaną** wersję (rozbieżność draft↔published). **Nie mogę jednak w pełni wykluczyć** wpływu równoległych audytów na współdzielony fixture. Niczego nie zapisywałem, więc rozbieżność **nie pochodzi z mojej sesji**. Należy zweryfikować, czy to celowe (draft niepublikowany) czy realny drift. |
| **N3 — TOC i kotwice nie obejmują tytułu sekcji (świadome, ale warte odnotowania)** | Renderer / TOC | `injectHeadingAnchors` działa wyłącznie na renderowanym `body` (HTML lub bloki), więc tytuł sekcji (`titleBlock.title`, np. H2 „Long-form content section") **nigdy** nie pojawia się w TOC ani nie dostaje kotwicy — w TOC lądują tylko nagłówki treści. To spójne z intencją (TOC = spis treści body), ale `data-rich-text-toc-count` liczy tylko nagłówki body (u mnie 2 dla domyślnego HTML, 4 po dodaniu bloków), co może zaskoczyć przy interpretacji licznika. |
| **N4 — Podwójny H2 na stronie** | Semantyka / a11y | Tytuł sekcji jest H2, a pierwszy nagłówek body również H2 (domyślny fixture). Daje to dwa H2 w obrębie jednej sekcji. Akceptowalne, ale przy `headingLevel` tytułu = 2 i blokach H2 hierarchia nagłówków nie jest ściśle zagnieżdżona. Autor może to skorygować (tytuł H1/H2, bloki H3/H4), ale domyślny fixture tego nie robi. |
| **N5 — „body.html" i „body.blocks" mogą się cicho różnić** | Model danych / UX | W trybie `blocks-fallback` (domyślnym) renderuje się `body.html`, ale strukturalne bloki istnieją równolegle z **inną** treścią (HTML body ma dodatkowy akapit „Keep paragraphs concise…", którego nie ma w blokach). Przełączenie Source preference na „blocks" zmienia widoczną treść. To projekt (dwa źródła), ale autor edytujący tylko jedno źródło może nie zauważyć, że drugie ma rozjechaną treść. Brak w UI wyraźnego ostrzeżenia o rozjeździe obu źródeł. |
| **N6 — Pojedynczy bezetykietowy `<input>` w tabpanelu Advanced** | Advanced (drobne) | W obrębie `[role=tabpanel]` Advanced jest jeden `<input>` bez `type`, `role`, `aria-label` i bez przynależności do żadnej sekcji diagnostycznej (najpewniej globalny, ukryty artefakt, np. input z MediaPicker/uploadu montowany na poziomie panelu). **Nie jest** kontrolką konfiguracyjną widgetu — sekcje widgetu w Advanced pozostają read-only. Drobiazg do odnotowania, nie bug produktowy. |

**Nie wykryto** żadnych błędów konsoli na froncie (0/0), żadnego twardego buga renderowania, ani wycieku niezapisanych edycji na front. Wszystkie przetestowane kontrolki Wizard i Visual działają i aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan; frontend jest dostępny (semantyczna `<section>`, `aria-labelledby`, kotwice nagłówków) i bez overflow. Embed jest bezpiecznie normalizowany (provider-validated link-card, nie surowy iframe).

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/richtextsectiontest`) | Zgodność |
|--------|--------------|-----------------------------------|----------|
| Atrybuty `data-rich-text-*` | ✓ żywy `RichTextSectionBlockView` | ✓ identyczny renderer | ✓ wspólny renderer |
| Wariant / max-width / typografia | ✓ live z Visual | ✓ (stan zapisany) | ✓ logika spójna |
| Source preference / rendered-source | ✓ live (html/blocks/fallback) | ✓ (zapisany `blocks-fallback`→html) | ✓ |
| Kotwice nagłówków + `aria-labelledby` | ✓ obecne | ✓ obecne (scope UUID) | ✓ |
| Dropcap | ✓ live (klasy first-letter) | ✓ renderuje się (`dropcap=true`) | ⚠ wartość różni się — N2 |
| Embed → link-card | ✓ normalizacja YouTube | (fixture bez embed → brak) | ✓ logika spójna |
| Niezapisane edycje z Visual | widoczne w sesji edytora | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |
| Konsola | (admin nie sprawdzany pod kątem 0/0) | 0 błędów / 0 ostrzeżeń | ✓ front czysty |

**Wniosek:** renderer jest wspólny; canvas i front zachowują się spójnie dla testowanych opcji. Jedyna zaobserwowana różnica wartości (N2 — `dropcap`) to najpewniej rozbieżność draft↔published (lub artefakt współdzielonego fixture), a nie błąd renderera. Niezapisane edycje są poprawnie izolowane od public.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Bloki image i attachment (MediaPicker):** kontrolki istnieją (wybór assetu, alt, decorative, caption, href, width, align dla image; label, description, mimeType, sizeLabel dla attachment), ale **NIE** wybierałem realnego assetu z biblioteki mediów — wymaga to interakcji z MediaPicker i istniejących mediów. Nie potwierdziłem renderu `<figure>`/karty attachment ani walidacji „obraz musi być image/*".
- **Per-blokowy edytor WYSIWYG + per-blokowa notka sanitizera:** testowałem edytor WYSIWYG **body** (wpisanie markera) oraz heading bloku, ale nie testowałem pełnej edycji rich-content wewnątrz konkretnego bloku tekstowego ani sanitizera na poziomie bloku.
- **Sanitizer / diagnostyki z niedozwolonym HTML:** nie udało się wstrzyknąć przez toolbar WYSIWYG tagów `script`/`iframe`/`img`/`h1` ani atrybutów `on*`, więc nie zaobserwowałem realnego komunikatu „Sanitizer guidance" ani niezerowego licznika diagnostyk (Advanced pokazał „Diagnostics: 0" dla czystej treści). Ścieżka kodu istnieje (`sanitizeRichTextHtmlWithDiagnostics`), ale **nie zweryfikowana interakcyjnie** w tym audycie.
- **Przycisk „Use transparent" (Background):** testowałem ustawienie koloru i „Clear"; osobnego przycisku „Use transparent" nie klikałem.
- **Block navigator — paginacja:** paginacja (Previous/Next) pojawia się przy >5 blokach; nie przekroczyłem 5, więc paginacji nie testowałem. „Move up" — testowałem tylko „Move down".
- **Block heading level (select w bloku):** testowałem heading level **tytułu** (H1/H2/H3); per-blokowy select heading level (H2/H3/H4) działa tym samym mechanizmem, ale nie testowany osobno.
- **Pozostałe providery embed:** testowałem **tylko YouTube**; Vimeo, external-link oraz URL nieprawidłowy/niebezpieczny (odrzucenie, brak renderu) — nie testowane.
- **Warianty two-column / article na froncie:** zapisany fixture to `single-column`; układu two-column (z TOC w kolumnie) i article na **froncie** nie weryfikowałem (tylko w canvas adminowym).
- **Limity i normalizacja:** nie testowałem ucinania pól do limitów (HTML 24000, heading 180, content 12000, caption 240 itd.) ani twardego maksimum 20 bloków.
- **Save / Publish:** świadomie **nie** zapisywałem, aby nie mutować współdzielonego fixture; trwałość moich edycji po przeładowaniu oraz propagacja na front **nie zostały** zweryfikowane (zweryfikowana została izolacja: front pokazuje stan zapisany).
- **Współdzielone sekcje wrappera (Block layout, Device visibility / ich summary w Advanced):** poza zakresem audytu rich-text-section; niczego w nich nie zmieniałem.
- **Pełna dostępność klawiatury / czytnik ekranu na froncie:** weryfikowałem strukturę ARIA przez DOM, ale nie testowałem realnej nawigacji klawiaturą/SR.

> Uwaga środowiskowa: w trakcie audytu sesja przeglądarki raz uległa awarii (proces `playwright-cli` zwrócił błąd Node i zamknął przeglądarkę) — najpewniej w połączeniu z obciążeniem współdzielonego katalogu `.playwright-cli/` przez równoległe audyty. Po ponownym zalogowaniu fixture wrócił do stanu zapisanego (moje edycje nie były zapisywane), więc nie miało to wpływu na wnioski; kontynuowałem od baseline.

---

## 8. Podsumowanie

- Widget **rich-text-section jest w bardzo dobrym stanie funkcjonalnym**. Praktycznie wszystkie przetestowane kontrolki Wizard i Visual **działają i aktualizują podgląd na żywo**: wariant (3 układy), max width, eyebrow/title/heading level, **tryb wyboru źródła** (html/blocks-fallback/blocks z deterministycznym `rendered-source`), edytor WYSIWYG body, data-driven Blocks count (z dialogiem redukcji i **Undo**), edycja heading bloku, **bezpieczny embed** (normalizacja YouTube do link-card), Move/Remove z dialogami, dropcap, TOC (z wstrzykniętymi kotwicami), font scale, line height, spacing, oraz oba kolory z działającym „Clear".
- **Advanced jest w 100% read-only** i **wiernie** podsumowuje stan z Visual (tryb wyjścia, rendered-source, liczba bloków z rozbiciem media/embed, długość sanitizowanego HTML, liczba diagnostyk, podział własności kontraktu).
- **Frontend jest czysty:** semantyczna `<section aria-labelledby>`, wstrzyknięte scope'owane kotwice nagłówków, render dropcap, **0 błędów/ostrzeżeń konsoli**, brak overflow na 375 px. **Niezapisane edycje admin nie wyciekają na front** (silny dowód izolacji draft↔public).
- **Najważniejsze realne znaleziska:**
  - **N1 (mylący Wizard):** podgląd quick-start pokazuje „No paragraph text yet" dla bloków, które mają treść w `contentHtml` — błąd wyświetlania (czyta legacy `content`).
  - **N2 (rozbieżność dropcap draft↔public):** public `dropcap=true` vs wczytany draft `false` — prawdopodobnie draft/publish, do weryfikacji; nie pochodzi z mojej sesji (nic nie zapisywałem).
  - **N5 (dwa źródła treści mogą się cicho rozjeżdżać):** `body.html` i `body.blocks` przechowują niezależną treść; brak ostrzeżenia o rozjeździe.
- **Drobne:** TOC/kotwice nie obejmują tytułu sekcji (N3); podwójny H2 w domyślnym fixture (N4); bezetykietowy globalny `<input>` w tabpanelu Advanced (N6, nie kontrolka widgetu).
- **Plusy względem innych widgetów:** liczba bloków **data-driven** (realnie zmienia tablicę), **bezpieczny model treści** (sanitizer allowlist, brak surowych obrazów/iframe w HTML, embed jako provider-validated link-card, linki zewnętrzne z `rel="noopener noreferrer"`), deterministyczny wybór źródła z czytelnym badge statusu, spójny „Clear" dla obu kolorów, dialogi potwierdzenia + Undo dla destrukcyjnych operacji na blokach.
- Nie znaleziono żadnego twardego błędu renderowania ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji (poza wartością `dropcap` — N2, najpewniej draft/publish).

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG jako evidence — całą weryfikację oparłem
> o inspekcję DOM (`eval`) oraz snapshoty accessibility tree zapisywane pod własnymi
> nazwami. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń
> w katalogu `.playwright-cli/` (ignorowanym przez Git, **współdzielonym** między
> równoległymi sesjami audytów), nie są wymaganym evidence i nie zostały dołączone do repo.
