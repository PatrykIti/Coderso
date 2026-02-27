# Post Editor Reference Parity Matrix

Date: 2026-02-27  
Owner Task: `TASK-063-12-08`  
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
| Canvas block delete action | Referencja bez stalego toolbaru per blok | Dodany kosz tylko dla zaznaczonego bloku (secondary delete path) | deviation | allowed UX extension | `063-12-04` |
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
   - secondary action na `Canvas` (kosz tylko dla aktywnego bloku).

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
