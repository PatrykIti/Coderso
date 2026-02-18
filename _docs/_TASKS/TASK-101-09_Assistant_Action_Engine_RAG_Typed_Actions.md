# TASK-101-09: Assistant Action Engine (RAG + Typed Actions)
# FileName: TASK-101-09_Assistant_Action_Engine_RAG_Typed_Actions.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI + CMS Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-04, TASK-101-05, TASK-101-07, TASK-101-08  
**Status:** To Do

---

## Overview

Dodac generyczny silnik "assistant actions", aby asystent mogl wykonywac intencje usera
typu: "utworz template ze stopka", przy zachowaniu security-first i kontroli UX.

Kierunek architektury:
- model (np. OpenRouter reasoning) robi plan/intencje,
- backend wykonuje tylko whitelistowane, typowane akcje,
- kazda akcja przechodzi przez walidacje, RBAC, audyt i rewizje,
- zapis odbywa sie po `dry-run` + `confirm` w UI.

---

## Scope

1. Planner intentow (`prompt -> typed action plan`) oparty o RAG na docs KB.
2. Typed action registry (np. `template.create`, `widget.add`, `page.update`).
3. Execution engine z trybem:
   - `dry-run` (preview zmian / diff),
   - `execute` (po potwierdzeniu).
4. Confirm flow w Assistant UI (lista krokow + wynik walidacji + error mapping).
5. Audit log + revision hooks dla kazdej mutujacej akcji.
6. Guardrails:
   - brak arbitralnego kodu,
   - limity budzetu i rate limit,
   - idempotency key dla akcji mutujacych.

## Non-Goals

- Pełna autonomia bez potwierdzenia usera.
- Bezpośrednie wykonywanie "free-form" komend modelu poza typed registry.
- Omijanie obecnych endpointow i warstw walidacji.

---

## Files to Change (Target)

- `core/services/assistant/actionPlannerService.ts` (new)
- `core/services/assistant/actionRegistry.ts` (new)
- `core/services/assistant/actionExecutorService.ts` (new)
- `core/services/assistant/actions/*` (new executors per domain)
- `core/server/routes/assistantRoutes.ts`
- `core/server/validation/assistantActionSchemas.ts` (new)
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` (new)
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx` (new)
- `tests/unit/assistant/*action*`
- `tests/integration/routes/assistant-actions.test.ts` (new)
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`

---

## Sub-Tasks (Planned)

- `TASK-101-09-01` Planner contract + action schema + validation.
- `TASK-101-09-02` Typed action registry + core executors (templates/pages/widgets).
- `TASK-101-09-03` Dry-run diff model + confirm execution API.
- `TASK-101-09-04` Assistant UI review/confirm UX.
- `TASK-101-09-05` Audit, idempotency, rollback/revision hooks.
- `TASK-101-09-06` Tests, docs, changelog.

---

## Pseudocode

```ts
const plan = await buildAssistantActionPlan({
  prompt,
  docsContext,
  model: "reasoning",
});

validateActionPlan(plan); // strict JSON schema

const preview = await runActionPlan(plan, {
  mode: "dry-run",
  actor,
});

// UI confirm
if (confirmed) {
  const result = await runActionPlan(plan, {
    mode: "execute",
    actor,
    idempotencyKey,
  });
  return result;
}
```

---

## Acceptance Criteria

1. User moze poprosic asystenta o utworzenie/edycje zasobow CMS przez typed actions.
2. Każda mutacja wymaga confirm i jest poprzedzona dry-run z czytelnym diffem.
3. Actions dzialaja przez istniejące walidatory/serwisy (brak bypassu warstw).
4. Każda akcja mutująca ma audit trail i wspiera bezpieczny retry (idempotency).
5. Brak regresji dla obecnego trybu docs-only i zwyklego Q&A.

---

## Testing Requirements

- Unit:
  - planner output sanitization,
  - action schema validation,
  - executor permission checks,
  - idempotency guards.
- Integration:
  - `/assistant/actions/plan`,
  - `/assistant/actions/dry-run`,
  - `/assistant/actions/execute`.
- UI:
  - review + confirm flow,
  - error states (validation, permission, conflict),
  - partial success rendering.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (assistant action endpoints + payload contracts)
- `_docs/ARCHITECTURE.md` (assistant action engine layer)
- `_docs/SECURITY_SPEC.md` (guardrails, confirmation, idempotency, audit)
- `_docs/_CHANGELOG/*.md`

