# TASK-113: Assistant Transcript Scroll Containment
# FileName: TASK-113_Assistant_Transcript_Scroll_Containment.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Small  
**Dependencies:** TASK-112  
**Status:** Done (2026-03-20)

---

## Overview

Naprawic scroll chaining w transcript area asystenta tak, aby przewijanie nad oknem rozmowy nie scrollowało strony w tle.

---

## Sub-Tasks

1. Dodać overscroll containment do transcript viewport.
2. Dodać overscroll containment do samego okna rozmowy.
3. Zweryfikować brak regresji w panelowych suite UI.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

---

## Completion Notes (2026-03-20)

- Added overscroll containment to the assistant transcript viewport and conversation window.
- Prevented wheel scrolling over the chat window from chaining to the page behind it.
