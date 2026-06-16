# TASK-439-01-L01: Button Label Runtime Truthfulness And Dedicated Controls
# FileName: TASK-439-01-L01-Button-Label-Runtime-Truthfulness-And-Dedicated-Controls.md

**Parent Subtask:** TASK-439-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-439-01
**Status:** ✅ Done
**Completed:** 2026-06-16

---

## Overview

Adopt the shared label-edit and dedicated-control paths for Button, prove that
variant, size, target, and link behavior stay truthful on the published front,
and fix the accent application so the button visibly consumes
`--coderso-section-accent` on the published front. The cross-parity audit
(`_docs/AUDIT/_cross-parity-2026-06-10.md` Public runtime note;
`_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.8) observed computed
slate/transparent at accent `#00ff00` even though the CSS-var wiring exists in
source (`core/services/pages/pageRendererV2.tsx:126` emission, `:758`
consumption); root-causing why the variable does not take effect (style
emission, CSS delivery of the arbitrary-value class, specificity) is part of
this leaf. TASK-426 (Hero) delegates the accent->button binding fix here and
only re-verifies the hero-side accent flow after this leaf lands. Inline-edit
machinery is owned by TASK-422; this leaf only registers/verifies the button
label target against the TASK-422 contract.

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
// Inline label edit: register/verify the button label target in the
// TASK-422-owned inline-edit contract
// (core/services/pages/pageInlineEditContract.ts — new module, created by TASK-422).
const buttonControls = getPageEditorControlsForTarget({ kind: "block", type: "button" });
// core/services/pages/pageEditorControlRegistry.ts:508
// Editor surface: controls render through RegistryControlField
// (core/admin/ui/pages/PageEditor.tsx ~2524-2614) using the shared TASK-421 widgets;
// this leaf verifies the button panel renders them, it does not re-implement them.
// Published front: the `case "button"` branch of renderPageBlockContent
// (core/services/pages/pageRendererV2.tsx:753-766) must visibly apply
// var(--coderso-section-accent) emitted by toPageSectionStyle (pageRendererV2.tsx:126).
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Button label can be edited on canvas and in the inspector through one path.
- Variant/size/target edits re-render published output truthfully.
- Accent is a section-level field (`section.style.accent`, no Button accent
  prop): after the fix, the published button background visibly reflects
  `--coderso-section-accent`, with a visible computed-style difference on the
  front, not merely a class-string difference.
- Inspector widgets adopt the shared dedicated control surface owned by
  TASK-421.

Error handling:

- `target` stays enum-clamped to `pageButtonTargets`
  (`core/services/pages/pageDocumentV2.ts:1311`) and the renderer keeps
  `rel="noreferrer"` for `blank` (`pageRendererV2.tsx:761-762`); `href` is
  currently an unvalidated nullable string rendered raw
  (`pageRendererV2.tsx:754,760`) — keep schema-owned persistence and do not
  weaken it. Adding href scheme validation would be a separate scope decision,
  not assumed existing behavior.
- Empty required labels fall back to the current valid value.

Regression-test shape:

- Vitest UI and runtime coverage for label edits, Button prop truthfulness
  (variant/size/target), and the published accent application (section-level
  `--coderso-section-accent` visibly styling the button background).

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned Button fields may persist.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Button runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Completion Notes

- Final read-only drift pass flagged that the first implementation still
  relied on Tailwind arbitrary CSS-var classes and did not satisfy this leaf's
  computed-style proof requirement.
- The closure fix moved Button primary/secondary/ghost/link accent surfaces to
  inline styles (`backgroundColor`, `borderColor`, `color`) that consume
  `var(--coderso-section-accent,#0d9488)`, so the visible accent no longer
  depends on generated CSS asset coverage.
- `playwright-cli` smoke on 2026-06-16 verified the minimal published-style
  path computes `backgroundColor` to `rgb(0, 255, 0)` when the parent emits
  `--coderso-section-accent:#00ff00`.



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
