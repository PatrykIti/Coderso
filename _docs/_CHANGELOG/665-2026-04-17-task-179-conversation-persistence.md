# 665. TASK-179 conversation persistence

Date: 2026-04-17
Version: unreleased
Tasks: TASK-179-08

## Key Changes

### Admin/UI

- Added bounded browser-local assistant conversation persistence.
- Restores safe transcript, active plan state, planning state, and assistant mode across close/remount.
- Assistant panel can reopen after SPA route changes without losing the current conversation.

### Security

- Persisted assistant state expires and rejects malformed or secret-like payloads.
- Raw provider prompts, credentials, cookies, CSRF tokens, submissions, and secret-like settings are not persisted.

## Validation

- Added helper and UI interaction coverage for assistant conversation persistence.
