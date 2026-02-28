# Post Editor Reference Parity Matrix

Date: 2026-02-28  
Owner Tasks: `TASK-063-12-08`, `TASK-063-14-06`  
Reference Source: `_docs/UI/admin_panel/46-post-editor/code.html`

---

## Purpose
Finalny raport parity dla rolloutu `TASK-063-12` (subtaski `01..08`), z oznaczeniem:
- obszarow `must-match`,
- zaakceptowanych odchylen,
- residual risk po wdrozeniu.

Legenda:
- `match`: zgodne z referencja lub zgodne z zaakceptowanym kontraktem parity,
- `deviation`: swiadome odchylenie zaakceptowane w zakresie taska.

## Post-Hardening Addendum (`TASK-063-13`)
Stan po hardeningu authoring UX (2026-02-27):
1. Caret/newline stabilization dla `writing-canvas`, `paragraph`, `heading`, `quote` -> `match`.
2. Multiline model dla `list` -> `match`.
3. Image placeholder click-to-pick media flow (`Dialog` + `MediaGrid`) -> `match`.
4. Global typography inheritance (`meta.typography`) dla blokow tekstowych -> `deviation` (allowed UX extension, zgodny z roadmapa template/token controls).
5. Runtime-like previews dla `button` i `embed` na canvasie -> `match`.
6. Rich text alias normalization (`b/i/div`) i poprawiony link command output -> `match`.

## Formatting Command Capability Matrix (`TASK-063-14-01`)
Kontrakt command visibility per toolbar profile (2026-02-27):
1. `writing-canvas`:
   - pelny zestaw: `Paragraph`, `H1..H6`, `Quote`, `Bullet/Ordered`, `Align`, inline formatting.
2. `paragraph`:
   - rozszerzony zestaw: `Paragraph`, `H2/H3`, `Quote`, `Bullet/Ordered`, `Align`, inline formatting.
3. `heading`:
   - ograniczony zestaw: inline formatting + `Paragraph` + `Align` + `Clear formatting`.
   - brak `H1..H6`, `Quote`, `Bullet/Ordered`.
4. `quote`:
   - inline formatting + `Paragraph` + `Quote` + `Align` + `Clear formatting`.
5. `callout`:
   - analogicznie do `paragraph` (bez pelnego `H1..H6`).

Ownership split (`toolbar` vs `Block inspector`):
1. Dla blokow tekstowych (`writing-canvas`, `paragraph`, `heading`, `quote`, `callout`) `alignment` i `textScale` sa toolbar-owned.
2. `Block inspector` zostawia tylko opcje niedublujace toolbar (np. width/spacing/anchor/class i block-specific attrs).

## Command Reliability Closure (`TASK-063-14`)
Stan finalny po domknieciu `TASK-063-14` (2026-02-28):
1. Komendy blokowe sa egzekwowane deterministic path przez `postRichTextCommandEngine.ts` (`paragraph`, `heading-1..6`, `quote`, `bullet-list`, `ordered-list`, `align-*`).
2. Semantyka list command jest jawna:
   - richtext `bullet/ordered` sluzy do transformacji zaznaczonego tekstu (`ul/ol <-> p`),
   - dedykowany `list` block pozostaje osobnym modelem danych (`items`, `ordered`, `compact`) i nie jest prowadzony przez richtext profile.
3. Routing profilu toolbar jest centralny (`resolveToolbarProfileForBlockType`) i nie ma juz rozjazdu miedzy canvasem a toolbar visibility matrix.
4. Ownership split toolbar vs inspector jest domkniety testami kontraktowymi (brak duplikacji alignment/text scale dla blokow tekstowych).
5. W sekcji command profile/ownership brak otwartych TODO dla `063-14`.

---

## Region Matrix

| Region | Reference Contract | Final State (Repo) | Status | Decision | Task |
|---|---|---|---|---|---|
| Header layout | `h-14`, lewy kontekst + prawa strona `Preview/Publish/Gear` | Header parity utrzymany z hierarchia primary/secondary actions | match | implemented | `063-12-02` |
| Header hierarchy | Primary actions oddzielone od operational controls | Primary cluster (`Preview`, `Publish`, `Gear`) + secondary controls (`Outline`, `Details`, `Focus`, `Revisions`) | match | implemented | `063-12-02` |
| Left rail shell | `w-64`, `Document Outline` jako first impression | Left rail parity i outline-first default zachowane | match | implemented | `063-12-03` |
| Left rail modes | Prostota single-outline | `List view` pozostaje jako secondary mode | deviation | allowed deviation | `063-12-03` |
| Outline row styling | Subtelny rhythm, lightweight selection states | Outline/list rows i hinty sa zgodne z kontraktem parity | match | implemented | `063-12-03` |
| List view block delete action | Brak jawnego kosza per blok w referencji | Dodany kosz per wiersz jako primary delete path dla blokow | deviation | allowed UX extension | `063-12-03` |
| Canvas width | `max-width: 720px` | Center canvas geometry domknieta zgodnie z kontraktem | match | implemented | `063-12-04` |
| Title typography | `text-5xl`, display-like emphasis | Title surface utrzymuje parity typography i spacing | match | implemented | `063-12-04` |
| Block rhythm | `space-y-6` + subtelny flow powierzchni | Unified article flow i spacing parity utrzymane | match | implemented | `063-12-04` |
| Placeholder surfaces | Subtelny `slate + dashed + hover` | Placeholdery media/interactive domkniete do kontraktu parity | match | implemented | `063-12-04` |
| Canvas block delete action | Referencja bez stalego toolbaru per blok | Dodany kosz: stale dla zaznaczonego bloku i na hover dla pozostalych (secondary delete path) | deviation | allowed UX extension | `063-12-04` |
| Right rail shell | `w-80`, tabs `Post/Block` | Right rail parity utrzymany (`Post`/`Block`) | match | implemented | `063-12-05` |
| Right panel flow | `Publishing -> Categories -> Tags -> Featured -> Danger` | `DocumentInspector` ma reference-like flow + `Danger zone` | match | implemented | `063-12-05` |
| Visibility/sticky controls | Widoczne w referencji | Backend fields nadal nie istnieja w posts contract | deviation | defer (approved) | `063-12-05` |
| Advanced fields | Secondary/progressive disclosure | `Advanced` collapsed by default w `Post` i `Block` inspectorze | match | implemented | `063-12-05` |
| Gear modal role | Globalne ustawienia editora | Gear modal przebudowany do grouped sections i global preferences | match | implemented | `063-12-06` |
| Preferences model | Focus/compact/hints/density + defaults | Wdrozone `v2` preferences (`density`, `keyboard hints`, `default tab`, `restore sidebars`) | match | implemented | `063-12-06` |
| Preferences persistence | Stabilna persistence + compatibility | Local-first (`v2` + `v1` compatibility) + sync `posts.editor.preferences` przez `/user-settings` | match | implemented | `063-12-06` |
| Desktop composition | Stabilny 3-column shell | Desktop rails/canvas parity utrzymane (`w-64`, `w-80`) | match | implemented | `063-12-07` |
| Focus mode contract | Hide rails + deterministic restore | Focus mode snapshot restore wdrozony i przetestowany | match | implemented | `063-12-07` |
| Mobile fallback | Left/right sheets z logiczna kolejnoscia | Mobile sheets i responsive behavior domkniete testami regresji | match | implemented | `063-12-07` |

---

## Allowed Deviations
1. `List view` zostaje jako dodatkowy tryb lewej szyny (obok `Outline`).
2. Brak rozszerzenia backendu o `visibility/sticky` w `TASK-063-12`.
3. Preferences persistence jest local-first z background sync przez internal `user-settings`.
4. Delete affordance rozszerzono o:
   - primary action w `List view` (kosz per wiersz),
   - secondary action na `Canvas` (kosz stale dla aktywnego bloku + hover dla pozostalych).

---

## Residual Risk
1. `visibility/sticky` pozostaje poza zakresem API i moze wymagac osobnego taska domenowego.
2. Full user-settings sync dla post editora zaklada dostepnosc `/admin/api/user-settings`; w razie bledu sieci UI kontynuuje w local mode (zamierzone).

---

## Final Gate Result (`TASK-063-12-08`)
1. `bun --cwd core lint` -> pass.
2. `bun --cwd core lint:types` -> pass.
3. `bun test tests/unit tests/integration tests/perf tests/security` -> pass.
4. Dokumentacja/changelog/kanban zsynchronizowane.

Status: `closed`.

## Final Gate Result (`TASK-063-14-06`)
1. `bun --cwd core lint` -> pass.
2. `bun --cwd core lint:types` -> pass.
3. `bun test tests/unit tests/integration tests/perf tests/security` -> pass (`1488 passed`, `150 skipped`, `0 failed`).
4. Command-contract test suites + toolbar/inspector dedup tests dodane i zielone.
5. Dokumentacja/changelog/task board zsynchronizowane.

Status: `closed`.
