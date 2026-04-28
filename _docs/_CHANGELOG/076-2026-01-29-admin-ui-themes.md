# Filename: 076-2026-01-29-admin-ui-themes.md

# 76. Admin UI Theme Templates

**Date:** 2026-01-29  
**Version:** 0.1.0  
**Tasks:** TASK-008-06

## 🚀 Key Changes

### Core / DB
- Added `admin_theme_templates` and `admin_theme_profiles` tables with migrations.

### Core / Services
- Added admin theme token schema, validation, and merge utilities.
- Implemented CRUD services for admin theme templates and profiles.

### Core / API
- Added REST endpoints for admin theme templates and profiles, including activate.

### Admin / UI
- Rebuilt Admin UI Theme screen with template list + profile list.
- Added drawers for template/profile create/edit (UI pickers only, JSON export).
- Applied granular admin theme tokens to buttons, inputs, sidebar, topbar, and cards.

### Tests
- Added admin theme client tests and token validation tests.
- Updated UI snapshot/smoke tests for the new Admin UI Theme layout.

### Docs
- Updated Themes spec, Design Tokens, and Architecture for Admin UI themes.
