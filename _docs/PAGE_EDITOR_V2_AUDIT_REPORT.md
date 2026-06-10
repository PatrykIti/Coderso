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
  (`:1119`).
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

`ToolbarSubpanel` (`PageEditor.tsx:1066-1224`) ma luki względem modelu:

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

Migracja: `renderPublicPage.tsx:328` i gałąź preview wołają wspólny renderer;
`PageEditor.tsx` zachowuje `SectionCanvas` jako neutralny chrome edytora, ale
usuwa osobny `BlockPreview` i deleguje zawartość sekcji/bloków do
`PageSectionContent`. Martwe makiety są usuwane poza żywym builder toolbar.

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
- JSON schema reprezentuje zagnieżdżenia przez **skończony, rozwinięty do
  głębokości 4 schemat bloków** (sloty wskazują schemat następnej głębokości,
  a depth 4 odrzuca `slots`), z limitami długości slotu i listą dozwolonych
  kluczy — realne ograniczenie, nie `additionalProperties:true`.
- `TASK-418-05-L01` waliduje i przechowuje `block.responsive` w każdym
  zagnieżdżonym bloku, a `TASK-418-05-L03` dopina `resolveDocument`, które
  **rekuruje po `slots`** i scala `block.responsive[bp]` na każdym poziomie
  (desktop baza) — to czyni zagnieżdżenia responsywnymi bez mieszania
  kontraktu normalizacji z etapem runtime.

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

> Uwaga kontraktowa: tabela jest docelową matrycą kontrolek. Każdy prop, którego
> nie ma dziś w `pageBlockPropKeys` (`core/services/pages/pageDocumentV2.ts:235-252`),
> musi w tym samym leafie rozszerzyć allowlist, defaults, `pageDocumentV2JsonSchema`,
> normalizer, renderer i testy, albo zostać usunięty z matrycy przed dodaniem UI.

| Typ bloku | Base? | Ekstrasy (props) | Uwagi renderera |
|---|---|---|---|
| `heading` | tak | `text`, `level` (h1–h6) | h3–h6 **różne** rozmiary (token scale) |
| `text` | tak | `text`, `format` (plain/rich) | `rich` → **sanityzowany** HTML (XSS!) |
| `button` | tak | `label`, `href`, `target`, `variant`, `size` | akcent przez `var(--color-accent)`, `<a>` |
| `image` | tak | `assetId`, `src`, `alt`, `caption`, `fit` | placeholder tylko gdy brak `src` |
| `video` | tak | `assetId`, `src`, `title`, `autoplay`, `muted` (+ ewentualne nowe `poster`/`loop`/`controls` tylko po rozszerzeniu modelu) | placeholder gdy pusty |
| `list` | tak | `items[]`, `ordered` | `<ul>/<ol>` |
| `card` | tak | `title`, `text`, `image`, `href` | **renderuj image + anchor gdy href** |
| `statistic` | tak | `value`, `label`, `caption` (+ `prefix`/`suffix` tylko po rozszerzeniu modelu) | renderuje się |
| `quote` | tak | `text`, `cite` (+ `author`/`role` tylko po rozszerzeniu modelu) | renderuje się |
| `divider` | tak | `tone`, `thickness` | |
| `spacer` | tak | `size` | |
| `icon` | tak | `name`, `label` (+ `size` tylko po rozszerzeniu modelu) | **zaimplementuj** (dziś placeholder) |
| `gallery` | tak | `items[]`, `layout` (+ `columns` tylko po rozszerzeniu modelu) | **zaimplementuj** grid (dziś placeholder) |
| `collection` | tak | `contentTypeId`, `queryId`, `limit`, `templateId` (+ `layout` tylko po rozszerzeniu modelu) | **bind** przez `resolveCollection` |
| `form` | tak | `formId`, `title` (+ `submitLabel` tylko po rozszerzeniu modelu) | **bind** przez `resolveForm` |
| `embed` | tak | `html`, `url`, `provider` | **sanityzowany** html/iframe |
| `container` *(nowy)* | tak | — (`slots.children`) | wrapper, rekursja slotów |
| `columns` *(nowy)* | tak | `count` (1–4), `gap`, `distribution` | `slots.column:N` = kolumna; jawne `grid-template-columns` per bp |
| `group` *(nowy)* | tak | `direction` (row/column), `wrap`, `gap` | flex, rekursja |

### 9.2 Sekcje (kluczowe typy)

**Section Base** = `layout {columns, maxWidth, align, justify}`, `style
{backgroundType, background, backgroundImage, accent, radius, shadow}`,
`spacing {padding T/R/B/L, gap}`, `visibility {visible, anchor, authOnly,
startsAt, endsAt}` + root `variant`. `layout/style/spacing/visibility` are
breakpoint-aware; `variant` is base-only until a dedicated model extension adds
variant responsive overrides.

| Typ sekcji | Wariant | Układ specyficzny | Uwaga |
|---|---|---|---|
| `hero` | default/split/centered/full-width | duży nagłówek + media wg wariantu | **branch po variant** (dziś ignorowany) |
| `content` | default/compact | przepływ bloków | |
| `feature-grid`/`cards` | grid/cards | N‑kolumnowy grid | |
| `media-split` | split/horizontal | media + tekst | wariant musi sterować |
| `gallery` | grid/cards | grid obrazów | |
| `cta` | centered/full-width/default | CTA | L04 |
| `faq` | default | accordion/lista | |
| `lead-form` | centered/full-width | formularz | poza L04: non-insertable do czasu security/runtime form binding |
| `navigation` | horizontal/compact | pasek nav (brand+linki+CTA), sticky | poza L04: runtime navigation boundary |
| `filters` | default | pasek filtrów dla kolekcji | poza L04: listing/data-binding runtime |
| `timeline` | default/horizontal | oś czasu | typ/wariant ignorowane |
| `comparison` | default | kolumny/tabela porównań | typ ignorowany |
| `testimonials` | cards/grid | karty opinii | |
| `custom` | default/compact/grid | passthrough/custom | L04 safe generic templates |
| `template`/`collection`/`embed` | — | fallback generic/deferred binding | poza L04: valid stored sections keep editing controls, inserter stays capability-gated |

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
| **TASK-418-02-L04** | Block Style And Responsive Model Substrate | TASK-418-01 | `PageBlockStyleV2`, `block.responsive`, `pageBlockCapabilities`, strict normalizer + `pageDocumentV2JsonSchema` i resolver są jednym substratem dla późniejszych kontrolek. |
| **TASK-418-02-L01** | Type Safe Block Patching And Autosave Errors | TASK-418-01, TASK-418-02-L04 | Allowlist-bound block helpers, widoczne błędy autosave, brak loose `content` patching. |
| **TASK-418-02-L02** | Block Selection Model And Layers Tree | TASK-418-02-L01 | Selection target obejmuje sekcje i top-level bloki; layers i assistant dostają ten sam selected block id. Ścieżki slotów pozostają w TASK-418-06-L02 po kontrakcie recursive blocks. |
| **TASK-418-02-L03** | Block Insert Reorder Duplicate And Delete Actions | TASK-418-02-L02 | Insert/move/duplicate/delete działają na selected target i zachowują stabilne id; nested path handling pozostaje w TASK-418-06-L02. |
| **TASK-418-03** | Control Registry And Floating Toolbar Parity | TASK-418-02 | Toolbar i inspector są generowane z registry, nie z rozproszonych martwych kontrolek. |
| **TASK-418-03-L01** | Universal Section And Block Control Registry | TASK-418-02 | Universal controls mają schema-owned array paths, responsive metadata, owner-exported option arrays, section capabilities i walidację ścieżek. |
| **TASK-418-03-L02** | Per Type Atomic Block Controls | TASK-418-03-L01 | Każdy insertable block ma małe dedykowane kontrolki atomowe oparte o array paths, `pageBlockPropKeys`, owner option arrays i capability gating. |
| **TASK-418-03-L03** | Responsive Override Indicators And Reset UX | TASK-418-03-L01, TASK-418-03-L02 | UI pokazuje override, inheritance i reset per pole dla section oraz block. |
| **TASK-418-03-L04** | Floating Toolbar Interactions And Keyboard Shortcuts | TASK-418-03-L01, TASK-418-03-L02, TASK-418-03-L03 | Toolbar, palette, keyboard i inline add działają bez konfliktów z selection. |
| **TASK-418-04** | Canvas Preview And WYSIWYG Parity | TASK-418-02, TASK-418-03 | Canvas, preview i frontend korzystają z tego samego renderer/style helpers z różnicą tylko w editor chrome. |
| **TASK-418-04-L01** | Shared Admin Preview Renderer And Style Helpers | TASK-418-02-L04, TASK-418-03 | Jeden renderer i style helper są wspólne dla admin preview/canvas/front. |
| **TASK-418-04-L02** | Section Layout Style Spacing Visibility Feedback | TASK-418-04-L01 | Layout/style/spacing/visibility z sekcji realnie widać na canvasie i froncie. |
| **TASK-418-04-L03** | Block Style Visual Feedback And Empty States | TASK-418-04-L01, TASK-418-03-L02 | Block style, empty states i editor chrome nie rozjeżdżają markupu. |
| **TASK-418-04-L04** | Section Type Variant Layout Templates | TASK-418-04-L01, TASK-418-02-L04 | `section.type`/`variant` branchują przez template registry, a controls używają tych samych wariantów. |
| **TASK-418-05** | Nested Container And Slot Architecture | TASK-418-02, TASK-418-03, TASK-418-04 | Bounded container/slot blocks dają elastyczne strony bez powrotu do tłustych widgetów. |
| **TASK-418-05-L01** | Recursive Page Block Contract And Normalizer | TASK-418-02-L04 | `slots` są strict, depth-limited, capability-bound i reject unknown fields. |
| **TASK-418-05-L02** | Container Blocks Inserter And Layers Editing | TASK-418-05-L01, TASK-418-02-L02, TASK-418-02-L03 | Inserter, move i layers rozumieją named slots oraz block paths. |
| **TASK-418-05-L03** | Recursive Runtime Renderer And Responsive Cascade | TASK-418-05-L01, TASK-418-04-L01 | Runtime renderuje slots rekurencyjnie i rozwiązuje responsive cascade na każdym poziomie przez shared renderer. |
| **TASK-418-06** | Runtime Assistant And Template Parity | TASK-418-03, TASK-418-04, TASK-418-05 | PageEditor, assistant, kits, templates i frontend emitują tylko renderowalne typy/props. |
| **TASK-418-06-L01** | Public Runtime Real Renderers For Insertable Blocks | TASK-418-03-L02, TASK-418-04-L04 | Insertable/emittable block types mają real renderer albo są ukryte/gated. |
| **TASK-418-06-L02** | Assistant Surface Schema And Blueprint Alignment | TASK-418-02-L02, TASK-418-03, TASK-418-05-L01, TASK-418-06-L01 | Assistant zna pełny słownik atomowych bloków, responsive deltas i nested paths. |
| **TASK-418-06-L03** | Page Templates And Non Page Widget Boundaries | TASK-418-05, TASK-418-06-L01 | Page Templates używają Pages v2 contract; non-Page widget-template/custom-screen/detail-page zostają przy legacy `WidgetBlock[]` do osobnej migracji. |
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

### 11.3 Preimplementation drift pass, 2026-06-09

- HEAD audytu: `a49c772cfcfcb21f69dfcca3617b0ffc798814e0`; dirty context:
  clean przed zmianami kontraktu.
- Subagent `019eae00-5bb7-7c61-bb49-bcd38b8e7519` oraz Claude CLI
  (`claude -p --permission-mode plan --effort max --tools Read,Grep,Bash`) nie
  znalazły blokujących `High` driftów.
- Potwierdzone korekty kontraktu przed implementacją: `pageDocumentV2JsonSchema`
  ma mieć parity ze strict normalizerem dla block props/style/responsive i
  recursive slots; `selectedBlockPath` asystenta musi być server-revalidated;
  capability gating dla `collection`/`form`/`embed` musi iść razem z realnym lub
  fail-closed public bindingiem; martwy mockup renderer/test ma zostać usunięty
  przy shared rendererze; `TASK-418-06-L03` zamraża boundary legacy widget
  surfaces zamiast migrować je po cichu.
- Po tej korekcie kontraktu wymagany jest świeży read-only drift pass przed
  zmianami produkcyjnymi.

### 11.4 TASK-418-02-L04 closeout, 2026-06-09

- `core/services/pages/pageDocumentV2.ts` owns expanded `PageBlockStyleV2`,
  `pageBlockPropKeys`, `pageBlockCapabilities`, strict nested
  `pageDocumentV2JsonSchema`, sparse block responsive deltas, and
  `resolvePageBlockForBreakpoint`.
- `resolvePageDocumentForBreakpoint` now applies block overrides after section
  overrides, so mobile/tablet block `props`/`style`/`visibility` deltas no longer
  sit unused.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-document-v2.test.ts`, `bun --cwd core lint:types`, and
  `bun --cwd core lint`.

### 11.5 TASK-418-02-L01 closeout, 2026-06-09

- `core/admin/ui/pages/PageEditor.tsx` now filters content-panel block patches
  through `pageBlockPropKeys` instead of writing generic `{ text, label }` props
  to the first block.
- Desktop block content edits update base props; tablet/mobile edits write sparse
  `block.responsive[device].props` deltas.
- Button primary text/URL edits write `label` and `href` only, and heading edits
  no longer write invalid `label` props.
- Autosave failures render a bounded inline "Autosave paused" alert.
- Validation passed: `bun run test:vitest --
  tests/vitest/ui/page-editor-v2-flow.test.tsx`, `bun --cwd core lint:types`,
  and `bun --cwd core lint`.

### 11.6 TASK-418-02-L02 closeout, 2026-06-09

- `core/admin/ui/pages/PageEditor.tsx` now owns top-level section/block
  selection state for the canvas and Layers overlay.
- Canvas block wrappers and Layers block rows select blocks by id, while section
  selection clears block selection.
- The floating toolbar label switches from section to selected block, and typed
  content edits patch the selected block when one is active.
- Assistant active page surface context now publishes a valid selected block id;
  nested block paths and `selectedBlockPath` remain deferred to
  `TASK-418-06-L02`.
- Fresh read-only subagent confirmation
  `019eae49-d28f-7371-9164-4e1ad1e3e17a` reported no High, Medium, or Low L02
  drift before implementation; earlier low drift findings were folded into the
  L01/L02/L03/board contract text.
- Validation passed: `bun run test:vitest --
  tests/vitest/ui/page-editor-v2-flow.test.tsx`, `bun --cwd core lint:types`,
  and `bun --cwd core lint`.

### 11.7 TASK-418-02-L03 and TASK-418-02 closeout, 2026-06-09

- Command palette block insertion now uses the active target: insert after the
  selected block, append to the selected section, or create a new content section
  containing the requested block when no selection exists.
- Empty section canvas CTA opens the block inserter for that section.
- Selected block toolbar actions move, duplicate, and delete only the selected
  block; deletion selects the nearest surviving block or the parent section.
- `TASK-418-02` is closed with all physical children done: `02-L04`, `02-L01`,
  `02-L02`, and `02-L03`.
- Nested container-slot insertion and block paths remain deferred to
  `TASK-418-05-L02`/`TASK-418-06-L02`.
- Validation passed: `bun run test:vitest --
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (12 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.8 TASK-418-03-L01 closeout, 2026-06-09

- `core/services/pages/pageDocumentV2.ts` now exports Page owner option arrays
  for editor select/segmented controls and owns `pageSectionCapabilities`.
- `core/services/pages/pageEditorControlRegistry.ts` defines universal
  section/block controls with schema-owned array paths, responsive override
  paths, owner-provided options, and capability-gated target lookup.
- `tests/vitest/pages/page-editor-control-registry.test.ts` covers valid paths,
  owner option metadata, section capability coverage, and block capability
  gating.
- Fresh read-only subagent confirmation
  `019eae5f-d703-7f80-994c-708d082dbdeb` reported no High, Medium, or Low
  TASK-418-03 drift after contract corrections. Claude confirmation was
  attempted, but the redundant long-running process was terminated after the
  clean subagent confirmation and local contract checks.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts` (17 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.9 TASK-418-03-L02 closeout, 2026-06-09

- Read-only subagent audit `019eae6a-5b8f-76c0-aaf1-fb8570798dc3`
  found real L02 contract drift before source edits: PageEditor registry
  integration, capability-derived block insertion, non-insertable block reasons,
  and owner arrays for enum-like block props. The task contract and board were
  corrected first.
- Fresh read-only subagent audit
  `019eae6e-e9eb-75b1-a52a-1d0f18b4b1b9` then reported no remaining High,
  Medium, or Low contract blocker before implementation.
- `pageDocumentV2` now exports block option arrays (`pageBlockWidths`,
  `pageImageFits`, `pageGalleryLayouts`, `pageDividerTones`), normalizes the
  matching enum-like props, tightens block prop JSON schema, clamps divider and
  spacer numeric controls, and owns explicit non-insertable block reasons.
- `pageEditorControlRegistry` now declares per-type atomic controls for every
  owner-insertable block and returns universal plus per-type controls through
  capability-gated lookup.
- `PageEditor` now derives block inserter choices from `pageBlockCapabilities`
  and renders selected-block controls from registry paths for `props`, `style`,
  and `visibility`, including sparse tablet/mobile block overrides.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (35 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.10 TASK-418-03-L03 closeout, 2026-06-09

- Read-only pre-implementation audits
  `019eae83-3fcc-7d71-8836-1ea175c0497f`,
  `019eae86-c1bd-7811-8124-808488b99f9f`, and
  `019eae89-29ab-7653-9633-4c438853ede0` confirmed the corrected L03 task
  contract after dependency drift was fixed in the leaf and dependency table.
- `PageEditor` now renders field-level `Base`/`Inherited`/`Override` state for
  section and block controls, exposes per-field reset buttons for existing
  tablet/mobile overrides, and shows override badges on canvas and layer targets.
- `pageDocumentV2` now exports `clearBlockResponsiveOverride`, matching the
  section override reset pruning behavior for sparse block overrides.
- Final drift audit `019eae91-254a-7c73-b0d5-e712fc1610b9` found one low
  pruning mismatch: clearing the last block breakpoint could leave
  `responsive: {}`. The helper now deletes the optional block `responsive` field
  when the final override is removed, and tests assert that stronger behavior.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (37 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.11 TASK-418-03-L04 and TASK-418-03 closeout, 2026-06-09

- Read-only pre-implementation audit
  `019eae99-5020-7a82-9c83-7ee90594618f` reported no High, Medium, or Low
  drift blocking TASK-418-03-L04 implementation.
- `PageEditor` floating toolbar now exposes selection-aware labels, icon
  title/ARIA coverage, one active subpanel marker, collapsible toolbar state,
  and local draggable offset state.
- Keyboard shortcuts now support `Ctrl/Cmd+K` Command Palette open, `Esc`
  overlay close/selection clear, duplicate selection, and delete request while
  ignoring input/select/textarea/contenteditable targets.
- Delete from toolbar or keyboard now opens the shared destructive confirmation
  dialog before mutating the Page draft.
- Command Palette supports arrow-key result movement and Enter insertion across
  filtered section/block groups.
- `TASK-418-03` is closed with all physical children done: L01 universal
  controls, L02 per-type block controls, L03 responsive override reset UX, and
  L04 floating toolbar interactions/shortcuts.
- Final read-only drift pass `019eaeaa-8513-79f1-8b1a-ce51743c2c10` found one
  real medium issue after closeout: `Esc` was not guarded for normal editable
  fields. The shortcut handler now ignores `Esc` from editable targets unless
  the Command Palette is open, and regression coverage asserts that `Esc` in a
  toolbar field does not clear selection.
- Follow-up read-only drift pass `019eaeb0-63b0-76a3-816b-b49e671e8181` found
  one low validation gap for Command Palette `Enter` insertion coverage. The UI
  suite now dispatches `Enter` on the active command result and asserts the
  selected section is inserted.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (40 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.12 TASK-418-04-L01 preimplementation audit correction, 2026-06-09

- Read-only pre-implementation audit
  `019eaebd-5afa-7841-8426-067475e4a269` found no high-severity blocker, but
  identified real medium contract drift before source edits.
- The L01 contract now requires `_docs/PAGE_MODEL.md` updates for the shared
  renderer ownership move even when style behavior does not change.
- The L01 validation contract now requires Vitest shared-render comparison and
  Bun public-runtime smoke coverage for shared data attributes and style/class
  output.
- The inherited section-control registry gap from the closed TASK-418-03 area is
  explicitly bounded to `TASK-418-04-L02`, including `justify`, `shadow`, and
  `authOnly` section controls.

### 11.13 TASK-418-04-L01 closeout, 2026-06-09

- Fresh read-only pre-implementation audit
  `019eaec2-57f3-7133-ae8f-c75774ef88c7` reported no High, Medium, or Low drift
  after the L01 contract corrections and before source edits.
- `core/services/pages/pageRendererV2.tsx` now owns the shared Pages v2
  section/block renderer, section style helpers, breakpoint render-tree
  resolution, and block placeholders for runtime-pending block types.
- `core/site/pageRuntimeV2.tsx` now delegates to the shared renderer; public
  rendering still enters through `renderPublicPageV2RuntimeHtml`.
- `PageEditor` now renders canvas section/block content through
  `PageSectionContent`, while editor chrome, selection rings, responsive badges,
  and canvas actions remain local.
- Disconnected static editor mockups
  `core/admin/ui/pages/{CanvasFrame,InspectorPanel,BlockLibrary,BlockToolbar}.tsx`
  and their dead scoped assertions were removed; live `PageList` delegation
  coverage remains in `page-leaf-components.test.tsx`.
- Post-implementation drift audit
  `019eaece-b8b8-7751-9f87-0fa9e34618e2` found one real low issue: button
  anchors rendered by the shared renderer could still navigate when clicked in
  the admin canvas. `PageEditor` now prevents default canvas click behavior at
  the editor block wrapper, and the UI suite clicks the rendered anchor directly
  to prove it selects the block without navigation.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx
  tests/vitest/ui/page-leaf-components.test.tsx
  tests/vitest/ui-integration/pageBuilder.test.tsx` (46 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (10 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.
- Drift fix validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (26 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.14 TASK-418-04-L02 preimplementation audit correction, 2026-06-09

- Read-only pre-implementation audit
  `019eaeda-96bf-7742-b15f-12fdd19c26e0` found no high-severity blocker, but
  identified real medium contract drift before source edits.
- The L02 contract now requires PageEditor to use `pageUniversalSectionControls`
  for existing selected sections so valid stored non-insertable section types do
  not become toolbar-readonly.
- The L02 contract now makes admin canvas layout device-aware: simulated
  mobile/tablet column feedback must derive from resolved section data, not
  browser viewport media classes.
- The L02 contract now keeps style ownership in `PageSectionContent` so
  `SectionCanvas` editor chrome does not double-apply padding/background/radius/
  shadow/gap.
- The L02 contract now preserves supplemental section editing/representation
  for `anchor`, `backgroundImage`, `startsAt`, and `endsAt`, and requires hidden
  admin ghost coverage plus public/shared omission coverage.
- Follow-up audit `019eaee0-1798-72c1-9e1b-2abf9bfa53d5` found stale report
  prose that still said to delete `SectionCanvas` and under-specific L02
  validation commands. The report now treats `SectionCanvas` as neutral editor
  chrome, and the L02 task explicitly names shared-renderer Vitest coverage plus
  conditional Bun runtime smoke.

### 11.15 TASK-418-04-L02 closeout, 2026-06-09

- Fresh read-only pre-implementation audit
  `019eaee4-f4b2-7951-8950-40348156f3fe` reported no High, Medium, or Low drift
  after the L02 contract corrections and before source edits.
- `PageEditor` now renders selected-section toolbar controls from
  `pageUniversalSectionControls`, including `justify`, `shadow`, and `authOnly`,
  and bypasses insertability-gated lookup for existing selected sections.
- Supplemental section controls preserve `anchor` and add bounded editing for
  `backgroundImage`, `startsAt`, and `endsAt`.
- `PageSectionContent` now supports `layoutMode="canvas-device"` so the admin
  canvas applies resolved section columns directly for simulated breakpoints,
  while public runtime keeps responsive viewport classes.
- Hidden sections render admin ghost/chrome state in the canvas; shared renderer
  tests prove hidden sections are omitted outside admin chrome.
- Post-implementation drift audit
  `019eaef1-667c-7e72-8971-0ea75a368d05` found one real medium issue:
  `SectionCanvas` still had card-like wrapper chrome. The wrapper now uses
  neutral outline-only selection/hover chrome, so shared `PageSectionContent`
  remains the only owner of section padding/background/radius/shadow/gap.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (35 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (10 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.
- Drift fix validation passed: `bun run test:vitest --
  tests/vitest/ui/page-editor-v2-flow.test.tsx
  tests/vitest/pages/page-renderer-v2.test.tsx` (30 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.

### 11.16 TASK-418-04-L03 preimplementation audit correction, 2026-06-10

- Read-only pre-implementation audit
  `019eaeff-08ac-7dd0-aee6-533d76f99db1` found no high-severity blocker, but
  identified real medium contract drift before source edits: the public
  behavior for hidden block frames was under-specified.
- The L03 contract now requires public/shared runtime to omit hidden block
  frames entirely by default. Admin canvas is the only consumer that opts into
  hidden block rendering, and it must show selectable ghost chrome instead of
  public block content.
- The L03 pseudocode was corrected to target the current shared renderer
  extension point: `PageSectionContent` plus shared block render props/style
  helpers in `pageRendererV2`, with editor chrome remaining local to
  `PageEditor`.
- Fresh read-only audit `019eaf03-118e-71c3-95cb-e7ff246b2ce3` then reported
  no High or Medium drift blocking implementation.

### 11.17 TASK-418-04-L03 closeout, 2026-06-10

- `core/services/pages/pageRendererV2.tsx` now owns shared block render props
  and style helpers for width, alignment, text/background variables, opacity,
  radius, border, shadow, padding, and margin.
- `PageSectionContent` now filters hidden blocks out of public/shared runtime by
  default, while exposing an admin-only opt-in path for hidden block ghosts.
- `core/admin/ui/pages/PageEditor.tsx` now consumes shared block render props
  for selected block canvas chrome and renders hidden blocks as selectable
  ghosts without rendering public block content.
- Public runtime coverage now proves visible block style serialization and
  hidden-block frame omission through the real public request path.
- Post-implementation drift audit
  `019eaf10-d801-7263-994d-d1c496a9e10a` found one real low validation gap:
  empty block placeholders were implemented but not explicitly asserted.
  Renderer tests now cover empty image/video placeholders and safe
  runtime-pending embed placeholders without rendering raw HTML.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (54 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (10 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.
- Drift fix validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (36 tests).

### 11.18 TASK-418-04-L04 preimplementation audit correction, 2026-06-10

- Read-only pre-implementation audit
  `019eaf1a-a91d-7402-8cff-68f340693b1c` found no high-severity blocker, but
  identified real medium contract drift before source edits: the supported
  section type/variant matrix was under-specified, variant editing needed to be
  explicitly base-only, and stored non-insertable sections needed a clear
  fallback/editing boundary.
- The L04 task now defines the exact supported insertable section matrix,
  fallback variants, public/control fallback behavior without stored-data
  mutation, base-only root `variant` editing, and command-palette insertion as
  capability-gated rather than stored-section editing-gated.
- Follow-up audit `019eaf1e-359e-73f3-9224-4a9932968548` found one remaining
  medium documentation conflict: this report still described specialized
  `navigation`, `filters`, and `lead-form` rendering as L04 work. The matrix now
  marks those non-insertable/runtime-security section types as deferred outside
  L04, while valid stored rows keep universal controls and generic fallback
  rendering.
- Fresh read-only audit `019eaf22-2407-7f01-aa2f-0bc10fb83ae7` then reported
  no High, Medium, or Low drift before implementation.

### 11.19 TASK-418-04-L04 and TASK-418-04 closeout, 2026-06-10

- `core/services/pages/pageSectionTemplates.ts` now owns the supported section
  type/variant matrix, fallback variants, and base-only variant semantics.
- `core/services/pages/pageRendererV2.tsx` resolves section templates, emits
  `data-page-section-template`, resolves unsupported variants to fallback
  render output without mutating stored data, and applies variant-specific
  layout classes shared by public runtime and admin canvas.
- `core/services/pages/pageEditorControlRegistry.ts` exposes type-scoped
  section variant controls from the same registry, and PageEditor renders them
  as base-only controls.
- `core/admin/ui/pages/PageEditor.tsx` now derives section insertion from
  `pageSectionCapabilities`, hiding deferred non-insertable section types from
  the command palette while preserving universal editing controls for valid
  stored non-insertable sections.
- `TASK-418-04` is closed with all physical leaves done: L01 shared renderer,
  L02 section canvas feedback, L03 block canvas feedback, and L04 section
  templates.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (59 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (10 tests),
  `bun --cwd core lint:types`, and `bun --cwd core lint`.
- Focused post-type-fix validation passed: `bun run test:vitest --
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts` (15 tests).

### 11.20 TASK-418-05-L01 preimplementation audit correction, 2026-06-10

- Read-only pre-implementation audit
  `019eaf36-f457-7fd1-b1dd-309e658fb2ab` found real task-contract drift before
  source edits: the layout-block matrix was not exact, the max children per slot
  was unspecified, recursive schema depth enforcement was not implementable as
  written, stored-read behavior was unclear, recursive responsive-cascade
  ownership conflicted with L03, and route-schema coverage was missing.
- The L01 contract now freezes the first layout-block scope to `container`,
  `columns`, and `group`; defines `PAGE_BLOCK_MAX_TREE_DEPTH = 4` and
  `PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24`; requires finite depth-unrolled schema
  definitions; defines stored-read pruning/de-duplication; and keeps recursive
  responsive cascade resolution in TASK-418-05-L03.
- Fresh read-only audit `019eaf3d-3047-72a2-b85d-4a862ed0a1e1` found no High or
  Medium material drift before implementation.

### 11.21 TASK-418-05-L01 closeout, 2026-06-10

- `core/services/pages/pageDocumentV2.ts` now owns Page layout blocks
  `container`, `columns`, and `group`, their prop defaults, enum options,
  allowed slots, and interim non-insertable placeholder capability state.
- `PageBlockV2` now supports bounded named `slots`; write normalization rejects
  unknown slot keys, slots on atom blocks, over-depth branches, oversized slots,
  duplicate block ids, and cyclic programmatic references.
- Stored-read normalization preserves valid recursive data while pruning
  malformed slot containers, atom-block slots, unknown slot keys, over-depth
  descendants, oversized children beyond the first 24, and cyclic branches;
  duplicate block ids after the first occurrence are renamed deterministically.
- `pageDocumentV2JsonSchema` uses compact finite `$defs` for depths 1 through 4,
  and Pages route schemas carry those definitions so embedded `data` validation
  rejects invalid recursive slot payloads.
- Page editor/control registry code remains type-complete for the new hidden
  layout block types without exposing them in the inserter before L02.
- Post-implementation drift audit `019eaf4f-2492-7162-9257-f7e01b7dd25d`
  reported no high or medium material drift. Its only low finding was missing
  `git diff --check` evidence in closeout artifacts; the command passed and the
  evidence is now recorded in the L01 task, this report, and changelog 1153.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-document-v2.test.ts` (18 tests), `bun run
  test:vitest -- tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts` (24 tests),
  `set -a && source .env && set +a && bun test
  tests/unit/pages/validation.test.ts` (11 tests), `bun run test:vitest --
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (30 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.

### 11.22 TASK-418-05-L02 preimplementation audit correction, 2026-06-10

- Read-only pre-implementation audit
  `019eaf55-2b52-7133-9b8a-3d99f5e40abd` found real L02 task-contract drift
  before source edits: layout-block capability transition was ambiguous,
  block-path shape/helper ownership was not executable, recursive duplicate and
  delete semantics were incomplete, slot target/move rules were underspecified,
  L03 and TASK-418-06-L02 boundaries were unclear, and validation/docs scope was
  too narrow.
- The L02 contract now introduces a staged `editorInsertable` capability for
  admin-only draft composition of `container`, `columns`, and `group` while
  keeping those blocks `insertable: false`, `assistantEmittable: false`, and
  `runtimeRenderer: "placeholder"` until L03 recursive runtime rendering lands.
- The L02 contract now freezes the section-scoped `PageBlockPath` segment shape,
  requires the Bun-free `core/services/pages/pageBlockPaths.ts` owner module,
  defines root/slot insert targets, max-depth and max-child UI gating, same-list
  reorder, explicit cross-slot moves, self-descendant rejection, recursive id
  regeneration on duplicate, and deterministic delete-selection fallback.
- Fresh read-only audit `019eaf5d-cb78-7cf1-817f-07cd8c1352ee` found one
  remaining medium contract gap: whole-section duplication also needs recursive
  id regeneration once nested slot descendants can exist. The L02 contract now
  requires the recursive duplicate helper to be reused for both block-path
  duplication and section duplication, with a section-copy regression test.
- Fresh read-only audit `019eaf63-0302-7833-a76a-8b38fe23e14d` found no
  remaining material drift before source edits.

### 11.23 TASK-418-05-L02 closeout, 2026-06-10

- `pageBlockCapabilities` now separates admin editor insertion from
  product/runtime readiness through `editorInsertable`; `container`, `columns`,
  and `group` are available in the Page editor only while remaining
  non-insertable assistant/runtime placeholder blocks until L03.
- `core/services/pages/pageBlockPaths.ts` owns section-scoped block paths,
  stable serialization, slot-aware insert targets, immutable nested patching,
  bounded moves, recursive duplication with fresh ids, delete fallback, and
  default insert target resolution.
- The Page editor Layers surface now renders `section -> block -> slot -> block`
  trees, supports explicit slot Add and Move-here actions, edits nested selected
  blocks by path through the toolbar, and keeps same-list movement/delete/clone
  behavior bounded by the Pages domain limits.
- Section duplication now uses the same recursive duplicate-id helper as nested
  block duplication, so copied sections with slot descendants do not collide with
  source block ids.
- Public runtime rendering still emits placeholders for staged layout blocks;
  recursive real rendering and responsive cascade remain owned by
  TASK-418-05-L03.
- Post-implementation drift audit `019eaf7c-8778-7c33-8eee-7718e109a960`
  reported no material L02 drift. Its only low, non-blocking finding was that
  Layers Move-here enablement checked the target slot but not the selected
  subtree height before the domain helper rejected over-depth moves. The UI now
  uses the shared `pageBlockPaths` insert-target status helper for the disabled
  state, and a focused PageEditor regression covers that too-deep move target.
  Follow-up drift audit `019eaf86-7b73-7de3-a73f-96ccf9e226e5` found no
  remaining L02 findings.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-block-paths.test.ts` (5 tests), `bun run
  test:vitest -- tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-block-paths.test.ts` (29 tests), `bun run
  test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx` (33 tests),
  `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-block-paths.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (71 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.

### 11.24 TASK-418-05-L03 preimplementation audit correction, 2026-06-10

- Read-only pre-implementation audit
  `019eaf8b-ad5e-7543-aff5-6a8cdc793a84` found real L03 contract drift before
  source edits: the layout-block capability transition could accidentally make
  `container`, `columns`, and `group` assistant-emittable; column slot render
  order/count semantics were not explicit; and recursive admin-preview frame
  metadata for nested canvas chrome was underspecified.
- The L03 contract now freezes the final layout-block runtime matrix for those
  three blocks as `editorInsertable: true`, `insertable: true`,
  `runtimeRenderer: "real"`, `assistantEmittable: false`,
  `publicDataBinding: "none"`, and no pending `reason`.
- The contract now requires runtime/admin-preview rendering to render
  `container.children`, `group.children`, and active `columns` slots
  `column:1..column:N` derived from normalized `props.count`; dormant column
  slots stay preserved but hidden until active.
- The shared renderer frame callback must carry recursive `blockPath`, `depth`,
  `slotKey`, and parent-block metadata so PageEditor canvas chrome can select
  nested rendered blocks without top-level-only path reconstruction. Assistant
  `selectedBlockPath` remains deferred to TASK-418-06-L02.
- Fresh read-only audit `019eaf91-1a4d-7d93-a0ae-88de67e334da` found no
  material drift after those contract corrections, so source edits proceeded.

### 11.25 TASK-418-05-L03 closeout, 2026-06-10

- `resolvePageDocumentForBreakpoint` now resolves nested slot children
  recursively, so mobile/tablet block overrides apply inside layout blocks.
- `container`, `columns`, and `group` now have real runtime renderers and are
  product insertable, while assistant emission remains false until
  TASK-418-06-L02.
- `pageRendererV2` renders active layout slots recursively, hides dormant
  populated `columns` slots beyond normalized `props.count`, keeps unsafe
  embed/form/collection-style blocks as placeholders, and omits hidden nested
  blocks from public output.
- The shared frame callback now carries recursive block path/depth/slot metadata,
  and PageEditor canvas chrome uses that metadata for nested block selection.
- Post-implementation drift audit `019eafa0-e436-7e41-9cab-9a65a089db65`
  found no high or medium material implementation, runtime, security, docs,
  changelog, or test-coverage drift. Its only low finding was that the TASK-418
  umbrella checklist still marked TASK-418-05 incomplete; that checklist is now
  corrected. Follow-up drift audit `019eafa4-8fe5-7260-b301-6910907cecc8`
  found no remaining findings.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx` (35 tests), `bun run
  test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx` (33 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (11 tests), `bun run
  test:vitest -- tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-block-paths.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/ui/page-editor-v2-flow.test.tsx` (73 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.

### 11.26 TASK-418-06-L01 closeout, 2026-06-10

- Read-only pre-implementation audit
  `019eafab-3bba-7023-9477-3a8870ec8914` found real task-contract drift: the
  contract did not distinguish non-data-bound `gallery` output emitted by
  solution kits from L04-deferred `collection`/`form`/`embed` outputs. The task
  and parent contract were corrected before source edits; the fresh audit found
  no high or medium drift and one low implementation choice.
- `gallery` now has a real static public renderer for normalized item data and
  empty arrays. It remains editor/assistant-gated with
  `reason: "gallery-editor-controls-pending"` until controls and authoring tests
  ship in the same increment.
- `collection`, `form`, and `embed` no longer share a generic public placeholder
  branch. They render explicit fail-closed inert states until TASK-418-06-L04
  adds scoped public binding and sanitizer coverage.
- Added parity coverage so editor-insertable, runtime-insertable, and
  assistant-emittable Page block capabilities must have real renderers, and
  assistant/solution-kit emitted Page blocks must be runtime-real or explicitly
  in the L04 data-bound deferral set.
- Post-implementation drift audit
  `019eafab-3bba-7023-9477-3a8870ec8914` first found a medium coverage gap for
  direct registered assistant business blueprint pack Page section outputs. The
  parity test now enumerates `listBusinessBlueprintPacks()` direct
  `page.upsert.sections` payloads, and the fresh drift audit found no remaining
  material drift.
- Validation passed: `bun run test:vitest --
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-runtime-capabilities.test.ts` (38 tests), `bun run
  test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx` (33 tests),
  `set -a && source .env && set +a && bun test
  tests/integration/runtime/pages-runtime.test.ts` (12 tests, 119 assertions),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.

### 11.27 TASK-418-06-L02 closeout, 2026-06-10

- Claude read-only pre-implementation audit was attempted with
  `claude -p --permission-mode plan --effort xhigh --tools Read,Grep,Bash`,
  but the CLI did not return output and the process was terminated. Local
  pre-implementation audit found one real task-contract ambiguity around
  existing `collection`/`form`/`embed` and `gallery` outputs; the L02 task
  contract was corrected before source edits.
- Page active surfaces now use `schemaVersion: 2`, nested section/block
  summaries, Page capability metadata, and server-revalidated
  `selectedBlockPath` values. Hydration rebuilds Page sections from the
  normalized current document and clears stale selected section/block/path
  combinations before planning.
- Assistant `page.upsert.sections[]` now normalizes through `pageDocumentV2`
  and rejects Page section/block output outside the capability-aligned
  assistant vocabulary. `container`, `columns`, and `group` are
  assistant-emittable; `gallery` remains a static-output exception. At the
  time of L02, `collection`, `form`, and `embed` were still gated for the
  later L04 scoped runtime-binding work.
- The full-service assistant shell no longer emits the boundary `navigation`
  Page section through `page.upsert`; it uses a static `content` section while
  retaining the same navigation block content and public runtime behavior.
- Validation passed: focused assistant/Page/UI Vitest suites (8 files, 148
  tests), targeted Bun assistant route/runtime/executor suites (102 tests),
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
- Final local post-implementation drift check found no unresolved mismatch
  across L02 task status, parent/board rows, changelog entry 1157, source
  gates, docs, and validation evidence.

---

### 11.28 TASK-418-06-L03 closeout, 2026-06-10

- Page template input is now owned by
  `core/services/pages/pageTemplateBoundary.ts`: public Page rendering resolves
  normalized Page v2 `sections[]` input through that helper, while stored legacy
  Page rows keep the documented empty-v2 reset compatibility path.
- Non-Page template surfaces are frozen on the legacy `WidgetBlock[]` contract:
  widget-template, custom-screen, and detail-page migration/enforcement are
  explicitly deferred to `TASK-420`.
- `TASK-420` was created with physical children `TASK-420-01` through
  `TASK-420-03`. Its contract requires Claude read-only drift audits with
  `--effort xhigh`, up to 25 minutes wait per pass, `coderso-dev-core-host`
  server smoke, `playwright-cli` browser validation, and `.env`-loaded local
  credentials/settings without sending secrets to external agents.
- Validation passed: focused Page template boundary/renderer/document Vitest
  suites, targeted Pages runtime/widget-template preview/detail-page runtime Bun
  suites, legacy custom-screen/detail-template/widget-template UI Vitest suites,
  `bun --cwd core lint:types`, `bun --cwd core lint`, and `git diff --check`.
- Claude read-only drift audit found a stale changelog next-number pointer and
  a TASK-420 residual guard-wiring acceptance gap; both were corrected. The
  follow-up Claude pass reported no unresolved drift.

---

### 11.29 TASK-418-07 and TASK-418 closeout, 2026-06-10

- TASK-418-06 parent and TASK-418 parent are closed after all physical
  descendants reached terminal states. TASK-420 remains a separate Page
  Templates rewrite follow-up, and TASK-421 remains a separate floating
  inspector UX redesign follow-up.
- Closure validation passed: targeted Pages/Admin UI/assistant Vitest suites
  (11 files, 156 tests), targeted Bun runtime/routes/preview/assistant suites
  (106 tests), `bun --cwd core lint`, `bun --cwd core lint:types`,
  `bun run precommit`, and `bun run gates:coderso` (functional, ux,
  performance, security, reliability PASS).
- Post-audit drift-fix validation passed for Page domain/runtime, PageEditor UI,
  and assistant schema/planner/blueprint paths (17 files, 317 tests) after
  removing the obsolete production `isL04Deferred*` assistant emission
  allowance.
- A real browser smoke ran through `coderso-dev-core-host` and direct
  `playwright-cli`: it created a Page through the admin UI, inserted and edited
  Page v2 content in PageEditor, verified the command palette remains shorter
  than the viewport with Close reachable, saved, previewed, published, verified
  public runtime output including hero split markup and nested layout output,
  repeated the public marker check at a mobile-sized viewport, and cleaned up
  smoke pages.
- The command palette overflow fix tightened the dialog shell to a real
  viewport-safe height (`calc(100dvh - 8rem)`), kept the result list scrollable,
  and left the Close action outside the scroll body.
- TASK-421 was tightened after a read-only Claude UX/contract audit found the
  floating-inspector task wording still allowed native number fields, native
  selects, and raw text fallbacks for color/media controls. The accepted
  follow-up approach is a shared Page Editor control UI-model adapter plus
  segmented controls, switches, sliders, swatches/pickers, media controls,
  hover descriptions, and viewport-safe panels reusable by TASK-420 Page
  Templates.
- The final TASK-418 closure changelog is entry 1160. A final read-only Claude
  drift audit is required on the final committed HEAD per the external-audit
  workflow; any material finding reopens the fix/validation/audit loop.

---

*Koniec raportu. Pełne, zweryfikowane luki z cytatami `plik:linia` (62 pozycje),
drzewo TASK‑418 z acceptance oraz projekt rozszerzeń A–E są podstawą do
utworzenia plików `_docs/_TASKS/TASK-418*`.*
