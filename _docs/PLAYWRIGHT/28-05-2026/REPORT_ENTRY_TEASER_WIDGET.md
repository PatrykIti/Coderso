# RAPORT: Entry Teaser Widget — audyt domykający luki (gap-close) Wizard / Visual / Advanced + frontend

> **Status:** Zakończony
> **Data audytu:** 2026-05-29 (aktualizacja raportu z 2026-05-28 — domknięcie luk)
> **Sesja Playwright:** `claude-29-05-entry-teaser-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Cel sesji:** domknięcie luk z poprzedniego audytu — `fallbackToLatest=off/on` z **obserwowalnym** wynikiem, gałęzie pickerów trasy/linku CTA, pozostałe gałęzie media/icon oraz selecty stylu/layoutu, na encjach **z realnym obrazem, excerptem i tagami**.

---

## 0. WAŻNE — rozbieżność identyfikatorów w zleceniu (zweryfikowana)

Zlecenie wskazywało:
- **Admin page id:** `5958b461-fd78-4b65-b154-64692c0fa474`
- **Public route:** `http://localhost:3000/entry-teaser-widget-test`

Obie wartości **nie wskazują na widget entry-teaser**:
- Strona admin `5958b461-…` to **„Contract Test - logo-cloud"** — w canvasie jest **jeden blok logo-cloud** (`data-listing-widget="entry-teaser"` = 0, nagłówek „Trusted by teams worldwide"). Potwierdzone też mapowaniem smoke: `widget-contract-smoke-task-336-19-logo-cloud-2026-05-26.json` → `5958b461 → logo-cloud`.
- Public route `/entry-teaser-widget-test` zwraca **HTTP `404`** (trasa nie istnieje / nieopublikowana).

Poprawny fixture entry-teaser (zweryfikowany w `widget-contract-smoke-task-336-19-full-rerun-2026-05-26.json`, gdzie `pageId 8ccacd83 → entry-teaser`, oraz w canvasie):
- **Admin:** `/admin/pages/8ccacd83-70eb-4e65-aac5-8c0767d4866b` („Contract Test - entry-teaser", 1 blok entry-teaser, stan zapisany `missing-source`).
- **Public:** `http://localhost:3000/test-entry-teaser-0516` → HTTP **`200`**.

**Decyzja:** audyt przeprowadziłem na **poprawnym** fixture entry-teaser (`8ccacd83` + `test-entry-teaser-0516`). Świadomie **nie** dodawałem bloku entry-teaser do współdzielonej strony logo-cloud (to zafałszowałoby cudzy fixture). Rozbieżność zgłaszam tu jawnie — prawdopodobnie copy-paste IDs z szablonu logo-cloud.

> **Pliki źródłowe:** `core/widgets/core/entryTeaser.tsx` (typy + schema + normalizacja + renderer `EntryTeaserBlock`) · `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` (edytory Wizard/Visual/Advanced + bridge podglądu) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` · `core/admin/ui/widgets/editors/LinkDestinationField.tsx` · `core/services/content/entryTeaserResolver.ts` + `core/admin/services/entryTeaserPreviewClient.ts` (rozwiązywanie źródła i preview).

> Uwaga metodologiczna: każde „działa / nie działa" zweryfikowane realną interakcją w UI **oraz inspekcją DOM** (`eval`) — atrybuty `data-entry-teaser-*`, klasy Tailwind sekcji/wrappera/obrazu, `width/height` `<img>`, hrefy/target/rel CTA, poziomy nagłówków, inline `style` koloru, liczba `<article>`. Do szybkiego dobrania encji z obrazem/tagami/featured wykonałem **probe API** (`/admin/api/widgets/entry-teaser/preview`) dla wszystkich 64 typów treści (tylko odczyt; bez zapisu).

> Uwaga o screenshotach: weryfikacja oparta **wyłącznie o inspekcję DOM** — **nie** zapisywałem zrzutów PNG. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do repo.

> Uwaga o trwałości: świadomie **nie** klikałem „Save draft" ani „Publish" — wszystkie edycje były w obrębie sesji edytora (niezapisane). Fixture admin pozostaje w stanie zapisanym (`missing-source`). Frontend (`test-entry-teaser-0516`) to **osobna**, opublikowana strona z własnym stanem.

> **Status TASK-343-29 (2026-05-30):** uwagi N3, N5 i N8 są zamknięte w kodzie. Publiczny
> `EntryTeaserBlock` nadaje sekcji `aria-labelledby` dla widocznego nagłówka albo fallback
> `aria-label="Entry teaser"`, non-link CTA ma jawny marker
> `data-entry-teaser-cta-unavailable` i `aria-disabled`, a Visual pokazuje guidance dla trybu Auto
> bez bezpiecznej trasy detalu oraz Selected site page bez bezpiecznego celu. Przyciski czyszczenia
> kolorów i CTA destination mają kontekstowe accessible names. Populated render przez Listing query
> pozostaje zależny od danych fixture ze stabilnymi entry-backed rows i nie został rozszerzony w tej
> rodzinie.

---

## 1. Encje użyte do domknięcia luk (dobrane probe'em API)

Probe `preview` dla wszystkich typów ujawnił encje, których brakowało poprzednio (poprzedni raport: N1/N4 — brak obrazu/tagów/excerptu, brak osobnego testu `fallbackToLatest=off`):

| Typ treści (content type) | ID | Najnowsza encja | Co wnosi |
|---|---|---|---|
| **Preview Products c127a216** | `54f01d8c-81fa-43e1-9f55-cad013f15662` | „Preview product c127a216" (published) | **Obraz** `/media/preview-detail-cover-c127a216.jpg` + **excerpt** „Published detail summary c127a216" + brak wpisu featured → idealne do `fallbackToLatest` **i** media/image/icon/aspect/height/fit |
| **Stories 48ff398d** | `63b73063-3994-4d93-8333-14fc38050395` | „Source Story" | **Tagi** `["bla bla","Featured"]` + ma wpis featured → tagi/tagLimit/showTags |
| Route Docs | `98b9e96d-5408-41d0-a9ab-1cbb7ae89202` | „Route doc (Copy)" (draft) | Alternatywny przykład `fallbackToLatest` (latest rozwiązuje, featured-off → empty) |
| House Projects Catalog QA 20260430 | `c99bd4cf-…` | „Dom Aurora 148" | Ma wpis featured + excerpt (gałąź „featured znaleziony") |

Probe potwierdził też (charakterystyka danych, istotna dla testów): w trybie **featured** z `fallbackToLatest=false` typy **Preview Products / Route Docs / testowy / Products** rozwiązują się do **`empty`** (brak wpisu featured), a **Stories 48ff398d** i **House Projects Catalog QA** rozwiązują wpis featured. To dało deterministyczny grunt pod test `fallbackToLatest`.

---

## 2. Architektura trybów edytora (bez zmian — potwierdzona)

Edytor otwiera się w stanie **„Setup complete"**: zakładki **`Visual`** (domyślna) i **`Advanced`**. **Wizard** to ekran wstępnej konfiguracji źródła — wejście „Run setup again", wyjście „Finish setup and open Visual" (nie jest równorzędną zakładką).

- **Wizard** — sekcja „Source mode": **Source type** (Content type / Listing query), **Mode** (Latest/Featured/Manual), pola warunkowe pickerów + osobny **Live preview** (realny `EntryTeaserBlock`).
- **Visual** — 8 sekcji widgetu (Variant and structure, Section context, Source summary [read-only], Teaser content fields, Layout and media, Style, CTA behavior, Fallback state) + współdzielone Block layout i Device visibility → **10 sekcji**.
- **Advanced** — w 100% read-only: Source diagnostics, Presentation diagnostics, Runtime summary, Contract summary + współdzielone summary → **6 sekcji**, **0 edytowalnych kontrolek** (potwierdzone tej sesji: 0 input/textarea/combobox/switch w panelu).

**Niuans wydajnościowy (potwierdzony przez kod + obserwację):** klucz preview (`buildEntryTeaserPreviewKey`) obejmuje tylko `sourceMode`, `source`, `fallbackToLatest`, `showImage`. Dlatego zmiana **`fallbackToLatest`** lub **`showImage`** **re-pobiera** preview z serwera, a zmiana `showExcerpt/showMeta/showTags`, media `aspect/height/fit`, stylu i layoutu jest stosowana **klient-side** z już rozwiązanej encji (natychmiast, bez round-tripa). Zaobserwowane zachowanie jest zgodne z tym kontraktem.

---

## 3. CO PRZETESTOWANO (zakres interakcji tej sesji)

Wszystko w sesji `claude-29-05-entry-teaser-gap-close`, weryfikacja inspekcją DOM:

- **Wizard:** Source type=Content type; Mode latest/featured; picker content type (Preview Products, Stories, Route Docs); przełączanie źródła z odświeżeniem live preview.
- **Visual — pola treści (na realnych danych):** Show image on/off (Preview Products — obraz), Show excerpt on/off (excerpt), Show meta on/off (data), Show tags on/off + Tag limit 0/3 (Stories — tagi).
- **Visual — media (na encji z obrazem):** Media mode image/icon/none; Image aspect auto/16:9/4:3/1:1; Media height auto/sm/md/lg; Object fit cover/contain — wszystkie kombinacje aspekt×wysokość zweryfikowane `width/height` i klasą `h-*`.
- **Visual — layout/styl:** Max width sm/md/lg/xl/full (wszystkie 5); Radius none/sm/md/lg/xl (wszystkie 5); Spacing none/sm/md/lg (wszystkie 4); Surface color (set `#00aa55` + „Clear").
- **Visual — CTA (gałęzie trasy/linku):** Destination mode Auto (auto-URL encji), Custom **bez** wyboru (→ non-link), Custom + wybór strony „HomePage"; Open in new tab on; CTA style link/filled/outline.
- **Visual — fallback:** **`fallbackToLatest` off→on→off** z obserwowalnym przełączeniem `ready ↔ empty`; fallback title/description w stanie `empty`.
- **Visual — struktura:** warianty horizontal/vertical/minimal; Section heading (PL znaki) + Section heading level H4 + Entry title heading level H2.
- **Advanced:** odczyt 4 sekcji read-only + potwierdzenie 0 kontrolek edytowalnych + wierność wobec edytowanego stanu.
- **Frontend (`/test-entry-teaser-0516`):** render zapisanego stanu, semantyka CTA, meta, a11y sekcji, konsola, responsywność 375 px.

---

## 4. CO DZIAŁA — szczegóły z dowodem DOM

### 4.1 `fallbackToLatest` off/on — LUKA DOMKNIĘTA (obserwowalny wynik)

Logika (`entryTeaserResolver.ts` `chooseTeaserEntry`): w trybie `featured`, gdy brak wpisu featured → przy `fallbackToLatest=true` zwraca **latest**, przy `false` zwraca **null** (→ `empty`).

Konfiguracja testowa: **Preview Products** (brak wpisu featured), Mode=**Featured**.

| Stan przełącznika | `data-entry-teaser-state` | Render |
|---|---|---|
| **ON** (domyślnie) | `ready` | rozwiązany **latest** = „Preview product c127a216" (z obrazem) ✓ |
| **OFF** | `empty` | 0 `<article>`; renderuje fallback: „No entry selected" / „Choose a source mode and content type to render teaser content." ✓ |
| **ON** (ponownie) | `ready` | znów „Preview product c127a216" — przełączenie **odwracalne** ✓ |

To jednoznaczna, obserwowalna różnica wywołana wyłącznie przełącznikiem (przy stałym źródle i trybie featured). Domknięta luka z poprzedniego N (pkt „`fallbackToLatest=off` — nie testowano osobno").

### 4.2 Media / image / icon — LUKA DOMKNIĘTA (encja z obrazem)

Encja „Preview product c127a216", obraz `/media/preview-detail-cover-c127a216.jpg`. `<img>` `width/height` z `mediaDimensionsMap` (aspekt jawny) lub `defaultVariantMediaDimensionsMap` (aspekt auto), klasa wysokości z `mediaHeightClassMap`:

| Media mode | Aspect | Height | `<img>` width×height | klasa wysokości | fit |
|---|---|---|---|---|---|
| image | auto | sm | 640×360 | `h-36` | object-cover |
| image | auto | md | 960×540 | `h-52` | object-cover |
| image | 16:9 | md | 960×540 | `h-52` | — |
| image | 1:1 | md | 480×480 | `h-52` | — |
| image | 1:1 | lg | 640×640 | `h-64` | — |
| image | 4:3 | sm | 480×360 | `h-36` | — |
| image | 4:3 | md | 640×480 | `h-52` | — |
| image | 4:3 | lg | 800×600 | `h-64` | — |
| image | — | — | — | — | cover→`object-cover`, contain→`object-contain` |

Wszystkie zgodne z mapami w kodzie. Pozostałe gałęzie media:
- **Icon or logo:** `<img>` dostaje dodatkowo `mx-auto max-w-[12rem]` i **wymuszony** `object-contain`; wrapper dostaje `bg-[var(--color-bg)]/70 p-6`. ✓
- **No media:** brak `<img>` (`hasImg=false`). ✓
- **Show image OFF** (przy media=image): brak `<img>`; ON → wraca. ✓

### 4.3 CTA — gałęzie trasy/linku — LUKA DOMKNIĘTA

| Kontrolka | Test | Efekt (DOM) |
|---|---|---|
| Destination mode = Auto | encja Preview Products | `<a href="/preview-products-c127a216/preview-product-c127a216">` (auto-URL z trasy detalu) ✓ |
| Destination mode = Custom, **bez** wyboru | — | CTA przestaje być linkiem → `<span class="inline-flex items-center opacity-70 …">` (nie `<a>`) — patrz N3 ✓ |
| CTA destination (picker strony) | wybór „HomePage" | `<a href="/homepage">` ✓ |
| Open in new tab | on | `<a target="_blank" rel="noopener noreferrer">` ✓ |
| CTA style = Link | — | `text-sm font-medium underline-offset-4 hover:underline` ✓ |
| CTA style = Filled button | — | `rounded-md bg-[var(--color-text)] px-4 py-2 … text-[var(--color-bg)] hover:opacity-90` ✓ |
| CTA style = Outline button | — | `rounded-md border border-[var(--color-border)] px-4 py-2 … hover:bg-[var(--color-bg)]/60` ✓ |

Picker strony („CTA destination", `LinkDestinationField`) ładuje listę opublikowanych stron (m.in. HomePage, Pricing Review Temp, Contract Test - *). Wybór poprawnie persystuje i renderuje klikalny `<a>`.

### 4.4 Styl / layout — selecty wyczerpane

| Select | Opcja → klasa/atrybut sekcji (zweryfikowane) |
|---|---|
| Radius | none→(brak) · sm→`rounded-md` · md→`rounded-lg` · lg→`rounded-xl` · xl→`rounded-2xl` |
| Spacing | none→`gap-0` · sm→`gap-3` · md→`gap-5` · lg→`gap-7` (na wrapperze `<article>`) |
| Max width | sm→`max-w-2xl` · md→`max-w-3xl` · lg→`max-w-5xl` · xl→`max-w-6xl` · full→`max-w-none` (+ `data-entry-teaser-max-width`) |

Wszystkie wartości enum kliknięte i potwierdzone — pełne pokrycie.

### 4.5 Pola treści na realnych danych (excerpt / meta / tagi)

- **Excerpt** (Preview Products): „Published detail summary c127a216" — Show excerpt off → znika, on → wraca. ✓
- **Meta** (Preview Products): „2026-05-19" (tu sama data; encja bez autora) — Show meta off → znika, on → wraca. ✓
- **Tagi** (Stories „Source Story"): `bla bla`, `Featured` — renderowane jako pigułki. Show tags off → znikają. **Tag limit**: `0` (Hide tags) → 0 tagów (`data-entry-teaser-tag-limit=0`); `3` → oba tagi (`…=3`). ✓ (mechanizm `slice(0, tagLimit)` potwierdzony — luka N4 domknięta).

### 4.6 Warianty i poziomy nagłówków

- **Vertical:** `flex flex-col gap-*`, tytuł `text-2xl`. **Minimal:** `flex flex-col gap-*`, tytuł **`text-lg`**. **Horizontal:** `flex flex-col md:flex-row md:items-stretch gap-*`, tytuł `text-2xl`. ✓
- **Section heading** „Polecany projekt (PL ąęś)" renderowany jako **`<h4>`** (Section heading level H4); **Entry title** jako **`<h2>`** (Entry title heading level H2). PL znaki OK. ✓

### 4.7 Kolory + Clear

- Surface swatch `#00aa55` → inline `background-color: rgb(0, 170, 85)` na sekcji; przycisk **„Clear" disabled → enabled**. „Clear" (kontrolka `style.surface`) → inline znika (`null`), „Clear" znów **disabled**. ✓ Spójna semantyka `SharedColorControl` (disabled przy theme-default, enabled po ustawieniu).

### 4.8 Advanced (read-only) — wierność

0 kontrolek edytowalnych. Diagnostyka wiernie odzwierciedla edytowany stan:
- Source type „Content type", Resolve mode „Latest entry", Setup state „Content type ID: 54f01d8c-… | Mode: Latest entry", Preview item „Preview product c127a216 (published)".
- Presentation: Variant „Horizontal", Media „**Image / Auto / Default**", Layout „**Full width**", Style „**Radius Extra large, spacing Spacious**", Colors „**Theme defaults**" (po wyczyszczeniu).
- Runtime: Preview status „Resolved", Resolved item „Preview product c127a216 (published)", Runtime source „Content type resolved". ✓✓

### 4.9 Frontend (`/test-entry-teaser-0516`) — HTTP 200

- `state=ready`, wariant `minimal`, `source.mode=legacy`, `sourceMode=manual`; rozwiązany wpis **„QA Test Article 2026 (updated)"**.
- Tytuł `<h3>` (domyślny poziom), brak nagłówka sekcji; meta **„2026-04-30 • Patryk"** (data • autor).
- CTA `<a href="/testowy/qa-test-article-2026">` (auto-URL, klasa link, bez target/rel — `opensInNewTab=false`).
- `max-w-5xl rounded-xl` (maxWidth lg, radius lg — wartości zapisane). Brak obrazu (encja bez grafiki).
- **Konsola: 0 błędów / 0 ostrzeżeń.** **Responsywność 375 px:** brak poziomego overflow (`scrollWidth==clientWidth==375`); `minimal` zwija się do `flex flex-col gap-5`.
- **Izolacja:** niezapisane edycje admina (Preview Products, media, fallback off itd.) **NIE** wyciekły na front — front pokazuje wyłącznie własny stan zapisany. ✓

---

## 5. CO NIE DZIAŁA / TWARDE BUGI

**Nie wykryto żadnego twardego buga renderowania kontrolek ani błędu konsoli.** Wszystkie przetestowane kontrolki Wizard/Visual działają i aktualizują podgląd na żywo; Advanced jest w pełni read-only i wiernie podsumowuje stan; frontend jest wolny od overflow i błędów konsoli. (Brak nowych regresji względem 28-05.)

---

## 6. CZEGO NIE DA SIĘ W PEŁNI ZWERYFIKOWAĆ (z dokładną przyczyną)

| Kontrolka / obszar | Przyczyna blokady |
|---|---|
| **Fixture wskazany w zleceniu** (`5958b461` + `/entry-teaser-widget-test`) | ID wskazuje na **logo-cloud** (strona „Contract Test - logo-cloud", 0 bloków entry-teaser), a podana trasa public zwraca **404**. Audyt entry-teaser na tych zasobach niemożliwy — przeszedłem na poprawny fixture `8ccacd83` + `/test-entry-teaser-0516` (patrz §0). |
| **Ścieżka „Listing query" (populated render)** | W tej sesji skupiłem się na domknięciu `fallbackToLatest` + media/CTA przez źródło **Content type** (gdzie zdobyłem encje z obrazem/tagami). Gałęzi **Listing query / Listing template / Manual listing row** w trybie populated **nie przećwiczyłem ponownie** w tej sesji; poprzedni audyt (N1) wykazał, że dostępne listingi rozwiązywały się do `empty`, a manual-row pokazywał „This listing preview has no stable row IDs for manual selection." — blokada zależna od danych (listingi bez stabilnych, entry-backed wierszy). Status: **nie potwierdzono** populated renderu przez listing. |
| **Zapis i publikacja (Save draft / Publish)** | Świadomie pominięte, by nie modyfikować współdzielonego fixture admin. Trwałość edycji po przeładowaniu i propagacja na front **nie** testowane (zweryfikowano za to spójność w obrębie sesji i izolację frontu). |
| **Gałąź „featured znaleziony" dla Content type** | Preview Products i Route Docs nie mają wpisu featured (stąd nadawały się do testu fallbacku). Rozwiązanie wpisu **oznaczonego featured** potwierdziłem pośrednio probe'em (Stories/House Projects Catalog QA zwracają wpis przy featured-off), ale nie robiłem osobnego porównania UI featured-vs-latest na tej samej encji featured. |
| **Twarde limity normalizacji** (`cta.label`≤32, `fallback.title`≤60, `fallback.description`≤200, `tagLimit` 0–12) | Egzekwowane przez `maxLength` inputów i `normalizeEntryTeaserData`; nie dochodziłem do granic znak-po-znaku. |
| **Walidacja `normalizeWidgetSafeHref` dla ręcznego URL CTA** | Testowałem tylko wybór strony z pickera (LinkDestinationField), nie ręczny wpis niebezpiecznego/relatywnego/hash URL. |
| **Stany błędu preview** (`resolved.error`, „Resolved teaser preview is unavailable…") | Nie wywoływane (sesja zalogowana, API odpowiadało 200). |

---

## 7. NIUANSE UX / UI (do decyzji produktowej — nie blokery)

| # | Obszar | Obserwacja |
|---|---|---|
| **N3** | Visual / CTA | W trybie Destination = „Selected site page" **bez** wskazanej strony CTA **cicho** przestaje być linkiem — renderuje się jako wyszarzony `<span class="… opacity-70">`, bez ostrzeżenia w edytorze. Analogicznie tryb „Auto", gdy rozwiązany wpis nie ma trasy detalu. Po wskazaniu strony link wraca poprawnie. (Re-potwierdzone tej sesji.) |
| **N5** | Renderer / a11y | Główny `<section>` **nie ma** `aria-label` ani `aria-labelledby` (oba `null` w adminie **i** na froncie). Nagłówek sekcji, gdy ustawiony, renderuje się jako zwykły `<h2/h3/h4>` bez `id` i **nie jest** powiązany z regionem. Brak dostępnej nazwy regionu — identycznie admin↔front (cecha renderera, nie rozjazd). |
| **N6** | Visual / UX | „Field preview" w sekcji „Teaser content fields" to **uproszczony mockup** (`data-entry-teaser-field-preview`), nie pełny renderer — pokazuje placeholder obrazu nawet gdy realny wpis go nie ma i miesza tekst fallbacku z meta. Canvas/preview Wizarda pozostają źródłem prawdy. |
| **N7** | Logika (code review) | `resolveEntryTeaserSpacing`: `if (value==="none"||"sm"||"lg") return value; return "md";` — „md" i każda zła wartość trafiają do tego samego fallbacku „md". Nieszkodliwe (domyślna i tak „md"), ale niespójne z resolverami jawnie wymieniającymi wszystkie tokeny. |
| **N8 (nowy)** | Testowalność / a11y | Przyciski **„Clear"** kolorów nie mają unikalnej dostępnej nazwy — w panelu jest kilka przycisków o nazwie samego „Clear" (Surface, Border, a także w Block layout). Lokalizacja `getByRole('button',{name:'Clear'})` jest **niejednoznaczna** (trafia w pierwszy pasujący). Sugestia: dodać kontekst do etykiety (np. „Clear surface color"). Funkcjonalnie działa po doprecyzowaniu selektora do `[data-widget-control-path]`. |
| **N9 (nowy, pozytywny)** | Wydajność | Tylko `fallbackToLatest` i `showImage` re-pobierają preview z serwera; pozostałe toggle pól, media, styl i layout stosują się **klient-side** z już rozwiązanej encji — natychmiastowy podgląd bez zbędnych round-tripów (zgodne z `buildEntryTeaserPreviewKey`). |

**Status TASK-343-29:** N3/N5/N8 są zamknięte. Visual nie zostawia już non-link CTA bez
wyjaśnienia, renderer wiąże region z nagłówkiem sekcji albo fallback label, a repeated Clear actions
mają nazwy dostępne z kontekstem pola. N7 pozostaje historycznym niuansem resolvera bez zmiany
zachowania, a Listing query populated render nadal wymaga fixture z entry-backed stable row IDs.

---

## 8. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas / preview | Frontend (`/test-entry-teaser-0516`) | Zgodność |
|---|---|---|---|
| Renderer | `EntryTeaserBlock` | identyczny `EntryTeaserBlock` | ✓ wspólny kod |
| Atrybuty `data-entry-teaser-*` | ✓ żywe | ✓ identyczna semantyka | ✓ |
| Rozwiązanie wpisu | ✓ przez preview API (Preview Products / Stories / Route Docs) | ✓ ze stanu zapisanego (manual → „QA Test Article 2026 (updated)") | ✓ |
| Obraz / aspect / height / fit | ✓ zweryfikowane na encji z grafiką | (encja zapisana bez grafiki) | ✓ logika spójna |
| Tagi / excerpt / meta | ✓ na realnych danych | ✓ meta „data • autor" | ✓ |
| CTA auto-URL / target / rel | ✓ (`/preview-products-…`, custom `/homepage`, `_blank`+rel) | ✓ (`/testowy/qa-test-article-2026`, bez target/rel) | ✓ |
| `aria-label`/`aria-labelledby` | ✗ brak (`null`) | ✗ brak (`null`) | ✓ zgodne (N5) |
| Niezapisane edycje admina | widoczne w sesji edytora | **nieobecne** | ✓ poprawna izolacja |

**Wniosek:** renderer współdzielony; canvas, live preview Wizarda i front zachowują się spójnie. N5 (brak dostępnej nazwy sekcji) występuje identycznie po obu stronach.

---

## 9. Podsumowanie

- **Domknięte luki z 28-05:** (1) `fallbackToLatest` off/on — **obserwowalny** wynik `ready ↔ empty` (featured bez wpisu featured); (2) media/image/icon/aspect/height/fit — pełne pokrycie na encji z realnym obrazem (`Preview Products`); (3) gałęzie CTA — auto / custom+strona / custom-bez-celu (non-link) / new tab / style link-filled-outline; (4) selecty stylu/layoutu — wszystkie wartości enum (radius×5, spacing×4, maxWidth×5); (5) tagi/tagLimit/showTags na encji z tagami (`Stories`); (6) excerpt/meta na realnych danych.
- **Stan widgetu:** funkcjonalnie **dobry** — brak twardych bugów i błędów konsoli; Advanced w pełni read-only i wierny; frontend wolny od overflow (375 px) i poprawnie izolowany.
- **Najważniejsze uwagi:** rozbieżność ID w zleceniu (§0 — wskazany fixture to logo-cloud / trasa 404); (N3) CTA „Custom" bez celu cicho przestaje być linkiem; (N5) `<section>` bez dostępnej nazwy (admin+front); (N8) niejednoznaczne etykiety „Clear"; (N6) „Field preview" to mockup; (N7) drobna niespójność `resolveEntryTeaserSpacing`.
- **Nie potwierdzono:** populated render przez **Listing query** (blokada danych — listingi bez stabilnych entry-backed wierszy) oraz trwałości po Save/Publish (świadomie pominięte).

---

## 10. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję DOM (`eval`) oraz probe API preview. Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence i nie zostały dołączone do repo.
