# Pages Editor V2 — Audyt follow‑up po TASK‑418 (per sekcja / blok, na żywo)

> **Follow‑up do:** `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md` (audyt TASK‑417).
> **Zakres:** weryfikacja, czy rodzina TASK‑418 została poprawnie zaimplementowana —
> **na żywo w działającej aplikacji**, per sekcja i per blok, z porównaniem
> pływającego panelu do referencji `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html`.
> **Data:** 2026‑06‑10. **HEAD audytu:** `a06049ba` → w trakcie biegu drzewo przesunęło się do `1fb8604a`
> (równoległy agent dopinał 418 sanity‑fixes; obserwacje odbijają ten snapshot).
> **Metoda:** workflow wieloagentowy — **11 agentów**, każdy własna sesja `playwright-cli`
> na to samo konto (limit sesji podniesiony do **100**), serwer przez `coderso-dev-core-host`
> (`coderso-a.localhost`). 25 stron testowych (1 per sekcja/blok) + 4 cross‑cutting +
> obiektywny klasyfikator widgetów kontrolek per panel. **Raporty cząstkowe:** `_docs/AUDIT/<typ>-2026-06-10.md` (28 plików).

---

## 1. Werdykt

**TASK‑418 domknął „szkielet i parytet renderu", ale NIE domknął wizji UX pływającego
panelu.** Rdzeń z raportu 417 jest naprawiony (canvas WYSIWYG, parytet canvas==front,
pełny katalog, edycja per‑blok, realne renderery bloków), ale **trzy filary wizji właściciela
nadal nie są spełnione**, plus wyszły **dwa nowe bugi High**.

**Ocena vs wizja właściciela (pływający panel = jedyna powierzchnia kontrolek):**

| Wymóg wizji | Stan | Sev |
|---|---|---|
| Kontrolki jako **dedykowane widgety** (pigułki/swatche/slidery/toggle) na pływającym panelu | ❌ **wszystko natywne** (`select`/`number`/`text`) — 0 dedykowanych w 25/25 targetów | **HIGH** |
| **Edycja in‑place na canvasie** (klik w element → edycja) | ❌ brak (klik tylko zaznacza) | **HIGH** (priorytet) |
| **Kontrolki czcionki** w zakładce „T"/Treść (font‑family/size/weight/line‑height/letter‑spacing) | ❌ brak (tylko level/align/textColor) | MEDIUM |
| Zakładka „T"/Treść = edycja tekstów **per zaznaczony blok** | ✅ działa (model per‑blok, bez skonsolidowanego widoku — zgodnie z wolą właściciela) | — |
| Pływający panel jako nośnik kontrolek (7 zakładek + akcje + drag + collapse) | ✅ struktura zgodna z referencją | — |

**Liczby:** 25 targetów (11 sekcji + 14 bloków) + 4 cross‑cutting. Status: **1 WORKS** (gating),
**reszta sekcji/bloków PARTIAL**, **2 BROKEN/HIGH** (responsywność na froncie, blok `columns`).
Drift kontrolek: **switch=swatch=slider=segmentedGroup = 0 w KAŻDYM panelu KAŻDEGO targetu.**

---

## 2. Co zostało NAPRAWIONE od TASK‑417 (potwierdzone na żywo)

| # | Pozycja z raportu 417 | Stan teraz | Dowód |
|---|---|---|---|
| 1 | **§5.1/§6 Canvas nie‑WYSIWYG** (tło sekcji = biała karta) | ✅ **FIXED** | `canvasRedAfterBgSet=1` w **25/25** targetach — tło `#ff0000` maluje element na canvasie |
| 2 | **§6 Canvas ≠ Front** (3 renderery) | ✅ **FIXED** | shared renderer: canvas i front malują tło na **tym samym węźle** `DIV.grid`, ten sam content (`_cross-parity`) |
| 3 | **§5.7 Katalog 8+8** (połowa nieosiągalna) | ✅ **FIXED** | paleta = dokładnie **11 sekcji + 14 bloków**; 6 sekcji + 5 bloków poprawnie zgated (`_cross-gating`) |
| 4 | **§5.2/§5.4 Brak edycji per‑blok; placeholdery** | ✅ **FIXED** | każdy blok zaznaczalny, Content edytuje jego propsy; **wszystkie 14 bloków renderują realny markup na froncie, 0 placeholderów** |
| 5 | **§5.3 Edycja na nie‑desktopie nadpisuje bazę** | ✅ **FIXED** (poziom sekcji) | desktop=baza, tablet/mobile=override, mobile dziedziczy z desktopu (nie z tabletu), baza nietknięta; per‑field reset działa (`_cross-responsive`) |
| 6 | **§5.5 Wariant martwy** | ⚠️ **CZĘŚCIOWO** | warianty zmieniające grid (feature‑grid/comparison/custom→cards/grid, hero→centered) zmieniają klasy na froncie; warianty spacing‑only (content `compact`, cta `centered/full-width`) to **no‑opy wizualne** |
| 7 | Skróty/interakcje (ich brak w 417) | ✅ **DZIAŁA** | Ctrl+K, Esc (zamknij + odznacz), Delete z confirm (przycisk i klawisz), Duplicate, drag paska, collapse/expand (`_cross-parity` B) |
| 8 | Zagnieżdżanie bloków (nowa wizja) | ✅ **DZIAŁA** (container/group) | „Add block to Children" w Layers → dziecko nest‑uje się, **persistuje** i renderuje na froncie (`blockTypes=[container,heading]`) |

---

## 3. Co NADAL NIE działa / NOWE bugi (wg severity)

### 3.1 HIGH — Drift kontrolek: wszystko natywne (główny zarzut właściciela)
Rejestr (`core/services/pages/pageEditorControlRegistry.ts`) deklaruje bogate `input`:
`segmented | switch | color | swatch | media | select`. Ale `PageEditor.tsx` renderuje **3 prymitywy**:
`number → NumberField`, `select|segmented → SelectField` (natywny `<select>`),
`switch → SelectField` z `yes/no`, a `color|swatch|media` **spadają** do `TextField` (`PageEditor.tsx` `RegistryControlField`/`SectionRegistryControlField`, komponenty `TextField`/`NumberField`/`SelectField` ~2660–2719).

**Klasyfikator (obiektywnie, 25/25 targetów):** `switch=0, swatch=0, range/slider=0, segmentedGroup=0` w **każdym** panelu. Tabela driftu:

| registry input | referencja (`coderso-editor-redesign.html`) | render dziś | werdykt |
|---|---|---|---|
| `segmented` (align, justify, block width, text‑align, group direction) | `.seg` **pigułki** | natywny `<select>` | **DRIFT** |
| `switch` (visible, authOnly, autoplay, muted, ordered, wrap) | `.sw` **toggle** | `<select>` yes/no | **DRIFT** |
| `color` (accent, background, textColor, borderColor) | `.swatch` **swatche + picker** | `<input type=text>` surowy hex | **DRIFT** |
| `media` (image src, card image, video src, bg image) | **media picker** | `<input type=text>` surowy URL | **DRIFT** |
| `select` (level, shadow, bgType, variant, button variant/size/target, fit, tone, distribution) | `.seg` pigułki | natywny `<select>` | PARTIAL (działa, zły widget) |
| `number` **radius / gap** | `.slider` **suwak** | `<input type=number>` | **DRIFT** |
| `number` padding/maxWidth/margin/size/thickness/count | text px `.inp.mono` | `<input type=number>` | OK‑ish |
| text/url props | text input | `<input type=text>` | OK |

➡️ To jest **TASK‑421** (deferred follow‑up po 418) — **niezrobione**. Naprawa wymaga 4 warstw (patrz §6).

### 3.2 HIGH (NOWE) — Responsywność nie dociera na publiczny front
Model w edytorze działa (override per breakpoint, dziedziczenie, reset), **ale render serwerowy
spłaszcza do JEDNEGO breakpointu desktop i nie emituje `@media`**:
- `core/services/pages/pageRendererV2.tsx:143` → `maxWidth: \`${section.layout.maxWidth}px\`` (jedna wartość inline)
- `core/server/publicSite.tsx:802` → `breakpoint: (options?.previewDevice ?? "desktop")` — realny gość nie ma `previewDevice` ⇒ zawsze **desktop**
- Cała strona: **0** elementów `[data-responsive]`, tylko 1 generyczna reguła `@media`.

**Dowód:** front przy viewport 390px nadal liczy `max-width: 1080px`; override mobile (360) i tablet (640) **nie aplikują się**. Kaskada jest **edytor/preview‑only**, martwa dla realnych telefonów. (`_cross-responsive` §3 krok 6).

### 3.3 HIGH (NOWE) — Blok `columns` nie persistuje
`columns` wstawia się i pokazuje toolbar w sesji (`s=1/b=1`), ale **po Save + reopen edytor i front
pokazują zero treści** („This page has no content yet.", `sectionTypes=[]`). Powtórzone 2×.
`container` i `group` persistują i renderują poprawnie → to **bug specyficzny dla `columns`**
(serializacja/normalizacja slotów kolumn). (`_docs/AUDIT/columns-2026-06-10.md`, werdykt BROKEN/high.)

### 3.4 HIGH (priorytet właściciela) — Brak edycji in‑place na canvasie
Klik w tekst na canvasie **tylko zaznacza** blok (`data-selected=true`, ring); brak `contenteditable`
(licznik=0), dwuklik nie wchodzi w edycję, pisanie nie zmienia treści. Jedyny „contenteditable"
w `PageEditor.tsx` to guard klawiatury (linie ~492–493), nie ścieżka edycji. Edycja tekstu tylko
przez pole „Primary text" na panelu. (`_cross-canvas-inline-typography`.)

### 3.5 MEDIUM — Brak kontrolek czcionki w zakładce „T"/Treść
Brak `fontFamily/fontSize/fontWeight/lineHeight/letterSpacing` w rejestrze. Istnieje tylko:
Level (h1–h6, natywny select), Text align (natywny select), Text color (surowy hex). Style typu
`font-semibold leading-tight` są wbite w klasy Tailwind. (Właściciel chce dedykowanych kontrolek czcionki.)

### 3.6 MEDIUM — Preview surface 404
Przycisk Preview otwiera dialog „**Live preview unavailable** — Preview target is not responding at
`http://coderso-a.localhost:3000/preview`". `GET /preview` → **404**. Środkowa powierzchnia (preview)
nie renderuje — parytet 3 powierzchni weryfikowalny tylko jako **2/3** (canvas==front OK). Możliwy
problem konfiguracji środowiska, ale do potwierdzenia. (`_cross-parity` A.)

### 3.7 MEDIUM — Zakładka „Responsywność" pusta + wariant‑no‑op
- Panel Responsive = jedno zdanie + badge stanu, **0 kontrolek**; brak toggli „ukryj na ekranie" /
  „układ pionowy" z referencji (sloty override są inline na każdej kontrolce). DRIFT.
- Warianty spacing‑only (content `compact`, cta `centered/full-width`) zapisują `data-page-variant`,
  ale klasy renderu identyczne ⇒ brak zmiany wizualnej.

### 3.8 LOW
- Brak inline „+" między sekcjami (jeden przycisk „Add section" u góry, nie per‑gap jak `.gap` w referencji).
- `list`: domyślne `items=[]` (pusty) — ryzyko pruningu pustych bloków.
- Akcent (`#00ff00`) nie aplikuje się wizualnie na przycisk hero na froncie (drobny follow‑up bindingu).
- Breakpoint switcher icon‑only (bez czytelnych etykiet „Duży 1080" i readoutu szerokości z referencji).

---

## 4. Wyniki per SEKCJA (11) — pliki `_docs/AUDIT/<typ>-2026-06-10.md`

| Sekcja | Insert | Canvas WYSIWYG | Wariant→front | Front real | Werdykt |
|---|---|---|---|---|---|
| [hero](./hero-2026-06-10.md) | ✅ heading+text+button | ✅ | ✅ (centered zmienia klasy) | ✅ | PARTIAL · med |
| [content](./content-2026-06-10.md) | ✅ heading+text | ✅ | ⚠️ compact = no‑op | ✅ | PARTIAL · med |
| [feature-grid](./feature-grid-2026-06-10.md) | ✅ | ✅ | ✅ cards/grid → md:grid-cols-3 | ✅ | PARTIAL · med |
| [media-split](./media-split-2026-06-10.md) | ✅ | ✅ | ⚠️ | ✅ | PARTIAL · med |
| [timeline](./timeline-2026-06-10.md) | ✅ | ✅ | ⚠️ | ✅ | PARTIAL · med |
| [gallery](./gallery-2026-06-10.md) | ✅ | ✅ | ⚠️ | ✅ | PARTIAL · med |
| [comparison](./comparison-2026-06-10.md) | ✅ | ✅ | ✅ grid → md:grid-cols-2 | ✅ | PARTIAL · med |
| [faq](./faq-2026-06-10.md) | ✅ | ✅ | ⚠️ | ✅ | PARTIAL · med |
| [testimonials](./testimonials-2026-06-10.md) | ✅ | ✅ | ⚠️ | ✅ | PARTIAL · med |
| [cta](./cta-2026-06-10.md) | ✅ | ✅ | ⚠️ centered/full‑width = no‑op | ✅ | PARTIAL · med |
| [custom](./custom-2026-06-10.md) | ✅ | ✅ | ✅ grid → md:grid-cols-2 | ✅ | PARTIAL · med |

Wspólne dla wszystkich sekcji: drift kontrolek §3.1 (Align/Justify/Variant/Shadow/bgType = natywne; Accent/Background = surowy hex; Radius/Gap = number; Visible/AuthOnly = select yes/no), panel Responsive pusty.

## 5. Wyniki per BLOK (14)

| Blok | Insert | Front render | Persist po reopen | Werdykt |
|---|---|---|---|---|
| [heading](./heading-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift) |
| [text](./text-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift; `format:rich` zwykle plain) |
| [button](./button-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift) |
| [image](./image-2026-06-10.md) | ✅ | ✅ real (placeholder gdy brak src) | ✅ | PARTIAL (src = surowy URL) |
| [video](./video-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift) |
| [list](./list-2026-06-10.md) | ✅ | ⚠️ domyślnie `items=[]` | ⚠️ pusty | PARTIAL (Ordered = select yes/no) |
| [card](./card-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (image/href surowe) |
| [divider](./divider-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (Tone = select) |
| [spacer](./spacer-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (Size = number) |
| [statistic](./statistic-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift) |
| [quote](./quote-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (drift) |
| [container](./container-2026-06-10.md) | ✅ | ✅ real + **nest+persist** | ✅ | PARTIAL (drift) |
| [columns](./columns-2026-06-10.md) | ✅ w sesji | ❌ **znika** | ❌ **NIE** | **BROKEN · high** |
| [group](./group-2026-06-10.md) | ✅ | ✅ real | ✅ | PARTIAL (Direction = select) |

**Zagnieżdżanie (wizja właściciela):** ✅ działa dla `container`/`group` — Layers wystawia „Add block to
Children" / „Move selected block to Children"; dziecko nest‑uje się, persistuje i renderuje na froncie.
❌ `columns` nie persistuje (§3.3).

## 6. Cross‑cutting

- **Gating** (`_cross-gating`): **WORKS/low**. Paleta = dokładnie 11+14; 6 sekcji + 5 bloków zgated zgodnie z `pageDocumentV2.ts`. Poprawa vs 417 (8+8). Reszta: `icon` ma nadal `runtimeRenderer:"placeholder"`, ale jest non‑insertable.
- **Responsywność** (`_cross-responsive`): model edytora **WORKS**; runtime **BROKEN/high** (§3.2).
- **Parytet 3 powierzchni** (`_cross-parity`): canvas==front **FIXED**; preview **404** (§3.6); interakcje **WORKS**; shell panelu wierny; drift widgetów total.
- **Canvas in‑place + Typografia** (`_cross-canvas-inline-typography`): in‑place **brak** (§3.4); „T"/Treść per‑blok **jest**; kontrolki czcionki **brak** (§3.5).

---

## 7. Plan remediacji (wykonalny)

Każda kontrolka musi przejść **4 warstwy**, inaczej będzie atrapą:
**(1) rejestr** (`pageEditorControlRegistry.ts`) → **(2) model** (`PageBlockStyleV2`/`PageSectionStyleV2` schema+normalizer+defaults) → **(3) renderer** (`pageRendererV2.tsx`) → **(4) widget na pływającym panelu** (`PageEditor.tsx`).

1. **TASK‑421 — dedykowane widgety (HIGH).** Dodać do `PageEditor.tsx` realne komponenty i podpiąć po `control.input`: `segmented`→pigułki, `switch`→toggle, `color/swatch`→swatche+picker (dodać brakujący `case "color"`), `media`→media picker, `radius/gap`→slider. Backowane tokenami (`DESIGN_TOKENS.md`). To kasuje główny zarzut.
2. **Edycja in‑place (HIGH, priorytet).** `contentEditable` na leaf‑blokach tekstowych (heading/text/quote/statistic/button‑label) spięte z istniejącym cyklem `updateBlock(props)`; wejście na dblclick/klik w zaznaczonym bloku; ta sama ścieżka danych co panel „T".
3. **Responsywność na froncie (HIGH).** `PageRenderer` ma emitować markup desktop‑resolved **+ bloki `@media`** z delt `responsive[bp]` (scope per `data-block-id`/`data-section-id`), zamiast spłaszczać do desktopu (`pageRendererV2.tsx:143`, `publicSite.tsx:802`).
4. **Bug `columns` (HIGH).** Naprawić serializację/normalizację `columns` (sloty `column:N`) tak, by przeżywała Save jak `container`/`group`.
5. **Grupa Typografia w „T" (MEDIUM).** Dodać `fontFamily/fontSize/fontWeight/lineHeight/letterSpacing` (+ relokować `textAlign`) jako tokenowe, dedykowane kontrolki; rozszerzyć `PageBlockStyleV2` + renderer.
6. **MEDIUM:** warianty spacing‑only (compact/centered/full‑width) mają realnie zmieniać layout; panel Responsive dostaje toggle „ukryj na ekranie"/„układ pionowy"; naprawić route `/preview`.
7. **LOW:** inline „+" między sekcjami; binding akcentu na przycisk; etykiety breakpoint switchera.

---

## 8. Załącznik — metoda i artefakty

- **Środowisko:** `coderso-dev-core-host` (host `coderso-a.localhost`; admin :5173, front :3000, site :5174). Logowanie `playwright-cli` kredkami z `.env`. **Limit sesji podniesiony do 100** (`PATCH /admin/api/settings/security` `session.maxPerUser=100`, single‑session off) — zweryfikowane na dashboardzie.
- **Workflow:** 11 agentów (8 squadów per‑sekcja/blok + gating/responsive/parity) + 1 dedykowany agent canvas/typografia; każdy własna sesja `playwright-cli`, własne strony testowe.
- **Klasyfikator widgetów:** per panel zlicza `select/number/text/range/switch/swatch/segmentedGroup` + mapuje `registry input → rendered widget → reference control → verdykt`. Evidence JSON: `.tmp/audit/evidence/<typ>.json`. Screenshoty: `.tmp/audit/shots/` (34).
- **Pliki cząstkowe:** 25 per‑target + `_cross-gating` + `_cross-responsive` + `_cross-parity` + `_cross-canvas-inline-typography` (`_docs/AUDIT/*-2026-06-10.md`).
- **Uwaga:** drzewo źródeł zmieniało się w trakcie (równoległy agent 418 sanity‑fix, `a06049ba`→`1fb8604a`); ponowny szybki re‑check High (columns, responsywność runtime, in‑place) zalecany na finalnym HEAD.
