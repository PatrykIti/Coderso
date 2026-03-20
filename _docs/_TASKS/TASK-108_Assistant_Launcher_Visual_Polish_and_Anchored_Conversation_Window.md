# TASK-108: Assistant Launcher Visual Polish and Anchored Conversation Window
# FileName: TASK-108_Assistant_Launcher_Visual_Polish_and_Anchored_Conversation_Window.md

**Priority:** High  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-107  
**Status:** Done (2026-03-20)

---

## Overview

Domknac UX floating launchera asystenta po pierwszym rollout `TASK-107`:
- poprawic domyslny visual state launchera,
- sprawic, aby okno rozmowy wychodzilo z launchera,
- usunac wrazenie pelnego prawego modala.

---

## Sub-Tasks

1. `TASK-108-01` - assistant launcher idle/hover visual contract polish.
2. `TASK-108-02` - anchored conversation window replacing right-side modal behavior.
3. `TASK-108-03` - QA, docs, changelog, and closure.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Adjusted the launcher away from the washed-out idle state into a visible default conversation affordance.
- Replaced the full right-side conversation sheet with an anchored floating conversation window positioned next to the launcher.
- Added helper coverage for anchored window positioning and revalidated the existing launcher/settings suites.
