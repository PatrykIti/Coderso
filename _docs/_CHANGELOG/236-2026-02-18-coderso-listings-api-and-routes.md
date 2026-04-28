# 236-2026-02-18 - Coderso listings API and routes

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-04

## Key Changes
- Core/API: Added `/listings/queries` and `/listings/templates` admin routes with read/write permission guards and schema validation.
- Core/Content: Added saved listing queries persistence/service (`listing_queries`) and preview execution endpoint contract.
- Core/DB: Added `listing_queries` table migration and schema wiring.
- Tests: Added integration coverage for route registration and unit coverage for listing query service behavior.
