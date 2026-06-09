# Pages Editor V2 — Raport audytu funkcjonalności, UX i UI (TASK-417)

> **Zakres:** pełny audyt implementacji rodziny TASK-417 (Pages „sections + atomic
> blocks" v2) — model danych, renderer publiczny, edytor admin (canvas), preview,
> asystent, testy oraz zgodność z referencyjną specyfikacją UX
> `_docs/UI/pages-editor-new-approach/`.
> **Data:** 2026-06-09. **Autor:** audyt wieloagentowy (7 obszarów →
> weryfikacja adwersarialna → projekt) + live smoke przez `playwright-cli`.
> **Status TASK-417 w boardzie:** ✅ Done. **Werdykt audytu:** funkcjonalnie
> ~50–60% wizji; szkielet jest, ale rdzeń („atomowe bloki edytowalne i identyczne
> na 3 powierzchniach") nie działa. Patrz §1.

---

## Spis treści

1. [Werdykt i streszczenie](#1-werdykt-i-streszczenie)
2. [Metodyka i środowisko](#2-metodyka-i-środowisko)
3. [Wizja produktu (kontekst oceny) + decyzja o zagnieżdżaniu](#3-wizja-produktu-kontekst-oceny--decyzja-o-zagnieżdżaniu)
4. [Co działa](#4-co-działa)
5. [Co nie działa — wg priorytetu, z dowodami](#5-co-nie-działa--wg-priorytetu-z-dowodami)
6. [Parytet 3 powierzchni: canvas vs preview vs frontend](#6-parytet-3-powierzchni-canvas-vs-preview-vs-frontend)
7. [Zgodność z referencyjnym `pages-editor-new-approach/`](#7-zgodność-z-referencyjnym-pages-editor-new-approach)
8. [Jak rozbudować bloki/sekcje (projekt docelowy)](#8-jak-rozbudować-blokisekcje-projekt-docelowy)
9. [Matryce kontrolek (per blok, per sekcja)](#9-matryce-kontrolek-per-blok-per-sekcja)
10. [Rodzina zadań do wykonania (TASK-418)](#page-editor-v2-task-418-family)
11. [Załącznik: mapa plików i indeks severity](#11-załącznik-mapa-plików-i-indeks-severity)

---

## 1. Werdykt i streszczenie

Rewrite TASK-417 dostarczył **bardzo dobry, ściśle walidowany model danych** i
**poprawny renderer publiczny dla podzbioru bloków**, ale **edytor admin jest w
dużej mierze makietą funkcjonalną**, a obietnica „małe atomowe bloki, każdy z
kontrolkami, identyczne na canvasie / preview / froncie" **nie jest spełniona**.

Najważniejsze (potwierdzone na żywo w działającej aplikacji):

- **Canvas nie jest WYSIWYG.** Edytor rysuje sekcje/bloki **drugim, rozbieżnym
  rendererem** (`SectionCanvas`/`BlockPreview` w `PageEditor.tsx`), który ignoruje
  `section.style/spacing/layout` i większość typów bloków. Ustawienie tła sekcji
  na `#ff0000` **nie zmienia** karty na canvasie (zostaje biała) — patrz
  screenshot §5.1.
- **Bloki są praktycznie nieedytowalne.** Edytowalny jest tylko **tekst
  pierwszego bloku** (jedno pole „Primary text"). Dodany blok `image` **nie ma
  jak ustawić `src`/`alt`** — nie da się go nawet zaznaczyć. Brak kontrolek dla
  `heading.level`, `button.href/variant`, `list.items` itd.
- **Bloki‑placeholdery.** `gallery/collection/form/embed/icon` renderują na
  froncie szary box z nazwą typu; `image/video` pokazują placeholder do czasu
  ustawienia `src`. To ~31% katalogu bloków. (To jest dokładnie to, co
  zauważyłeś.)
- **Połowa katalogu jest nieosiągalna z UI** — paleta pokazuje **8 sekcji + 8
  bloków**, a model ma **17 sekcji + 16 bloków**.
- **`section.type` i `section.variant` nie wpływają na render** — wszystkie 17
  typów sekcji renderują się jako identyczny grid bloków; 8 wariantów jest
  martwych.
- **Responsywność per‑blok jest „martwa".** Model przechowuje i waliduje
  `block.responsive[bp]`, ale **żaden renderer tego nie stosuje** — desktop‑base
  działa tylko na poziomie sekcji.
- **Edycja contentu na nie‑desktopie psuje bazę.** Edytując „Primary text" na
  mobile, zapis idzie do bazy desktopowej (brak gałęzi `device` w
  `updateFirstBlockProps`) — to cichy bug poprawności danych.
- **Zgodność z referencyjnym specem UX ~50–60%** — brak: inline „+" między
  sekcjami, ⌘K/Esc, przeciągalnego paska, markerów override, swatchy kolorów,
  panelu Tła, edycji per‑blok, panelu typografii.

Dobra wiadomość: **fundament jest zdrowy**. Model i renderer publiczny są na tyle
solidne, że całość da się doprowadzić do wizji **bez przepisywania od zera** —
przez 1 wspólny renderer, rozszerzenie stylu per‑blok i dokończenie edytora.
Plan: [§10 TASK-418](#page-editor-v2-task-418-family).

**Liczby audytu:** 7 obszarów, **62 zweryfikowane luki** (z odwołaniami
`plik:linia`): 18 × `high`, 17 × `medium`, 27 × `low`.

---

## 2. Metodyka i środowisko

- **Analiza statyczna wieloagentowa (workflow):** 7 równoległych obszarów
  (domain‑model, runtime‑render, admin‑editor, preview‑parity,
  assistant‑cutover, tests‑claims, reference‑fidelity), każdy z fazą
  **adwersarialnej weryfikacji** (drugi agent otwierał cytowane `plik:linia` i
  potwierdzał/obalał każdą lukę). 16 agentów, ~1,15 mln tokenów.
- **Live smoke (`playwright-cli`):** logowanie do admina kredkami z `.env`,
  otwarcie edytora strony „Task 417 Playwright Smoke", dodanie bloku, próby
  edycji, zmiana tła, porównanie z frontem.
- **Serwer:** uruchomiony helperem `coderso-dev-core-host`.
  - Admin/Backend: `http://coderso-a.localhost:5173/admin/`
  - Front publiczny: `http://coderso-a.localhost:3000/`
- **Adres edytora:** `/admin/pages/:id`; lista: `/admin/pages`.

> Uwaga metodyczna: każdy „high"/„medium" w tym raporcie był weryfikowany albo
> przez drugiego agenta na źródle, albo przeze mnie na żywo w przeglądarce
> (screenshoty w §5–§6). Tam gdzie pierwotna teza okazała się błędna (np.
> „zagnieżdżanie = naruszenie wizji"), jest to wprost odnotowane.

---

## 3. Wizja produktu (kontekst oceny) + decyzja o zagnieżdżaniu

Wizja (Twoje wytyczne), wg której oceniam:

1. Brak ciężkich wyspecjalizowanych widgetów — zamiast tego **małe atomowe
   bloki/sekcje**, które można **zagnieżdżać** i składać w dowolny układ na
   **interaktywnym canvasie**, renderowane **identycznie** na froncie.
2. **Szeroki ekran PC = baza.** Mniejsze ekrany przechowują tylko **różnice
   (override)** względem desktopu. Desktop nigdy nie jest wyprowadzany z mobile.
3. **Każdy blok/sekcja ma podstawową listę kontrolek** (min. kolory, typografia,
   odstępy, wyrównanie), poprawnie renderowaną na **canvasie + preview + froncie**.
4. Kompozycyjność ponad specjalizacją.

<a id="page-editor-v2-nesting-decision"></a>

### 3.1 Decyzja TASK-418: zagnieżdżanie bloków przez layout atoms

To jedyny punkt, gdzie pierwotny spec i nowa wizja produktu się rozjechały.
Decyzja dla TASK-418 jest teraz zamrożona: Pages v2 dostaje kontrolowane
zagnieżdżanie przez małe atomowe bloki układu, bez powrotu do tłustych widgetów.

- **Obecny spec referencyjny** (`coderso-editor-spec.md` §13–§14) **świadomie
  odrzucił** model „jednego wszechmocnego widgetu" i wybrał **płaskie drzewo
  `sekcja → blocks[]`** (jeden poziom), z kolumnami jako właściwością **sekcji**
  (`layout.columns` 1–4). Implementacja wiernie to realizuje. W tym sensie „brak
  zagnieżdżania" **nie jest bugiem** — to celowa decyzja architektoniczna.
- **Nowa decyzja TASK-418** mówi wprost o „zagnieżdżaniu bloków między sobą i
  tworzeniu dowolnych układów", ale tylko przez bounded layout atoms.

**To nie są sprzeczności.** Spec odrzucił *jeden tłusty komponent*, a nie
*kompozycję z małych prymitywów*. Rozwiązanie (standardowe w Webflow/Builder.io):
dodać **atomowe bloki‑układy** (`container`, `columns`, `group`), których jedynym
„contentem" są nazwane sloty (`slots`). Każdy blok pozostaje
atomowy (jedna odpowiedzialność), a dowolne układy powstają przez
**kompozycję**, nie przez puchnący config. TASK-418 ma zapisać tę decyzję w
`PAGE_MODEL.md`. Projekt: [§8.B](#8b-model-zagnieżdżania--minimalna-zmiana-schematu).

> **Decyzja:** przyjąć podejście „atomowe bloki‑układy" z bounded tree depth:
> top-level block w sekcji ma depth 1, a `PAGE_BLOCK_MAX_TREE_DEPTH = 4`.
> Daje dowolne układy bez god‑componentu i jest zgodne z duchem specu. TASK-418
> kanonicznie używa nazwanego modelu `slots` dla kontenerów; ewentualne pliki
> TASK-419 z otwartą decyzją są stale i muszą zostać superseded albo scalone do
> TASK-418 przed commitem.

---

## 4. Co działa

Rzetelnie zaimplementowane (z dowodami):

- **Model danych v2** (`core/services/pages/pageDocumentV2.ts`) — kompletny,
  ściśle walidowany: `schemaVersion:2`, sekcje + atomowe bloki, allowlista propsów
  per typ bloku (`pageBlockPropKeys`), enumy, klampy, tryby `write` vs
  `stored-read`, reset legacy → pusty v2, strip pól edytorskich przed publikacją.
  Zgodny z `PAGE_MODEL.md`.
- **Kaskada responsywna na poziomie SEKCJI** — `resolvePageSectionForBreakpoint`
  (`pageDocumentV2.ts:1143-1158`) poprawnie: desktop = baza, tablet/mobile =
  płytki merge override'ów layout/style/spacing/visibility. Desktop nigdy nie jest
  wyprowadzany z mobile. ✅ dokładnie wg wizji #2 (tylko na poziomie sekcji).
- **Renderer publiczny** (`pageRuntimeV2.tsx`) — dla bloków
  heading/text/button/image/video/list/card/divider/spacer/statistic/quote daje
  realny, świadomy danych markup; `toSectionStyle` nakłada
  background/accent/radius/shadow/padding/maxWidth/gap; znaczniki
  `data-page-v2/-section/-block`. **Potwierdzone na froncie:** maxWidth `1080px`,
  padding `64px 40px`, akcent `#0d9488`, przycisk w kolorze akcentu.
- **Preview == frontend** — obie powierzchnie renderują przez ten sam
  `DefaultRuntimePageShellV2`; `previewDevice` jest przepychany end‑to‑end
  (`?device=` → `resolvePreviewDevice` → `resolvePageDocumentForBreakpoint`).
- **Szkielet edytora** — breakpoint switcher, Layers, Page settings, History,
  Preview, Save, Publish, command palette, pływający pasek sekcji, autosave 1.5 s,
  rewizje (restore/discard), reset legacy → pusty v2.
- **Asystent (strona emisji)** — emituje poprawne dokumenty v2 przez
  `createPageSectionV2`/`createPageBlockV2`; `page.widget.patch` **usunięty** dla
  stron (zostaje tylko dla widget‑template/custom‑screen). ✅
- **Bezpieczeństwo preview** — token = `randomUUID`, składowany jako sha256,
  gating przez `previewEnabled` + walidacja tokenu, TTL.

---

## 5. Co nie działa — wg priorytetu, z dowodami

Pełna lista 62 luk w [§11](#11-załącznik-mapa-plików-i-indeks-severity). Poniżej
najważniejsze, pogrupowane, z dowodami `plik:linia` i obserwacjami na żywo.

### 5.1 Canvas nie jest WYSIWYG (HIGH) — potwierdzone na żywo

`PageEditor.tsx` rysuje canvas **trzecim rendererem**:

- `SectionCanvas` (`PageEditor.tsx:243-285`) — twardo `rounded border bg-white p-6
  shadow-sm` + `grid gap-3`; **nie czyta** `section.style/spacing/layout` (brak
  `toSectionStyle`, brak `sectionGridClass`).
- `BlockPreview` (`PageEditor.tsx:287-308`) — obsługuje tylko
  heading/button/image; **13 pozostałych typów** spada do wyszarzonego `<p>`.

**Dowód na żywo:** ustawiłem tło sekcji = `#ff0000` w panelu Style → wartość
trzyma się w polu, ale karta na canvasie **pozostaje biała** (`rgb(255,255,255)`,
brak inline‑bg). Na froncie to samo tło byłoby nałożone.

![Canvas ignoruje tło, image jako placeholder](./_assets/page-editor-v2-audit/02-canvas-ignores-background-and-image-placeholder.png)

*Panel pokazuje `BACKGROUND #ff0000`, ale sekcja na canvasie jest biała; blok
`image` to szary placeholder „Image"; przycisk jest niebieski (`bg-primary`),
podczas gdy na froncie jest turkusowy (akcent `#0d9488`).*

### 5.2 Brak edycji per‑blok (HIGH) — potwierdzone na żywo

- Brak stanu zaznaczenia bloku: `selectedBlockId` jest **na sztywno `null`**
  (`PageEditor.tsx:544`), nigdy nie czytany/ustawiany. Bloki w `SectionCanvas`
  nie mają `onClick`.
- Jedyna kontrolka contentu (`ToolbarSubpanel` „content") jest podpięta do
  `updateFirstBlockProps` (`PageEditor.tsx:426-436`), który patchuje **tylko
  `index === 0`** i wpisuje ten sam string do `text` **i** `label`
  (`:1118-1119`).
- Brak kontrolek typowych: `heading.level`, `button.href/target/variant/size`,
  `image.src/alt/caption/fit`, `list.items/ordered` — choć model je definiuje
  (`pageBlockPropKeys`, `pageDocumentV2.ts:235-252`) i renderer publiczny je
  konsumuje.

**Dowód na żywo:** dodałem blok `image` (paleta → „Image"). Po kliknięciu w niego
na canvasie **nie zaznacza się** — panel dalej pokazuje tylko „Primary text" =
tekst nagłówka. Nie ma żadnego pola na `src`/`alt`. Blok `image` jest więc
**trwale nieedytowalny** i na zawsze zostanie placeholderem.

![Canvas edytora z pływającym paskiem i jednym polem „Primary text"](./_assets/page-editor-v2-audit/01-editor-canvas-floating-toolbar.png)

<a id="page-editor-v2-non-desktop-content-base-overwrite"></a>

### 5.3 Edycja contentu na nie‑desktopie nadpisuje bazę (HIGH)

`updateSectionGroup` (`PageEditor.tsx:398-424`) **poprawnie** rozgałęzia się na
`device === 'desktop'` (baza) vs `section.responsive[device]` (override). Ale
`updateFirstBlockProps` (`:426-436`) **nie ma** tej gałęzi — zawsze pisze do
`blocks[0].props` (baza desktop). Efekt: gdy autor przełączy się na mobile i
zmieni „Primary text", **nadpisuje desktop**. To cichy bug poprawności danych,
sprzeczny z §8 specu (kaskada). Severity: high.

### 5.4 Bloki‑placeholdery na froncie (HIGH) — to co zauważyłeś

`pageRuntimeV2.tsx:248-257`:

```tsx
case "gallery": case "collection": case "form": case "embed": case "icon":
  return <div className="...bg-slate-50...">{block.type.charAt(0).toUpperCase()+block.type.slice(1)}</div>;
```

5 z 16 typów bloków renderuje **szary box z nazwą typu**, mimo że model niesie
realne propsy (`gallery.items`, `form.formId`, `collection.queryId`,
`embed.html/url`, `icon.name`). **Nie istnieje żadna warstwa data‑bindingu** w
`core/site` (grep `collection` w `core/site` = tylko ten `case`). Dodatkowo
`image/video` → placeholder przy pustym `src`. To bezpośrednio łamie wizję
„działających atomowych bloków".

### 5.5 `section.type`/`variant` nie wpływają na render (HIGH)

`PageSection` (`pageRuntimeV2.tsx:263-294`) renderuje każdą sekcję jako ten sam
grid; `section.type` trafia tylko do `data-page-section`, a `section.variant`
**nie jest używany nigdzie** (grep „variant" w runtime = 0). Wszystkie 17 typów i
8 wariantów wyglądają tak samo. Asystent emituje `navigation`/`cta`/`filters`
licząc na układ — renderują się jako zwykłe poukładane bloki (nav bar wygląda jak
stos heading+lista+przycisk).

### 5.6 Responsywność per‑blok jest martwa (HIGH)

Model definiuje `PageBlockResponsiveOverrideV2` (`pageDocumentV2.ts:134-147`) i
normalizuje (`normalizeBlockResponsive:839-882`), ale
`resolvePageSectionForBreakpoint` **scala tylko poziom sekcji** i klonuje
`section.blocks` bez zmian (`:1151-1157`) — **żaden konsument nie czyta
`block.responsive`** (grep w `core/site` = brak). Co gorsza, w edytorze **nie ma
nawet UI** do zapisu `block.responsive`. Pole jest walidowane i utrwalane, ale na
żadnej powierzchni nie ma efektu — to gorsze niż brak funkcji (fałszywe wrażenie
wsparcia). Dodatkowo kolumny gridu wynikają z prefiksów Tailwind `md:`
(`sectionGridClass`), więc liczba kolumn śledzi szerokość iframe, nie
`previewDevice` — model i viewport mogą się rozjechać.

### 5.7 Połowa katalogu nieosiągalna z UI (MEDIUM) — potwierdzone na żywo

`sectionOptions` (8) i `blockOptions` (8) są zahardkodowane
(`PageEditor.tsx:100-120`). **Dowód na żywo (paleta):**

- Sekcje: `Hero, Content, Feature grid, Media split, Gallery, Lead form, FAQ, CTA`
  (8). Brak: `template, navigation, timeline, collection, comparison, filters,
  testimonials, embed, custom` (9).
- Bloki: `Heading, Text, Button, Image, List, Card, Divider, Spacer` (8). Brak:
  `video, gallery, form, collection, embed, statistic, icon, quote` (8) — w tym
  `statistic/quote/video`, które renderer **w pełni renderuje**.

Skutek: autor nie może wstawić ~połowy słownika, którego używa asystent →
**zepsuty round‑trip asystent↔edytor**.

### 5.8 Braki w panelach kontrolek sekcji (MEDIUM)

`ToolbarSubpanel` (`PageEditor.tsx:1090-1222`) ma luki względem modelu:

| Grupa | Jest w UI | Brakuje w UI (model wspiera) |
|---|---|---|
| layout | columns, maxWidth, align | **justify** |
| style | background, accent, radius | **backgroundType, backgroundImage, shadow** |
| spacing | top, bottom, left, right, gap | — (komplet) |
| visibility | visible, anchor | **authOnly, startsAt, endsAt** |
| (panel Tła) | — | **cały dedykowany panel Background** (typ/źródło) |
| variant | tylko odczyt (chip) | **brak kontrolki zmiany** — każda sekcja na zawsze `default` |

Kolory to **surowe pola tekstowe** (`type=text`, wpisujesz hex ręcznie) — brak
pickera/swatchy. Potwierdzone na żywo: pola `Background=#ffffff`,
`Accent=#0d9488`, `Radius=0`.

### 5.9 Pozostałe (wybrane MEDIUM/LOW)

- **`text.format:'rich'` ignorowane** — zawsze plain (`pageRuntimeV2.tsx:163-173`);
  wymaga sanitizacji + render (XSS).
- **`heading` h3–h6 zlewają się** do `text-2xl` (`:92-96`).
- **`card.image`/`href` gubione** przez renderer (`:209-217`).
- **Duplikat alignment** — `props.align` vs `style.align`; renderer czyta tylko
  `props.align`, `style.align` martwy.
- **Preview wymusza zapis draftu** bez zgody i nie pokazuje TTL/odświeżania
  (`PageEditor.tsx:690`); **preview = draft (currentData) z fallback SEO**, front
  = published + pełne SEO → „preview==front" tylko gdy draft==published.
- **Brak skrótów** ⌘K/Esc/⌘Z/⌘D/Del (grep w `PageEditor.tsx` = 0 handlerów
  klawiatury); brak nawigacji klawiaturą w palecie.
- **Brak inline „+" między sekcjami**, brak drag‑reorder, pusty‑sekcji CTA „Add
  the first block" jest martwym tekstem (bez `onClick`).
- **Brak markerów override** (żółta plakietka, podświetlone pola, „↺ przywróć
  dziedziczenie") — jest tylko jeden przycisk „Clear columns override".
- **Brak pokrycia testami renderera** — `pageRuntimeV2.tsx` **nie jest
  importowany przez żaden test** (zero render‑testów; placeholdery i martwa
  responsywność per‑blok przeszłyby zielono).
- **Martwy kod**: `core/admin/ui/pages/{CanvasFrame,InspectorPanel,BlockLibrary}.tsx`
  + page‑level `BlockToolbar.tsx` + `block-library.test.tsx` — 0 żywych
  importerów (to **statyczne makiety**, sprzed implementacji; nie mylić z żywym
  `core/admin/ui/pages/builder/`).

---

## 6. Parytet 3 powierzchni: canvas vs preview vs frontend

Wizja wymaga, by **canvas == preview == frontend**. Stan faktyczny — **trzy**
renderery:

| Powierzchnia | Renderer | Zgodność |
|---|---|---|
| **Frontend** | `pageRuntimeV2.tsx` (`DefaultRuntimePageShellV2`) | baza |
| **Preview** | ten sam `DefaultRuntimePageShellV2` (iframe) | ✅ **= frontend** |
| **Canvas (admin)** | `SectionCanvas`/`BlockPreview` (osobny, uproszczony) | ❌ **rozjeżdża się** |

Konkretne rozbieżności canvas vs front (potwierdzone na żywo):

| Aspekt | Canvas | Frontend |
|---|---|---|
| Tło sekcji `#ff0000` | biała karta | czerwone tło |
| Wyrównanie nagłówka (`align:center`) | **lewo** | **środek** |
| Przycisk | niebieski `bg-primary` | turkus (akcent `#0d9488`) |
| Blok `image` (bez src) | „Image" box | „Image" box (ale styl inny) |
| `list/card/divider/spacer/statistic/quote` | wyszarzony `<p>` | realny markup |
| `maxWidth/padding/columns/shadow/radius` | ignorowane | nałożone (`toSectionStyle`) |

![Frontend nakłada style; przycisk wyrównany w lewo mimo wyśrodkowanego nagłówka](./_assets/page-editor-v2-audit/03-frontend-applies-styles-button-misaligned.png)

*Front nakłada style sekcji, ale ujawnia osobny defekt: nagłówek/tekst są
wyśrodkowane, a przycisk wyrównany do lewej (blok `button` nie ma propsa
alignment, a `section.justify` nie jest podpięty). Na canvasie ten sam nagłówek
był do lewej — kolejna rozbieżność.*

**Wniosek:** preview jest wiarygodne (= front), ale canvas — nie. To łamie
„edycję na żywo na canvasie" (spec §5). Lek: **jeden wspólny renderer**
([§8.A](#8a-jeden-wspólny-kontrakt-renderowania)).

---

## 7. Zgodność z referencyjnym `pages-editor-new-approach/`

Odpowiedź na Twoje pytanie „czy to zostało poprawnie wykonane": **częściowo —
ok. 50–60%.** Szkielet i model danych są wierne; głębia edycji nie.
Scorecard wg sekcji `coderso-editor-spec.md`:

| Spec | Wymaganie | Status | Dowód / uwaga |
|---|---|---|---|
| §4 | Breakpoint switcher (podwójna rola), Layers, Settings, History, Preview, Publish | ✅ większość | `PageEditor.tsx:705-745` |
| §4 | Status „Niezapisane" z **pulsującą kropką** | ⚠️ statyczny badge | brak `pulse` (`:758-762`) |
| §4 | Pigułka kontekstu „Edytujesz: Duży ekran (nadpisuje bazę)" | ❌ | jest tylko readout `:785` |
| §5 | Canvas **WYSIWYG z prawdziwą treścią** | ❌ | osobny renderer (§6) |
| §5 | Hover/zaznaczenie sekcji, etykieta | ✅ | `SectionCanvas:252-285` |
| §5 | **Inline „+" między sekcjami** (hover) | ❌ | tylko 1 przycisk „Add section" `:810` |
| §5 | Pusta sekcja: CTA „Dodaj pierwszy blok" | ⚠️ martwy tekst | brak `onClick` `:269` |
| §5/§8 | **Marker override** (żółta plakietka, podświetlenie) | ❌ | brak |
| §6 | Pływający pasek, pojawia się na zaznaczeniu, ciemny | ✅ | `:868` |
| §6 | **Przeciągalny** (uchwyt ⠿) | ❌ | brak drag |
| §7 Layout | Wariant / kolumny / align / maxWidth | ⚠️ | **brak Wariantu i vertical‑align** |
| §7 Content | Nagłówek / Opis / Tekst+URL przycisku / lista bloków | ❌ | tylko 1 pole „Primary text" (blok[0]) |
| §7 Style | **swatche** akcentu / suwak radius / **cień** / typografia | ❌ | surowy tekst, brak shadow/typografii |
| §7 Spacing | padding T/B/L/P + gap | ✅ | komplet `:1150-1187` |
| §7 **Background** | dedykowany panel: typ + źródło | ❌ | panelu nie ma |
| §7 Responsive | hide‑on‑screen / pionowy / override + „↺ restore" | ❌ | tylko „Clear columns override" |
| §7 Visibility | visible / **authOnly** / **zakres dat** / anchor | ⚠️ | tylko visible + anchor |
| §8 | Kaskada desktop‑baza + delty | ⚠️ | model OK; **per‑blok martwe**; brak UI restore |
| §9 | Command Palette przez **⌘K** + inline „+" + **nawigacja klawiaturą** | ❌ | tylko klik; brak ⌘K/Arrow/Enter |
| §9 | Pełny słownik w palecie | ❌ | 8+8 z 17+16 |
| §10 | Warstwy: klik = zaznacz + **scroll‑to** + **oko (hide)** | ⚠️ | tylko zaznacza |
| §11 | ⌘K / Esc / ⌘Z / ⌘D / Del | ❌ | brak handlerów |
| §13 | Model danych (sekcje/bloki/kaskada) | ✅ | wiernie w `pageDocumentV2.ts` |

> **Podsumowanie §7:** implementer trafił w **strukturę** (canvas + pływający
> pasek + paleta + warstwy + kaskada‑model), ale pominął **większość głębi**
> (WYSIWYG z realną treścią, edycja per‑blok, panel Tła, swatche, markery
> override, restore‑inheritance, skróty klawiszowe, inline „+", przeciągalny
> pasek, authOnly/daty, typografia). To dokładnie te elementy, których „chyba
> brakuje" — potwierdzone.

---

## 8. Jak rozbudować bloki/sekcje (projekt docelowy)

Cel: bloki zostają **atomowe**, ale dobrze się komponują, dają się zagnieżdżać,
każdy ma realną listę kontrolek, a render jest **identyczny na 3 powierzchniach**
z desktopem jako bazą. Poniżej zwięzły projekt (pełny w `wf_extension` — wątek
projektowy audytu; tu skondensowany do decyzji wykonawczych).

### 8.A Jeden wspólny kontrakt renderowania

**Problem:** 3 renderery (front/preview = jeden; canvas = drugi; model ma pola,
których nikt nie konsumuje). **Lek:** jeden czysty moduł renderujący, używany
przez **wszystkie** powierzchnie.

Proponowany kształt (`core/render/`):

```
core/render/
  resolveDocument.ts    // rozwiązanie breakpointu (desktop ⊕ delty), rekursja po slots
  styleFromControls.ts  // JEDYNE źródło: controls -> {className, style, cssVars}
  tokens.ts             // mapowanie na _docs/DESIGN_TOKENS.md (token ref -> var(--...))
  blocks/registry.ts    // rejestr rendererów per block.type
  blocks/renderBlock.tsx
  sections/registry.ts  // rejestr per section.type (+ branch po variant)
  PageRenderer.tsx       // wejście: (document, breakpoint, RenderContext)
```

Jedyne, co wolno różnicować per powierzchnia, to **`RenderContext`**:

```ts
interface RenderContext {
  surface: 'canvas' | 'preview' | 'frontend';
  isEditing: boolean;                 // canvas=true -> nakładka zaznaczenia (outline, nie border-box)
  selection?: { selectedBlockId?: string; selectedSectionId?: string };
  onSelectBlock?(id: string): void;
  resolveCollection?(q): CollectionResult;  // data-binding wstrzykiwany z zewnątrz
  resolveForm?(formId): FormDescriptor;     // (renderer pozostaje czysty)
  resolveAsset?(assetId): AssetRef;
}
```

**Reguła kontraktu:** renderery bloków/sekcji to **czyste funkcje** `(node,
resolved props/style, ctx)`. Nigdy nie czytają stanu globalnego, `process.env`
ani szerokości viewportu. Jedyne różnice między powierzchniami: (1) **chrome
zaznaczenia** przez wspólny `<EditableWrapper>` owijający **identyczny** markup
(outline/ring — nie zmienia layoutu); (2) **data‑binding** przez callbacki (na
canvasie mogą zwracać próbki, na froncie realne dane — *kształt markupu ten sam*).
WYSIWYG wynika „z konstrukcji".

Migracja: `renderPublicPage.tsx:328` i gałąź preview wołają `PageRenderer`;
`PageEditor.tsx` kasuje `SectionCanvas`/`BlockPreview` i renderuje
`<PageRenderer surface="canvas" .../>`; martwe makiety usunięte.

### 8.B Model zagnieżdżania — minimalna zmiana schematu

(Decyzja z [§3.1](#page-editor-v2-nesting-decision).)
Zmiana **addytywna i mała**. TASK-418 kanonicznie używa nazwanego modelu
`slots`, a nie równoległego pola `children`:

```ts
// pageBlockTypes — DODAJ: 'container' | 'columns' | 'group'
// PageBlockV2 — DODAJ jedno opcjonalne pole:
slots?: Partial<Record<PageBlockSlotKey, PageBlockV2[]>>;

type PageBlockSlotKey = "children" | "header" | "body" | "footer" | `column:${number}`;
```

Reguły utrzymujące atomowość i desktop‑bazę:

- `slots` **dozwolone tylko** dla bloków‑układów (normalizer odrzuca `slots`
  na liściach i odrzuca nieznane klucze slotów) → liście pozostają atomowe.
- Bloki‑układy **nie mają propsów treści**: `columns {count 1..4, gap,
  distribution}`, `group {direction, wrap, gap}`, `container {}` (styl robi
  resztę). Jedyny ładunek strukturalny to `slots`.
- **Ograniczona głębokość**: `PAGE_BLOCK_MAX_TREE_DEPTH = 4`, liczona od
  top-level blocka w sekcji jako depth 1, egzekwowana w normalizerze.
- W `columns` każdy `column:N` to osobna kolumna (stabilna kolejność kluczy) →
  rozmieszczenie per‑blok wyrażane strukturalnie (rozwiązuje „nie da się dać
  full‑width hero nad rzędem 2 kart w jednej sekcji").
- Sekcja **zachowuje** `layout.columns` dla prostych przypadków (back‑compat);
  złożone układy: blok `columns` w 1‑kolumnowej sekcji.
- JSON schema staje się **rekurencyjna** (`$ref` bloku dla wartości `slots`,
  limity długości slotu i lista dozwolonych kluczy) — realne ograniczenie, nie
  `additionalProperties:true`.
- `resolveDocument` **rekuruje po `slots`** i scala `block.responsive[bp]` na
  każdym poziomie (desktop baza) — to **jednocześnie** naprawia martwą
  responsywność per‑blok i czyni zagnieżdżenia responsywnymi.

### 8.C System kontrolek per‑blok

Każdy blok (liść i układ) wystawia **bazowy zestaw kontrolek** w rozszerzonym
`PageBlockStyleV2` (dziś tylko `align`+`width`), wzorem klampowanego
`PageSectionStyleV2`. Wartości to **referencje tokenów** lub walidowane literały
(nie surowe stringi):

| Grupa | Pola | Uwagi |
|---|---|---|
| Kolor | `textColor` | token `color.text.*` / hex fallback |
| Tło | `backgroundType` (none/color/gradient/image), `background`, `backgroundImage` | jak sekcja |
| Typografia | `fontFamily`, `fontSize` (`font.size.*`), `fontWeight`, `lineHeight`, `letterSpacing`, `textAlign` | zastępuje martwy `style.align` |
| Odstępy | `padding{T,R,B,L}`, `margin{T,R,B,L}` | skala `space.*` |
| Wyrównanie | `align` (self w rodzicu), `justify` (dla bloków‑układów) | jedno źródło prawdy |
| Obramowanie | `borderWidth`, `borderColor`, `borderStyle`, `radius` (`radius.*`) | |
| Widoczność | `visible` + per‑breakpoint przez `responsive[bp].visibility` | |

- **De‑duplikacja align:** `style.textAlign` = jedyne źródło dla tekstu; `props.align`
  usunięte z `pageBlockPropKeys` (migracja kopiuje do `style.textAlign`).
- **Mapowanie na tokeny** (`core/render/tokens.ts`): kontrolki trzymają ref tokenu
  (`"color.accent"`, `"space.6"`, `"radius.md"`), `styleFromControls` rozwija do
  `var(--color-accent)` → identycznie na 3 powierzchniach + zgodnie z motywem
  strony. Edytor pokazuje **swatche/kroki z tokenów** (zamiast surowego hex).
  `DESIGN_TOKENS.md` = kanoniczne źródło dla enumów schematu i swatchy.
- **Cykl serializacji (zastępuje `updateFirstBlockProps`):**

```ts
updateBlock(blockId, group, patch, breakpoint):
  if breakpoint === 'desktop': write patch -> block[group]            // baza
  else:                        write patch -> block.responsive[breakpoint][group]  // delta
```

To naprawia bug nadpisywania bazy ([§5.3](#page-editor-v2-non-desktop-content-base-overwrite)).

- **Emisja multi‑breakpoint na froncie:** `PageRenderer` emituje markup
  desktop‑resolved **+ bloki `@media`** wyprowadzone z delt `responsive`
  (scope’owane po `data-block-id`), więc przeglądarka przełącza się przy realnych
  szerokościach (koniec z `md:`‑zależnością od szerokości iframe).

### 8.D/E Edytor: zaznaczanie per‑blok + inspektor (bez utraty atomowości)

- Dodać realny `selectedBlockId`; `EditableWrapper` podpina `onClick`
  (`stopPropagation`) na każdy blok/sekcję, także **zagnieżdżone** → zaznaczanie
  na dowolnej głębokości.
- **Block Inspector** (gdy zaznaczony blok): grupy bazowe (kolor/tło/typografia/
  odstępy/wyrównanie/obramowanie/widoczność) + ekstrasy per typ — sterowane jednym
  **deklaratywnym descriptorem** `{field, controlKind, tokenGroup, breakpointAware}`,
  z którego generowane są UI **i** normalizer/schema (nie da się rozjechać).
- **Section Inspector** uzupełnia luki §7: justify, backgroundType,
  backgroundImage, shadow, authOnly, daty, **wybór wariantu**.
- Atomowość zachowana: inspektor edytuje **jeden blok po id**, nigdy nie łączy
  odpowiedzialności; układ/zagnieżdżenie tylko przez 3 bloki‑układy.

Pełne matryce kontrolek — niżej.

---

## 9. Matryce kontrolek (per blok, per sekcja)

**Base** = bazowy zestaw z §8.C (kolor, tło, typografia, odstępy, wyrównanie,
obramowanie/radius, widoczność), wszystko **breakpoint‑aware**. Poniżej tylko
ekstrasy per typ.

### 9.1 Bloki (16 liści + 3 nowe układy = 19)

| Typ bloku | Base? | Ekstrasy (props) | Uwagi renderera |
|---|---|---|---|
| `heading` | tak | `text`, `level` (h1–h6) | h3–h6 **różne** rozmiary (token scale) |
| `text` | tak | `text`, `format` (plain/rich) | `rich` → **sanityzowany** HTML (XSS!) |
| `button` | tak | `label`, `href`, `target`, `variant`, `size` | akcent przez `var(--color-accent)`, `<a>` |
| `image` | tak | `assetId`, `src`, `alt`, `caption`, `fit` | placeholder tylko gdy brak `src` |
| `video` | tak | `src`, `poster`, `autoplay`, `loop`, `controls` | placeholder gdy pusty |
| `list` | tak | `items[]`, `ordered` | `<ul>/<ol>` |
| `card` | tak | `title`, `text`, `image`, `href` | **renderuj image + anchor gdy href** |
| `statistic` | tak | `value`, `label`, `prefix`, `suffix` | renderuje się |
| `quote` | tak | `text`, `author`, `role` | renderuje się |
| `divider` | tak | `thickness`, `lineStyle` | |
| `spacer` | tak | `height` | |
| `icon` | tak | `name`, `label`, `size` | **zaimplementuj** (dziś placeholder) |
| `gallery` | tak | `items[]`, `layout`, `columns` | **zaimplementuj** grid (dziś placeholder) |
| `collection` | tak | `contentTypeId`, `queryId`, `limit`, `templateId`, `layout` | **bind** przez `resolveCollection` |
| `form` | tak | `formId`, `title`, `submitLabel` | **bind** przez `resolveForm` |
| `embed` | tak | `html`, `url`, `provider` | **sanityzowany** html/iframe |
| `container` *(nowy)* | tak | — (`slots.children`) | wrapper, rekursja slotów |
| `columns` *(nowy)* | tak | `count` (1–4), `gap`, `distribution` | `slots.column:N` = kolumna; jawne `grid-template-columns` per bp |
| `group` *(nowy)* | tak | `direction` (row/column), `wrap`, `gap` | flex, rekursja |

### 9.2 Sekcje (kluczowe typy)

**Section Base** = `layout {columns, maxWidth, align, justify}`, `style
{backgroundType, background, backgroundImage, accent, radius, shadow,
typography}`, `spacing {padding T/R/B/L, gap}`, `visibility {visible, anchor,
authOnly, startsAt, endsAt}` + `variant`. Wszystko breakpoint‑aware. (Pogrubione
pola są w modelu/runtime, ale **nieedytowalne w UI** — to wymagana powierzchnia
edytora.)

| Typ sekcji | Wariant | Układ specyficzny | Uwaga |
|---|---|---|---|
| `hero` | default/split/centered/full-width | duży nagłówek + media wg wariantu | **branch po variant** (dziś ignorowany) |
| `content` | default/compact | przepływ bloków | |
| `feature-grid`/`cards` | grid/cards | N‑kolumnowy grid | |
| `media-split` | split/horizontal | media + tekst | wariant musi sterować |
| `gallery` | grid/cards | grid obrazów | |
| `lead-form`/`cta` | centered/full-width | formularz/CTA | footer często jako `cta` |
| `faq` | default | accordion/lista | |
| `navigation` | horizontal/compact | **pasek nav** (brand+linki+CTA), sticky | **zaimplementuj** (dziś stos) |
| `filters` | default | pasek filtrów dla kolekcji | bind przez `RenderContext` |
| `timeline` | default/horizontal | oś czasu | typ/wariant ignorowane |
| `comparison` | default | kolumny/tabela porównań | typ ignorowany |
| `testimonials` | cards/grid | karty opinii | |
| `template`/`custom`/`embed` | — | passthrough/custom | udokumentować jeśli uniform |

> Dodać **bounded `typography`** do `PageSectionStyleV2` (+schema+normalizer), by
> przykład `style.h1Size` ze specu (§13) był zapisywalny (dziś normalizer go
> odrzuca — konkretny rozjazd kontraktu). Renderery sekcji **branchują po
> `section.type` i `section.variant`** i emitują `data-page-section` +
> `data-page-variant`.

---

<a id="page-editor-v2-task-418-family"></a>

## 10. Rodzina zadań do wykonania (TASK-418)

Po scaleniu najważniejszych punktów z równoległego TASK-419 kanonicznym planem
jest fizyczna rodzina:

> **TASK-418 — Page Editor V2 Authoring Nesting And Runtime Remediation**
> Parent: `_docs/_TASKS/TASK-418_Page_Editor_V2_Authoring_Nesting_And_Runtime_Remediation.md`
> Raport/audyt: `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`

Ewentualne pliki `TASK-419*` z tym samym zakresem są kontekstem dirty-worktree i
muszą zostać superseded albo jawnie scalone do TASK-418 przed commitem
implementacyjnym. Nie są drugim aktywnym planem.

Drzewo TASK-418, dependency-ordered:

| ID | Tytuł | Zależy od | Kluczowe acceptance |
|---|---|---|---|
| **TASK-418-01** | Audit Contract And Task Drift Freeze | TASK-417 | Utrzymać raport `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`, zapisać decyzję bounded `slots`, zebrać Claude/subagent findings, zamrozić brak aktywnego TASK-419 duplicate. |
| **TASK-418-01-L01** | Page Editor V2 Gap Audit Report | TASK-418-01 | Raport ma wskazywać konkretne pliki/linie, severity, mapowanie remediation i aktualny plik raportu. |
| **TASK-418-01-L02** | Final Preimplementation Drift Audit Loop | TASK-418-01-L01 | Po zmianach task contractu rerun read-only drift audit i fold confirmed findings przed implementacją. |
| **TASK-418-02** | Immediate Editor Correctness And Selection | TASK-418-01 | Naprawić selected block state, typed patching, autosave/save feedback i pierwszoklasowe akcje bloków. |
| **TASK-418-02-L01** | Type Safe Block Patching And Autosave Errors | TASK-418-01 | Allowlist-bound block helpers, widoczne błędy autosave, brak loose `content` patching. |
| **TASK-418-02-L02** | Block Selection Model And Layers Tree | TASK-418-02-L01 | Selection target obejmuje sekcje, bloki i ścieżki slotów; layers i assistant dostają ten sam kontekst. |
| **TASK-418-02-L03** | Block Insert Reorder Duplicate And Delete Actions | TASK-418-02-L02 | Insert/move/duplicate/delete działają na selected target i zachowują stabilne id/path. |
| **TASK-418-02-L04** | Block Style And Responsive Model Substrate | TASK-418-01 | `PageBlockStyleV2`, `block.responsive`, strict schema i resolver są jednym substratem dla późniejszych kontrolek. |
| **TASK-418-03** | Control Registry And Floating Toolbar Parity | TASK-418-02 | Toolbar i inspector są generowane z registry, nie z rozproszonych martwych kontrolek. |
| **TASK-418-03-L01** | Universal Section And Block Control Registry | TASK-418-02 | Universal controls mają schema-owned paths, responsive metadata i walidację ścieżek. |
| **TASK-418-03-L02** | Per Type Atomic Block Controls | TASK-418-03-L01 | Każdy insertable block ma małe dedykowane kontrolki atomowe zamiast tłustego widget configu. |
| **TASK-418-03-L03** | Responsive Override Indicators And Reset UX | TASK-418-03-L01 | UI pokazuje override, inheritance i reset per pole dla section oraz block. |
| **TASK-418-03-L04** | Floating Toolbar Interactions And Keyboard Shortcuts | TASK-418-03-L01, TASK-418-03-L02, TASK-418-03-L03 | Toolbar, palette, keyboard i inline add działają bez konfliktów z selection. |
| **TASK-418-04** | Canvas Preview And WYSIWYG Parity | TASK-418-02, TASK-418-03 | Canvas, preview i frontend korzystają z tego samego renderer/style helpers z różnicą tylko w editor chrome. |
| **TASK-418-04-L01** | Shared Admin Preview Renderer And Style Helpers | TASK-418-03 | Jeden renderer i style helper są wspólne dla admin preview/canvas/front. |
| **TASK-418-04-L02** | Section Layout Style Spacing Visibility Feedback | TASK-418-04-L01 | Layout/style/spacing/visibility z sekcji realnie widać na canvasie i froncie. |
| **TASK-418-04-L03** | Block Style Visual Feedback And Empty States | TASK-418-04-L01, TASK-418-03-L02 | Block style, empty states i editor chrome nie rozjeżdżają markupu. |
| **TASK-418-04-L04** | Section Type Variant Layout Templates | TASK-418-04-L01, TASK-418-02-L04 | `section.type`/`variant` branchują przez template registry, a controls używają tych samych wariantów. |
| **TASK-418-05** | Nested Container And Slot Architecture | TASK-418-02, TASK-418-03, TASK-418-04 | Bounded container/slot blocks dają elastyczne strony bez powrotu do tłustych widgetów. |
| **TASK-418-05-L01** | Recursive Page Block Contract And Normalizer | TASK-418-03 | `slots` są strict, depth-limited, capability-bound i reject unknown fields. |
| **TASK-418-05-L02** | Container Blocks Inserter And Layers Editing | TASK-418-05-L01, TASK-418-02-L02, TASK-418-02-L03 | Inserter, move i layers rozumieją named slots oraz block paths. |
| **TASK-418-05-L03** | Recursive Runtime Renderer And Responsive Cascade | TASK-418-05-L01 | Runtime renderuje slots rekurencyjnie i rozwiązuje responsive cascade na każdym poziomie. |
| **TASK-418-06** | Runtime Assistant And Template Parity | TASK-418-03, TASK-418-04, TASK-418-05 | PageEditor, assistant, kits, templates i frontend emitują tylko renderowalne typy/props. |
| **TASK-418-06-L01** | Public Runtime Real Renderers For Insertable Blocks | TASK-418-03-L02, TASK-418-04-L04 | Insertable/emittable block types mają real renderer albo są ukryte/gated. |
| **TASK-418-06-L02** | Assistant Surface Schema And Blueprint Alignment | TASK-418-02-L02, TASK-418-03, TASK-418-05-L01, TASK-418-06-L01 | Assistant zna pełny słownik atomowych bloków, responsive deltas i nested paths. |
| **TASK-418-06-L03** | Page Templates And Non Page Widget Boundaries | TASK-418-05, TASK-418-06-L01 | Template editor przechodzi na Page Templates/Pages v2 contract; stara sekcja widgets nie jest drugim kontraktem. |
| **TASK-418-06-L04** | Collection Form Embed Runtime Data Binding Security | TASK-418-06-L01, TASK-418-02-L04 | Collection/form/embed mają read-only public binding, sanitizer i route/security contracts. |
| **TASK-418-07** | Validation Docs Changelog And Live Smoke Closure | TASK-418-02, TASK-418-03, TASK-418-04, TASK-418-05, TASK-418-06 | Każdy obszar ma lane testów, docs, changelog, board i live smoke zgodnie z `AGENTS.md`. |
| **TASK-418-07-L01** | Targeted Lint Type Tests And Gates | TASK-418-02, TASK-418-03, TASK-418-04, TASK-418-05, TASK-418-06 | `bun --cwd core lint`, `lint:types`, targeted tests/gates per touched contract. |
| **TASK-418-07-L02** | Real Admin And Front Playwright Smoke | TASK-418-07-L01 | `coderso-dev-core-host` + `playwright-cli` smoke admin UI i frontend po każdym testowalnym obszarze. |
| **TASK-418-07-L03** | Docs Changelog Board And Final Drift Closure | TASK-418-07-L01, TASK-418-07-L02 | Parent/children statuses, board stats, changelog, docs i final read-only drift pass bez unresolved drift. |

**Kolejność / równoległość:** 01 zamraża kontrakt i audyt; 02 dostarcza
substrat edycji i model bloków; 03 buduje registry/kontrolki; 04 scala renderer
i canvas; 05 dokłada bounded nesting przez `slots`; 06 wyrównuje runtime,
assistant i templates; 07 zamyka walidację, live smoke i drift closure.

---

## 11. Załącznik: mapa plików i indeks severity

### 11.1 Mapa plików

| Warstwa | Plik |
|---|---|
| Model/schema/normalizer | `core/services/pages/pageDocumentV2.ts` |
| Renderer publiczny | `core/site/pageRuntimeV2.tsx` |
| Wiring renderu | `core/site/renderPublicPage.tsx`, `core/server/publicSite.tsx`, `core/server/routes/pageRoutes.ts` |
| Edytor (canvas+kontrolki) | `core/admin/ui/pages/PageEditor.tsx` |
| Preview dialog | `core/admin/ui/preview/RuntimePreviewDialog.tsx` |
| Serwisy | `core/services/pages/{pageService,revisionService,previewService}.ts` |
| Asystent (emisja) | `core/services/assistant/blueprints/*`, `core/services/kits/solutionKitsCatalog.ts` |
| **Martwy kod** (do usunięcia) | `core/admin/ui/pages/{CanvasFrame,InspectorPanel,BlockLibrary,BlockToolbar}.tsx`, `block-library.test.tsx` |
| Referencja UX | `_docs/UI/pages-editor-new-approach/{coderso-editor-spec.md,coderso-editor-redesign.html}` |
| Kontrakt normatywny | `_docs/PAGE_MODEL.md` |
| Screenshoty audytu | `_docs/_assets/page-editor-v2-audit/` |

### 11.2 Indeks severity (18 high / 17 medium / 27 low)

**HIGH (18):**
1. Per‑block styling absent w modelu (`PageBlockStyleV2` = tylko align+width).
2. `block.responsive` martwe (zapisywane, nierozwiązywane przez renderer).
3. Brak rzeczywistej responsywności runtime (jeden statyczny breakpoint SSR, brak `@media`).
4. 5 typów bloków = szare placeholdery (gallery/collection/form/embed/icon).
5. `section.type`/`variant` nie wpływają na render (17 typów identycznie).
6. Canvas nie WYSIWYG — osobny `SectionCanvas`/`BlockPreview` (×3 obszary potwierdziły).
7. Brak selekcji/edycji per‑blok; tylko `blocks[0].text` edytowalne; `selectedBlockId` martwy.
8. Brak kontrolek typowych (level/href/src/alt/items…).
9. Edycja contentu na nie‑desktopie nadpisuje bazę desktop (bug poprawności).
10. Brak danych collection/form na froncie (brak warstwy bindingu) → strony asystenta niefunkcjonalne.
11. Renderer publiczny bez pokrycia testami (placeholdery przechodzą zielono).
12. block‑responsive: tested‑but‑dead (walidowany, nigdzie nie stosowany).
13. Asystent emituje nav/footer/collection licząc na układ, który nie istnieje.
14. Brak ⌘K/Esc — paleta tylko myszą (rdzeń nawigacji wg specu).
15. Style/Background panel: brak swatchy/shadow/typografii/panelu Tła.
16. Content panel edytuje tylko blocks[0] (brak Opis/URL przycisku/per‑blok).
17. Brak markerów override + restore (kaskada „niewidzialna" w UI).
18. Brak block‑level selection (`selectedBlockId` hardcoded null) — przyczyna #7.

**MEDIUM (17, wybrane):** brak justify/backgroundType/backgroundImage/shadow/
authOnly/dat w UI; katalog 8+8 z 17+16; `text:'rich'` ignorowany; canvas device
widths ≠ preview; preview wymusza zapis + brak TTL UX; preview=draft+fallbackSEO
vs front=published+SEO; grid kolumn z `md:` zamiast resolved; brak nawigacji
klawiaturą w palecie; sekcja‑grid wymusza kolumny (brak per‑blok span); brak
inline „+"/drag; typografia sekcji (`h1Size`) nieskładowalna; wariant niezmienialny;
JSON schema `additionalProperties:true` dla responsive/props/style; assistant bez
delt responsywnych; cascade‑editing tylko dla columns.

**LOW (27, wybrane):** h3‑h6 zlane; card image/href gubione; duplikat
props.align/style.align; brak `data-page-variant`; brak pulsującej kropki;
Layers bez scroll‑to/oka; Save button poza specem; martwe makiety; pusty‑sekcji
CTA bez akcji; preview banner/opacity delta; stale preview; testy DB‑gated/
mock‑heavy; nieasercja visibility:false/authOnly; dryf katalogu vs L01 (dot.
dokumentacji); itd.

---

*Koniec raportu. Pełne, zweryfikowane luki z cytatami `plik:linia` (62 pozycje),
drzewo TASK‑418 z acceptance oraz projekt rozszerzeń A–E są podstawą do
utworzenia plików `_docs/_TASKS/TASK-418*`.*
