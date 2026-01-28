# Filename: 066-2026-01-28-content-ui-wiring.md

# 66. Content UI Wiring

**Date:** 2026-01-28  
**Version:** 0.1.0  
**Tasks:** TASK-003-06  

## 🚀 Key Changes

### Admin/UI
- Wired Content Types list/editor to live API with create drawer flow.
- Wired Entries list/editor to content endpoints with preview/publish actions.
- Added schema mapping helpers for consistent field <-> schema conversion.

### Admin/Services
- Added `contentTypesClient` and `entriesClient` for REST access.

### Core/API
- Added `GET /content-types/:id` route to support editor loading.

### Tests
- Added admin client unit tests for content types and entries.
- Updated content UI tests for new loading states and props.
