# RAPORT: Entry Teaser Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-entry-teaser` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/8ccacd83-70eb-4e65-aac5-8c0767d4866b` („Contract Test - entry-teaser")
> **Fixture public:** http://localhost:3000/test-entry-teaser-0516 (HTTP `200`)
> **Pliki źródłowe:** `core/widgets/core/entryTeaser.tsx` (typy + schema + normalizacja + renderer `EntryTeaserBlock`) · `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` (edytory Wizard/Visual/Advanced + preview bridge) · `core/admin/ui/widgets/editors/SharedColorControl.tsx` (kontrolka koloru) · `core/services/content/entryTeaserResolver.ts` + `core/admin/services/entryTeaserPreviewClient.ts` (rozwiązywanie źródła i preview)

> Uwaga metodologiczna: raport jest celowo bogatszy niż smoke z 27-05-2026 (który był
> jedynie clean-smoke: `visual passed / advanced passed / public 200`). Każde stwierdzenie
> „działa / nie działa" zostało zweryfikowane realną interakcją w UI oraz inspekcją DOM
> (atrybuty `data-entry-teaser-*`, klasy Tailwind sekcji i wrappera, hrefy/target/rel CTA,
> poziomy nagłówków, inline `style` koloru, stan przycisków „Clear", liczba renderów),
> a nie tylko zliczeniem widocznych sekcji.

> Uwaga o screenshotach: weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`) —
> nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy byłyby **wyłącznie
> lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/` (ignorowany przez Git),
> nie są wymaganym evidence w repo.

> Uwaga o trwałości: świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać
> współdzielonego fixture admin. Wszystkie opisane edycje były wykonane w obrębie sesji
> edytora (niezapisane). Fixture admin pozostaje w stanie zapisanym (`missing-source`,
> wariant `horizontal`, wartości domyślne). Fixture public to **osobna**, opublikowana strona.

---

## 1. Przegląd widgetu

**Typ:** `entry-teaser` · **Kategoria:** `content` · **Opis:** „Highlighted teaser for one selected, latest, or featured entry."

Entry Teaser prezentuje **jeden** wpis (rozwiązany dynamicznie) jako wyróżniony teaser. Renderer (`EntryTeaserBlock`) jest **współdzielony** między canvasem admina, live preview Wizarda i frontem.

**Warianty (`visualOwnsVariantSelection = true` → wybór wariantu należy do Visual, nie Wizarda):**

| Wariant | Opis | Wrapper (zweryfikowany w DOM) |
|---------|------|-------------------------------|
| `horizontal` (domyślny) | Media i tekst obok siebie | `flex flex-col md:flex-row md:items-stretch gap-*` |
| `vertical` | Karta z mediami nad tekstem | `flex flex-col gap-*` |
| `minimal` | Kompaktowy teaser; mniejszy tytuł | `flex flex-col gap-*` + nagłówek `text-lg` (zamiast `text-2xl`) |

**Dwie osie źródła danych** (niezależne):
- **Source type (`source.mode`):** `legacy` (= „Content type") lub `listing` (= „Listing query").
- **Resolve mode (`sourceMode`):** `latest` / `featured` / `manual` — wspólne dla obu typów.

**Model danych (`EntryTeaserData`) — kluczowe sekcje:**

| Sekcja | Pola |
|--------|------|
| **source** | `mode` (legacy/listing), `contentTypeId`, `entryId`, `listingQueryId`, `listingTemplateId`, `listingManualTarget.{rowId,entryId}` |
| **sourceMode** | latest / featured / manual |
| **fields** | `showImage`, `showExcerpt`, `showMeta`, `showTags` (bool), `tagLimit` (0–12) |
| **cta** | `label` (max 32), `hrefMode` (auto/custom), `href`, `opensInNewTab`, `style` (link/filled/outline) |
| **style** | `surface` (clearable), `border` (clearable), `radius` (none/sm/md/lg/xl), `spacing` (none/sm/md/lg) |
| **section / title** | `section.title`, `section.headingLevel` (h2/h3/h4), `title.headingLevel` (h2/h3/h4) |
| **media** | `mode` (image/icon/none), `aspect` (auto/16:9/4:3/1:1), `height` (auto/sm/md/lg), `fit` (cover/contain) |
| **layout** | `maxWidth` (sm/md/lg/xl/full → `max-w-2xl`…`max-w-none`) |
| **fallback** | `title` (max 60), `description` (max 200), `fallbackToLatest` (bool) |
| **resolved** | read-only snapshot runtime (item, sourceTypeSlug, resolvedAt, error) |

**Trzy stany renderera** (atrybut `data-entry-teaser-state`):
- `missing-source` — brak źródła → przerywany box „Select content type to resolve teaser source." (lub „…listing query…").
- `empty` — źródło wybrane, ale nic nie rozwiązano → box z `fallback.title` + `fallback.description`.
- `ready` — rozwiązany wpis → pełny `<article>`.

**Stan fixture admin (zapisany):** `missing-source`, wariant `horizontal`, `source.mode=legacy`, `sourceMode=latest`, wszystkie `fields` on, `tagLimit=5`, `maxWidth=lg`, `media.mode=image`, `radius=lg`, `spacing=md`, CTA „Read more" / auto / link, fallback domyślny. To **pusty** fixture (renderuje sam komunikat o braku źródła) — populated runtime trzeba było wywołać przez wybór źródła w Wizardzie.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Tak jak w `posts-feed`/`faq-accordion`, edytor otwiera się w stanie **„Setup complete"** z dwiema zakładkami: **`Visual`** (domyślnie aktywna) i **`Advanced`**. Wizard **nie jest równorzędną zakładką** — to ekran wstępnej konfiguracji źródła, do którego wraca się przyciskiem **„Run setup again"**, a opuszcza przyciskiem **„Finish setup and open Visual"**.

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | „Run setup again" | Jedna sekcja **„Source mode"**: select **Source type** (Content type / Listing query), select **Mode** (Latest/Featured/Manual), oraz pola warunkowe (Content type + Manual entry; lub Listing query + Listing template + Manual listing row). Osobny **Live preview** („Reflects the current Wizard state through the shared widget renderer.") — to **realny** render `EntryTeaserBlock`. |
| **Visual** | zakładka „Visual" | 8 sekcji widgetu: **Variant and structure** (karty wariantu), **Section context** (heading + 2 poziomy nagłówka), **Source summary** (read-only), **Teaser content fields** (4 toggle + tag limit + lekki „Field preview"), **Layout and media** (max width, media mode/aspect/height/fit), **Style** (2 kolory + radius + spacing), **CTA behavior**, **Fallback state**. Plus współdzielone **Block layout** i **Device visibility** → **10 widocznych sekcji** (zgodne ze smoke 27-05). |
| **Advanced** | zakładka „Advanced" | 4 sekcje **w 100% read-only**: **Source diagnostics**, **Presentation diagnostics**, **Runtime summary**, **Contract summary** + współdzielone **Block layout summary** i **Visibility summary** → **6 widocznych sekcji** (zgodne ze smoke 27-05). **Zero edytowalnych kontrolek** (potwierdzono: 0 inputów / 0 comboboxów / 0 switchy / 0 przycisków / 0 textarea w całym panelu Advanced). |

**Niuans podglądu (różnica względem posts-feed):** w canvasie admina istnieje **jeden** żywy render `EntryTeaserBlock`. W Wizardzie pojawia się **drugi, realny** render (live preview oparty o ten sam renderer). Natomiast „Field preview" w Visual to **uproszczony mockup** (osobny `data-entry-teaser-field-preview`), a nie pełny renderer — odwzorowuje toggle pól, ale nie jest 1:1 z canvasem.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje w sesji `claude-28-05-entry-teaser`, zweryfikowane inspekcją DOM:

- **Wizard:** Source type (Content type ↔ Listing query, z czyszczeniem pól drugiej gałęzi); Mode (latest/featured/manual); picker Content type (wybór „Route Docs" → rozwiązanie wpisu); picker Manual entry (ładowanie listy wpisów + wybór konkretnego); ścieżka Listing query (wybór query, Listing template, Manual listing row); live preview reagujący na każdą zmianę.
- **Visual:** karty wariantu (horizontal/vertical/minimal); Section heading (PL znaki) + Section heading level (H4) + Entry title heading level (H2); Show meta toggle (off→on); Max width (Narrow); Media mode (No media); Radius (None); Spacing (Spacious); Surface color (ustawienie `#00aa55` + włączenie/działanie „Clear"); CTA label (PL); Open in new tab; CTA style (Filled); Destination mode (Auto→Custom + picker strony „HomePage"); Fallback title/description (PL) zweryfikowane realnym renderem w stanie `empty`.
- **Advanced:** odczyt i porównanie wszystkich 4 sekcji read-only z edytowanym stanem; potwierdzenie braku kontrolek edytowalnych.
- **Frontend:** render zapisanego fixture public, ARIA sekcji, semantyka CTA (href/target/rel), meta, brak błędów konsoli, responsywność 375 px, izolacja niezapisanych edycji admina.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard (Source mode)

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Source type → Content type / Listing query | przełączanie | Zmienia `data-entry-teaser-data-source-mode` (`legacy`↔`listing`) i czyści pola drugiej gałęzi; odsłania właściwe pickery. ✓ |
| Content type picker | wybór „Route Docs" | Stan `missing-source` → `ready`; preview rozwiązuje „Route doc (Copy)". ✓ |
| Mode → Latest | — | `data-entry-teaser-source-mode=latest`; rozwiązuje najnowszy wpis. ✓ |
| Mode → Featured | — | `…source-mode=featured`; przy braku featured **fallback do latest** (rozwiązano ten sam wpis — zgodne z `fallbackToLatest=true`). ✓ |
| Mode → Manual | — | Pojawia się picker **„Manual entry"**; lista ładuje się asynchronicznie („Route doc (Copy) (draft)", „Route doc (draft)"). ✓ |
| Manual entry | wybór „Route doc" | `…source-mode=manual`; rozwiązuje **dokładnie** wybrany wpis (CTA href = detal tego wpisu, różny od latest). ✓ |
| Listing query path | Source type=Listing query | Odsłania: **Listing query**, **Listing template** (opcjonalny), **Manual listing row** (z poprawnym komunikatem warunkowym, patrz N-uwagi). Help text: „Listing mode can resolve the latest result, the first featured result, or one deterministic manual row." ✓ |
| Listing query | wybór „House Projects Catalog Query …" | Ustawia `data-listing-query-id`, `data-entry-teaser-data-source-mode=listing`. ✓ (rozwiązanie — patrz N1) |

Auto-URL CTA: w trybie Content type rozwiązany wpis dostał `href` do realnej trasy detalu (`/route-docs-…/route-doc-…`), więc CTA renderuje się jako **klikalny `<a>`**.

### 4.2 Visual — kontrolki i efekt w canvas

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Wariant | Vertical / Minimal / Horizontal | `data-entry-teaser-variant` + klasa wrappera (`md:flex-row` dla horizontal; `flex-col` dla vertical/minimal); w `minimal` tytuł `text-lg`. ✓ |
| Section heading | „Polecany artykuł" | Renderuje nagłówek sekcji nad teaserem (PL znaki OK). ✓ |
| Section heading level | H4 | Nagłówek sekcji zmienia tag na `<h4>`. ✓ |
| Entry title heading level | H2 | Tytuł wpisu zmienia tag z `<h3>` na `<h2>`. ✓ |
| Show meta | off → on | Znika/wraca linia meta (data „2026-04-28"). ✓ |
| Tag limit / Show image / Show excerpt / Show tags | zmiana stanu | Toggle/select zmieniają stan w UI (zob. N4 — wizualnie nieweryfikowalne na użytych wpisach). |
| Max width | Narrow | Sekcja: `max-w-2xl`, `data-entry-teaser-max-width=sm`. ✓ |
| Media mode | No media | `data-entry-teaser-media-mode=none`. ✓ |
| Radius | None | Z klasy sekcji znika `rounded-xl`. ✓ |
| Spacing | Spacious | Wrapper artykułu: `gap-7`. ✓ |
| Surface color | swatch `#00aa55` | Inline `background-color: rgb(0, 170, 85)` na sekcji; przycisk **„Clear" przechodzi z disabled → enabled**; etykieta „Selected color". ✓ |
| Surface color → „Clear" | po ustawieniu | Usuwa inline `background-color` (sekcja przezroczysta), swatch wraca do `#ffffff`, „Clear" znów disabled. ✓ (Border color dzieli ten sam `SharedColorControl`) |
| CTA label | „Zobacz wpis" | Tekst CTA aktualizuje się live (PL OK). ✓ |
| Open in new tab | on | CTA `<a>` dostaje `target="_blank"` + `rel="noopener noreferrer"`. ✓ |
| CTA style | Filled button | Klasa CTA zmienia się na `rounded-md bg-[var(--color-text)] px-4 py-2 …`. ✓ |
| Destination mode | Auto → Custom | Odsłania picker **„CTA destination"** (LinkDestinationField); przy braku wyboru CTA przestaje być linkiem (zob. N3). ✓ |
| CTA destination | wybór „HomePage" | CTA znów `<a>` z `href="/homepage"` (target/rel z toggla zachowane). ✓ |
| Fallback title / description | „Brak wybranego wpisu (test)" / „Opis pustego stanu — test PL" | Inputy przyjmują i przechowują wartości; po przejściu na źródło rozwiązujące pusto (`state=empty`) canvas renderuje **moje** copy. ✓ |

**Spójność „Clear" w kolorach:** oba pola koloru (Surface / Border) używają wspólnego `SharedColorControl` — „Clear" jest **disabled przy wartości domyślnej** (theme default) i **enabled** dopiero po ustawieniu koloru. To poprawne, spójne zachowanie.

### 4.3 Advanced (read-only) — wierność odzwierciedlenia

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedlał edytowany stan (po ustawieniu Content type=Route Docs/latest oraz moich zmian Visual):

- **Source diagnostics:** „Source type: Content type", „Resolve mode: Latest entry", „Setup state: Content type ID: 98b9e96d-… | Mode: Latest entry", „Preview item: Route doc (Copy) (draft)". ✓
- **Presentation diagnostics:** „Variant: Horizontal", „Media: **No media / Auto / Auto**" (odzwierciedla moją zmianę media→none), „Layout: **Narrow**", „Style: **Radius None, spacing Spacious**", „Colors: **Theme defaults**" (po wyczyszczeniu koloru). ✓✓
- **Runtime summary:** „Preview status: Resolved", „Resolved item: Route doc (Copy) (draft)", „Runtime source: Content type resolved". ✓
- **Contract summary:** poprawny podział własności Wizard / Visual / Advanced. ✓
- **Brak edytowalnych kontrolek** (0 inputów/comboboxów/switchy/przycisków/textarea). ✓

### 4.4 Frontend (public `/test-entry-teaser-0516`)

Strona zwraca **HTTP `200`** i renderuje **zapisany** stan (osobny, populated fixture, niezależny od fixture admin):

- Wariant `minimal`, `source.mode=legacy`, `sourceMode=manual`, `state=ready`; rozwiązany wpis **„QA Test Article 2026 (updated)"** (status `published`). ✓
- Tytuł wpisu jako `<h3>` (domyślny `title.headingLevel`); brak nagłówka sekcji. ✓
- Meta: **„2026-04-30 • Patryk"** (data **i** autor — ten wpis ma autora, w odróżnieniu od „Route doc"). ✓
- CTA „Read more" → klikalny `<a href="/testowy/qa-test-article-2026">` (auto-URL, klasa link, bez target/rel — `opensInNewTab=false`). ✓
- `max-w-5xl rounded-xl` (maxWidth `lg`, radius `lg` — wartości domyślne). ✓
- Brak obrazu (`0 <img>`), brak tagów. ✓
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); `minimal` zwija się do jednej kolumny (`flex flex-col gap-5`). ✓
- **Izolacja:** moje niezapisane edycje admina (wariant, narrow, radius none, media none, custom CTA, fallback PL, kolor) **NIE wyciekły** na front — front pokazuje wyłącznie własny stan zapisany. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Listing query nie rozwiązał teasera w tym fixture** | Wizard / dane | Ścieżka „Listing query" jest poprawnie okablowana (wybór query persystuje `listingQueryId`, przełącza `data-source-mode=listing`, uruchamia preview), ale dostępne w fixture zapytania („House Projects Catalog Query …") rozwiązały się do `state=empty` w trybie latest, a manual-row pokazał komunikat **„This listing preview has no stable row IDs for manual selection."** To zależne od danych (te listingi nie mają stabilnych, entry-backed wierszy), nie twardy bug — ale **nie udało się** potwierdzić populated renderu przez listing w tym środowisku. |
| **N2 — Pusty fixture admin (sam empty-state)** | Fixture | Zapisany stan strony admin to `missing-source` — bez interakcji w Wizardzie canvas pokazuje tylko „Select content type to resolve teaser source.". Aby przetestować populated runtime, trzeba było ręcznie wybrać źródło. Dla przyszłych smoke-ów warto mieć fixture admin z już rozwiązanym wpisem. |
| **N3 — CTA „Custom" bez wskazanego celu cicho przestaje być linkiem** | Visual / CTA | Po przełączeniu Destination mode na „Selected site page" i **bez** wyboru strony, CTA przestaje być `<a>` i renderuje się jako wyszarzony `<span>` (klasa `opacity-70`). Brak inline-ostrzeżenia, że CTA będzie nieklikalne. Po wskazaniu strony („HomePage") link wraca poprawnie. Analogiczne ryzyko istnieje w trybie „Auto", gdy rozwiązany wpis nie ma trasy detalu (wówczas też renderuje się `<span>`). |
| **N4 — Część pól nieweryfikowalna wizualnie na użytych wpisach** | Visual / dane | Toggle „Show image", „Show excerpt", „Show tags", „Tag limit" oraz media `aspect/height/fit` zmieniają stan/atrybuty, ale obie użyte encje („Route doc", „QA Test Article") **nie mają** obrazu, excerptu ani tagów. Potwierdziłem działanie tych kontrolek na poziomie konfiguracji/atrybutu, lecz ich **efektu wizualnego** nie dało się zobaczyć bez wpisu z grafiką/tagami. |
| **N5 — Sekcja bez dostępnej nazwy (a11y)** | Renderer / dostępność | Główny `<section>` nie ma `aria-label` ani `aria-labelledby` (potwierdzone: oba `null` w adminie i na froncie). Nagłówek sekcji, gdy ustawiony, renderuje się jako zwykły `<h2/h3/h4>` bez `id` i **nie jest** powiązany z sekcją przez `aria-labelledby`. Brak semantycznej, dostępnej nazwy regionu. |
| **N6 — „Field preview" w Visual to mockup, nie pełny renderer** | Visual / UX | Podgląd pól w sekcji „Teaser content fields" to uproszczony komponent (`data-entry-teaser-field-preview`), nie 1:1 z renderem. Pokazuje placeholder obrazu nawet gdy realny wpis nie ma grafiki i miesza tekst fallbacku z meta. Drobna rozbieżność wobec canvasu/frontu (canvas pozostaje źródłem prawdy). |
| **N7 — `resolveEntryTeaserSpacing` bez jawnej obsługi „md"** | Logika (code review) | `if (value === "none" || value === "sm" || value === "lg") return value; return "md";` — każda nieprawidłowa wartość (i „md") trafia do fallbacku „md". Nieszkodliwe (domyślna i tak to „md"), ale niespójne z innymi resolverami, które jawnie wymieniają wszystkie tokeny. |

**Nie wykryto** żadnych błędów konsoli na froncie (0/0), żadnego twardego buga renderowania kontrolek, ani rozjazdu między wspólnie testowanymi opcjami admin↔front. Wszystkie przetestowane kontrolki Wizard i Visual (poza nieweryfikowalnymi wizualnie z N4 i listing z N1) działają i aktualizują podgląd na żywo; Advanced jest w pełni read-only i wiernie podsumowuje stan; frontend jest dostępny pod względem renderu, wolny od overflow i błędów konsoli.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas / preview | Frontend (`/test-entry-teaser-0516`) | Zgodność |
|--------|------------------------|--------------------------------------|----------|
| Renderer | `EntryTeaserBlock` | identyczny `EntryTeaserBlock` | ✓ wspólny kod |
| Atrybuty `data-entry-teaser-*` | ✓ żywe | ✓ identyczna semantyka | ✓ |
| Liczba żywych renderów | 1 (canvas) + 1 w Wizardzie (live preview) | 1 | ✓ (oczekiwane) |
| Wariant / max width / radius / spacing | ✓ aktualizują się live | ✓ ze stanu zapisanego | ✓ |
| Rozwiązanie wpisu (latest/featured/manual) | ✓ przez preview API | ✓ ze stanu zapisanego (manual → „QA Test Article") | ✓ |
| CTA auto-URL | ✓ klikalny `<a>` (Route doc) | ✓ klikalny `<a>` (`/testowy/qa-test-article-2026`) | ✓ |
| Meta (data • autor) | ✓ (Route doc: tylko data) | ✓ (QA Article: data + autor) | ✓ logika spójna |
| `aria-label` / `aria-labelledby` sekcji | ✗ brak (`null`) | ✗ brak (`null`) | ✓ zgodne (oba bez nazwy — N5) |
| Niezapisane edycje admina | widoczne w sesji edytora | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest współdzielony; canvas, live preview Wizarda i front zachowują się spójnie dla testowanych opcji. Brak dostępnej nazwy sekcji (N5) występuje **identycznie** w adminie i na froncie — to cecha renderera, nie rozjazd admin↔front.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft"/„Publish" — moje edycje nie zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front. Zweryfikowano za to **spójność w obrębie sesji** (Wizard↔Visual↔Advanced zachowują edytowany stan; Advanced wiernie go podsumowuje) oraz **izolację** (front = stan zapisany).
- **Render obrazu + media `aspect`/`height`/`fit`:** niemożliwe do potwierdzenia wizualnie — użyte wpisy nie mają mediów (N4). Tryb `icon` nie testowany wizualnie z tego samego powodu.
- **Excerpt i tagi + `tagLimit`:** użyte wpisy nie mają excerptu ani tagów — efekt toggli i limitu tagów nieweryfikowalny wizualnie (N4).
- **Listing query — populated render:** dostępne listingi nie rozwiązały teasera (N1); ścieżki Listing template oraz Manual listing row potwierdzone tylko jako UI (z poprawnymi komunikatami), bez realnego rozwiązanego wiersza.
- **`fallbackToLatest=off`:** toggle persystuje w UI; zachowanie „fallback do latest" zaobserwowano pośrednio (featured rozwiązał latest przy `on`), ale nie testowałem osobno wariantu `off` (czy featured bez featured-wpisu daje `empty`).
- **`opensInNewTab` na froncie:** zapisany fixture ma `false` (brak target/rel) — potwierdzone; wariant `true` potwierdzony tylko w adminie.
- **Twarde limity normalizacji:** `cta.label` max 32, `fallback.title` max 60, `fallback.description` max 200, `tagLimit` 0–12 — nie dochodziłem do granic (egzekwowane głównie przez `maxLength` inputów i `normalizeEntryTeaserData`).
- **Walidacja/normalizacja custom href CTA** (`normalizeWidgetSafeHref`): testowałem tylko wybór strony z pickera, nie ręczny wpis niebezpiecznego/relatywnego/hash URL.
- **Współdzielone sekcje wrappera** (Block layout, Device visibility / ich read-only odpowiedniki w Advanced): poza zakresem audytu Entry Teaser; nie modyfikowałem ich.
- **Stany błędu preview / sesji** (`resolved.error`, komunikat „Resolved teaser preview is unavailable…"): nie wywoływałem (sesja była zalogowana, API odpowiadało).

---

## 8. Podsumowanie

- Widget **entry-teaser jest w dobrym stanie funkcjonalnym**. Wszystkie przetestowane kontrolki **Wizard** (Source type, Mode latest/featured/manual, picker content type + manual entry) i **Visual** (warianty, nagłówki + poziomy, toggle meta, max width, media mode, radius, spacing, kolor + Clear, CTA label/target/style/destination, fallback) **działają i aktualizują podgląd na żywo**. **Advanced** jest w pełni read-only (0 kontrolek) i **wiernie** odzwierciedla edytowany stan (łącznie z media→none, narrow, radius/spacing, wyczyszczonymi kolorami, rozwiązanym wpisem). **Frontend** renderuje zapisany populated fixture, jest wolny od błędów konsoli i overflow (375 px), a niezapisane edycje admina są poprawnie izolowane.
- **Mocne strony:** współdzielony renderer (admin↔Wizard↔front), data-driven rozwiązywanie źródła (latest/featured/manual deterministycznie rozwiązują różne wpisy), auto-URL CTA rozwiązujący realne trasy detalu, spójny `SharedColorControl` z poprawną semantyką Clear (disabled przy default), pełna read-only diagnostyka z żywym statusem preview, poprawna responsywność.
- **Najważniejsze realne uwagi:** (N3) CTA w trybie „Custom" bez wskazanego celu **cicho** przestaje być linkiem (brak ostrzeżenia); (N5) `<section>` **nie ma dostępnej nazwy** (`aria-label`/`aria-labelledby` = null) — luka a11y identyczna w adminie i na froncie; (N1) ścieżka Listing query nie rozwiązała teasera w tym fixture (zależne od danych); (N2) fixture admin jest pusty (sam empty-state); (N4) część pól (obraz/excerpt/tagi/aspekt) nieweryfikowalna wizualnie na użytych wpisach; (N6) „Field preview" w Visual to mockup, nie pełny renderer; (N7) drobna niespójność `resolveEntryTeaserSpacing` (brak jawnej obsługi „md").
- Nie znaleziono żadnego błędu konsoli na froncie ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami** przechwyceń
> w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence i nie
> zostały dołączone do repo.
