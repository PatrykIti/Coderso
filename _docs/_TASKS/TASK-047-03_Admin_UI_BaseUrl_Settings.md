# TASK-047-03: Admin UI — Base URL Settings
# FileName: TASK-047-03_Admin_UI_BaseUrl_Settings.md

**Priority:** 🔴 High  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-047-01, TASK-046-05  
**Status:** ✅ Done (2026-02-01)

---

## Overview

Dodaj pola w **Site Settings**:
- Base URL for Admin Panel
- Base URL for Website

Z opisem i walidacją (https://…).

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| UI | `core/admin/ui/settings/GeneralSettingsPage.tsx` | new fields |
| UI | `core/admin/ui/settings/BaseUrlCard.tsx` | base url card |
| Client | `core/admin/services/settingsClient.ts` | reuse bulk update |
| Docs | `_docs/SITE_RUNTIME.md` | UI instructions |

---

## Testing Requirements

- UI smoke test (fields render)

---

## Documentation Updates Required

- `_docs/_CHANGELOG/<new>.md`
