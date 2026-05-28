# RAPORT: Posts Feed Widget — pogłębiony audyt current-state (Wizard / Visual / Advanced + frontend)

> **Status:** Zakończony
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-posts-feed` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/a5555d60-0a32-4012-815f-12fea47cea94`
> **Fixture public:** http://localhost:3000/posts-feed-test-page (HTTP `200`)
> **Pliki źródłowe:** `core/widgets/core/postsFeed.tsx` (typy + normalizacja + mapowanie na Content List + wrapper animacji) · `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` (edytory Wizard/Visual/Advanced + preview bridge) · renderer delegowany do `core/widgets/core/contentList.tsx` (`ContentListBlock`)

> Uwaga metodologiczna: ten raport jest celowo bogatszy niż smoke z 27-05-2026.
> Każde stwierdzenie „działa / nie działa" zostało zweryfikowane realną interakcją
> w UI oraz inspekcją DOM (atrybuty `data-content-list-*`, `data-posts-feed-motion`,
> klasy grid/gap Tailwind, inline `style` kart, ARIA sekcji, hrefy paginacji,
> wstrzykiwany `<style>` animacji), a nie tylko zliczeniem widocznych sekcji.
> Sekcje 4–8 jasno oddzielają: co działa, co nie działa / jest mylące, co faktycznie
> przetestowano i czego NIE testowano.

> Uwaga o screenshotach: weryfikację oparłem **wyłącznie o inspekcję DOM** (`eval`) —
> nie zapisywałem zrzutów PNG. Gdyby jakieś powstały, ich nazwy byłyby **wyłącznie
> lokalnymi etykietami** przechwyceń w katalogu `.playwright-cli/` (ignorowany przez
> Git), nie są wymaganym evidence w repo.

> Uwaga o środowisku testowym: w trakcie sesji izolowana przeglądarka **raz uległa
> awarii** w połowie testów Visual (karta wpadła w `about:blank`, sesja zniknęła
> z `playwright-cli list`). Najprawdopodobniej skutek obciążenia współdzielonej VM
> (równolegle pracowało kilka innych sesji agentów), nie bug widgetu. Sesję
> wznowiono, zalogowano ponownie i **wszystkie kontrolki Visual zostały przetestowane
> ponownie od zera** już po restarcie.

---

## 1. Przegląd widgetu

**Typ:** `posts-feed` · **Kategoria:** `content` · **Opis:** „Display latest or selected posts without building a listing query."

**Warianty:** `cards` (domyślny — siatka kart z opcjonalną kolumnowością), `list` (jedna kolumna, `flex flex-col`), `compact` (gęsta lista, wymuszone `grid-cols-1`).

**Kluczowy niuans architektoniczny:** Posts Feed **nie ma własnego renderera** — `PostsFeedBlock` mapuje `PostsFeedData` na `ContentListData` (`mapPostsFeedToContentListData`) i deleguje rendering do `ContentListBlock`. Stąd na froncie i w canvasie pojawia się `data-content-list-*` (a `data-content-list-source-mode="legacy"` to wewnętrzny tryb mapowania, nie błąd). Posts Feed dokłada od siebie wyłącznie opakowanie animacji wejścia: przy `style.motion !== "none"` renderuje `<style>` z keyframes (`posts-feed-fade-in` / `posts-feed-slide-up`, z guardem `prefers-reduced-motion`) i wrapper `data-posts-feed-motion`.

**Model danych (`PostsFeedData`):**

| Sekcja | Pola |
|--------|------|
| **source** | `mode` (latest/featured/category/manual), `category`, `manualPostIds[]` (max 64), `authorId`, `featuredFirst` (bool), `dateRange.from`/`dateRange.to` (ISO `YYYY-MM-DD`), `limit` (1–24), `sort` (6 opcji) |
| **title / description** | nagłówek sekcji |
| **pagination** | `mode` (none/paged/load-more/view-all), `pageSize` (1–24), `viewAllHref`, `viewAllLabel`, `loadMoreLabel` |
| **fields** | `showImage`, `showExcerpt`, `showAuthor`, `showDate`, `showCta` (bool) |
| **emptyState** | `title`, `description` |
| **style** | `columns` (1/2/3), `gap` (none/sm/md/lg), `cardStyle` (outlined/elevated/minimal), `imageAspect` (compact/standard/wide/square), `ctaLabel`, `backgroundColor`/`borderColor`/`textColor` (clearable), `motion` (none/fade/slide-up) |
| **resolved** | read-only snapshot runtime (`items`, `total`, `sourceMode`, `listPath`, `resolvedAt`, `runtime.page/pageSize/totalPages/...`, `error`) |

**Stan fixture (dane zapisane):** wariant `cards`, `source.mode=latest`, `limit=6`, sort `published-desc`, `showImage=false`, reszta `fields` on, brak nagłówka, `motion=none`, `pagination.mode=none`. Katalog ma **3 opublikowane posty**: „QA Deep Test 2026-04-30", „Deep Post Test 2026-04-26", „Test Post 2026-04-25" (wszystkie autora Patryk). To realny **populated runtime**, nie pusty fixture.

---

## 2. Architektura trybów edytora (istotny niuans UX)

Edytor po wejściu na stronę otwiera się **w trybie Wizard (setup)**. Wizard **nie jest równorzędną zakładką** — to ekran początkowej konfiguracji, kończony przyciskiem **„Finish setup and open Visual"**. Po setupie panel pokazuje **dwie zakładki: `Visual` i `Advanced`**, a do Wizarda wraca się przyciskiem **„Run setup again"**. To dokładnie ten sam wzorzec, co w `faq-accordion`/`accordion`/`tabs`.

**Bardzo ważne:** `editorCapabilities.visualOwnsVariantSelection = true` → **wybór wariantu należy do Visual, nie do Wizarda**. Wizard zawiera **wyłącznie** dobór źródła (Source setup).

| Tryb | Jak otworzyć | Zawartość |
|------|--------------|-----------|
| **Wizard** | ekran startowy / „Run setup again" | Jedna sekcja **„Source setup"**: read-only „Content type: Posts", select „Source mode", „Initial item count", „Sort", „Author filter" (z polem wyszukiwania), „Date from/to", switch „Featured posts first" — kontrolki warunkowe zależnie od trybu (patrz 4.1). Osobny **live preview** („Reflects the current Wizard state…"). |
| **Visual** | zakładka „Visual" | 5 sekcji widgetu: **Display** (5 toggli pól), **Section header** (title/description), **Layout and style** (karty wariantu + columns/gap/card style/image aspect/CTA label/3 kolory z „Clear"/motion), **Pagination presentation** (mode + pola warunkowe), **Empty state** (title/description). Dodatkowo współdzielone sekcje wrappera **Block layout** i **Device visibility** → **7 widocznych sekcji** (zgodne ze smoke 27-05). |
| **Advanced** | zakładka „Advanced" | 3 sekcje **w 100% read-only**: **Resolved query**, **Runtime status**, **Contract summary** + współdzielone **Block layout summary** i **Visibility summary** → **5 widocznych sekcji**. **Zero edytowalnych kontrolek** (potwierdzono: 0 inputów / 0 comboboxów / 0 switchy / 0 przycisków w obrębie panelu advanced). |

**Niuans podglądu:** w adminie istnieją **dwa** żywe rendery `ContentListBlock` jednocześnie (główny canvas strony + live preview w panelu edytora). Oba aktualizują się równolegle przy każdej edycji (zweryfikowane). Na froncie render jest jeden.

---

## 3. Co faktycznie przetestowano (zakres interakcji)

Wszystkie interakcje wykonane w sesji `claude-28-05-posts-feed`, zweryfikowane inspekcją DOM:

- **Wizard:** Initial item count (live), przełączanie Source mode (latest/featured/category/manual) z odsłanianiem/ukrywaniem pól warunkowych, Category/tag filter (live), Author filter (ładowanie + zastosowanie), Manual picker (search + zaznaczanie + kolejność + reorder ↑), Sort (Title A-Z), Featured-first toggle, Date-from filter.
- **Visual:** wszystkie 5 toggli Display (z czego author/date/CTA zweryfikowane wizualnie), Section header (title→`<h2>`+`aria-labelledby`, description→`<p>`), karty wariantu (cards/list/compact), Columns (2), Gap (none), Card style (elevated), CTA label, kolor tła (set `#ff0000` + „Clear"), Motion (fade), Pagination (wszystkie 4 tryby + destination picker), Empty state (wymuszony render przy 0 wynikach).
- **Advanced:** odczyt i porównanie wszystkich 3 sekcji read-only ze stanem edytowanym; potwierdzenie braku edytowalnych kontrolek.
- **Frontend:** render zapisanego fixture, ARIA sekcji, metadane kart, semantyka linków, brak błędów konsoli, responsywność 375 px, izolacja niezapisanych edycji.

---

## 4. Co DZIAŁA — szczegóły

### 4.1 Wizard (Source setup)

Wszystkie zmiany aktualizują **jednocześnie** główny canvas i live preview w panelu.

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Initial item count | 6 → 2 | `data-content-list-items` 3 → 2; renderowane 2 karty. ✓ |
| Source mode → Category | wybór | Pojawia się pole **„Category/tag filter"**; nadal widoczne author/date/featured. ✓ |
| Category/tag filter | wpis „qa-tag" | Filtr live → 1 wynik („Deep Post Test 2026-04-26"). ✓ |
| Author filter | załadowanie + „Patryk" | Lista autorów ładuje się asynchronicznie („Loading authors…" → opcja „Patryk"); wybór zawęża wynik (łączy się z filtrem kategorii). ✓ |
| Source mode → Manual | wybór | Pojawia się **Manual picker**; pola author/date/featured **znikają**; kontrolka **„Sort" zamienia się w read-only summary** „Order is determined by your selection." ✓ |
| Manual picker — search | „qa deep" | Lista dostępnych zawęża się do „QA Deep Test 2026-04-30". ✓ |
| Manual picker — zaznaczanie | Test Post → QA Deep | Canvas renderuje **w dokładnie wybranej kolejności** (Test Post, potem QA Deep). ✓ |
| Manual picker — reorder ↑ | „Move QA Deep … earlier" | Kolejność odwrócona (QA Deep, Test Post). ✓ |
| Sort | „Title A-Z" | Kolejność alfabetyczna: Deep Post → QA Deep → Test Post. ✓ |
| Featured posts first | toggle on | `aria-checked=true` (stan utrzymany w UI). ✓ |
| Date from | „2026-04-26" | Wyklucza „Test Post 2026-04-25" → 2 wyniki. ✓ |

Tekst pomocniczy pod „Source mode" zmienia się zależnie od wyboru (np. „Newest published posts (or all statuses in preview)."). Czytelne komunikowanie ról.

### 4.2 Visual — kontrolki i efekt w canvas

| Kontrolka | Test | Efekt (zweryfikowany w DOM) |
|-----------|------|------------------------------|
| Show author | off | Autor „Patryk" znika z metadanych karty. ✓ |
| Show CTA link | off | „Read more" znika z karty. ✓ |
| Show publish date | off | Data znika z metadanych. ✓ |
| Show excerpt | (on, domyślnie) | Excerpt renderowany (z polskimi znakami w 2. poście). ✓ |
| Section header — Title | „Najnowsze artykuły" | Renderuje `<h2>` z `id="<blockId>-title"`; sekcja przechodzi na `aria-labelledby` wskazujące ten `id`. ✓ |
| Section header — Description | „Opis sekcji testowej" | Renderuje `<p>` opisu pod tytułem. ✓ |
| Wariant → List | karta „List" | `data-content-list-variant=list`; wrapper `flex flex-col gap-5`; kontrolka **Columns zamienia się w read-only summary** „Columns only affect the cards variant." ✓ |
| Wariant → Compact | karta „Compact" | `data-content-list-variant=compact`; wrapper wymuszony `grid grid-cols-1 gap-5`. ✓ |
| Columns (cards) | „2 columns" | Wrapper `grid grid-cols-1 md:grid-cols-2 …`. ✓ |
| Gap | „None" | Wrapper `… gap-0`. ✓ |
| Card style | „Elevated" | Klasa karty zyskuje `shadow-sm` (z `outlined` = sam `border`). ✓ |
| CTA label | „Czytaj dalej" | Tekst CTA w karcie aktualizuje się live. ✓ |
| Card background (kolor) | swatch `#ff0000` | Inline `background-color: rgb(255, 0, 0)` na karcie. ✓ |
| Card background — „Clear" | po ustawieniu koloru | Usuwa inline `background-color` (karta przezroczysta); help text „A saved custom color is configured…". ✓ (border/text dzielą ten sam komponent `ColorField`) |
| Entry motion | „Fade in" | Wrapper `data-posts-feed-motion="fade"` + wstrzyknięty `<style>` z keyframes `posts-feed-fade-in`. ✓ |
| Pagination → View all link | wybór | Odsłania pola: Initial items, View all label, **View all destination** (picker stron). ✓ |
| View all destination | wybór „HomePage" | W canvasie pojawia się link **„View all posts" → `/homepage`**. ✓ |
| Pagination → Paged + pageSize 2 | wybór | Nav: **„Previous · Page 1 of 2 · Next"**, Next → `?cl.<blockId>.page=2`. ✓ |
| Pagination → Load more + label | „Pokaż więcej" | Link „Pokaż więcej" → `?cl.<blockId>.page=2`. ✓ |
| Empty state — title/description | wymuszone 0 wyników | Po ustawieniu kategorii bez dopasowań (`state=empty`, `items=0`) canvas renderuje **moje** „Brak wpisów (test)" + „Opis pustego stanu test". ✓ |

**Spójność „Clear" w kolorach:** wszystkie 3 pola koloru (Card background / Card border / Text color) mają działający przycisk „Clear" oparty o wspólny `SharedColorControl`.

### 4.3 Advanced (read-only) — wierność odzwierciedlenia

Tryb Advanced jest w 100% read-only i **wiernie** odzwierciedlał edytowany stan w sesji:

- **Resolved query:** „Source mode: Latest posts", „Initial item count: 6", „Manual posts: None", „Pagination mode: load-more", **„Runtime pagination: page 1 of 2, page size 2"** (odzwierciedla moją zmianę pageSize=2 + paged/load-more), „Route capability: **No list route resolved**", „Resolved items: 3". ✓
- **Runtime status:** „**Preview sync resolved 3 items from latest.**", „Source mode: latest", „Resolved items: 3", „Last synced: May 28, 2026, 07:08 PM" (żywy timestamp synchronizacji preview). ✓
- **Contract summary:** poprawny podział własności Wizard / Visual / Advanced. ✓
- **Brak edytowalnych kontrolek** (0 inputów/comboboxów/switchy/przycisków). ✓

### 4.4 Frontend (public `/posts-feed-test-page`)

Strona zwraca **HTTP `200`** i renderuje **zapisany** stan fixture:

- Wariant `cards`, `data-content-list-items=3`, `state=ready`; wrapper `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` (columns=3, gap=md). ✓
- 3 posty w kolejności `published-desc` (QA Deep Test 2026-04-30 → Deep Post Test 2026-04-26 → Test Post 2026-04-25). ✓
- Brak nagłówka → sekcja ma fallback **`aria-label="Content list"`** (a `aria-labelledby=null`). Poprawna dostępna nazwa. ✓
- Metadane: data + autor + tagi; excerpt z polskimi znakami (ąęłóżźć) w 2. poście. ✓
- `showImage=false` + brak mediów → `0` obrazów; `motion=none` → brak wrappera animacji; `pagination=none` → brak nav. ✓
- **Konsola: 0 błędów, 0 ostrzeżeń.** ✓
- **Responsywność 375 px:** brak poziomego overflow (`scrollWidth == clientWidth == 375`); siatka zwija się do **jednej** kolumny (`grid-template-columns: 343px`). ✓
- **Izolacja:** moje niezapisane edycje w adminie (motion fade, load-more, elevated, columns 2, nagłówek, custom empty-state) **NIE wyciekły** na front — front pokazuje wyłącznie stan zapisany. ✓

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — Karty na froncie nie są klikalne (brak linków)** | Renderer / konfiguracja routingu | Na froncie **0 elementów `<a>`** w całym widgetcie — tytuły postów i „Read more" renderują się jako zwykły tekst (`<span>`/`<div>`), nie linki. Powód: dla tej witryny **nie rozwiązuje się trasa listy/detali postów** (Advanced potwierdza: „Route capability: **No list route resolved**"), więc elementy nie dostają `href`, a CTA renderuje się tylko jako link, gdy `href` istnieje. Skutek praktyczny: feed jest **nienawigowalny** w tym fixture. Jest to zachowanie zależne od konfiguracji tras (nie twardy bug renderera), ale dla realnego użytkownika to istotne ograniczenie i warto je odnotować jako najważniejsze znalezisko. |
| **N2 — „Source filters" w Advanced pokazuje filtr, który nie jest stosowany** | Advanced / diagnostyka | Po ustawieniu kategorii, a następnie powrocie do trybu `latest`, sekcja „Resolved query" pokazywała „Source filters: **Category: nonexistent-zzz-9999**" przy aktywnym trybie „Latest posts" — mimo że tryb latest **nie stosuje** kategorii (Runtime status: „resolved 3 items from latest", `items=3`, nie 0). `ResolvedQueryDiagnostics` buduje opis filtrów z `source.category` **bez** sprawdzania aktywnego `mode`, więc nadreportuje przechowane, lecz nieaktywne filtry. Drobna nieścisłość diagnostyki (zaobserwowana na moich niezapisanych edycjach). |
| **N3 — „Clear" koloru = brak tła, nie token motywu** | Visual / kolory | „Clear" na Card background usuwa inline `background-color` całkowicie (karta przezroczysta, przepuszcza tło sekcji), zamiast wracać do `var(--color-bg)`. Zgodne z semantyką „clearable" (ta sama co w `faq-accordion`/`tabs`), ale subtelnie mylące. |
| **N4 — „Show image" + „Image aspect" nieweryfikowalne wizualnie** | Visual / dane fixture | Włączenie „Show image" nie wyrenderowało żadnego `<img>` — posty w fixture **nie mają przypisanych mediów**. Toggle i select „Image aspect" działają na poziomie konfiguracji, ale ich efektu wizualnego **nie dało się potwierdzić** bez postów z grafiką. |
| **N5 — Link „View all" znika cicho bez skonfigurowanego celu** | Visual / pagination | W trybie „View all link" link **nie pojawia się**, dopóki nie rozwiąże się cel (`viewAllHref` lub trasa listy postów). Help text mówi „Leave empty to use the configured posts list route", ale przy braku trasy (jak tu) nie ma żadnego inline-ostrzeżenia, że link będzie niewidoczny. Po wskazaniu strony („HomePage") link renderuje się poprawnie. |
| **N6 — Dwa różne liczniki: „Initial item count" (Wizard) vs „Page size" (Visual)** | Wizard + Visual | Istnieją dwa odrębne pola liczbowe (`source.limit` w Wizard oraz `pagination.pageSize` w Visual, oba 1–24). Nie jest od razu oczywiste, które rządzi początkowym renderem (limit ogranicza pobranie, pageSize tnie na strony). Potencjalne zamieszanie, brak wyjaśniającego powiązania w UI. |

**Nie wykryto** żadnych błędów konsoli (front: 0/0), żadnego twardego buga renderowania kontrolek, ani rozjazdu między wspólnie testowanymi opcjami admin↔front. Wszystkie kontrolki Wizard i Visual, które przetestowałem (poza nieweryfikowalnym wizualnie obrazem — N4), działają i aktualizują podgląd na żywo; Advanced jest w pełni read-only i wiernie podsumowuje stan; frontend jest dostępny, wolny od overflow i błędów konsoli.

---

## 6. Porównanie Admin (canvas) vs Frontend

| Aspekt | Admin canvas / preview | Frontend (`/posts-feed-test-page`) | Zgodność |
|--------|------------------------|------------------------------------|----------|
| Renderer | `ContentListBlock` (delegacja z `PostsFeedBlock`) | identyczny `ContentListBlock` | ✓ wspólny kod |
| Atrybuty `data-content-list-*` | ✓ żywe | ✓ identyczne | ✓ |
| Liczba żywych renderów | 2 (canvas + live preview edytora) | 1 | ✓ (oczekiwane) |
| Wariant / columns / gap | ✓ aktualizują się live | ✓ ze stanu zapisanego | ✓ |
| Metadane (autor/data/tagi/excerpt) | ✓ zależne od toggli | ✓ ze stanu zapisanego | ✓ |
| Linki kart (tytuł / „Read more") | brak `<a>` (brak `href`) | brak `<a>` (brak `href`) | ✓ zgodne (oba bez linków — N1) |
| Animacja wejścia (motion) | ✓ `data-posts-feed-motion` + `<style>` | (fixture `none` → brak) | ✓ logika spójna |
| Paginacja (view-all/paged/load-more) | ✓ renderuje przy spełnionych warunkach | (fixture `none` → brak) | ✓ logika spójna |
| Niezapisane edycje | widoczne w sesji edytora (canvas + preview) | **nieobecne** (front = stan zapisany) | ✓ poprawna izolacja |

**Wniosek:** renderer jest współdzielony; canvas, live preview i front zachowują się spójnie dla testowanych opcji. Brak linków w kartach (N1) występuje **identycznie** w adminie i na froncie — to nie rozjazd admin↔front, lecz skutek nierozwiązanej trasy postów.

---

## 7. Czego NIE testowano (uczciwe ograniczenia)

- **Zapis i publikacja:** świadomie **nie** klikałem „Save draft" ani „Publish", aby nie zmieniać współdzielonego fixture. W związku z tym moje edycje **nie** zostały zweryfikowane pod kątem trwałości po przeładowaniu ani propagacji na front. Zweryfikowana została natomiast **spójność w obrębie sesji** (przełączanie Visual ↔ Wizard ↔ Advanced zachowuje edytowany stan; Advanced wiernie go podsumowuje) oraz **izolacja** (front pokazuje stan zapisany, nie moje edycje).
- **Guard `beforeunload`:** nie testowałem — front otwarłem w **nowej karcie**, więc nie opuszczałem karty admina. (Wcześniejsze przejście na `about:blank` było awarią przeglądarki, nie dialogiem ostrzegawczym.)
- **Render obrazów + „Image aspect":** niemożliwe do potwierdzenia — posty w fixture nie mają mediów (N4).
- **Twarde limity:** nie dochodziłem do `limit=24`, `pageSize=24`, ani `manualPostIds` = 64; testowałem wartości w zakresie roboczym (2, 6).
- **Tryb `featured`:** select trybu „Featured posts" otwierałem (opcja istnieje), ale nie weryfikowałem realnego efektu — brak postów oznaczonych jako featured w fixture. Analogicznie `featuredFirst=on` nie zmieniło kolejności (brak featured).
- **Walidacja nieprawidłowej daty (`resolveInvalidDateNotice`):** pola dat są natywnym `type=date`, który uniemożliwia wpisanie nieprawidłowej wartości z UI; ścieżka ostrzeżenia „… was invalid and has been cleared" dotyczy danych zapisanych spoza edytora — **nie testowana**.
- **Motion `slide-up`:** testowałem tylko `fade`; `slide-up` dzieli ten sam mechanizm (`<style>` + `data-posts-feed-motion`), ale nie weryfikowałem go osobno. `prefers-reduced-motion` (guard obecny w CSS) — nie testowany live.
- **„View all destination" — własny URL:** wskazałem istniejącą stronę z pickera; nie testowałem ręcznego wpisu dowolnego URL przez `LinkDestinationField`.
- **Współdzielone sekcje wrappera** (Block layout, Device visibility / ich read-only odpowiedniki w Advanced): poza zakresem audytu Posts Feed; nie modyfikowałem ich.
- **Drag & drop:** Manual picker celowo używa wyłącznie przycisków ↑/↓ (brak DnD w tym widgetcie) — nie dotyczy.

---

## 8. Podsumowanie

- Widget **posts-feed jest w bardzo dobrym stanie funkcjonalnym**. Praktycznie wszystkie przetestowane kontrolki **Wizard** (source mode + filtry: kategoria, autor, data, featured, limit, sort, manual picker z wyszukiwaniem/zaznaczaniem/kolejnością) oraz **Visual** (toggle pól, nagłówek sekcji, warianty, columns/gap, card style, CTA label, kolory + Clear, motion, 4 tryby paginacji, empty state) **działają i aktualizują podgląd na żywo** (jednocześnie w canvasie i live preview). **Advanced** jest w pełni read-only i wiernie odzwierciedla edytowany stan (łącznie z runtime paginacji i timestampem synchronizacji). **Frontend** renderuje zapisany fixture, jest dostępny (fallback `aria-label`), wolny od błędów konsoli i overflow, a niezapisane edycje są poprawnie izolowane.
- **Najważniejsze realne znalezisko (N1):** na froncie (i w adminie) **karty nie są klikalne** — tytuły i „Read more" to zwykły tekst, bo dla witryny nie rozwiązuje się trasa postów („No list route resolved"). Feed jest przez to nienawigowalny w tym fixture. Zależne od konfiguracji tras, ale istotne dla użytkownika.
- **Niuanse diagnostyki/UX:** „Source filters" w Advanced nadreportuje przechowany, lecz nieaktywny filtr kategorii w trybie latest (N2); „Clear" koloru daje przezroczystość zamiast tokenu motywu (N3); „Show image"/„Image aspect" nieweryfikowalne bez mediów (N4); link „View all" znika cicho bez skonfigurowanego celu (N5); dwa odrębne liczniki limit vs pageSize bez wyjaśnienia powiązania (N6).
- **Plusy:** spójna delegacja do `ContentListBlock` (jeden renderer admin↔front), data-driven źródło (manual picker realnie steruje kolejnością), pełna read-only diagnostyka z żywą synchronizacją preview, spójne „Clear" dla wszystkich 3 kolorów, bezpieczna normalizacja paginacji (hrefy stron generowane poprawnie), poprawna responsywność i fallback dostępnościowy sekcji.
- Nie znaleziono żadnego błędu konsoli ani rozbieżności admin↔front w zakresie wspólnie testowanych opcji.

---

## 9. Screenshoty (lokalne etykiety)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o inspekcję
> DOM (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi etykietami**
> przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym
> evidence i nie zostały dołączone do repo.
