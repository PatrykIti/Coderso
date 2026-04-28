# 354 - TASK-054-22-02 custom screens admin routes and RBAC

Date: 2026-03-04  
Version: Unreleased  
Tasks: TASK-054-22-02

## Key Changes

### Custom screens
- Added admin API routes for custom screen CRUD with RBAC guards.
- Added request validation and API error mapping for custom screens.
- Added custom screens route registration tests.
- Updated CMS API and security documentation.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
