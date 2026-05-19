# 867. TASK-311 forms field model wave

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-311, TASK-311-01, TASK-311-02, TASK-311-03

## Key Changes

### Forms owner contract expansion
- Forms owners now support `radio`, `number`, `time`, `range`, `rating`, and trusted `hidden` fields across validation, builder/admin preview, runtime preview, and Form Embed.
- Hidden fields now require trusted default values and reject client-side tampering.
- File fields remain explicit unsupported scope under the current public-write contract until a safe upload/storage seam exists.

## Validation

- Focused Forms validation, builder preview, runtime preview, and Form Embed suites passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
