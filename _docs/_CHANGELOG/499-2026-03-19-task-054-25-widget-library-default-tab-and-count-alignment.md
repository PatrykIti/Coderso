# 499. TASK-054-25 widget library default tab and count alignment

**Date:** 2026-03-19  
**Version:** 0.1.0  
**Tasks:** TASK-054-25

## Key Changes

### Widget Library
- Changed the default active widget tab from `Recommended` to `All widgets`.
- Kept `Recommended` as an optional composite-only filter for users who want a narrower starter set.
- Aligned left-side widget counts with the same filter basis used by the widget grid, avoiding misleading category badges.

### Validation
- Added targeted Vitest coverage for widget library count helpers and the default active tab.
