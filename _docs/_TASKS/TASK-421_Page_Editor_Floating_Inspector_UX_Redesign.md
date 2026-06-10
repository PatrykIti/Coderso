# TASK-421: Page Editor Floating Inspector UX Redesign
# FileName: TASK-421_Page_Editor_Floating_Inspector_UX_Redesign.md

**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-418
**Status:** ⏳ To Do

---

## Overview

Redesign the Page Editor floating inspector so it follows
`_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html` and
`_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` instead of relying
on native number fields, selects, and text inputs for every setting. The editor
already has atomic sections, atomic blocks, a control registry, and a floating
toolbar. This task upgrades the inspector UX: icon categories, hover tooltips,
segmented presets, toggles, sliders, color swatches/pickers, media controls, and
focused section/block presets.

The goal is not to recreate the old advanced widget editors. Section and block
controls must stay beginner-friendly and constrained: a small set of general
layout, style, background, spacing, responsive, visibility, and typography
options shared across Page v2 atoms, with type-specific controls only where the
block contract already owns them.

---

## Sub-Tasks

- [ ] TASK-421-01: Reference audit and floating inspector contract.
- [ ] TASK-421-02: Control primitives and preset input renderers.
- [ ] TASK-421-02-L01: Segmented selectors toggles and option labels.
- [ ] TASK-421-02-L02: Sliders swatches color pickers and media controls.
- [ ] TASK-421-03: Section and block panel preset coverage.
- [ ] TASK-421-03-L01: Section general preset panels.
- [ ] TASK-421-03-L02: Atomic block preset panels.
- [ ] TASK-421-04: Responsive override tooltip and panel polish.
- [ ] TASK-421-05: Validation browser smoke docs and closure.

---

## Implementation Pseudocode

```ts
function redesignFloatingInspector() {
  const reference = auditReferenceHtmlAndSpec({
    html: "_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html",
    spec: "_docs/UI/pages-editor-new-approach/coderso-editor-spec.md"
  });
  const contract = mapReferenceToCurrentEditor({
    toolbar: "core/admin/ui/pages/PageEditor.tsx",
    registry: "core/services/pages/pageEditorControlRegistry.ts",
    tests: "tests/vitest/ui/page-editor-v2-flow.test.tsx"
  });
  return {
    panelCategories: contract.categories,
    controlRenderers: contract.controlRenderers,
    sectionPresets: contract.sectionPresets,
    blockPresets: contract.blockPresets,
    validationPlan: contract.validationPlan
  };
}
```

Expected data flow:

- `pageEditorControlRegistry` remains the source of target/path/type metadata.
- UI renderers choose ergonomic controls per `input` type:
  `segmented`, `switch`, `number`, `color`, `swatch`, `media`, `text`.
- Numeric controls use sliders or bounded stepper/slider pairs for common ranges
  instead of raw `type="number"` arrows.
- Enum controls use segmented or compact option buttons with human labels
  instead of native select boxes for small option sets.
- Colors use swatches plus picker/custom fallback; no free-form color text as
  the primary path.
- Responsive override state, reset actions, and dirty-state behavior continue to
  use existing section/block override helpers.

Error handling:

- Unknown control input types fail closed to a safe text field only with a test
  that captures the fallback.
- Invalid preset values are rejected through existing normalizers; UI controls
  must not write values outside schema clamps.
- Controls must preserve unsaved edits and not trigger background revalidation
  overwrites.

Mandatory Claude/agent workflow:

- Before implementation, run a read-only Claude UX/contract audit using
  `claude -p --permission-mode plan --effort xhigh --tools Read,Grep,Bash`
  with a 1500-second timeout.
- The prompt must include the repo path, HEAD, dirty-worktree context,
  `TASK-421`, reference HTML/spec paths, current PageEditor/control-registry
  files, no-edit instruction, and severity-ordered findings with concrete
  file/line references.
- Do not send `.env`, credentials, provider keys, raw sensitive logs, or
  unredacted user data to Claude.
- Treat Claude output as review evidence. Verify findings locally before
  changing code or task state.

Regression-test shape:

- Vitest covers the control renderer mapping and key PageEditor flows.
- DOM tests assert segmented controls, toggles, sliders, swatches, tooltips, and
  responsive reset indicators exist for representative section/block selections.
- Playwright CLI smoke verifies the real browser floating inspector can select
  a section, switch categories, change layout/style/spacing/visibility presets,
  and keep the subpanel visible/scrollable.

---

## Security Contract

- **Endpoint visibility:** no new public endpoints.
- **Auth model:** existing admin session only.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write behavior; no route changes expected.
- **Rate-limit bucket:** no new bucket.
- **Validation:** Page v2 schemas and control registry remain the validation
  source; reject unknown fields.
- **Anti-abuse controls:** no secrets or privileged settings in browser state,
  localStorage, debug payloads, tooltip text, or Playwright artifacts.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- Additional Vitest suites for extracted control renderer helpers if introduced.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli` using
  `.env`-loaded local credentials/settings.

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if the reference
  contract changes.
- `_docs/PAGE_MODEL.md` if Page v2 editor/control behavior changes.
- `_docs/_CHANGELOG/` entry on completion.
