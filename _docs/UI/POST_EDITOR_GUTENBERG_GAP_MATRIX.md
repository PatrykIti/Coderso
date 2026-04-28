# Post Editor Gutenberg Gap Matrix (Nextless)

## Purpose
Source-of-truth dla migracji `TASK-063`: co emulujemy z Gutenberga, co zostaje po stronie Nextless, i jakie podtaski sa ownerami.

## Priority Legend
- `Must`: wymagane do parity UX kontraktu.
- `Should`: mocno zalecane, ale moze wejsc po Must.
- `Out`: poza zakresem `TASK-063`.

## Gap Matrix

| Gap ID | Area | Current Nextless | Target (Inspired by Gutenberg) | Priority | Owner Subtask(s) |
|---|---|---|---|---|---|
| G-01 | Interface shell regions | Shell istnieje, ale bez dedykowanego region modelu | Jasne regiony: header/content/secondary-sidebar/sidebar/footer | Must | `TASK-063-02-01`, `TASK-063-02-02` |
| G-02 | Responsive panel behavior | Czesciowo przez istniejace sheet/dialogi | Spojny mobile/desktop contract dla sidebars | Must | `TASK-063-02-03` |
| G-03 | Document tools cluster | Top bar laczy rozne akcje bez czystego cluster split | Add + Undo/Redo + Overview jako jeden cluster | Must | `TASK-063-03-01` |
| G-04 | Save/preview/publish cluster | Jest, ale nie jako niezalezny, stabilny module | Saved state + Preview + Publish cluster parity | Must | `TASK-063-03-02`, `TASK-063-03-03` |
| G-05 | Inserter placement | Dialog/in-panel behavior | Secondary sidebar inserter pattern + ESC/focus return | Must | `TASK-063-04-01`, `TASK-063-04-03` |
| G-06 | Block library UX | Search i catalog sa, ale wymagaja parity polish | Grouped searchable library with clear categories | Should | `TASK-063-04-02` |
| G-07 | Document overview tabs | List view jest osobno, outline/stats nie sa jednym modulem | Tabbed List View + Outline + Stats | Must | `TASK-063-05-01`, `TASK-063-05-02`, `TASK-063-05-03` |
| G-08 | Outline validation | Czesciowo przez TOC/anchors tasks | Empty heading / skipped level / H1 warnings | Must | `TASK-063-05-02` + `TASK-062-02` |
| G-09 | Inline appender workflow | Wstawianie glownie przez ribbon/slash | Canvas insert points `+` i smooth insertion flow | Must | `TASK-063-06-01` |
| G-10 | Insert orchestration | Insert flows sa rozproszone | Jedna orchestration sciezka (inserter/slash/appender) | Must | `TASK-063-06-02` |
| G-11 | Smart paste parity | Dziala, ale wymaga dalszego hardeningu | Word/Docs fidelity + dynamic TOC directives | Must | `TASK-063-06-03` + `TASK-062-03` |
| G-12 | Details tab UX | Sheet tabs sa, ale persistence/refactor niepelne | Stable Document/Block tabs + persisted preferences | Must | `TASK-063-07-01`, `TASK-063-07-02`, `TASK-063-07-03` |
| G-13 | Keyboard shortcut registry | Shortcuts sa rozproszone | Centralny keymap + predictable behavior | Must | `TASK-063-08-01` |
| G-14 | Focus return contract | Czesciowe focus behavior | Deterministyczny focus return przy close/escape | Must | `TASK-063-08-02` |
| G-15 | Accessibility landmarks | Brakuje pelnego region labeling contract | ARIA landmarks + labels parity | Must | `TASK-063-08-03` |
| G-16 | Rollout validation | Brak jednego raportu rollout dla 063 | Full gate run + rollout report + docs/changelog closure | Must | `TASK-063-09-01`, `TASK-063-09-02` |
| G-17 | 1:1 Gutenberg plugin API compatibility | Nie planowane | Bez implementacji WP plugin APIs | Out | N/A |
| G-18 | Full WP block ecosystem import | Nie planowane | Bez vendorowania Gutenberg runtime | Out | N/A |

## Execution Slices
1. Slice A (foundation): `063-02` + `063-03`
2. Slice B (sidebars): `063-04` + `063-05`
3. Slice C (authoring flow): `063-06` + `063-07`
4. Slice D (a11y and hardening): `063-08`
5. Slice E (closure): `063-09`

## Regression Risks and Guards
- Risk: panel focus loss -> guard: `063-08-02` focus-return tests.
- Risk: paste regressions -> guard: `063-06-03` fixture tests.
- Risk: preview/publish drift -> guard: `063-03-02` integration tests.
- Risk: runtime mismatch for headings/anchors -> guard: `062-02` + `062-03` tests.

## Dependencies with TASK-062
`TASK-063` korzysta z dynamic TOC/anchors z `TASK-062`.
`TASK-062` nie powinien byc zamykany bez implementacji, bo `063-05` i `063-06` korzystaja z jego kontraktow.
