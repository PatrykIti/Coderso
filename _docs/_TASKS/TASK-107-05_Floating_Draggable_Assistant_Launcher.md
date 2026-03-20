# TASK-107-05: Floating Draggable Assistant Launcher
# FileName: TASK-107-05_Floating_Draggable_Assistant_Launcher.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-107-01  
**Status:** Done (2026-03-20)

---

## Overview

Zastapic klasyczny topbar entrypoint pływajacym launcherem asystenta w obrebie UI, który user moze przesuwac, aby nie zaslanial widoku.

---

## Scope

1. Dodac floating launcher osadzony nad admin UI, zamiast entrypointu w topbarze.
2. Launcher ma byc draggable.
3. Pozycja launchera ma byc utrzymywana stabilnie po przesunieciu.
4. Launcher nie moze kolidowac z podstawowa nawigacja ani stale zaslaniac kluczowych obszarow ekranu.

---

## Sub-Tasks

1. Zdefiniowac positioning contract dla launchera na desktop/mobile.
2. Dodac drag interaction z bezpiecznymi ograniczeniami viewportu.
3. Zdecydowac, czy pozycja jest sesyjna czy persistowana per user/local.
4. Dolozyc testy i ewentualne helpery dla launchera.

---

## Files

- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/*launcher*` (new helper/component if needed)
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`

---

## Testing Requirements

- Targeted UI tests for launcher render and drag interaction.
- Revalidate that launcher wiring does not break existing request-budget expectations.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Added a floating launcher positioned over the admin UI instead of the topbar.
- Implemented draggable positioning with viewport clamping and local persistence.
- Kept launcher wiring outside the topbar request budget path.
