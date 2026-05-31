# 932 - Widget contract Playwright smoke harness

Date: 2026-05-23
Version: Unreleased
Tasks: TASK-336-03

## Key Changes

### QA

- Added a repeatable Bun-owned Playwright CLI smoke harness for the 38
  page-builder widgets.
- Added a tracked widget smoke inventory and sanitized JSON/Markdown evidence
  outputs under `_docs/PLAYWRIGHT`.
- The harness separates admin mode contract failures, public CSS failures,
  fixture gaps, metadata gaps, and environment failures.

### Security

- Admin credentials are read from environment variables only.
- Temporary browser auth state and screenshots stay under `.tmp` and are not
  tracked.

### Docs

- Documented the smoke command, local environment, artifact policy, and manual
  smoke ownership.
