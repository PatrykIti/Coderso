# RAPORT: Split Layout Widget — Closure Matrix

> **Status:** Zamknięty po TASK-256 i TASK-285
> **Pierwotna sesja Playwright:** 2026-05-16
> **Raport closure:** 2026-05-21
> **Sesja:** Playwright #4 (Split Layout Widget)
> **Środowisko źródłowe:** http://localhost:5173/admin | http://localhost:3000

---

## 1. Cel raportu

Ten plik zachowuje snapshot z sesji Playwright z 2026-05-16, ale po
TASK-256 i TASK-285 nie może już być traktowany jako lista nadal otwartych
problemów Split Layout. Został więc przepisany do closure matrix:

- wskazuje, które findingi były shared-contract drift i zostały zamknięte poza
  TASK-285,
- które findingi zostały dostarczone lokalnie przez Split Layout w TASK-285,
- zapisuje finalną evidence trail w kodzie, testach i dokumentacji.

## 2. Snapshot źródłowy z 2026-05-16

Pierwotny audit wykrył trzy klasy problemów:

- shared drift: preset/variant sync, `none` versus `0` gap semantics, preview-
  only placeholder gating i shared editor-mode ownership;
- lokalne braki produktowe: brak dedykowanego mobile ratio dla `keep`, brak
  contextual reverse copy, brak miniaturek i breakpoint disclosure, redundant
  slot guidance, Advanced bez własnej roli, gap labels bez scale context;
- obserwacje runtime/admin parity: frontend i admin preview renderowały ten sam
  layout, więc drift dotyczył głównie truthfulness i UX edytora.

## 3. Finalna macierz findingów

| ID | Snapshot z 2026-05-16 | Finalny status | Owner | Evidence |
|---|---|---|---|---|
| BUG-01 | Wizard preset zmienia header/variant, ale nie persisted ratio | `fixed outside TASK-285` | TASK-256-05-02 + TASK-256-01 | Shared atomic patch path is now consumed by Split Layout, and `buildVariantSyncedSplitLayoutData()` keeps desktop/tablet/mobile ratios aligned with preset selection; `split-layout-editor-wave.test.tsx` proves Wizard and Visual stay in sync |
| BUG-02 | Dropdown gap pokazuje osobno `None` i `Gap 0` | `fixed outside TASK-285`, consumed locally | TASK-256-02 + TASK-285-05 | Split Layout still accepts legacy serialized `"0"`, but control state canonicalizes it to `none`, the editor shows one zero-gap option, and diagnostics explain the legacy value path |
| BUG-03 | `keep` silently reuses `ratio.tablet` on mobile | `fixed` | TASK-285-01 | `ratio.mobile` is now schema-owned, normalized with tablet fallback, exposed only for `keep`, and rendered through `data-split-ratio-mobile`; covered in `splitLayout.test.tsx`, `renderer.test.tsx`, and `validator.test.ts` |
| BUG-04 | `Reverse on mobile` lacks truthful context in `stack` versus `keep` | `fixed` | TASK-285-01 | Visual now renders mode-aware helper copy in `[data-split-reverse-copy]` and ties the explanation to the selected collapse mode; covered in `split-layout-editor-wave.test.tsx` |
| ISSUE-01 | Variant cards and ratio dropdowns can contradict each other | `fixed` | TASK-256-05-02 + TASK-285-02 | Variant cards now reapply the current preset atomically, render breakpoint disclosure in `[data-split-ratio-summary]`, and show explicit preset-override state |
| ISSUE-02 | `Pane slots` section is redundant and not actionable | `fixed` | TASK-285-03 | Visual now uses a single `Pane content` section with Structure/insert guidance instead of duplicate static slot copy |
| ISSUE-03 | Advanced duplicates Visual instead of owning a clear role | `fixed`, tightened by TASK-336-19 | TASK-285-04 + TASK-336-19 | Advanced is read-only; TASK-336-19 replaced the previous implementation snapshot with human support summaries and kept no duplicate editable ratio/gap/align controls |
| ISSUE-04 | Gap labels do not show px/rem context | `fixed`, superseded by beginner-safe labels | TASK-285-05 + TASK-336-19 | TASK-285 added exact scale context; TASK-336-19 later replaced visible rem/px/token-style labels with friendly spacing labels while preserving legacy zero-gap compatibility |
| ISSUE-05 | Variant cards have no graphical preview | `fixed` | TASK-285-02 | Visual cards now render `data-split-variant-preview` miniatures tied to owner-resolved pane spans |
| ISSUE-06 | Empty pane placeholder gives no next-step guidance | `fixed` | TASK-285-03 + TASK-256-03 | Preview-only empty panes now instruct authors to add a widget from Structure or insert controls, while public runtime stays free of admin-only placeholder copy |

## 4. TASK-285 shipped scope

### TASK-285-01

- Split Layout now owns an optional `ratio.mobile` field with tablet fallback
  for backward compatibility.
- `keep` mode exposes an explicit mobile-ratio control; `stack` mode explains
  that phones always collapse to one column.
- Reverse-order copy now truthfully describes the phone-only effect for both
  `stack` and `keep`.

### TASK-285-02

- Variant cards now include bounded graphical miniatures for `50/50`, `40/60`,
  and `60/40`.
- Visual shows the effective desktop/tablet/mobile ratios and whether the saved
  block still matches the selected preset.

### TASK-285-03

- `Pane slots` was replaced with actionable `Pane content` guidance.
- Empty-pane helper copy is preview-only and no longer leaks into public SSR.

### TASK-285-04

- Advanced no longer impersonates a second Visual editor.
- It now explains preset alignment, breakpoint spans, mobile mode, gap token,
  and vertical alignment through read-only diagnostics.

### TASK-285-05

- Gap labels now expose scale context in rem and px.
- Older zero-gap payloads remain valid, but the editor resolves them through
  the canonical no-gap control state and beginner-facing helper copy.

## 5. Shared closure notes

- BUG-01 stays explicitly routed to TASK-256 shared atomic-update ownership even
  though Split Layout now consumes the final landed path.
- BUG-02 also closes as a shared token-contract repair: Split Layout only
  consumes the landed `none`/`0` decision and explains it locally.
- No additional Split Layout findings remain deferred after the 2026-05-21
  closure pass.
- TASK-336-19 later tightened the shared beginner-safe contract: Split Layout
  Advanced no longer shows developer-facing saved-data snapshots or
  implementation labels, and Visual uses friendly spacing/alignment labels
  instead of visible technical scale labels.

## 6. Validation evidence

Focused TASK-285 coverage completed during this closure pass:

- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`
  - `4` files passed, `51` tests passed on 2026-05-21.
- `bun test tests/unit/widgets/validator.test.ts`
  - passed on 2026-05-21 with the new `ratio.mobile` acceptance and reject-
    unknown coverage.

Family-wide lint, typecheck, gates, strict security scan, diff, and precommit
results are recorded in `TASK-285-06`.

## 7. Notes

- Frontend and admin preview remain aligned; TASK-285 closes editor truthfulness
  and authoring UX, not a frontend/runtime parity bug.
- This closure matrix intentionally separates TASK-256 shared fixes from the
  widget-local TASK-285 product pass.

*Raport closure zaktualizowany po finalnym TASK-285 pass na dedykowanym worktree.*
