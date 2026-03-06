# 367. TASK-105 Vitest Coverage Waves Follow-up

**Date:** 2026-03-06  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Additional Coverage Waves
- Added direct Vitest suites for `siteSettingsClient`, analytics leaf components, menu leaf components, `recaptcha`, drag-and-drop helpers, post editor settings dialog, booking resources tab, commerce editor side panels, API keys table, and storage provider card.
- Continued improving low-cost Bun-free coverage without changing the hybrid Bun/Vitest ownership model.

### Coverage Progress
- Previous TASK-105 snapshot: `40.46% stmts`, `35.76% branch`, `34.16% funcs`, `42.73% lines`
- Current snapshot after follow-up waves: `42.03% stmts`, `37.65% branch`, `36.29% funcs`, `44.36% lines`
- Full Vitest validation now passes with `330` test files and `1047` tests.

### Remaining Focus
- The biggest remaining payoff is still in `listings`, `forms`, `entries/pages/posts` editor shells, and `widgets/editors`.
