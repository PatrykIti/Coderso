# RAPORT: Rich Text Section Widget — pogłębiony audyt current-state z domknięciem luk (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data audytu pierwotnego:** 2026-05-28 · **Data domknięcia luk (ten upgrade):** 2026-05-29
> **Sesja Playwright (upgrade):** `claude-29-05-rich-text-gap-close` (izolowana, nazwana przeglądarka, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/1e0f651b-d7c0-4c03-8e3b-07bff2c1d5ca` (status `Draft`, „Contract Test - rich-text-section", canvas: dokładnie jeden render `blk-1`)
> **Fixture public:** http://localhost:3000/richtextsectiontest
> **Pliki źródłowe:** `core/widgets/core/richTextSection.tsx` (renderer + normalizacja + sanitizer HTML + embed/media + kotwice nagłówków/TOC) · `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` (edytory Wizard/Visual/Advanced) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kolor + „Use transparent") · `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` (WYSIWYG body/bloku) · `core/services/posts/editor/postRichText*` (serializer/sanitizer upstream)

> **Cel tego upgrade'u (domknięcie luk z 28-05):** wyczerpujące, realne wyklikanie rodzin kontrolek, które poprzedni raport oznaczył jako nietestowane: **media picker (image + attachment)**, **przycisk „Use transparent"**, **per-blokowy select poziomu nagłówka**, **dodawanie/usuwanie/przenoszenie/paginacja bloków**, **wszystkie providery embed + odrzucanie złych URL**, oraz **wyzwalacze diagnostyki sanitizera**. Tam, gdzie kontrolki nie dało się w pełni zweryfikować, podano **dokładną nazwę kontrolki i powód**.

> **Metodologia evidence:** każde twierdzenie „działa / nie działa / nie da się przetestować" pochodzi z realnej interakcji w UI (klik kart/przycisków, otwieranie selectów Radix, wpisywanie do WYSIWYG, dialog `window.prompt`, dialogi potwierdzenia, Undo, paginacja) **plus** inspekcji DOM przez `eval` w mojej własnej nazwanej sesji (atrybuty `data-rich-text-*`, struktura `<figure>/<img>/<a>/<h*>`, inline `style`, klasy Tailwind, `rel`/`target`, liczniki bloków, treść notatek diagnostycznych). Canvas zawsze zawierał dokładnie jeden blok `blk-1`, więc odczyty dotyczyły wyłącznie widgetu `rich-text-section`.

> **Uwaga o screenshotach:** w tym audycie **nie** zapisywałem zrzutów PNG jako evidence. Weryfikacja opiera się o `eval` + snapshoty accessibility tree zapisywane przez `playwright-cli` pod automatycznymi nazwami w katalogu `.playwright-cli/` (ignorowany przez Git, **współdzielony** między równoległymi sesjami agentów). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń, nie są wymaganym evidence i nie zostały dołączone do repo.

---

## 1. Przegląd widgetu

**Typ:** `rich-text-section` · **Kategoria:** `content` · **Opis:** „Long-form copy block with safe HTML rendering, rich fallback blocks, and editorial layout controls."

**Warianty:** `single-column` (domyślny), `two-column` (`grid-cols-1 lg:grid-cols-3` — kolumna TOC + treść), `article` (semantyczny `<article>`).

**Model danych (`RichTextSectionData`):**

| Sekcja | Pola |
|--------|------|
| **titleBlock** | `eyebrow`, `title`, `headingLevel` (1/2/3) |
| **body** | `html` (sanitizowany HTML, max 24000 zn.), `blocks[]` |
| **body.blocks[]** | 4 rodzaje: `text` (heading, headingLevel 2/3/4, contentHtml/content), `image` (mediaId/src, alt, decorative, caption, href, width content/wide/full, align left/center/right), `attachment` (mediaId/src, label, description, mimeType, sizeLabel), `embed` (provider youtube/vimeo/external-link, url, title, aspectRatio 16:9/4:3/1:1, renderMode link-card) |
| **options** | `dropcap` (bool), `toc` (bool), `maxWidth` (md/lg/xl/full), `outputMode` (html/blocks-fallback/blocks) |
| **style** | `fontScale` (none/sm/md/lg), `lineHeight` (none/tight/normal/relaxed), `textColor` (clearable), `background` (clearable + „transparent"), `spacing` (none/sm/md/lg) |

**Ograniczenia bloków:** min 0 / max 20. Liczba bloków **data-driven** (kontrolka „Blocks count" realnie dodaje/ucina tablicę), `blockPageSize=5` (paginacja od 6 bloków w górę).

**Dwa źródła treści + tryb wyboru źródła:** `body.html` (WYSIWYG) i strukturalne `body.blocks`. `options.outputMode`: `html` (zawsze body), `blocks` (zawsze bloki), `blocks-fallback` (body jeśli niepusty, inaczej bloki). Atrybut `data-rich-text-rendered-source` raportuje faktyczne źródło renderu.

**Bezpieczeństwo renderu:** `body.html` przez allowlist (`p, br, strong, em, u, s, a, ul, ol, li, blockquote, code, pre, h2, h3, h4, hr, span`) — `img, iframe, script, style, h1` oraz `on*` usuwane, niebezpieczne `href` przepisywane na `#`. Obrazy/embedy wyłącznie przez bloki strukturalne (image → MediaPicker, embed → provider-validated link-card). Linki zewnętrzne dostają `target="_blank" rel="noopener noreferrer"`. Nagłówki H2–H4 w body dostają scope'owane do UUID `id` (kotwice → TOC).

---

## 2. Architektura trybów edytora (niezmieniona względem 28-05)

Panel edytora ma **dwie zakładki: `Visual` i `Advanced`**. **Wizard nie jest zakładką** — wchodzi się przyciskiem **„Run setup again"**. Komunikat: *„Setup complete — Daily edits live in Visual. Advanced is for technical diagnostics."*.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | Sekcja „Starter copy": select wariantu (jedyna interaktywna kontrolka), read-only info o trybie wyjścia, read-only podgląd pierwszych dwóch bloków tekstowych. |
| **Visual** | zakładka „Visual" (domyślna) | 6 sekcji widgetu: Variant and layout structure, Title block copy, Body content, Structured content blocks, Reader options, Typography and colors + współdzielone Block layout / Device visibility. |
| **Advanced** | zakładka „Advanced" | 4 sekcje widgetu **read-only**: Output mode and source diagnostics, Sanitizer diagnostics, Saved content summary, Contract summary + współdzielone summary. **Brak edytowalnych kontrolek widgetu.** |

---

## 3. Co przetestowano w TYM upgrade (zakres interakcji)

Wszystko wykonane w sesji `claude-29-05-rich-text-gap-close`, zweryfikowane `eval`:

- **Baseline:** logowanie, otwarcie fixture, odczyt atrybutów `data-rich-text-*` w canvas i na public (porównanie draft↔public).
- **Use transparent (Background):** klik przycisku → inline `background-color: transparent` + badge „Transparent".
- **Per-blokowy heading level:** blok tekstowy 1 H2 → **H4**, weryfikacja zmiany tagu w renderze (tryb blocks).
- **Source preference → blocks:** przełączenie na „Use structured blocks only", aby bloki realnie renderowały się w canvas (warunek widoczności zmian image/embed/heading).
- **MediaPicker image:** Browse media → Media library → wybór realnego assetu → render `<figure>/<img>`; caption → `<figcaption>`; Link URL → wrap `<a>`; Decorative → pusty alt; Width Full; Alignment Left; **usunięcie media (clear)** → znika `<figure>`.
- **MediaPicker attachment:** Browse media → Media library (filtr application/audio/video/text) → **„No media assets found"**; wypełnienie pól Label/Description/MIME/Size label; weryfikacja braku renderu karty bez `src`.
- **Bloki — dodawanie:** Add image / attachment / embed / text (count 2 → 6).
- **Bloki — paginacja:** 6 bloków → strona 1 (Block 1–5, „Previous" disabled), strona 2 (Block 6, „Next" disabled), nawigacja „Previous"/„Next".
- **Bloki — reorder:** **Move up** (pozycja 6 → 5) — uzupełnia „Move down" z poprzedniego audytu.
- **Bloki — Remove + Undo:** dialog „Remove Heading 6?…" → count 6 → 5 → Undo notice → Undo → powrót do 6.
- **Embed providery:** youtube.com/watch, youtu.be, vimeo.com, example.com (external-link), `javascript:alert(1)`, „not a valid url"; Card title (override link text); Aspect ratio token (16:9 → 1:1).
- **Sanitizer diagnostics:** sformatowanie akapitu body jako **Heading 1** (Text → Heading 1) → notatka „Sanitizer guidance" w Visual; odczyt Advanced „Sanitizer diagnostics"; wstawienie linku z URL `javascript:alert(1)` i weryfikacja neutralizacji w renderze (`href="#"`, 0 × `<h1>`).
- **Izolacja + frontend:** beforeunload prompt (niezapisany draft), public bez wycieku edycji, 375 px bez overflow, konsola public 0/0, `<section aria-labelledby>`.

---

## 4. Co DZIAŁA — szczegóły zweryfikowane w DOM (nowe ścieżki tego upgrade'u)

### 4.1 Przycisk „Use transparent" (Background color)
- Klik → sekcja w canvas dostaje inline `style="background-color: transparent;"`, badge kontrolki pokazuje **„Transparent"**. Spójne z `SharedColorControl` (`allowTransparent`, `onChange("transparent")`). ✓

### 4.2 Per-blokowy select poziomu nagłówka (text block)
- W trybie `blocks` blok 1 zmieniony H2 → **H4**: render bloku w canvas zmienił tag z `<h2>` na `<h4>` (odczyt: `["H2:Long-form content section","H4:Clear structure for readable content","H3:What works best"]`). Tytuł sekcji pozostał H2, blok 2 H3 — niezależność per-blok potwierdzona. ✓

### 4.3 MediaPicker — blok IMAGE (pełna rodzina ścieżek)
Po „Browse media" otwiera się dialog **„Media library"** z filtrem **„Allowed: image/*"**. Biblioteka zawiera realne obrazy (m.in. `cos1.png`, kilka `image.png`).

| Ścieżka | Test | Efekt w canvas |
|---------|------|----------------|
| Wybór poprawnego assetu | klik miniatury w dialogu | `<figure>` + `<img src="http://localhost:3000/media/2026/02/5c485b87-…​.png" alt="image.png" loading="lazy" …>`; auto-alt z metadanych media (`media.alt/title/caption/originalName`). ✓ (`handleImageMediaSelection`, ścieżka sukcesu) |
| Caption | „Audyt podpis obrazu" | `<figcaption>` z tekstem podpisu. ✓ |
| Link URL | `https://example.com/story` | `<img>` opakowany w `<a href="https://example.com/story" target="_blank" rel="noopener noreferrer">`. ✓ |
| Decorative (switch) | on | `alt` obrazu czyści się do `""` (pusty). ✓ |
| Width | Full | klasa `<figure>`: `… w-full mr-auto ml-0` (wcześniej `max-w-4xl w-full` dla „Wide"). ✓ |
| Alignment | Left | klasa `mr-auto ml-0` (mapowanie align). ✓ |
| Usunięcie media (przycisk „×" w pickerze) | klik | `mediaId/src` czyszczone → `<figure>` znika (figures=0, imgs=0). ✓ (`handleImageMediaSelection`, gałąź `mediaId=null`) |

### 4.4 Bloki strukturalne — dodawanie / paginacja / reorder / Remove + Undo
- **Add text/image/attachment/embed** — każdy przycisk dokłada blok właściwego rodzaju; licznik „Blocks count" rośnie data-driven 2 → 6. ✓
- **Paginacja (od 6 bloków):** strona 1 pokazuje karty Block 1–5, „Previous" disabled; strona 2 pokazuje tylko Block 6, „Next" disabled; „Previous"/„Next" przełączają strony i ustawiają aktywny blok. ✓
- **Move up** (uzupełnienie luki): aktywny blok przeniesiony z „position 6 of 6" na „position 5 of 6". ✓ (`handleMoveBlock`, kierunek w górę)
- **Remove:** dialog „Remove structured block" z opisem „Remove Heading 6? This action can be undone from the editor notice.", Cancel/Remove → po Remove count 6 → 5, pojawia się notatka **„Heading 6 removed. Undo is available."** (Undo/Dismiss). ✓
- **Undo:** klik „Undo" → count wraca do 6 (przywrócenie tablicy bloków). ✓

### 4.5 Embed — wszystkie providery + odrzucanie złych URL
Render w trybie `blocks`, link-card (`renderRichTextEmbedBlockAsHtml` + `normalizeAllowedRichTextEmbedUrl`):

| URL wpisany | Provider label | href / efekt |
|-------------|----------------|--------------|
| `https://www.youtube.com/watch?v=…` | **YouTube** | `<a href=…​ target="_blank" rel="noopener noreferrer">`, URL widoczny w karcie. ✓ |
| `https://youtu.be/abc123` | **YouTube** | provider rozpoznany też dla skróconej domeny. ✓ |
| `https://vimeo.com/123456789` | **Vimeo** | link-card jw. ✓ |
| `https://example.com/article` | **External link** | link-card jw. ✓ |
| `javascript:alert(1)` | — | **brak renderu karty** (URL odrzucony → `null` → pusty HTML). ✓ |
| `not a valid url` | — | **brak renderu karty** (parsowanie URL zawodzi → `null`). ✓ |
| Card title | „Audyt tytul karty embed" | tekst linku w karcie = tytuł (override providerLabel). ✓ |
| Aspect ratio token | 16:9 → 1:1 | wartość selecta zmienia się na „1:1"; **brak widocznego efektu w renderze** (link-card nie używa proporcji — patrz niuans N7). ✓ (kontrolka działa, render obojętny) |

### 4.6 Sanitizer — wyzwolenie diagnostyki (kluczowe domknięcie luki)
- **Wyzwolenie diagnostyki H1:** akapit body sformatowany przez **Text → Heading 1** → w Visual pojawia się notatka **„Sanitizer guidance"** z komunikatem: *„H1 is removed from the body. Use the section title or H2/H3/H4 headings instead."* To realny `tag_removed: h1`. Mechanizm: serializer post-edytora **zachowuje** `<h1>` (jest w jego allowlist), więc tag dociera do `sanitizeRichTextHtmlWithDiagnostics` widgetu i zostaje zgłoszony. ✓ **(diagnostyka sanitizera wyzwolona interakcyjnie)**
- **Neutralizacja w renderze (bezpieczeństwo):** po przełączeniu Source preference na „Prefer rich text body" canvas renderuje body **bez żadnego `<h1>`** (`h1Count=0`) — H1 zostaje usunięte z publicznego renderu. ✓
- **Neutralizacja niebezpiecznego `href`:** wstawiłem link z URL `javascript:alert(1)` (toolbar „Link" → `window.prompt`). W DOM samego WYSIWYG anchor chwilowo trzyma `javascript:alert(1)`, ale w **renderze canvas** (tryb html) anchor wychodzi jako `href="#"` — niebezpieczny URL zneutralizowany. ✓ (security działa)

### 4.7 Izolacja niezapisanych edycji + frontend
- **beforeunload prompt** przy próbie opuszczenia admina potwierdza, że draft ma niezapisane zmiany (świadomie nie zapisywałem).
- **Public route nietknięty moimi edycjami:** mimo że w Visual ustawiłem tryb `blocks`/`html`, dodałem 6 bloków, media, embed itd. — public nadal serwuje stan zapisany: `output-mode=blocks-fallback`, `rendered-source=html`, `variant=single-column`, `font-scale=md`. **Silny dowód izolacji draft↔public.** ✓
- **Brak `javascript:` w HTML public.** ✓
- **375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`). ✓
- **Konsola public:** **0 błędów, 0 ostrzeżeń.** ✓
- **A11y:** `<section aria-labelledby="rich-text-section-{uuid}-title">` obecny; `dropcap=true` (stan opublikowany). ✓

---

## 5. Co NIE DZIAŁA / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Wizard pokazuje „No paragraph text yet" dla bloków z treścią** | Wizard / podgląd | (Z 28-05, kod niezmieniony.) `value={(block.contentHtml ? "" : block.content)?.trim() || "No paragraph text yet"}` — gdy istnieje `contentHtml`, podgląd celowo pokazuje pusty string → „No paragraph text yet". Każdy blok z treścią rich-text wygląda w Wizard na pusty. **Mylące.** |
| **N2 — Rozbieżność dropcap: public=`true` vs draft adminowy=`false`** | Draft vs publish | Nadal aktualne: canvas baseline `dropcap=false`, public `dropcap=true`. Strona jest `Draft`, więc public serwuje **wcześniej opublikowaną** wersję. Niczego nie zapisywałem → rozbieżność nie pochodzi z mojej sesji. Do weryfikacji czy celowe. |
| **N3 — TOC/kotwice nie obejmują tytułu sekcji** | Renderer / TOC | `injectHeadingAnchors` działa tylko na renderowanym body; tytuł sekcji nigdy nie trafia do TOC ani nie dostaje kotwicy. `data-rich-text-toc-count` liczy tylko nagłówki body. |
| **N4 — Podwójny H2 w domyślnym fixture** | Semantyka / a11y | Tytuł H2 + pierwszy nagłówek body H2 → dwa H2 w jednej sekcji. (Można skorygować per-blok — N4 jest właśnie naprawialny mechanizmem z 4.2.) |
| **N5 — `body.html` i `body.blocks` mogą się cicho rozjeżdżać** | Model / UX | Dwa niezależne źródła; w `blocks-fallback` renderuje się body, ale bloki trzymają inną treść. Brak w UI ostrzeżenia o rozjeździe. Realnie obserwowane: HTML body ma akapit „Keep paragraphs concise…", którego nie ma w blokach. |
| **N6 — Pojedynczy bezetykietowy `<input>` w tabpanelu Advanced** | Advanced (drobne) | Jeden `<input>` bez `type/role/aria-label`, niepowiązany z sekcją diagnostyczną (najpewniej artefakt MediaPicker/uploadu montowany na poziomie panelu). **Nie** jest kontrolką widgetu. |
| **N7 — Embed „Aspect ratio token" bez widocznego efektu** | Embed / UX (nowe) | Jedyny `renderMode` to `link-card`, który **nie używa** proporcji. Select 16:9/4:3/1:1 zmienia dane, ale render link-card jest identyczny. Kontrolka działa, lecz dla użytkownika jest pozornie bezskutkowa (proporcja miałaby sens dopiero dla osadzonego playera). |
| **N8 — Notatka „Sanitizer guidance" jest ulotna** | Sanitizer / UX (nowe) | Komunikat H1 (`bodyDiagnostics`) pokazuje się tuż po edycji, ale przy remountcie edytora (np. przełączenie Advanced↔Visual) WYSIWYG wczytuje **już zsanityzowaną** (bez H1) wartość ze stanu — H1 znika wizualnie, a notatka się czyści. Autor, który szybko opuści sekcję, może nie zauważyć ostrzeżenia. |
| **N9 — Advanced „Sanitizer diagnostics" praktycznie zawsze pokazuje 0** | Advanced / diagnostyka (nowe) | Visual zapisuje do `body.html` **już zsanityzowany** HTML (`updateBody(…, { html: result.html })`). Advanced liczy diagnostyki ponownie na czystym, zapisanym HTML → zawsze „Diagnostics: 0". Potwierdzone: po wyzwoleniu notatki H1 w Visual, Advanced raportował „Stored HTML length: 304 characters · Diagnostics: 0". Niezerowy licznik w Advanced jest osiągalny **tylko** gdy zapisane dane już zawierają niedozwolony markup (np. import/legacy), nie przez normalną edycję w Visual. Nie jest to bug, ale czyni sekcję Advanced de facto stale-zerową. |
| **N10 — Podwójna warstwa sanityzacji shadowuje `href_rewritten`** | Sanitizer / nuance (nowe) | Niebezpieczny `href` jest neutralizowany do `#` w renderze (bezpieczeństwo OK), ale **diagnostyka `href_rewritten`** widgetu nie pojawia się w Visual, bo upstreamowy serializer post-edytora neutralizuje URL zanim widgetowy sanitizer porówna `originalHref` vs `sanitizedHref`. Widget „nie widzi" przepisania. Efekt bezpieczeństwa zachowany; komunikat dla autora — nie. |

**Nie wykryto** żadnego twardego buga renderowania, błędu konsoli na froncie (0/0), ani wycieku niezapisanych edycji na public. Wszystkie wyklikane kontrolki działają i aktualizują podgląd na żywo; Advanced wiernie podsumowuje stan; embed jest bezpiecznie normalizowany; niebezpieczny `href` i `h1` są neutralizowane w renderze.

---

## 6. Czego NIE DA SIĘ przetestować w tym fixture/środowisku (dokładna nazwa + powód)

- **MediaPicker bloku ATTACHMENT — wybór assetu + render karty + `handleAttachmentMediaSelection` (sukces i błąd „image-invalid"):** dialog „Media library" filtrowany na `application/*, audio/*, video/*, text/*` zwraca **„No media assets found"**. **Powód:** współdzielona biblioteka mediów zawiera **wyłącznie obrazy** (brak PDF/audio/wideo/tekstu). Bez selektowalnego assetu nie da się: (a) wyrenderować karty attachment (renderer zwraca pusty HTML bez `src`), (b) trafić ścieżki sukcesu handlera, (c) trafić błędu „Selected asset cannot be used as a public attachment card." (bo to wymaga wybrania obrazu, którego filtr i tak nie pokazuje). Zweryfikowano jedynie, że pola tekstowe (Label/Description/MIME type/Size label) aktualizują dane, a karta **nie** renderuje się bez media `src` (zgodne z amber-notką „Pick a public document, audio, or video file…").
- **MediaPicker bloku IMAGE — ścieżka błędu `rich_text_image_media_invalid` („Selected image is unavailable or missing a public render URL."):** **Powód:** picker filtrowany na `image/*`; nie da się przez UI wybrać assetu bez URL ani nie-obrazu, więc warunek błędu (`!media.url || !mime image/*`) jest nieosiągalny interakcyjnie. Zweryfikowano tylko ścieżkę sukcesu i czyszczenia.
- **Advanced „Sanitizer diagnostics" z niezerowym licznikiem:** **Powód:** Visual zapisuje już zsanityzowany HTML (patrz N9), więc Advanced nie ma czego zgłosić. Osiągalne wyłącznie przy danych z importu/legacy zawierających niedozwolony markup — poza zasięgiem edycji UI.
- **Diagnostyka `href_rewritten` w notatce Visual:** **Powód:** upstreamowy serializer post-edytora neutralizuje `href` przed widgetowym sanitizerem (patrz N10). Zweryfikowano natomiast realny efekt bezpieczeństwa (`href="#"` w renderze). Pozostałe kody diagnostyk (`tag_removed` dla `img/iframe/script/style`, `attribute_removed` dla `on*`) nie zostały wyzwolone — WYSIWYG nie pozwala ich wprowadzić, a serializer pre-strippuje; **jedynie `tag_removed: h1` udało się realnie wyzwolić** (bo serializer zachowuje h1).
- **Save / Publish i trwałość po reload:** świadomie **nie** zapisywałem (współdzielony fixture). Zweryfikowano izolację (public = stan zapisany) i istnienie niezapisanego draftu (beforeunload), ale nie propagację moich zmian na public.
- **Warianty two-column / article na froncie:** zapisany fixture to `single-column`; układy two-column (z TOC w kolumnie) i article na **public** nie były weryfikowane (tylko w canvas, w poprzednim audycie).
- **Limity/ucinanie pól** (HTML 24000, heading 180, content 12000, caption 240 itd.) oraz twarde max 20 bloków — nie testowane.
- **Pełna nawigacja klawiaturą / czytnik ekranu na froncie** — weryfikowano strukturę ARIA przez DOM, nie realną nawigację SR.

---

## 7. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas | Frontend (`/richtextsectiontest`) | Zgodność |
|--------|--------------|-----------------------------------|----------|
| Atrybuty `data-rich-text-*` | ✓ żywy render | ✓ identyczny renderer | ✓ wspólny renderer |
| Wariant / max-width / typografia | ✓ live z Visual | ✓ (stan zapisany) | ✓ |
| Source preference / rendered-source | ✓ live (html/blocks/fallback) | ✓ (`blocks-fallback`→html) | ✓ |
| Image block (figure/img/figcaption/anchor) | ✓ live po wyborze media | (fixture bez aktywnego image w html) | ✓ logika spójna |
| Embed → link-card (provider) | ✓ youtube/youtu.be/vimeo/external | (fixture bez embed) | ✓ logika spójna |
| Niebezpieczny href / h1 | ✓ neutralizowane (`#`, brak h1) | ✓ brak `javascript:` w HTML | ✓ bezpieczne |
| Dropcap | ✓ live | ✓ `dropcap=true` (publish) | ⚠ wartość różni się — N2 |
| Niezapisane edycje z Visual | widoczne w sesji | **nieobecne** | ✓ poprawna izolacja |
| Konsola | (admin niesprawdzany 0/0) | 0 błędów / 0 ostrzeżeń | ✓ front czysty |

**Wniosek:** renderer wspólny; canvas i front spójne. Jedyna różnica wartości (N2 — `dropcap`) to rozbieżność draft↔published, nie błąd renderera.

---

## 8. Podsumowanie

- **Wszystkie rodziny kontrolek wskazane jako luki z 28-05 zostały realnie wyklikane i zweryfikowane w DOM** — z wyjątkiem ścieżek, które fizycznie blokuje środowisko (patrz pkt 6, z dokładnym powodem).
- **DZIAŁA (nowo potwierdzone):** „Use transparent" (inline `transparent` + badge), per-blokowy heading level (H2→H4 zmienia tag), **MediaPicker image** w pełnej rodzinie (wybór assetu z auto-alt + lazy, caption→figcaption, link→bezpieczny anchor, decorative→pusty alt, width Full→`w-full`, align Left, usunięcie media→znika figure), **dodawanie bloków, paginacja (Previous/Next od 6 bloków), Move up, Remove + Undo**, **wszystkie providery embed** (youtube/youtu.be/vimeo/external-link) z odrzuceniem `javascript:` i niepoprawnego URL, card-title override, oraz **wyzwolenie diagnostyki sanitizera H1** („Sanitizer guidance") z neutralizacją H1 i niebezpiecznego `href` w renderze.
- **NIE DA SIĘ przetestować (z powodem):** wybór i render **attachment** (biblioteka ma tylko obrazy → „No media assets found"); ścieżka błędu image-invalid (filtr `image/*`); niezerowe diagnostyki w **Advanced** (Visual zapisuje czysty HTML — N9); notatka `href_rewritten` w Visual (shadowing przez upstream serializer — N10); Save/Publish (świadomie pominięte); two-column/article na froncie.
- **NIUANSE UX (nowe):** N7 (aspect ratio embed bez efektu w link-card), N8 (ulotna notatka sanitizera), N9 (Advanced sanitizer stale-zerowy), N10 (podwójna sanityzacja shadowuje `href_rewritten`). Plus utrzymane N1–N6.
- **Bezpieczeństwo:** mocne — niebezpieczny `href` → `#`, `h1` usuwane z renderu, embed jako provider-validated link-card (brak surowego iframe), linki zewnętrzne z `rel="noopener noreferrer"`, obrazy wyłącznie przez MediaPicker z walidacją `image/*` po stronie handlera.
- **Frontend czysty:** 0/0 konsoli, brak overflow 375 px, semantyczna `<section aria-labelledby>`, niezapisane edycje admin **nie** wyciekają na public (potwierdzone beforeunload + odczytem public).
- **Brak twardych bugów.** Najważniejsze realne obserwacje to mylący Wizard (N1), rozbieżność dropcap draft↔public (N2), oraz dwie nowe diagnostyczne „ślepe plamki" Advanced/Visual (N9/N10), które nie obniżają bezpieczeństwa, ale ograniczają widoczność komunikatów dla autora.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG jako evidence — całą weryfikację oparłem o inspekcję DOM (`eval`) oraz snapshoty accessibility tree zapisywane automatycznie przez `playwright-cli` pod nazwami z timestampem w katalogu `.playwright-cli/` (ignorowanym przez Git, **współdzielonym** między równoległymi sesjami audytów). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń, nie są wymaganym evidence i nie zostały dołączone do repo.
