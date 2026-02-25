# Post Editor Reference Parity Matrix

Date: 2026-02-25  
Owner Task: `TASK-063-12-01`  
Reference Source: `_docs/UI/admin_panel/46-post-editor/code.html`

---

## Purpose
Ten dokument zamraza kontrakt parity dla post editora i sluzy jako gate odbiorowy dla `TASK-063-12-02..08`.

Legenda statusu:
- `match`: zgodne z referencja
- `partial`: czesciowo zgodne
- `missing`: brak kluczowego elementu referencji

Decyzje:
- `must-fix`: wymagane w `TASK-063-12`
- `allowed deviation`: swiadome odchylenie (udokumentowane)
- `defer`: poza zakresem aktualnego epiku

---

## Region Matrix

| Region | Reference Contract | Current State (Repo) | Status | Decision | Target Subtask |
|---|---|---|---|---|---|
| Header layout | `h-14`, lewy kontekst (close/back + breadcrumb + status), prawa strona: `Preview`, `Publish`, `Gear` | Jedna linia z mieszanym klastrem (`Outline/Details/Focus/Revisions/Preview/Publish/Gear`) | partial | must-fix | `063-12-02` |
| Header hierarchy | Primary actions oddzielone od operational controls | Brak jawnego podzialu primary vs secondary | missing | must-fix | `063-12-02` |
| Left rail shell | `w-64`, `Document Outline` jako first impression | Tabs `List view` + `Outline` o rownej wadze | partial | must-fix | `063-12-03` |
| Left rail modes | Mozliwa prostota single-outline | Dodatkowy `List view` jest potrzebny produktowo | partial | allowed deviation (`List view` zostaje jako secondary) | `063-12-03` |
| Outline row styling | Lekki rhythm (`active bg-primary/5`, subtelny hover) | Ciezszy visual row/chrome | partial | must-fix | `063-12-03` |
| Canvas width | `max-width: 720px` | Około `860px` | partial | must-fix | `063-12-04` |
| Title typography | `text-5xl font-display font-bold` | `text-4xl`/inny rhythm | partial | must-fix | `063-12-04` |
| Block rhythm | `space-y-6`, subtelne separators/placeholder surfaces | `space-y-7` + ciezsze card/chrome | partial | must-fix | `063-12-04` |
| Placeholder surfaces | Spójny `slate + dashed + subtle hover` | Dziala, ale inna geometria i tone | partial | must-fix | `063-12-04` |
| Right rail shell | `w-80`, tabs `Post/Block` | Tabs sa, shell jest funkcjonalny | partial | must-fix (visual+info architecture) | `063-12-05` |
| Right panel flow | Publishing -> Categories -> Tags -> Featured image -> Danger | Obecnie flow techniczny (SEO always-on, mniej reference-like) | partial | must-fix | `063-12-05` |
| Visibility/sticky controls | W referencji widoczne | Brak backend fields w aktualnym kontrakcie posts | missing | defer (no backend expansion in 063-12) | `063-12-05` |
| Advanced fields | Secondary/progressive disclosure | SEO i advanced stale widoczne | partial | must-fix | `063-12-05` |
| Gear modal role | Główny punkt globalnych ustawien editora | Jest modal, ale zakres/model opcji ograniczony | partial | must-fix | `063-12-06` |
| Preferences model | Focus/compact/hints/density + clear defaults | Focus/compact/hints, bez density/migration contract | partial | must-fix | `063-12-06` |
| Preferences persistence | Stabilna persistence + compatibility | LocalStorage only, bez jawnej migracji schemy | partial | must-fix (local migration), optional server sync | `063-12-06` |
| Desktop composition | Stabilny 3-column shell | Dziala, ale zalezny od panel toggles/focus state | partial | must-fix | `063-12-07` |
| Focus mode contract | Hide rails + deterministic restore | Hide dziala; restore poprzedniego stanu niedeterministyczne | partial | must-fix | `063-12-07` |
| Mobile fallback | Left/right sheets z zachowaniem logicznej kolejnosci | Sheets sa, wymaga doprecyzowania testow i contractu | partial | must-fix | `063-12-07` |

---

## Hard Parity Tokens (Locked)
1. Left rail width: `w-64`
2. Right rail width: `w-80`
3. Canvas max width: `720px`
4. Header height: `h-14`
5. Header primary actions: `Preview`, `Publish/Update`, `Gear`
6. Title surface: `text-5xl` + display-style emphasis
7. Outline-first default mode

---

## Allowed Deviations (Approved)
1. Dodatkowy `List view` na lewej szynie pozostaje (secondary mode).
2. Secondary controls (`Outline`, `Details`, `Focus`, `Revisions`) pozostaja w UI, ale nie w primary header cluster.
3. Brak nowych backend fields `visibility/sticky` w tym epiku.
4. SEO/extended metadata pozostaja dostepne, ale w `Advanced` collapse.
5. Preferences persistence: localStorage-only w tej iteracji (SPA-first, no-reload behavior), bez server sync.
6. Visual parity realizujemy przez system template tokenow; brak hardcoded font/theme forks.

---

## Final Done Gate for TASK-063-12
1. Wszystkie `must-fix` pozycje w matrix maja status `implemented`.
2. Wszystkie `allowed deviation` pozycje sa utrzymane i opisane.
3. `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test tests/unit tests/integration tests/perf tests/security` sa zielone.
4. `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`, `_docs/CODERSO_MODULES.md`, `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/*` sa zsynchronizowane.
