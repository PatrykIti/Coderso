# 416. TASK-105 Custom Screens Legacy Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-02

## Key Changes

### QA / Runner Ownership
- Moved `bindingResolver` coverage from the legacy Bun unit lane into `tests/vitest/customScreens/*`.
- Removed the old Bun duplicate for `customScreenService` because the Vitest-owned suite is already broader and better aligned with the current ownership model.
- Kept the genuinely Bun-coupled SDK runtime/storage cases in Bun.

### Validation
- Verified the `customScreens` Vitest lane with targeted runs for `customScreenService` and `bindingResolver`.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- The next migration work is no longer in `customScreens`.
- What remains is the explicit `refactor-first` audit for `posts`, `forms`, `search`, `server`, `assistant`, and `validation`.
