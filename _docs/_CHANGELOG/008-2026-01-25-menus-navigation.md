# Filename: 008-2026-01-25-menus-navigation.md

# 8. Menus and navigation

**Date:** 2026-01-25  
**Version:** 0.1.0  
**Tasks:** TASK-006

## Key Changes

### Core/DB
- Added menus and menu_items tables with ordering indexes.

### Core/Menus
- Added menu service for CRUD and item replacement.
- Added tree builder with cycle detection and ordering.

### Core/Server
- Added menu routes and request schemas.

### Tests
- Added menu service tests and menu route registration test.
