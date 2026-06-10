# TASK-421-01: Reference Audit And Inspector Contract
# FileName: TASK-421-01-Reference-Audit-And-Inspector-Contract.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421
**Status:** ⏳ To Do

---

## Overview

Freeze the implementation contract for the floating inspector redesign by
auditing the reference HTML/spec and mapping it to the current PageEditor and
control registry. This leaf is read-only/planning plus task-contract updates; no
production UI code changes.

Preliminary Claude audit on 2026-06-10 found the earlier task wording too loose
because it still allowed native number inputs, native selects, and text
fallbacks for colors/media. The task family was tightened from that audit. When
TASK-421 implementation starts, rerun a fresh read-only audit on the then-current
HEAD before editing production code.

---

## Implementation Pseudocode

```ts
function buildFloatingInspectorContract() {
  const referencePanels = extractPanelsFromReferenceHtml();
  const currentPanels = readToolbarPanelOptions();
  const registryInputs = readPageEditorControlRegistry();
  return {
    panels: mapReferencePanels(referencePanels, currentPanels),
    primitives: mapControlInputsToUiPrimitives(registryInputs),
    gaps: findRawInputAndSelectUxGaps(),
    acceptanceCriteria: buildImplementationLeafCriteria()
  };
}
```

Expected data flow:

- Reference source:
  `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html` and
  `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`.
- Current source:
  `core/admin/ui/pages/PageEditor.tsx` and
  `core/services/pages/pageEditorControlRegistry.ts`.
- Output is task acceptance criteria for TASK-421-02 through TASK-421-05.
- Acceptance criteria must explicitly forbid the rejected UX: typing every
  value into raw fields, native number up/down arrows as the primary numeric
  control, native yes/no selects for booleans, and text fallbacks for colors or
  media/source controls.

Regression-test shape:

- No production tests required unless this leaf changes docs/helpers.
- Run read-only Claude UX/contract audit and record the summary in this task;
  implementation-time audit must compare the final task contract against the
  current PageEditor/control-registry code again.

---

## Security Contract

- **Endpoint visibility:** no new endpoints.
- **Auth model:** no auth changes.
- **RBAC:** no RBAC changes.
- **CSRF:** no writes.
- **Rate-limit bucket:** no route changes.
- **Validation:** document registry/schema ownership only.
- **Anti-abuse controls:** no secrets in audit prompts or evidence.

---

## Testing Requirements

- Read-only Claude audit with xhigh effort and up to 25 minutes wait.
- `git diff --check` if task docs are updated.

---

## Documentation Updates Required

- TASK-421 child task acceptance criteria if the audit finds drift.
