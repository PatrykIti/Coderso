# Audyt driftu tasków TASK-420..453 (Pages Editor V2) — raport zbiorczy

> **Cel:** weryfikacja, czy rodziny tasków TASK-420..TASK-453 (remediacja audytów Pages Editor V2
> z 2026-06-10) są poprawnie rozpisane **względem audytów** (`_docs/AUDIT/*-2026-06-10.md`)
> **i względem kodu** (HEAD `ae9dcc44`).
> **Data:** 2026-06-11.
> **Metoda:** wieloagentowy workflow — 34 audytorów per rodzina + 3 kontrole przekrojowe
> (board-sync / pokrycie audytów / konflikty własności); każde znalezisko HIGH/MEDIUM przeszło
> niezależną weryfikację adwersaryjną (weryfikator z instrukcją „OBAL"). Łącznie **73 agentów**,
> 2248 wywołań narzędzi. Weryfikatorzy wykonywali także **empiryczne reprodukcje** (round-trip
> normalizacji w bun, git show na HEAD audytu).
> **Pliki szczegółowe:** patrz `README.md` w tym katalogu.

---

## 1. Werdykt ogólny

**Tablica jest w przeważającej mierze poprawna i wykonywalna.** Żadna rodzina nie wymaga
przebudowy od zera; struktura (board → NN → LNN), statusy, format AGENTS.md, lane'y testowe
i synchronizacja README/board są czyste (board-sync: 1 zgłoszenie, obalone). Pokrycie ustaleń
audytów jest pełne — żadne ustalenie HIGH/MEDIUM nie zostało bez właściciela.

**ALE:** przed implementacją trzeba poprawić kontrakty w kilku rodzinach, bo **19 znalezisk
potwierdzono adwersaryjnie** (2 HIGH, 12 MEDIUM, 5 LOW) + 35 LOW niezweryfikowanych
(w większości systemowe artefakty szablonu). Najważniejsze: dwie rodziny mają **fałszywą
przesłankę** zbudowaną na misdiagnozie audytu (TASK-449 columns, TASK-451 preview), jedna
ma **martwą architekturę** (TASK-424 — brak warstwy renderera), a cztery rodziny planują
**ten sam fix w tym samym pliku** bez nazwanego właściciela.

| Statystyka | Wartość |
|---|---|
| Rodziny przebadane | 34 + 3 kontrole przekrojowe |
| Werdykty | **7× OK**, **22× MINOR_DRIFT**, **8× DRIFT** |
| Znaleziska potwierdzone (przeszły adwersaryjną weryfikację) | **19** (2 HIGH / 12 MEDIUM / 5 LOW) |
| Znaleziska obalone przez weryfikatorów | 17 |
| Znaleziska LOW (bez adwersaryjnej weryfikacji) | 35 |

---

## 2. Werdykty per rodzina

Kolumny: P = potwierdzone, L = low (niezweryfikowane), O = obalone.

| Rodzina | Werdykt | P | L | O |
|---|---|---|---|---|
| TASK-420 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-421 | MINOR_DRIFT | 1 | 1 | 0 |
| TASK-422 | MINOR_DRIFT | 0 | 1 | 1 |
| TASK-423 | **OK** | 0 | 0 | 0 |
| TASK-424 | **DRIFT** | 1 | 2 | 1 |
| TASK-425 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-426 | MINOR_DRIFT | 0 | 1 | 1 |
| TASK-427 | MINOR_DRIFT | 1 | 1 | 0 |
| TASK-428 | MINOR_DRIFT | 1 | 1 | 0 |
| TASK-429 | **DRIFT** | 2 | 1 | 0 |
| TASK-430 | MINOR_DRIFT | 0 | 2 | 0 |
| TASK-431 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-432 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-433 | **OK** | 0 | 0 | 0 |
| TASK-434 | MINOR_DRIFT | 0 | 0 | 1 |
| TASK-435 | MINOR_DRIFT | 1 | 1 | 0 |
| TASK-436 | **OK** | 0 | 0 | 0 |
| TASK-437 | MINOR_DRIFT | 0 | 2 | 1 |
| TASK-438 | **OK** | 0 | 0 | 0 |
| TASK-439 | MINOR_DRIFT | 1 | 1 | 0 |
| TASK-440 | **DRIFT** | 1 | 2 | 1 |
| TASK-441 | **DRIFT** | 1 | 0 | 1 |
| TASK-442 | **DRIFT** | 1 | 1 | 1 |
| TASK-443 | MINOR_DRIFT | 0 | 1 | 1 |
| TASK-444 | MINOR_DRIFT | 0 | 2 | 0 |
| TASK-445 | MINOR_DRIFT | 0 | 1 | 1 |
| TASK-446 | **DRIFT** | 1 | 0 | 0 |
| TASK-447 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-448 | **OK** | 0 | 0 | 0 |
| TASK-449 | **DRIFT** | 2 | 1 | 1 |
| TASK-450 | MINOR_DRIFT | 0 | 1 | 0 |
| TASK-451 | MINOR_DRIFT | 2 | 2 | 1 |
| TASK-452 | **OK** | 0 | 0 | 0 |
| TASK-453 | MINOR_DRIFT | 0 | 0 | 1 |
| CROSS-BOARD-SYNC | MINOR_DRIFT | 0 | 0 | 1 |
| CROSS-COVERAGE | MINOR_DRIFT | 0 | 4 | 1 |
| CROSS-OWNERSHIP | **DRIFT** | 3 | 1 | 2 |

---

## 3. Potwierdzone znaleziska HIGH (2)

### 3.1 TASK-424 — brak warstwy renderera = martwa typografia
`TASK-424-01-L01` i `TASK-424-02-L01` wymieniają jako owner files tylko `PageEditor.tsx`,
`pageEditorControlRegistry.ts` i `pageDocumentV2.ts`. **Żaden plik rodziny nie wymienia
`core/services/pages/pageRendererV2.tsx`** — a audyt (Path B, krok 2) i reguła 4 warstw
z follow-upu („inaczej będzie atrapą") wymagają rozszerzenia renderera w tym samym leafie.
Jak rozpisano: fontFamily/fontSize/fontWeight/lineHeight/letterSpacing zapisywałyby się,
ale **nigdy nie malowały** na canvasie ani froncie — dokładnie ten tryb porażki, który audyt
piętnował. → Dodać renderer do owner files + przepływu danych + testów regresyjnych.

### 3.2 TASK-449 — przesłanka „columns pada dziś" sprzeczna z kodem
Weryfikator **wykonał round-trip empirycznie** (bun): każdy editor-insertable typ bloku
z defaultowymi propsami — w tym `columns` i pusty `list` — przechodzi
`normalizePageDocumentV2ForWrite → normalizeStoredPageDocumentV2ForRead → toPublishedPageDocumentV2`
bez utraty. Warstwa schematu **nie wycina** bloków; zaplanowany test regresyjny rodziny
**przechodzi już dziś** na nienaprawionym kodzie. Bug z audytu (reprodukowany 2× na żywo!)
żyje więc w innej warstwie — żywej ścieżce edytora (payload save/autosave, stale-CSRF +
rehydratacja cache w `PageEditor.tsx:1520-1532`) — albo wymaga świeżej reprodukcji na HEAD.
→ Rodzina ma już krok „reproduce-first" (TASK-449-01) — wzmocnić go jako bramkę: kontrakt
naprawy wolno pisać dopiero po wskazaniu warstwy, która faktycznie gubi blok.

---

## 4. Potwierdzone znaleziska MEDIUM (12) — skrót

| # | Rodzina | Problem | Sedno |
|---|---|---|---|
| 1 | TASK-421 | Responsive panel planowany i w 421-03(-L01)/421-04, i w 425 | brak nazwanej delegacji — dwie rodziny implementują te same kontrolki w `PageEditor.tsx` |
| 2 | TASK-427 | Kryterium akceptacji `compact` spełnia już zepsuty status quo | `pageRendererV2.tsx:209` już dziś daje różnicę **klas** (`content-start`, marker) — audyt mierzył zewnętrzny `<section>`; kryterium musi żądać **widocznej** różnicy layoutu, nie różnicy stringów klas |
| 3 | TASK-429 | Przesłanka „warianty media-split są marker-only" sprzeczna z kodem | od `04069629` (przodek HEAD audytu) nie-default ⇒ `md:grid-cols-2`, `horizontal` ⇒ `items-center`; realna luka to media-obok-treści, nie „brak efektu" |
| 4 | TASK-429 | Error-handling „unknown → default" łamie zamknięty kontrakt | rejestr ma `fallbackVariant: "split"` dla media-split (TASK-418-04-L04, Done); wdrożenie wg leafa zmieniłoby cicho zamknięty kontrakt |
| 5 | TASK-435 | „data-only no-op" nieprecyzyjne dla CTA full-width | `pageRendererV2.tsx:143` już mapuje full-width → inline `maxWidth:none`; faktyczny mechanizm no-opu: `:206-207` zlewa klasy WSZYSTKICH wariantów cta/hero + `fallbackVariant: centered` ⇒ centered ≡ default |
| 6 | TASK-441 | **Autoplay nigdy nie trafia do `<video>`** — realny bug runtime | renderer binduje tylko `src/controls/muted` (`pageRendererV2.tsx:770-784`); `props.autoplay` to w pełni persystowany **martwy prop**; rodzina rozpisana jako „preserve", musi być „fix" |
| 7 | TASK-442 | Mechanizm prune'owania pustej listy **nie istnieje** we wskazanych plikach | round-trip pustej listy przechodzi; kontrakt celuje w złą warstwę; potrzebny krok reproduce-first jak w 449 (w tym ścieżka stale-CSRF) |
| 8 | TASK-446 | Wspólny fix etykiety toolbara bez jednego właściciela | korzeń: `getBlockDisplayLabel` (`PageEditor.tsx:290-294`) → aria `\${label} tools` (`:1892`); cztery rodziny piszą ten sam helper |
| 9 | TASK-451 | Rodzina utrwala misdiagnozę audytu „route is missing" | `/preview` **jest zarejestrowany** (`publicSite.tsx:1312`, od initial commit); 404 bez tokenu jest by design; follow-up sam hedgował „możliwy problem konfiguracji env" — leaf musi zaczynać od diagnozy (base URL/host routing), nie „restore route" |
| 10 | TASK-451 | Inline „+" między sekcjami: w scope, ale zero pseudokodu w leafie | leaf 451-02-L01 ma pseudokod tylko dla etykiet — można „zamknąć" leaf bez dowiezienia „+" (AGENTS.md wymaga pseudokodu w leafach) |
| 11 | CROSS-OWNERSHIP | Etykieta toolbara: **4 implementatorów, 0 właścicieli** | 438-01-L01 / 446-01-L01 / 447-01-L01 (`resolveBlockToolbarLabel`) + 451-02-L01 (`resolveToolbarTargetLabel`, niekompatybilna sygnatura) — ten sam plik, ta sama derywacja |
| 12 | CROSS-OWNERSHIP | Responsive panel: hide-toggle + reset w 421 **i** 425 | `TASK-421-03-L01:37` (`<ResponsivePanel controls={[...,"hidden","resetOverrides"]}/>`) vs `TASK-425-01-L01/02-L01`; TASK-423 deleguje wzorcowo — 421/425 nie |

Potwierdzone LOW (5): duplikacja accent 426↔439 (naturalny właściciel: 439 — konsumpcja
`--coderso-section-accent` w gałęzi buttona `pageRendererV2.tsx:758`), brak delegacji do
TASK-421 w 428/440, board TASK-449 nie enumeruje fizycznych dzieci w Sub-Tasks.

---

## 5. Ustalenia empiryczne o KODZIE (ważniejsze niż drift tasków)

Weryfikacja tasków ujawniła fakty o kodzie, które korygują same audyty z 2026-06-10:

1. **`/preview` istnieje i działa by design** — 404 z audytu to wywołanie bez tokenu
   (`publicSite.tsx:1312-1319`); awaria preview to środowisko/kompozycja URL, nie brak route'u.
2. **Round-trip warstwy schematu nie gubi żadnego bloku** (w tym columns i pustej listy) —
   bug columns/list z audytu żyje w żywej ścieżce edytora albo wymaga re-reprodukcji na HEAD.
3. **`autoplay` video to martwy prop** — pełnoprawny bug runtime, dotąd nieskatalogowany
   wprost (audyt widział tylko drift kontrolki).
4. **Warianty sekcji już zmieniają klasy wewnętrznego węzła** (media-split ⇒ 2 kolumny,
   content compact ⇒ `content-start`, cta full-width ⇒ inline `maxWidth:none`) — audyt mierzył
   zewnętrzny `<section>`, który jest wariant-niezmienny. „No-op **wizualny**" pozostaje
   prawdą, ale mechanizm jest inny niż opisano w taskach.
5. **Fallback wariantu media-split = `split`**, nie `default` (rejestr szablonów,
   kontrakt TASK-418-04-L04 Done).

---

## 6. Wzorce systemowe (do naprawy hurtowo)

1. **Fikcyjne symbole w pseudokodzie (~10 leafów, głównie 43x/44x/450):**
   `getBlockControlsForType` / `renderBlockControls` / `renderPublished*` / `section.layout.variant` /
   `layout.stackOnMobile` — nie istnieją. Realne kotwice: `getPageEditorControlsForTarget`
   (`pageEditorControlRegistry.ts:508`), `RegistryControlField` (`PageEditor.tsx:2524-2614`),
   gałęzie `case` w `pageRendererV2.tsx`. Artefakt szablonu — naprawić jednym przejściem.
2. **Brak nazwanej delegacji do TASK-421/422/424/425 (~7 rodzin):** leafy per-target mają
   framing „Implement", a powinny „Verify/Adopt po landingu właściciela". Jedno zdanie
   delegacji per leaf.
3. **Błędne cytaty źródłowe (~5):** np. 439 cytuje audyt buttona dla accentu (źródło:
   `_cross-parity:118`), 438 cytuje audyt textu dla rich/plain (źródło: follow-up §5),
   451-02-L01 przypisuje label-leak do cross-parity (źródło: audyty text/statistic).
4. **Sprzeczności follow-up vs audyty per-target, które odziedziczy TASK-453:** faq ⚠️
   w tabeli §4 follow-upu vs „works end-to-end" w audycie per-target; testimonials cards==grid
   zamrożone przez guard 434 (default≠grid nie wykryje cards==grid). Matryca 453 musi to
   anotować świadomie.

---

## 7. Obalone (17) — czego NIE poprawiać

Weryfikatorzy odrzucili m.in.: brak changelogu dla fali (changelog należy się **ukończonym**
taskom — wszystkie są To Do), matrycę TASK-453 „tylko 2 wiersze" (pseudokod to kształt, nie
deliverable), publish-empty headinga bez właściciela (audyt sam triażował to jako non-gap),
„konsolidowany widok tekstów" w 424 (sformułowanie nie narusza wizji właściciela),
duplikację 449↔442 przez dependency-edge (test 449 przechodzi niezależnie od 442),
sprzeczność textAlign 421↔424 (to sekwencja: 424 świadomie **przenosi** po 421).
Pełna lista z uzasadnieniami w plikach szczegółowych.

---

## 8. Rekomendowana kolejność poprawek kontraktów

1. **TASK-424:** dodać `pageRendererV2.tsx` jako warstwę 3 (owner files, data flow, testy) — HIGH.
2. **TASK-449 / TASK-442:** przepiąć obie rodziny na „reproduce-first jako bramka"; kontrakt
   naprawy dopiero po lokalizacji warstwy (uwzględnić żywą ścieżkę edytora i stale-CSRF) — HIGH/MEDIUM.
3. **Własność współdzielonych fixów:** etykieta toolbara → jeden właściciel (naturalnie
   451-02-L01), accent→button → 439, Responsive panel → 425 (421-03/421-04 okrojić + delegacja).
4. **TASK-451:** przeredagować z „restore 404ing route" na „diagnose env/URL composition";
   dodać pseudokod dla inline „+".
5. **TASK-429/427/435 (+430/431 analogicznie):** przepisać przesłanki na realny mechanizm
   (klasy się zmieniają, efekt wizualny nie) i kryteria akceptacji na widoczną różnicę layoutu;
   429: fallback `split`, nie `default`.
6. **TASK-441:** zmienić scope z „preserve" na „fix" (`autoPlay` binding + regresja Vitest).
7. **Przejście hurtowe:** fikcyjne symbole pseudokodu + zdania delegacji + korekta cytatów
   źródłowych (lista per plik w raportach szczegółowych).
8. **TASK-453:** przy wykonaniu anotować sprzeczności follow-up↔per-target (faq, testimonials).

---

## 9. Artefakty

- Raporty szczegółowe per obszar: patrz `README.md` (index) w tym katalogu.
- Surowe wyniki workflow: run `wf_0f2e6f11-912` (73 agentów; transkrypty w katalogu sesji).
- Kontekst: `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` (audyt źródłowy),
  `_docs/_TASKS/README.md` (tablica), AGENTS.md (reguły kontraktów).
