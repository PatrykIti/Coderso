# 353 - TASK-054-22-01 custom screens schema foundation

Date: 2026-03-04  
Version: Unreleased  
Tasks: TASK-054-22-01

## Key Changes

### Custom screens
- Added `custom_screens` table with schemaVersion, blocks, and bindings.
- Added custom screen schema normalization + CRUD service.
- Added unit tests for schema validation and CRUD flow.
- Updated architecture and CMS API documentation.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
