# 921 - TASK-288 tabs widget drift hardening

- Date: 2026-05-22
- Version: Unreleased
- Tasks: TASK-288, TASK-288-03, TASK-288-04, TASK-288-06, TASK-288-07

## Key Changes

### Runtime and editor hardening
- Fixed Tabs custom numeric-ID fallback collisions by preferring normalized selection IDs over legacy slot instance IDs, preserving slot order, metadata, and multi-root isolation across preview and public runtime.
- Kept disabled saved defaults visible in editor state while runtime activation falls back to the first enabled tab, and tightened the Wizard layout contract with a compact orientation/alignment row plus explicit variant-preview coverage.

### Validation and truthfulness
- Expanded Tabs regression coverage across the Bun validator lane and focused Vitest suites for reduced-motion classes, previewDevice activation, multi-instance isolation, validator unknown-key rejection, and contrast-advisory warnings.
- Corrected TASK-288 report and closure evidence so C2/R4 remain historical TASK-256 evidence, accessibility residuals stay routed to TASK-330, runtime-script transport/dedupe stays routed to TASK-329, and final validation now records lint, gates, precommit, and the unchanged local scanner-toolchain blocker.
