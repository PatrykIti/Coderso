# Filename: 006-2026-01-25-settings-design-tokens.md

# 6. Settings and design tokens

**Date:** 2026-01-25  
**Version:** 0.1.0  
**Tasks:** TASK-007

## Key Changes

### Core/DB
- Added settings table for global configuration.

### Core/Settings
- Added settings service with allowlisted keys and validation.
- Added bulk update support for settings.

### Core/Theme
- Added token defaults, merge logic, and resolved token cache.
- Added CSS variable output helper for design tokens.

### Core/Server
- Added settings routes and request schemas.

### Tests
- Added settings service and token merge tests.
- Added settings routes registration test.
