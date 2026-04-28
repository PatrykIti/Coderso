# Filename: 072-2026-01-29-theme-profiles.md

# 72. Theme Profiles and Routes

**Date:** 2026-01-29  
**Version:** 0.1.0  
**Tasks:** TASK-008-02

## 🚀 Key Changes

### Core / DB
- Added `theme_profiles` and `theme_routes` tables with indexes.
- Added migration `0011_themes.sql` + snapshot update.

### Core / Services
- Implemented theme profile CRUD, activation, and route mapping services.
- Enforced route normalization and duplicate path checks.

### Tests
- Added unit tests for active profile behavior and route normalization.

### Docs
- Updated data model and themes spec.
